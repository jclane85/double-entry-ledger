import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js-light';
import { pool, withTransaction } from '../db/pool';
import {
  Account,
  CreateJournalEntryInput,
  JournalEntry,
  LedgerLine,
  TrialBalanceRow,
} from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Verify that the lines balance: sum of debits === sum of credits.
 * This is the fundamental rule of double-entry bookkeeping.
 */
function assertBalanced(lines: CreateJournalEntryInput['lines']): void {
  let debits = new Decimal(0);
  let credits = new Decimal(0);

  for (const line of lines) {
    const amt = new Decimal(line.amount);
    if (amt.lte(0)) {
      throw new Error(`Line amount must be positive; got ${line.amount}`);
    }
    if (line.side === 'debit') {
      debits = debits.plus(amt);
    } else {
      credits = credits.plus(amt);
    }
  }

  if (!debits.equals(credits)) {
    throw new Error(
      `Entry is not balanced: debits=${debits.toFixed(4)} credits=${credits.toFixed(4)}`
    );
  }

  if (debits.isZero()) {
    throw new Error('Entry must have at least one debit and one credit line');
  }
}

/**
 * Compute the signed delta to apply to an account's running balance.
 *
 * Convention:
 *   balance > 0  →  account is on its normal balance side
 *   balance < 0  →  account is on the contra side
 *
 * For an ASSET account (normal_balance = debit):
 *   debit  → +amount   (increases balance)
 *   credit → -amount   (decreases balance)
 *
 * For a LIABILITY/EQUITY/REVENUE account (normal_balance = credit):
 *   credit → +amount
 *   debit  → -amount
 */
function signedDelta(
  normalBalance: 'debit' | 'credit',
  side: 'debit' | 'credit',
  amount: Decimal
): Decimal {
  const isNormalSide = side === normalBalance;
  return isNormalSide ? amount : amount.negated();
}

// ---------------------------------------------------------------------------
// Account operations
// ---------------------------------------------------------------------------

export async function listAccounts(): Promise<Account[]> {
  const { rows } = await pool.query<Account>(
    `SELECT * FROM accounts ORDER BY code`
  );
  return rows;
}

export async function getAccount(id: string): Promise<Account | null> {
  const { rows } = await pool.query<Account>(
    `SELECT * FROM accounts WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function createAccount(
  code: string,
  name: string,
  type: Account['type'],
  normalBalance: Account['normal_balance']
): Promise<Account> {
  const { rows } = await pool.query<Account>(
    `INSERT INTO accounts (code, name, type, normal_balance)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [code, name, type, normalBalance]
  );
  return rows[0];
}

// ---------------------------------------------------------------------------
// Journal entry operations
// ---------------------------------------------------------------------------

/**
 * Post a journal entry transactionally.
 *
 * Pattern: write-then-read
 *   1. Validate input (balance check, positive amounts)
 *   2. Check idempotency — return existing entry if key already seen
 *   3. BEGIN SERIALIZABLE transaction
 *   4. Lock all affected account rows FOR UPDATE (ordered by id to avoid deadlocks)
 *   5. Verify optimistic lock version hasn't changed since client read (if provided)
 *   6. INSERT journal_entry header
 *   7. INSERT ledger_lines
 *   8. UPDATE account balances (with version bump)
 *   9. COMMIT
 *  10. Read-back: re-SELECT the committed entry + lines → return to caller
 */
export async function postJournalEntry(
  input: CreateJournalEntryInput
): Promise<JournalEntry> {
  // Step 1: validate before touching the database
  if (!input.lines || input.lines.length < 2) {
    throw new Error('A journal entry requires at least two lines');
  }
  assertBalanced(input.lines);

  // Step 2: idempotency check (outside transaction — fast path)
  if (input.idempotency_key) {
    const existing = await getJournalEntryByIdempotencyKey(input.idempotency_key);
    if (existing) return existing;
  }

  const entryId = await withTransaction(async (client) => {
    // Step 3: Lock affected accounts FOR UPDATE, ordered by id to prevent deadlocks
    const accountIds = [...new Set(input.lines.map((l) => l.account_id))].sort();
    const { rows: lockedAccounts } = await client.query<Account>(
      `SELECT * FROM accounts WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE`,
      [accountIds]
    );

    if (lockedAccounts.length !== accountIds.length) {
      const found = new Set(lockedAccounts.map((a) => a.id));
      const missing = accountIds.filter((id) => !found.has(id));
      throw new Error(`Account(s) not found: ${missing.join(', ')}`);
    }

    const accountMap = new Map(lockedAccounts.map((a) => [a.id, a]));

    // Step 4: Insert the journal entry header
    const now = new Date();
    const { rows: entryRows } = await client.query<{ id: string }>(
      `INSERT INTO journal_entries (id, description, reference, idempotency_key, status, posted_at)
       VALUES ($1, $2, $3, $4, 'posted', $5)
       RETURNING id`,
      [uuidv4(), input.description, input.reference ?? null, input.idempotency_key ?? null, now]
    );
    const newEntryId = entryRows[0].id;

    // Step 5: Insert ledger lines and apply balance updates
    for (const line of input.lines) {
      await client.query(
        `INSERT INTO ledger_lines (id, journal_entry_id, account_id, amount, side)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), newEntryId, line.account_id, line.amount, line.side]
      );

      const account = accountMap.get(line.account_id)!;
      const delta = signedDelta(
        account.normal_balance,
        line.side,
        new Decimal(line.amount)
      );

      // Step 6: Update account balance with optimistic locking via version bump
      const { rowCount } = await client.query(
        `UPDATE accounts
         SET balance  = balance + $1,
             version  = version + 1
         WHERE id = $2 AND version = $3`,
        [delta.toFixed(4), account.id, account.version]
      );

      if (rowCount === 0) {
        throw new Error(
          `Concurrent modification detected on account ${account.code}. Please retry.`
        );
      }
    }

    return newEntryId;
  });

  // Step 7: Write-then-read — re-SELECT the committed data to confirm correctness
  const committed = await getJournalEntry(entryId);
  if (!committed) {
    throw new Error(`Fatal: journal entry ${entryId} not found after commit`);
  }
  return committed;
}

/**
 * Void a posted journal entry by creating a reversing entry.
 * The original entry is marked 'voided'. A new offsetting entry is posted.
 * Neither the original entry nor its lines are ever mutated.
 */
export async function voidJournalEntry(id: string): Promise<JournalEntry> {
  const original = await getJournalEntry(id);
  if (!original) throw new Error(`Journal entry ${id} not found`);
  if (original.status !== 'posted') {
    throw new Error(`Only posted entries can be voided; status is '${original.status}'`);
  }

  const reversingId = await withTransaction(async (client: PoolClient) => {
    // Mark the original entry as voided
    await client.query(
      `UPDATE journal_entries SET status = 'voided' WHERE id = $1`,
      [id]
    );

    // Build the reversing entry: swap debit/credit on every line
    const reversedLines = original.lines!.map((l) => ({
      account_id: l.account_id,
      amount: l.amount,
      side: l.side === 'debit' ? 'credit' as const : 'debit' as const,
    }));

    // Lock accounts in id order
    const accountIds = [...new Set(reversedLines.map((l) => l.account_id))].sort();
    const { rows: lockedAccounts } = await client.query<Account>(
      `SELECT * FROM accounts WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE`,
      [accountIds]
    );
    const accountMap = new Map(lockedAccounts.map((a) => [a.id, a]));

    // Insert reversing journal entry
    const now = new Date();
    const { rows: revRows } = await client.query<{ id: string }>(
      `INSERT INTO journal_entries (id, description, reference, status, posted_at)
       VALUES ($1, $2, $3, 'posted', $4)
       RETURNING id`,
      [uuidv4(), `VOID: ${original.description}`, `VOID:${id}`, now]
    );
    const revEntryId = revRows[0].id;

    for (const line of reversedLines) {
      await client.query(
        `INSERT INTO ledger_lines (id, journal_entry_id, account_id, amount, side)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), revEntryId, line.account_id, line.amount, line.side]
      );

      const account = accountMap.get(line.account_id)!;
      const delta = signedDelta(account.normal_balance, line.side, new Decimal(line.amount));

      const { rowCount } = await client.query(
        `UPDATE accounts SET balance = balance + $1, version = version + 1
         WHERE id = $2 AND version = $3`,
        [delta.toFixed(4), account.id, account.version]
      );

      if (rowCount === 0) {
        throw new Error(`Concurrent modification on account ${account.code}. Please retry.`);
      }
    }

    return revEntryId;
  });

  // Write-then-read the reversing entry
  const committed = await getJournalEntry(reversingId);
  if (!committed) throw new Error(`Fatal: reversing entry ${reversingId} not found after commit`);
  return committed;
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

export async function getJournalEntry(id: string): Promise<JournalEntry | null> {
  const { rows: entries } = await pool.query<JournalEntry>(
    `SELECT * FROM journal_entries WHERE id = $1`,
    [id]
  );
  if (!entries[0]) return null;

  const entry = entries[0];
  const { rows: lines } = await pool.query<LedgerLine>(
    `SELECT ll.*, a.code AS account_code, a.name AS account_name
     FROM ledger_lines ll
     JOIN accounts a ON a.id = ll.account_id
     WHERE ll.journal_entry_id = $1
     ORDER BY ll.created_at`,
    [id]
  );
  entry.lines = lines;
  return entry;
}

async function getJournalEntryByIdempotencyKey(key: string): Promise<JournalEntry | null> {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM journal_entries WHERE idempotency_key = $1`,
    [key]
  );
  if (!rows[0]) return null;
  return getJournalEntry(rows[0].id);
}

export async function listJournalEntries(
  limit = 50,
  offset = 0
): Promise<JournalEntry[]> {
  const { rows } = await pool.query<JournalEntry>(
    `SELECT * FROM journal_entries ORDER BY posted_at DESC NULLS LAST, created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

export interface LedgerPage {
  account: Account;
  lines: (LedgerLine & { running_balance: string })[];
  total: number;
}

export async function getAccountLedger(
  accountId: string,
  limit = 50,
  offset = 0
): Promise<LedgerPage | null> {
  const account = await getAccount(accountId);
  if (!account) return null;

  const { rows: lines } = await pool.query<LedgerLine & { running_balance: string }>(
    `SELECT
       ll.*,
       a.code  AS account_code,
       a.name  AS account_name,
       SUM(
         CASE
           WHEN ll.side = $2 THEN  ll.amount
           ELSE                   -ll.amount
         END
       ) OVER (ORDER BY ll.created_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
         AS running_balance
     FROM ledger_lines ll
     JOIN accounts a ON a.id = ll.account_id
     WHERE ll.account_id = $1
     ORDER BY ll.created_at DESC
     LIMIT $3 OFFSET $4`,
    [accountId, account.normal_balance, limit, offset]
  );

  const { rows: countRows } = await pool.query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM ledger_lines WHERE account_id = $1`,
    [accountId]
  );

  return { account, lines, total: parseInt(countRows[0].total, 10) };
}

export async function getTrialBalance(): Promise<TrialBalanceRow[]> {
  const { rows } = await pool.query<TrialBalanceRow>(
    `SELECT
       a.id            AS account_id,
       a.code,
       a.name,
       a.type,
       a.normal_balance,
       COALESCE(SUM(CASE WHEN ll.side = 'debit'  THEN ll.amount ELSE 0 END), 0) AS debit_total,
       COALESCE(SUM(CASE WHEN ll.side = 'credit' THEN ll.amount ELSE 0 END), 0) AS credit_total,
       a.balance
     FROM accounts a
     LEFT JOIN ledger_lines ll ON ll.account_id = a.id
     GROUP BY a.id
     ORDER BY a.code`
  );
  return rows;
}

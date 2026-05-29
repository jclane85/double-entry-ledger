import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the db/pool module before importing the service
// ---------------------------------------------------------------------------
vi.mock('../../db/pool', () => ({
  pool: { query: vi.fn() },
  withTransaction: vi.fn(),
}));

import { pool, withTransaction } from '../../db/pool';
import {
  listAccounts,
  getAccount,
  postJournalEntry,
  voidJournalEntry,
} from '../../services/ledger.service';
import {
  mockAccountCash,
  mockAccountEquity,
  mockPostedEntry,
  mockLedgerLines,
  ACCOUNT_ID_CASH,
  ACCOUNT_ID_EQUITY,
  JOURNAL_ENTRY_ID,
} from '../fixtures';

const mockQuery = vi.mocked(pool.query);
const mockWithTx = vi.mocked(withTransaction);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// listAccounts
// ---------------------------------------------------------------------------
describe('listAccounts', () => {
  it('returns the rows from the database ordered by code', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockAccountCash, mockAccountEquity] } as any);
    const result = await listAccounts();
    expect(result).toEqual([mockAccountCash, mockAccountEquity]);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('ORDER BY code'));
  });

  it('returns an empty array when no accounts exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any);
    const result = await listAccounts();
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getAccount
// ---------------------------------------------------------------------------
describe('getAccount', () => {
  it('returns the account when found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockAccountCash] } as any);
    const result = await getAccount(ACCOUNT_ID_CASH);
    expect(result).toEqual(mockAccountCash);
  });

  it('returns null when account does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any);
    const result = await getAccount('nonexistent-id');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// postJournalEntry — validation (these throw BEFORE any DB call)
// ---------------------------------------------------------------------------
describe('postJournalEntry — input validation', () => {
  it('throws when fewer than 2 lines are provided', async () => {
    await expect(
      postJournalEntry({
        description: 'Bad entry',
        lines: [{ account_id: ACCOUNT_ID_CASH, amount: '100.00', side: 'debit' }],
      })
    ).rejects.toThrow('at least two lines');
  });

  it('throws when debits do not equal credits (unbalanced entry)', async () => {
    await expect(
      postJournalEntry({
        description: 'Unbalanced',
        lines: [
          { account_id: ACCOUNT_ID_CASH,   amount: '100.00', side: 'debit'  },
          { account_id: ACCOUNT_ID_EQUITY, amount:  '50.00', side: 'credit' },
        ],
      })
    ).rejects.toThrow('not balanced');
  });

  it('throws when a line amount is zero', async () => {
    await expect(
      postJournalEntry({
        description: 'Zero amount',
        lines: [
          { account_id: ACCOUNT_ID_CASH,   amount: '0.00', side: 'debit'  },
          { account_id: ACCOUNT_ID_EQUITY, amount: '0.00', side: 'credit' },
        ],
      })
    ).rejects.toThrow('must be positive');
  });

  it('throws when all lines are on the same side (only debits)', async () => {
    await expect(
      postJournalEntry({
        description: 'All debits',
        lines: [
          { account_id: ACCOUNT_ID_CASH,   amount: '100.00', side: 'debit' },
          { account_id: ACCOUNT_ID_EQUITY, amount: '100.00', side: 'debit' },
        ],
      })
    ).rejects.toThrow('not balanced');
  });
});

// ---------------------------------------------------------------------------
// postJournalEntry — idempotency (fast path: one pool.query call, no tx)
// ---------------------------------------------------------------------------
describe('postJournalEntry — idempotency', () => {
  it('returns the existing entry when idempotency key has been seen before', async () => {
    // pool.query call 1: idempotency check → finds existing id
    // pool.query call 2: SELECT journal_entry row
    // pool.query call 3: SELECT ledger_lines
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: JOURNAL_ENTRY_ID }] } as any)  // idem check
      .mockResolvedValueOnce({ rows: [mockPostedEntry] } as any)             // entry row
      .mockResolvedValueOnce({ rows: mockLedgerLines } as any);              // lines

    const result = await postJournalEntry({
      description: 'Duplicate',
      idempotency_key: 'idem-123',
      lines: [
        { account_id: ACCOUNT_ID_CASH,   amount: '500.00', side: 'debit'  },
        { account_id: ACCOUNT_ID_EQUITY, amount: '500.00', side: 'credit' },
      ],
    });

    expect(result.id).toBe(JOURNAL_ENTRY_ID);
    // withTransaction should NOT have been called — returned early
    expect(mockWithTx).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// voidJournalEntry — pre-condition checks (uses pool.query + getJournalEntry)
// ---------------------------------------------------------------------------
describe('voidJournalEntry — pre-condition validation', () => {
  it('throws when the journal entry does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any); // getJournalEntry → not found

    await expect(voidJournalEntry('no-such-id')).rejects.toThrow('not found');
  });

  it('throws when the entry is already voided', async () => {
    // getJournalEntry: entry row + lines
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ...mockPostedEntry, status: 'voided' }] } as any)
      .mockResolvedValueOnce({ rows: mockLedgerLines } as any);

    await expect(voidJournalEntry(JOURNAL_ENTRY_ID)).rejects.toThrow("Only posted");
  });
});

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type NormalBalance = 'debit' | 'credit';
export type JournalEntryStatus = 'draft' | 'posted' | 'voided';
export type LedgerSide = 'debit' | 'credit';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  normal_balance: NormalBalance;
  /** Running balance stored as signed numeric (positive = normal balance side) */
  balance: string;
  /** Optimistic locking version — incremented on every balance update */
  version: number;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  description: string;
  reference: string | null;
  idempotency_key: string | null;
  status: JournalEntryStatus;
  posted_at: string | null;
  created_at: string;
  lines?: LedgerLine[];
}

export interface LedgerLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  account_code?: string;
  account_name?: string;
  amount: string;
  side: LedgerSide;
  created_at: string;
}

export interface LedgerLineInput {
  account_id: string;
  amount: string;
  side: LedgerSide;
}

export interface CreateJournalEntryInput {
  description: string;
  reference?: string;
  idempotency_key?: string;
  lines: LedgerLineInput[];
}

export interface TrialBalanceRow {
  account_id: string;
  code: string;
  name: string;
  type: AccountType;
  normal_balance: NormalBalance;
  debit_total: string;
  credit_total: string;
  balance: string;
}

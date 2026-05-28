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
  balance: string;
  version: number;
  created_at: string;
}

export interface LedgerLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  amount: string;
  side: LedgerSide;
  running_balance?: string;
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

export interface LedgerPage {
  account: Account;
  lines: LedgerLine[];
  total: number;
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

export interface TrialBalanceResponse {
  rows: TrialBalanceRow[];
  totals: {
    debit_total: string;
    credit_total: string;
    balanced: boolean;
  };
}

import { Account, JournalEntry, LedgerLine, LedgerPage, TrialBalanceResponse } from '../../api/types';

// -----------------------------------------------------------------------
// Accounts
// -----------------------------------------------------------------------
export const mockCashAccount: Account = {
  id: 'acct-1010',
  code: '1010',
  name: 'Cash & Cash Equivalents',
  type: 'asset',
  normal_balance: 'debit',
  balance: '5000.0000',
  version: 1,
  created_at: '2026-01-01T00:00:00Z',
};

export const mockDepositAccount: Account = {
  id: 'acct-2010',
  code: '2010',
  name: 'Customer Deposits',
  type: 'liability',
  normal_balance: 'credit',
  balance: '5000.0000',
  version: 1,
  created_at: '2026-01-01T00:00:00Z',
};

export const mockInterestIncomeAccount: Account = {
  id: 'acct-4010',
  code: '4010',
  name: 'Interest Income',
  type: 'revenue',
  normal_balance: 'credit',
  balance: '250.0000',
  version: 1,
  created_at: '2026-01-01T00:00:00Z',
};

export const mockSalariesAccount: Account = {
  id: 'acct-5020',
  code: '5020',
  name: 'Salaries & Benefits',
  type: 'expense',
  normal_balance: 'debit',
  balance: '1200.0000',
  version: 1,
  created_at: '2026-01-01T00:00:00Z',
};

export const mockAccounts: Account[] = [
  mockCashAccount,
  mockDepositAccount,
  mockInterestIncomeAccount,
  mockSalariesAccount,
];

// -----------------------------------------------------------------------
// Ledger lines
// -----------------------------------------------------------------------
export const mockLedgerLines: LedgerLine[] = [
  {
    id: 'line-1',
    journal_entry_id: 'je-1',
    account_id: 'acct-1010',
    account_code: '1010',
    account_name: 'Cash & Cash Equivalents',
    amount: '5000.0000',
    side: 'debit',
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'line-2',
    journal_entry_id: 'je-1',
    account_id: 'acct-2010',
    account_code: '2010',
    account_name: 'Customer Deposits',
    amount: '5000.0000',
    side: 'credit',
    created_at: '2026-01-15T10:00:00Z',
  },
];

// -----------------------------------------------------------------------
// Journal entries
// -----------------------------------------------------------------------
export const mockPostedEntry: JournalEntry = {
  id: 'je-1',
  description: 'Customer deposit received',
  reference: 'DEP-001',
  idempotency_key: 'key-001',
  status: 'posted',
  posted_at: '2026-01-15T10:00:00Z',
  created_at: '2026-01-15T10:00:00Z',
  lines: mockLedgerLines,
};

export const mockVoidedEntry: JournalEntry = {
  id: 'je-2',
  description: 'VOID: Customer deposit received',
  reference: 'VOID:je-1',
  idempotency_key: null,
  status: 'voided',
  posted_at: '2026-01-16T09:00:00Z',
  created_at: '2026-01-16T09:00:00Z',
  lines: [],
};

export const mockJournalEntries: JournalEntry[] = [mockPostedEntry, mockVoidedEntry];

// -----------------------------------------------------------------------
// Account ledger page
// -----------------------------------------------------------------------
export const mockLedgerPage: LedgerPage = {
  account: mockCashAccount,
  lines: [
    {
      ...mockLedgerLines[0],
      running_balance: '5000.0000',
    },
  ],
  total: 1,
};

// -----------------------------------------------------------------------
// Trial balance
// -----------------------------------------------------------------------
export const mockTrialBalanceBalanced: TrialBalanceResponse = {
  rows: [
    {
      account_id: 'acct-1010',
      code: '1010',
      name: 'Cash & Cash Equivalents',
      type: 'asset',
      normal_balance: 'debit',
      debit_total: '5000.0000',
      credit_total: '0.0000',
      balance: '5000.0000',
    },
    {
      account_id: 'acct-2010',
      code: '2010',
      name: 'Customer Deposits',
      type: 'liability',
      normal_balance: 'credit',
      debit_total: '0.0000',
      credit_total: '5000.0000',
      balance: '5000.0000',
    },
  ],
  totals: {
    debit_total: '5000.0000',
    credit_total: '5000.0000',
    balanced: true,
  },
};

export const mockTrialBalanceUnbalanced: TrialBalanceResponse = {
  rows: mockTrialBalanceBalanced.rows,
  totals: {
    debit_total: '5000.0000',
    credit_total: '3000.0000',
    balanced: false,
  },
};

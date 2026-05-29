import { Account, JournalEntry, LedgerLine, TrialBalanceRow } from '../types/index';

export const ACCOUNT_ID_CASH    = '00000000-0000-0000-0000-000000000001';
export const ACCOUNT_ID_EQUITY  = '00000000-0000-0000-0000-000000000002';
export const ACCOUNT_ID_REVENUE = '00000000-0000-0000-0000-000000000003';
export const JOURNAL_ENTRY_ID   = 'aaaaaaaa-0000-0000-0000-000000000001';

export const mockAccountCash: Account = {
  id: ACCOUNT_ID_CASH,
  code: '1010',
  name: 'Cash',
  type: 'asset',
  normal_balance: 'debit',
  balance: '1000.0000',
  version: 1,
  created_at: '2024-01-01T00:00:00.000Z',
};

export const mockAccountEquity: Account = {
  id: ACCOUNT_ID_EQUITY,
  code: '3010',
  name: "Owner's Equity",
  type: 'equity',
  normal_balance: 'credit',
  balance: '1000.0000',
  version: 1,
  created_at: '2024-01-01T00:00:00.000Z',
};

export const mockAccountRevenue: Account = {
  id: ACCOUNT_ID_REVENUE,
  code: '4010',
  name: 'Service Revenue',
  type: 'revenue',
  normal_balance: 'credit',
  balance: '500.0000',
  version: 1,
  created_at: '2024-01-01T00:00:00.000Z',
};

export const mockLedgerLines: LedgerLine[] = [
  {
    id: 'line-1',
    journal_entry_id: JOURNAL_ENTRY_ID,
    account_id: ACCOUNT_ID_CASH,
    account_code: '1010',
    account_name: 'Cash',
    amount: '1000.0000',
    side: 'debit',
    created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'line-2',
    journal_entry_id: JOURNAL_ENTRY_ID,
    account_id: ACCOUNT_ID_EQUITY,
    account_code: '3010',
    account_name: "Owner's Equity",
    amount: '1000.0000',
    side: 'credit',
    created_at: '2024-01-01T00:00:00.000Z',
  },
];

export const mockPostedEntry: JournalEntry = {
  id: JOURNAL_ENTRY_ID,
  description: 'Initial capital contribution',
  reference: null,
  idempotency_key: null,
  status: 'posted',
  posted_at: '2024-01-01T00:00:00.000Z',
  created_at: '2024-01-01T00:00:00.000Z',
  lines: mockLedgerLines,
};

export const mockVoidedEntry: JournalEntry = {
  ...mockPostedEntry,
  status: 'voided',
};

export const mockReversingEntry: JournalEntry = {
  id: 'bbbbbbbb-0000-0000-0000-000000000001',
  description: 'VOID: Initial capital contribution',
  reference: `VOID:${JOURNAL_ENTRY_ID}`,
  idempotency_key: null,
  status: 'posted',
  posted_at: '2024-01-02T00:00:00.000Z',
  created_at: '2024-01-02T00:00:00.000Z',
  lines: mockLedgerLines.map((l) => ({
    ...l,
    id: `void-${l.id}`,
    side: l.side === 'debit' ? 'credit' : 'debit',
  })),
};

export const mockTrialBalanceRows: TrialBalanceRow[] = [
  {
    account_id: ACCOUNT_ID_CASH,
    code: '1010',
    name: 'Cash',
    type: 'asset',
    normal_balance: 'debit',
    debit_total: '1000.0000',
    credit_total: '0.0000',
    balance: '1000.0000',
  },
  {
    account_id: ACCOUNT_ID_EQUITY,
    code: '3010',
    name: "Owner's Equity",
    type: 'equity',
    normal_balance: 'credit',
    debit_total: '0.0000',
    credit_total: '1000.0000',
    balance: '1000.0000',
  },
];

export const validEntryBody = {
  description: 'Initial capital contribution',
  lines: [
    { account_id: ACCOUNT_ID_CASH,   amount: '1000.00', side: 'debit'  },
    { account_id: ACCOUNT_ID_EQUITY, amount: '1000.00', side: 'credit' },
  ],
};

/**
 * Seed the Chart of Accounts with a standard set of accounts
 * following the typical 5-digit account numbering used in banking/finance.
 */
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { pool } from './pool';

const accounts = [
  // Assets (1xxx) — normal balance: DEBIT
  { code: '1010', name: 'Cash & Cash Equivalents',       type: 'asset',     normal_balance: 'debit'  },
  { code: '1020', name: 'Accounts Receivable',           type: 'asset',     normal_balance: 'debit'  },
  { code: '1030', name: 'Loans Receivable',              type: 'asset',     normal_balance: 'debit'  },
  { code: '1040', name: 'Securities Held',               type: 'asset',     normal_balance: 'debit'  },
  { code: '1050', name: 'Prepaid Expenses',              type: 'asset',     normal_balance: 'debit'  },
  { code: '1900', name: 'Fixed Assets',                  type: 'asset',     normal_balance: 'debit'  },

  // Liabilities (2xxx) — normal balance: CREDIT
  { code: '2010', name: 'Customer Deposits',             type: 'liability', normal_balance: 'credit' },
  { code: '2020', name: 'Accounts Payable',              type: 'liability', normal_balance: 'credit' },
  { code: '2030', name: 'Accrued Liabilities',           type: 'liability', normal_balance: 'credit' },
  { code: '2040', name: 'Borrowings',                    type: 'liability', normal_balance: 'credit' },
  { code: '2050', name: 'Unearned Revenue',              type: 'liability', normal_balance: 'credit' },

  // Equity (3xxx) — normal balance: CREDIT
  { code: '3010', name: 'Common Stock',                  type: 'equity',    normal_balance: 'credit' },
  { code: '3020', name: 'Retained Earnings',             type: 'equity',    normal_balance: 'credit' },
  { code: '3030', name: 'Current Year Earnings',         type: 'equity',    normal_balance: 'credit' },

  // Revenue (4xxx) — normal balance: CREDIT
  { code: '4010', name: 'Interest Income',               type: 'revenue',   normal_balance: 'credit' },
  { code: '4020', name: 'Fee Income',                    type: 'revenue',   normal_balance: 'credit' },
  { code: '4030', name: 'Service Charge Income',         type: 'revenue',   normal_balance: 'credit' },

  // Expenses (5xxx) — normal balance: DEBIT
  { code: '5010', name: 'Interest Expense',              type: 'expense',   normal_balance: 'debit'  },
  { code: '5020', name: 'Salaries & Benefits',           type: 'expense',   normal_balance: 'debit'  },
  { code: '5030', name: 'Occupancy Expense',             type: 'expense',   normal_balance: 'debit'  },
  { code: '5040', name: 'Technology & Systems',          type: 'expense',   normal_balance: 'debit'  },
  { code: '5050', name: 'Provision for Loan Losses',     type: 'expense',   normal_balance: 'debit'  },
];

async function seed(): Promise<void> {
  for (const acct of accounts) {
    await pool.query(
      `INSERT INTO accounts (code, name, type, normal_balance)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO NOTHING`,
      [acct.code, acct.name, acct.type, acct.normal_balance]
    );
  }
  console.log(`Seeded ${accounts.length} accounts.`);
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

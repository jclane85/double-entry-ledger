-- ============================================================
-- Migration 001: Initial ledger schema
-- Financial institution best practices:
--   - Immutable ledger lines (no UPDATE/DELETE)
--   - Double-entry constraint enforced at application layer
--   - Row-level locking on accounts for balance updates
--   - Idempotency key on journal entries
--   - Optimistic locking (version) on accounts
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------
-- Chart of Accounts
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(20) UNIQUE NOT NULL,
  name            VARCHAR(255) NOT NULL,
  type            VARCHAR(20) NOT NULL
                    CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  normal_balance  VARCHAR(10) NOT NULL
                    CHECK (normal_balance IN ('debit', 'credit')),
  -- Running balance: positive means normal_balance side
  balance         NUMERIC(19, 4) NOT NULL DEFAULT 0,
  -- Optimistic locking: incremented on every balance change
  version         INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts (code);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts (type);

-- -----------------------------------------------
-- Journal Entries (immutable header record)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS journal_entries (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  description      TEXT         NOT NULL,
  reference        VARCHAR(100),
  -- Idempotency key: clients include a unique key so that retrying
  -- a failed request never double-posts the same entry.
  idempotency_key  VARCHAR(255) UNIQUE,
  status           VARCHAR(20)  NOT NULL DEFAULT 'posted'
                     CHECK (status IN ('draft', 'posted', 'voided')),
  posted_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_je_status    ON journal_entries (status);
CREATE INDEX IF NOT EXISTS idx_je_idem_key  ON journal_entries (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_je_reference ON journal_entries (reference)
  WHERE reference IS NOT NULL;

-- -----------------------------------------------
-- Ledger Lines (immutable debit/credit rows)
-- Never UPDATE or DELETE these rows.
-- Corrections are made via reversing journal entries.
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS ledger_lines (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id  UUID        NOT NULL REFERENCES journal_entries (id),
  account_id        UUID        NOT NULL REFERENCES accounts (id),
  amount            NUMERIC(19, 4) NOT NULL
                      CHECK (amount > 0),  -- always positive; side determines direction
  side              VARCHAR(10) NOT NULL
                      CHECK (side IN ('debit', 'credit')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ll_journal_entry ON ledger_lines (journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_ll_account       ON ledger_lines (account_id);
CREATE INDEX IF NOT EXISTS idx_ll_account_date  ON ledger_lines (account_id, created_at DESC);

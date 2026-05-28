# Double-Entry Ledger

A full-stack double-entry bookkeeping system demonstrating **financial institution best practices**.

## Stack
- **API**: Fastify + TypeScript + Node.js
- **Database**: PostgreSQL 16
- **Frontend**: React 18 + Vite + TanStack Query

---

## Financial Institution Best Practices Demonstrated

| Practice | Implementation |
|---|---|
| **Double-entry bookkeeping** | Every journal entry must have balanced debit/credit lines |
| **Immutable ledger** | `ledger_lines` are never updated or deleted — corrections via reversing entries |
| **ACID transactions** | All balance changes run inside a `BEGIN SERIALIZABLE` transaction |
| **Write-then-read** | After commit, re-SELECTs the committed entry before returning to caller |
| **Row-level locking** | `SELECT ... FOR UPDATE` on accounts prevents concurrent balance corruption |
| **Deadlock prevention** | Accounts always locked in `id` order across concurrent requests |
| **Optimistic locking** | `version` column on accounts detects stale reads and forces retry |
| **Idempotency keys** | Clients pass a unique key; duplicate POSTs return the original response |
| **Voiding (not deleting)** | Voiding creates a reversing journal entry; original is never mutated |
| **Audit trail** | All rows have `created_at`; status transitions are tracked |
| **Balance verification** | Trial balance report confirms `sum(debits) = sum(credits)` at any time |

---

## Quick Start

### Prerequisites
- Docker Desktop
- Node.js 20+

### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Set up and run the API

```bash
cd api
cp .env.example .env
npm install
npm run migrate   # create schema
npm run seed      # populate chart of accounts
npm run dev       # start on http://localhost:3001
```

### 3. Run the frontend

```bash
cd web
npm install
npm run dev       # start on http://localhost:5173
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/accounts` | List all accounts |
| `POST` | `/accounts` | Create an account |
| `GET` | `/accounts/:id` | Get account details |
| `GET` | `/accounts/:id/ledger` | Paginated account ledger with running balance |
| `GET` | `/journal-entries` | List journal entries |
| `GET` | `/journal-entries/:id` | Get entry with lines |
| `POST` | `/journal-entries` | **Post a journal entry (transactional)** |
| `POST` | `/journal-entries/:id/void` | Void an entry (creates reversing entry) |
| `GET` | `/reports/trial-balance` | Trial balance report |
| `GET` | `/health` | Health check |

### Post a Journal Entry

```json
POST /journal-entries
{
  "description": "Customer deposit received",
  "reference": "DEP-001",
  "idempotency_key": "client-uuid-here",
  "lines": [
    { "account_id": "<cash-account-uuid>",    "side": "debit",  "amount": "1000.00" },
    { "account_id": "<deposit-account-uuid>", "side": "credit", "amount": "1000.00" }
  ]
}
```

The API will:
1. Validate lines are balanced (debits = credits)
2. Check the idempotency key (returns existing entry if already posted)
3. Open a `SERIALIZABLE` transaction
4. Lock all affected account rows `FOR UPDATE` (in id order to prevent deadlocks)
5. Insert the journal entry header and ledger lines
6. Update account balances with optimistic locking (`version` check)
7. Commit
8. Re-read the committed entry (**write-then-read**) and return it

---

## Project Structure

```
ledger/
├── docker-compose.yml
├── api/
│   └── src/
│       ├── index.ts                     ← Fastify server
│       ├── db/
│       │   ├── pool.ts                  ← pg pool + withTransaction()
│       │   ├── migrate.ts
│       │   ├── seed.ts
│       │   └── migrations/001_init.sql  ← immutable schema
│       ├── routes/
│       │   ├── accounts.ts
│       │   ├── journal-entries.ts
│       │   └── reports.ts
│       ├── services/
│       │   └── ledger.service.ts        ← core transactional logic
│       └── types/index.ts
└── web/
    └── src/
        ├── App.tsx
        ├── api/                         ← typed fetch wrappers
        ├── components/
        └── pages/
            ├── ChartOfAccounts.tsx
            ├── NewJournalEntry.tsx       ← real-time balance check UI
            ├── JournalEntries.tsx
            ├── AccountLedger.tsx         ← running balance via window function
            └── TrialBalance.tsx
```

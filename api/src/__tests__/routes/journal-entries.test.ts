import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { errorHandler } from '../../plugins/error-handler';
import { journalEntryRoutes } from '../../routes/journal-entries';
import * as ledgerService from '../../services/ledger.service';
import {
  mockPostedEntry,
  mockReversingEntry,
  mockAccountCash,
  ACCOUNT_ID_CASH,
  JOURNAL_ENTRY_ID,
  validEntryBody,
} from '../fixtures';

// Factory mock prevents pool.ts from being evaluated (avoids DATABASE_URL throw)
vi.mock('../../services/ledger.service', () => ({
  listJournalEntries: vi.fn(),
  getJournalEntry:    vi.fn(),
  postJournalEntry:   vi.fn(),
  voidJournalEntry:   vi.fn(),
  getAccountLedger:   vi.fn(),
}));

let app: FastifyInstance;

beforeEach(async () => {
  app = Fastify({ logger: false });
  await app.register(errorHandler);
  await app.register(journalEntryRoutes);
  await app.ready();
});

afterEach(async () => {
  vi.clearAllMocks();
  await app.close();
});

// ---------------------------------------------------------------------------
// GET /journal-entries
// ---------------------------------------------------------------------------
describe('GET /journal-entries', () => {
  it('returns 200 with list of entries', async () => {
    vi.mocked(ledgerService.listJournalEntries).mockResolvedValue([mockPostedEntry]);

    const res = await app.inject({ method: 'GET', url: '/journal-entries' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([mockPostedEntry]);
  });

  it('passes limit and offset to the service', async () => {
    vi.mocked(ledgerService.listJournalEntries).mockResolvedValue([]);

    await app.inject({ method: 'GET', url: '/journal-entries?limit=10&offset=20' });

    expect(ledgerService.listJournalEntries).toHaveBeenCalledWith(10, 20);
  });

  it('caps limit at 200', async () => {
    vi.mocked(ledgerService.listJournalEntries).mockResolvedValue([]);

    await app.inject({ method: 'GET', url: '/journal-entries?limit=999' });

    expect(ledgerService.listJournalEntries).toHaveBeenCalledWith(200, 0);
  });
});

// ---------------------------------------------------------------------------
// GET /journal-entries/:id
// ---------------------------------------------------------------------------
describe('GET /journal-entries/:id', () => {
  it('returns 200 with the entry when found', async () => {
    vi.mocked(ledgerService.getJournalEntry).mockResolvedValue(mockPostedEntry);

    const res = await app.inject({ method: 'GET', url: `/journal-entries/${JOURNAL_ENTRY_ID}` });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockPostedEntry);
  });

  it('returns 404 when entry does not exist', async () => {
    vi.mocked(ledgerService.getJournalEntry).mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: `/journal-entries/${JOURNAL_ENTRY_ID}` });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: 'Journal entry not found' });
  });
});

// ---------------------------------------------------------------------------
// POST /journal-entries
// ---------------------------------------------------------------------------
describe('POST /journal-entries', () => {
  it('returns 201 with the posted entry for a valid balanced request', async () => {
    vi.mocked(ledgerService.postJournalEntry).mockResolvedValue(mockPostedEntry);

    const res = await app.inject({
      method: 'POST',
      url: '/journal-entries',
      payload: validEntryBody,
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual(mockPostedEntry);
  });

  it('returns 400 when description is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/journal-entries',
      payload: { lines: validEntryBody.lines },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'Validation error' });
  });

  it('returns 400 when fewer than 2 lines are provided', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/journal-entries',
      payload: {
        description: 'Bad',
        lines: [validEntryBody.lines[0]],
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'Validation error' });
  });

  it('returns 400 when a line amount has invalid format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/journal-entries',
      payload: {
        ...validEntryBody,
        lines: [
          { ...validEntryBody.lines[0], amount: '-100' },
          validEntryBody.lines[1],
        ],
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'Validation error' });
  });

  it('returns 422 when the service throws a domain error (unbalanced)', async () => {
    vi.mocked(ledgerService.postJournalEntry).mockRejectedValue(
      new Error('Entry is not balanced: debits=100.0000 credits=50.0000')
    );

    const res = await app.inject({
      method: 'POST',
      url: '/journal-entries',
      payload: validEntryBody,
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().error).toMatch('not balanced');
  });

  it('accepts an optional idempotency_key and passes it to the service', async () => {
    vi.mocked(ledgerService.postJournalEntry).mockResolvedValue(mockPostedEntry);

    await app.inject({
      method: 'POST',
      url: '/journal-entries',
      payload: { ...validEntryBody, idempotency_key: 'idem-abc' },
    });

    expect(ledgerService.postJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({ idempotency_key: 'idem-abc' })
    );
  });
});

// ---------------------------------------------------------------------------
// POST /journal-entries/:id/void
// ---------------------------------------------------------------------------
describe('POST /journal-entries/:id/void', () => {
  it('returns 201 with the reversing entry on success', async () => {
    vi.mocked(ledgerService.voidJournalEntry).mockResolvedValue(mockReversingEntry);

    const res = await app.inject({
      method: 'POST',
      url: `/journal-entries/${JOURNAL_ENTRY_ID}/void`,
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual(mockReversingEntry);
  });

  it('returns 422 when the service throws because entry is already voided', async () => {
    vi.mocked(ledgerService.voidJournalEntry).mockRejectedValue(
      new Error("Only posted entries can be voided; status is 'voided'")
    );

    const res = await app.inject({
      method: 'POST',
      url: `/journal-entries/${JOURNAL_ENTRY_ID}/void`,
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().error).toMatch('Only posted');
  });
});

// ---------------------------------------------------------------------------
// GET /accounts/:id/ledger
// ---------------------------------------------------------------------------
describe('GET /accounts/:id/ledger', () => {
  const mockLedgerPage: ledgerService.LedgerPage = {
    account: mockAccountCash,
    lines: [],
    total: 0,
  };

  it('returns 200 with the ledger page when account exists', async () => {
    vi.mocked(ledgerService.getAccountLedger).mockResolvedValue(mockLedgerPage);

    const res = await app.inject({
      method: 'GET',
      url: `/accounts/${ACCOUNT_ID_CASH}/ledger`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockLedgerPage);
  });

  it('returns 404 when account does not exist', async () => {
    vi.mocked(ledgerService.getAccountLedger).mockResolvedValue(null);

    const res = await app.inject({
      method: 'GET',
      url: `/accounts/${ACCOUNT_ID_CASH}/ledger`,
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: 'Account not found' });
  });

  it('passes limit and offset to the service', async () => {
    vi.mocked(ledgerService.getAccountLedger).mockResolvedValue(mockLedgerPage);

    await app.inject({
      method: 'GET',
      url: `/accounts/${ACCOUNT_ID_CASH}/ledger?limit=25&offset=50`,
    });

    expect(ledgerService.getAccountLedger).toHaveBeenCalledWith(ACCOUNT_ID_CASH, 25, 50);
  });
});

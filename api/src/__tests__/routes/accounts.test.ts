import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { errorHandler } from '../../plugins/error-handler';
import { accountRoutes } from '../../routes/accounts';
import * as ledgerService from '../../services/ledger.service';
import {
  mockAccountCash,
  mockAccountEquity,
  ACCOUNT_ID_CASH,
} from '../fixtures';

// Factory mock prevents pool.ts from being evaluated (avoids DATABASE_URL throw)
vi.mock('../../services/ledger.service', () => ({
  listAccounts:   vi.fn(),
  getAccount:     vi.fn(),
  createAccount:  vi.fn(),
}));

let app: FastifyInstance;

beforeEach(async () => {
  app = Fastify({ logger: false });
  await app.register(errorHandler);
  await app.register(accountRoutes);
  await app.ready();
});

afterEach(async () => {
  vi.clearAllMocks();
  await app.close();
});

// ---------------------------------------------------------------------------
// GET /accounts
// ---------------------------------------------------------------------------
describe('GET /accounts', () => {
  it('returns 200 with the list of accounts', async () => {
    vi.mocked(ledgerService.listAccounts).mockResolvedValue([mockAccountCash, mockAccountEquity]);

    const res = await app.inject({ method: 'GET', url: '/accounts' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([mockAccountCash, mockAccountEquity]);
  });

  it('returns 200 with an empty array when no accounts exist', async () => {
    vi.mocked(ledgerService.listAccounts).mockResolvedValue([]);

    const res = await app.inject({ method: 'GET', url: '/accounts' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// GET /accounts/:id
// ---------------------------------------------------------------------------
describe('GET /accounts/:id', () => {
  it('returns 200 with the account when found', async () => {
    vi.mocked(ledgerService.getAccount).mockResolvedValue(mockAccountCash);

    const res = await app.inject({ method: 'GET', url: `/accounts/${ACCOUNT_ID_CASH}` });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockAccountCash);
  });

  it('returns 404 when account does not exist', async () => {
    vi.mocked(ledgerService.getAccount).mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: `/accounts/${ACCOUNT_ID_CASH}` });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: 'Account not found' });
  });
});

// ---------------------------------------------------------------------------
// POST /accounts
// ---------------------------------------------------------------------------
describe('POST /accounts', () => {
  const validBody = {
    code: '9999',
    name: 'Test Account',
    type: 'asset',
    normal_balance: 'debit',
  };

  it('returns 201 with the created account', async () => {
    vi.mocked(ledgerService.createAccount).mockResolvedValue(mockAccountCash);

    const res = await app.inject({
      method: 'POST',
      url: '/accounts',
      payload: validBody,
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual(mockAccountCash);
    expect(ledgerService.createAccount).toHaveBeenCalledWith(
      validBody.code,
      validBody.name,
      validBody.type,
      validBody.normal_balance,
    );
  });

  it('returns 400 when code is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/accounts',
      payload: { name: 'Test', type: 'asset', normal_balance: 'debit' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'Validation error' });
  });

  it('returns 400 when type is not a valid enum value', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/accounts',
      payload: { ...validBody, type: 'banana' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'Validation error' });
  });

  it('returns 400 when normal_balance is not debit or credit', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/accounts',
      payload: { ...validBody, normal_balance: 'both' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'Validation error' });
  });

  it('returns 400 when name exceeds 255 characters', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/accounts',
      payload: { ...validBody, name: 'A'.repeat(256) },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'Validation error' });
  });
});

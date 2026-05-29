import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { reportRoutes } from '../../routes/reports';
import * as ledgerService from '../../services/ledger.service';
import { mockTrialBalanceRows } from '../fixtures';

// Factory mock prevents pool.ts from being evaluated (avoids DATABASE_URL throw)
vi.mock('../../services/ledger.service', () => ({
  getTrialBalance: vi.fn(),
}));

let app: FastifyInstance;

beforeEach(async () => {
  app = Fastify({ logger: false });
  await app.register(reportRoutes);
  await app.ready();
});

afterEach(async () => {
  vi.clearAllMocks();
  await app.close();
});

// ---------------------------------------------------------------------------
// GET /reports/trial-balance
// ---------------------------------------------------------------------------
describe('GET /reports/trial-balance', () => {
  it('returns 200 with rows and calculated totals', async () => {
    vi.mocked(ledgerService.getTrialBalance).mockResolvedValue(mockTrialBalanceRows);

    const res = await app.inject({ method: 'GET', url: '/reports/trial-balance' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.rows).toEqual(mockTrialBalanceRows);
    expect(body.totals).toBeDefined();
  });

  it('reports balanced=true when debits equal credits', async () => {
    // mockTrialBalanceRows: 1000 debit / 1000 credit — perfectly balanced
    vi.mocked(ledgerService.getTrialBalance).mockResolvedValue(mockTrialBalanceRows);

    const res = await app.inject({ method: 'GET', url: '/reports/trial-balance' });
    const { totals } = res.json();

    expect(totals.debit_total).toBe('1000.0000');
    expect(totals.credit_total).toBe('1000.0000');
    expect(totals.balanced).toBe(true);
  });

  it('reports balanced=false when debits do not equal credits', async () => {
    const unbalancedRows = [
      { ...mockTrialBalanceRows[0], debit_total: '1500.0000' },
      mockTrialBalanceRows[1],
    ];
    vi.mocked(ledgerService.getTrialBalance).mockResolvedValue(unbalancedRows);

    const res = await app.inject({ method: 'GET', url: '/reports/trial-balance' });
    const { totals } = res.json();

    expect(totals.balanced).toBe(false);
  });

  it('returns an empty rows array and zero totals when ledger has no data', async () => {
    vi.mocked(ledgerService.getTrialBalance).mockResolvedValue([]);

    const res = await app.inject({ method: 'GET', url: '/reports/trial-balance' });
    const { rows, totals } = res.json();

    expect(rows).toEqual([]);
    expect(totals.debit_total).toBe('0.0000');
    expect(totals.credit_total).toBe('0.0000');
    expect(totals.balanced).toBe(true);
  });
});

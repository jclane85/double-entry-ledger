import { FastifyInstance } from 'fastify';
import { getTrialBalance } from '../services/ledger.service';

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /reports/trial-balance
   *
   * Returns a trial balance — sum of all account balances.
   * In a correct ledger: sum(debit_total) === sum(credit_total).
   */
  app.get('/reports/trial-balance', async (_req, reply) => {
    const rows = await getTrialBalance();

    let totalDebits = 0;
    let totalCredits = 0;
    for (const row of rows) {
      totalDebits += parseFloat(row.debit_total as unknown as string);
      totalCredits += parseFloat(row.credit_total as unknown as string);
    }

    return reply.send({
      rows,
      totals: {
        debit_total: totalDebits.toFixed(4),
        credit_total: totalCredits.toFixed(4),
        balanced: Math.abs(totalDebits - totalCredits) < 0.0001,
      },
    });
  });
}

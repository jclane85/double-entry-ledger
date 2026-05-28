import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  postJournalEntry,
  voidJournalEntry,
  listJournalEntries,
  getJournalEntry,
  getAccountLedger,
} from '../services/ledger.service';

const LedgerLineSchema = z.object({
  account_id: z.string().uuid(),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, 'Amount must be a positive decimal with up to 4 decimal places'),
  side: z.enum(['debit', 'credit']),
});

const CreateJournalEntrySchema = z.object({
  description: z.string().min(1).max(1000),
  reference: z.string().max(100).optional(),
  idempotency_key: z.string().max(255).optional(),
  lines: z.array(LedgerLineSchema).min(2),
});

export async function journalEntryRoutes(app: FastifyInstance): Promise<void> {
  // List journal entries
  app.get('/journal-entries', async (req, reply) => {
    const query = req.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit ?? '50', 10), 200);
    const offset = parseInt(query.offset ?? '0', 10);
    const entries = await listJournalEntries(limit, offset);
    return reply.send(entries);
  });

  // Get single journal entry with lines
  app.get<{ Params: { id: string } }>('/journal-entries/:id', async (req, reply) => {
    const entry = await getJournalEntry(req.params.id);
    if (!entry) return reply.status(404).send({ error: 'Journal entry not found' });
    return reply.send(entry);
  });

  /**
   * POST /journal-entries
   *
   * Core transactional endpoint. The service layer:
   *   1. Validates lines balance (debits = credits)
   *   2. Checks idempotency key to prevent duplicate posts
   *   3. Runs everything in a SERIALIZABLE transaction with row-level locking
   *   4. Re-reads the committed entry (write-then-read) before responding
   */
  app.post('/journal-entries', async (req, reply) => {
    const parsed = CreateJournalEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.flatten() });
    }

    const entry = await postJournalEntry(parsed.data);
    return reply.status(201).send(entry);
  });

  /**
   * POST /journal-entries/:id/void
   *
   * Void a posted entry by creating a reversing entry.
   * The original entry is never mutated (immutable ledger principle).
   */
  app.post<{ Params: { id: string } }>('/journal-entries/:id/void', async (req, reply) => {
    const reversing = await voidJournalEntry(req.params.id);
    return reply.status(201).send(reversing);
  });

  // Account ledger with paginated running balance
  app.get<{ Params: { id: string } }>('/accounts/:id/ledger', async (req, reply) => {
    const query = req.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit ?? '50', 10), 200);
    const offset = parseInt(query.offset ?? '0', 10);
    const page = await getAccountLedger(req.params.id, limit, offset);
    if (!page) return reply.status(404).send({ error: 'Account not found' });
    return reply.send(page);
  });
}

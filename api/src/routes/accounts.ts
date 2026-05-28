import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAccount, listAccounts, getAccount } from '../services/ledger.service';

const CreateAccountSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
  normal_balance: z.enum(['debit', 'credit']),
});

export async function accountRoutes(app: FastifyInstance): Promise<void> {
  app.get('/accounts', async (_req, reply) => {
    const accounts = await listAccounts();
    return reply.send(accounts);
  });

  app.get<{ Params: { id: string } }>('/accounts/:id', async (req, reply) => {
    const account = await getAccount(req.params.id);
    if (!account) return reply.status(404).send({ error: 'Account not found' });
    return reply.send(account);
  });

  app.post('/accounts', async (req, reply) => {
    const parsed = CreateAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.flatten() });
    }
    const { code, name, type, normal_balance } = parsed.data;
    const account = await createAccount(code, name, type, normal_balance);
    return reply.status(201).send(account);
  });
}

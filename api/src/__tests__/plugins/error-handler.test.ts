import { describe, it, expect } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { errorHandler } from '../../plugins/error-handler';

// ---------------------------------------------------------------------------
// Helper — register the error handler and add a test route that throws with
// the specified message/code.
// ---------------------------------------------------------------------------
async function buildApp(opts: {
  statusCode?: number;
  message: string;
  code?: string;
}): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(errorHandler);

  app.get('/throw', async () => {
    const err: any = new Error(opts.message);
    if (opts.statusCode !== undefined) err.statusCode = opts.statusCode;
    if (opts.code !== undefined) err.code = opts.code;
    throw err;
  });

  await app.ready();
  return app;
}

// ---------------------------------------------------------------------------
// 4xx client errors — our handler calls reply.send({ error: error.message })
// ---------------------------------------------------------------------------
describe('error-handler — 4xx client errors', () => {
  it('forwards 400 errors with their message', async () => {
    const app = await buildApp({ statusCode: 400, message: 'Bad request payload' });
    const res = await app.inject({ method: 'GET', url: '/throw' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'Bad request payload' });
    await app.close();
  });

  it('forwards 404 errors with their message', async () => {
    const app = await buildApp({ statusCode: 404, message: 'Resource not found' });
    const res = await app.inject({ method: 'GET', url: '/throw' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: 'Resource not found' });
    await app.close();
  });
});

// ---------------------------------------------------------------------------
// Domain errors — classified as 422 based on message content
// ---------------------------------------------------------------------------
describe('error-handler — domain errors → 422', () => {
  const domainCases = [
    'Entry is not balanced: debits=100.0000 credits=50.0000',
    'Account(s) not found: some-id',
    "Only posted entries can be voided; status is 'voided'",
    'Concurrent modification detected on account 1010. Please retry.',
    'A journal entry requires at least two lines',
    'Line amount must be positive; got -10',
  ];

  for (const message of domainCases) {
    it(`maps "${message.slice(0, 40)}…" to 422`, async () => {
      const app = await buildApp({ message });
      const res = await app.inject({ method: 'GET', url: '/throw' });
      expect(res.statusCode).toBe(422);
      expect(res.json()).toEqual({ error: message });
      await app.close();
    });
  }
});

// ---------------------------------------------------------------------------
// Idempotency key conflict — Postgres unique_violation (23505) → 409
// ---------------------------------------------------------------------------
describe('error-handler — duplicate idempotency key → 409', () => {
  it('returns 409 when Postgres raises unique_violation (code 23505)', async () => {
    const app = await buildApp({ message: 'duplicate key value violates unique constraint', code: '23505' });
    const res = await app.inject({ method: 'GET', url: '/throw' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'Conflict: duplicate idempotency_key' });
    await app.close();
  });
});

// ---------------------------------------------------------------------------
// Unknown 500 errors — message must be sanitized (no leak of internal details)
// ---------------------------------------------------------------------------
describe('error-handler — unknown 500 errors', () => {
  it('returns 500 with a generic message, not the raw error details', async () => {
    const app = await buildApp({ message: 'pg connection refused at 127.0.0.1:5432' });
    const res = await app.inject({ method: 'GET', url: '/throw' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ error: 'Internal server error' });
    // The raw connection details must NOT be exposed to the caller
    expect(res.body).not.toContain('127.0.0.1');
    await app.close();
  });
});

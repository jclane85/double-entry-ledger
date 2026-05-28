import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { accountRoutes } from './routes/accounts';
import { journalEntryRoutes } from './routes/journal-entries';
import { reportRoutes } from './routes/reports';
import { errorHandler } from './plugins/error-handler';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

// Parse comma-separated allowed origins from env; falls back to localhost in dev
function getAllowedOrigins(): string[] | boolean {
  const raw = process.env.ALLOWED_ORIGINS ?? '';
  if (raw.trim()) return raw.split(',').map((o) => o.trim());
  return IS_PROD ? false : ['http://localhost:5173'];
}

async function build() {
  const app = Fastify({
    logger: {
      level: IS_PROD ? 'warn' : 'info',
      transport: !IS_PROD
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    // 1 MB body limit — prevents oversized payload attacks
    bodyLimit: 1_048_576,
  });

  // Security headers (CSP, X-Frame-Options, HSTS, etc.)
  await app.register(helmet, {
    contentSecurityPolicy: IS_PROD,   // enable full CSP in prod; relax in dev
    crossOriginEmbedderPolicy: IS_PROD,
  });

  // CORS — explicit allowlist; never wildcard in production
  await app.register(cors, {
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Rate limiting — 100 requests / 15 min per IP (financial API baseline)
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '15 minutes',
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please slow down.',
    }),
  });

  await app.register(errorHandler);
  await app.register(accountRoutes);
  await app.register(journalEntryRoutes);
  await app.register(reportRoutes);

  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  return app;
}

async function main() {
  const app = await build();
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Ledger API running on http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();

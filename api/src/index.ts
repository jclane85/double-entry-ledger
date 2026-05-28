import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { accountRoutes } from './routes/accounts';
import { journalEntryRoutes } from './routes/journal-entries';
import { reportRoutes } from './routes/reports';
import { errorHandler } from './plugins/error-handler';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

async function build() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  await app.register(cors, {
    origin: process.env.NODE_ENV === 'production' ? false : true,
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

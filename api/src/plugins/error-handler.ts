import fp from 'fastify-plugin';
import { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

async function errorHandlerPlugin(app: FastifyInstance): Promise<void> {
  app.setErrorHandler(
    (error: FastifyError, _req: FastifyRequest, reply: FastifyReply) => {
      const status = error.statusCode ?? 500;

      if (status < 500) {
        return reply.status(status).send({ error: error.message });
      }

      // Domain errors from the ledger service are surfaced as 422 Unprocessable
      const domainErrors = [
        'not balanced',
        'not found',
        'Already voided',
        'Only posted',
        'Concurrent modification',
        'requires at least',
        'must be positive',
      ];
      if (domainErrors.some((msg) => error.message.includes(msg))) {
        return reply.status(422).send({ error: error.message });
      }

      // Idempotency key conflict (Postgres unique_violation code 23505)
      if ((error as any).code === '23505') {
        return reply.status(409).send({ error: 'Conflict: duplicate idempotency_key' });
      }

      app.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  );
}

// fastify-plugin breaks encapsulation so setErrorHandler applies to the root app
// and all sibling/child plugins — required in Fastify v5.
export const errorHandler = fp(errorHandlerPlugin);

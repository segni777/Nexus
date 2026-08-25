import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { pinoHttp } from 'pino-http';
import type { PrismaClient } from '@prisma/client';
import { logger } from './config/logger.js';
import { prisma } from './db/prisma.js';
import { createRepositories } from './repositories/index.js';
import { createServices } from './services/index.js';
import { createContext, type GraphQLContext } from './graphql/context.js';
import { errorLoggingPlugin } from './graphql/error-logging-plugin.js';
import { formatGraphQLError } from './graphql/format-error.js';
import { resolvers } from './graphql/resolvers.js';
import { typeDefs } from './graphql/schema.js';
import { metricsRoutes } from './rest/metrics.routes.js';
import { errorHandler } from './rest/error-handler.js';

export async function createServer(db: PrismaClient = prisma) {
  const repositories = createRepositories(db);
  const services = createServices(repositories);
  const app = express();

  app.use(pinoHttp({ logger }));
  app.use(cors());
  app.use(express.json());

  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
  app.use('/webhooks', metricsRoutes(services.metrics));

  const apollo = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    formatError: formatGraphQLError,
    includeStacktraceInErrorResponses: false,
    plugins: [errorLoggingPlugin],
  });
  await apollo.start();

  app.use(
    '/graphql',
    expressMiddleware(apollo, {
      context: async () => createContext(services),
    }),
  );

  app.use(errorHandler);
  return app;
}
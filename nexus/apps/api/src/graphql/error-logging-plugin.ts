import type { ApolloServerPlugin } from '@apollo/server';
import { logger } from '../config/logger.js';
import type { GraphQLContext } from './context.js';

export const errorLoggingPlugin: ApolloServerPlugin<GraphQLContext> = {
  async requestDidStart() {
    return {
      async didEncounterErrors({ errors }) {
        for (const error of errors) {
          logger.error(
            { err: error.originalError ?? error },
            'GraphQL request failed',
          );
        }
      },
    };
  },
};
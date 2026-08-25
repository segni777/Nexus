import type { GraphQLFormattedError } from 'graphql';
import { unwrapResolverError } from '@apollo/server/errors';
import { AppError } from '../errors/app-error.js';

export function formatGraphQLError(
  formatted: GraphQLFormattedError,
  error: unknown,
): GraphQLFormattedError {
  const original = unwrapResolverError(error);

  if (original instanceof AppError) {
    return {
      message: original.message,
      locations: formatted.locations,
      path: formatted.path,
      extensions: { code: original.code },
    };
  }

  const publicCodes = new Set([
    'GRAPHQL_PARSE_FAILED',
    'GRAPHQL_VALIDATION_FAILED',
    'BAD_USER_INPUT',
  ]);
  const code = String(formatted.extensions?.code ?? '');
  if (publicCodes.has(code)) {
    return {
      message: formatted.message,
      locations: formatted.locations,
      path: formatted.path,
      extensions: { code },
    };
  }

  return {
    message: 'Internal server error',
    locations: formatted.locations,
    path: formatted.path,
    extensions: { code: 'INTERNAL_SERVER_ERROR' },
  };
}
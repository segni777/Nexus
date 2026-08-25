import { createLoaders, type Loaders } from './loaders/index.js';
import type { Services } from '../services/index.js';

export type GraphQLContext = {
  services: Services;
  loaders: Loaders;
};

export function createContext(services: Services): GraphQLContext {
  return {
    services,
    loaders: createLoaders(services),
  };
}
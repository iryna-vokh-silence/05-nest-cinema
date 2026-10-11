import { Loaders } from './loaders.factory';

/** The GraphQL execution context shared by all resolvers of one request. */
export interface GraphqlContext {
  loaders: Loaders;
}

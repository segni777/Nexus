import { readFileSync } from 'node:fs';

const schemaUrl = new URL('./schema.graphql', import.meta.url);
export const typeDefs = readFileSync(schemaUrl, 'utf8');
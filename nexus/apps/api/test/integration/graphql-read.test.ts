import request from 'supertest';
import { createServer } from '../../src/server.js';
import {
  resetTestDb,
  seedIntegrationFixture,
  testDb,
} from './helpers/database.js';

describe('GraphQL reads', () => {
  beforeEach(async () => {
    await resetTestDb();
    await seedIntegrationFixture();
  });

  afterAll(async () => {
    await resetTestDb();
    await testDb.$disconnect();
  });

  it('returns a paginated creator roster', async () => {
    const app = await createServer(testDb);
    const response = await request(app)
      .post('/graphql')
      .send({
        query: `
          query {
            creators(page: { offset: 0, limit: 1 }) {
              items { id handle }
              pageInfo { totalCount hasNextPage }
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.creators.items).toHaveLength(1);
    expect(response.body.data.creators.items[0]).toMatchObject({
      handle: 'integration_creator',
    });
    expect(response.body.data.creators.pageInfo).toEqual({
      totalCount: 1,
      hasNextPage: false,
    });
  });

  it('returns a public NOT_FOUND error without a stacktrace', async () => {
    const app = await createServer(testDb);
    const response = await request(app)
      .post('/graphql')
      .send({
        query: `
          query {
            creator(id: "90000000-0000-4000-8000-000000000009") {
              id
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toBeNull();
    expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
    expect(response.body.errors[0].extensions).not.toHaveProperty('stacktrace');
  });
});

import request from 'supertest';
import { createServer } from '../../src/server.js';
import { testDb } from './helpers/database.js';

describe('healthz', () => {
  afterAll(async () => {
    await testDb.$disconnect();
  });

  it('returns ok', async () => {
    const app = await createServer(testDb);
    const response = await request(app).get('/healthz');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

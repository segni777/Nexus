import request from 'supertest';
import { createServer } from '../../src/server.js';
import {
  resetTestDb,
  seedIntegrationFixture,
  testDb,
} from './helpers/database.js';

describe('metrics webhook', () => {
  let deliverableId: string;

  beforeEach(async () => {
    await resetTestDb();
    const fixture = await seedIntegrationFixture();
    deliverableId = fixture.deliverable.id;
  });

  afterAll(async () => {
    await resetTestDb();
    await testDb.$disconnect();
  });

  function metricsBody(overrides: Record<string, unknown> = {}) {
    return {
      deliverableId,
      capturedAt: '2026-01-20T00:00:00.000Z',
      views: 100,
      likes: 20,
      comments: 5,
      shares: 3,
      watchTimeSeconds: 500,
      ...overrides,
    };
  }

  it('persists a valid metrics snapshot', async () => {
    const app = await createServer(testDb);
    const response = await request(app)
      .post('/webhooks/metrics')
      .send(metricsBody());

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ deliverableId, views: 100 });
    await expect(testDb.metricsSnapshot.count({ where: { deliverableId } }))
      .resolves.toBe(1);
  });

  it('rejects decreasing metrics without inserting another row', async () => {
    const app = await createServer(testDb);

    const firstResponse = await request(app)
      .post('/webhooks/metrics')
      .send(metricsBody());
    expect(firstResponse.status).toBe(201);

    const response = await request(app)
      .post('/webhooks/metrics')
      .send(metricsBody({
        capturedAt: '2026-01-21T00:00:00.000Z',
        views: 99,
      }));

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
    await expect(testDb.metricsSnapshot.count({ where: { deliverableId } }))
      .resolves.toBe(1);
  });

  it('returns 400 for malformed metric values', async () => {
    const app = await createServer(testDb);
    const response = await request(app)
      .post('/webhooks/metrics')
      .send(metricsBody({ views: 'one hundred' }));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_USER_INPUT');
    await expect(testDb.metricsSnapshot.count({ where: { deliverableId } }))
      .resolves.toBe(0);
  });
});

import request from 'supertest';
import { createServer } from '../../src/server.js';
import {
  resetTestDb,
  seedIntegrationFixture,
  testDb,
} from './helpers/database.js';

describe('GraphQL mutations', () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await resetTestDb();
    await testDb.$disconnect();
  });

  it('creates a campaign, assignment, and deliverable', async () => {
    const fixture = await seedIntegrationFixture();
    const app = await createServer(testDb);

    const campaignResponse = await request(app)
      .post('/graphql')
      .send({
        query: `
          mutation CreateCampaign($brandId: ID!) {
            createCampaign(input: {
              brandId: $brandId
              name: "Mutation Campaign"
              budgetCents: 250000
              startDate: "2026-03-01T00:00:00.000Z"
              endDate: "2026-03-31T00:00:00.000Z"
            }) {
              id
              status
            }
          }
        `,
        variables: { brandId: fixture.brand.id },
      });

    expect(campaignResponse.body.errors).toBeUndefined();
    expect(campaignResponse.body.data.createCampaign.status).toBe('DRAFT');
    const campaignId = campaignResponse.body.data.createCampaign.id as string;

    const assignmentResponse = await request(app)
      .post('/graphql')
      .send({
        query: `
          mutation AssignCreator($campaignId: ID!, $creatorId: ID!) {
            assignCreatorToCampaign(input: {
              campaignId: $campaignId
              creatorId: $creatorId
              agreedRateCents: 50000
              role: PRIMARY
            }) {
              campaignId
              creatorId
              role
            }
          }
        `,
        variables: {
          campaignId,
          creatorId: fixture.creator.id,
        },
      });

    expect(assignmentResponse.body.errors).toBeUndefined();
    expect(assignmentResponse.body.data.assignCreatorToCampaign).toMatchObject({
      campaignId,
      creatorId: fixture.creator.id,
      role: 'PRIMARY',
    });

    const deliverableResponse = await request(app)
      .post('/graphql')
      .send({
        query: `
          mutation CreateDeliverable($campaignId: ID!, $creatorId: ID!) {
            createDeliverable(input: {
              campaignId: $campaignId
              creatorId: $creatorId
              type: VIDEO
              dueDate: "2026-03-15T00:00:00.000Z"
            }) {
              id
              status
            }
          }
        `,
        variables: {
          campaignId,
          creatorId: fixture.creator.id,
        },
      });

    expect(deliverableResponse.body.errors).toBeUndefined();
    expect(deliverableResponse.body.data.createDeliverable.status).toBe('ASSIGNED');
    const deliverableId = deliverableResponse.body.data.createDeliverable.id as string;

    await expect(testDb.campaign.findUnique({ where: { id: campaignId } }))
      .resolves.toMatchObject({ name: 'Mutation Campaign', status: 'DRAFT' });
    await expect(testDb.campaignCreator.findUnique({
      where: {
        campaignId_creatorId: {
          campaignId,
          creatorId: fixture.creator.id,
        },
      },
    })).resolves.toMatchObject({ role: 'PRIMARY' });
    await expect(testDb.deliverable.findUnique({ where: { id: deliverableId } }))
      .resolves.toMatchObject({ campaignId, status: 'ASSIGNED' });
  });
});

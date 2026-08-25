import { mock, type MockProxy } from 'jest-mock-extended';
import type { CreatorRepository } from '../../src/repositories/creator.repository.js';
import { CreatorService } from '../../src/services/creator.service.js';

const creator = {
  id: 'creator-1',
  handle: 'sample',
  displayName: 'Sample Creator',
  primaryPlatform: 'TIKTOK' as const,
  followerCount: 1_000,
  engagementRate: 0.05,
  ratePerPost: 5_000,
  status: 'ACTIVE' as const,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const newCreator = {
  handle: 'new_creator',
  displayName: 'New Creator',
  primaryPlatform: 'TIKTOK' as const,
  followerCount: 1_000,
  engagementRate: 0.05,
  ratePerPost: 5_000,
};

describe('CreatorService', () => {
  let repository: MockProxy<CreatorRepository>;
  let service: CreatorService;

  beforeEach(() => {
    repository = mock<CreatorRepository>();
    service = new CreatorService(repository);
  });

  it.each([
    ['empty handles', { ...newCreator, handle: '   ' }],
    ['negative follower counts', { ...newCreator, followerCount: -1 }],
    ['negative engagement rates', { ...newCreator, engagementRate: -0.01 }],
    ['engagement rates above 100%', { ...newCreator, engagementRate: 1.01 }],
    ['negative rates per post', { ...newCreator, ratePerPost: -1 }],
  ])('rejects %s', async (_label, input) => {
    await expect(service.create(input)).rejects.toMatchObject({
      code: 'BAD_USER_INPUT',
    });

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate handle', async () => {
    repository.findByHandle.mockResolvedValue(creator);

    await expect(service.create(newCreator)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('creates a valid creator', async () => {
    repository.findByHandle.mockResolvedValue(null);
    repository.create.mockResolvedValue({ ...creator, ...newCreator });

    await expect(service.create(newCreator)).resolves.toMatchObject(newCreator);
    expect(repository.create).toHaveBeenCalledWith(newCreator);
  });

  it('rejects an invalid ACTIVE to PROSPECT transition', async () => {
    repository.findById.mockResolvedValue(creator);

    await expect(service.updateStatus('creator-1', 'PROSPECT'))
      .rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it('allows an ACTIVE to PAUSED transition', async () => {
    repository.findById.mockResolvedValue(creator);
    repository.updateStatus.mockResolvedValue({ ...creator, status: 'PAUSED' });

    await expect(service.updateStatus(creator.id, 'PAUSED')).resolves.toMatchObject({
      status: 'PAUSED',
    });
  });

  it('returns the creator without writing when the status is unchanged', async () => {
    repository.findById.mockResolvedValue(creator);

    await expect(service.updateStatus(creator.id, 'ACTIVE')).resolves.toBe(creator);
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it('throws NOT_FOUND for a missing creator', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.get('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('normalizes list pagination and exposes batch reads', async () => {
    repository.list.mockResolvedValue({ items: [], totalCount: 0, offset: 0, limit: 50 });
    repository.findManyByIds.mockResolvedValue([creator]);

    await service.list({}, { offset: -3, limit: 100 });
    await expect(service.findManyByIds([creator.id])).resolves.toEqual([creator]);

    expect(repository.list).toHaveBeenCalledWith({}, { offset: 0, limit: 50 });
  });
});

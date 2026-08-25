import type { CreatorStatus } from '@prisma/client';
import {
  ConflictError,
  InputError,
  InvalidTransitionError,
  NotFoundError,
} from '../errors/app-error.js';
import type {
  CreatorFilter,
  CreatorRepository,
  NewCreator,
} from '../repositories/creator.repository.js';
import { normalizePage, type PageRequest } from '../repositories/page.js';

const transitions: Record<CreatorStatus, readonly CreatorStatus[]> = {
  PROSPECT: ['ACTIVE', 'CHURNED'],
  ACTIVE: ['PAUSED', 'CHURNED'],
  PAUSED: ['ACTIVE', 'CHURNED'],
  CHURNED: [],
};

export class CreatorService {
  constructor(private readonly creators: CreatorRepository) {}

  list(filter: CreatorFilter, page?: Partial<PageRequest> | null) {
    return this.creators.list(filter, normalizePage(page));
  }

  async get(id: string) {
    const creator = await this.creators.findById(id);
    if (!creator) throw new NotFoundError('Creator', id);
    return creator;
  }

  findManyByIds(ids: readonly string[]) {
    return this.creators.findManyByIds(ids);
  }

  async create(input: NewCreator) {
    if (!input.handle.trim()) throw new InputError('handle cannot be empty');
    if (input.followerCount < 0) throw new InputError('followerCount cannot be negative');
    if (input.engagementRate < 0 || input.engagementRate > 1) {
      throw new InputError('engagementRate must be between 0 and 1');
    }
    if (input.ratePerPost < 0) throw new InputError('ratePerPost cannot be negative');

    const existing = await this.creators.findByHandle(input.handle);
    if (existing) throw new ConflictError(`Creator handle ${input.handle} already exists`);
    return this.creators.create(input);
  }

  async updateStatus(id: string, next: CreatorStatus) {
    const creator = await this.get(id);
    if (creator.status === next) return creator;
    if (!transitions[creator.status].includes(next)) {
      throw new InvalidTransitionError('Creator', creator.status, next);
    }
    return this.creators.updateStatus(id, next);
  }
}
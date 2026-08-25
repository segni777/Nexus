import type { DeliverableStatus } from '@prisma/client';
import {
  InputError,
  InvalidTransitionError,
  NotFoundError,
} from '../errors/app-error.js';
import type { CampaignRepository } from '../repositories/campaign.repository.js';
import type {
  DeliverableFilter,
  DeliverableRepository,
  NewDeliverable,
} from '../repositories/deliverable.repository.js';
import {
  normalizePage,
  type PageRequest,
} from '../repositories/page.js';

export type UpdateDeliverableStatusInput = {
  id: string;
  status: DeliverableStatus;
  postedUrl?: string | null;
};

const transitions: Record<
  DeliverableStatus,
  readonly DeliverableStatus[]
> = {
  ASSIGNED: ['IN_REVIEW', 'OVERDUE'],
  IN_REVIEW: ['ASSIGNED', 'APPROVED', 'OVERDUE'],
  APPROVED: ['IN_REVIEW', 'POSTED', 'OVERDUE'],
  OVERDUE: ['IN_REVIEW', 'APPROVED', 'POSTED'],
  POSTED: [],
};

function isValidPostedUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export class DeliverableService {
  constructor(
    private readonly deliverables: DeliverableRepository,
    private readonly campaigns: CampaignRepository,
  ) {}

  list(
    filter: DeliverableFilter,
    page?: Partial<PageRequest> | null,
  ) {
    return this.deliverables.list(
      filter,
      normalizePage(page),
    );
  }

  async get(id: string) {
    const deliverable =
      await this.deliverables.findById(id);

    if (!deliverable) {
      throw new NotFoundError('Deliverable', id);
    }

    return deliverable;
  }

  findManyByCreatorIds(ids: readonly string[]) {
    return this.deliverables.findManyByCreatorIds(ids);
  }

  async create(input: NewDeliverable) {
    const campaign = await this.campaigns.findById(
      input.campaignId,
    );

    if (!campaign) {
      throw new NotFoundError(
        'Campaign',
        input.campaignId,
      );
    }

    const assignment =
      await this.campaigns.findAssignment(
        input.campaignId,
        input.creatorId,
      );

    if (!assignment) {
      throw new InputError(
        'Creator must be assigned to the campaign before creating a deliverable',
      );
    }

    if (
      input.dueDate < campaign.startDate ||
      input.dueDate > campaign.endDate
    ) {
      throw new InputError(
        'dueDate must fall within the campaign date range',
      );
    }

    // NewDeliverable has no status field, so Prisma applies
    // the schema default of ASSIGNED.
    return this.deliverables.create(input);
  }

  async updateStatus(
    input: UpdateDeliverableStatusInput,
  ) {
    const deliverable = await this.get(input.id);

    if (deliverable.status === input.status) {
      return deliverable;
    }

    if (
      !transitions[deliverable.status].includes(
        input.status,
      )
    ) {
      throw new InvalidTransitionError(
        'Deliverable',
        deliverable.status,
        input.status,
      );
    }

    if (input.status === 'POSTED') {
      if (
        !input.postedUrl ||
        !isValidPostedUrl(input.postedUrl)
      ) {
        throw new InputError(
          'A valid HTTP or HTTPS postedUrl is required when moving to POSTED',
        );
      }
    }

    return this.deliverables.updateStatus(
      input.id,
      input.status,
      input.status === 'POSTED'
        ? input.postedUrl
        : undefined,
    );
  }
}
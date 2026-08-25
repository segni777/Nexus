import {
  ConflictError,
  InputError,
  NotFoundError,
} from '../errors/app-error.js';
import type { DeliverableRepository } from '../repositories/deliverable.repository.js';
import type {
  MetricsRepository,
  NewMetricsSnapshot,
} from '../repositories/metrics.repository.js';
import {
  normalizePage,
  type PageRequest,
} from '../repositories/page.js';

const metricFields = [
  'views',
  'likes',
  'comments',
  'shares',
  'watchTimeSeconds',
] as const;

export class MetricsService {
  constructor(
    private readonly metrics: MetricsRepository,
    private readonly deliverables: DeliverableRepository,
  ) {}

  list(
    deliverableId: string,
    page?: Partial<PageRequest> | null,
  ) {
    return this.metrics.listForDeliverable(
      deliverableId,
      normalizePage(page),
    );
  }

  async record(input: NewMetricsSnapshot) {
    const deliverable =
      await this.deliverables.findById(
        input.deliverableId,
      );

    if (!deliverable) {
      throw new NotFoundError(
        'Deliverable',
        input.deliverableId,
      );
    }

    if (deliverable.status !== 'POSTED') {
      throw new ConflictError(
        'Metrics can only be recorded for a POSTED deliverable',
      );
    }

    for (const field of metricFields) {
      const value = input[field];

      if (!Number.isInteger(value) || value < 0) {
        throw new InputError(
          `${field} must be a non-negative integer`,
        );
      }
    }

    const latest =
      await this.metrics.findLatestForDeliverable(
        input.deliverableId,
      );

    if (latest) {
      for (const field of metricFields) {
        if (input[field] < latest[field]) {
          throw new ConflictError(
            `${field} cannot decrease from ${latest[field]} to ${input[field]}`,
          );
        }
      }
    }

    // This executes only after every validation passes.
    return this.metrics.create(input);
  }
}
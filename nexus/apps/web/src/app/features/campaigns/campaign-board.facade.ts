import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { Apollo } from 'apollo-angular';
import {
  CampaignBoardDocument,
  type CampaignBoardQuery,
  type CampaignBoardQueryVariables,
  type CampaignStatus,
} from '../../core/graphql/generated/operations';
import type { QueryState } from '../../core/graphql/query-state';

export type CampaignRow = CampaignBoardQuery['campaigns']['items'][number];

export const CAMPAIGN_STATUSES: readonly CampaignStatus[] = [
  'DRAFT',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
];

@Injectable()
export class CampaignBoardFacade {
  private readonly apollo = inject(Apollo);
  private readonly refreshKey = signal(0);

  private readonly request = computed(() => ({
    refreshKey: this.refreshKey(),
    variables: {
      page: { offset: 0, limit: 50 },
    } satisfies CampaignBoardQueryVariables,
  }));

  private readonly result = toSignal(
    toObservable(this.request).pipe(
      switchMap(
        ({ variables }) =>
          this.apollo.watchQuery<CampaignBoardQuery, CampaignBoardQueryVariables>({
            query: CampaignBoardDocument,
            variables,
            fetchPolicy: 'cache-and-network',
            notifyOnNetworkStatusChange: true,
          }).valueChanges,
      ),
    ),
    { initialValue: null },
  );

  readonly state = computed<QueryState<CampaignRow[]>>(() => {
    const result = this.result();
    if (!result || result.loading) return { status: 'loading' };
    if (result.error) return { status: 'error', message: result.error.message };
    if (result.dataState !== 'complete') return { status: 'loading' };

    const items = result.data.campaigns.items;
    return items.length === 0 ? { status: 'empty' } : { status: 'ready', data: items };
  });

  readonly grouped = computed<Record<CampaignStatus, CampaignRow[]>>(() => {
    const groups: Record<CampaignStatus, CampaignRow[]> = {
      DRAFT: [],
      ACTIVE: [],
      COMPLETED: [],
      CANCELLED: [],
    };
    const state = this.state();
    if (state.status !== 'ready') return groups;

    for (const campaign of state.data) groups[campaign.status].push(campaign);
    return groups;
  });

  retry(): void {
    this.refreshKey.update((value) => value + 1);
  }
}

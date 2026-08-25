import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { Apollo } from 'apollo-angular';
import {
  CampaignDetailDocument,
  type CampaignDetailQuery,
  type CampaignDetailQueryVariables,
} from '../../core/graphql/generated/operations';
import type { QueryState } from '../../core/graphql/query-state';
import { toCampaignViewsSeries } from './campaign-series';

export type CampaignDetail = CampaignDetailQuery['campaign'];

@Injectable()
export class CampaignDetailFacade {
  private readonly apollo = inject(Apollo);
  private readonly route = inject(ActivatedRoute);
  private readonly refreshKey = signal(0);
  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  readonly campaignId = computed(() => this.paramMap().get('id'));

  private readonly request = computed(() => ({
    id: this.campaignId(),
    refreshKey: this.refreshKey(),
  }));

  private readonly result = toSignal(
    toObservable(this.request).pipe(
      switchMap(({ id }) => {
        if (id === null) return of(null);
        const variables = { id } satisfies CampaignDetailQueryVariables;
        return this.apollo.watchQuery<CampaignDetailQuery, CampaignDetailQueryVariables>({
          query: CampaignDetailDocument,
          variables,
          fetchPolicy: 'cache-and-network',
          notifyOnNetworkStatusChange: true,
        }).valueChanges;
      }),
    ),
    { initialValue: null },
  );

  readonly state = computed<QueryState<CampaignDetail | null>>(() => {
    if (this.campaignId() === null) return { status: 'ready', data: null };
    const result = this.result();
    if (!result || result.loading) return { status: 'loading' };
    if (result.error) return { status: 'error', message: result.error.message };
    if (result.dataState !== 'complete') return { status: 'loading' };
    return { status: 'ready', data: result.data.campaign };
  });

  readonly notFound = computed(() => {
    const state = this.state();
    return state.status === 'error' && /not found/i.test(state.message);
  });

  readonly viewsSeries = computed(() => {
    const state = this.state();
    return state.status === 'ready' && state.data
      ? toCampaignViewsSeries(state.data.deliverables.items)
      : [];
  });

  retry(): void {
    this.refreshKey.update((value) => value + 1);
  }
}

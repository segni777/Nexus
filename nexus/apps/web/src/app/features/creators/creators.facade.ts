import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { Apollo } from 'apollo-angular';
import {
  CreatorRosterDocument,
  type CreatorFilter,
  type CreatorRosterQuery,
  type CreatorRosterQueryVariables,
} from '../../core/graphql/generated/operations';
import type { QueryState } from '../../core/graphql/query-state';

export type CreatorRow = CreatorRosterQuery['creators']['items'][number];

@Injectable()
export class CreatorsFacade {
  private readonly apollo = inject(Apollo);

  readonly offset = signal(0);
  readonly limit = signal(20);
  readonly filter = signal<CreatorFilter>({});
  readonly sort = signal<{
    key: keyof CreatorRow;
    direction: 'asc' | 'desc';
  }>({
    key: 'followerCount',
    direction: 'desc',
  });

  private readonly refreshKey = signal(0);

  private readonly request = computed(() => ({
    refreshKey: this.refreshKey(),
    variables: {
      page: {
        offset: this.offset(),
        limit: this.limit(),
      },
      filter: this.filter(),
    } satisfies CreatorRosterQueryVariables,
  }));

  private readonly result = toSignal(
    toObservable(this.request).pipe(
      switchMap(
        ({ variables }) =>
          this.apollo.watchQuery<CreatorRosterQuery, CreatorRosterQueryVariables>({
            query: CreatorRosterDocument,
            variables,
            fetchPolicy: 'cache-and-network',
            notifyOnNetworkStatusChange: true,
          }).valueChanges,
      ),
    ),
    { initialValue: null },
  );

  readonly state = computed<QueryState<CreatorRow[]>>(() => {
    const result = this.result();

    if (!result || result.loading) {
      return { status: 'loading' };
    }

    if (result.error) {
      return {
        status: 'error',
        message: result.error.message,
      };
    }

    if (result.dataState !== 'complete') {
      return { status: 'loading' };
    }

    const items = result.data.creators.items;

    return items.length === 0 ? { status: 'empty' } : { status: 'ready', data: items };
  });

  readonly pageInfo = computed(() => {
    const result = this.result();
    return result?.dataState === 'complete' ? result.data.creators.pageInfo : null;
  });

  readonly rows = computed(() => {
    const current = this.state();
    if (current.status !== 'ready') return [];

    const { key, direction } = this.sort();
    return [...current.data].sort((left, right) => {
      const a = left[key];
      const b = right[key];
      const comparison =
        typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));

      return direction === 'asc' ? comparison : -comparison;
    });
  });

  setFilter(filter: CreatorFilter): void {
    this.filter.set(filter);
    this.offset.set(0);
  }

  toggleSort(key: keyof CreatorRow): void {
    const current = this.sort();
    this.sort.set({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    });
  }

  nextPage(): void {
    if (this.pageInfo()?.hasNextPage) {
      this.offset.update((value) => value + this.limit());
    }
  }

  previousPage(): void {
    this.offset.update((value) => Math.max(0, value - this.limit()));
  }

  retry(): void {
    this.refreshKey.update((value) => value + 1);
  }
}

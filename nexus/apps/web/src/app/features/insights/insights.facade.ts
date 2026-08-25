import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { Apollo } from 'apollo-angular';
import {
  InsightsPanelDocument,
  type InsightScope,
  type InsightsPanelQuery,
  type InsightsPanelQueryVariables,
} from '../../core/graphql/generated/operations';
import type { QueryState } from '../../core/graphql/query-state';

export type InsightRow = InsightsPanelQuery['insights']['items'][number];

@Injectable()
export class InsightsFacade {
  private readonly apollo = inject(Apollo);

  readonly scope = signal<InsightScope | null>(null);
  readonly scopeId = signal('');
  private readonly refreshKey = signal(0);

  private readonly request = computed(() => ({
    refreshKey: this.refreshKey(),
    variables: {
      page: { offset: 0, limit: 50 },
      scope: this.scope() ?? undefined,
      scopeId: this.scopeId().trim() || undefined,
    } satisfies InsightsPanelQueryVariables,
  }));

  private readonly result = toSignal(
    toObservable(this.request).pipe(
      switchMap(
        ({ variables }) =>
          this.apollo.watchQuery<InsightsPanelQuery, InsightsPanelQueryVariables>({
            query: InsightsPanelDocument,
            variables,
            fetchPolicy: 'cache-and-network',
            notifyOnNetworkStatusChange: true,
          }).valueChanges,
      ),
    ),
    { initialValue: null },
  );

  readonly state = computed<QueryState<InsightRow[]>>(() => {
    const result = this.result();
    if (!result || result.loading) return { status: 'loading' };
    if (result.error) return { status: 'error', message: result.error.message };
    if (result.dataState !== 'complete') return { status: 'loading' };

    const items = result.data.insights.items;
    return items.length === 0 ? { status: 'empty' } : { status: 'ready', data: items };
  });

  readonly totalCount = computed(() => {
    const result = this.result();
    return result?.dataState === 'complete' ? result.data.insights.pageInfo.totalCount : 0;
  });

  setScope(scope: InsightScope | null): void {
    this.scope.set(scope);
    if (scope === null) this.scopeId.set('');
  }

  setScopeId(scopeId: string): void {
    this.scopeId.set(scopeId);
  }

  retry(): void {
    this.refreshKey.update((value) => value + 1);
  }
}

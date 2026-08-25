import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { Apollo } from 'apollo-angular';
import {
  CreatorDetailDocument,
  type CreatorDetailQuery,
  type CreatorDetailQueryVariables,
} from '../../core/graphql/generated/operations';
import type { QueryState } from '../../core/graphql/query-state';

export type CreatorDetail = CreatorDetailQuery['creator'];

@Injectable()
export class CreatorDetailFacade {
  private readonly apollo = inject(Apollo);

  readonly selectedId = signal<string | null>(null);
  private readonly refreshKey = signal(0);

  private readonly request = computed(() => ({
    id: this.selectedId(),
    refreshKey: this.refreshKey(),
  }));

  private readonly result = toSignal(
    toObservable(this.request).pipe(
      switchMap(({ id }) => {
        if (id === null) return of(null);

        const variables = { id } satisfies CreatorDetailQueryVariables;
        return this.apollo.watchQuery<CreatorDetailQuery, CreatorDetailQueryVariables>({
          query: CreatorDetailDocument,
          variables,
          fetchPolicy: 'cache-and-network',
          notifyOnNetworkStatusChange: true,
        }).valueChanges;
      }),
    ),
    { initialValue: null },
  );

  readonly state = computed<QueryState<CreatorDetail | null>>(() => {
    if (this.selectedId() === null) {
      return { status: 'ready', data: null };
    }

    const result = this.result();
    if (!result || result.loading) return { status: 'loading' };

    if (result.error) {
      return { status: 'error', message: result.error.message };
    }

    if (result.dataState !== 'complete') return { status: 'loading' };

    return { status: 'ready', data: result.data.creator };
  });

  open(id: string): void {
    this.selectedId.set(id);
  }

  close(): void {
    this.selectedId.set(null);
  }

  retry(): void {
    this.refreshKey.update((value) => value + 1);
  }
}

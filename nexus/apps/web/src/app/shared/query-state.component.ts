import { Component, input, output } from '@angular/core';
import type { QueryState } from '../core/graphql/query-state';

@Component({
  selector: 'app-query-state',
  standalone: true,
  template: `
    @switch (state().status) {
      @case ('loading') {
        <p class="message" role="status" aria-live="polite">Loading…</p>
      }
      @case ('error') {
        <div class="message message--error" role="alert">
          <p>{{ errorMessage() }}</p>
          <button type="button" (click)="retry.emit()">Retry</button>
        </div>
      }
      @case ('empty') {
        <p class="message">{{ emptyMessage() }}</p>
      }
    }
  `,
  styles: `
    .message {
      margin: 1rem 0;
      border: 1px solid var(--nx-border);
      border-radius: var(--nx-radius);
      padding: 1rem;
      color: var(--nx-muted);
      background: var(--nx-surface);
    }

    .message--error {
      border-color: var(--nx-danger);
      color: var(--nx-text);
    }

    p {
      margin: 0 0 0.75rem;
    }
    .message > p:only-child {
      margin: 0;
    }
  `,
})
export class QueryStateComponent {
  readonly state = input.required<QueryState<unknown>>();
  readonly emptyMessage = input('Nothing to show yet.');
  readonly retry = output<void>();

  protected errorMessage(): string {
    const state = this.state();
    return state.status === 'error' ? state.message : '';
  }
}

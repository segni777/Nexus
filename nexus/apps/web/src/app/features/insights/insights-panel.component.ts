import { DatePipe, PercentPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { InsightScope } from '../../core/graphql/generated/operations';
import { QueryStateComponent } from '../../shared/query-state.component';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { readInsightPayload } from './insight-payload';
import { InsightsFacade } from './insights.facade';

@Component({
  selector: 'app-insights-panel',
  standalone: true,
  imports: [DatePipe, PercentPipe, QueryStateComponent, StatusChipComponent],
  providers: [InsightsFacade],
  template: `
    <header class="page-heading">
      <div>
        <p class="eyebrow">Intelligence</p>
        <h1>Insights</h1>
        <p>{{ facade.totalCount() }} generated insights match the current filter.</p>
      </div>
      <div class="filters" aria-label="Insight filters">
        <label>
          Scope
          <select [value]="facade.scope() ?? ''" (change)="setScope($event)">
            <option value="">All scopes</option>
            <option value="CREATOR">Creator</option>
            <option value="CAMPAIGN">Campaign</option>
          </select>
        </label>
        <label>
          Scope ID
          <input
            type="search"
            [value]="facade.scopeId()"
            [disabled]="facade.scope() === null"
            placeholder="Filter by exact ID"
            (input)="setScopeId($event)"
          />
        </label>
      </div>
    </header>

    <app-query-state
      [state]="facade.state()"
      emptyMessage="No insights match this scope and ID combination."
      (retry)="facade.retry()"
    />

    @if (facade.state(); as state) {
      @if (state.status === 'ready') {
        <div class="insight-grid">
          @for (insight of state.data; track insight.id) {
            <article>
              <header>
                <app-status-chip [status]="insight.scope" />
                <span>{{ insight.model }}</span>
              </header>
              <p class="date">Generated {{ insight.generatedAt | date: 'medium' }}</p>
              <p class="summary">{{ insight.summaryText }}</p>

              @if (payload(insight.payloadJson); as details) {
                @if (details.sentiment || details.confidence !== undefined) {
                  <dl>
                    @if (details.sentiment) {
                      <div>
                        <dt>Sentiment</dt>
                        <dd>{{ details.sentiment }}</dd>
                      </div>
                    }
                    @if (details.confidence !== undefined) {
                      <div>
                        <dt>Confidence</dt>
                        <dd>{{ details.confidence | percent: '1.0-1' }}</dd>
                      </div>
                    }
                  </dl>
                }
                @if (details.highlights?.length) {
                  <h2>Highlights</h2>
                  <ul>
                    @for (highlight of details.highlights; track highlight) {
                      <li>{{ highlight }}</li>
                    }
                  </ul>
                }
              }
            </article>
          }
        </div>
      }
    }
  `,
  styles: `
    .page-heading {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    h1,
    h2,
    p {
      margin-top: 0;
    }
    h1 {
      margin-bottom: 0.35rem;
      font-size: clamp(2rem, 4vw, 3.25rem);
    }
    h2 {
      margin: 1rem 0 0.5rem;
      font-size: 0.9rem;
    }
    .eyebrow {
      margin-bottom: 0.25rem;
      color: var(--nx-accent);
      font-weight: 800;
      text-transform: uppercase;
    }
    .page-heading p:last-child,
    .date {
      color: var(--nx-muted);
    }
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: var(--nx-gap);
    }
    label {
      display: grid;
      gap: 0.35rem;
      color: var(--nx-muted);
      font-size: 0.85rem;
    }
    .insight-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
      gap: var(--nx-gap);
    }
    article {
      border: 1px solid var(--nx-border);
      border-radius: var(--nx-radius);
      padding: 1rem;
      background: var(--nx-surface);
    }
    article > header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    article > header span {
      color: var(--nx-muted);
      font-family: ui-monospace, monospace;
      font-size: 0.8rem;
    }
    .date {
      margin: 0.75rem 0;
      font-size: 0.8rem;
    }
    .summary {
      line-height: 1.6;
    }
    dl {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin: 1rem 0 0;
    }
    dl div {
      border: 1px solid var(--nx-border);
      border-radius: 8px;
      padding: 0.55rem 0.75rem;
    }
    dt {
      color: var(--nx-muted);
      font-size: 0.75rem;
    }
    dd {
      margin: 0.2rem 0 0;
      font-weight: 700;
      text-transform: capitalize;
    }
    ul {
      margin: 0;
      padding-left: 1.2rem;
      color: var(--nx-muted);
    }
    li + li {
      margin-top: 0.4rem;
    }
    @media (max-width: 700px) {
      .page-heading {
        align-items: stretch;
        flex-direction: column;
      }
    }
  `,
})
export class InsightsPanelComponent {
  readonly facade = inject(InsightsFacade);
  readonly payload = readInsightPayload;

  protected setScope(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.facade.setScope(value ? (value as InsightScope) : null);
  }

  protected setScopeId(event: Event): void {
    this.facade.setScopeId((event.target as HTMLInputElement).value);
  }
}

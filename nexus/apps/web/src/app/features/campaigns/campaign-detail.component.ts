import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LineChartComponent } from '../../shared/line-chart.component';
import { MoneyPipe } from '../../shared/money.pipe';
import { QueryStateComponent } from '../../shared/query-state.component';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { CampaignDetailFacade } from './campaign-detail.facade';

export function safeExternalUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

@Component({
  selector: 'app-campaign-detail',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    LineChartComponent,
    MoneyPipe,
    QueryStateComponent,
    RouterLink,
    StatusChipComponent,
  ],
  providers: [CampaignDetailFacade],
  template: `
    <a class="back" routerLink="/campaigns">← Back to campaign board</a>

    @if (facade.notFound()) {
      <div class="not-found" role="alert">
        <h1>Campaign not found</h1>
        <p>The requested campaign does not exist or is no longer available.</p>
      </div>
    } @else {
      <app-query-state
        [state]="facade.state()"
        emptyMessage="Campaign details are unavailable."
        (retry)="facade.retry()"
      />
    }

    @if (facade.state(); as state) {
      @if (state.status === 'ready') {
        @if (state.data; as campaign) {
          <header class="hero">
            <div>
              <p class="eyebrow">{{ campaign.brand.name }}</p>
              <h1>{{ campaign.name }}</h1>
              <p>
                {{ campaign.startDate | date: 'mediumDate' }} –
                {{ campaign.endDate | date: 'mediumDate' }}
              </p>
            </div>
            <app-status-chip [status]="campaign.status" />
          </header>

          <section class="summary-grid" aria-label="Campaign financial summary">
            <article>
              <span>Budget</span><strong>{{ campaign.budgetCents | money }}</strong>
            </article>
            <article>
              <span>Spent</span><strong>{{ campaign.spentCents | money }}</strong>
            </article>
            <article>
              <span>Remaining</span
              ><strong>{{ campaign.budgetCents - campaign.spentCents | money }}</strong>
            </article>
          </section>

          <section class="panel">
            <h2>Campaign views</h2>
            <app-line-chart
              [points]="facade.viewsSeries()"
              label="Cumulative campaign views over time"
            />
          </section>

          <section class="panel">
            <h2>Assigned creators ({{ campaign.creators.pageInfo.totalCount }})</h2>
            @if (campaign.creators.items.length === 0) {
              <p class="muted">No creators are assigned.</p>
            } @else {
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Creator</th>
                      <th>Platform</th>
                      <th>Role</th>
                      <th>Agreed rate</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (assignment of campaign.creators.items; track assignment.creatorId) {
                      <tr>
                        <td>
                          <strong>{{ assignment.creator.displayName }}</strong
                          ><span>&#64;{{ assignment.creator.handle }}</span>
                        </td>
                        <td>{{ assignment.creator.primaryPlatform }}</td>
                        <td><app-status-chip [status]="assignment.role" /></td>
                        <td>{{ assignment.agreedRateCents | money }}</td>
                        <td><app-status-chip [status]="assignment.creator.status" /></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>

          <section class="panel">
            <h2>Deliverables ({{ campaign.deliverables.pageInfo.totalCount }})</h2>
            @if (campaign.deliverables.items.length === 0) {
              <p class="muted">No deliverables have been created.</p>
            } @else {
              <ul class="deliverables">
                @for (deliverable of campaign.deliverables.items; track deliverable.id) {
                  <li>
                    <div>
                      <strong>{{ deliverable.type.replaceAll('_', ' ') }}</strong>
                      <p>
                        &#64;{{ deliverable.creator.handle }} · Due
                        {{ deliverable.dueDate | date: 'mediumDate' }}
                      </p>
                      <p>{{ deliverable.metrics.pageInfo.totalCount | number }} metric snapshots</p>
                    </div>
                    <div class="deliverable-actions">
                      <app-status-chip [status]="deliverable.status" />
                      @if (safeExternalUrl(deliverable.postedUrl); as url) {
                        <a [href]="url" target="_blank" rel="noopener noreferrer">View post</a>
                      } @else if (deliverable.postedUrl) {
                        <span class="muted">Unsafe post URL</span>
                      }
                    </div>
                  </li>
                }
              </ul>
            }
          </section>
        } @else {
          <div class="not-found" role="status"><h1>Campaign not found</h1></div>
        }
      }
    }
  `,
  styles: `
    .back {
      display: inline-block;
      margin-bottom: 1.25rem;
    }
    h1,
    h2,
    p {
      margin-top: 0;
    }
    h1 {
      margin-bottom: 0.4rem;
      font-size: clamp(2rem, 4vw, 3.25rem);
    }
    h2 {
      font-size: 1.2rem;
    }
    .hero {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .eyebrow {
      margin-bottom: 0.25rem;
      color: var(--nx-accent);
      font-weight: 800;
      text-transform: uppercase;
    }
    .hero p:last-child,
    .muted,
    td span,
    .deliverables p {
      color: var(--nx-muted);
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--nx-gap);
    }
    .summary-grid article,
    .panel,
    .not-found {
      border: 1px solid var(--nx-border);
      border-radius: var(--nx-radius);
      padding: 1rem;
      background: var(--nx-surface);
    }
    .summary-grid span,
    .summary-grid strong {
      display: block;
    }
    .summary-grid span {
      margin-bottom: 0.35rem;
      color: var(--nx-muted);
    }
    .summary-grid strong {
      font-size: 1.3rem;
    }
    .panel {
      margin-top: 1rem;
    }
    .table-wrap {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th,
    td {
      border-bottom: 1px solid var(--nx-border);
      padding: 0.75rem;
      text-align: left;
      white-space: nowrap;
    }
    th {
      color: var(--nx-muted);
      font-size: 0.8rem;
    }
    tbody tr:last-child td {
      border-bottom: 0;
    }
    td strong,
    td span {
      display: block;
    }
    .deliverables {
      display: grid;
      gap: 0.75rem;
      padding: 0;
      list-style: none;
    }
    .deliverables li {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      border: 1px solid var(--nx-border);
      border-radius: 8px;
      padding: 0.85rem;
    }
    .deliverables p {
      margin: 0.3rem 0 0;
      font-size: 0.85rem;
    }
    .deliverable-actions {
      display: grid;
      justify-items: end;
      gap: 0.65rem;
    }
    @media (max-width: 680px) {
      .summary-grid {
        grid-template-columns: 1fr;
      }
      .deliverables li {
        flex-direction: column;
      }
      .deliverable-actions {
        justify-items: start;
      }
    }
  `,
})
export class CampaignDetailComponent {
  readonly facade = inject(CampaignDetailFacade);
  readonly safeExternalUrl = safeExternalUrl;
}

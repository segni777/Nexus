import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MoneyPipe } from '../../shared/money.pipe';
import { QueryStateComponent } from '../../shared/query-state.component';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { CAMPAIGN_STATUSES, CampaignBoardFacade } from './campaign-board.facade';

export function spendPercent(spentCents: number, budgetCents: number): number {
  if (budgetCents <= 0) return 0;
  return Math.min(100, Math.round((spentCents / budgetCents) * 100));
}

@Component({
  selector: 'app-campaign-board',
  standalone: true,
  imports: [DatePipe, MoneyPipe, QueryStateComponent, RouterLink, StatusChipComponent],
  providers: [CampaignBoardFacade],
  template: `
    <header class="page-heading">
      <p class="eyebrow">Portfolio</p>
      <h1>Campaign board</h1>
      <p>Budget, spend, timing, and status across every campaign.</p>
    </header>

    <app-query-state
      [state]="facade.state()"
      emptyMessage="No campaigns are available yet."
      (retry)="facade.retry()"
    />

    @if (facade.state().status === 'ready') {
      <div class="board">
        @for (status of statuses; track status) {
          <section class="column" [attr.aria-labelledby]="status + '-heading'">
            <header>
              <h2 [id]="status + '-heading'">{{ status }}</h2>
              <span>{{ facade.grouped()[status].length }}</span>
            </header>
            <div class="cards">
              @for (campaign of facade.grouped()[status]; track campaign.id) {
                <a class="card" [routerLink]="['/campaigns', campaign.id]">
                  <div class="card-heading">
                    <div>
                      <h3>{{ campaign.name }}</h3>
                      <p>{{ campaign.brand.name }} · {{ campaign.brand.industry }}</p>
                    </div>
                    <app-status-chip [status]="campaign.status" />
                  </div>
                  <p class="dates">
                    {{ campaign.startDate | date: 'mediumDate' }} –
                    {{ campaign.endDate | date: 'mediumDate' }}
                  </p>
                  <div class="money-row">
                    <span>{{ campaign.spentCents | money }} spent</span>
                    <span>{{ campaign.budgetCents | money }}</span>
                  </div>
                  <div class="progress" aria-hidden="true">
                    <span
                      [style.width.%]="spendPercent(campaign.spentCents, campaign.budgetCents)"
                    ></span>
                  </div>
                  <p class="percent">
                    {{ spendPercent(campaign.spentCents, campaign.budgetCents) }}% of budget
                  </p>
                </a>
              } @empty {
                <p class="column-empty">No {{ status.toLocaleLowerCase() }} campaigns.</p>
              }
            </div>
          </section>
        }
      </div>
    }
  `,
  styles: `
    .page-heading {
      margin-bottom: 1.5rem;
    }
    h1,
    h2,
    h3,
    p {
      margin-top: 0;
    }
    h1 {
      margin-bottom: 0.35rem;
      font-size: clamp(2rem, 4vw, 3.25rem);
    }
    .eyebrow {
      margin-bottom: 0.25rem;
      color: var(--nx-accent);
      font-weight: 800;
      text-transform: uppercase;
    }
    .page-heading > p:last-child,
    .dates,
    .percent,
    .card-heading p,
    .column-empty {
      color: var(--nx-muted);
    }
    .board {
      display: grid;
      grid-template-columns: repeat(4, minmax(260px, 1fr));
      gap: var(--nx-gap);
      overflow-x: auto;
      align-items: start;
    }
    .column {
      border: 1px solid var(--nx-border);
      border-radius: var(--nx-radius);
      padding: 0.75rem;
      background: var(--nx-surface);
    }
    .column > header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }
    .column h2 {
      margin: 0;
      font-size: 0.9rem;
    }
    .column > header span {
      border-radius: 999px;
      padding: 0.15rem 0.5rem;
      background: var(--nx-surface-raised);
      color: var(--nx-muted);
    }
    .cards {
      display: grid;
      gap: 0.75rem;
    }
    .card {
      display: block;
      border: 1px solid var(--nx-border);
      border-radius: 8px;
      padding: 0.85rem;
      color: var(--nx-text);
      background: var(--nx-surface-raised);
      text-decoration: none;
    }
    .card:hover {
      border-color: var(--nx-accent);
      transform: translateY(-1px);
    }
    .card-heading,
    .money-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .card-heading h3 {
      margin-bottom: 0.25rem;
      font-size: 1rem;
    }
    .card-heading p {
      margin-bottom: 0;
      font-size: 0.8rem;
    }
    .dates {
      margin: 1rem 0;
      font-size: 0.85rem;
    }
    .money-row {
      font-size: 0.78rem;
    }
    .progress {
      height: 6px;
      overflow: hidden;
      border-radius: 999px;
      margin-top: 0.5rem;
      background: var(--nx-border);
    }
    .progress span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--nx-accent);
    }
    .percent {
      margin: 0.35rem 0 0;
      font-size: 0.75rem;
    }
    .column-empty {
      margin: 0;
      padding: 0.75rem;
      font-size: 0.85rem;
    }
  `,
})
export class CampaignBoardComponent {
  readonly facade = inject(CampaignBoardFacade);
  readonly statuses = CAMPAIGN_STATUSES;
  readonly spendPercent = spendPercent;
}

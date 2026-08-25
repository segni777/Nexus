import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import type {
  CreatorFilter,
  CreatorStatus,
  Platform,
} from '../../core/graphql/generated/operations';
import { MoneyPipe } from '../../shared/money.pipe';
import { QueryStateComponent } from '../../shared/query-state.component';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { CreatorDetailFacade } from './creator-detail.facade';
import { CreatorsFacade } from './creators.facade';

@Component({
  selector: 'app-creator-roster',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    MoneyPipe,
    PercentPipe,
    QueryStateComponent,
    StatusChipComponent,
  ],
  providers: [CreatorsFacade, CreatorDetailFacade],
  template: `
    <header class="page-heading">
      <div>
        <p class="eyebrow">Talent</p>
        <h1>Creator roster</h1>
        <p>Sorts apply to the current API page only.</p>
      </div>
      <div class="filters" aria-label="Creator filters">
        <label>
          Status
          <select [value]="facade.filter().status ?? ''" (change)="setStatus($event)">
            <option value="">All statuses</option>
            @for (status of statuses; track status) {
              <option [value]="status">{{ status.replaceAll('_', ' ') }}</option>
            }
          </select>
        </label>
        <label>
          Platform
          <select [value]="facade.filter().platform ?? ''" (change)="setPlatform($event)">
            <option value="">All platforms</option>
            @for (platform of platforms; track platform) {
              <option [value]="platform">{{ platform }}</option>
            }
          </select>
        </label>
      </div>
    </header>

    <app-query-state
      [state]="facade.state()"
      emptyMessage="No creators match those filters."
      (retry)="facade.retry()"
    />

    @if (facade.state().status === 'ready') {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Creator</th>
              <th>Platform</th>
              <th>
                <button type="button" class="sort" (click)="facade.toggleSort('followerCount')">
                  Followers {{ sortMark('followerCount') }}
                </button>
              </th>
              <th>
                <button type="button" class="sort" (click)="facade.toggleSort('engagementRate')">
                  Engagement {{ sortMark('engagementRate') }}
                </button>
              </th>
              <th>
                <button type="button" class="sort" (click)="facade.toggleSort('ratePerPost')">
                  Rate {{ sortMark('ratePerPost') }}
                </button>
              </th>
              <th>Status</th>
              <th><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            @for (row of facade.rows(); track row.id) {
              <tr>
                <td>
                  <strong>{{ row.displayName }}</strong>
                  <span class="secondary">&#64;{{ row.handle }}</span>
                </td>
                <td>{{ row.primaryPlatform }}</td>
                <td>{{ row.followerCount | number }}</td>
                <td>{{ row.engagementRate | percent: '1.1-2' }}</td>
                <td>{{ row.ratePerPost | money }}</td>
                <td><app-status-chip [status]="row.status" /></td>
                <td>
                  <button type="button" (click)="detailFacade.open(row.id)">View details</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <footer class="pagination" aria-label="Creator pagination">
        <p>{{ showingText() }}</p>
        <div>
          <button type="button" [disabled]="facade.offset() === 0" (click)="facade.previousPage()">
            Previous
          </button>
          <button
            type="button"
            [disabled]="!facade.pageInfo()?.hasNextPage"
            (click)="facade.nextPage()"
          >
            Next
          </button>
        </div>
      </footer>
    }

    @if (detailFacade.selectedId()) {
      <div class="drawer-backdrop" (click)="detailFacade.close()">
        <aside
          class="drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="creator-detail-title"
          (click)="$event.stopPropagation()"
        >
          <div class="drawer-heading">
            <h2 id="creator-detail-title">Creator details</h2>
            <button type="button" aria-label="Close creator details" (click)="detailFacade.close()">
              Close
            </button>
          </div>

          <app-query-state
            [state]="detailFacade.state()"
            emptyMessage="Creator details are unavailable."
            (retry)="detailFacade.retry()"
          />

          @if (detailFacade.state(); as detailState) {
            @if (detailState.status === 'ready') {
              @if (detailState.data; as creator) {
                <section class="profile">
                  <div>
                    <h3>{{ creator.displayName }}</h3>
                    <p>&#64;{{ creator.handle }}</p>
                  </div>
                  <app-status-chip [status]="creator.status" />
                </section>
                <dl class="facts">
                  <div>
                    <dt>Platform</dt>
                    <dd>{{ creator.primaryPlatform }}</dd>
                  </div>
                  <div>
                    <dt>Followers</dt>
                    <dd>{{ creator.followerCount | number }}</dd>
                  </div>
                  <div>
                    <dt>Engagement</dt>
                    <dd>{{ creator.engagementRate | percent: '1.1-2' }}</dd>
                  </div>
                  <div>
                    <dt>Rate</dt>
                    <dd>{{ creator.ratePerPost | money }}</dd>
                  </div>
                  <div>
                    <dt>Joined</dt>
                    <dd>{{ creator.createdAt | date: 'mediumDate' }}</dd>
                  </div>
                </dl>

                <section>
                  <h3>Campaigns ({{ creator.campaigns.pageInfo.totalCount }})</h3>
                  @if (creator.campaigns.items.length === 0) {
                    <p class="secondary">No campaign assignments yet.</p>
                  } @else {
                    <ul class="campaign-list">
                      @for (campaign of creator.campaigns.items; track campaign.id) {
                        <li>
                          <div>
                            <strong>{{ campaign.name }}</strong
                            ><span>{{ campaign.budgetCents | money }}</span>
                          </div>
                          <app-status-chip [status]="campaign.status" />
                        </li>
                      }
                    </ul>
                  }
                </section>
              }
            }
          }
        </aside>
      </div>
    }
  `,
  styles: `
    .page-heading,
    .pagination,
    .drawer-heading,
    .profile,
    .campaign-list li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .page-heading {
      align-items: flex-end;
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
    .page-heading p,
    .secondary {
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
    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--nx-border);
      border-radius: var(--nx-radius);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--nx-surface);
    }
    th,
    td {
      padding: 0.85rem;
      border-bottom: 1px solid var(--nx-border);
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
    td .secondary {
      display: block;
    }
    .sort {
      border: 0;
      padding: 0;
      color: inherit;
      background: transparent;
      font-weight: 700;
    }
    .pagination {
      margin-top: 1rem;
    }
    .pagination p {
      margin: 0;
      color: var(--nx-muted);
    }
    .pagination div {
      display: flex;
      gap: 0.5rem;
    }
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      z-index: 30;
      display: flex;
      justify-content: flex-end;
      background: rgb(0 0 0 / 0.65);
    }
    .drawer {
      width: min(520px, 100%);
      height: 100%;
      overflow-y: auto;
      border-left: 1px solid var(--nx-border);
      padding: 1.25rem;
      background: var(--nx-surface);
      box-shadow: -20px 0 60px rgb(0 0 0 / 0.35);
    }
    .drawer-heading {
      border-bottom: 1px solid var(--nx-border);
      margin-bottom: 1rem;
      padding-bottom: 1rem;
    }
    .drawer-heading h2,
    .profile h3 {
      margin-bottom: 0;
    }
    .profile {
      align-items: flex-start;
    }
    .profile p {
      margin: 0.25rem 0 0;
    }
    .facts {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
      margin: 1.25rem 0;
    }
    .facts div {
      border: 1px solid var(--nx-border);
      border-radius: 8px;
      padding: 0.75rem;
    }
    dt {
      color: var(--nx-muted);
      font-size: 0.8rem;
    }
    dd {
      margin: 0.25rem 0 0;
      font-weight: 700;
    }
    .campaign-list {
      display: grid;
      gap: 0.6rem;
      padding: 0;
      list-style: none;
    }
    .campaign-list li {
      border: 1px solid var(--nx-border);
      border-radius: 8px;
      padding: 0.75rem;
    }
    .campaign-list span {
      display: block;
      margin-top: 0.25rem;
      color: var(--nx-muted);
    }
    @media (max-width: 720px) {
      .page-heading {
        align-items: stretch;
        flex-direction: column;
      }
    }
  `,
})
export class CreatorRosterComponent {
  readonly facade = inject(CreatorsFacade);
  readonly detailFacade = inject(CreatorDetailFacade);

  readonly statuses: readonly CreatorStatus[] = ['ACTIVE', 'PROSPECT', 'PAUSED', 'CHURNED'];
  readonly platforms: readonly Platform[] = ['INSTAGRAM', 'TIKTOK', 'YOUTUBE'];

  @HostListener('document:keydown.escape')
  closeDrawerOnEscape(): void {
    if (this.detailFacade.selectedId() !== null) this.detailFacade.close();
  }

  protected setStatus(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.patchFilter({ status: value ? (value as CreatorStatus) : undefined });
  }

  protected setPlatform(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.patchFilter({ platform: value ? (value as Platform) : undefined });
  }

  protected sortMark(key: 'followerCount' | 'engagementRate' | 'ratePerPost'): string {
    const sort = this.facade.sort();
    if (sort.key !== key) return '';
    return sort.direction === 'asc' ? '▲' : '▼';
  }

  protected showingText(): string {
    const page = this.facade.pageInfo();
    if (!page || page.totalCount === 0) return 'Showing 0-0 of 0';
    return `Showing ${page.offset + 1}-${Math.min(page.offset + page.limit, page.totalCount)} of ${page.totalCount}`;
  }

  private patchFilter(patch: CreatorFilter): void {
    this.facade.setFilter({ ...this.facade.filter(), ...patch });
  }
}

import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CreatorFilter, CreatorRosterQuery } from '../../core/graphql/generated/operations';
import type { QueryState } from '../../core/graphql/query-state';
import { CreatorDetailFacade, type CreatorDetail } from './creator-detail.facade';
import { CreatorRosterComponent } from './creator-roster.component';
import { CreatorsFacade, type CreatorRow } from './creators.facade';

const creators: CreatorRow[] = [
  {
    id: 'creator-1',
    handle: 'avery',
    displayName: 'Avery Stone',
    primaryPlatform: 'TIKTOK',
    followerCount: 125_000,
    engagementRate: 0.064,
    ratePerPost: 150_000,
    status: 'ACTIVE',
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'creator-2',
    handle: 'blake',
    displayName: 'Blake Rivers',
    primaryPlatform: 'YOUTUBE',
    followerCount: 225_000,
    engagementRate: 0.041,
    ratePerPost: 240_000,
    status: 'PROSPECT',
    createdAt: '2026-02-03T00:00:00.000Z',
  },
];

const creatorDetail: CreatorDetail = {
  ...creators[0],
  campaigns: {
    items: [
      {
        id: 'campaign-1',
        name: 'Spring Launch',
        status: 'ACTIVE',
        budgetCents: 500_000,
      },
    ],
    pageInfo: { totalCount: 1 },
  },
};

describe('CreatorRosterComponent', () => {
  let fixture: ComponentFixture<CreatorRosterComponent>;

  const rosterState = signal<QueryState<CreatorRow[]>>({
    status: 'ready',
    data: creators,
  });
  const rows = signal<CreatorRow[]>(creators);
  const pageInfo = signal<CreatorRosterQuery['creators']['pageInfo']>({
    offset: 0,
    limit: 20,
    totalCount: 80,
    hasNextPage: true,
  });
  const filter = signal<CreatorFilter>({});
  const sort = signal<{
    key: keyof CreatorRow;
    direction: 'asc' | 'desc';
  }>({ key: 'followerCount', direction: 'desc' });
  const offset = signal(0);

  const rosterFacade = {
    state: rosterState,
    rows,
    pageInfo,
    filter,
    sort,
    offset,
    limit: signal(20),
    setFilter: vi.fn((next: CreatorFilter) => {
      filter.set(next);
      offset.set(0);
    }),
    toggleSort: vi.fn((key: keyof CreatorRow) => {
      sort.set({ key, direction: 'asc' });
      rows.set([...rows()].reverse());
    }),
    nextPage: vi.fn(),
    previousPage: vi.fn(),
    retry: vi.fn(),
  } satisfies Pick<
    CreatorsFacade,
    | 'state'
    | 'rows'
    | 'pageInfo'
    | 'filter'
    | 'sort'
    | 'offset'
    | 'limit'
    | 'setFilter'
    | 'toggleSort'
    | 'nextPage'
    | 'previousPage'
    | 'retry'
  >;

  const selectedId = signal<string | null>(null);
  const detailState = signal<QueryState<CreatorDetail | null>>({
    status: 'ready',
    data: null,
  });
  const detailFacade = {
    selectedId,
    state: detailState,
    open: vi.fn((id: string) => {
      selectedId.set(id);
      detailState.set({ status: 'ready', data: creatorDetail });
    }),
    close: vi.fn(() => selectedId.set(null)),
    retry: vi.fn(),
  } satisfies Pick<CreatorDetailFacade, 'selectedId' | 'state' | 'open' | 'close' | 'retry'>;

  beforeEach(async () => {
    rosterState.set({ status: 'ready', data: creators });
    rows.set(creators);
    pageInfo.set({ offset: 0, limit: 20, totalCount: 80, hasNextPage: true });
    filter.set({});
    offset.set(0);
    selectedId.set(null);
    detailState.set({ status: 'ready', data: null });
    vi.clearAllMocks();

    await TestBed.configureTestingModule({ imports: [CreatorRosterComponent] })
      .overrideComponent(CreatorRosterComponent, {
        set: {
          providers: [
            { provide: CreatorsFacade, useValue: rosterFacade },
            { provide: CreatorDetailFacade, useValue: detailFacade },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CreatorRosterComponent);
    fixture.detectChanges();
  });

  it('renders creators and opens the correct detail after sorting', () => {
    expect(fixture.nativeElement.textContent).toContain('Avery Stone');
    expect(fixture.nativeElement.textContent).toContain('active');

    const sortButton = [...fixture.nativeElement.querySelectorAll('button')].find(
      (button: HTMLButtonElement) => button.textContent?.includes('Followers'),
    );
    sortButton?.click();
    fixture.detectChanges();

    const firstRowAction = fixture.nativeElement.querySelector(
      'tbody tr button',
    ) as HTMLButtonElement;
    firstRowAction.click();
    fixture.detectChanges();

    expect(detailFacade.open).toHaveBeenCalledWith('creator-2');
    expect(fixture.nativeElement.textContent).toContain('Creator details');
  });

  it('calls filter and pagination actions and reports the honest page range', () => {
    const statusSelect = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    statusSelect.value = 'ACTIVE';
    statusSelect.dispatchEvent(new Event('change'));

    expect(rosterFacade.setFilter).toHaveBeenCalledWith({ status: 'ACTIVE' });
    expect(fixture.nativeElement.textContent).toContain('Showing 1-20 of 80');

    let buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    const previous = buttons.find((button) => button.textContent?.trim() === 'Previous');
    expect(previous?.disabled).toBe(true);
    buttons.find((button) => button.textContent?.trim() === 'Next')?.click();
    expect(rosterFacade.nextPage).toHaveBeenCalledOnce();

    offset.set(20);
    pageInfo.set({ offset: 20, limit: 20, totalCount: 80, hasNextPage: true });
    fixture.detectChanges();
    buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.trim() === 'Previous')?.click();
    expect(rosterFacade.previousPage).toHaveBeenCalledOnce();
  });

  it('closes the detail drawer with its button and Escape', () => {
    detailFacade.open('creator-1');
    fixture.detectChanges();

    const closeButton = fixture.nativeElement.querySelector(
      '[aria-label="Close creator details"]',
    ) as HTMLButtonElement;
    closeButton.click();
    expect(detailFacade.close).toHaveBeenCalledOnce();

    detailFacade.open('creator-1');
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(detailFacade.close).toHaveBeenCalledTimes(2);
  });

  it('renders loading, error, and empty states and retries errors', () => {
    rosterState.set({ status: 'loading' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();

    rosterState.set({ status: 'error', message: 'Network unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Network unavailable',
    );
    (fixture.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    expect(rosterFacade.retry).toHaveBeenCalledOnce();

    rosterState.set({ status: 'empty' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No creators match those filters.');
  });
});

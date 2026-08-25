import { type ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { LineChartComponent } from '../../shared/line-chart.component';
import { toCampaignViewsSeries, type SeriesPoint } from './campaign-series';

describe('toCampaignViewsSeries', () => {
  it('carries latest values forward and sums multiple deliverables', () => {
    const series = toCampaignViewsSeries([
      {
        metrics: {
          items: [
            { capturedAt: '2026-01-01T10:00:00.000Z', views: 10 },
            { capturedAt: '2026-01-03T10:00:00.000Z', views: 30 },
          ],
        },
      },
      {
        metrics: {
          items: [{ capturedAt: '2026-01-02T10:00:00.000Z', views: 5 }],
        },
      },
    ]);

    expect(series.map((point) => point.value)).toEqual([10, 15, 35]);
  });

  it('stays non-decreasing for monotonic deliverable input', () => {
    const series = toCampaignViewsSeries([
      {
        metrics: {
          items: [
            { capturedAt: '2026-02-01T00:00:00.000Z', views: 4 },
            { capturedAt: '2026-02-02T00:00:00.000Z', views: 9 },
          ],
        },
      },
      {
        metrics: {
          items: [
            { capturedAt: '2026-02-01T12:00:00.000Z', views: 2 },
            { capturedAt: '2026-02-03T00:00:00.000Z', views: 12 },
          ],
        },
      },
    ]);

    expect(
      series.every((point, index) => index === 0 || point.value >= series[index - 1].value),
    ).toBe(true);
  });

  it('rejects invalid captured dates', () => {
    expect(() =>
      toCampaignViewsSeries([{ metrics: { items: [{ capturedAt: 'not-a-date', views: 1 }] } }]),
    ).toThrow('Invalid capturedAt value');
  });
});

describe('LineChartComponent', () => {
  let fixture: ComponentFixture<LineChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LineChartComponent] }).compileComponents();
    fixture = TestBed.createComponent(LineChartComponent);
  });

  it('shows an informative empty state for one point', () => {
    fixture.componentRef.setInput('points', [{ t: 1, value: 10 }] satisfies SeriesPoint[]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('At least two data points');
    expect(fixture.nativeElement.querySelector('polyline')).toBeNull();
  });

  it('guards equal timestamps and emits one coordinate per point', () => {
    const points: SeriesPoint[] = [
      { t: 1_700_000_000_000, value: 0 },
      { t: 1_700_000_000_000, value: 10 },
      { t: 1_700_000_000_000, value: 10 },
    ];
    fixture.componentRef.setInput('points', points);
    fixture.detectChanges();

    const coordinates = (fixture.nativeElement.querySelector('polyline') as SVGPolylineElement)
      .getAttribute('points')
      ?.split(' ');
    expect(coordinates).toHaveLength(points.length);
    expect(coordinates?.join(' ')).not.toMatch(/NaN|Infinity/);
  });
});

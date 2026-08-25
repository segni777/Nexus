import { Component, computed, input } from '@angular/core';
import type { SeriesPoint } from '../features/campaigns/campaign-series';

const WIDTH = 640;
const HEIGHT = 240;
const PADDING = 24;

@Component({
  selector: 'app-line-chart',
  standalone: true,
  template: `
    @if (points().length < 2) {
      <p class="empty">At least two data points are needed to draw this chart.</p>
    } @else {
      <figure>
        <svg viewBox="0 0 640 240" role="img" [attr.aria-label]="label()">
          <line x1="24" y1="216" x2="616" y2="216" />
          <polyline [attr.points]="coordinates()" />
        </svg>
        <figcaption>
          <time>{{ firstDate() }}</time>
          <span>{{ label() }}</span>
          <time>{{ lastDate() }}</time>
        </figcaption>
      </figure>
    }
  `,
  styles: `
    figure {
      margin: 0;
    }
    svg {
      display: block;
      width: 100%;
      min-height: 200px;
      border: 1px solid var(--nx-border);
      border-radius: var(--nx-radius);
      background: var(--nx-surface-raised);
    }
    line {
      stroke: var(--nx-border);
      stroke-width: 1;
    }
    polyline {
      fill: none;
      stroke: var(--nx-accent);
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    figcaption {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      margin-top: 0.5rem;
      color: var(--nx-muted);
      font-size: 0.8rem;
    }
    .empty {
      border: 1px dashed var(--nx-border);
      border-radius: var(--nx-radius);
      padding: 1rem;
      color: var(--nx-muted);
    }
  `,
})
export class LineChartComponent {
  readonly points = input.required<SeriesPoint[]>();
  readonly label = input('Time series');

  readonly coordinates = computed(() => {
    const points = this.points();
    if (points.length < 2) return '';

    const first = Math.min(...points.map((point) => point.t));
    const last = Math.max(...points.map((point) => point.t));
    const xSpan = last - first;
    const yMax = Math.max(0, ...points.map((point) => point.value));
    const plotWidth = WIDTH - PADDING * 2;
    const plotHeight = HEIGHT - PADDING * 2;

    return points
      .map((point) => {
        const x = xSpan === 0 ? WIDTH / 2 : PADDING + ((point.t - first) / xSpan) * plotWidth;
        const y = HEIGHT - PADDING - (Math.max(0, point.value) / (yMax || 1)) * plotHeight;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  });

  readonly firstDate = computed(() => this.formatDate(this.points()[0]?.t));
  readonly lastDate = computed(() => this.formatDate(this.points().at(-1)?.t));

  private formatDate(timestamp: number | undefined): string {
    return timestamp === undefined
      ? ''
      : new Date(timestamp).toLocaleDateString('en-US', { timeZone: 'UTC' });
  }
}

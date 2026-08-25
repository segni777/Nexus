export type SeriesPoint = {
  t: number;
  value: number;
};

type DeliverableMetrics = {
  metrics: {
    items: Array<{
      capturedAt: string;
      views: number;
    }>;
  };
};

const DAY_MS = 86_400_000;

function utcDay(value: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(`Invalid capturedAt value: ${value}`);
  return Math.floor(timestamp / DAY_MS) * DAY_MS;
}

export function toCampaignViewsSeries(deliverables: readonly DeliverableMetrics[]): SeriesPoint[] {
  const seriesByDeliverable = deliverables.map((deliverable) =>
    deliverable.metrics.items
      .map((metric) => ({ t: utcDay(metric.capturedAt), value: metric.views }))
      .sort((left, right) => left.t - right.t),
  );

  const days = [
    ...new Set(seriesByDeliverable.flatMap((series) => series.map((point) => point.t))),
  ].sort((left, right) => left - right);

  const indexes = seriesByDeliverable.map(() => 0);
  const latest = seriesByDeliverable.map(() => 0);

  return days.map((day) => {
    for (let index = 0; index < seriesByDeliverable.length; index += 1) {
      const series = seriesByDeliverable[index];
      while (indexes[index] < series.length && series[indexes[index]].t <= day) {
        latest[index] = series[indexes[index]].value;
        indexes[index] += 1;
      }
    }

    return {
      t: day,
      value: latest.reduce((total, value) => total + value, 0),
    };
  });
}

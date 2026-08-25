export type InsightPayload = {
  sentiment?: string;
  confidence?: number;
  highlights?: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readInsightPayload(value: unknown): InsightPayload {
  if (!isRecord(value)) return {};

  const result: InsightPayload = {};

  if (typeof value['sentiment'] === 'string') {
    result.sentiment = value['sentiment'];
  }

  if (typeof value['confidence'] === 'number' && Number.isFinite(value['confidence'])) {
    result.confidence = value['confidence'];
  }

  const highlights = value['highlights'];
  if (
    Array.isArray(highlights) &&
    highlights.every((item): item is string => typeof item === 'string')
  ) {
    result.highlights = highlights;
  }

  return result;
}

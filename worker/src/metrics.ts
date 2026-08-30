import { readBoundedJson } from "./body";
import { HttpError, jsonResponse } from "./http";
import { enforceRateLimit, type RateLimitBinding } from "./rate-limit";
import { incrementDailyCounter, METRIC_KEYS, type MetricKey } from "./repository";

export interface MetricsEnvironment {
  DB: D1Database;
  DPLUS_RATE_LIMITER: RateLimitBinding;
}

function perthDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Perth",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function validateMetricBody(value: unknown): MetricKey {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HttpError(400, "metric_object_required", "計數內容格式不正確。");
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || typeof record.metricKey !== "string") {
    throw new HttpError(400, "metric_fields_invalid", "計數只接受一個固定類別。");
  }
  if (!METRIC_KEYS.includes(record.metricKey as MetricKey)) {
    throw new HttpError(400, "metric_not_allowed", "這個計數類別不在允許清單內。");
  }
  return record.metricKey as MetricKey;
}

export async function recordAggregateMetric(
  request: Request,
  env: MetricsEnvironment,
  now = new Date(),
): Promise<Response> {
  if (new URL(request.url).search !== "") {
    throw new HttpError(400, "metric_query_forbidden", "匿名計數不得包含 query。");
  }
  const metricKey = validateMetricBody(await readBoundedJson(request, 512));
  await enforceRateLimit(env.DPLUS_RATE_LIMITER, `dplus:${metricKey}`);

  const metricDate = perthDate(now);
  await incrementDailyCounter(env.DB, metricDate, metricKey, now.toISOString());
  return jsonResponse({ ok: true, accepted: true, metricDate, metricKey }, 202);
}

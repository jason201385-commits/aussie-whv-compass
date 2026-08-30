import { HttpError } from "./http";

export const REQUEST_TYPES = [
  "course-workshop",
  "website-digital-tool",
  "content-data-community",
  "other-collaboration",
] as const;

export const METRIC_KEYS = [
  "route_opened",
  "official_source_opened",
  "task_test_started",
  "task_test_completed",
] as const;

export type RequestType = (typeof REQUEST_TYPES)[number];
export type MetricKey = (typeof METRIC_KEYS)[number];

export interface ContactCaseRecord {
  caseId: string;
  email: string;
  emailNormalized: string;
  requestType: RequestType;
  description: string;
  contactName: string | null;
  organization: string | null;
  timeline: string | null;
  budgetRange: string | null;
  locale: string;
  createdAt: string;
  deleteAfter: string;
}

export async function insertContactCase(
  db: D1Database,
  record: ContactCaseRecord,
): Promise<void> {
  const result = await db
    .prepare(
      `INSERT INTO contact_cases (
        case_id, email, email_normalized, request_type, description,
        contact_name, organization, timeline, budget_range, locale,
        created_at, updated_at, last_contact_at, delete_after
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      record.caseId,
      record.email,
      record.emailNormalized,
      record.requestType,
      record.description,
      record.contactName,
      record.organization,
      record.timeline,
      record.budgetRange,
      record.locale,
      record.createdAt,
      record.createdAt,
      record.createdAt,
      record.deleteAfter,
    )
    .run();

  if (!result.success) {
    throw new HttpError(503, "case_not_saved", "需求目前無法安全儲存，請改用複製備援。");
  }
}

export async function enqueueContactReceipt(
  db: D1Database,
  outboxId: string,
  caseId: string,
  createdAt: string,
): Promise<void> {
  const result = await db
    .prepare(
      `INSERT INTO contact_mail_outbox (
        outbox_id, case_id, template_key, next_attempt_at, created_at
      ) VALUES (?, ?, 'contact-received', ?, ?)`,
    )
    .bind(outboxId, caseId, createdAt, createdAt)
    .run();
  if (!result.success) {
    throw new HttpError(503, "receipt_not_queued", "需求已建立，但確認信暫時無法排程。");
  }
}

export async function incrementDailyCounter(
  db: D1Database,
  metricDate: string,
  metricKey: string,
  updatedAt: string,
): Promise<number> {
  if (!METRIC_KEYS.includes(metricKey as MetricKey)) {
    throw new HttpError(400, "metric_not_allowed", "這個計數類別不在允許清單內。");
  }

  const result = await db
    .prepare(
      `INSERT INTO daily_counters (metric_date, metric_key, counter_value, updated_at)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(metric_date, metric_key) DO UPDATE SET
         counter_value = counter_value + 1,
         updated_at = excluded.updated_at
       RETURNING counter_value`,
    )
    .bind(metricDate, metricKey, updatedAt)
    .first<{ counter_value: number }>();

  if (result === null) {
    throw new HttpError(503, "metric_not_saved", "聚合計數暫時無法更新。");
  }
  return result.counter_value;
}

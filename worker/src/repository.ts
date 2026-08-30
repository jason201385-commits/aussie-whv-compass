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
  "task_find_route_success_30s",
  "task_evidence_understood",
  "task_help_route_correct",
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

export interface ContactCaseBundle extends ContactCaseRecord {
  managementTokenHash: string;
  managementTokenExpiresAt: string;
  outboxId: string;
}

export interface StoredContactCase {
  caseId: string;
  email: string;
  requestType: RequestType;
  description: string;
  contactName: string | null;
  organization: string | null;
  timeline: string | null;
  budgetRange: string | null;
  locale: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  deleteAfter: string;
}

function contactInsertStatement(db: D1Database, record: ContactCaseRecord): D1PreparedStatement {
  return db
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
    );
}

export async function insertContactCase(
  db: D1Database,
  record: ContactCaseRecord,
): Promise<void> {
  const result = await contactInsertStatement(db, record).run();

  if (!result.success) {
    throw new HttpError(503, "case_not_saved", "需求目前無法安全儲存，請改用複製備援。");
  }
}

export async function insertContactCaseBundle(
  db: D1Database,
  bundle: ContactCaseBundle,
): Promise<void> {
  const results = await db.batch([
    contactInsertStatement(db, bundle),
    db
      .prepare(
        `INSERT INTO contact_access_tokens (
          token_hash, case_id, purpose, created_at, expires_at
        ) VALUES (?, ?, 'manage', ?, ?)`,
      )
      .bind(
        bundle.managementTokenHash,
        bundle.caseId,
        bundle.createdAt,
        bundle.managementTokenExpiresAt,
      ),
    db
      .prepare(
        `INSERT INTO contact_mail_outbox (
          outbox_id, case_id, template_key, next_attempt_at, created_at
        ) VALUES (?, ?, 'contact-received', ?, ?)`,
      )
      .bind(bundle.outboxId, bundle.caseId, bundle.createdAt, bundle.createdAt),
  ]);

  if (results.some((result) => !result.success)) {
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

export async function markReceiptSent(
  db: D1Database,
  outboxId: string,
  caseId: string,
  sentAt: string,
): Promise<void> {
  const results = await db.batch([
    db
      .prepare(
        `UPDATE contact_mail_outbox
         SET status = 'sent', attempt_count = attempt_count + 1, sent_at = ?, last_error_code = NULL
         WHERE outbox_id = ? AND case_id = ?`,
      )
      .bind(sentAt, outboxId, caseId),
    db
      .prepare("UPDATE contact_cases SET confirmation_sent_at = ?, updated_at = ? WHERE case_id = ?")
      .bind(sentAt, sentAt, caseId),
  ]);
  if (results.some((result) => !result.success)) {
    throw new HttpError(503, "receipt_state_not_saved", "確認信狀態暫時無法更新。");
  }
}

export async function markReceiptForRetry(
  db: D1Database,
  outboxId: string,
  errorCode: string,
  nextAttemptAt: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE contact_mail_outbox
       SET status = 'retry', attempt_count = attempt_count + 1,
           next_attempt_at = ?, last_error_code = ?
       WHERE outbox_id = ?`,
    )
    .bind(nextAttemptAt, errorCode.slice(0, 80), outboxId)
    .run();
}

export async function getContactCaseForManagement(
  db: D1Database,
  caseId: string,
  tokenHash: string,
  now: string,
): Promise<StoredContactCase | null> {
  const row = await db
    .prepare(
      `SELECT
        c.case_id, c.email, c.request_type, c.description, c.contact_name,
        c.organization, c.timeline, c.budget_range, c.locale, c.status,
        c.created_at, c.updated_at, c.delete_after
       FROM contact_cases c
       JOIN contact_access_tokens t ON t.case_id = c.case_id
       WHERE c.case_id = ? AND t.token_hash = ? AND t.purpose = 'manage'
         AND t.used_at IS NULL AND t.expires_at > ?`,
    )
    .bind(caseId, tokenHash, now)
    .first<Record<string, string | null>>();

  if (row === null) return null;
  return {
    caseId: row.case_id as string,
    email: row.email as string,
    requestType: row.request_type as RequestType,
    description: row.description as string,
    contactName: row.contact_name ?? null,
    organization: row.organization ?? null,
    timeline: row.timeline ?? null,
    budgetRange: row.budget_range ?? null,
    locale: row.locale as string,
    status: row.status as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deleteAfter: row.delete_after as string,
  };
}

export async function updateManagedContactCase(
  db: D1Database,
  caseId: string,
  tokenHash: string,
  record: ContactCaseRecord,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE contact_cases SET
        email = ?, email_normalized = ?, request_type = ?, description = ?,
        contact_name = ?, organization = ?, timeline = ?, budget_range = ?, locale = ?,
        updated_at = ?, last_contact_at = ?, delete_after = ?
       WHERE case_id = ? AND EXISTS (
         SELECT 1 FROM contact_access_tokens
         WHERE case_id = ? AND token_hash = ? AND purpose = 'manage'
           AND used_at IS NULL AND expires_at > ?
       )`,
    )
    .bind(
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
      record.deleteAfter,
      caseId,
      caseId,
      tokenHash,
      record.createdAt,
    )
    .run();
  return result.meta.changes > 0;
}

export async function deleteManagedContactCase(
  db: D1Database,
  caseId: string,
  tokenHash: string,
  now: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `DELETE FROM contact_cases
       WHERE case_id = ? AND EXISTS (
         SELECT 1 FROM contact_access_tokens
         WHERE case_id = ? AND token_hash = ? AND purpose = 'manage'
           AND used_at IS NULL AND expires_at > ?
       )`,
    )
    .bind(caseId, caseId, tokenHash, now)
    .run();
  return result.meta.changes > 0;
}

export async function purgeExpiredContactCases(db: D1Database, now: string): Promise<number> {
  const result = await db
    .prepare("DELETE FROM contact_cases WHERE delete_after <= ?")
    .bind(now)
    .run();
  return result.meta.changes;
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

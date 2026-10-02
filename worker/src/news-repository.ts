export interface VerifiedNewsRecord {
  newsId: string;
  sourceId: string;
  sourceName: string;
  title: string;
  summary: string;
  sourceUrl: string;
  feedUrl: string;
  publishedAt: string;
  fetchedAt: string;
  verifiedAt: string;
  titleMatchScore: number;
  sourceContentHash: string;
  keywords: readonly string[];
  primaryTopic: string;
  topics: readonly string[];
  jurisdiction: string;
}

export interface NewsSyncResult {
  runId: string;
  sourceId: string;
  sourceName: string;
  feedUrl: string;
  startedAt: string;
  finishedAt: string;
  status: "success" | "failed";
  fetchedCount: number;
  candidateCount: number;
  verifiedCount: number;
  rejectedCount: number;
  httpStatus: number | null;
  lastItemPublishedAt: string | null;
  errorCode: string | null;
}

export interface StoredNewsItem {
  newsId: string;
  sourceId: string;
  sourceName: string;
  title: string;
  summary: string;
  sourceUrl: string;
  feedUrl: string;
  publishedAt: string;
  verifiedAt: string;
  titleMatchScore: number;
  sourceContentHash: string;
  keywords: string[];
  primaryTopic: string;
  topics: string[];
  jurisdiction: string;
}

export interface StoredNewsSourceState {
  sourceId: string;
  sourceName: string;
  feedUrl: string;
  lastAttemptAt: string;
  lastSuccessAt: string | null;
  lastHttpStatus: number | null;
  lastErrorCode: string | null;
  consecutiveFailures: number;
  lastItemPublishedAt: string | null;
}

export async function upsertVerifiedNews(db: D1Database, record: VerifiedNewsRecord): Promise<void> {
  const result = await db
    .prepare(
      `INSERT INTO news_items (
        news_id, source_id, source_name, title, summary, source_url, feed_url,
        published_at, fetched_at, verified_at, verification_method,
        title_match_score, source_content_hash, keywords_json, primary_topic,
        topics_json, jurisdiction, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'official-feed+source-page', ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_url) DO UPDATE SET
        source_name = excluded.source_name,
        title = excluded.title,
        summary = excluded.summary,
        feed_url = excluded.feed_url,
        published_at = excluded.published_at,
        fetched_at = excluded.fetched_at,
        verified_at = excluded.verified_at,
        title_match_score = excluded.title_match_score,
        source_content_hash = excluded.source_content_hash,
        keywords_json = excluded.keywords_json,
        primary_topic = excluded.primary_topic,
        topics_json = excluded.topics_json,
        jurisdiction = excluded.jurisdiction,
        updated_at = excluded.updated_at`,
    )
    .bind(
      record.newsId,
      record.sourceId,
      record.sourceName,
      record.title,
      record.summary,
      record.sourceUrl,
      record.feedUrl,
      record.publishedAt,
      record.fetchedAt,
      record.verifiedAt,
      record.titleMatchScore,
      record.sourceContentHash,
      JSON.stringify(record.keywords),
      record.primaryTopic,
      JSON.stringify(record.topics),
      record.jurisdiction,
      record.fetchedAt,
      record.fetchedAt,
    )
    .run();
  if (!result.success) throw new Error("news_item_not_saved");
}

export async function recordNewsSyncResult(db: D1Database, result: NewsSyncResult): Promise<void> {
  const statements = [
    db
      .prepare(
        `INSERT INTO news_sync_runs (
          run_id, source_id, started_at, finished_at, status, fetched_count,
          candidate_count, verified_count, rejected_count, error_code, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        result.runId,
        result.sourceId,
        result.startedAt,
        result.finishedAt,
        result.status,
        result.fetchedCount,
        result.candidateCount,
        result.verifiedCount,
        result.rejectedCount,
        result.errorCode,
        result.finishedAt,
      ),
  ];

  if (result.status === "success") {
    statements.push(
      db
        .prepare(
          `INSERT INTO news_source_state (
            source_id, source_name, feed_url, last_attempt_at, last_success_at,
            last_http_status, last_error_code, consecutive_failures,
            last_item_published_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, NULL, 0, ?, ?)
          ON CONFLICT(source_id) DO UPDATE SET
            source_name = excluded.source_name,
            feed_url = excluded.feed_url,
            last_attempt_at = excluded.last_attempt_at,
            last_success_at = excluded.last_success_at,
            last_http_status = excluded.last_http_status,
            last_error_code = NULL,
            consecutive_failures = 0,
            last_item_published_at = excluded.last_item_published_at,
            updated_at = excluded.updated_at`,
        )
        .bind(
          result.sourceId,
          result.sourceName,
          result.feedUrl,
          result.finishedAt,
          result.finishedAt,
          result.httpStatus,
          result.lastItemPublishedAt,
          result.finishedAt,
        ),
    );
  } else {
    statements.push(
      db
        .prepare(
          `INSERT INTO news_source_state (
            source_id, source_name, feed_url, last_attempt_at, last_success_at,
            last_http_status, last_error_code, consecutive_failures,
            last_item_published_at, updated_at
          ) VALUES (?, ?, ?, ?, NULL, ?, ?, 1, NULL, ?)
          ON CONFLICT(source_id) DO UPDATE SET
            source_name = excluded.source_name,
            feed_url = excluded.feed_url,
            last_attempt_at = excluded.last_attempt_at,
            last_http_status = excluded.last_http_status,
            last_error_code = excluded.last_error_code,
            consecutive_failures = news_source_state.consecutive_failures + 1,
            updated_at = excluded.updated_at`,
        )
        .bind(
          result.sourceId,
          result.sourceName,
          result.feedUrl,
          result.finishedAt,
          result.httpStatus,
          result.errorCode,
          result.finishedAt,
        ),
    );
  }
  const writes = await db.batch(statements);
  if (writes.some((write) => !write.success)) throw new Error("news_sync_state_not_saved");
}

export async function listVerifiedNews(
  db: D1Database,
  startAt: string,
  topic: string | null,
  limit: number,
): Promise<StoredNewsItem[]> {
  const topicClause = topic === null ? "" : " AND topics_json LIKE ?";
  const statement = db.prepare(
    `SELECT news_id, source_id, source_name, title, summary, source_url, feed_url,
            published_at, verified_at, title_match_score, source_content_hash,
            keywords_json, primary_topic, topics_json, jurisdiction
     FROM news_items
     WHERE published_at >= ?${topicClause}
     ORDER BY published_at DESC, news_id ASC
     LIMIT ?`,
  );
  const bound = topic === null ? statement.bind(startAt, limit) : statement.bind(startAt, `%\"${topic}\"%`, limit);
  const rows = await bound.all<Record<string, string | number>>();
  return rows.results.map((row) => ({
    newsId: String(row.news_id),
    sourceId: String(row.source_id),
    sourceName: String(row.source_name),
    title: String(row.title),
    summary: String(row.summary),
    sourceUrl: String(row.source_url),
    feedUrl: String(row.feed_url),
    publishedAt: String(row.published_at),
    verifiedAt: String(row.verified_at),
    titleMatchScore: Number(row.title_match_score),
    sourceContentHash: String(row.source_content_hash),
    keywords: JSON.parse(String(row.keywords_json)) as string[],
    primaryTopic: String(row.primary_topic),
    topics: JSON.parse(String(row.topics_json)) as string[],
    jurisdiction: String(row.jurisdiction),
  }));
}

export async function listNewsSourceStates(db: D1Database): Promise<StoredNewsSourceState[]> {
  const rows = await db
    .prepare(
      `SELECT source_id, source_name, feed_url, last_attempt_at, last_success_at,
              last_http_status, last_error_code, consecutive_failures,
              last_item_published_at
       FROM news_source_state ORDER BY source_id`,
    )
    .all<Record<string, string | number | null>>();
  return rows.results.map((row) => ({
    sourceId: String(row.source_id),
    sourceName: String(row.source_name),
    feedUrl: String(row.feed_url),
    lastAttemptAt: String(row.last_attempt_at),
    lastSuccessAt: row.last_success_at === null ? null : String(row.last_success_at),
    lastHttpStatus: row.last_http_status === null ? null : Number(row.last_http_status),
    lastErrorCode: row.last_error_code === null ? null : String(row.last_error_code),
    consecutiveFailures: Number(row.consecutive_failures),
    lastItemPublishedAt: row.last_item_published_at === null ? null : String(row.last_item_published_at),
  }));
}

export async function purgeOldNews(db: D1Database, before: string): Promise<number> {
  const result = await db.prepare("DELETE FROM news_items WHERE published_at < ?").bind(before).run();
  return result.meta.changes;
}

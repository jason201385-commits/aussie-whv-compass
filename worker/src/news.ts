import { HttpError } from "./http";
import {
  listNewsSourceStates,
  listVerifiedNews,
  recordNewsSyncResult,
  upsertVerifiedNews,
  type NewsSyncResult,
} from "./news-repository";
import { NEWS_SOURCES, type NewsSource } from "./news-sources";

export const NEWS_SYNC_CRON = "47 */6 * * *";
export const NEWS_RETENTION_DAYS = 400;
const FEED_MAX_BYTES = 1_000_000;
const ARTICLE_MAX_BYTES = 320_000;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_ITEMS_PER_SOURCE = 8;
const TOPIC_IDS = ["work", "housing", "visa", "money", "safety", "health", "transport", "weather", "general"] as const;
type NewsTopic = (typeof TOPIC_IDS)[number];

export interface NewsDependencies {
  newsFetch?: typeof fetch;
  now?: () => Date;
}

interface ParsedFeedItem {
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
}

interface TopicRule {
  id: NewsTopic;
  label: string;
  pattern: RegExp;
}

const TOPIC_RULES: readonly TopicRule[] = [
  { id: "work", label: "工作", pattern: /\b(job|jobs|employment|employer|worker|workplace|wage|pay|award|recruit|labour|vacanc|occupation|hospitality|agricultur|seasonal|skill shortage)\w*/i },
  { id: "housing", label: "租屋", pattern: /\b(rent|rental|tenan|bond|accommodation|share house|estate agent|landlord)\w*/i },
  { id: "visa", label: "簽證", pattern: /\b(visa|immigration|migration|migrant|working holiday|temporary entrant)\w*/i },
  { id: "money", label: "金錢", pattern: /\b(tax|ato|mygov|superannuation|super|bank|payment|price|cost|underpay|refund)\w*/i },
  { id: "safety", label: "防詐安全", pattern: /\b(scam|fraud|phishing|identity|cyber|warning|emergency|recall|product safety)\w*/i },
  { id: "health", label: "健康", pattern: /\b(health|medicine|medication|outbreak|disease|vaccin|mental health|food safety|infection)\w*/i },
  { id: "transport", label: "交通車輛", pattern: /\b(vehicle|used car|transport|road|fuel|petrol|licen[cs]e)\w*/i },
  { id: "weather", label: "天氣警示", pattern: /\b(weather|cyclone|storm|flood|fire|heatwave|bushfire)\w*/i },
] as const;

const STOP_WORDS = new Set([
  "about", "after", "ahead", "australia", "australian", "from", "into", "more", "news", "over",
  "that", "their", "this", "with", "your", "alert", "latest", "update", "updates", "media", "release",
]);

class NewsSyncError extends Error {
  constructor(readonly code: string, readonly httpStatus: number | null = null) {
    super(code);
    this.name = "NewsSyncError";
  }
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_match, value: string) => String.fromCodePoint(Number(value)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, value: string) => String.fromCodePoint(Number.parseInt(value, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");
}

function plainText(value: string, maxLength: number): string {
  const withoutUnsafeBlocks = value.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  return compact(decodeXml(withoutUnsafeBlocks).replace(/<[^>]+>/g, " ")).slice(0, maxLength);
}

function elementValue(block: string, names: readonly string[]): string {
  for (const name of names) {
    const match = block.match(new RegExp(`<(?:(?:[\\w-]+):)?${name}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[\\w-]+):)?${name}>`, "i"));
    if (match) return compact(decodeXml(match[1] ?? ""));
  }
  return "";
}

function feedLink(block: string): string {
  const contentLink = elementValue(block, ["link"]);
  if (contentLink) return contentLink;
  const href = block.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i);
  return href ? decodeXml(href[1] ?? "") : "";
}

function canonicalSourceUrl(raw: string, source: NewsSource): string | null {
  try {
    const url = new URL(raw, source.feedUrl);
    if (url.protocol === "http:" && source.allowedArticleHosts.includes(url.hostname)) url.protocol = "https:";
    if (url.protocol !== "https:" || !source.allowedArticleHosts.includes(url.hostname)) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function parseOfficialFeed(xml: string, source: NewsSource, now: Date): ParsedFeedItem[] {
  if (!/<(?:rss|feed)\b/i.test(xml)) throw new NewsSyncError("feed_format_invalid");
  const blocks = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((match) => match[2] ?? "");
  const oldestAllowed = now.getTime() - 120 * 86_400_000;
  const newestAllowed = now.getTime() + 6 * 3_600_000;
  const items: ParsedFeedItem[] = [];
  for (const block of blocks.slice(0, 40)) {
    const title = plainText(elementValue(block, ["title"]), 240);
    const summary = plainText(elementValue(block, ["description", "summary", "content", "encoded"]), 600);
    const url = canonicalSourceUrl(feedLink(block), source);
    const rawDate = elementValue(block, ["pubDate", "published", "updated", "date"]);
    const timestamp = Date.parse(rawDate);
    if (!title || !url || !Number.isFinite(timestamp)) continue;
    if (timestamp < oldestAllowed || timestamp > newestAllowed) continue;
    items.push({ title, summary, url, publishedAt: new Date(timestamp).toISOString() });
  }
  return items;
}

export function classifyNews(source: NewsSource, title: string, summary: string): {
  relevant: boolean;
  primaryTopic: NewsTopic;
  topics: NewsTopic[];
  keywords: string[];
} {
  const text = compact(`${title} ${summary}`);
  if (!source.relevancePattern.test(text)) return { relevant: false, primaryTopic: "general", topics: [], keywords: [] };
  const matched = TOPIC_RULES.filter((rule) => rule.pattern.test(text));
  const primary = matched[0] ?? { id: "general" as const, label: "生活情報", pattern: /$^/ };
  const topics = matched.length > 0 ? matched.map((rule) => rule.id) : [primary.id];
  const labels = [primary.label, ...matched.slice(1).map((rule) => rule.label)];
  labels.push(source.jurisdiction === "VIC" ? "VIC" : "全澳");
  labels.push(source.name);
  return { relevant: true, primaryTopic: primary.id, topics: [...new Set(topics)], keywords: [...new Set(labels)].slice(0, 5) };
}

async function readBoundedResponse(response: Response, maxBytes: number): Promise<string> {
  if (response.body === null) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let output = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new NewsSyncError("response_too_large", response.status);
      output += decoder.decode(value, { stream: true });
    }
    output += decoder.decode();
    return output;
  } finally {
    try { await reader.cancel(); } catch { /* already closed */ }
  }
}

async function timedFetch(transport: typeof fetch, url: string, accept: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await transport(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: accept,
        "User-Agent": "AussieWHVCompass-NewsBot/1.0 (+https://www.aussiewhvcompass.com/about.html)",
      },
    });
  } catch (error) {
    if (error instanceof NewsSyncError) throw error;
    throw new NewsSyncError(error instanceof DOMException && error.name === "AbortError" ? "fetch_timeout" : "fetch_failed");
  } finally {
    clearTimeout(timeout);
  }
}

function titleTokens(title: string): string[] {
  return [...new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
  )];
}

export function articleTitleMatch(title: string, html: string): number {
  const haystack = plainText(html, ARTICLE_MAX_BYTES).toLowerCase();
  const normalizedTitle = plainText(title, 240).toLowerCase();
  if (normalizedTitle.length >= 12 && haystack.includes(normalizedTitle)) return 1;
  const tokens = titleTokens(title);
  if (tokens.length < 2) return 0;
  const matched = tokens.filter((token) => haystack.includes(token)).length;
  return matched / tokens.length;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyArticle(
  source: NewsSource,
  item: ParsedFeedItem,
  transport: typeof fetch,
): Promise<{ score: number; hash: string } | null> {
  const response = await timedFetch(transport, item.url, "text/html,application/xhtml+xml;q=0.9");
  if (!response.ok) return null;
  const finalUrl = canonicalSourceUrl(response.url || item.url, source);
  if (finalUrl === null) return null;
  const contentType = (response.headers.get("Content-Type") ?? "").toLowerCase();
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) return null;
  const html = await readBoundedResponse(response, ARTICLE_MAX_BYTES);
  const score = articleTitleMatch(item.title, html);
  if (score < 0.6) return null;
  return { score, hash: await sha256(html) };
}

async function syncOneSource(
  db: D1Database,
  source: NewsSource,
  transport: typeof fetch,
  now: Date,
): Promise<NewsSyncResult> {
  const startedAt = now.toISOString();
  const base: NewsSyncResult = {
    runId: crypto.randomUUID(),
    sourceId: source.id,
    sourceName: source.name,
    feedUrl: source.feedUrl,
    startedAt,
    finishedAt: startedAt,
    status: "failed",
    fetchedCount: 0,
    candidateCount: 0,
    verifiedCount: 0,
    rejectedCount: 0,
    httpStatus: null,
    lastItemPublishedAt: null,
    errorCode: null,
  };
  try {
    const response = await timedFetch(transport, source.feedUrl, "application/rss+xml,application/atom+xml,application/xml,text/xml;q=0.9");
    base.httpStatus = response.status;
    if (!response.ok) throw new NewsSyncError("feed_http_error", response.status);
    const contentType = (response.headers.get("Content-Type") ?? "").toLowerCase();
    if (!/(rss|atom|xml)/.test(contentType)) throw new NewsSyncError("feed_content_type_invalid", response.status);
    const xml = await readBoundedResponse(response, FEED_MAX_BYTES);
    const parsed = parseOfficialFeed(xml, source, now);
    base.fetchedCount = parsed.length;
    const candidates = parsed
      .map((item) => ({ item, classification: classifyNews(source, item.title, item.summary) }))
      .filter((candidate) => candidate.classification.relevant)
      .slice(0, MAX_ITEMS_PER_SOURCE);
    base.candidateCount = candidates.length;
    for (const candidate of candidates) {
      let evidence: Awaited<ReturnType<typeof verifyArticle>>;
      try {
        evidence = await verifyArticle(source, candidate.item, transport);
      } catch {
        base.rejectedCount += 1;
        continue;
      }
      if (evidence === null) {
        base.rejectedCount += 1;
        continue;
      }
      const newsId = (await sha256(`${source.id}\n${candidate.item.url}`)).slice(0, 32);
      await upsertVerifiedNews(db, {
        newsId,
        sourceId: source.id,
        sourceName: source.name,
        title: candidate.item.title,
        summary: candidate.item.summary,
        sourceUrl: candidate.item.url,
        feedUrl: source.feedUrl,
        publishedAt: candidate.item.publishedAt,
        fetchedAt: now.toISOString(),
        verifiedAt: now.toISOString(),
        titleMatchScore: evidence.score,
        sourceContentHash: evidence.hash,
        keywords: candidate.classification.keywords,
        primaryTopic: candidate.classification.primaryTopic,
        topics: candidate.classification.topics,
        jurisdiction: source.jurisdiction,
      });
      base.verifiedCount += 1;
    }
    base.status = "success";
    base.lastItemPublishedAt = parsed[0]?.publishedAt ?? null;
  } catch (error) {
    base.status = "failed";
    base.errorCode = error instanceof NewsSyncError ? error.code : "sync_failed";
    if (error instanceof NewsSyncError && error.httpStatus !== null) base.httpStatus = error.httpStatus;
  }
  base.finishedAt = now.toISOString();
  await recordNewsSyncResult(db, base);
  return base;
}

export async function syncOfficialNews(
  db: D1Database,
  dependencies: NewsDependencies = {},
): Promise<NewsSyncResult[]> {
  const transport = dependencies.newsFetch ?? fetch;
  const now = dependencies.now?.() ?? new Date();
  const results: NewsSyncResult[] = [];
  for (const source of NEWS_SOURCES) results.push(await syncOneSource(db, source, transport, now));
  if (results.every((result) => result.status === "failed")) throw new Error("all_news_sources_failed");
  return results;
}

function perthWindowStart(now: Date, windowKey: "day" | "week" | "month"): string {
  const perth = new Date(now.getTime() + 8 * 3_600_000);
  const year = perth.getUTCFullYear();
  const month = perth.getUTCMonth();
  const date = perth.getUTCDate();
  let startDay = date;
  let startMonth = month;
  if (windowKey === "week") {
    const day = perth.getUTCDay();
    startDay = date - (day === 0 ? 6 : day - 1);
  } else if (windowKey === "month") {
    startDay = 1;
    startMonth = month;
  }
  return new Date(Date.UTC(year, startMonth, startDay, 0, 0, 0) - 8 * 3_600_000).toISOString();
}

function publicNewsResponse(body: unknown): Response {
  return Response.json(body, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=900",
      "Content-Type": "application/json; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function getVerifiedNews(request: Request, db: D1Database, now = new Date()): Promise<Response> {
  const url = new URL(request.url);
  const requestedWindow = url.searchParams.get("window") ?? "day";
  if (!(["day", "week", "month"] as const).includes(requestedWindow as "day" | "week" | "month")) {
    throw new HttpError(400, "news_window_invalid", "新聞區間只接受 day、week 或 month。");
  }
  const windowKey = requestedWindow as "day" | "week" | "month";
  const requestedTopic = url.searchParams.get("topic");
  const topic = requestedTopic === null || requestedTopic === "all" ? null : requestedTopic;
  if (topic !== null && !TOPIC_IDS.includes(topic as NewsTopic)) {
    throw new HttpError(400, "news_topic_invalid", "這個新聞關鍵字不在允許清單內。");
  }
  const startAt = perthWindowStart(now, windowKey);
  const [items, storedStates] = await Promise.all([
    listVerifiedNews(db, startAt, topic, 40),
    listNewsSourceStates(db),
  ]);
  const states = new Map(storedStates.map((state) => [state.sourceId, state]));
  return publicNewsResponse({
    ok: true,
    asOf: now.toISOString(),
    timezone: "Australia/Perth",
    window: { key: windowKey, startAt },
    topic: topic ?? "all",
    items: items.map((item) => ({
      id: item.newsId,
      title: item.title,
      summary: item.summary,
      url: item.sourceUrl,
      publishedAt: item.publishedAt,
      keywords: item.keywords,
      primaryTopic: item.primaryTopic,
      topics: item.topics,
      jurisdiction: item.jurisdiction,
      source: { id: item.sourceId, name: item.sourceName, feedUrl: item.feedUrl },
      verification: {
        method: "official-feed+source-page",
        checkedAt: item.verifiedAt,
        titleMatchScore: item.titleMatchScore,
        contentHash: item.sourceContentHash,
      },
    })),
    sources: NEWS_SOURCES.map((source) => {
      const state = states.get(source.id);
      return {
        id: source.id,
        name: source.name,
        publicPageUrl: source.publicPageUrl,
        feedUrl: source.feedUrl,
        termsUrl: source.termsUrl,
        jurisdiction: source.jurisdiction,
        status: state === undefined ? "not-run" : state.lastErrorCode === null ? "healthy" : "degraded",
        lastAttemptAt: state?.lastAttemptAt ?? null,
        lastSuccessAt: state?.lastSuccessAt ?? null,
        lastItemPublishedAt: state?.lastItemPublishedAt ?? null,
        consecutiveFailures: state?.consecutiveFailures ?? 0,
      };
    }),
  });
}

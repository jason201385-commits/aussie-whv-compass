import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, type AppEnv } from "../src/index";
import { articleTitleMatch, classifyNews, parseOfficialFeed, syncOfficialNews } from "../src/news";
import { upsertVerifiedNews } from "../src/news-repository";
import { NEWS_SOURCES, type NewsSource } from "../src/news-sources";

const fixedNow = new Date("2026-10-02T00:00:00.000Z");

interface SourceFixture {
  title: string;
  summary: string;
  url: string;
}

const SOURCE_FIXTURES: Record<string, SourceFixture> = {
  scamwatch: {
    title: "Job scam warning for people looking for work",
    summary: "A recruitment scam is targeting job seekers and asking for bank payments.",
    url: "https://www.scamwatch.gov.au/news-alerts/job-scam-warning-2026",
  },
  "jobs-skills-au": {
    title: "Seasonal jobs and workforce update",
    summary: "New employment and labour market information for regional workers.",
    url: "https://www.jobsandskills.gov.au/news/seasonal-jobs-and-workforce-update",
  },
  "health-au": {
    title: "Public health alert for travellers",
    summary: "A public health and infectious disease update for people travelling in Australia.",
    url: "https://www.health.gov.au/news/public-health-alert-travellers",
  },
  "consumer-vic": {
    title: "Rental bond warning for Victorian tenants",
    summary: "Consumer information about rental bonds, tenants and estate agents.",
    url: "https://www.consumer.vic.gov.au/latest-news/rental-bond-warning",
  },
};

function fixtureFor(source: NewsSource): SourceFixture {
  const fixture = SOURCE_FIXTURES[source.id];
  if (fixture === undefined) throw new Error(`missing fixture for ${source.id}`);
  return fixture;
}

function feedFor(source: NewsSource): string {
  const fixture = fixtureFor(source);
  return `<?xml version="1.0"?><rss><channel><item>
    <title><![CDATA[${fixture.title}]]></title>
    <description><![CDATA[${fixture.summary}]]></description>
    <link>${fixture.url.replaceAll("&", "&amp;")}</link>
    <pubDate>Thu, 01 Oct 2026 00:00:00 GMT</pubDate>
  </item></channel></rss>`;
}

const successfulNewsFetch: typeof fetch = async (input) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const source = NEWS_SOURCES.find((candidate) => candidate.feedUrl === url);
  if (source !== undefined) {
    return new Response(feedFor(source), {
      status: 200,
      headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
    });
  }
  const articleSource = NEWS_SOURCES.find((candidate) => candidate.allowedArticleHosts.includes(new URL(url).hostname));
  if (articleSource !== undefined) {
    const fixture = fixtureFor(articleSource);
    return new Response(`<html><head><title>${fixture.title}</title></head><body>${fixture.summary}</body></html>`, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  return new Response("not found", { status: 404 });
};

afterEach(() => { vi.useRealTimers(); });

function inputUrl(input: Parameters<typeof fetch>[0]): string {
  return typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
}

async function seedVerifiedDates(dates: string[]): Promise<void> {
  // The Workers test database is shared within this file; replace only its news fixture rows.
  await env.DB.prepare("DELETE FROM news_items").run();
  const source = NEWS_SOURCES.find((candidate) => candidate.id === "consumer-vic");
  if (source === undefined) throw new Error("missing source fixture");
  const fixture = fixtureFor(source);
  for (const [index, publishedAt] of dates.entries()) {
    await upsertVerifiedNews(env.DB, {
      newsId: `window-fixture-${index}`,
      sourceId: source.id,
      sourceName: source.name,
      title: fixture.title,
      summary: fixture.summary,
      sourceUrl: `${fixture.url}-window-${index}`,
      feedUrl: source.feedUrl,
      publishedAt,
      fetchedAt: "2026-10-11T00:00:00.000Z",
      verifiedAt: "2026-10-11T00:00:00.000Z",
      titleMatchScore: 1,
      sourceContentHash: "a".repeat(64),
      keywords: ["租屋", "VIC"],
      primaryTopic: "housing",
      topics: ["housing"],
      jurisdiction: source.jurisdiction,
    });
  }
}

async function fetchNewsWindow(query: string, now: Date) {
  const app = createApp({ now: () => now });
  const ctx = createExecutionContext();
  const response = await app.fetch(
    new Request(`https://api.example.test/api/news${query}`, { headers: { Origin: "https://www.aussiewhvcompass.com" } }),
    { ...env, TURNSTILE_SECRET_KEY: "unused-news-test", RATE_LIMIT_HMAC_KEY: "unused-news-test" },
    ctx,
  );
  await waitOnExecutionContext(ctx);
  const body = await response.json<{
    window: { key: string; startAt: string };
    items: Array<{ publishedAt: string; verification: { method: string; contentHash: string } }>;
  }>();
  return { response, body };
}

describe("verified official news", () => {
  it("parses only current HTTPS items from an allowed official host", () => {
    const source = NEWS_SOURCES[0];
    if (source === undefined) throw new Error("missing source fixture");
    const xml = `${feedFor(source)}
      <item><title>Wrong host job alert</title><description>job scam</description>
      <link>https://attacker.example/job</link><pubDate>Thu, 01 Oct 2026 00:00:00 GMT</pubDate></item>`;
    const items = parseOfficialFeed(xml, source, fixedNow);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: SOURCE_FIXTURES.scamwatch?.title,
      url: SOURCE_FIXTURES.scamwatch?.url,
      publishedAt: "2026-10-01T00:00:00.000Z",
    });
  });

  it("keeps keywords controlled and rejects irrelevant stories", () => {
    const source = NEWS_SOURCES[0];
    if (source === undefined) throw new Error("missing source fixture");
    const relevant = classifyNews(source, "Job scam warning", "Fake recruitment payment request");
    const irrelevant = classifyNews(source, "Annual office report", "A review of internal governance");

    expect(relevant).toMatchObject({ relevant: true, primaryTopic: "work" });
    expect(relevant.topics).toEqual(["work", "money", "safety"]);
    expect(relevant.keywords).toContain("工作");
    expect(relevant.keywords).toContain("Scamwatch");
    expect(relevant.keywords.length).toBeLessThanOrEqual(5);
    expect(irrelevant).toEqual({ relevant: false, primaryTopic: "general", topics: [], keywords: [] });
  });

  it("requires the original article page to substantially match the feed title", () => {
    expect(articleTitleMatch("Seasonal jobs and workforce update", "<h1>Seasonal jobs and workforce update</h1>")).toBe(1);
    expect(articleTitleMatch("Seasonal jobs and workforce update", "<h1>Unrelated sports results</h1>")).toBe(0);
  });

  it("stores only records that pass both feed and source-page checks", async () => {
    const results = await syncOfficialNews(env.DB, {
      newsFetch: successfulNewsFetch,
      now: () => fixedNow,
    });

    expect(results).toHaveLength(NEWS_SOURCES.length);
    expect(results.every((result) => result.status === "success")).toBe(true);
    expect(results.every((result) => result.verifiedCount === 1)).toBe(true);
    const rows = await env.DB
      .prepare("SELECT source_id, verification_method, source_content_hash FROM news_items WHERE verified_at = ?")
      .bind(fixedNow.toISOString())
      .all<{ source_id: string; verification_method: string; source_content_hash: string }>();
    expect(rows.results).toHaveLength(NEWS_SOURCES.length);
    expect(rows.results.every((row) => row.verification_method === "official-feed+source-page")).toBe(true);
    expect(rows.results.every((row) => /^[a-f0-9]{64}$/.test(row.source_content_hash))).toBe(true);
  });

  it("times out headers even when the transport ignores abort, then syncs later sources", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const first = NEWS_SOURCES[0];
    if (first === undefined) throw new Error("missing source fixture");
    let signal: AbortSignal | null | undefined;
    let entered: () => void = () => {};
    const pending = new Promise<void>((resolve) => { entered = resolve; });
    const transport: typeof fetch = async (input, init) => {
      if (inputUrl(input) === first.feedUrl) {
        signal = init?.signal;
        entered();
        return new Promise<Response>(() => {});
      }
      return successfulNewsFetch(input, init);
    };
    const run = syncOfficialNews(env.DB, { newsFetch: transport, now: () => fixedNow });
    await pending;
    await vi.advanceTimersByTimeAsync(12_000);
    const results = await run;

    expect(signal?.aborted).toBe(true);
    expect(results[0]).toMatchObject({ status: "failed", errorCode: "fetch_timeout", httpStatus: null });
    expect(results.slice(1).every((result) => result.status === "success" && result.verifiedCount === 1)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["feed", "article"] as const)("bounds a stalled %s body and never waits for a stalled cancel promise", async (stage) => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const first = NEWS_SOURCES[0];
    if (first === undefined) throw new Error("missing source fixture");
    const target = stage === "feed" ? first.feedUrl : fixtureFor(first).url;
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    let signal: AbortSignal | null | undefined;
    let entered: () => void = () => {};
    const pending = new Promise<void>((resolve) => { entered = resolve; });
    const transport: typeof fetch = async (input, init) => {
      if (inputUrl(input) !== target) return successfulNewsFetch(input, init);
      signal = init?.signal;
      const body = new ReadableStream<Uint8Array>({
        start(controller) { controller.enqueue(new TextEncoder().encode(stage === "feed" ? "<rss>" : "<html>")); },
        pull() { return new Promise<void>(() => {}); },
        cancel,
      });
      entered();
      return new Response(body, { headers: { "Content-Type": stage === "feed" ? "application/rss+xml" : "text/html" } });
    };
    const run = syncOfficialNews(env.DB, { newsFetch: transport, now: () => fixedNow });
    await pending;
    await vi.advanceTimersByTimeAsync(12_000);
    const results = await run;

    expect(signal?.aborted).toBe(true);
    expect(cancel).toHaveBeenCalledOnce();
    if (stage === "feed") {
      expect(results[0]).toMatchObject({ status: "failed", errorCode: "fetch_timeout", httpStatus: 200 });
    } else {
      expect(results[0]).toMatchObject({ status: "success", candidateCount: 1, rejectedCount: 1, verifiedCount: 0 });
    }
    expect(results.slice(1).every((result) => result.status === "success" && result.verifiedCount === 1)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("uses one cumulative deadline across delayed headers and slow body chunks", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const first = NEWS_SOURCES[0];
    if (first === undefined) throw new Error("missing source fixture");
    let pullTimer: ReturnType<typeof setTimeout> | undefined;
    let chunks = 0;
    const cancel = vi.fn(() => { if (pullTimer !== undefined) clearTimeout(pullTimer); });
    const transport: typeof fetch = async (input, init) => {
      if (inputUrl(input) !== first.feedUrl) return successfulNewsFetch(input, init);
      await new Promise<void>((resolve) => { setTimeout(resolve, 6_000); });
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          return new Promise<void>((resolve) => {
            pullTimer = setTimeout(() => {
              chunks += 1;
              controller.enqueue(new TextEncoder().encode("<rss>"));
              resolve();
            }, 4_000);
          });
        },
        cancel,
      });
      return new Response(body, { headers: { "Content-Type": "application/rss+xml" } });
    };
    const run = syncOfficialNews(env.DB, { newsFetch: transport, now: () => fixedNow });
    await vi.advanceTimersByTimeAsync(11_999);
    expect(chunks).toBe(1);
    expect(cancel).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    const results = await run;

    expect(results[0]).toMatchObject({ status: "failed", errorCode: "fetch_timeout" });
    expect(cancel).toHaveBeenCalledOnce();
    expect(chunks).toBe(1);
    expect(results.slice(1).every((result) => result.verifiedCount === 1)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["feed", "article"] as const)("still cancels an oversized %s without waiting for cancellation", async (stage) => {
    const first = NEWS_SOURCES[0];
    if (first === undefined) throw new Error("missing source fixture");
    const target = stage === "feed" ? first.feedUrl : fixtureFor(first).url;
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    const transport: typeof fetch = async (input, init) => {
      if (inputUrl(input) !== target) return successfulNewsFetch(input, init);
      const body = new ReadableStream<Uint8Array>({
        start(controller) { controller.enqueue(new Uint8Array((stage === "feed" ? 1_000_000 : 320_000) + 1)); },
        cancel,
      });
      return new Response(body, { headers: { "Content-Type": stage === "feed" ? "application/rss+xml" : "text/html" } });
    };
    const results = await syncOfficialNews(env.DB, { newsFetch: transport, now: () => fixedNow });

    expect(cancel).toHaveBeenCalledOnce();
    if (stage === "feed") {
      expect(results[0]).toMatchObject({ status: "failed", errorCode: "response_too_large", httpStatus: 200 });
    } else {
      expect(results[0]).toMatchObject({ status: "success", rejectedCount: 1, verifiedCount: 0 });
    }
    expect(results.slice(1).every((result) => result.verifiedCount === 1)).toBe(true);
  });

  it("serves day, week and month windows with public verification evidence", async () => {
    await syncOfficialNews(env.DB, { newsFetch: successfulNewsFetch, now: () => fixedNow });
    const app = createApp({ now: () => fixedNow });
    const ctx = createExecutionContext();
    const response = await app.fetch(
      new Request("https://api.example.test/api/news?window=month&topic=all", {
        headers: { Origin: "https://www.aussiewhvcompass.com" },
      }),
      env as unknown as AppEnv,
      ctx,
    );
    await waitOnExecutionContext(ctx);
    const body = await response.json<{
      ok: boolean;
      window: { key: string; startAt: string };
      items: Array<{ keywords: string[]; verification: { method: string; contentHash: string } }>;
      sources: Array<{ status: string }>;
    }>();

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://www.aussiewhvcompass.com");
    expect(response.headers.get("Cache-Control")).toContain("max-age=300");
    expect(body.ok).toBe(true);
    expect(body.window).toEqual({ key: "month", startAt: "2026-09-30T16:00:00.000Z" });
    expect(body.items).toHaveLength(NEWS_SOURCES.length);
    expect(body.items.every((item) => item.keywords.length > 0)).toBe(true);
    expect(body.items.every((item) => item.verification.method === "official-feed+source-page")).toBe(true);
    expect(body.sources.every((source) => source.status === "healthy")).toBe(true);
    expect((await fetchNewsWindow("?window=day", fixedNow)).body.window).toEqual({ key: "day", startAt: "2026-10-01T16:00:00.000Z" });
    expect((await fetchNewsWindow("?window=week", fixedNow)).body.window).toEqual({ key: "week", startAt: "2026-09-27T16:00:00.000Z" });
  });

  it("returns a story through every matched topic instead of only its primary topic", async () => {
    await syncOfficialNews(env.DB, { newsFetch: successfulNewsFetch, now: () => fixedNow });
    const app = createApp({ now: () => fixedNow });
    const ctx = createExecutionContext();
    const response = await app.fetch(
      new Request("https://api.example.test/api/news?window=month&topic=safety"),
      env as unknown as AppEnv,
      ctx,
    );
    await waitOnExecutionContext(ctx);
    const body = await response.json<{ items: Array<{ title: string; primaryTopic: string; topics: string[] }> }>();

    expect(response.status).toBe(200);
    const jobScam = body.items.find((item) => item.title === SOURCE_FIXTURES.scamwatch?.title);
    expect(jobScam).toMatchObject({
      title: SOURCE_FIXTURES.scamwatch?.title,
      primaryTopic: "work",
      topics: ["work", "money", "safety"],
    });
  });

  it("includes August and September verified news in recent while October month remains empty", async () => {
    const dates = ["2026-08-04T00:00:00.000Z", "2026-09-22T00:00:00.000Z"];
    await seedVerifiedDates(dates);
    const now = new Date("2026-10-11T00:00:00.000Z");
    const month = await fetchNewsWindow("?window=month", now);
    const recent = await fetchNewsWindow("?window=recent", now);

    expect(month.body.window).toEqual({ key: "month", startAt: "2026-09-30T16:00:00.000Z" });
    expect(month.body.items).toEqual([]);
    expect(recent.response.status).toBe(200);
    expect(recent.response.headers.get("Access-Control-Allow-Origin")).toBe("https://www.aussiewhvcompass.com");
    expect(recent.response.headers.get("Cache-Control")).toContain("max-age=300");
    expect(recent.body.window).toEqual({ key: "recent", startAt: "2026-07-13T16:00:00.000Z" });
    expect(recent.body.items.map((item) => item.publishedAt)).toEqual([...dates].reverse());
    expect(recent.body.items.every((item) => item.verification.method === "official-feed+source-page" && /^[a-f0-9]{64}$/.test(item.verification.contentHash))).toBe(true);
    expect((await fetchNewsWindow("?window=recent&topic=work", now)).body.items).toEqual([]);
    expect((await fetchNewsWindow("?window=recent&topic=housing", now)).body.items).toHaveLength(2);
  });

  it("moves the inclusive 90-day cutoff at Perth midnight rather than UTC midnight", async () => {
    const beforeCutoff = "2026-07-13T15:59:59.999Z";
    const atCutoff = "2026-07-13T16:00:00.000Z";
    await seedVerifiedDates([beforeCutoff, atCutoff]);
    const before = await fetchNewsWindow("?window=recent", new Date("2026-10-10T15:59:59.999Z"));
    const after = await fetchNewsWindow("?window=recent", new Date("2026-10-10T16:00:00.000Z"));

    expect(before.body.window.startAt).toBe("2026-07-12T16:00:00.000Z");
    expect(before.body.items.map((item) => item.publishedAt)).toEqual([atCutoff, beforeCutoff]);
    expect(after.body.window.startAt).toBe("2026-07-13T16:00:00.000Z");
    expect(after.body.items.map((item) => item.publishedAt)).toEqual([atCutoff]);
  });

  it("keeps the public 40-item limit for recent and the missing-window API default at day", async () => {
    const dates = Array.from({ length: 41 }, (_item, index) => new Date(Date.parse("2026-09-22T00:00:00.000Z") + index * 60_000).toISOString());
    await seedVerifiedDates(dates);
    const now = new Date("2026-10-11T00:00:00.000Z");
    const recent = await fetchNewsWindow("?window=recent", now);
    const missing = await fetchNewsWindow("", now);

    expect(recent.body.items.map((item) => item.publishedAt)).toEqual([...dates].reverse().slice(0, 40));
    expect(missing.body.window).toEqual({ key: "day", startAt: "2026-10-10T16:00:00.000Z" });
    expect(missing.body.items).toEqual([]);
  });

  it("rejects unsupported window and topic values", async () => {
    const app = createApp({ now: () => fixedNow });
    for (const query of ["window=year", "window=recently", "window=day&topic=politics", "window=recent&topic=politics"]) {
      const ctx = createExecutionContext();
      const response = await app.fetch(
        new Request(`https://api.example.test/api/news?${query}`),
        env as unknown as AppEnv,
        ctx,
      );
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(400);
    }
  });

  it("publishes a robots exception only for the read-only news endpoint", async () => {
    const app = createApp({ now: () => fixedNow });
    const ctx = createExecutionContext();
    const response = await app.fetch(
      new Request("https://api.example.test/robots.txt"),
      env as unknown as AppEnv,
      ctx,
    );
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("User-agent: *\nAllow: /api/news\nDisallow: /\n");
  });
});

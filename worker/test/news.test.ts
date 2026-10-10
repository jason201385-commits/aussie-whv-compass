import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, type AppEnv } from "../src/index";
import { articleTitleMatch, classifyNews, parseOfficialFeed, syncOfficialNews } from "../src/news";
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

  it("rejects unsupported window and topic values", async () => {
    const app = createApp({ now: () => fixedNow });
    for (const query of ["window=year", "window=day&topic=politics"]) {
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

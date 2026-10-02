import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
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
    expect(relevant.keywords).toContain("工作");
    expect(relevant.keywords).toContain("Scamwatch");
    expect(relevant.keywords.length).toBeLessThanOrEqual(5);
    expect(irrelevant).toEqual({ relevant: false, primaryTopic: "general", keywords: [] });
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
});

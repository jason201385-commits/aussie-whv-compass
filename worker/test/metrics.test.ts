import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";
import worker, { type AppEnv } from "../src/index";
import { recordAggregateMetric, type MetricsEnvironment } from "../src/metrics";
import type { RateLimitBinding } from "../src/rate-limit";
import type { MetricKey } from "../src/repository";

function metricsEnvironment(keys: string[]): MetricsEnvironment {
  const limiter: RateLimitBinding = {
    async limit({ key }) {
      keys.push(key);
      return { success: true };
    },
  };
  return { DB: env.DB, DPLUS_RATE_LIMITER: limiter };
}

function metricRequest(
  body: unknown,
  suffix = "",
  extraHeaders: Record<string, string> = {},
): Request {
  return new Request(`https://api.example.test/api/metrics${suffix}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  });
}

describe("D+ aggregate metrics", () => {
  it("does not create application request logs for the aggregate route", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const ctx = createExecutionContext();
      const response = await worker.fetch(
        new Request("https://api.example.test/api/metrics", {
          method: "POST",
          headers: {
            Origin: "https://www.aussiewhvcompass.com",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ metricKey: "route_opened" }),
        }),
        env as unknown as AppEnv,
        ctx,
      );
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(202);
      expect(consoleLog).not.toHaveBeenCalled();
    } finally {
      consoleLog.mockRestore();
    }
  });

  it("increments only a fixed key under the server-derived Perth date", async () => {
    const limiterKeys: string[] = [];
    const appEnv = metricsEnvironment(limiterKeys);
    const now = new Date("2026-08-29T16:30:00.000Z");

    const first = await recordAggregateMetric(
      metricRequest(
        { metricKey: "task_find_route_success_30s" },
        "",
        {
          "User-Agent": "must-not-store",
          Referer: "https://example.test/private?query=secret",
          "CF-Connecting-IP": "203.0.113.7",
        },
      ),
      appEnv,
      now,
    );
    const second = await recordAggregateMetric(
      metricRequest({ metricKey: "task_find_route_success_30s" }),
      appEnv,
      now,
    );

    expect(first.status).toBe(202);
    await expect(first.json()).resolves.toEqual({
      ok: true,
      accepted: true,
      metricDate: "2026-08-30",
      metricKey: "task_find_route_success_30s",
    });
    expect(second.status).toBe(202);
    expect(limiterKeys).toEqual([
      "dplus:task_find_route_success_30s",
      "dplus:task_find_route_success_30s",
    ]);

    const stored = await env.DB.prepare(
      "SELECT metric_date, metric_key, counter_value FROM daily_counters WHERE metric_date = ? AND metric_key = ?",
    )
      .bind("2026-08-30", "task_find_route_success_30s")
      .first<Record<string, string | number>>();
    expect(stored).toEqual({
      metric_date: "2026-08-30",
      metric_key: "task_find_route_success_30s",
      counter_value: 2,
    });

    const columns = await env.DB.prepare("PRAGMA table_info(daily_counters)").all<{ name: string }>();
    expect(columns.results.map((column) => column.name)).toEqual([
      "metric_date",
      "metric_key",
      "counter_value",
      "updated_at",
    ]);
  });

  it("rejects query strings, extra fields and unknown metric keys", async () => {
    const appEnv = metricsEnvironment([]);
    await expect(
      recordAggregateMetric(
        metricRequest({ metricKey: "route_opened" }, "?page=housing"),
        appEnv,
      ),
    ).rejects.toMatchObject({ status: 400, code: "metric_query_forbidden" });
    await expect(
      recordAggregateMetric(
        metricRequest({ metricKey: "route_opened", clientId: "forbidden" }),
        appEnv,
      ),
    ).rejects.toMatchObject({ status: 400, code: "metric_fields_invalid" });
    await expect(
      recordAggregateMetric(metricRequest({ metricKey: "free_text" }), appEnv),
    ).rejects.toMatchObject({ status: 400, code: "metric_not_allowed" });
  });
});

describe("D+ aggregate metrics origin gate", () => {
  async function dispatchMetric(
    metricKey: MetricKey,
    headers: Record<string, string>,
  ): Promise<{ response: Response; logCalls: number }> {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const ctx = createExecutionContext();
      const response = await worker.fetch(
        metricRequest({ metricKey }, "", headers),
        env as unknown as AppEnv,
        ctx,
      );
      await waitOnExecutionContext(ctx);
      return { response, logCalls: consoleLog.mock.calls.length };
    } finally {
      consoleLog.mockRestore();
    }
  }

  async function storedCounter(metricKey: MetricKey): Promise<number | null> {
    const row = await env.DB.prepare(
      "SELECT counter_value FROM daily_counters WHERE metric_key = ?",
    )
      .bind(metricKey)
      .first<{ counter_value: number }>();
    return row?.counter_value ?? null;
  }

  it("accepts a POST from an allowed origin and echoes it in the CORS headers", async () => {
    const { response, logCalls } = await dispatchMetric("task_evidence_understood", {
      Origin: "https://aussiewhvcompass.com",
    });

    expect(response.status).toBe(202);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://aussiewhvcompass.com",
    );
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      accepted: true,
      metricKey: "task_evidence_understood",
    });
    expect(logCalls).toBe(0);
    await expect(storedCounter("task_evidence_understood")).resolves.toBe(1);
  });

  it("rejects a POST without an Origin header before touching the counter", async () => {
    const { response, logCalls } = await dispatchMetric("official_source_opened", {});

    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code: "origin_not_allowed", message: "這個來源不允許呼叫本站 API。" },
    });
    expect(logCalls).toBe(0);
    await expect(storedCounter("official_source_opened")).resolves.toBeNull();
  });

  it("rejects a POST from an origin outside the allow-list", async () => {
    const { response, logCalls } = await dispatchMetric("official_source_opened", {
      Origin: "https://attacker.example",
    });

    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code: "origin_not_allowed", message: "這個來源不允許呼叫本站 API。" },
    });
    expect(logCalls).toBe(0);
    await expect(storedCounter("official_source_opened")).resolves.toBeNull();
  });
});

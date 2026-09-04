import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker, { type AppEnv } from "../src/index";

async function dispatch(
  request: Request,
  overrides: Partial<AppEnv> = {},
): Promise<Response> {
  const ctx = createExecutionContext();
  const testEnv = { ...(env as unknown as AppEnv), ...overrides };
  const response = await worker.fetch(request, testEnv, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

describe("Worker HTTP boundary", () => {
  it("serves a no-store health response to an allowed origin", async () => {
    const response = await dispatch(
      new Request("https://api.example.test/api/health", {
        headers: { Origin: "https://www.aussiewhvcompass.com" },
      }),
    );
    const body = await response.json<Record<string, unknown>>();

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://www.aussiewhvcompass.com",
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({ ok: true, deploymentState: "local-scaffold" });
  });

  // health must not keep reporting the scaffold state once it runs in production.
  it("reports the live deployment state when ENVIRONMENT is production", async () => {
    const response = await dispatch(
      new Request("https://api.example.test/api/health", {
        headers: { Origin: "https://www.aussiewhvcompass.com" },
      }),
      { ENVIRONMENT: "production" },
    );
    const body = await response.json<Record<string, unknown>>();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      environment: "production",
      deploymentState: "live",
    });
  });

  it("rejects an unknown browser origin without reflecting it", async () => {
    const response = await dispatch(
      new Request("https://api.example.test/api/health", {
        headers: { Origin: "https://attacker.example" },
      }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "origin_not_allowed" },
    });
  });

  it("answers preflight only for a whitelisted origin", async () => {
    const response = await dispatch(
      new Request("https://api.example.test/api/contact", {
        method: "OPTIONS",
        headers: {
          Origin: "http://127.0.0.1:4175",
          "Access-Control-Request-Method": "POST",
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://127.0.0.1:4175",
    );
  });

  it("answers accommodation preflight without exposing provider credentials", async () => {
    const response = await dispatch(
      new Request("https://api.example.test/api/accommodation/search", {
        method: "OPTIONS",
        headers: {
          Origin: "https://www.aussiewhvcompass.com",
          "Access-Control-Request-Method": "POST",
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://www.aussiewhvcompass.com",
    );
    expect(await response.text()).toBe("");
  });
});

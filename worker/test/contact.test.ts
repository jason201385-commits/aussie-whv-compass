import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { createApp, type AppEnv } from "../src/index";
import { MockMailTransport } from "../src/mail";
import type { RateLimitBinding } from "../src/rate-limit";
import type { FetchTransport } from "../src/turnstile";

const fixedNow = new Date("2026-08-30T06:00:00.000Z");
const allowedOrigin = "https://www.aussiewhvcompass.com";

const siteverifyTransport: FetchTransport = async () =>
  Response.json({
    success: true,
    hostname: "www.aussiewhvcompass.com",
    action: "turnstile-spin-v2",
  });

function createTestEnvironment(keys: string[]): AppEnv {
  const rateLimiter: RateLimitBinding = {
    async limit({ key }) {
      keys.push(key);
      return { success: true };
    },
  };
  return {
    DB: env.DB,
    CONTACT_RATE_LIMITER: rateLimiter as RateLimit,
    DPLUS_RATE_LIMITER: rateLimiter as RateLimit,
    ENVIRONMENT: "local",
    ALLOWED_ORIGINS:
      "https://www.aussiewhvcompass.com,https://aussiewhvcompass.com,http://127.0.0.1:4175,http://localhost:4175",
    TURNSTILE_EXPECTED_HOSTNAME: "www.aussiewhvcompass.com",
    TURNSTILE_EXPECTED_ACTION: "turnstile-spin-v2",
    TURNSTILE_SECRET_KEY: "local-turnstile-test-secret",
    RATE_LIMIT_HMAC_KEY: "0123456789abcdef0123456789abcdef",
  };
}

function contactPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: "Traveller@Example.com",
    requestType: "website-digital-tool",
    description: "目前流程太複雜，希望整理成容易理解的網站工具。",
    contactName: "Alex",
    organization: null,
    timeline: "not-urgent",
    budgetRange: "not-sure",
    locale: "zh-Hant",
    turnstileToken: "single-use-test-token",
    boundaryAccepted: true,
    ...overrides,
  };
}

async function dispatch(
  app: ReturnType<typeof createApp>,
  appEnv: AppEnv,
  path: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const ctx = createExecutionContext();
  const response = await app.fetch(
    new Request(`https://api.example.test${path}`, {
      method: "POST",
      headers: { Origin: allowedOrigin, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    appEnv,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return response;
}

function managementCredentials(managementUrl: string): {
  caseId: string;
  managementToken: string;
} {
  const fragment = new URL(managementUrl).hash;
  const query = fragment.slice(fragment.indexOf("?") + 1);
  const params = new URLSearchParams(query);
  return {
    caseId: params.get("case") ?? "",
    managementToken: params.get("token") ?? "",
  };
}

describe("contact and CRM lifecycle", () => {
  it("creates, confirms, views, corrects and permanently deletes one case", async () => {
    const rateLimitKeys: string[] = [];
    const appEnv = createTestEnvironment(rateLimitKeys);
    const mail = new MockMailTransport();
    const app = createApp({
      turnstileTransport: siteverifyTransport,
      mailTransport: mail,
      now: () => fixedNow,
    });

    const createResponse = await dispatch(app, appEnv, "/api/contact", contactPayload());
    const created = await createResponse.json<Record<string, unknown>>();

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.get("Access-Control-Allow-Origin")).toBe(allowedOrigin);
    expect(created).toMatchObject({
      ok: true,
      receivedAt: fixedNow.toISOString(),
      emailStatus: "sent",
      replyExpectation: "3-5-business-days",
      contractState: "request-received-not-engagement",
    });
    expect(created).not.toHaveProperty("email");
    expect(created).not.toHaveProperty("description");

    const credentials = managementCredentials(created.managementUrl as string);
    expect(credentials.caseId).toMatch(/^WHV-[0-9A-F]{32}$/);
    expect(credentials.managementToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(mail.messages).toHaveLength(1);
    expect(mail.messages[0]).toMatchObject({
      caseId: credentials.caseId,
      to: "Traveller@Example.com",
      description: "目前流程太複雜，希望整理成容易理解的網站工具。",
    });

    const tokenRow = await env.DB.prepare(
      "SELECT token_hash FROM contact_access_tokens WHERE case_id = ?",
    )
      .bind(credentials.caseId)
      .first<{ token_hash: string }>();
    expect(tokenRow?.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenRow?.token_hash).not.toBe(credentials.managementToken);

    const viewResponse = await dispatch(app, appEnv, "/api/contact/manage", {
      ...credentials,
      turnstileToken: "view-token",
    });
    await expect(viewResponse.json()).resolves.toMatchObject({
      ok: true,
      case: {
        caseId: credentials.caseId,
        email: "Traveller@Example.com",
        status: "received",
      },
    });

    const updatedDescription = "更正：希望先做資訊架構，再評估開發。";
    const updateResponse = await dispatch(
      app,
      appEnv,
      "/api/contact/update",
      contactPayload({
        ...credentials,
        turnstileToken: "update-token",
        description: updatedDescription,
      }),
    );
    expect(updateResponse.status).toBe(200);
    await expect(updateResponse.json()).resolves.toMatchObject({
      ok: true,
      caseId: credentials.caseId,
      updatedAt: fixedNow.toISOString(),
    });

    const corrected = await env.DB.prepare(
      "SELECT description FROM contact_cases WHERE case_id = ?",
    )
      .bind(credentials.caseId)
      .first<{ description: string }>();
    expect(corrected?.description).toBe(updatedDescription);

    const deleteResponse = await dispatch(app, appEnv, "/api/contact/delete", {
      ...credentials,
      turnstileToken: "delete-token",
    });
    expect(deleteResponse.status).toBe(200);
    await expect(deleteResponse.json()).resolves.toMatchObject({
      ok: true,
      caseId: credentials.caseId,
      status: "deleted",
    });
    await expect(
      env.DB.prepare("SELECT COUNT(*) AS count FROM contact_cases WHERE case_id = ?")
        .bind(credentials.caseId)
        .first<{ count: number }>("count"),
    ).resolves.toBe(0);

    expect(rateLimitKeys).toHaveLength(4);
    for (const key of rateLimitKeys) {
      expect(key).toMatch(/^contact:[0-9a-f]{64}$/);
      expect(key).not.toContain("Traveller");
      expect(key).not.toContain(credentials.caseId);
    }
  });

  it("keeps the case accepted but marks mail for retry when transport is disabled", async () => {
    const appEnv = createTestEnvironment([]);
    const app = createApp({ turnstileTransport: siteverifyTransport, now: () => fixedNow });
    const response = await dispatch(
      app,
      appEnv,
      "/api/contact",
      contactPayload({ email: "queued@example.com" }),
    );
    const body = await response.json<Record<string, unknown>>();

    expect(response.status).toBe(201);
    expect(body.emailStatus).toBe("queued");
    const credentials = managementCredentials(body.managementUrl as string);
    const outbox = await env.DB.prepare(
      "SELECT status, last_error_code FROM contact_mail_outbox WHERE case_id = ?",
    )
      .bind(credentials.caseId)
      .first<Record<string, string>>();
    expect(outbox).toEqual({ status: "retry", last_error_code: "transport_unavailable" });
  });

  it("rejects invalid request types before storing anything", async () => {
    const appEnv = createTestEnvironment([]);
    const app = createApp({ turnstileTransport: siteverifyTransport, now: () => fixedNow });
    const response = await dispatch(
      app,
      appEnv,
      "/api/contact",
      contactPayload({ requestType: "visa-agent" }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "request_type_invalid" },
    });
  });
});

import { describe, expect, it } from "vitest";
import { readBoundedJson } from "../src/body";
import { HttpError } from "../src/http";
import { createRateLimitKey, enforceRateLimit, type RateLimitBinding } from "../src/rate-limit";
import { verifyTurnstile, type FetchTransport } from "../src/turnstile";

const expectations = {
  secret: "local-test-secret",
  hostname: "www.aussiewhvcompass.com",
  action: "turnstile-spin-v2",
};

describe("bounded JSON input", () => {
  it("parses a JSON body within the byte limit", async () => {
    const request = new Request("https://api.example.test/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "需要網站合作" }),
    });
    await expect(readBoundedJson(request, 256)).resolves.toEqual({
      description: "需要網站合作",
    });
  });

  it("rejects a streamed body that exceeds the byte limit", async () => {
    const request = new Request("https://api.example.test/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "x".repeat(300) }),
    });
    await expect(readBoundedJson(request, 64)).rejects.toMatchObject({
      status: 413,
      code: "body_too_large",
    });
  });
});

describe("Turnstile server-side validation", () => {
  it("uses Siteverify and accepts only the expected hostname and action", async () => {
    let submittedBody = "";
    const transport: FetchTransport = async (_input, init) => {
      submittedBody = String(init?.body ?? "");
      return Response.json({
        success: true,
        hostname: expectations.hostname,
        action: expectations.action,
      });
    };

    const result = await verifyTurnstile("single-use-token", expectations, transport);
    const form = new URLSearchParams(submittedBody);

    expect(result.success).toBe(true);
    expect(form.get("secret")).toBe(expectations.secret);
    expect(form.get("response")).toBe("single-use-token");
    expect(form.get("idempotency_key")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rejects a success response issued for another hostname", async () => {
    const transport: FetchTransport = async () =>
      Response.json({
        success: true,
        hostname: "lookalike.example",
        action: expectations.action,
      });

    await expect(
      verifyTurnstile("single-use-token", expectations, transport),
    ).rejects.toMatchObject({ status: 400, code: "turnstile_failed" });
  });

  it("never calls Siteverify for an overlong token", async () => {
    let called = false;
    const transport: FetchTransport = async () => {
      called = true;
      return Response.json({ success: true });
    };

    await expect(
      verifyTurnstile("x".repeat(2049), expectations, transport),
    ).rejects.toBeInstanceOf(HttpError);
    expect(called).toBe(false);
  });
});

describe("privacy-preserving rate limit", () => {
  it("uses a deterministic HMAC key that does not contain the email", async () => {
    const key = await createRateLimitKey(
      "traveller@example.com",
      "0123456789abcdef0123456789abcdef",
    );
    expect(key).toMatch(/^contact:[0-9a-f]{64}$/);
    expect(key).not.toContain("traveller");
    expect(key).not.toContain("example.com");
  });

  it("turns a denied binding result into HTTP 429", async () => {
    const binding: RateLimitBinding = {
      limit: async () => ({ success: false }),
    };
    await expect(enforceRateLimit(binding, "contact:opaque")).rejects.toMatchObject({
      status: 429,
      code: "rate_limited",
    });
  });
});

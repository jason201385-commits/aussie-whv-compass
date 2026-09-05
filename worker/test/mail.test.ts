import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMailTransportFromEnv,
  DisabledMailTransport,
  MockMailTransport,
  ResendMailTransport,
} from "../src/mail";

const sampleMessage = {
  caseId: "case-local-test",
  to: "traveller@example.com",
  locale: "zh-Hant",
  submittedAt: "2026-08-30T00:00:00.000Z",
  requestType: "website-digital-tool",
  description: "需要網站工具",
  managementUrl: "https://www.aussiewhvcompass.com/about.html#contact-management?case=test",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("replaceable mail transport", () => {
  it("records a deterministic receipt in the mock without external delivery", async () => {
    const transport = new MockMailTransport();

    await expect(transport.sendContactReceipt(sampleMessage)).resolves.toEqual({
      accepted: true,
      transportId: "mock-1",
    });
    expect(transport.messages).toEqual([sampleMessage]);
  });

  it("fails closed when no production transport is configured", async () => {
    const transport = new DisabledMailTransport();
    await expect(transport.sendContactReceipt(sampleMessage)).rejects.toThrow(
      "mail_transport_not_configured",
    );
  });

  it("createMailTransportFromEnv returns Disabled when RESEND_API_KEY is blank", () => {
    const transport = createMailTransportFromEnv({ RESEND_API_KEY: "  " });
    expect(transport).toBeInstanceOf(DisabledMailTransport);
  });

  it("createMailTransportFromEnv returns Resend when API key is present", () => {
    const transport = createMailTransportFromEnv({
      RESEND_API_KEY: "re_test_key",
      MAIL_FROM: "noreply@aussiewhvcompass.com",
    });
    expect(transport).toBeInstanceOf(ResendMailTransport);
  });
});

describe("ResendMailTransport", () => {
  it("posts a zh-Hant receipt to Resend and returns the email id", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(init?.method).toBe("POST");
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer re_test_key",
        "Content-Type": "application/json",
      });
      expect(body.from).toBe("noreply@aussiewhvcompass.com");
      expect(body.to).toEqual(["traveller@example.com"]);
      expect(body.subject).toContain("已收到您的需求");
      expect(body.html).toContain("case-local-test");
      expect(body.html).toContain(sampleMessage.managementUrl);
      expect(body.text).toContain("案件編號：case-local-test");
      return new Response(JSON.stringify({ id: "re_email_123" }), { status: 200 });
    });

    const transport = new ResendMailTransport({
      apiKey: "re_test_key",
      from: "noreply@aussiewhvcompass.com",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(transport.sendContactReceipt(sampleMessage)).resolves.toEqual({
      accepted: true,
      transportId: "re_email_123",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://api.resend.com/emails");
  });

  it("uses an English receipt when locale starts with en", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ id: "re_email_en" }), { status: 200 });
    });

    const transport = new ResendMailTransport({
      apiKey: "re_test_key",
      from: "noreply@aussiewhvcompass.com",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await transport.sendContactReceipt({ ...sampleMessage, locale: "en-AU" });
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.subject).toContain("request received");
    expect(body.html).toContain("Case ID");
    expect(body.text).toContain("Manage or delete your request");
  });

  it("also sends an owner notify without the management token when CONTACT_NOTIFY_TO is set", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ id: `re_email_${fetchMock.mock.calls.length}` }), {
        status: 200,
      });
    });

    const transport = new ResendMailTransport({
      apiKey: "re_test_key",
      from: "noreply@aussiewhvcompass.com",
      notifyTo: "owner@example.com",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await transport.sendContactReceipt(sampleMessage);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const notifyBody = JSON.parse(String((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body));
    expect(notifyBody.to).toEqual(["owner@example.com"]);
    expect(notifyBody.reply_to).toEqual(["traveller@example.com"]);
    expect(notifyBody.html).toContain("case-local-test");
    expect(notifyBody.html).toContain("website-digital-tool");
    expect(JSON.stringify(notifyBody)).not.toContain(sampleMessage.managementUrl);
  });

  it("fails closed when Resend returns a non-OK response", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ name: "validation_error", message: "nope" }), {
        status: 422,
      });
    });

    const transport = new ResendMailTransport({
      apiKey: "re_test_key",
      from: "noreply@aussiewhvcompass.com",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(transport.sendContactReceipt(sampleMessage)).rejects.toThrow("resend_send_failed");
  });

  it("fails closed when the constructor receives an empty API key", () => {
    expect(
      () =>
        new ResendMailTransport({
          apiKey: "   ",
          from: "noreply@aussiewhvcompass.com",
        }),
    ).toThrow("mail_transport_not_configured");
  });
});
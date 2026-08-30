import { describe, expect, it } from "vitest";
import { DisabledMailTransport, MockMailTransport } from "../src/mail";

describe("replaceable mail transport", () => {
  it("records a deterministic receipt in the mock without external delivery", async () => {
    const transport = new MockMailTransport();
    const message = {
      caseId: "case-local-test",
      to: "traveller@example.com",
      locale: "zh-Hant",
      submittedAt: "2026-08-30T00:00:00.000Z",
    };

    await expect(transport.sendContactReceipt(message)).resolves.toEqual({
      accepted: true,
      transportId: "mock-1",
    });
    expect(transport.messages).toEqual([message]);
  });

  it("fails closed when no production transport is configured", async () => {
    const transport = new DisabledMailTransport();
    await expect(
      transport.sendContactReceipt({
        caseId: "case-local-test",
        to: "traveller@example.com",
        locale: "zh-Hant",
        submittedAt: "2026-08-30T00:00:00.000Z",
      }),
    ).rejects.toThrow("mail_transport_not_configured");
  });
});

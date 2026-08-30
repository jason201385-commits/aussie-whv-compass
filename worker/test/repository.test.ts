import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import {
  enqueueContactReceipt,
  incrementDailyCounter,
  insertContactCase,
  purgeExpiredContactCases,
} from "../src/repository";

describe("D1 prepared-statement repositories", () => {
  it("stores a case and outbox row without duplicating email in the outbox", async () => {
    const now = "2026-08-30T00:00:00.000Z";
    await insertContactCase(env.DB, {
      caseId: "case-local-test",
      email: "Traveller@Example.com",
      emailNormalized: "traveller@example.com",
      requestType: "website-digital-tool",
      description: "需要一個網站工具",
      contactName: null,
      organization: null,
      timeline: "not-urgent",
      budgetRange: null,
      locale: "zh-Hant",
      createdAt: now,
      deleteAfter: "2028-08-30T00:00:00.000Z",
    });
    await enqueueContactReceipt(env.DB, "outbox-local-test", "case-local-test", now);

    const storedCase = await env.DB.prepare(
      "SELECT case_id, email_normalized, status FROM contact_cases WHERE case_id = ?",
    )
      .bind("case-local-test")
      .first<Record<string, string>>();
    const outboxColumns = await env.DB.prepare("PRAGMA table_info(contact_mail_outbox)")
      .all<{ name: string }>();

    expect(storedCase).toEqual({
      case_id: "case-local-test",
      email_normalized: "traveller@example.com",
      status: "received",
    });
    expect(outboxColumns.results.map((column) => column.name)).not.toContain("email");
  });

  it("increments only a whitelisted aggregate counter", async () => {
    const now = "2026-08-30T00:00:00.000Z";
    await expect(
      incrementDailyCounter(env.DB, "2026-08-30", "route_opened", now),
    ).resolves.toBe(1);
    await expect(
      incrementDailyCounter(env.DB, "2026-08-30", "route_opened", now),
    ).resolves.toBe(2);
    await expect(
      incrementDailyCounter(env.DB, "2026-08-30", "free_text", now),
    ).rejects.toMatchObject({ status: 400, code: "metric_not_allowed" });
  });

  it("purges cases only after their retention deadline", async () => {
    const createdAt = "2024-08-30T00:00:00.000Z";
    await insertContactCase(env.DB, {
      caseId: "case-expired-test",
      email: "expired@example.com",
      emailNormalized: "expired@example.com",
      requestType: "other-collaboration",
      description: "expired test",
      contactName: null,
      organization: null,
      timeline: null,
      budgetRange: null,
      locale: "zh-Hant",
      createdAt,
      deleteAfter: "2026-08-29T00:00:00.000Z",
    });

    await expect(purgeExpiredContactCases(env.DB, "2026-08-30T00:00:00.000Z")).resolves.toBe(1);
    await expect(
      env.DB.prepare("SELECT COUNT(*) AS count FROM contact_cases WHERE case_id = ?")
        .bind("case-expired-test")
        .first<number>("count"),
    ).resolves.toBe(0);
  });
});

import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  AccommodationSearchInput,
  LicensedAccommodationProvider,
} from "../src/accommodation";
import { createApp, type AppEnv } from "../src/index";

const validBody = {
  location: "Perth WA 6000",
  checkin: "2026-09-12",
  stayLength: 14,
  guests: 2,
};

const validDisplayAuthorization = {
  siteOrigin: "https://www.aussiewhvcompass.com" as const,
  evidenceRef: "booking-display-approval-2026",
  approvedPurpose: "Display authorised Booking.com results grouped by provider without cross-platform price ranking.",
  reviewedAt: "2026-08-30",
  validUntil: "2027-08-30",
};

async function dispatch(
  app: ReturnType<typeof createApp>,
  body: unknown,
  suffix = "",
): Promise<Response> {
  const ctx = createExecutionContext();
  const response = await app.fetch(
    new Request(`https://api.example.test/api/accommodation/search${suffix}`, {
      method: "POST",
      headers: {
        Origin: "https://www.aussiewhvcompass.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),
    env as unknown as AppEnv,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return response;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("licensed accommodation search", () => {
  it("fails closed to five external-link statuses when no provider is authorised", async () => {
    const response = await dispatch(createApp(), validBody);
    const body = await response.json<{
      ok: boolean;
      coverage: { connectedProviders: number; allMarket: boolean; combinedRanking: boolean };
      providers: Array<{ access: string; state: string }>;
      groups: unknown[];
    }>();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.ok).toBe(true);
    expect(body.coverage).toEqual({
      connectedProviders: 0,
      listedPlatforms: 5,
      allMarket: false,
      combinedRanking: false,
    });
    expect(body.providers).toHaveLength(5);
    expect(body.providers.every((provider) => (
      provider.access === "external-link-only" && provider.state === "not-connected"
    ))).toBe(true);
    expect(body.groups).toEqual([]);
  });

  it("normalises a licensed provider and removes unsafe, duplicate or excess records", async () => {
    let received: AccommodationSearchInput | null = null;
    const listings = Array.from({ length: 10 }, (_value, index) => ({
      name: `Approved stay ${index + 1}`,
      area: "Perth WA 6000",
      priceDisplay: `$${100 + index} total`,
      stayType: "Short stay",
      url: `https://www.booking.com/hotel/au/approved-${index + 1}.html`,
    }));
    const duplicate = listings[0];
    if (duplicate === undefined) throw new Error("test fixture missing");
    listings.splice(1, 0, { ...duplicate });
    listings.splice(2, 0, {
      name: "Wrong host",
      area: "Perth",
      priceDisplay: "$1",
      stayType: "Short stay",
      url: "https://attacker.example/fake",
    });
    const provider: LicensedAccommodationProvider = {
      id: "booking",
      commercialRelationship: "affiliate",
      displayAuthorization: validDisplayAuthorization,
      async search(input) {
        received = input;
        return { coverageNote: "Booking.com authorised API results only.", listings };
      },
    };

    const response = await dispatch(
      createApp({
        accommodationProviders: [provider],
        accommodationNow: () => new Date("2026-08-31T06:00:00.000Z"),
      }),
      validBody,
    );
    const body = await response.json<{
      checkedAt: string;
      providers: Array<{ id: string; resultCount: number; commercialRelationship: string }>;
      groups: Array<{ provider: string; displayAuthorization: { approvedPurpose: string; reviewedAt: string }; listings: Array<{ url: string }> }>;
    }>();

    expect(received).toEqual(validBody);
    expect(body.checkedAt).toBe("2026-08-31T06:00:00.000Z");
    expect(body.groups).toHaveLength(1);
    expect(body.groups[0]?.provider).toBe("booking");
    expect(body.groups[0]?.displayAuthorization).toMatchObject({
      approvedPurpose: validDisplayAuthorization.approvedPurpose,
      reviewedAt: "2026-08-30",
    });
    expect(body.groups[0]?.listings).toHaveLength(8);
    expect(body.groups[0]?.listings.every((listing) => (
      new URL(listing.url).hostname === "www.booking.com"
    ))).toBe(true);
    expect(body.providers.find((item) => item.id === "booking")).toMatchObject({
      resultCount: 8,
      commercialRelationship: "affiliate",
    });
  });

  it("keeps partial coverage when one authorised provider fails", async () => {
    const failing: LicensedAccommodationProvider = {
      id: "hostelworld",
      commercialRelationship: "none",
      displayAuthorization: {
        ...validDisplayAuthorization,
        evidenceRef: "hostelworld-display-approval-2026",
        approvedPurpose: "Display authorised Hostelworld results for temporary stays.",
      },
      async search() {
        throw new Error("upstream unavailable");
      },
    };
    const empty: LicensedAccommodationProvider = {
      id: "domain",
      commercialRelationship: "none",
      displayAuthorization: {
        ...validDisplayAuthorization,
        evidenceRef: "domain-display-approval-2026",
        approvedPurpose: "Display authorised Domain results for formal rentals.",
      },
      async search() {
        return { coverageNote: "No matching authorised results.", listings: [] };
      },
    };

    const response = await dispatch(createApp({ accommodationProviders: [failing, empty] }), validBody);
    const body = await response.json<{
      providers: Array<{ id: string; state: string }>;
      groups: unknown[];
    }>();

    expect(response.status).toBe(200);
    expect(body.providers.find((item) => item.id === "hostelworld")?.state).toBe("error");
    expect(body.providers.find((item) => item.id === "domain")?.state).toBe("empty");
    expect(body.groups).toEqual([]);
  });

  it("rejects query parameters and unknown JSON fields before calling providers", async () => {
    const providerSearch = vi.fn(async () => ({ coverageNote: "unused", listings: [] }));
    const provider: LicensedAccommodationProvider = {
      id: "booking",
      commercialRelationship: "none",
      displayAuthorization: validDisplayAuthorization,
      search: providerSearch,
    };
    const app = createApp({ accommodationProviders: [provider] });

    const queryResponse = await dispatch(app, validBody, "?location=Perth");
    expect(queryResponse.status).toBe(400);
    await expect(queryResponse.json()).resolves.toMatchObject({
      error: { code: "query_not_allowed" },
    });

    const fieldResponse = await dispatch(app, { ...validBody, trackingId: "no" });
    expect(fieldResponse.status).toBe(400);
    await expect(fieldResponse.json()).resolves.toMatchObject({
      error: { code: "invalid_search_fields" },
    });
    expect(providerSearch).not.toHaveBeenCalled();
  });

  it("does not call providers without active display authorisation", async () => {
    const expiredSearch = vi.fn(async () => ({ coverageNote: "unused", listings: [] }));
    const blockedSearch = vi.fn(async () => ({ coverageNote: "unused", listings: [] }));
    const expired: LicensedAccommodationProvider = {
      id: "booking",
      commercialRelationship: "none",
      displayAuthorization: {
        ...validDisplayAuthorization,
        evidenceRef: "expired-booking-approval",
        validUntil: "2026-08-29",
      },
      search: expiredSearch,
    };
    const structurallyBlocked = {
      id: "realestate",
      commercialRelationship: "none",
      displayAuthorization: validDisplayAuthorization,
      search: blockedSearch,
    } as unknown as LicensedAccommodationProvider;

    const response = await dispatch(createApp({
      accommodationProviders: [expired, structurallyBlocked],
      accommodationNow: () => new Date("2026-09-01T00:00:00.000Z"),
    }), validBody);
    const body = await response.json<{
      coverage: { connectedProviders: number };
      providers: Array<{ id: string; access: string; state: string }>;
    }>();

    expect(response.status).toBe(200);
    expect(body.coverage.connectedProviders).toBe(0);
    expect(expiredSearch).not.toHaveBeenCalled();
    expect(blockedSearch).not.toHaveBeenCalled();
    expect(body.providers.find((item) => item.id === "realestate")).toMatchObject({
      access: "external-link-only",
      state: "not-connected",
    });
  });

  it("does not write the searched location, dates or guests to application logs", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const response = await dispatch(createApp(), {
      ...validBody,
      location: "Private Suburb WA 6999",
    });

    expect(response.status).toBe(200);
    const output = log.mock.calls.flat().join("\n");
    expect(output).toContain("/api/accommodation/search");
    expect(output).not.toContain("Private Suburb");
    expect(output).not.toContain("2026-09-12");
    expect(output).not.toContain('"guests":2');
  });
});

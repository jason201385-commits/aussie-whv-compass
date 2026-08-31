import { readBoundedJson } from "./body";
import { HttpError, jsonResponse } from "./http";
import { enforceRateLimit, type RateLimitBinding } from "./rate-limit";

export const ACCOMMODATION_PROVIDER_IDS = [
  "hostelworld",
  "booking",
  "flatmates",
  "realestate",
  "domain",
] as const;

export type AccommodationProviderId = (typeof ACCOMMODATION_PROVIDER_IDS)[number];
export type CommercialRelationship = "none" | "affiliate" | "paid-placement";

export interface AccommodationSearchInput {
  location: string;
  checkin: string | null;
  stayLength: 7 | 14 | 28;
  guests: 1 | 2 | 3 | 4;
}

export interface LicensedAccommodationProvider {
  id: AccommodationProviderId;
  commercialRelationship: CommercialRelationship;
  search(input: AccommodationSearchInput, signal: AbortSignal): Promise<unknown>;
}

export interface AccommodationDependencies {
  accommodationProviders?: readonly LicensedAccommodationProvider[];
  accommodationNow?: () => Date;
  accommodationProviderTimeoutMs?: number;
}

export interface AccommodationEnv {
  ACCOMMODATION_RATE_LIMITER: RateLimitBinding;
}

interface NormalizedListing {
  name: string;
  area: string;
  priceDisplay: string;
  stayType: string;
  url: string;
}

interface ProviderStatus {
  id: AccommodationProviderId;
  name: string;
  access: "licensed-api" | "external-link-only";
  state: "ok" | "empty" | "error" | "not-connected";
  resultCount: number;
  commercialRelationship: CommercialRelationship;
  coverageNote: string;
}

interface ProviderGroup {
  provider: AccommodationProviderId;
  providerName: string;
  commercialRelationship: CommercialRelationship;
  listings: NormalizedListing[];
}

const PROVIDER_NAMES: Record<AccommodationProviderId, string> = {
  hostelworld: "Hostelworld",
  booking: "Booking.com",
  flatmates: "Flatmates",
  realestate: "realestate.com.au",
  domain: "Domain",
};

const PROVIDER_HOSTS: Record<AccommodationProviderId, readonly string[]> = {
  hostelworld: ["hostelworld.com", "www.hostelworld.com"],
  booking: ["booking.com", "www.booking.com"],
  flatmates: ["flatmates.com.au", "www.flatmates.com.au"],
  realestate: ["realestate.com.au", "www.realestate.com.au"],
  domain: ["domain.com.au", "www.domain.com.au"],
};

const STAY_LENGTHS = new Set([7, 14, 28]);
const GUEST_COUNTS = new Set([1, 2, 3, 4]);
const MAX_PROVIDER_RESULTS = 8;
const MAX_SEARCH_BODY_BYTES = 2 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function normalizedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
}

function validateSearchInput(value: unknown): AccommodationSearchInput {
  if (!isRecord(value) || !hasExactKeys(value, ["location", "checkin", "stayLength", "guests"])) {
    throw new HttpError(400, "invalid_search_fields", "住宿搜尋欄位不完整或包含未支援欄位。");
  }

  const location = normalizedText(value.location, 120);
  if (
    location === null
    || /(?:^[a-z][a-z0-9+.-]*:|:\/\/|^www\.)/i.test(location)
    || !/[A-Za-z]/.test(location)
  ) {
    throw new HttpError(400, "invalid_location", "請提供澳洲 suburb、州別與郵遞區號，不要提供網址。");
  }

  let checkin: string | null = null;
  if (value.checkin !== null) {
    if (typeof value.checkin !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.checkin)) {
      throw new HttpError(400, "invalid_checkin", "入住日期格式必須是 YYYY-MM-DD 或 null。");
    }
    const parsed = new Date(`${value.checkin}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value.checkin) {
      throw new HttpError(400, "invalid_checkin", "入住日期不是有效日期。");
    }
    checkin = value.checkin;
  }

  if (typeof value.stayLength !== "number" || !STAY_LENGTHS.has(value.stayLength)) {
    throw new HttpError(400, "invalid_stay_length", "住宿晚數只接受 7、14 或 28 晚。");
  }
  if (typeof value.guests !== "number" || !GUEST_COUNTS.has(value.guests)) {
    throw new HttpError(400, "invalid_guests", "人數只接受 1 到 4 人。");
  }

  return {
    location,
    checkin,
    stayLength: value.stayLength as 7 | 14 | 28,
    guests: value.guests as 1 | 2 | 3 | 4,
  };
}

function normalizeProviderUrl(provider: AccommodationProviderId, value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || !PROVIDER_HOSTS[provider].includes(url.hostname.toLowerCase())
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeListing(provider: AccommodationProviderId, value: unknown): NormalizedListing | null {
  if (!isRecord(value)) return null;
  const name = normalizedText(value.name, 160);
  const area = normalizedText(value.area, 120);
  const priceDisplay = normalizedText(value.priceDisplay, 80);
  const stayType = normalizedText(value.stayType, 80);
  const url = normalizeProviderUrl(provider, value.url);
  if (name === null || area === null || priceDisplay === null || stayType === null || url === null) return null;
  return { name, area, priceDisplay, stayType, url };
}

function normalizeProviderPayload(
  provider: AccommodationProviderId,
  value: unknown,
): { listings: NormalizedListing[]; coverageNote: string } {
  if (!isRecord(value) || !Array.isArray(value.listings)) {
    throw new Error("invalid_provider_payload");
  }
  const coverageNote = normalizedText(value.coverageNote, 240);
  if (coverageNote === null) throw new Error("invalid_provider_coverage");

  const seenUrls = new Set<string>();
  const listings: NormalizedListing[] = [];
  for (const candidate of value.listings) {
    const listing = normalizeListing(provider, candidate);
    if (listing === null || seenUrls.has(listing.url)) continue;
    seenUrls.add(listing.url);
    listings.push(listing);
    if (listings.length >= MAX_PROVIDER_RESULTS) break;
  }
  return { listings, coverageNote };
}

async function runProvider(
  provider: LicensedAccommodationProvider,
  input: AccommodationSearchInput,
  timeoutMs: number,
): Promise<{ status: ProviderStatus; group: ProviderGroup | null }> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error("provider_timeout"));
    }, timeoutMs);
  });

  try {
    const raw = await Promise.race([provider.search(input, controller.signal), timeout]);
    const normalized = normalizeProviderPayload(provider.id, raw);
    return {
      status: {
        id: provider.id,
        name: PROVIDER_NAMES[provider.id],
        access: "licensed-api",
        state: normalized.listings.length > 0 ? "ok" : "empty",
        resultCount: normalized.listings.length,
        commercialRelationship: provider.commercialRelationship,
        coverageNote: normalized.coverageNote,
      },
      group: normalized.listings.length > 0
        ? {
            provider: provider.id,
            providerName: PROVIDER_NAMES[provider.id],
            commercialRelationship: provider.commercialRelationship,
            listings: normalized.listings,
          }
        : null,
    };
  } catch {
    return {
      status: {
        id: provider.id,
        name: PROVIDER_NAMES[provider.id],
        access: "licensed-api",
        state: "error",
        resultCount: 0,
        commercialRelationship: provider.commercialRelationship,
        coverageNote: "這個平台本次沒有回傳可驗證結果；請改用平台原始入口。",
      },
      group: null,
    };
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

function notConnectedStatus(id: AccommodationProviderId): ProviderStatus {
  return {
    id,
    name: PROVIDER_NAMES[id],
    access: "external-link-only",
    state: "not-connected",
    resultCount: 0,
    commercialRelationship: "none",
    coverageNote: "尚未取得可在本站顯示房源的正式授權；只提供平台原始入口。",
  };
}

export async function searchLicensedAccommodation(
  request: Request,
  env: AccommodationEnv,
  dependencies: AccommodationDependencies = {},
): Promise<Response> {
  if (new URL(request.url).search) {
    throw new HttpError(400, "query_not_allowed", "住宿搜尋不接受網址 query 參數。");
  }
  const input = validateSearchInput(await readBoundedJson(request, MAX_SEARCH_BODY_BYTES));
  await enforceRateLimit(env.ACCOMMODATION_RATE_LIMITER, "accommodation:public-search");

  const configured = new Map<AccommodationProviderId, LicensedAccommodationProvider>();
  for (const provider of dependencies.accommodationProviders ?? []) {
    if (!ACCOMMODATION_PROVIDER_IDS.includes(provider.id) || configured.has(provider.id)) continue;
    configured.set(provider.id, provider);
  }

  const timeoutMs = Math.min(
    8_000,
    Math.max(500, dependencies.accommodationProviderTimeoutMs ?? 4_000),
  );
  const outcomes = await Promise.all(
    ACCOMMODATION_PROVIDER_IDS.map(async (id) => {
      const provider = configured.get(id);
      return provider ? runProvider(provider, input, timeoutMs) : { status: notConnectedStatus(id), group: null };
    }),
  );

  const providers = outcomes.map((outcome) => outcome.status);
  const groups = outcomes
    .map((outcome) => outcome.group)
    .filter((group): group is ProviderGroup => group !== null);
  const checkedAt = (dependencies.accommodationNow ?? (() => new Date()))().toISOString();

  return jsonResponse({
    ok: true,
    mode: "licensed-api-plus-external-links",
    checkedAt,
    coverage: {
      connectedProviders: configured.size,
      listedPlatforms: ACCOMMODATION_PROVIDER_IDS.length,
      allMarket: false,
      combinedRanking: false,
    },
    providers,
    groups,
    notice: "只顯示已授權平台本次回傳的部分結果；沒有跨平台最便宜、最完整或全市場排序。",
  });
}

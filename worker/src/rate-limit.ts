import { HttpError } from "./http";

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createRateLimitKey(
  normalizedEmail: string,
  secret: string,
): Promise<string> {
  if (secret.length < 32) {
    throw new HttpError(503, "rate_limit_not_configured", "表單安全設定尚未完成。");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(normalizedEmail),
  );
  return `contact:${toHex(signature)}`;
}

export async function enforceRateLimit(
  binding: RateLimitBinding,
  key: string,
): Promise<void> {
  const result = await binding.limit({ key });
  if (!result.success) {
    throw new HttpError(429, "rate_limited", "送出次數過多，請稍後再試。");
  }
}

import { HttpError } from "./http";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2048;
const MAX_RESPONSE_BYTES = 8 * 1024;

interface TurnstileResponse {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
}

export interface TurnstileExpectations {
  secret: string;
  hostname: string;
  action: string;
}

export interface TurnstileVerification {
  success: true;
  hostname: string;
  action: string;
}

export type FetchTransport = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export async function verifyTurnstile(
  token: string,
  expectations: TurnstileExpectations,
  transport: FetchTransport = fetch,
  remoteIp?: string,
): Promise<TurnstileVerification> {
  if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    throw new HttpError(400, "turnstile_token_invalid", "驗證資訊不完整，請重新操作。");
  }
  if (expectations.secret.length === 0) {
    throw new HttpError(503, "turnstile_not_configured", "表單驗證尚未完成設定。");
  }

  const form = new URLSearchParams({
    secret: expectations.secret,
    response: token,
    idempotency_key: crypto.randomUUID(),
  });
  if (remoteIp) form.set("remoteip", remoteIp);

  let response: Response;
  try {
    response = await transport(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new HttpError(503, "turnstile_unavailable", "驗證服務暫時無法使用，請稍後再試。");
  }

  const responseText = await response.text();
  if (!response.ok || new TextEncoder().encode(responseText).byteLength > MAX_RESPONSE_BYTES) {
    throw new HttpError(503, "turnstile_unavailable", "驗證服務暫時無法使用，請稍後再試。");
  }

  let result: TurnstileResponse;
  try {
    result = JSON.parse(responseText) as TurnstileResponse;
  } catch {
    throw new HttpError(503, "turnstile_unavailable", "驗證服務回應無法辨識。");
  }

  if (
    result.success !== true ||
    result.hostname !== expectations.hostname ||
    result.action !== expectations.action
  ) {
    throw new HttpError(400, "turnstile_failed", "驗證失敗或已逾時，請重新操作。");
  }

  return {
    success: true,
    hostname: result.hostname,
    action: result.action,
  };
}

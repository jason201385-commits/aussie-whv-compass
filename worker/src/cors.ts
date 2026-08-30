import { HttpError } from "./http";

export const ALLOWED_METHODS = "GET,POST,OPTIONS";
export const ALLOWED_HEADERS = "Content-Type";

export function parseAllowedOrigins(csv: string): ReadonlySet<string> {
  return new Set(
    csv
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function requireAllowedOrigin(
  request: Request,
  allowedOrigins: ReadonlySet<string>,
): string | null {
  const origin = request.headers.get("Origin");
  if (origin === null) return null;
  if (!allowedOrigins.has(origin)) {
    throw new HttpError(403, "origin_not_allowed", "這個來源不允許呼叫本站 API。");
  }
  return origin;
}

export function withCors(response: Response, origin: string | null): Response {
  if (origin === null) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  headers.set("Access-Control-Max-Age", "600");
  headers.append("Vary", "Origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function preflightResponse(origin: string | null): Response {
  if (origin === null) {
    throw new HttpError(400, "origin_required", "預檢請求缺少 Origin。");
  }
  return withCors(new Response(null, { status: 204 }), origin);
}

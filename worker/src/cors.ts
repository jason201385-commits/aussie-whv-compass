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

/**
 * Every POST route is only ever called from pages of this site, so a POST that
 * carries no Origin header is not a browser call from an allowed page and is
 * rejected exactly like a disallowed origin (same status, code and message).
 * GET stays reachable for origin-less probes such as health checks; OPTIONS
 * keeps its own preflight rule in preflightResponse.
 */
function isOriginRequired(method: string): boolean {
  return method === "POST";
}

function originNotAllowed(): HttpError {
  return new HttpError(403, "origin_not_allowed", "這個來源不允許呼叫本站 API。");
}

export function requireAllowedOrigin(
  request: Request,
  allowedOrigins: ReadonlySet<string>,
): string | null {
  const origin = request.headers.get("Origin");
  if (origin === null) {
    if (isOriginRequired(request.method)) throw originNotAllowed();
    return null;
  }
  if (!allowedOrigins.has(origin)) throw originNotAllowed();
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

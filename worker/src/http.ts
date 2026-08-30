export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: HeadersInit = {},
): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  responseHeaders.set("Cache-Control", "no-store");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("Referrer-Policy", "no-referrer");
  return Response.json(body, { status, headers: responseHeaders });
}

export function errorResponse(error: unknown, requestId: string): Response {
  if (error instanceof HttpError) {
    return jsonResponse(
      { ok: false, error: { code: error.code, message: error.message }, requestId },
      error.status,
    );
  }

  return jsonResponse(
    {
      ok: false,
      error: { code: "internal_error", message: "服務暫時無法處理，請稍後再試。" },
      requestId,
    },
    500,
  );
}

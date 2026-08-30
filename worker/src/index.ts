import { parseAllowedOrigins, preflightResponse, requireAllowedOrigin, withCors } from "./cors";
import { errorResponse, jsonResponse } from "./http";

interface RuntimeSecrets {
  TURNSTILE_SECRET_KEY: string;
  RATE_LIMIT_HMAC_KEY: string;
}

export type AppEnv = Env & RuntimeSecrets;

function logResult(requestId: string, request: Request, status: number): void {
  const url = new URL(request.url);
  console.log(
    JSON.stringify({
      event: "request_complete",
      requestId,
      method: request.method,
      pathname: url.pathname,
      status,
    }),
  );
}

async function handleRequest(
  request: Request,
  env: AppEnv,
  _ctx: ExecutionContext,
): Promise<Response> {
  const requestId = crypto.randomUUID();
  const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
  let origin: string | null = null;

  try {
    origin = requireAllowedOrigin(request, allowedOrigins);
    if (request.method === "OPTIONS") {
      const response = preflightResponse(origin);
      logResult(requestId, request, response.status);
      return response;
    }

    const url = new URL(request.url);
    let response: Response;
    if (request.method === "GET" && url.pathname === "/api/health") {
      response = jsonResponse({
        ok: true,
        service: "aussie-whv-compass-api",
        environment: env.ENVIRONMENT,
        deploymentState: "local-scaffold",
        requestId,
      });
    } else {
      response = jsonResponse(
        {
          ok: false,
          error: { code: "not_found", message: "找不到這個 API 路徑。" },
          requestId,
        },
        404,
      );
    }

    const corsResponse = withCors(response, origin);
    logResult(requestId, request, corsResponse.status);
    return corsResponse;
  } catch (error) {
    const response = withCors(errorResponse(error, requestId), origin);
    logResult(requestId, request, response.status);
    return response;
  }
}

export default {
  fetch: handleRequest,
} satisfies ExportedHandler<AppEnv>;

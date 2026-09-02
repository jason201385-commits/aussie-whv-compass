import { answerAssistQuestion, type AssistBindings, type AssistDependencies } from "./assist";
import {
  searchLicensedAccommodation,
  type AccommodationDependencies,
  type AccommodationEnv,
} from "./accommodation";
import { parseAllowedOrigins, preflightResponse, requireAllowedOrigin, withCors } from "./cors";
import {
  createContactCase,
  deleteManagedContact,
  type ContactDependencies,
  updateManagedContact,
  viewManagedContactCase,
} from "./contact";
import { errorResponse, jsonResponse } from "./http";
import { recordAggregateMetric } from "./metrics";
import { purgeExpiredContactCases } from "./repository";

interface RuntimeSecrets {
  TURNSTILE_SECRET_KEY: string;
  RATE_LIMIT_HMAC_KEY: string;
}

// Assist bindings are re-declared as optional so the route fails closed when
// they are absent and existing test environments stay valid.
export type AppEnv = Omit<Env, keyof AssistBindings> &
  AssistBindings &
  RuntimeSecrets &
  AccommodationEnv;

export interface AppDependencies
  extends ContactDependencies, AccommodationDependencies, AssistDependencies {}

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

function createFetchHandler(dependencies: AppDependencies) {
  return async function handleRequest(
    request: Request,
    env: AppEnv,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const isAggregateMetric = url.pathname === "/api/metrics";
    // /api/assist keeps no request log line either (CLARIFIER_SPEC §4).
    const skipRequestLog = isAggregateMetric || url.pathname === "/api/assist";
    const requestId = skipRequestLog ? "" : crypto.randomUUID();
    const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
    let origin: string | null = null;

    function logOperationalResult(status: number): void {
      if (!skipRequestLog) logResult(requestId, request, status);
    }

    try {
      origin = requireAllowedOrigin(request, allowedOrigins);
      if (request.method === "OPTIONS") {
        const response = preflightResponse(origin);
        logOperationalResult(response.status);
        return response;
      }

      let response: Response;
      if (request.method === "GET" && url.pathname === "/api/health") {
        response = jsonResponse({
          ok: true,
          service: "aussie-whv-compass-api",
          environment: env.ENVIRONMENT,
          deploymentState: "local-scaffold",
          requestId,
        });
      } else if (request.method === "POST" && url.pathname === "/api/contact") {
        response = await createContactCase(request, env, dependencies);
      } else if (request.method === "POST" && url.pathname === "/api/contact/manage") {
        response = await viewManagedContactCase(request, env, dependencies);
      } else if (request.method === "POST" && url.pathname === "/api/contact/update") {
        response = await updateManagedContact(request, env, dependencies);
      } else if (request.method === "POST" && url.pathname === "/api/contact/delete") {
        response = await deleteManagedContact(request, env, dependencies);
      } else if (request.method === "POST" && url.pathname === "/api/metrics") {
        response = await recordAggregateMetric(request, env);
      } else if (request.method === "POST" && url.pathname === "/api/accommodation/search") {
        response = await searchLicensedAccommodation(request, env, dependencies);
      } else if (request.method === "POST" && url.pathname === "/api/assist") {
        response = await answerAssistQuestion(request, env, dependencies);
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
      logOperationalResult(corsResponse.status);
      return corsResponse;
    } catch (error) {
      const response = withCors(errorResponse(error, requestId), origin);
      logOperationalResult(response.status);
      return response;
    }
  };
}

export function createApp(dependencies: AppDependencies = {}) {
  return {
    fetch: createFetchHandler(dependencies),
    async scheduled(_controller, env): Promise<void> {
      const purged = await purgeExpiredContactCases(env.DB, new Date().toISOString());
      console.log(JSON.stringify({ event: "contact_retention_purge", purged }));
    },
  } satisfies ExportedHandler<AppEnv>;
}

export default createApp();

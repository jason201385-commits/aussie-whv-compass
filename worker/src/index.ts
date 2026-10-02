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
import {
  getVerifiedNews,
  NEWS_RETENTION_DAYS,
  NEWS_SYNC_CRON,
  syncOfficialNews,
  type NewsDependencies,
} from "./news";
import { purgeOldNews } from "./news-repository";
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
  extends ContactDependencies, AccommodationDependencies, AssistDependencies, NewsDependencies {}

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
      if (request.method === "GET" && url.pathname === "/robots.txt") {
        response = new Response("User-agent: *\nAllow: /api/news\nDisallow: /\n", {
          headers: {
            "Cache-Control": "public, max-age=86400",
            "Content-Type": "text/plain; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
          },
        });
      } else if (request.method === "GET" && url.pathname === "/api/health") {
        response = jsonResponse({
          ok: true,
          service: "aussie-whv-compass-api",
          environment: env.ENVIRONMENT,
          deploymentState: env.ENVIRONMENT === "production" ? "live" : "local-scaffold",
          requestId,
        });
      } else if (request.method === "GET" && url.pathname === "/api/news") {
        response = await getVerifiedNews(request, env.DB, dependencies.now?.() ?? new Date());
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
    async scheduled(controller, env): Promise<void> {
      if (controller.cron === NEWS_SYNC_CRON) {
        const results = await syncOfficialNews(env.DB, dependencies);
        console.log(JSON.stringify({
          event: "official_news_sync",
          sources: results.map((result) => ({
            sourceId: result.sourceId,
            status: result.status,
            fetched: result.fetchedCount,
            candidates: result.candidateCount,
            verified: result.verifiedCount,
            rejected: result.rejectedCount,
            errorCode: result.errorCode,
          })),
        }));
        return;
      }
      const now = dependencies.now?.() ?? new Date();
      const purgedContacts = await purgeExpiredContactCases(env.DB, now.toISOString());
      const newsBefore = new Date(now.getTime() - NEWS_RETENTION_DAYS * 86_400_000).toISOString();
      const purgedNews = await purgeOldNews(env.DB, newsBefore);
      console.log(JSON.stringify({ event: "retention_purge", purgedContacts, purgedNews }));
    },
  } satisfies ExportedHandler<AppEnv>;
}

export default createApp();

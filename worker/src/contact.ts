import { readBoundedJson } from "./body";
import { validateContactInput, validateManageContactInput } from "./contact-validation";
import { HttpError, jsonResponse } from "./http";
import { DisabledMailTransport, type MailTransport } from "./mail";
import { createRateLimitKey, enforceRateLimit, type RateLimitBinding } from "./rate-limit";
import {
  deleteManagedContactCase,
  getContactCaseForManagement,
  insertContactCaseBundle,
  markReceiptForRetry,
  markReceiptSent,
  updateManagedContactCase,
} from "./repository";
import {
  addRetentionMonths,
  createCaseId,
  createManagementToken,
  createManagementUrl,
  hashManagementToken,
} from "./tokens";
import { verifyTurnstile, type FetchTransport } from "./turnstile";

export interface ContactEnvironment {
  DB: D1Database;
  CONTACT_RATE_LIMITER: RateLimitBinding;
  TURNSTILE_SECRET_KEY: string;
  RATE_LIMIT_HMAC_KEY: string;
  TURNSTILE_EXPECTED_HOSTNAME: string;
  TURNSTILE_EXPECTED_ACTION: string;
}

export interface ContactDependencies {
  turnstileTransport?: FetchTransport;
  mailTransport?: MailTransport;
  now?: () => Date;
}

function getNow(dependencies: ContactDependencies): string {
  return (dependencies.now?.() ?? new Date()).toISOString();
}

async function verifyHuman(
  token: string,
  env: ContactEnvironment,
  dependencies: ContactDependencies,
): Promise<void> {
  await verifyTurnstile(
    token,
    {
      secret: env.TURNSTILE_SECRET_KEY,
      hostname: env.TURNSTILE_EXPECTED_HOSTNAME,
      action: env.TURNSTILE_EXPECTED_ACTION,
    },
    dependencies.turnstileTransport,
  );
}

async function enforceContactRateLimit(
  identity: string,
  env: ContactEnvironment,
): Promise<void> {
  const rateLimitKey = await createRateLimitKey(identity, env.RATE_LIMIT_HMAC_KEY);
  await enforceRateLimit(env.CONTACT_RATE_LIMITER, rateLimitKey);
}

export async function createContactCase(
  request: Request,
  env: ContactEnvironment,
  dependencies: ContactDependencies = {},
): Promise<Response> {
  const input = validateContactInput(await readBoundedJson(request));
  await verifyHuman(input.turnstileToken, env, dependencies);
  await enforceContactRateLimit(input.emailNormalized, env);

  const createdAt = getNow(dependencies);
  const deleteAfter = addRetentionMonths(createdAt);
  const caseId = createCaseId();
  const managementToken = createManagementToken();
  const managementTokenHash = await hashManagementToken(managementToken);
  const outboxId = crypto.randomUUID();
  const managementUrl = createManagementUrl(caseId, managementToken);

  await insertContactCaseBundle(env.DB, {
    caseId,
    email: input.email,
    emailNormalized: input.emailNormalized,
    requestType: input.requestType,
    description: input.description,
    contactName: input.contactName,
    organization: input.organization,
    timeline: input.timeline,
    budgetRange: input.budgetRange,
    locale: input.locale,
    createdAt,
    deleteAfter,
    managementTokenHash,
    managementTokenExpiresAt: deleteAfter,
    outboxId,
  });

  const mailTransport = dependencies.mailTransport ?? new DisabledMailTransport();
  let emailStatus: "sent" | "queued" = "queued";
  try {
    await mailTransport.sendContactReceipt({
      caseId,
      to: input.email,
      locale: input.locale,
      submittedAt: createdAt,
      requestType: input.requestType,
      description: input.description,
      managementUrl,
    });
    await markReceiptSent(env.DB, outboxId, caseId, createdAt);
    emailStatus = "sent";
  } catch {
    const retryAt = new Date(new Date(createdAt).getTime() + 10 * 60 * 1000).toISOString();
    try {
      await markReceiptForRetry(env.DB, outboxId, "transport_unavailable", retryAt);
    } catch {
      // The original pending outbox row remains replayable; do not turn a saved case into a false failure.
      console.error(JSON.stringify({ event: "mail_retry_state_update_failed" }));
    }
  }

  return jsonResponse(
    {
      ok: true,
      caseId,
      receivedAt: createdAt,
      emailStatus,
      managementUrl,
      retention: { class: "general-inquiry", deleteAfter },
      replyExpectation: "3-5-business-days",
      contractState: "request-received-not-engagement",
    },
    201,
  );
}

export async function viewManagedContactCase(
  request: Request,
  env: ContactEnvironment,
  dependencies: ContactDependencies = {},
): Promise<Response> {
  const input = validateManageContactInput(await readBoundedJson(request));
  await verifyHuman(input.turnstileToken, env, dependencies);
  await enforceContactRateLimit(input.caseId, env);

  const now = getNow(dependencies);
  const tokenHash = await hashManagementToken(input.managementToken);
  const contactCase = await getContactCaseForManagement(env.DB, input.caseId, tokenHash, now);
  if (contactCase === null) {
    throw new HttpError(404, "case_not_found", "找不到案件，或管理連結已失效。");
  }
  return jsonResponse({ ok: true, case: contactCase });
}

export async function updateManagedContact(
  request: Request,
  env: ContactEnvironment,
  dependencies: ContactDependencies = {},
): Promise<Response> {
  const body = await readBoundedJson(request);
  const management = validateManageContactInput(body);
  const contact = validateContactInput(body);
  await verifyHuman(management.turnstileToken, env, dependencies);
  await enforceContactRateLimit(management.caseId, env);

  const updatedAt = getNow(dependencies);
  const tokenHash = await hashManagementToken(management.managementToken);
  const updated = await updateManagedContactCase(env.DB, management.caseId, tokenHash, {
    caseId: management.caseId,
    email: contact.email,
    emailNormalized: contact.emailNormalized,
    requestType: contact.requestType,
    description: contact.description,
    contactName: contact.contactName,
    organization: contact.organization,
    timeline: contact.timeline,
    budgetRange: contact.budgetRange,
    locale: contact.locale,
    createdAt: updatedAt,
    deleteAfter: addRetentionMonths(updatedAt),
  });
  if (!updated) {
    throw new HttpError(404, "case_not_found", "找不到案件，或管理連結已失效。");
  }
  return jsonResponse({ ok: true, caseId: management.caseId, updatedAt });
}

export async function deleteManagedContact(
  request: Request,
  env: ContactEnvironment,
  dependencies: ContactDependencies = {},
): Promise<Response> {
  const input = validateManageContactInput(await readBoundedJson(request));
  await verifyHuman(input.turnstileToken, env, dependencies);
  await enforceContactRateLimit(input.caseId, env);

  const deletedAt = getNow(dependencies);
  const tokenHash = await hashManagementToken(input.managementToken);
  const deleted = await deleteManagedContactCase(env.DB, input.caseId, tokenHash, deletedAt);
  if (!deleted) {
    throw new HttpError(404, "case_not_found", "找不到案件，或管理連結已失效。");
  }
  return jsonResponse({ ok: true, caseId: input.caseId, deletedAt, status: "deleted" });
}

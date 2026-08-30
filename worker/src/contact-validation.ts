import { HttpError } from "./http";
import { REQUEST_TYPES, type RequestType } from "./repository";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCALE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const FORBIDDEN_CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export const BUDGET_RANGES = [
  "not-sure",
  "under-1000-aud",
  "1000-3000-aud",
  "3000-10000-aud",
  "over-10000-aud",
] as const;

export interface ContactInput {
  email: string;
  emailNormalized: string;
  requestType: RequestType;
  description: string;
  contactName: string | null;
  organization: string | null;
  timeline: string | null;
  budgetRange: (typeof BUDGET_RANGES)[number] | null;
  locale: string;
  turnstileToken: string;
}

export interface ManageContactInput {
  caseId: string;
  managementToken: string;
  turnstileToken: string;
}

function requireObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HttpError(400, "object_required", "請送出 JSON object。");
  }
  return value as Record<string, unknown>;
}

function cleanString(
  record: Record<string, unknown>,
  field: string,
  options: { required: boolean; max: number },
): string | null {
  const value = record[field];
  if (value === undefined || value === null || value === "") {
    if (options.required) {
      throw new HttpError(400, "required_field_missing", `缺少必填欄位：${field}。`);
    }
    return null;
  }
  if (typeof value !== "string") {
    throw new HttpError(400, "invalid_field_type", `${field} 必須是文字。`);
  }
  const cleaned = value.normalize("NFC").trim();
  if (options.required && cleaned.length === 0) {
    throw new HttpError(400, "required_field_missing", `缺少必填欄位：${field}。`);
  }
  if (cleaned.length > options.max) {
    throw new HttpError(400, "field_too_long", `${field} 超過 ${options.max} 字元限制。`);
  }
  if (FORBIDDEN_CONTROL_CHARACTERS.test(cleaned)) {
    throw new HttpError(400, "invalid_characters", `${field} 含有不允許的控制字元。`);
  }
  return cleaned || null;
}

function requireBooleanTrue(record: Record<string, unknown>, field: string): void {
  if (record[field] !== true) {
    throw new HttpError(400, "boundary_not_accepted", "請先確認資料與服務邊界。");
  }
}

export function validateContactInput(value: unknown): ContactInput {
  const record = requireObject(value);
  const email = cleanString(record, "email", { required: true, max: 254 }) as string;
  const requestType = cleanString(record, "requestType", { required: true, max: 40 }) as string;
  const description = cleanString(record, "description", { required: true, max: 2000 }) as string;
  const locale = cleanString(record, "locale", { required: false, max: 35 }) ?? "zh-Hant";
  const turnstileToken = cleanString(record, "turnstileToken", {
    required: true,
    max: 2048,
  }) as string;
  const budgetRange = cleanString(record, "budgetRange", { required: false, max: 30 });
  requireBooleanTrue(record, "boundaryAccepted");

  if (!EMAIL_PATTERN.test(email)) {
    throw new HttpError(400, "email_invalid", "Email 格式不正確。");
  }
  if (!REQUEST_TYPES.includes(requestType as RequestType)) {
    throw new HttpError(400, "request_type_invalid", "需求類型不在允許清單內。");
  }
  if (!LOCALE_PATTERN.test(locale)) {
    throw new HttpError(400, "locale_invalid", "語言代碼不正確。");
  }
  if (
    budgetRange !== null &&
    !BUDGET_RANGES.includes(budgetRange as (typeof BUDGET_RANGES)[number])
  ) {
    throw new HttpError(400, "budget_range_invalid", "預算區間不在允許清單內。");
  }

  return {
    email,
    emailNormalized: email.toLocaleLowerCase("en-US"),
    requestType: requestType as RequestType,
    description,
    contactName: cleanString(record, "contactName", { required: false, max: 100 }),
    organization: cleanString(record, "organization", { required: false, max: 160 }),
    timeline: cleanString(record, "timeline", { required: false, max: 120 }),
    budgetRange: budgetRange as (typeof BUDGET_RANGES)[number] | null,
    locale,
    turnstileToken,
  };
}

export function validateManageContactInput(value: unknown): ManageContactInput {
  const record = requireObject(value);
  const caseId = cleanString(record, "caseId", { required: true, max: 40 }) as string;
  const managementToken = cleanString(record, "managementToken", {
    required: true,
    max: 100,
  }) as string;
  const turnstileToken = cleanString(record, "turnstileToken", {
    required: true,
    max: 2048,
  }) as string;

  if (!/^WHV-[0-9A-F]{32}$/.test(caseId)) {
    throw new HttpError(400, "case_id_invalid", "案件編號格式不正確。");
  }
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(managementToken)) {
    throw new HttpError(400, "management_token_invalid", "管理憑證格式不正確。");
  }

  return { caseId, managementToken, turnstileToken };
}

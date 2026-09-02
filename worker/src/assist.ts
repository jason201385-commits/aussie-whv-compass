import { readBoundedJson } from "./body";
import { HttpError, jsonResponse } from "./http";
import { createScopedRateLimitKey, enforceRateLimit, type RateLimitBinding } from "./rate-limit";
import { verifyTurnstile, type FetchTransport } from "./turnstile";

/**
 * POST /api/assist — the last-layer AI fallback of the homepage clarifier
 * (CLARIFIER_SPEC §4, SDD §1.1 principle 10).
 *
 * Design: the model is a ROUTER, not a writer. It may only return catalogue
 * hrefs; every sentence the visitor reads is composed on the server from fixed
 * zh-Hant templates (a lead sentence plus each chosen entry's own one-clause
 * description). No model-authored text is ever rendered, so a judgement such
 * as "you qualify" or a bare external domain cannot leak through.
 *
 * Privacy contract of this module:
 * - the question text, the model reply and the Turnstile token are never
 *   written to D1, never logged (this file contains no console usage at all)
 *   and never echoed into error messages;
 * - the only durable write is one aggregate counter row per Perth day;
 * - nothing is sent upstream before the client IP is known, Turnstile, the
 *   per-IP rate limit and the daily cap have all passed, and the provider
 *   secret plus an allow-listed provider host are present (fail closed).
 */

export interface AssistBindings {
  ASSIST_RATE_LIMITER?: RateLimitBinding;
  ASSIST_DAILY_CAP?: string;
  ASSIST_MODEL?: string;
  ASSIST_BASE_URL?: string;
  MINIMAX_API_KEY?: string;
}

export interface AssistEnv extends AssistBindings {
  DB: D1Database;
  TURNSTILE_SECRET_KEY: string;
  RATE_LIMIT_HMAC_KEY: string;
  TURNSTILE_EXPECTED_HOSTNAME: string;
  TURNSTILE_EXPECTED_ACTION: string;
}

export interface AssistDependencies {
  turnstileTransport?: FetchTransport;
  assistTransport?: FetchTransport;
  assistNow?: () => Date;
  assistTimeoutMs?: number;
}

export type AssistKind = "answer" | "official_exit" | "over_cap" | "refused";

export interface AssistLink {
  title: string;
  href: string;
}

interface AssistInput {
  question: string;
  turnstileToken: string;
}

interface CatalogueEntry {
  href: string;
  title: string;
  /** Shown to the model only, so it can pick the entry. */
  note: string;
  /** Shown to the visitor: one clause, no judgement words, composed into the fixed answer template. */
  lead: string;
}

export const ASSIST_PROVIDER = "minimax";
/** The only hostnames ASSIST_BASE_URL may point at; anything else is "not configured" and never receives the key. */
export const ASSIST_ALLOWED_HOSTS: readonly string[] = ["api.minimaxi.com", "api.minimax.io"];
export const MAX_ASSIST_BODY_BYTES = 2 * 1024;
export const MIN_QUESTION_LENGTH = 4;
export const MAX_QUESTION_LENGTH = 200;
export const MAX_ANSWER_LENGTH = 600;
export const MAX_ASSIST_LINKS = 3;
export const DEFAULT_ASSIST_TIMEOUT_MS = 8_000;
const MAX_TURNSTILE_TOKEN_LENGTH = 2048;
const MAX_UPSTREAM_RESPONSE_BYTES = 64 * 1024;
const UPSTREAM_MAX_TOKENS = 200;
const UPSTREAM_TEMPERATURE = 0;

/** C0 controls (except tab, LF and CR, which the whitespace collapse already removed) and DEL. */
function isControlCharacter(code: number): boolean {
  return (code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127;
}

function hasControlCharacters(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    if (isControlCharacter(text.charCodeAt(index))) return true;
  }
  return false;
}

/**
 * Server-side twin of the client pre-filter (contract §2.7) plus the owner's
 * keyword list and English equivalents. A hit returns the fixed safety copy
 * without touching Turnstile, the limiter, the counter or the model.
 */
export const ASSIST_SENSITIVE =
  /自殺|自傷|想死|不想活|輕生|傷害自己|被打|暴力|強暴|性侵|威脅|扣護照|扣證件|剛匯款|匯款了|轉帳了|被騙|急診|(?:^|[^0-9])000(?:[^0-9]|$)|suicid|kill myself|self[- ]?harm|want to die|end my life|assault|violen|\brape|threat|passport (?:was |is |got |has been )?(?:taken|confiscated|withheld|kept)|(?:just |already )?(?:wired|transferred|sent) (?:the |my )?money|scammed/i;

/**
 * Questions that ask for a personal determination (visa eligibility, legality,
 * a medical verdict, a tax amount). Classified BEFORE the model is called; a
 * hit returns the fixed official-exit copy with topic-matched official links
 * and the model never sees the question.
 */
export const ASSIST_DETERMINATION =
  /能不能申請|可不可以申請|可以申請嗎|申請得到嗎|申請得過嗎|有沒有資格|有資格嗎|符不符合|符合嗎|合法嗎|違法嗎|合不合法|該不該看醫生|要不要看醫生|需不需要看醫生|是不是[^，。？?!！]{0,12}病|退稅多少|退多少稅|能退多少|要繳多少稅|繳多少稅|會不會被拒|會被拒嗎|能不能過|會不會過|過得了嗎|am i eligible|are we eligible|eligible for|can i apply|could i apply|may i apply|can i (?:still )?get (?:the |a )?(?:visa|417|462)|is (?:it|this|that) legal|is (?:it|this|that) illegal|(?:is|are) (?:my|our) (?:boss|employer|contract|pay|wage|job) (?:legal|illegal|allowed)|how much tax|tax refund|how much (?:will|do|would) i get back|should i see a doctor|do i need (?:a|to see a) doctor|do i have (?:a |an )?[a-z ]{0,20}(?:disease|illness|infection|cancer|covid)|will i be (?:rejected|refused|denied)|will (?:my|the) (?:visa|application) be (?:rejected|refused|denied|granted|approved)/i;

/** Topic hints used only to pick which fixed official exits accompany a determination question. */
export const ASSIST_TOPIC_VISA = /簽證|集簽|二簽|三簽|417|462|申請|移民|永居|\bPR\b|visa|eligib|apply|immigra/i;
export const ASSIST_TOPIC_MEDICAL =
  /醫|病|痛|症狀|看診|藥|診所|急診|doctor|sick|\bpain|\bill\b|illness|medic|hospital|symptom|disease|infection|cancer|covid/i;
export const ASSIST_TOPIC_TAX = /稅|退休金|\bsuper\b|DASP|\bABN\b|\bTFN\b|\btax|refund|get back/i;
export const ASSIST_TOPIC_WORK =
  /雇主|老闆|工作|薪|合法|違法|仲介|農場|契約|合約|contract|employer|boss|wage|\bpay\b|legal|\bjob|\bwork|farm|agent/i;

/** Same-site href grammar shared with the client (contract §2.7). */
export const ASSIST_SAME_SITE =
  /^(?:[a-z0-9-]+\.html|lang\/[a-z]{2}(?:-[A-Za-z]{2,4})?\/(?:[a-z-]+\/)?)?(?:#[A-Za-z0-9_-]{1,80})?$/;

/**
 * The only links the model may pick. Every href was grep-verified against the
 * root pages on 2026-09-02; add an entry only after the anchor exists. The
 * `lead` clause is visitor-facing and must stay free of judgement words
 * (the test file asserts this against ASSIST_LEAD_FORBIDDEN).
 */
export const SITE_CATALOGUE: readonly CatalogueEntry[] = [
  { href: "index.html", title: "首頁", note: "釐清器、安全出口、搜尋與各地社團", lead: "從釐清器、安全出口、搜尋與社團目錄重新開始" },
  { href: "index.html#search", title: "站內搜尋", note: "搜尋全部攻略", lead: "用關鍵字搜尋全站攻略" },
  { href: "index.html#communities", title: "各地社團目錄", note: "找在地的人聊", lead: "依地區找公開社團問在地的人" },
  { href: "index.html#support-hub", title: "安全出口", note: "立即危險、剛匯款、被威脅、簽證到期", lead: "立即危險、剛匯款、被威脅或簽證到期的固定出口" },
  { href: "why.html", title: "自我釐清", note: "快思測驗與慢想工作表", lead: "用快思測驗與慢想工作表釐清自己要什麼" },
  { href: "why.html#quick-quiz", title: "2 分鐘快思", note: "想去哪、過什麼生活", lead: "兩分鐘選出想去哪、過什麼生活" },
  { href: "visa.html", title: "簽證與集簽", note: "417 申請條件、流程、集簽規則", lead: "整理 417 的官方條件、流程與集簽規則" },
  { href: "visa.html#apply", title: "申請流程", note: "自己線上申請的步驟", lead: "列出自己線上申請的步驟與官方入口" },
  { href: "visa.html#postcode-tool", title: "郵遞區號初篩", note: "查地區能不能算集簽", lead: "輸入郵遞區號查地區是否在官方集簽名單" },
  { href: "visa.html#evidence", title: "集簽證據", note: "從第一天存證據", lead: "說明集簽證據從第一天怎麼留" },
  { href: "lang/en/visa/", title: "462 英文簽證頁", note: "中國大陸護照 462 的簽證細節", lead: "英文版整理中國大陸護照 462 的官方細節" },
  { href: "prep.html", title: "行前準備", note: "行前時間軸與落地 SOP", lead: "行前時間軸與落地第一週的 SOP" },
  { href: "prep.html#checklist", title: "行前互動清單", note: "出發前逐項確認", lead: "出發前逐項勾選的互動清單" },
  { href: "simulator.html", title: "抵澳 30 天模擬器", note: "先玩一次再面對真實選擇", lead: "先用模擬器走一次抵澳 30 天的選擇" },
  { href: "cost.html", title: "物價薪水稅務", note: "生活費、薪水、稅、換匯、買車", lead: "整理生活費、薪水、稅、換匯與買車" },
  { href: "cost.html#save-calc", title: "存錢試算", note: "算每週收支", lead: "用試算表算每週收支" },
  { href: "cost.html#exchange", title: "換匯與匯款", note: "怎麼換、怎麼匯", lead: "比較換匯與匯款的方式" },
  { href: "cost.html#wage", title: "法定最低時薪", note: "依法該領多少", lead: "查官方公布的法定最低時薪" },
  { href: "cost.html#tax", title: "稅與 super", note: "稅號、稅率與退休金", lead: "整理稅號、稅率與退休金的官方入口" },
  { href: "cost.html#car", title: "買車與賣車", note: "付款前查 VIN", lead: "買車前查 VIN 與過戶步驟" },
  { href: "housing.html", title: "住宿與租屋", note: "短住、合租、整租", lead: "分辨短住、合租與整租的找法" },
  { href: "housing.html#housing-search-tool", title: "兩題找住宿平台", note: "合法多平台找房", lead: "兩題選出有授權的找房平台" },
  { href: "housing.html#bond", title: "押金自保", note: "押金與假房東", lead: "押金與假房東的自保步驟" },
  { href: "work.html", title: "找工作", note: "管道、查核、證照、採收季節", lead: "整理求職管道、查核、證照與採收季節" },
  { href: "work.html#channels", title: "多平台求職入口", note: "各類工作的公開管道", lead: "各類工作的公開求職管道" },
  { href: "work.html#verify", title: "接工作前 5 分鐘查核", note: "確認工作合不合法", lead: "接工作前 5 分鐘的官方查核步驟" },
  { href: "work.html#seasons", title: "採收季節月曆", note: "各州官方採收季節", lead: "各州官方採收季節月曆" },
  { href: "work.html#certs", title: "證照", note: "RSA、叉車證等", lead: "RSA、叉車證等證照的取得方式" },
  { href: "scam.html", title: "防詐騙", note: "手法、紅旗、救濟", lead: "常見詐騙手法、紅旗與救濟管道" },
  { href: "scam.html#help", title: "中招救濟包", note: "剛匯款、被威脅或扣證件", lead: "剛匯款、被威脅或扣證件時的救濟包" },
  { href: "english.html", title: "英文資源", note: "情境練習與策略", lead: "情境英文練習與溝通策略" },
  { href: "health.html", title: "保險就醫心理", note: "保險、看醫生、心理安全", lead: "整理保險、看醫生與心理安全資源" },
  { href: "health.html#emergency", title: "緊急聯絡總表", note: "有人受傷或有立即危險", lead: "受傷或有立即危險時的緊急聯絡總表" },
  { href: "health.html#doctor", title: "就醫分流", note: "依急迫程度看哪裡", lead: "依急迫程度分流到對應的就醫管道" },
  { href: "health.html#insurance", title: "保險怎麼買", note: "醫療保障", lead: "比較醫療保險的選擇" },
  { href: "leave.html", title: "報稅與離澳", note: "報稅、退休金、離澳收尾", lead: "報稅、退休金與離澳收尾的順序" },
  { href: "leave.html#dasp-calc", title: "DASP 粗估", note: "退休金能領回多少", lead: "用官方公式粗估退休金 DASP" },
  { href: "leave.html#leave-checklist-tool", title: "離澳 checklist", note: "退租、報稅、帳戶", lead: "退租、報稅、關帳戶的離澳清單" },
  { href: "market.html", title: "離澳出清與初登澳補給", note: "二手交換入口", lead: "離澳出清與初登澳補給的二手交換入口" },
  { href: "market.html#market-tool", title: "二手交換草稿", note: "寫一份不含個資的草稿", lead: "寫一份不含個資的二手交換草稿" },
  { href: "pr.html", title: "PR 路徑總覽", note: "留下來的公開入口", lead: "留下來的四類公開制度入口" },
  { href: "pr.html#overview", title: "四類公開入口", note: "先分清楚制度", lead: "先分清楚四類公開入口的制度差異" },
  { href: "about.html", title: "關於本站", note: "資料分層、回報修正、免責", lead: "資料分層、回報修正與免責說明" },
  { href: "about.html#maintain", title: "回報錯誤", note: "資料有錯或缺題", lead: "回報資料錯誤或缺題" },
];

/** Words that may never appear in a visitor-facing lead clause. */
export const ASSIST_LEAD_FORBIDDEN =
  /一定|符合|資格|核准|保證|申請吧|會被拒|診斷|處方|判定|合法|違法|應該|建議你|你可以|你不能|http|www\./;

const CATALOGUE_BY_HREF: ReadonlyMap<string, CatalogueEntry> = new Map(
  SITE_CATALOGUE.map((entry) => [entry.href, entry]),
);

export const SYSTEM_PROMPT = [
  "你是「澳打指南針」的站內路由器。網站是澳洲打工度假（WHV）的免費開源攻略。",
  "規則：",
  "1. 你不寫回答。只從下方目錄挑 1 到 3 個最符合問題的 href；使用者看到的文字全部由伺服器的固定模板產生。",
  "2. href 必須與目錄一字不差；不得輸出目錄以外的網址、電話、聯絡方式或任何說明文字。",
  "3. 涉及個人簽證、法律、醫療、稅務的問題，只挑對應頁面的官方入口；你不做任何判定。",
  '4. 只輸出一個 JSON 物件：{"links":["<href>","<href>"]}。可另加 "intent" 一個短字串（伺服器會忽略）。不要加其他鍵、標題或程式碼框。',
  "站內目錄（href｜名稱｜說明）：",
  ...SITE_CATALOGUE.map((entry) => `${entry.href}｜${entry.title}｜${entry.note}`),
].join("\n");

/** Fixed visitor-facing copy. Nothing below is ever influenced by model output. */
export const ANSWER_LEAD = "AI 只做路標，最接近你問題的站內頁面：";
const SAFETY_ANSWER = "這種情況不要等 AI。";
const SAFETY_LINK_HREFS = ["health.html#emergency", "scam.html#help"] as const;
const FALLBACK_ANSWER = "這題 AI 不能直接答；先用站內搜尋，或到各地社團問人。";
const FALLBACK_LINK_HREFS = ["index.html#search", "index.html#communities"] as const;
/** CLARIFIER_SPEC §4: determination questions become the fixed official-exit copy, never a community hand-off. */
export const JUDGMENT_ANSWER = "這題涉及個人判定；請看官方入口或專業名冊。";
export const OFFICIAL_EXIT_LINKS = {
  visa: ["visa.html#apply", "pr.html#overview"],
  medical: ["health.html#doctor"],
  tax: ["cost.html#tax", "leave.html#dasp-calc"],
  work: ["work.html#verify", "scam.html#help"],
  /** No topic hint: one official entry per topic, in the same order. */
  default: ["visa.html#apply", "health.html#doctor", "cost.html#tax", "work.html#verify"],
} as const;
const OVER_CAP_ANSWER = "今天的 AI 額度已用完。";
const CLIENT_IP_MISSING_MESSAGE = "無法辨識連線來源，請重新整理後再試。";

function catalogueLinks(hrefs: readonly string[]): AssistLink[] {
  const links: AssistLink[] = [];
  for (const href of hrefs) {
    const entry = CATALOGUE_BY_HREF.get(href);
    if (entry) links.push({ title: entry.title, href: entry.href });
  }
  return links;
}

/** Picks the fixed official exits that match the determination question's topic(s). */
export function officialExitLinks(question: string): AssistLink[] {
  const hrefs: string[] = [];
  if (ASSIST_TOPIC_VISA.test(question)) hrefs.push(...OFFICIAL_EXIT_LINKS.visa);
  if (ASSIST_TOPIC_MEDICAL.test(question)) hrefs.push(...OFFICIAL_EXIT_LINKS.medical);
  if (ASSIST_TOPIC_TAX.test(question)) hrefs.push(...OFFICIAL_EXIT_LINKS.tax);
  if (ASSIST_TOPIC_WORK.test(question)) hrefs.push(...OFFICIAL_EXIT_LINKS.work);
  return catalogueLinks(hrefs.length > 0 ? [...new Set(hrefs)] : OFFICIAL_EXIT_LINKS.default);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

export function perthDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Perth",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function validateAssistInput(value: unknown): AssistInput {
  if (!isRecord(value) || !hasExactKeys(value, ["question", "turnstileToken"])) {
    throw new HttpError(400, "assist_fields_invalid", "AI 兜底只接受 question 與 turnstileToken 兩個欄位。");
  }
  if (typeof value.question !== "string") {
    throw new HttpError(400, "question_invalid", "question 必須是文字。");
  }
  const question = value.question.normalize("NFC").replace(/\s+/g, " ").trim();
  if (question.length < MIN_QUESTION_LENGTH || question.length > MAX_QUESTION_LENGTH) {
    throw new HttpError(
      400,
      "question_length_invalid",
      `問題請寫 ${MIN_QUESTION_LENGTH} 到 ${MAX_QUESTION_LENGTH} 字。`,
    );
  }
  if (hasControlCharacters(question)) {
    throw new HttpError(400, "question_invalid", "問題含有不允許的控制字元。");
  }
  const turnstileToken = value.turnstileToken;
  if (
    typeof turnstileToken !== "string"
    || turnstileToken.length === 0
    || turnstileToken.length > MAX_TURNSTILE_TOKEN_LENGTH
  ) {
    throw new HttpError(400, "turnstile_token_invalid", "驗證資訊不完整，請重新操作。");
  }
  return { question, turnstileToken };
}

function parseDailyCap(value: string | undefined): number {
  if (typeof value !== "string" || !/^\d{1,6}$/.test(value)) return 0;
  return Number(value);
}

/**
 * Reserves one unit of today's quota atomically. The row is the only durable
 * write of this route: one (day, count) pair per Perth day, no request rows.
 * Returns false when the cap is already reached (the counter is not changed).
 */
export async function reserveDailyQuota(db: D1Database, day: string, cap: number): Promise<boolean> {
  if (!Number.isInteger(cap) || cap <= 0) return false;
  const result = await db
    .prepare(
      `INSERT INTO assist_daily_usage (day, count) VALUES (?1, 1)
       ON CONFLICT(day) DO UPDATE SET count = count + 1 WHERE count < ?2`,
    )
    .bind(day, cap)
    .run();
  return result.success && (result.meta.changes ?? 0) > 0;
}

interface ProviderConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

/**
 * Fail closed: the key, model and base URL must all be present, the URL must
 * be plain https with no credentials, query or fragment, and its hostname must
 * be pinned to ASSIST_ALLOWED_HOSTS. Any other value means "not configured",
 * so a mis-set ASSIST_BASE_URL can never receive the key or a question.
 */
export function resolveProviderConfig(env: AssistBindings): ProviderConfig | null {
  const apiKey = (env.MINIMAX_API_KEY ?? "").trim();
  const model = (env.ASSIST_MODEL ?? "").trim();
  const baseUrl = (env.ASSIST_BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (!apiKey || !model || !baseUrl) return null;
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
    return null;
  }
  if (parsed.port !== "" || !ASSIST_ALLOWED_HOSTS.includes(parsed.hostname)) return null;
  return { baseUrl, model, apiKey };
}

/** One public error for every upstream failure; the reason is intentionally not logged (no console in this file). */
function unavailable(): HttpError {
  return new HttpError(502, "assist_unavailable", "AI 暫時無法回覆，請改用站內搜尋或到各地社團問人。");
}

/**
 * The single place that knows the vendor wire shape. MiniMax exposes an
 * OpenAI-compatible chat completions endpoint under ASSIST_BASE_URL.
 */
async function callMiniMax(
  config: ProviderConfig,
  question: string,
  transport: FetchTransport,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      response = await transport(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: question },
          ],
          max_tokens: UPSTREAM_MAX_TOKENS,
          temperature: UPSTREAM_TEMPERATURE,
        }),
        signal: controller.signal,
      });
    } catch {
      throw unavailable();
    }
    if (!response.ok) throw unavailable();

    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_UPSTREAM_RESPONSE_BYTES) throw unavailable();
    let payload: unknown;
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      throw unavailable();
    }
    const content = extractMessageContent(payload);
    if (content === null) throw unavailable();
    return content;
  } finally {
    clearTimeout(timer);
  }
}

function extractMessageContent(payload: unknown): string | null {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) return null;
  const first: unknown = payload.choices[0];
  if (!isRecord(first) || !isRecord(first.message)) return null;
  return typeof first.message.content === "string" ? first.message.content : null;
}

/** The only thing read from the model: candidate hrefs. Every other key ("intent", "answer", ...) is dropped. */
export interface ModelReply {
  links: unknown;
}

/** Lenient parse: strips reasoning blocks and code fences, then reads the first JSON object's `links`. */
export function parseModelReply(content: string): ModelReply {
  let text = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  text = text.replace(/^```[a-z]*\s*/i, "").replace(/\s*```\s*$/, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1)) as unknown;
      if (isRecord(parsed)) return { links: parsed.links };
    } catch {
      // not JSON: no routable links
    }
  }
  return { links: [] };
}

function filterLinks(candidate: unknown): CatalogueEntry[] {
  if (!Array.isArray(candidate)) return [];
  const seen = new Set<string>();
  const entries: CatalogueEntry[] = [];
  for (const item of candidate) {
    const href = isRecord(item) ? item.href : item;
    if (typeof href !== "string" || !ASSIST_SAME_SITE.test(href)) continue;
    const entry = CATALOGUE_BY_HREF.get(href);
    if (!entry || seen.has(entry.href)) continue;
    seen.add(entry.href);
    entries.push(entry);
    if (entries.length >= MAX_ASSIST_LINKS) break;
  }
  return entries;
}

/** Fixed template: lead sentence + "title——lead" per chosen entry. No model text is involved. */
export function composeAnswerText(entries: readonly CatalogueEntry[]): string {
  const clauses = entries.map((entry) => `${entry.title}——${entry.lead}`).join("；");
  return `${ANSWER_LEAD}${clauses}。`.slice(0, MAX_ANSWER_LENGTH);
}

export function composeAssistReply(reply: ModelReply): { kind: AssistKind; answer: string; links: AssistLink[] } {
  const entries = filterLinks(reply.links);
  if (entries.length === 0) {
    return { kind: "refused", answer: FALLBACK_ANSWER, links: catalogueLinks(FALLBACK_LINK_HREFS) };
  }
  return {
    kind: "answer",
    answer: composeAnswerText(entries),
    links: entries.map((entry) => ({ title: entry.title, href: entry.href })),
  };
}

function overCapResponse(): Response {
  return jsonResponse(
    {
      ok: false,
      kind: "over_cap",
      answer: OVER_CAP_ANSWER,
      links: catalogueLinks(FALLBACK_LINK_HREFS),
      error: { code: "assist_daily_cap", message: OVER_CAP_ANSWER },
    },
    429,
  );
}

export async function answerAssistQuestion(
  request: Request,
  env: AssistEnv,
  dependencies: AssistDependencies = {},
): Promise<Response> {
  if (new URL(request.url).search) {
    throw new HttpError(400, "query_not_allowed", "AI 兜底不接受網址 query 參數。");
  }
  const input = validateAssistInput(await readBoundedJson(request, MAX_ASSIST_BODY_BYTES));

  // 1. Sensitive pre-filter: fixed safety exits, nothing else runs.
  if (ASSIST_SENSITIVE.test(input.question)) {
    return jsonResponse({
      ok: true,
      kind: "official_exit",
      answer: SAFETY_ANSWER,
      links: catalogueLinks(SAFETY_LINK_HREFS),
    });
  }

  // 2. Determination classifier: personal visa / legal / medical / tax verdicts
  //    go straight to the fixed official exits; the model never sees them.
  if (ASSIST_DETERMINATION.test(input.question)) {
    return jsonResponse({
      ok: true,
      kind: "official_exit",
      answer: JUDGMENT_ANSWER,
      links: officialExitLinks(input.question),
    });
  }

  // 3. Fail closed without a client IP: no shared limiter bucket, no Turnstile, no model.
  const clientIp = (request.headers.get("CF-Connecting-IP") ?? "").trim();
  if (!clientIp) {
    throw new HttpError(400, "client_ip_missing", CLIENT_IP_MISSING_MESSAGE);
  }

  await verifyTurnstile(
    input.turnstileToken,
    {
      secret: env.TURNSTILE_SECRET_KEY,
      hostname: env.TURNSTILE_EXPECTED_HOSTNAME,
      action: env.TURNSTILE_EXPECTED_ACTION,
    },
    dependencies.turnstileTransport,
  );

  const limiter = env.ASSIST_RATE_LIMITER;
  if (!limiter) {
    throw new HttpError(503, "assist_not_configured", "站內 AI 兜底尚未啟用。");
  }
  const rateLimitKey = await createScopedRateLimitKey("assist", clientIp, env.RATE_LIMIT_HMAC_KEY);
  await enforceRateLimit(limiter, rateLimitKey);

  const now = (dependencies.assistNow ?? (() => new Date()))();
  const reserved = await reserveDailyQuota(env.DB, perthDate(now), parseDailyCap(env.ASSIST_DAILY_CAP));
  if (!reserved) return overCapResponse();

  const config = resolveProviderConfig(env);
  if (config === null) {
    throw new HttpError(503, "assist_not_configured", "站內 AI 兜底尚未啟用。");
  }

  const timeoutMs = Math.min(
    DEFAULT_ASSIST_TIMEOUT_MS,
    Math.max(500, dependencies.assistTimeoutMs ?? DEFAULT_ASSIST_TIMEOUT_MS),
  );
  const content = await callMiniMax(
    config,
    input.question,
    dependencies.assistTransport ?? fetch,
    timeoutMs,
  );
  const composed = composeAssistReply(parseModelReply(content));

  return jsonResponse({
    ok: true,
    kind: composed.kind,
    answer: composed.answer,
    links: composed.links,
    provider: ASSIST_PROVIDER,
  });
}

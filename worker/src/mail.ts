export interface ContactReceiptMessage {
  caseId: string;
  to: string;
  locale: string;
  submittedAt: string;
  requestType: string;
  description: string;
  managementUrl: string;
}

export interface MailReceipt {
  accepted: true;
  transportId: string;
}

export interface MailTransport {
  sendContactReceipt(message: ContactReceiptMessage): Promise<MailReceipt>;
}

export interface MailEnv {
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  CONTACT_NOTIFY_TO?: string;
}

export interface ResendMailOptions {
  apiKey: string;
  from: string;
  notifyTo?: string;
  fetchImpl?: typeof fetch;
}

const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const DEFAULT_MAIL_FROM = "noreply@aussiewhvcompass.com";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isEnglishLocale(locale: string): boolean {
  return locale.trim().toLowerCase().startsWith("en");
}

function buildReceiptContent(message: ContactReceiptMessage): { subject: string; html: string; text: string } {
  const caseId = escapeHtml(message.caseId);
  const managementUrl = escapeHtml(message.managementUrl);
  const requestType = escapeHtml(message.requestType);
  const submittedAt = escapeHtml(message.submittedAt);

  if (isEnglishLocale(message.locale)) {
    return {
      subject: `Aussie WHV Compass — request received (${message.caseId})`,
      html: [
        "<p>Thanks — we received your request.</p>",
        `<p><strong>Case ID:</strong> ${caseId}<br>`,
        `<strong>Type:</strong> ${requestType}<br>`,
        `<strong>Submitted:</strong> ${submittedAt}</p>`,
        `<p>Manage or delete your request (keep this link private):<br>`,
        `<a href="${managementUrl}">${managementUrl}</a></p>`,
        "<p>We usually reply within 3–5 business days. This is an acknowledgement only, not an engagement.</p>",
        "<p>— Aussie WHV Compass</p>",
      ].join("\n"),
      text: [
        "Thanks — we received your request.",
        `Case ID: ${message.caseId}`,
        `Type: ${message.requestType}`,
        `Submitted: ${message.submittedAt}`,
        `Manage or delete your request (keep this link private): ${message.managementUrl}`,
        "We usually reply within 3–5 business days. This is an acknowledgement only, not an engagement.",
        "— Aussie WHV Compass",
      ].join("\n"),
    };
  }

  return {
    subject: `澳打工度假指南 — 已收到您的需求（${message.caseId}）`,
    html: [
      "<p>您好，我們已收到您的需求單。</p>",
      `<p><strong>案件編號：</strong>${caseId}<br>`,
      `<strong>需求類型：</strong>${requestType}<br>`,
      `<strong>送出時間：</strong>${submittedAt}</p>`,
      `<p>請用下列連結自行查看、修改或刪除（請勿轉寄給他人）：<br>`,
      `<a href="${managementUrl}">${managementUrl}</a></p>`,
      "<p>我們通常於 3–5 個工作天內回覆。這封信只是確認收到，不代表已成立委託。</p>",
      "<p>— 澳打工度假指南 Aussie WHV Compass</p>",
    ].join("\n"),
    text: [
      "您好，我們已收到您的需求單。",
      `案件編號：${message.caseId}`,
      `需求類型：${message.requestType}`,
      `送出時間：${message.submittedAt}`,
      `請用下列連結自行查看、修改或刪除（請勿轉寄給他人）：${message.managementUrl}`,
      "我們通常於 3–5 個工作天內回覆。這封信只是確認收到，不代表已成立委託。",
      "— 澳打工度假指南 Aussie WHV Compass",
    ].join("\n"),
  };
}

function buildOwnerNotifyContent(message: ContactReceiptMessage): { subject: string; html: string; text: string } {
  const caseId = escapeHtml(message.caseId);
  const requestType = escapeHtml(message.requestType);
  const submitter = escapeHtml(message.to);
  return {
    subject: `[contact] ${message.requestType} — ${message.caseId}`,
    html: [
      "<p>New contact request.</p>",
      `<p><strong>Case ID:</strong> ${caseId}<br>`,
      `<strong>Type:</strong> ${requestType}<br>`,
      `<strong>From:</strong> ${submitter}</p>`,
      "<p>Reply directly to the submitter. Management link was sent only to them.</p>",
    ].join("\n"),
    text: [
      "New contact request.",
      `Case ID: ${message.caseId}`,
      `Type: ${message.requestType}`,
      `From: ${message.to}`,
      "Reply directly to the submitter. Management link was sent only to them.",
    ].join("\n"),
  };
}

interface ResendSendResult {
  id?: string;
  message?: string;
  name?: string;
}

async function postResendEmail(
  options: ResendMailOptions,
  body: Record<string, unknown>,
): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let payload: ResendSendResult = {};
  try {
    payload = (await response.json()) as ResendSendResult;
  } catch {
    payload = {};
  }

  if (!response.ok || typeof payload.id !== "string" || payload.id.length === 0) {
    throw new Error("resend_send_failed");
  }
  return payload.id;
}

export class MockMailTransport implements MailTransport {
  readonly messages: ContactReceiptMessage[] = [];

  async sendContactReceipt(message: ContactReceiptMessage): Promise<MailReceipt> {
    this.messages.push(structuredClone(message));
    return { accepted: true, transportId: `mock-${this.messages.length}` };
  }
}

export class DisabledMailTransport implements MailTransport {
  async sendContactReceipt(_message: ContactReceiptMessage): Promise<never> {
    throw new Error("mail_transport_not_configured");
  }
}

export class ResendMailTransport implements MailTransport {
  private readonly options: ResendMailOptions;

  constructor(options: ResendMailOptions) {
    const apiKey = options.apiKey.trim();
    if (!apiKey) {
      throw new Error("mail_transport_not_configured");
    }
    const from = options.from.trim() || DEFAULT_MAIL_FROM;
    const notifyTo = options.notifyTo?.trim();
    this.options = {
      apiKey,
      from,
      ...(notifyTo ? { notifyTo } : {}),
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    };
  }

  async sendContactReceipt(message: ContactReceiptMessage): Promise<MailReceipt> {
    const receipt = buildReceiptContent(message);
    const transportId = await postResendEmail(this.options, {
      from: this.options.from,
      to: [message.to],
      subject: receipt.subject,
      html: receipt.html,
      text: receipt.text,
    });

    if (this.options.notifyTo) {
      const notify = buildOwnerNotifyContent(message);
      try {
        await postResendEmail(this.options, {
          from: this.options.from,
          to: [this.options.notifyTo],
          reply_to: [message.to],
          subject: notify.subject,
          html: notify.html,
          text: notify.text,
        });
      } catch {
        // Receipt already accepted by Resend; owner notify is best-effort.
        console.error(JSON.stringify({ event: "contact_owner_notify_failed" }));
      }
    }

    return { accepted: true, transportId };
  }
}

export function createMailTransportFromEnv(env: MailEnv): MailTransport {
  const apiKey = (env.RESEND_API_KEY ?? "").trim();
  if (!apiKey) {
    return new DisabledMailTransport();
  }
  const from = (env.MAIL_FROM ?? "").trim() || DEFAULT_MAIL_FROM;
  const notifyTo = (env.CONTACT_NOTIFY_TO ?? "").trim();
  return new ResendMailTransport({
    apiKey,
    from,
    ...(notifyTo ? { notifyTo } : {}),
  });
}
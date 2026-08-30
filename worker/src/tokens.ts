function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function createCaseId(): string {
  return `WHV-${crypto.randomUUID().replaceAll("-", "").toUpperCase()}`;
}

export function createManagementToken(): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashManagementToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToHex(digest);
}

export function addRetentionMonths(isoTimestamp: string, months = 24): string {
  const date = new Date(isoTimestamp);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString();
}

export function createManagementUrl(caseId: string, managementToken: string): string {
  const params = new URLSearchParams({ case: caseId, token: managementToken });
  return `https://www.aussiewhvcompass.com/about.html#contact-management?${params}`;
}

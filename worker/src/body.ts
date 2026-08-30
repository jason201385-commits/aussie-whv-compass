import { HttpError } from "./http";

export const MAX_JSON_BODY_BYTES = 16 * 1024;

export async function readBoundedJson(
  request: Request,
  maxBytes = MAX_JSON_BODY_BYTES,
): Promise<unknown> {
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "json_required", "Content-Type 必須是 application/json。");
  }

  const declaredLength = request.headers.get("Content-Length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (!Number.isFinite(parsedLength) || parsedLength < 0) {
      throw new HttpError(400, "invalid_content_length", "Content-Length 不合法。");
    }
    if (parsedLength > maxBytes) {
      throw new HttpError(413, "body_too_large", "送出的內容超過大小限制。");
    }
  }

  if (request.body === null) {
    throw new HttpError(400, "body_required", "請提供 JSON 內容。");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel("body too large");
      throw new HttpError(413, "body_too_large", "送出的內容超過大小限制。");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new HttpError(400, "invalid_encoding", "JSON 必須使用 UTF-8 編碼。");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpError(400, "invalid_json", "JSON 格式不正確。");
  }
}

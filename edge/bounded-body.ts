import { json } from "./auth";
export async function boundedBody(
  request: Request,
  limit: number,
): Promise<Request | Response> {
  if (!request.body || request.method === "GET" || request.method === "HEAD")
    return request;
  if (Number(request.headers.get("content-length") ?? 0) > limit)
    return json({ error: "Request is too large" }, 413);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return json({ error: "Request is too large" }, 413);
    }
    chunks.push(next.value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body,
    redirect: request.redirect,
  });
}

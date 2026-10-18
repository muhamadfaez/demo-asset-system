// Cloudflare resource-limit responses are HTML, not the application's JSON.
export async function jsonRequest<T extends { error?: string }>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(response.status >= 500 ? "The server is temporarily busy. Please wait a moment and try again." : "The request could not be completed. Refresh the page and try again.");
  }
  const result = await response.json() as T;
  if (!response.ok) throw new Error(result.error || "The request could not be completed.");
  return result;
}

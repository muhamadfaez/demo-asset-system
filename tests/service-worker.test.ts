import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

function worker() {
  const listeners: Record<string, (event: any) => void> = {};
  const cache = { match: vi.fn(), put: vi.fn(), keys: vi.fn().mockResolvedValue([]) };
  const caches = { open: vi.fn().mockResolvedValue(cache), match: vi.fn().mockResolvedValue(new Response("offline")) };
  const fetch = vi.fn().mockResolvedValue(new Response("private account data"));
  runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), { self: { location: { origin: "https://app.test" }, addEventListener: (name: string, listener: any) => { listeners[name] = listener; } }, caches, fetch, URL, Response });
  return { listeners, caches, cache, fetch };
}

describe("PWA private data handling", () => {
  it("never handles authentication/API requests or writes authenticated HTML into the cache", async () => {
    const { listeners, cache } = worker();
    const apiRespond = vi.fn();
    listeners.fetch({ request: { method: "GET", url: "https://app.test/api/auth/session", mode: "navigate" }, respondWith: apiRespond });
    expect(apiRespond).not.toHaveBeenCalled();
    let result: Promise<Response> | undefined;
    listeners.fetch({ request: { method: "GET", url: "https://app.test/dashboard", mode: "navigate" }, respondWith: (response: Promise<Response>) => { result = response; } });
    expect(await (await result!).text()).toBe("private account data");
    expect(cache.put).not.toHaveBeenCalled();
  });
  it("serves only a generic offline page when a navigation cannot reach the server", async () => {
    const { listeners, fetch, caches } = worker();
    fetch.mockRejectedValueOnce(new Error("offline"));
    let result: Promise<Response> | undefined;
    listeners.fetch({ request: { method: "GET", url: "https://app.test/assets", mode: "navigate" }, respondWith: (response: Promise<Response>) => { result = response; } });
    expect(await (await result!).text()).toBe("offline");
    expect(caches.match).toHaveBeenCalledWith("/offline.html");
  });
});

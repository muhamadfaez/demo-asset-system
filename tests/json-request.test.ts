import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonRequest } from "@/lib/json-request";

afterEach(() => vi.unstubAllGlobals());
describe("workflow server failures", () => {
  it("turns a Cloudflare HTML resource-limit response into a retry message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Worker exceeded resource limits</html>", { status: 503, headers: { "content-type": "text/html" } })));
    await expect(jsonRequest("/api/workflows/borrowings", {})).rejects.toThrow("temporarily busy");
  });
  it("retains application validation errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "A rejection reason is required." }, { status: 400 })));
    await expect(jsonRequest("/api/workflows/borrowings", {})).rejects.toThrow("A rejection reason is required.");
  });
  it("returns a successful JSON result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ success: true })));
    await expect(jsonRequest("/api/workflows/borrowings", {})).resolves.toEqual({ success: true });
  });
});

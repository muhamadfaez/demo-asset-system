import { beforeEach, describe, expect, it, vi } from "vitest";
const { settings } = vi.hoisted(() => ({ settings: vi.fn() }));
vi.mock("@/lib/settings", () => ({ getLoginSettings: settings }));
import { GET } from "@/app/manifest.webmanifest/route";

beforeEach(() => settings.mockResolvedValue({ pwaEnabled: "true", systemName: "Campus Assets", organisationName: "Assets", pwaName: "Old app name", pwaShortName: "Old short name", pwaDescription: "Campus register", pwaDisplay: "standalone", pwaOrientation: "portrait", pwaThemeColor: "#123456", pwaBackgroundColor: "#ffffff", appIconVersion: "123" }));

describe("installable app manifest", () => {
  it("uses the current system identity even when legacy PWA names differ", async () => {
    const response = await GET();
    const manifest = await response.json();
    expect(response.headers.get("Content-Type")).toBe("application/manifest+json");
    expect(manifest).toMatchObject({ name: "Campus Assets", short_name: "Assets", start_url: "/dashboard", scope: "/", display: "standalone", orientation: "portrait", theme_color: "#123456" });
    expect(manifest.icons).toContainEqual({ src: "/app-icon/512?v=123", sizes: "512x512", type: "image/png", purpose: "maskable" });
  });
  it("disables the manifest when the administrator turns off installation", async () => {
    settings.mockResolvedValue({ pwaEnabled: "false" });
    expect((await GET()).status).toBe(404);
  });
});

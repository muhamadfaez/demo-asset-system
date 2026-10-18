import { afterEach, describe, expect, it, vi } from "vitest";

const { context } = vi.hoisted(() => ({ context: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: context }));
import { getAuthEnvironment } from "@/lib/auth-environment";

afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });

describe("Worker authentication environment", () => {
  it("reads secrets from the current Worker request instead of capturing them at import", () => {
    context.mockReturnValue({ env: { AUTH_SECRET: "first" } });
    expect(getAuthEnvironment().secret).toBe("first");
    context.mockReturnValue({ env: { AUTH_SECRET: "second" } });
    expect(getAuthEnvironment().secret).toBe("second");
  });
  it("accepts standard Auth.js Google aliases even with empty legacy settings", () => {
    context.mockReturnValue({ env: { GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: " ", AUTH_GOOGLE_ID: "google-id", AUTH_GOOGLE_SECRET: "google-secret" } });
    expect(getAuthEnvironment()).toMatchObject({ clientId: "google-id", clientSecret: "google-secret" });
  });
  it("prefers runtime bindings over Node environment values", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "build-id");
    context.mockReturnValue({ env: { AUTH_GOOGLE_ID: "runtime-id" } });
    expect(getAuthEnvironment().clientId).toBe("runtime-id");
  });
  it("supports local Node development without a Cloudflare context", () => {
    context.mockImplementation(() => { throw new Error("No Worker context"); });
    vi.stubEnv("AUTH_SECRET", "local-secret");
    vi.stubEnv("GOOGLE_CLIENT_ID", "local-id");
    expect(getAuthEnvironment()).toMatchObject({ secret: "local-secret", clientId: "local-id" });
  });
});

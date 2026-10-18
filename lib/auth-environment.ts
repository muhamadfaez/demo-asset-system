import { getCloudflareContext } from "@opennextjs/cloudflare";

export function getAuthEnvironment() {
  let bindings: Record<string, unknown> = {};
  try {
    bindings = getCloudflareContext().env as unknown as Record<string, unknown>;
  } catch {
    // Local Next.js runs without a Worker request context.
  }
  const read = (...names: string[]): string | undefined => {
    for (const source of [bindings, process.env]) {
      for (const name of names) {
        const value = source[name];
        if (typeof value === "string" && value.trim()) return value.trim();
      }
    }
  };
  return {
    secret: read("AUTH_SECRET", "NEXTAUTH_SECRET"),
    clientId: read("GOOGLE_CLIENT_ID", "AUTH_GOOGLE_ID"),
    clientSecret: read("GOOGLE_CLIENT_SECRET", "AUTH_GOOGLE_SECRET"),
    superadminEmail: read("SUPERADMIN_EMAIL")
  };
}

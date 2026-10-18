import type { Database, EdgeUser } from "./types";

export function sessionToken(request: Request): string | undefined {
  const cookies = new Map(
    (request.headers.get("cookie") ?? "").split(";").map((part) => {
      const at = part.indexOf("=");
      return [part.slice(0, at).trim(), part.slice(at + 1)];
    }),
  );
  // Auth.js database sessions are opaque random tokens, not JWTs.
  const name =
    new URL(request.url).protocol === "https:"
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";
  const value = cookies.get(name);
  if (!value || value.length > 512) return;
  try {
    return decodeURIComponent(value);
  } catch {
    return;
  }
}

export async function authenticate(
  request: Request,
  db: Database,
): Promise<EdgeUser | null> {
  const token = sessionToken(request);
  if (!token) return null;
  const row = await db
    .prepare(
      `SELECT u.id, u.name, u.image, u.role, u.status, u.departmentId, s.expires
    FROM Session s JOIN User u ON u.id = s.userId WHERE s.sessionToken = ? LIMIT 1`,
    )
    .bind(token)
    .first<EdgeUser & { expires: string | number }>();
  if (!row) return null;
  const expiry =
    typeof row.expires === "number"
      ? row.expires
      : /^\d+$/.test(row.expires)
        ? Number(row.expires)
        : Date.parse(row.expires);
  if (!Number.isFinite(expiry) || expiry <= Date.now()) return null;
  if (!["SUPERADMIN", "ASSET_LIAISON", "USER"].includes(row.role)) return null;
  const { expires: _expires, ...user } = row;
  return user;
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function sameOrigin(request: Request): boolean {
  return (
    request.headers.get("origin") === new URL(request.url).origin &&
    request.headers.get("sec-fetch-site") !== "cross-site"
  );
}

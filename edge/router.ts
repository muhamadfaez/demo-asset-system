import { resourceError } from "./resource-error";
import { authenticate, json, sameOrigin, sessionToken } from "./auth";
import { searchUsers, transferData } from "./transfers-read";
import { writeTransfer } from "./transfers-write";
import type { EdgeEnv } from "./types";

export async function handleEdge(
  request: Request,
  env: EdgeEnv,
): Promise<Response | null> {
  const url = new URL(request.url);
  const data = url.pathname === "/api/edge/transfers";
  const write = url.pathname === "/api/workflows/transfers";
  const search = url.pathname === "/api/users/search";
  const logout = url.pathname === "/api/edge/logout";
  if (!data && !write && !search && !logout) return null;
  const methods = write ? ["POST", "PATCH"] : logout ? ["POST"] : ["GET"];
  if (!methods.includes(request.method))
    return json({ error: "Method not allowed" }, 405);
  if (request.method !== "GET" && !sameOrigin(request))
    return json({ error: "Invalid request origin" }, 403);
  try {
    if (logout) {
      const token = sessionToken(request);
      if (token) {
        try {
          await env.DB.prepare("DELETE FROM Session WHERE sessionToken=?")
            .bind(token)
            .all();
        } catch {
          console.error(
            "[edge] Session revocation unavailable; clearing the browser cookie.",
          );
        }
      }
      const response = json({ ok: true });
      const cookie =
        url.protocol === "https:"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token";
      response.headers.append(
        "Set-Cookie",
        `${cookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${url.protocol === "https:" ? "; Secure" : ""}`,
      );
      return response;
    }
    const user = await authenticate(request, env.DB);
    if (!user)
      return json({ error: "Sign in to continue", redirect: "/login" }, 401);
    if (user.status !== "ACTIVE")
      return json(
        {
          error: "Account is not active",
          redirect:
            user.status === "PENDING"
              ? "/pending"
              : user.status === "SUSPENDED"
                ? "/suspended"
                : "/unauthorized",
        },
        403,
      );
    if (data) return json(await transferData(env.DB, user, url));
    if (search)
      return json(
        await searchUsers(env.DB, user, url.searchParams.get("q") ?? ""),
      );
    return await writeTransfer(request, env.DB, user);
  } catch (error) {
    const limited = resourceError(error);
    if (limited) return limited;
    console.error(
      "[edge] Transfer request failed",
      error instanceof Error ? error.message : "Unknown database error",
    );
    return json(
      { error: "Unable to complete the request. Please try again." },
      500,
    );
  }
}

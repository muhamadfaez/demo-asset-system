import { systemSettingDefaults } from "../lib/settings";
import { boundedBody } from "./bounded-body";
import { resourceError } from "./resource-error";
import { authenticate, json, sameOrigin } from "./auth";
import { appContext, Navigation, type AppContext } from "./app-context";
import { createRepository } from "./d1-repository";
import { jsx, resolveUI } from "./ui-runtime";
import { NextRequest } from "./next-response";
import type { EdgeEnv } from "./types";

export function createApplication(
  pages: Record<string, any>,
  actions: Record<string, any>,
  routes: Record<string, any>,
  authHandlers: any,
  settingsReader: () => Promise<any>,
  notificationCount: (id: string) => Promise<number>,
) {
  function match(path: string) {
    if (Object.hasOwn(pages, path)) return { page: pages[path], params: {} };
    for (const [pattern, page] of Object.entries(pages)) {
      const names: string[] = [];
      const regex =
        "^" +
        pattern.replace(/\[([^\]]+)\]/g, (_all, name) => {
          names.push(name);
          return "([^/]+)";
        }) +
        "/?$";
      const found = path.match(new RegExp(regex));
      if (found)
        return {
          page,
          params: Object.fromEntries(
            names.map((name, i) => [name, decodeURIComponent(found[i + 1])]),
          ),
        };
    }
    return null;
  }
  return async function application(
    request: Request,
    env: EdgeEnv,
  ): Promise<Response> {
    const url = new URL(request.url);
    const isPage = url.pathname === "/api/edge/page";
    const isAction = url.pathname === "/api/edge/action";
    const isAuth = url.pathname.startsWith("/api/auth/");
    const isExport = url.pathname === "/api/edge/export";
    const isQR = url.pathname === "/api/edge/qr";
    let route = routes[url.pathname];
    let routeParams = {};
    if (!route)
      for (const [pattern, handlers] of Object.entries(routes)) {
        const names: string[] = [];
        const found = url.pathname.match(
          new RegExp(
            "^" +
              pattern.replace(/\[([^\]]+)\]/g, (_all, name) => {
                names.push(name);
                return "([^/]+)";
              }) +
              "$",
          ),
        );
        if (found) {
          route = handlers;
          routeParams = Object.fromEntries(
            names.map((name, i) => [name, found[i + 1]]),
          );
          break;
        }
      }
    const publicRoute =
      url.pathname.startsWith("/app-icon/") ||
      url.pathname === "/manifest.webmanifest";
    if (!isPage && !isAction && !isAuth && !isExport && !isQR && !route) {
      // Dynamic document URLs serve only the public shell. Data remains guarded.
      if (
        request.method === "GET" &&
        (match(url.pathname) ||
          /^\/api\/qr\/[^/]+$/.test(url.pathname) ||
          /^\/api\/reports\/assets\.(pdf|csv)$/.test(url.pathname))
      ) {
        return env.ASSETS.fetch(
          new Request(new URL("/_app-shell", url), request),
        );
      }
      return new Response("Not found", { status: 404 });
    }
    if ((isExport || isQR) && request.method !== "GET")
      return json({ error: "Method not allowed" }, 405);
    if (
      (isAction && request.method !== "POST") ||
      (isPage && request.method !== "GET")
    )
      return json({ error: "Method not allowed" }, 405);
    if (!isAuth && request.method !== "GET" && !sameOrigin(request))
      return json({ error: "Invalid request origin" }, 403);
    if (Number(request.headers.get("content-length") ?? 0) > 8 * 1024 * 1024)
      return json({ error: "Request too large" }, 413);
    const publicView =
      isPage &&
      [
        "/login",
        "/pending",
        "/suspended",
        "/unauthorized",
        "/not-found",
      ].includes(url.searchParams.get("path") ?? "");
    let user;
    try {
      user =
        publicRoute || publicView || isAuth
          ? null
          : await authenticate(request, env.DB);
    } catch (error) {
      return (
        resourceError(error) ??
        json({ error: "Unable to verify your session. Please try again." }, 503)
      );
    }
    const state: AppContext = {
      request,
      env,
      user,
      memo: new Map(),
      snapshots: new Map(),
    };
    return appContext.run(state, async () => {
      try {
        const db = createRepository(env.DB);
        if (user)
          state.user = await db.user.findUnique({ where: { id: user.id } });
        if (request.method !== "GET" && request.method !== "HEAD") {
          const settingsUpload =
            isAction &&
            state.user?.role === "SUPERADMIN" &&
            url.searchParams.get("id") ===
              "app/(app)/settings/actions.ts#saveSettings";
          const limited = await boundedBody(
            request,
            settingsUpload
              ? 8 * 1024 * 1024
              : url.pathname === "/api/assets/attachments"
                ? 2 * 1024 * 1024
                : 64 * 1024,
          );
          if (limited instanceof Response) return limited;
          request = limited;
        }
        if (isAuth) {
          const handler = authHandlers[request.method];
          return handler
            ? await handler(request)
            : json({ error: "Method not allowed" }, 405);
        }
        const path = isPage
          ? (url.searchParams.get("path") ?? "/dashboard")
          : "";
        const publicPage = publicView;
        if (!publicPage && !publicRoute) {
          if (!state.user)
            return json(
              { error: "Sign in to continue", redirect: "/login" },
              401,
            );
          if (state.user.status !== "ACTIVE")
            return json(
              {
                error: "Account is not active",
                redirect:
                  state.user.status === "PENDING"
                    ? "/pending"
                    : state.user.status === "SUSPENDED"
                      ? "/suspended"
                      : "/unauthorized",
              },
              403,
            );
        }
        if (isPage) {
          if (path === "/") return json({ redirect: "/dashboard" });
          const matched = match(path);
          if (!matched) return json({ error: "Page not found" }, 404);
          state.page = path;
          state.pageNumber =
            Math.max(
              1,
              Math.min(10000, Number(url.searchParams.get("p")) || 1),
            ) | 0;
          const query = Object.fromEntries(
            [...url.searchParams].filter(([key]) => key !== "path"),
          );
          const [tree, settings, unread] = await Promise.all([
            resolveUI(
              jsx(matched.page, {
                params: Promise.resolve(matched.params),
                searchParams: Promise.resolve(query),
              }),
            ),
            settingsReader().catch((error) => {
              if (publicPage) return { ...systemSettingDefaults };
              throw error;
            }),
            state.user ? notificationCount(state.user.id) : 0,
          ]);
          return json({
            tree,
            settings,
            publicPage,
            pagination: state.pagination,
            unreadNotifications: unread,
            user: state.user
              ? {
                  id: state.user.id,
                  name: state.user.name,
                  role: state.user.role,
                  image: state.user.image,
                }
              : null,
          });
        }
        if (isAction) {
          const id = url.searchParams.get("id") ?? "";
          const action = Object.hasOwn(actions, id) ? actions[id] : undefined;
          if (!action) return json({ error: "Unknown action" }, 404);
          const form = await request.formData();
          const args = JSON.parse(String(form.get("$args") ?? "[]"));
          if (!Array.isArray(args) || args.length > 4)
            return json({ error: "Invalid action arguments" }, 400);
          const decoded = args.map((arg) => {
            if (arg && typeof arg === "object" && Number.isInteger(arg.$form)) {
              const value = new FormData();
              const prefix = `${arg.$form}:`;
              for (const [name, field] of form)
                if (name.startsWith(prefix))
                  value.append(name.slice(prefix.length), field);
              return value;
            }
            return arg;
          });
          return json({ value: await action(...decoded) });
        }
        if (isExport || isQR) {
          const { can, assetScopeFor } = await import("../lib/permissions");
          if (
            !can(state.user as any, isExport ? "report:export" : "asset:read")
          )
            return json({ error: "Forbidden" }, 403);
          if (isQR) {
            const asset = await db.asset.findFirst({
              where: {
                AND: [
                  assetScopeFor(state.user as any),
                  { id: url.searchParams.get("id") ?? "" },
                ],
              },
              select: { id: true, tagNumber: true, name: true },
            });
            return asset
              ? json({ asset })
              : json({ error: "Asset not found" }, 404);
          }
          const skip =
            Math.max(
              0,
              Math.min(Number(url.searchParams.get("offset")) || 0, 1000000),
            ) | 0;
          const assets = await db.asset.findMany({
            where: assetScopeFor(state.user as any),
            select: {
              tagNumber: true,
              name: true,
              status: true,
              condition: true,
              borrowable: true,
              acquisitionCost: true,
              category: { select: { name: true } },
              department: { select: { name: true } },
              room: { select: { name: true } },
            },
            orderBy: [{ tagNumber: "asc" }, { id: "asc" }],
            take: 100,
            skip,
          });
          if (skip === 0)
            await db.auditLog.create({
              data: {
                userId: state.user!.id,
                action:
                  url.searchParams.get("format") === "pdf"
                    ? "EXPORT_PDF"
                    : "EXPORT_CSV",
                module: "Reports",
                recordType: "Asset",
              },
            });
          return json({
            assets,
            settings: await settingsReader(),
            hasMore: assets.length === 100,
          });
        }
        const handler = route?.[request.method];
        if (!handler) return json({ error: "Method not allowed" }, 405);
        const original: Response = await handler(new NextRequest(request), {
          params: Promise.resolve(routeParams),
        });
        const response = new Response(original.body, {
          status: original.status,
          statusText: original.statusText,
          headers: original.headers,
        });
        if (!publicRoute) {
          response.headers.set("Cache-Control", "private, no-store");
          response.headers.set("Vary", "Cookie");
        }
        return response;
      } catch (error) {
        const limited = resourceError(error);
        if (limited) return limited;
        if (error instanceof Navigation)
          return json(
            { redirect: error.destination },
            error.status === 404 ? 404 : 200,
          );
        const code = (error as any)?.code;
        if (code === "P2025")
          return json(
            { error: "This record changed. Refresh and try again." },
            409,
          );
        if (code === "P2002")
          return json({ error: "This value is already in use." }, 409);
        console.error(
          "[app] Request failed",
          error instanceof Error ? error.message : "Unknown error",
        );
        return json(
          { error: "Unable to complete the request. Please try again." },
          500,
        );
      }
    });
  };
}

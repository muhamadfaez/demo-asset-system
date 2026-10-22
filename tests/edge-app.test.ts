import { beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { edgeFixture } from "./helpers/edge-fixture";
import type { EdgeEnv } from "@/edge/types";
let app: (request: Request, env: EdgeEnv) => Promise<Response>;
let renderFixture: (tree: unknown) => Promise<string>;
let fixture: ReturnType<typeof edgeFixture>;
beforeAll(async () => {
  execFileSync(process.execPath, ["scripts/generate-edge-models.mjs"]);
  execFileSync(process.execPath, [
    "scripts/build-static-app.mjs",
    "--render-test",
  ]);
  renderFixture = (
    await import(
      /* @vite-ignore */ pathToFileURL(resolve(".edge-app/render-test.mjs"))
        .href
    )
  ).renderFixture;
  app = (
    await import(
      /* @vite-ignore */ pathToFileURL(resolve(".edge-app/app-handler.mjs"))
        .href
    )
  ).default;
}, 60000);
beforeEach(() => {
  fixture = edgeFixture();
});
afterEach(() => fixture.sqlite.close());
function request(path: string, user = "admin", init?: RequestInit) {
  return new Request(`https://test.invalid${path}`, {
    ...init,
    headers: {
      cookie: `__Secure-authjs.session-token=${user}-token`,
      origin: "https://test.invalid",
      accept: "application/json",
      ...init?.headers,
    },
  });
}
async function page(path: string, user = "admin") {
  const response = await app(
    request(`/api/edge/page?path=${encodeURIComponent(path)}`, user),
    fixture.env,
  );
  return { response, data: await response.json() };
}
const paths = [
  "/dashboard",
  "/assets",
  "/assets/new",
  "/assets/demo-asset-001",
  "/assets/demo-asset-001/edit",
  "/borrowings",
  "/maintenance",
  "/incidents",
  "/verification",
  "/disposal",
  "/reports",
  "/search",
  "/notifications",
  "/profile",
  "/users",
  "/master-data",
  "/settings",
  "/qr-scanner",
  "/audit-logs",
  "/login",
  "/pending",
  "/suspended",
  "/unauthorized",
  "/not-found",
];
describe("all-page native application", () => {
  it.each(paths)(
    "loads %s for a synthetic administrator without SSR or Prisma",
    async (path) => {
      const { response, data } = await page(path);
      expect(response.status, JSON.stringify(data)).toBe(200);
      expect(data.tree, JSON.stringify(data)).toBeDefined();
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(JSON.stringify(data)).not.toContain("admin-token");
    },
  );
  it.each([
    "/dashboard",
    "/assets",
    "/borrowings",
    "/maintenance",
    "/incidents",
    "/profile",
    "/notifications",
    "/reports",
    "/verification",
    "/search",
  ])(
    "loads or correctly restricts %s for normal and liaison roles",
    async (path) => {
      for (const role of ["user", "liaison"]) {
        const { response, data } = await page(path, role);
        expect(response.status, JSON.stringify(data)).toBe(200);
        expect(Boolean(data.tree) || data.redirect === "/unauthorized").toBe(
          true,
        );
        if (path === "/assets" && role === "user") {
          expect(JSON.stringify(data)).toContain("Demo Lenovo");
          expect(JSON.stringify(data)).not.toContain("Demo Dell");
        }
      }
    },
  );
  it("keeps administration, another asset, and exports out of a normal user's scope", async () => {
    for (const path of [
      "/settings",
      "/users",
      "/master-data",
      "/assets/demo-asset-001/edit",
      "/audit-logs",
    ])
      expect((await page(path, "user")).data.redirect).toBe("/unauthorized");
    expect(
      JSON.stringify((await page("/assets/demo-asset-001", "user")).data),
    ).not.toContain("Demo Dell");
    expect(
      (await app(request("/api/edge/export", "user"), fixture.env)).status,
    ).toBe(403);
  });
  it("requires sessions for private DTOs but keeps login and static shells public", async () => {
    expect((await page("/dashboard", "missing")).response.status).toBe(401);
    expect((await page("/login", "missing")).response.status).toBe(200);
    const response = await app(
      request("/assets/demo-asset-001", "missing"),
      fixture.env,
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("public static app shell");
    fixture.sqlite.exec("UPDATE User SET status='PENDING' WHERE id='user'");
    expect((await page("/dashboard", "user")).data.redirect).toBe("/pending");
  });
  async function action(
    id: string,
    fields: Record<string, string>,
    user = "admin",
    single = false,
  ) {
    const form = new FormData();
    form.set(
      "$args",
      JSON.stringify(
        single ? [{ $form: 0 }] : [{ status: "idle" }, { $form: 1 }],
      ),
    );
    for (const [key, value] of Object.entries(fields))
      form.set(`${single ? 0 : 1}:${key}`, value);
    const response = await app(
      request(`/api/edge/action?id=${encodeURIComponent(id)}`, user, {
        method: "POST",
        body: form,
      }),
      fixture.env,
    );
    return { response, data: await response.json() };
  }
  async function api(
    path: string,
    body: unknown,
    user = "admin",
    method = "POST",
  ) {
    const response = await app(
      request(path, user, {
        method,
        body: body instanceof FormData ? body : JSON.stringify(body),
        ...(body instanceof FormData
          ? {}
          : { headers: { "content-type": "application/json" } }),
      }),
      fixture.env,
    );
    return { response, data: await response.json() };
  }
  it("saves personal details, rejects role escalation and retains user-management permissions", async () => {
    const saved = await action(
      "app/(app)/profile/actions.ts#updateMyProfile",
      {
        position: "Synthetic Lecturer",
        phone: "0123456789",
        staffNo: "TEST-01",
      },
      "user",
    );
    expect(saved.data.value.status, JSON.stringify(saved.data)).toBe("success");
    expect(
      fixture.sqlite.prepare("SELECT position FROM User WHERE id='user'").get()!
        .position,
    ).toBe("Synthetic Lecturer");
    const blocked = await action(
      "app/(app)/users/actions.ts#updateUserAccount",
      { userId: "user", role: "SUPERADMIN", intent: "activate" },
      "user",
    );
    expect(blocked.data.value.status).toBe("error");
    expect(
      fixture.sqlite.prepare("SELECT role FROM User WHERE id='user'").get()!
        .role,
    ).toBe("USER");
    const changed = await action(
      "app/(app)/users/actions.ts#updateUserAccount",
      {
        userId: "other",
        role: "USER",
        intent: "suspend",
        reason: "Synthetic review",
      },
    );
    expect(changed.data.value.status, JSON.stringify(changed.data)).toBe(
      "success",
    );
    expect(
      fixture.sqlite.prepare("SELECT status FROM User WHERE id='other'").get()!
        .status,
    ).toBe("SUSPENDED");
  });
  it("creates reference records and saves settings through a real atomic batch", async () => {
    const created = await action(
      "app/(app)/reference-data/actions.ts#saveReferenceData",
      { kind: "supplier", name: "Synthetic Supplier", active: "true" },
    );
    expect(created.data.value.status, JSON.stringify(created.data)).toBe(
      "success",
    );
    expect(
      fixture.sqlite
        .prepare(
          "SELECT COUNT(*) n FROM Supplier WHERE name='Synthetic Supplier'",
        )
        .get()!.n,
    ).toBe(1);
    const data = (await page("/settings")).data;
    const saved = await action("app/(app)/settings/actions.ts#saveSettings", {
      ...data.settings,
      systemName: "Synthetic Updated System",
    });
    expect(saved.data.value.status, JSON.stringify(saved.data)).toBe("success");
    expect(
      fixture.sqlite
        .prepare("SELECT value FROM SystemSetting WHERE key='systemName'")
        .get()!.value,
    ).toBe("Synthetic Updated System");
    expect((await page("/settings")).data.settings.systemName).toBe(
      "Synthetic Updated System",
    );
  });
  it("handles notification actions only inside the signed-in user's inbox", async () => {
    fixture.sqlite.exec(
      "INSERT INTO Notification(id,userId,title,message,href) VALUES ('mine','user','Mine','Test','/assets'),('theirs','other','Private','Test','/users')",
    );
    await action(
      "app/(app)/notifications/actions.ts#markNotificationRead",
      { id: "theirs" },
      "user",
      true,
    );
    expect(
      fixture.sqlite
        .prepare("SELECT readAt FROM Notification WHERE id='theirs'")
        .get()!.readAt,
    ).toBeNull();
    const opened = await action(
      "app/(app)/notifications/actions.ts#openNotification",
      { id: "mine" },
      "user",
      true,
    );
    expect(opened.data.redirect).toBe("/assets");
    expect(
      fixture.sqlite
        .prepare("SELECT readAt FROM Notification WHERE id='mine'")
        .get()!.readAt,
    ).not.toBeNull();
  });
  it("creates and edits assets using the same validation and field audit triggers", async () => {
    const fields = {
      name: "Synthetic created asset",
      acquisitionCost: "10",
      categoryId: "demo-cat-computer",
      departmentId: "demo-cs",
      roomId: "demo-lab",
      condition: "GOOD",
      status: "DRAFT",
      borrowable: "true",
      assetType: "INVENTORY",
    };
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => form.set(k, v));
    const created = await api("/api/assets", form);
    expect(created.response.status, JSON.stringify(created.data)).toBe(201);
    fixture.sqlite
      .prepare("UPDATE Asset SET custodianId='admin' WHERE id=?")
      .run(created.data.asset.id);
    form.set("id", created.data.asset.id);
    form.set("name", "Synthetic edited asset");
    const edited = await api("/api/assets", form, "admin", "PATCH");
    expect(edited.response.status, JSON.stringify(edited.data)).toBe(200);
    expect(edited.data.asset.name).toBe("Synthetic edited asset");
    expect(edited.data.asset.custodianId).toBe("admin");
    expect(
      fixture.sqlite
        .prepare(
          "SELECT COUNT(*) n FROM AuditLog WHERE recordId=? AND newValues LIKE '%Synthetic edited asset%'",
        )
        .get(created.data.asset.id)!.n,
    ).toBeGreaterThan(0);
  });
  it("runs borrowing approval, checkout and return atomically with Date/Boolean hydration", async () => {
    const made = await api(
      "/api/workflows/borrowings",
      {
        assetId: "demo-asset-001",
        purpose: "Synthetic laboratory session",
        startDate: new Date(Date.now() + 86400000).toISOString(),
        expectedReturnAt: new Date(Date.now() + 172800000).toISOString(),
      },
      "user",
    );
    expect(made.response.status, JSON.stringify(made.data)).toBe(201);
    for (const decision of ["approve", "checkout", "return"]) {
      const result = await api(
        "/api/workflows/borrowings",
        { id: made.data.borrowing.id, decision },
        "admin",
        "PATCH",
      );
      expect(result.response.status, JSON.stringify(result.data)).toBe(200);
    }
    expect(
      fixture.sqlite
        .prepare("SELECT status FROM BorrowingRequest WHERE id=?")
        .get(made.data.borrowing.id)!.status,
    ).toBe("RETURNED");
    expect(
      fixture.sqlite
        .prepare("SELECT status FROM Asset WHERE id='demo-asset-001'")
        .get()!.status,
    ).toBe("AVAILABLE");
  });
  it("runs maintenance, incidents and verification through the native API", async () => {
    const made = await api(
      "/api/workflows/maintenance",
      {
        assetId: "demo-asset-004",
        issueCategory: "Hardware",
        description: "Synthetic broken keyboard",
        priority: "Medium",
        type: "Corrective",
      },
      "user",
    );
    expect(made.response.status, JSON.stringify(made.data)).toBe(201);
    for (const action of ["approve", "start", "complete"]) {
      const result = await api(
        "/api/workflows/maintenance",
        {
          id: made.data.maintenance.id,
          action,
          resolution: "Synthetic replacement completed",
          actualCost: 10,
        },
        "admin",
        "PATCH",
      );
      expect(result.response.status, JSON.stringify(result.data)).toBe(200);
    }
    const incident = await api(
      "/api/workflows/incidents",
      {
        assetId: "demo-asset-004",
        type: "Damaged",
        description: "Synthetic incident description",
        location: "Test office",
        discoveredAt: new Date(Date.now() - 1000).toISOString(),
      },
      "user",
    );
    expect(incident.response.status, JSON.stringify(incident.data)).toBe(201);
    fixture.sqlite.exec(
      "INSERT INTO VerificationCampaign(id,name,startDate,endDate) VALUES ('campaign','Synthetic check',0,4102444800000)",
    );
    const form = new FormData();
    form.set("assetId", "demo-asset-001");
    form.set("campaignId", "campaign");
    form.set("result", "FOUND");
    const verified = await api("/api/workflows/verification", form);
    expect(verified.response.status, JSON.stringify(verified.data)).toBe(200);
    expect(
      fixture.sqlite
        .prepare(
          "SELECT verificationResult FROM Asset WHERE id='demo-asset-001'",
        )
        .get()!.verificationResult,
    ).toBe("FOUND");
  });
  it("serves scoped export data and QR data while keeping public PWA endpoints available", async () => {
    const exported = await app(request("/api/edge/export"), fixture.env);
    const data = await exported.json();
    expect(exported.status, JSON.stringify(data)).toBe(200);
    expect(data.assets).toHaveLength(10);
    const denied = await app(
      request("/api/edge/qr?id=demo-asset-001", "user"),
      fixture.env,
    );
    expect(denied.status).toBe(404);
    const allowed = await app(
      request("/api/edge/qr?id=demo-asset-004", "user"),
      fixture.env,
    );
    expect(allowed.status).toBe(200);
    expect(
      (await app(request("/manifest.webmanifest", "missing"), fixture.env))
        .status,
    ).toBe(200);
    expect(
      (await app(request("/app-icon/192", "missing"), fixture.env)).status,
    ).toBe(307);
  });
  it("uses Auth.js core for providers, CSRF and the existing database session", async () => {
    for (const endpoint of ["providers", "csrf", "session"]) {
      const response = await app(request(`/api/auth/${endpoint}`), fixture.env);
      const data = await response.json();
      expect(response.status, JSON.stringify(data)).toBe(200);
      if (endpoint === "session") expect(data.user.id).toBe("admin");
    }
  });
  it.each([
    "/assets/new",
    "/assets/demo-asset-001/edit",
    "/profile",
    "/settings",
    "/master-data",
    "/users",
    "/borrowings",
    "/maintenance",
    "/login",
  ])(
    "renders the actual browser controls and decoded props for %s",
    async (path) => {
      const { data } = await page(
        path,
        path === "/borrowings" ? "user" : "admin",
      );
      const html = await renderFixture(data.tree);
      expect(html).not.toContain("Unknown browser component");
      if (path === "/assets/new")
        expect(html).toContain("Capture the manufacturer serial barcode");
      else expect(html).toContain("<form");
      if (path.includes("/edit")) expect(html).toContain("Assigned To");
      if (path === "/login") expect(html).toContain("Continue with Google");
    },
  );

  it("returns a clear reset time when the daily D1 allowance is exhausted", async () => {
    fixture.env.DB.prepare = () => {
      throw new Error(
        "D1_ERROR: Your account has exceeded D1's free tier daily row read limit.",
      );
    };
    const { response, data } = await page("/dashboard");
    expect(response.status).toBe(503);
    expect(data.code).toBe("DAILY_DATABASE_LIMIT");
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(new Date(data.retryAt).getUTCHours()).toBe(0);
  });
  it("splits reviewer notifications to respect D1's 100-parameter limit", async () => {
    for (let n = 0; n < 25; n++)
      fixture.sqlite
        .prepare(
          "INSERT INTO User(id,name,email,role,status,updatedAt) VALUES (?,?,?,'SUPERADMIN','ACTIVE',0)",
        )
        .run(
          "reviewer-" + n,
          "Synthetic reviewer",
          "reviewer" + n + "@example.invalid",
        );
    const result = await api(
      "/api/workflows/incidents",
      {
        assetId: "demo-asset-004",
        type: "Damaged",
        description: "Synthetic bulk notification test",
        location: "Test office",
        discoveredAt: new Date(Date.now() - 1000).toISOString(),
      },
      "user",
    );
    expect(result.response.status, JSON.stringify(result.data)).toBe(201);
    expect(
      fixture.sqlite
        .prepare(
          "SELECT COUNT(*) n FROM Notification WHERE title='Asset incident reported'",
        )
        .get()!.n,
    ).toBe(26);
  });

  it("rolls back a borrowing decision when its asset write fails", async () => {
    const made = await api(
      "/api/workflows/borrowings",
      {
        assetId: "demo-asset-001",
        purpose: "Synthetic rollback check",
        startDate: new Date(Date.now() + 86400000).toISOString(),
        expectedReturnAt: new Date(Date.now() + 172800000).toISOString(),
      },
      "user",
    );
    await api(
      "/api/workflows/borrowings",
      { id: made.data.borrowing.id, decision: "approve" },
      "admin",
      "PATCH",
    );
    fixture.sqlite.exec(
      "CREATE TRIGGER fail_checkout BEFORE UPDATE ON Asset WHEN NEW.status='BORROWED' BEGIN SELECT RAISE(ABORT,'synthetic rollback'); END",
    );
    const result = await api(
      "/api/workflows/borrowings",
      { id: made.data.borrowing.id, decision: "checkout" },
      "admin",
      "PATCH",
    );
    expect(result.response.status).toBe(500);
    expect(
      fixture.sqlite
        .prepare("SELECT status FROM BorrowingRequest WHERE id=?")
        .get(made.data.borrowing.id)!.status,
    ).toBe("APPROVED");
    expect(
      fixture.sqlite
        .prepare("SELECT status FROM Asset WHERE id='demo-asset-001'")
        .get()!.status,
    ).toBe("AVAILABLE");
  });
  it("paginates assignment history while keeping exact lifetime and personal counts", async () => {
    for (let n = 0; n < 60; n++)
      fixture.sqlite
        .prepare(
          "INSERT INTO AssetAssignment(id,assetId,assignedUserId,assignedById,purpose,assignmentDate) VALUES (?,'demo-asset-004','user','admin',?,?)",
        )
        .run("history-" + n, "Synthetic purpose " + n, n);
    const first = (await page("/assets/demo-asset-004")).data;
    const firstHTML = await renderFixture(first.tree);
    expect(firstHTML).toContain("Synthetic purpose 59");
    expect(firstHTML).not.toContain("Synthetic purpose 0");
    const response = await app(
      request("/api/edge/page?path=/assets/demo-asset-004&p=3"),
      fixture.env,
    );
    const last = await response.json();
    const lastHTML = await renderFixture(last.tree);
    expect(lastHTML).toContain("Synthetic purpose 0");
    expect(lastHTML).not.toContain("Synthetic purpose 59");
    const personal = (await page("/assets/demo-asset-004", "user")).data;
    const text = (await renderFixture(personal.tree)).replace(/<[^>]*>/g, "");
    expect(text).toContain("My assignments60");
    expect(JSON.stringify(personal)).not.toContain("Synthetic purpose");
  });
  it("bounds streamed mutation bodies and rejects unregistered action names", async () => {
    const oversized = await api(
      "/api/workflows/incidents",
      { description: "x".repeat(70000) },
      "user",
    );
    expect(oversized.response.status).toBe(413);
    const unknown = await action("constructor", {});
    expect(unknown.response.status).toBe(404);
  });
});

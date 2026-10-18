import type {
  DatabaseSync as SQLiteDatabase,
  SQLInputValue,
} from "node:sqlite";
import { createRequire } from "node:module";
const { DatabaseSync } = createRequire(import.meta.url)(
  "node:sqlite",
) as typeof import("node:sqlite");
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleEdge } from "@/edge/router";
import type { Database, EdgeEnv, Statement } from "@/edge/types";

let sqlite: SQLiteDatabase;
let env: EdgeEnv;
let beforeBatch: (() => void) | undefined;
function statement(sql: string, values: unknown[] = []): Statement {
  const args = () => values.map((value) => value ?? null) as SQLInputValue[];
  return {
    bind(...bound) {
      return statement(sql, bound);
    },
    async first<T>() {
      return (sqlite.prepare(sql).get(...args()) ?? null) as T | null;
    },
    async all<T>() {
      const results = sqlite.prepare(sql).all(...args()) as T[];
      const changes = sqlite.prepare("SELECT changes() AS n").get()!
        .n as number;
      return { results, meta: { changes } };
    },
  };
}
beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync("prisma/baseline.sql", "utf8"));
  for (const [id, role] of [
    ["admin", "SUPERADMIN"],
    ["user", "USER"],
    ["other", "USER"],
    ["liaison", "ASSET_LIAISON"],
  ]) {
    sqlite
      .prepare(
        "INSERT INTO User(id,name,email,role,status,updatedAt) VALUES (?,?,?,?,'ACTIVE',0)",
      )
      .run(id, id, `${id}@example.invalid`, role);
    sqlite
      .prepare(
        "INSERT INTO Session(id,sessionToken,userId,expires) VALUES (?,?,?,?)",
      )
      .run(id, `${id}-token`, id, Date.now() + 3600000);
  }
  sqlite.exec(readFileSync("prisma/demo-data.sql", "utf8"));
  sqlite.exec(
    readFileSync(
      "prisma/migrations/202610180001_asset_audit_records/migration.sql",
      "utf8",
    ),
  );
  sqlite.exec(
    "UPDATE User SET departmentId='demo-is' WHERE id='user'; UPDATE User SET departmentId='demo-cs' WHERE id IN ('liaison','other'); UPDATE Asset SET custodianId='admin' WHERE id='demo-asset-001'",
  );
  sqlite.exec(
    readFileSync(
      "prisma/migrations/202610190001_worker_transfer_indexes/migration.sql",
      "utf8",
    ),
  );
  beforeBatch = undefined;
  const db: Database = {
    prepare: statement,
    async batch(statements) {
      beforeBatch?.();
      beforeBatch = undefined;
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const item of statements) results.push(await item.all());
        sqlite.exec("COMMIT");
        return results as Awaited<ReturnType<Database["batch"]>>;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  env = { DB: db, ASSETS: { fetch: async () => new Response("public shell") } };
});
afterEach(() => sqlite.close());
function request(
  path: string,
  method = "GET",
  body?: unknown,
  user = "admin",
  origin = "https://test.invalid",
) {
  return new Request(`https://test.invalid${path}`, {
    method,
    headers: {
      cookie: `__Secure-authjs.session-token=${user}-token`,
      origin,
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function call(
  path: string,
  method = "GET",
  body?: unknown,
  user = "admin",
  origin?: string,
) {
  const response = (await handleEdge(
    request(path, method, body, user, origin),
    env,
  ))!;
  return { response, body: await response.json() };
}
async function submit(assetId = "demo-asset-001", user = "admin", extra = {}) {
  return call(
    "/api/workflows/transfers",
    "POST",
    {
      assetId,
      transferType: "LOCATION",
      newRoomId: "demo-office",
      reason: "Moving to the new office",
      ...extra,
    },
    user,
  );
}
async function decide(
  id: string,
  decision = "approve",
  user = "admin",
  extra = {},
) {
  return call(
    "/api/workflows/transfers",
    "PATCH",
    { id, decision, ...extra },
    user,
  );
}
const count = (table: string) =>
  sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()!.n;

describe("free-tier native transfer path", () => {
  it("indexes pending-transfer checks instead of scanning transfer history for each asset", () => {
    const plan = sqlite
      .prepare(
        "EXPLAIN QUERY PLAN SELECT 1 FROM AssetTransfer WHERE assetId=? AND status IN ('SUBMITTED','PENDING_APPROVAL')",
      )
      .all("demo-asset-001");
    expect(plan.map((row) => row.detail).join(" ")).toContain(
      "AssetTransfer_assetId_status_idx",
    );
  });
  it("does not handle unrelated Next routes", async () => {
    expect(await handleEdge(request("/api/assets"), env)).toBeNull();
  });
  it("requires a valid secure database session and rejects expired, disabled and malformed sessions", async () => {
    expect(
      (await call("/api/edge/transfers", "GET", undefined, "missing")).response
        .status,
    ).toBe(401);
    sqlite.exec("UPDATE Session SET expires=0 WHERE userId='admin'");
    expect((await call("/api/edge/transfers")).response.status).toBe(401);
    sqlite
      .prepare("UPDATE Session SET expires=? WHERE userId='admin'")
      .run(new Date(Date.now() + 3600000).toISOString());
    expect((await call("/api/edge/transfers")).response.status).toBe(200);
    sqlite.exec("UPDATE User SET status='SUSPENDED' WHERE id='admin'");
    const blocked = await call("/api/edge/transfers");
    expect(blocked.response.status).toBe(403);
    expect(blocked.body.redirect).toBe("/suspended");
    const malformed = new Request("https://test.invalid/api/edge/transfers", {
      headers: {
        cookie:
          "__Secure-authjs.session-token=%GG; authjs.session-token=user-token",
      },
    });
    expect((await handleEdge(malformed, env))!.status).toBe(401);
  });
  it("rejects cross-origin writes and unsupported methods before accessing records", async () => {
    expect(
      (
        await call(
          "/api/workflows/transfers",
          "POST",
          {},
          "admin",
          "https://attacker.invalid",
        )
      ).response.status,
    ).toBe(403);
    expect((await call("/api/workflows/transfers")).response.status).toBe(405);
    expect(count("AssetTransfer")).toBe(0);
  });
  it("uses role-scoped, minimal, uncacheable DTOs and search", async () => {
    const normal = await call("/api/edge/transfers", "GET", undefined, "user");
    expect(normal.body.assets.map((a: { id: string }) => a.id)).toEqual([
      "demo-asset-004",
    ]);
    expect(normal.body.user.email).toBeUndefined();
    expect(normal.response.headers.get("cache-control")).toContain("no-store");
    const liaison = await call(
      "/api/edge/transfers",
      "GET",
      undefined,
      "liaison",
    );
    expect(
      liaison.body.assets.some(
        (a: { id: string }) => a.id === "demo-asset-003",
      ),
    ).toBe(false);
    const users = await call(
      "/api/users/search?q=us",
      "GET",
      undefined,
      "liaison",
    );
    expect(users.body.users).toEqual([]);
    expect(
      (await call("/api/users/search?q=ot", "GET", undefined, "liaison")).body
        .users[0].id,
    ).toBe("other");
    expect(
      (await call("/api/users/search?q=%27%20OR%201%3D1--")).body.users,
    ).toEqual([]);
  });
  it("submits once and approves atomically, preserving accountable custody and preventing replay", async () => {
    const created = await submit("demo-asset-001", "admin", {
      transferType: "BOTH",
      newCustodianId: "other",
    });
    expect(created.response.status).toBe(201);
    expect((await submit()).response.status).toBe(409);
    const id = created.body.transfer.id;
    const approved = await decide(id);
    expect(approved.response.status).toBe(200);
    expect(
      sqlite
        .prepare(
          "SELECT roomId,assignedUserId,custodianId,status,borrowable FROM Asset WHERE id='demo-asset-001'",
        )
        .get(),
    ).toEqual({
      roomId: "demo-office",
      assignedUserId: "other",
      custodianId: "admin",
      status: "ASSIGNED",
      borrowable: 0,
    });
    expect(count("AssetAssignment")).toBe(1);
    const notices = count("Notification"),
      audits = count("AuditLog");
    expect((await decide(id)).response.status).toBe(409);
    expect(count("Notification")).toBe(notices);
    expect(count("AuditLog")).toBe(audits);
    expect(count("AssetAssignment")).toBe(1);
    expect(
      sqlite
        .prepare(
          "SELECT COUNT(*) n FROM AuditLog WHERE module='Transfers' AND action='APPROVE'",
        )
        .get()!.n,
    ).toBe(1);
  });
  it("enforces requester cancellation, department review scope and rejection reasons", async () => {
    const created = await submit();
    const id = created.body.transfer.id;
    expect((await decide(id, "cancel", "user")).response.status).toBe(403);
    expect((await decide(id, "approve", "user")).response.status).toBe(403);
    expect((await decide(id, "reject")).response.status).toBe(400);
    expect(
      (await decide(id, "reject", "admin", { reason: "No longer required" }))
        .response.status,
    ).toBe(200);
    expect(
      sqlite
        .prepare("SELECT roomId FROM Asset WHERE id='demo-asset-001'")
        .get()!.roomId,
    ).toBe("demo-lab");
    const personal = await submit("demo-asset-004", "user", {
      newRoomId: "demo-store",
    });
    expect(personal.response.status).toBe(201);
    expect(
      (await decide(personal.body.transfer.id, "approve", "liaison")).response
        .status,
    ).toBe(403);
    expect(
      (await decide(personal.body.transfer.id, "cancel", "user")).response
        .status,
    ).toBe(200);
  });
  it("refuses stale assets and targets, including a change between validation and the atomic batch", async () => {
    const created = await submit();
    sqlite.exec(
      "UPDATE Asset SET roomId='demo-store' WHERE id='demo-asset-001'",
    );
    expect((await decide(created.body.transfer.id)).response.status).toBe(409);
    sqlite.exec("UPDATE Asset SET roomId='demo-lab' WHERE id='demo-asset-001'");
    beforeBatch = () =>
      sqlite.exec("UPDATE Room SET active=0 WHERE id='demo-office'");
    expect((await decide(created.body.transfer.id)).response.status).toBe(409);
    expect(
      sqlite
        .prepare("SELECT status FROM AssetTransfer WHERE id=?")
        .get(created.body.transfer.id)!.status,
    ).toBe("PENDING_APPROVAL");
    expect(
      sqlite
        .prepare("SELECT roomId FROM Asset WHERE id='demo-asset-001'")
        .get()!.roomId,
    ).toBe("demo-lab");
  });
  it("rolls back the transfer and asset if a later audit write fails", async () => {
    const created = await submit();
    sqlite.exec(
      "CREATE TRIGGER fail_transfer_audit BEFORE INSERT ON AuditLog WHEN NEW.module='Transfers' AND NEW.action='APPROVE' BEGIN SELECT RAISE(ABORT,'test rollback'); END",
    );
    const notices = count("Notification");
    expect((await decide(created.body.transfer.id)).response.status).toBe(500);
    expect(
      sqlite
        .prepare("SELECT status FROM AssetTransfer WHERE id=?")
        .get(created.body.transfer.id)!.status,
    ).toBe("PENDING_APPROVAL");
    expect(
      sqlite
        .prepare("SELECT roomId FROM Asset WHERE id='demo-asset-001'")
        .get()!.roomId,
    ).toBe("demo-lab");
    expect(count("Notification")).toBe(notices);
  });
  it("bounds payloads and excludes borrowed or inaccessible assets", async () => {
    expect((await submit("demo-asset-005")).response.status).toBe(409);
    expect((await submit("demo-asset-001", "user")).response.status).toBe(404);
    expect((await submit("demo-asset-003", "liaison")).response.status).toBe(
      404,
    );
    expect(
      (
        await submit("demo-asset-001", "liaison", {
          transferType: "BOTH",
          newCustodianId: "user",
        })
      ).response.status,
    ).toBe(403);
    expect(
      (await submit("demo-asset-001", "admin", { reason: "x".repeat(9000) }))
        .response.status,
    ).toBe(413);
    const invalid = request("/api/workflows/transfers", "POST", {});
    expect(
      (await handleEdge(new Request(invalid, { body: "{broken" }), env))!
        .status,
    ).toBe(400);
  });
  it("paginates history deterministically and counts all scoped records", async () => {
    for (let i = 0; i < 25; i++)
      sqlite
        .prepare(
          "INSERT INTO AssetTransfer(id,transferNumber,assetId,currentLocation,newLocation,reason,requestedById,status,createdAt) VALUES (?,?,'demo-asset-001','demo-lab','demo-store','test history','admin','COMPLETED',?)",
        )
        .run(`history-${i}`, `TR-${i}`, i % 2 ? i : new Date(i).toISOString());
    const first = (await call("/api/edge/transfers")).body;
    const second = (await call("/api/edge/transfers?page=1")).body;
    expect(first.transfers).toHaveLength(20);
    expect(second.transfers).toHaveLength(5);
    expect(first.counts.completed).toBe(25);
    expect(first.counts.total).toBe(25);
    expect(
      new Set([...first.transfers, ...second.transfers].map((t) => t.id)).size,
    ).toBe(25);
    expect(
      (await call("/api/edge/transfers", "GET", undefined, "user")).body.counts
        .total,
    ).toBe(0);
  });
  it("revokes only the current session on logout", async () => {
    expect((await call("/api/edge/logout", "POST")).response.status).toBe(200);
    expect((await call("/api/edge/transfers")).response.status).toBe(401);
    expect(
      (await call("/api/edge/transfers", "GET", undefined, "user")).response
        .status,
    ).toBe(200);
  });
});

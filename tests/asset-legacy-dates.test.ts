import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { NextRequest } from "next/server";
const state = vi.hoisted(() => ({ client: null as PrismaClient | null }));
vi.mock("@/lib/prisma", () => ({
  prisma: new Proxy(
    {},
    {
      get(_target, key) {
        const value = Reflect.get(state.client!, key, state.client);
        return typeof value === "function" ? value.bind(state.client) : value;
      },
    },
  ),
}));
vi.mock("@/lib/auth", () => ({
  auth: async () => ({
    user: { id: "admin", role: "SUPERADMIN", status: "ACTIVE" },
  }),
}));
vi.mock("@/lib/settings", () => ({
  getSystemSettings: async () => ({ assetTagPrefix: "IRKHS" }),
}));
import { getLatestAuditLogs } from "@/lib/asset-audit-log";
import { assetSearchFilter } from "@/lib/asset-search-db";
import { PATCH } from "@/app/api/assets/route";
beforeAll(() => {
  const folder = mkdtempSync(join(tmpdir(), "asset-legacy-date-"));
  const database = join(folder, "test.db");
  // Only synthetic demo fixtures, in a newly created disposable database.
  execFileSync("python", [
    "-c",
    `
import sqlite3, sys
from pathlib import Path
db=sqlite3.connect(sys.argv[1])
db.executescript(Path('prisma/baseline.sql').read_text(encoding='utf-8'))
for uid,role in [('admin','SUPERADMIN'),('user','USER')]:
 db.execute('INSERT INTO User (id,name,email,role,status,updatedAt) VALUES (?,?,?,?,?,?)',(uid,uid,uid+'@example.invalid',role,'ACTIVE',0))
db.commit()
db.executescript(Path('prisma/demo-data.sql').read_text(encoding='utf-8'))
db.executescript(Path('prisma/migrations/202610180001_asset_audit_records/migration.sql').read_text(encoding='utf-8'))
db.close()
`,
    database,
  ]);
  state.client = new PrismaClient({
    adapter: new PrismaLibSQL(
      { url: `file:${database.replaceAll("\\", "/")}` },
      { timestampFormat: "unixepoch-ms" },
    ),
  });
});
afterAll(async () => {
  await state.client?.$disconnect();
});
it("edits legacy demo records with ISO-text timestamps through the actual Prisma adapter and audits the change", async () => {
  const data = new FormData();
  Object.entries({
    id: "demo-asset-001",
    name: "Demo updated legacy asset",
    acquisitionCost: "4200",
    categoryId: "demo-cat-computer",
    departmentId: "demo-cs",
    roomId: "demo-lab",
    condition: "GOOD",
    status: "AVAILABLE",
    borrowable: "true",
    acquisitionDate: "2025-01-15",
    brandName: "Regression test brand",
  }).forEach(([key, value]) => data.set(key, value));
  const response = await PATCH(
    new NextRequest("http://localhost/api/assets", {
      method: "PATCH",
      body: data,
    }),
  );
  expect(response.status).toBe(200);
  const asset = await state.client!.asset.findUniqueOrThrow({
    where: { id: "demo-asset-001" },
  });
  expect(asset.name).toBe("Demo updated legacy asset");
  expect(asset.updatedAt).toBeInstanceOf(Date);
  const log = await state.client!.auditLog.findFirst({
    where: {
      recordId: asset.id,
      newValues: { contains: "Regression test brand" },
    },
  });
  expect(log?.userId).toBe("admin");
  expect(JSON.parse(log!.newValues!)).toEqual({
    brandName: "Regression test brand",
  });
});

it("searches purchase dates across legacy text and newer millisecond records", async () => {
  const count = await state.client!.asset.count({
    where: await assetSearchFilter("2025-01-15"),
  });
  expect(count).toBe(10);
});

it("shows new field audits ahead of older ISO-text audit timestamps", async () => {
  await state.client!.$executeRaw`
  INSERT INTO AuditLog (id, userId, action, module, recordType, success, createdAt)
  VALUES ('old-text-audit', 'admin', 'CREATE', 'Assets', 'Asset', 1, '2020-01-01T00:00:00.000Z')
 `;
  const logs = await getLatestAuditLogs();
  expect(logs[0].id).not.toBe("old-text-audit");
  expect(logs[logs.length - 1].id).toBe("old-text-audit");
});

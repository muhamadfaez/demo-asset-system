import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import type { SQLInputValue } from "node:sqlite";
import type { EdgeEnv, Statement } from "@/edge/types";
const { DatabaseSync } = createRequire(import.meta.url)(
  "node:sqlite",
) as typeof import("node:sqlite");
export function edgeFixture() {
  const sqlite = new DatabaseSync(":memory:");
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
    readFileSync(
      "prisma/migrations/202610190001_worker_transfer_indexes/migration.sql",
      "utf8",
    ),
  );
  sqlite.exec(
    readFileSync(
      "prisma/migrations/202610190002_app_query_indexes/migration.sql",
      "utf8",
    ),
  );
  sqlite.exec(
    "UPDATE User SET departmentId='demo-is' WHERE id='user'; UPDATE User SET departmentId='demo-cs' WHERE id IN ('liaison','other')",
  );
  function statement(sql: string, values: unknown[] = []): Statement {
    const args = () => values.map((value) => value ?? null) as SQLInputValue[];
    return {
      bind(...bound) {
        if (bound.length > 100) throw new Error("D1 bound-parameter limit");
        return statement(sql, bound);
      },
      async first<T>() {
        return (sqlite.prepare(sql).get(...args()) ?? null) as T | null;
      },
      async all<T>() {
        const results = sqlite.prepare(sql).all(...args()) as T[];
        return {
          results,
          meta: {
            changes: sqlite.prepare("SELECT changes() AS n").get()!.n as number,
          },
        };
      },
    };
  }
  const env: EdgeEnv = {
    DB: {
      prepare: statement,
      async batch(statements) {
        sqlite.exec("BEGIN");
        try {
          const results = [];
          for (const statement of statements)
            results.push(await statement.all());
          sqlite.exec("COMMIT");
          return results as any;
        } catch (error) {
          sqlite.exec("ROLLBACK");
          throw error;
        }
      },
    },
    ASSETS: {
      fetch: async () =>
        new Response("public static app shell", {
          headers: { "content-type": "text/html" },
        }),
    },
  };
  Object.assign(env, {
    AUTH_SECRET: "synthetic-test-secret-012345678901234567890123456789",
    GOOGLE_CLIENT_ID: "synthetic-client",
    GOOGLE_CLIENT_SECRET: "synthetic-secret",
  });
  return { env, sqlite };
}

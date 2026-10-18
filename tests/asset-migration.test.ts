import { execFileSync } from "node:child_process";
import { it, expect } from "vitest";
it("migrates demo assets, enforces atomic field audits, and rolls back without losing assets", () => {
  expect(
    execFileSync("python", ["tests/asset-migration-check.py"], {
      encoding: "utf8",
    }),
  ).toContain("rollback passed");
});

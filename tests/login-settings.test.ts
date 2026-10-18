import { afterEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { systemSetting: { findMany } } }));

import { getLoginSettings, getSystemSettings, systemSettingDefaults } from "@/lib/settings";

afterEach(() => vi.restoreAllMocks());

describe("login branding during database setup", () => {
  it("renders default branding when D1 tables are unavailable", async () => {
    findMany.mockRejectedValueOnce(new Error("D1_ERROR: no such table: SystemSetting"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await getLoginSettings()).toEqual(systemSettingDefaults);
    expect(log).toHaveBeenCalled();
  });

  it("uses configured branding when the database is available", async () => {
    findMany.mockResolvedValueOnce([{ key: "organisationName", value: "Test Kulliyyah" }]);
    expect((await getLoginSettings()).organisationName).toBe("Test Kulliyyah");
  });

  it("keeps database failures visible to protected settings consumers", async () => {
    findMany.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(getSystemSettings()).rejects.toThrow("database unavailable");
  });
});

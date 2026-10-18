import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@prisma/client";
const db = vi.hoisted(() => ({ asset: { findMany: vi.fn() }, user: { findMany: vi.fn() }, notification: { findMany: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
import { searchWorkspace } from "@/lib/workspace-search";
const user = { id: "u1", role: "USER", status: "ACTIVE", departmentId: "d1" } as User;
beforeEach(() => { vi.clearAllMocks(); Object.values(db).forEach((model) => model.findMany.mockResolvedValue([])); });

describe("workspace search access", () => {
  it("limits a user's assets and notifications to their own scope and never searches people", async () => {
    await searchWorkspace(user, "laptop");
    expect(db.asset.findMany.mock.calls[0][0].where.AND[0]).toEqual({ OR: [{ assignedUserId: "u1" }, { assignments: { some: { assignedUserId: "u1" } } }] });
    expect(db.notification.findMany.mock.calls[0][0].where.userId).toBe("u1");
    expect(db.user.findMany).not.toHaveBeenCalled();
  });
  it("limits liaison assets to their department", async () => {
    await searchWorkspace({ ...user, role: "ASSET_LIAISON" }, "laptop");
    expect(db.asset.findMany.mock.calls[0][0].where.AND[0]).toEqual({ departmentId: "d1" });
    expect(db.user.findMany).not.toHaveBeenCalled();
  });
  it("allows administrators to search the people directory", async () => {
    await searchWorkspace({ ...user, role: "SUPERADMIN" }, "staff");
    expect(db.user.findMany).toHaveBeenCalledOnce();
  });
  it("does not query records for inactive accounts or empty searches", async () => {
    await searchWorkspace({ ...user, status: "PENDING" }, "laptop");
    await searchWorkspace(user, " ");
    expect(db.asset.findMany).not.toHaveBeenCalled();
  });
});

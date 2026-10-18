import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const { auth, db } = vi.hoisted(() => ({
  auth: vi.fn(),
  db: {
    asset: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    department: { findUnique: vi.fn() },
    room: { findUnique: vi.fn() },
    user: { findFirst: vi.fn() },
    supplier: { findUnique: vi.fn() },
    fundingSource: { findUnique: vi.fn() },
    assetAssignment: { findFirst: vi.fn() },
    notification: { create: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/settings", () => ({
  getSystemSettings: async () => ({ assetTagPrefix: "IRKHS" }),
}));
import { POST, PATCH } from "@/app/api/assets/route";
const base = {
  name: "Demo asset",
  acquisitionCost: "10",
  categoryId: "cat",
  departmentId: "dep",
  roomId: "room",
  condition: "GOOD",
  status: "DRAFT",
  borrowable: "true",
  assetType: "INVENTORY",
};
function request(method: string, fields: Record<string, string>) {
  const body = new FormData();
  Object.entries(fields).forEach(([k, v]) => body.set(k, v));
  return new NextRequest("http://localhost/api/assets", {
    method,
    headers: { Accept: "application/json" },
    body,
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  auth.mockResolvedValue({
    user: { id: "admin", role: "SUPERADMIN", status: "ACTIVE" },
  });
  db.department.findUnique.mockResolvedValue({
    id: "dep",
    kulliyyahId: "derived-k",
    active: true,
    kulliyyah: { active: true },
  });
  db.room.findUnique.mockResolvedValue({
    id: "room",
    active: true,
    floor: {
      active: true,
      buildingId: "derived-b",
      building: { active: true, campus: { active: true } },
    },
  });
  db.asset.create.mockImplementation(async ({ data }) => ({
    id: "new",
    ...data,
  }));
  db.asset.update.mockImplementation(async ({ data }) => ({
    id: "existing",
    ...data,
  }));
  db.asset.findUnique.mockResolvedValue({
    id: "existing",
    tagNumber: "DEMO-001",
    departmentId: "dep",
    kulliyyahId: "derived-k",
    roomId: "room",
    buildingId: "derived-b",
    status: "DRAFT",
    assignedUserId: null,
  });
});
describe("asset API safeguards", () => {
  it("generates tags and derives location parents from server records", async () => {
    const r = await POST(
      request("POST", {
        ...base,
        tagNumber: "FORGED",
        kulliyyahId: "fake",
        buildingId: "fake",
      }),
    );
    expect(r.status).toBe(201);
    expect(db.asset.create.mock.calls[0][0].data).toMatchObject({
      tagNumber: expect.stringMatching(/^IRKHS-/),
      kulliyyahId: "derived-k",
      buildingId: "derived-b",
    });
  });
  it("locks the tag on edit", async () => {
    expect(
      (
        await PATCH(
          request("PATCH", { ...base, id: "existing", tagNumber: "FORGED" }),
        )
      ).status,
    ).toBe(200);
    expect(db.asset.update.mock.calls[0][0].data.tagNumber).toBe("DEMO-001");
  });
  it("blocks manual disposal and workflow-owned assignment changes", async () => {
    expect(
      (await POST(request("POST", { ...base, status: "DISPOSED" }))).status,
    ).toBe(400);
    db.asset.findUnique.mockResolvedValue({
      id: "existing",
      tagNumber: "DEMO-001",
      departmentId: "dep",
      status: "BORROWED",
      assignedUserId: null,
    });
    expect(
      (
        await PATCH(
          request("PATCH", { ...base, id: "existing", status: "AVAILABLE" }),
        )
      ).status,
    ).toBe(400);
    expect(db.asset.update).not.toHaveBeenCalled();
  });
  it("rejects a liaison moving an asset outside their department", async () => {
    auth.mockResolvedValue({
      user: {
        id: "liaison",
        role: "ASSET_LIAISON",
        status: "ACTIVE",
        departmentId: "other",
      },
    });
    expect((await POST(request("POST", base))).status).toBe(403);
    expect(db.asset.create).not.toHaveBeenCalled();
  });
  it("validates fixed procurement on the server", async () => {
    const r = await POST(
      request("POST", { ...base, assetType: "FIXED_ASSET" }),
    );
    expect(r.status).toBe(400);
    expect(db.asset.create).not.toHaveBeenCalled();
  });
  it("rejects assigned AVAILABLE assets on the server", async () => {
    expect(
      (
        await POST(
          request("POST", {
            ...base,
            status: "AVAILABLE",
            assignedUserId: "user",
          }),
        )
      ).status,
    ).toBe(400);
    expect(db.asset.create).not.toHaveBeenCalled();
  });
  it("rejects missing and inactive locations", async () => {
    db.room.findUnique.mockResolvedValue(null);
    expect((await POST(request("POST", base))).status).toBe(400);
    db.room.findUnique.mockResolvedValue({
      active: false,
      floor: {
        active: true,
        buildingId: "b",
        building: { active: true, campus: { active: true } },
      },
    });
    expect((await POST(request("POST", base))).status).toBe(400);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const { auth, db, binding } = vi.hoisted(() => ({
  auth: vi.fn(),
  binding: vi.fn(),
  db: {
    asset: { findFirst: vi.fn(), update: vi.fn() },
    assetDocument: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    verificationCampaign: { findUnique: vi.fn() },
    assetVerification: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/cloudflare-db", () => ({ getD1Binding: binding }));
vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
import {
  POST as upload,
  GET as download,
  DELETE as remove,
} from "@/app/api/assets/attachments/route";
import { POST as verify } from "@/app/api/workflows/verification/route";
function formRequest(url: string, fields: Record<string, string | Blob>) {
  const body = new FormData();
  Object.entries(fields).forEach(([key, value]) => body.set(key, value));
  return new NextRequest(`http://localhost${url}`, { method: "POST", body });
}
beforeEach(() => {
  vi.resetAllMocks();
  auth.mockResolvedValue({
    user: {
      id: "liaison",
      role: "ASSET_LIAISON",
      status: "ACTIVE",
      departmentId: "dep",
    },
  });
  db.asset.findFirst.mockResolvedValue({
    id: "a",
    departmentId: "dep",
    kulliyyahId: "k",
  });
});
describe("supporting records and verification permissions", () => {
  it("rejects ordinary users before uploading or verifying", async () => {
    auth.mockResolvedValue({
      user: { id: "u", role: "USER", status: "ACTIVE" },
    });
    expect(
      (await upload(formRequest("/api/assets/attachments", {}))).status,
    ).toBe(403);
    expect(
      (await verify(formRequest("/api/workflows/verification", {}))).status,
    ).toBe(403);
    expect(db.assetDocument.create).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("scopes document uploads to the liaison department", async () => {
    db.asset.findFirst.mockResolvedValue(null);
    expect(
      (
        await upload(
          formRequest("/api/assets/attachments", {
            assetId: "other",
            typeLabel: "INVOICE",
            file: new Blob(["pdf"], { type: "application/pdf" }),
          }),
        )
      ).status,
    ).toBe(404);
    expect(db.asset.findFirst.mock.calls[0][0].where.AND).toContainEqual({
      departmentId: "dep",
    });
    expect(db.assetDocument.create).not.toHaveBeenCalled();
  });
  it("stores attachment bytes and the uploading actor", async () => {
    db.assetDocument.create.mockResolvedValue({
      id: "doc",
      fileName: "blob",
      typeLabel: "INVOICE",
    });
    const r = await upload(
      formRequest("/api/assets/attachments", {
        assetId: "a",
        typeLabel: "INVOICE",
        file: new Blob(["pdf"], { type: "application/pdf" }),
      }),
    );
    expect(r.status).toBe(201);
    expect(db.assetDocument.create.mock.calls[0][0].data).toMatchObject({
      assetId: "a",
      contentBase64: "cGRm",
      uploadedById: "liaison",
      typeLabel: "INVOICE",
    });
  });
  it("scopes downloads and keeps their responses private", async () => {
    db.assetDocument.findFirst.mockResolvedValue({
      contentBase64: "cGRm",
      mimeType: "application/pdf",
      fileName: "invoice.pdf",
    });
    const r = await download(
      new NextRequest("http://localhost/api/assets/attachments?id=doc"),
    );
    expect(r.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await r.text()).toBe("pdf");
    expect(db.assetDocument.findFirst.mock.calls[0][0].where.asset).toEqual({
      departmentId: "dep",
    });
  });
  it("records the removing actor before deletion", async () => {
    db.assetDocument.findFirst.mockResolvedValue({ id: "doc" });
    expect(
      (
        await remove(
          new NextRequest("http://localhost/api/assets/attachments?id=doc", {
            method: "DELETE",
          }),
        )
      ).status,
    ).toBe(200);
    expect(db.assetDocument.update).toHaveBeenCalledWith({
      where: { id: "doc" },
      data: { uploadedById: "liaison" },
    });
    expect(db.assetDocument.delete).toHaveBeenCalledWith({
      where: { id: "doc" },
    });
  });
  it("uses a single D1 atomic batch to attribute and remove a document", async () => {
    db.assetDocument.findFirst.mockResolvedValue({ id: "doc" });
    const bind = vi.fn().mockReturnValue({ statement: true });
    const prepare = vi.fn().mockReturnValue({ bind });
    const batch = vi.fn().mockResolvedValue([]);
    binding.mockReturnValue({ prepare, batch });
    const response = await remove(
      new NextRequest("http://localhost/api/assets/attachments?id=doc", {
        method: "DELETE",
      }),
    );
    expect(response.status).toBe(200);
    expect(batch).toHaveBeenCalledWith([
      { statement: true },
      { statement: true },
    ]);
    expect(bind.mock.calls).toEqual([["liaison", "doc"], ["doc"]]);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("rejects verification campaigns outside the asset organisation", async () => {
    db.verificationCampaign.findUnique.mockResolvedValue({
      id: "campaign",
      departmentId: "other",
    });
    expect(
      (
        await verify(
          formRequest("/api/workflows/verification", {
            assetId: "a",
            campaignId: "campaign",
            result: "FOUND",
          }),
        )
      ).status,
    ).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("inserts the verified actor and result for the atomic summary trigger", async () => {
    db.verificationCampaign.findUnique.mockResolvedValue({
      id: "campaign",
      departmentId: "dep",
      kulliyyahId: "k",
    });
    expect(
      (
        await verify(
          formRequest("/api/workflows/verification", {
            assetId: "a",
            campaignId: "campaign",
            result: "WRONG_LOCATION",
          }),
        )
      ).status,
    ).toBe(200);
    expect(db.assetVerification.create.mock.calls[0][0].data).toMatchObject({
      verifierId: "liaison",
      status: "WRONG_LOCATION",
      assetId: "a",
      checkedAt: expect.any(Date),
    });
    expect(db.asset.update).not.toHaveBeenCalled();
  });
});

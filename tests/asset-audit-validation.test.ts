import { describe, it, expect } from "vitest";
import { assetSchema } from "@/lib/validation";
import {
  validateAttachment,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/asset-attachments";
import { assetSearch } from "@/lib/asset-search";
const base = {
  name: "Demo asset",
  acquisitionCost: "12.50",
  categoryId: "c",
  departmentId: "d",
  roomId: "r",
  condition: "GOOD",
  status: "DRAFT",
  borrowable: "true",
};
describe("audit asset validation", () => {
  it("keeps legacy inventory valid and ignores forged derived locations", () => {
    const r = assetSchema.parse({
      ...base,
      kulliyyahId: "forged",
      buildingId: "forged",
    });
    expect(r.assetType).toBe("INVENTORY");
    expect(r).not.toHaveProperty("kulliyyahId");
    expect(r).not.toHaveProperty("buildingId");
  });
  it("requires fixed asset procurement, with a specific legacy waiver", () => {
    const r = assetSchema.safeParse({ ...base, assetType: "FIXED_ASSET" });
    expect(r.success).toBe(false);
    if (!r.success)
      expect(Object.keys(r.error.flatten().fieldErrors)).toEqual(
        expect.arrayContaining([
          "purchaseOrderNumber",
          "invoiceNumber",
          "supplierId",
          "acquisitionDate",
        ]),
      );
    expect(
      assetSchema.safeParse({
        ...base,
        assetType: "FIXED_ASSET",
        legacyRecordReason: "Imported paper register",
      }).success,
    ).toBe(true);
    expect(
      assetSchema.safeParse({
        ...base,
        assetType: "FIXED_ASSET",
        legacyRecordReason: "   ",
      }).success,
    ).toBe(false);
  });
  it.each(["", "-1", "Infinity", "abc"])(
    "rejects invalid RM cost %s",
    (acquisitionCost) => {
      expect(assetSchema.safeParse({ ...base, acquisitionCost }).success).toBe(
        false,
      );
    },
  );
  it("accepts zero cost and complete fixed asset records", () => {
    expect(
      assetSchema.safeParse({
        ...base,
        assetType: "FIXED_ASSET",
        acquisitionCost: "0",
        purchaseOrderNumber: "PO-1",
        invoiceNumber: "INV-1",
        supplierId: "s",
        acquisitionDate: "2020-01-01",
        receivedDate: "2020-01-02",
      }).success,
    ).toBe(true);
  });
  it.each([
    { acquisitionDate: "2099-01-01" },
    { receivedDate: "2099-01-01" },
    { acquisitionDate: "2020-02-30" },
    { acquisitionDate: "2020-01-02", receivedDate: "2020-01-01" },
    { warrantyStartDate: "2020-02-01", warrantyExpiryDate: "2020-01-01" },
  ])("rejects invalid dates %j", (dates) => {
    expect(assetSchema.safeParse({ ...base, ...dates }).success).toBe(false);
  });
  it("rejects an AVAILABLE asset with Assigned To", () => {
    const r = assetSchema.safeParse({
      ...base,
      status: "AVAILABLE",
      assignedUserId: "u",
    });
    expect(r.success).toBe(false);
    if (!r.success)
      expect(r.error.flatten().fieldErrors.status?.[0]).toContain(
        "cannot be AVAILABLE",
      );
  });
  it("cannot forge verification fields", () => {
    expect(
      assetSchema.parse({
        ...base,
        verifiedById: "fake",
        verificationResult: "FOUND",
      }),
    ).not.toHaveProperty("verifiedById");
  });
  it("limits upload sizes and types", () => {
    expect(
      validateAttachment(
        { size: MAX_ATTACHMENT_BYTES, type: "application/pdf" },
        "INVOICE",
      ),
    ).toBeNull();
    expect(
      validateAttachment(
        { size: MAX_ATTACHMENT_BYTES + 1, type: "application/pdf" },
        "INVOICE",
      ),
    ).toBeTruthy();
    expect(
      validateAttachment({ size: 1, type: "image/svg+xml" }, "PHOTO"),
    ).toBeTruthy();
    expect(
      validateAttachment({ size: 1, type: "application/pdf" }, "fake"),
    ).toBeTruthy();
  });
  it("searches P.O., vendor and exact purchase dates", () => {
    expect(JSON.stringify(assetSearch("PO-1"))).toContain(
      "purchaseOrderNumber",
    );
    expect(JSON.stringify(assetSearch("Supplier"))).toContain("supplier");
    expect(JSON.stringify(assetSearch("2020-01-01"))).toContain(
      "acquisitionDate",
    );
  });
});

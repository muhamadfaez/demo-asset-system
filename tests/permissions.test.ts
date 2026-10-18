import { describe, expect, it } from "vitest";
import { AccountStatus, AssetStatus, RequestStatus, RoleName } from "@prisma/client";
import { assetScopeFor, can, canAccessAsset, canAccessModule, canRequestAsset, cannotApproveOwnRequest, isBorrowable } from "@/lib/permissions";
import { assetSchema, borrowingDecisionSchema, borrowingSchema, maintenanceActionSchema, systemSettingsSchema, transferSchema, userAccountActionSchema } from "@/lib/validation";
import { canTransitionBorrowing } from "@/lib/borrowing";
import { canTransferAsset, canTransitionTransfer } from "@/lib/transfer";
import { canMaintainAsset, canTransitionMaintenance } from "@/lib/maintenance";
import { borrowableForAssignment, statusForAssignment } from "@/lib/asset-assignment";

const activeSuper = { role: RoleName.SUPERADMIN, status: AccountStatus.ACTIVE };
const activeLiaison = { id: "liaison", role: RoleName.ASSET_LIAISON, status: AccountStatus.ACTIVE, departmentId: "d1" };
const activeUser = { id: "user", role: RoleName.USER, status: AccountStatus.ACTIVE, departmentId: "d2" };

describe("permissions", () => {
  it("allows Superadmin full access", () => {
    expect(can(activeSuper, "settings:manage")).toBe(true);
    expect(can(activeSuper, "audit:view")).toBe(true);
  });

  it("restricts Asset Liaison to assigned department assets", () => {
    expect(canAccessAsset(activeLiaison, { departmentId: "d1", assignedUserId: null, status: AssetStatus.AVAILABLE })).toBe(true);
    expect(canAccessAsset(activeLiaison, { departmentId: "d2", assignedUserId: null, status: AssetStatus.AVAILABLE })).toBe(false);
  });

  it("restricts the personal asset register to assigned assets", () => {
    expect(canAccessAsset(activeUser, { departmentId: "d1", assignedUserId: "user", status: AssetStatus.ASSIGNED })).toBe(true);
    expect(canAccessAsset(activeUser, { departmentId: "d1", assignedUserId: null, status: AssetStatus.AVAILABLE })).toBe(false);
    expect(canAccessAsset(activeUser, { departmentId: "d1", assignedUserId: "other", status: AssetStatus.ASSIGNED })).toBe(false);
  });

  it("separates personal asset visibility from borrowing eligibility", () => {
    expect(canRequestAsset(activeUser, { departmentId: "d1", status: AssetStatus.AVAILABLE, borrowable: true })).toBe(true);
    expect(canRequestAsset(activeUser, { departmentId: "d1", status: AssetStatus.AVAILABLE, borrowable: false })).toBe(false);
    expect(canRequestAsset(activeUser, { departmentId: "d1", status: AssetStatus.ASSIGNED, borrowable: true })).toBe(false);
  });

  it("blocks inactive accounts", () => {
    expect(can({ role: RoleName.SUPERADMIN, status: AccountStatus.SUSPENDED }, "asset:create")).toBe(false);
  });

  it("keeps administrative modules hidden from regular users", () => {
    expect(canAccessModule(RoleName.USER, "notifications")).toBe(true);
    expect(canAccessModule(RoleName.USER, "reports")).toBe(false);
    expect(canAccessModule(RoleName.USER, "users")).toBe(false);
    expect(canAccessModule(RoleName.USER, "settings")).toBe(false);
    expect(canAccessModule(RoleName.USER, "transfers")).toBe(true);
    expect(canAccessModule(RoleName.ASSET_LIAISON, "reports")).toBe(true);
    expect(canAccessModule(RoleName.ASSET_LIAISON, "audit")).toBe(false);
  });

  it("allows active users to request asset transfers", () => {
    expect(can(activeUser, "transfer:create")).toBe(true);
    expect(can(activeUser, "transfer:approve")).toBe(false);
  });

  it("allows users to report maintenance but not manage it", () => {
    expect(can(activeUser, "maintenance:create")).toBe(true);
    expect(can(activeUser, "maintenance:manage")).toBe(false);
  });

  it("builds role-specific asset query scopes", () => {
    expect(assetScopeFor(activeSuper as typeof activeSuper & { id: string })).toEqual({});
    expect(assetScopeFor(activeLiaison)).toEqual({ departmentId: "d1" });
    expect(assetScopeFor(activeUser)).toEqual({ OR: [{ assignedUserId: "user" }, { assignments: { some: { assignedUserId: "user" } } }] });
  });

  it("prevents approving own request", () => {
    expect(cannotApproveOwnRequest("u1", "u1")).toBe(false);
    expect(cannotApproveOwnRequest("u1", "u2")).toBe(true);
  });
});

describe("business rules", () => {
  it("rejects unavailable assets for borrowing", () => {
    expect(isBorrowable(AssetStatus.DISPOSED)).toBe(false);
    expect(isBorrowable(AssetStatus.UNDER_MAINTENANCE)).toBe(false);
    expect(isBorrowable(AssetStatus.ASSIGNED)).toBe(false);
    expect(isBorrowable(AssetStatus.AVAILABLE)).toBe(true);
  });

  it("parses the asset borrowable flag", () => {
    const base = { tagNumber: "KICT-99", name: "Test asset", acquisitionCost: "100", categoryId: "c1", departmentId: "d1", kulliyyahId: "k1", buildingId: "b1", roomId: "r1", condition: "GOOD", status: "AVAILABLE" };
    const yes = assetSchema.safeParse({ ...base, borrowable: "true" });
    const no = assetSchema.safeParse({ ...base, borrowable: "false" });
    expect(yes.success && yes.data.borrowable).toBe(true);
    expect(no.success && no.data.borrowable).toBe(false);
  });

  it("accepts only a selected assignee database ID", () => {
    const base = { tagNumber: "KICT-99", name: "Test asset", acquisitionCost: "100", categoryId: "c1", departmentId: "d1", kulliyyahId: "k1", buildingId: "b1", roomId: "r1", condition: "GOOD", status: "AVAILABLE", borrowable: "true" };
    const parsed = assetSchema.safeParse({ ...base, assignedUserId: "user-database-id" });
    expect(parsed.success && parsed.data.assignedUserId).toBe("user-database-id");
  });

  it("keeps asset status consistent with assignment changes", () => {
    expect(statusForAssignment(AssetStatus.AVAILABLE, "u1")).toBe(AssetStatus.ASSIGNED);
    expect(statusForAssignment(AssetStatus.UNDER_MAINTENANCE, "u1")).toBe(AssetStatus.ASSIGNED);
    expect(statusForAssignment(AssetStatus.DISPOSED, "u1")).toBe(AssetStatus.ASSIGNED);
    expect(statusForAssignment(AssetStatus.ASSIGNED, null)).toBe(AssetStatus.AVAILABLE);
  });

  it("makes assigned assets non-borrowable", () => {
    expect(borrowableForAssignment(true, "u1")).toBe(false);
    expect(borrowableForAssignment(false, "u1")).toBe(false);
    expect(borrowableForAssignment(true, null)).toBe(true);
  });

  it("allows only valid borrowing lifecycle transitions", () => {
    expect(canTransitionBorrowing(RequestStatus.PENDING_APPROVAL, "approve")).toBe(true);
    expect(canTransitionBorrowing(RequestStatus.APPROVED, "checkout")).toBe(true);
    expect(canTransitionBorrowing(RequestStatus.CHECKED_OUT, "return")).toBe(true);
    expect(canTransitionBorrowing(RequestStatus.REJECTED, "checkout")).toBe(false);
    expect(borrowingDecisionSchema.safeParse({ id: "r1", decision: "delete" }).success).toBe(false);
  });

  it("allows transfer decisions only while awaiting review", () => {
    expect(canTransitionTransfer(RequestStatus.PENDING_APPROVAL, "approve")).toBe(true);
    expect(canTransitionTransfer(RequestStatus.SUBMITTED, "reject")).toBe(true);
    expect(canTransitionTransfer(RequestStatus.PENDING_APPROVAL, "cancel")).toBe(true);
    expect(canTransitionTransfer(RequestStatus.COMPLETED, "approve")).toBe(false);
  });

  it("validates transfer destinations and asset eligibility", () => {
    expect(transferSchema.safeParse({ assetId: "a1", transferType: "LOCATION", newRoomId: "r2", reason: "Move to the new office" }).success).toBe(true);
    expect(transferSchema.safeParse({ assetId: "a1", transferType: "CUSTODIAN", reason: "Change responsible user" }).success).toBe(false);
    expect(canTransferAsset(AssetStatus.ASSIGNED)).toBe(true);
    expect(canTransferAsset(AssetStatus.BORROWED)).toBe(false);
    expect(canTransferAsset(AssetStatus.DISPOSED)).toBe(false);
  });

  it("enforces the maintenance lifecycle", () => {
    expect(canTransitionMaintenance(RequestStatus.PENDING_APPROVAL, "approve")).toBe(true);
    expect(canTransitionMaintenance(RequestStatus.APPROVED, "start")).toBe(true);
    expect(canTransitionMaintenance(RequestStatus.IN_PROGRESS, "complete")).toBe(true);
    expect(canTransitionMaintenance(RequestStatus.COMPLETED, "close")).toBe(true);
    expect(canTransitionMaintenance(RequestStatus.REJECTED, "start")).toBe(false);
    expect(canMaintainAsset(AssetStatus.ASSIGNED)).toBe(true);
    expect(canMaintainAsset(AssetStatus.DISPOSED)).toBe(false);
    expect(maintenanceActionSchema.safeParse({ id: "m1", action: "delete" }).success).toBe(false);
  });

  it("rejects return dates before start dates", () => {
    const parsed = borrowingSchema.safeParse({ assetId: "a1", purpose: "Research workshop loan", startDate: "2026-08-10", expectedReturnAt: "2026-08-01" });
    expect(parsed.success).toBe(false);
  });

  it("validates system settings and normalises prefixes", () => {
    const parsed = systemSettingsSchema.safeParse({
      systemName: "IIUM Asset System",
      organisationName: "IIUM KAMS",
      permittedEmailDomain: "@IIUM.EDU.MY",
      currency: "myr",
      timeZone: "Asia/Kuala_Lumpur",
      assetTagPrefix: "kict",
      borrowingPrefix: "br",
      maxBorrowingDays: "30",
      pwaEnabled: "true",
      pwaName: "IIUM Asset System",
      pwaShortName: "IIUM KAMS",
      pwaDescription: "Manage campus assets",
      pwaThemeColor: "#009a97",
      pwaBackgroundColor: "#f3f5f9",
      pwaDisplay: "standalone",
      pwaOrientation: "any"
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.assetTagPrefix).toBe("KICT");
      expect(parsed.data.currency).toBe("MYR");
      expect(parsed.data.maxBorrowingDays).toBe(30);
    }
  });

  it("rejects unsafe settings values", () => {
    const parsed = systemSettingsSchema.safeParse({
      systemName: "IIUM Asset System",
      organisationName: "IIUM KAMS",
      permittedEmailDomain: "gmail.com",
      currency: "RM",
      timeZone: "Invalid/Zone",
      assetTagPrefix: "bad prefix!",
      borrowingPrefix: "BR",
      maxBorrowingDays: "999"
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts only supported user approval actions", () => {
    expect(userAccountActionSchema.safeParse({ userId: "u1", intent: "approve", role: "USER", departmentId: "d1" }).success).toBe(true);
    expect(userAccountActionSchema.safeParse({ userId: "u1", intent: "delete", role: "OWNER" }).success).toBe(false);
  });
});

import { AccountStatus, AssetStatus, RoleName, Prisma, type Asset, type User } from "@prisma/client";

export const roleLabels: Record<RoleName, string> = {
  SUPERADMIN: "Superadmin",
  ASSET_LIAISON: "Asset Liaison",
  USER: "User"
};

export type Action =
  | "dashboard:view"
  | "asset:read"
  | "asset:create"
  | "asset:update"
  | "asset:approve"
  | "asset:archive"
  | "borrow:create"
  | "borrow:approve"
  | "transfer:create"
  | "transfer:approve"
  | "maintenance:create"
  | "maintenance:manage"
  | "verification:manage"
  | "disposal:approve"
  | "user:manage"
  | "report:export"
  | "audit:view"
  | "settings:manage";

const matrix: Record<RoleName, Action[]> = {
  SUPERADMIN: [
    "dashboard:view",
    "asset:read",
    "asset:create",
    "asset:update",
    "asset:approve",
    "asset:archive",
    "borrow:create",
    "borrow:approve",
    "transfer:create",
    "transfer:approve",
    "maintenance:create",
    "maintenance:manage",
    "verification:manage",
    "disposal:approve",
    "user:manage",
    "report:export",
    "audit:view",
    "settings:manage"
  ],
  ASSET_LIAISON: [
    "dashboard:view",
    "asset:read",
    "asset:create",
    "asset:update",
    "asset:archive",
    "borrow:approve",
    "transfer:create",
    "transfer:approve",
    "maintenance:create",
    "maintenance:manage",
    "verification:manage",
    "report:export"
  ],
  USER: ["dashboard:view", "asset:read", "borrow:create", "transfer:create", "maintenance:create"]
};

export function can(user: Pick<User, "role" | "status"> | null | undefined, action: Action) {
  return Boolean(user && user.status === AccountStatus.ACTIVE && matrix[user.role].includes(action));
}

export function canAccessAsset(
  user: { role: RoleName; status: AccountStatus; id: string; departmentId?: string | null } | null | undefined,
  asset: Pick<Asset, "departmentId" | "assignedUserId" | "status">
) {
  if (!user || user.status !== AccountStatus.ACTIVE) return false;
  if (user.role === RoleName.SUPERADMIN) return true;
  if (user.role === RoleName.ASSET_LIAISON) return user.departmentId === asset.departmentId;
  return asset.assignedUserId === user.id;
}

export function assetScopeFor(user: { role: RoleName; id: string; departmentId?: string | null }): Prisma.AssetWhereInput {
  if (user.role === RoleName.SUPERADMIN) return {};
  if (user.role === RoleName.ASSET_LIAISON) return { departmentId: user.departmentId ?? "__unassigned__" };
  return { OR: [{ assignedUserId: user.id }, { assignments: { some: { assignedUserId: user.id } } }] };
}

export function canRequestAsset(
  user: { role: RoleName; status: AccountStatus; id: string; departmentId?: string | null } | null | undefined,
  asset: Pick<Asset, "departmentId" | "status" | "borrowable">
) {
  if (!user || user.status !== AccountStatus.ACTIVE || !asset.borrowable || asset.status !== AssetStatus.AVAILABLE) return false;
  if (user.role === RoleName.SUPERADMIN || user.role === RoleName.USER) return true;
  return user.departmentId === asset.departmentId;
}

export function canAccessModule(role: RoleName, module: string) {
  const roles: Record<string, RoleName[]> = {
    borrowings: [RoleName.SUPERADMIN, RoleName.ASSET_LIAISON, RoleName.USER],
    transfers: [RoleName.SUPERADMIN, RoleName.ASSET_LIAISON, RoleName.USER],
    maintenance: [RoleName.SUPERADMIN, RoleName.ASSET_LIAISON, RoleName.USER],
    verification: [RoleName.SUPERADMIN, RoleName.ASSET_LIAISON],
    incidents: [RoleName.SUPERADMIN, RoleName.ASSET_LIAISON, RoleName.USER],
    disposal: [RoleName.SUPERADMIN, RoleName.ASSET_LIAISON],
    reports: [RoleName.SUPERADMIN, RoleName.ASSET_LIAISON],
    notifications: [RoleName.SUPERADMIN, RoleName.ASSET_LIAISON, RoleName.USER],
    users: [RoleName.SUPERADMIN],
    locations: [RoleName.SUPERADMIN],
    "master-data": [RoleName.SUPERADMIN],
    audit: [RoleName.SUPERADMIN],
    settings: [RoleName.SUPERADMIN]
  };
  return Boolean(roles[module]?.includes(role));
}

export function cannotApproveOwnRequest(userId: string, requesterId: string) {
  return userId !== requesterId;
}

export function isBorrowable(status: AssetStatus) {
  return status === AssetStatus.AVAILABLE;
}

import { AssetStatus } from "@prisma/client";

export function statusForAssignment(status: AssetStatus, assignedUserId: string | null) {
  if (assignedUserId) return AssetStatus.ASSIGNED;
  if (!assignedUserId && status === AssetStatus.ASSIGNED) return AssetStatus.AVAILABLE;
  return status;
}

export function borrowableForAssignment(borrowable: boolean, assignedUserId: string | null) {
  return assignedUserId ? false : borrowable;
}

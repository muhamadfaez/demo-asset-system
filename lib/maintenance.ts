import { AssetStatus, RequestStatus } from "@prisma/client";

export type MaintenanceAction = "approve" | "reject" | "start" | "await_parts" | "complete" | "close" | "cancel";

export function canTransitionMaintenance(status: RequestStatus, action: MaintenanceAction) {
  if (status === RequestStatus.SUBMITTED || status === RequestStatus.PENDING_APPROVAL) return action === "approve" || action === "reject" || action === "cancel";
  if (status === RequestStatus.APPROVED) return action === "start";
  if (status === RequestStatus.IN_PROGRESS) return action === "await_parts" || action === "complete";
  if (status === RequestStatus.AWAITING_PARTS) return action === "start" || action === "complete";
  if (status === RequestStatus.COMPLETED) return action === "close";
  return false;
}

export function canMaintainAsset(status: AssetStatus) {
  const blockedStatuses: AssetStatus[] = [AssetStatus.DISPOSED, AssetStatus.MISSING];
  return !blockedStatuses.includes(status);
}

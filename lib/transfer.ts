import { AssetStatus, RequestStatus } from "@prisma/client";

export function canTransferAsset(status: AssetStatus) {
  const blockedStatuses: AssetStatus[] = [AssetStatus.BORROWED, AssetStatus.DISPOSED, AssetStatus.MISSING];
  return !blockedStatuses.includes(status);
}

export function canTransitionTransfer(status: RequestStatus, decision: "approve" | "reject" | "cancel") {
  return (status === RequestStatus.SUBMITTED || status === RequestStatus.PENDING_APPROVAL)
    && (decision === "approve" || decision === "reject" || decision === "cancel");
}

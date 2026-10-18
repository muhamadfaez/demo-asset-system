import { RequestStatus } from "@prisma/client";

export type BorrowingDecision = "approve" | "reject" | "checkout" | "return";

const transitions: Record<BorrowingDecision, RequestStatus[]> = {
  approve: [RequestStatus.SUBMITTED, RequestStatus.PENDING_APPROVAL],
  reject: [RequestStatus.SUBMITTED, RequestStatus.PENDING_APPROVAL],
  checkout: [RequestStatus.APPROVED],
  return: [RequestStatus.CHECKED_OUT, RequestStatus.OVERDUE]
};

export function canTransitionBorrowing(status: RequestStatus, decision: BorrowingDecision) {
  return transitions[decision].includes(status);
}

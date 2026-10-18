import { NextRequest, NextResponse } from "next/server";
import { AssetStatus, RequestStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { can, canAccessAsset, canRequestAsset, cannotApproveOwnRequest, isBorrowable } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { borrowingDecisionSchema, borrowingSchema } from "@/lib/validation";
import { getSystemSettings } from "@/lib/settings";
import { canTransitionBorrowing } from "@/lib/borrowing";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user, "borrow:create")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = borrowingSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  const settings = await getSystemSettings();
  const borrowingDays = Math.ceil((parsed.data.expectedReturnAt.getTime() - parsed.data.startDate.getTime()) / 86_400_000);
  if (borrowingDays > Number(settings.maxBorrowingDays)) return NextResponse.json({ error: `Borrowing period cannot exceed ${settings.maxBorrowingDays} days` }, { status: 400 });
  const asset = await prisma.asset.findUnique({ where: { id: parsed.data.assetId } });
  if (!asset || !canRequestAsset(session.user, asset)) return NextResponse.json({ error: "Asset is not available within your borrowing scope" }, { status: 404 });
  if (!isBorrowable(asset.status)) return NextResponse.json({ error: "Asset is not available for borrowing" }, { status: 409 });
  const overlap = await prisma.borrowingRequest.findFirst({
    where: {
      assetId: asset.id,
      requesterId: session.user.id,
      status: { in: [RequestStatus.SUBMITTED, RequestStatus.PENDING_APPROVAL, RequestStatus.APPROVED, RequestStatus.CHECKED_OUT] },
      startDate: { lte: parsed.data.expectedReturnAt },
      expectedReturnAt: { gte: parsed.data.startDate }
    }
  });
  if (overlap) return NextResponse.json({ error: "You already have an active or overlapping request for this asset" }, { status: 409 });
  const requestNo = `${settings.borrowingPrefix}-${Date.now()}`;
  const borrowing = await prisma.borrowingRequest.create({
    data: { ...parsed.data, requestNumber: requestNo, requesterId: session.user.id, status: RequestStatus.PENDING_APPROVAL }
  });
  const reviewers = await prisma.user.findMany({ where: { status: "ACTIVE", OR: [{ role: "SUPERADMIN" }, { role: "ASSET_LIAISON", departmentId: asset.departmentId }] }, select: { id: true } });
  await Promise.all([
    audit({ userId: session.user.id, action: "SUBMIT", module: "Borrowing", recordType: "BorrowingRequest", recordId: borrowing.id, newValues: borrowing }),
    reviewers.length ? prisma.notification.createMany({ data: reviewers.map((reviewer) => ({ userId: reviewer.id, title: "Borrowing request submitted", message: `${requestNo} is waiting for review.`, href: "/borrowings" })) }) : Promise.resolve()
  ]);
  return NextResponse.json({ borrowing }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user, "borrow:approve")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = borrowingDecisionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid borrowing action" }, { status: 400 });
  const body = parsed.data;
  const existing = await prisma.borrowingRequest.findUnique({ where: { id: body.id }, include: { asset: true } });
  if (!existing) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (!canAccessAsset(session.user, existing.asset)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!cannotApproveOwnRequest(session.user.id, existing.requesterId)) return NextResponse.json({ error: "Users cannot approve their own requests" }, { status: 403 });
  if (!canTransitionBorrowing(existing.status, body.decision)) return NextResponse.json({ error: `Cannot ${body.decision} a request with status ${existing.status}` }, { status: 409 });
  if (body.decision === "reject" && !body.reason) return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
  if ((body.decision === "approve" || body.decision === "checkout") && (!existing.asset.borrowable || existing.asset.status !== AssetStatus.AVAILABLE)) return NextResponse.json({ error: "The asset is no longer available for borrowing" }, { status: 409 });
  if (body.decision === "approve") {
    const conflict = await prisma.borrowingRequest.findFirst({ where: { id: { not: existing.id }, assetId: existing.assetId, status: { in: [RequestStatus.APPROVED, RequestStatus.CHECKED_OUT] }, startDate: { lte: existing.expectedReturnAt }, expectedReturnAt: { gte: existing.startDate } } });
    if (conflict) return NextResponse.json({ error: "Another approved request overlaps these borrowing dates" }, { status: 409 });
  }
  const status = body.decision === "approve" ? RequestStatus.APPROVED : body.decision === "reject" ? RequestStatus.REJECTED : body.decision === "checkout" ? RequestStatus.CHECKED_OUT : RequestStatus.RETURNED;
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.borrowingRequest.update({
      where: { id: existing.id },
      data: { status, approvedById: body.decision === "approve" ? session.user.id : existing.approvedById, approvedAt: body.decision === "approve" ? new Date() : existing.approvedAt, rejectionReason: body.reason }
    });
    if (body.decision === "checkout") await tx.asset.update({ where: { id: existing.assetId }, data: { status: AssetStatus.BORROWED } });
    if (body.decision === "return") await tx.asset.update({ where: { id: existing.assetId }, data: { status: AssetStatus.AVAILABLE } });
    return row;
  });
  const actionTitle = { approve: "Borrowing request approved", reject: "Borrowing request rejected", checkout: "Asset checked out", return: "Asset returned" }[body.decision];
  await Promise.all([
    audit({ userId: session.user.id, action: body.decision.toUpperCase(), module: "Borrowing", recordType: "BorrowingRequest", recordId: updated.id, previousValues: existing, newValues: updated }),
    prisma.notification.create({ data: { userId: existing.requesterId, title: actionTitle, message: body.reason || `${existing.requestNumber} is now ${status.toLowerCase().replaceAll("_", " ")}.`, href: "/borrowings" } })
  ]);
  return NextResponse.json({ borrowing: updated });
}

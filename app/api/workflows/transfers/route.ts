import { AccountStatus, RequestStatus, RoleName } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { borrowableForAssignment, statusForAssignment } from "@/lib/asset-assignment";
import { can, canAccessAsset } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { canTransferAsset, canTransitionTransfer } from "@/lib/transfer";
import { transferDecisionSchema, transferSchema } from "@/lib/validation";

const activeTransferStatuses = [RequestStatus.SUBMITTED, RequestStatus.PENDING_APPROVAL];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user, "transfer:create")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = transferSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });

  const asset = await prisma.asset.findUnique({
    where: { id: parsed.data.assetId },
    include: { room: true, assignedUser: true }
  });
  if (!asset || !canAccessAsset(session.user, asset)) return NextResponse.json({ error: "Asset is not available within your transfer scope" }, { status: 404 });
  if (!canTransferAsset(asset.status)) return NextResponse.json({ error: `Assets with status ${asset.status} cannot be transferred` }, { status: 409 });

  const changesLocation = parsed.data.transferType === "LOCATION" || parsed.data.transferType === "BOTH";
  const changesCustodian = parsed.data.transferType === "CUSTODIAN" || parsed.data.transferType === "BOTH";
  const targetRoomId = changesLocation ? parsed.data.newRoomId! : asset.roomId;
  const targetCustodianId = changesCustodian ? parsed.data.newCustodianId! : asset.assignedUserId;

  const [targetRoom, targetCustodian, duplicate] = await Promise.all([
    prisma.room.findFirst({ where: { id: targetRoomId, active: true, floor: { active: true, building: { active: true } } }, include: { floor: { include: { building: true } } } }),
    targetCustodianId ? prisma.user.findFirst({ where: { id: targetCustodianId, status: AccountStatus.ACTIVE }, include: { department: true } }) : Promise.resolve(null),
    prisma.assetTransfer.findFirst({ where: { assetId: asset.id, status: { in: activeTransferStatuses } } })
  ]);
  if (!targetRoom) return NextResponse.json({ error: "Select a valid active destination room" }, { status: 400 });
  if (targetCustodianId && !targetCustodian) return NextResponse.json({ error: "Select a valid active custodian" }, { status: 400 });
  if (session.user.role === RoleName.ASSET_LIAISON && targetCustodian?.departmentId !== undefined && targetCustodian.departmentId !== session.user.departmentId) return NextResponse.json({ error: "Asset Liaisons can only transfer custody within their assigned department" }, { status: 403 });
  if (targetRoom.id === asset.roomId && targetCustodianId === asset.assignedUserId) return NextResponse.json({ error: "The destination and custodian are unchanged" }, { status: 400 });
  if (duplicate) return NextResponse.json({ error: "This asset already has a transfer awaiting approval" }, { status: 409 });

  const transferNumber = `TR-${Date.now()}`;
  const transfer = await prisma.assetTransfer.create({
    data: {
      transferNumber,
      assetId: asset.id,
      currentLocation: asset.roomId,
      newLocation: targetRoom.id,
      currentCustodian: asset.assignedUserId,
      newCustodian: targetCustodianId,
      reason: parsed.data.reason,
      requestedById: session.user.id,
      status: RequestStatus.PENDING_APPROVAL
    }
  });
  const reviewers = await prisma.user.findMany({
    where: { status: AccountStatus.ACTIVE, OR: [{ role: RoleName.SUPERADMIN }, { role: RoleName.ASSET_LIAISON, departmentId: asset.departmentId }] },
    select: { id: true }
  });
  await Promise.all([
    audit({ userId: session.user.id, action: "SUBMIT", module: "Transfers", recordType: "AssetTransfer", recordId: transfer.id, newValues: transfer }),
    reviewers.length ? prisma.notification.createMany({ data: reviewers.map((reviewer) => ({ userId: reviewer.id, title: "Asset transfer awaiting review", message: `${transferNumber} for ${asset.tagNumber} is ready for review.`, href: "/transfers" })) }) : Promise.resolve()
  ]);
  return NextResponse.json({ transfer }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = transferDecisionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid transfer action" }, { status: 400 });
  if (parsed.data.decision === "reject" && !parsed.data.reason) return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });

  const existing = await prisma.assetTransfer.findUnique({
    where: { id: parsed.data.id },
    include: { asset: { include: { room: true, assignedUser: true } } }
  });
  if (!existing) return NextResponse.json({ error: "Transfer request not found" }, { status: 404 });
  if (parsed.data.decision === "cancel") {
    if (!can(session.user, "transfer:create") || existing.requestedById !== session.user.id) return NextResponse.json({ error: "Only the requester can cancel this transfer" }, { status: 403 });
    if (!canTransitionTransfer(existing.status, "cancel")) return NextResponse.json({ error: `Cannot cancel a transfer with status ${existing.status}` }, { status: 409 });
    const cancelled = await prisma.assetTransfer.update({ where: { id: existing.id }, data: { status: RequestStatus.CANCELLED } });
    await audit({ userId: session.user.id, action: "CANCEL", module: "Transfers", recordType: "AssetTransfer", recordId: cancelled.id, previousValues: existing, newValues: cancelled });
    return NextResponse.json({ transfer: cancelled });
  }
  if (!can(session.user, "transfer:approve")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessAsset(session.user, existing.asset)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!canTransferAsset(existing.asset.status)) return NextResponse.json({ error: `The asset can no longer be transferred because its status is ${existing.asset.status}` }, { status: 409 });
  if (!canTransitionTransfer(existing.status, parsed.data.decision)) return NextResponse.json({ error: `Cannot ${parsed.data.decision} a transfer with status ${existing.status}` }, { status: 409 });

  if (parsed.data.decision === "reject") {
    const rejected = await prisma.assetTransfer.update({ where: { id: existing.id }, data: { status: RequestStatus.REJECTED, rejectionReason: parsed.data.reason, approvedById: session.user.id, approvedAt: new Date() } });
    await Promise.all([
      audit({ userId: session.user.id, action: "REJECT", module: "Transfers", recordType: "AssetTransfer", recordId: rejected.id, previousValues: existing, newValues: rejected }),
      prisma.notification.create({ data: { userId: existing.requestedById, title: "Asset transfer rejected", message: parsed.data.reason!, href: "/transfers" } })
    ]);
    return NextResponse.json({ transfer: rejected });
  }

  const currentRoomMatches = existing.currentLocation === existing.asset.roomId || existing.currentLocation === existing.asset.room.name;
  const currentCustodianMatches = existing.currentCustodian === existing.asset.assignedUserId
    || existing.currentCustodian === existing.asset.assignedUser?.name
    || (!existing.currentCustodian && !existing.asset.assignedUserId);
  if (!currentRoomMatches || !currentCustodianMatches) return NextResponse.json({ error: "The asset location or custodian changed after this request was submitted. Reject it and create a new transfer." }, { status: 409 });

  const [targetRoom, targetCustodian] = await Promise.all([
    prisma.room.findFirst({ where: { OR: [{ id: existing.newLocation }, { name: existing.newLocation }], active: true, floor: { active: true, building: { active: true } } }, include: { floor: { include: { building: true } } } }),
    existing.newCustodian ? prisma.user.findFirst({ where: { OR: [{ id: existing.newCustodian }, { name: existing.newCustodian }], status: AccountStatus.ACTIVE }, include: { department: true } }) : Promise.resolve(null)
  ]);
  if (!targetRoom) return NextResponse.json({ error: "The destination room is no longer available" }, { status: 409 });
  if (existing.newCustodian && !targetCustodian) return NextResponse.json({ error: "The destination custodian is no longer active" }, { status: 409 });

  const targetCustodianId = targetCustodian?.id ?? existing.asset.assignedUserId;
  const custodyChanged = targetCustodianId !== existing.asset.assignedUserId;
  const nextStatus = statusForAssignment(existing.asset.status, targetCustodianId);
  const updated = await prisma.$transaction(async (tx) => {
    const asset = await tx.asset.update({
      where: { id: existing.assetId },
      data: {
        roomId: targetRoom.id,
        buildingId: targetRoom.floor.buildingId,
        assignedUserId: targetCustodianId,
        ...(targetCustodian?.department ? { departmentId: targetCustodian.departmentId!, kulliyyahId: targetCustodian.department.kulliyyahId, ...(targetCustodian.departmentId !== existing.asset.departmentId ? { unitId: null } : {}) } : {}),
        status: nextStatus,
        borrowable: borrowableForAssignment(existing.asset.borrowable, targetCustodianId),
        updatedById: session.user.id
      }
    });
    if (custodyChanged) await tx.assetAssignment.create({ data: { assetId: existing.assetId, assignedUserId: targetCustodianId, assignedById: session.user.id, purpose: "Asset custodian transferred", acceptanceStatus: "Assigned" } });
    const transfer = await tx.assetTransfer.update({ where: { id: existing.id }, data: { status: RequestStatus.COMPLETED, approvedById: session.user.id, approvedAt: new Date(), transferDate: new Date(), rejectionReason: null } });
    return { asset, transfer };
  });

  const notificationRecipients = new Set([existing.requestedById]);
  if (custodyChanged && targetCustodianId) notificationRecipients.add(targetCustodianId);
  await Promise.all([
    audit({ userId: session.user.id, action: "APPROVE", module: "Transfers", recordType: "AssetTransfer", recordId: updated.transfer.id, previousValues: existing, newValues: updated }),
    prisma.notification.createMany({ data: [...notificationRecipients].map((userId) => ({ userId, title: "Asset transfer completed", message: `${existing.transferNumber} has been approved and the asset record was updated.`, href: `/assets/${existing.assetId}` })) })
  ]);
  return NextResponse.json(updated);
}

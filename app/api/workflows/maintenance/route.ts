import { AccountStatus, AssetStatus, RequestStatus, RoleName } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { borrowableForAssignment } from "@/lib/asset-assignment";
import { canMaintainAsset, canTransitionMaintenance } from "@/lib/maintenance";
import { can, canAccessAsset } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { maintenanceActionSchema, maintenanceSchema } from "@/lib/validation";

const activeMaintenanceStatuses = [RequestStatus.SUBMITTED, RequestStatus.PENDING_APPROVAL, RequestStatus.APPROVED, RequestStatus.IN_PROGRESS, RequestStatus.AWAITING_PARTS];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user, "maintenance:create")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = maintenanceSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  const asset = await prisma.asset.findUnique({ where: { id: parsed.data.assetId } });
  if (!asset || !canAccessAsset(session.user, asset)) return NextResponse.json({ error: "Asset is not available within your maintenance scope" }, { status: 404 });
  if (!canMaintainAsset(asset.status)) return NextResponse.json({ error: `Assets with status ${asset.status} cannot enter maintenance` }, { status: 409 });
  const duplicate = await prisma.maintenanceRequest.findFirst({ where: { assetId: asset.id, status: { in: activeMaintenanceStatuses } } });
  if (duplicate) return NextResponse.json({ error: `This asset already has active maintenance request ${duplicate.requestNumber}` }, { status: 409 });

  const requestNumber = `MT-${Date.now()}`;
  const maintenance = await prisma.maintenanceRequest.create({
    data: { ...parsed.data, requestNumber, reportedById: session.user.id, status: RequestStatus.PENDING_APPROVAL }
  });
  const reviewers = await prisma.user.findMany({ where: { status: AccountStatus.ACTIVE, OR: [{ role: RoleName.SUPERADMIN }, { role: RoleName.ASSET_LIAISON, departmentId: asset.departmentId }] }, select: { id: true } });
  await Promise.all([
    audit({ userId: session.user.id, action: "REPORT", module: "Maintenance", recordType: "MaintenanceRequest", recordId: maintenance.id, newValues: maintenance }),
    reviewers.length ? prisma.notification.createMany({ data: reviewers.map((reviewer) => ({ userId: reviewer.id, title: "Maintenance request awaiting review", message: `${requestNumber} for ${asset.tagNumber} needs review.`, href: "/maintenance" })) }) : Promise.resolve()
  ]);
  return NextResponse.json({ maintenance }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = maintenanceActionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid maintenance action" }, { status: 400 });
  const existing = await prisma.maintenanceRequest.findUnique({ where: { id: parsed.data.id }, include: { asset: true } });
  if (!existing) return NextResponse.json({ error: "Maintenance request not found" }, { status: 404 });

  if (parsed.data.action === "cancel") {
    if (!can(session.user, "maintenance:create") || existing.reportedById !== session.user.id) return NextResponse.json({ error: "Only the reporter can cancel this request" }, { status: 403 });
    if (!canTransitionMaintenance(existing.status, "cancel")) return NextResponse.json({ error: `Cannot cancel a request with status ${existing.status}` }, { status: 409 });
    const cancelled = await prisma.maintenanceRequest.update({ where: { id: existing.id }, data: { status: RequestStatus.CANCELLED } });
    await audit({ userId: session.user.id, action: "CANCEL", module: "Maintenance", recordType: "MaintenanceRequest", recordId: cancelled.id, previousValues: existing, newValues: cancelled });
    return NextResponse.json({ maintenance: cancelled });
  }

  if (!can(session.user, "maintenance:manage")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessAsset(session.user, existing.asset)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!canTransitionMaintenance(existing.status, parsed.data.action)) return NextResponse.json({ error: `Cannot ${parsed.data.action.replaceAll("_", " ")} a request with status ${existing.status}` }, { status: 409 });
  if (parsed.data.action === "reject" && !parsed.data.reason) return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
  if (parsed.data.action === "complete" && !parsed.data.resolution) return NextResponse.json({ error: "A resolution summary is required" }, { status: 400 });
  if (parsed.data.action === "start" && existing.asset.status === AssetStatus.BORROWED) return NextResponse.json({ error: "Return the borrowed asset before starting maintenance" }, { status: 409 });
  if ((parsed.data.action === "approve" || parsed.data.action === "start") && !canMaintainAsset(existing.asset.status)) return NextResponse.json({ error: `The asset can no longer enter maintenance because its status is ${existing.asset.status}` }, { status: 409 });

  const nextStatus = {
    approve: RequestStatus.APPROVED,
    reject: RequestStatus.REJECTED,
    start: RequestStatus.IN_PROGRESS,
    await_parts: RequestStatus.AWAITING_PARTS,
    complete: RequestStatus.COMPLETED,
    close: RequestStatus.CLOSED
  }[parsed.data.action];
  try {
    const updated = await prisma.maintenanceRequest.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        ...(parsed.data.action === "approve" ? { scheduledAt: parsed.data.scheduledAt, vendor: parsed.data.vendor || null } : {}),
        ...(parsed.data.action === "reject" ? { resolution: parsed.data.reason } : {}),
        ...(parsed.data.action === "start" ? { startedAt: existing.startedAt ?? new Date() } : {}),
        ...(parsed.data.action === "complete" ? { completedAt: new Date(), resolution: parsed.data.resolution, partsReplaced: parsed.data.partsReplaced || null, actualCost: parsed.data.actualCost ?? 0, downtimeHours: parsed.data.downtimeHours ?? 0 } : {})
      }
    });
    if (parsed.data.action === "start") await prisma.asset.update({ where: { id: existing.assetId }, data: { status: AssetStatus.UNDER_MAINTENANCE, updatedById: session.user.id } });
    if (parsed.data.action === "complete") await prisma.asset.update({ where: { id: existing.assetId }, data: { status: existing.asset.assignedUserId ? AssetStatus.ASSIGNED : AssetStatus.AVAILABLE, borrowable: borrowableForAssignment(existing.asset.borrowable, existing.asset.assignedUserId), updatedById: session.user.id } });
  const title = {
    approve: "Maintenance request approved",
    reject: "Maintenance request rejected",
    start: existing.status === RequestStatus.AWAITING_PARTS ? "Maintenance work resumed" : "Maintenance work started",
    await_parts: "Maintenance awaiting parts",
    complete: "Maintenance completed",
    close: "Maintenance request closed"
  }[parsed.data.action];
  const sideEffects = await Promise.allSettled([
    audit({ userId: session.user.id, action: parsed.data.action.toUpperCase(), module: "Maintenance", recordType: "MaintenanceRequest", recordId: updated.id, previousValues: existing, newValues: updated }),
    prisma.notification.create({ data: { userId: existing.reportedById, title, message: parsed.data.action === "reject" ? parsed.data.reason! : `${existing.requestNumber} is now ${nextStatus.toLowerCase().replaceAll("_", " ")}.`, href: "/maintenance" } })
  ]);
  sideEffects.forEach((result) => { if (result.status === "rejected") console.error("Maintenance side effect failed", result.reason); });
  return NextResponse.json({ maintenance: updated });
  } catch (error) {
    console.error("Maintenance update failed", error);
    return NextResponse.json({ error: "Unable to update maintenance request. Please try again." }, { status: 500 });
  }
}

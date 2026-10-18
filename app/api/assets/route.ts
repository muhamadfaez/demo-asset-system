import { NextRequest, NextResponse } from "next/server";
import { AccountStatus, AssetStatus, Prisma, RoleName } from "@prisma/client";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { borrowableForAssignment, statusForAssignment } from "@/lib/asset-assignment";
import { assetScopeFor, can, canAccessAsset } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { assetSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user, "asset:read")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const where = { AND: [assetScopeFor(session.user), q ? { OR: [{ tagNumber: { contains: q } }, { name: { contains: q } }, { serialNumber: { contains: q } }] } : {}] };
  const assets = session.user.role === "USER"
    ? await prisma.asset.findMany({
      where,
      select: { id: true, tagNumber: true, name: true, description: true, model: true, serialNumber: true, status: true, condition: true, borrowable: true, assignedUserId: true, category: true, department: true, room: true },
      take: 100
    })
    : await prisma.asset.findMany({ where, include: { category: true, department: true, room: true }, take: 100 });
  return NextResponse.json({ assets });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user, "asset:create")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = Object.fromEntries(await request.formData());
  const parsed = assetSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  const locationError = await validateAssetLocation(parsed.data);
  if (locationError) return NextResponse.json({ error: locationError }, { status: 400 });
  if (session.user.role === "ASSET_LIAISON" && parsed.data.departmentId !== session.user.departmentId) return NextResponse.json({ error: "Asset Liaisons can only register assets for their assigned department" }, { status: 403 });
  const assignedUserId = parsed.data.assignedUserId || null;
  const assignedUser = assignedUserId ? await prisma.user.findFirst({
    where: {
      id: assignedUserId,
      status: AccountStatus.ACTIVE,
      ...(session.user.role === RoleName.ASSET_LIAISON ? { departmentId: session.user.departmentId ?? "__unassigned__" } : {})
    },
    select: { id: true, name: true }
  }) : null;
  if (assignedUserId && !assignedUser) return NextResponse.json({ error: "Select a valid active user from the search results" }, { status: 400 });
  try {
    const status = statusForAssignment(parsed.data.status as AssetStatus, assignedUserId);
    const asset = await prisma.asset.create({
        data: {
          tagNumber: parsed.data.tagNumber,
          name: parsed.data.name,
          serialNumber: parsed.data.serialNumber || undefined,
          description: parsed.data.description || undefined,
          acquisitionCost: parsed.data.acquisitionCost,
          currentBookValue: parsed.data.acquisitionCost,
          categoryId: parsed.data.categoryId,
          kulliyyahId: parsed.data.kulliyyahId,
          departmentId: parsed.data.departmentId,
          buildingId: parsed.data.buildingId,
          roomId: parsed.data.roomId,
          condition: parsed.data.condition as any,
          status,
          borrowable: borrowableForAssignment(parsed.data.borrowable, assignedUserId),
          assignedUserId,
          createdById: session.user.id,
          updatedById: session.user.id
        }
    });
    if (assignedUserId) await prisma.assetAssignment.create({ data: { assetId: asset.id, assignedUserId, assignedById: session.user.id, assignmentDate: new Date(), purpose: "Initial asset assignment", acceptanceStatus: "Assigned" } });
    const sideEffects = await Promise.allSettled([
      assignedUserId ? prisma.notification.create({ data: { userId: assignedUserId, title: "Asset assigned", message: `${asset.tagNumber} - ${asset.name} has been assigned to you.`, href: `/assets/${asset.id}` } }) : Promise.resolve(),
      audit({ userId: session.user.id, action: "CREATE", module: "Assets", recordType: "Asset", recordId: asset.id, newValues: asset })
    ]);
    sideEffects.forEach((result) => { if (result.status === "rejected") console.error("Asset creation side effect failed", result.reason); });
    return NextResponse.redirect(new URL(`/assets/${asset.id}`, request.url), { status: 303 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Asset tag or serial number already exists" }, { status: 409 });
    }
    console.error("Asset creation failed", error);
    return NextResponse.json({ error: "Unable to create asset" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user, "asset:update")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = Object.fromEntries(await request.formData());
  const id = typeof body.id === "string" ? body.id : "";
  const parsed = assetSchema.safeParse(body);
  if (!id || !parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.success ? undefined : parsed.error.flatten() }, { status: 400 });
  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  if (!canAccessAsset(session.user, existing)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const locationError = await validateAssetLocation(parsed.data, existing);
  if (locationError) return NextResponse.json({ error: locationError }, { status: 400 });
  if (session.user.role === "ASSET_LIAISON" && parsed.data.departmentId !== session.user.departmentId) return NextResponse.json({ error: "Asset Liaisons cannot move assets outside their assigned department" }, { status: 403 });
  const assignedUserId = parsed.data.assignedUserId || null;
  const assignedUser = assignedUserId ? await prisma.user.findFirst({
    where: {
      id: assignedUserId,
      status: AccountStatus.ACTIVE,
      ...(session.user.role === RoleName.ASSET_LIAISON ? { departmentId: session.user.departmentId ?? "__unassigned__" } : {})
    },
    select: { id: true, name: true }
  }) : null;
  if (assignedUserId && !assignedUser) return NextResponse.json({ error: "Select a valid active user from the search results" }, { status: 400 });
  try {
    const assignmentChanged = existing.assignedUserId !== assignedUserId;
    const assignmentPurpose = assignedUserId ? (existing.assignedUserId ? "Asset reassigned" : "Asset assigned") : "Asset assignment removed";
    const status = statusForAssignment(parsed.data.status as AssetStatus, assignedUserId);
    const latestAssignment = assignmentChanged ? await prisma.assetAssignment.findFirst({
        where: { assetId: id },
        orderBy: { createdAt: "desc" },
        select: { assignedUserId: true, assignedById: true, purpose: true, createdAt: true }
    }) : null;
    const repeatedSubmission = Boolean(latestAssignment
        && latestAssignment.assignedUserId === assignedUserId
        && latestAssignment.assignedById === session.user.id
        && latestAssignment.purpose === assignmentPurpose
        && Date.now() - latestAssignment.createdAt.getTime() < 5_000);
    const asset = await prisma.asset.update({
        where: { id },
        data: {
          tagNumber: parsed.data.tagNumber,
          name: parsed.data.name,
          serialNumber: parsed.data.serialNumber || null,
          description: parsed.data.description || null,
          acquisitionCost: parsed.data.acquisitionCost,
          categoryId: parsed.data.categoryId,
          kulliyyahId: parsed.data.kulliyyahId,
          departmentId: parsed.data.departmentId,
          buildingId: parsed.data.buildingId,
          roomId: parsed.data.roomId,
          condition: parsed.data.condition as any,
          status,
          borrowable: borrowableForAssignment(parsed.data.borrowable, assignedUserId),
          assignedUserId,
          updatedById: session.user.id
        }
    });
    if (assignmentChanged && !repeatedSubmission) await prisma.assetAssignment.create({
        data: {
          assetId: id,
          assignedUserId,
          assignedById: session.user.id,
          assignmentDate: new Date(),
          purpose: assignmentPurpose,
          acceptanceStatus: assignedUserId ? "Assigned" : "Removed"
        }
    });
    if (assignmentChanged && !repeatedSubmission) {
      const notifications = [];
      if (existing.assignedUserId) notifications.push({ userId: existing.assignedUserId, title: "Asset assignment ended", message: `${asset.tagNumber} - ${asset.name} is no longer assigned to you.`, href: `/assets/${asset.id}` });
      if (assignedUserId) notifications.push({ userId: assignedUserId, title: "Asset assigned", message: `${asset.tagNumber} - ${asset.name} has been assigned to you.`, href: `/assets/${asset.id}` });
      if (notifications.length) {
        try { await prisma.notification.createMany({ data: notifications }); }
        catch (error) { console.error("Asset assignment notification failed", error); }
      }
    }
    try { await audit({ userId: session.user.id, action: "UPDATE", module: "Assets", recordType: "Asset", recordId: asset.id, previousValues: existing, newValues: asset }); }
    catch (error) { console.error("Asset update audit failed", error); }
    return NextResponse.json({ asset });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "Asset tag or serial number already exists" }, { status: 409 });
    console.error("Asset update failed", error);
    return NextResponse.json({ error: "Unable to update asset" }, { status: 500 });
  }
}

async function validateAssetLocation(input: ReturnType<typeof assetSchema.parse>, existing?: { kulliyyahId: string; departmentId: string; buildingId: string; roomId: string }) {
  const [department, room] = await Promise.all([
    prisma.department.findUnique({ where: { id: input.departmentId }, include: { kulliyyah: { select: { active: true } } } }),
    prisma.room.findUnique({ where: { id: input.roomId }, include: { floor: { include: { building: { include: { campus: { select: { active: true } } } } } } } })
  ]);
  if (!department || department.kulliyyahId !== input.kulliyyahId) return "Select a department within the selected Kulliyyah.";
  if (!room || room.floor.buildingId !== input.buildingId) return "Select a room within the selected building.";
  const changedOrganisation = !existing || existing.departmentId !== input.departmentId || existing.kulliyyahId !== input.kulliyyahId;
  const changedLocation = !existing || existing.buildingId !== input.buildingId || existing.roomId !== input.roomId;
  if (changedOrganisation && (!department.active || !department.kulliyyah.active)) return "Select an active Kulliyyah and department.";
  if (changedLocation && (!room.active || !room.floor.active || !room.floor.building.active || !room.floor.building.campus.active)) return "Select an active building, floor, and room.";
  return null;
}

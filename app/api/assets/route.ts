import { assetSearchFilter } from "@/lib/asset-search-db";
import { NextRequest, NextResponse } from "next/server";
import { AccountStatus, AssetStatus, Prisma, RoleName } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { getSystemSettings } from "@/lib/settings";
import { auth } from "@/lib/auth";
import { borrowableForAssignment } from "@/lib/asset-assignment";
import { assetScopeFor, can, canAccessAsset } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { assetSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user, "asset:read"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const where = { AND: [assetScopeFor(session.user), await assetSearchFilter(q)] };
  const assets =
    session.user.role === "USER"
      ? await prisma.asset.findMany({
          where,
          select: {
            id: true,
            tagNumber: true,
            name: true,
            description: true,
            model: true,
            serialNumber: true,
            status: true,
            condition: true,
            borrowable: true,
            assignedUserId: true,
            category: true,
            department: true,
            room: true,
          },
          take: 100,
        })
      : await prisma.asset.findMany({
          where,
          include: { category: true, department: true, room: true },
          take: 100,
        });
  return NextResponse.json({ assets });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user, "asset:create"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = Object.fromEntries(await request.formData());
  const parsed = assetSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  const location = await validateAssetLocation(parsed.data);
  if (typeof location === "string")
    return NextResponse.json({ error: location }, { status: 400 });
  if (
    session.user.role === "ASSET_LIAISON" &&
    parsed.data.departmentId !== session.user.departmentId
  )
    return NextResponse.json(
      {
        error:
          "Asset Liaisons can only register assets for their assigned department",
      },
      { status: 403 },
    );
  const referenceError = await validateReferences(parsed.data, session.user);
  if (referenceError)
    return NextResponse.json({ error: referenceError }, { status: 400 });
  const assignedUserId = parsed.data.assignedUserId || null;
  const assignedUser = assignedUserId
    ? await prisma.user.findFirst({
        where: {
          id: assignedUserId,
          status: AccountStatus.ACTIVE,
          ...(session.user.role === RoleName.ASSET_LIAISON
            ? { departmentId: session.user.departmentId ?? "__unassigned__" }
            : {}),
        },
        select: { id: true, name: true },
      })
    : null;
  if (assignedUserId && !assignedUser)
    return NextResponse.json(
      { error: "Select a valid active user from the search results" },
      { status: 400 },
    );
  if (
    !["DRAFT", "PENDING_APPROVAL", "AVAILABLE", "ASSIGNED"].includes(
      parsed.data.status,
    )
  )
    return NextResponse.json(
      { error: "Select a safe initial status" },
      { status: 400 },
    );
  const settings = await getSystemSettings();
  try {
    const status = parsed.data.status as AssetStatus;
    const asset = await prisma.asset.create({
      data: {
        tagNumber: `${settings.assetTagPrefix}-${randomUUID()}`,
        ...extendedData(parsed.data),
        name: parsed.data.name,
        serialNumber: parsed.data.serialNumber || undefined,
        description: parsed.data.description || undefined,
        acquisitionCost: parsed.data.acquisitionCost,
        currentBookValue: parsed.data.acquisitionCost,
        categoryId: parsed.data.categoryId,
        kulliyyahId: location.kulliyyahId,
        departmentId: parsed.data.departmentId,
        buildingId: location.buildingId,
        roomId: parsed.data.roomId,
        condition: parsed.data.condition,
        status,
        borrowable: borrowableForAssignment(
          parsed.data.borrowable,
          assignedUserId,
        ),
        assignedUserId,
        createdById: session.user.id,
        updatedById: session.user.id,
      },
    });
    if (assignedUserId)
      await prisma.assetAssignment.create({
        data: {
          assetId: asset.id,
          assignedUserId,
          assignedById: session.user.id,
          assignmentDate: new Date(),
          purpose: "Initial asset assignment",
          acceptanceStatus: "Assigned",
        },
      });
    const sideEffects = await Promise.allSettled([
      assignedUserId
        ? prisma.notification.create({
            data: {
              userId: assignedUserId,
              title: "Asset assigned",
              message: `${asset.tagNumber} - ${asset.name} has been assigned to you.`,
              href: `/assets/${asset.id}`,
            },
          })
        : Promise.resolve(),
    ]);
    sideEffects.forEach((result) => {
      if (result.status === "rejected")
        console.error("Asset creation side effect failed", result.reason);
    });
    if (request.headers.get("accept")?.includes("application/json"))
      return NextResponse.json({ asset }, { status: 201 });
    return NextResponse.redirect(new URL(`/assets/${asset.id}`, request.url), {
      status: 303,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Asset tag or serial number already exists" },
        { status: 409 },
      );
    }
    console.error("Asset creation failed", error);
    return NextResponse.json(
      { error: "Unable to create asset" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user, "asset:update"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = Object.fromEntries(await request.formData());
  const id = typeof body.id === "string" ? body.id : "";
  const parsed = assetSchema.safeParse(body);
  if (!id || !parsed.success)
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.success ? undefined : parsed.error.flatten(),
      },
      { status: 400 },
    );
  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  if (!canAccessAsset(session.user, existing))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const safe = ["DRAFT", "PENDING_APPROVAL", "AVAILABLE", "ASSIGNED"];
  if (
    (safe.includes(existing.status) && !safe.includes(parsed.data.status)) ||
    (!safe.includes(existing.status) &&
      (parsed.data.status !== existing.status ||
        (parsed.data.assignedUserId || null) !== existing.assignedUserId))
  )
    return NextResponse.json(
      {
        error:
          "This state is controlled by a workflow; status and assignment cannot be changed here",
      },
      { status: 400 },
    );
  const location = await validateAssetLocation(parsed.data, existing);
  if (typeof location === "string")
    return NextResponse.json({ error: location }, { status: 400 });
  if (
    session.user.role === "ASSET_LIAISON" &&
    parsed.data.departmentId !== session.user.departmentId
  )
    return NextResponse.json(
      {
        error:
          "Asset Liaisons cannot move assets outside their assigned department",
      },
      { status: 403 },
    );
  const referenceError = await validateReferences(parsed.data, session.user);
  if (referenceError)
    return NextResponse.json({ error: referenceError }, { status: 400 });
  const assignedUserId = parsed.data.assignedUserId || null;
  const assignedUser = assignedUserId
    ? await prisma.user.findFirst({
        where: {
          id: assignedUserId,
          status: AccountStatus.ACTIVE,
          ...(session.user.role === RoleName.ASSET_LIAISON
            ? { departmentId: session.user.departmentId ?? "__unassigned__" }
            : {}),
        },
        select: { id: true, name: true },
      })
    : null;
  if (assignedUserId && !assignedUser)
    return NextResponse.json(
      { error: "Select a valid active user from the search results" },
      { status: 400 },
    );
  try {
    const assignmentChanged = existing.assignedUserId !== assignedUserId;
    const assignmentPurpose = assignedUserId
      ? existing.assignedUserId
        ? "Asset reassigned"
        : "Asset assigned"
      : "Asset assignment removed";
    const status = parsed.data.status as AssetStatus;
    const latestAssignment = assignmentChanged
      ? await prisma.assetAssignment.findFirst({
          where: { assetId: id },
          orderBy: { createdAt: "desc" },
          select: {
            assignedUserId: true,
            assignedById: true,
            purpose: true,
            createdAt: true,
          },
        })
      : null;
    const repeatedSubmission = Boolean(
      latestAssignment &&
        latestAssignment.assignedUserId === assignedUserId &&
        latestAssignment.assignedById === session.user.id &&
        latestAssignment.purpose === assignmentPurpose &&
        Date.now() - latestAssignment.createdAt.getTime() < 5_000,
    );
    const asset = await prisma.asset.update({
      where: {
        id,
        status: existing.status,
        assignedUserId: existing.assignedUserId,
      },
      data: {
        tagNumber: existing.tagNumber,
        ...extendedData(parsed.data),
        name: parsed.data.name,
        serialNumber: parsed.data.serialNumber || null,
        description: parsed.data.description || null,
        acquisitionCost: parsed.data.acquisitionCost,
        categoryId: parsed.data.categoryId,
        kulliyyahId: location.kulliyyahId,
        departmentId: parsed.data.departmentId,
        buildingId: location.buildingId,
        roomId: parsed.data.roomId,
        condition: parsed.data.condition,
        status,
        borrowable: borrowableForAssignment(
          parsed.data.borrowable,
          assignedUserId,
        ),
        assignedUserId,
        updatedById: session.user.id,
      },
    });
    if (assignmentChanged && !repeatedSubmission)
      await prisma.assetAssignment.create({
        data: {
          assetId: id,
          assignedUserId,
          assignedById: session.user.id,
          assignmentDate: new Date(),
          purpose: assignmentPurpose,
          acceptanceStatus: assignedUserId ? "Assigned" : "Removed",
        },
      });
    if (assignmentChanged && !repeatedSubmission) {
      const notifications = [];
      if (existing.assignedUserId)
        notifications.push({
          userId: existing.assignedUserId,
          title: "Asset assignment ended",
          message: `${asset.tagNumber} - ${asset.name} is no longer assigned to you.`,
          href: `/assets/${asset.id}`,
        });
      if (assignedUserId)
        notifications.push({
          userId: assignedUserId,
          title: "Asset assigned",
          message: `${asset.tagNumber} - ${asset.name} has been assigned to you.`,
          href: `/assets/${asset.id}`,
        });
      if (notifications.length) {
        try {
          await prisma.notification.createMany({ data: notifications });
        } catch (error) {
          console.error("Asset assignment notification failed", error);
        }
      }
    }
    return NextResponse.json({ asset });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    )
      return NextResponse.json(
        { error: "This asset changed while saving. Reload it and try again." },
        { status: 409 },
      );
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return NextResponse.json(
        { error: "Asset tag or serial number already exists" },
        { status: 409 },
      );
    console.error("Asset update failed", error);
    return NextResponse.json(
      { error: "Unable to update asset" },
      { status: 500 },
    );
  }
}

async function validateAssetLocation(
  input: ReturnType<typeof assetSchema.parse>,
  existing?: {
    kulliyyahId: string;
    departmentId: string;
    buildingId: string;
    roomId: string;
  },
) {
  const [department, room] = await Promise.all([
    prisma.department.findUnique({
      where: { id: input.departmentId },
      include: { kulliyyah: { select: { active: true } } },
    }),
    prisma.room.findUnique({
      where: { id: input.roomId },
      include: {
        floor: {
          include: {
            building: { include: { campus: { select: { active: true } } } },
          },
        },
      },
    }),
  ]);
  if (!department) return "Select a valid department.";
  if (!room) return "Select a valid room.";
  const changedOrganisation =
    !existing ||
    existing.departmentId !== input.departmentId ||
    existing.kulliyyahId !== department.kulliyyahId;
  const changedLocation =
    !existing ||
    existing.buildingId !== room.floor.buildingId ||
    existing.roomId !== input.roomId;
  if (
    changedOrganisation &&
    (!department.active || !department.kulliyyah.active)
  )
    return "Select an active Kulliyyah and department.";
  if (
    changedLocation &&
    (!room.active ||
      !room.floor.active ||
      !room.floor.building.active ||
      !room.floor.building.campus.active)
  )
    return "Select an active building, floor, and room.";
  return {
    kulliyyahId: department.kulliyyahId,
    buildingId: room.floor.buildingId,
  };
}
function extendedData(input: ReturnType<typeof assetSchema.parse>) {
  const {
    assetType,
    brandName,
    model,
    purchaseOrderNumber,
    invoiceNumber,
    deliveryOrderNumber,
    supplierId,
    fundingSourceId,
    grantProjectCode,
    legacyRecordReason,
    serviceContract,
    supportVendor,
    custodianId,
  } = input;
  return {
    assetType,
    brandName: brandName || null,
    model: model || null,
    purchaseOrderNumber: purchaseOrderNumber || null,
    invoiceNumber: invoiceNumber || null,
    deliveryOrderNumber: deliveryOrderNumber || null,
    supplierId: supplierId || null,
    fundingSourceId: fundingSourceId || null,
    grantProjectCode: grantProjectCode || null,
    legacyRecordReason: legacyRecordReason || null,
    serviceContract: serviceContract || null,
    supportVendor: supportVendor || null,
    custodianId: custodianId || null,
    ...Object.fromEntries(
      (
        [
          "acquisitionDate",
          "receivedDate",
          "warrantyStartDate",
          "warrantyExpiryDate",
        ] as const
      ).map((key) => [key, input[key] ? new Date(input[key]!) : null]),
    ),
  };
}
async function validateReferences(
  input: ReturnType<typeof assetSchema.parse>,
  user: { role: string; departmentId?: string | null },
) {
  if (
    input.custodianId &&
    !(await prisma.user.findFirst({
      where: {
        id: input.custodianId,
        status: "ACTIVE",
        ...(user.role === "ASSET_LIAISON"
          ? { departmentId: user.departmentId ?? "__unassigned__" }
          : {}),
      },
    }))
  )
    return "Select a valid active custodian";
  if (
    input.supplierId &&
    !(await prisma.supplier.findUnique({ where: { id: input.supplierId } }))
  )
    return "Select a valid supplier";
  if (
    input.fundingSourceId &&
    !(await prisma.fundingSource.findUnique({
      where: { id: input.fundingSourceId },
    }))
  )
    return "Select a valid funding source";
  return null;
}

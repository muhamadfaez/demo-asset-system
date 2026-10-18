import { AccountStatus, AssetStatus, RoleName } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canAccessAsset } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { incidentSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.status !== AccountStatus.ACTIVE) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const parsed = incidentSchema.safeParse(body);
  if (!parsed.success || (parsed.success && parsed.data.discoveredAt > new Date())) return NextResponse.json({ error: "Check the incident details and discovery date" }, { status: 400 });
  const asset = await prisma.asset.findUnique({ where: { id: parsed.data.assetId } });
  if (!asset || !canAccessAsset(session.user, asset) || asset.archivedAt || asset.status === AssetStatus.DISPOSED) return NextResponse.json({ error: "Asset is not available for reporting" }, { status: 404 });
  try {
    const incident = await prisma.assetIncident.create({ data: {
      ...parsed.data,
      policeReportNumber: parsed.data.policeReportNumber || null,
      incidentNumber: `IN-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      reportedById: session.user.id
    } });
    try {
      await audit({ userId: session.user.id, action: "REPORT", module: "Incidents", recordType: "AssetIncident", recordId: incident.id, newValues: incident });
      const reviewers = await prisma.user.findMany({ where: { status: AccountStatus.ACTIVE, OR: [{ role: RoleName.SUPERADMIN }, { role: RoleName.ASSET_LIAISON, departmentId: asset.departmentId }] }, select: { id: true } });
      if (reviewers.length) await prisma.notification.createMany({ data: reviewers.map(({ id }) => ({ userId: id, title: "Asset incident reported", message: `${incident.incidentNumber}: ${asset.tagNumber} (${incident.type})`, href: "/incidents" })) });
    } catch (error) { console.error("Incident notification or audit failed", error); }
    return NextResponse.json({ incident }, { status: 201 });
  } catch (error) {
    console.error("Incident report failed", error);
    return NextResponse.json({ error: "Unable to submit incident report" }, { status: 500 });
  }
}

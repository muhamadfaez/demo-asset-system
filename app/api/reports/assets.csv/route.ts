import { NextResponse } from "next/server";
import Papa from "papaparse";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { assetScopeFor, can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || !can(session.user, "report:export")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const assets = await prisma.asset.findMany({ where: assetScopeFor(session.user), include: { category: true, department: true, room: true } });
  const csv = Papa.unparse(assets.map((a) => ({ tag: a.tagNumber, name: a.name, category: a.category.name, department: a.department.name, room: a.room.name, borrowable: a.borrowable ? "Yes" : "No", status: a.status, condition: a.condition, value: a.acquisitionCost })));
  await audit({ userId: session.user.id, action: "EXPORT_CSV", module: "Reports", recordType: "Asset" });
  return new NextResponse(csv, { headers: { "content-type": "text/csv", "content-disposition": "attachment; filename=asset-register.csv" } });
}

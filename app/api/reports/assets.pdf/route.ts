import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { assetScopeFor, can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getSystemSettings } from "@/lib/settings";

export async function GET() {
  const session = await auth();
  if (!session?.user || !can(session.user, "report:export")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [assets, settings] = await Promise.all([
    prisma.asset.findMany({ where: assetScopeFor(session.user), include: { department: true }, take: 40, orderBy: { tagNumber: "asc" } }),
    getSystemSettings()
  ]);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText(settings.systemName, { x: 40, y: 550, size: 18, font, color: rgb(0.06, 0.32, 0.2) });
  assets.forEach((asset, i) => {
    page.drawText(`${asset.tagNumber}  ${asset.name}  ${asset.department.name}  ${asset.status}  ${settings.currency} ${asset.acquisitionCost}`, { x: 40, y: 515 - i * 12, size: 9, font });
  });
  await audit({ userId: session.user.id, action: "EXPORT_PDF", module: "Reports", recordType: "Asset" });
  const bytes = await pdf.save();
  return new NextResponse(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }), { headers: { "content-disposition": "attachment; filename=asset-register.pdf" } });
}

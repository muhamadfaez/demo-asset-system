import { AssetStatus, RoleName } from "@prisma/client";
import { Card, EmptyState } from "@/components/ui";
import { IncidentReportForm } from "./incident-report-form";
import { GenericModulePage } from "@/components/module-page";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export default async function Page() {
  const user = await getCurrentUser();
  const scope = user.role === RoleName.USER ? { assignedUserId: user.id } : user.role === RoleName.ASSET_LIAISON ? { departmentId: user.departmentId ?? "__unassigned__" } : {};
  const assets = await prisma.asset.findMany({ where: { ...scope, archivedAt: null, status: { not: AssetStatus.DISPOSED } }, select: { id: true, tagNumber: true, name: true }, orderBy: { tagNumber: "asc" } });
  return <div className="space-y-5"><Card><h2 className="text-lg font-semibold text-slate-900">Report an asset incident</h2><p className="mb-5 mt-1 text-sm text-slate-500">Select an asset assigned to you and describe what happened.</p>{assets.length ? <IncidentReportForm assets={assets} /> : <EmptyState title="No assets available to report" body="Assets currently assigned to your account will appear here." />}</Card><GenericModulePage user={user} kind="incidents" title="Incident Reports" subtitle="Report and investigate missing, lost, stolen, misplaced, or damaged assets." /></div>;
}

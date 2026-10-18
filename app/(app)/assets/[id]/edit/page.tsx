import { AssetCondition, AssetStatus, RoleName } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { assetScopeFor, can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getSystemSettings } from "@/lib/settings";
import { AssetEditForm } from "@/app/(app)/assets/[id]/edit/asset-edit-form";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user, "asset:update")) redirect("/unauthorized");
  const id = (await params).id;
  const departmentWhere = user.role === RoleName.ASSET_LIAISON ? { id: user.departmentId ?? "__unassigned__" } : {};
  const kulliyyahWhere = user.role === RoleName.ASSET_LIAISON ? { departments: { some: { id: user.departmentId ?? "__unassigned__" } } } : {};
  const [asset, categories, kulliyyahs, departments, buildings, rooms, settings] = await Promise.all([
    prisma.asset.findFirst({ where: { AND: [{ id }, assetScopeFor(user)] }, include: { assignedUser: { include: { department: true } } } }),
    prisma.assetCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.kulliyyah.findMany({ where: kulliyyahWhere, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: departmentWhere, include: { kulliyyah: { select: { name: true } } }, orderBy: { name: "asc" } }),
    prisma.building.findMany({ include: { campus: { select: { name: true } } }, orderBy: { name: "asc" } }),
    prisma.room.findMany({ include: { floor: { include: { building: { select: { name: true } } } } }, orderBy: { name: "asc" } }),
    getSystemSettings()
  ]);
  if (!asset) notFound();
  const mapOptions = (rows: Array<{ id: string; name: string }>) => rows.map((row) => ({ value: row.id, label: row.name }));
  return <div className="space-y-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-iium-green">Asset management</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Edit {asset.name}</h1><p className="mt-1 text-sm text-slate-500">Update registration details, operational status, and borrowing availability.</p></div><Card><AssetEditForm asset={asset} currency={settings.currency} options={{ categories: mapOptions(categories), kulliyyahs: mapOptions(kulliyyahs), departments: departments.map((item) => ({ value: item.id, label: `${item.kulliyyah.name} / ${item.name}`, parentId: item.kulliyyahId })), buildings: buildings.map((item) => ({ value: item.id, label: `${item.campus.name} / ${item.name}` })), rooms: rooms.map((item) => ({ value: item.id, label: `${item.floor.building.name} / ${item.floor.name} / ${item.name}`, parentId: item.floor.buildingId })), conditions: Object.values(AssetCondition).map((value) => ({ value, label: value.replaceAll("_", " ") })), statuses: Object.values(AssetStatus).map((value) => ({ value, label: value.replaceAll("_", " ") })) }} /></Card></div>;
}

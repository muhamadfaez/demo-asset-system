import { redirect } from "next/navigation";
import { ReferenceManager } from "@/app/(app)/reference-data/reference-manager";
import type { ReferenceGroup } from "@/app/(app)/reference-data/types";
import { getCurrentUser } from "@/lib/current-user";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function Page() {
  const user = await getCurrentUser();
  if (!can(user, "settings:manage")) redirect("/unauthorized");
  const categories = await prisma.assetCategory.findMany({ orderBy: { name: "asc" } });
  const groups: ReferenceGroup[] = [{ kind: "category", title: "Asset Categories", description: "Categories used when registering or editing assets.", items: categories.map((x) => ({ id: x.id, name: x.name })) }];
  return <div className="space-y-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-iium-green">Administration</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Master Data</h1><p className="mt-1 text-sm text-slate-500">Create and edit asset categories.</p></div><ReferenceManager groups={groups} /></div>;
}

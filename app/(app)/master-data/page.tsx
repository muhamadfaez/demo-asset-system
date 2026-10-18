import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Boxes, MapPin } from "lucide-react";
import { ReferenceManager } from "@/app/(app)/reference-data/reference-manager";
import { LocationGroups } from "@/app/(app)/reference-data/location-groups";
import type { ReferenceGroup } from "@/app/(app)/reference-data/types";
import { getCurrentUser } from "@/lib/current-user";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const user = await getCurrentUser();
  if (!can(user, "settings:manage")) redirect("/unauthorized");
  const tab = (await searchParams).tab === "locations" ? "locations" : "categories";
  const tabs = [
    { id: "categories", label: "Asset Categories", icon: Boxes },
    { id: "locations", label: "Asset Location Setting", icon: MapPin }
  ];
  return <div className="space-y-5">
    <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-iium-green">Administration</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Master Data</h1><p className="mt-1 text-sm text-slate-500">Manage asset categories and organisational and physical locations in one place.</p></div>
    <nav aria-label="Master Data sections" className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-glass sm:flex sm:w-fit">
      {tabs.map(({ id, label, icon: Icon }) => <Link prefetch={false} key={id} href={`/master-data?tab=${id}`} aria-current={tab === id ? "page" : undefined} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-center text-sm font-semibold sm:px-5 ${tab === id ? "bg-iium-green text-white shadow-lift" : "text-slate-600 hover:bg-slate-50 hover:text-iium-deep"}`}><Icon className="h-4 w-4 shrink-0" />{label}</Link>)}
    </nav>
    <section aria-label={tab === "locations" ? "Asset Location Setting" : "Asset Categories"}>
      <Suspense key={tab} fallback={<ReferenceDataLoading />}>
        {tab === "locations" ? <LocationGroups /> : <CategoryGroups />}
      </Suspense>
    </section>
  </div>;
}

async function CategoryGroups() {
  const categories = await prisma.assetCategory.findMany({ orderBy: { name: "asc" } });
  const groups: ReferenceGroup[] = [{ kind: "category", title: "Asset Categories", description: "Categories used when registering or editing assets.", items: categories.map((x) => ({ id: x.id, name: x.name })) }];
  return <ReferenceManager groups={groups} />;
}

function ReferenceDataLoading() {
  return <div role="status" aria-label="Loading master data" className="grid gap-5 xl:grid-cols-2"><span className="sr-only">Loading master data...</span>{[0, 1].map((key) => <div key={key} aria-hidden="true" className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 motion-safe:animate-pulse"><div className="h-5 w-40 rounded bg-slate-200" /><div className="h-3 w-3/4 rounded bg-slate-100" /><div className="h-12 rounded-lg bg-teal-50" /><div className="h-16 rounded bg-slate-100" /></div>)}</div>;
}

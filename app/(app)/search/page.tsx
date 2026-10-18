import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { searchWorkspace } from "@/lib/workspace-search";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import { navItems } from "@/lib/navigation";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const user = await getCurrentUser();
  if (!can(user, "dashboard:view")) redirect("/unauthorized");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const valid = q.length >= 2;
  const pages = valid ? navItems.filter((item) => item.roles.includes(user.role) && item.label.toLowerCase().includes(q.toLowerCase())) : [];
  const [assets, users, notifications] = await searchWorkspace(user, q);
  const count = pages.length + assets.length + users.length + notifications.length;
  return <div className="space-y-5">
    <div><p className="text-xs font-bold uppercase tracking-widest text-iium-green">Workspace</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Search</h1><p className="mt-1 text-sm text-slate-500">Find assets, people, pages, and your notifications.</p></div>
    <form action="/search" method="get" role="search" className="flex gap-2">
      <input name="q" type="search" aria-label="Search workspace" defaultValue={q} required minLength={2} maxLength={100} placeholder="Enter a name, asset tag, serial number, or email" className="min-w-0 flex-1" />
      <button className="rounded-lg bg-iium-green px-4 text-sm font-semibold text-white">Search</button>
    </form>
    {!valid ? <p className="rounded-xl border bg-white p-6 text-sm text-slate-500">Enter at least 2 characters to search.</p> : <>
      <p role="status" className="text-sm text-slate-600">{count ? `${count} results shown for “${q}”` : `No results for “${q}”. Try a different name, tag, or serial number.`}</p>
      {!!pages.length && <Results title="Pages">{pages.map((page) => <Result key={page.href} href={page.href} title={page.label} description={page.section} />)}</Results>}
      {!!assets.length && <Results title="Assets"><p className="px-4 py-2 text-xs text-slate-500">Up to 20 most recently updated matches within your access.</p>{assets.map((asset) => <Result key={asset.id} href={`/assets/${asset.id}`} title={asset.name} description={`${asset.tagNumber} · ${asset.serialNumber || "No serial number"} · ${asset.status.replaceAll("_", " ")}`} />)}<Link className="block p-4 text-sm font-semibold text-iium-deep" href={`/assets?q=${encodeURIComponent(q)}`}>Open asset register results →</Link></Results>}
      {!!users.length && <Results title="People (up to 20)">{users.map((person) => <Result key={person.id} href={`/users?q=${encodeURIComponent(person.email)}`} title={person.name} description={person.email} />)}</Results>}
      {!!notifications.length && <Results title="Your notifications (up to 10)">{notifications.map((notice) => <Result key={notice.id} href="/notifications" title={notice.title} description={notice.message} />)}</Results>}
    </>}
  </div>;
}

function Results({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><h2 className="border-b bg-slate-50 px-4 py-3 font-semibold text-slate-900">{title}</h2><div className="divide-y divide-slate-100">{children}</div></section>;
}
function Result({ href, title, description }: { href: string; title: string; description: string }) {
  return <Link href={href} className="block px-4 py-3 hover:bg-teal-50"><p className="font-semibold text-iium-deep">{title}</p><p className="mt-1 truncate text-sm text-slate-500">{description}</p></Link>;
}

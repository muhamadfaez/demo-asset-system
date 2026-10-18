import { getDateFormatter } from "@/lib/date-formatter";
import { AccountStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { Badge, Card, EmptyState } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { UserControls } from "@/app/(app)/users/user-controls";
import { PersonalInfoForm } from "@/app/(app)/users/personal-info-form";
import Link from "next/link";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const query = (await searchParams).q;
  const q = typeof query === "string" ? query.trim().slice(0, 100) : "";
  const currentUser = await getCurrentUser();
  if (!can(currentUser, "user:manage")) redirect("/unauthorized");
  const [users, departments] = await Promise.all([
    prisma.user.findMany({ where: q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { staffNo: { contains: q } }] } : {}, include: { department: true }, orderBy: { createdAt: "desc" } }),
    prisma.department.findMany({ where: { active: true }, orderBy: { name: "asc" } })
  ]);
  const pending = users.filter((user) => user.status === AccountStatus.PENDING);
  const directory = users.filter((user) => user.status !== AccountStatus.PENDING);
  const departmentOptions = departments.map(({ id, name }) => ({ id, name }));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-iium-green">Administration</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
        <p className="mt-1 text-sm text-slate-500">Review registrations, assign access roles and departments, and manage account status.</p>
        {q && <p className="mt-2 text-sm text-iium-deep">Showing people matching “{q}”. <Link prefetch={false} href="/users" className="underline">Show all users</Link></p>}
      </div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Pending review" value={pending.length} tone="gold" />
        <Summary label="Active users" value={users.filter((user) => user.status === AccountStatus.ACTIVE).length} />
        <Summary label="Asset liaisons" value={users.filter((user) => user.role === "ASSET_LIAISON" && user.status === AccountStatus.ACTIVE).length} />
        <Summary label="Suspended / rejected" value={users.filter((user) => user.status === AccountStatus.SUSPENDED || user.status === AccountStatus.REJECTED).length} tone="red" />
      </section>

      <section className="space-y-3">
        <div><h2 className="font-semibold text-slate-900">Pending registrations</h2><p className="text-xs text-slate-500">Confirm the applicant’s role and department before approval.</p></div>
        {!pending.length ? <EmptyState title="No registrations awaiting review" body="New permitted-domain accounts will appear here after their first Google sign-in." /> : (
          <div className="grid gap-4 xl:grid-cols-2">
            {pending.map((user) => <Card key={user.id} className="border-iium-gold/25">
              <UserIdentity user={user} />
              <PersonalInfoForm user={user} />
              <div className="mt-4 border-t border-slate-100 pt-4"><UserControls user={user} departments={departmentOptions} review /></div>
            </Card>)}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div><h2 className="font-semibold text-slate-900">Account directory</h2><p className="text-xs text-slate-500">Role and status changes take effect on the user’s next request.</p></div>
        <div className="grid gap-4 xl:grid-cols-2">
          {directory.map((user) => <Card key={user.id}>
            <UserIdentity user={user} />
            <PersonalInfoForm user={user} />
            {user.id === currentUser.id ? <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">This is your current account. Self-management is disabled here for safety.</p> : <div className="mt-4 border-t border-slate-100 pt-4"><UserControls user={user} departments={departmentOptions} /></div>}
          </Card>)}
        </div>
      </section>
    </div>
  );
}

function UserIdentity({ user }: { user: { name: string; email: string; role: string; status: AccountStatus; department: { name: string } | null; createdAt: Date; lastLoginAt: Date | null } }) {
  const tone = user.status === "ACTIVE" ? "green" : user.status === "PENDING" ? "gold" : user.status === "SUSPENDED" || user.status === "REJECTED" ? "red" : "slate";
  return <div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-iium-green/10 text-sm font-bold text-iium-deep">{user.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold text-slate-900">{user.name}</h3><Badge tone={tone}>{user.status.replaceAll("_", " ")}</Badge></div><p className="truncate text-sm text-slate-500">{user.email}</p><p className="mt-1 text-xs text-slate-400">{user.department?.name ?? "No department"} · Joined {getDateFormatter("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(user.createdAt)}</p></div></div>;
}

function Summary({ label, value, tone = "green" }: { label: string; value: number; tone?: "green" | "gold" | "red" }) {
  const accent = tone === "gold" ? "bg-iium-gold" : tone === "red" ? "bg-rose-500" : "bg-iium-green";
  return <Card className="relative overflow-hidden p-4"><span className={`absolute inset-y-0 left-0 w-1 ${accent}`} /><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></Card>;
}

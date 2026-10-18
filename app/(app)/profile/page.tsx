import { getDateFormatter } from "@/lib/date-formatter";
import { Badge, Card } from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";
import { getCurrentUser } from "@/lib/current-user";
import { ProfileForm } from "@/app/(app)/profile/profile-form";
import { BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";

export default async function Page() {
  const user = await getCurrentUser();
  const role = user.role === "SUPERADMIN" ? "Superadmin" : user.role === "ASSET_LIAISON" ? "Asset Liaison" : "User";
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-iium-green">Account</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">My Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Your Google identity and IIUM KAMS account information.</p>
      </div>

      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-iium-deep via-iium-green to-[#13aaa5] p-6 text-white shadow-lift sm:p-8">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border-[36px] border-white/10" />
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <UserAvatar name={user.name} image={user.image} size="lg" priority className="border-4 border-white/80 shadow-xl" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{user.name}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold"><CheckCircle2 className="h-3.5 w-3.5" />Google account</span>
            </div>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/80"><Mail className="h-4 w-4" />{user.email}</p>
            <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-md bg-white/15 px-3 py-1.5 text-xs font-semibold">{role}</span><span className="rounded-md bg-iium-gold px-3 py-1.5 text-xs font-semibold">{user.status}</span></div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4"><span className="grid h-9 w-9 place-items-center rounded-lg bg-iium-green/10 text-iium-deep"><UserRound className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-slate-900">Personal information</h2><p className="text-xs text-slate-400">Identity details associated with your account.</p></div></div>
          <dl className="mt-2 divide-y divide-slate-100">
            <ProfileRow icon={Mail} label="Email address" value={user.email} />
            <ProfileRow icon={BriefcaseBusiness} label="Position" value={user.position ?? "Not provided"} />
            <ProfileRow icon={Phone} label="Phone number" value={user.phone ?? "Not provided"} />
            <ProfileRow icon={ShieldCheck} label="Staff number" value={user.staffNo ?? "Not provided"} />
          </dl>
          <ProfileForm position={user.position} phone={user.phone} staffNo={user.staffNo} />
        </Card>
        <Card>
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4"><span className="grid h-9 w-9 place-items-center rounded-lg bg-iium-gold/15 text-amber-700"><ShieldCheck className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-slate-900">Account information</h2><p className="text-xs text-slate-400">Access and account activity details.</p></div></div>
          <dl className="mt-2 divide-y divide-slate-100">
            <ProfileRow icon={ShieldCheck} label="Access role" value={role} />
            <ProfileRow icon={CheckCircle2} label="Account status" value={<Badge>{user.status}</Badge>} />
            <ProfileRow icon={Clock3} label="Last sign-in" value={formatDate(user.lastLoginAt, true)} />
            <ProfileRow icon={CalendarDays} label="Member since" value={formatDate(user.createdAt)} />
          </dl>
        </Card>
      </div>
    </div>
  );
}

function ProfileRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return <div className="flex items-center gap-3 py-3.5"><Icon className="h-4 w-4 shrink-0 text-slate-400" /><dt className="min-w-28 text-xs font-medium text-slate-500">{label}</dt><dd className="min-w-0 flex-1 break-words text-right text-sm font-semibold text-slate-800">{value}</dd></div>;
}

function formatDate(value: Date | null, includeTime = false) {
  if (!value) return "Not available";
  return getDateFormatter("en-GB", { day: "2-digit", month: "short", year: "numeric", ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(value);
}

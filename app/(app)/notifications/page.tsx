import Link from "next/link";
import { Bell, Check, CheckCheck, ExternalLink, HandCoins, UserPlus } from "lucide-react";
import { RoleName } from "@prisma/client";
import { Card, EmptyState } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { getSystemSettings } from "@/lib/settings";
import { markAllNotificationsRead, markNotificationRead, openNotification } from "@/app/(app)/notifications/actions";

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await getCurrentUser();
  const view = (await searchParams).view === "unread" ? "unread" : "all";
  const [notifications, total, unread, settings] = await Promise.all([
    prisma.notification.findMany({ where: { userId: user.id, ...(view === "unread" ? { readAt: null } : {}) }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.notification.count({ where: { userId: user.id } }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    getSystemSettings()
  ]);
  const title = user.role === RoleName.SUPERADMIN ? "Administrative Notifications" : user.role === RoleName.ASSET_LIAISON ? "Department Notifications" : "My Notifications";
  const description = user.role === RoleName.SUPERADMIN ? "Account registrations, borrowing reviews, and system actions assigned to administrators." : user.role === RoleName.ASSET_LIAISON ? "Review alerts for workflows within your assigned department." : "Borrowing decisions, account updates, and alerts addressed only to your account.";
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-iium-green">Inbox</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{title}</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p></div>{unread > 0 && <form action={markAllNotificationsRead}><button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"><CheckCheck className="h-4 w-4" />Mark all as read</button></form>}</div>
      <section className="grid gap-3 sm:grid-cols-2"><Summary label="Total notifications" value={total} /><Summary label="Unread" value={unread} accent /></section>
      <div className="flex gap-2 border-b border-slate-200"><Tab href="/notifications" active={view === "all"}>All ({total})</Tab><Tab href="/notifications?view=unread" active={view === "unread"}>Unread ({unread})</Tab></div>
      {notifications.length ? <section className="space-y-3">{notifications.map((notification) => {
        const Icon = notification.href === "/users" ? UserPlus : notification.href === "/borrowings" ? HandCoins : Bell;
        return <Card key={notification.id} className={`flex gap-4 p-4 ${notification.readAt ? "bg-white/70" : "border-iium-green/25 bg-white"}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${notification.readAt ? "bg-slate-100 text-slate-500" : "bg-iium-green/10 text-iium-deep"}`}><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-slate-900">{notification.title}</h2>{!notification.readAt && <span className="h-2 w-2 rounded-full bg-iium-green" aria-label="Unread" />}</div><p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p><p className="mt-2 text-xs text-slate-400">{formatDate(notification.createdAt, settings.timeZone)}</p></div><div className="flex shrink-0 items-start gap-2">{!notification.readAt && <form action={markNotificationRead}><input type="hidden" name="id" value={notification.id} /><button className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-iium-deep" aria-label="Mark as read" title="Mark as read"><Check className="h-4 w-4" /></button></form>}{notification.href && <form action={openNotification}><input type="hidden" name="id" value={notification.id} /><button className="rounded-lg bg-iium-green p-2 text-white hover:bg-iium-deep" aria-label="Open notification" title="Open notification"><ExternalLink className="h-4 w-4" /></button></form>}</div></Card>;
      })}</section> : <EmptyState title={view === "unread" ? "You’re all caught up" : "No notifications yet"} body={view === "unread" ? "There are no unread notifications for your account." : "Notifications addressed to your account will appear here."} />}
    </div>
  );
}

function Summary({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) { return <Card className="relative overflow-hidden p-4"><span className={`absolute inset-y-0 left-0 w-1 ${accent ? "bg-iium-gold" : "bg-iium-green"}`} /><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></Card>; }
function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) { return <Link href={href} className={`border-b-2 px-3 py-2 text-sm font-semibold ${active ? "border-iium-green text-iium-deep" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{children}</Link>; }
function formatDate(value: Date, timeZone: string) { return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone }).format(value); }

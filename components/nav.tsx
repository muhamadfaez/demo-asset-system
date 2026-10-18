"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import { usePathname } from "next/navigation";
import { Bell, Boxes, ClipboardCheck, FileBarChart, LayoutDashboard, MapPin, Menu, QrCode, ScanLine, Search, Settings, ShieldCheck, Users, X } from "lucide-react";
import type { RoleName } from "@prisma/client";
import { cn } from "@/components/ui";
import { LogoutButton } from "@/components/logout-button";
import { UserAvatar } from "@/components/user-avatar";

const navSections = ["Overview", "Asset operations", "Insights", "Administration"] as const;
type NavSection = (typeof navSections)[number];
type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }>; roles: RoleName[]; section: NavSection };

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["SUPERADMIN", "ASSET_LIAISON", "USER"], section: "Overview" },
  { href: "/notifications", label: "Notifications", icon: Bell, roles: ["SUPERADMIN", "ASSET_LIAISON", "USER"], section: "Overview" },
  { href: "/assets", label: "Assets", icon: Boxes, roles: ["SUPERADMIN", "ASSET_LIAISON", "USER"], section: "Asset operations" },
  { href: "/qr-scanner", label: "Scan Asset", icon: ScanLine, roles: ["SUPERADMIN"], section: "Asset operations" },
  { href: "/borrowings", label: "Borrowing", icon: ClipboardCheck, roles: ["SUPERADMIN", "ASSET_LIAISON", "USER"], section: "Asset operations" },
  { href: "/transfers", label: "Transfers", icon: ClipboardCheck, roles: ["SUPERADMIN", "ASSET_LIAISON", "USER"], section: "Asset operations" },
  { href: "/maintenance", label: "Maintenance", icon: ClipboardCheck, roles: ["SUPERADMIN", "ASSET_LIAISON", "USER"], section: "Asset operations" },
  { href: "/verification", label: "Verification", icon: QrCode, roles: ["SUPERADMIN", "ASSET_LIAISON"], section: "Asset operations" },
  { href: "/incidents", label: "Incidents", icon: ClipboardCheck, roles: ["SUPERADMIN", "ASSET_LIAISON", "USER"], section: "Asset operations" },
  { href: "/disposal", label: "Disposal", icon: ClipboardCheck, roles: ["SUPERADMIN", "ASSET_LIAISON"], section: "Asset operations" },
  { href: "/reports", label: "Reports", icon: FileBarChart, roles: ["SUPERADMIN", "ASSET_LIAISON"], section: "Insights" },
  { href: "/audit-logs", label: "Audit Logs", icon: ShieldCheck, roles: ["SUPERADMIN"], section: "Insights" },
  { href: "/users", label: "Users", icon: Users, roles: ["SUPERADMIN"], section: "Administration" },
  { href: "/locations", label: "Locations", icon: MapPin, roles: ["SUPERADMIN"], section: "Administration" },
  { href: "/master-data", label: "Master Data", icon: Boxes, roles: ["SUPERADMIN"], section: "Administration" },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["SUPERADMIN"], section: "Administration" }
];

const mobilePrimary = [
  { href: "/dashboard", label: "Home" },
  { href: "/assets", label: "Assets" },
  { href: "/borrowings", label: "Borrow" },
  { href: "/maintenance", label: "Maintain" }
];

export function Sidebar({ role, organisationName, systemName }: { role: RoleName; organisationName: string; systemName: string }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const visibleItems = navItems.filter((item) => item.roles.includes(role));
  const mobileItems = mobilePrimary.map((primary) => ({ ...visibleItems.find((item) => item.href === primary.href)!, label: primary.label }));
  const moreItems = visibleItems.filter((item) => !mobilePrimary.some((primary) => primary.href === item.href));
  const moreActive = moreItems.some((item) => isActive(pathname, item.href));

  useEffect(() => setMoreOpen(false), [pathname]);

  return (
    <>
      <aside className="hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-glass lg:sticky lg:top-4 lg:flex">
        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-slate-100 px-5">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-iium-green to-iium-deep text-base font-bold text-white shadow-lift">II</div>
          <div>
            <p className="max-w-40 truncate text-base font-extrabold tracking-tight text-iium-deep" title={organisationName}>{organisationName}</p>
            <p className="max-w-40 truncate text-[11px] text-slate-400" title={systemName}>{systemName}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto p-3" aria-label="Main navigation">
          {navSections.map((section) => {
            const items = visibleItems.filter((item) => item.section === section);
            if (!items.length) return null;
            return <div key={section}>
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{section}</p>
              <div className="space-y-1">{items.map((item) => {
                const active = isActive(pathname, item.href);
                return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-iium-deep", active && "bg-gradient-to-r from-iium-deep to-iium-green text-white shadow-lift hover:text-white")}>
                  <item.icon className="h-[18px] w-[18px]" />{navLabel(item.href, item.label, role)}
                </Link>;
              })}</div>
            </div>;
          })}
        </nav>
        <div className="shrink-0 border-t border-slate-100 p-3">
          <LogoutButton className="w-full justify-start border-0 shadow-none" />
        </div>
      </aside>
      {moreOpen && <>
        <button type="button" className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" aria-label="Close menu" onClick={() => setMoreOpen(false)} />
        <div id="mobile-more-menu" className="fixed inset-x-2 z-40 max-h-[min(65vh,32rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl lg:hidden" style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold text-slate-900">All pages</h2><button type="button" onClick={() => setMoreOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
          {navSections.map((section) => {
            const items = moreItems.filter((item) => item.section === section);
            if (!items.length) return null;
            return <div key={section} className="mb-4 last:mb-0"><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{section}</p><div className="grid grid-cols-2 gap-2">{items.map((item) => <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} aria-current={isActive(pathname, item.href) ? "page" : undefined} className={cn("flex min-h-11 items-center gap-2 rounded-lg bg-slate-50 px-3 text-xs font-medium text-slate-700", isActive(pathname, item.href) && "bg-iium-green text-white")}><item.icon className="h-4 w-4 shrink-0" />{navLabel(item.href, item.label, role)}</Link>)}</div></div>;
          })}
        </div>
      </>}
      <nav className="fixed inset-x-2 z-40 grid grid-cols-5 gap-1 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur-xl lg:hidden" style={{ bottom: "calc(0.5rem + env(safe-area-inset-bottom))" }} aria-label="Mobile navigation">
        {mobileItems.map((item) => <Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined} className={cn("flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] font-semibold text-slate-500", isActive(pathname, item.href) && "bg-iium-green text-white")}><item.icon className="h-5 w-5" /><span className="truncate">{item.label}</span></Link>)}
        <button type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} aria-controls="mobile-more-menu" className={cn("flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] font-semibold text-slate-500", (moreOpen || moreActive) && "bg-iium-green text-white")}><Menu className="h-5 w-5" /><span>More</span></button>
      </nav>
    </>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLabel(href: string, fallback: string, role: RoleName) {
  if (role === "USER") return ({ "/dashboard": "My Dashboard", "/assets": "My Assets", "/borrowings": "My Borrowing", "/transfers": "My Transfers", "/maintenance": "My Maintenance", "/incidents": "My Incidents", "/notifications": "My Alerts" } as Record<string, string>)[href] ?? fallback;
  if (role === "ASSET_LIAISON") return ({ "/dashboard": "Department", "/assets": "Dept. Assets", "/borrowings": "Dept. Borrowing", "/maintenance": "Dept. Maintenance", "/incidents": "Dept. Incidents", "/reports": "Dept. Reports" } as Record<string, string>)[href] ?? fallback;
  return fallback;
}

export function Topbar({ name, image, role, systemName, unreadNotifications }: { name: string; image?: string | null; role: string; systemName: string; unreadNotifications: number }) {
  return (
    <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-4 bg-gradient-to-r from-iium-deep via-iium-green to-[#12aaa5] px-4 text-white shadow-lift lg:top-4 lg:rounded-xl lg:px-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Welcome, {name}!</h1>
        <p className="mt-0.5 hidden max-w-md truncate text-[11px] font-medium text-white/70 sm:block">{role} · {systemName}</p>
      </div>
      <div className="flex items-center gap-2">
        <label className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
          <input aria-label="Global search" className="w-64 border-white/25 bg-white/10 py-2 pl-9 text-white shadow-none placeholder:text-white/60 hover:border-white/40 hover:bg-white/15 focus:border-white/60 focus:ring-white/10" placeholder="Search anything..." />
        </label>
        <Link href="/notifications" className="relative rounded-lg bg-white/10 p-2.5 text-white hover:bg-white/20" aria-label={`${unreadNotifications} unread notifications`}><Bell className="h-4 w-4" />{unreadNotifications > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-iium-green bg-iium-gold px-1 text-[9px] font-bold text-white">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>}</Link>
        <Link href="/profile" className="ml-1 rounded-full" aria-label={`${name}, ${role}`}><UserAvatar name={name} image={image} priority className="border-2 border-white/70 shadow-sm" /></Link>
        <div className="lg:hidden"><LogoutButton compact className="border-white/20 bg-white/10 text-white shadow-none hover:bg-white/20 hover:text-white" /></div>
      </div>
    </header>
  );
}

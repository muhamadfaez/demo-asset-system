import { redirect } from "next/navigation";
import { AccountStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Sidebar, Topbar } from "@/components/nav";
import { getSystemSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user.status === AccountStatus.PENDING) redirect("/pending");
  if (user.status === AccountStatus.SUSPENDED) redirect("/suspended");
  if (user.status !== AccountStatus.ACTIVE) redirect("/unauthorized");
  const [settings, unreadNotifications] = await Promise.all([
    getSystemSettings(),
    prisma.notification.count({ where: { userId: user.id, readAt: null } })
  ]);

  return (
    <div className="min-h-screen bg-[#f3f5f9] lg:flex lg:gap-4 lg:p-4">
      <Sidebar role={user.role} organisationName={settings.organisationName} systemName={settings.systemName} appIconVersion={settings.appIconVersion} />
      <div className="min-w-0 flex-1">
        <Topbar name={user.name} image={user.image} role={user.role.replace("_", " ")} systemName={settings.systemName} unreadNotifications={unreadNotifications} />
        <main className="mx-auto max-w-[1600px] p-4 pb-28 lg:px-0 lg:pb-4 lg:pt-5">{children}</main>
      </div>
    </div>
  );
}

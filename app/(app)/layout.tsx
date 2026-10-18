import { redirect } from "next/navigation";
import { AccountStatus } from "@prisma/client";
import { getUnreadNotificationCount } from "@/lib/notification-count";
import { Sidebar, Topbar } from "@/components/nav";
import { getSystemSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/current-user";
import { DeveloperFooter } from "@/components/developer-footer";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user.status === AccountStatus.PENDING) redirect("/pending");
  if (user.status === AccountStatus.SUSPENDED) redirect("/suspended");
  if (user.status !== AccountStatus.ACTIVE) redirect("/unauthorized");
  const [settings, unreadNotifications] = await Promise.all([
    getSystemSettings(),
    getUnreadNotificationCount(user.id)
  ]);

  return (
    <div className="min-h-screen bg-[#f3f5f9] lg:flex lg:gap-4 lg:p-4">
      <Sidebar role={user.role} organisationName={settings.organisationName} systemName={settings.systemName} appIconVersion={settings.appIconVersion} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={user.name} image={user.image} role={user.role.replace("_", " ")} systemName={settings.systemName} unreadNotifications={unreadNotifications} />
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 pb-6 lg:px-0 lg:pb-4 lg:pt-5">{children}</main>
        <DeveloperFooter className="pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-4" />
      </div>
    </div>
  );
}

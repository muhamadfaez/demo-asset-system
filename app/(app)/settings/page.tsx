import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { can } from "@/lib/permissions";
import { getSystemSettings } from "@/lib/settings";
import { SettingsForm } from "@/app/(app)/settings/settings-form";

export default async function Page() {
  const user = await getCurrentUser();
  if (!can(user, "settings:manage")) redirect("/unauthorized");
  const settings = await getSystemSettings();
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-iium-green">Administration</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">System Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage system identity, authorised access, numbering, localisation, and borrowing policy.</p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}

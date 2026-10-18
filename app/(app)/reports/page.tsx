import Link from "next/link";
import { GenericModulePage } from "@/components/module-page";
import { getCurrentUser } from "@/lib/current-user";

export default async function Page() {
  const user = await getCurrentUser();
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Link className="rounded-md bg-iium-green px-4 py-2 text-sm font-semibold text-white" href="/api/reports/assets.csv">Export CSV</Link>
        <Link className="rounded-md border border-iium-green px-4 py-2 text-sm font-semibold text-iium-green" href="/api/reports/assets.pdf">Export PDF</Link>
      </div>
      <GenericModulePage user={user} kind="reports" title="Reports" subtitle="Asset register, value, warranty, maintenance, transfer, verification, disposal, user activity, and audit reporting." />
    </div>
  );
}

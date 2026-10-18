import { GenericModulePage } from "@/components/module-page";
import { getCurrentUser } from "@/lib/current-user";

export default async function Page() {
  const user = await getCurrentUser();
  return <GenericModulePage user={user} kind="verification" title="Verification Campaigns" subtitle="QR-assisted asset verification, discrepancy capture, and completion reporting." />;
}

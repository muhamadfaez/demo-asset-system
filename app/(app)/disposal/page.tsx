import { GenericModulePage } from "@/components/module-page";
import { getCurrentUser } from "@/lib/current-user";

export default async function Page() {
  const user = await getCurrentUser();
  return <GenericModulePage user={user} kind="disposal" title="Disposal Requests" subtitle="Write-off, sale, auction, donation, recycling, return, destruction, and trade-in workflow." />;
}

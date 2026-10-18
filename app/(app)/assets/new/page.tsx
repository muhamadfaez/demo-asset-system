import { AssetFormPage } from "@/components/module-page";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { can } from "@/lib/permissions";

export default async function Page({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const user = await getCurrentUser();
  if (!can(user, "asset:create")) redirect("/unauthorized");
  const { code } = await searchParams;
  return <AssetFormPage user={user} initialBarcode={typeof code === "string" ? code.slice(0, 500) : ""} />;
}

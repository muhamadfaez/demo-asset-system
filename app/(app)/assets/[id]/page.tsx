import { AssetDetailPage } from "@/components/module-page";
import { getCurrentUser } from "@/lib/current-user";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  return <AssetDetailPage id={(await params).id} user={user} />;
}

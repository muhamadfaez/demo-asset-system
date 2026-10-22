import { AssetDetailPage } from "@/components/module-page";
import { getCurrentUser } from "@/lib/current-user";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const user = await getCurrentUser();
  const historyPage =
    Math.max(1, Math.min(10000, Number((await searchParams).p) || 1)) | 0;
  return (
    <AssetDetailPage
      historyPage={historyPage}
      id={(await params).id}
      user={user}
    />
  );
}

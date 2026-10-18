import { AssetsPage } from "@/components/module-page";
import { getCurrentUser } from "@/lib/current-user";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  return <AssetsPage user={user} searchParams={await searchParams} />;
}

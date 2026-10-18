import { Dashboard } from "@/components/module-page";
import { getCurrentUser } from "@/lib/current-user";

export default async function Page() {
  const user = await getCurrentUser();
  return <Dashboard user={user} />;
}

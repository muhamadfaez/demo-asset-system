import { GenericModulePage } from "@/components/module-page";
import { getCurrentUser } from "@/lib/current-user";

export default async function Page() {
  const user = await getCurrentUser();
  return <GenericModulePage user={user} kind="audit" title="Audit Logs" subtitle="Immutable record of authentication, approvals, workflow updates, imports, exports, and configuration changes." />;
}

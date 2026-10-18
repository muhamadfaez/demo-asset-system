import { AccountStatus, RoleName } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { ScannerLookup } from "./scanner-lookup";

export default async function Page() {
  const user = await getCurrentUser();
  if (user.status !== AccountStatus.ACTIVE || user.role !== RoleName.SUPERADMIN) redirect("/unauthorized");
  return <ScannerLookup />;
}

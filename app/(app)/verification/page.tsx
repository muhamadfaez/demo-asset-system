import { VerificationForm } from "@/components/verification-form";
import { prisma } from "@/lib/prisma";
import { assetScopeFor, can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { GenericModulePage } from "@/components/module-page";
import { getCurrentUser } from "@/lib/current-user";

export default async function Page() {
  const user = await getCurrentUser();
  if (!can(user, "verification:manage")) redirect("/unauthorized");
  const [assets, campaigns] = await Promise.all([
    prisma.asset.findMany({
      where: assetScopeFor(user),
      select: { id: true, name: true, tagNumber: true },
    }),
    prisma.verificationCampaign.findMany({
      where:
        user.role === "ASSET_LIAISON"
          ? {
              OR: [
                { departmentId: user.departmentId ?? "__unassigned__" },
                { departmentId: null },
              ],
            }
          : {},
      select: { id: true, name: true },
    }),
  ]);
  return (
    <div className="space-y-5">
      <VerificationForm assets={assets} campaigns={campaigns} />
      <GenericModulePage
        user={user}
        kind="verification"
        title="Verification Campaigns"
        subtitle="QR-assisted asset verification, discrepancy capture, and completion reporting."
      />
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, assetScopeFor } from "@/lib/permissions";
const schema = z.object({
  assetId: z.string().min(1),
  campaignId: z.string().min(1),
  result: z.enum(["FOUND", "MISSING", "WRONG_LOCATION", "DAMAGED"]),
  remarks: z.string().trim().max(2000).optional(),
});
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user, "verification:manage"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Select an asset, campaign and verification result" },
      { status: 400 },
    );
  const { assetId, campaignId, result, remarks } = parsed.data;
  const [asset, campaign] = await Promise.all([
    prisma.asset.findFirst({
      where: { AND: [{ id: assetId }, assetScopeFor(session.user)] },
    }),
    prisma.verificationCampaign.findUnique({ where: { id: campaignId } }),
  ]);
  if (!asset || !campaign)
    return NextResponse.json(
      { error: "Asset or campaign not found" },
      { status: 404 },
    );
  if (
    (campaign.departmentId && campaign.departmentId !== asset.departmentId) ||
    (campaign.kulliyyahId && campaign.kulliyyahId !== asset.kulliyyahId)
  )
    return NextResponse.json(
      { error: "Asset is outside this campaign scope" },
      { status: 400 },
    );
  const now = new Date();
  // The migration's AFTER INSERT trigger updates the asset summary and field audit rows.
  await prisma.assetVerification.create({
    data: {
      assetId,
      campaignId,
      verifierId: session.user.id,
      status: result,
      remarks,
      checkedAt: now,
    },
  });
  return NextResponse.json({ ok: true });
}

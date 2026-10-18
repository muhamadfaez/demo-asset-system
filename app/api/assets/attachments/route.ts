import { NextRequest, NextResponse } from "next/server";
import { getD1Binding } from "@/lib/cloudflare-db";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assetScopeFor, can } from "@/lib/permissions";
import { validateAttachment } from "@/lib/asset-attachments";
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user, "asset:update"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  if (Number(request.headers.get("content-length")) > 1200000)
    return NextResponse.json(
      { error: "Maximum upload is 1 MB" },
      { status: 413 },
    );
  const form = await request.formData();
  const assetId = String(form.get("assetId") ?? "");
  const asset = await prisma.asset.findFirst({
    where: { AND: [{ id: assetId }, assetScopeFor(session.user)] },
  });
  if (!asset)
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  const file = form.get("file");
  const typeLabel = String(form.get("typeLabel") ?? "");
  if (!file || typeof file === "string")
    return NextResponse.json({ error: "Choose a file" }, { status: 400 });
  const error = validateAttachment(file, typeLabel);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const document = await prisma.assetDocument.create({
    data: {
      assetId,
      fileName: file.name.slice(0, 200),
      fileUrl: "",
      mimeType: file.type,
      size: file.size,
      typeLabel,
      contentBase64: Buffer.from(await file.arrayBuffer()).toString("base64"),
      uploadedById: session.user.id,
    },
    select: { id: true, fileName: true, typeLabel: true },
  });
  return NextResponse.json({ document }, { status: 201 });
}
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user, "asset:read"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const document = await prisma.assetDocument.findFirst({
    where: {
      id: request.nextUrl.searchParams.get("id") ?? "",
      asset: assetScopeFor(session.user),
    },
  });
  if (!document?.contentBase64)
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  return new NextResponse(Buffer.from(document.contentBase64, "base64"), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user, "asset:update"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const document = await prisma.assetDocument.findFirst({
    where: {
      id: request.nextUrl.searchParams.get("id") ?? "",
      asset: assetScopeFor(session.user),
    },
  });
  if (!document)
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  const binding = getD1Binding();
  if (binding) {
    await binding.batch([
      binding
        .prepare('UPDATE "AssetDocument" SET "uploadedById"=? WHERE "id"=?')
        .bind(session.user.id, document.id),
      binding
        .prepare('DELETE FROM "AssetDocument" WHERE "id"=?')
        .bind(document.id),
    ]);
  } else {
    await prisma.$transaction([
      prisma.assetDocument.update({
        where: { id: document.id },
        data: { uploadedById: session.user.id },
      }),
      prisma.assetDocument.delete({ where: { id: document.id } }),
    ]);
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { assetScopeFor, can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !can(session.user, "asset:read")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const asset = await prisma.asset.findFirst({ where: { AND: [{ id: (await params).id }, assetScopeFor(session.user)] } });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const url = new URL(`/assets/${asset.id}`, request.url).toString();
  const png = await QRCode.toBuffer(url, { width: 512, margin: 2 });
  const body = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;
  return new NextResponse(new Blob([body], { type: "image/png" }), { headers: { "content-disposition": `inline; filename=${asset.tagNumber}.png` } });
}

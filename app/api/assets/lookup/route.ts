import { AccountStatus, RoleName } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.status !== AccountStatus.ACTIVE || session.user.role !== RoleName.SUPERADMIN) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = request.nextUrl.searchParams.get("code")?.trim() ?? "";
  if (!raw || raw.length > 500) return NextResponse.json({ error: "Enter a valid asset code" }, { status: 400 });
  let code = raw;
  if (/^https?:\/\//i.test(raw)) try {
    const url = new URL(raw);
    if (url.origin !== request.nextUrl.origin) return NextResponse.json({ error: "This QR label belongs to another site" }, { status: 400 });
    const match = /^\/assets\/([^/]+)\/?$/.exec(url.pathname);
    if (!match) return NextResponse.json({ error: "This QR code is not an asset label" }, { status: 400 });
    code = decodeURIComponent(match[1]);
  } catch (error) {
    if (error instanceof URIError) return NextResponse.json({ error: "Invalid asset code" }, { status: 400 });
  }
  const asset = await prisma.asset.findFirst({ where: { OR: [{ id: code }, { tagNumber: code }, { serialNumber: code }, { iiumReferenceNumber: code }] }, select: { id: true, tagNumber: true, name: true } });
  return NextResponse.json(asset ? { found: true, asset, href: `/assets/${asset.id}` } : { found: false });
}

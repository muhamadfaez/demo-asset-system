import { AccountStatus, RoleName } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (!can(session.user, "asset:update") && !can(session.user, "transfer:create"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ users: [] }, { headers: { "Cache-Control": "no-store" } });

  const users = await prisma.user.findMany({
    where: {
      status: AccountStatus.ACTIVE,
      ...(session.user.role === RoleName.ASSET_LIAISON
        ? { departmentId: session.user.departmentId ?? "__unassigned__" }
        : {}),
      OR: [
        { name: { contains: q } },
        { email: { contains: q } },
        { staffNo: { contains: q } }
      ]
    },
    select: { id: true, name: true, email: true, staffNo: true, department: { select: { name: true } } },
    orderBy: { name: "asc" },
    take: 10
  });

  return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store" } });
}

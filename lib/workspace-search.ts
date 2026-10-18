import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assetScopeFor, can } from "@/lib/permissions";

export async function searchWorkspace(user: User, q: string) {
  if (!can(user, "dashboard:view") || q.trim().length < 2) return [[], [], []] as const;
  q = q.trim().slice(0, 100);
  return Promise.all([
    prisma.asset.findMany({ where: { AND: [assetScopeFor(user), { OR: [{ name: { contains: q } }, { tagNumber: { contains: q } }, { serialNumber: { contains: q } }, { model: { contains: q } }] }] }, select: { id: true, name: true, tagNumber: true, serialNumber: true, status: true }, take: 20, orderBy: { updatedAt: "desc" } }),
    can(user, "user:manage") ? prisma.user.findMany({ where: { OR: [{ name: { contains: q } }, { email: { contains: q } }, { staffNo: { contains: q } }] }, select: { id: true, name: true, email: true }, take: 20, orderBy: { name: "asc" } }) : Promise.resolve([]),
    prisma.notification.findMany({ where: { userId: user.id, OR: [{ title: { contains: q } }, { message: { contains: q } }] }, select: { id: true, title: true, message: true }, take: 10, orderBy: { createdAt: "desc" } })
  ]);
}

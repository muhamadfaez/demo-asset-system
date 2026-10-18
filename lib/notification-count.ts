import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getD1Binding } from "@/lib/cloudflare-db";

// React cache is request-scoped: layout and dashboard share the same read,
// while another signed-in user's count is never reused across requests.
export const getUnreadNotificationCount = cache(async (userId: string): Promise<number> => {
  const binding = getD1Binding();
  if (binding) {
    const row = await binding.prepare("SELECT COUNT(*) AS total FROM Notification WHERE userId = ? AND readAt IS NULL").bind(userId).first<{ total: number }>();
    return Number(row?.total ?? 0);
  }
  return prisma.notification.count({ where: { userId, readAt: null } });
});

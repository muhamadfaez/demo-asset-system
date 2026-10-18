"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function currentUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

function refreshNotifications() {
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function markNotificationRead(formData: FormData) {
  const userId = await currentUserId();
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
  refreshNotifications();
}

export async function markAllNotificationsRead() {
  const userId = await currentUserId();
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  refreshNotifications();
}

export async function openNotification(formData: FormData) {
  const userId = await currentUserId();
  const id = String(formData.get("id") ?? "");
  const notification = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notification) redirect("/notifications");
  if (!notification.readAt) await prisma.notification.update({ where: { id: notification.id }, data: { readAt: new Date() } });
  refreshNotifications();
  const safeHref = notification.href?.startsWith("/") && !notification.href.startsWith("//") ? notification.href : "/notifications";
  redirect(safeHref);
}

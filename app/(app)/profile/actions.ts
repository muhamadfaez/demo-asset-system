"use server";

import { AccountStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { selfProfileSchema } from "@/lib/validation";

export type ProfileActionState = { status: "idle" | "success" | "error"; message?: string };

export async function updateMyProfile(_: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "error", message: "Sign in to update your profile." };
  const input = selfProfileSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return { status: "error", message: "Check the length of your position, phone number, and staff ID." };

  const existing = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!existing || existing.status !== AccountStatus.ACTIVE) return { status: "error", message: "Your account cannot be updated." };
  const { position, phone, staffNo } = input.data;
  await prisma.user.update({ where: { id: existing.id }, data: { position, phone, staffNo } });
  await audit({
    userId: existing.id,
    action: "UPDATE",
    module: "Profile",
    recordType: "UserPersonalInfo",
    recordId: existing.id,
    previousValues: { position: existing.position, phone: existing.phone, staffNo: existing.staffNo },
    newValues: { position, phone, staffNo }
  });
  revalidatePath("/profile");
  revalidatePath("/users");
  return { status: "success", message: "Your personal details were saved." };
}

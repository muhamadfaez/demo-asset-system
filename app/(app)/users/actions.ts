"use server";

import { AccountStatus, RoleName } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getSystemSetting } from "@/lib/settings";
import { adminPersonalInfoSchema, userAccountActionSchema } from "@/lib/validation";

export type UserActionState = { status: "idle" | "success" | "error"; message?: string };

export async function updateUserPersonalInfo(_: UserActionState, formData: FormData): Promise<UserActionState> {
  const session = await auth();
  if (!session?.user || !can(session.user, "user:manage")) return { status: "error", message: "You do not have permission to edit users." };

  const parsed = adminPersonalInfoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Enter a valid name, email, position, phone, and staff ID." };
  const input = parsed.data;
  const permittedDomain = await getSystemSetting("permittedEmailDomain");
  if (!input.email.endsWith(permittedDomain.toLowerCase())) return { status: "error", message: `Email must end with ${permittedDomain}.` };

  const existing = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!existing) return { status: "error", message: "User account not found." };
  if (input.email !== existing.email.toLowerCase()) {
    const emailOwner = await prisma.user.findUnique({ where: { email: input.email } });
    if (emailOwner) return { status: "error", message: "That email address belongs to another account." };
  }

  try {
    await prisma.user.update({
      where: { id: existing.id },
      data: { name: input.name, email: input.email, position: input.position, phone: input.phone, staffNo: input.staffNo }
    });
  } catch {
    return { status: "error", message: "Could not save these details. Check that the email address is unique." };
  }

  await audit({
    userId: session.user.id,
    action: "UPDATE",
    module: "Users",
    recordType: "UserPersonalInfo",
    recordId: existing.id,
    previousValues: { name: existing.name, email: existing.email, position: existing.position, phone: existing.phone, staffNo: existing.staffNo },
    newValues: { name: input.name, email: input.email, position: input.position, phone: input.phone, staffNo: input.staffNo }
  });
  revalidatePath("/users");
  revalidatePath("/profile");
  return { status: "success", message: `${input.name}'s personal details were saved.` };
}

export async function updateUserAccount(_: UserActionState, formData: FormData): Promise<UserActionState> {
  const session = await auth();
  if (!session?.user || !can(session.user, "user:manage")) return { status: "error", message: "You do not have permission to manage users." };

  const parsed = userAccountActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "The account update is invalid." };
  const input = parsed.data;
  if (input.userId === session.user.id) return { status: "error", message: "Manage your own details from your profile, not User Management." };

  const existing = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!existing) return { status: "error", message: "User account not found." };

  const department = input.departmentId ? await prisma.department.findUnique({ where: { id: input.departmentId } }) : null;
  if (input.departmentId && !department) return { status: "error", message: "The selected department no longer exists." };
  if (input.role === RoleName.ASSET_LIAISON && !department) return { status: "error", message: "Asset Liaisons must be assigned to a department." };

  const status = input.intent === "approve" || input.intent === "activate"
    ? AccountStatus.ACTIVE
    : input.intent === "reject"
      ? AccountStatus.REJECTED
      : input.intent === "suspend"
        ? AccountStatus.SUSPENDED
        : input.intent === "deactivate"
          ? AccountStatus.INACTIVE
          : existing.status;

  const removesActiveSuperadmin = existing.role === RoleName.SUPERADMIN && existing.status === AccountStatus.ACTIVE && (input.role !== RoleName.SUPERADMIN || status !== AccountStatus.ACTIVE);
  if (removesActiveSuperadmin) {
    const activeSuperadmins = await prisma.user.count({ where: { role: RoleName.SUPERADMIN, status: AccountStatus.ACTIVE } });
    if (activeSuperadmins <= 1) return { status: "error", message: "The final active Superadmin cannot be downgraded or disabled." };
  }

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: {
      role: input.role,
      status,
      departmentId: department?.id ?? null,
      kulliyyahId: department?.kulliyyahId ?? existing.kulliyyahId,
      ...(department?.id !== existing.departmentId ? { unitId: null } : {})
    }
  });

  const actionLabel = {
    approve: "Account approved",
    reject: "Account rejected",
    update: "Account details updated",
    suspend: "Account suspended",
    activate: "Account reactivated",
    deactivate: "Account deactivated"
  }[input.intent];
  await Promise.all([
    prisma.notification.create({
      data: {
        userId: updated.id,
        title: actionLabel,
        message: input.reason || `Your IIUM KAMS account is now ${updated.status.toLowerCase().replaceAll("_", " ")}.`,
        href: updated.status === AccountStatus.ACTIVE ? "/dashboard" : undefined
      }
    }),
    audit({
      userId: session.user.id,
      action: input.intent.toUpperCase(),
      module: "Users",
      recordType: "User",
      recordId: updated.id,
      previousValues: existing,
      newValues: { ...updated, reviewReason: input.reason || undefined }
    })
  ]);

  revalidatePath("/users");
  revalidatePath("/dashboard");
  return { status: "success", message: `${updated.name}'s account was updated.` };
}

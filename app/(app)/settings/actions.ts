"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { systemSettingsSchema } from "@/lib/validation";

export type SettingsActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string[]>;
};

export async function saveSettings(_: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const session = await auth();
  if (!session?.user || !can(session.user, "settings:manage")) {
    return { status: "error", message: "You do not have permission to update system settings." };
  }

  const parsed = systemSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Review the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  }

  const values = Object.fromEntries(Object.entries(parsed.data).map(([key, value]) => [key, String(value)]));
  const previous = await prisma.systemSetting.findMany({ where: { key: { in: Object.keys(values) } } });

  await prisma.$transaction(
    Object.entries(values).map(([key, value]) =>
      prisma.systemSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
    )
  );
  await audit({
    userId: session.user.id,
    action: "UPDATE",
    module: "Settings",
    recordType: "SystemSetting",
    recordId: "system",
    previousValues: Object.fromEntries(previous.map((row) => [row.key, row.value])),
    newValues: values
  });

  revalidatePath("/", "layout");
  return { status: "success", message: "System settings saved successfully." };
}

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { systemSettingsSchema } from "@/lib/validation";
import { iconSizes, validateAppIcon } from "@/lib/app-icons";

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
  const uploaded = iconSizes.map((size) => String(formData.get(`appIcon${size}`) ?? ""));
  if (uploaded.some(Boolean)) {
    if (!uploaded.every((data, index) => validateAppIcon(data, iconSizes[index]))) {
      return { status: "error", message: "The icon could not be saved. Choose another image (maximum 2 MB) and try again." };
    }
    iconSizes.forEach((size, index) => { values[`appIcon${size}`] = uploaded[index]; });
    values.appIconVersion = Date.now().toString();
  } else if (formData.get("resetIcon") === "true") {
    iconSizes.forEach((size) => { values[`appIcon${size}`] = ""; });
    values.appIconVersion = Date.now().toString();
  }
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
    previousValues: Object.fromEntries(previous.map((row) => [row.key, row.key.match(/^appIcon\d/) ? "[image]" : row.value])),
    newValues: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, key.match(/^appIcon\d/) ? "[image]" : value]))
  });

  revalidatePath("/", "layout");
  return { status: "success", message: "System settings saved successfully." };
}

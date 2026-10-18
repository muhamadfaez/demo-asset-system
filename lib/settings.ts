import { prisma } from "@/lib/prisma";
import { cache } from "react";
import { getD1Binding } from "@/lib/cloudflare-db";

export const systemSettingDefaults = {
  systemName: "IIUM Kulliyyah Asset Management System",
  organisationName: "IIUM KAMS",
  permittedEmailDomain: "@iium.edu.my",
  currency: "RM",
  timeZone: "Asia/Kuala_Lumpur",
  assetTagPrefix: "KICT",
  borrowingPrefix: "BR",
  maxBorrowingDays: "30",
  appIconVersion: "0",
  pwaEnabled: "true",
  pwaName: "IIUM Kulliyyah Asset Management System",
  pwaShortName: "IIUM KAMS",
  pwaDescription: "Manage assets, borrowing, maintenance, and verification.",
  pwaThemeColor: "#009a97",
  pwaBackgroundColor: "#f3f5f9",
  pwaDisplay: "standalone",
  pwaOrientation: "any"
} as const;

export type SystemSettings = { [K in keyof typeof systemSettingDefaults]: string };
export type SystemSettingKey = keyof SystemSettings;

export const getSystemSettings = cache(async (): Promise<SystemSettings> => {
  const keys = Object.keys(systemSettingDefaults);
  const binding = getD1Binding();
  // These public settings are simple key/value reads. Avoid starting Prisma's
  // query compiler for every manifest, icon, and login metadata request.
  const rows = binding
    ? (await binding.prepare(`SELECT key, value FROM SystemSetting WHERE key IN (${keys.map(() => "?").join(",")})`).bind(...keys).all<{ key: string; value: string }>()).results
    : await prisma.systemSetting.findMany({ where: { key: { in: keys } } });
  return { ...systemSettingDefaults, ...Object.fromEntries(rows.map((row) => [row.key, row.value])) };
});

// Public branding must remain available while a new database is being set up.
// Authentication and protected routes still require a working database.
export async function getLoginSettings(): Promise<SystemSettings> {
  try {
    return await getSystemSettings();
  } catch (error) {
    console.error("Unable to load login branding; check the D1 binding and apply prisma/baseline.sql to a new database.", error);
    return { ...systemSettingDefaults };
  }
}

export async function getSystemSetting<K extends SystemSettingKey>(key: K): Promise<string> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row?.value ?? systemSettingDefaults[key];
}

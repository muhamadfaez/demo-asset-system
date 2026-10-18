import { beforeEach, describe, expect, it, vi } from "vitest";
const { auth, db } = vi.hoisted(() => ({ auth: vi.fn(), db: { systemSetting: { findMany: vi.fn() }, $transaction: vi.fn() } }));
vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { saveSettings } from "@/app/(app)/settings/actions";
import { systemSettingDefaults } from "@/lib/settings";

beforeEach(() => vi.resetAllMocks());
describe("icon and PWA settings access", () => {
  it("refuses non-admin uploads before writing anything", async () => {
    auth.mockResolvedValue({ user: { id: "u1", role: "USER", status: "ACTIVE" } });
    const result = await saveSettings({ status: "idle" }, new FormData());
    expect(result.status).toBe("error");
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("refuses incomplete or forged icon bundles without changing settings", async () => {
    auth.mockResolvedValue({ user: { id: "a1", role: "SUPERADMIN", status: "ACTIVE" } });
    const form = new FormData();
    Object.entries(systemSettingDefaults).forEach(([key, value]) => form.set(key, value));
    form.set("appIcon192", "data:image/png;base64,Zm9yZ2Vk");
    const result = await saveSettings({ status: "idle" }, form);
    expect(result.status).toBe("error");
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

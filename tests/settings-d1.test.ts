import { describe, expect, it, vi } from "vitest";
const { binding, findMany } = vi.hoisted(() => ({ binding: vi.fn(), findMany: vi.fn() }));
vi.mock("@/lib/cloudflare-db", () => ({ getD1Binding: binding }));
vi.mock("@/lib/prisma", () => ({ prisma: { systemSetting: { findMany } } }));
import { getSystemSettings } from "@/lib/settings";

describe("low-cost Worker branding reads", () => {
  it("reads only named settings directly from D1 without starting the Prisma compiler", async () => {
    const all = vi.fn().mockResolvedValue({ results: [{ key: "organisationName", value: "Campus" }] });
    const bind = vi.fn().mockReturnValue({ all });
    const prepare = vi.fn().mockReturnValue({ bind });
    binding.mockReturnValue({ prepare });
    expect((await getSystemSettings()).organisationName).toBe("Campus");
    expect(prepare.mock.calls[0][0]).toContain("WHERE key IN");
    expect(bind.mock.calls[0]).not.toContain("appIcon512");
    expect(findMany).not.toHaveBeenCalled();
  });
});

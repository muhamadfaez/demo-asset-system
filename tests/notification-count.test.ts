import { beforeEach, describe, expect, it, vi } from "vitest";

const { binding, count } = vi.hoisted(() => ({ binding: vi.fn(), count: vi.fn() }));
vi.mock("@/lib/cloudflare-db", () => ({ getD1Binding: binding }));
vi.mock("@/lib/prisma", () => ({ prisma: { notification: { count } } }));
import { getUnreadNotificationCount } from "@/lib/notification-count";

beforeEach(() => vi.resetAllMocks());
describe("dashboard unread notifications", () => {
  it("counts all unread notices for only the requested user through D1", async () => {
    const first = vi.fn().mockResolvedValue({ total: 12 });
    const bind = vi.fn().mockReturnValue({ first });
    const prepare = vi.fn().mockReturnValue({ bind });
    binding.mockReturnValue({ prepare });
    expect(await getUnreadNotificationCount("alice")).toBe(12);
    expect(bind).toHaveBeenCalledWith("alice");
    expect(prepare.mock.calls[0][0]).toContain("readAt IS NULL");
    expect(count).not.toHaveBeenCalled();
  });
  it("preserves the same per-user filter in local development", async () => {
    binding.mockReturnValue(undefined);
    count.mockResolvedValue(3);
    expect(await getUnreadNotificationCount("bob")).toBe(3);
    expect(count).toHaveBeenCalledWith({ where: { userId: "bob", readAt: null } });
  });
});

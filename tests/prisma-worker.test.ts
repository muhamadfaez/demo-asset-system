import { beforeEach, describe, expect, it, vi } from "vitest";
const { context, workerClient } = vi.hoisted(() => ({ context: vi.fn(), workerClient: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: context }));
vi.mock("@prisma/client/wasm", () => ({ PrismaClient: workerClient }));
vi.mock("@prisma/adapter-d1", () => ({ PrismaD1: vi.fn() }));
import { getPrisma } from "@/lib/prisma";

beforeEach(() => vi.resetAllMocks());
describe("Worker database setup", () => {
  it("preserves real D1/client errors instead of falling back to the incompatible local adapter", () => {
    context.mockReturnValue({ env: { DB: {} } });
    workerClient.mockImplementation(() => { throw new Error("Worker client initialization failed"); });
    expect(() => getPrisma()).toThrow("Worker client initialization failed");
  });
  it("reuses a client within one request without sharing it with another request", () => {
    const first = { env: { DB: {} } };
    context.mockReturnValue(first);
    const a = getPrisma();
    expect(getPrisma()).toBe(a);
    expect(workerClient).toHaveBeenCalledOnce();
    context.mockReturnValue({ env: { DB: {} } });
    getPrisma();
    expect(workerClient).toHaveBeenCalledTimes(2);
  });
});

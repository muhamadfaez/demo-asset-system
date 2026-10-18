import { PrismaClient } from "@prisma/client";
import { PrismaClient as WorkerPrismaClient } from "@prisma/client/wasm";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createRequire } from "node:module";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  let requestContext: (ReturnType<typeof getCloudflareContext> & { assetPrisma?: PrismaClient }) | undefined;
  try {
    requestContext = getCloudflareContext();
  } catch {
    // Only absence of a Worker context should select the local Node adapter.
  }
  if (requestContext) {
    const binding = (requestContext.env as unknown as { DB?: ConstructorParameters<typeof PrismaD1>[0] }).DB;
    if (binding) {
      if (requestContext.assetPrisma) return requestContext.assetPrisma;
      const client = new WorkerPrismaClient({
        adapter: new PrismaD1(binding),
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
      });
      requestContext.assetPrisma = client;
      return client;
    }
    throw new Error("Cloudflare D1 binding DB is missing.");
  }

  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  const localUrl = databaseUrl.startsWith("file:./") ? `file:./prisma/${databaseUrl.slice("file:./".length)}` : databaseUrl;
  // Load the file-based adapter only in Node.js; it cannot run in Cloudflare Workers.
  const { PrismaLibSQL } = createRequire(`${process.cwd()}/package.json`)("@prisma/adapter-libsql") as typeof import("@prisma/adapter-libsql");
  const client = globalForPrisma.prisma ?? new PrismaClient({
    adapter: new PrismaLibSQL({ url: localUrl }, { timestampFormat: "unixepoch-ms" }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}

export const getPrisma = createPrismaClient;

// Keep the existing call sites and Auth.js adapter request-scoped while routing
// every operation through the D1-backed client inside Cloudflare Workers.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrisma();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  }
});

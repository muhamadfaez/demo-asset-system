import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { PrismaD1 } from "@prisma/adapter-d1";

type WorkerDatabase = Extract<ConstructorParameters<typeof PrismaD1>[0], { prepare: unknown }>;

export function getD1Binding(): WorkerDatabase | undefined {
  try {
    return (getCloudflareContext().env as unknown as { DB?: WorkerDatabase }).DB;
  } catch {
    return undefined;
  }
}

// Deliberately independent of Next.js and Prisma at runtime.
export interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{
    results: T[];
    meta?: { changes?: number };
  }>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch(
    statements: Statement[],
  ): Promise<{ results: unknown[]; meta: { changes: number } }[]>;
}
export type EdgeUser = {
  id: string;
  name: string;
  image: string | null;
  role: "SUPERADMIN" | "ASSET_LIAISON" | "USER";
  status: string;
  departmentId: string | null;
};
export type EdgeEnv = {
  DB: Database;
  ASSETS: { fetch(request: Request): Promise<Response> };
};

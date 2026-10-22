import { AsyncLocalStorage } from "node:async_hooks";
import type { EdgeEnv, EdgeUser, Statement } from "./types";
export type AppContext = {
  request: Request;
  env: EdgeEnv;
  user: (EdgeUser & Record<string, any>) | null;
  memo: Map<unknown, Map<string, unknown>>;
  snapshots: Map<string, Record<string, any>>;
  transaction?: Statement[];
  page?: string;
  pageNumber?: number;
  pagination?: { page: number; size: number; hasNext: boolean };
};
export const appContext = new AsyncLocalStorage<AppContext>();
export function context() {
  const value = appContext.getStore();
  if (!value) throw new Error("Missing application request context");
  return value;
}
export class Navigation extends Error {
  constructor(
    public destination: string,
    public status = 307,
  ) {
    super(destination);
  }
}
export function redirect(path: string): never {
  if (!path.startsWith("/") || path.startsWith("//"))
    throw new Error("Invalid redirect");
  throw new Navigation(path);
}
export function notFound(): never {
  throw new Navigation("/not-found", 404);
}
export function revalidatePath() {
  /* Browser refreshes its private DTO after mutations. */
}
export function getCloudflareContext() {
  return { env: context().env };
}
export function cache<T extends (...args: any[]) => any>(fn: T): T {
  return ((...args: any[]) => {
    const state = context();
    let memo = state.memo.get(fn);
    if (!memo) state.memo.set(fn, (memo = new Map()));
    const key = JSON.stringify(args);
    if (!memo.has(key)) memo.set(key, fn(...args));
    return memo.get(key);
  }) as T;
}
export async function auth() {
  const user = context().user;
  return user ? { user } : null;
}
export async function getCurrentUser() {
  const user = context().user;
  if (!user) redirect("/login");
  return user;
}

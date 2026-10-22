declare module "*.edge-app/app-handler.mjs" {
  const application: (request: Request, env: unknown) => Promise<Response>;
  export default application;
}
declare module "*.edge-app/client-registry.mjs" {
  export const registry: Record<string, import("react").ElementType>;
}

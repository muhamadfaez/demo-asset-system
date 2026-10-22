import application from "./.edge-app/app-handler.mjs";
import { resourceError } from "./edge/resource-error";
import { json } from "./edge/auth";
import { handleEdge } from "./edge/router";
import type { EdgeEnv } from "./edge/types";

const worker = {
  async fetch(request: Request, env: EdgeEnv, ctx: unknown): Promise<Response> {
    try {
      const response = await handleEdge(request, env);
      if (response) return response;
      // Native module and formatter initialization run at Worker startup.
      return await application(request, env);
    } catch (error) {
      return (
        resourceError(error) ??
        json({ error: "Unable to load the service. Please try again." }, 500)
      );
    }
  },
};

export default worker;

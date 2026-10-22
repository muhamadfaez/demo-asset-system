import { Auth } from "@auth/core";
import { auth } from "./app-context";
export default function NextAuth(config: () => any) {
  const handle = (request: Request) =>
    Auth(request, { ...config(), basePath: "/api/auth" });
  return {
    handlers: { GET: handle, POST: handle },
    auth,
    signIn() {
      throw new Error("Use the browser Google sign-in flow");
    },
    signOut() {
      throw new Error("Use the session logout endpoint");
    },
  };
}

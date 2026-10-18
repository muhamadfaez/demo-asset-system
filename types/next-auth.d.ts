import { AccountStatus, RoleName } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: RoleName;
      status: AccountStatus;
      departmentId?: string;
    };
  }
}

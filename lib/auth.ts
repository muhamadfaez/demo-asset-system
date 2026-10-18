import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { AccountStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSystemSetting } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { getAuthEnvironment } from "@/lib/auth-environment";

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const environment = getAuthEnvironment();
  const missing = [
    !environment.secret && "AUTH_SECRET",
    !environment.clientId && "GOOGLE_CLIENT_ID or AUTH_GOOGLE_ID",
    !environment.clientSecret && "GOOGLE_CLIENT_SECRET or AUTH_GOOGLE_SECRET"
  ].filter(Boolean);
  if (missing.length) console.error(`[auth] Missing Worker runtime settings: ${missing.join(", ")}. Set these under Settings > Variables and Secrets, not only Build variables.`);
  return {
  secret: environment.secret,
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "database" },
  trustHost: true,
  providers: [
    Google({
      clientId: environment.clientId,
      clientSecret: environment.clientSecret
    })
  ],
  pages: {
    signIn: "/login",
    error: "/unauthorized"
  },
  callbacks: {
    async signIn({ user, profile }) {
      const domain = await getSystemSetting("permittedEmailDomain");
      if (!user.email?.endsWith(domain)) return false;
      const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      if (!dbUser) return true;
      const blockedStatuses: AccountStatus[] = [AccountStatus.SUSPENDED, AccountStatus.REJECTED, AccountStatus.INACTIVE];
      if (blockedStatuses.includes(dbUser.status)) return false;
      const googleImage = profile && "picture" in profile && typeof profile.picture === "string" ? profile.picture : user.image;
      await prisma.user.update({ where: { id: dbUser.id }, data: { lastLoginAt: new Date(), ...(googleImage ? { image: googleImage } : {}) } });
      return dbUser.status === AccountStatus.ACTIVE || dbUser.status === AccountStatus.PENDING;
    },
    async session({ session, user }) {
      const dbUser = user as typeof user & { role: any; status: any; departmentId?: string | null };
      if (session.user) {
        session.user.id = dbUser.id;
        session.user.role = dbUser.role;
        session.user.status = dbUser.status;
        session.user.departmentId = dbUser.departmentId ?? undefined;
      }
      return session;
    }
  },
  events: {
    async createUser({ user }) {
      const superEmail = environment.superadminEmail;
      const createdUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          role: user.email === superEmail ? "SUPERADMIN" : "USER",
          status: user.email === superEmail ? "ACTIVE" : "PENDING"
        }
      });
      await audit({ userId: createdUser.id, action: "REGISTER", module: "Users", recordType: "User", recordId: createdUser.id, newValues: { email: createdUser.email, status: createdUser.status } });
      if (createdUser.status === AccountStatus.PENDING) {
        const reviewers = await prisma.user.findMany({ where: { role: "SUPERADMIN", status: "ACTIVE" }, select: { id: true } });
        if (reviewers.length) await prisma.notification.createMany({ data: reviewers.map((reviewer) => ({ userId: reviewer.id, title: "New account approval", message: `${createdUser.name} (${createdUser.email}) is waiting for account approval.`, href: "/users" })) });
      }
    }
  }
  };
});

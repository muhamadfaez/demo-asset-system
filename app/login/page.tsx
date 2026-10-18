import { signIn } from "@/lib/auth";
import { getLoginSettings } from "@/lib/settings";
import { AppIcon } from "@/components/app-icon";
import { DeveloperFooter } from "@/components/developer-footer";

// System settings come from the database. Rendering this route at build time
// makes deployments fail before runtime secrets are available.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const settings = await getLoginSettings();
  return (
    <div className="flex min-h-screen flex-col bg-[#f3f5f9]">
    <main className="grid flex-1 place-items-center p-5">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-28px_rgba(15,23,42,0.28)] md:grid-cols-[0.9fr_1.1fr]">
        <div className="relative hidden min-h-[460px] overflow-hidden bg-gradient-to-br from-iium-deep via-iium-green to-[#19aaa4] p-10 text-white md:flex md:flex-col md:justify-between">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border-[40px] border-white/10" />
          <div className="relative flex items-center gap-3">
            <AppIcon version={settings.appIconVersion} className="h-11 w-11" />
            <div><p className="font-bold">{settings.organisationName}</p><p className="max-w-56 truncate text-xs text-white/70">{settings.systemName}</p></div>
          </div>
          <div className="relative">
            <p className="text-3xl font-bold leading-tight">Manage Kulliyyah assets with confidence.</p>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/75">One secure workspace for asset records, assignments, maintenance, verification, and reporting.</p>
            <div className="mt-6 h-1 w-16 rounded-full bg-iium-gold" />
          </div>
        </div>
        <div className="flex min-h-[460px] flex-col justify-center p-7 sm:p-10">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <AppIcon version={settings.appIconVersion} className="h-11 w-11" />
            <p className="font-bold text-iium-deep">{settings.organisationName}</p>
          </div>
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-iium-green">Welcome back</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Sign in to your workspace</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Use your permitted IIUM Google account to continue.</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <button className="w-full rounded-lg bg-iium-green px-4 py-3 font-semibold text-white shadow-lift hover:bg-iium-deep">Continue with Google</button>
          </form>
          <p className="mt-4 text-xs text-slate-400">Permitted domain: {settings.permittedEmailDomain}</p>
        </div>
      </section>
    </main>
    <DeveloperFooter />
    </div>
  );
}

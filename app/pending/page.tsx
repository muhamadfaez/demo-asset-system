import { LogoutButton } from "@/components/logout-button";
import Link from "next/link";

export default function PendingPage() {
  return <Message title="Account Pending Approval" body="Your account has been created and is waiting for Superadmin approval." />;
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-iium-mist p-6">
      <div className="max-w-lg rounded-md bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-iium-green">{title}</h1>
        <p className="mt-2 text-slate-600">{body}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link prefetch={false} href="/dashboard" className="rounded-lg bg-iium-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-iium-deep">Check approval status</Link>
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}

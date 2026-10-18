import { LogoutButton } from "@/components/logout-button";

export default function UnauthorizedPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-iium-mist p-6">
      <div className="max-w-lg rounded-md bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-iium-green">Unauthorized Access</h1>
        <p className="mt-2 text-slate-600">You do not have permission to view this resource.</p>
        <LogoutButton className="mt-5" />
      </div>
    </main>
  );
}

"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-iium-mist p-6">
      <div className="rounded-md bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-rose-700">Something went wrong</h1>
        <p className="mt-2 text-slate-600">The system caught the error without exposing sensitive details.</p>
        <button onClick={reset} className="mt-4 rounded-md bg-iium-green px-4 py-2 text-white">Retry</button>
      </div>
    </main>
  );
}

import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Sidebar, Topbar } from "@/components/nav";
import { DeveloperFooter } from "@/components/developer-footer";
import {
  TransfersView,
  type TransferPageData,
} from "@/components/transfers-view";
import { PwaProvider } from "@/components/pwa-client";

type Data = TransferPageData & {
  refreshKey: number;
  settings: Record<string, string>;
  unreadNotifications: number;
  counts: {
    total: number;
    awaiting: number;
    completed: number;
    eligible: number;
  };
  page: number;
};

function App() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [room, setRoom] = useState("");
  const [revision, refresh] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const reload = () => refresh((value) => value + 1);
    window.addEventListener("transfers:refresh", reload);
    return () => window.removeEventListener("transfers:refresh", reload);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    // Debounce searches; never poll or automatically replay failed writes.
    const timer = setTimeout(
      async () => {
        setLoading(true);
        setError("");
        try {
          const response = await fetch(
            `/api/edge/transfers?page=${page}&q=${encodeURIComponent(query)}&room=${encodeURIComponent(room)}`,
            { cache: "no-store", signal: controller.signal },
          );
          const result = await response.json();
          if (result.redirect) {
            window.location.replace(result.redirect);
            return;
          }
          if (!response.ok)
            throw new Error(result.error ?? "Unable to load transfers.");
          setData({ ...result, refreshKey: revision });
          document.title = `Transfers | ${result.settings.systemName ?? "IIUM KAMS"}`;
        } catch (cause) {
          if (!controller.signal.aborted)
            setError(
              cause instanceof Error
                ? cause.message
                : "Unable to load transfers.",
            );
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      query || room ? 300 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [page, query, room, revision]);
  const settings = data?.settings ?? {};
  const content = (
    <>
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800"
        >
          {error}{" "}
          <button
            type="button"
            onClick={() => refresh((value) => value + 1)}
            className="underline"
          >
            Try again
          </button>
        </div>
      )}
      {!data ? (
        <p role="status" className="p-6 text-slate-600">
          {loading
            ? "Loading your transfers…"
            : "Transfers could not be loaded."}
        </p>
      ) : (
        <>
          <form
            className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
            onSubmit={(event) => event.preventDefault()}
          >
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Find an eligible asset
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={100}
                placeholder="Asset name or tag number"
              />
              <span className="text-xs font-normal text-slate-500">
                Showing up to 100 matching assets. Search to narrow the choices.
              </span>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Find a destination room
              <input
                type="search"
                value={room}
                onChange={(event) => setRoom(event.target.value)}
                maxLength={100}
                placeholder="Room, code or building"
              />
              <span className="text-xs font-normal text-slate-500">
                Showing up to 100 matching rooms.
              </span>
            </label>
          </form>
          <div aria-busy={loading}>
            <TransfersView data={data} key={data.refreshKey} />
          </div>
          <nav
            aria-label="Transfer history pages"
            className="mt-5 flex flex-wrap items-center justify-end gap-3 text-sm"
          >
            <span>
              {data.counts.total} transfers · Page {page + 1} of{" "}
              {Math.max(1, Math.ceil(data.counts.total / 20))}
            </span>
            <button
              type="button"
              disabled={loading || page === 0}
              onClick={() => setPage((value) => value - 1)}
              className="rounded-lg border bg-white px-4 py-2 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={loading || (page + 1) * 20 >= data.counts.total}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-lg border bg-white px-4 py-2 disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        </>
      )}
    </>
  );
  if (!data) return <main className="mx-auto max-w-3xl p-5">{content}</main>;
  return (
    <PwaProvider enabled={settings.pwaEnabled !== "false"}>
      <div className="min-h-screen bg-[#f3f5f9] lg:flex lg:gap-4 lg:p-4">
        <Sidebar
          role={data.user.role}
          organisationName={settings.organisationName ?? "IIUM KAMS"}
          systemName={settings.systemName ?? "Asset Management"}
          appIconVersion={settings.appIconVersion ?? "0"}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            name={data.user.name}
            image={data.user.image}
            role={data.user.role.replaceAll("_", " ")}
            systemName={settings.systemName ?? "Asset Management"}
            unreadNotifications={data.unreadNotifications}
          />
          <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 pb-6 lg:px-0 lg:pb-4 lg:pt-5">
            {content}
          </main>
          <DeveloperFooter className="pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-4" />
        </div>
      </div>
    </PwaProvider>
  );
}
createRoot(document.getElementById("transfers-app")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

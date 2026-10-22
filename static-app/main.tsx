import {
  Component,
  createElement,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { registry } from "../.edge-app/client-registry.mjs";
import { decodeUI } from "./decode";
import { Sidebar, Topbar } from "@/components/nav";
import { DeveloperFooter } from "@/components/developer-footer";
import { PwaProvider } from "@/components/pwa-client";

class Boundary extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: "" };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-xl font-bold">Unable to display this page</h1>
        <p role="alert" className="my-3 text-sm">
          {this.state.error}
        </p>
        <button
          type="button"
          className="rounded-lg bg-iium-green px-4 py-2 text-white"
          onClick={() => location.reload()}
        >
          Reload page
        </button>
        <a href="/dashboard" className="ml-4 underline">
          Dashboard
        </a>
      </main>
    ) : (
      this.props.children
    );
  }
}
async function downloadReport(
  format: "csv" | "pdf",
  progress: (value: string) => void,
) {
  const rows: any[] = [];
  let settings: any;
  for (let offset = 0; ; offset += 100) {
    const response = await fetch(
      `/api/edge/export?format=${format}&offset=${offset}`,
      { cache: "no-store" },
    );
    const data = await response.json();
    if (data.redirect) {
      location.replace(data.redirect);
      return;
    }
    if (!response.ok) throw new Error(data.error ?? "Unable to export assets");
    rows.push(...data.assets);
    settings = data.settings;
    progress(`Preparing ${rows.length} assets…`);
    if (!data.hasMore) break;
  }
  let blob: Blob;
  if (format === "csv") {
    const { default: Papa } = await import("papaparse");
    const csv = Papa.unparse(
      rows.map((a) => ({
        tag: a.tagNumber,
        name: a.name,
        category: a.category.name,
        department: a.department.name,
        room: a.room.name,
        borrowable: a.borrowable ? "Yes" : "No",
        status: a.status,
        condition: a.condition,
        value: a.acquisitionCost,
      })),
      { escapeFormulae: true },
    );
    blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  } else {
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const safe = (value: string) =>
      value.normalize("NFKD").replace(/[^\x20-\x7e]/g, "?");
    for (let offset = 0; offset < Math.max(1, rows.length); offset += 35) {
      const page = pdf.addPage([842, 595]);
      page.drawText(safe(settings.systemName).slice(0, 90), {
        x: 35,
        y: 550,
        size: 16,
        font,
        color: rgb(0, 0.42, 0.41),
      });
      rows.slice(offset, offset + 35).forEach((asset, i) => {
        const line = safe(
          `${asset.tagNumber} | ${asset.name} | ${asset.department.name} | ${asset.status} | ${settings.currency} ${asset.acquisitionCost}`,
        );
        page.drawText(line.slice(0, 145), {
          x: 35,
          y: 515 - i * 13,
          size: 8,
          font,
        });
      });
      page.drawText(
        `Page ${Math.floor(offset / 35) + 1} | ${rows.length} assets`,
        { x: 35, y: 30, size: 9, font },
      );
    }
    blob = new Blob([(await pdf.save()) as BlobPart], {
      type: "application/pdf",
    });
  }
  return URL.createObjectURL(blob);
}
function Tool() {
  const [url, setURL] = useState("");
  const [message, setMessage] = useState("Preparing your document…");
  const [error, setError] = useState("");
  const qr = location.pathname.startsWith("/api/qr/");
  const format = location.pathname.endsWith(".pdf") ? "pdf" : "csv";
  useEffect(() => {
    let active = true;
    let objectURL: string | undefined;
    (async () => {
      if (qr) {
        const response = await fetch(
          `/api/edge/qr?id=${encodeURIComponent(decodeURIComponent(location.pathname.split("/").at(-1)!))}`,
          { cache: "no-store" },
        );
        const data = await response.json();
        if (data.redirect) {
          location.replace(data.redirect);
          return;
        }
        if (!response.ok)
          throw new Error(data.error ?? "Unable to load QR label");
        const { default: QRCode } = await import("qrcode");
        const image = await QRCode.toDataURL(
          new URL(`/assets/${data.asset.id}`, location.origin).href,
          { width: 512, margin: 2 },
        );
        if (active) {
          setURL(image);
          setMessage(`${data.asset.tagNumber} — ${data.asset.name}`);
        }
      } else {
        objectURL = await downloadReport(
          format,
          (value) => active && setMessage(value),
        );
        if (active && objectURL) {
          setURL(objectURL);
          setMessage("Your export is ready.");
          const link = document.createElement("a");
          link.href = objectURL;
          link.download = `asset-register.${format}`;
          link.click();
        }
      }
    })().catch((cause) => active && setError(cause.message));
    return () => {
      active = false;
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, [format, qr]);
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-6">
      <a href="/dashboard" className="text-iium-deep underline">
        Back to dashboard
      </a>
      <h1 className="text-2xl font-bold">
        {qr ? "Asset QR label" : "Asset register export"}
      </h1>
      <p role="status">{message}</p>
      {error && (
        <p role="alert" className="text-rose-700">
          {error}
        </p>
      )}
      {url && (
        <>
          {qr && (
            <img
              src={url}
              alt={message}
              width={512}
              height={512}
              className="max-w-full"
            />
          )}
          <a
            href={url}
            download={qr ? "asset-label.png" : `asset-register.${format}`}
            className="inline-block rounded-lg bg-iium-green px-4 py-3 font-semibold text-white"
          >
            Download {qr ? "PNG" : format.toUpperCase()}
          </a>
        </>
      )}
    </main>
  );
}
function App() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [revision, refresh] = useState(0);
  useEffect(() => {
    const reload = () => refresh((n) => n + 1);
    window.addEventListener("transfers:refresh", reload);
    return () => window.removeEventListener("transfers:refresh", reload);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    const query = new URLSearchParams(location.search);
    query.set("path", location.pathname);
    fetch(`/api/edge/page?${query}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (result.redirect) {
          location.replace(result.redirect);
          return;
        }
        if (!response.ok)
          throw new Error(result.error ?? "Unable to load this page.");
        setData(result);
        document.title = result.settings.systemName;
        document
          .querySelector('meta[name="theme-color"]')
          ?.setAttribute("content", result.settings.pwaThemeColor);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [revision]);
  const retry = (
    <button
      type="button"
      onClick={() => refresh((n) => n + 1)}
      className="ml-2 underline"
    >
      Try again
    </button>
  );
  if (!data)
    return (
      <main className="mx-auto max-w-3xl p-6">
        {error ? (
          <p role="alert">
            {error}
            {retry}
          </p>
        ) : (
          <p role="status">Loading your workspace…</p>
        )}
      </main>
    );
  const tree = decodeUI(data.tree, registry);
  const pageLink = (page: number) => {
    const query = new URLSearchParams(location.search);
    query.set("p", String(page));
    return location.pathname + "?" + query;
  };
  const pages = data.pagination && (
    <nav
      aria-label="Record pages"
      className="mt-5 flex flex-wrap items-center justify-end gap-3 text-sm"
    >
      <span>Records page {data.pagination.page} ? up to 25 per page</span>
      {data.pagination.page > 1 && (
        <a
          className="rounded-lg border bg-white px-4 py-2"
          href={pageLink(data.pagination.page - 1)}
        >
          Previous
        </a>
      )}
      {data.pagination.hasNext && (
        <a
          className="rounded-lg border bg-white px-4 py-2"
          href={pageLink(data.pagination.page + 1)}
        >
          Next
        </a>
      )}
    </nav>
  );
  const notice = error && (
    <div
      role="alert"
      className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800"
    >
      {error}
      {retry}
    </div>
  );
  if (data.publicPage)
    return (
      <>
        {notice}
        {tree}
      </>
    );
  return (
    <PwaProvider enabled={data.settings.pwaEnabled === "true"}>
      <div className="min-h-screen bg-[#f3f5f9] lg:flex lg:gap-4 lg:p-4">
        <Sidebar
          role={data.user.role}
          organisationName={data.settings.organisationName}
          systemName={data.settings.systemName}
          appIconVersion={data.settings.appIconVersion}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            name={data.user.name}
            image={data.user.image}
            role={data.user.role.replaceAll("_", " ")}
            systemName={data.settings.systemName}
            unreadNotifications={data.unreadNotifications}
          />
          <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 pb-6 lg:px-0 lg:pb-4 lg:pt-5">
            {notice}
            {tree}
            {pages}
          </main>
          <DeveloperFooter className="pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-4" />
        </div>
      </div>
    </PwaProvider>
  );
}
const tools = /^\/api\/(qr\/|reports\/assets\.)/.test(location.pathname);
// Mount once: automatic StrictMode effect replay would duplicate export audit events.
createRoot(document.getElementById("app-root")!).render(
  <Boundary>
    <Suspense
      fallback={
        <p role="status" className="p-6">
          Loading page controls?
        </p>
      }
    >
      {tools ? <Tool /> : <App />}
    </Suspense>
  </Boundary>,
);

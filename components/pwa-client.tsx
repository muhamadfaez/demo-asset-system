"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
const InstallContext = createContext<{ enabled: boolean; installed: boolean; install(): void }>({ enabled: false, installed: false, install() {} });

export function PwaProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const prompt = useRef<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);
  const [offline, setOffline] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const checkInstalled = () => setInstalled(media.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    checkInstalled();
    media.addEventListener("change", checkInstalled);
    const beforeInstall = (event: Event) => { event.preventDefault(); prompt.current = event as InstallPrompt; };
    const didInstall = () => { prompt.current = null; setInstalled(true); setHelp(false); };
    const online = () => setOffline(!navigator.onLine);
    online();
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", didInstall);
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    let active = true;
    if ("serviceWorker" in navigator) {
      if (enabled) {
        navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then((registration) => {
          const checkWaiting = () => { if (active && registration.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting); };
          checkWaiting();
          registration.addEventListener("updatefound", () => {
            registration.installing?.addEventListener("statechange", checkWaiting);
          });
        }).catch((error) => console.error("App offline support could not start", error));
      } else {
        navigator.serviceWorker.getRegistrations().then(async (registrations) => {
          for (const registration of registrations) {
            if ([registration.active, registration.waiting, registration.installing].some((worker) => worker && new URL(worker.scriptURL).pathname === "/sw.js")) await registration.unregister();
          }
          if ("caches" in window) for (const key of await caches.keys()) if (key.startsWith("kams-public-")) await caches.delete(key);
        }).catch(console.error);
      }
    }
    return () => {
      active = false;
      media.removeEventListener("change", checkInstalled);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", didInstall);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
    };
  }, [enabled]);

  async function install() {
    if (!prompt.current) { setHelp(true); return; }
    const event = prompt.current;
    await event.prompt();
    await event.userChoice;
    prompt.current = null;
  }

  return <InstallContext.Provider value={{ enabled, installed, install: () => { void install(); } }}>
    {offline && <div role="status" className="fixed inset-x-0 top-0 z-[70] bg-amber-100 px-4 py-2 text-center text-sm text-amber-950">You are offline. Reconnect before saving changes or loading records.</div>}
    {children}
    {waiting && <div role="status" className="fixed right-4 top-20 z-[70] max-w-sm rounded-xl border bg-white p-4 shadow-xl"><p className="text-sm">An app update is ready. Save your work before reloading.</p><button className="mt-2 rounded-lg bg-iium-green px-3 py-2 text-sm text-white" onClick={() => { navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true }); waiting.postMessage({ type: "SKIP_WAITING" }); }}>Update and reload</button></div>}
    {help && <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/40 p-5" role="dialog" aria-modal="true" aria-labelledby="install-title" onKeyDown={(event) => { if (event.key === "Escape") setHelp(false); }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h2 id="install-title" className="text-lg font-bold">Install this app</h2><p className="mt-3 text-sm text-slate-600">On iPhone or iPad, open this site in Safari and choose Share → Add to Home Screen. On Android, Chrome, or Edge, open the browser menu and choose Install app or Add to Home screen when available.</p><p className="mt-3 text-xs text-slate-500">If the option is unavailable, the browser may not support installation, the app may already be installed, or it may still be checking the site.</p><button autoFocus onClick={() => setHelp(false)} className="mt-4 rounded-lg bg-iium-green px-4 py-2 text-white">Close</button></div>
    </div>}
  </InstallContext.Provider>;
}

export function InstallAppButton() {
  const { enabled, installed, install } = useContext(InstallContext);
  if (!enabled || installed) return null;
  return <button type="button" onClick={install} aria-label="Install app" title="Install app" className="rounded-lg bg-white/10 p-2.5 text-white hover:bg-white/20"><Download className="h-4 w-4" /></button>;
}

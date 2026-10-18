"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarcodeScanner } from "@/components/asset-registration-form";
import { Card } from "@/components/ui";

export function ScannerLookup() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function lookup(value: string) {
    const query = value.trim();
    if (!query || pending) return;
    setCode(query); setPending(true); setError("");
    try {
      const response = await fetch(`/api/assets/lookup?code=${encodeURIComponent(query)}`);
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? `Lookup failed (${response.status})`);
      if (result.found) router.push(result.href);
      else router.push(`/assets/new?code=${encodeURIComponent(query)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to look up asset");
      setPending(false);
    }
  }

  return <div className="mx-auto max-w-3xl space-y-5"><div><h1 className="text-2xl font-bold text-slate-900">Barcode and QR lookup</h1><p className="mt-1 text-sm text-slate-500">Scan an asset label to view its record or start registering a new asset.</p></div><Card className="space-y-5"><BarcodeScanner onDetected={lookup} /><form action={() => lookup(code)} className="flex flex-col gap-3 sm:flex-row"><label className="min-w-0 flex-1 text-sm font-semibold text-slate-700">Asset tag, serial, or QR URL<input value={code} onChange={(event) => setCode(event.target.value)} className="mt-1 w-full" placeholder="Scan or type a code" autoComplete="off" /></label><button disabled={pending || !code.trim()} className="self-end rounded-lg bg-iium-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Looking up..." : "Look up asset"}</button></form>{error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}</Card></div>;
}

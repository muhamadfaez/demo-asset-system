"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AssetOption = { id: string; tagNumber: string; name: string };

export function IncidentReportForm({ assets }: { assets: AssetOption[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(formData: FormData) {
    if (pending) return;
    setPending(true); setMessage(""); setSuccess(false);
    try {
      const payload = Object.fromEntries(formData);
      payload.discoveredAt = new Date(String(payload.discoveredAt)).toISOString();
      const response = await fetch("/api/workflows/incidents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? `Unable to submit incident report (${response.status})`);
      setMessage(`${result.incident.incidentNumber} was submitted.`);
      setSuccess(true);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit incident report");
    } finally { setPending(false); }
  }

  return <form action={submit} className="grid gap-4 md:grid-cols-2">
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700 md:col-span-2">Asset<select name="assetId" required>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.tagNumber} — {asset.name}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Incident type<select name="type" required>{["Missing", "Lost", "Stolen", "Misplaced", "Damaged"].map((type) => <option key={type}>{type}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Discovered at<input name="discoveredAt" type="datetime-local" required /></label>
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700 md:col-span-2">Location where discovered<input name="location" minLength={2} maxLength={200} required placeholder="Building, room, or last known location" /></label>
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700 md:col-span-2">What happened?<textarea name="description" rows={4} minLength={10} maxLength={2000} required placeholder="Describe the incident and any immediate action taken" /></label>
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700 md:col-span-2">Police report number (if applicable)<input name="policeReportNumber" maxLength={100} /></label>
    {message && <p role="status" className={`rounded-lg px-4 py-3 text-sm md:col-span-2 ${success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{message}</p>}
    <button disabled={pending || !assets.length} className="rounded-lg bg-iium-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 md:col-span-2">{pending ? "Submitting..." : "Submit incident report"}</button>
  </form>;
}

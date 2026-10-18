"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CirclePause, CirclePlay, LoaderCircle, Send, Wrench, X } from "lucide-react";

type AssetOption = { id: string; tagNumber: string; name: string; location: string };

async function readMaintenanceResponse(response: Response) {
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error ?? `Unable to update maintenance request (HTTP ${response.status}).`);
  if (!result) throw new Error("The server returned an empty response. Please refresh and check the request status.");
  return result;
}

export function MaintenanceRequestForm({ assets, isManager }: { assets: AssetOption[]; isManager: boolean }) {
  const router = useRouter();
  const submitting = useRef(false);
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  useEffect(() => { if (!assets.some((asset) => asset.id === assetId)) setAssetId(assets[0]?.id ?? ""); }, [assetId, assets]);

  async function submit(formData: FormData) {
    if (submitting.current) return;
    submitting.current = true; setPending(true); setMessage(null);
    try {
      const response = await fetch("/api/workflows/maintenance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ assetId, issueCategory: formData.get("issueCategory"), description: formData.get("description"), priority: formData.get("priority"), type: formData.get("type"), estimatedCost: isManager ? formData.get("estimatedCost") : 0 }) });
      const result = await readMaintenanceResponse(response);
      setMessage({ tone: "success", text: `${result.maintenance.requestNumber} was submitted for review.` });
      submitting.current = false; setPending(false); router.refresh();
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Unable to report maintenance." });
      submitting.current = false; setPending(false);
    }
  }

  const selectedAsset = assets.find((asset) => asset.id === assetId);
  return <form action={submit} className="grid gap-4 md:grid-cols-2">
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700 md:col-span-2">Asset<select value={assetId} onChange={(event) => setAssetId(event.target.value)} required>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.tagNumber} — {asset.name}</option>)}</select></label>
    {selectedAsset && <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 md:col-span-2">Current location: <strong className="text-slate-700">{selectedAsset.location}</strong></p>}
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Issue category<select name="issueCategory" required>{["Hardware", "Software", "Electrical", "Mechanical", "Network", "Safety", "Calibration", "Other"].map((value) => <option key={value}>{value}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Maintenance type<select name="type" required>{["Corrective", "Preventive", "Inspection", "Calibration", "Upgrade", "Warranty Claim"].map((value) => <option key={value}>{value}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Priority<select name="priority" defaultValue="Medium" required>{["Low", "Medium", "High", "Critical"].map((value) => <option key={value}>{value}</option>)}</select></label>
    {isManager && <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Estimated cost<input name="estimatedCost" type="number" min="0" step="0.01" defaultValue="0" /></label>}
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700 md:col-span-2">Problem description<textarea name="description" rows={4} minLength={10} maxLength={2000} required placeholder="Describe the fault, symptoms, and when it was discovered" /></label>
    {message && <p className={`rounded-lg px-4 py-3 text-sm md:col-span-2 ${message.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`} role="status">{message.text}</p>}
    <button disabled={pending || !assetId} className="inline-flex items-center justify-center gap-2 rounded-lg bg-iium-green px-4 py-2.5 text-sm font-semibold text-white shadow-lift hover:bg-iium-deep disabled:opacity-60 md:col-span-2">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{pending ? "Submitting report..." : "Submit maintenance request"}</button>
  </form>;
}

type MaintenanceAction = "approve" | "reject" | "start" | "await_parts" | "complete" | "close";

export function MaintenanceReviewActions({ requestId, status }: { requestId: string; status: string }) {
  const router = useRouter();
  const acting = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const awaiting = status === "SUBMITTED" || status === "PENDING_APPROVAL";
  const working = status === "IN_PROGRESS" || status === "AWAITING_PARTS";
  const actionable = awaiting || status === "APPROVED" || working || status === "COMPLETED";

  async function act(action: MaintenanceAction, formData: FormData) {
    if (acting.current) return;
    acting.current = true; setPending(true); setMessage("");
    const payload = Object.fromEntries([...formData.entries()].filter(([, value]) => typeof value === "string" && value.trim()));
    try {
      const response = await fetch("/api/workflows/maintenance", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: requestId, action, ...payload }) });
      await readMaintenanceResponse(response);
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to update maintenance.");
      acting.current = false; setPending(false);
    }
  }

  if (!actionable) return null;
  return <form className="mt-4 space-y-3 border-t border-slate-100 pt-4">
    {awaiting && <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-semibold text-slate-600">Scheduled date<input name="scheduledAt" type="date" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Vendor / service provider<input name="vendor" maxLength={200} placeholder="Internal team or vendor" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">Rejection reason<input name="reason" maxLength={500} placeholder="Required only when rejecting" /></label></div>}
    {working && <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">Resolution summary<textarea name="resolution" rows={2} maxLength={2000} placeholder="Required when completing the work" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">Parts replaced<input name="partsReplaced" maxLength={1000} placeholder="Optional parts and components" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Actual cost<input name="actualCost" type="number" min="0" step="0.01" defaultValue="0" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Downtime hours<input name="downtimeHours" type="number" min="0" step="0.5" defaultValue="0" /></label></div>}
    {message && <p className="text-xs font-medium text-rose-700" role="alert">{message}</p>}
    <div className="flex flex-wrap gap-2">
      {awaiting && <><button disabled={pending} formAction={(data) => act("approve", data)} className="inline-flex items-center gap-1.5 rounded-lg bg-iium-green px-3 py-2 text-xs font-semibold text-white"><Check className="h-3.5 w-3.5" />Approve</button><button disabled={pending} formAction={(data) => act("reject", data)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"><X className="h-3.5 w-3.5" />Reject</button></>}
      {status === "APPROVED" && <button disabled={pending} formAction={(data) => act("start", data)} className="inline-flex items-center gap-1.5 rounded-lg bg-iium-green px-3 py-2 text-xs font-semibold text-white"><CirclePlay className="h-3.5 w-3.5" />Start work</button>}
      {status === "IN_PROGRESS" && <button disabled={pending} formAction={(data) => act("await_parts", data)} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"><CirclePause className="h-3.5 w-3.5" />Awaiting parts</button>}
      {status === "AWAITING_PARTS" && <button disabled={pending} formAction={(data) => act("start", data)} className="inline-flex items-center gap-1.5 rounded-lg border border-iium-green/20 px-3 py-2 text-xs font-semibold text-iium-deep"><CirclePlay className="h-3.5 w-3.5" />Resume work</button>}
      {working && <button disabled={pending} formAction={(data) => act("complete", data)} className="inline-flex items-center gap-1.5 rounded-lg bg-iium-green px-3 py-2 text-xs font-semibold text-white"><Wrench className="h-3.5 w-3.5" />Complete work</button>}
      {status === "COMPLETED" && <button disabled={pending} formAction={(data) => act("close", data)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white"><Check className="h-3.5 w-3.5" />Close request</button>}
    </div>
  </form>;
}

export function MaintenanceCancelAction({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function cancel() { setPending(true); setMessage(""); try { const response = await fetch("/api/workflows/maintenance", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: requestId, action: "cancel" }) }); await readMaintenanceResponse(response); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to cancel request."); setPending(false); } }
  return <div className="mt-4 border-t border-slate-100 pt-4">{message && <p className="mb-2 text-xs font-medium text-rose-700">{message}</p>}<button type="button" onClick={cancel} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><X className="h-3.5 w-3.5" />{pending ? "Cancelling..." : "Cancel request"}</button></div>;
}

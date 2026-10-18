"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Check, LoaderCircle, Send, X } from "lucide-react";
import { UserAutocomplete, type AssignableUser } from "@/components/user-autocomplete";

type TransferAsset = {
  id: string;
  tagNumber: string;
  name: string;
  roomId: string;
  roomLabel: string;
  assignedUser: AssignableUser | null;
};
type RoomOption = { id: string; label: string };

export function TransferRequestForm({ assets, rooms }: { assets: TransferAsset[]; rooms: RoomOption[] }) {
  const router = useRouter();
  const submitting = useRef(false);
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [transferType, setTransferType] = useState<"LOCATION" | "CUSTODIAN" | "BOTH">("LOCATION");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const asset = useMemo(() => assets.find((item) => item.id === assetId) ?? null, [assetId, assets]);
  const changesLocation = transferType === "LOCATION" || transferType === "BOTH";
  const changesCustodian = transferType === "CUSTODIAN" || transferType === "BOTH";

  useEffect(() => {
    if (!assets.some((item) => item.id === assetId)) setAssetId(assets[0]?.id ?? "");
  }, [assetId, assets]);

  async function submit(formData: FormData) {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/workflows/transfers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assetId,
          transferType,
          newRoomId: changesLocation ? formData.get("newRoomId") : undefined,
          newCustodianId: changesCustodian ? formData.get("newCustodianId") : undefined,
          reason: formData.get("reason")
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to submit transfer request.");
      setMessage({ tone: "success", text: `${result.transfer.transferNumber} was submitted for approval.` });
      submitting.current = false;
      setPending(false);
      router.refresh();
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Unable to submit transfer request." });
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <form action={submit} className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700 md:col-span-2">Asset
        <select value={assetId} onChange={(event) => { setAssetId(event.target.value); setMessage(null); }} required>
          {assets.map((item) => <option key={item.id} value={item.id}>{item.tagNumber} — {item.name}</option>)}
        </select>
      </label>
      {asset && <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs md:col-span-2 sm:grid-cols-2"><div><p className="text-slate-400">Current location</p><p className="mt-1 font-semibold text-slate-700">{asset.roomLabel}</p></div><div><p className="text-slate-400">Current custodian</p><p className="mt-1 font-semibold text-slate-700">{asset.assignedUser?.name ?? "Unassigned"}</p></div></div>}
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700 md:col-span-2">Transfer type
        <select value={transferType} onChange={(event) => setTransferType(event.target.value as typeof transferType)}>
          <option value="LOCATION">Location only</option>
          <option value="CUSTODIAN">Custodian only</option>
          <option value="BOTH">Location and custodian</option>
        </select>
      </label>
      {changesLocation && <label className="grid gap-1.5 text-sm font-semibold text-slate-700 md:col-span-2">Destination room
        <select name="newRoomId" defaultValue="" required><option value="" disabled>Select destination building and room</option>{rooms.filter((room) => room.id !== asset?.roomId).map((room) => <option key={room.id} value={room.id}>{room.label}</option>)}</select>
      </label>}
      {changesCustodian && <div className="md:col-span-2"><UserAutocomplete key={`${assetId}-${transferType}`} name="newCustodianId" label="New custodian" helperText="Search and select the active user who will receive custody of this asset." /></div>}
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700 md:col-span-2">Reason for transfer<textarea name="reason" rows={3} minLength={8} maxLength={1000} required placeholder="Explain why the location or custodian needs to change" /></label>
      {message && <p className={`rounded-lg px-4 py-3 text-sm md:col-span-2 ${message.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`} role="status">{message.text}</p>}
      <button disabled={pending || !assetId} className="inline-flex items-center justify-center gap-2 rounded-lg bg-iium-green px-4 py-2.5 text-sm font-semibold text-white shadow-lift hover:bg-iium-deep disabled:opacity-60 md:col-span-2">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{pending ? "Submitting transfer..." : "Submit transfer request"}</button>
    </form>
  );
}

export function TransferReviewActions({ transferId }: { transferId: string }) {
  const router = useRouter();
  const acting = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function act(decision: "approve" | "reject", formData: FormData) {
    if (acting.current) return;
    acting.current = true;
    setPending(true);
    setMessage("");
    const reason = formData.get("reason");
    try {
      const response = await fetch("/api/workflows/transfers", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: transferId, decision, ...(typeof reason === "string" && reason.trim() ? { reason: reason.trim() } : {}) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update transfer.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to update transfer.");
      acting.current = false;
      setPending(false);
    }
  }

  return (
    <form className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      <input name="reason" placeholder="Reason required when rejecting" maxLength={500} />
      {message && <p className="text-xs font-medium text-rose-700" role="alert">{message}</p>}
      <div className="flex flex-wrap gap-2">
        <button disabled={pending} formAction={(data) => act("approve", data)} className="inline-flex items-center gap-1.5 rounded-lg bg-iium-green px-3 py-2 text-xs font-semibold text-white hover:bg-iium-deep disabled:opacity-60"><Check className="h-3.5 w-3.5" />Approve and transfer</button>
        <button disabled={pending} formAction={(data) => act("reject", data)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"><X className="h-3.5 w-3.5" />Reject</button>
      </div>
    </form>
  );
}

export function TransferCancelAction({ transferId }: { transferId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function cancel() {
    setPending(true); setMessage("");
    const response = await fetch("/api/workflows/transfers", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: transferId, decision: "cancel" }) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error ?? "Unable to cancel transfer."); setPending(false); return; }
    router.refresh();
  }
  return <div className="mt-4 border-t border-slate-100 pt-4">{message && <p className="mb-2 text-xs font-medium text-rose-700">{message}</p>}<button type="button" disabled={pending} onClick={cancel} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"><X className="h-3.5 w-3.5" />{pending ? "Cancelling..." : "Cancel request"}</button></div>;
}

export function TransferIcon() { return <ArrowRightLeft className="h-5 w-5" />; }

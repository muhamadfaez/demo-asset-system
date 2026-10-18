"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LogIn, RotateCcw, Send, X } from "lucide-react";

export function BorrowRequestForm({ assetId, maxDays }: { assetId: string; maxDays: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  async function submit(formData: FormData) {
    setPending(true); setMessage(null);
    const response = await fetch("/api/workflows/borrowings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ assetId, purpose: formData.get("purpose"), startDate: formData.get("startDate"), expectedReturnAt: formData.get("expectedReturnAt") }) });
    const result = await response.json();
    if (!response.ok) { setMessage({ tone: "error", text: result.error ?? "Unable to submit request." }); setPending(false); return; }
    setMessage({ tone: "success", text: "Borrowing request submitted for approval." });
    setPending(false); router.refresh();
  }
  return (
    <form action={submit} className="mt-4 grid gap-3 border-t border-slate-100 pt-4">
      <label className="grid gap-1 text-xs font-semibold text-slate-600">Purpose<textarea name="purpose" required minLength={8} rows={2} placeholder="Explain why and where the asset is needed" /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-semibold text-slate-600">Start date<input name="startDate" type="date" required /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Return date<input name="expectedReturnAt" type="date" required /></label></div>
      <p className="text-[11px] text-slate-400">Maximum borrowing period: {maxDays} days.</p>
      {message && <p className={`text-xs font-medium ${message.tone === "success" ? "text-emerald-700" : "text-rose-700"}`} role="status">{message.text}</p>}
      <button disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-iium-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-iium-deep disabled:opacity-60"><Send className="h-4 w-4" />{pending ? "Submitting..." : "Request to borrow"}</button>
    </form>
  );
}

export function BorrowingReviewActions({ requestId, status }: { requestId: string; status: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function act(decision: "approve" | "reject" | "checkout" | "return", formData: FormData) {
    setPending(true); setMessage("");
    const reason = formData.get("reason");
    const response = await fetch("/api/workflows/borrowings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: requestId, decision, ...(typeof reason === "string" && reason.trim() ? { reason: reason.trim() } : {}) }) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error ?? "Unable to update request."); setPending(false); return; }
    setPending(false); router.refresh();
  }
  const awaitingReview = status === "PENDING_APPROVAL" || status === "SUBMITTED";
  if (!awaitingReview && status !== "APPROVED" && status !== "CHECKED_OUT" && status !== "OVERDUE") return null;
  return (
    <form className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      {awaitingReview && <input name="reason" placeholder="Reason required when rejecting" maxLength={500} />}
      {message && <p className="text-xs font-medium text-rose-700" role="alert">{message}</p>}
      <div className="flex flex-wrap gap-2">
        {awaitingReview && <><button disabled={pending} formAction={(data) => act("approve", data)} className="inline-flex items-center gap-1.5 rounded-lg bg-iium-green px-3 py-2 text-xs font-semibold text-white hover:bg-iium-deep"><Check className="h-3.5 w-3.5" />Approve</button><button disabled={pending} formAction={(data) => act("reject", data)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"><X className="h-3.5 w-3.5" />Reject</button></>}
        {status === "APPROVED" && <button disabled={pending} formAction={(data) => act("checkout", data)} className="inline-flex items-center gap-1.5 rounded-lg bg-iium-green px-3 py-2 text-xs font-semibold text-white"><LogIn className="h-3.5 w-3.5" />Check out asset</button>}
        {(status === "CHECKED_OUT" || status === "OVERDUE") && <button disabled={pending} formAction={(data) => act("return", data)} className="inline-flex items-center gap-1.5 rounded-lg bg-iium-green px-3 py-2 text-xs font-semibold text-white"><RotateCcw className="h-3.5 w-3.5" />Mark returned</button>}
      </div>
    </form>
  );
}

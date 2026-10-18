"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateMyProfile, type ProfileActionState } from "@/app/(app)/profile/actions";

const initialState: ProfileActionState = { status: "idle" };

export function ProfileForm({ position, phone, staffNo }: { position: string | null; phone: string | null; staffNo: string | null }) {
  const [state, formAction, pending] = useActionState(updateMyProfile, initialState);
  return <form action={formAction} className="mt-5 space-y-3 border-t border-slate-100 pt-5">
    <h3 className="text-sm font-semibold text-slate-900">Edit personal details</h3>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Position<input name="position" defaultValue={position ?? ""} maxLength={120} disabled={pending} /></label>
      <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Phone number<input name="phone" type="tel" defaultValue={phone ?? ""} maxLength={40} disabled={pending} /></label>
      <label className="grid gap-1.5 text-xs font-semibold text-slate-600 sm:col-span-2">Staff ID<input name="staffNo" defaultValue={staffNo ?? ""} maxLength={40} disabled={pending} /></label>
    </div>
    <div className="flex flex-wrap items-center gap-3"><button disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-iium-green px-4 py-2 text-sm font-semibold text-white hover:bg-iium-deep disabled:opacity-60"><Save className="h-4 w-4" />{pending ? "Saving..." : "Save details"}</button>{state.message && <p role="status" className={`text-xs font-medium ${state.status === "success" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>}</div>
  </form>;
}

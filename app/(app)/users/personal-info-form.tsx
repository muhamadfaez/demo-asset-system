"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateUserPersonalInfo, type UserActionState } from "@/app/(app)/users/actions";

const initialState: UserActionState = { status: "idle" };

export function PersonalInfoForm({ user }: { user: { id: string; name: string; email: string; position: string | null; phone: string | null; staffNo: string | null } }) {
  const [state, formAction, pending] = useActionState(updateUserPersonalInfo, initialState);
  return <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
    <summary className="cursor-pointer text-sm font-semibold text-iium-deep">Edit personal information</summary>
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="userId" value={user.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Full name<input name="name" defaultValue={user.name} required maxLength={120} disabled={pending} /></label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Email address<input name="email" type="email" defaultValue={user.email} required maxLength={254} disabled={pending} /></label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Position<input name="position" defaultValue={user.position ?? ""} maxLength={120} disabled={pending} /></label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Phone number<input name="phone" type="tel" defaultValue={user.phone ?? ""} maxLength={40} disabled={pending} /></label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600 sm:col-span-2">Staff ID<input name="staffNo" defaultValue={user.staffNo ?? ""} maxLength={40} disabled={pending} /></label>
      </div>
      <p className="text-xs text-slate-500">Email must use the permitted domain. Google account details remain managed by Google.</p>
      <div className="flex flex-wrap items-center gap-3"><button disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-iium-green px-3 py-2 text-xs font-semibold text-white hover:bg-iium-deep disabled:opacity-60"><Save className="h-4 w-4" />{pending ? "Saving..." : "Save personal details"}</button>{state.message && <span role="status" className={`text-xs font-medium ${state.status === "success" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</span>}</div>
    </form>
  </details>;
}

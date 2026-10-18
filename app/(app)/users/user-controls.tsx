"use client";

import { useActionState } from "react";
import { Check, Pause, RotateCcw, Save, X } from "lucide-react";
import { updateUserAccount, type UserActionState } from "@/app/(app)/users/actions";

const initialState: UserActionState = { status: "idle" };
type DepartmentOption = { id: string; name: string };

export function UserControls({ user, departments, review = false }: { user: { id: string; role: string; status: string; departmentId: string | null }; departments: DepartmentOption[]; review?: boolean }) {
  const [state, formAction, pending] = useActionState(updateUserAccount, initialState);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="userId" value={user.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Role
          <select name="role" defaultValue={user.role} disabled={pending}>
            <option value="USER">User</option>
            <option value="ASSET_LIAISON">Asset Liaison</option>
            <option value="SUPERADMIN">Superadmin</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Department
          <select name="departmentId" defaultValue={user.departmentId ?? ""} disabled={pending}>
            <option value="">Not assigned</option>
            {departments.map((department) => <option value={department.id} key={department.id}>{department.name}</option>)}
          </select>
        </label>
      </div>
      {review && <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Review note <input name="reason" placeholder="Optional note to the applicant" maxLength={500} /></label>}
      <div className="flex flex-wrap items-center gap-2">
        {review ? (
          <>
            <ActionButton name="intent" value="approve" disabled={pending} tone="primary" icon={Check}>Approve account</ActionButton>
            <ActionButton name="intent" value="reject" disabled={pending} tone="danger" icon={X}>Reject</ActionButton>
          </>
        ) : (
          <>
            <ActionButton name="intent" value="update" disabled={pending} tone="primary" icon={Save}>Save assignment</ActionButton>
            {user.status === "ACTIVE" ? <ActionButton name="intent" value="suspend" disabled={pending} tone="danger" icon={Pause}>Suspend</ActionButton> : <ActionButton name="intent" value="activate" disabled={pending} tone="neutral" icon={RotateCcw}>Reactivate</ActionButton>}
          </>
        )}
        {state.message && <span className={`text-xs font-medium ${state.status === "success" ? "text-emerald-700" : "text-rose-700"}`} role="status">{state.message}</span>}
      </div>
    </form>
  );
}

function ActionButton({ icon: Icon, tone, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: React.ComponentType<{ className?: string }>; tone: "primary" | "danger" | "neutral" }) {
  const tones = { primary: "bg-iium-green text-white hover:bg-iium-deep", danger: "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50", neutral: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" };
  return <button {...props} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${tones[tone]}`}><Icon className="h-3.5 w-3.5" />{children}</button>;
}

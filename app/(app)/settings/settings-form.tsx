"use client";

import { useActionState } from "react";
import { Building2, CheckCircle2, Clock3, Globe2, Hash, Save, ShieldCheck } from "lucide-react";
import type { SystemSettings } from "@/lib/settings";
import { saveSettings, type SettingsActionState } from "@/app/(app)/settings/actions";

const initialState: SettingsActionState = { status: "idle" };

export function SettingsForm({ settings }: { settings: SystemSettings }) {
  const [state, formAction, pending] = useActionState(saveSettings, initialState);
  return (
    <form action={formAction} className="space-y-4">
      {state.message && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium ${state.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`} role="status">
          {state.status === "success" ? <CheckCircle2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          {state.message}
        </div>
      )}

      <SettingsSection icon={Building2} title="Identity" description="Names displayed throughout the application and exported reports.">
        <Field name="systemName" label="System name" defaultValue={settings.systemName} error={state.errors?.systemName?.[0]} />
        <Field name="organisationName" label="Short organisation name" defaultValue={settings.organisationName} error={state.errors?.organisationName?.[0]} hint="Used in the sidebar brand." />
      </SettingsSection>

      <SettingsSection icon={Globe2} title="Access and localisation" description="Control the authorised Google domain and regional display defaults.">
        <Field name="permittedEmailDomain" label="Permitted email domain" defaultValue={settings.permittedEmailDomain} error={state.errors?.permittedEmailDomain?.[0]} hint="Only Google accounts using this domain can sign in." />
        <Field name="currency" label="Currency code" defaultValue={settings.currency} error={state.errors?.currency?.[0]} />
        <SelectField name="timeZone" label="Timezone" defaultValue={settings.timeZone} error={state.errors?.timeZone?.[0]} options={[["Asia/Kuala_Lumpur", "Malaysia (Asia/Kuala Lumpur)"], ["Asia/Singapore", "Singapore"], ["UTC", "UTC"]]} />
      </SettingsSection>

      <SettingsSection icon={Hash} title="Numbering" description="Prefixes used when creating new asset and borrowing records.">
        <Field name="assetTagPrefix" label="Asset tag prefix" defaultValue={settings.assetTagPrefix} error={state.errors?.assetTagPrefix?.[0]} />
        <Field name="borrowingPrefix" label="Borrowing request prefix" defaultValue={settings.borrowingPrefix} error={state.errors?.borrowingPrefix?.[0]} />
      </SettingsSection>

      <SettingsSection icon={Clock3} title="Borrowing policy" description="Set the maximum period accepted for a new borrowing request.">
        <Field name="maxBorrowingDays" label="Maximum borrowing period (days)" type="number" min={1} max={365} defaultValue={settings.maxBorrowingDays} error={state.errors?.maxBorrowingDays?.[0]} />
      </SettingsSection>

      <div className="sticky bottom-3 flex justify-end rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <button disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-iium-green px-5 py-2.5 text-sm font-semibold text-white shadow-lift hover:bg-iium-deep disabled:cursor-not-allowed disabled:opacity-60">
          <Save className="h-4 w-4" />{pending ? "Saving..." : "Save settings"}
        </button>
      </div>
    </form>
  );
}

function SettingsSection({ icon: Icon, title, description, children }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white shadow-glass">
      <div className="flex gap-3 border-b border-slate-100 px-5 py-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-iium-green/10 text-iium-deep"><Icon className="h-4 w-4" /></span>
        <div><h2 className="text-sm font-semibold text-slate-900">{title}</h2><p className="mt-0.5 text-xs text-slate-500">{description}</p></div>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, error, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  return <label className="grid content-start gap-1.5 text-sm font-medium text-slate-700">{label}<input {...props} aria-invalid={Boolean(error)} className={error ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : ""} />{error ? <span className="text-xs text-rose-600">{error}</span> : hint ? <span className="text-xs font-normal text-slate-400">{hint}</span> : null}</label>;
}

function SelectField({ label, error, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; options: string[][] }) {
  return <label className="grid content-start gap-1.5 text-sm font-medium text-slate-700">{label}<select {...props} aria-invalid={Boolean(error)}>{options.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select>{error && <span className="text-xs text-rose-600">{error}</span>}</label>;
}

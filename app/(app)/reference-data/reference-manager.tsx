"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { saveReferenceData, type ReferenceActionState } from "./actions";
import type { ReferenceGroup, ReferenceItem } from "./types";

const initialState: ReferenceActionState = { status: "idle" };

export function ReferenceManager({ groups }: { groups: ReferenceGroup[] }) {
  return <div className="grid gap-5 xl:grid-cols-2">{groups.map((group) => <Card key={group.kind} className="h-fit overflow-hidden p-0"><div className="border-b border-slate-100 px-5 py-4"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-900">{group.title}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{group.items.length}</span></div><p className="mt-1 text-sm text-slate-500">{group.description}</p></div><div className="p-5"><details className="rounded-lg border border-iium-green/20 bg-iium-mist/40 p-3"><summary className="cursor-pointer text-sm font-semibold text-iium-deep">Add new record</summary><ReferenceForm group={group} /></details><div className="mt-4 divide-y divide-slate-100">{group.items.length ? group.items.map((item) => <details key={item.id} className="py-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm marker:hidden"><span className="min-w-0"><span className="block truncate font-semibold text-slate-800">{item.name}{item.code ? ` (${item.code})` : ""}{item.active === false ? <span className="ml-2 text-xs font-normal text-amber-700">Inactive</span> : null}</span>{item.parentName && <span className="block truncate text-xs text-slate-500">{item.parentName}</span>}</span><span className="shrink-0 text-xs font-semibold text-iium-deep">Edit</span></summary><ReferenceForm key={`${item.id}:${item.name}:${item.code}:${item.parentId}:${item.active}`} group={group} item={item} /></details>) : <p className="py-4 text-sm text-slate-500">No records yet. Add the first one above.</p>}</div></div></Card>)}</div>;
}

function ReferenceForm({ group, item }: { group: ReferenceGroup; item?: ReferenceItem }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(saveReferenceData, initialState);
  useEffect(() => {
    if (state.status === "success") {
      if (!item) formRef.current?.reset();
      router.refresh();
    }
  }, [state, item?.id, router]);
  return <form ref={formRef} action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
    <input type="hidden" name="kind" value={group.kind} />
    <input type="hidden" name="id" value={item?.id ?? ""} />
    <label className="grid gap-1 text-xs font-semibold text-slate-600">Name<input name="name" defaultValue={item?.name ?? ""} minLength={2} maxLength={120} required disabled={pending} /></label>
    {group.hasCode && <label className="grid gap-1 text-xs font-semibold text-slate-600">Code<input name="code" defaultValue={item?.code ?? ""} maxLength={30} pattern="[A-Za-z0-9][A-Za-z0-9_-]*" required disabled={pending} /></label>}
    {group.parentLabel && <label className="grid gap-1 text-xs font-semibold text-slate-600">{group.parentLabel}<select name="parentId" defaultValue={item?.parentId ?? ""} required disabled={pending}><option value="" disabled>Select {group.parentLabel.toLowerCase()}</option>{group.parents?.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}</select></label>}
    {group.hasActive && <label className="grid gap-1 text-xs font-semibold text-slate-600">Availability<select name="active" defaultValue={String(item?.active ?? true)} disabled={pending}><option value="true">Active</option><option value="false">Inactive</option></select></label>}
    {!group.hasActive && <input type="hidden" name="active" value="true" />}
    <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button disabled={pending || Boolean(group.parentLabel && !group.parents?.length)} className="rounded-lg bg-iium-green px-4 py-2 text-xs font-semibold text-white hover:bg-iium-deep disabled:opacity-60">{pending ? "Saving..." : item ? "Save changes" : "Add record"}</button>{state.message && <span role="status" className={`text-xs font-medium ${state.status === "success" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</span>}</div>
    {group.parentLabel && !group.parents?.length && <p className="text-xs text-amber-700 sm:col-span-2">Add a {group.parentLabel.toLowerCase()} first.</p>}
  </form>;
}

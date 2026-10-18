"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { UserAutocomplete, type AssignableUser } from "@/components/user-autocomplete";

type Option = { value: string; label: string; parentId?: string };
type EditableAsset = {
  id: string; tagNumber: string; name: string; serialNumber: string | null; description: string | null;
  acquisitionCost: number; categoryId: string; kulliyyahId: string; departmentId: string; buildingId: string;
  roomId: string; condition: string; status: string; borrowable: boolean;
  assignedUser: AssignableUser | null;
};

export function AssetEditForm({ asset, options, currency }: { asset: EditableAsset; options: { categories: Option[]; kulliyyahs: Option[]; departments: Option[]; buildings: Option[]; rooms: Option[]; conditions: Option[]; statuses: Option[] }; currency: string }) {
  const router = useRouter();
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [kulliyyahId, setKulliyyahId] = useState(asset.kulliyyahId);
  const [departmentId, setDepartmentId] = useState(asset.departmentId);
  const [buildingId, setBuildingId] = useState(asset.buildingId);
  const [roomId, setRoomId] = useState(asset.roomId);
  const departmentOptions = options.departments.filter((item) => item.parentId === kulliyyahId);
  const roomOptions = options.rooms.filter((item) => item.parentId === buildingId);
  async function submit(formData: FormData) {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/assets", { method: "PATCH", body: formData });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Unable to update asset.");
        submitting.current = false;
        setPending(false);
        return;
      }
      router.push(`/assets/${asset.id}`);
      router.refresh();
    } catch {
      setError("Unable to update asset. Please try again.");
      submitting.current = false;
      setPending(false);
    }
  }
  return (
    <form action={submit} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="id" value={asset.id} />
      <Field name="tagNumber" label="Asset tag number" defaultValue={asset.tagNumber} required />
      <Field name="name" label="Asset name" defaultValue={asset.name} required />
      <Field name="serialNumber" label="Serial number" defaultValue={asset.serialNumber ?? ""} />
      <Field name="acquisitionCost" label={`Acquisition cost (${currency})`} type="number" min="0" step="0.01" defaultValue={asset.acquisitionCost} required />
      <SelectField name="categoryId" label="Category" defaultValue={asset.categoryId} options={options.categories} />
      <SelectField name="kulliyyahId" label="Kulliyyah" value={kulliyyahId} onChange={(event) => { const next = event.target.value; setKulliyyahId(next); setDepartmentId(options.departments.find((item) => item.parentId === next)?.value ?? ""); }} options={options.kulliyyahs} required />
      <SelectField name="departmentId" label="Department" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} options={departmentOptions} required />
      <SelectField name="buildingId" label="Building" value={buildingId} onChange={(event) => { const next = event.target.value; setBuildingId(next); setRoomId(options.rooms.find((item) => item.parentId === next)?.value ?? ""); }} options={options.buildings} required />
      <SelectField name="roomId" label="Room" value={roomId} onChange={(event) => setRoomId(event.target.value)} options={roomOptions} required />
      <SelectField name="condition" label="Condition" defaultValue={asset.condition} options={options.conditions} />
      <SelectField name="status" label="Status" defaultValue={asset.status} options={options.statuses} />
      <SelectField name="borrowable" label="Borrowable" defaultValue={String(asset.borrowable)} options={[{ value: "true", label: "Yes" }, { value: "false", label: "No" }]} />
      <UserAutocomplete initialUser={asset.assignedUser} />
      <label className="grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-2">Description<textarea name="description" defaultValue={asset.description ?? ""} rows={5} placeholder="Asset description and operational notes" /></label>
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:col-span-2" role="alert">{error}</p>}
      <button disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-iium-green px-4 py-3 font-semibold text-white shadow-lift hover:bg-iium-deep disabled:opacity-60 md:col-span-2"><Save className="h-4 w-4" />{pending ? "Saving changes..." : "Save asset changes"}</button>
    </form>
  );
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="grid gap-1.5 text-sm font-medium text-slate-700">{label}<input {...props} /></label>;
}
function SelectField({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: Option[] }) {
  return <label className="grid gap-1.5 text-sm font-medium text-slate-700">{label}<select {...props}>{!options.length && <option value="">Add a related record first</option>}{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

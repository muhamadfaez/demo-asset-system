"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  UserAutocomplete,
  type AssignableUser,
} from "@/components/user-autocomplete";
import { assetSchema } from "@/lib/validation";
import { AttachmentManager } from "@/components/asset-attachments";
export type AssetOption = { value: string; label: string; parentId?: string };
type Options = {
  categories: AssetOption[];
  departments: AssetOption[];
  rooms: AssetOption[];
  kulliyyahs: AssetOption[];
  buildings: AssetOption[];
  suppliers?: AssetOption[];
  fundingSources?: AssetOption[];
};
export type AuditAsset = {
  id: string;
  tagNumber: string;
  assignedUser?: AssignableUser | null;
  custodian?: AssignableUser | null;
  verifiedBy?: { name: string } | null;
  documents?: { id: string; fileName: string; typeLabel: string }[];
  [key: string]: unknown;
};
export function AssetAuditForm({
  options,
  asset,
  serialNumber = "",
}: {
  options: Options;
  asset?: AuditAsset;
  serialNumber?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>(
    {},
  );
  useEffect(() => {
    const first = Object.keys(errors)[0];
    if (!first) return;
    const control = formRef.current?.elements.namedItem(first);
    if (control instanceof HTMLElement) {
      control.focus();
      control.scrollIntoView({ block: "center" });
    }
  }, [errors]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [department, setDepartment] = useState(
    String(asset?.departmentId ?? options.departments[0]?.value ?? ""),
  );
  const [room, setRoom] = useState(
    String(asset?.roomId ?? options.rooms[0]?.value ?? ""),
  );
  const [assetType, setAssetType] = useState(
    String(asset?.assetType ?? "INVENTORY"),
  );
  const [legacy, setLegacy] = useState(String(asset?.legacyRecordReason ?? ""));
  const fixedRequired = assetType === "FIXED_ASSET" && !legacy.trim();
  const workflowOwned =
    !!asset &&
    !["DRAFT", "PENDING_APPROVAL", "AVAILABLE", "ASSIGNED"].includes(
      String(asset.status),
    );
  const val = (name: string) => {
    const v = asset?.[name];
    if (name === "acquisitionCost" && typeof v === "number")
      return v.toFixed(2);
    return v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "");
  };
  const issue = (name: string) =>
    errors[name] ? (
      <span id={`${name}-error`} role="alert" className="text-xs text-rose-700">
        {errors[name]?.join(". ")}
      </span>
    ) : null;
  function field(name: string, label: string, type = "text", required = false) {
    return (
      <label className="grid gap-1 text-sm text-slate-700" key={name}>
        {label}
        {required ? " *" : ""}
        <input
          name={name}
          type={type}
          inputMode={type === "number" ? "decimal" : undefined}
          defaultValue={
            val(name) || (name === "serialNumber" ? serialNumber : undefined)
          }
          required={required}
          min={type === "number" ? "0" : undefined}
          step={type === "number" ? "0.01" : undefined}
          aria-invalid={!!errors[name]}
          aria-describedby={errors[name] ? `${name}-error` : undefined}
        />
        {issue(name)}
      </label>
    );
  }
  function select(
    name: string,
    label: string,
    rows: AssetOption[],
    required = false,
  ) {
    return (
      <label className="grid gap-1 text-sm text-slate-700" key={name}>
        {label}
        {required ? " *" : ""}
        <select
          name={name}
          defaultValue={val(name)}
          required={required}
          aria-invalid={!!errors[name]}
          aria-describedby={errors[name] ? `${name}-error` : undefined}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {rows.map((row) => (
            <option key={row.value} value={row.value}>
              {row.label}
            </option>
          ))}
        </select>
        {issue(name)}
      </label>
    );
  }
  const heading = (text: string, description: string) => (
    <div className="asset-form-heading">
      <h2 className="font-semibold text-iium-deep">{text}</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const invalidSearch = Array.from(
      event.currentTarget.querySelectorAll("input"),
    ).find((input) => input.validity.customError || input.validity.badInput);
    if (invalidSearch) {
      setError(invalidSearch.validationMessage);
      invalidSearch.reportValidity();
      return;
    }
    const form = new FormData(event.currentTarget);
    const parsed = assetSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      setError("Please correct the highlighted fields.");
      return;
    }
    setErrors({});
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/assets", {
        method: asset ? "PATCH" : "POST",
        headers: { Accept: "application/json" },
        body: form,
      });
      const result = await response.json();
      if (!response.ok) {
        setErrors(result.issues?.fieldErrors ?? {});
        throw new Error(result.error ?? "Unable to save asset");
      }
      router.push(`/assets/${result.asset.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save asset");
      setPending(false);
    }
  }
  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={submit}
      className="asset-audit-form min-w-0 space-y-5"
    >
      {asset && <input type="hidden" name="id" value={asset.id} />}
      <p className="text-sm leading-6 text-slate-500">
        Fields marked <span className="font-semibold text-iium-deep">*</span>{" "}
        are required. Your changes are saved when you select{" "}
        {asset ? "Save changes" : "Register asset"}.
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          {error}
        </p>
      )}
      <section className="asset-form-section" aria-label="Identification">
        {heading(
          "Identification",
          "Start with the asset name, category and identifiers.",
        )}
        <div className="asset-form-grid">
          <label className="grid gap-1 text-sm">
            Asset tag number
            <input
              value={asset?.tagNumber ?? "Generated when saved"}
              readOnly
            />
          </label>
          {field("name", "Asset name", "text", true)}
          {field("serialNumber", "Serial number")}
          {select("categoryId", "Category", options.categories, true)}
          {field("brandName", "Brand")}
          {field("model", "Model")}
          <label className="grid gap-1 text-sm">
            Asset type *
            <select
              name="assetType"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
            >
              <option value="INVENTORY">Inventory</option>
              <option value="FIXED_ASSET">Fixed asset</option>
            </select>
          </label>
          <p className="text-xs leading-5 text-slate-500 md:col-span-2">
            {assetType === "FIXED_ASSET"
              ? "Fixed assets need procurement records, unless a legacy record reason is provided below."
              : "Inventory procurement records are optional. Acquisition cost is always required."}
          </p>
        </div>
      </section>
      <section className="asset-form-section" aria-label="Procurement">
        {heading(
          "Procurement",
          "Record purchase documents, supplier and cost in RM.",
        )}
        <div className="asset-form-grid">
          {field("purchaseOrderNumber", "P.O. number", "text", fixedRequired)}
          {field("invoiceNumber", "Invoice number", "text", fixedRequired)}
          {field("deliveryOrderNumber", "Delivery order / GRN")}
          {select(
            "supplierId",
            "Vendor / supplier",
            options.suppliers ?? [],
            fixedRequired,
          )}
          {field("acquisitionDate", "Purchase date", "date", fixedRequired)}
          {field("receivedDate", "Received date", "date")}
          {field("acquisitionCost", "Acquisition cost (RM)", "number", true)}
          {select(
            "fundingSourceId",
            "Funding source",
            options.fundingSources ?? [],
          )}
          {field("grantProjectCode", "Grant / project code")}
          <label className="grid gap-1 text-sm md:col-span-2">
            Legacy record reason (optional)
            <input
              name="legacyRecordReason"
              value={legacy}
              onChange={(e) => setLegacy(e.target.value)}
            />
            <span className="text-xs font-normal leading-5 text-slate-500">
              For older assets without original P.O. or invoice records, explain
              why the documents are unavailable.
            </span>
          </label>
        </div>
      </section>
      <details
        open={!!(errors.warrantyStartDate || errors.warrantyExpiryDate)}
        className="asset-form-section asset-form-optional group"
      >
        <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold text-iium-deep">
          Warranty{" "}
          <span className="flex shrink-0 items-center gap-2 text-xs font-normal text-slate-500">
            Optional
            <ChevronDown
              aria-hidden="true"
              className="h-4 w-4 transition-transform group-open:rotate-180"
            />
          </span>
        </summary>
        <div className="asset-form-grid mt-4">
          {field("warrantyStartDate", "Warranty start", "date")}
          {field("warrantyExpiryDate", "Warranty end", "date")}
          {field("serviceContract", "Service contract")}
          {field("supportVendor", "Support vendor")}
        </div>
      </details>
      <section className="asset-form-section" aria-label="Location and custody">
        {heading(
          "Location & Custody",
          "Choose a department and room. Kulliyyah and building are filled in automatically.",
        )}
        <div className="asset-form-grid">
          <label className="grid gap-1 text-sm">
            Department *
            <select
              name="departmentId"
              aria-invalid={!!errors.departmentId}
              aria-describedby={
                errors.departmentId ? "departmentId-error" : undefined
              }
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
            >
              {options.departments.map((row) => (
                <option key={row.value} value={row.value}>
                  {row.label.split(" / ").reverse().join(" / ")}
                </option>
              ))}
            </select>
            {issue("departmentId")}
          </label>
          <label className="grid gap-1 text-sm">
            Kulliyyah (from department)
            <input
              readOnly
              value={
                options.kulliyyahs.find(
                  (row) =>
                    row.value ===
                    options.departments.find((d) => d.value === department)
                      ?.parentId,
                )?.label ?? ""
              }
            />
          </label>
          <label className="grid gap-1 text-sm">
            Room *
            <select
              name="roomId"
              aria-invalid={!!errors.roomId}
              aria-describedby={errors.roomId ? "roomId-error" : undefined}
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              required
            >
              {options.rooms.map((row) => (
                <option key={row.value} value={row.value}>
                  {row.label.split(" / ").reverse().join(" / ")}
                </option>
              ))}
            </select>
            {issue("roomId")}
          </label>
          <label className="grid gap-1 text-sm">
            Building (from room)
            <input
              readOnly
              value={
                options.buildings.find(
                  (row) =>
                    row.value ===
                    options.rooms.find((r) => r.value === room)?.parentId,
                )?.label ?? ""
              }
            />
          </label>
          <UserAutocomplete
            name="custodianId"
            label="Custodian (accountable person)"
            initialUser={asset?.custodian}
          />
          {workflowOwned ? (
            <>
              <input
                type="hidden"
                name="assignedUserId"
                value={String(asset?.assignedUserId ?? "")}
              />
              <p className="text-sm">
                Assigned To: {asset?.assignedUser?.name ?? "Unassigned"}{" "}
                (controlled by workflow)
              </p>
            </>
          ) : (
            <UserAutocomplete initialUser={asset?.assignedUser} />
          )}
        </div>
      </section>
      <section className="asset-form-section" aria-label="Status and condition">
        {heading(
          "Status & Condition",
          "Describe the current condition and whether the asset can be borrowed.",
        )}
        <div className="asset-form-grid">
          {select(
            "condition",
            "Condition",
            [
              "NEW",
              "EXCELLENT",
              "GOOD",
              "FAIR",
              "POOR",
              "DAMAGED",
              "UNSERVICEABLE",
            ].map((value) => ({
              value,
              label: value
                .replaceAll("_", " ")
                .toLowerCase()
                .replace(/^./, (text) => text.toUpperCase()),
            })),
            true,
          )}
          {workflowOwned ? (
            <>
              <input
                type="hidden"
                name="status"
                value={String(asset?.status)}
              />
              <p className="text-sm">
                Status: {String(asset?.status)} (controlled by workflow)
              </p>
            </>
          ) : (
            <label className="grid gap-1 text-sm">
              Status *
              <select
                name="status"
                defaultValue={String(asset?.status ?? "DRAFT")}
              >
                {["DRAFT", "PENDING_APPROVAL", "AVAILABLE", "ASSIGNED"].map(
                  (value) => (
                    <option key={value} value={value}>
                      {value
                        .replaceAll("_", " ")
                        .toLowerCase()
                        .replace(/^./, (text) => text.toUpperCase())}
                    </option>
                  ),
                )}
              </select>
              {issue("status")}
            </label>
          )}
          <label className="grid gap-1 text-sm">
            Borrowable
            <select
              name="borrowable"
              defaultValue={String(asset?.borrowable ?? true)}
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            Description
            <textarea
              name="description"
              aria-invalid={!!errors.description}
              aria-describedby={
                errors.description ? "description-error" : undefined
              }
              defaultValue={val("description")}
              rows={2}
            />
            {issue("description")}
          </label>
        </div>
      </section>
      <section
        className="asset-form-section bg-slate-50/60"
        aria-label="Audit and verification"
      >
        {heading(
          "Audit & Verification",
          "Read-only information updated by the Verification module.",
        )}
        <dl className="asset-form-grid text-sm">
          <div>
            <dt className="text-xs text-slate-500">Last verified</dt>
            <dd className="mt-1 font-medium text-slate-700">
              {val("lastVerificationDate") || "Not verified"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Verified by</dt>
            <dd className="mt-1 font-medium text-slate-700">
              {asset?.verifiedBy?.name ?? "Not recorded"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Verification result</dt>
            <dd className="mt-1 font-medium text-slate-700">
              {val("verificationResult").replaceAll("_", " ") || "Not recorded"}
            </dd>
          </div>
        </dl>
      </section>
      <details className="asset-form-section asset-form-optional group">
        <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold text-iium-deep">
          Supporting Records{" "}
          <span className="flex shrink-0 items-center gap-2 text-xs font-normal text-slate-500">
            Optional
            <ChevronDown
              aria-hidden="true"
              className="h-4 w-4 transition-transform group-open:rotate-180"
            />
          </span>
        </summary>
        {asset ? (
          <AttachmentManager
            assetId={asset.id}
            initialDocuments={asset.documents ?? []}
          />
        ) : (
          <p className="mt-3 text-sm">
            Save this asset, then upload invoices, P.O., delivery orders,
            warranty cards and photos from its detail or edit page.
          </p>
        )}
      </details>
      {error && (
        <p role="alert" className="text-sm text-rose-700 md:col-span-2">
          {error}
        </p>
      )}
      <div className="asset-form-actions">
        <p className="text-xs leading-5 text-slate-500">
          Review the required fields above before saving. Supporting record
          uploads save separately.
        </p>
        <button
          disabled={pending}
          className="w-full shrink-0 rounded-lg bg-iium-green px-6 py-3 font-semibold text-white disabled:opacity-60 sm:w-auto"
        >
          {pending ? "Saving..." : asset ? "Save changes" : "Register asset"}
        </button>
      </div>
    </form>
  );
}

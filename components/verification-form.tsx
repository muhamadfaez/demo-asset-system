"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function VerificationForm({
  assets,
  campaigns,
}: {
  assets: { id: string; name: string; tagNumber: string }[];
  campaigns: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form
      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError("");
        try {
          const r = await fetch("/api/workflows/verification", {
            method: "POST",
            body: new FormData(e.currentTarget),
          });
          const b = await r.json();
          if (!r.ok) throw new Error(b.error);
          router.refresh();
        } catch (cause) {
          setError(String(cause));
        } finally {
          setPending(false);
        }
      }}
    >
      <h2 className="font-semibold text-iium-deep md:col-span-2">
        Record verification
      </h2>
      <label>
        Asset *
        <select name="assetId" required>
          <option value="">Select asset</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.tagNumber} ? {a.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Campaign *
        <select name="campaignId" required>
          <option value="">Select campaign</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Result *
        <select name="result">
          {["FOUND", "MISSING", "WRONG_LOCATION", "DAMAGED"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <label>
        Remarks
        <input name="remarks" maxLength={2000} />
      </label>
      {error && (
        <p role="alert" className="text-rose-700">
          {error}
        </p>
      )}
      <button
        disabled={pending}
        className="rounded-lg bg-iium-green p-3 text-white"
      >
        {pending ? "Saving?" : "Save verification"}
      </button>
    </form>
  );
}

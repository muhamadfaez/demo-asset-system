"use client";
import { useState } from "react";
import { attachmentTypes } from "@/lib/asset-attachments";
type Document = { id: string; fileName: string; typeLabel: string };
export function AttachmentManager({
  assetId,
  initialDocuments,
  readOnly = false,
}: {
  assetId: string;
  initialDocuments: Document[];
  readOnly?: boolean;
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function upload(input: HTMLInputElement) {
    if (!input.files?.[0]) return;
    setPending(true);
    setError("");
    const form = new FormData();
    form.set("assetId", assetId);
    form.set("file", input.files[0]);
    const container = input.closest("[data-attachments]");
    form.set("typeLabel", container?.querySelector("select")?.value ?? "OTHER");
    try {
      const response = await fetch("/api/assets/attachments", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setDocuments([...documents, result.document]);
      input.value = "";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }
  async function remove(id: string) {
    setPending(true);
    setError("");
    try {
      const r = await fetch(
        `/api/assets/attachments?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!r.ok) throw new Error("Unable to remove attachment");
      setDocuments(documents.filter((d) => d.id !== id));
    } catch (cause) {
      setError(String(cause));
    } finally {
      setPending(false);
    }
  }
  return (
    <div
      data-attachments
      className="asset-attachments mt-4 min-w-0 space-y-3 text-sm"
    >
      {documents.map((d) => (
        <div key={d.id} className="flex flex-wrap items-center gap-3">
          <a
            className="min-w-0 max-w-full text-iium-green underline [overflow-wrap:anywhere]"
            href={`/api/assets/attachments?id=${encodeURIComponent(d.id)}`}
          >
            {d.typeLabel}: {d.fileName}
          </a>
          {!readOnly && (
            <button
              type="button"
              disabled={pending}
              onClick={() => remove(d.id)}
              className="min-h-11 shrink-0 rounded-lg px-2 text-rose-700"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <div className="grid min-w-0 grid-cols-1 gap-4">
          <label className="grid min-w-0 gap-1.5">
            Record type
            <select disabled={pending} aria-label="Record type">
              {attachmentTypes.map((t) => (
                <option key={t} value={t}>
                  {t
                    .replaceAll("_", " ")
                    .toLowerCase()
                    .replace(/^./, (text) => text.toUpperCase())}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1.5">
            Upload document (PDF or image, maximum 1 MB)
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              disabled={pending}
              onChange={(e) => upload(e.currentTarget)}
            />
          </label>
        </div>
      )}
      {pending && <p role="status">Saving attachment...</p>}
      {error && (
        <p
          role="alert"
          className="min-h-11 shrink-0 rounded-lg px-2 text-rose-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}

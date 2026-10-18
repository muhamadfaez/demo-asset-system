"use client";

import { useEffect, useState } from "react";

export function IconUpload({ version, onProcessingChange }: { version: string; onProcessingChange: (busy: boolean) => void }) {
  const [icons, setIcons] = useState<Record<number, string>>({});
  const [reset, setReset] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setIcons({}); setReset(false); }, [version]);

  async function choose(file?: File) {
    setError("");
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setError("Choose a PNG, JPG, or WebP image up to 2 MB."); return;
    }
    setBusy(true);
    onProcessingChange(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (image.width < 192 || image.height < 192 || image.width > 8192 || image.height > 8192) throw new Error("Use an image between 192 and 8192 pixels on each side.");
      const result: Record<number, string> = {};
      for (const size of [192, 512, 180]) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Your browser could not prepare this image.");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, size, size);
        // Leave a safe border for rounded home-screen icon masks.
        const scale = size * 0.56 / Math.max(image.width, image.height);
        const width = image.width * scale, height = image.height * scale;
        context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        const data = canvas.toDataURL("image/png");
        if (data.length > 349526) throw new Error("This image is too detailed. Try a simpler icon.");
        result[size] = data;
      }
      setIcons(result); setReset(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to read this image."); }
    finally { URL.revokeObjectURL(url); setBusy(false); onProcessingChange(false); }
  }

  return <div className="space-y-3 md:col-span-2">
    <div className="flex items-center gap-4">
      <img src={icons[192] || (reset ? "/icons/icon-192.png" : `/app-icon/192?v=${encodeURIComponent(version)}`)} alt="App icon preview" width={72} height={72} className="rounded-xl border border-slate-200 bg-white" />
      <label className="grid gap-2 text-sm font-medium text-slate-700">App icon
        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ""; }} className="max-w-full text-xs" />
        <span className="text-xs font-normal text-slate-500">PNG, JPG, or WebP, up to 2 MB. A square image of at least 512 × 512 works best.</span>
      </label>
    </div>
    {busy && <p role="status" className="text-sm text-slate-500">Preparing icon…</p>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    <button type="button" onClick={() => { setIcons({}); setReset(true); setError(""); }} className="text-sm font-medium text-iium-deep underline">Restore default icon</button>
    <p className="text-xs text-slate-500">Save settings to apply this icon to the sidebar, login page, browser tab, and installed app. Installed apps may take time to refresh their icon.</p>
    <input type="hidden" name="resetIcon" value={String(reset)} />
    {[192, 512, 180].map((size) => <input key={size} type="hidden" name={`appIcon${size}`} value={icons[size] || ""} />)}
  </div>;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, ImageUp, Keyboard, LoaderCircle, ScanLine, X } from "lucide-react";
import { Card } from "@/components/ui";
import { UserAutocomplete } from "@/components/user-autocomplete";

type Option = { value: string; label: string; parentId?: string };
type RegistrationOptions = {
  categories: Option[];
  kulliyyahs: Option[];
  departments: Option[];
  buildings: Option[];
  rooms: Option[];
};

export function AssetRegistrationForm({ options, currency, assetTagPrefix, initialBarcode = "" }: { options: RegistrationOptions; currency: string; assetTagPrefix: string; initialBarcode?: string }) {
  const [step, setStep] = useState<"capture" | "details">("capture");
  const [scanTarget, setScanTarget] = useState<"tag" | "serial">(initialBarcode.startsWith(`${assetTagPrefix}-`) ? "tag" : "serial");
  const [barcode, setBarcode] = useState(initialBarcode);
  const [tagNumber, setTagNumber] = useState(`${assetTagPrefix}-`);
  const [serialNumber, setSerialNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [kulliyyahId, setKulliyyahId] = useState(options.kulliyyahs[0]?.value ?? "");
  const [departmentId, setDepartmentId] = useState(options.departments.find((item) => item.parentId === options.kulliyyahs[0]?.value)?.value ?? "");
  const [buildingId, setBuildingId] = useState(options.buildings[0]?.value ?? "");
  const [roomId, setRoomId] = useState(options.rooms.find((item) => item.parentId === options.buildings[0]?.value)?.value ?? "");
  const departmentOptions = options.departments.filter((item) => item.parentId === kulliyyahId);
  const roomOptions = options.rooms.filter((item) => item.parentId === buildingId);

  function captureBarcode(value: string) {
    setBarcode(value.trim());
  }

  function continueWithBarcode() {
    const value = barcode.trim();
    if (!value) return;
    if (scanTarget === "tag") setTagNumber(value);
    else setSerialNumber(value);
    setStep("details");
  }

  if (step === "capture") {
    return (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-5 py-4">
            <StepHeader current={1} />
            <h2 className="mt-4 text-lg font-bold text-slate-900">Capture the asset barcode</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Scan the barcode sticker on the asset, packaging, or box. You can review the value before continuing.</p>
          </div>
          <div className="space-y-5 p-5">
            <fieldset>
              <legend className="text-sm font-semibold text-slate-700">What does this barcode identify?</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <TargetChoice checked={scanTarget === "serial"} onChange={() => setScanTarget("serial")} title="Manufacturer serial number" body="Recommended for a barcode found on the product box or device label." />
                <TargetChoice checked={scanTarget === "tag"} onChange={() => setScanTarget("tag")} title="IIUM asset tag" body="Use when the sticker contains the institution's asset tag number." />
              </div>
            </fieldset>

            <BarcodeScanner onDetected={captureBarcode} />

            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Captured barcode value
              <div className="relative">
                <ScanLine className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input value={barcode} onChange={(event) => setBarcode(event.target.value)} className="w-full pl-10" placeholder="Scan or type the barcode value" autoComplete="off" />
              </div>
            </label>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
              <button type="button" onClick={() => setStep("details")} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Keyboard className="h-4 w-4" /> Skip and enter manually
              </button>
              <button type="button" onClick={continueWithBarcode} disabled={!barcode.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-iium-green px-4 py-2.5 text-sm font-semibold text-white shadow-lift hover:bg-iium-deep disabled:cursor-not-allowed disabled:opacity-50">
                Use this barcode <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>

        <Card className="h-fit border-iium-green/15 bg-iium-mist/50">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-iium-green text-white"><ScanLine className="h-5 w-5" /></div>
          <h2 className="mt-4 font-bold text-slate-900">Scanning tips</h2>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
            <li>Keep the complete barcode inside the frame.</li>
            <li>Hold the camera steady and avoid glare.</li>
            <li>Use the product serial barcode rather than a retail UPC when both are present.</li>
            <li>Confirm the captured value against the printed text on the sticker.</li>
          </ul>
          <p className="mt-5 rounded-lg border border-iium-green/15 bg-white/80 p-3 text-xs leading-5 text-slate-500">Camera access works on localhost or a secure HTTPS connection. Photo upload and manual entry remain available.</p>
        </Card>
      </div>
    );
  }

  return (
    <Card className="p-0">
      <div className="border-b border-slate-100 px-5 py-4">
        <StepHeader current={2} />
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-lg font-bold text-slate-900">Complete asset details</h2><p className="mt-1 text-sm text-slate-500">Review the identifier and complete the information required to register the asset.</p></div>
          {barcode && <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Barcode captured</span>}
        </div>
      </div>
      <form action="/api/assets" method="post" onSubmit={() => setSubmitting(true)} className="grid gap-4 p-5 md:grid-cols-2">
        <Field name="tagNumber" label="Asset tag number" value={tagNumber} onChange={(event) => setTagNumber(event.target.value)} required />
        <Field name="serialNumber" label="Serial number" value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} />
        <Field name="name" label="Asset name" required />
        <Field name="acquisitionCost" label={`Acquisition cost (${currency})`} type="number" min="0" step="0.01" required />
        <SelectField name="categoryId" label="Category" options={options.categories} required />
        <SelectField name="kulliyyahId" label="Kulliyyah" options={options.kulliyyahs} value={kulliyyahId} onChange={(event) => { const next = event.target.value; setKulliyyahId(next); setDepartmentId(options.departments.find((item) => item.parentId === next)?.value ?? ""); }} required />
        <SelectField name="departmentId" label="Department" options={departmentOptions} value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} required />
        <SelectField name="buildingId" label="Building" options={options.buildings} value={buildingId} onChange={(event) => { const next = event.target.value; setBuildingId(next); setRoomId(options.rooms.find((item) => item.parentId === next)?.value ?? ""); }} required />
        <SelectField name="roomId" label="Room" options={roomOptions} value={roomId} onChange={(event) => setRoomId(event.target.value)} required />
        <SelectField name="condition" label="Condition" options={["NEW", "EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED", "UNSERVICEABLE"].map(asOption)} required />
        <SelectField name="status" label="Initial status" options={["DRAFT", "PENDING_APPROVAL", "AVAILABLE"].map(asOption)} required />
        <SelectField name="borrowable" label="Borrowable" options={[{ value: "true", label: "Yes" }, { value: "false", label: "No" }]} required />
        <div className="md:col-span-2">
          <UserAutocomplete />
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">When assigned to a user, the system automatically saves the asset as <strong>ASSIGNED</strong> and <strong>not borrowable</strong>.</p>
        </div>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700 md:col-span-2">Description<textarea name="description" rows={4} placeholder="Description, notes, funding source, warranty, and other details" /></label>
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 md:col-span-2 sm:flex-row sm:justify-between">
          <button type="button" onClick={() => setStep("capture")} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /> Back to barcode</button>
          <button disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-lg bg-iium-green px-5 py-2.5 text-sm font-semibold text-white shadow-lift hover:bg-iium-deep disabled:opacity-60">{submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{submitting ? "Registering asset..." : "Register asset"}</button>
        </div>
      </form>
    </Card>
  );
}

export function BarcodeScanner({ onDetected }: { onDetected: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [scanning, setScanning] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [error, setError] = useState("");

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => stop, [stop]);

  async function start() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera scanning is not supported by this browser. Upload a photo or enter the code manually.");
      return;
    }
    try {
      setScanning(true);
      const reader = new BrowserMultiFormatReader();
      controlsRef.current = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        videoRef.current ?? undefined,
        (result) => {
          if (!result) return;
          onDetected(result.getText());
          stop();
        }
      );
    } catch (cause) {
      stop();
      setError(cameraError(cause));
    }
  }

  async function scanImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setProcessingImage(true);
    const url = URL.createObjectURL(file);
    try {
      const result = await new BrowserMultiFormatReader().decodeFromImageUrl(url);
      onDetected(result.getText());
    } catch {
      setError("No readable barcode was found in that photo. Try a sharper, closer image.");
    } finally {
      URL.revokeObjectURL(url);
      setProcessingImage(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
      <div className="relative aspect-[16/9] min-h-52">
        <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${scanning ? "block" : "hidden"}`} />
        {scanning && <div className="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-white/90 shadow-[0_0_0_999px_rgba(2,6,23,.38)]"><span className="absolute -left-0.5 -top-0.5 h-5 w-5 border-l-4 border-t-4 border-iium-gold" /><span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 border-b-4 border-r-4 border-iium-gold" /></div>}
        {!scanning && <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-900 to-slate-800 text-center"><div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-white"><Camera className="h-6 w-6" /></div><p className="mt-3 text-sm font-semibold text-white">Camera is ready when you are</p><p className="mt-1 text-xs text-slate-400">Supports standard linear, QR, and Data Matrix barcodes</p></div></div>}
      </div>
      <div className="flex flex-col gap-2 border-t border-white/10 bg-slate-900 p-3 sm:flex-row">
        {scanning
          ? <button type="button" onClick={stop} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-800"><X className="h-4 w-4" /> Stop camera</button>
          : <button type="button" onClick={start} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-iium-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-iium-deep"><Camera className="h-4 w-4" /> Scan with camera</button>}
        <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
          {processingImage ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}{processingImage ? "Reading photo..." : "Scan from photo"}
          <input type="file" accept="image/*" capture="environment" onChange={scanImage} className="sr-only" disabled={processingImage} />
        </label>
      </div>
      {error && <p className="border-t border-rose-400/20 bg-rose-950/50 px-4 py-3 text-sm text-rose-200" role="alert">{error}</p>}
    </div>
  );
}

function StepHeader({ current }: { current: 1 | 2 }) {
  return <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.12em]"><span className={current >= 1 ? "text-iium-deep" : "text-slate-400"}>1. Capture identifier</span><span className="h-px flex-1 bg-slate-200" /><span className={current >= 2 ? "text-iium-deep" : "text-slate-400"}>2. Asset details</span></div>;
}

function TargetChoice({ checked, onChange, title, body }: { checked: boolean; onChange: () => void; title: string; body: string }) {
  return <label className={`cursor-pointer rounded-xl border p-4 transition ${checked ? "border-iium-green bg-iium-mist ring-1 ring-iium-green/20" : "border-slate-200 hover:border-slate-300"}`}><span className="flex items-start gap-3"><input type="radio" checked={checked} onChange={onChange} className="mt-1" /><span><span className="block text-sm font-semibold text-slate-800">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{body}</span></span></span></label>;
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="grid gap-1.5 text-sm font-semibold text-slate-700">{label}<input {...props} /></label>;
}

function SelectField({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: Option[] }) {
  return <label className="grid gap-1.5 text-sm font-semibold text-slate-700">{label}<select {...props}>{!options.length && <option value="">Add a related record first</option>}{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function asOption(value: string): Option {
  return { value, label: value.replaceAll("_", " ") };
}

function cameraError(cause: unknown) {
  if (cause instanceof DOMException && cause.name === "NotAllowedError") return "Camera permission was denied. Allow camera access, upload a photo, or enter the code manually.";
  if (cause instanceof DOMException && cause.name === "NotFoundError") return "No camera was found on this device. Upload a photo or enter the code manually.";
  return "The camera could not be started. Upload a photo or enter the code manually.";
}

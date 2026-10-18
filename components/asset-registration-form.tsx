"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, ImageUp, Keyboard, LoaderCircle, ScanLine, X } from "lucide-react";
import { AssetAuditForm } from "@/components/asset-audit-form";
import { Card } from "@/components/ui";

type Option = { value: string; label: string; parentId?: string };
type RegistrationOptions = {
  categories: Option[];
  kulliyyahs: Option[];
  departments: Option[];
  buildings: Option[];
  rooms: Option[];
  suppliers?: Option[];
  fundingSources?: Option[];
};

export function AssetRegistrationForm({ options, assetTagPrefix, initialBarcode = "" }: { options: RegistrationOptions; currency: string; assetTagPrefix: string; initialBarcode?: string }) {
  const [step, setStep] = useState<"capture" | "details">("capture");
  const [barcode, setBarcode] = useState(initialBarcode.startsWith(`${assetTagPrefix}-`) ? "" : initialBarcode);
  const [serialNumber, setSerialNumber] = useState("");
  function captureBarcode(value: string) {
    setBarcode(value.trim());
  }

  function continueWithBarcode() {
    const value = barcode.trim();
    if (!value) return;
    setSerialNumber(value);
    setStep("details");
  }

  if (step === "capture") {
    return (
      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-5 py-4">
            <StepHeader current={1} />
            <h2 className="mt-4 text-lg font-bold text-slate-900">Capture the manufacturer serial barcode</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Scan the serial barcode on the device or packaging. The institution asset tag is generated when saved.</p>
          </div>
          <div className="space-y-5 p-5">
            <BarcodeScanner onDetected={captureBarcode} />

            <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-slate-700">
              Captured barcode value
              <div className="relative min-w-0">
                <ScanLine className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input value={barcode} onChange={(event) => setBarcode(event.target.value)} className="min-w-0 max-w-full w-full pl-10" placeholder="Scan or type the barcode value" autoComplete="off" />
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
    <Card className="min-w-0 p-0">
      <div className="border-b border-slate-100 px-5 py-4">
        <StepHeader current={2} />
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-lg font-bold text-slate-900">Complete asset details</h2><p className="mt-1 text-sm text-slate-500">Review the identifier and complete the information required to register the asset.</p></div>
          {barcode && <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Barcode captured</span>}
        </div>
      </div>
      <div className="min-w-0 p-3 sm:p-5"><AssetAuditForm options={options} serialNumber={serialNumber} /></div>
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

function cameraError(cause: unknown) {
  if (cause instanceof DOMException && cause.name === "NotAllowedError") return "Camera permission was denied. Allow camera access, upload a photo, or enter the code manually.";
  if (cause instanceof DOMException && cause.name === "NotFoundError") return "No camera was found on this device. Upload a photo or enter the code manually.";
  return "The camera could not be started. Upload a photo or enter the code manually.";
}

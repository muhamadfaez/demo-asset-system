export function AppIcon({ version, className = "h-10 w-10" }: { version: string; className?: string }) {
  return <img src={`/app-icon/192?v=${encodeURIComponent(version)}`} alt="" width={192} height={192} className={`shrink-0 rounded-lg object-contain ${className}`} />;
}

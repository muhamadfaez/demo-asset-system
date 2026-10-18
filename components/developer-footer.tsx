export function DeveloperFooter({ className = "" }: { className?: string }) {
  return <footer className={`px-4 py-5 text-center text-xs text-slate-500 ${className}`}>
    Developed by{" "}
    <a href="https://www.iium.edu.my/staff-profile/MTE0MTU/" target="_blank" rel="noopener noreferrer" className="font-medium text-iium-deep underline-offset-4 hover:underline" aria-label="Muhamad Faez — IIUM staff profile (opens in a new tab)">Muhamad Faez</a>
  </footer>;
}

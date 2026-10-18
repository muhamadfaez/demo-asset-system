import { useState } from "react";
import { LogOut } from "lucide-react";
import { cn } from "@/components/ui";
export function LogoutButton({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/edge/logout", { method: "POST" });
      if (!response.ok && response.status !== 401) throw new Error();
      window.location.assign("/login");
    } catch {
      setError("Unable to log out. Try again.");
      setPending(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        onClick={logout}
        disabled={pending}
        aria-label={compact ? "Log out" : undefined}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600",
          className,
        )}
      >
        <LogOut className="h-4 w-4" />
        <span className={compact ? "sr-only" : ""}>
          {pending ? "Logging out…" : "Log out"}
        </span>
      </button>
      {error && (
        <p role="alert" className="text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { cn } from "@/components/ui";

export function LogoutButton({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700",
          compact && "px-2.5",
          className
        )}
        aria-label={compact ? "Log out" : undefined}
      >
        <LogOut className="h-4 w-4" />
        <span className={cn(compact && "sr-only")}>Log out</span>
      </button>
    </form>
  );
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-slate-200/80 bg-white p-5 shadow-glass", className)} {...props} />;
}

export function Badge({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "gold" | "slate" | "red" }) {
  const tones = {
    green: "border border-iium-green/15 bg-iium-green/10 text-iium-deep",
    gold: "border border-iium-gold/20 bg-iium-gold/15 text-amber-800",
    slate: "bg-slate-100 text-slate-700",
    red: "bg-rose-50 text-rose-700"
  };
  return <span className={cn("inline-flex rounded-md px-2.5 py-1 text-xs font-semibold", tones[tone])}>{children}</span>;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-glass">
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
    </div>
  );
}

import { getDateFormatter } from "../lib/date-formatter";
import { cn } from "../components/ui";
import { format } from "date-fns";
// ICU's first construction can exceed a Free request budget. Initialize these
// immutable formatters during Worker startup, before a request is dispatched.
const day: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
for (const includeTime of [false, true]) {
  const options = { ...day, ...(includeTime ? { hour: "2-digit" as const, minute: "2-digit" as const } : {}) };
  getDateFormatter("en-GB", options).format(0);
  for (const timeZone of ["Asia/Kuala_Lumpur", "Asia/Singapore", "UTC"]) getDateFormatter("en-GB", { ...options, timeZone }).format(0);
}
for (const timeZone of ["Asia/Kuala_Lumpur", "Asia/Singapore", "UTC"]) getDateFormatter("en-GB", { ...day, hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(0);
new Intl.NumberFormat("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(0);
cn("min-w-0 max-w-full rounded-xl border border-slate-200/80 bg-white p-5 shadow-glass");
format(new Date(0), "dd MMM yyyy");

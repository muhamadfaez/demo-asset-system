import { afterEach, expect, it, vi } from "vitest";
import { getDateFormatter } from "@/lib/date-formatter";

afterEach(() => vi.restoreAllMocks());
it("reuses date formatters across rows while respecting timezone differences", () => {
  const constructor = vi.spyOn(Intl, "DateTimeFormat");
  const value = new Date("2026-10-18T20:00:00Z");
  const options = { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" } as const;
  const first = getDateFormatter("en-GB", options);
  expect(getDateFormatter("en-GB", { ...options })).toBe(first);
  expect(constructor).toHaveBeenCalledTimes(1);
  expect(first.format(value)).toBe("18 Oct 2026");
  expect(getDateFormatter("en-GB", { ...options, timeZone: "Asia/Kuala_Lumpur" }).format(value)).toBe("19 Oct 2026");
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { validateAppIcon } from "@/lib/app-icons";

describe("uploaded app icon validation", () => {
  const png = readFileSync(new URL("../public/icons/icon-192.png", import.meta.url));
  it("accepts a PNG in the expected size", () => {
    expect(validateAppIcon(`data:image/png;base64,${png.toString("base64")}`, 192)).toBe(true);
  });
  it("rejects mismatched dimensions, SVG, and oversized payloads", () => {
    expect(validateAppIcon(`data:image/png;base64,${png.toString("base64")}`, 512)).toBe(false);
    expect(validateAppIcon("data:image/svg+xml;base64,PHN2Zy8+", 192)).toBe(false);
    expect(validateAppIcon(`data:image/png;base64,${Buffer.alloc(300000).toString("base64")}`, 192)).toBe(false);
  });
});

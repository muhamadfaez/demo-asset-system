export const iconSizes = [192, 512, 180] as const;
export const MAX_ICON_BYTES = 256 * 1024;

export function validateAppIcon(data: string, size: number): boolean {
  if (!data.startsWith("data:image/png;base64,") || data.length > MAX_ICON_BYTES * 1.4) return false;
  const encoded = data.slice(22);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return false;
  const bytes = Buffer.from(encoded, "base64");
  return bytes.length >= 33 && bytes.length <= MAX_ICON_BYTES &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    bytes.toString("ascii", 12, 16) === "IHDR" &&
    bytes.readUInt32BE(16) === size && bytes.readUInt32BE(20) === size;
}

export function appIconUrl(size: number, version: string) {
  return `/app-icon/${size}?v=${encodeURIComponent(version)}`;
}

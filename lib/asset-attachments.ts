export const attachmentTypes = [
  "INVOICE",
  "PURCHASE_ORDER",
  "DELIVERY_ORDER",
  "WARRANTY_CARD",
  "PHOTO",
  "OTHER",
] as const;
export const MAX_ATTACHMENT_BYTES = 1024 * 1024;
export function validateAttachment(
  file: { size: number; type: string },
  label: string,
) {
  if (!attachmentTypes.includes(label as (typeof attachmentTypes)[number]))
    return "Select a valid attachment type";
  if (!file.size || file.size > MAX_ATTACHMENT_BYTES)
    return "Files must be between 1 byte and 1 MB";
  if (
    !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(
      file.type,
    )
  )
    return "Upload a PDF, JPEG, PNG or WebP file";
  return null;
}

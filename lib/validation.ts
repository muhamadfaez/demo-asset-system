import { z } from "zod";

export const assetSchema = z.object({
  tagNumber: z.string().min(2, "Asset tag is required"),
  name: z.string().min(2, "Asset name is required"),
  serialNumber: z.string().optional(),
  description: z.string().trim().max(2000, "Description is too long").optional(),
  acquisitionCost: z.coerce.number().min(0, "Acquisition cost cannot be negative"),
  categoryId: z.string().min(1),
  departmentId: z.string().min(1),
  kulliyyahId: z.string().min(1),
  buildingId: z.string().min(1),
  roomId: z.string().min(1),
  condition: z.string().min(1),
  status: z.string().min(1),
  assignedUserId: z.string().trim().optional(),
  borrowable: z.enum(["true", "false"]).transform((value) => value === "true")
});

export const borrowingSchema = z
  .object({
    assetId: z.string().min(1),
    purpose: z.string().min(8, "Purpose must be specific"),
    startDate: z.coerce.date(),
    expectedReturnAt: z.coerce.date()
  })
  .refine((data) => data.expectedReturnAt >= data.startDate, {
    message: "Return date cannot be earlier than borrowing date",
    path: ["expectedReturnAt"]
  });

export const borrowingDecisionSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["approve", "reject", "checkout", "return"]),
  reason: z.string().trim().max(500).optional()
});

export const transferSchema = z.object({
  assetId: z.string().min(1),
  transferType: z.enum(["LOCATION", "CUSTODIAN", "BOTH"]),
  newRoomId: z.string().optional(),
  newCustodianId: z.string().optional(),
  reason: z.string().trim().min(8, "Provide a specific reason").max(1000)
}).superRefine((data, context) => {
  if ((data.transferType === "LOCATION" || data.transferType === "BOTH") && !data.newRoomId) context.addIssue({ code: z.ZodIssueCode.custom, path: ["newRoomId"], message: "Select a destination room" });
  if ((data.transferType === "CUSTODIAN" || data.transferType === "BOTH") && !data.newCustodianId) context.addIssue({ code: z.ZodIssueCode.custom, path: ["newCustodianId"], message: "Select a new custodian" });
});

export const transferDecisionSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["approve", "reject", "cancel"]),
  reason: z.string().trim().max(500).optional()
});

export const maintenanceSchema = z.object({
  assetId: z.string().min(1),
  issueCategory: z.string().min(2),
  description: z.string().min(10),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  type: z.enum(["Corrective", "Preventive", "Inspection", "Calibration", "Upgrade", "Warranty Claim"]),
  estimatedCost: z.coerce.number().min(0).default(0)
});

export const maintenanceActionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "reject", "start", "await_parts", "complete", "close", "cancel"]),
  reason: z.string().trim().max(500).optional(),
  vendor: z.string().trim().max(200).optional(),
  scheduledAt: z.coerce.date().optional(),
  resolution: z.string().trim().max(2000).optional(),
  partsReplaced: z.string().trim().max(1000).optional(),
  actualCost: z.coerce.number().min(0).optional(),
  downtimeHours: z.coerce.number().min(0).optional()
});

const prefixSchema = z.string().trim().toUpperCase().min(2, "Use at least 2 characters").max(10, "Use at most 10 characters").regex(/^[A-Z0-9-]+$/, "Use letters, numbers, or hyphens only");

export const systemSettingsSchema = z.object({
  systemName: z.string().trim().min(3, "System name is required").max(100),
  organisationName: z.string().trim().min(2, "Organisation name is required").max(40),
  permittedEmailDomain: z.string().trim().toLowerCase().regex(/^@[a-z0-9.-]+\.[a-z]{2,}$/, "Enter a domain such as @iium.edu.my"),
  currency: z.string().trim().toUpperCase().min(2).max(4).regex(/^[A-Z]+$/, "Use a currency code such as RM or MYR"),
  timeZone: z.enum(["Asia/Kuala_Lumpur", "Asia/Singapore", "UTC"]),
  assetTagPrefix: prefixSchema,
  borrowingPrefix: prefixSchema,
  maxBorrowingDays: z.coerce.number().int().min(1, "Minimum is 1 day").max(365, "Maximum is 365 days"),
  pwaEnabled: z.enum(["true", "false"]),
  pwaDescription: z.string().trim().min(2).max(200),
  pwaThemeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex colour"),
  pwaBackgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex colour"),
  pwaDisplay: z.enum(["standalone", "minimal-ui", "fullscreen"]),
  pwaOrientation: z.enum(["any", "portrait", "landscape"])
});

export const userAccountActionSchema = z.object({
  userId: z.string().min(1),
  intent: z.enum(["approve", "reject", "update", "suspend", "activate", "deactivate"]),
  role: z.enum(["SUPERADMIN", "ASSET_LIAISON", "USER"]),
  departmentId: z.string().optional(),
  reason: z.string().trim().max(500).optional()
});

export const incidentSchema = z.object({
  assetId: z.string().min(1),
  type: z.enum(["Missing", "Lost", "Stolen", "Misplaced", "Damaged"]),
  discoveredAt: z.coerce.date(),
  location: z.string().trim().min(2).max(200),
  description: z.string().trim().min(10).max(2000),
  policeReportNumber: z.string().trim().max(100).optional()
});

const optionalPersonalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);

export const selfProfileSchema = z.object({
  position: optionalPersonalText(120),
  phone: optionalPersonalText(40),
  staffNo: optionalPersonalText(40)
});

export const adminPersonalInfoSchema = selfProfileSchema.extend({
  userId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().toLowerCase().max(254)
});

import { prisma } from "@/lib/prisma";

export async function audit(input: {
  userId?: string;
  action: string;
  module: string;
  recordType: string;
  recordId?: string;
  previousValues?: unknown;
  newValues?: unknown;
  success?: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      module: input.module,
      recordType: input.recordType,
      recordId: input.recordId,
      previousValues: input.previousValues ? JSON.stringify(input.previousValues) : undefined,
      newValues: input.newValues ? JSON.stringify(input.newValues) : undefined,
      success: input.success ?? true,
      ipAddress: input.ipAddress ?? undefined,
      userAgent: input.userAgent ?? undefined
    }
  });
}

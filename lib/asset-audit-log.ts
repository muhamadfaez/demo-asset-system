import { prisma } from "@/lib/prisma";

/** Historical ISO dates and trigger-generated milliseconds must share chronological order. */
export async function getLatestAuditLogs() {
  const ids = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM AuditLog
    ORDER BY CASE WHEN typeof(createdAt) IN ('integer', 'real') THEN createdAt
      ELSE (julianday(createdAt) - 2440587.5) * 86400000 END DESC, rowid DESC
    LIMIT 80
  `;
  if (!ids.length) return [];
  const rows = await prisma.auditLog.findMany({
    where: { id: { in: ids.map((row) => row.id) } },
    include: { user: true },
  });
  const position = new Map(ids.map((row, index) => [row.id, index]));
  return rows.sort((a, b) => position.get(a.id)! - position.get(b.id)!);
}

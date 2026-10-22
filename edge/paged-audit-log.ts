import { prisma } from "./d1-repository";
import { context } from "./app-context";
export async function getLatestAuditLogs() {
  const page = context().pageNumber ?? 1;
  const ids = await prisma.$queryRaw`SELECT id FROM AuditLog
    ORDER BY CASE WHEN typeof(createdAt) IN ('integer','real') THEN createdAt ELSE (julianday(createdAt)-2440587.5)*86400000 END DESC, rowid DESC
    LIMIT 26 OFFSET ${(page - 1) * 25}`;
  context().pagination = { page, size: 25, hasNext: ids.length > 25 };
  const chosen = ids.slice(0, 25);
  if (!chosen.length) return [];
  const rows = await prisma.auditLog.findMany({
    where: { id: { in: chosen.map((r: any) => r.id) } },
    include: { user: true },
  });
  const positions = new Map(chosen.map((row: any, i: number) => [row.id, i]));
  return rows.sort(
    (a: any, b: any) =>
      Number(positions.get(a.id)) - Number(positions.get(b.id)),
  );
}

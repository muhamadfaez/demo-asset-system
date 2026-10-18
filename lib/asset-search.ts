import type { Prisma } from "@prisma/client";
export function assetSearch(
  q: string,
  matchingDateIds: string[] = [],
): Prisma.AssetWhereInput {
  if (!q) return {};
  const date = /^\d{4}-\d{2}-\d{2}$/.test(q) ? new Date(q) : null;
  return {
    OR: [
      { tagNumber: { contains: q } },
      { name: { contains: q } },
      { serialNumber: { contains: q } },
      { purchaseOrderNumber: { contains: q } },
      { supplier: { name: { contains: q } } },
      ...(matchingDateIds.length ? [{ id: { in: matchingDateIds } }] : []),
      ...(date && !Number.isNaN(date.getTime())
        ? [
            {
              acquisitionDate: {
                gte: date,
                lt: new Date(date.getTime() + 86400000),
              },
            },
          ]
        : []),
    ],
  };
}

import { prisma } from "@/lib/prisma";
import { assetSearch } from "@/lib/asset-search";

/** Match both legacy ISO text and newer millisecond timestamps without rewriting records. */
export async function assetSearchFilter(q: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(q) || Number.isNaN(Date.parse(q)))
    return assetSearch(q);
  const start = new Date(q).getTime();
  const matches = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM Asset
    WHERE (typeof(acquisitionDate) = 'text' AND substr(acquisitionDate, 1, 10) = ${q})
       OR (typeof(acquisitionDate) IN ('integer', 'real') AND acquisitionDate >= ${start} AND acquisitionDate < ${start + 86400000})
  `;
  return assetSearch(
    q,
    matches.map((row) => row.id),
  );
}

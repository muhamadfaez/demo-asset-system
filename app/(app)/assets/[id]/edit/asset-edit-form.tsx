"use client";
import {
  AssetAuditForm,
  type AuditAsset,
  type AssetOption,
} from "@/components/asset-audit-form";
export function AssetEditForm({
  asset,
  options,
}: {
  asset: AuditAsset;
  currency: string;
  options: {
    categories: AssetOption[];
    departments: AssetOption[];
    rooms: AssetOption[];
    kulliyyahs: AssetOption[];
    buildings: AssetOption[];
    suppliers?: AssetOption[];
    fundingSources?: AssetOption[];
    conditions: AssetOption[];
    statuses: AssetOption[];
  };
}) {
  return <AssetAuditForm asset={asset} options={options} />;
}

-- Removes only this release's performance indexes.
DROP INDEX IF EXISTS "Asset_assignedUserId_archivedAt_name_idx";
DROP INDEX IF EXISTS "Asset_departmentId_archivedAt_name_idx";
DROP INDEX IF EXISTS "Asset_archivedAt_name_idx";
DROP INDEX IF EXISTS "AssetTransfer_assetId_status_idx";
DROP INDEX IF EXISTS "AssetTransfer_requestedById_idx";
DROP INDEX IF EXISTS "AssetTransfer_currentCustodian_idx";
DROP INDEX IF EXISTS "AssetTransfer_newCustodian_idx";
DROP INDEX IF EXISTS "Notification_userId_readAt_idx";

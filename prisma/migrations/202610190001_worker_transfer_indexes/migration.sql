-- Reversible read optimization only. No records or columns are changed.
CREATE INDEX IF NOT EXISTS "Asset_assignedUserId_archivedAt_name_idx" ON "Asset" ("assignedUserId","archivedAt","name");
CREATE INDEX IF NOT EXISTS "Asset_departmentId_archivedAt_name_idx" ON "Asset" ("departmentId","archivedAt","name");
CREATE INDEX IF NOT EXISTS "Asset_archivedAt_name_idx" ON "Asset" ("archivedAt","name");
CREATE INDEX IF NOT EXISTS "AssetTransfer_assetId_status_idx" ON "AssetTransfer" ("assetId","status");
CREATE INDEX IF NOT EXISTS "AssetTransfer_requestedById_idx" ON "AssetTransfer" ("requestedById");
CREATE INDEX IF NOT EXISTS "AssetTransfer_currentCustodian_idx" ON "AssetTransfer" ("currentCustodian");
CREATE INDEX IF NOT EXISTS "AssetTransfer_newCustodian_idx" ON "AssetTransfer" ("newCustodian");
CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx" ON "Notification" ("userId","readAt");

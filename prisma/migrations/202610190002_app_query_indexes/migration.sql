-- Indexes only. Existing application records are preserved.
CREATE INDEX IF NOT EXISTS "AssetAssignment_assignedUserId_assetId_idx" ON "AssetAssignment" ("assignedUserId","assetId");
CREATE INDEX IF NOT EXISTS "AssetAssignment_assetId_assignmentDate_idx" ON "AssetAssignment" ("assetId","assignmentDate");
CREATE INDEX IF NOT EXISTS "BorrowingRequest_requesterId_createdAt_idx" ON "BorrowingRequest" ("requesterId","createdAt");
CREATE INDEX IF NOT EXISTS "MaintenanceRequest_assetId_status_idx" ON "MaintenanceRequest" ("assetId","status");
CREATE INDEX IF NOT EXISTS "MaintenanceRequest_reportedById_createdAt_idx" ON "MaintenanceRequest" ("reportedById","createdAt");
CREATE INDEX IF NOT EXISTS "AssetIncident_reportedById_createdAt_idx" ON "AssetIncident" ("reportedById","createdAt");
CREATE INDEX IF NOT EXISTS "AssetVerification_assetId_checkedAt_idx" ON "AssetVerification" ("assetId","checkedAt");
CREATE INDEX IF NOT EXISTS "AssetDocument_assetId_createdAt_idx" ON "AssetDocument" ("assetId","createdAt");
CREATE INDEX IF NOT EXISTS "BorrowingRequest_assetId_requesterId_status_idx" ON "BorrowingRequest" ("assetId","requesterId","status");
CREATE INDEX IF NOT EXISTS "BorrowingRequest_assetId_status_startDate_expectedReturnAt_idx" ON "BorrowingRequest" ("assetId","status","startDate","expectedReturnAt");

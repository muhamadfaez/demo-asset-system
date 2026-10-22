-- Removes only these read-performance indexes.
DROP INDEX IF EXISTS "AssetAssignment_assignedUserId_assetId_idx";
DROP INDEX IF EXISTS "AssetAssignment_assetId_assignmentDate_idx";
DROP INDEX IF EXISTS "BorrowingRequest_requesterId_createdAt_idx";
DROP INDEX IF EXISTS "MaintenanceRequest_assetId_status_idx";
DROP INDEX IF EXISTS "MaintenanceRequest_reportedById_createdAt_idx";
DROP INDEX IF EXISTS "AssetIncident_reportedById_createdAt_idx";
DROP INDEX IF EXISTS "AssetVerification_assetId_checkedAt_idx";
DROP INDEX IF EXISTS "AssetDocument_assetId_createdAt_idx";
DROP INDEX IF EXISTS "BorrowingRequest_assetId_requesterId_status_idx";
DROP INDEX IF EXISTS "BorrowingRequest_assetId_status_startDate_expectedReturnAt_idx";

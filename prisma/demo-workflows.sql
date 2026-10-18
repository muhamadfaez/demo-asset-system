-- Run after demo-data.sql; adds sample workflow records without changing existing records.

INSERT OR IGNORE INTO "AssetAssignment" ("id", "assetId", "assignedUserId", "purpose", "assignedById", "acceptanceStatus")
SELECT 'demo-assignment', 'demo-asset-004',
  (SELECT "id" FROM "User" WHERE "role" = 'USER' AND "status" = 'ACTIVE' ORDER BY "createdAt" LIMIT 1),
  'Demo staff assignment',
  (SELECT "id" FROM "User" WHERE "role" = 'SUPERADMIN' AND "status" = 'ACTIVE' ORDER BY "createdAt" LIMIT 1),
  'Accepted';
INSERT OR IGNORE INTO "BorrowingRequest" ("id", "requestNumber", "requesterId", "assetId", "purpose", "startDate", "expectedReturnAt", "status", "updatedAt") VALUES
  ('demo-borrow-1', 'DEMO-BR-001', (SELECT "id" FROM "User" WHERE "role" = 'USER' AND "status" = 'ACTIVE' ORDER BY "createdAt" LIMIT 1), 'demo-asset-001', 'Demo pending borrowing request', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+7 days'), 'PENDING_APPROVAL', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('demo-borrow-2', 'DEMO-BR-002', (SELECT "id" FROM "User" WHERE "role" = 'USER' AND "status" = 'ACTIVE' ORDER BY "createdAt" LIMIT 1), 'demo-asset-005', 'Demo checked-out borrowing request', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+5 days'), 'CHECKED_OUT', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT OR IGNORE INTO "AssetTransfer" ("id", "transferNumber", "assetId", "currentLocation", "newLocation", "reason", "requestedById", "status")
VALUES ('demo-transfer', 'DEMO-TR-001', 'demo-asset-002', 'Demo Lab 101', 'Demo Office 102', 'Demo transfer approval', (SELECT "id" FROM "User" WHERE "role" = 'SUPERADMIN' AND "status" = 'ACTIVE' ORDER BY "createdAt" LIMIT 1), 'PENDING_APPROVAL');
INSERT OR IGNORE INTO "MaintenanceRequest" ("id", "requestNumber", "assetId", "reportedById", "issueCategory", "description", "priority", "type", "estimatedCost", "status")
VALUES ('demo-maintenance', 'DEMO-MT-001', 'demo-asset-006', (SELECT "id" FROM "User" WHERE "role" = 'USER' AND "status" = 'ACTIVE' ORDER BY "createdAt" LIMIT 1), 'Network hardware', 'Demo switch has intermittent connectivity.', 'High', 'Corrective', 350, 'IN_PROGRESS');
INSERT OR IGNORE INTO "VerificationCampaign" ("id", "name", "kulliyyahId", "departmentId", "assignedToId", "startDate", "endDate", "status")
VALUES ('demo-campaign', 'Demo October Verification', 'demo-kict', 'demo-cs', (SELECT "id" FROM "User" WHERE "role" = 'SUPERADMIN' AND "status" = 'ACTIVE' ORDER BY "createdAt" LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+30 days'), 'In Progress');
INSERT OR IGNORE INTO "AssetVerification" ("id", "campaignId", "assetId", "verifierId", "status", "remarks")
VALUES ('demo-verification', 'demo-campaign', 'demo-asset-003', (SELECT "id" FROM "User" WHERE "role" = 'SUPERADMIN' AND "status" = 'ACTIVE' ORDER BY "createdAt" LIMIT 1), 'Verified', 'Demo projector found in Demo Office 102.');
INSERT OR IGNORE INTO "AssetIncident" ("id", "incidentNumber", "assetId", "type", "discoveredAt", "location", "reportedById", "description", "status")
VALUES ('demo-incident', 'DEMO-IN-001', 'demo-asset-008', 'Missing', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'Demo Office 102', (SELECT "id" FROM "User" WHERE "role" = 'USER' AND "status" = 'ACTIVE' ORDER BY "createdAt" LIMIT 1), 'Demo missing chair investigation.', 'Under Investigation');
INSERT OR IGNORE INTO "DisposalRequest" ("id", "requestNumber", "assetId", "reason", "currentCondition", "method", "requestedById", "status")
VALUES ('demo-disposal', 'DEMO-DP-001', 'demo-asset-007', 'Beyond economical repair (demo)', 'Poor', 'Write-Off', (SELECT "id" FROM "User" WHERE "role" = 'SUPERADMIN' AND "status" = 'ACTIVE' ORDER BY "createdAt" LIMIT 1), 'UNDER_REVIEW');
INSERT OR IGNORE INTO "Notification" ("id", "userId", "title", "message", "href")
VALUES ('demo-notice', (SELECT "id" FROM "User" WHERE "role" = 'SUPERADMIN' AND "status" = 'ACTIVE' ORDER BY "createdAt" LIMIT 1), 'Demo data ready', 'Ten demo assets and sample workflow records are ready to explore.', '/assets');

-- Non-destructive demo data for an existing D1 database.
-- Safe to rerun: every row has a stable demo ID or unique demo number.
-- Requires at least one active SUPERADMIN and one active USER account.

INSERT OR IGNORE INTO "Kulliyyah" ("id", "name", "code", "updatedAt")
VALUES ('demo-kict', 'Demo Kulliyyah of ICT', 'DEMO-KICT', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT OR IGNORE INTO "Department" ("id", "name", "code", "kulliyyahId", "updatedAt") VALUES
  ('demo-cs', 'Demo Computer Science', 'DEMO-CS', 'demo-kict', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('demo-is', 'Demo Information Systems', 'DEMO-IS', 'demo-kict', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT OR IGNORE INTO "Unit" ("id", "name", "code", "departmentId", "updatedAt") VALUES
  ('demo-lab-unit', 'Demo Teaching Labs', 'DEMO-LAB', 'demo-cs', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('demo-office-unit', 'Demo Office', 'DEMO-OFF', 'demo-is', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT OR IGNORE INTO "Campus" ("id", "name") VALUES ('demo-campus', 'Demo Gombak Campus');
INSERT OR IGNORE INTO "Building" ("id", "name", "code", "campusId") VALUES ('demo-building', 'Demo ICT Building', 'DEMO-ICT', 'demo-campus');
INSERT OR IGNORE INTO "Floor" ("id", "name", "buildingId") VALUES ('demo-floor', 'Demo Level 1', 'demo-building');
INSERT OR IGNORE INTO "Room" ("id", "name", "code", "floorId") VALUES
  ('demo-lab', 'Demo Lab 101', 'DEMO-101', 'demo-floor'),
  ('demo-office', 'Demo Office 102', 'DEMO-102', 'demo-floor'),
  ('demo-store', 'Demo Store 103', 'DEMO-103', 'demo-floor');

INSERT OR IGNORE INTO "AssetCategory" ("id", "name") VALUES
  ('demo-cat-computer', 'Demo Computers'),
  ('demo-cat-display', 'Demo Displays'),
  ('demo-cat-network', 'Demo Networking'),
  ('demo-cat-print', 'Demo Printing'),
  ('demo-cat-furniture', 'Demo Furniture');
INSERT OR IGNORE INTO "AssetSubcategory" ("id", "name", "categoryId") VALUES
  ('demo-sub-computer', 'Demo Laptops and desktops', 'demo-cat-computer'),
  ('demo-sub-display', 'Demo Monitors and projectors', 'demo-cat-display'),
  ('demo-sub-network', 'Demo Routers and switches', 'demo-cat-network'),
  ('demo-sub-print', 'Demo Printers', 'demo-cat-print'),
  ('demo-sub-furniture', 'Demo Desks and chairs', 'demo-cat-furniture');
INSERT OR IGNORE INTO "Brand" ("id", "name") VALUES ('demo-brand', 'Demo Equipment Brand');
INSERT OR IGNORE INTO "Supplier" ("id", "name", "email") VALUES ('demo-supplier', 'Demo Equipment Supplier', 'demo@example.invalid');
INSERT OR IGNORE INTO "FundingSource" ("id", "name") VALUES ('demo-funding', 'Demo Operating Grant');

-- Three available assets allow new borrowing and transfer requests.
-- One assigned asset appears in the existing active USER account's asset list.
INSERT OR IGNORE INTO "Asset" (
  "id", "tagNumber", "name", "description", "model", "serialNumber", "acquisitionDate",
  "acquisitionCost", "currentBookValue", "status", "condition", "borrowable",
  "categoryId", "subcategoryId", "brandId", "supplierId", "fundingSourceId",
  "kulliyyahId", "departmentId", "unitId", "buildingId", "roomId",
  "assignedUserId", "createdById", "updatedById", "updatedAt"
)
WITH demo_assets(n, name, model, cost, status, condition, borrowable, categoryId, subcategoryId, departmentId, unitId, roomId) AS (VALUES
  (1, 'Demo Dell Latitude Laptop', 'Latitude 5440', 4200, 'AVAILABLE', 'GOOD', 1, 'demo-cat-computer', 'demo-sub-computer', 'demo-cs', 'demo-lab-unit', 'demo-lab'),
  (2, 'Demo HP Desktop', 'ProDesk 400', 3600, 'AVAILABLE', 'GOOD', 1, 'demo-cat-computer', 'demo-sub-computer', 'demo-cs', 'demo-lab-unit', 'demo-lab'),
  (3, 'Demo Epson Projector', 'EB-FH52', 3100, 'AVAILABLE', 'EXCELLENT', 1, 'demo-cat-display', 'demo-sub-display', 'demo-is', 'demo-office-unit', 'demo-office'),
  (4, 'Demo Lenovo Staff Laptop', 'ThinkPad T14', 5300, 'ASSIGNED', 'GOOD', 0, 'demo-cat-computer', 'demo-sub-computer', 'demo-is', 'demo-office-unit', 'demo-office'),
  (5, 'Demo Portable Monitor', 'P1424H', 1100, 'BORROWED', 'GOOD', 1, 'demo-cat-display', 'demo-sub-display', 'demo-cs', 'demo-lab-unit', 'demo-lab'),
  (6, 'Demo Network Switch', 'CBS250', 2400, 'UNDER_MAINTENANCE', 'FAIR', 0, 'demo-cat-network', 'demo-sub-network', 'demo-cs', 'demo-lab-unit', 'demo-store'),
  (7, 'Demo Laser Printer', 'LaserJet Pro', 1800, 'DAMAGED', 'POOR', 0, 'demo-cat-print', 'demo-sub-print', 'demo-is', 'demo-office-unit', 'demo-office'),
  (8, 'Demo Office Chair', 'Ergo 2', 650, 'MISSING', 'GOOD', 0, 'demo-cat-furniture', 'demo-sub-furniture', 'demo-is', 'demo-office-unit', 'demo-office'),
  (9, 'Demo Wireless Router', 'ISR 1100', 1900, 'PENDING_APPROVAL', 'NEW', 0, 'demo-cat-network', 'demo-sub-network', 'demo-cs', 'demo-lab-unit', 'demo-store'),
  (10, 'Demo Standing Desk', 'FlexDesk', 1400, 'DRAFT', 'NEW', 0, 'demo-cat-furniture', 'demo-sub-furniture', 'demo-is', 'demo-office-unit', 'demo-store')
)
SELECT 'demo-asset-' || printf('%03d', n), 'DEMO-' || printf('%03d', n), name,
  'Demo record for testing; safe to remove after evaluation.', model, 'DEMO-SN-' || printf('%03d', n),
  '2025-01-15T00:00:00.000Z', cost, round(cost * 0.8, 2), status, condition, borrowable,
  categoryId, subcategoryId, 'demo-brand', 'demo-supplier', 'demo-funding',
  'demo-kict', departmentId, unitId, 'demo-building', roomId,
  CASE WHEN n = 4 THEN (SELECT "id" FROM "User" WHERE "role" = 'USER' AND "status" = 'ACTIVE' ORDER BY "createdAt" LIMIT 1) END,
  (SELECT "id" FROM "User" WHERE "role" = 'SUPERADMIN' AND "status" = 'ACTIVE' ORDER BY "createdAt" LIMIT 1),
  (SELECT "id" FROM "User" WHERE "role" = 'SUPERADMIN' AND "status" = 'ACTIVE' ORDER BY "createdAt" LIMIT 1),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM demo_assets;

ALTER TABLE "Asset" ADD COLUMN "assetType" TEXT NOT NULL DEFAULT 'INVENTORY';
ALTER TABLE "Asset" ADD COLUMN "brandName" TEXT;
ALTER TABLE "Asset" ADD COLUMN "deliveryOrderNumber" TEXT;
ALTER TABLE "Asset" ADD COLUMN "receivedDate" DATETIME;
ALTER TABLE "Asset" ADD COLUMN "grantProjectCode" TEXT;
ALTER TABLE "Asset" ADD COLUMN "legacyRecordReason" TEXT;
ALTER TABLE "Asset" ADD COLUMN "serviceContract" TEXT;
ALTER TABLE "Asset" ADD COLUMN "supportVendor" TEXT;
ALTER TABLE "Asset" ADD COLUMN "custodianId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD COLUMN "verifiedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD COLUMN "verificationResult" TEXT;
ALTER TABLE "AssetDocument" ADD COLUMN "typeLabel" TEXT NOT NULL DEFAULT 'OTHER';
ALTER TABLE "AssetDocument" ADD COLUMN "contentBase64" TEXT;
ALTER TABLE "AssetDocument" ADD COLUMN "uploadedById" TEXT;
CREATE INDEX "Asset_purchaseOrderNumber_idx" ON "Asset"("purchaseOrderNumber");
CREATE INDEX "Asset_acquisitionDate_idx" ON "Asset"("acquisitionDate");
CREATE TRIGGER "audit_Asset_insert" AFTER INSERT ON "Asset" BEGIN
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('id',NULL),json_object('id',NEW."id"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('tagNumber',NULL),json_object('tagNumber',NEW."tagNumber"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('assetType',NULL),json_object('assetType',NEW."assetType"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('brandName',NULL),json_object('brandName',NEW."brandName"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('deliveryOrderNumber',NULL),json_object('deliveryOrderNumber',NEW."deliveryOrderNumber"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('receivedDate',NULL),json_object('receivedDate',NEW."receivedDate"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('grantProjectCode',NULL),json_object('grantProjectCode',NEW."grantProjectCode"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('legacyRecordReason',NULL),json_object('legacyRecordReason',NEW."legacyRecordReason"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('serviceContract',NULL),json_object('serviceContract',NEW."serviceContract"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('supportVendor',NULL),json_object('supportVendor',NEW."supportVendor"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('custodianId',NULL),json_object('custodianId',NEW."custodianId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('verifiedById',NULL),json_object('verifiedById',NEW."verifiedById"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('verificationResult',NULL),json_object('verificationResult',NEW."verificationResult"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('iiumReferenceNumber',NULL),json_object('iiumReferenceNumber',NEW."iiumReferenceNumber"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('name',NULL),json_object('name',NEW."name"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('description',NULL),json_object('description',NEW."description"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('model',NULL),json_object('model',NEW."model"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('serialNumber',NULL),json_object('serialNumber',NEW."serialNumber"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('purchaseOrderNumber',NULL),json_object('purchaseOrderNumber',NEW."purchaseOrderNumber"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('invoiceNumber',NULL),json_object('invoiceNumber',NEW."invoiceNumber"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('acquisitionDate',NULL),json_object('acquisitionDate',NEW."acquisitionDate"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('acquisitionCost',NULL),json_object('acquisitionCost',NEW."acquisitionCost"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('warrantyStartDate',NULL),json_object('warrantyStartDate',NEW."warrantyStartDate"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('warrantyExpiryDate',NULL),json_object('warrantyExpiryDate',NEW."warrantyExpiryDate"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('expectedUsefulLife',NULL),json_object('expectedUsefulLife',NEW."expectedUsefulLife"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('depreciationMethod',NULL),json_object('depreciationMethod',NEW."depreciationMethod"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('currentBookValue',NULL),json_object('currentBookValue',NEW."currentBookValue"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('status',NULL),json_object('status',NEW."status"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('condition',NULL),json_object('condition',NEW."condition"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('borrowable',NULL),json_object('borrowable',NEW."borrowable"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('riskLevel',NULL),json_object('riskLevel',NEW."riskLevel"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('lastVerificationDate',NULL),json_object('lastVerificationDate',NEW."lastVerificationDate"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('nextVerificationDate',NULL),json_object('nextVerificationDate',NEW."nextVerificationDate"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('notes',NULL),json_object('notes',NEW."notes"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('archivedAt',NULL),json_object('archivedAt',NEW."archivedAt"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('categoryId',NULL),json_object('categoryId',NEW."categoryId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('subcategoryId',NULL),json_object('subcategoryId',NEW."subcategoryId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('brandId',NULL),json_object('brandId',NEW."brandId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('supplierId',NULL),json_object('supplierId',NEW."supplierId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('fundingSourceId',NULL),json_object('fundingSourceId',NEW."fundingSourceId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('kulliyyahId',NULL),json_object('kulliyyahId',NEW."kulliyyahId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('departmentId',NULL),json_object('departmentId',NEW."departmentId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('unitId',NULL),json_object('unitId',NEW."unitId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('buildingId',NULL),json_object('buildingId',NEW."buildingId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('roomId',NULL),json_object('roomId',NEW."roomId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('assignedUserId',NULL),json_object('assignedUserId',NEW."assignedUserId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('liaisonId',NULL),json_object('liaisonId',NEW."liaisonId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('createdById',NULL),json_object('createdById',NEW."createdById"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('updatedById',NULL),json_object('updatedById',NEW."updatedById"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('createdAt',NULL),json_object('createdAt',NEW."createdAt"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'CREATE','Assets','Asset',NEW."id",json_object('updatedAt',NULL),json_object('updatedAt',NEW."updatedAt"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
END;
CREATE TRIGGER "audit_Asset_update" AFTER UPDATE ON "Asset" BEGIN
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('id',OLD."id"),json_object('id',NEW."id"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."id" IS NOT NEW."id";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('tagNumber',OLD."tagNumber"),json_object('tagNumber',NEW."tagNumber"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."tagNumber" IS NOT NEW."tagNumber";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('assetType',OLD."assetType"),json_object('assetType',NEW."assetType"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."assetType" IS NOT NEW."assetType";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('brandName',OLD."brandName"),json_object('brandName',NEW."brandName"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."brandName" IS NOT NEW."brandName";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('deliveryOrderNumber',OLD."deliveryOrderNumber"),json_object('deliveryOrderNumber',NEW."deliveryOrderNumber"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."deliveryOrderNumber" IS NOT NEW."deliveryOrderNumber";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('receivedDate',OLD."receivedDate"),json_object('receivedDate',NEW."receivedDate"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."receivedDate" IS NOT NEW."receivedDate";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('grantProjectCode',OLD."grantProjectCode"),json_object('grantProjectCode',NEW."grantProjectCode"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."grantProjectCode" IS NOT NEW."grantProjectCode";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('legacyRecordReason',OLD."legacyRecordReason"),json_object('legacyRecordReason',NEW."legacyRecordReason"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."legacyRecordReason" IS NOT NEW."legacyRecordReason";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('serviceContract',OLD."serviceContract"),json_object('serviceContract',NEW."serviceContract"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."serviceContract" IS NOT NEW."serviceContract";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('supportVendor',OLD."supportVendor"),json_object('supportVendor',NEW."supportVendor"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."supportVendor" IS NOT NEW."supportVendor";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('custodianId',OLD."custodianId"),json_object('custodianId',NEW."custodianId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."custodianId" IS NOT NEW."custodianId";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('verifiedById',OLD."verifiedById"),json_object('verifiedById',NEW."verifiedById"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."verifiedById" IS NOT NEW."verifiedById";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('verificationResult',OLD."verificationResult"),json_object('verificationResult',NEW."verificationResult"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."verificationResult" IS NOT NEW."verificationResult";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('iiumReferenceNumber',OLD."iiumReferenceNumber"),json_object('iiumReferenceNumber',NEW."iiumReferenceNumber"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."iiumReferenceNumber" IS NOT NEW."iiumReferenceNumber";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('name',OLD."name"),json_object('name',NEW."name"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."name" IS NOT NEW."name";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('description',OLD."description"),json_object('description',NEW."description"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."description" IS NOT NEW."description";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('model',OLD."model"),json_object('model',NEW."model"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."model" IS NOT NEW."model";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('serialNumber',OLD."serialNumber"),json_object('serialNumber',NEW."serialNumber"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."serialNumber" IS NOT NEW."serialNumber";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('purchaseOrderNumber',OLD."purchaseOrderNumber"),json_object('purchaseOrderNumber',NEW."purchaseOrderNumber"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."purchaseOrderNumber" IS NOT NEW."purchaseOrderNumber";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('invoiceNumber',OLD."invoiceNumber"),json_object('invoiceNumber',NEW."invoiceNumber"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."invoiceNumber" IS NOT NEW."invoiceNumber";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('acquisitionDate',OLD."acquisitionDate"),json_object('acquisitionDate',NEW."acquisitionDate"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."acquisitionDate" IS NOT NEW."acquisitionDate";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('acquisitionCost',OLD."acquisitionCost"),json_object('acquisitionCost',NEW."acquisitionCost"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."acquisitionCost" IS NOT NEW."acquisitionCost";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('warrantyStartDate',OLD."warrantyStartDate"),json_object('warrantyStartDate',NEW."warrantyStartDate"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."warrantyStartDate" IS NOT NEW."warrantyStartDate";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('warrantyExpiryDate',OLD."warrantyExpiryDate"),json_object('warrantyExpiryDate',NEW."warrantyExpiryDate"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."warrantyExpiryDate" IS NOT NEW."warrantyExpiryDate";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('expectedUsefulLife',OLD."expectedUsefulLife"),json_object('expectedUsefulLife',NEW."expectedUsefulLife"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."expectedUsefulLife" IS NOT NEW."expectedUsefulLife";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('depreciationMethod',OLD."depreciationMethod"),json_object('depreciationMethod',NEW."depreciationMethod"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."depreciationMethod" IS NOT NEW."depreciationMethod";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('currentBookValue',OLD."currentBookValue"),json_object('currentBookValue',NEW."currentBookValue"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."currentBookValue" IS NOT NEW."currentBookValue";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('status',OLD."status"),json_object('status',NEW."status"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."status" IS NOT NEW."status";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('condition',OLD."condition"),json_object('condition',NEW."condition"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."condition" IS NOT NEW."condition";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('borrowable',OLD."borrowable"),json_object('borrowable',NEW."borrowable"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."borrowable" IS NOT NEW."borrowable";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('riskLevel',OLD."riskLevel"),json_object('riskLevel',NEW."riskLevel"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."riskLevel" IS NOT NEW."riskLevel";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('lastVerificationDate',OLD."lastVerificationDate"),json_object('lastVerificationDate',NEW."lastVerificationDate"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."lastVerificationDate" IS NOT NEW."lastVerificationDate";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('nextVerificationDate',OLD."nextVerificationDate"),json_object('nextVerificationDate',NEW."nextVerificationDate"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."nextVerificationDate" IS NOT NEW."nextVerificationDate";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('notes',OLD."notes"),json_object('notes',NEW."notes"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."notes" IS NOT NEW."notes";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('archivedAt',OLD."archivedAt"),json_object('archivedAt',NEW."archivedAt"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."archivedAt" IS NOT NEW."archivedAt";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('categoryId',OLD."categoryId"),json_object('categoryId',NEW."categoryId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."categoryId" IS NOT NEW."categoryId";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('subcategoryId',OLD."subcategoryId"),json_object('subcategoryId',NEW."subcategoryId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."subcategoryId" IS NOT NEW."subcategoryId";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('brandId',OLD."brandId"),json_object('brandId',NEW."brandId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."brandId" IS NOT NEW."brandId";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('supplierId',OLD."supplierId"),json_object('supplierId',NEW."supplierId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."supplierId" IS NOT NEW."supplierId";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('fundingSourceId',OLD."fundingSourceId"),json_object('fundingSourceId',NEW."fundingSourceId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."fundingSourceId" IS NOT NEW."fundingSourceId";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('kulliyyahId',OLD."kulliyyahId"),json_object('kulliyyahId',NEW."kulliyyahId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."kulliyyahId" IS NOT NEW."kulliyyahId";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('departmentId',OLD."departmentId"),json_object('departmentId',NEW."departmentId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."departmentId" IS NOT NEW."departmentId";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('unitId',OLD."unitId"),json_object('unitId',NEW."unitId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."unitId" IS NOT NEW."unitId";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('buildingId',OLD."buildingId"),json_object('buildingId',NEW."buildingId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."buildingId" IS NOT NEW."buildingId";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('roomId',OLD."roomId"),json_object('roomId',NEW."roomId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."roomId" IS NOT NEW."roomId";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('assignedUserId',OLD."assignedUserId"),json_object('assignedUserId',NEW."assignedUserId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."assignedUserId" IS NOT NEW."assignedUserId";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('liaisonId',OLD."liaisonId"),json_object('liaisonId',NEW."liaisonId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."liaisonId" IS NOT NEW."liaisonId";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('createdById',OLD."createdById"),json_object('createdById',NEW."createdById"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."createdById" IS NOT NEW."createdById";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('updatedById',OLD."updatedById"),json_object('updatedById',NEW."updatedById"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."updatedById" IS NOT NEW."updatedById";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('createdAt',OLD."createdAt"),json_object('createdAt',NEW."createdAt"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."createdAt" IS NOT NEW."createdAt";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."updatedById",'UPDATE','Assets','Asset',NEW."id",json_object('updatedAt',OLD."updatedAt"),json_object('updatedAt',NEW."updatedAt"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."updatedAt" IS NOT NEW."updatedAt";
END;
CREATE TRIGGER "audit_Asset_delete" AFTER DELETE ON "Asset" BEGIN
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('id',OLD."id"),json_object('id',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('tagNumber',OLD."tagNumber"),json_object('tagNumber',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('assetType',OLD."assetType"),json_object('assetType',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('brandName',OLD."brandName"),json_object('brandName',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('deliveryOrderNumber',OLD."deliveryOrderNumber"),json_object('deliveryOrderNumber',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('receivedDate',OLD."receivedDate"),json_object('receivedDate',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('grantProjectCode',OLD."grantProjectCode"),json_object('grantProjectCode',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('legacyRecordReason',OLD."legacyRecordReason"),json_object('legacyRecordReason',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('serviceContract',OLD."serviceContract"),json_object('serviceContract',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('supportVendor',OLD."supportVendor"),json_object('supportVendor',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('custodianId',OLD."custodianId"),json_object('custodianId',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('verifiedById',OLD."verifiedById"),json_object('verifiedById',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('verificationResult',OLD."verificationResult"),json_object('verificationResult',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('iiumReferenceNumber',OLD."iiumReferenceNumber"),json_object('iiumReferenceNumber',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('name',OLD."name"),json_object('name',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('description',OLD."description"),json_object('description',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('model',OLD."model"),json_object('model',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('serialNumber',OLD."serialNumber"),json_object('serialNumber',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('purchaseOrderNumber',OLD."purchaseOrderNumber"),json_object('purchaseOrderNumber',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('invoiceNumber',OLD."invoiceNumber"),json_object('invoiceNumber',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('acquisitionDate',OLD."acquisitionDate"),json_object('acquisitionDate',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('acquisitionCost',OLD."acquisitionCost"),json_object('acquisitionCost',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('warrantyStartDate',OLD."warrantyStartDate"),json_object('warrantyStartDate',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('warrantyExpiryDate',OLD."warrantyExpiryDate"),json_object('warrantyExpiryDate',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('expectedUsefulLife',OLD."expectedUsefulLife"),json_object('expectedUsefulLife',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('depreciationMethod',OLD."depreciationMethod"),json_object('depreciationMethod',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('currentBookValue',OLD."currentBookValue"),json_object('currentBookValue',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('status',OLD."status"),json_object('status',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('condition',OLD."condition"),json_object('condition',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('borrowable',OLD."borrowable"),json_object('borrowable',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('riskLevel',OLD."riskLevel"),json_object('riskLevel',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('lastVerificationDate',OLD."lastVerificationDate"),json_object('lastVerificationDate',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('nextVerificationDate',OLD."nextVerificationDate"),json_object('nextVerificationDate',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('notes',OLD."notes"),json_object('notes',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('archivedAt',OLD."archivedAt"),json_object('archivedAt',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('categoryId',OLD."categoryId"),json_object('categoryId',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('subcategoryId',OLD."subcategoryId"),json_object('subcategoryId',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('brandId',OLD."brandId"),json_object('brandId',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('supplierId',OLD."supplierId"),json_object('supplierId',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('fundingSourceId',OLD."fundingSourceId"),json_object('fundingSourceId',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('kulliyyahId',OLD."kulliyyahId"),json_object('kulliyyahId',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('departmentId',OLD."departmentId"),json_object('departmentId',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('unitId',OLD."unitId"),json_object('unitId',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('buildingId',OLD."buildingId"),json_object('buildingId',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('roomId',OLD."roomId"),json_object('roomId',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('assignedUserId',OLD."assignedUserId"),json_object('assignedUserId',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('liaisonId',OLD."liaisonId"),json_object('liaisonId',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('createdById',OLD."createdById"),json_object('createdById',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('updatedById',OLD."updatedById"),json_object('updatedById',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('createdAt',OLD."createdAt"),json_object('createdAt',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."updatedById",'DELETE','Assets','Asset',OLD."id",json_object('updatedAt',OLD."updatedAt"),json_object('updatedAt',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
END;
CREATE TRIGGER "audit_AssetDocument_insert" AFTER INSERT ON "AssetDocument" BEGIN
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."uploadedById",'CREATE','Assets','Asset',NEW."assetId",json_object('attachment.id',NULL),json_object('attachment.id',NEW."id"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."uploadedById",'CREATE','Assets','Asset',NEW."assetId",json_object('attachment.assetId',NULL),json_object('attachment.assetId',NEW."assetId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."uploadedById",'CREATE','Assets','Asset',NEW."assetId",json_object('attachment.typeLabel',NULL),json_object('attachment.typeLabel',NEW."typeLabel"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."uploadedById",'CREATE','Assets','Asset',NEW."assetId",json_object('attachment.uploadedById',NULL),json_object('attachment.uploadedById',NEW."uploadedById"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."uploadedById",'CREATE','Assets','Asset',NEW."assetId",json_object('attachment.fileName',NULL),json_object('attachment.fileName',NEW."fileName"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."uploadedById",'CREATE','Assets','Asset',NEW."assetId",json_object('attachment.fileUrl',NULL),json_object('attachment.fileUrl',NEW."fileUrl"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."uploadedById",'CREATE','Assets','Asset',NEW."assetId",json_object('attachment.mimeType',NULL),json_object('attachment.mimeType',NEW."mimeType"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."uploadedById",'CREATE','Assets','Asset',NEW."assetId",json_object('attachment.size',NULL),json_object('attachment.size',NEW."size"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."uploadedById",'CREATE','Assets','Asset',NEW."assetId",json_object('attachment.createdAt',NULL),json_object('attachment.createdAt',NEW."createdAt"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
END;
CREATE TRIGGER "audit_AssetDocument_update" AFTER UPDATE ON "AssetDocument" BEGIN
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."uploadedById",'UPDATE','Assets','Asset',NEW."assetId",json_object('attachment.id',OLD."id"),json_object('attachment.id',NEW."id"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."id" IS NOT NEW."id";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."uploadedById",'UPDATE','Assets','Asset',NEW."assetId",json_object('attachment.assetId',OLD."assetId"),json_object('attachment.assetId',NEW."assetId"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."assetId" IS NOT NEW."assetId";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."uploadedById",'UPDATE','Assets','Asset',NEW."assetId",json_object('attachment.typeLabel',OLD."typeLabel"),json_object('attachment.typeLabel',NEW."typeLabel"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."typeLabel" IS NOT NEW."typeLabel";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."uploadedById",'UPDATE','Assets','Asset',NEW."assetId",json_object('attachment.uploadedById',OLD."uploadedById"),json_object('attachment.uploadedById',NEW."uploadedById"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."uploadedById" IS NOT NEW."uploadedById";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."uploadedById",'UPDATE','Assets','Asset',NEW."assetId",json_object('attachment.fileName',OLD."fileName"),json_object('attachment.fileName',NEW."fileName"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."fileName" IS NOT NEW."fileName";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."uploadedById",'UPDATE','Assets','Asset',NEW."assetId",json_object('attachment.fileUrl',OLD."fileUrl"),json_object('attachment.fileUrl',NEW."fileUrl"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."fileUrl" IS NOT NEW."fileUrl";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."uploadedById",'UPDATE','Assets','Asset',NEW."assetId",json_object('attachment.mimeType',OLD."mimeType"),json_object('attachment.mimeType',NEW."mimeType"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."mimeType" IS NOT NEW."mimeType";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."uploadedById",'UPDATE','Assets','Asset',NEW."assetId",json_object('attachment.size',OLD."size"),json_object('attachment.size',NEW."size"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."size" IS NOT NEW."size";
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),NEW."uploadedById",'UPDATE','Assets','Asset',NEW."assetId",json_object('attachment.createdAt',OLD."createdAt"),json_object('attachment.createdAt',NEW."createdAt"),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE OLD."createdAt" IS NOT NEW."createdAt";
END;
CREATE TRIGGER "audit_AssetDocument_delete" AFTER DELETE ON "AssetDocument" BEGIN
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."uploadedById",'DELETE','Assets','Asset',OLD."assetId",json_object('attachment.id',OLD."id"),json_object('attachment.id',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."uploadedById",'DELETE','Assets','Asset',OLD."assetId",json_object('attachment.assetId',OLD."assetId"),json_object('attachment.assetId',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."uploadedById",'DELETE','Assets','Asset',OLD."assetId",json_object('attachment.typeLabel',OLD."typeLabel"),json_object('attachment.typeLabel',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."uploadedById",'DELETE','Assets','Asset',OLD."assetId",json_object('attachment.uploadedById',OLD."uploadedById"),json_object('attachment.uploadedById',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."uploadedById",'DELETE','Assets','Asset',OLD."assetId",json_object('attachment.fileName',OLD."fileName"),json_object('attachment.fileName',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."uploadedById",'DELETE','Assets','Asset',OLD."assetId",json_object('attachment.fileUrl',OLD."fileUrl"),json_object('attachment.fileUrl',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."uploadedById",'DELETE','Assets','Asset',OLD."assetId",json_object('attachment.mimeType',OLD."mimeType"),json_object('attachment.mimeType',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."uploadedById",'DELETE','Assets','Asset',OLD."assetId",json_object('attachment.size',OLD."size"),json_object('attachment.size',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
INSERT INTO "AuditLog" (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
 SELECT lower(hex(randomblob(16))),OLD."uploadedById",'DELETE','Assets','Asset',OLD."assetId",json_object('attachment.createdAt',OLD."createdAt"),json_object('attachment.createdAt',NULL),1,CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER) WHERE 1;
END;

-- A single check insert updates the summary and its field audits atomically on SQLite and D1.
CREATE TRIGGER "asset_verification_summary" AFTER INSERT ON "AssetVerification"
WHEN upper(replace(NEW.status, ' ', '_')) IN ('FOUND','MISSING','WRONG_LOCATION','DAMAGED')
BEGIN
 UPDATE "Asset" SET lastVerificationDate=NEW.checkedAt, verifiedById=NEW.verifierId,
 verificationResult=upper(replace(NEW.status, ' ', '_')), updatedById=NEW.verifierId,
 updatedAt=CAST((julianday('now') - 2440587.5)*86400000 AS INTEGER)
 WHERE id=NEW.assetId AND (lastVerificationDate IS NULL OR
  CASE WHEN typeof(NEW.checkedAt) IN ('integer','real') THEN NEW.checkedAt ELSE CAST((julianday(NEW.checkedAt)-2440587.5)*86400000 AS INTEGER) END >=
  CASE WHEN typeof(lastVerificationDate) IN ('integer','real') THEN lastVerificationDate ELSE CAST((julianday(lastVerificationDate)-2440587.5)*86400000 AS INTEGER) END);
END;

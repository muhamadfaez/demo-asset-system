"""Runs exclusively against an in-memory SQLite database."""
import sqlite3, json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys=ON")
db.executescript((root / "prisma/baseline.sql").read_text())
for uid,role in [("admin","SUPERADMIN"),("user","USER")]:
 db.execute('INSERT INTO "User" (id,name,email,role,status,updatedAt) VALUES (?,?,?,?,?,?)',(uid,uid,uid+"@example.com",role,"ACTIVE",0))
db.executescript((root / "prisma/demo-data.sql").read_text())
before=db.execute('SELECT id, tagNumber, name FROM Asset ORDER BY id').fetchall()
folder=root / "prisma/migrations/202610180001_asset_audit_records"
db.executescript((folder / "migration.sql").read_text())
assert db.execute('SELECT id, tagNumber, name FROM Asset ORDER BY id').fetchall()==before
assert db.execute("SELECT count(*) FROM Asset WHERE assetType='INVENTORY'").fetchone()[0]==10
db.executescript((root / "prisma/demo-data.sql").read_text())
db.executescript((root / "prisma/demo-workflows.sql").read_text())
db.execute("UPDATE Asset SET purchaseOrderNumber='PO-TEST',updatedById='admin' WHERE id='demo-asset-001'")
log=db.execute("SELECT previousValues,newValues,userId FROM AuditLog WHERE recordId='demo-asset-001' AND newValues LIKE '%PO-TEST%' ORDER BY rowid DESC LIMIT 1").fetchone()
assert json.loads(log[0])=={'purchaseOrderNumber':None}
assert json.loads(log[1])=={'purchaseOrderNumber':'PO-TEST'} and log[2]=='admin'
# Verification inserts synchronise the summary, including the actor, in one statement.
campaign=db.execute('SELECT id FROM VerificationCampaign LIMIT 1').fetchone()[0]
db.execute("INSERT INTO AssetVerification (id,campaignId,assetId,verifierId,status,checkedAt) VALUES ('new-check',?,'demo-asset-001','admin','WRONG_LOCATION',1900000000000)",(campaign,))
assert db.execute("SELECT verifiedById,verificationResult,lastVerificationDate FROM Asset WHERE id='demo-asset-001'").fetchone()==('admin','WRONG_LOCATION',1900000000000)
db.execute("INSERT INTO AssetVerification (id,campaignId,assetId,verifierId,status,checkedAt) VALUES ('older-check',?,'demo-asset-001','user','FOUND',1800000000000)",(campaign,))
assert db.execute("SELECT verificationResult FROM Asset WHERE id='demo-asset-001'").fetchone()[0]=='WRONG_LOCATION'
count=db.execute('SELECT count(*) FROM AuditLog').fetchone()[0]
db.execute("UPDATE Asset SET purchaseOrderNumber='PO-TEST' WHERE id='demo-asset-001'")
assert db.execute('SELECT count(*) FROM AuditLog').fetchone()[0]==count
# Audit failure must abort the asset write, preventing unlogged edits.
db.execute("CREATE TRIGGER reject_test_audit BEFORE INSERT ON AuditLog BEGIN SELECT RAISE(ABORT,'audit unavailable'); END")
try: db.execute("UPDATE Asset SET name='must fail' WHERE id='demo-asset-001'")
except sqlite3.IntegrityError: pass
else: raise AssertionError('unlogged write succeeded')
assert db.execute("SELECT name FROM Asset WHERE id='demo-asset-001'").fetchone()[0] != 'must fail'
try: db.execute("INSERT INTO AssetVerification (id,campaignId,assetId,verifierId,status,checkedAt) VALUES ('failed-check',?,'demo-asset-001','admin','FOUND',2000000000000)",(campaign,))
except sqlite3.IntegrityError: pass
else: raise AssertionError('verification succeeded without its audited summary')
assert db.execute("SELECT count(*) FROM AssetVerification WHERE id='failed-check'").fetchone()[0]==0
db.execute('DROP TRIGGER reject_test_audit')
db.execute("INSERT INTO AssetDocument (id,assetId,fileName,fileUrl,mimeType,size,typeLabel,contentBase64,uploadedById) VALUES ('doc','demo-asset-001','invoice.pdf','','application/pdf',1,'INVOICE','YQ==','admin')")
assert db.execute("SELECT count(*) FROM AuditLog WHERE newValues LIKE '%attachment.fileName%'").fetchone()[0]>0
db.execute("DELETE FROM AssetDocument WHERE id='doc'")
assert db.execute("SELECT count(*) FROM AuditLog WHERE action='DELETE' AND previousValues LIKE '%invoice.pdf%'").fetchone()[0]>0
# Creation/deletion triggers, independent from HTTP clients.
db.execute("INSERT INTO Asset (id,tagNumber,name,categoryId,kulliyyahId,departmentId,buildingId,roomId,updatedAt,updatedById) VALUES ('temp','TEMP','Temporary','demo-cat-computer','demo-kict','demo-cs','demo-building','demo-lab',0,'admin')")
assert db.execute("SELECT count(*) FROM AuditLog WHERE recordId='temp' AND action='CREATE'").fetchone()[0]>0
db.execute("DELETE FROM Asset WHERE id='temp'")
assert db.execute("SELECT count(*) FROM AuditLog WHERE recordId='temp' AND action='DELETE'").fetchone()[0]>0
db.execute("INSERT INTO AssetDocument (id,assetId,fileName,fileUrl,mimeType,size,typeLabel,contentBase64,uploadedById) VALUES ('kept-doc','demo-asset-001','warranty.pdf','','application/pdf',1,'WARRANTY_CARD','YQ==','admin')")
db.executescript((folder / "rollback.sql").read_text())
assert db.execute("SELECT contentBase64 FROM AssetAuditRollback_Document WHERE id='kept-doc'").fetchone()[0]=="YQ=="
assert db.execute('SELECT id, tagNumber, name FROM Asset ORDER BY id').fetchall()==before
assert db.execute("SELECT purchaseOrderNumber FROM AssetAuditRollback_Asset WHERE id='demo-asset-001'").fetchone()[0]=='PO-TEST'
assert not db.execute('PRAGMA foreign_key_check').fetchall()
print('Migration, demo imports, atomic field audits, attachment audits and rollback passed')

import { PrismaClient, AssetCondition, AssetStatus, RequestStatus, RoleName, AccountStatus } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const localUrl = databaseUrl.startsWith("file:./") ? `file:./prisma/${databaseUrl.slice("file:./".length)}` : databaseUrl;
const prisma = new PrismaClient({ adapter: new PrismaLibSQL({ url: localUrl }, { timestampFormat: "unixepoch-ms" }) });

async function main() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.disposalRequest.deleteMany(),
    prisma.assetIncident.deleteMany(),
    prisma.assetVerification.deleteMany(),
    prisma.verificationCampaign.deleteMany(),
    prisma.maintenanceRequest.deleteMany(),
    prisma.assetTransfer.deleteMany(),
    prisma.borrowingRequest.deleteMany(),
    prisma.assetAssignment.deleteMany(),
    prisma.assetDocument.deleteMany(),
    prisma.assetImage.deleteMany(),
    prisma.asset.deleteMany(),
    prisma.user.deleteMany(),
    prisma.assetSubcategory.deleteMany(),
    prisma.assetCategory.deleteMany(),
    prisma.brand.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.fundingSource.deleteMany(),
    prisma.room.deleteMany(),
    prisma.floor.deleteMany(),
    prisma.building.deleteMany(),
    prisma.campus.deleteMany(),
    prisma.unit.deleteMany(),
    prisma.department.deleteMany(),
    prisma.kulliyyah.deleteMany(),
    prisma.systemSetting.deleteMany()
  ]);

  const kulliyyah = await prisma.kulliyyah.create({ data: { name: "Kulliyyah of Information and Communication Technology", code: "KICT" } });
  const departments = await Promise.all(["Computer Science", "Information Systems", "Library and Office Operations"].map((name, i) => prisma.department.create({ data: { name, code: `D${i + 1}`, kulliyyahId: kulliyyah.id } })));
  const units = await Promise.all(departments.map((d, i) => prisma.unit.create({ data: { name: `${d.name} Unit`, code: `U${i + 1}`, departmentId: d.id } })));
  const campus = await prisma.campus.create({ data: { name: "Gombak Campus" } });
  const building = await prisma.building.create({ data: { name: "KICT Building", code: "KICT", campusId: campus.id } });
  const floors = await Promise.all(["Ground Floor", "Level 1", "Level 2"].map((name) => prisma.floor.create({ data: { name, buildingId: building.id } })));
  const rooms = await Promise.all(floors.flatMap((f, i) => ["Lab", "Office", "Classroom"].map((name, j) => prisma.room.create({ data: { name: `${name} ${i + 1}${j + 1}`, code: `${i + 1}${j + 1}`, floorId: f.id } }))));
  const categories = await Promise.all(["Computers and Laptops", "Monitors", "Printers and Scanners", "Networking Equipment", "Laboratory Equipment", "Furniture", "Audio-Visual Equipment", "Office Equipment"].map((name) => prisma.assetCategory.create({ data: { name } })));
  const subcategories = await Promise.all(categories.map((c) => prisma.assetSubcategory.create({ data: { name: `${c.name} General`, categoryId: c.id } })));
  const brands = await Promise.all(["Dell", "HP", "Lenovo", "Cisco", "Epson", "Sony"].map((name) => prisma.brand.create({ data: { name } })));
  const supplier = await prisma.supplier.create({ data: { name: "IIUM Approved Supplier Sdn Bhd", email: "supplier@example.com", phone: "+60300000000" } });
  const funding = await prisma.fundingSource.create({ data: { name: "Kulliyyah Operating Grant" } });

  const superadmin = await prisma.user.create({ data: { name: "Seed Superadmin", email: process.env.SUPERADMIN_EMAIL ?? "superadmin@iium.edu.my", role: RoleName.SUPERADMIN, status: AccountStatus.ACTIVE, kulliyyahId: kulliyyah.id, departmentId: departments[0].id, unitId: units[0].id, position: "Asset Administrator" } });
  const liaison1 = await prisma.user.create({ data: { name: "Aisha Liaison", email: "aisha.liaison@iium.edu.my", role: RoleName.ASSET_LIAISON, status: AccountStatus.ACTIVE, kulliyyahId: kulliyyah.id, departmentId: departments[0].id, unitId: units[0].id } });
  const liaison2 = await prisma.user.create({ data: { name: "Hakim Liaison", email: "hakim.liaison@iium.edu.my", role: RoleName.ASSET_LIAISON, status: AccountStatus.ACTIVE, kulliyyahId: kulliyyah.id, departmentId: departments[1].id, unitId: units[1].id } });
  const users = await Promise.all(["Nadia User", "Omar User", "Sara User", "Pending Staff"].map((name, i) => prisma.user.create({ data: { name, email: `${name.toLowerCase().replaceAll(" ", ".")}@iium.edu.my`, role: RoleName.USER, status: i === 3 ? AccountStatus.PENDING : AccountStatus.ACTIVE, kulliyyahId: kulliyyah.id, departmentId: departments[i % departments.length].id, unitId: units[i % units.length].id } })));

  const assets = [];
  for (let i = 1; i <= 30; i++) {
    const status = i % 11 === 0 ? AssetStatus.UNDER_MAINTENANCE : i % 9 === 0 ? AssetStatus.BORROWED : i % 7 === 0 ? AssetStatus.ASSIGNED : AssetStatus.AVAILABLE;
    assets.push(await prisma.asset.create({
      data: {
        tagNumber: `KICT-${String(i).padStart(4, "0")}`,
        iiumReferenceNumber: `IIUM/KICT/${2024 + (i % 3)}/${i}`,
        name: `${categories[i % categories.length].name} ${i}`,
        description: "Seeded asset for workflow testing and demonstrations.",
        model: `Model-${100 + i}`,
        serialNumber: `SN-KICT-${String(i).padStart(5, "0")}`,
        acquisitionDate: new Date(2024, i % 12, 1),
        acquisitionCost: 800 + i * 175,
        currentBookValue: 650 + i * 120,
        warrantyStartDate: new Date(2024, 0, 1),
        warrantyExpiryDate: new Date(2027, i % 12, 1),
        expectedUsefulLife: 5,
        depreciationMethod: "Straight Line",
        status,
        condition: i % 10 === 0 ? AssetCondition.FAIR : AssetCondition.GOOD,
        borrowable: i % 4 !== 0,
        categoryId: categories[i % categories.length].id,
        subcategoryId: subcategories[i % subcategories.length].id,
        brandId: brands[i % brands.length].id,
        supplierId: supplier.id,
        fundingSourceId: funding.id,
        kulliyyahId: kulliyyah.id,
        departmentId: departments[i % departments.length].id,
        unitId: units[i % units.length].id,
        buildingId: building.id,
        roomId: rooms[i % rooms.length].id,
        assignedUserId: status === AssetStatus.ASSIGNED ? users[i % 3].id : undefined,
        liaisonId: i % 2 ? liaison1.id : liaison2.id,
        createdById: superadmin.id,
        updatedById: superadmin.id
      }
    }));
  }

  await prisma.assetAssignment.create({ data: { assetId: assets[6].id, assignedUserId: users[0].id, assignedById: liaison1.id, purpose: "Teaching laboratory workstation", acceptanceStatus: "Accepted", acceptedAt: new Date() } });
  await prisma.borrowingRequest.createMany({ data: [
    { requestNumber: "BR-1001", requesterId: users[0].id, assetId: assets[0].id, purpose: "Workshop presentation", startDate: new Date(), expectedReturnAt: new Date(Date.now() + 7 * 86400000), status: RequestStatus.PENDING_APPROVAL },
    { requestNumber: "BR-1002", requesterId: users[1].id, assetId: assets[8].id, purpose: "Classroom replacement", startDate: new Date(Date.now() - 10 * 86400000), expectedReturnAt: new Date(Date.now() - 2 * 86400000), status: RequestStatus.OVERDUE }
  ]});
  await prisma.assetTransfer.create({ data: { transferNumber: "TR-1001", assetId: assets[1].id, currentLocation: "Lab 11", newLocation: "Office 12", reason: "Space reallocation", requestedById: liaison1.id, status: RequestStatus.PENDING_APPROVAL } });
  await prisma.maintenanceRequest.create({ data: { requestNumber: "MT-1001", assetId: assets[10].id, reportedById: users[1].id, issueCategory: "Hardware", description: "Device fails intermittent startup checks.", priority: "High", type: "Corrective", estimatedCost: 450, status: RequestStatus.IN_PROGRESS } });
  const campaign = await prisma.verificationCampaign.create({ data: { name: "Annual KICT Verification 2026", startDate: new Date(), endDate: new Date(Date.now() + 30 * 86400000), status: "In Progress", kulliyyahId: kulliyyah.id, departmentId: departments[0].id, assignedToId: liaison1.id } });
  await prisma.assetVerification.create({ data: { campaignId: campaign.id, assetId: assets[0].id, verifierId: liaison1.id, status: "Verified", remarks: "Found in correct room." } });
  await prisma.assetIncident.create({ data: { incidentNumber: "IN-1001", assetId: assets[12].id, type: "Damaged", discoveredAt: new Date(), location: "Lab 21", reportedById: users[2].id, description: "Screen cracked after class session.", status: "Under Investigation" } });
  await prisma.disposalRequest.create({ data: { requestNumber: "DP-1001", assetId: assets[14].id, reason: "Beyond economical repair", currentCondition: "Unserviceable", method: "Write-Off", requestedById: liaison2.id, status: RequestStatus.UNDER_REVIEW } });
  await prisma.notification.createMany({ data: [
    { userId: superadmin.id, title: "New account approval", message: "Pending Staff requires account approval.", href: "/users" },
    { userId: liaison1.id, title: "Borrowing request submitted", message: "BR-1001 is waiting for review.", href: "/borrowings" },
    { userId: users[0].id, title: "Asset assigned", message: "A teaching workstation has been assigned to you.", href: "/assignments" }
  ]});
  await prisma.auditLog.createMany({ data: [
    { userId: superadmin.id, action: "SEED", module: "System", recordType: "Database", success: true },
    { userId: liaison1.id, action: "VERIFY", module: "Verification", recordType: "AssetVerification", success: true },
    { userId: users[1].id, action: "REPORT", module: "Maintenance", recordType: "MaintenanceRequest", success: true }
  ]});
  await prisma.systemSetting.createMany({ data: [
    { key: "systemName", value: "IIUM Kulliyyah Asset Management System" },
    { key: "currency", value: "RM" },
    { key: "timeZone", value: "Asia/Kuala_Lumpur" },
    { key: "permittedEmailDomain", value: process.env.PERMITTED_EMAIL_DOMAIN ?? "@iium.edu.my" },
    { key: "assetTagPrefix", value: "KICT" }
  ]});
}

main().finally(async () => prisma.$disconnect());

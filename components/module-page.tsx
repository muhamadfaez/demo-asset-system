import { getLatestAuditLogs } from "@/lib/asset-audit-log";
import { assetSearchFilter } from "@/lib/asset-search-db";
import { AttachmentManager } from "@/components/asset-attachments";
import { getDateFormatter } from "@/lib/date-formatter";
import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { AccountStatus, AssetStatus, RoleName } from "@prisma/client";
import { Badge, Card, EmptyState } from "@/components/ui";
import { AssetRegistrationForm } from "@/components/asset-registration-form";
import { prisma } from "@/lib/prisma";
import { assetScopeFor, can, canAccessModule } from "@/lib/permissions";
import { getSystemSettings } from "@/lib/settings";
import { getUnreadNotificationCount } from "@/lib/notification-count";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  status: AccountStatus;
  departmentId: string | null;
};

export async function Dashboard({ user }: { user: CurrentUser }) {
  const assetWhere = user.role === RoleName.SUPERADMIN ? {} : assetScopeFor(user);
  const borrowingWhere = user.role === RoleName.USER ? { requesterId: user.id } : user.role === RoleName.ASSET_LIAISON ? { asset: { departmentId: user.departmentId ?? "__unassigned__" } } : {};
  const maintenanceWhere = user.role === RoleName.USER ? { reportedById: user.id } : user.role === RoleName.ASSET_LIAISON ? { asset: { departmentId: user.departmentId ?? "__unassigned__" } } : {};
  const [settings, assetValue, statusGroups, pendingUsers, borrowings, maintenance, unreadNotifications] = await Promise.all([
    getSystemSettings(),
    user.role === RoleName.ASSET_LIAISON ? prisma.asset.aggregate({ where: assetWhere, _sum: { acquisitionCost: true } }) : Promise.resolve(null),
    prisma.asset.groupBy({ by: ["status"], where: assetWhere, _count: { _all: true } }),
    user.role === RoleName.SUPERADMIN ? prisma.user.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
    prisma.borrowingRequest.findMany({ where: borrowingWhere, select: { requestNumber: true, status: true, expectedReturnAt: true, asset: { select: { name: true } }, requester: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.maintenanceRequest.findMany({ where: maintenanceWhere, select: { requestNumber: true, status: true, priority: true, asset: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
    getUnreadNotificationCount(user.id)
  ]);
  const value = assetValue?._sum.acquisitionCost ?? 0;
  const totalAssets = statusGroups.reduce((sum, group) => sum + group._count._all, 0);
  const statusCounts = Object.fromEntries(statusGroups.map((group) => [group.status, group._count._all])) as Partial<Record<AssetStatus, number>>;
  const metrics = user.role === RoleName.SUPERADMIN
    ? [["Total assets", totalAssets], ["Pending user approvals", pendingUsers], ["Unread notices", unreadNotifications]]
    : user.role === RoleName.ASSET_LIAISON
      ? [["Department assets", totalAssets], ["Department asset value", `${settings.currency} ${value.toLocaleString()}`], ["Borrowing approvals", borrowings.filter((b) => b.status === "PENDING_APPROVAL").length], ["Open maintenance", maintenance.filter((m) => m.status !== "COMPLETED" && m.status !== "CLOSED").length]]
      : [["My asset history", totalAssets], ["My active borrowings", borrowings.filter((b) => b.status === "APPROVED" || b.status === "CHECKED_OUT" || b.status === "OVERDUE").length], ["My maintenance requests", maintenance.length], ["Unread notices", unreadNotifications]];
  const activity = [...borrowings.map((item) => `${item.requestNumber} · ${item.status.replaceAll("_", " ")}`), ...maintenance.map((item) => `${item.requestNumber} · ${item.status.replaceAll("_", " ")}`)].slice(0, 8);
  const dashboardTitle = user.role === RoleName.SUPERADMIN ? "System Dashboard" : user.role === RoleName.ASSET_LIAISON ? "Department Dashboard" : "My Dashboard";
  const dashboardSubtitle = user.role === RoleName.SUPERADMIN ? "System-wide assets, approvals, and alerts." : user.role === RoleName.ASSET_LIAISON ? "Assets and requests limited to your assigned department." : "Your assigned assets, requests, maintenance, and notifications.";
  return (
    <div className="space-y-4">
      <Hero title={dashboardTitle} subtitle={dashboardSubtitle} />
      <section className={`grid gap-3 sm:grid-cols-2 ${user.role === RoleName.SUPERADMIN ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}>
        {metrics.map(([label, metricValue]) => <Metric key={label} label={String(label)} value={metricValue} />)}
      </section>
      <section className={user.role === RoleName.SUPERADMIN ? "" : "grid gap-4 lg:grid-cols-3"}>
        <Card className={user.role === RoleName.SUPERADMIN ? "" : "lg:col-span-2"}>
          <h2 className="text-sm font-semibold text-slate-800">Asset Status</h2>
          <AssetStatusChart counts={statusCounts} total={totalAssets} />
        </Card>
        {user.role !== RoleName.SUPERADMIN && <Card>
          <h2 className="text-sm font-semibold text-slate-800">My Recent Activity</h2>
          <div className="mt-4 space-y-3 text-sm">
            {activity.map((item, index) => <p key={`${item}-${index}`} className="border-b border-slate-100 pb-2">{item}</p>)}
            {!activity.length && <p className="text-slate-500">No recent activity.</p>}
          </div>
        </Card>}
      </section>
      <DataTable title={user.role === RoleName.USER ? "My Recent Borrowing" : "Recent Borrowing"} rows={user.role === RoleName.USER ? borrowings.map((b) => [b.requestNumber, b.asset.name, format(b.expectedReturnAt, "dd MMM yyyy"), b.status]) : borrowings.map((b) => [b.requestNumber, b.asset.name, b.requester.name, b.status])} headers={user.role === RoleName.USER ? ["Request", "Asset", "Return", "Status"] : ["Request", "Asset", "Requester", "Status"]} />
      <DataTable title={user.role === RoleName.USER ? "My Maintenance Requests" : "Maintenance Queue"} rows={maintenance.map((m) => [m.requestNumber, m.asset.name, m.priority, m.status])} headers={["Request", "Asset", "Priority", "Status"]} />
    </div>
  );
}

const assetStatusColors: Record<AssetStatus, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "#94a3b8" },
  PENDING_APPROVAL: { label: "Pending approval", color: "#f59e0b" },
  AVAILABLE: { label: "Available", color: "#10b981" },
  ASSIGNED: { label: "Assigned", color: "#3b82f6" },
  BORROWED: { label: "Borrowed", color: "#8b5cf6" },
  UNDER_MAINTENANCE: { label: "Maintenance", color: "#f97316" },
  DAMAGED: { label: "Damaged", color: "#ef4444" },
  MISSING: { label: "Missing", color: "#ec4899" },
  LOST: { label: "Lost", color: "#be123c" },
  TRANSFERRED: { label: "Transferred", color: "#06b6d4" },
  PENDING_DISPOSAL: { label: "Pending disposal", color: "#a16207" },
  DISPOSED: { label: "Disposed", color: "#64748b" },
  ARCHIVED: { label: "Archived", color: "#475569" }
};

function AssetStatusChart({ counts, total }: { counts: Partial<Record<AssetStatus, number>>; total: number }) {
  const slices = Object.entries(assetStatusColors)
    .map(([status, config]) => ({ status: status as AssetStatus, ...config, count: counts[status as AssetStatus] ?? 0 }))
    .filter((slice) => slice.count > 0);
  let angle = -Math.PI / 2;
  const point = (radians: number) => `${120 + 100 * Math.cos(radians)} ${120 + 100 * Math.sin(radians)}`;

  return (
    <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">
      <div className="relative shrink-0">
        <svg viewBox="0 0 240 240" className="h-52 w-52 sm:h-60 sm:w-60" role="img" aria-label={total ? `Asset status pie chart for ${total} assets` : "No assets to chart"}>
          {total === 0 && <circle cx="120" cy="120" r="100" fill="#e2e8f0" />}
          {slices.map((slice) => {
            const start = angle;
            angle += (slice.count / total) * Math.PI * 2;
            return slice.count === total
              ? <circle key={slice.status} cx="120" cy="120" r="100" fill={slice.color} />
              : <path key={slice.status} d={`M 120 120 L ${point(start)} A 100 100 0 ${angle - start > Math.PI ? 1 : 0} 1 ${point(angle)} Z`} fill={slice.color} stroke="white" strokeWidth="2" />;
          })}
        </svg>
      </div>
      {total === 0 ? (
        <p className="text-sm text-slate-500">No assets to display yet.</p>
      ) : (
        <ul className="grid w-full gap-x-8 gap-y-3 sm:grid-cols-2" aria-label="Asset status counts">
          {slices.map((slice) => (
            <li key={slice.status} className="flex items-center gap-3 text-sm text-slate-700">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} aria-hidden="true" />
              <span className="min-w-0 flex-1">{slice.label}</span>
              <span className="font-semibold tabular-nums text-slate-900">{slice.count}</span>
              <span className="w-12 text-right tabular-nums text-slate-500">{Math.round((slice.count / total) * 100)}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export async function AssetsPage({ user, searchParams }: { user: CurrentUser; searchParams: Record<string, string | string[] | undefined> }) {
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const status = typeof searchParams.status === "string" ? searchParams.status : "";
  const assets = await prisma.asset.findMany({
    where: { AND: [assetScopeFor(user), status ? { status: status as AssetStatus } : {}, await assetSearchFilter(q)] },
    include: { category: true, department: true, room: true, assignedUser: true },
    orderBy: { updatedAt: "desc" },
    take: 100
  });
  const visible = user.role === RoleName.USER ? [...assets].sort((a, b) => Number(b.assignedUserId === user.id) - Number(a.assignedUserId === user.id)) : assets;
  const canRegister = can(user, "asset:create");
  const title = user.role === RoleName.USER ? "My Assets" : user.role === RoleName.ASSET_LIAISON ? "Department Asset Register" : "Asset Register";
  const subtitle = user.role === RoleName.USER ? "Assets currently or previously assigned to your account, with current assignments shown first." : user.role === RoleName.ASSET_LIAISON ? "Assets restricted to your assigned department." : "Search, filter, approve, archive, duplicate, export, and inspect asset records.";
  return (
    <div className="space-y-5">
      <Hero title={title} subtitle={subtitle} action={canRegister ? <Link prefetch={false} className="rounded-lg bg-iium-green px-4 py-2.5 text-sm font-semibold text-white shadow-lift hover:bg-iium-deep" href="/assets/new">Register Asset</Link> : undefined} />
      <FilterBar q={q} status={status} />
      <AssetTable assets={visible} personal={user.role === RoleName.USER} currentUserId={user.id} />
    </div>
  );
}

export async function AssetFormPage({ user, initialBarcode = "" }: { user: CurrentUser; initialBarcode?: string }) {
  const departmentScope = user.role === RoleName.ASSET_LIAISON ? { id: user.departmentId ?? "__unassigned__" } : {};
  const kulliyyahScope = user.role === RoleName.ASSET_LIAISON ? { departments: { some: departmentScope } } : {};
  const [categories, kulliyyahs, departments, buildings, rooms, settings, suppliers, fundingSources] = await Promise.all([
    prisma.assetCategory.findMany(),
    prisma.kulliyyah.findMany({ where: { ...kulliyyahScope, active: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { ...departmentScope, active: true, kulliyyah: { active: true } }, include: { kulliyyah: { select: { name: true } } }, orderBy: { name: "asc" } }),
    prisma.building.findMany({ where: { active: true, campus: { active: true } }, include: { campus: { select: { name: true } } }, orderBy: { name: "asc" } }),
    prisma.room.findMany({ where: { active: true, floor: { active: true, building: { active: true, campus: { active: true } } } }, include: { floor: { include: { building: { select: { name: true } } } } }, orderBy: { name: "asc" } }),
    getSystemSettings(), prisma.supplier.findMany(), prisma.fundingSource.findMany()
  ]);
  return (
    <div className="space-y-5">
      <Hero title="Register Asset" subtitle="Scan a barcode or enter the identifier manually, then review and register the asset." />
      <AssetRegistrationForm
        initialBarcode={initialBarcode}
        currency={settings.currency}
        assetTagPrefix={settings.assetTagPrefix}
        options={{
          suppliers: suppliers.map(item => ({ value: item.id, label: item.name })),
          fundingSources: fundingSources.map(item => ({ value: item.id, label: item.name })),
          categories: categories.map((item) => ({ value: item.id, label: item.name })),
          kulliyyahs: kulliyyahs.map((item) => ({ value: item.id, label: item.name })),
          departments: departments.map((item) => ({ value: item.id, label: `${item.kulliyyah.name} / ${item.name}`, parentId: item.kulliyyahId })),
          buildings: buildings.map((item) => ({ value: item.id, label: `${item.campus.name} / ${item.name}` })),
          rooms: rooms.map((item) => ({ value: item.id, label: `${item.floor.building.name} / ${item.floor.name} / ${item.name}`, parentId: item.floor.buildingId }))
        }}
      />
    </div>
  );
}

export async function AssetDetailPage({ id, user }: { id: string; user: CurrentUser }) {
  const [asset, settings] = await Promise.all([
    prisma.asset.findFirst({
      where: { AND: [{ id }, assetScopeFor(user)] },
      include: {
        category: true,
        brand: true, supplier: true, fundingSource: true, custodian: true, verifiedBy: true,
        documents: { select: { id: true, fileName: true, typeLabel: true } },
        department: true,
        assignedUser: { include: { department: true } },
        room: { include: { floor: { include: { building: true } } } },
        assignments: { include: { assignedUser: { include: { department: true } } }, orderBy: { assignmentDate: "desc" } },
        borrowings: true,
        maintenance: true,
        transfers: true,
        verifications: true,
        incidents: true,
        disposals: true
      }
    }),
    getSystemSettings()
  ]);
  if (!asset) return <EmptyState title="Asset not found" body="The selected asset record does not exist." />;
  const assignedByUsers = user.role === RoleName.USER ? [] : await prisma.user.findMany({
    where: { id: { in: [...new Set(asset.assignments.map((assignment) => assignment.assignedById))] } },
    select: { id: true, name: true }
  });
  const assignedByNames = new Map(assignedByUsers.map((assignedBy) => [assignedBy.id, assignedBy.name]));
  const historyRows: Array<[string, number]> = user.role === RoleName.USER
    ? [["My assignments", asset.assignments.filter((item) => item.assignedUserId === user.id).length], ["My borrowings", asset.borrowings.filter((item) => item.requesterId === user.id).length], ["My maintenance reports", asset.maintenance.filter((item) => item.reportedById === user.id).length], ["My incident reports", asset.incidents.filter((item) => item.reportedById === user.id).length]]
    : [["Assignments", asset.assignments.length], ["Borrowings", asset.borrowings.length], ["Transfers", asset.transfers.length], ["Maintenance", asset.maintenance.length], ["Verification checks", asset.verifications.length], ["Incidents", asset.incidents.length], ["Disposals", asset.disposals.length]];
  const recordRows: Array<[string, string | number]> = [["Status", asset.status], ["Condition", asset.condition], ["Borrowable", asset.borrowable ? "Yes" : "No"], ["Serial", asset.serialNumber ?? "-"], ...(user.role === RoleName.USER ? [] : [["Assigned to", asset.assignedUser ? `${asset.assignedUser.name} (${asset.assignedUser.staffNo ?? asset.assignedUser.email})` : "Unassigned"] as [string, string], ["Value", `${settings.currency} ${asset.acquisitionCost.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`] as [string, string]]), ["Location", `${asset.room.floor.building.name} / ${asset.room.name}`]];
  return (
    <div className="space-y-5">
      <Hero title={asset.name} subtitle={`${asset.tagNumber} · ${asset.category.name} · ${asset.department.name}`} action={<div className="flex gap-2">{can(user, "asset:update") && <Link prefetch={false} className="rounded-lg bg-iium-green px-4 py-2 text-sm font-semibold text-white shadow-lift hover:bg-iium-deep" href={`/assets/${asset.id}/edit`}>Edit asset</Link>}<Link prefetch={false} className="rounded-lg border border-iium-green bg-white px-4 py-2 text-sm font-semibold text-iium-green" href={`/api/qr/${asset.id}`}>Open QR</Link></div>} />
      <section className="grid gap-4 lg:grid-cols-3">
        <Card><h2 className="font-semibold">Record</h2><Facts rows={recordRows} /></Card>
        <Card className="lg:col-span-2"><h2 className="font-semibold">{user.role === RoleName.USER ? "My History" : "History"}</h2><Facts rows={historyRows} /></Card>
      </section>
      {user.role !== RoleName.USER && <section className="grid gap-4 lg:grid-cols-2">
       <Card><h2 className="font-semibold">Identification & Procurement</h2><Facts rows={[
        ["Asset type", asset.assetType], ["Brand", asset.brandName ?? asset.brand?.name ?? "?"], ["Model",asset.model ?? "?"],
        ["P.O. number",asset.purchaseOrderNumber ?? "?"],["Invoice",asset.invoiceNumber ?? "?"],["DO / GRN",asset.deliveryOrderNumber ?? "?"],
        ["Vendor",asset.supplier?.name ?? "?"],["Purchase date",asset.acquisitionDate ? format(asset.acquisitionDate,"dd MMM yyyy") : "?"],
        ["Received date",asset.receivedDate ? format(asset.receivedDate,"dd MMM yyyy") : "?"],
        ["Acquisition cost",`RM ${asset.acquisitionCost.toLocaleString("en-MY",{minimumFractionDigits:2,maximumFractionDigits:2})}`],
        ["Funding source",asset.fundingSource?.name ?? "?"],["Grant / project",asset.grantProjectCode ?? "?"],["Legacy reason",asset.legacyRecordReason ?? "?"],
        ["Custodian",asset.custodian?.name ?? "?"]]} /></Card>
       <Card><h2 className="font-semibold">Audit & Verification</h2><Facts rows={[
        ["Last verified",asset.lastVerificationDate ? formatSystemDate(asset.lastVerificationDate,settings.timeZone,true) : "Not verified"],
        ["Verified by",asset.verifiedBy?.name ?? "?"],["Result",asset.verificationResult ?? "?"],
        ["Warranty start",asset.warrantyStartDate ? format(asset.warrantyStartDate,"dd MMM yyyy") : "?"],
        ["Warranty end",asset.warrantyExpiryDate ? format(asset.warrantyExpiryDate,"dd MMM yyyy") : "?"],
        ["Service contract",asset.serviceContract ?? "?"],["Support vendor",asset.supportVendor ?? "?"]]} /></Card>
       <Card className="lg:col-span-2"><details><summary className="cursor-pointer font-semibold">Supporting Records</summary><AttachmentManager assetId={asset.id} initialDocuments={asset.documents} readOnly={!can(user,"asset:update")} /></details></Card>
      </section>}
      {user.role !== RoleName.USER && (asset.assignments.length ? <DataTable title="Assignment History" headers={["Date", "Assigned to", "User ID", "Department", "Assigned by", "Action"]} rows={asset.assignments.map((assignment) => [formatSystemDate(assignment.assignmentDate, settings.timeZone, true), assignment.assignedUser?.name ?? "Unassigned", assignment.assignedUser?.staffNo ?? assignment.assignedUserId ?? "-", assignment.assignedUser?.department?.name ?? "-", assignedByNames.get(assignment.assignedById) ?? "Unknown user", assignment.purpose])} /> : <EmptyState title="No assignment history" body="Assignment and removal actions will appear here for audit purposes." />)}
    </div>
  );
}

export async function GenericModulePage({ title, subtitle, user, kind }: { title: string; subtitle: string; user: CurrentUser; kind: string }) {
  if (!canAccessModule(user.role, kind)) redirect("/unauthorized");
  const rows = await getRows(kind, user);
  const userCopy: Record<string, [string, string]> = {
    borrowings: ["My Borrowing Requests", "Only borrowing requests submitted by you."],
    maintenance: ["My Maintenance Requests", "Maintenance issues reported by you."],
    incidents: ["My Incident Reports", "Asset incidents reported by you."],
    notifications: ["My Notifications", "Alerts and workflow updates addressed to your account."]
  };
  const liaisonCopy: Record<string, [string, string]> = {
    borrowings: ["Department Borrowing", "Borrowing requests for assets in your assigned department."],
    maintenance: ["Department Maintenance", "Maintenance requests for your department’s assets."],
    incidents: ["Department Incidents", "Incident reports for your department’s assets."],
    reports: ["Department Reports", "Reports and exports restricted to your assigned department."]
  };
  const copy = user.role === RoleName.USER ? userCopy[kind] : user.role === RoleName.ASSET_LIAISON ? liaisonCopy[kind] : undefined;
  const scopedTitle = copy?.[0] ?? title;
  const scopedSubtitle = copy?.[1] ?? subtitle;
  return (
    <div className="space-y-5">
      <Hero title={scopedTitle} subtitle={scopedSubtitle} />
      {rows.length ? <DataTable title={`${scopedTitle} Records`} headers={rows[0].headers} rows={rows.map((r) => r.values)} /> : <EmptyState title={`No ${scopedTitle.toLowerCase()} records`} body="There are no records available for your account scope." />}
    </div>
  );
}

async function getRows(kind: string, user: CurrentUser) {
  if (kind === "borrowings") {
    const where = user.role === RoleName.USER ? { requesterId: user.id } : user.role === RoleName.ASSET_LIAISON ? { asset: { departmentId: user.departmentId ?? "__unassigned__" } } : {};
    const data = await prisma.borrowingRequest.findMany({ where, include: { asset: true, requester: true }, take: 50, orderBy: { createdAt: "desc" } });
    return data.map((x) => ({ headers: ["Number", "Asset", "Requester", "Return", "Status"], values: [x.requestNumber, x.asset.name, x.requester.name, format(x.expectedReturnAt, "dd MMM yyyy"), x.status] }));
  }
  if (kind === "transfers") {
    const where = user.role === RoleName.ASSET_LIAISON ? { asset: { departmentId: user.departmentId ?? "__unassigned__" } } : {};
    const data = await prisma.assetTransfer.findMany({ where, include: { asset: true }, take: 50, orderBy: { createdAt: "desc" } });
    return data.map((x) => ({ headers: ["Number", "Asset", "From", "To", "Status"], values: [x.transferNumber, x.asset.name, x.currentLocation, x.newLocation, x.status] }));
  }
  if (kind === "maintenance") {
    const where = user.role === RoleName.USER ? { reportedById: user.id } : user.role === RoleName.ASSET_LIAISON ? { asset: { departmentId: user.departmentId ?? "__unassigned__" } } : {};
    const data = await prisma.maintenanceRequest.findMany({ where, include: { asset: true }, take: 50, orderBy: { createdAt: "desc" } });
    return data.map((x) => ({ headers: ["Number", "Asset", "Type", "Priority", "Status"], values: [x.requestNumber, x.asset.name, x.type, x.priority, x.status] }));
  }
  if (kind === "verification") {
    const where = user.role === RoleName.ASSET_LIAISON ? { asset: { departmentId: user.departmentId ?? "__unassigned__" } } : {};
    const data = await prisma.assetVerification.findMany({ where, include: { asset: true, campaign: true }, take: 50, orderBy: { checkedAt: "desc" } });
    return data.map((x) => ({ headers: ["Campaign", "Asset", "Status", "Checked", "Remarks"], values: [x.campaign.name, x.asset.name, x.status, format(x.checkedAt, "dd MMM yyyy"), x.remarks ?? "-"] }));
  }
  if (kind === "incidents") {
    const where = user.role === RoleName.USER ? { reportedById: user.id } : user.role === RoleName.ASSET_LIAISON ? { asset: { departmentId: user.departmentId ?? "__unassigned__" } } : {};
    const data = await prisma.assetIncident.findMany({ where, include: { asset: true }, take: 50, orderBy: { createdAt: "desc" } });
    return data.map((x) => ({ headers: ["Number", "Asset", "Type", "Discovered", "Status"], values: [x.incidentNumber, x.asset.name, x.type, format(x.discoveredAt, "dd MMM yyyy"), x.status] }));
  }
  if (kind === "disposal") {
    const where = user.role === RoleName.ASSET_LIAISON ? { asset: { departmentId: user.departmentId ?? "__unassigned__" } } : {};
    const data = await prisma.disposalRequest.findMany({ where, include: { asset: true }, take: 50, orderBy: { createdAt: "desc" } });
    return data.map((x) => ({ headers: ["Number", "Asset", "Method", "Condition", "Status"], values: [x.requestNumber, x.asset.name, x.method, x.currentCondition, x.status] }));
  }
  if (kind === "users") {
    const data = await prisma.user.findMany({ include: { department: true }, take: 50, orderBy: { createdAt: "desc" } });
    return data.map((x) => ({ headers: ["Name", "Email", "Role", "Status", "Department"], values: [x.name, x.email, x.role, x.status, x.department?.name ?? "-"] }));
  }
  if (kind === "notifications") {
    const [data, settings] = await Promise.all([
      prisma.notification.findMany({ where: { userId: user.id }, take: 50, orderBy: { createdAt: "desc" } }),
      getSystemSettings()
    ]);
    return data.map((x) => ({ headers: ["Title", "Message", "State", "Created"], values: [x.title, x.message, x.readAt ? "Read" : "Unread", formatSystemDate(x.createdAt, settings.timeZone)] }));
  }
  if (kind === "audit") {
    const [data, settings] = await Promise.all([
      getLatestAuditLogs(),
      getSystemSettings()
    ]);
    return data.map((x) => ({ headers: ["Time", "User", "Action", "Module", "Record", "Record ID", "Old values", "New values"], values: [formatSystemDate(x.createdAt, settings.timeZone, true), x.user?.name ?? "System", x.action, x.module, x.recordType, x.recordId ?? "?", x.previousValues ?? "?", x.newValues ?? "?"] }));
  }
  if (kind === "locations") {
    const data = await prisma.room.findMany({ include: { floor: { include: { building: { include: { campus: true } } } } }, take: 100, orderBy: { name: "asc" } });
    return data.map((x) => ({ headers: ["Campus", "Building", "Floor", "Room", "Code"], values: [x.floor.building.campus.name, x.floor.building.name, x.floor.name, x.name, x.code] }));
  }
  if (kind === "master-data") {
    const data = await prisma.assetCategory.findMany({ include: { _count: { select: { subcategories: true, assets: true } } }, orderBy: { name: "asc" } });
    return data.map((x) => ({ headers: ["Category", "Subcategories", "Assets"], values: [x.name, x._count.subcategories, x._count.assets] }));
  }
  const data = await prisma.asset.findMany({ where: assetScopeFor(user), include: { department: true, room: true }, take: 50, orderBy: { updatedAt: "desc" } });
  return data.map((x) => ({ headers: ["Asset", "Tag", "Department", "Room", "Status"], values: [x.name, x.tagNumber, x.department.name, x.room.name, x.status] }));
}

function Hero({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <section className="flex flex-col justify-between gap-3 py-1 md:flex-row md:items-end">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">{subtitle}</p>
      </div>
      {action}
    </section>
  );
}

function Metric({ label, value, compact }: { label: string; value: string | number; compact?: boolean }) {
  return (
    <Card className={compact ? "p-4 shadow-none" : "relative overflow-hidden p-4"}>
      {!compact && <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-iium-green to-iium-gold" />}
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
    </Card>
  );
}

function DataTable({ title, headers, rows }: { title: string; headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold text-slate-800">{title}</h2></div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500"><tr>{headers.map((h) => <th className="px-5 py-3" key={h}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((row, i) => <tr className="border-t border-slate-100 transition hover:bg-slate-50/70" key={i}>{row.map((cell, j) => <td className="px-5 py-3.5" key={j}>{String(cell).includes("_") ? <Badge tone="gold">{cell}</Badge> : cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </Card>
  );
}

function AssetTable({ assets, personal = false, currentUserId }: { assets: Awaited<ReturnType<typeof prisma.asset.findMany>>; personal?: boolean; currentUserId?: string }) {
  if (!assets.length) return <EmptyState title={personal ? "No assignment history" : "No assets match the filters"} body={personal ? "Assets will appear here after an administrator or Asset Liaison assigns them to your account." : "Adjust filters or register a new asset."} />;
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500"><tr>{["Asset", "Tag", "Category", "Department", "Room", ...(personal ? ["Assignment"] : []), "Borrowable", "Status", "Condition"].map((h) => <th className="px-5 py-3" key={h}>{h}</th>)}</tr></thead>
          <tbody>{assets.map((asset: any) => <tr className="border-t border-slate-100 transition hover:bg-slate-50/70" key={asset.id}><td className="px-5 py-3.5 font-semibold text-iium-deep"><Link prefetch={false} href={`/assets/${asset.id}`}>{asset.name}</Link></td><td className="px-5 py-3.5">{asset.tagNumber}</td><td className="px-5 py-3.5">{asset.category.name}</td><td className="px-5 py-3.5">{asset.department.name}</td><td className="px-5 py-3.5">{asset.room.name}</td>{personal && <td className="px-5 py-3.5"><Badge tone={asset.assignedUserId === currentUserId ? "green" : "slate"}>{asset.assignedUserId === currentUserId ? "CURRENT" : "PREVIOUS"}</Badge></td>}<td className="px-5 py-3.5"><Badge tone={asset.borrowable ? "green" : "slate"}>{asset.borrowable ? "YES" : "NO"}</Badge></td><td className="px-5 py-3.5"><Badge>{asset.status}</Badge></td><td className="px-5 py-3.5">{asset.condition}</td></tr>)}</tbody>
        </table>
      </div>
    </Card>
  );
}

function FilterBar({ q, status }: { q: string; status: string }) {
  return (
    <form className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-glass md:flex-row">
      <input name="q" defaultValue={q} placeholder="Tag, name, serial, P.O., vendor or purchase date (YYYY-MM-DD)" className="flex-1" />
      <select name="status" defaultValue={status}>
        <option value="">All statuses</option>
        {Object.values(AssetStatus).map((s) => <option key={s}>{s}</option>)}
      </select>
      <button className="rounded-xl bg-iium-green px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-iium-green/20 hover:bg-iium-deep">Apply filters</button>
      <Link prefetch={false} className="rounded-xl border border-white/90 bg-white/60 px-4 py-2 text-center text-sm font-medium text-slate-600 hover:bg-white" href="/assets">Clear</Link>
    </form>
  );
}

function Facts({ rows }: { rows: Array<[string, string | number]> }) {
  return <dl className="mt-4 grid gap-3">{rows.map(([k, v]) => <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 text-sm" key={k}><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-800">{v}</dd></div>)}</dl>;
}

function formatSystemDate(value: Date, timeZone: string, includeTime = false) {
  return getDateFormatter("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit" as const, minute: "2-digit" as const, hour12: false } : {}),
    timeZone
  }).format(value);
}

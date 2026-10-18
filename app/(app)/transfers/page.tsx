import { AssetStatus, RequestStatus, RoleName } from "@prisma/client";
import { ArrowRightLeft, MapPin, UserRound } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { TransferCancelAction, TransferRequestForm, TransferReviewActions } from "@/app/(app)/transfers/transfer-actions";

const awaitingStatuses: RequestStatus[] = [RequestStatus.SUBMITTED, RequestStatus.PENDING_APPROVAL];

export default async function Page() {
  const user = await getCurrentUser();
  const transferWhere = user.role === RoleName.USER
    ? { OR: [{ requestedById: user.id }, { currentCustodian: user.id }, { newCustodian: user.id }] }
    : user.role === RoleName.ASSET_LIAISON
      ? { OR: [{ requestedById: user.id }, { asset: { departmentId: user.departmentId ?? "__unassigned__" } }] }
      : {};
  const assetWhere = user.role === RoleName.USER ? { assignedUserId: user.id } : user.role === RoleName.ASSET_LIAISON ? { departmentId: user.departmentId ?? "__unassigned__" } : {};
  const [transfers, assets, rooms] = await Promise.all([
    prisma.assetTransfer.findMany({ where: transferWhere, include: { asset: { include: { room: { include: { floor: { include: { building: true } } } }, assignedUser: { include: { department: true } } } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.asset.findMany({ where: { ...assetWhere, archivedAt: null, status: { notIn: [AssetStatus.BORROWED, AssetStatus.DISPOSED, AssetStatus.MISSING] }, transfers: { none: { status: { in: awaitingStatuses } } } }, include: { room: { include: { floor: { include: { building: true } } } }, assignedUser: { include: { department: true } } }, orderBy: { name: "asc" }, take: 100 }),
    prisma.room.findMany({ where: { active: true, floor: { active: true, building: { active: true } } }, include: { floor: { include: { building: true } } }, orderBy: { name: "asc" } })
  ]);
  const userIds = [...new Set(transfers.flatMap((item) => [item.requestedById, item.currentCustodian, item.newCustodian]).filter((id): id is string => Boolean(id)))];
  const people = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  const peopleById = new Map(people.map((person) => [person.id, person.name]));
  const roomById = new Map(rooms.map((room) => [room.id, `${room.floor.building.name} / ${room.name}`]));
  const isReviewer = can(user, "transfer:approve");
  const ordered = [...transfers].sort((a, b) => transferPriority(a.status) - transferPriority(b.status));

  return (
    <div className="space-y-5">
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-iium-green">Asset workflow</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{user.role === RoleName.USER ? "My Asset Transfers" : user.role === RoleName.ASSET_LIAISON ? "Department Asset Transfers" : "Asset Transfer Management"}</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">Request a location or custody change and track it through administrative approval. Approved transfers update the asset record automatically.</p></div>
      <section className="grid gap-3 sm:grid-cols-3"><Summary label="Awaiting approval" value={transfers.filter((item) => awaitingStatuses.includes(item.status)).length} /><Summary label="Completed" value={transfers.filter((item) => item.status === RequestStatus.COMPLETED).length} /><Summary label="Assets eligible" value={assets.length} /></section>

      <section className="grid gap-5 xl:grid-cols-[minmax(340px,.8fr)_minmax(0,1.2fr)]">
        <Card className="h-fit"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-iium-green/10 text-iium-deep"><ArrowRightLeft className="h-5 w-5" /></span><div><h2 className="font-semibold text-slate-900">New transfer request</h2><p className="text-xs text-slate-500">Select an asset and the change required.</p></div></div><div className="mt-5">{assets.length ? <TransferRequestForm assets={assets.map((asset) => ({ id: asset.id, tagNumber: asset.tagNumber, name: asset.name, roomId: asset.roomId, roomLabel: `${asset.room.floor.building.name} / ${asset.room.name}`, assignedUser: asset.assignedUser ? { id: asset.assignedUser.id, name: asset.assignedUser.name, email: asset.assignedUser.email, staffNo: asset.assignedUser.staffNo, department: asset.assignedUser.department ? { name: asset.assignedUser.department.name } : null } : null }))} rooms={rooms.map((room) => ({ id: room.id, label: `${room.floor.building.name} / ${room.name} (${room.code})` }))} /> : <EmptyState title="No assets eligible for transfer" body="Assets with an active transfer request are excluded until that request is decided." />}</div></Card>

        <section className="space-y-3"><div><h2 className="font-semibold text-slate-900">{isReviewer ? "Transfer review queue" : "My transfer history"}</h2><p className="text-xs text-slate-500">{isReviewer ? "Approval applies the destination and custodian changes immediately." : "Your submitted and received asset transfers appear here."}</p></div>{ordered.length ? <div className="grid gap-4">{ordered.map((transfer) => {
          const fromLocation = roomById.get(transfer.currentLocation) ?? transfer.currentLocation;
          const toLocation = roomById.get(transfer.newLocation) ?? transfer.newLocation;
          const fromCustodian = transfer.currentCustodian ? peopleById.get(transfer.currentCustodian) ?? transfer.currentCustodian : "Unassigned";
          const toCustodian = transfer.newCustodian ? peopleById.get(transfer.newCustodian) ?? transfer.newCustodian : fromCustodian;
          const awaiting = awaitingStatuses.includes(transfer.status);
          return <Card key={transfer.id}><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{transfer.asset.name}</h3><p className="mt-0.5 text-xs text-slate-500">{transfer.transferNumber} · {transfer.asset.tagNumber}</p><p className="mt-1 text-xs font-medium text-iium-deep">Requested by {peopleById.get(transfer.requestedById) ?? "Unknown user"}</p></div><StatusBadge status={transfer.status} /></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><ChangeRow icon={MapPin} label="Location" from={fromLocation} to={toLocation} /><ChangeRow icon={UserRound} label="Custodian" from={fromCustodian} to={toCustodian} /></div><div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><span className="font-semibold text-slate-700">Reason:</span> {transfer.reason}</div>{transfer.rejectionReason && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"><strong>Rejection reason:</strong> {transfer.rejectionReason}</p>}{isReviewer && awaiting ? <TransferReviewActions transferId={transfer.id} /> : awaiting && transfer.requestedById === user.id ? <TransferCancelAction transferId={transfer.id} /> : null}</Card>;
        })}</div> : <EmptyState title="No transfer requests" body="New requests within your account scope will appear here." />}</section>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) { return <Card className="relative overflow-hidden p-4"><span className="absolute inset-y-0 left-0 w-1 bg-iium-green" /><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></Card>; }
function StatusBadge({ status }: { status: RequestStatus }) { const tone = status === RequestStatus.COMPLETED || status === RequestStatus.APPROVED ? "green" : status === RequestStatus.REJECTED || status === RequestStatus.CANCELLED ? "red" : "gold"; return <Badge tone={tone}>{status.replaceAll("_", " ")}</Badge>; }
function ChangeRow({ icon: Icon, label, from, to }: { icon: React.ComponentType<{ className?: string }>; label: string; from: string; to: string }) { const unchanged = from === to; return <div className="rounded-lg border border-slate-100 p-3"><p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Icon className="h-3.5 w-3.5" />{label}</p><p className="mt-2 text-xs text-slate-400">From</p><p className="mt-0.5 text-sm font-medium text-slate-700">{from}</p><p className="mt-2 text-xs text-slate-400">{unchanged ? "Unchanged" : "To"}</p><p className={`mt-0.5 text-sm font-semibold ${unchanged ? "text-slate-500" : "text-iium-deep"}`}>{to}</p></div>; }
function transferPriority(status: RequestStatus) { return awaitingStatuses.includes(status) ? 0 : status === RequestStatus.COMPLETED ? 1 : 2; }

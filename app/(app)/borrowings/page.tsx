import { getDateFormatter } from "@/lib/date-formatter";
import { RequestStatus, RoleName } from "@prisma/client";
import Link from "next/link";
import { Badge, Card, EmptyState } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { getSystemSettings } from "@/lib/settings";
import { BorrowingReviewActions, BorrowRequestForm } from "@/app/(app)/borrowings/borrowing-actions";

const activeRequestStatuses = [RequestStatus.SUBMITTED, RequestStatus.PENDING_APPROVAL, RequestStatus.APPROVED, RequestStatus.CHECKED_OUT];

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const requestedPage = Number((await searchParams).page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 10000) : 1;
  const pageSize = 20;
  const user = await getCurrentUser();
  const requestWhere = user.role === RoleName.USER ? { requesterId: user.id } : user.role === RoleName.ASSET_LIAISON ? { asset: { departmentId: user.departmentId ?? "__unassigned__" } } : {};
  const [requests, catalog, settings] = await Promise.all([
    prisma.borrowingRequest.findMany({ where: requestWhere, select: { id: true, status: true, requestNumber: true, startDate: true, expectedReturnAt: true, purpose: true, rejectionReason: true, asset: { select: { name: true, tagNumber: true } }, requester: { select: { name: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize + 1 }),
    user.role === RoleName.USER ? prisma.asset.findMany({ where: { borrowable: true, status: "AVAILABLE", borrowings: { none: { requesterId: user.id, status: { in: activeRequestStatuses } } } }, select: { id: true, name: true, tagNumber: true, category: { select: { name: true } }, department: { select: { name: true } }, room: { select: { name: true } } }, orderBy: { name: "asc" }, take: 100 }) : Promise.resolve([]),
    getSystemSettings()
  ]);
  const hasNextPage = requests.length > pageSize;
  const visibleRequests = requests.slice(0, pageSize);
  const orderedRequests = [...visibleRequests].sort((a, b) => requestPriority(a.status) - requestPriority(b.status));
  const isReviewer = user.role !== RoleName.USER;
  return (
    <div className="space-y-5">
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-iium-green">Asset workflow</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{isReviewer ? user.role === RoleName.ASSET_LIAISON ? "Department Borrowing Requests" : "Borrowing Management" : "My Borrowing"}</h1><p className="mt-1 text-sm text-slate-500">{isReviewer ? "Review requests and manage the approval, checkout, and return lifecycle." : "Browse borrowable assets, submit requests, and track their approval status."}</p></div>
      <p className="text-xs text-slate-500">Page {page} · Request counts below refer to this page.</p>
      <section className="grid gap-3 sm:grid-cols-3"><Summary label={isReviewer ? "Awaiting review" : "My requests"} value={isReviewer ? visibleRequests.filter((item) => item.status === RequestStatus.PENDING_APPROVAL || item.status === RequestStatus.SUBMITTED).length : visibleRequests.length} /><Summary label={isReviewer ? "Approved" : "Approved / checked out"} value={visibleRequests.filter((item) => item.status === RequestStatus.APPROVED || item.status === RequestStatus.CHECKED_OUT).length} /><Summary label={isReviewer ? "Checked out" : "Available to request"} value={isReviewer ? visibleRequests.filter((item) => item.status === RequestStatus.CHECKED_OUT || item.status === RequestStatus.OVERDUE).length : catalog.length} /></section>

      {!isReviewer && <section className="space-y-3"><div><h2 className="font-semibold text-slate-900">Borrowable asset catalogue</h2><p className="text-xs text-slate-500">Only assets explicitly marked borrowable and currently available are shown.</p></div>{catalog.length ? <div className="grid gap-4 xl:grid-cols-2">{catalog.map((asset) => <Card key={asset.id}><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-iium-deep">{asset.name}</h3><p className="mt-1 text-xs text-slate-500">{asset.tagNumber} · {asset.category.name}</p><p className="mt-1 text-xs text-slate-400">{asset.department.name} · {asset.room.name}</p></div><Badge>AVAILABLE</Badge></div><BorrowRequestForm assetId={asset.id} maxDays={Number(settings.maxBorrowingDays)} /></Card>)}</div> : <EmptyState title="No assets available to borrow" body="Borrowable assets will appear here when their status is available." />}</section>}

      <section className="space-y-3"><div><h2 className="font-semibold text-slate-900">{isReviewer ? "Request queue" : "My request history"}</h2><p className="text-xs text-slate-500">{isReviewer ? "Actions are displayed only when valid for the current request status." : "All requests submitted from your account."}</p></div>{orderedRequests.length ? <div className="grid gap-4 xl:grid-cols-2">{orderedRequests.map((request) => <Card key={request.id}><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{request.asset.name}</h3><p className="text-xs text-slate-500">{request.requestNumber} · {request.asset.tagNumber}</p>{isReviewer && <p className="mt-1 text-xs font-medium text-iium-deep">Requested by {request.requester.name}</p>}</div><StatusBadge status={request.status} /></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-400">Start date</dt><dd className="mt-1 font-semibold text-slate-700">{formatDate(request.startDate)}</dd></div><div><dt className="text-slate-400">Expected return</dt><dd className="mt-1 font-semibold text-slate-700">{formatDate(request.expectedReturnAt)}</dd></div><div className="col-span-2"><dt className="text-slate-400">Purpose</dt><dd className="mt-1 text-sm text-slate-700">{request.purpose}</dd></div>{request.rejectionReason && <div className="col-span-2 rounded-lg bg-rose-50 p-3 text-rose-700"><dt className="font-semibold">Review note</dt><dd className="mt-1">{request.rejectionReason}</dd></div>}</dl>{isReviewer && <BorrowingReviewActions requestId={request.id} status={request.status} />}</Card>)}</div> : <EmptyState title="No borrowing requests" body={isReviewer ? "Submitted requests within your scope will appear here." : "Your submitted borrowing requests will appear here."} />}</section>
      <nav aria-label="Borrowing request pages" className="flex items-center justify-between text-sm font-semibold text-iium-deep">{page > 1 ? <Link prefetch={false} href={`/borrowings?page=${page - 1}`}>← Previous</Link> : <span />}{hasNextPage && <Link prefetch={false} href={`/borrowings?page=${page + 1}`}>Next →</Link>}</nav>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) { return <Card className="relative overflow-hidden p-4"><span className="absolute inset-y-0 left-0 w-1 bg-iium-green" /><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></Card>; }
function StatusBadge({ status }: { status: RequestStatus }) { const tone = status === "APPROVED" || status === "COMPLETED" || status === "RETURNED" ? "green" : status === "REJECTED" || status === "OVERDUE" ? "red" : status === "PENDING_APPROVAL" || status === "SUBMITTED" ? "gold" : "slate"; return <Badge tone={tone}>{status.replaceAll("_", " ")}</Badge>; }
function requestPriority(status: RequestStatus) { return status === "PENDING_APPROVAL" || status === "SUBMITTED" ? 0 : status === "APPROVED" ? 1 : status === "CHECKED_OUT" || status === "OVERDUE" ? 2 : 3; }
function formatDate(value: Date) { return getDateFormatter("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(value); }

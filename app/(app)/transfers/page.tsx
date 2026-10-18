import { AssetStatus, RequestStatus, RoleName } from "@prisma/client";
import { TransfersView } from "@/components/transfers-view";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const awaitingStatuses: RequestStatus[] = [
  RequestStatus.SUBMITTED,
  RequestStatus.PENDING_APPROVAL,
];

export default async function Page() {
  const user = await getCurrentUser();
  const transferWhere =
    user.role === RoleName.USER
      ? {
          OR: [
            { requestedById: user.id },
            { currentCustodian: user.id },
            { newCustodian: user.id },
          ],
        }
      : user.role === RoleName.ASSET_LIAISON
        ? {
            OR: [
              { requestedById: user.id },
              {
                asset: { departmentId: user.departmentId ?? "__unassigned__" },
              },
            ],
          }
        : {};
  const assetWhere =
    user.role === RoleName.USER
      ? { assignedUserId: user.id }
      : user.role === RoleName.ASSET_LIAISON
        ? { departmentId: user.departmentId ?? "__unassigned__" }
        : {};
  const [transfers, assets, rooms] = await Promise.all([
    prisma.assetTransfer.findMany({
      where: transferWhere,
      include: {
        asset: {
          include: {
            room: { include: { floor: { include: { building: true } } } },
            assignedUser: { include: { department: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.asset.findMany({
      where: {
        ...assetWhere,
        archivedAt: null,
        status: {
          notIn: [
            AssetStatus.BORROWED,
            AssetStatus.DISPOSED,
            AssetStatus.MISSING,
          ],
        },
        transfers: { none: { status: { in: awaitingStatuses } } },
      },
      include: {
        room: { include: { floor: { include: { building: true } } } },
        assignedUser: { include: { department: true } },
      },
      orderBy: { name: "asc" },
      take: 100,
    }),
    prisma.room.findMany({
      where: {
        active: true,
        floor: { active: true, building: { active: true } },
      },
      include: { floor: { include: { building: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const userIds = [
    ...new Set(
      transfers
        .flatMap((item) => [
          item.requestedById,
          item.currentCustodian,
          item.newCustodian,
        ])
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const people = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  return (
    <TransfersView
      data={{
        user: { ...user, status: "ACTIVE" },
        transfers,
        assets,
        rooms,
        people,
      }}
    />
  );
}

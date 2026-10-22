import type { Database, EdgeUser } from "./types";

export function scope(
  user: EdgeUser,
  alias = "a",
): { sql: string; values: unknown[] } {
  if (user.role === "SUPERADMIN") return { sql: "1=1", values: [] };
  return user.role === "USER"
    ? { sql: `${alias}.assignedUserId = ?`, values: [user.id] }
    : {
        sql: `${alias}.departmentId = ?`,
        values: [user.departmentId ?? "__unassigned__"],
      };
}

export async function transferData(db: Database, user: EdgeUser, url: URL) {
  const page =
    Math.min(100000, Math.max(0, Number(url.searchParams.get("page")) || 0)) |
    0;
  const search = (url.searchParams.get("q") ?? "").trim().slice(0,100);
  const roomSearch = (url.searchParams.get("room") ?? "").trim().slice(0,100);
  const assetScope = scope(user);
  const history =
    user.role === "USER"
      ? {
          sql: "(t.requestedById = ? OR t.currentCustodian = ? OR t.newCustodian = ?)",
          values: [user.id, user.id, user.id],
        }
      : user.role === "ASSET_LIAISON"
        ? {
            sql: "(t.requestedById = ? OR a.departmentId = ?)",
            values: [user.id, user.departmentId ?? "__unassigned__"],
          }
        : { sql: "1=1", values: [] };
  const eligible = `${assetScope.sql} AND a.archivedAt IS NULL AND a.status NOT IN ('BORROWED','DISPOSED','MISSING')
    AND NOT EXISTS (SELECT 1 FROM AssetTransfer t WHERE t.assetId = a.id AND t.status IN ('SUBMITTED','PENDING_APPROVAL'))`;
  const results = await db.batch([
    db
      .prepare(
        `SELECT t.id, t.transferNumber, t.status, t.currentLocation, t.newLocation, t.currentCustodian, t.newCustodian,
      t.requestedById, t.reason, t.rejectionReason, a.name AS assetName, a.tagNumber,
      requester.name AS requesterName, previous.name AS previousName, next.name AS nextName,
      CASE WHEN fr.id IS NULL THEN t.currentLocation ELSE fb.name || ' / ' || fr.name END AS fromLabel,
      CASE WHEN tr.id IS NULL THEN t.newLocation ELSE tb.name || ' / ' || tr.name END AS toLabel
      FROM AssetTransfer t JOIN Asset a ON a.id = t.assetId
      LEFT JOIN User requester ON requester.id = t.requestedById LEFT JOIN User previous ON previous.id = t.currentCustodian LEFT JOIN User next ON next.id = t.newCustodian
      LEFT JOIN Room fr ON fr.id = t.currentLocation LEFT JOIN Floor ff ON ff.id = fr.floorId LEFT JOIN Building fb ON fb.id = ff.buildingId
      LEFT JOIN Room tr ON tr.id = t.newLocation LEFT JOIN Floor tf ON tf.id = tr.floorId LEFT JOIN Building tb ON tb.id = tf.buildingId
      WHERE ${history.sql}
      ORDER BY CASE WHEN t.status IN ('SUBMITTED','PENDING_APPROVAL') THEN 0 WHEN t.status = 'COMPLETED' THEN 1 ELSE 2 END,
      CASE WHEN typeof(t.createdAt) = 'integer' THEN t.createdAt ELSE unixepoch(t.createdAt)*1000 END DESC, t.id DESC LIMIT 20 OFFSET ?`,
      )
      .bind(...history.values, page * 20),
    db
      .prepare(
        `SELECT COUNT(*) AS total, COALESCE(SUM(t.status IN ('SUBMITTED','PENDING_APPROVAL')),0) AS awaiting,
      COALESCE(SUM(t.status = 'COMPLETED'),0) AS completed FROM AssetTransfer t JOIN Asset a ON a.id = t.assetId WHERE ${history.sql}`,
      )
      .bind(...history.values),
    db
      .prepare(
        `SELECT a.id, a.name, a.tagNumber, a.roomId, r.name AS roomName, b.name AS buildingName,
      u.id AS userId, u.name AS userName, u.email, u.staffNo, d.name AS departmentName
      FROM Asset a JOIN Room r ON r.id = a.roomId JOIN Floor f ON f.id = r.floorId JOIN Building b ON b.id = f.buildingId
      LEFT JOIN User u ON u.id = a.assignedUserId LEFT JOIN Department d ON d.id = u.departmentId
      WHERE ${eligible} AND (instr(lower(a.name),lower(?))>0 OR instr(lower(a.tagNumber),lower(?))>0) ORDER BY a.name, a.id LIMIT 100`,
      )
      .bind(...assetScope.values, search, search),
    db
      .prepare(`SELECT COUNT(*) AS total FROM Asset a WHERE ${eligible}`)
      .bind(...assetScope.values),
    db
      .prepare(
        `SELECT r.id, r.name, r.code, b.name AS buildingName FROM Room r JOIN Floor f ON f.id = r.floorId JOIN Building b ON b.id = f.buildingId
      WHERE r.active = 1 AND f.active = 1 AND b.active = 1 AND (instr(lower(r.name),lower(?))>0 OR instr(lower(r.code),lower(?))>0 OR instr(lower(b.name),lower(?))>0)
      ORDER BY r.name, r.id LIMIT 100`,
      )
      .bind(roomSearch, roomSearch, roomSearch),
    db.prepare(
      "SELECT key, value FROM SystemSetting WHERE key IN ('systemName','organisationName','appIconVersion','pwaEnabled')",
    ),
    db
      .prepare(
        "SELECT COUNT(*) AS total FROM Notification WHERE userId = ? AND readAt IS NULL",
      )
      .bind(user.id),
  ]);
  // Query columns above are the complete public DTO. Never serialize whole users/assets.
  type Row = Record<string, any>;
  const rows = (index: number) => results[index].results as Row[];
  const transfers = rows(0).map((t) => ({
    ...t,
    asset: { name: t.assetName, tagNumber: t.tagNumber },
    currentLocation: t.fromLabel,
    newLocation: t.toLabel,
  }));
  const people = rows(0)
    .flatMap((t) => [
      { id: t.requestedById, name: t.requesterName },
      { id: t.currentCustodian, name: t.previousName },
      { id: t.newCustodian, name: t.nextName },
    ])
    .filter((p) => p.id && p.name);
  return {
    user,
    transfers,
    people,
    assets: rows(2).map((a) => ({
      id: a.id,
      name: a.name,
      tagNumber: a.tagNumber,
      roomId: a.roomId,
      room: { name: a.roomName, floor: { building: { name: a.buildingName } } },
      assignedUser: a.userId
        ? {
            id: a.userId,
            name: a.userName,
            email: a.email,
            staffNo: a.staffNo,
            department: a.departmentName ? { name: a.departmentName } : null,
          }
        : null,
    })),
    rooms: rows(4).map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      floor: { building: { name: r.buildingName } },
    })),
    counts: { ...rows(1)[0], eligible: rows(3)[0].total },
    page,
    settings: Object.fromEntries(rows(5).map((s) => [s.key, s.value])),
    unreadNotifications: rows(6)[0].total,
  };
}

export async function searchUsers(db: Database, user: EdgeUser, query: string) {
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return { users: [] };
  const department =
    user.role === "ASSET_LIAISON" ? "AND u.departmentId = ?" : "";
  const result = await db
    .prepare(
      `SELECT u.id, u.name, u.email, u.staffNo, d.name AS departmentName FROM User u LEFT JOIN Department d ON d.id = u.departmentId
    WHERE u.status = 'ACTIVE' ${department} AND (instr(lower(u.name),lower(?)) > 0 OR instr(lower(u.email),lower(?)) > 0 OR instr(lower(u.staffNo),lower(?)) > 0)
    ORDER BY u.name, u.id LIMIT 10`,
    )
    .bind(
      ...(department ? [user.departmentId ?? "__unassigned__"] : []),
      q,
      q,
      q,
    )
    .all<Record<string, unknown>>();
  return {
    users: result.results.map(({ departmentName, ...person }) => ({
      ...person,
      department: departmentName ? { name: departmentName } : null,
    })),
  };
}

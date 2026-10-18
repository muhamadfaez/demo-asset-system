import { json } from "./auth";
import { scope } from "./transfers-read";
import type { Database, EdgeUser, Statement } from "./types";

type Asset = {
  id: string;
  tagNumber: string;
  roomId: string;
  roomName: string;
  assignedUserId: string | null;
  assignedName: string | null;
  departmentId: string;
  status: string;
  borrowable: number;
  archivedAt: unknown;
};
type Room = { id: string; buildingId: string };
type Person = {
  id: string;
  departmentId: string | null;
  kulliyyahId: string | null;
};
type Transfer = {
  id: string;
  assetId: string;
  requestedById: string;
  transferNumber: string;
  currentLocation: string;
  newLocation: string;
  currentCustodian: string | null;
  newCustodian: string | null;
  status: string;
};
const pending = "('SUBMITTED','PENDING_APPROVAL')";
const allowedAsset =
  "a.archivedAt IS NULL AND a.status NOT IN ('BORROWED','DISPOSED','MISSING')";
const uid = () => crypto.randomUUID();
const text = (value: unknown, max: number) =>
  typeof value === "string" && value.length <= max ? value.trim() : "";

function audit(
  db: Database,
  auditId: string,
  user: EdgeUser,
  action: string,
  id: string,
  previous: unknown,
  next: unknown,
  now: number,
) {
  return db
    .prepare(
      `INSERT INTO AuditLog (id,userId,action,module,recordType,recordId,previousValues,newValues,success,createdAt)
    SELECT ?,?,?,'Transfers','AssetTransfer',?,?,?,1,? WHERE changes() = 1`,
    )
    .bind(
      auditId,
      user.id,
      action,
      id,
      previous ? JSON.stringify(previous) : null,
      JSON.stringify(next),
      now,
    );
}
function notification(
  db: Database,
  auditId: string,
  userId: string,
  title: string,
  message: string,
  href: string,
  now: number,
) {
  return db
    .prepare(
      `INSERT INTO Notification (id,userId,title,message,href,createdAt) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM AuditLog WHERE id=?)`,
    )
    .bind(uid(), userId, title, message, href, now, auditId);
}
function assetQuery(db: Database, id: string) {
  return db
    .prepare(
      `SELECT a.id,a.tagNumber,a.roomId,a.assignedUserId,a.departmentId,a.status,a.borrowable,a.archivedAt,r.name AS roomName,u.name AS assignedName
    FROM Asset a JOIN Room r ON r.id=a.roomId LEFT JOIN User u ON u.id=a.assignedUserId WHERE a.id=?`,
    )
    .bind(id)
    .first<Asset>();
}
function accessible(user: EdgeUser, asset: Asset) {
  return (
    user.role === "SUPERADMIN" ||
    (user.role === "USER"
      ? asset.assignedUserId === user.id
      : asset.departmentId === user.departmentId)
  );
}
function transferable(asset: Asset) {
  return (
    asset.archivedAt == null &&
    !["BORROWED", "DISPOSED", "MISSING"].includes(asset.status)
  );
}
function roomQuery(db: Database, value: string, legacy = false) {
  return db
    .prepare(
      `SELECT r.id,f.buildingId FROM Room r JOIN Floor f ON f.id=r.floorId JOIN Building b ON b.id=f.buildingId
    WHERE (r.id=? ${legacy ? "OR r.name=?" : ""}) AND r.active=1 AND f.active=1 AND b.active=1 ORDER BY r.id=? DESC LIMIT 1`,
    )
    .bind(value, ...(legacy ? [value] : []), value)
    .first<Room>();
}
function personQuery(db: Database, value: string | null, legacy = false) {
  return value
    ? db
        .prepare(
          `SELECT u.id,u.departmentId,d.kulliyyahId FROM User u LEFT JOIN Department d ON d.id=u.departmentId
    WHERE (u.id=? ${legacy ? "OR u.name=?" : ""}) AND u.status='ACTIVE' ORDER BY u.id=? DESC LIMIT 1`,
        )
        .bind(value, ...(legacy ? [value] : []), value)
        .first<Person>()
    : Promise.resolve(null);
}

// D1 batch is a database transaction. A conditional first write is the CAS gate;
// changes() gates the audit marker, and all other side effects require that marker.
// No partially approved asset, duplicate notification or duplicate assignment on replay.
export async function writeTransfer(
  request: Request,
  db: Database,
  user: EdgeUser,
) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "JSON required" }, 415);
  const reader = request.body?.getReader();
  if (!reader) return json({ error: "Request body required" }, 400);
  let raw = "";
  let size = 0;
  const decoder = new TextDecoder();
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 8192) {
      await reader.cancel();
      return json({ error: "Request too large" }, 413);
    }
    raw += decoder.decode(chunk.value, { stream: true });
  }
  raw += decoder.decode();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  return request.method === "POST"
    ? submit(db, user, body)
    : decide(db, user, body);
}

async function submit(
  db: Database,
  user: EdgeUser,
  body: Record<string, unknown>,
) {
  const assetId = text(body.assetId, 200),
    reason = text(body.reason, 1000);
  if (
    !assetId ||
    reason.length < 8 ||
    !["LOCATION", "CUSTODIAN", "BOTH"].includes(String(body.transferType))
  )
    return json(
      {
        error:
          "Select an asset, transfer type and a reason of 8–1000 characters",
      },
      400,
    );
  const asset = await assetQuery(db, assetId);
  if (!asset || !accessible(user, asset))
    return json(
      { error: "Asset not available within your transfer scope" },
      404,
    );
  if (!transferable(asset))
    return json({ error: "This asset cannot currently be transferred" }, 409);
  const location = body.transferType !== "CUSTODIAN";
  const custody = body.transferType !== "LOCATION";
  const roomId = location ? text(body.newRoomId, 200) : asset.roomId;
  const personId = custody
    ? text(body.newCustodianId, 200)
    : asset.assignedUserId;
  if (!roomId || (custody && !personId))
    return json(
      {
        error:
          "Select the destination and assigned user required by the transfer type",
      },
      400,
    );
  const [room, person] = await Promise.all([
    roomQuery(db, roomId),
    personQuery(db, personId),
  ]);
  if (!room || (personId && !person))
    return json(
      { error: "Select an active destination room and assigned user" },
      400,
    );
  if (
    user.role === "ASSET_LIAISON" &&
    person &&
    person.departmentId !== user.departmentId
  )
    return json(
      { error: "Assigned users must be within your department" },
      403,
    );
  if (room.id === asset.roomId && personId === asset.assignedUserId)
    return json(
      { error: "The destination and assigned user are unchanged" },
      400,
    );
  const id = uid(),
    auditId = uid(),
    now = Date.now(),
    transferNumber = `TR-${now}-${id.slice(0, 8)}`;
  const transfer = {
    id,
    transferNumber,
    assetId,
    currentLocation: asset.roomId,
    newLocation: room.id,
    currentCustodian: asset.assignedUserId,
    newCustodian: personId,
    reason,
    requestedById: user.id,
    status: "PENDING_APPROVAL",
  };
  const access = scope(user);
  const result = await db.batch([
    db
      .prepare(
        `INSERT INTO AssetTransfer (id,transferNumber,assetId,currentLocation,newLocation,currentCustodian,newCustodian,reason,requestedById,status,createdAt)
      SELECT ?,?,?,?,?,?,?,?,?,'PENDING_APPROVAL',? FROM Asset a WHERE a.id=? AND ${access.sql} AND ${allowedAsset}
      AND a.roomId=? AND a.assignedUserId IS ?
      AND EXISTS (SELECT 1 FROM Room r JOIN Floor f ON f.id=r.floorId JOIN Building b ON b.id=f.buildingId WHERE r.id=? AND r.active=1 AND f.active=1 AND b.active=1)
      AND (? IS NULL OR EXISTS (SELECT 1 FROM User WHERE id=? AND status='ACTIVE' AND (? != 'ASSET_LIAISON' OR departmentId=?)))
      AND NOT EXISTS (SELECT 1 FROM AssetTransfer WHERE assetId=a.id AND status IN ${pending})`,
      )
      .bind(
        id,
        transferNumber,
        assetId,
        asset.roomId,
        room.id,
        asset.assignedUserId,
        personId,
        reason,
        user.id,
        now,
        assetId,
        ...access.values,
        asset.roomId,
        asset.assignedUserId,
        room.id,
        personId,
        personId,
        user.role,
        user.departmentId,
      ),
    audit(db, auditId, user, "SUBMIT", id, null, transfer, now),
    db
      .prepare(
        `INSERT INTO Notification (id,userId,title,message,href,createdAt)
      SELECT lower(hex(randomblob(16))),u.id,'Asset transfer awaiting review',?,'/transfers',? FROM User u
      WHERE u.status='ACTIVE' AND (u.role='SUPERADMIN' OR (u.role='ASSET_LIAISON' AND u.departmentId=?)) AND EXISTS (SELECT 1 FROM AuditLog WHERE id=?)`,
      )
      .bind(
        `${transferNumber} for ${asset.tagNumber} is ready for review.`,
        now,
        asset.departmentId,
        auditId,
      ),
  ]);
  return result[0].meta.changes === 1
    ? json({ transfer }, 201)
    : json(
        {
          error:
            "The asset changed or already has a transfer awaiting approval. Refresh and try again.",
        },
        409,
      );
}

async function decide(
  db: Database,
  user: EdgeUser,
  body: Record<string, unknown>,
) {
  const id = text(body.id, 200),
    decision = text(body.decision, 20),
    reason = text(body.reason, 500);
  if (
    !id ||
    !["approve", "reject", "cancel"].includes(decision) ||
    (decision === "reject" && !reason) ||
    (body.reason != null && (!reason || typeof body.reason !== "string"))
  )
    return json({ error: "Invalid transfer action or rejection reason" }, 400);
  const existing = await db
    .prepare("SELECT * FROM AssetTransfer WHERE id=?")
    .bind(id)
    .first<Transfer>();
  if (!existing) return json({ error: "Transfer request not found" }, 404);
  if (!["SUBMITTED", "PENDING_APPROVAL"].includes(existing.status))
    return json({ error: "This transfer has already been decided" }, 409);
  const asset = await assetQuery(db, existing.assetId);
  if (!asset) return json({ error: "Asset not found" }, 404);
  if (
    decision === "cancel"
      ? existing.requestedById !== user.id
      : user.role === "USER" || !accessible(user, asset)
  )
    return json({ error: "Forbidden" }, 403);
  if (decision !== "cancel" && !transferable(asset))
    return json({ error: "This asset cannot currently be transferred" }, 409);
  const now = Date.now(),
    auditId = uid();
  const access = scope(user);
  const guard =
    decision === "cancel"
      ? "requestedById=?"
      : `EXISTS (SELECT 1 FROM Asset a WHERE a.id=AssetTransfer.assetId AND ${access.sql} AND ${allowedAsset})`;
  const guardValues = decision === "cancel" ? [user.id] : access.values;
  if (decision !== "approve") {
    const next = {
      status: decision === "cancel" ? "CANCELLED" : "REJECTED",
      ...(decision === "reject"
        ? { rejectionReason: reason, approvedById: user.id, approvedAt: now }
        : {}),
    };
    const statements = [
      db
        .prepare(
          `UPDATE AssetTransfer SET status=? ${decision === "reject" ? ",rejectionReason=?,approvedById=?,approvedAt=?" : ""} WHERE id=? AND status IN ${pending} AND ${guard}`,
        )
        .bind(
          next.status,
          ...(decision === "reject" ? [reason, user.id, now] : []),
          id,
          ...guardValues,
        ),
      audit(
        db,
        auditId,
        user,
        decision === "cancel" ? "CANCEL" : "REJECT",
        id,
        existing,
        { ...existing, ...next },
        now,
      ),
    ];
    if (decision === "reject")
      statements.push(
        notification(
          db,
          auditId,
          existing.requestedById,
          "Asset transfer rejected",
          reason,
          "/transfers",
          now,
        ),
      );
    const result = await db.batch(statements);
    return result[0].meta.changes === 1
      ? json({ transfer: { ...existing, ...next } })
      : json(
          { error: "The transfer or asset changed. Refresh and try again." },
          409,
        );
  }
  if (
    !(
      existing.currentLocation === asset.roomId ||
      existing.currentLocation === asset.roomName
    ) ||
    !(
      existing.currentCustodian === asset.assignedUserId ||
      existing.currentCustodian === asset.assignedName ||
      (!existing.currentCustodian && !asset.assignedUserId)
    )
  )
    return json(
      {
        error:
          "Asset location or assigned user changed after submission. Reject and create a new transfer.",
      },
      409,
    );
  const [room, person] = await Promise.all([
    roomQuery(db, existing.newLocation, true),
    personQuery(db, existing.newCustodian, true),
  ]);
  if (!room || (existing.newCustodian && !person))
    return json(
      { error: "Destination room or assigned user is no longer active" },
      409,
    );
  if (
    user.role === "ASSET_LIAISON" &&
    person &&
    person.departmentId !== user.departmentId
  )
    return json(
      { error: "Assigned users must be within your department" },
      403,
    );
  const personId = person?.id ?? asset.assignedUserId;
  const changed = personId !== asset.assignedUserId;
  const nextStatus = personId
    ? "ASSIGNED"
    : asset.status === "ASSIGNED"
      ? "AVAILABLE"
      : asset.status;
  const next = {
    ...existing,
    status: "COMPLETED",
    approvedById: user.id,
    approvedAt: now,
    transferDate: now,
    rejectionReason: null,
  };
  const statements: Statement[] = [
    db
      .prepare(
        `UPDATE AssetTransfer SET status='COMPLETED',approvedById=?,approvedAt=?,transferDate=?,rejectionReason=NULL
      WHERE id=? AND status IN ${pending} AND EXISTS (SELECT 1 FROM Asset a WHERE a.id=AssetTransfer.assetId AND ${access.sql} AND ${allowedAsset} AND a.roomId=? AND a.assignedUserId IS ? AND a.departmentId=? AND a.status=? AND a.borrowable=?)
      AND EXISTS (SELECT 1 FROM Room r JOIN Floor f ON f.id=r.floorId JOIN Building b ON b.id=f.buildingId WHERE r.id=? AND f.buildingId=? AND r.active=1 AND f.active=1 AND b.active=1)
      AND (? IS NULL OR EXISTS (SELECT 1 FROM User WHERE id=? AND status='ACTIVE' AND departmentId IS ?))`,
      )
      .bind(
        user.id,
        now,
        now,
        id,
        ...access.values,
        asset.roomId,
        asset.assignedUserId,
        asset.departmentId,
        asset.status,
        asset.borrowable,
        room.id,
        room.buildingId,
        person?.id ?? null,
        person?.id ?? null,
        person?.departmentId ?? null,
      ),
    db
      .prepare(
        `UPDATE Asset SET roomId=?,buildingId=?,assignedUserId=?,status=?,borrowable=?,updatedById=?,updatedAt=?
      ${person?.departmentId ? ",departmentId=?,kulliyyahId=?,unitId=CASE WHEN departmentId=? THEN unitId ELSE NULL END" : ""}
      WHERE id=? AND changes()=1`,
      )
      .bind(
        room.id,
        room.buildingId,
        personId,
        nextStatus,
        personId ? 0 : asset.borrowable,
        user.id,
        now,
        ...(person?.departmentId
          ? [person.departmentId, person.kulliyyahId, person.departmentId]
          : []),
        asset.id,
      ),
    audit(
      db,
      auditId,
      user,
      "APPROVE",
      id,
      existing,
      {
        transfer: next,
        asset: {
          id: asset.id,
          roomId: room.id,
          assignedUserId: personId,
          status: nextStatus,
        },
      },
      now,
    ),
  ];
  if (changed)
    statements.push(
      db
        .prepare(
          `INSERT INTO AssetAssignment (id,assetId,assignedUserId,assignedById,purpose,acceptanceStatus,assignmentDate)
    SELECT ?,?,?,?,'Asset assigned user transferred','Assigned',? WHERE EXISTS (SELECT 1 FROM AuditLog WHERE id=?)`,
        )
        .bind(uid(), asset.id, personId, user.id, now, auditId),
    );
  for (const recipient of new Set([
    existing.requestedById,
    ...(changed && personId ? [personId] : []),
  ]))
    statements.push(
      notification(
        db,
        auditId,
        recipient,
        "Asset transfer completed",
        `${existing.transferNumber} has been approved and the asset record was updated.`,
        `/assets/${asset.id}`,
        now,
      ),
    );
  const result = await db.batch(statements);
  return result[0].meta.changes === 1
    ? json({ transfer: next })
    : json(
        {
          error:
            "The transfer, destination or asset changed. Refresh and try again.",
        },
        409,
      );
}

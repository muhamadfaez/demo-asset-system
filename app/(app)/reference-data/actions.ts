"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const kinds = ["supplier", "fundingSource", "category", "kulliyyah", "department", "unit", "campus", "building", "floor", "room"] as const;
const codedKinds = new Set<string>(["kulliyyah", "department", "unit", "building", "room"]);
const parentKinds = new Set<string>(["department", "unit", "building", "floor", "room"]);

const referenceSchema = z.object({
  kind: z.enum(kinds),
  id: z.string().trim().optional(),
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().toUpperCase().max(30).optional(),
  parentId: z.string().trim().optional(),
  active: z.enum(["true", "false"]).transform((value) => value === "true")
});

export type ReferenceActionState = { status: "idle" | "success" | "error"; message?: string };

export async function saveReferenceData(_: ReferenceActionState, formData: FormData): Promise<ReferenceActionState> {
  const session = await auth();
  if (!session?.user || !can(session.user, "settings:manage")) return { status: "error", message: "Only administrators can manage reference data." };
  const parsed = referenceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Enter a name between 2 and 120 characters and check the other fields." };
  const { kind, id, name, code, parentId, active } = parsed.data;
  if (codedKinds.has(kind) && (!code || !/^[A-Z0-9][A-Z0-9_-]*$/.test(code))) return { status: "error", message: "Enter a code using letters, numbers, hyphens, or underscores." };
  if (parentKinds.has(kind) && !parentId) return { status: "error", message: "Select a parent record." };

  try {
    let before: unknown = null;
    let after: { id: string };
    switch (kind) {
      case "supplier": {
        before = id ? await prisma.supplier.findUnique({ where: { id } }) : null;
        if (id && !before) return missing();
        after = id ? await prisma.supplier.update({ where: { id }, data: { name } }) : await prisma.supplier.create({ data: { name } });
        break;
      }
      case "fundingSource": {
        before = id ? await prisma.fundingSource.findUnique({ where: { id } }) : null;
        if (id && !before) return missing();
        after = id ? await prisma.fundingSource.update({ where: { id }, data: { name } }) : await prisma.fundingSource.create({ data: { name } });
        break;
      }
      case "category": {
        before = id ? await prisma.assetCategory.findUnique({ where: { id } }) : null;
        if (id && !before) return missing();
        after = id ? await prisma.assetCategory.update({ where: { id }, data: { name } }) : await prisma.assetCategory.create({ data: { name } });
        break;
      }
      case "kulliyyah": {
        before = id ? await prisma.kulliyyah.findUnique({ where: { id } }) : null;
        if (id && !before) return missing();
        after = id ? await prisma.kulliyyah.update({ where: { id }, data: { name, code: code!, active } }) : await prisma.kulliyyah.create({ data: { name, code: code!, active } });
        break;
      }
      case "department": {
        const parent = await prisma.kulliyyah.findUnique({ where: { id: parentId! } });
        if (!parent) return invalidParent();
        const existing = id ? await prisma.department.findUnique({ where: { id } }) : null;
        if (id && !existing) return missing();
        if (existing && existing.kulliyyahId !== parentId && await prisma.asset.count({ where: { departmentId: id } })) return linked("assets");
        if (existing && existing.kulliyyahId !== parentId && await prisma.user.count({ where: { departmentId: id } })) return linked("users");
        before = existing;
        after = id ? await prisma.department.update({ where: { id }, data: { name, code: code!, active, kulliyyahId: parentId! } }) : await prisma.department.create({ data: { name, code: code!, active, kulliyyahId: parentId! } });
        break;
      }
      case "unit": {
        const parent = await prisma.department.findUnique({ where: { id: parentId! } });
        if (!parent) return invalidParent();
        const existing = id ? await prisma.unit.findUnique({ where: { id } }) : null;
        if (id && !existing) return missing();
        if (existing && existing.departmentId !== parentId && await prisma.asset.count({ where: { unitId: id } })) return linked("assets");
        if (existing && existing.departmentId !== parentId && await prisma.user.count({ where: { unitId: id } })) return linked("users");
        before = existing;
        after = id ? await prisma.unit.update({ where: { id }, data: { name, code: code!, active, departmentId: parentId! } }) : await prisma.unit.create({ data: { name, code: code!, active, departmentId: parentId! } });
        break;
      }
      case "campus": {
        before = id ? await prisma.campus.findUnique({ where: { id } }) : null;
        if (id && !before) return missing();
        after = id ? await prisma.campus.update({ where: { id }, data: { name, active } }) : await prisma.campus.create({ data: { name, active } });
        break;
      }
      case "building": {
        const parent = await prisma.campus.findUnique({ where: { id: parentId! } });
        if (!parent) return invalidParent();
        before = id ? await prisma.building.findUnique({ where: { id } }) : null;
        if (id && !before) return missing();
        after = id ? await prisma.building.update({ where: { id }, data: { name, code: code!, active, campusId: parentId! } }) : await prisma.building.create({ data: { name, code: code!, active, campusId: parentId! } });
        break;
      }
      case "floor": {
        const parent = await prisma.building.findUnique({ where: { id: parentId! } });
        if (!parent) return invalidParent();
        const existing = id ? await prisma.floor.findUnique({ where: { id } }) : null;
        if (id && !existing) return missing();
        if (existing && existing.buildingId !== parentId && await prisma.asset.count({ where: { room: { floorId: id } } })) return linked("assets");
        before = existing;
        after = id ? await prisma.floor.update({ where: { id }, data: { name, active, buildingId: parentId! } }) : await prisma.floor.create({ data: { name, active, buildingId: parentId! } });
        break;
      }
      case "room": {
        const parent = await prisma.floor.findUnique({ where: { id: parentId! } });
        if (!parent) return invalidParent();
        const existing = id ? await prisma.room.findUnique({ where: { id } }) : null;
        if (id && !existing) return missing();
        if (existing && existing.floorId !== parentId && await prisma.asset.count({ where: { roomId: id } })) return linked("assets");
        before = existing;
        after = id ? await prisma.room.update({ where: { id }, data: { name, code: code!, active, floorId: parentId! } }) : await prisma.room.create({ data: { name, code: code!, active, floorId: parentId! } });
        break;
      }
    }
    try { await audit({ userId: session.user.id, action: id ? "UPDATE" : "CREATE", module: kind === "category" ? "Master Data" : "Locations", recordType: kind, recordId: after.id, previousValues: before, newValues: after }); }
    catch (error) { console.error("Reference data audit failed", error); }
    for (const path of ["/locations", "/master-data", "/assets/new", "/users", "/assets"]) revalidatePath(path);
    revalidatePath("/assets/[id]/edit", "page");
    return { status: "success", message: `${name} ${id ? "updated" : "created"}.` };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { status: "error", message: "That name or code is already in use." };
    console.error("Reference data save failed", error);
    return { status: "error", message: "Could not save this record. Please try again." };
  }
}

function missing(): ReferenceActionState { return { status: "error", message: "This record no longer exists. Refresh the page." }; }
function invalidParent(): ReferenceActionState { return { status: "error", message: "Select an existing parent record." }; }
function linked(records: string): ReferenceActionState { return { status: "error", message: `This parent cannot be changed while ${records} are linked to it.` }; }

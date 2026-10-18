import { ReferenceManager } from "@/app/(app)/reference-data/reference-manager";
import type { ReferenceGroup } from "@/app/(app)/reference-data/types";
import { prisma } from "@/lib/prisma";

export async function LocationGroups() {
  const [kulliyyahs, departments, units, campuses, buildings, floors, rooms] = await Promise.all([
    prisma.kulliyyah.findMany({ orderBy: { name: "asc" } }),
    prisma.department.findMany({ include: { kulliyyah: { select: { name: true } } }, orderBy: { name: "asc" } }),
    prisma.unit.findMany({ include: { department: { select: { name: true } } }, orderBy: { name: "asc" } }),
    prisma.campus.findMany({ orderBy: { name: "asc" } }),
    prisma.building.findMany({ include: { campus: { select: { name: true } } }, orderBy: { name: "asc" } }),
    prisma.floor.findMany({ include: { building: { select: { name: true } } }, orderBy: { name: "asc" } }),
    prisma.room.findMany({ include: { floor: { select: { name: true, building: { select: { name: true } } } } }, orderBy: { name: "asc" } })
  ]);
  const groups: ReferenceGroup[] = [
    { kind: "kulliyyah", title: "Kulliyyahs", description: "Top-level academic and administrative ownership.", hasCode: true, hasActive: true, items: kulliyyahs.map((x) => ({ id: x.id, name: x.name, code: x.code, active: x.active })) },
    { kind: "department", title: "Departments", description: "Departments belong to a Kulliyyah.", hasCode: true, hasActive: true, parentLabel: "Kulliyyah", parents: kulliyyahs.map((x) => ({ id: x.id, name: x.name })), items: departments.map((x) => ({ id: x.id, name: x.name, code: x.code, active: x.active, parentId: x.kulliyyahId, parentName: x.kulliyyah.name })) },
    { kind: "unit", title: "Units", description: "Optional teams within departments.", hasCode: true, hasActive: true, parentLabel: "Department", parents: departments.map((x) => ({ id: x.id, name: `${x.name} (${x.kulliyyah.name})` })), items: units.map((x) => ({ id: x.id, name: x.name, code: x.code, active: x.active, parentId: x.departmentId, parentName: x.department.name })) },
    { kind: "campus", title: "Campuses", description: "Physical sites containing buildings.", hasActive: true, items: campuses.map((x) => ({ id: x.id, name: x.name, active: x.active })) },
    { kind: "building", title: "Buildings", description: "Buildings belong to a campus.", hasCode: true, hasActive: true, parentLabel: "Campus", parents: campuses.map((x) => ({ id: x.id, name: x.name })), items: buildings.map((x) => ({ id: x.id, name: x.name, code: x.code, active: x.active, parentId: x.campusId, parentName: x.campus.name })) },
    { kind: "floor", title: "Floors", description: "Floors belong to a building.", hasActive: true, parentLabel: "Building", parents: buildings.map((x) => ({ id: x.id, name: `${x.name} (${x.campus.name})` })), items: floors.map((x) => ({ id: x.id, name: x.name, active: x.active, parentId: x.buildingId, parentName: x.building.name })) },
    { kind: "room", title: "Rooms", description: "Rooms are selectable asset locations.", hasCode: true, hasActive: true, parentLabel: "Floor", parents: floors.map((x) => ({ id: x.id, name: `${x.building.name} / ${x.name}` })), items: rooms.map((x) => ({ id: x.id, name: x.name, code: x.code, active: x.active, parentId: x.floorId, parentName: `${x.floor.building.name} / ${x.floor.name}` })) }
  ];
  return <ReferenceManager groups={groups} />;
}

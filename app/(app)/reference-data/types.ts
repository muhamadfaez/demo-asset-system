export type ReferenceKind = "supplier" | "fundingSource" | "category" | "kulliyyah" | "department" | "unit" | "campus" | "building" | "floor" | "room";

export type ReferenceItem = {
  id: string;
  name: string;
  code?: string;
  parentId?: string;
  parentName?: string;
  active?: boolean;
};

export type ReferenceGroup = {
  kind: ReferenceKind;
  title: string;
  description: string;
  items: ReferenceItem[];
  hasCode?: boolean;
  hasActive?: boolean;
  parentLabel?: string;
  parents?: { id: string; name: string }[];
};

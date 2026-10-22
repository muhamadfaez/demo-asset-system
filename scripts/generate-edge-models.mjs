import internals from "@prisma/internals";
const { getDMMF } = internals;
import { readFile, writeFile } from "node:fs/promises";
const dmmf = await getDMMF({
  datamodel: await readFile("prisma/schema.prisma", "utf8"),
});
const models = Object.fromEntries(
  dmmf.datamodel.models.map((model) => [
    model.name,
    {
      fields: Object.fromEntries(
        model.fields.map((field) => [
          field.name,
          {
            type: field.type,
            kind: field.kind,
            list: field.isList,
            required: field.isRequired,
            id: field.isId,
            updated: field.isUpdatedAt,
            default: field.default,
            from: field.relationFromFields,
            to: field.relationToFields,
            relation: field.relationName,
          },
        ]),
      ),
    },
  ]),
);
await writeFile("edge/models.json", JSON.stringify(models));

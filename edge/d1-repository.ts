// Only trusted server modules call this facade. There is no public model/query RPC.
// Compile the application's small query vocabulary to bound SQL, without Prisma/WASM.
import modelsJSON from "./models.json";
import { context } from "./app-context";
import type { Database, Statement } from "./types";
type Field = {
  type: string;
  kind: string;
  list: boolean;
  required: boolean;
  id: boolean;
  updated: boolean;
  default?: any;
  from?: string[];
  to?: string[];
  relation?: string;
};
const models = modelsJSON as unknown as Record<
  string,
  { fields: Record<string, Field> }
>;
const q = (value: string) => '"' + value.replaceAll('"', '""') + '"';
const scalar = (value: any): any =>
  value instanceof Date
    ? value.getTime()
    : typeof value === "boolean"
      ? Number(value)
      : value;
export class RepositoryError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
class SQL {
  values: unknown[] = [];
  serial = 0;
  bind(value: unknown) {
    this.values.push(scalar(value));
    return "?";
  }
  field(model: string, key: string, alias: string, date = false) {
    const f = models[model].fields[key];
    if (!f || f.kind === "object")
      throw new Error(`Unknown field ${model}.${key}`);
    const col = `${alias}.${q(key)}`;
    return date && f.type === "DateTime"
      ? `(CASE WHEN typeof(${col}) IN ('integer','real') THEN ${col} ELSE CAST(round((julianday(${col})-2440587.5)*86400000) AS INTEGER) END)`
      : col;
  }
  relation(model: string, key: string, alias: string) {
    const field = models[model].fields[key];
    if (!field || field.kind !== "object") throw new Error("Unknown relation");
    const child = `r${++this.serial}`;
    const inverse = Object.values(models[field.type].fields).find(
      (f) =>
        f.kind === "object" && f.relation === field.relation && f.from?.length,
    );
    const pairs = field.from?.length
      ? field.from.map(
          (name, i) => `${alias}.${q(name)}=${child}.${q(field.to![i])}`,
        )
      : inverse!.from!.map(
          (name, i) => `${child}.${q(name)}=${alias}.${q(inverse!.to![i])}`,
        );
    return { field, child, join: pairs.join(" AND ") };
  }
  where(model: string, where: any = {}, alias = "t"): string {
    const clauses: string[] = [];
    for (const [key, value] of Object.entries(where ?? {})) {
      if (value === undefined) continue;
      if (["AND", "OR", "NOT"].includes(key)) {
        const list = Array.isArray(value) ? value : [value];
        const parts = list.map((item) => `(${this.where(model, item, alias)})`);
        clauses.push(
          key === "NOT"
            ? parts.map((p) => `NOT ${p}`).join(" AND ") || "1"
            : parts.join(key === "OR" ? " OR " : " AND ") ||
                (key === "OR" ? "0" : "1"),
        );
        continue;
      }
      const field = models[model].fields[key];
      if (!field) {
        // Compound unique keys used by Auth.js.
        if (
          value &&
          typeof value === "object" &&
          Object.keys(value).every(
            (k) =>
              models[model].fields[k]?.kind !== "object" &&
              models[model].fields[k],
          )
        ) {
          clauses.push(this.where(model, value, alias));
          continue;
        }
        throw new Error(`Unsupported filter ${model}.${key}`);
      }
      if (field.kind === "object") {
        const { child, join } = this.relation(model, key, alias);
        const relationValue = value as any;
        const every = relationValue?.every;
        const negative =
          value === null ||
          relationValue?.none !== undefined ||
          relationValue?.is === null ||
          relationValue?.isNot !== undefined ||
          every !== undefined;
        const filter =
          every ??
          relationValue?.some ??
          relationValue?.none ??
          relationValue?.is ??
          relationValue?.isNot ??
          relationValue ??
          {};
        clauses.push(
          `${negative ? "NOT " : ""}EXISTS(SELECT 1 FROM ${q(field.type)} ${child} WHERE ${join} AND ${every !== undefined ? "NOT " : ""}(${this.where(field.type, filter, child)}))`,
        );
        continue;
      }
      const col = this.field(model, key, alias, field.type === "DateTime");
      if (value === null) {
        clauses.push(`${col} IS NULL`);
        continue;
      }
      if (typeof value !== "object" || value instanceof Date) {
        clauses.push(`${col}=${this.bind(value)}`);
        continue;
      }
      for (const [op, operand] of Object.entries(value as object)) {
        if (operand === undefined || op === "mode") continue;
        if (op === "not") {
          clauses.push(
            operand === null
              ? `${col} IS NOT NULL`
              : `NOT (${this.where(model, { [key]: operand }, alias)})`,
          );
        } else if (op === "in" || op === "notIn") {
          const list = operand as unknown[];
          clauses.push(
            list.length
              ? `${col} ${op === "in" ? "IN" : "NOT IN"} (SELECT value FROM json_each(${this.bind(JSON.stringify(list.map(scalar)))}))`
              : op === "in"
                ? "0"
                : "1",
          );
        } else if (["contains", "startsWith", "endsWith"].includes(op)) {
          clauses.push(
            op === "endsWith"
              ? `substr(lower(${col}),-length(${this.bind(operand)}))=lower(${this.bind(operand)})`
              : `instr(lower(${col}),lower(${this.bind(operand)}))${op === "startsWith" ? "=1" : ">0"}`,
          );
        } else {
          const operator = (
            { equals: "=", lt: "<", lte: "<=", gt: ">", gte: ">=" } as Record<
              string,
              string
            >
          )[op];
          if (!operator) throw new Error(`Unsupported operator ${op}`);
          clauses.push(
            operand === null
              ? `${col} IS NULL`
              : `${col}${operator}${this.bind(operand)}`,
          );
        }
      }
    }
    return clauses.length ? clauses.map((p) => `(${p})`).join(" AND ") : "1";
  }
  order(model: string, order: any, alias: string) {
    const orders = (
      Array.isArray(order) ? order : order ? [order] : []
    ).flatMap((item) =>
      Object.entries(item).map(
        ([key, direction]) =>
          `${this.field(model, key, alias, true)} ${direction === "desc" ? "DESC" : "ASC"}`,
      ),
    );
    return orders.length ? " ORDER BY " + orders.join(",") : "";
  }
  projection(
    model: string,
    args: any = {},
    alias: string,
    nested = false,
  ): string {
    const fields = models[model].fields;
    const selected = args.select
      ? Object.keys(args.select).filter((k) => args.select[k])
      : Object.keys(fields).filter((k) => fields[k].kind !== "object");
    for (const key of Object.keys(args.include ?? {}))
      if (args.include[key]) selected.push(key);
    const entries = selected.map((key) => {
      if (key === "_count") {
        const counts =
          args.include?._count?.select ?? args.select?._count?.select;
        const pairs = Object.keys(counts).map((name) => {
          const { field, child, join } = this.relation(model, name, alias);
          return `'${name}',(SELECT COUNT(*) FROM ${q(field.type)} ${child} WHERE ${join})`;
        });
        return { key, sql: `json_object(${pairs.join(",")})`, json: true };
      }
      const field = fields[key];
      if (!field) throw new Error(`Unknown projection ${model}.${key}`);
      if (field.kind !== "object")
        return { key, sql: this.field(model, key, alias), json: false };
      const { child, join } = this.relation(model, key, alias);
      const option = args.select?.[key] ?? args.include?.[key];
      const spec = option === true ? {} : option;
      const expression = this.projection(field.type, spec, child, true);
      const filter = this.where(field.type, spec.where, child);
      const suffix =
        this.order(field.type, spec.orderBy, child) +
        ` LIMIT ${field.list ? Math.min(Math.max(spec.take ?? 100, 0), 100) : 1} OFFSET ${Math.max(0, spec.skip ?? 0) | 0}`;
      const query = `SELECT ${expression} AS payload FROM ${q(field.type)} ${child} WHERE ${join} AND ${filter}${suffix}`;
      return {
        key,
        sql: field.list
          ? `(SELECT json_group_array(json(payload)) FROM (${query}))`
          : `(${query})`,
        json: true,
      };
    });
    if (nested) {
      // D1 permits 32 SQL function arguments. json_set also retains null keys.
      let expression = "'{}'";
      for (let i = 0; i < entries.length; i += 15)
        expression = `json_set(${expression},${entries
          .slice(i, i + 15)
          .map((e) => `'$.${e.key}',${e.json ? `json(${e.sql})` : e.sql}`)
          .join(",")})`;
      return expression;
    }
    return entries.map((e) => `${e.sql} AS ${q(e.key)}`).join(",");
  }
}
function hydrate(model: string, input: Record<string, any>): any {
  const row = { ...input };
  for (const [key, value] of Object.entries(row)) {
    if (value == null) continue;
    const field = models[model].fields[key];
    if (key === "_count")
      row[key] = typeof value === "string" ? JSON.parse(value) : value;
    else if (field?.kind === "object") {
      const object = typeof value === "string" ? JSON.parse(value) : value;
      row[key] =
        object == null
          ? null
          : field.list
            ? object.map((r: any) => hydrate(field.type, r))
            : hydrate(field.type, object);
    } else if (field?.type === "DateTime")
      row[key] = new Date(
        typeof value === "string" && /^\d+$/.test(value)
          ? Number(value)
          : (value as any),
      );
    else if (field?.type === "Boolean") row[key] = Boolean(value);
  }
  return row;
}
function defaults(model: string, data: any, create = false): any {
  const result = { ...data };
  for (const [key, field] of Object.entries(models[model].fields)) {
    if (field.kind === "object") continue;
    if (field.updated && result[key] === undefined) result[key] = new Date();
    if (create && result[key] === undefined) {
      if (field.default && typeof field.default === "object")
        result[key] =
          field.default.name === "now" ? new Date() : crypto.randomUUID();
      else if (field.default !== undefined) result[key] = field.default;
      else if (!field.required) result[key] = null;
    }
  }
  return Object.fromEntries(
    Object.entries(result).filter(([, v]) => v !== undefined),
  );
}
type Task = {
  write: boolean;
  run(): Promise<any>;
  queue?(): Promise<any>;
  plan?(): Promise<any>;
};
class Query implements PromiseLike<any> {
  constructor(public task: Task) {}
  then(resolve: any, reject?: any): any {
    return (
      context().transaction && this.task.write
        ? this.task.queue!()
        : this.task.run()
    ).then(resolve, reject);
  }
}
export function createRepository(db: Database): any {
  function statement(builder: SQL, sql: string) {
    return db.prepare(sql).bind(...builder.values);
  }
  async function read(model: string, operation: string, args: any = {}) {
    const b = new SQL();
    const alias = "t";
    if (
      operation === "count" ||
      operation === "aggregate" ||
      operation === "groupBy"
    ) {
      const by: string[] = args.by ?? [];
      const cols = by.map((k) => b.field(model, k, alias));
      if (operation === "count" || args._count) cols.push("COUNT(*) AS _count");
      for (const key of Object.keys(args._sum ?? {}))
        cols.push(`SUM(${b.field(model, key, alias)}) AS ${q("sum_" + key)}`);
      const where = b.where(model, args.where, alias);
      const rows = (
        await statement(
          b,
          `SELECT ${cols.join(",")} FROM ${q(model)} ${alias} WHERE ${where}${by.length ? " GROUP BY " + by.map((k) => b.field(model, k, alias)).join(",") : ""}`,
        ).all<Record<string, any>>()
      ).results;
      if (operation === "count") return Number(rows[0]?._count ?? 0);
      const shape = (r: any) => ({
        ...Object.fromEntries(by.map((k) => [k, r[k]])),
        ...(args._count ? { _count: { _all: r._count } } : {}),
        ...(args._sum
          ? {
              _sum: Object.fromEntries(
                Object.keys(args._sum).map((k) => [k, r["sum_" + k]]),
              ),
            }
          : {}),
      });
      return operation === "groupBy" ? rows.map(shape) : shape(rows[0] ?? {});
    }
    const projection = b.projection(model, args, alias);
    const where = b.where(model, args.where, alias);
    const many = operation === "findMany";
    const pageModels: Record<string, string> = {
      "/assets": "Asset",
      "/users": "User",
      "/maintenance": "MaintenanceRequest",
      "/incidents": "AssetIncident",
      "/verification": "AssetVerification",
      "/disposal": "DisposalRequest",
      "/reports": "Asset",
      "/notifications": "Notification",
    };
    const paginated = many && pageModels[context().page ?? ""] === model;
    const references = [
      "Kulliyyah",
      "Department",
      "Unit",
      "Campus",
      "Building",
      "Floor",
      "Room",
      "AssetCategory",
      "AssetSubcategory",
      "Brand",
      "Supplier",
      "FundingSource",
      "VerificationCampaign",
    ].includes(model);
    const take = paginated
      ? 26
      : many
        ? Math.min(
            references ? 2000 : 200,
            Math.max(0, args.take ?? (references ? 2000 : 100)),
          )
        : 1;
    const offset = paginated
      ? ((context().pageNumber ?? 1) - 1) * 25
      : Math.max(0, args.skip ?? 0) | 0;
    const sql = `SELECT ${projection} FROM ${q(model)} ${alias} WHERE ${where}${b.order(model, args.orderBy, alias)} LIMIT ${take} OFFSET ${offset}`;
    const rows = (
      await statement(b, sql).all<Record<string, any>>()
    ).results.map((row) => hydrate(model, row));
    if (paginated) {
      context().pagination = {
        page: context().pageNumber ?? 1,
        size: 25,
        hasNext: rows.length > 25,
      };
      rows.splice(25);
    }
    for (const row of rows)
      if (row.id) context().snapshots.set(`${model}:${row.id}`, row);
    if (many) return rows;
    if (!rows.length && operation.endsWith("OrThrow"))
      throw new RepositoryError("P2025", "Record not found");
    return rows[0] ?? null;
  }
  function mutation(model: string, operation: string, args: any): Query {
    if (operation === "createMany" && args.data?.length) {
      const chunkSize = Math.max(
        1,
        Math.floor(
          100 / Object.keys(defaults(model, args.data[0], true)).length,
        ),
      );
      if (args.data.length > chunkSize) {
        const tasks: Query[] = [];
        for (let i = 0; i < args.data.length; i += chunkSize)
          tasks.push(
            mutation(model, operation, {
              ...args,
              data: args.data.slice(i, i + chunkSize),
            }),
          );
        return new Query({
          write: true,
          async run() {
            const plans = await Promise.all(tasks.map((t) => t.task.plan!()));
            const results = await db.batch(plans.map((p) => p.stmt));
            return { count: results.reduce((n, r) => n + r.results.length, 0) };
          },
          async queue() {
            const plans = await Promise.all(tasks.map((t) => t.task.plan!()));
            context().transaction!.push(...plans.map((p) => p.stmt));
            return { count: args.data.length };
          },
        });
      }
    }
    async function prepare() {
      const b = new SQL();
      const many = operation.endsWith("Many");
      let data = defaults(
        model,
        args.data ?? args.create ?? {},
        operation === "create" || operation === "upsert",
      );
      let sql: string;
      let predicted: any = data;
      if (
        operation === "create" ||
        operation === "createMany" ||
        operation === "upsert"
      ) {
        const records =
          operation === "createMany"
            ? args.data.map((d: any) => defaults(model, d, true))
            : [data];
        if (!records.length) return { skip: true, predicted: { count: 0 } };
        const keys = Object.keys(records[0]);
        for (const key of keys)
          if (
            !models[model].fields[key] ||
            models[model].fields[key].kind === "object"
          )
            throw new Error("Nested writes are not supported");
        sql = `INSERT ${args.skipDuplicates ? "OR IGNORE " : ""}INTO ${q(model)} (${keys.map(q)}) VALUES ${records.map((r: any) => `(${keys.map((k) => b.bind(r[k])).join(",")})`).join(",")}`;
        if (operation === "upsert") {
          const update = defaults(model, args.update);
          sql += ` ON CONFLICT (${Object.keys(args.where).map(q)}) DO UPDATE SET ${Object.entries(
            update,
          )
            .map(([k, v]) => `${q(k)}=${b.bind(v)}`)
            .join(",")}`;
        }
      } else {
        let where = args.where;
        const cached =
          args.where?.id &&
          context().snapshots.get(`${model}:${args.where.id}`);
        if (!many && cached) {
          const snapshot = Object.fromEntries(
            [
              "updatedAt",
              "status",
              "assignedUserId",
              "roomId",
              "departmentId",
              "readAt",
            ]
              .filter((k) => cached[k] !== undefined && models[model].fields[k])
              .map((k) => [k, cached[k]]),
          );
          where = { AND: [where, snapshot] };
          predicted = { ...cached, ...data };
        } else if (!many && operation === "update" && context().transaction) {
          predicted = {
            ...(await read(model, "findFirst", { where })),
            ...data,
          };
        }
        if (operation.startsWith("delete"))
          sql = `DELETE FROM ${q(model)} AS t WHERE ${b.where(model, where)}`;
        else
          sql = `UPDATE ${q(model)} AS t SET ${Object.entries(data)
            .map(([key, value]) => {
              if (
                !models[model].fields[key] ||
                models[model].fields[key].kind === "object"
              )
                throw new Error("Unsupported write field");
              const v = value as any;
              return `${q(key)}=${v && typeof v === "object" && !(v instanceof Date) ? `${q(key)}${v.increment !== undefined ? "+" : "-"}${b.bind(v.increment ?? v.decrement)}` : b.bind(value)}`;
            })
            .join(",")} WHERE ${b.where(model, where)}`;
      }
      sql += " RETURNING *";
      return { stmt: statement(b, sql), predicted, many };
    }
    return new Query({
      write: true,
      plan: prepare,
      async run() {
        const plan = await prepare();
        if (plan.skip) return plan.predicted;
        try {
          const result = await plan.stmt!.all<Record<string, any>>();
          if (plan.many) return { count: result.results.length };
          if (!result.results.length)
            throw new RepositoryError(
              "P2025",
              "The record changed. Refresh and try again.",
            );
          const row = hydrate(model, result.results[0]);
          if (row.id) context().snapshots.set(`${model}:${row.id}`, row);
          return args.include || args.select
            ? read(model, "findUnique", {
                where: {
                  [models[model].fields.id ? "id" : "key"]: row.id ?? row.key,
                },
                include: args.include,
                select: args.select,
              })
            : row;
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("UNIQUE constraint")
          )
            throw new RepositoryError("P2002", "Unique field already exists");
          throw error;
        }
      },
      async queue() {
        const plan = await prepare();
        if (plan.skip) return plan.predicted;
        context().transaction!.push(plan.stmt!);
        if (!plan.many)
          context().transaction!.push(
            db.prepare(
              `SELECT CASE WHEN changes()=0 THEN json('transaction conflict') ELSE 1 END`,
            ),
          );
        return plan.predicted;
      },
    });
  }
  return new Proxy(
    {},
    {
      get(_target, name: string) {
        if (name === "$transaction")
          return async (callback: any) => {
            if (context().transaction)
              throw new Error("Nested transaction unsupported");
            const statements: Statement[] = [];
            const original = context();
            let result: any;
            const { appContext } = await import("./app-context");
            await appContext.run(
              { ...original, transaction: statements },
              async () => {
                result =
                  typeof callback === "function"
                    ? await callback(createRepository(db))
                    : await Promise.all(callback);
              },
            );
            if (statements.length) {
              try {
                await db.batch(statements);
              } catch (error) {
                if (
                  error instanceof Error &&
                  error.message.includes("malformed JSON")
                )
                  throw new RepositoryError("P2025", "Transaction conflict");
                throw error;
              }
            }
            return result;
          };
        if (name === "$queryRaw" || name === "$executeRaw")
          return async (
            strings: TemplateStringsArray,
            ...values: unknown[]
          ) => {
            const result = await db
              .prepare(strings.join("?"))
              .bind(...values.map(scalar))
              .all();
            return name === "$queryRaw" ? result.results : result.meta?.changes;
          };
        const model = Object.keys(models).find(
          (key) => key[0].toLowerCase() + key.slice(1) === name,
        );
        if (!model) throw new Error(`Unsupported model ${name}`);
        return new Proxy(
          {},
          {
            get(_delegate, operation: string) {
              if (
                [
                  "findMany",
                  "findFirst",
                  "findUnique",
                  "findUniqueOrThrow",
                  "findFirstOrThrow",
                  "count",
                  "aggregate",
                  "groupBy",
                ].includes(operation)
              )
                return (args?: any) =>
                  new Query({
                    write: false,
                    run: () => read(model, operation, args),
                  });
              if (
                [
                  "create",
                  "createMany",
                  "update",
                  "updateMany",
                  "delete",
                  "deleteMany",
                  "upsert",
                ].includes(operation)
              )
                return (args: any) => mutation(model, operation, args);
              throw new Error(`Unsupported operation ${operation}`);
            },
          },
        );
      },
    },
  );
}
export const prisma: any = new Proxy(
  {},
  {
    get(_target, name) {
      return createRepository(context().env.DB)[name];
    },
  },
);

export const Fragment = "$fragment";
export function jsx(type: any, props: any, key?: string) {
  return { __node: true, type, props: props ?? {}, key };
}
export const jsxs = jsx;
export const jsxDEV = jsx;
export function clientReference(id: string) {
  return Object.assign(function reference() {}, { $client: id });
}
const then = (value: any, fn: (v: any) => any): any =>
  value?.then ? value.then(fn) : fn(value);
function collect(values: any[], fn: (v: any) => any): any {
  const mapped = values.map(fn);
  return mapped.some((v) => v?.then) ? Promise.all(mapped) : mapped;
}
export function resolveUI(value: any): any {
  if (
    value == null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return value;
  if (value instanceof Date) return { $date: value.toISOString() };
  if (Array.isArray(value)) return collect(value, resolveUI);
  if (typeof value === "function") {
    if (value.$action) return { $action: value.$action };
    if (value.$client) return { $component: value.$client };
    throw new Error("An unregistered function crossed the browser boundary");
  }
  if (value.__node) {
    if (value.type === Fragment) return resolveUI(value.props.children);
    if (typeof value.type === "function" && !value.type.$client)
      return then(value.type(value.props), resolveUI);
    if (typeof value.type !== "string" && !value.type?.$client)
      throw new Error("Unsupported view component");
    return then(resolveUI(value.props), (props: any) => ({
      $element:
        typeof value.type === "string"
          ? value.type
          : { $component: value.type.$client },
      props,
      key: value.key,
    }));
  }
  const entries = Object.entries(value);
  return then(
    collect(
      entries.map(([, v]) => v),
      resolveUI,
    ),
    (resolved: any[]) =>
      Object.fromEntries(entries.map(([key], i) => [key, resolved[i]])),
  );
}

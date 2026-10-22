import { remoteAction } from "./actions";
import { createElement, type ElementType } from "react";
export function decodeUI(
  value: any,
  registry: Record<string, ElementType>,
): any {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value))
    return value.map((item) => decodeUI(item, registry));
  if (value.$date) return new Date(value.$date);
  if (value.$action) return remoteAction(value.$action);
  if (value.$component) {
    const component = registry[value.$component];
    if (!component) throw new Error("Unknown browser component");
    return component;
  }
  if (value.$element)
    return createElement(
      typeof value.$element === "string"
        ? value.$element
        : decodeUI(value.$element, registry),
      { ...decodeUI(value.props, registry), key: value.key },
    );
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, decodeUI(item, registry)]),
  );
}

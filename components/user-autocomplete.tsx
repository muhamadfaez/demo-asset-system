"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, Search, UserRound, X } from "lucide-react";

export type AssignableUser = {
  id: string;
  name: string;
  email: string;
  staffNo: string | null;
  department: { name: string } | null;
};

export function UserAutocomplete({
  initialUser,
  name = "assignedUserId",
  label = "Assigned To",
  helperText,
}: {
  initialUser?: AssignableUser | null;
  name?: string;
  label?: string;
  helperText?: string;
}) {
  const [query, setQuery] = useState(initialUser?.name ?? "");
  const [selected, setSelected] = useState<AssignableUser | null>(
    initialUser ?? null,
  );
  const [results, setResults] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selected || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/users/search?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error ?? "Unable to search users.");
        setResults(body.users);
        setOpen(true);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Unable to search users.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected]);

  function change(value: string) {
    setQuery(value);
    setSelected(null);
    setOpen(true);
    inputRef.current?.setCustomValidity(
      value.trim() ? "Select a valid user from the search results." : "",
    );
  }

  function choose(user: AssignableUser) {
    setSelected(user);
    setQuery(user.name);
    setOpen(false);
    setError("");
    inputRef.current?.setCustomValidity("");
  }

  function clear() {
    setSelected(null);
    setQuery("");
    setResults([]);
    setOpen(false);
    setError("");
    inputRef.current?.setCustomValidity("");
    inputRef.current?.focus();
  }

  return (
    <div className="asset-user-picker grid min-w-0 w-full gap-1.5 md:col-span-2">
      <label
        htmlFor={`user-search-${name}`}
        className="text-sm font-medium text-slate-700"
      >
        {label} <span className="font-normal text-slate-400">(optional)</span>
      </label>
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
        <input
          ref={inputRef}
          id={`user-search-${name}`}
          value={query}
          onChange={(event) => change(event.target.value)}
          onFocus={() => !selected && query.trim().length >= 2 && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          className="min-w-0 max-w-full w-full pl-10 pr-12"
          placeholder="Search name, staff / matric ID, or email"
          autoComplete="off"
          role="combobox"
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`user-results-${name}`}
        />
        {loading ? (
          <LoaderCircle className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-iium-green" />
        ) : (
          query && (
            <button
              type="button"
              onClick={clear}
              className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label={`Clear ${label.toLowerCase()}`}
            >
              <X className="h-4 w-4" />
            </button>
          )
        )}
        {open && !selected && query.trim().length >= 2 && (
          <div
            id={`user-results-${name}`}
            role="listbox"
            className="absolute inset-x-0 z-30 mt-2 max-h-60 min-w-0 w-full max-w-full overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
          >
            {loading && (
              <p className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Searching active users...
              </p>
            )}
            {!loading && error && (
              <p className="px-3 py-4 text-sm text-rose-600">{error}</p>
            )}
            {!loading && !error && results.length === 0 && (
              <p className="px-3 py-4 text-sm text-slate-500">
                No active users match this search.
              </p>
            )}
            {!loading &&
              results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => choose(user)}
                  className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left hover:bg-iium-green/5 focus:bg-iium-green/5"
                >
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-iium-green/10 text-iium-deep">
                    <UserRound className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {user.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      ID: {user.staffNo ?? user.id} · {user.email}
                    </span>
                    <span className="block truncate text-xs text-slate-400">
                      {user.department?.name ?? "No department"}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>
      {selected ? (
        <p className="flex min-w-0 items-start gap-1.5 text-xs leading-5 text-iium-green">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 [overflow-wrap:anywhere]">
            Selected: {selected.name} / {selected.staffNo ?? selected.id} /{" "}
            {selected.department?.name ?? "No department"}
          </span>
        </p>
      ) : (
        <p className="min-w-0 text-xs leading-5 text-slate-500 [overflow-wrap:anywhere]">
          {helperText ??
            "Type at least 2 characters, then select a valid active user. Clear this field to remove an assignment."}
        </p>
      )}
    </div>
  );
}

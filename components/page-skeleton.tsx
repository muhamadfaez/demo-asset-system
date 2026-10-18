type SkeletonVariant = "overview" | "list" | "form" | "detail" | "search" | "scanner";

function Bar({ className = "w-full" }: { className?: string }) {
  return <div className={`h-3 rounded-full bg-slate-200/80 ${className}`} />;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200/80 bg-white p-5 shadow-glass ${className}`}>{children}</div>;
}

export function PageSkeleton({ label = "page", variant = "list" }: { label?: string; variant?: SkeletonVariant }) {
  return <div role="status" aria-live="polite" aria-busy="true" aria-label={`Loading ${label}`} className="space-y-5">
    <span className="sr-only">Loading {label}. Please wait.</span>
    <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
      <div className="space-y-3"><Bar className="h-2 w-24 bg-teal-100" /><Bar className="h-7 w-48 max-w-full" /><Bar className="w-80 max-w-full" /></div>
      {variant === "overview" ? <>
        <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((key) => <Card key={key}><Bar className="w-28" /><Bar className="mt-4 h-7 w-16" /></Card>)}</div>
        <Card><Bar className="w-28" /><div className="mt-6 flex flex-col items-center gap-8 sm:flex-row"><div className="h-48 w-48 shrink-0 rounded-full border-[32px] border-slate-100" /><div className="grid w-full gap-5 sm:grid-cols-2">{[0, 1, 2, 3, 4, 5].map((key) => <Bar key={key} className="h-3 w-full" />)}</div></div></Card>
        <TablePlaceholder />
      </> : variant === "form" || variant === "detail" ? <>
        {[0, 1].map((section) => <Card key={section}><Bar className="mb-6 w-32" /><div className="grid gap-5 sm:grid-cols-2">{[0, 1, 2, 3].map((key) => <div key={key} className="space-y-2"><Bar className="w-24" /><div className="h-11 rounded-lg bg-slate-100" /></div>)}</div></Card>)}
        {variant === "form" && <div className="flex justify-end"><div className="h-11 w-36 rounded-lg bg-teal-100" /></div>}
      </> : variant === "scanner" ? <Card className="mx-auto max-w-xl"><div className="mx-auto aspect-square max-h-72 rounded-xl bg-slate-100" /><Bar className="mx-auto mt-5 w-48" /><div className="mt-6 h-11 rounded-lg bg-teal-100" /></Card> : <>
        <Card><div className="flex gap-3"><div className="h-10 min-w-0 flex-1 rounded-lg bg-slate-100" /><div className="h-10 w-24 rounded-lg bg-teal-100" /></div></Card>
        {variant === "search" ? <Card><div className="space-y-6">{[0, 1, 2, 3].map((key) => <div key={key} className="space-y-2"><Bar className="w-44 max-w-full" /><Bar className="w-64 max-w-full" /></div>)}</div></Card> : <TablePlaceholder />}
      </>}
    </div>
  </div>;
}

function TablePlaceholder() {
  return <Card><Bar className="mb-5 w-32" /><div className="space-y-4">{[0, 1, 2, 3, 4].map((row) => <div key={row} className="grid grid-cols-3 gap-5 border-t border-slate-100 pt-4"><Bar /><Bar /><Bar className="w-3/4" /></div>)}</div></Card>;
}

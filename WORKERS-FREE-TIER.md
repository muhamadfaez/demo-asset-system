# Application on Workers Free

## Production request path

All application pages now use public static shells and browser React rendering. Flat routes are served directly by Cloudflare Assets; dynamic asset detail/edit and document URLs serve the same public shell through the small Worker. No shell contains accounts, assets, sessions or authenticated records.

`worker.ts` first handles the existing native transfer/search/logout routes, then loads `.edge-app/app-handler.mjs`. Production requests do not load Next SSR, OpenNext rendering, or Prisma's query compiler. Next remains the local development framework and stylesheet build input.

The native application reuses the existing server page functions, permission checks, validation, action functions and API handlers. A build-only JSX adapter produces compact view descriptions instead of server-rendered HTML. The browser decodes those descriptions into the original UI and explicitly registered client components. Forms and scanner components load as separate browser chunks. Component/action references come from a build-time allowlist; there is no public model-query or arbitrary SQL endpoint.

`edge/d1-repository.ts` translates the application's supported query vocabulary into parameterized D1 statements. Relations use bounded JSON subqueries, without an N+1 query loop. The generated `edge/models.json` contains schema metadata only. Unsupported operations fail rather than falling back to a compiler. Writes hydrate dates/booleans, retain audit triggers, and use compare-and-swap snapshots. The existing borrowing transaction and settings upsert array use transactional D1 batches with conflict guards.

## Authentication and data safety

- The existing Google provider, domain restriction, account callbacks and database sessions are retained, using Auth.js core without Next. The adapter reads/writes through the native repository. Existing secure session cookies remain valid.
- Every private page/action/API validates the database session and current account status. Existing functions still enforce role, department, asset and requester permissions. Public branding and account-status screens expose no private data.
- Private responses use `private, no-store` and `Vary: Cookie`. No authenticated HTML, DTO, file or session is stored in the service-worker cache.
- Mutations require same-origin requests. Streamed body limits also apply when Content-Length is absent: 64 KiB for ordinary actions/JSON, 2 MiB for attachment envelopes and 8 MiB only for Superadmin settings uploads. Existing per-field/file validation remains in place.
- Logout revokes the current database session when available and always clears the browser cookie, including during a database outage.
- D1's daily quota response becomes a clear 503 with the next reset time and Retry-After. No failed mutation is automatically replayed.

## Bounded work

Main asset, user, maintenance, incident, verification, disposal, report, notification and audit lists use 25-record pages. Borrowing and transfer pages retain their 20-record pagination. User summary counts use a separate aggregate, rather than counting the visible page. Reference choices are bounded at 2,000 records per collection; exceptionally large reference datasets will need an asynchronous lookup control before exceeding that size. Nested histories are bounded at 100 rows.

CSV/PDF exports fetch authorized asset data in 100-record chunks and generate files in the browser. PDFs use multiple pages. QR PNG generation also runs in the browser; the Worker only validates access to the asset. This avoids CPU-heavy document/image generation on a 10 ms Worker request budget.

D1 constraints are handled explicitly: at most 100 SQL bindings per statement, JSON construction in groups of at most 31 function arguments, JSON-array parameters for IN filters, chunked bulk notifications, and literal substring search rather than long LIKE patterns. Additional indexes reduce repeated scans of assignments, borrowing, maintenance, verification, incidents and documents.

## Build and deployment

```powershell
npm run build
npx opennextjs-cloudflare deploy
```

The postbuild builds OpenNext, the transfer shell, schema metadata and the native application/browser shells. Keep `worker.ts` as Wrangler's entry point and asset-first routing enabled. Deploy the Worker and assets together. Do not deploy `.open-next/worker.js` as the production entry point: that restores the old SSR path.

Apply these additive performance migrations once to an existing database:

```powershell
npx wrangler d1 execute asset-management --remote --file prisma/migrations/202610190001_worker_transfer_indexes/migration.sql
npx wrangler d1 execute asset-management --remote --file prisma/migrations/202610190002_app_query_indexes/migration.sql
```

These migrations create indexes only, using IF NOT EXISTS; they change no records or columns. Each has a rollback file that removes only its indexes. Existing audit/verification migrations remain prerequisites. Do not rerun the baseline or seed production.

## Verification and limits

The automated suite exercises the native application against disposable SQLite databases with the actual baseline, audit triggers and indexes. It covers every page pattern, three roles, scoped reads, create/edit forms, settings, reference data, account changes, notifications, borrowing, maintenance, incidents, verification, exports, QR authorization and Auth.js session/CSRF/provider endpoints. Browser component rendering is additionally checked through a test-only React stream renderer; production does not import that renderer.

The earlier transfer-only release passed 73 actual D1 requests with CPU p50 1.788 ms and p99 5.140 ms. That result is not a measurement of the expanded application.

During this migration, the Cloudflare account reached its daily D1 read allowance during synthetic testing. Direct live D1 validation of the expanded application is therefore pending the next midnight-UTC reset (08:00 Malaysia time). The full application is also tested with recorded, synthetic query responses on a temporary Worker **without a D1 binding**, to check Worker rendering CPU without consuming more database reads. Those replay measurements exclude real D1 SDK/database overhead and must not be reported as end-to-end D1 performance.

No production session was impersonated or fabricated. Temporary synthetic Workers/databases and fixture captures are separate from production and are removed after testing. Diagnostic captures remain under ignored `.wrangler/backups/app-perf/`. Interactive signed-in/mobile visual testing remains unverified because there is no connected browser surface.

Workers Free and D1 still have finite CPU, request, read, write and storage quotas. Static rendering and indexes reduce usage; they cannot remove those platform limits. Monitor real D1 reads after reset and avoid large repeated load tests on the production account's free allowance.

Sources: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [D1 pricing and quotas](https://developers.cloudflare.com/d1/platform/pricing/), [static asset routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/).

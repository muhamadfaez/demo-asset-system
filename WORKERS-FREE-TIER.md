# Transfers on Workers Free

## Why the request path changed

Cloudflare Workers Free allows 10 ms of CPU per request. Error 1102 means a CPU or memory limit was exceeded. The previous `/transfers` request executed Next server rendering, Auth.js and Prisma's query compiler, including nested relations and up to 100 rendered transfer cards. Across the production Worker, Cloudflare reported 43 `exceededResources` invocations before this release. Those aggregate metrics do not identify every affected route.

## Production architecture

- `/transfers` is a public static HTML **shell** with a content-addressed browser bundle. Cloudflare serves it directly from static assets, without invoking Next. It contains no accounts, sessions or transfer records.
- `GET /api/edge/transfers` validates the existing Auth.js database session, checks the current account status and role, and reads a minimal DTO with parameterized D1 SQL. No authenticated responses are cached (`private, no-store`, `Vary: Cookie`). The browser redirects invalid or inactive sessions to the existing account pages.
- History is paginated at 20 rows, with exact scoped summary counts. Asset and room choices are capped at 100 with search fields. Search results and page changes cancel superseded requests; there is no polling or automatic mutation retry.
- `POST/PATCH /api/workflows/transfers`, `GET /api/users/search` and `POST /api/edge/logout` bypass Next and Prisma through `edge/router.ts`. Mutations require a same-origin request and an active session, validate input, enforce requester/department scope, and cap JSON bodies at 8 KiB.
- Transfer decisions use D1's transactional `batch`, conditional writes and a unique audit marker. Asset changes, assignments, audit records and notifications commit together. Replays and stale requests return 409 without repeating side effects. Accountable `Asset.custodianId` is preserved.
- `worker.ts` loads the existing OpenNext handler only for other routes. Existing Next/Auth.js functionality remains available. Navigation into transfers uses a full document request; older Next clients receiving static HTML also fall back to document navigation.
- `components/transfers-view.tsx` and the existing action forms are shared between the browser entry and local Next route. Small build-only navigation/image/logout adapters let the static screen reuse the application's navigation without a Next server runtime. Native images avoid invoking Next image optimization on this screen.

Other application pages still use Next server rendering. This release removes the expensive request path for transfers and user search; it does not guarantee that every other route fits a 10 ms CPU budget. Free-tier daily Worker and D1 quotas still apply.

## Build and database setup

`npm run build` runs Next/OpenNext, then `scripts/build-static-transfers.mjs`. The final step places `transfers.html`, hashed JavaScript and static headers in `.open-next/assets`. The page uses the shared compiled stylesheet, including the native date/time containment rules. Tailwind scans `static-transfers` as well as the existing source directories.

After a successful build, deploy with `npx opennextjs-cloudflare deploy`. Deploy the whole assets/Worker output together. Wrangler's entry point must remain `worker.ts`; default asset-first routing must remain enabled so `/transfers` does not invoke server rendering.

Apply the read-performance indexes once to an existing production database:

```powershell
npx wrangler d1 execute asset-management --remote --file prisma/migrations/202610190001_worker_transfer_indexes/migration.sql
```

This migration only creates indexes, with `IF NOT EXISTS`. It changes no columns or records. The matching `rollback.sql` removes only these indexes. Do not rerun the baseline or seed a production database. Existing audit migrations remain prerequisites.

Local `npm run dev` uses the Next route and existing Prisma handlers. Use the normal Cloudflare preview workflow to exercise the production Worker routing; `npm test` exercises the native router against a disposable SQLite database with the real baseline, audit triggers and performance indexes.

## Validation on 19 October 2026

- 100 tests passed across 19 files, including 12 native-path tests covering sessions, permissions, scoped reads, query indexing, malformed/oversized bodies, stale destinations, replay protection, atomic rollback and logout.
- Production build, types and lint passed with the three pre-existing component warnings and existing Prisma/OpenNext build notices.
- A separate temporary Cloudflare Worker/D1 database contained only synthetic accounts and data: 1,000 historical transfers, then 120 extra assets/rooms and 1,000-character reasons. No production session was impersonated or fabricated.
- 73 live synthetic requests passed: 70 authenticated paginated reads, submission (201), approval (200), and replay rejection (409). Larger responses contained 100 asset choices, 100 room choices and 20 transfers (about 63 KiB).
- Cloudflare's adaptive invocation metrics reported CPU p50 **1.788 ms**, p99 **5.140 ms**, and **0 runtime errors** for those 73 requests, before adding the performance indexes. These are measurements of this test, not a guarantee for every future request or traffic level.
- Temporary test Worker and database were deleted. Results and metric snapshots are kept locally under ignored `.wrangler/backups/perf/`.
- Live production checks confirmed static transfers HTML, immutable JavaScript, protected/no-store native APIs, existing login/protected-asset fallback and service-worker headers.
- Interactive signed-in/mobile visual verification remains unavailable because the session has no connected browser surface.

Sources: [Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/), [Error 1102](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1102/), [static asset routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), [OpenNext custom Workers](https://opennext.js.org/cloudflare/howtos/custom-worker).

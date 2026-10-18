# Asset audit records

## What changed, file by file

| File | Change |
| --- | --- |
| `prisma/schema.prisma` | Asset type and verification enums; nullable procurement, warranty/support and custody fields; user relations; P.O./purchase-date indexes; typed database-backed documents. Existing columns retained. |
| `prisma/migrations/202610180001_asset_audit_records/migration.sql` | Additive SQLite/D1 migration. Per-field audit triggers for asset create/update/delete and attachment metadata changes. A verification insert trigger atomically updates the asset summary and its audit records. |
| `prisma/migrations/202610180001_asset_audit_records/rollback.sql` | Removes the feature triggers/indexes and added columns. Copies all asset and document data into `AssetAuditRollback_Asset` and `AssetAuditRollback_Document` first, preserving new data and attachment bytes. |
| `lib/validation.ts` | Shared browser/server Zod validation for procurement requirements, legacy waivers, finite non-negative costs, date order, warranty order, and assigned/AVAILABLE conflicts. Rejects impossible calendar dates. |
| `lib/asset-search.ts` | Shared P.O., supplier-name and ISO purchase-date search alongside tag/name/serial search. |
| `lib/asset-audit-log.ts` | Orders recent audit records chronologically across historical ISO-text dates and new millisecond timestamps. |
| `lib/asset-search-db.ts` | Matches purchase dates stored as either legacy ISO text or newer millisecond timestamps, without rewriting historical data. |
| `lib/asset-attachments.ts` | Attachment labels, allowed MIME types, and 1 MB file limit. |
| `app/api/assets/route.ts` | Persists all editable fields; derives Kulliyyah/building on the server; validates supplier, funding source, custodian and assignee; generates tags and locks them on edit; restricts statuses and workflow-owned assignment changes. Database triggers replace best-effort snapshot audit writes. |
| `app/api/assets/attachments/route.ts` | Scoped upload/download/removal with authenticated access. Stores base64 bytes in the existing document table. Removal records the actor atomically using D1 batch or a local Prisma transaction. |
| `app/api/workflows/verification/route.ts` | Role- and department-restricted verification submission with campaign organisation checks. The verification insert and asset summary are committed atomically by a trigger. |
| `app/api/workflows/transfers/route.ts` | Clarifies that existing transfer custody columns refer to Assigned To; adjusts user-facing messages without changing transfer semantics. |
| `app/(app)/transfers/page.tsx` | Calls existing transfer recipients assigned users, distinguishing the new accountable custodian. |
| `app/(app)/transfers/transfer-actions.tsx` | Clarifies transfer labels and explains where accountable custody is edited. |
| `app/api/workflows/borrowings/route.ts` | Records the actor on asset state updates; returns assigned assets to ASSIGNED. |
| `components/asset-audit-form.tsx` | Shared sectioned registration/edit form, required marks, inline errors, derived location labels, separate custody and assignment, read-only verification, and collapsed optional sections. |
| `components/asset-registration-form.tsx` | Preserves serial-barcode scanning and uses the shared form; new institutional tags are generated on save. |
| `app/(app)/assets/[id]/edit/asset-edit-form.tsx` | Uses the shared audited form. |
| `app/(app)/assets/[id]/edit/page.tsx` | Loads supplier/funding options, existing brand, custodian, verification actor and document metadata. |
| `components/asset-attachments.tsx` | Typed upload, download and removal controls, with upload progress/error messages. |
| `components/verification-form.tsx` | Campaign/asset/result submission UI. |
| `app/(app)/verification/page.tsx` | Loads scoped assets/campaigns and presents the verification action above existing records. |
| `components/module-page.tsx` | Procurement, warranty, custody, verification and attachment details; procurement list search; field-level audit values and record IDs in Audit Logs. |
| `app/(app)/master-data/page.tsx` | Supplier and funding-source management alongside existing category management. |
| `app/(app)/reference-data/types.ts` | Supplier/funding-source reference kinds. |
| `app/(app)/reference-data/actions.ts` | Admin-only supplier/funding-source creation and editing using the existing manager and audit module. |
| `tests/asset-audit-validation.test.ts` | Procurement, legacy, cost, calendar/date ordering, assignment, upload and search tests. |
| `tests/asset-api.test.ts` | Server-side derived locations, locked/generated tags, role restrictions, workflow statuses and procurement validation. |
| `tests/asset-supporting-records.test.ts` | Upload/download/removal scoping, actor capture, verification roles and campaign scope. |
| `tests/asset-legacy-dates.test.ts` | Exercises actual Prisma edits, field audit writes, mixed-format purchase-date search and chronological audit ordering against a disposable database loaded with legacy demo fixtures. |
| `tests/asset-migration.test.ts` | Runs the isolated migration integration check through Vitest. |
| `tests/asset-migration-check.py` | In-memory SQLite baseline/demo import, migration, atomic audit failure, attachment audits, verification summary/order and rollback checks. Requires Python 3 with SQLite JSON support. |
| `tests/permissions.test.ts` | Updates the existing valid-assignee fixture to use ASSIGNED rather than AVAILABLE. |
| `package.json` | Replaces unsupported `next lint` with `eslint .`. |
| `eslint.config.mjs` | ESLint 9 flat configuration using the installed Next.js rules. |
| `README.md` | Fresh database setup and this delivery reference. |
| `CLOUDFLARE-SETUP.md` | Includes the audit migration when initializing a new Cloudflare database. |
| `ASSET-AUDIT-CHANGES.md` | Implementation, migration, rollback and decision record. |

## Apply and roll back

Migration: **202610180001_asset_audit_records**. The initial implementation did not modify an existing or remote database; the subsequently authorized production rollout is recorded below. Integration tests use an in-memory SQLite database and import the checked-in baseline/demo SQL. The pre-existing untracked `prisma/baseline-console.sql` is unchanged.

The project previously used `db push` and checked-in baseline SQL, without a migration history. Apply this SQL once to an existing baseline database; do not use `prisma migrate deploy` against an unbaselined database. `db push` alone cannot install the required audit and verification triggers.

For an existing **local/dev** SQLite database, with `DATABASE_URL` pointing to that database:

```powershell
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/202610180001_asset_audit_records/migration.sql
npx prisma generate
```

For an existing **local D1** baseline database:

```powershell
npx wrangler d1 execute asset-management --local --file=prisma/migrations/202610180001_asset_audit_records/migration.sql
```

Stop the new application before rollback and retain a database backup. Local SQLite rollback:

```powershell
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/202610180001_asset_audit_records/rollback.sql
```

Local D1 rollback:

```powershell
npx wrangler d1 execute asset-management --local --file=prisma/migrations/202610180001_asset_audit_records/rollback.sql
```

After rollback, run the previous application/schema version and regenerate its Prisma client. Rollback deliberately keeps the archive tables; the previous application ignores them. Archive tables contain financial information and uploaded files, so retain the same database access controls. Restore these archived fields explicitly if later reapplying the feature; forward migration does not silently overwrite existing records from archives. Each rollback archive name is created once; preserve/rename an earlier archive before a subsequent rollback.

For a brand-new local database, run `prisma/baseline.sql` followed by the migration instead of `db push`. The existing seed resets data, so run it only against a disposable development database. Never run the seed against an existing database that must retain records.

## Decisions and scope

- Existing camelCase columns are reused: purchase date is `acquisitionDate`, P.O. is `purchaseOrderNumber`, warranty end is `warrantyExpiryDate`, and last verified date is `lastVerificationDate`. Supplier and funding source use the existing foreign keys. Free-text brand is `brandName`; existing `brandId` and `Brand` records are preserved and used as the initial edit value.
- New/existing assets default to INVENTORY, matching the existing lack of mandatory procurement fields. Staff can classify an asset as FIXED_ASSET; the full procurement rules then apply. All new columns are nullable or defaulted, and existing demo records remain editable.
- P.O. remains an indexed string. A new `purchase_orders` module/table is deferred because there is no existing purchasing workflow. Assets can share a P.O. number, but referential integrity for purchase orders is not enforced.
- Attachments use the existing `AssetDocument` model with base64 content, a type label and actor. PDF/JPEG/PNG/WebP are supported, up to 1 MB each. Download is authenticated, scoped, private and served as an attachment. Raw bytes are excluded from audit records; identifying metadata is audited. Storage usage grows with uploaded files and audit history.
- Supporting records are uploaded after the first asset save, from either detail or edit. This prevents orphaned files from a cancelled registration. Upload/removal actions save independently of the main edit form.
- Both asset tag creation and editing are server-controlled. No manual admin tag override was added; the existing administrator role did not have a dedicated tag-override action.
- Manual status choices are DRAFT, PENDING_APPROVAL, AVAILABLE and ASSIGNED. Other existing states remain visible and locked, including the assignee when a workflow owns the state. Manual DISPOSED is rejected. Assignment plus AVAILABLE is an explicit error instead of silent conversion. Assigned assets remain non-borrowable.
- The existing transfer workflow moves Assigned To (its legacy columns are named `currentCustodian`/`newCustodian`). That behavior is preserved, and its UI now explicitly calls this the assigned user. The new accountable custodian is edited separately on the asset. Existing pending transfers and assignment histories keep their meaning.
- Verification results do not themselves alter asset operational status. The summary updates on new verification checks, maps recognised existing-style result spellings, and ignores older checks for summary purposes. Existing check history remains intact; historical summaries are not bulk rewritten.
- Database triggers ensure asset and document metadata writes cannot succeed without their field audit rows. Application asset writes supply `updatedById`; attachment removal supplies the removing actor. Administrative SQL writers must likewise supply the acting user, or leave it null for system operations. No hard-delete UI/API was introduced; delete triggers cover actual database deletions.
- The D1 Prisma adapter in this repository explicitly ignores transactions. New verification uses a single insert with database triggers; document removal uses D1's native atomic batch. Existing unrelated workflow transaction architecture is outside this change.
- Category financial settings do not exist, so useful life/depreciation configuration and a new book-value calculation are deferred. Existing financial columns are preserved and are not exposed as manual per-asset depreciation inputs.
- Production-backup compatibility checks found that an optimistic DateTime equality filter rejected older ISO-text timestamps. Updates now guard the workflow status and assignee without comparing differently encoded timestamps. Purchase-date search and audit-log ordering handle both encodings; the original database values remain intact.
- Purchase dates can be searched as `YYYY-MM-DD` in the existing list search; supplier names and P.O. numbers use the same search field.

## Validation

- `npm test`: 86 tests passed across 18 files, including in-memory SQL migration/demo/rollback checks.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with zero errors and five existing warnings in unchanged shared components (`reference-manager`, `app-icon`, `icon-upload`, `user-autocomplete`).
- No seed reset was executed. Interactive browser/OAuth verification was not performed because no browser was available to the session. The subsequent production rollout is recorded below.

## Authorized production rollout: 18 October 2026

- Live site: https://demo1.faezapp.workers.dev
- Worker version: `dbf2fa95-ecfe-4958-8e11-3ca445c4a394`.
- Previous pre-feature Worker version retained by Cloudflare: `ac9a16af-9996-4e8c-8a8c-da7c36dc3be3`.
- Exported the original production database to `.wrangler/backups/asset-management-before-audit-20261018.sql`, which is ignored by Git. Backup hash and deployment details are saved in `.wrangler/backups/asset-audit-production-release.json`.
- Restored that backup into an in-memory database and verified the migration preserved every original asset value, row counts and foreign keys before applying the same migration remotely.
- Applied `202610180001_asset_audit_records` successfully to the existing production D1 database. No seed/reset, asset deletion, or user deletion was performed.
- Production post-deployment counts: 10 assets, 2 users, 0 documents, 13 existing audit logs and all 7 feature triggers. Foreign-key check returned no errors.
- Fixed legacy timestamp compatibility for editing, purchase-date search and recent-audit ordering. Added real-Prisma regression tests using synthetic demo fixtures in a disposable local database.
- Final production build, type checks and lint passed (with the previously documented warnings). All 86 tests passed across 18 files.
- Eight live HTTP checks passed: login page, configured Google provider, CSRF endpoint, protected asset read/create, protected attachment download, protected verification submission and the unauthenticated asset-edit redirect.
- Signed-in browser/form testing remains unverified because this session had no browser available. Live tests did not create accounts, attachments, verification checks or assets.

## Mobile asset-form refinement

- `components/asset-audit-form.tsx`: separate labelled sections, single-column mobile layout and two-column wider layout, clearer procurement guidance, department/room names first in dropdown labels, optional disclosure chevrons, readable verification facts, contextual save buttons and focus on the first validation error.
- `app/globals.css`: explicit zero-minimum grid tracks and bounded controls, mobile 16 px input text, 44 px touch targets, date-input width rules, wrapping long helper/error text, responsive section spacing and save actions. No page-level overflow masking or clipping of user-search popovers.
- `components/user-autocomplete.tsx`: bounded dropdown sizing, wrapping selected-user details, touch-friendly clear control, pointer-safe result selection and corrected combobox/option ARIA attributes.
- `components/asset-attachments.tsx`: bounded file/select controls, wrapping long filenames and human-readable document-type labels.
- `components/asset-registration-form.tsx`: bounded scanner/manual input layout and reduced mobile card padding.
- `components/ui.tsx`: cards may shrink within grid/flex layouts instead of inheriting oversized minimum content widths.
- `app/(app)/assets/[id]/edit/page.tsx`: consistent mobile card padding.
- All 86 existing tests passed. Final production build, type and lint checks passed, with three remaining warnings in unrelated components. Compiled CSS was checked for the responsive grid and bounded control/date/text rules.
- Interactive viewport screenshots remain unavailable because the session has no browser surface. This is a styling/form-usability update; no database migration is required.

Mobile refinement deployed as Worker version `400cd371-e145-4655-9163-14197a2f73c5`. Live login, Google provider, protected create/edit redirects and responsive stylesheet rules all passed. The live stylesheet is `/_next/static/css/2eedd13149d5a7af.css`. Deployment metadata is saved in `.wrangler/backups/asset-form-mobile-release.json`.

## Shared date/time picker containment: 19 October 2026

- `app/globals.css`: moved date sizing from the asset-only selectors into shared rules covering date, datetime-local, time, month and week controls on every page. Native WebKit editor content can shrink inside its input border, while the browser's picker remains available.
- Added base-layer form/fieldset/label minimum-width rules, single-column default tracks for form grids, and bounded text/select/file controls. Responsive grid and explicit width utilities retain precedence; horizontal filter controls retain their natural widths.
- Existing static date pickers are in borrowing requests, maintenance scheduling and incident discovery; acquisition/received/warranty dates are generated by the shared asset form. All use the same sizing rules now.
- All 86 tests passed. Production build, type checks and lint passed with the same three pre-existing warnings. Compiled CSS checks confirmed global picker rules, WebKit editor sizing, responsive grid rules and horizontal-filter sizing.
- A visual check on the affected device remains unverified because this session has no browser surface. Deployment details are recorded locally in `.wrangler/backups/global-date-picker-release.json`.

## Simplified asset assignment: 19 October 2026

- Removed the Custodian picker from the shared create/edit form; Assigned To remains available for existing workflows.
- Retained stored custodian records and detail information. PATCH preserves custody when omitted, while explicit API updates/clears remain supported. No database migration or data deletion.
- Added regression coverage for omitted custody and explicit clearing. All 88 tests passed across 18 files; production build, types and lint passed with the existing warnings.
- Signed-in visual checks remain unavailable because this session has no browser surface.

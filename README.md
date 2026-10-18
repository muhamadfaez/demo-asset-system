# IIUM Kulliyyah Asset Management System

A production-oriented Next.js asset management system for Kulliyyah, department, unit, office, lab, classroom, and staff assets.

## Features

- Google OAuth via Auth.js, Prisma sessions, domain checks, pending approvals, suspended/inactive blocking.
- Role-based access for Superadmin, Asset Liaison, and User.
- Database-backed modules for assets, borrowing, assignments, transfers, maintenance, verification, incidents, disposal, reports, notifications, users, locations, master data, audit logs, and settings.
- Asset QR generation, printable labels, CSV and PDF report exports.
- Server-side Zod validation and permission checks on API routes.
- Prisma schema with relational models, constraints, indexes, timestamps, and soft archive fields.
- Seed data including one Superadmin, Asset Liaisons, users, locations, 30 assets, workflow records, notifications, and audit logs.
- Vitest coverage for permissions and core business rules.

## Requirements

- Node.js 22+
- npm 11+
- SQLite locally, or replace `DATABASE_URL` with Neon PostgreSQL for hosted scale.

## Setup

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

## Google OAuth

Create Google OAuth credentials and set:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `AUTH_SECRET`
- `AUTH_URL` / `NEXTAUTH_URL`
- `PERMITTED_EMAIL_DOMAIN`, default `@iium.edu.my`

Set `SUPERADMIN_EMAIL` before seeding to make that Google account the seeded Superadmin.

## Commands

```bash
npm run build
npm run test
npm run db:push
npm run db:seed
```

## Deployment

The deployed app runs on Cloudflare Workers with OpenNext and uses the D1 binding in `wrangler.jsonc`. Store OAuth and Auth.js secrets as Worker secrets, never in source. Run `npm run deploy` after building and validating changes.

### First deployment in a new Cloudflare account

Use `npm run build` as the Workers Builds build command and `npx wrangler deploy` as the deploy command. The Worker name is `demo-asset-system`.

The D1 binding intentionally omits `database_id` so Wrangler can provision `asset-management` in the deployment account. After the first successful deployment, copy the created database ID from the Cloudflare D1 dashboard into the `DB` entry in `wrangler.jsonc` and commit it to keep subsequent deployments pinned to that database.

Before using the app, initialize the new, empty database with `prisma/baseline.sql`. With Wrangler logged into the deployment account and the database ID configured, run:

```bash
npx wrangler d1 execute asset-management --remote --file=prisma/baseline.sql
```

Alternatively, execute the contents of `prisma/baseline.sql` in the new database's D1 console. Apply this baseline only once to a new database. Configure `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and the production `AUTH_URL` before signing in; the Google OAuth redirect URI is `<AUTH_URL>/api/auth/callback/google`.

### Demo records on D1

To add ten sample assets and example workflow records to an existing D1 database, run:

```bash
npx wrangler d1 execute asset-management --remote --file=prisma/demo-data.sql
npx wrangler d1 execute asset-management --remote --file=prisma/demo-workflows.sql
```

These imports keep existing records and can be rerun without duplicating the demo rows. They require an active Superadmin and User account. Demo assets use `DEMO-001` through `DEMO-010` and cover eight statuses. The workflow examples include borrowing, transfer, maintenance, verification, incident, disposal, assignment, and a notification. For a local D1 database, replace `--remote` with `--local` after creating local tables and test users.

## Backup And Restore

For SQLite, back up `prisma/dev.db`. For Neon/PostgreSQL, use scheduled `pg_dump` backups and test restores into a staging database. Always include uploaded document storage in backup procedures.

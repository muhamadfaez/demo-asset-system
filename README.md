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

See [PWA-AND-SEARCH.md](PWA-AND-SEARCH.md) for workspace search, admin icon uploads, installation settings, and offline behaviour.

The deployed app runs on Cloudflare Workers with OpenNext and uses the D1 binding in `wrangler.jsonc`. Store OAuth and Auth.js secrets as Worker secrets, never in source. Run `npm run deploy` after building and validating changes.

### First deployment in a new Cloudflare account

Follow [CLOUDFLARE-SETUP.md](CLOUDFLARE-SETUP.md) for the complete steps from a new Cloudflare account to Google sign-in, the Superadmin dashboard, and demo data. It includes troubleshooting for the deployment and authentication errors encountered during setup.

The checked-in configuration currently targets Worker `demo1` and its initialized D1 database. For another account, change the Worker name, database UUID, and administrator email in your own fork or deployment branch before deploying.

### Demo records on D1

To add ten sample assets and example workflow records to an existing D1 database, run:

```bash
npx wrangler d1 execute asset-management --remote --file=prisma/demo-data.sql
npx wrangler d1 execute asset-management --remote --file=prisma/demo-workflows.sql
```

These imports keep existing records and can be rerun without duplicating the demo rows. They require an active Superadmin and User account. Demo assets use `DEMO-001` through `DEMO-010` and cover eight statuses. The workflow examples include borrowing, transfer, maintenance, verification, incident, disposal, assignment, and a notification. For a local D1 database, replace `--remote` with `--local` after creating local tables and test users.

## Backup And Restore

For SQLite, back up `prisma/dev.db`. For Neon/PostgreSQL, use scheduled `pg_dump` backups and test restores into a staging database. Always include uploaded document storage in backup procedures.

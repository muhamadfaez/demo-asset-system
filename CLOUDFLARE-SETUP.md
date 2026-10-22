# Cloudflare setup: from a new account to the admin dashboard

This guide deploys this Next.js project to Cloudflare Workers with OpenNext, D1, and Google sign-in. It includes the fixes used to bring the current deployment online on 18 October 2026.

## 1. Prepare the accounts and project

You need a Cloudflare account, access to this GitHub repository, a Google Cloud project where you can create OAuth credentials, Git, and Node.js with npm. Use Node.js 24 for this lockfile; one scanner dependency requires Node.js 24 or later.

For a separate Cloudflare installation, use a fork or a separate deployment branch so its account-specific configuration does not replace the current site's configuration.

```powershell
git clone https://github.com/muhamadfaez/demo-asset-system.git
cd demo-asset-system
npm ci
npx wrangler login
npx wrangler whoami
```

Complete the browser authorization. Confirm that `whoami` lists the Cloudflare account where you intend to deploy. If it lists another account, run `npx wrangler login` again and choose the correct login in the browser.

Choose these values before continuing:

| Value | Example for a NEW installation |
|---|---|
| Worker name | `my-asset-system` |
| D1 database name | `asset-management` |
| Administrator Google email | `admin@iium.edu.my` |
| Allowed email suffix | `@iium.edu.my` |

Replace the examples throughout this guide with your actual values. The administrator email must match the Google account exactly and must pass the allowed email suffix check.

## 2. Create D1 in the destination account

In Cloudflare, open **Storage & databases → D1 SQLite Database → Create Database**. Name it `asset-management`, create it, and copy its complete database UUID.

Alternatively, use:

```powershell
npx wrangler d1 create asset-management
npx wrangler d1 list
```

If you have multiple accessible accounts, set the destination account explicitly in the project terminal before running Wrangler:

```powershell
$env:CLOUDFLARE_ACCOUNT_ID = "YOUR_DESTINATION_ACCOUNT_ID"
```

The existing repository UUID belongs to the current installation. It will not work in an unrelated Cloudflare account.

## 3. Update the deployment configuration

Edit `wrangler.jsonc` in your fork or deployment branch. Change `name`, `SUPERADMIN_EMAIL`, and `database_id`. The Worker name must match the name you will create in the Cloudflare dashboard.

```json
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "my-asset-system",
  "keep_vars": true,
  "vars": {
    "SUPERADMIN_EMAIL": "admin@iium.edu.my"
  },
  "main": "worker.ts",
  "compatibility_date": "2026-08-02",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "asset-management",
      "database_id": "YOUR_NEW_DATABASE_UUID"
    }
  ],
  "observability": {
    "enabled": true
  }
}
```

Keep the binding name `DB`; the application reads that exact name. Keep `keep_vars: true` to preserve dashboard text variables across deployments. Values explicitly defined under `vars` in this file take precedence over dashboard values, so update `SUPERADMIN_EMAIL` here rather than relying on a conflicting dashboard value.

Commit and push the configuration to your deployment repository/branch:

```powershell
git add wrangler.jsonc
git commit -m "Configure Cloudflare installation"
git push
```

## 4. Initialize the empty database

Run this once against the NEW, empty database:

```powershell
npx wrangler d1 execute asset-management --remote --file=prisma/baseline.sql
npx wrangler d1 execute asset-management --remote --file=prisma/migrations/202610180001_asset_audit_records/migration.sql
```

These commands create the application tables and install the asset audit fields and triggers; they do not create user accounts. Do not rerun the baseline against an initialized database. Do not use `npm run db:seed` to populate remote D1: that script is for the local Prisma database and creates local demo users.

Verify the essential tables:

```powershell
npx wrangler d1 execute asset-management --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('User','Account','Session','SystemSetting');"
```

Expected: `User`, `Account`, `Session`, and `SystemSetting` appear.

### Dashboard alternative

Open **D1 → asset-management → Console**. Paste and execute the SQL from `prisma/baseline.sql`, preserving line breaks.

If the Console says **No SQL statements detected**, the paste may have flattened the file into one line. The opening `--` comment then comments out the rest of the SQL. Generate a comment-free copy in PowerShell:

```powershell
$schemaLines = Get-Content prisma/baseline.sql | Where-Object { $_ -notmatch '^\s*--' }
$schemaLines -join [Environment]::NewLine | Set-Clipboard
```

Paste the clipboard into the Console and execute. Use this only for the initial empty database.

## 5. Set the permitted Google email domain

The application defaults to `@iium.edu.my`. An empty `SystemSetting` table is fine: the application supplies defaults.

If you need a different domain, run the following in the D1 Console BEFORE the first sign-in, replacing `@example.edu` with the intended suffix:

```sql
INSERT INTO SystemSetting (key, value, updatedAt)
VALUES ('permittedEmailDomain', '@example.edu', CAST(strftime('%s','now') AS INTEGER) * 1000)
ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=excluded.updatedAt;
```

For this remote D1 deployment, setting only a `PERMITTED_EMAIL_DOMAIN` environment variable does not update the database setting. Google sign-in reads `SystemSetting` and falls back to `@iium.edu.my`.

## 6. Connect GitHub and build the Worker

1. Open **Workers & Pages** in the destination account.
2. Create a Worker using the option to import/connect a GitHub repository.
3. Select your fork/repository and deployment branch.
4. Set its name to the same `name` used in `wrangler.jsonc`.
5. Use these build settings:

| Setting | Value |
|---|---|
| Root directory | Repository root |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Build variable `NODE_VERSION` | `24` |

`npm run build` generates Prisma and styles, then builds the native Worker application and static page shells. The production entry point is `worker.ts`; deploy the Worker and assets together. Choose/create a build API token with access to the Worker and D1 in the destination account when prompted.

6. Start the deployment and wait for success.
7. Copy the actual HTTPS Worker URL from **Visit** or **Domains & Routes**. Example: `https://my-asset-system.your-subdomain.workers.dev`.

A first deployment can succeed before Google credentials are configured. Complete the next steps before trying to sign in.

## 7. Create the Google OAuth client

1. Open Google Cloud Console and select/create your Google Cloud project.
2. Open **Google Auth Platform** (or **APIs & Services → OAuth consent screen**, depending on the UI).
3. Configure the app name, support/contact details, and audience.
4. If using an External app in Testing mode, add your intended login accounts as test users. An Internal audience requires eligible accounts in that Google Workspace organization.
5. Create an OAuth client with application type **Web application**.
6. Set the Authorized JavaScript origin to the site's HTTPS origin, for example:

```text
https://my-asset-system.your-subdomain.workers.dev
```

7. Add this exact Authorized redirect URI:

```text
https://my-asset-system.your-subdomain.workers.dev/api/auth/callback/google
```

8. Save the client ID and client secret for the next step. For a custom domain, use that domain consistently in both Google and `AUTH_URL`.

## 8. Add RUNTIME variables and secrets

Open **Workers & Pages → your Worker → Settings → Variables and Secrets**.

**Use the main Worker runtime section. The separate Variables and secrets section inside Builds only supplies the build environment. Credentials stored only there are unavailable to live Google sign-in.**

| Name | Type | Value |
|---|---|---|
| `AUTH_SECRET` | Secret | New cryptographically random value |
| `GOOGLE_CLIENT_ID` | Secret | Google Web OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Secret | Google Web OAuth client secret |
| `AUTH_URL` | Text or Secret | Exact site origin, such as `https://my-asset-system.your-subdomain.workers.dev` |
| `SUPERADMIN_EMAIL` | Text, defined in `wrangler.jsonc` | Exact administrator Google email |

Generate a new `AUTH_SECRET` locally, then paste the result into Cloudflare:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Save/deploy the runtime settings. Keep secrets out of Git and screenshots. The application also accepts `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`, but use one consistent naming convention.

### CLI alternative

With `wrangler.jsonc` pointing to the intended Worker, these commands prompt for each secret value:

```powershell
npx wrangler secret put AUTH_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put AUTH_URL
npx wrangler secret list
```

Paste the site origin when prompted for `AUTH_URL`. `secret list` shows names, not secret values. Keep `SUPERADMIN_EMAIL` in `wrangler.jsonc`; trying to create a secret with the same name as an existing text binding can fail with “Binding name already in use.”

## 9. Verify Google sign-in and the admin dashboard

1. Visit `<YOUR_SITE_URL>/api/auth/providers`. Expected: JSON containing the `google` provider and your site's callback URL.
2. Visit `<YOUR_SITE_URL>/api/auth/csrf`. Expected: HTTP 200 and JSON containing a token. Do not share this token.
3. Visit `<YOUR_SITE_URL>/login` and choose **Continue with Google**.
4. Use the exact Google account configured as `SUPERADMIN_EMAIL`.
5. Expected: `/dashboard` with Superadmin access, including user administration.

Confirm the database role in D1 Console, substituting your email:

```sql
SELECT email, role, status FROM User WHERE email='admin@iium.edu.my';
```

Expected: `SUPERADMIN`, `ACTIVE`.

### If the intended administrator is pending

The `createUser` event assigns the Superadmin role only when the account is first created. Correcting `SUPERADMIN_EMAIL` later does not change an existing pending user automatically.

After confirming the intended administrator identity and correcting `SUPERADMIN_EMAIL` in the configuration, execute this targeted recovery in D1 Console. Replace the example email with the intended administrator:

```sql
UPDATE User
SET role='SUPERADMIN', status='ACTIVE',
    updatedAt=CAST(strftime('%s','now') AS INTEGER) * 1000
WHERE email='admin@iium.edu.my' AND role='USER' AND status='PENDING';

SELECT email, role, status FROM User WHERE email='admin@iium.edu.my';
```

Click **Check approval status**, or log out and sign in again. This recovery should change only the intended administrator account.

## 10. Add demo data

1. Sign in once with a second, permitted Google account.
2. From the Superadmin account, open **Users**, approve that account, and keep its role as **USER**.
3. Confirm there is an active Superadmin and an active User:

```powershell
npx wrangler d1 execute asset-management --remote --command "SELECT role,status,COUNT(*) AS count FROM User GROUP BY role,status;"
```

4. Import the sample assets, then workflows:

```powershell
npx wrangler d1 execute asset-management --remote --file=prisma/demo-data.sql
npx wrangler d1 execute asset-management --remote --file=prisma/demo-workflows.sql
```

These scripts use stable demo IDs and `INSERT OR IGNORE` so existing records are retained. The workflows depend on the assets and active accounts. Verify the result rather than treating a successful import as proof that every row was inserted.

5. Check the ten assets:

```powershell
npx wrangler d1 execute asset-management --remote --command "SELECT tagNumber,name,status FROM Asset WHERE id LIKE 'demo-asset-%' ORDER BY tagNumber;"
```

Expected: `DEMO-001` through `DEMO-010`. Refresh Assets and the borrowing, transfer, maintenance, verification, incident, and disposal pages to inspect the samples.

## 11. Diagnose failures

### Workers Free CPU allowance

Workers Free has a 10 ms CPU allowance per request. Production now serves static page shells with browser rendering and authenticated native D1 endpoints, including the existing Google authentication and workflow logic. Next SSR and Prisma's query compiler are kept off the production request path. PDF/CSV/QR generation runs in the browser.

See [WORKERS-FREE-TIER.md](WORKERS-FREE-TIER.md) for the build, indexes, validation and limitations. Keep `worker.ts` as the entry point. Private responses are never cached. A daily D1 allowance error returns a clear 503 with the next reset time; the allowance resets at midnight UTC (08:00 Malaysia time). Do not set a higher `cpu_ms` on Free expecting it to change the plan limit, and do not run large repeated load tests against the account's daily D1 allowance.

| Symptom | Check and fix |
|---|---|
| D1 error `10181`, database not found | Use a UUID from the destination account; confirm `wrangler whoami` and `wrangler d1 list`. |
| Worker name mismatch | Match the dashboard Worker name and `wrangler.jsonc` `name`. |
| Login shows “Something went wrong” | Confirm the `DB` binding and that `prisma/baseline.sql` was applied to that database. |
| “No SQL statements detected” in Console | Preserve newlines or strip `--` comments as shown in step 4. |
| `/unauthorized?error=Configuration` or auth endpoints return 500 | Check runtime secrets first. Capture the actual server error; the URL alone is not a diagnosis. |
| `[auth] MissingSecret` | Set `AUTH_SECRET` in the runtime section, not only Builds. |
| Missing Google credential names in logs | Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on the live Worker. |
| Google `redirect_uri_mismatch` | Match Google’s callback URI exactly to `<AUTH_URL>/api/auth/callback/google`. |
| Google denies a test account | Check OAuth audience/test users and organization restrictions. |
| App denies a Gmail/non-IIUM account | Check the `SystemSetting` value `permittedEmailDomain`; its default is `@iium.edu.my`. |
| Administrator lands on `/pending` | Verify the exact email and recover the existing account as shown in step 9. |
| Deployment warns about local/remote config differences | Inspect each difference. Keep the intended values in Git; `keep_vars` preserves dashboard text variables, but explicit local values still take precedence. |

To capture runtime errors, leave this running in one terminal:

```powershell
npx wrangler tail --format pretty
```

Refresh the failing page or repeat the sign-in in the browser. Read the newly generated log and stop tailing with Ctrl+C afterward. Avoid sharing tokens, cookies, or secret values from logs.

## 12. Final success checklist

- [ ] Cloudflare build and deployment complete successfully.
- [ ] Worker name and D1 UUID match the destination installation.
- [ ] Runtime secrets exist and auth endpoints return 200.
- [ ] D1 contains the application tables.
- [ ] Google callback URL matches the actual site URL.
- [ ] Intended administrator is `SUPERADMIN` and `ACTIVE`.
- [ ] Administrator reaches `/dashboard` and can open Users.
- [ ] A second permitted user can register and be approved.
- [ ] If imported, all ten demo assets and workflow examples are visible.

For subsequent deployments, push changes to the connected branch. Keep the same database binding and runtime secrets. The initial baseline is not an upgrade migration; future schema changes need a separate reviewed migration.

## Reference: current working installation

These values identify the existing installation, not defaults to reuse in another account:

| Item | Current value |
|---|---|
| Worker | `demo1` |
| Site | `https://demo1.faezapp.workers.dev` |
| Database | `asset-management` |
| Database ID | `393342a6-4ca0-46c4-ae3e-850255e12675` |
| Administrator | `muhamadfaez@iium.edu.my` |
| Administrator status verified during setup | `SUPERADMIN`, `ACTIVE` |

## Official references

- [Cloudflare Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Cloudflare runtime environment variables](https://developers.cloudflare.com/workers/configuration/environment-variables/)
- [Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Wrangler configuration and keep_vars](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare D1 setup](https://developers.cloudflare.com/d1/get-started/)
- [Auth.js Google provider and callback URI](https://authjs.dev/reference/core/providers/google)
- [OpenNext Cloudflare environment variables](https://opennext.js.org/cloudflare/howtos/env-vars)

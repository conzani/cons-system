# Konzani Construction Management System

An in-house operations system for a construction contractor: tender pipeline, project delivery,
site execution, workforce/payroll, and controlled documents — built with SvelteKit, Svelte 5,
Prisma and MySQL.

## Modules

| Module | Status | What it does |
| --- | --- | --- |
| Dashboard | Live | Permission-aware KPIs: active tenders, projects, sites, workforce, documents, outstanding payroll; tenders closing soon; site progress |
| Tender & Bid Management | Live | Tender register, create/edit/delete, auto numbering (`TEN/YYYY/#####`), 6-stage workflow, requirements, bid team, communications, approvals, submission |
| Project Management | Live | Projects (`PRJ/YYYY/#####`), phases, milestones, project team, contract value, linked tenders/sites, project documents, live cost-to-date |
| Site Management | Live | Site register from tenders, attendance, site team, checklist, material/equipment requests with approval workflow, site documents |
| Human Resources | Live | Employees and payment details, timesheets with overtime calculation and approval, payroll runs with payslip PDF and ledger posting |
| Document Management | Live | Folder tree, document types, SHA-256 checksums, versions, templates, download/preview, activity log |
| Finance | Live | Chart of accounts, double-entry journal, client invoices and receipts, supplier bills and payments, payroll cost allocation, project profitability |
| Procurement | Live | Suppliers, purchase orders and goods receipt (stock + supplier bill + accounts payable) |
| Inventory & Warehouse | Live | Item master, stores, stock receipts/issues, reorder levels, automatic material costing |
| Equipment & Fleet | Live | Plant register, utilisation, fuel/maintenance logs and cost posting |
| Quality Management | Live | Inspections, pass/fail, non-conformance reports and close-out |
| Health, Safety & Environment | Live | Incident register, severity, lost-time days and investigation close-out |
| Engineering | Live | RFI register with responses, drawing register built from controlled documents |
| Reports & Analytics | Live | Revenue/cost/profit, project profitability, cost breakdown, payroll, procurement, inventory, plant and HSE indicators |
| Administration | Live | Company profile, branches, departments |
| Security | Live | Users, roles, granular permission catalogue |

## Stack

- **SvelteKit 2 / Svelte 5** (runes), TypeScript strict, Vite 8
- **Tailwind CSS 4** via `@tailwindcss/vite`, Iconify icons, jsPDF payslips
- **Prisma 6 → MySQL**, bigint primary keys + public IDs, soft deletes
- **bcrypt** password hashing, HMAC-signed session cookies
- **Sentry** for error monitoring
- **adapter-node** for deployment as a long-running Node server

## Getting started

Prerequisites: Node 20+, MySQL 8+, a database and user.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    DATABASE_URL=mysql://user:password@localhost:3306/konzani
#    SESSION_SECRET=<48-byte hex>   # node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Create the schema and seed roles/permissions/admin
npm run db:generate
npm run db:deploy
npm run seed

# 4. Run
npm run dev
```

The seed creates `admin@system.com / admin123` — **change this password immediately** before
letting anyone else use the system.

## Security model

Implemented in the application:

- **Signed sessions.** The `session` cookie is an HMAC-SHA256-signed, expiring token — it cannot be
  forged by editing the value. Sessions last 12 hours, are `HttpOnly` and `SameSite=Lax`
  (`Secure` in production). Legacy/forged cookies are rejected and cleared.
- **Authentication everywhere.** Every page except `/login` requires a session; every `/api/*`
  endpoint returns `401` without one.
- **Route-level permissions.** Each API area maps to a permission per HTTP verb
  (`src/lib/server/access.ts`). Roles and permissions are seeded and enforced; e.g. an Engineer can
  read projects but cannot create them, and cannot list users.
- **Cross-origin write protection.** State-changing API requests with a foreign `Origin` are rejected.
- **Login throttling.** Five failed attempts per IP + email triggers a 15-minute lockout.
- **Account-state checks.** Disabled and soft-deleted accounts are rejected on both login and every
  subsequent request.
- **Upload controls.** Allow-listed extensions (PDF/Office/images/CAD/archives), 25 MB cap,
  server-generated filenames, SHA-256 checksums, path-traversal checks, forced download for
  non-previewable types, and `nosniff`.
- **Document audit trail.** Uploads, downloads, views, updates and deletes record user, IP and device.
- **No password-hash exposure.** User APIs select a safe field set.
- **Security headers.** `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`,
  `Referrer-Policy`, `Permissions-Policy`, `X-Permitted-Cross-Domain-Policies`, HSTS in production.
- **Server-side identity.** Uploads and audit records always use the session user, never a
  browser-supplied `ownerId`.

Before going live, also do this:

1. **Serve over HTTPS.** Set `NODE_ENV=production` so cookies are `Secure`.
2. **Rotate `SESSION_SECRET`** per environment and keep it out of source control.
3. **Untrack uploaded documents.** Uploaded files are currently committed to git. Add `/uploads` to
   `.gitignore` (already done) and run `git rm -r --cached uploads` once, then purge history if the
   documents were ever pushed.
4. **Change the seeded admin password** and give each staff member their own account.
5. **Back up MySQL** and the `uploads/` directory together.
6. Put the app behind a reverse proxy with TLS; set `ORIGIN` to the external URL.

Known limitations (deliberate scope):

- Per-document ACL tables exist (`DocumentPermission`) but only module-level `view_documents` is
  enforced.
- Sessions are stateless; a stolen token stays valid until expiry (no revocation list).
- Login throttling is per process (use a shared store if you run multiple instances).
- No self-service password reset or 2FA yet.

## How the modules connect

The system is designed around the construction value chain rather than isolated screens:

```
Tender → Project → Site → Material request → Purchase order → Goods receipt
                                   ↓                ↓              ↓
                              Site execution     Stock        Supplier bill
                                   ↓                ↓              ↓
                              Timesheets → Payroll → General ledger → Project cost / Reports
                                   ↓                                 ↑
                              Employee documents            Invoices, receipts, plant costs
```

Key integrations:

- **HR → Finance.** Approving (or paying) a payroll record posts a balanced journal entry:
  direct labour is debited and split across the employee's projects/sites using the timesheets for
  that pay period (unallocated labour falls to site overheads); net pay, PAYE, pension/insurance and
  other deductions are credited to their payable accounts. The payroll screen also has
  **Post approved to finance** for a bulk catch-up.
- **Procurement → Inventory → Finance.** Receiving a purchase order creates stock-in movements,
  raises the supplier bill and posts inventory/accounts payable.
- **Inventory → Project cost.** Issuing material to a project/site posts a materials expense against
  that project and reduces inventory.
- **Equipment → Project cost.** Fuel, maintenance and repair logs post plant costs to the project.
- **Invoicing → Receivables.** Issuing an invoice posts receivable/revenue; recording a receipt
  posts cash/receivable and updates the invoice balance.
- **Project costing.** Every journal line can carry a `project_id` and `site_id`, giving live cost to
  date on the project workspace and profitability in Reports.
- **Quality/HSE/Engineering → Projects.** Inspections, NCRs, incidents and RFIs are linked to
  projects and sites without duplicating the project record.

## Project Management

`/projects` lists contracts with value, status, progress, manager, phase/site counts and documents.
`/projects/[id]` opens a workspace with:

- **Overview** — commercials, scope, phase progress, upcoming milestones, sites, cost to date and
  cost breakdown from posted payroll/materials/plant entries
- **Phases & Milestones** — add phases, drag progress (0–100), tick off milestones; the project’s
  headline progress is recomputed automatically (phase average, otherwise completed milestones)
- **Team** — assign employees with construction roles (Project Manager, Site Engineer, Quantity
  Surveyor, Foreman, Safety Officer…)
- **Documents** — every controlled record linked to the project (`documents.project_id`), upload
  directly into the project, download or open in the document library
- **Commercial** — source tenders and execution sites

Projects can be created blank or from a won tender; sites created from that project link back via
`sites.project_id`. A tender converted to a project keeps its `project_id` link.

## Troubleshooting

**`TypeError: Cannot read properties of undefined (reading 'findMany')` in dev**

A dev server that was started before `prisma generate` keeps the old Prisma Client in memory;
new models such as `invoice`, `journalEntry` or `inspection` are then `undefined`. Stop the dev
server, regenerate, and restart:

```bash
npx prisma generate
npm run dev
```

`npm run dev` now runs generation first, and `src/lib/db.ts` logs a clear warning if a stale client
is detected. If Vite still serves old optimised dependencies, delete `node_modules/.vite` once and
restart.

## Sample data (Malawi)

`npm run seed` creates permissions and roles, then a Malawi-localised demonstration dataset:

- **Company**: Konzani Construction Limited, Area 47, Lilongwe, TIN 1234567890
- **Branches**: Lilongwe, Blantyre, Mzuzu
- **Roles**: Administrator, Manager, Engineer, Supervisor, User, Finance Officer, Procurement Officer,
  HR Officer, Quantity Surveyor, Store Keeper, HSE Officer, Quality Officer
- **People**: 8 Malawian employees with MWK salaries and bank details
- **Projects/sites**: Ntcheu District Hospital, M1 Road Rehabilitation (Kamuzu–Zalewa), Blantyre Water
  Supply Expansion, with phases, milestones, sites and teams
- **Commercial**: suppliers (Malawi Portland Cement, Apex Steel, Kanengo Plant Hire, Petroda),
  inventory, plant, invoices, supplier bills, payments, payables and a balanced ledger
- **Operations**: timesheets, October payroll, inspections, NCRs, incidents, RFIs, purchase orders
- **Finance links**: invoices/bills point at supporting documents in the document library
- **Approvals**: two finance records are left in `Pending Approval` to demonstrate the workflow

Demo logins (change before production):

| User | Password | Role |
| --- | --- | --- |
| admin@system.com | admin123 | Administrator |
| finance@konzani.mw | Password123! | Finance Officer |
| procurement@konzani.mw | Password123! | Procurement Officer |
| hr@konzani.mw | Password123! | HR Officer |

For a clean production install without demonstration records:

```bash
SKIP_SAMPLE_DATA=true npm run seed   # PowerShell: $env:SKIP_SAMPLE_DATA='true'; npm run seed
```

## Updating an installation

Use one command so schema, client and seed stay in step:

```bash
npm ci
npm run db:update      # prisma generate + migrate deploy + seed (idempotent)
npm run build
npm start
```

`db:update` is the supported update channel: it applies new migrations, regenerates the Prisma Client
and re-runs the idempotent seed (roles/permissions, chart of accounts, and — unless
`SKIP_SAMPLE_DATA=true` — the demo dataset). Deployments should back up MySQL and `uploads/` first.

## Deployment (adapter-node)

```bash
npm ci
npm run db:generate
npm run db:deploy
npm run build
NODE_ENV=production \
DATABASE_URL=... \
SESSION_SECRET=... \
ORIGIN=https://erp.example.com \
PORT=3000 \
node build
```

`ORIGIN` is required by SvelteKit behind a proxy so form posts pass the origin check. Uploaded
documents are written to `uploads/documents/` relative to the working directory — mount it as
persistent storage and include it in backups.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Apply pending migrations then start Vite dev server |
| `npm run build` | Production build (adapter-node) |
| `npm start` | Run the production server (`node build`) |
| `npm run check` | SvelteKit sync + svelte-check |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run seed` | Seed permissions, roles, admin, document types |

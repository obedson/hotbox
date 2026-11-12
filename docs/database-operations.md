# Database Operations

This document covers the operational decisions and runbooks for the Hotbox
PostgreSQL database (Supabase).

## 1. Connection model and row-level security

The backend uses a **single service-role connection** (`DATABASE_URL`) for all
queries. Row-level security (RLS) is **not enabled**.

Rationale:

- The API is the only writer. Every route resolves the caller from a signed
  JWT and scopes queries by `user_id` / `sender_id` / `claimant_id` in the
  `WHERE` clause. RLS would require issuing `SET LOCAL ROLE` per request and
  per-user policies for 22 tables, which adds latency and complexity without
  changing the trust boundary.
- Enabling RLS with a service-role connection would have no effect anyway,
  because the service role bypasses RLS (`BYPASSRLS`). To use RLS the API must
  connect as `authenticated`/`anon` and set `request.jwt.claims`, which the
  current Node/Express stack does not do.

Production recommendations before scale:

1. Restrict the database user to the minimum required privileges
   (`GRANT` only on used tables; revoke `SUPERUSER`).
2. Set `DATABASE_URL` to the Supabase **transaction pooler** (port `6543`) and
   keep `max` pool size small (currently `10`).
3. Turn on Supabase's network restrictions and/or private networking so the
   database is not reachable from the public internet.
4. If direct-to-database access is ever exposed (mobile, partner integrations),
   enable RLS and move to per-request roles instead of the service role.

## 2. Pagination convention

List endpoints accept `?page=` and `?limit=`:

- `page` defaults to `1`, minimum `1`.
- `limit` defaults to `20`, minimum `1`, maximum `100`.

Responses keep their existing collection key for backward compatibility and add
metadata:

```json
{
  "shipments": [],
  "page": 1,
  "limit": 20,
  "total": 134,
  "totalPages": 7
}
```

Shared helper: `backend/src/utils/pagination.js` (`getPagination`, `paginate`).
Use it for any new list endpoint.

Currently paginated endpoints:

- `GET /api/v1/customer/shipments`
- `GET /api/v1/customer/addresses`
- `GET /api/v1/customer/claims`
- `GET /api/v1/customer/tickets`
- `GET /api/v1/enterprise/shipments`
- `GET /api/v1/enterprise/billing/invoices`
- `GET /api/v1/enterprise/claims`
- `GET /api/v1/enterprise/webhooks`
- Operations: audit logs, exceptions, riders, postcodes, settings, stats

## 3. Audit trail

Two layers exist:

1. **Application level** — `custody_ledger` (immutable chain of custody for
   shipments) and `audit_logs` (operations actions), written by route handlers
   with the authenticated actor.
2. **Database triggers** — `supabase/migrations/03_audit_triggers.sql` installs
   `audit_trigger_func()` on `shipments`, `wallets`, `transactions`, `claims`,
   and `enterprise_accounts`. Every `INSERT`, `UPDATE`, and `DELETE` is recorded
   in `audit_logs` with the full before/after row as JSONB. This is
   tamper-evident even if an application path forgets to log.

The trigger reads the optional `app.current_user_id` session GUC for `actor_id`.
To populate it inside a transaction:

```js
const client = await db.getClient();
try {
  await client.query('BEGIN');
  await client.query(`SET LOCAL app.current_user_id = '${req.user.id}'`);
  // ... writes ...
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

When the GUC is not set, `actor_id` is stored as `NULL` and the change is still
recorded.

## 4. Migrations

Schema changes live in `supabase/schema.sql` (the master schema) and are applied
with the migration runner:

```bash
cd backend
npm run migrate
```

`npm run migrate` runs `scripts/migrate.js`, which applies `supabase/schema.sql`
inside a transaction. Incremental changes that must not be re-declared in the
master schema belong in `supabase/migrations/` and are applied in filename order.

Numbered migrations:

| File | Purpose |
|---|---|
| `01_master_hotbox_schema.sql` | Original master schema |
| `02_wallet_gateway_reference_unique.sql` | Unique constraint on wallet gateway references |
| `03_audit_triggers.sql` | Audit trigger function and sensitive-table triggers |

**Migration runbook**

1. Take a backup (see below) and record the current schema version.
2. Apply the master schema: `npm run migrate`.
3. Apply numbered migrations in order that have not been applied yet.
4. Verify: `node scripts/inspect_db.js` and the backend test suite
   (`npm test`, `npm run test:integration`).
5. Record the new schema version and the applied migration files.

> The master schema is idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF
> NOT EXISTS`, `ON CONFLICT DO UPDATE`), so re-running it is safe.

## 5. Backup and restore

Scripts wrap `pg_dump` / `pg_restore` using `DATABASE_URL`:

```bash
cd backend

# Backup to a timestamped file under backend/backups/
npm run db:backup

# Backup to a specific path
node scripts/backup.js /mnt/backups/hotbox-2026-11-09.dump

# Restore (drops existing objects first)
npm run db:restore backup/backups/hotbox-2026-11-09.dump
```

**Backup runbook**

1. Confirm `DATABASE_URL` points at the environment you intend to back up.
2. Run `npm run db:backup` and confirm `Backup completed successfully.`
3. Copy the dump off-host (object storage / separate volume) and verify the
   file size is non-zero.
4. Record the backup file name, timestamp, and schema version.
5. For Supabase, prefer the platform's built-in daily backups for point-in-time
   recovery and use these scripts for ad-hoc exports.

**Restore runbook**

1. Restore into a scratch database first and run the test suite against it.
2. Confirm application migrations are at the version matching the dump.
3. Schedule a maintenance window: `pg_restore --clean` drops and recreates
   objects, so the API must be stopped or traffic drained.
4. Run `npm run db:restore <file>` and watch for errors.
5. Restart the backend, run `node scripts/inspect_db.js`, and smoke-test
   authentication plus one write path.

## 6. Useful inspection scripts

| Script | Purpose |
|---|---|
| `backend/scripts/inspect_db.js` | Table counts and connectivity check |
| `backend/scripts/inspect_constraints.js` | Constraint listing |
| `backend/scripts/check_env_raw.js` | Environment validation |

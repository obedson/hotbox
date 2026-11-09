# DROPBOXZ - Production Readiness Fix Plan

**Date:** 2026-11-08
**Status:** Approved - Phase 0 complete (2026-11-08); Phase 1 complete (2026-11-09)
**Scope:** Security blockers, delivery process, code quality, and deployment readiness across backend, frontend, mobile, and Supabase.

## 0. Progress Log

- **Phase 0: Complete.** All ten security items are implemented and verified against the live database.
  - Auth bypass removed from production; JWT secret is required and stored in `.env`.
  - Operations, verification, shipment admin, enterprise, and rider endpoints now enforce authentication and role checks.
  - Demo-user directory endpoint removed.
  - Wallet top-ups require a verified Paystack reference; gateway references are unique.
  - Helmet, rate limiting, CORS allowlist, and error-leakage fixes applied.
  - Database TLS validates against the bundled Supabase root CA.
  - Frontend uses a centralized auth-token helper; all `x-user-id` usages removed.
- **Phase 1:** Complete (except the local Docker build; Docker is not installed).
  - Unit test suite added (`backend/tests/unit/`): 45 tests covering auth/RBAC,
    payments, postcodes (including database paths), validation, ranking, and
    wallet idempotency. `npm test` runs them with coverage reporting.
  - Fixed a `rankingService` bug where coordinates `(0, 0)` were treated as
    "not provided"; radius filtering now uses an explicit null check.
  - Coverage is 94.7% lines and 68.5% branches overall, above the 80% line
    target. `postcodeService` database paths are now unit-covered with a mocked
    `pg` pool; route handlers remain for Phase 2 integration tests.
  - Backend integration suite passes 11/11 against the live Supabase database.
  - `.gitignore` tightened; the `mobile/node_modules` symlink is no longer tracked.
  - CI pipeline added (`.github/workflows/ci.yml`): backend unit tests, frontend
    build, Gitleaks secret scan, Docker image builds, and optional live-database
    integration tests.
  - Multi-stage `backend/Dockerfile` and `frontend/Dockerfile` (nginx static
    hosting with an `/api` proxy) added, plus `docker-compose.yml`.
  - `README.md` and `LICENSE` (MIT) added.
  - Docker is not installed on this machine, so the images have not been built
    locally yet; CI builds them on every push.
- **Phase 2:** In progress.
  - Mobile readiness (5.2): added `mobile/app.config.js` (Expo config with
    `EXPO_PUBLIC_API_BASE`), `mobile/src/config.js`, and `mobile/src/api.js`
    (token storage + `apiFetch`). `App.js` now uses real login and removed all
    hardcoded `x-user-id` headers and mock/offline fallbacks. Config tests added
    (`mobile/src/config.test.js`); Android bundle export verified.
  - Backend route splits (5.1): `customer.js`, `enterprise.js`, and
    `operations.js` split into domain sub-routers under `backend/src/routes/`.
    All resulting files are under 800 lines; unit tests (48/48, 94.85% line
    coverage) and integration tests (12/12) pass.
  - Mobile styles extracted to `mobile/styles.js`; `App.js` is now 524 lines.
  - Frontend splits (5.1): `CustomerDashboard.jsx` split into
    `frontend/src/components/customer/` (16 modules, shell 510 lines) and
    `EnterprisePortal.jsx` split into `frontend/src/components/enterprise/`
    (20 modules, shell 108 lines). All resulting files are under 800 lines;
    frontend build passes and the Vitest suite is 28/28 green.
  - Remaining: frontend production config (5.3) and database operations (5.4).

### Phase 0 verification results

| Check | Expected | Result |
|---|---|---|
| Health check | 200, DB connected | PASS |
| Ops stats without auth | 401 | PASS |
| Ops stats as customer | 403 | PASS |
| Ops stats as super admin | 200 | PASS |
| Verification queue without auth | 401 | PASS |
| Verification queue as compliance officer | 200 | PASS |
| Enterprise account without auth | 401 | PASS |
| Enterprise account as customer | 403 | PASS |
| Enterprise account as enterprise shipper | 200 | PASS |
| Rider jobs without auth | 401 | PASS |
| Rider jobs as customer | 403 | PASS |
| Rider jobs as rider | 200 | PASS |
| Resend OTP without auth | 401 | PASS |
| Resend OTP as customer | 403 | PASS |
| Wallet top-up without reference | 400 | PASS |
| Demo-user directory | 404 | PASS |
| `x-user-id` header bypass | 401 | PASS |
| Backend integration suite | 11/11 | PASS |
| Frontend production build | Successful | PASS |

### Follow-ups and notes

- **Seed data mismatch:** the account listed as Operations Admin (Fatima Abubakar, `+2348061122334`) is stored as `hub_owner`, and no `ops_admin` account exists. Only the super admin (`+2348000000000`) can reach operations endpoints. Decide whether to promote an account.
- **Real wallet top-ups:** set `PAYSTACK_SECRET_KEY` and add a payment-initialization flow. Until then the UI shows a clear gateway error instead of crediting fake balances.
- **Mobile:** still authenticates with hardcoded `x-user-id` values and will not work in production until it uses real login (Phase 2).
- **Secret rotation:** rotate any credential in `.env` that has been shared or exposed, and add a secret scanner to CI (Phase 1).

## 1. Purpose

This plan converts the production-readiness audit into an ordered set of fixes. Nothing is approved or started yet. Each phase lists what changes, where, and how it gets verified.

## 2. Guiding Rules

- No fix ships without a test that fails first (per `AGENTS.md`).
- No secrets in source or commits; `.env` stays gitignored.
- Security fixes land before any new features.
- Every endpoint that reads or changes data needs an explicit auth decision.

## 3. Phase 0 - Security (launch blockers)

### 0.1 Remove the authentication bypass
- **Where:** `backend/src/middleware/auth.js`
- **Problem:** `authenticate()` accepts an `x-user-id` header instead of a JWT, so anyone can act as any user (including `super_admin`) by sending a known UUID.
- **Fix:** allow header auth only when `NODE_ENV === 'test'` or an explicit `ALLOW_HEADER_AUTH=true` flag is set; never in production. Update `backend/tests/verify_api.js` and any script relying on `x-user-id` to log in and use a real Bearer token.
- **Verify:** a request with only `x-user-id` returns 401 on a production-configured server.

### 0.2 Proper JWT secret management
- **Where:** `backend/src/middleware/auth.js`, `backend/.env`
- **Problem:** hardcoded fallback secret `dropboxz-secure-secret-key-2026`; `JWT_SECRET` is not in `.env`.
- **Fix:** generate a 64+ character random secret into `.env`, remove the fallback, and fail fast at startup when it is missing in production. Add it to `.env.example`.
- **Verify:** server refuses to start without the secret; previously issued tokens are invalidated (rotation).

### 0.3 Lock down the operations API
- **Where:** `backend/src/routes/operations.js`
- **Problem:** 30+ endpoints (rider/hub controls, exceptions, audit logs, settings, postcode registration, analytics) have no authentication.
- **Fix:** apply `router.use(authenticate, requireRoles('ops_admin', 'super_admin'))` at the router level, then relax per-route only where a narrower role is correct (for example finance routes to `finance_officer`).
- **Verify:** 401 without a token, 403 for a customer token, 200 for ops_admin.

### 0.4 Lock down compliance approvals
- **Where:** `backend/src/routes/verification.js`
- **Problem:** `/queue`, `/review/:id`, `/seed`, and `/stats` are public; anyone can approve KYC/regulatory documents.
- **Fix:** protect with `authenticate` + `requireRoles('compliance_officer', 'super_admin')`. Keep `/submit` authenticated for all roles.
- **Verify:** a customer token cannot read the queue or approve a record.

### 0.5 Protect shipment mutation endpoints
- **Where:** `backend/src/routes/shipments.js`
- **Problem:** `/:id/resend-otp`, `/:id/flag-exception`, and `/:id/reassign-bay` are unauthenticated.
- **Fix:** `resend-otp` requires authentication plus ownership or role, with a per-user rate limit and max OTP attempts; `flag-exception` requires an authenticated rider/hub_staff/ops_admin/support_agent; `reassign-bay` requires hub_staff/ops_admin/super_admin plus a hub ownership check.
- **Verify:** unauthenticated and cross-tenant requests are rejected.

### 0.6 Remove or gate the demo-user directory
- **Where:** `backend/src/routes/auth.js` (`GET /demo-users`)
- **Problem:** returns every user's name, phone, and email.
- **Fix:** delete the endpoint, or gate it behind `super_admin` and disable it in production.
- **Verify:** unauthenticated request returns 404 or 403.

### 0.7 Wallet top-up integrity
- **Where:** `backend/src/routes/customer.js` (`POST /wallet/topup`), `supabase/schema.sql`
- **Problem:** any authenticated user can credit themselves arbitrary naira with no payment verification.
- **Fix:** never credit from a client-supplied amount. Verify the gateway reference server-side (Paystack or chosen provider), then credit exactly once. Add a `UNIQUE` constraint on `transactions.gateway_reference` for idempotency. Move crediting into a webhook/verify handler; `/wallet/topup` only initiates or records intent.
- **Verify:** replaying a reference does not double-credit; an unverified reference cannot credit.

### 0.8 Security middleware
- **Where:** `backend/src/index.js`, `backend/package.json`
- **Problem:** no rate limiting, no security headers, wide-open CORS, raw error leakage.
- **Fix:** add `helmet`, `express-rate-limit` (global plus strict limits on `/auth/*` and OTP endpoints), a CORS allowlist from env, and a central error mapper that never returns raw `err.message`.
- **Verify:** rate limit triggers at threshold; responses carry security headers; internals are not leaked.

### 0.9 Database connection hardening
- **Where:** `backend/src/config/db.js`
- **Problem:** hardcoded Supabase pooler IPs and `rejectUnauthorized: false`.
- **Fix:** remove the static DNS map (keep `ipv4first`), validate TLS properly, and add retry/backoff plus pool lifecycle handling.
- **Verify:** server connects with TLS verification enabled and survives a DNS change.

### 0.10 Secret hygiene
- **Where:** `backend/.env`, repo root
- **Problem:** live-looking credentials in a 644-permission file; no commits exist yet, so the ignore rules are the only protection.
- **Fix:** `chmod 600 .env`, add `.env.example`, rotate any credential that has been shared or exposed, and add a secret scanner to CI.
- **Verify:** repo contains no secret values; CI scanner passes.

## 4. Phase 1 - Delivery Process

### 1.1 Make the initial commit
- Confirm ignore rules cover `.env`, `backend.log`, `dist/`, and `node_modules/`, then commit in logical chunks using conventional commits (`feat:`, `chore:`, `docs:`).

### 1.2 CI pipeline
- GitHub Actions: install, lint, test, and build for backend and frontend, plus static checks for mobile. Run on every pull request.

### 1.3 Real test suite
- Add Jest or Vitest plus Supertest. Unit tests for services (`postcodeService`, `rankingService`, `custodyService`), auth/RBAC tests for every route, and validation tests. Wire the four existing test files into the runner. Coverage target: 80% per `AGENTS.md`.

### 1.4 Containerisation and docs
- Multi-stage `Dockerfile` for the backend, static hosting for the frontend, and `docker-compose.yml` for local development. README with setup, env, run, and deploy steps. Add a LICENSE.

## 5. Phase 2 - Code Quality and Architecture

### 5.1 Split oversized files
- `backend/src/routes/operations.js` (2,787 lines) into domain modules (hubs, postcodes, exceptions, reports, settings, audit, riders).
- `backend/src/routes/customer.js` (1,053) and `enterprise.js` (1,565) similarly.
- Frontend `CustomerDashboard.jsx` (4,346) and `EnterprisePortal.jsx` (4,303) into feature components and hooks. Target the 800-line rule.

### 5.2 Mobile readiness
- Move `API_BASE` into `app.config.js`/env, remove the mock tracking fallback so real errors surface, add Expo config, and add tests.

### 5.3 Frontend production config
- `VITE_API_BASE` env support, a shared API client with token handling, an error boundary, and standard loading/error states.

### 5.4 Database operations
- Add RLS policies or document why a single service-role connection is used. Add pagination to list endpoints, audit triggers, and a backup/restore plus migration runbook. Note: `npm run migrate` currently runs a seed script, so fix the naming and add a real migration runner.

### 5.5 Observability
- Structured logging, a readiness endpoint, uptime monitoring, and alerting on authentication failures.

## 6. Sequence and Rough Effort

| Phase | Focus | Effort | Depends on |
|---|---|---|---|
| 0 | Security blockers | 3-5 days | - |
| 1 | Commit, CI, tests, Docker | 2-4 days | Phase 0 |
| 2 | Refactor, mobile, ops | 4-7 days | Phase 1 |

## 7. Acceptance Criteria

- [ ] No unauthenticated endpoint can read or mutate data.
- [ ] `x-user-id` bypass disabled outside test.
- [ ] No hardcoded secrets; `.env.example` documents all variables.
- [ ] Wallet credits require a verified gateway reference and are replay-safe.
- [ ] CI green: lint, tests, coverage at 80% or better, frontend build.
- [ ] Docker images build and run locally.
- [x] Mobile builds against a configurable API base.
- [ ] README covers setup, env, and deployment.
- [x] No core source file over 800 lines.

## 8. Decisions Needed From You

1. Is the `x-user-id` bypass needed for a demo/simulator UI, or can it be fully removed?
2. Which payment gateway is live (Paystack?), and are API keys available?
3. Deployment target: VPS, Render/Railway, or Kubernetes?
4. Keep or remove the legacy v0 compatibility endpoints (`/api/postcode`, `/api/dropzones`, `/api/parcels`)?
5. Do you want RLS policies, or is a single service-role connection acceptable for now?

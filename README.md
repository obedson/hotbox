# Hotbox

Hotbox is a last-mile logistics platform for Nigeria. It combines NDAPS-style
alphanumeric postcodes, a network of hubs and dropzones, shipment tracking,
custody transfers, rider dispatch, enterprise KYC, and wallet payments.

> **Status:** Phase 0 (security) is complete and verified. Phase 1 (delivery
> process) is in progress. Phase 2 (architecture and operations) is planned.
> See `fix-plan.md` for the full roadmap and open decisions.

## Architecture

| Layer | Technology | Location |
|---|---|---|
| Backend API | Node.js, Express, PostgreSQL (`pg`) | `backend/` |
| Frontend | React, Vite, Tailwind CSS, Leaflet | `frontend/` |
| Mobile | React Native, Expo | `mobile/` |
| Database | Supabase PostgreSQL | `supabase/` (schema and migrations) |

The backend is stateless and issues JWTs. The frontend stores the token in
`localStorage` and attaches it with `Authorization: Bearer <token>` through the
shared client in `frontend/src/lib/api.js`.

### Postcode standard

Hotbox uses Nigeria's National Digital Alphanumeric Postcode (NDAPS) format,
for example `FC-01-A03-FK-01`. Legacy six-digit numeric codes are deprecated
across models, UI placeholders, tests, and documentation.

## Repository layout

```
backend/            Express API, services, middleware, tests
frontend/           React/Vite single-page app
mobile/             Expo app (Phase 2)
supabase/           Schema and SQL migrations
.github/workflows/  CI pipeline
docker-compose.yml  Local container orchestration
```

## Prerequisites

- Node.js 20 or newer (backend and frontend)
- npm 10 or newer
- A Supabase PostgreSQL database URL
- Docker and Docker Compose (only for containerised runs)

## Backend setup

```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, CORS_ORIGINS, and payment keys.
chmod 600 .env
npm install
npm start
```

The API listens on `PORT` (default `5000`). Health check:

```bash
curl http://localhost:5000/api/health
```

## Frontend setup

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000, proxies /api to localhost:5000
npm run build    # production bundle in dist/
```

## Environment variables

Copy `backend/.env.example` to `backend/.env`. Never commit `.env`.

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | No | API port (default `5000`) |
| `NODE_ENV` | Yes | `development`, `test`, or `production` |
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection string |
| `DATABASE_CA_CERT` | No | Path to a custom CA certificate |
| `JWT_SECRET` | Yes | Token signing key; generate with `openssl rand -hex 48` |
| `CORS_ORIGINS` | Production | Comma-separated browser origins |
| `ALLOW_HEADER_AUTH` | No | Development only; never `true` in production |
| `PAYSTACK_SECRET_KEY` | Payments | Verifies wallet top-ups |
| `POSTCODE_API_KEY` / `NIPOST_API_KEY` | No | NIPOST postcode lookup |
| `SMTP_*`, `GMAIL_*`, `RESEND_API_KEY` | No | Email delivery |
| `TERMII_*`, `TWILIO_*` | No | SMS and WhatsApp delivery |

Frontend (`frontend/.env.example`):

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_BASE` | No | Absolute API base URL. When unset, the frontend calls same-origin `/api` paths and the dev proxy or production nginx forwards them to the backend. |

## Tests

```bash
# Backend unit tests (no database required)
cd backend && npm test

# Integration tests against a live database
DATABASE_URL=... JWT_SECRET=... NODE_ENV=test npm run test:integration

# Frontend production build
cd frontend && npm run build
```

`backend/tests/test_*.js` (except `verify_api.js`) are older manual scripts
that target a running server on port 5000 and are not part of the automated
suite.

## Docker

```bash
cp backend/.env.example backend/.env   # configure first
docker compose up --build
```

- API: http://localhost:5000
- Frontend: http://localhost:8080

The frontend container proxies `/api` to the backend service. Both images use
multi-stage builds and run as non-root where the base image allows it.

## Deployment

Recommended production setup:

1. Set `NODE_ENV=production`, a strong `JWT_SECRET`, and an explicit
   `CORS_ORIGINS` allowlist.
2. Serve the frontend static build behind a CDN or reverse proxy.
3. Run the backend behind a reverse proxy with TLS and HTTP/2.
4. Point `DATABASE_URL` at the Supabase pooler and keep the bundled CA in place.
5. Set `PAYSTACK_SECRET_KEY` before enabling wallet top-ups.

### Render

The repository ships a Render Blueprint (`render.yaml`) that deploys the API
and the built frontend as a single web service:

1. Open <https://dashboard.render.com/blueprints> and connect this repository.
2. Render reads `render.yaml` and prompts for `DATABASE_URL` (the Supabase
   PostgreSQL connection string). `JWT_SECRET` is generated automatically.
3. Deploy. The app is served from `https://hotbox.onrender.com`, with the API
   under `/api` and the health check at `/api/health`.

The build installs both packages and runs `vite build`; the start command runs
the API, which serves `frontend/dist` when it is present. Free-plan services
sleep after inactivity, so the first request can take a few seconds; upgrade to
a paid plan if the free build runs out of memory.

Phase 2 adds RLS review, pagination, backup runbooks, and mobile API
configuration.

## Observability

- The backend emits structured JSON logs (one object per line) with `timestamp`,
  `level`, `message`, and request context (`method`, `url`, `statusCode`,
  `durationMs`, `ip`).
- `GET /api/health` is the liveness probe; `GET /api/ready` is the readiness
  probe and returns `503` when the database is unreachable.
- Authentication and authorization failures are logged at `warn` level with the
  caller IP and path, so they can be alerted on from any log aggregator.
- Point an uptime monitor (for example UptimeRobot or Better Stack) at
  `https://<host>/api/ready`.

## Database operations

Connection model (service role vs. RLS), pagination conventions, audit
triggers, and the migration/backup/restore runbooks are documented in
[`docs/database-operations.md`](docs/database-operations.md).

## Security

- `.env` is gitignored. Rotate any credential that has ever been committed or
  shared.
- Authentication uses JWTs; the `x-user-id` bypass is disabled outside test.
- Wallet credits require a verified gateway reference and are idempotent.
- CI scans the repository for secrets with Gitleaks.

## License

MIT. See `LICENSE`.

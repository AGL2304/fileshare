# Changelog

All notable changes to FileShare are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [0.4.0] — 2026-05-23

### Added — User profile

- **New `/profile` page** with three sections:
  - **Avatar**: upload (JPEG / PNG / WebP, 2 MB max) with preview, replace, or remove.
  - **Name**: change the displayed name (1–100 chars, or clear to fallback to email).
  - **Email**: change with current-password confirmation; all refresh tokens revoked and
    user is redirected to login.
  - **Password**: current + new (min 8 chars, 1 uppercase, 1 digit) + confirm; all sessions
    revoked on success.
- **Avatar visible across the app**: sidebar (dashboard + admin), reusable `<Avatar>`
  component with initial fallback when no image is set, cache-busted on update.
- **Sidebar avatar + name area is now a clickable link** to `/profile` in both the
  dashboard and admin layouts.
- **Backend endpoints** under `/api/v1/profile/*`:
  - `PATCH /profile/name`, `PATCH /profile/email`, `PATCH /profile/password`
  - `POST /profile/avatar` (multipart), `DELETE /profile/avatar`
  - `GET /profile/avatar/:userId` — public, cached 5 minutes
- **DB**: added `users.avatar_key` (nullable TEXT) column.
- 10 new backend tests for the profile schemas.

### Security — Profile

- Email and password changes require the current password. Failure returns
  `WRONG_CURRENT_PASSWORD` (401) without leaking timing differences (bcrypt compare).
- All refresh tokens are deleted on email or password change to force re-authentication
  on every device.
- Avatar uploads are whitelisted to image MIME types (JPEG/PNG/WebP) and capped at 2 MB.

---

## [0.3.0] — 2026-05-23

### Added — Admin panel

- **Admin dashboard** (`/admin`) with live stats (auto-refresh every 15s):
  - Total users (active / suspended), total files (active / soft-deleted), total active shares, global storage usage.
  - Recent activity panels: 5 latest signups, 5 latest uploads, 5 latest access events.
- **User management** (`/admin/users`):
  - Paginated table with search, role filter, role/quota/name editing.
  - Toggle account active state (suspends user + revokes all refresh tokens).
  - Hard delete user (cascades files, shares, refresh tokens; best-effort blob cleanup).
  - Self-protection: an admin cannot demote, suspend, or delete themselves.
- **File management** (`/admin/files`):
  - Paginated table with search and status filter (READY / PENDING / SCANNING / QUARANTINED / DELETED).
  - Purge file (hard delete from DB + disk + decrement owner quota).
- **Share management** (`/admin/shares`):
  - Paginated table with "active only" filter.
  - Copy share URL, force-revoke any share.
- **Access logs** (`/admin/logs`):
  - Paginated audit trail (date, action, file, share token, IP, user-agent).
  - Auto-refresh every 30s.
- **System health** (`/admin/system`):
  - Uptime, Node version, platform/arch, heap/RSS memory, DB connectivity + latency + version, environment.

### Added — General

- `lucide-react` `Shield` link in the user dashboard sidebar for ADMIN role.
- `<AdminRoute>` guard component that fetches `/auth/me` if needed and redirects non-admins.
- `CHANGELOG.md` (this file).

### Changed — File uploads

- **All file types are now accepted.** The previous `ALLOWED_MIME_TYPES` whitelist was replaced
  by an opt-in deny-list (empty by default). Any user-supplied content is served with
  `Content-Disposition: attachment` to prevent inline rendering by the browser.
- Removed magic-byte content sniffing via `file-type` (was redundant with the deny-list
  approach and added native deps headache on Alpine).
- `safeExtension` now accepts up to 16 alphanumeric characters (was 10) for storage keys.
- File-related test suite updated to reflect the allow-all policy.

### Removed

- `file-type` package (no longer needed).

---

## [0.2.0] — 2026-05-22

### Security — Major fixes from the security audit

- **Refresh tokens are now stored hashed (SHA-256) in the database.** Previously stored in
  cleartext, which would have leaked all active sessions on a DB read.
- **Share passwords no longer travel in URL query strings.** New endpoints accept the
  password via JSON body or `X-Share-Password` header. Old `GET /shares/:token` is kept
  for unsecured info-only reads; `POST /shares/:token/resolve` and `POST /shares/:token/download`
  handle password-protected shares.
- **Path traversal hardening.** `storage.service` now resolves every storage key against the
  base path and rejects any access that escapes it.
- **Filename sanitization.** New `sanitizeFilename` utility strips control chars, path
  separators, and collapses `..` sequences. Stored file names are now safe to use in
  `Content-Disposition` headers and on disk.
- **Atomic quota check.** Replaced read-modify-write race with an atomic SQL increment
  guarded by the quota condition; rolls back the file and the row on failure.
- **`requireRole` middleware actually stops requests.** Previously it sent 403 but the
  handler kept executing — fixed by checking `reply.sent` after the auth step.
- **JWT_REFRESH_SECRET dead code removed.** The refresh token is an opaque random value,
  not a signed JWT, so the second secret was load-bearing nothing.
- **Rate limiting tightened** on `/auth/login`, `/auth/register`, and the share
  resolve/download endpoints (10 req / 5 min and 20–30 req / minute respectively).
- **`@fastify/helmet` enabled** with sensible defaults (CSP relegated to nginx for the SPA).
- **Self-protection against the seed-shipped bcrypt hash.** The previous initial migration
  shipped a known bcrypt hash (the famous Spring `secret` value). It has been removed; the
  admin user is now created idempotently by `prisma/seed.ts` / the Docker entrypoint with
  a real bcrypt hash of `ADMIN_PASSWORD`.

### Added

- `AppError` class with structured `code` + `statusCode` + `message` (`utils/errors.ts`).
  All routes now respond with `{ success: false, code: '...', message: '...' }` so the
  frontend can branch on stable codes instead of matching French strings.
- `pino-pretty` moved to `dependencies` (was a devDep, broke prod logs).
- `/ready` endpoint that pings the database, for orchestrator readiness checks.
- Graceful shutdown: `app.close()` before `prisma.$disconnect()` so in-flight requests
  finish cleanly.
- Env-var validation with Zod at boot (`config/index.ts`) — boots fail fast on missing
  or weak `JWT_SECRET`.
- CORS supports a comma-separated list of origins.
- Prisma indexes added on `(user_id, status)`, `(folder_id)`, `(created_at desc)`, etc.

### Changed

- Backend `dev` script swapped from `nodemon + ts-node` to `tsx watch` (10× faster).
- Backend uses Prisma `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` so the
  client works in the Alpine container.
- Backend Docker image runs as a non-root user (`app:nodejs`), via `dumb-init`, with a
  `HEALTHCHECK` and `openssl`/`libc6-compat` pre-installed.
- Backend `npm run db:migrate` now calls `prisma migrate deploy` (cross-platform) instead
  of `psql` (POSIX-only and required a `psql` binary on the host).
- Refresh-token rotation logic moved to opaque random tokens (base64url, 32 bytes) hashed
  with SHA-256.

### Added — Frontend

- **Dark mode.** System / light / dark cycle, persisted in `localStorage`, with a Tailwind
  `class` strategy and full coverage of all surfaces.
- **Accessible Modal component** (focus trap, ESC to close, body scroll lock, `role=dialog`,
  `aria-modal`, returns focus on close).
- **Custom `confirm()`** via `ConfirmDialogProvider` to replace `window.confirm` (which
  blocks the UI thread and is unstylable).
- **Sonner toasts** to replace `window.alert` and to surface async feedback.
- **`ErrorBoundary`** at the root to keep the app alive on a render crash.
- **`lucide-react` icons** everywhere — emojis kept only for MIME type icons in lists.
- **`Eye` / `EyeOff` password reveal** on the login/register form.
- **Search button on file list** + ARIA labels on all icon-only buttons.

### Fixed — Frontend

- `UploadDropzone` no longer double-uploads under React StrictMode; entries are keyed by
  `crypto.randomUUID()` instead of array indices.
- `SharePage` no longer parses the API error message text to detect "password required" —
  it checks the structured `code` field. Wrong-password feedback is now stable.
- Bearer token attached by the axios interceptor was not propagated to `<a href>` direct
  downloads, causing 401 on the file list. Downloads now go through axios with a `blob`
  response and a synthetic `<a download>`.
- Public share download moved from a hidden `<form method="POST">` (which the browser
  encodes as `application/x-www-form-urlencoded`, a content-type Fastify does not parse
  by default → 415) to a `POST` axios with JSON body + blob response.
- Axios refresh-token queue: no longer creates redirect loops when the user is already on
  `/login`, `/register`, or `/share/:token`. Public share requests don't trigger a refresh.

### Removed — Cleanup

- Two stray directories created by a botched POSIX brace-expansion in the project bootstrap
  (`backend/src/{config,plugins,routes,services,middleware,utils,types}` and
  `frontend/src/{api,hooks,pages,components`).
- Frontend `package.json` versions that did not exist (TypeScript 6, Vite 8, ESLint 10,
  React 19.2.5, lucide-react 1.x). Replaced with currently published LTS versions.

### Infrastructure

- `docker-compose.yml`:
  - Healthcheck on every service.
  - `depends_on` with `condition: service_healthy` so the frontend waits for the backend.
  - Frontend container port mapping fixed from `5173:5173` (nginx listens on 80) to
    `5174:80` (5173 was occupied locally during deployment).
  - `uploads_data` named volume so file blobs survive container recreation.
  - Env variables parameterized with sensible defaults; `.env` support.
- `nginx.conf` now serves with `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, gzip on text/json/svg, and a `client_max_body_size`
  matching the backend upload limit.
- New `backend/docker-entrypoint.sh` runs an idempotent seed of the admin user on each
  start (resets password to `ADMIN_PASSWORD` env), then `exec`s the Node server.

### Tests

- Added Vitest setup for both backend (Node env) and frontend (jsdom env).
- 44 backend tests: crypto utils, filename sanitization, errors, MIME policy, auth schemas,
  share schemas, password hashing, admin schemas.
- 22 frontend tests: `formatBytes`/`quotaPercent`/`getMimeIcon`, auth store, `ProtectedRoute`
  redirect, Modal accessibility (`role=dialog`, ESC, close button).

---

## [0.1.0] — 2026-04-28

### Initial release

- Backend: Fastify + Prisma + PostgreSQL + Redis stack.
- JWT auth (15 min access + 7 day refresh) with rotation.
- Multipart upload with per-user quota.
- Folder hierarchy.
- Share links with optional password, expiry, max-download cap.
- Soft delete on files.
- Access log per share download.
- Frontend: React + Vite + Tailwind, React Query, Zustand auth store,
  axios with refresh interceptor.
- Docker Compose stack with PostgreSQL 16 and Redis 7.

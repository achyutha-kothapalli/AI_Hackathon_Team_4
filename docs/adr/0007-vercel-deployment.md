# 0007 — Vercel deployment: one project, optionally two

**Status:** Accepted

## Context

The team needs a public URL quickly, previews for pull requests, and no server
operations. The frontend is static; the backend is a short-lived request handler.

## Decision

- **Default:** one Vercel project from the repository root. The root
  `vercel.json` builds `frontend/` as static files and routes `/api/*` to a
  Python function (`api/index.py`) that loads `backend/app`. Same domain, so
  no CORS configuration is needed.
- **Optional:** two projects (Root Directory `backend` and `frontend`), connected
  via `VITE_API_URL` and `CORS_ORIGINS`, for independent deploys.
- Dependencies are pinned; a test keeps the root and backend requirements identical.

## Consequences

- Every push to `main` deploys, and every pull request gets a preview URL.
- Function duration is limited (`maxDuration` 120 s), so very long multi-page
  letters may need a lower effort setting or fewer pages.
- The backend also runs anywhere ASGI runs (`uvicorn app.main:app`), so it is
  not locked to Vercel.

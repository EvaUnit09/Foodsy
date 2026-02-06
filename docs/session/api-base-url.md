### API base URL configuration (Frontend ↔ Backend)

**Frontend base URL to call**
- Use the relative proxy: `/api`
  - Example: `/api/sessions/123`, `/api/restaurants/...`, `/api/auth/me`
  - Rationale: Next.js API routes in `src/pages/api/*` proxy to the backend.

**Backend URL the proxy forwards to**
- Controlled by env var `BACKEND_URL` (read in Next API routes)

Set `BACKEND_URL` per environment:
- Local (Docker Compose): `http://apifoodsy-backend:8080`
- Local (backend on host): `http://localhost:8080`
- Production: `https://apifoodsy-backend.com`

Notes
- Spring controllers are rooted at `/sessions`, `/restaurants`, `/auth` (no `/api` prefix). The `/api` prefix is only for the Next.js proxy routes.
- Ensure OAuth links (e.g., Google): use backend host directly (e.g., `https://apifoodsy-backend.com/oauth2/authorization/google`).
- Existing code already uses `/api` in `client.ts`, `homepageApi.ts`, the sessions pages, and `pages/api/*` proxies.

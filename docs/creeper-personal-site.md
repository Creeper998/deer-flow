# Creeper personal website + Agent (local integration)

The personal website keeps its own Next.js 15 / Tailwind 3 frontend. DeerFlow
keeps its Next.js 16 / Tailwind 4 frontend, authentication and Agent runtime.
This fork composes them at `http://localhost:2026` using the official
[Next.js multi-zone approach](https://nextjs.org/docs/app/guides/multi-zones).
There is no iframe, duplicated login, or database migration.

| Paths | Owner |
| --- | --- |
| `/`, `/about`, `/experience`, `/projects`, `/notes`, `/notes/*`, `/contact` | Creeper personal frontend |
| `/_creeper/*` | Personal frontend assets, image optimizer and development HMR |
| `/login`, `/setup`, `/workspace/*`, `/_next/*` | DeerFlow frontend |
| `/api/*`, `/health`, existing Gateway routes | Existing DeerFlow proxy configuration |

The personal site's `agent` pill opens `/workspace/chats/new`. Without a valid
session this goes through the existing login page; the Gateway remains the
session authority. Workspace branding, the new personal-site sidebar entry,
login's return-home link and logout all use full document navigation to `/`.
Only navigation **within** one zone uses Next Link. This prevents carrying one
application's React runtime or global CSS into the other.

## Current Mac / OrbStack setup

The separate personal repository is `CreeperProject/Creeper`, not
`CreeperProject/CreeperNext`. Start its existing development server on loopback:

```sh
npm run dev -- --hostname 127.0.0.1 --port 3101
```

In DeerFlow's ignored `frontend/.env`, set:

```dotenv
CREEPER_SITE_ORIGIN=http://host.docker.internal:3101
```

Docker development reads that env file when the frontend container is created.
After changing it, recreate **only** that service (the command below assumes
the current local DooD overlay; retain the overlays appropriate to your stack):

```sh
DEER_FLOW_ROOT="$PWD" docker compose -p deer-flow-dev \
  -f docker/docker-compose-dev.yaml -f docker/docker-compose.dood.yaml \
  up -d --no-deps frontend
```

Host-only DeerFlow development instead uses `http://127.0.0.1:3101` as the origin.
The personal server remains independently managed: `make docker-stop` does not
stop it and starting DeerFlow does not start it. Keep both running. If it is
offline the personal routes fail explicitly rather than showing a different
homepage; `/login`, `/workspace/*` and the Gateway do not depend on that server.
This is a local development integration, **not a production deployment**.

For the standalone `3101` preview, the personal site's ignored `.env.local`
may set `NEXT_PUBLIC_AGENT_ENTRY_URL=http://localhost:2026/workspace/chats/new`.
Leave it unset for a same-origin deployment. The personal frontend permanently
namespaces its assets under `/_creeper`, including the optimized CR image;
public brand files use `/_creeper/public/brand/*` with an explicit local rewrite.
Future public assets need an equally explicit mapping, not a catch-all proxy.

## Boundaries and rollback

- Preserve the original personal-site styling and intro. Integration does not
  require importing its WebGL, GSAP or editor dependencies into DeerFlow.
- The root rewrite is opt-in. Unset `CREEPER_SITE_ORIGIN` and recreate the
  frontend to restore DeerFlow's original marketing homepage. No source or
  data deletion is needed.
- Production rewrites are compiled into the frontend build. Setting the env
  variable only at runtime in an already-built production image is insufficient;
  provide it during a new build and deploy the personal frontend too. The
  existing production Dockerfile does not yet expose a build argument for it.
- Personal notes still use local JSON files and currently have **no user
  authorization**. Same-origin routing does not secure those Server Actions.
  Keep the unified endpoint bound to loopback; before publishing, implement
  read/write authorization, output sanitization, and a trusted deployment
  origin policy. Both zones share the browser security boundary, and the
  personal server may receive DeerFlow cookies; use only a trusted local origin.
- Do not proxy `/api`, `/_next`, authentication or workspace routes to the
  personal server. Agent SSE/WebSocket routes remain on the existing Gateway
  proxy, without a new application relay.

## Focused verification

From `frontend/`, run host pnpm through `../scripts/pnpm.py`:

```sh
python3 ../scripts/pnpm.py exec rstest run personal-site.test.ts logout-navigation.dom.test.tsx
CREEPER_SITE_E2E=1 PLAYWRIGHT_AUTH_BASE_URL=http://localhost:2026 \
  PLAYWRIGHT_SKIP_WEB_SERVER=1 python3 ../scripts/pnpm.py exec playwright test \
  --config=playwright.auth.config.ts personal-site.spec.ts branding.spec.ts
```

The opt-in browser tests use fresh, unauthenticated contexts and do not create
real chats or notes. Workspace tests use mocked Gateway responses, not real
models. Before a public release, separately verify notes writes with isolated
test data and complete their authorization work.

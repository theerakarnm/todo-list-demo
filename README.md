# JotList (todo-list-demo)

A To-Do List web app built as a demo for a YouTube video. Live at `https://jotlist.eukron.com` (not deployed yet). Thai UI.

> **Status: implementation starting.** Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). UI mockups: [docs/design/](docs/design/).

## MVP features

### A. Core task management
- **Quick Add Bar** — type a task title and press Enter to create it, without opening a dialog.
- **Task CRUD** — create, edit, delete and complete tasks. Delete and complete show an **Undo** toast for 5 seconds.
- **Task attributes** — Title, Description/Notes, Due Date, Due Time (reminder time), Priority (`None`, `Low`, `Medium`, `High`).
- **Images** — attach images to a task (stored in Cloudflare R2).
- **Subtasks (one level)** — a checklist inside a task. Only one level deep, to keep the data model simple.

### B. Organization & views
- **Smart Views**
  - **Inbox** — tasks not assigned to any project.
  - **Today** — tasks due today, plus overdue tasks.
  - **Upcoming** — tasks due in the next 7 days, grouped by date.
  - **Completed (Logbook)** — completed tasks, most recently completed first.
- **Projects / Custom Lists** — user-created lists (e.g. Work, Personal, Groceries) with a name and colour.
- **Drag-and-drop** — reorder tasks within a view, and drop a task onto a project in the sidebar to move it.

### C. Search & reminders
- **Instant Search** — real-time search over task titles and notes.
- **Basic Reminders** — Web Push notification at the task's due time (tasks with a due time only). Email reminders come after the MVP.

### D. Auth & sync
- **Authentication** — email/password sign-up (with email verification and password reset) and LINE login. Accounts with the same email are one account.
- **Cross-device sync** — data syncs through the cloud automatically; other devices catch up when the app is reopened or within 30 seconds.

### E. UX/UI standards
- **Optimistic UI** — completing or moving a task updates the screen immediately, without waiting for the server.
- **Responsive design** — Desktop: left sidebar + main work area. Mobile: bottom bar + slide-out drawer.
- **Dark / Light mode** — follows the system setting, or the user picks one.

## Out of scope for the MVP
Nested subtasks (more than one level), recurring tasks, sharing/collaboration, tags/labels, non-image attachments, offline mode, realtime sync, email reminders, Google login.

## Getting started
Stack: Cloudflare Workers + Hono + D1 (Drizzle) + React/Vite. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
You need [Bun](https://bun.sh) (version in `.bun-version`) and Node (version in `.node-version`).

```sh
bun install
cp .env.example .env       # fill in your own values (see "Environment" below)
cp .env .dev.vars          # Wrangler, Vite and the worker tests read .dev.vars
bun run db:migrate:local   # create the local D1 tables
bun run dev                # Vite + the Worker, http://localhost:5173 (API at /api/health)
bun run test               # Vitest: worker + client projects
```

`bun test` runs Bun's own runner, which only prints a hint; use `bun run test` for the real suites.
The `worker` test project runs in the Workers runtime through `@cloudflare/vitest-plugin`, the renamed successor of `@cloudflare/vitest-pool-workers` (the old name is deprecated).
After changing `src/worker/db/schema.ts`, run `bun run db:generate` to write a new SQL migration into `drizzle/`.
After changing `wrangler.jsonc`, run `bun run cf-typegen` to refresh `worker-configuration.d.ts`.
After changing `public/favicon.svg`, run `bun run icons:generate` to redraw the PWA and iOS icons.
Static files get their security headers from `public/_headers`; API responses get the same headers from the Worker.

### Environment
Keep your real values in `.env` (start from `.env.example`), then copy it to `.dev.vars` for local runs.
`.dev.vars.example` lists the same names.
Both `.env` and `.dev.vars` are gitignored: never commit their values, and only add new names to the `*.example` files and `src/worker/secrets.d.ts`.
In production the same names are Worker secrets, set once with `wrangler secret put <NAME>`.

`APP_ENV` is `production` by default (`vars` in `wrangler.jsonc`); `.dev.vars` sets it to `development` for local runs.
Without `RESEND_API_KEY`, no email is sent.
In development the Worker logs one line instead (`{"level":"info","event":"email.mock","subject":...,"link":...}`), so you can open verification and reset links from the terminal.
Anywhere else it logs only `{"level":"warn","event":"email.skipped","subject":...}`, because the link holds a token.
The tests always run in development without a key, even when `.dev.vars` holds a real key.
They also use fixed test values for the Better Auth, LINE and Turnstile settings (`vitest.config.ts`), and fake every outside HTTP call.

### Auth
Better Auth runs at `/api/auth/*` (`src/worker/auth/`), with email and password plus LINE Login.
Sign-up and forgot-password need a Turnstile token in the `x-turnstile-token` header; the client gets the public site key from `GET /api/config`.
Email accounts must verify their email before they can sign in.
In development without `RESEND_API_KEY`, open the verification and reset links from the `email.mock` log line.
The verification link lands on `/verify-email`, and the reset link on `/reset-password?token=...`.
LINE Login needs `LINE_LOGIN_CHANNEL_ID` and `LINE_LOGIN_CHANNEL_SECRET`, with the callback URL `<origin>/api/auth/callback/line` registered in the LINE Developers Console.
A LINE email that matches a verified account signs in to that account; one that matches only an unverified sign-up replaces it; without an email, LINE gets a separate account.
The browser's time zone is saved at `POST /api/onboarding/complete` (field `timezone`); until then it is `Asia/Bangkok`.

In the client (`src/client/auth/`), `useMe()` reads `GET /api/me` and the route guards in `src/client/routes.tsx` decide where each visitor may go.
Signed-out visitors on `/app/*` go to `/login?next=<path>` and come back after signing in; new users go through `/onboarding/1` and `/onboarding/2` once.
The Signup and Forgot password pages load the Turnstile widget with the site key from `GET /api/config`.
Locally the widget only passes when `TURNSTILE_SITE_KEY` is valid for `localhost` (for example Cloudflare's test keys).
Client tests replace `fetch` with a fake API server (`src/client/test/fake-api.ts`); by default the user is signed in and onboarded.

### Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | Vite dev server with the Worker and a local D1 database |
| `bun run build` | Production build of the client and the Worker into `dist/` |
| `bun run preview` | Serve the production build locally |
| `bun run typecheck` | `tsc -b` over the client, Worker, shared code, service worker and config files |
| `bun run lint` | Biome lint (recommended rules plus the React hooks rules); config in `biome.json` |
| `bun run test` | Vitest: `worker` (Workers runtime, migrations applied per test file) and `client` (jsdom) |
| `bun run test:e2e` | Playwright smoke in Chromium: migrates the local D1, adds a fresh verified test user, starts the dev server on port 5199 with `CLOUDFLARE_ENV=e2e` (it reads the test-only `.dev.vars.e2e` that `playwright.config.ts` writes, never your `.dev.vars`), signs in through the Login page and stops the server after |
| `bun run cf-typegen` | Regenerate `worker-configuration.d.ts` from `wrangler.jsonc` (ignores `.dev.vars`: secret types live in `src/worker/secrets.d.ts`) |
| `bun run db:generate` | Write a new SQL migration into `drizzle/` from the Drizzle schema |
| `bun run db:migrate:local` | Apply migrations to the local D1 database |
| `bun run db:migrate:remote` | Apply migrations to the production D1 database |
| `bun run icons:generate` | Render `public/favicon.svg` into the PNG app icons |

## CI and deploy
- `.github/workflows/ci.yml` runs on every pull request into `develop` and every push to `develop`: install, type-check, lint, test, build.
- `.github/workflows/deploy.yml` runs on every push to `main`: the same checks, then `wrangler d1 migrations apply jotlist --remote` and `wrangler deploy`.
  It needs the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

Before the first deploy, fill in the `TODO(owner)` values in `wrangler.jsonc` (D1 `database_id`, R2 bucket, rate-limit namespace ids) and set the Worker secrets.

## License
[MIT](LICENSE)

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

```sh
bun install
cp .dev.vars.example .dev.vars
bun run db:migrate:local   # create the local D1 tables
bun run dev                # Vite + the Worker, http://localhost:5173 (API at /api/health)
bun run test               # Vitest: worker + client projects
```

`bun test` runs Bun's own runner, which only prints a hint; use `bun run test` for the real suites.
After changing `src/worker/db/schema.ts`, run `bun run db:generate` to write a new SQL migration into `drizzle/`.
After changing `wrangler.jsonc`, run `bun run cf-typegen` to refresh `worker-configuration.d.ts`.
Static files get their security headers from `public/_headers`; API responses get the same headers from the Worker.

## License
[MIT](LICENSE)

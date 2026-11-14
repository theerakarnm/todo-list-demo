# AGENTS.md

Instructions for any AI coding agent working in this repo. `CLAUDE.md` points here; this file is the single source of truth.

## What this is
`todo-list-demo` — **JotList** (`https://jotlist.eukron.com`), a To-Do List web app made as a demo for a YouTube video. The MVP feature list lives in [README.md](README.md). Treat that list as the full scope: do not add features that are not in it.

## Current phase: design — no implementation yet
The owner is still designing the app.
- **Do not write UI or feature code** (components, pages, styles, API routes, database schema) until the owner says implementation has started.
- Allowed now: documentation, design notes, specs, and project config the owner asks for.
- When this phase ends, the owner will update this section.

## Tech stack
**Decided — see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).** In short: one Cloudflare Worker (Hono API + React/Vite frontend as static assets), D1 via Drizzle, Better Auth (email/password + LINE), Resend for auth emails only, Web Push reminders via a 1-minute cron, polling sync (no realtime), Thai-only UI through i18n files. Do not swap any part of the stack or add a new service without the owner's say-so; if something in the doc doesn't work, stop and ask.

## Product rules (from the MVP spec)
These hold whatever stack is chosen:
- Subtasks are **one level only**. A subtask cannot have subtasks.
- Priority is exactly one of `none | low | medium | high`; default `none`.
- **Inbox** = tasks with no project. **Today** = due today + overdue (not completed). **Upcoming** = due within the next 7 days, grouped by date. **Logbook** = completed tasks, newest completion first.
- Delete and complete show an Undo toast for **5 seconds**.
- Every mutation is **optimistic**: update the UI first, sync in the background, roll back and show an error if the server rejects it.
- Task order inside a view is user-controlled (drag-and-drop), so tasks need a persisted sort position.
- Layout: desktop = left sidebar + main area; mobile = bottom bar + slide drawer.
- Theme: light, dark, or follow system.
- Max **1,000 active tasks** (not completed, not deleted) per account.
- All user-facing text is Thai and lives in the i18n file — no hard-coded strings in components.

## Git workflow
- `main` — stable; never push or commit to it directly.
- `develop` — working branch. Branch from it (`feat/...`, `fix/...`, `docs/...`) and open PRs back into `develop`.
- One feature per PR. Small, reviewable commits with clear messages.
- Never commit secrets (`.env`, API keys, OAuth client secrets). Commit an `.env.example` instead.

## Definition of done (once implementation starts)
- The feature matches its README description and the product rules above.
- Lint, type-check and tests pass locally.
- Works on desktop and mobile widths, in light and dark mode.
- README updated if setup or behaviour changed.

## Demo-video notes
This code will be shown on screen. Prefer clear, readable code over clever code, keep files small, and use descriptive names.

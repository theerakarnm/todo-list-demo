# JotList (todo-list-demo)

A To-Do List web app built as a demo for a YouTube video. Live at `https://jotlist.eukron.com` (not deployed yet). Thai UI.

> **Status: design phase.** The feature list below is the MVP scope. Architecture is decided ([docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)); UI design is in progress. No app code has been written yet.

## MVP features

### A. Core task management
- **Quick Add Bar** — type a task title and press Enter to create it, without opening a dialog.
- **Task CRUD** — create, edit, delete and complete tasks. Delete and complete show an **Undo** toast for 5 seconds.
- **Task attributes** — Title, Description/Notes, Due Date, Due Time (reminder time), Priority (`None`, `Low`, `Medium`, `High`).
- **Subtasks (one level)** — a checklist inside a task. Only one level deep, to keep the data model simple.

### B. Organization & views
- **Smart Views**
  - **Inbox** — tasks not assigned to any project.
  - **Today** — tasks due today, plus overdue tasks.
  - **Upcoming** — tasks due in the next 7 days, grouped by date.
  - **Completed (Logbook)** — completed tasks, most recently completed first.
- **Projects / Custom Lists** — user-created lists (e.g. Work, Personal, Groceries) with a name, colour and icon.
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
Nested subtasks (more than one level), recurring tasks, sharing/collaboration, tags/labels, attachments, offline mode, realtime sync, email reminders, Google login.

## Getting started
Not yet — setup steps will be added when implementation starts. Stack: Cloudflare Workers + Hono + D1 (Drizzle) + React/Vite. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## License
[MIT](LICENSE)

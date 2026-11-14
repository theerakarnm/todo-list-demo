# todo-list-demo

A To-Do List web app built as a demo for a YouTube video.

> **Status: design phase.** The feature list below is the MVP scope. No UI or app code has been written yet.

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
- **Basic Reminders** — browser/push notification or email at the task's due time.

### D. Auth & sync
- **Authentication** — email/password sign-up and sign-in, plus social login (e.g. Google).
- **Cross-device sync** — data syncs through the cloud automatically; desktop and mobile always show the same data.

### E. UX/UI standards
- **Optimistic UI** — completing or moving a task updates the screen immediately, without waiting for the server.
- **Responsive design** — Desktop: left sidebar + main work area. Mobile: bottom bar + slide-out drawer.
- **Dark / Light mode** — follows the system setting, or the user picks one.

## Out of scope for the MVP
Nested subtasks (more than one level), recurring tasks, sharing/collaboration, tags/labels, attachments.

## Getting started
Not yet — the tech stack and setup steps will be added once the design is final.

## License
[MIT](LICENSE)

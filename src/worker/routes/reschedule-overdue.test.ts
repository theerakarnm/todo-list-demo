import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { todayInTimeZone, zonedDateTimeToUtcMs } from "../../shared/time-zone";
import { apiAs, bodyOf } from "../test/api";
import { newId } from "../test/ids";
import { createTestUser } from "../test/users";

// UTC+14 and UTC-11: their calendar dates are always 1 or 2 days apart.
const FAR_EAST = "Pacific/Kiritimati";
const FAR_WEST = "Pacific/Pago_Pago";

type Rescheduled = { today: string; tasks: { id: string; dueDate: string }[] };

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + days)).toISOString().slice(0, 10);
}

async function createTask(userId: string, fields: Record<string, unknown>) {
  const id = newId();
  const response = await apiAs(userId).put(`/api/tasks/${id}`, { title: "งานค้าง", position: "a0", ...fields });
  expect(response.status).toBe(200);
  return id;
}

function dueOf(id: string) {
  return env.DB.prepare("SELECT due_date, due_time, remind_at, reminder_sent_at FROM tasks WHERE id = ?")
    .bind(id)
    .first<{ due_date: string; due_time: string | null; remind_at: number | null; reminder_sent_at: number | null }>();
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("POST /api/tasks/reschedule-overdue", () => {
  it("moves every overdue active task to today in the user's time zone and returns the old dates", async () => {
    const userId = await createTestUser({ timezone: FAR_EAST });
    const today = todayInTimeZone(Date.now(), FAR_EAST);
    // Still "today" in Pago Pago, but already the past in Kiritimati.
    const overdueHere = await createTask(userId, { dueDate: todayInTimeZone(Date.now(), FAR_WEST) });
    const longOverdue = await createTask(userId, { dueDate: addDays(today, -10) });
    const dueToday = await createTask(userId, { dueDate: today });
    const noDate = await createTask(userId, {});
    const completed = await createTask(userId, { dueDate: addDays(today, -3) });
    await apiAs(userId).patch(`/api/tasks/${completed}`, { completed: true });

    const response = await apiAs(userId).post("/api/tasks/reschedule-overdue");

    expect(response.status).toBe(200);
    const body = await bodyOf<Rescheduled>(response);
    expect(body.today).toBe(today);
    expect(body.tasks).toEqual(
      expect.arrayContaining([
        { id: overdueHere, dueDate: todayInTimeZone(Date.now(), FAR_WEST) },
        { id: longOverdue, dueDate: addDays(today, -10) },
      ]),
    );
    expect(body.tasks).toHaveLength(2);
    expect((await dueOf(overdueHere))?.due_date).toBe(today);
    expect((await dueOf(longOverdue))?.due_date).toBe(today);
    expect((await dueOf(dueToday))?.due_date).toBe(today);
    expect((await dueOf(noDate))?.due_date).toBeNull();
    expect((await dueOf(completed))?.due_date).toBe(addDays(today, -3));
  });

  it("moves the reminder to today's due time and lets it be sent again", async () => {
    const userId = await createTestUser({ timezone: "Asia/Bangkok" });
    const today = todayInTimeZone(Date.now(), "Asia/Bangkok");
    const taskId = await createTask(userId, { dueDate: addDays(today, -2), dueTime: "09:00" });
    await env.DB.prepare("UPDATE tasks SET reminder_sent_at = 1 WHERE id = ?").bind(taskId).run();

    await apiAs(userId).post("/api/tasks/reschedule-overdue");

    const due = await dueOf(taskId);
    expect(due?.remind_at).toBe(zonedDateTimeToUtcMs(today, "09:00", "Asia/Bangkok"));
    expect(due?.reminder_sent_at).toBeNull();
  });

  it("leaves other users' overdue tasks alone", async () => {
    const userId = await createTestUser();
    const otherUserId = await createTestUser();
    const othersTask = await createTask(otherUserId, { dueDate: "2020-01-01" });

    const body = await bodyOf<Rescheduled>(await apiAs(userId).post("/api/tasks/reschedule-overdue"));

    expect(body.tasks).toEqual([]);
    expect((await dueOf(othersTask))?.due_date).toBe("2020-01-01");
  });
});

describe("POST /api/tasks/reschedule-overdue/undo", () => {
  it("puts back the dates and reminders that reschedule-overdue returned", async () => {
    const userId = await createTestUser({ timezone: "Asia/Bangkok" });
    const taskId = await createTask(userId, { dueDate: "2026-01-05", dueTime: "18:00" });
    const { tasks } = await bodyOf<Rescheduled>(await apiAs(userId).post("/api/tasks/reschedule-overdue"));

    const response = await apiAs(userId).post("/api/tasks/reschedule-overdue/undo", { tasks });

    expect(response.status).toBe(200);
    const due = await dueOf(taskId);
    expect(due?.due_date).toBe("2026-01-05");
    expect(due?.remind_at).toBe(Date.UTC(2026, 0, 5, 11, 0));
  });

  it("cannot change another user's tasks", async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const taskId = await createTask(owner, { dueDate: "2026-01-05" });

    await apiAs(intruder).post("/api/tasks/reschedule-overdue/undo", { tasks: [{ id: taskId, dueDate: "2020-01-01" }] });

    expect((await dueOf(taskId))?.due_date).toBe("2026-01-05");
  });
});

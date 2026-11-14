import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiAs, bodyOf } from "../test/api";
import { newId } from "../test/ids";
import { seedTasks } from "../test/seed";
import { createTestUser } from "../test/users";

type Results = { tasks: { id: string; title: string }[]; projects: { id: string; name: string }[] };

async function createTask(userId: string, title: string, notes = "") {
  const id = newId();
  const response = await apiAs(userId).put(`/api/tasks/${id}`, { title, notes, position: "a0" });
  expect(response.status).toBe(200);
  return id;
}

async function search(userId: string, q: string) {
  const response = await apiAs(userId).get(`/api/search?q=${encodeURIComponent(q)}`);
  expect(response.status).toBe(200);
  return bodyOf<Results>(response);
}

const titlesOf = (results: Results) => results.tasks.map((task) => task.title).sort();

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("GET /api/search", () => {
  it("finds a Thai word in the middle of a sentence with no spaces", async () => {
    const userId = await createTestUser();
    await createTask(userId, "โทรนัดช่างแอร์พรุ่งนี้");
    await createTask(userId, "ซื้อนม");

    expect(titlesOf(await search(userId, "ช่างแอร์"))).toEqual(["โทรนัดช่างแอร์พรุ่งนี้"]);
  });

  it("searches notes as well as titles", async () => {
    const userId = await createTestUser();
    await createTask(userId, "นัดหมาย", "เบอร์ช่างแอร์ 081");

    expect(titlesOf(await search(userId, "ช่างแอร์"))).toEqual(["นัดหมาย"]);
  });

  it("includes completed tasks but not deleted ones", async () => {
    const userId = await createTestUser();
    const completedId = await createTask(userId, "ล้างแอร์ เสร็จ");
    const deletedId = await createTask(userId, "ล้างแอร์ ลบ");
    await apiAs(userId).patch(`/api/tasks/${completedId}`, { completed: true });
    await apiAs(userId).delete(`/api/tasks/${deletedId}`);

    expect(titlesOf(await search(userId, "ล้างแอร์"))).toEqual(["ล้างแอร์ เสร็จ"]);
  });

  it("treats % and _ as plain characters, not LIKE wildcards", async () => {
    const userId = await createTestUser();
    await createTask(userId, "ลด 50% ทั้งร้าน");
    await createTask(userId, "ลด 50 บาท");
    await createTask(userId, "file_name");
    await createTask(userId, "filename");

    expect(titlesOf(await search(userId, "50%"))).toEqual(["ลด 50% ทั้งร้าน"]);
    expect(titlesOf(await search(userId, "%"))).toEqual(["ลด 50% ทั้งร้าน"]);
    expect(titlesOf(await search(userId, "e_n"))).toEqual(["file_name"]);
  });

  it("finds projects by name", async () => {
    const userId = await createTestUser();
    const projectId = newId();
    await apiAs(userId).put(`/api/projects/${projectId}`, { name: "ซ่อมบ้าน", position: "a0" });

    const results = await search(userId, "ซ่อม");

    expect(results.projects).toEqual([expect.objectContaining({ id: projectId, name: "ซ่อมบ้าน" })]);
  });

  it("returns at most 50 tasks", async () => {
    const userId = await createTestUser();
    await seedTasks(userId, 60, { title: "งานซ้ำ" });

    expect((await search(userId, "งานซ้ำ")).tasks).toHaveLength(50);
  });

  it("never returns another user's tasks or projects", async () => {
    const userId = await createTestUser();
    const otherUserId = await createTestUser();
    await createTask(otherUserId, "ช่างแอร์ของคนอื่น");
    await apiAs(otherUserId).put(`/api/projects/${newId()}`, { name: "ช่างแอร์", position: "a0" });

    expect(await search(userId, "ช่างแอร์")).toEqual({ tasks: [], projects: [] });
  });

  it("rejects an empty query", async () => {
    const userId = await createTestUser();

    expect((await apiAs(userId).get("/api/search?q=%20")).status).toBe(400);
  });
});

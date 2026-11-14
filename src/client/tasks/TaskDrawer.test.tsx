import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { anAttachment, aProject, aSubtask, aTask, storeWith } from "../data/test-rows";
import th from "../i18n/th.json";
import { answerLater, echoCreatedRow, requestsTo, stubApi } from "../test/fake-api";
import { aFile, stubBrowserImages } from "../test/fake-images";
import { renderWithStore } from "../test/render";
import type { Attachment } from "../data/types";
import { TaskDrawer } from "./TaskDrawer";
import { TaskList } from "./TaskList";

function renderDrawer(attachments: Attachment[] = []) {
  const store = storeWith({
    projects: [aProject({ id: "p1", name: "งาน" })],
    tasks: [aTask({ id: "t1", title: "ส่งใบเสนอราคาให้ลูกค้า", dueDate: "2026-11-14" })],
    subtasks: [aSubtask({ id: "s1", taskId: "t1", title: "ทำตัวเลข" })],
    attachments,
  });
  const result = renderWithStore(<TaskDrawer />, store, "/app/today?task=t1");
  return { ...result, drawer: within(screen.getByRole("dialog", { name: th.drawer.label })) };
}

describe("TaskDrawer", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("edits the title, project and priority", async () => {
    const calls = stubApi({ "PATCH /api/tasks/:id": () => aTask({ id: "t1", updatedAt: 0 }) });
    const { drawer } = renderDrawer();

    const title = drawer.getByRole("textbox", { name: th.drawer.title });
    fireEvent.change(title, { target: { value: "ส่งใบเสนอราคา v2" } });
    fireEvent.blur(title);
    fireEvent.change(drawer.getByRole("combobox", { name: th.drawer.project }), { target: { value: "p1" } });
    fireEvent.click(drawer.getByRole("radio", { name: th.priorities.high }));

    await waitFor(() => expect(calls).toHaveLength(3));
    expect(calls[0]?.body).toEqual({ title: "ส่งใบเสนอราคา v2" });
    expect(calls[1]?.body).toMatchObject({ projectId: "p1" });
    expect(calls[2]?.body).toEqual({ priority: "high" });
  });

  it("adds, ticks and deletes subtasks", async () => {
    const calls = stubApi({
      "PUT /api/subtasks/:id": echoCreatedRow,
      "PATCH /api/subtasks/:id": () => aSubtask({ id: "s1", taskId: "t1", completedAt: 5, updatedAt: 0 }),
      "DELETE /api/subtasks/:id": () => aSubtask({ id: "s1", taskId: "t1", deletedAt: 5, updatedAt: 0 }),
    });
    const { drawer } = renderDrawer();

    const add = drawer.getByRole("textbox", { name: th.drawer.addSubtask });
    fireEvent.change(add, { target: { value: "โทรถามลูกค้า" } });
    fireEvent.keyDown(add, { key: "Enter" });
    expect(await drawer.findByText("งานย่อย / subtasks - 0/2")).toBeTruthy();

    fireEvent.click(drawer.getByRole("button", { name: "ทำเครื่องหมายว่าเสร็จ: ทำตัวเลข" }));
    expect(await drawer.findByText("งานย่อย / subtasks - 1/2")).toBeTruthy();

    fireEvent.click(drawer.getByRole("button", { name: "ลบงานย่อย: ทำตัวเลข" }));
    expect(await drawer.findByText("งานย่อย / subtasks - 0/1")).toBeTruthy();
    await waitFor(() => expect(calls.map((call) => call.method)).toEqual(["PUT", "PATCH", "DELETE"]));
    expect(calls[0]?.body).toMatchObject({ taskId: "t1", title: "โทรถามลูกค้า" });
  });

  it("deletes the task, closes, and offers Undo", async () => {
    const calls = stubApi({ "DELETE /api/tasks/:id": () => aTask({ id: "t1", deletedAt: 5, updatedAt: 5 }) });
    const { drawer, router } = renderDrawer();

    fireEvent.click(drawer.getByRole("button", { name: th.drawer.delete }));

    await waitFor(() => expect(router.state.location.search).toBe(""));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(within(screen.getByRole("status")).getByRole("button", { name: th.toast.undo })).toBeTruthy();
    await waitFor(() => expect(calls[0]?.method).toBe("DELETE"));
  });

  it("closes with Esc", async () => {
    const { router } = renderDrawer();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    await waitFor(() => expect(router.state.location.search).toBe(""));
  });

  it("keeps typed notes when Back closes the drawer before the field loses focus", async () => {
    const calls = stubApi({ "PATCH /api/tasks/:id": () => aTask({ id: "t1", updatedAt: 0 }) });
    const { drawer, router } = renderDrawer();

    fireEvent.change(drawer.getByRole("textbox", { name: th.drawer.notes }), { target: { value: "แนบราคาใหม่" } });
    await act(() => router.navigate("/app/today"));

    await waitFor(() => expect(calls[0]?.body).toEqual({ notes: "แนบราคาใหม่" }));
  });

  it("closing a task opened from a list goes back, leaving no extra history entry", async () => {
    const store = storeWith({ tasks: [aTask({ id: "t1", title: "จ่ายค่าไฟ" })] });
    const { router } = renderWithStore(
      <>
        <TaskList tasks={Object.values(store.tasks)} dateStyle="full" />
        <TaskDrawer />
      </>,
      store,
      "/app/inbox",
    );

    fireEvent.click(screen.getByRole("link", { name: "จ่ายค่าไฟ" }));
    fireEvent.keyDown(await screen.findByRole("dialog"), { key: "Escape" });

    await waitFor(() => expect(router.state.historyAction).toBe("POP"));
    expect(router.state.location.search).toBe("");
  });
});

const imageSources = (scope: ReturnType<typeof within>) =>
  scope.queryAllByRole("img").map((image: HTMLElement) => image.getAttribute("src"));

describe("TaskDrawer images", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows the task's images in gallery order under the notes", () => {
    const { drawer } = renderDrawer([
      anAttachment({ id: "a2", taskId: "t1", position: "a1" }),
      anAttachment({ id: "a1", taskId: "t1", position: "a0" }),
    ]);

    expect(drawer.getByText("รูปภาพ / images - 2/10")).toBeTruthy();
    expect(imageSources(drawer)).toEqual(["/api/files/u/user-1/t/t1/a1", "/api/files/u/user-1/t/t1/a2"]);
  });

  it("adds images from the file picker and shows the progress until each is stored", async () => {
    stubBrowserImages();
    const upload = answerLater("POST /api/tasks/:id/attachments");
    const { drawer } = renderDrawer();

    fireEvent.change(drawer.getByLabelText(th.images.add), {
      target: { files: [aFile("receipt.jpg", "image/jpeg")] },
    });

    const progress = await drawer.findByRole("progressbar", { name: "กำลังอัปโหลดรูปที่ 1" });
    expect(progress.getAttribute("aria-valuenow")).toBe("0");
    expect(imageSources(drawer)).toEqual(["blob:preview-1"]);
    expect(drawer.getByText("รูปภาพ / images - 1/10")).toBeTruthy();

    const id = (await vi.waitFor(async () => {
      const form = await stubbedUploadForm();
      return form.get("id");
    })) as string;
    upload.reply(Response.json(anAttachment({ id, taskId: "t1", updatedAt: 9 }), { status: 201 }));

    await waitFor(() => expect(imageSources(drawer)).toEqual([`/api/files/u/user-1/t/t1/${id}`]));
    expect(drawer.queryByRole("progressbar")).toBeNull();
  });
});

describe("TaskDrawer images: reorder", () => {
  it("gives each image a grip to drag it, with a Thai name for the screen reader", () => {
    const { drawer } = renderDrawer([anAttachment({ id: "a1", taskId: "t1" })]);

    const grip = drawer.getByRole("button", { name: "ลากเพื่อย้าย: รูปที่ 1" });
    expect(grip.getAttribute("aria-roledescription")).toBe(th.dnd.roleDescription);
  });
});

describe("TaskDrawer images: delete", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("deletes an image with its own button", async () => {
    const calls = stubApi({
      "DELETE /api/attachments/:id": anAttachment({ id: "a1", taskId: "t1", deletedAt: 5, updatedAt: 5 }),
    });
    const { drawer } = renderDrawer([
      anAttachment({ id: "a1", taskId: "t1", position: "a0" }),
      anAttachment({ id: "a2", taskId: "t1", position: "a1" }),
    ]);

    fireEvent.click(drawer.getByRole("button", { name: "ลบรูปที่ 1" }));

    await waitFor(() => expect(imageSources(drawer)).toEqual(["/api/files/u/user-1/t/t1/a2"]));
    expect(drawer.getByText("รูปภาพ / images - 1/10")).toBeTruthy();
    await waitFor(() => expect(calls.map((call) => call.path)).toEqual(["/api/attachments/a1"]));
  });
});

describe("TaskDrawer images: drop and paste", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows where to drop while files are dragged over the drawer, and uploads what is dropped", async () => {
    stubBrowserImages();
    answerLater("POST /api/tasks/:id/attachments");
    const { drawer } = renderDrawer();
    const dialog = screen.getByRole("dialog");
    const dataTransfer = { types: ["Files"], files: [aFile("whiteboard.png", "image/png")], dropEffect: "none" };

    fireEvent.dragEnter(drawer.getByRole("textbox", { name: th.drawer.notes }), { dataTransfer });
    expect(drawer.getByText(th.images.drop)).toBeTruthy();
    fireEvent.drop(dialog, { dataTransfer });

    expect(drawer.queryByText(th.images.drop)).toBeNull();
    expect(await drawer.findByRole("progressbar", { name: "กำลังอัปโหลดรูปที่ 1" })).toBeTruthy();
  });

  it("ignores a drag that carries no files, like selected text", () => {
    renderDrawer();

    fireEvent.dragEnter(screen.getByRole("dialog"), { dataTransfer: { types: ["text/plain"], files: [] } });

    expect(screen.queryByText(th.images.drop)).toBeNull();
  });

  it("uploads an image pasted anywhere in the drawer, even into the notes", async () => {
    stubBrowserImages();
    answerLater("POST /api/tasks/:id/attachments");
    const { drawer } = renderDrawer();

    const pasted = fireEvent.paste(drawer.getByRole("textbox", { name: th.drawer.notes }), {
      clipboardData: { types: ["Files"], files: [aFile("screenshot.png", "image/png")] },
    });

    expect(pasted).toBe(false);
    expect(await drawer.findByRole("progressbar", { name: "กำลังอัปโหลดรูปที่ 1" })).toBeTruthy();
  });

  it("leaves a text paste to the field being typed in", () => {
    renderDrawer();

    const pasted = fireEvent.paste(screen.getByRole("textbox", { name: th.drawer.notes }), {
      clipboardData: { types: ["text/plain"], files: [] },
    });

    expect(pasted).toBe(true);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});

async function stubbedUploadForm() {
  const request = requestsTo("POST /api/tasks/t1/attachments")[0];
  if (!request) throw new Error("not sent yet");
  return request.clone().formData();
}

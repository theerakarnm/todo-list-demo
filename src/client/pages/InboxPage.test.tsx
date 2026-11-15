import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aTask, storeWith } from "../data/test-rows";
import th from "../i18n/th.json";
import { echoCreatedRow, stubApi } from "../test/fake-api";
import { renderWithStore } from "../test/render";
import InboxPage from "./InboxPage";

describe("InboxPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lists the Inbox with its count", () => {
    renderWithStore(<InboxPage />, storeWith({ tasks: [aTask({ id: "t1", title: "ซ่อมก๊อกน้ำห้องครัว" })] }));

    expect(screen.getByText("ยังไม่จัด - 1")).toBeTruthy();
    expect(screen.getByRole("link", { name: "ซ่อมก๊อกน้ำห้องครัว" })).toBeTruthy();
  });

  it("adds a task inline with Enter and stays open for the next one; Esc closes", async () => {
    const calls = stubApi({ "PUT /api/tasks/:id": echoCreatedRow });
    renderWithStore(<InboxPage />, storeWith({}));

    fireEvent.click(screen.getByRole("button", { name: new RegExp(th.task.addTask) }));
    const input = screen.getByRole("textbox", { name: th.task.addTask });
    fireEvent.change(input, { target: { value: "ไอเดียแคมเปญปีใหม่" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(await screen.findByRole("link", { name: "ไอเดียแคมเปญปีใหม่" })).toBeTruthy();
    expect(screen.getByText("ยังไม่จัด - 1")).toBeTruthy();
    await waitFor(() => expect(calls[0]?.body).toMatchObject({ title: "ไอเดียแคมเปญปีใหม่", projectId: null, dueDate: null }));
    expect((input as HTMLInputElement).value).toBe("");

    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("textbox", { name: th.task.addTask })).toBeNull();
    expect(within(document.body).getByRole("button", { name: new RegExp(th.task.addTask) })).toBeTruthy();
  });
});

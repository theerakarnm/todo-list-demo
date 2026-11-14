import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { storeWith } from "../data/test-rows";
import th from "../i18n/th.json";
import { echoCreatedRow, stubApi } from "../test/fake-api";
import { renderWithStore } from "../test/render";
import { NewProjectDialog } from "./NewProjectDialog";

describe("NewProjectDialog", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("creates the project with its colour and opens it", async () => {
    const calls = stubApi({ "PUT /api/projects/:id": echoCreatedRow });
    const onClose = vi.fn();
    const { router } = renderWithStore(<NewProjectDialog onClose={onClose} />, storeWith({}));

    fireEvent.change(screen.getByRole("textbox", { name: th.newProject.name }), { target: { value: "เป้าหมายปีนี้" } });
    fireEvent.click(screen.getByRole("radio", { name: th.projectColors.violet }));
    fireEvent.click(screen.getByRole("button", { name: th.newProject.create }));

    await waitFor(() => expect(calls[0]?.body).toMatchObject({ name: "เป้าหมายปีนี้", color: "violet" }));
    expect(router.state.location.pathname).toBe(calls[0]?.path.replace("/api/projects/", "/app/projects/"));
    expect(onClose).toHaveBeenCalled();
  });
});

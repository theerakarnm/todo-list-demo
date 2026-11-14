import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import "../i18n";
import th from "../i18n/th.json";
import { ProjectsNav } from "./ProjectsNav";

describe("ProjectsNav", () => {
  it("lists each project with its open task count", () => {
    render(
      <MemoryRouter>
        <ProjectsNav collapsed={false} projects={[{ id: "p1", name: "งาน", color: "blue", openTaskCount: 8 }]} />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: /งาน/ });
    expect(link.getAttribute("href")).toBe("/app/projects/p1");
    expect(link.textContent).toContain("8");
    expect(screen.queryByText(th.nav.noProjects)).toBeNull();
  });
});

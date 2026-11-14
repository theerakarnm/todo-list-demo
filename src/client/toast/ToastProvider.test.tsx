import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../i18n";
import th from "../i18n/th.json";
import { ToastProvider, useToast } from "./ToastProvider";

function ShowsToast({ onUndo }: { onUndo?: () => void }) {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast({ message: "ทำเสร็จแล้ว", onUndo })}>
      show
    </button>
  );
}

function renderWithToasts(onUndo?: () => void) {
  render(
    <ToastProvider>
      <ShowsToast onUndo={onUndo} />
    </ToastProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "show" }));
  return within(screen.getByRole("status"));
}

describe("ToastProvider", () => {
  afterEach(() => vi.useRealTimers());

  it("announces the message in a status region", () => {
    const toasts = renderWithToasts();

    expect(toasts.getByText("ทำเสร็จแล้ว")).toBeTruthy();
    expect(toasts.queryByRole("button", { name: th.toast.undo })).toBeNull();
  });

  it("calls the undo action once and closes", () => {
    const onUndo = vi.fn();
    const toasts = renderWithToasts(onUndo);

    fireEvent.click(toasts.getByRole("button", { name: th.toast.undo }));

    expect(onUndo).toHaveBeenCalledOnce();
    expect(toasts.queryByText("ทำเสร็จแล้ว")).toBeNull();
  });

  it("goes away after 5 seconds", () => {
    vi.useFakeTimers();
    const toasts = renderWithToasts(vi.fn());

    act(() => vi.advanceTimersByTime(4900));
    expect(toasts.queryByText("ทำเสร็จแล้ว")).toBeTruthy();
    act(() => vi.advanceTimersByTime(200));
    expect(toasts.queryByText("ทำเสร็จแล้ว")).toBeNull();
  });

  it("stays while the pointer is on it, so Undo can be reached", () => {
    vi.useFakeTimers();
    const toasts = renderWithToasts(vi.fn());

    fireEvent.mouseEnter(toasts.getByText("ทำเสร็จแล้ว").parentElement as HTMLElement);
    act(() => vi.advanceTimersByTime(10_000));
    expect(toasts.queryByText("ทำเสร็จแล้ว")).toBeTruthy();

    fireEvent.mouseLeave(toasts.getByText("ทำเสร็จแล้ว").parentElement as HTMLElement);
    act(() => vi.advanceTimersByTime(5100));
    expect(toasts.queryByText("ทำเสร็จแล้ว")).toBeNull();
  });
});

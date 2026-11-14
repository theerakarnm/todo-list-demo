import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useShortcut } from "./use-shortcut";

function ShortcutProbe({ onSearch, onQuickAdd }: { onSearch: () => void; onQuickAdd: () => void }) {
  useShortcut({ code: "KeyK", withModifier: true }, onSearch);
  useShortcut({ code: "KeyQ" }, onQuickAdd);
  return <input aria-label="title" />;
}

function setup() {
  const onSearch = vi.fn();
  const onQuickAdd = vi.fn();
  const { getByLabelText } = render(<ShortcutProbe onSearch={onSearch} onQuickAdd={onQuickAdd} />);
  return { onSearch, onQuickAdd, input: getByLabelText("title") };
}

describe("useShortcut", () => {
  it("runs Ctrl+K and Cmd+K", () => {
    const { onSearch } = setup();

    fireEvent.keyDown(window, { code: "KeyK", key: "k", ctrlKey: true });
    fireEvent.keyDown(window, { code: "KeyK", key: "k", metaKey: true });

    expect(onSearch).toHaveBeenCalledTimes(2);
  });

  it("ignores K without the modifier", () => {
    const { onSearch } = setup();

    fireEvent.keyDown(window, { code: "KeyK", key: "k" });

    expect(onSearch).not.toHaveBeenCalled();
  });

  it("runs Q on a Thai keyboard layout too (matches the physical key)", () => {
    const { onQuickAdd } = setup();

    fireEvent.keyDown(window, { code: "KeyQ", key: "ๆ" });

    expect(onQuickAdd).toHaveBeenCalledOnce();
  });

  it("does not steal Q while the user is typing", () => {
    const { onQuickAdd, input } = setup();

    fireEvent.keyDown(input, { code: "KeyQ", key: "q" });

    expect(onQuickAdd).not.toHaveBeenCalled();
  });

  it("ignores Q with Ctrl or Cmd held (browser shortcuts)", () => {
    const { onQuickAdd } = setup();

    fireEvent.keyDown(window, { code: "KeyQ", key: "q", metaKey: true });

    expect(onQuickAdd).not.toHaveBeenCalled();
  });
});

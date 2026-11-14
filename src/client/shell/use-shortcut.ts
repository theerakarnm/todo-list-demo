import { useEffect } from "react";

type Shortcut = {
  /** Physical key (KeyboardEvent.code), so it also works with the Thai keyboard layout. */
  code: string;
  /** Needs Ctrl (Windows/Linux) or Cmd (Mac). */
  withModifier?: boolean;
};

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/** Global keyboard shortcut, e.g. Ctrl/Cmd+K for Search and Q for Quick Add. */
export function useShortcut({ code, withModifier = false }: Shortcut, onPress: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const modifierHeld = event.ctrlKey || event.metaKey;
      if (event.code !== code || modifierHeld !== withModifier || event.altKey) return;
      if (!withModifier && isTyping(event.target)) return;

      event.preventDefault();
      onPress();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [code, withModifier, onPress]);
}

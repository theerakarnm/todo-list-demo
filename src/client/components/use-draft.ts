import { useEffect, useRef, useState } from "react";

/**
 * Text the user is editing in place (a title, notes). It is saved when the field
 * loses focus, or when the field goes away first (e.g. Back closes the drawer).
 * `save` returns false to refuse the text (an empty title), which puts the saved text back.
 */
export function useDraft(saved: string, save: (text: string) => boolean) {
  const [draft, setDraft] = useState(saved);
  const latest = useRef({ unsaved: null as string | null, saved, save });

  useEffect(() => {
    latest.current.saved = saved;
    latest.current.save = save;
  });

  // Someone else changed it (another device, Undo): show their text.
  useEffect(() => setDraft(saved), [saved]);

  useEffect(
    () => () => {
      const { unsaved, saved, save } = latest.current;
      if (unsaved !== null && unsaved !== saved) save(unsaved);
    },
    [],
  );

  function onBlur() {
    const { unsaved } = latest.current;
    latest.current.unsaved = null;
    if (unsaved !== null && unsaved !== saved && !save(unsaved)) setDraft(saved);
  }

  /** Throws the edit away (Esc). */
  function reset() {
    latest.current.unsaved = null;
    setDraft(saved);
  }

  return {
    /** Spread onto the input or textarea. */
    field: {
      value: draft,
      onChange: (event: { target: { value: string } }) => {
        latest.current.unsaved = event.target.value;
        setDraft(event.target.value);
      },
      onBlur,
    },
    reset,
  };
}

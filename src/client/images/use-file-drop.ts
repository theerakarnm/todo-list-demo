import { type ClipboardEvent, type DragEvent, useRef, useState } from "react";

const carriesFiles = (event: DragEvent) => event.dataTransfer.types.includes("Files");

/**
 * Files dropped on, or pasted into, an area. `dropping` is true while files
 * are dragged over it. A paste without files (plain text) is left to the field.
 */
export function useFileDrop(onFiles: (files: File[]) => void) {
  const [dropping, setDropping] = useState(false);
  // dragenter and dragleave fire for every child the pointer crosses; counting
  // them works in every browser (Safari gives dragleave no relatedTarget).
  const depth = useRef(0);

  const handlers = {
    onDragEnter(event: DragEvent) {
      if (!carriesFiles(event)) return;
      depth.current++;
      setDropping(true);
    },
    onDragOver(event: DragEvent) {
      if (!carriesFiles(event)) return;
      // Without this the browser would open the file instead of dropping it here.
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    onDragLeave(event: DragEvent) {
      if (!carriesFiles(event)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDropping(false);
    },
    onDrop(event: DragEvent) {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth.current = 0;
      setDropping(false);
      onFiles([...event.dataTransfer.files]);
    },
    onPaste(event: ClipboardEvent) {
      const files = [...event.clipboardData.files];
      if (files.length === 0) return;
      event.preventDefault();
      onFiles(files);
    },
  };

  return { dropping, handlers };
}

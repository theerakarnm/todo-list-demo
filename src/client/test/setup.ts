import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only cleans up by itself when Vitest globals are on; they are off here.
afterEach(cleanup);

// jsdom has no modal <dialog> API. Mimic what browsers do natively:
// showModal() opens it, close() closes it and fires "close", Escape closes it.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.open = true;
  this.addEventListener("keydown", closeOnEscape);
};
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  if (!this.open) return;
  this.open = false;
  this.removeEventListener("keydown", closeOnEscape);
  this.dispatchEvent(new Event("close"));
};

function closeOnEscape(this: HTMLDialogElement, event: KeyboardEvent) {
  if (event.key === "Escape") this.close();
}

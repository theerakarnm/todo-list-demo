import { cleanup, configure } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { queryClient } from "../api/query-client";
import { installFakeApi } from "./fake-api";

// A fresh fake API server (signed in by default) and an empty query cache for every test.
beforeEach(installFakeApi);
afterEach(() => queryClient.clear());

// Testing Library only cleans up by itself when Vitest globals are on; they are off here.
afterEach(cleanup);

// Screens are lazy chunks; under a full parallel run the first import can take over 1s.
configure({ asyncUtilTimeout: 5000 });

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

// A <form method="dialog"> closes its dialog when submitted, as in browsers.
document.addEventListener("submit", (event) => {
  const form = event.target as HTMLFormElement;
  if (form.getAttribute("method") !== "dialog") return;
  event.preventDefault();
  form.closest("dialog")?.close();
});

function closeOnEscape(this: HTMLDialogElement, event: KeyboardEvent) {
  if (event.key === "Escape") this.close();
}

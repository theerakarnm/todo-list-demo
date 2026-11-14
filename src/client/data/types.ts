import type { InferResponseType } from "hono/client";
import type { api } from "../api/client";

// Row types come straight from the API, so a server change shows up here as a type error.
export type SyncResponse = InferResponseType<typeof api.api.sync.$get, 200>;
export type Task = SyncResponse["tasks"][number];
export type Project = SyncResponse["projects"][number];
export type Subtask = SyncResponse["subtasks"][number];
export type ViewSettings = SyncResponse["settings"];

import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/** Drizzle over the D1 binding. Cheap to create, so each request makes its own. */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Db = ReturnType<typeof createDb>;

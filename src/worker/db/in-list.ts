import { type Column, inArray, sql } from "drizzle-orm";

/**
 * `column IN (values)` for any number of values: they travel as one JSON
 * parameter, because D1 binds at most 100 parameters per statement.
 */
export function inJsonList(column: Column, values: readonly string[]) {
  return inArray(column, sql`(SELECT value FROM json_each(${JSON.stringify(values)}))`);
}

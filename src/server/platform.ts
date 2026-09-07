import type { D1Database } from "@cloudflare/workers-types";
import type { RequestEventBase } from "@builder.io/qwik-city";

/** The Worker's bindings, as declared in `wrangler.jsonc`. */
export interface Env {
  DB: D1Database;
}

/**
 * The D1 binding, or null when there is not one.
 *
 * That happens more often than it sounds: `npm run dev` before the local
 * database has been created, a preview deployment without the binding, or an
 * outage. Every caller degrades instead of throwing — the card is the point and
 * the scoreboard is a bonus, so a missing database costs you the board and not
 * the game.
 */
export const databaseFrom = (event: RequestEventBase): D1Database | null => {
  const env = (event.platform as { env?: Partial<Env> } | undefined)?.env;
  return env?.DB ?? null;
};

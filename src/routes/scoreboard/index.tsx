import type { RequestHandler } from "@builder.io/qwik-city";

/**
 * There is no board that is not a board for some nice list, so the bare path
 * lands on the one everybody starts with rather than inventing a fourth view.
 */
export const onGet: RequestHandler = ({ redirect }) => {
  throw redirect(302, "/scoreboard/kind/");
};

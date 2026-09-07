import { createContextId, type Signal } from "@builder.io/qwik";

/**
 * The snowfall tracks the in-game calendar, and the backdrop lives in the
 * layout so it survives navigation between the card, the game and the board.
 * The running game pushes its tick in here; everything else leaves it at zero,
 * which is Boxing Day and so still deep winter.
 */
export const SnowTickContext = createContextId<Signal<number>>(
  "present-delivery.snow-tick",
);

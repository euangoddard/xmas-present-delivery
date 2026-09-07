/**
 * Tuned game constants.
 *
 * These numbers are not the 2014 original's. The original's economy was swept
 * in the specification and found to have three faults: capacity and power never
 * constrained anything, presents were simultaneously the currency and the score
 * (so the optimal line was to stop playing), and the difficulty choice was worth
 * about four game-days. The values below come from a balance sweep of the
 * reworked economy and land a competent run at game-day 250 on Kind, 270 on
 * Fair and 290 on Exacting, with all three objectives completing within about
 * 25 game-days of one another.
 */

/** One tick is one real second and moves the fiction on by twelve hours. */
export const TICK_MS = 1000;
export const TICKS_PER_DAY = 2;

/** Boxing Day through to Christmas Day: 364 days, 728 ticks, 12m08s. */
export const START_DATE = new Date(2025, 11, 26);
export const END_DATE = new Date(2026, 11, 25);
export const TOTAL_TICKS = 728;

/** Real estimate of children on Earth — the basis of every target. */
export const CHILDREN_ON_EARTH = 1.87e9;

/** Anything past this is unrepresentable and renders as "plenty". */
export const NUMBER_CEILING = 1e36;

/** Purchase prices are geometric in the number already owned. */
export const COST_GROWTH = 1.15;

/** Father Christmas works whether or not anyone clicks for him. */
export const BASE_INCOME = 3;

/** Presents made per click, before Santa upgrades multiply it. */
export const CLICK_BASE = 5;

/** Santa's sack: the workshop can store this much before any sleigh is bought. */
export const BASE_CAPACITY = 5000;

export interface Difficulty {
  readonly id: "kind" | "fair" | "exacting";
  readonly label: string;
  readonly detail: string;
  /** Share of the world's children on the nice list. */
  readonly factor: number;
  /** A fussier Santa rejects more work, so the workshop produces less. */
  readonly outputModifier: number;
}

/**
 * The original labelled these by how picky Father Christmas was, which made the
 * *easiest* setting the one called "picky" — logical, and read backwards by
 * every player. These are named by the outcome instead, and the interface shows
 * the resulting number as the choice is made.
 */
export const DIFFICULTIES: readonly Difficulty[] = [
  {
    id: "kind",
    label: "Kind",
    detail: "Half the world's children make the nice list.",
    factor: 0.5,
    outputModifier: 1,
  },
  {
    id: "fair",
    label: "Fair",
    detail: "Three in five make the list, and standards are higher.",
    factor: 0.6,
    outputModifier: 0.9,
  },
  {
    id: "exacting",
    label: "Exacting",
    detail: "Seven in ten qualify, and nothing sloppy leaves the workshop.",
    factor: 0.7,
    outputModifier: 0.8,
  },
];

export const targetFor = (difficulty: Difficulty): number =>
  Math.floor(CHILDREN_ON_EARTH * difficulty.factor);

/** Narrows an unknown route parameter or stored value to a real setting. */
export const isDifficultyId = (value: unknown): value is Difficulty["id"] =>
  DIFFICULTIES.some((entry) => entry.id === value);

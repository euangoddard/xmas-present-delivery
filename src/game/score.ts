import { TOTAL_TICKS, type Difficulty } from "./constants";
import type { GameState } from "./types";

/** Long enough for a name, short enough to sit in a table row. */
export const MAX_NAME_LENGTH = 24;

/** How many entries a board shows before it starts eliding. */
export const BOARD_SIZE = 10;

/** Presents that actually left the ground: made, stored *and* airborne. */
export const deliveredOf = (state: GameState): number =>
  Math.min(state.presents, state.capacity, state.power);

/**
 * The winning band. Any finished year outranks any unfinished one, and the two
 * cannot collide: a win scores at least this, a time-out at most this less one.
 */
export const WIN_BAND = 1_000_000;

/**
 * One integer, higher is better, so a board is one `ORDER BY` and a rank is one
 * `COUNT`.
 *
 * A finished year and an unfinished one are not comparable on the same
 * quantity. Every winner stops within a present or two of the target, so what
 * separates them is how much of the year was left; every loser stops on
 * Christmas Day, so what separates *them* is how close the sleigh got. Stacking
 * the two into disjoint bands ranks each group on the measure that discriminates
 * it, and still ranks them against each other correctly.
 */
export const scoreOf = (
  won: boolean,
  tick: number,
  delivered: number,
  target: number,
): number => {
  if (won) return WIN_BAND + Math.max(0, TOTAL_TICKS - Math.floor(tick));
  if (!(target > 0) || !Number.isFinite(delivered) || delivered < 0) return 0;
  const reach = Math.floor((delivered / target) * (WIN_BAND - 1));
  return Math.min(WIN_BAND - 1, Math.max(0, reach));
};

/** A row of a board, as it is stored and as it is shown. */
export interface ScoreEntry {
  readonly id: number;
  readonly rank: number;
  readonly name: string;
  readonly won: boolean;
  readonly tick: number;
  readonly delivered: number;
}

export interface Board {
  readonly difficultyId: Difficulty["id"];
  readonly entries: readonly ScoreEntry[];
  readonly total: number;
}

/**
 * What a run submits. The score is deliberately absent — the server derives it,
 * because a number the client hands over is a number the client can choose.
 */
export interface Submission {
  readonly difficultyId: Difficulty["id"];
  readonly name: string;
  readonly won: boolean;
  readonly tick: number;
  readonly delivered: number;
}

export interface SubmissionResult {
  readonly board: Board;
  /** The row just added, with the rank it took. */
  readonly entry: ScoreEntry;
  /** Whether that rank is inside the visible board. */
  readonly inBoard: boolean;
}

/** Trim, collapse whitespace and cap. Empty names become the house name. */
export const cleanName = (raw: string): string => {
  const trimmed = raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
  return trimmed.length > 0 ? trimmed : "Anonymous elf";
};

/** "One year" or "1,032 years", for the counts under a board. */
export const yearCount = (total: number): string =>
  total === 1 ? "one year" : `${total.toLocaleString("en-GB")} years`;

/** 1st, 2nd, 3rd, 11th. */
export const ordinal = (rank: number): string => {
  const suffix =
    rank % 100 >= 11 && rank % 100 <= 13
      ? "th"
      : rank % 10 === 1
        ? "st"
        : rank % 10 === 2
          ? "nd"
          : rank % 10 === 3
            ? "rd"
            : "th";
  return `${rank}${suffix}`;
};

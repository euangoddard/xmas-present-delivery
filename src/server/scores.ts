import type { D1Database } from "@cloudflare/workers-types";

import { DIFFICULTIES, TOTAL_TICKS, targetFor } from "~/game/constants";
import type { Difficulty } from "~/game/constants";
import {
  BOARD_SIZE,
  cleanName,
  scoreOf,
  type Board,
  type ScoreEntry,
  type Submission,
  type SubmissionResult,
} from "~/game/score";

/** Shape of a row as SQLite hands it back: no booleans, everything a number. */
interface Row {
  id: number;
  name: string;
  won: number;
  tick: number;
  delivered: number;
}

const toEntry = (row: Row, rank: number): ScoreEntry => ({
  id: Number(row.id),
  rank,
  name: String(row.name),
  won: Number(row.won) === 1,
  tick: Number(row.tick),
  delivered: Number(row.delivered),
});

const SELECT_BOARD = `
  SELECT id, name, won, tick, delivered
  FROM scores
  WHERE difficulty = ?1
  ORDER BY score DESC, id ASC
  LIMIT ?2
`;

const COUNT_BOARD = `SELECT COUNT(*) AS total FROM scores WHERE difficulty = ?1`;

/**
 * A row's rank is the number of rows that beat it, plus one. Ties break on
 * insertion order — first to get there keeps the higher place — which is the
 * same ordering the board itself uses, so the two can never disagree.
 */
const RANK_OF = `
  SELECT COUNT(*) + 1 AS rank
  FROM scores
  WHERE difficulty = ?1 AND (score > ?2 OR (score = ?2 AND id < ?3))
`;

/** The top of one board, and how many runs are behind it. */
export const fetchBoard = async (
  db: D1Database,
  difficultyId: Difficulty["id"],
): Promise<Board> => {
  const [top, count] = await db.batch<Row & { total: number }>([
    db.prepare(SELECT_BOARD).bind(difficultyId, BOARD_SIZE),
    db.prepare(COUNT_BOARD).bind(difficultyId),
  ]);

  return {
    difficultyId,
    entries: (top.results ?? []).map((row, index) => toEntry(row, index + 1)),
    total: Number(count.results?.[0]?.total ?? 0),
  };
};

/**
 * One stored row with its rank, for the `?me=` highlight — so a player who came
 * 214th can still link somebody at the board and be on it.
 */
export const fetchEntry = async (
  db: D1Database,
  difficultyId: Difficulty["id"],
  id: number,
): Promise<ScoreEntry | null> => {
  const row = await db
    .prepare(
      `SELECT id, name, won, tick, delivered, score FROM scores WHERE id = ?1 AND difficulty = ?2`,
    )
    .bind(id, difficultyId)
    .first<Row & { score: number }>();
  if (!row) return null;

  const rank = await db
    .prepare(RANK_OF)
    .bind(difficultyId, row.score, row.id)
    .first<{ rank: number }>();

  return toEntry(row, Number(rank?.rank ?? 1));
};

/**
 * Record a finished run and return the board it landed on.
 *
 * The score is computed here from the run's own numbers rather than accepted
 * from the client, and the numbers themselves are range-checked against what
 * the game can actually produce. This is a Christmas card, not a bank: a
 * determined person can still post a plausible lie by driving the endpoint
 * directly. The checks are here to keep the board readable, not to make it
 * unforgeable.
 */
export const recordScore = async (
  db: D1Database,
  submission: Submission,
): Promise<SubmissionResult> => {
  const difficulty = DIFFICULTIES.find(
    (entry) => entry.id === submission.difficultyId,
  );
  if (!difficulty) throw new Error("Unknown difficulty.");

  const target = targetFor(difficulty);
  const tick = Math.round(submission.tick);
  const delivered = Number(submission.delivered);

  if (!Number.isFinite(tick) || tick < 0 || tick > TOTAL_TICKS) {
    throw new Error("That run did not happen in a year.");
  }
  if (!Number.isFinite(delivered) || delivered < 0) {
    throw new Error("That is not a number of presents.");
  }
  // The year only stops early by being won, and a win is exactly the state
  // `delivered` measures: presents made, stored and airborne past the target.
  const won = submission.won === true;
  if (won && delivered < target) {
    throw new Error("A win means all three targets were met.");
  }
  if (!won && tick < TOTAL_TICKS) {
    throw new Error("That run has not finished.");
  }

  const name = cleanName(submission.name);
  const score = scoreOf(won, tick, delivered, target);

  const inserted = await db
    .prepare(
      `INSERT INTO scores (difficulty, name, score, won, tick, delivered)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       RETURNING id`,
    )
    .bind(difficulty.id, name, score, won ? 1 : 0, tick, delivered)
    .first<{ id: number }>();

  if (!inserted) throw new Error("The scoreboard would not take it.");
  const id = Number(inserted.id);

  const [rankResult, top, count] = await db.batch<
    Row & { rank: number; total: number }
  >([
    db.prepare(RANK_OF).bind(difficulty.id, score, id),
    db.prepare(SELECT_BOARD).bind(difficulty.id, BOARD_SIZE),
    db.prepare(COUNT_BOARD).bind(difficulty.id),
  ]);

  const rank = Number(rankResult.results?.[0]?.rank ?? 1);
  const entries = (top.results ?? []).map((row, index) =>
    toEntry(row, index + 1),
  );

  return {
    board: {
      difficultyId: difficulty.id,
      entries,
      total: Number(count.results?.[0]?.total ?? entries.length),
    },
    entry: { id, rank, name, won, tick, delivered },
    inBoard: rank <= BOARD_SIZE,
  };
};

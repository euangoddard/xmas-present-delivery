import { component$ } from "@builder.io/qwik";

import { formatGameDate } from "~/game/calendar";
import { humanize } from "~/game/formulas";
import {
  BOARD_SIZE,
  ordinal,
  yearCount,
  type Board,
  type ScoreEntry,
} from "~/game/score";

interface ScoreBoardProps {
  board: Board;
  /**
   * The visitor's own run. Shown highlighted where it already sits in the top
   * of the board, and appended below a break where it does not — the whole
   * point of the board is to tell you where you came, even if that is 214th.
   */
  mine?: ScoreEntry | null;
}

/** What the run achieved, in the terms the run was played in. */
const outcomeOf = (entry: ScoreEntry): string =>
  entry.won
    ? `Saved Christmas by ${formatGameDate(entry.tick)}`
    : `${humanize(entry.delivered)} presents aboard`;

const Row = component$<{ entry: ScoreEntry; isMine: boolean }>(
  ({ entry, isMine }) => (
    <li
      class={[
        "grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-3 px-4 py-2.5",
        isMine ? "bg-brass/10 border-brass border-l-2" : "bg-surface",
      ].join(" ")}
      aria-current={isMine ? "true" : undefined}
    >
      <span class="tnum text-ink-mute font-mono text-[0.6875rem]">
        {entry.rank}
      </span>
      <span class="font-display truncate text-sm font-semibold">
        {entry.name}
        {isMine && (
          <span class="text-brass ml-2 font-mono text-[0.625rem] tracking-[0.12em] uppercase">
            you
          </span>
        )}
      </span>
      <span
        class={[
          "tnum text-right font-mono text-[0.6875rem]",
          entry.won ? "text-spruce" : "text-ink-mute",
        ].join(" ")}
      >
        {outcomeOf(entry)}
      </span>
    </li>
  ),
);

/**
 * Winners first and earliest-finished among them, then the years that ran out,
 * deepest-loaded sleigh first. Both groups are on one board because both are
 * runs of the same game, and a near miss deserves to be counted.
 */
export const ScoreBoard = component$<ScoreBoardProps>(({ board, mine }) => {
  const shown = board.entries;
  const mineIsBelow = !!mine && mine.rank > shown.length;

  if (shown.length === 0) {
    return (
      <p class="border-rule bg-surface text-ink-mute border px-4 py-6 text-center font-mono text-[0.6875rem]">
        Nobody has finished this one yet. The first name here is yours.
      </p>
    );
  }

  return (
    <div class="border-rule border">
      <ol class="divide-rule divide-y">
        {shown.map((entry) => (
          <Row key={entry.id} entry={entry} isMine={mine?.id === entry.id} />
        ))}
      </ol>

      {mineIsBelow && (
        <>
          <p class="border-rule bg-sunken text-ink-mute border-t px-4 py-1.5 text-center font-mono text-[0.625rem] tracking-[0.2em]">
            ⋯
          </p>
          <ol class="border-rule border-t">
            <Row entry={mine} isMine />
          </ol>
        </>
      )}

      <p class="border-rule bg-sunken text-ink-mute border-t px-4 py-2 font-mono text-[0.6875rem] first-letter:uppercase">
        {yearCount(board.total)} on record
        {board.total > BOARD_SIZE && `, top ${BOARD_SIZE} shown`}
        {mine && ` · you came ${ordinal(mine.rank)}`}.
      </p>
    </div>
  );
});

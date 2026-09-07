import { component$ } from "@builder.io/qwik";
import {
  Link,
  routeLoader$,
  type DocumentHead,
  type RequestEventLoader,
} from "@builder.io/qwik-city";

import { ScoreBoard } from "~/components/game/score-board";
import {
  DIFFICULTIES,
  isDifficultyId,
  targetFor,
  type Difficulty,
} from "~/game/constants";
import { humanize } from "~/game/formulas";
import type { Board, ScoreEntry } from "~/game/score";

interface BoardView {
  difficultyId: Difficulty["id"];
  /** False when there is no database bound — the game still plays without one. */
  available: boolean;
  board: Board;
  mine: ScoreEntry | null;
}

/**
 * The board is read on the server for each request, so the URL is the whole
 * state: `/scoreboard/exacting/` is a link somebody can send, and `?me=<id>`
 * pins the sender's own row to it.
 */
export const useBoard = routeLoader$(
  async (event: RequestEventLoader): Promise<BoardView> => {
    const difficultyId = event.params.difficulty;
    if (!isDifficultyId(difficultyId)) {
      throw event.error(404, "There is no board by that name.");
    }

    const empty: Board = { difficultyId, entries: [], total: 0 };

    const { databaseFrom } = await import("~/server/platform");
    const db = databaseFrom(event);
    if (!db) {
      return { difficultyId, available: false, board: empty, mine: null };
    }

    const { fetchBoard, fetchEntry } = await import("~/server/scores");
    const requestedId = Number(event.url.searchParams.get("me"));
    const wanted = Number.isSafeInteger(requestedId) && requestedId > 0;

    try {
      const [board, mine] = await Promise.all([
        fetchBoard(db, difficultyId),
        wanted ? fetchEntry(db, difficultyId, requestedId) : null,
      ]);
      return { difficultyId, available: true, board, mine };
    } catch (error) {
      console.error("scoreboard read failed", error);
      return { difficultyId, available: false, board: empty, mine: null };
    }
  },
);

export default component$(() => {
  const view = useBoard();
  const difficulty =
    DIFFICULTIES.find((entry) => entry.id === view.value.difficultyId) ??
    DIFFICULTIES[0];

  return (
    <div class="mx-auto flex w-full max-w-3xl flex-col gap-7">
      <header>
        <span class="eyebrow">Every year on record</span>
        <h1 class="font-display mt-3 text-4xl leading-[1.05] font-bold text-balance sm:text-5xl">
          The scoreboard
        </h1>
        <p class="text-ink-soft mt-4 max-w-[60ch] text-[1rem] leading-relaxed">
          One board per nice list, because the targets are a third apart and the
          workshop runs slower on the longer ones — a year on Exacting is not
          the same year as a year on Kind.
        </p>
      </header>

      <nav class="border-rule bg-rule grid gap-px border sm:grid-cols-3">
        {DIFFICULTIES.map((entry) => {
          const current = entry.id === difficulty.id;
          return (
            <Link
              key={entry.id}
              href={`/scoreboard/${entry.id}/`}
              aria-current={current ? "page" : undefined}
              class={[
                "px-4 py-3 transition-colors",
                current ? "bg-sunken" : "bg-surface hover:bg-sunken/60",
              ].join(" ")}
            >
              <span class="flex items-baseline justify-between gap-3">
                <span
                  class={[
                    "font-display text-sm font-semibold",
                    current ? "text-brick" : "",
                  ].join(" ")}
                >
                  {entry.label}
                </span>
                <span class="tnum text-ink-mute font-mono text-[0.6875rem]">
                  {humanize(targetFor(entry))}
                </span>
              </span>
              <span class="text-ink-mute mt-0.5 block text-[0.8125rem] leading-snug">
                {entry.detail}
              </span>
            </Link>
          );
        })}
      </nav>

      {view.value.available ? (
        <ScoreBoard board={view.value.board} mine={view.value.mine} />
      ) : (
        <p class="border-brick text-ink-soft border-l-2 px-4 py-3 text-[0.875rem]">
          The scoreboard is not reachable at the moment. The year still runs
          without it — your own best times are kept in this browser either way.
        </p>
      )}

      <div class="flex flex-wrap items-center gap-3">
        <Link
          href={`/play/?d=${difficulty.id}`}
          class="border-brick bg-brick font-display hover:bg-brick-soft border-2 px-6 py-3 text-base font-bold tracking-wide text-[var(--surface)] transition-colors"
        >
          Play {difficulty.label}
        </Link>
        <Link
          href="/"
          class="border-rule-firm bg-surface font-display hover:bg-sunken border px-5 py-3 text-sm font-semibold transition-colors"
        >
          Back to the card
        </Link>
      </div>
    </div>
  );
});

export const head: DocumentHead = ({ params }) => {
  const difficulty = DIFFICULTIES.find(
    (entry) => entry.id === params.difficulty,
  );
  const label = difficulty?.label ?? "The";
  return {
    title: `${label} · Scoreboard · One year to save Christmas`,
    meta: [
      {
        name: "description",
        content: `Every year on record on the ${label} nice list — who saved Christmas, when, and how close the rest got.`,
      },
      { name: "theme-color", content: "#b22222" },
    ],
  };
};

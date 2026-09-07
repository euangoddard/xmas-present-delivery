import {
  $,
  component$,
  useSignal,
  useStore,
  useVisibleTask$,
} from "@builder.io/qwik";
import { Link, server$ } from "@builder.io/qwik-city";

import { DIFFICULTIES } from "~/game/constants";
import {
  BOARD_SIZE,
  MAX_NAME_LENGTH,
  cleanName,
  deliveredOf,
  ordinal,
  yearCount,
  type Submission,
  type SubmissionResult,
} from "~/game/score";
import { loadName, saveName } from "~/game/storage";
import type { GameState } from "~/game/types";
import { ScoreBoard } from "./score-board";

interface PostOutcome {
  ok: boolean;
  error?: string;
  result?: SubmissionResult;
}

/**
 * The write, and the read of where it landed, in one round trip.
 *
 * The score itself is not in the payload: the server derives it from the run's
 * own numbers, so the only thing a client can assert is what happened, not what
 * it was worth. Both modules are imported inside the call so nothing that talks
 * to D1 can end up in the browser bundle.
 */
const post = server$(async function (
  submission: Submission,
): Promise<PostOutcome> {
  const { databaseFrom } = await import("~/server/platform");
  const db = databaseFrom(this);
  if (!db) {
    return { ok: false, error: "The scoreboard is not reachable right now." };
  }
  try {
    const { recordScore } = await import("~/server/scores");
    return { ok: true, result: await recordScore(db, submission) };
  } catch (error) {
    console.error("scoreboard write failed", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "The scoreboard would not take it.",
    };
  }
});

/** Infinity is a legal game state and not a legal column value. */
const deliveredFor = (state: GameState): number => {
  const delivered = deliveredOf(state);
  return Number.isFinite(delivered)
    ? Math.floor(delivered)
    : Number.MAX_SAFE_INTEGER;
};

/**
 * Sign the year and see where it stands.
 *
 * The board is per nice list and holds every finished run, won or not, so the
 * answer is always a place rather than a yes or no — the point of asking is to
 * be told where you came, and 214th of 1,032 is a more interesting thing to
 * learn than that you missed the top ten.
 */
export const ScorePost = component$<{ state: GameState }>(({ state }) => {
  const name = useSignal("");
  const status = useSignal<"idle" | "sending" | "done" | "error">("idle");
  const problem = useSignal("");
  const posted = useStore<{ result: SubmissionResult | null }>({
    result: null,
  });

  const difficulty =
    DIFFICULTIES.find((entry) => entry.id === state.difficultyId) ??
    DIFFICULTIES[0];

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    name.value = loadName();
  });

  const send = $(async () => {
    if (status.value === "sending" || status.value === "done") return;
    const signature = cleanName(name.value);
    status.value = "sending";
    problem.value = "";

    const reply = await post({
      difficultyId: state.difficultyId,
      name: signature,
      won: state.outcome === "won",
      tick: state.tick,
      delivered: deliveredFor(state),
    });

    if (reply.ok && reply.result) {
      saveName(signature);
      posted.result = reply.result;
      status.value = "done";
    } else {
      problem.value = reply.error ?? "The scoreboard would not take it.";
      status.value = "error";
    }
  });

  if (status.value === "done" && posted.result) {
    const { entry, board, inBoard } = posted.result;
    return (
      <section class="flex flex-col gap-3">
        <p
          class={[
            "border-l-2 px-4 py-3 text-[0.875rem]",
            inBoard ? "border-brass bg-brass/10" : "border-rule-firm",
          ].join(" ")}
        >
          {inBoard ? (
            <>
              <strong class="font-semibold">
                {ordinal(entry.rank)} on the {difficulty.label} board.
              </strong>{" "}
              Out of {yearCount(board.total)} on record.
            </>
          ) : (
            <>
              <strong class="font-semibold">
                You came {ordinal(entry.rank)} of{" "}
                {board.total.toLocaleString("en-GB")}
              </strong>{" "}
              on the {difficulty.label} board — outside the top {BOARD_SIZE},
              but on it. Here is what you are chasing.
            </>
          )}
        </p>

        <ScoreBoard board={board} mine={entry} />

        <Link
          href={`/scoreboard/${difficulty.id}/?me=${entry.id}`}
          class="text-ink-soft hover:text-ink font-mono text-[0.6875rem] underline underline-offset-4 transition-colors"
        >
          Open the {difficulty.label} board on its own page →
        </Link>
      </section>
    );
  }

  return (
    <section class="border-rule bg-surface border px-5 py-4">
      <form
        preventdefault:submit
        onSubmit$={send}
        class="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <label class="flex min-w-0 flex-1 flex-col gap-1.5">
          <span class="eyebrow">Put your name to the year</span>
          <input
            type="text"
            name="name"
            value={name.value}
            onInput$={(_, element) => (name.value = element.value)}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="nickname"
            placeholder="Anonymous elf"
            disabled={status.value === "sending"}
            class="border-rule-firm bg-paper text-ink w-full border px-3 py-2.5 font-mono text-sm disabled:opacity-60"
          />
        </label>
        <button
          type="submit"
          disabled={status.value === "sending"}
          class="border-rule-control bg-surface font-display hover:bg-sunken shrink-0 border px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {status.value === "sending" ? "Posting…" : "See where I came"}
        </button>
      </form>

      {status.value === "error" ? (
        <p class="text-brick mt-2.5 font-mono text-[0.6875rem]">
          {problem.value} Nothing was lost — try again.
        </p>
      ) : (
        <p class="text-ink-mute mt-2.5 font-mono text-[0.6875rem]">
          One board per nice list. Every finished year goes on it, won or not.
        </p>
      )}
    </section>
  );
});

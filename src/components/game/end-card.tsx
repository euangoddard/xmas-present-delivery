import { $, component$, useSignal, type QRL } from "@builder.io/qwik";
import { MONTH_TICKS, formatGameDate, progressAtTick } from "~/game/calendar";
import { DIFFICULTIES, TOTAL_TICKS } from "~/game/constants";
import { humanize } from "~/game/formulas";
import type { Best } from "~/game/types";
import type { GameState } from "~/game/types";

interface EndCardProps {
  state: GameState;
  previousBest: Best | null;
  isNewBest: boolean;
  onAgain$: QRL<() => void>;
}

const objective = (
  label: string,
  value: number,
  target: number,
  tone: string,
) => ({
  label,
  value,
  target,
  tone,
  met: value >= target,
});

/**
 * A card, not a scoreboard. A time-out is not a failure screen: it reports what
 * actually flew and says what to do differently, because a specific number and
 * a specific piece of advice bring a player back and a red cross does not.
 */
export const EndCard = component$<EndCardProps>((props) => {
  const { state, previousBest, isNewBest } = props;
  const copied = useSignal(false);
  const won = state.outcome === "won";
  const difficulty =
    DIFFICULTIES.find((entry) => entry.id === state.difficultyId) ??
    DIFFICULTIES[0];

  const objectives = [
    objective("Presents made", state.presents, state.target, "text-brick"),
    objective("Sleigh capacity", state.capacity, state.target, "text-spruce"),
    objective("Reindeer power", state.power, state.target, "text-brass"),
  ];

  const delivered = Math.min(state.presents, state.capacity, state.power);
  const reach = state.target > 0 ? delivered / state.target : 0;
  const oneIn = reach > 0 ? Math.max(1, Math.round(1 / reach)) : 0;

  // Name the binding constraint, not the first unmet row. Presents can never
  // exceed capacity, so a short sleigh is the cause and a short score is the
  // symptom — advising more duplicators there would send the player back to
  // repeat the same mistake.
  const advice = won
    ? "Try it again on a longer nice list."
    : state.capacity < state.target
      ? "Next year, build the sleigh before the presents — you cannot keep what you have nowhere to put."
      : state.power < state.target
        ? "Next year, get the herd in early. Reindeer take all year to train."
        : "Next year, get the duplicator running sooner.";

  const summary = won
    ? `I saved Christmas by ${formatGameDate(state.tick)} on ${difficulty.label} — ${humanize(state.presents)} presents, all aboard.`
    : `The sleigh left on Christmas Eve with ${humanize(delivered)} presents — enough for one child in ${oneIn}. ${advice}`;

  const share = $(async () => {
    try {
      await navigator.clipboard.writeText(summary);
      copied.value = true;
      setTimeout(() => (copied.value = false), 2400);
    } catch {
      copied.value = false;
    }
  });

  return (
    <div class="mx-auto flex w-full max-w-3xl flex-col gap-7">
      <header>
        <span class="eyebrow">
          {won ? "Christmas is saved" : "Christmas Day, 2026"}
        </span>
        <h1 class="font-display mt-3 text-4xl leading-[1.05] font-bold text-balance sm:text-5xl">
          {won ? "The sleigh is loaded" : "The sleigh left at midnight"}
        </h1>
        <p class="text-ink-soft mt-4 max-w-[60ch] text-[1rem] leading-relaxed">
          {won ? (
            <>
              Every one of the{" "}
              <strong class="text-ink">{humanize(state.target)}</strong>{" "}
              children on the nice list will wake up to something, and it was
              done by{" "}
              <strong class="text-ink">{formatGameDate(state.tick)}</strong> —
              with {Math.floor((TOTAL_TICKS - state.tick) / 2)} days of the year
              still to run.
            </>
          ) : (
            <>
              It went out with{" "}
              <strong class="text-ink">{humanize(delivered)}</strong> presents
              aboard — enough for one child in {oneIn}. {advice}
            </>
          )}
        </p>
      </header>

      {/* the completed year, with every milestone still pinned where it happened */}
      <figure class="border-rule bg-surface border px-5 py-4">
        <figcaption class="eyebrow mb-3">The year</figcaption>
        <div class="relative h-10">
          <div class="bg-rule-firm absolute inset-x-0 top-5 h-px" />
          <div
            class="bg-brick absolute top-5 h-px"
            style={{ width: `${progressAtTick(state.tick) * 100}%` }}
          />
          {MONTH_TICKS.map((mark) => (
            <div
              key={mark.tick}
              class="bg-rule-firm absolute top-5 h-1.5 w-px"
              style={{ left: `${progressAtTick(mark.tick) * 100}%` }}
            />
          ))}
          {state.resolvedEvents.map((resolved) => (
            <div
              key={resolved.eventId}
              class="border-brass bg-paper absolute top-[15px] size-2 rounded-full border"
              style={{
                left: `${progressAtTick(resolved.tick) * 100}%`,
                transform: "translateX(-50%)",
              }}
            />
          ))}
          {previousBest && (
            <div
              class="border-ink-mute absolute top-1 bottom-1 w-px border-l border-dashed"
              style={{ left: `${progressAtTick(previousBest.tick) * 100}%` }}
            >
              <span class="text-ink-mute absolute -top-1 left-1 font-mono text-[0.6875rem] whitespace-nowrap">
                previous best
              </span>
            </div>
          )}
          <div
            class="bg-brick absolute top-2 bottom-2 w-0.5"
            style={{ left: `${progressAtTick(state.tick) * 100}%` }}
          />
        </div>
      </figure>

      <dl class="border-rule bg-rule grid gap-px border sm:grid-cols-3">
        {objectives.map((entry) => (
          <div key={entry.label} class="bg-surface px-4 py-3.5">
            <dt class="eyebrow">{entry.label}</dt>
            <dd
              class={`tnum font-display mt-1 text-lg font-semibold ${entry.tone}`}
            >
              {humanize(entry.value)}
            </dd>
            <dd class="text-ink-mute mt-1 font-mono text-[0.6875rem]">
              {entry.met
                ? "✓ target met"
                : `✗ short of ${humanize(entry.target)}`}
            </dd>
          </div>
        ))}
      </dl>

      <dl class="border-rule bg-rule grid gap-px border sm:grid-cols-3">
        <div class="bg-surface px-4 py-3">
          <dt class="eyebrow">Presents left behind</dt>
          <dd class="tnum mt-1 font-mono text-sm">{humanize(state.lost)}</dd>
        </div>
        <div class="bg-surface px-4 py-3">
          <dt class="eyebrow">Made in all</dt>
          <dd class="tnum mt-1 font-mono text-sm">
            {humanize(state.totalProduced)}
          </dd>
        </div>
        <div class="bg-surface px-4 py-3">
          <dt class="eyebrow">Clicks</dt>
          <dd class="tnum mt-1 font-mono text-sm">
            {state.clicks.toLocaleString("en-GB")}
          </dd>
        </div>
      </dl>

      {won && (
        <p
          class={[
            "border-l-2 px-4 py-3 text-[0.875rem]",
            isNewBest ? "border-brass bg-brass/10" : "border-rule-firm",
          ].join(" ")}
        >
          {isNewBest ? (
            <>
              <strong class="font-semibold">
                That is your best on {difficulty.label}.
              </strong>{" "}
              {previousBest
                ? `You beat ${formatGameDate(previousBest.tick)}.`
                : "Nothing to beat but it, now."}
            </>
          ) : previousBest ? (
            <>
              Your best on {difficulty.label} is still{" "}
              <strong class="font-semibold">
                {formatGameDate(previousBest.tick)}
              </strong>
              .
            </>
          ) : null}
        </p>
      )}

      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick$={props.onAgain$}
          class="border-brick bg-brick font-display hover:bg-brick-soft border-2 px-6 py-3 text-base font-bold tracking-wide text-[var(--surface)] transition-colors"
        >
          Again
        </button>
        <button
          type="button"
          onClick$={share}
          class="border-rule-firm bg-surface font-display hover:bg-sunken border px-5 py-3 text-sm font-semibold transition-colors"
        >
          {copied.value ? "Copied" : "Copy the card"}
        </button>
        <span class="text-ink-mute font-mono text-[0.6875rem]">
          {copied.value ? "Paste it to whoever sent you here." : "Send it on."}
        </span>
      </div>
    </div>
  );
});

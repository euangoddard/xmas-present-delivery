import { component$, useSignal, type QRL } from "@builder.io/qwik";
import {
  DIFFICULTIES,
  TOTAL_TICKS,
  targetFor,
  type Difficulty,
} from "~/game/constants";
import { formatGameDate } from "~/game/calendar";
import { humanize } from "~/game/formulas";
import type { Bests } from "~/game/storage";

interface SetupScreenProps {
  bests: Bests;
  hasSavedRun: boolean;
  onStart$: QRL<(difficultyId: Difficulty["id"]) => void>;
  onResume$: QRL<() => void>;
}

export const SetupScreen = component$<SetupScreenProps>((props) => {
  const chosen = useSignal<Difficulty["id"]>("kind");
  const difficulty =
    DIFFICULTIES.find((entry) => entry.id === chosen.value) ?? DIFFICULTIES[0];

  return (
    <div class="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <header>
        <span class="eyebrow">A Christmas card · 2026</span>
        <h1 class="font-display mt-3 text-4xl leading-[1.05] font-bold text-balance sm:text-6xl">
          One year to
          <br />
          save Christmas
        </h1>
      </header>

      <div class="grid gap-8 md:grid-cols-2">
        <section class="text-ink-soft space-y-4 text-[0.9375rem] leading-relaxed">
          <p>
            Father Christmas came home from Christmas 2025 to an empty workshop.
            The elves had walked out, the reindeer were gone and somebody had
            taken the sleigh.
          </p>
          <p>
            You have from Boxing Day to Christmas Day to put it right. The clock
            runs at one second to the half-day and it does not stop, so the
            whole year takes{" "}
            <strong class="text-ink font-semibold">twelve minutes</strong>.
          </p>
          <ol class="border-rule text-ink mt-2 space-y-2.5 border-l-2 pl-4 font-mono text-[0.75rem]">
            <li>
              <strong class="text-brick">Make the presents.</strong> Every one
              you make also pays for what you buy.
            </li>
            <li>
              <strong class="text-spruce">
                Keep the sleigh ahead of them.
              </strong>{" "}
              Presents you have nowhere to put are left behind for good.
            </li>
            <li>
              <strong class="text-brass">Find the reindeer.</strong> A loaded
              sleigh still has to get off the ground.
            </li>
          </ol>
        </section>

        <section class="flex flex-col gap-4">
          <fieldset class="m-0 border-0 p-0">
            <legend class="eyebrow mb-2 block">
              How long is the nice list?
            </legend>
            <div class="border-rule bg-surface border">
              <div class="divide-rule divide-y">
                {DIFFICULTIES.map((entry) => (
                  <label
                    key={entry.id}
                    class={[
                      "flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors",
                      chosen.value === entry.id
                        ? "bg-sunken"
                        : "hover:bg-sunken/60",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="difficulty"
                      value={entry.id}
                      checked={chosen.value === entry.id}
                      onChange$={() => (chosen.value = entry.id)}
                      class="mt-1 accent-[var(--brick)]"
                    />
                    <span class="min-w-0 flex-1">
                      <span class="flex items-baseline justify-between gap-3">
                        <span class="font-display text-sm font-semibold">
                          {entry.label}
                        </span>
                        <span class="tnum text-ink-mute font-mono text-[0.6875rem]">
                          {humanize(targetFor(entry))}
                        </span>
                      </span>
                      <span class="text-ink-mute mt-0.5 block text-[0.8125rem] leading-snug">
                        {entry.detail}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </fieldset>

          <p class="text-ink-mute font-mono text-[0.6875rem] leading-relaxed">
            You need {humanize(targetFor(difficulty))} presents made, stored and
            airborne. A fussier Father Christmas rejects more work, so the
            workshop runs at {Math.round(difficulty.outputModifier * 100)}% as
            well.
          </p>

          {props.bests[difficulty.id] && (
            <p class="border-brass text-ink-soft border-l-2 pl-3 font-mono text-[0.6875rem]">
              Your best on {difficulty.label}:{" "}
              <span class="text-ink">
                {formatGameDate(props.bests[difficulty.id]!.tick)}
              </span>
            </p>
          )}

          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              onClick$={() => props.onStart$(chosen.value)}
              class="border-brick bg-brick font-display hover:bg-brick-soft grow border-2 px-6 py-3 text-base font-bold tracking-wide text-[var(--surface)] transition-colors"
            >
              Start on Boxing Day
            </button>
            {props.hasSavedRun && (
              <button
                type="button"
                onClick$={props.onResume$}
                class="border-rule-firm bg-surface font-display hover:bg-sunken border px-5 py-3 text-sm font-semibold transition-colors"
              >
                Resume your run
              </button>
            )}
          </div>
          <p class="text-ink-mute font-mono text-[0.6875rem]">
            {TOTAL_TICKS} seconds · 364 days · clicking is optional
          </p>
        </section>
      </div>
    </div>
  );
});

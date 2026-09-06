import { component$ } from "@builder.io/qwik";
import { formatGameDate, isMorning } from "~/game/calendar";
import { humanize, percent } from "~/game/formulas";
import { ratesOf } from "~/game/engine";
import type { GameState } from "~/game/types";

interface StatusBarProps {
  state: GameState;
}

/** The date, the target, and whatever is currently acting on the workshop. */
export const StatusBar = component$<StatusBarProps>(({ state }) => {
  const rates = ratesOf(state);

  return (
    <header class="border-rule bg-sunken flex flex-wrap items-center gap-x-6 gap-y-2 border px-4 py-2.5">
      <div class="flex items-baseline gap-2">
        <span
          key={state.tick}
          class="tick-pulse bg-brick inline-block h-3 w-0.5 origin-center"
          aria-hidden="true"
        />
        <span class="tnum font-display text-sm font-semibold">
          {formatGameDate(state.tick)}
        </span>
        <span class="text-ink-mute font-mono text-[0.6875rem] tracking-[0.12em] uppercase">
          {isMorning(state.tick) ? "am" : "pm"}
        </span>
      </div>

      <div class="flex items-baseline gap-2">
        <span class="eyebrow">Nice list</span>
        <span class="tnum font-mono text-[0.6875rem]">
          {humanize(state.target)} children
        </span>
      </div>

      <div class="flex items-baseline gap-2">
        <span class="eyebrow">Sleigh</span>
        <span class="tnum font-mono text-[0.6875rem]">
          {percent(rates.fillFraction)} full
        </span>
      </div>

      {state.modifiers.length > 0 && (
        <ul class="flex flex-wrap items-center gap-2">
          {state.modifiers.map((modifier) => (
            <li
              key={modifier.key + modifier.label}
              class={[
                "border px-2 py-0.5 font-mono text-[0.6875rem] tracking-[0.1em] uppercase",
                modifier.multiplier >= 1
                  ? "border-spruce text-spruce"
                  : "border-brick text-brick",
              ].join(" ")}
            >
              {modifier.label}
            </li>
          ))}
        </ul>
      )}

      {/* Milestones are announced; the per-second totals are not, or a screen
          reader would be reading numbers aloud for twelve minutes. */}
      <p class="sr-only" aria-live="polite">
        {Object.keys(state.milestones).length > 0
          ? `${Object.keys(state.milestones).join(", ")} target met`
          : ""}
      </p>
    </header>
  );
});

import { component$ } from "@builder.io/qwik";
import { formatGameDateShort, isMorning } from "~/game/calendar";
import type { GameState } from "~/game/types";
import type { Resource } from "~/game/types";

interface MiniProgressBarProps {
  state: GameState;
  /** Whether the full tracker has scrolled out of view. */
  pinned: boolean;
}

const TRACKS: { key: Resource; label: string; bar: string }[] = [
  { key: "presents", label: "Presents", bar: "bg-brick" },
  { key: "capacity", label: "Sleigh", bar: "bg-spruce" },
  { key: "power", label: "Reindeer", bar: "bg-brass" },
];

/**
 * A condensed echo of the status bar and resource tracks, fixed to the top of
 * the viewport once the full versions have scrolled out of view — so the run
 * stays legible while the buy buttons further down are in reach. It never
 * carries the aria-live milestone announcement; the full tracker underneath is
 * still in the document and remains the one source screen readers hear from.
 */
export const MiniProgressBar = component$<MiniProgressBarProps>(
  ({ state, pinned }) => {
    return (
      <div
        aria-hidden="true"
        class={[
          "border-rule bg-surface/95 fixed inset-x-0 top-0 z-40 border-b shadow-[var(--shadow-soft)] backdrop-blur-sm transition-transform duration-300 ease-out",
          pinned ? "translate-y-0" : "-translate-y-full",
        ].join(" ")}
      >
        <div class="tnum mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-5 gap-y-1 px-4 py-1.5 sm:px-7">
          <span class="font-display shrink-0 text-xs font-semibold whitespace-nowrap">
            {formatGameDateShort(state.tick)}
            <span class="text-ink-mute ml-1 font-mono text-[0.625rem] uppercase">
              {isMorning(state.tick) ? "am" : "pm"}
            </span>
          </span>

          {TRACKS.map(({ key, label, bar }) => {
            const value = state[key];
            const target = state.target;
            const met = value >= target;
            const decadeCount = Math.max(
              1,
              Math.ceil(Math.log10(Math.max(10, target))),
            );
            const fraction =
              value <= 0
                ? 0
                : Math.min(1, Math.log10(Math.max(1, value)) / decadeCount);

            return (
              <div
                key={key}
                class="flex min-w-[4.5rem] flex-1 items-center gap-1.5"
              >
                <span class="text-ink-mute shrink-0 font-mono text-[0.625rem] tracking-[0.08em] uppercase">
                  {label}
                </span>
                <div class="bg-sunken relative h-1.5 min-w-[2.5rem] flex-1">
                  <div
                    class={`h-full ${bar} transition-[width] duration-500`}
                    style={{ width: `${fraction * 100}%` }}
                  />
                </div>
                {met && (
                  <span class="text-spruce shrink-0 text-[0.625rem]">✓</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

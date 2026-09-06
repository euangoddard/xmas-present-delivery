import { component$ } from "@builder.io/qwik";
import { compact, humanize } from "~/game/formulas";
import { ratesOf } from "~/game/engine";
import type { GameState } from "~/game/types";

export type TrackKind = "presents" | "capacity" | "power";

interface ResourceTrackProps {
  state: GameState;
  kind: TrackKind;
}

const CONFIG: Record<
  TrackKind,
  { label: string; role: string; bar: string; text: string; ring: string }
> = {
  presents: {
    label: "Presents",
    role: "the score",
    bar: "bg-brick",
    text: "text-brick",
    ring: "border-brick",
  },
  capacity: {
    label: "Sleigh capacity",
    role: "the ceiling on the score",
    bar: "bg-spruce",
    text: "text-spruce",
    ring: "border-spruce",
  },
  power: {
    label: "Reindeer power",
    role: "what can leave the ground",
    bar: "bg-brass",
    text: "text-brass",
    ring: "border-brass",
  },
};

/**
 * One objective, read against the target rather than shown as a bare total.
 *
 * Everything is derived from the store inside this component. Values computed
 * in a parent's body would be captured once and never update — only reads that
 * happen during a render are reactive.
 */
export const ResourceTrack = component$<ResourceTrackProps>(
  ({ state, kind }) => {
    const config = CONFIG[kind];
    const rates = ratesOf(state);
    const value = state[kind];
    const target = state.target;
    const perDay =
      kind === "presents"
        ? rates.presentsPerDay
        : kind === "capacity"
          ? rates.capacityPerDay
          : rates.powerPerDay;

    const met = value >= target;
    const decadeCount = Math.max(
      1,
      Math.ceil(Math.log10(Math.max(10, target))),
    );
    const decades = Array.from(
      { length: decadeCount },
      (_, index) => index + 1,
    ).slice(0, -1);
    const logFraction =
      value <= 0
        ? 0
        : Math.min(1, Math.log10(Math.max(1, value)) / decadeCount);

    return (
      <div class="border-rule border-b py-3 last:border-b-0">
        <div class="flex items-baseline justify-between gap-3">
          <div class="min-w-0">
            <span class="font-display text-sm font-semibold">
              {config.label}
            </span>
            <span class="text-ink-mute ml-2 font-mono text-[0.6875rem] tracking-wide">
              {config.role}
            </span>
          </div>
          <div class="flex items-baseline gap-2 whitespace-nowrap">
            <span
              class={`tnum font-display text-base font-semibold ${met ? config.text : ""}`}
            >
              {humanize(value)}
            </span>
            {met && (
              <span
                class={`inline-flex items-center gap-1 border ${config.ring} ${config.text} px-1.5 py-px font-mono text-[0.6875rem] tracking-[0.1em] uppercase`}
              >
                ✓ met
              </span>
            )}
          </div>
        </div>

        {/* Logarithmic, because an exponential run would otherwise spend its whole
          length in the first pixel. The decade marks say so, so the bar is not
          misread as a percentage of the target. */}
        <div class="bg-sunken relative mt-2 h-2 w-full">
          {decades.map((decade) => (
            <span
              key={decade}
              aria-hidden="true"
              class="bg-paper/70 absolute top-0 bottom-0 w-px"
              style={{ left: `${(decade / decadeCount) * 100}%` }}
            />
          ))}
          <div
            class={`h-full ${config.bar} transition-[width] duration-500`}
            style={{ width: `${logFraction * 100}%` }}
          />
        </div>

        <div class="text-ink-mute mt-1.5 flex items-baseline justify-between gap-3 font-mono text-[0.6875rem]">
          <span class="tnum">
            {perDay > 0
              ? `+${compact(perDay)}/day`
              : kind === "presents" && rates.lostPerDay > 0
                ? "held at the ceiling"
                : "no growth"}
            {kind === "presents" && (
              /* The near-full warning is worded as well as coloured — turning
                 the same sentence red is a signal nobody with a colour vision
                 deficiency receives. */
              <span
                class={rates.fillFraction > 0.85 ? "text-brick ml-2" : "ml-2"}
              >
                sleigh {Math.round(Math.min(1, rates.fillFraction) * 100)}% full
                {rates.fillFraction > 0.85 && " — nearly out of room"}
              </span>
            )}
          </span>
          <span class="tnum">×10 per mark · needs {humanize(target)}</span>
        </div>

        {kind === "presents" && rates.lostPerDay > 0 && (
          <p class="text-brick mt-1 font-mono text-[0.6875rem]">
            Full sleigh — {compact(rates.lostPerDay)} a day are being left
            behind.
          </p>
        )}
      </div>
    );
  },
);

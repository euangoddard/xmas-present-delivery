import { component$ } from "@builder.io/qwik";
import {
  MONTH_TICKS,
  formatGameDateShort,
  progressAtTick,
} from "~/game/calendar";
import { TOTAL_TICKS } from "~/game/constants";
import { projectFinishTick } from "~/game/engine";
import type { GameState } from "~/game/types";

interface YearRailProps {
  state: GameState;
  /** Finishing tick of the player's best run, drawn as a ghost to race. */
  bestTick: number | null;
}

const MILESTONE_STYLE: Record<string, { colour: string; label: string }> = {
  presents: { colour: "var(--brick)", label: "Presents" },
  capacity: { colour: "var(--spruce)", label: "Sleigh" },
  power: { colour: "var(--brass)", label: "Reindeer" },
};

/**
 * The spine of the interface.
 *
 * The game's most distinctive property is a fixed, visible, unstoppable year,
 * and the original never showed it. Everything that happens in time pins to
 * this one scale: the playhead, the month engraving, resolved events, the
 * moment each objective was met, the projected finish and the ghost of the
 * player's best run.
 */
export const YearRail = component$<YearRailProps>(({ state, bestTick }) => {
  const projectedTick = projectFinishTick(state);
  const pct = (tick: number) => `${progressAtTick(tick) * 100}%`;

  return (
    <div class="relative select-none">
      <div class="mb-2 flex items-baseline justify-between gap-4">
        <span class="eyebrow">Boxing Day 2025 → Christmas Day 2026</span>
        <span class="eyebrow tnum">
          {TOTAL_TICKS - state.tick} seconds left
        </span>
      </div>

      <div class="relative h-14">
        {/* the scale */}
        <div class="bg-rule-firm absolute inset-x-0 top-8 h-px" />
        {MONTH_TICKS.map((mark, index) => (
          <div
            key={mark.tick}
            class="absolute top-8 flex flex-col items-center"
            style={{ left: pct(mark.tick), transform: "translateX(-50%)" }}
          >
            <div class="bg-rule-firm h-2 w-px" />
            {/* Twelve labels will not fit across a phone, so alternate months
                drop away and the ticks alone carry the scale. */}
            <span
              class={[
                "text-ink-mute mt-1 font-mono text-[0.6875rem] tracking-[0.14em]",
                index % 2 === 1 ? "hidden sm:inline" : "",
              ].join(" ")}
            >
              {mark.label}
            </span>
          </div>
        ))}

        {/* the ghost of the best run */}
        {bestTick !== null && bestTick < TOTAL_TICKS && (
          <div
            class="border-ink-mute absolute top-1 bottom-3 w-px border-l border-dashed"
            style={{ left: pct(bestTick) }}
            title={`Your best: ${formatGameDateShort(bestTick)}`}
          >
            <span class="text-ink-mute absolute -top-0.5 left-1 font-mono text-[0.6875rem] whitespace-nowrap">
              best
            </span>
          </div>
        )}

        {/* where the run is heading if nothing changes */}
        {projectedTick !== null && projectedTick < TOTAL_TICKS && (
          <div
            class="bg-spruce/50 absolute top-6 bottom-4 w-px"
            style={{ left: pct(projectedTick) }}
            title={`On track for ${formatGameDateShort(projectedTick)}`}
          >
            <span class="text-spruce absolute -top-4 left-1 font-mono text-[0.6875rem] whitespace-nowrap">
              on track
            </span>
          </div>
        )}

        {/* events already answered */}
        {state.resolvedEvents.map((resolved) => (
          <div
            key={resolved.eventId}
            class="border-brass bg-paper absolute top-[26px] size-2 rounded-full border"
            style={{ left: pct(resolved.tick), transform: "translateX(-50%)" }}
            title={formatGameDateShort(resolved.tick)}
          />
        ))}

        {/* objectives met, pinned where they happened */}
        {Object.entries(state.milestones).map(([key, tick]) =>
          tick === undefined ? null : (
            <div
              key={key}
              class="absolute top-[30px] size-2.5 rotate-45"
              style={{
                left: pct(tick),
                transform: "translateX(-50%) rotate(45deg)",
                background: MILESTONE_STYLE[key]?.colour,
              }}
              title={`${MILESTONE_STYLE[key]?.label} target met — ${formatGameDateShort(tick)}`}
            />
          ),
        )}

        {/* now */}
        <div
          class="bg-brick pointer-events-none absolute top-0 bottom-2 w-0.5"
          style={{ left: pct(state.tick) }}
        >
          <div class="bg-brick absolute -top-0.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full" />
        </div>

        {/* elapsed */}
        <div
          class="bg-brick/35 absolute top-8 h-px"
          style={{ left: 0, width: pct(state.tick) }}
        />
      </div>
    </div>
  );
});

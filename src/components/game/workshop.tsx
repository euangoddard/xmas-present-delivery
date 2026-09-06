import { $, component$, useSignal, useStore } from "@builder.io/qwik";
import { formatGameDate } from "~/game/calendar";
import {
  clickPower,
  click as doClick,
  projectFinishTick,
  ratesOf,
} from "~/game/engine";
import { compact, humanize } from "~/game/formulas";
import { describeHerd } from "~/game/reindeer";
import type { GameState } from "~/game/types";

interface WorkshopProps {
  state: GameState;
}

interface Spark {
  id: number;
  x: number;
  rotation: number;
}

/**
 * The left-hand panel: the one control the player operates directly, and the
 * numbers that tell them whether it is worth operating.
 */
export const Workshop = component$<WorkshopProps>(({ state }) => {
  const sparks = useStore<{ items: Spark[] }>({ items: [] });
  const nextId = useSignal(0);
  const rates = ratesOf(state);
  const perClick = clickPower(state);
  const projectedTick = projectFinishTick(state);

  const make = $(() => {
    doClick(state);
    nextId.value += 1;
    const spark: Spark = {
      id: nextId.value,
      x: Math.round((Math.random() - 0.5) * 90),
      rotation: Math.round((Math.random() - 0.5) * 70),
    };
    sparks.items = [...sparks.items.slice(-8), spark];
    // clear it once the arc has played; the animation is interruptible so a
    // rapid clicker gets a stream rather than a queue
    setTimeout(() => {
      sparks.items = sparks.items.filter((item) => item.id !== spark.id);
    }, 640);
  });

  return (
    <section
      class="border-rule bg-surface flex flex-col gap-4 border p-5"
      aria-label="Workshop"
    >
      <div class="flex items-baseline justify-between">
        <h2 class="font-display text-lg font-bold">Workshop</h2>
        <span class="eyebrow">{state.quantities.elf} elves</span>
      </div>

      <div class="relative flex items-center gap-5">
        <div class="relative">
          {sparks.items.map((spark) => (
            <span
              key={spark.id}
              aria-hidden="true"
              class="present-arc pointer-events-none absolute top-2 left-1/2 z-10 text-2xl"
              style={{
                "--arc-x": `${spark.x}px`,
                "--arc-r": `${spark.rotation}deg`,
              }}
            >
              🎁
            </span>
          ))}
          <button
            type="button"
            onClick$={make}
            class="group border-brick bg-brick/5 font-display text-brick hover:bg-brick/12 relative size-28 shrink-0 rounded-full border-4 text-sm font-bold tracking-wide transition-transform duration-100 active:scale-95"
          >
            <span class="block text-base">MAKE</span>
            <span class="tnum text-ink-soft mt-0.5 block font-mono text-[0.6875rem] font-normal">
              +{compact(perClick)}
            </span>
          </button>
        </div>

        <dl class="min-w-0 flex-1 space-y-1.5 font-mono text-[0.6875rem]">
          <div class="flex justify-between gap-3">
            <dt class="text-ink-mute">Per click</dt>
            <dd class="tnum">{compact(perClick)}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-ink-mute">Made per day</dt>
            <dd class="tnum">
              {compact(rates.presentsPerDay + rates.lostPerDay)}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-ink-mute">Materials</dt>
            <dd class="tnum font-semibold">{humanize(state.materials)}</dd>
          </div>
          {rates.lostPerDay > 0 && (
            <div class="text-brick flex justify-between gap-3">
              <dt>Left behind</dt>
              <dd class="tnum">{compact(rates.lostPerDay)}/day</dd>
            </div>
          )}
        </dl>
      </div>

      {rates.lostPerDay > 0 && (
        <p class="border-brick bg-brick/5 text-ink-soft border-l-2 px-3 py-2 text-[0.8125rem]">
          The sleigh is full. {compact(rates.lostPerDay)} presents a day are
          being left behind — buy sleigh capacity or you are making them for
          nothing.
        </p>
      )}

      <div class="border-rule border-t pt-3">
        <span class="eyebrow">Projected finish</span>
        <p class="tnum font-display mt-1 text-lg font-semibold">
          {projectedTick === null
            ? "Not at this rate"
            : formatGameDate(projectedTick)}
        </p>
        <p class="text-ink-mute mt-1 font-mono text-[0.6875rem]">
          {projectedTick === null
            ? "Nothing you own will reach the target before Christmas."
            : "If you change nothing from here."}
        </p>
      </div>

      <div class="border-rule border-t pt-3">
        <span class="eyebrow">The herd</span>
        <p class="text-ink-soft mt-1 text-[0.8125rem]">
          {describeHerd(state.quantities.reindeer)}
        </p>
      </div>
    </section>
  );
});

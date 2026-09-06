import {
  $,
  component$,
  useSignal,
  useStore,
  useVisibleTask$,
} from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

import { Catalogue } from "~/components/game/catalogue";
import { EndCard } from "~/components/game/end-card";
import { EventDialog } from "~/components/game/event-dialog";
import { SetupScreen } from "~/components/game/setup-screen";
import { Snowfield } from "~/components/game/snowfield";
import { StatusBar } from "~/components/game/status-bar";
import { ThemeToggle } from "~/components/game/theme-toggle";
import { Workshop } from "~/components/game/workshop";
import { YearRail } from "~/components/game/year-rail";
import { ResourceTrack } from "~/components/game/resource-track";

import { TICK_MS, TOTAL_TICKS, type Difficulty } from "~/game/constants";
import {
  createInitialState,
  resetInto,
  restoreInto,
  step,
} from "~/game/engine";
import {
  clearRun,
  loadBests,
  loadRun,
  recordBest,
  saveRun,
  type Bests,
} from "~/game/storage";
import type { Best, GameState } from "~/game/types";

/**
 * The component's root is a fragment, so there is no host element for the
 * default intersection-observer strategy to watch and the tasks would never
 * fire. The whole page is the game — it should start as soon as the document
 * is ready, not when something scrolls into view.
 */
const EAGER = { strategy: "document-ready" } as const;

export default component$(() => {
  const state = useStore<GameState>(createInitialState("kind"), { deep: true });
  const bests = useStore<{ value: Bests }>({ value: {} });
  const savedRun = useSignal(false);
  const previousBest = useSignal<Best | null>(null);
  const isNewBest = useSignal(false);

  // Bests and any saved run live in browser storage, so they can only be read
  // once the client is up.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    bests.value = loadBests();
    savedRun.value = loadRun() !== null;
  }, EAGER);

  /**
   * The clock.
   *
   * The year is derived from wall-clock time against an anchor rather than
   * counted in frames, so a backgrounded or throttled tab catches up the moment
   * it comes back instead of quietly losing game-days — which is what the
   * original did, because its vendor-prefix probe never matched and it always
   * fell back to a timer that browsers throttle. An animation frame loop has the
   * same fault: it stops dead in a hidden tab.
   *
   * The clock is deliberately held while an event is waiting on the player, and
   * re-anchored when they answer.
   */
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track, cleanup }) => {
    track(() => state.phase);
    track(() => state.pendingEventId);
    if (state.phase !== "running" || state.pendingEventId) return;

    const anchor = Date.now() - state.tick * TICK_MS;
    let lastSaved = state.tick;

    const pump = () => {
      const due = Math.floor((Date.now() - anchor) / TICK_MS);
      let guard = 0;
      while (
        state.tick < due &&
        state.phase === "running" &&
        !state.pendingEventId &&
        guard++ < TOTAL_TICKS
      ) {
        step(state);
      }
      if (state.phase !== "running") return;
      if (state.tick - lastSaved >= 10) {
        lastSaved = state.tick;
        saveRun(state);
      }
    };

    const interval = setInterval(pump, 200);
    document.addEventListener("visibilitychange", pump);
    cleanup(() => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", pump);
    });
  }, EAGER);

  // Record the finish once, when the run ends.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => state.phase);
    if (state.phase !== "ended") return;

    clearRun();
    savedRun.value = false;
    previousBest.value = bests.value[state.difficultyId] ?? null;
    if (state.outcome === "won") {
      isNewBest.value = recordBest(state.difficultyId, state.tick);
      bests.value = loadBests();
    } else {
      isNewBest.value = false;
    }
  }, EAGER);

  const start = $((difficultyId: Difficulty["id"]) => {
    resetInto(state, difficultyId);
    state.phase = "running";
    clearRun();
  });

  const resume = $(() => {
    const saved = loadRun();
    if (saved) restoreInto(state, saved);
  });

  const again = $(() => {
    resetInto(state, state.difficultyId);
  });

  const best = bests.value[state.difficultyId] ?? null;

  return (
    <>
      <Snowfield tick={state.tick} />

      <main class="relative z-10 mx-auto min-h-[100dvh] w-full max-w-[1180px] px-4 py-6 sm:px-7 sm:py-9">
        <div class="mb-5 flex items-center justify-between gap-4">
          <span class="eyebrow">Present delivery · Christmas 2026</span>
          <ThemeToggle />
        </div>

        {state.phase === "setup" && (
          <SetupScreen
            bests={bests.value}
            hasSavedRun={savedRun.value}
            onStart$={start}
            onResume$={resume}
          />
        )}

        {state.phase === "running" && (
          <div class="flex flex-col gap-4">
            <StatusBar state={state} />

            <section class="border-rule bg-surface border px-5 pt-4 pb-3">
              <YearRail state={state} bestTick={best?.tick ?? null} />
              <div class="border-rule mt-3 border-t">
                <ResourceTrack state={state} kind="presents" />
                <ResourceTrack state={state} kind="capacity" />
                <ResourceTrack state={state} kind="power" />
              </div>
            </section>

            <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
              <Workshop state={state} />
              <Catalogue state={state} />
            </div>
          </div>
        )}

        {state.phase === "ended" && (
          <EndCard
            state={state}
            previousBest={previousBest.value}
            isNewBest={isNewBest.value}
            onAgain$={again}
          />
        )}

        <footer class="border-rule text-ink-mute mt-10 border-t pt-4 font-mono text-[0.6875rem] leading-relaxed">
          One second is half a day. The year takes twelve minutes and eight
          seconds, and it does not stop.
        </footer>
      </main>

      <EventDialog state={state} />
    </>
  );
});

export const head: DocumentHead = {
  title: "One year to save Christmas",
  meta: [
    {
      name: "description",
      content:
        "An interactive Christmas card. You have from Boxing Day to Christmas Day — twelve real minutes — to rebuild Father Christmas's workshop, sleigh and herd.",
    },
    { name: "theme-color", content: "#b22222" },
    { property: "og:title", content: "One year to save Christmas" },
    {
      property: "og:description",
      content:
        "Twelve minutes. Three hundred and sixty-four days. One very tight deadline.",
    },
  ],
};

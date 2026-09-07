import {
  $,
  component$,
  useContext,
  useSignal,
  useStore,
  useVisibleTask$,
} from "@builder.io/qwik";
import {
  useLocation,
  useNavigate,
  type DocumentHead,
} from "@builder.io/qwik-city";

import { Catalogue } from "~/components/game/catalogue";
import { EndCard } from "~/components/game/end-card";
import { EventDialog } from "~/components/game/event-dialog";
import { MiniProgressBar } from "~/components/game/mini-progress-bar";
import { ResourceTrack } from "~/components/game/resource-track";
import { SnowTickContext } from "~/components/game/snow-context";
import { StatusBar } from "~/components/game/status-bar";
import { Workshop } from "~/components/game/workshop";
import { YearRail } from "~/components/game/year-rail";

import { TICK_MS, TOTAL_TICKS, isDifficultyId } from "~/game/constants";
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
 * The route's root is a fragment, so there is no host element for the default
 * intersection-observer strategy to watch and the tasks would never fire. The
 * whole page is the game — it should start as soon as the document is ready,
 * not when something scrolls into view.
 */
const EAGER = { strategy: "document-ready" } as const;

/**
 * The year, and only the year.
 *
 * `?d=<setting>` starts a new one; arriving with no parameter resumes the run
 * held in browser storage, and with neither there is nothing to play, so the
 * card gets the visitor back.
 */
export default component$(() => {
  const location = useLocation();
  const nav = useNavigate();

  const state = useStore<GameState>(createInitialState("kind"), { deep: true });
  const bests = useStore<{ value: Bests }>({ value: {} });
  const previousBest = useSignal<Best | null>(null);
  const isNewBest = useSignal(false);
  const snowTick = useContext(SnowTickContext);

  const trackerRef = useSignal<HTMLElement>();
  const trackerPinned = useSignal(false);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    bests.value = loadBests();

    // A saved run wins over the search parameter, so coming back to this URL
    // — the back button, a reopened tab — picks the year up rather than
    // starting it again. Beginning a new one is the card's job, and it clears
    // the save before it sends anyone here.
    const saved = loadRun();
    if (saved) {
      restoreInto(state, saved);
      return;
    }

    const requested = location.url.searchParams.get("d");
    if (isDifficultyId(requested)) {
      resetInto(state, requested);
      state.phase = "running";
      // Banked at once, so a refresh in the first few seconds still has a year
      // to come back to.
      saveRun(state);
      return;
    }

    nav("/");
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
      snowTick.value = state.tick;
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
      // Leaving the page is no longer the end of a run, now that the scoreboard
      // is one click away, so the year is banked on the way out.
      saveRun(state);
    });
  }, EAGER);

  // Record the finish once, when the run ends.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => state.phase);
    if (state.phase !== "ended") return;

    clearRun();
    previousBest.value = bests.value[state.difficultyId] ?? null;
    if (state.outcome === "won") {
      isNewBest.value = recordBest(state.difficultyId, state.tick);
      bests.value = loadBests();
    } else {
      isNewBest.value = false;
    }
  }, EAGER);

  /**
   * The minimized tracker.
   *
   * Pins once the full status bar/year rail/resource tracks block has
   * scrolled (almost) entirely past the top of the viewport. "Almost" rather
   * than "entirely": on a typical phone the block is nearly a screen tall by
   * itself, so demanding every last pixel of it clear the viewport would mean
   * scrolling past everything below it too — on a fresh run, before the
   * workshop and catalogue have grown, there often isn't enough page left to
   * do that at all. A small buffer, scaled to the viewport rather than to the
   * block's own height, keeps the trigger reachable regardless of how tall
   * the run's content currently is. Scrolling back up clears it the same way.
   */
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track, cleanup }) => {
    track(() => state.phase);
    if (state.phase !== "running" || !trackerRef.value) return;
    const el = trackerRef.value;

    let queued = false;
    const evaluate = () => {
      queued = false;
      trackerPinned.value =
        el.getBoundingClientRect().bottom < window.innerHeight * 0.35;
    };
    const onScrollOrResize = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(evaluate);
    };

    evaluate();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    cleanup(() => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    });
  }, EAGER);

  const again = $(() => {
    previousBest.value = null;
    isNewBest.value = false;
    resetInto(state, state.difficultyId);
    state.phase = "running";
  });

  const best = bests.value[state.difficultyId] ?? null;

  return (
    <>
      {state.phase === "running" && (
        <div class="flex flex-col gap-4">
          <div ref={trackerRef} class="flex flex-col gap-4">
            <StatusBar state={state} />

            <section class="border-rule bg-surface border px-5 pt-4 pb-3">
              <YearRail state={state} bestTick={best?.tick ?? null} />
              <div class="border-rule mt-3 border-t">
                <ResourceTrack state={state} kind="presents" />
                <ResourceTrack state={state} kind="capacity" />
                <ResourceTrack state={state} kind="power" />
              </div>
            </section>
          </div>

          <MiniProgressBar state={state} pinned={trackerPinned.value} />

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

      {state.phase === "setup" && (
        <p class="text-ink-mute font-mono text-[0.6875rem]">
          Harnessing the reindeer…
        </p>
      )}

      <EventDialog state={state} />
    </>
  );
});

export const head: DocumentHead = {
  title: "The year · One year to save Christmas",
  meta: [
    {
      name: "description",
      content:
        "Boxing Day 2025 to Christmas Day 2026, at one second to the half-day.",
    },
    { name: "theme-color", content: "#b22222" },
    { name: "robots", content: "noindex" },
  ],
};

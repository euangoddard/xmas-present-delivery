import {
  component$,
  Slot,
  useContextProvider,
  useSignal,
} from "@builder.io/qwik";
import { Link, useLocation } from "@builder.io/qwik-city";

import { Snowfield } from "~/components/game/snowfield";
import { SnowTickContext } from "~/components/game/snow-context";
import { ThemeToggle } from "~/components/game/theme-toggle";

/**
 * The shell every route sits in: the snowfall, the masthead and the note about
 * the clock. Splitting the card, the game and the board into their own routes
 * means all three want the same frame, and the snow wants to keep falling
 * across a navigation rather than restarting each time.
 */
export default component$(() => {
  const tick = useSignal(0);
  useContextProvider(SnowTickContext, tick);

  const path = useLocation().url.pathname;
  const onBoard = path.startsWith("/scoreboard");

  return (
    <>
      <Snowfield tick={tick.value} />

      <main class="relative z-10 mx-auto min-h-[100dvh] w-full max-w-[1180px] px-4 py-6 sm:px-7 sm:py-9">
        <div class="mb-5 flex items-center justify-between gap-4">
          <Link href="/" class="eyebrow hover:text-ink transition-colors">
            Present delivery · Christmas 2026
          </Link>
          <nav class="flex items-center gap-2">
            <Link
              href="/scoreboard/kind/"
              aria-current={onBoard ? "page" : undefined}
              class={[
                "border px-2.5 py-1 font-mono text-[0.6875rem] tracking-[0.12em] uppercase transition-colors",
                onBoard
                  ? "border-brass text-brass"
                  : "border-rule-control bg-surface hover:bg-sunken",
              ].join(" ")}
            >
              Scoreboard
            </Link>
            <ThemeToggle />
          </nav>
        </div>

        <Slot />

        <footer class="border-rule text-ink-mute mt-10 border-t pt-4 font-mono text-[0.6875rem] leading-relaxed">
          One second is half a day. The year takes twelve minutes and eight
          seconds, and it does not stop.
        </footer>
      </main>
    </>
  );
});

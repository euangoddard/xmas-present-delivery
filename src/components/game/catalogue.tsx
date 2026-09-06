import { $, component$ } from "@builder.io/qwik";
import {
  ALL_UPGRADES,
  buy as doBuy,
  canAfford,
  finishDelta,
  isRevealed,
  lockReason,
  priceOf,
} from "~/game/engine";
import { compact, humanize } from "~/game/formulas";
import { nextReindeerName } from "~/game/reindeer";
import type { GameState, Upgrade } from "~/game/types";

interface CatalogueProps {
  state: GameState;
}

const ICON: Record<string, string> = {
  elf: "🧝",
  santa: "🎅",
  reindeer: "🦌",
  sleigh: "🛷",
  trainer: "🏋",
  mechanic: "🔧",
  duplicator: "✨",
};

/**
 * Every row states what the purchase does to the projected finishing date,
 * which is how a player learns the economy without being taught it. The
 * original showed a cost and an icon and left every decision blind.
 */
export const Catalogue = component$<CatalogueProps>(({ state }) => {
  const buy = $((id: Upgrade["id"]) => {
    doBuy(state, id);
  });

  const revealed = ALL_UPGRADES.filter((upgrade) => isRevealed(state, upgrade));
  const hidden = ALL_UPGRADES.length - revealed.length;

  return (
    <section
      class="border-rule bg-surface flex flex-col border"
      aria-label="Catalogue"
    >
      <div class="border-rule flex items-baseline justify-between border-b px-5 py-4">
        <h2 class="font-display text-lg font-bold">Catalogue</h2>
        <span class="eyebrow tnum">{humanize(state.materials)} materials</span>
      </div>

      <ul class="divide-rule divide-y">
        {revealed.map((upgrade) => {
          const price = priceOf(state, upgrade);
          const owned = state.quantities[upgrade.id];
          const locked = lockReason(state, upgrade);
          const affordable = canAfford(state, upgrade);
          const delta = affordable ? finishDelta(state, upgrade.id) : null;
          const nextName =
            upgrade.id === "reindeer" ? nextReindeerName(owned) : null;

          return (
            <li key={upgrade.id} class="settle">
              <button
                type="button"
                disabled={!affordable}
                onClick$={() => buy(upgrade.id)}
                class={[
                  "flex w-full items-start gap-4 px-5 py-3.5 text-left transition-colors",
                  affordable
                    ? "hover:bg-sunken cursor-pointer"
                    : "cursor-not-allowed",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  class={[
                    "mt-0.5 w-6 shrink-0 text-center text-lg",
                    affordable ? "" : "opacity-40",
                  ].join(" ")}
                >
                  {ICON[upgrade.id]}
                </span>

                <span class="min-w-0 flex-1">
                  <span class="flex items-baseline gap-2">
                    <span
                      class={[
                        "font-display text-sm font-semibold",
                        affordable ? "" : "text-ink-mute",
                      ].join(" ")}
                    >
                      {upgrade.label}
                    </span>
                    {owned > 0 && (
                      <span class="tnum text-ink-mute font-mono text-[0.6875rem]">
                        ×{owned}
                      </span>
                    )}
                  </span>
                  <span class="text-ink-soft mt-0.5 block text-[0.8125rem] leading-snug">
                    {upgrade.effect}
                    {nextName && (
                      <span class="text-brass"> — {nextName} is next</span>
                    )}
                  </span>
                  {locked ? (
                    <span class="text-brass mt-1 block font-mono text-[0.6875rem]">
                      {locked}
                    </span>
                  ) : delta !== null && delta > 0 ? (
                    <span class="text-spruce mt-1 block font-mono text-[0.6875rem]">
                      finishes {Math.round(delta / 2)} days sooner
                    </span>
                  ) : (
                    <span class="text-ink-mute mt-1 block font-mono text-[0.6875rem]">
                      {upgrade.flavour}
                    </span>
                  )}
                </span>

                <span class="shrink-0 text-right">
                  <span
                    class={[
                      "tnum font-display block text-sm font-semibold",
                      affordable ? "" : "text-ink-mute",
                    ].join(" ")}
                  >
                    {compact(price)}
                  </span>
                  <span class="mt-0.5 block font-mono text-[0.6875rem] tracking-[0.1em] uppercase">
                    {locked ? (
                      <span class="text-ink-mute">locked</span>
                    ) : affordable ? (
                      <span class="text-spruce">buy</span>
                    ) : (
                      <span class="text-ink-mute">short</span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {hidden > 0 && (
        <p class="border-rule text-ink-mute border-t border-dashed px-5 py-3 font-mono text-[0.6875rem]">
          {hidden} more {hidden === 1 ? "item appears" : "items appear"} as the
          workshop grows.
        </p>
      )}
    </section>
  );
});

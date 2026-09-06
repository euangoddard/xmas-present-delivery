import { $, component$ } from "@builder.io/qwik";
import { eventById } from "~/game/events";
import { resolveEvent } from "~/game/engine";
import { formatGameDate } from "~/game/calendar";
import { humanize } from "~/game/formulas";
import type { GameState } from "~/game/types";

interface EventDialogProps {
  state: GameState;
}

/**
 * The clock holds while an event is on screen. A timed game that made you read
 * under the ticking clock would only teach you to dismiss the writing unread.
 */
export const EventDialog = component$<EventDialogProps>(({ state }) => {
  const event = state.pendingEventId
    ? eventById(state.pendingEventId)
    : undefined;
  if (!event) return null;

  const choose = $((choiceId: string) => {
    resolveEvent(state, choiceId);
  });

  return (
    <div
      class="bg-ink/45 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-title"
    >
      <div class="settle border-rule-firm bg-surface w-full max-w-lg border shadow-[var(--shadow-soft)]">
        <div class="border-rule bg-sunken flex items-baseline justify-between border-b px-5 py-2.5">
          <span class="eyebrow">The year so far</span>
          <span class="tnum text-ink-mute font-mono text-[0.6875rem]">
            {formatGameDate(state.tick)} — the clock is held
          </span>
        </div>

        <div class="px-6 py-5">
          <h2
            id="event-title"
            class="font-display text-xl font-bold text-balance"
          >
            {event.title}
          </h2>
          <p class="text-ink-soft mt-3 text-[0.9375rem] leading-relaxed">
            {event.body}
          </p>

          <div class="mt-5 flex flex-col gap-2.5">
            {event.choices.map((choice) => {
              const cost = choice.costShare
                ? Math.floor(state.materials * choice.costShare)
                : 0;
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick$={() => choose(choice.id)}
                  class="group border-rule bg-paper hover:border-brick hover:bg-sunken flex items-baseline justify-between gap-4 border px-4 py-3 text-left transition-colors"
                >
                  <span class="min-w-0">
                    <span class="font-display text-sm font-semibold">
                      {choice.label}
                    </span>
                    <span class="text-ink-mute mt-0.5 block text-[0.8125rem] leading-snug">
                      {choice.modifiers.length > 0
                        ? choice.modifiers
                            .map(
                              (modifier) =>
                                `${modifier.label} for ${choice.durationDays} days`,
                            )
                            .join(", ")
                        : "No lasting effect"}
                    </span>
                  </span>
                  <span class="tnum shrink-0 font-mono text-[0.6875rem] whitespace-nowrap">
                    {cost > 0 ? (
                      <span class="text-brick">−{humanize(cost)}</span>
                    ) : (
                      <span class="text-ink-mute">free</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

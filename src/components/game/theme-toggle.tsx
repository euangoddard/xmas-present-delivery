import {
  $,
  component$,
  type JSXOutput,
  useOnDocument,
  useSignal,
} from "@builder.io/qwik";
import { loadTheme, saveTheme, type ThemePreference } from "~/game/storage";

const ORDER: ThemePreference[] = ["system", "light", "dark"];
const LABEL: Record<ThemePreference, string> = {
  system: "Auto",
  light: "Day",
  dark: "Night",
};

function icon(preference: ThemePreference): JSXOutput {
  switch (preference) {
    case "system":
      return (
        <svg key="system" viewBox="0 0 16 16" class="size-3.5" aria-hidden="true">
          <circle
            cx="8"
            cy="8"
            r="6"
            fill="none"
            stroke="currentColor"
            stroke-width="1.3"
          />
          <path d="M8 2A6 6 0 0 0 8 14Z" fill="currentColor" />
        </svg>
      );
    case "light":
      return (
        <svg
          key="light"
          viewBox="0 0 16 16"
          class="size-3.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.3"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="3" />
          <path d="M8 0.5v1.5M8 14v1.5M15.5 8H14M2 8H0.5M13.3 2.7l-1.06 1.06M3.76 12.24l-1.06 1.06M13.3 13.3l-1.06-1.06M3.76 3.76 2.7 2.7" />
        </svg>
      );
    case "dark":
      return (
        <svg
          key="dark"
          viewBox="0 0 16 16"
          class="size-3.5"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M13.8 9.5A5.8 5.8 0 0 1 6.5 2.2a5.8 5.8 0 1 0 7.3 7.3Z" />
        </svg>
      );
  }
}

/**
 * The year runs from midwinter to midwinter, so both themes have a reason to
 * exist. The viewer's own setting is the starting point and the override is
 * always available.
 */
export const ThemeToggle = component$(() => {
  const preference = useSignal<ThemePreference>("system");

  useOnDocument(
    "qinit",
    $(() => {
      preference.value = loadTheme();
      apply(preference.value);
    }),
  );

  const cycle = $(() => {
    const next = ORDER[(ORDER.indexOf(preference.value) + 1) % ORDER.length];
    preference.value = next;
    saveTheme(next);
    apply(next);
  });

  return (
    <button
      type="button"
      onClick$={cycle}
      class="border-rule-control bg-surface hover:bg-sunken flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[0.6875rem] tracking-[0.12em] uppercase transition-colors"
      aria-label={`Theme: ${LABEL[preference.value]}. Click to change.`}
    >
      {icon(preference.value)}
      {LABEL[preference.value]}
    </button>
  );
});

function apply(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", preference);
}

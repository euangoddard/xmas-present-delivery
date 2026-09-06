import { $, component$, useOnDocument, useSignal } from "@builder.io/qwik";
import { loadTheme, saveTheme, type ThemePreference } from "~/game/storage";

const ORDER: ThemePreference[] = ["system", "light", "dark"];
const LABEL: Record<ThemePreference, string> = {
  system: "Auto",
  light: "Day",
  dark: "Night",
};

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
      class="border-rule-control bg-surface hover:bg-sunken border px-2.5 py-1 font-mono text-[0.6875rem] tracking-[0.12em] uppercase transition-colors"
      aria-label={`Theme: ${LABEL[preference.value]}. Click to change.`}
    >
      {LABEL[preference.value]}
    </button>
  );
});

function apply(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", preference);
}

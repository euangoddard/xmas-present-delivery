import {
  $,
  component$,
  useSignal,
  useStore,
  useVisibleTask$,
} from "@builder.io/qwik";
import { useNavigate, type DocumentHead } from "@builder.io/qwik-city";

import { SetupScreen } from "~/components/game/setup-screen";
import type { Difficulty } from "~/game/constants";
import { clearRun, loadBests, loadRun, type Bests } from "~/game/storage";

/**
 * There is nothing to scroll into view — the card is the whole page — so the
 * default intersection-observer strategy would leave the task waiting.
 */
const EAGER = { strategy: "document-ready" } as const;

/**
 * The card itself: the premise, the three objectives and the choice of nice
 * list. Choosing one navigates to `/play/`, which is where the clock lives, so
 * the year has a URL of its own and the intro is not something you have to sit
 * through again to reach the board.
 */
export default component$(() => {
  const nav = useNavigate();
  const bests = useStore<{ value: Bests }>({ value: {} });
  const savedRun = useSignal(false);

  // Bests and any run in progress live in browser storage, so they can only be
  // read once the client is up.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    bests.value = loadBests();
    savedRun.value = loadRun() !== null;
  }, EAGER);

  // Starting is the one thing that discards a year in progress, and it is the
  // only place that does — `/play/` resumes whatever it finds.
  const start = $((difficultyId: Difficulty["id"]) => {
    clearRun();
    return nav(`/play/?d=${difficultyId}`);
  });

  const resume = $(() => nav("/play/"));

  return (
    <SetupScreen
      bests={bests.value}
      hasSavedRun={savedRun.value}
      onStart$={start}
      onResume$={resume}
    />
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

import {
  component$,
  useOnDocument,
  useSignal,
  $,
  noSerialize,
} from "@builder.io/qwik";
import type { NoSerialize } from "@builder.io/qwik";
import { dateAtTick } from "~/game/calendar";

interface SnowfieldProps {
  tick: number;
}

interface Flake {
  x: number;
  y: number;
  radius: number;
  drift: number;
  speed: number;
}

/**
 * The only purely decorative motion in the design, and it earns its place by
 * telling the time: density follows the in-game month, so the weather tracks
 * the calendar. Canvas rather than DOM nodes, and silent under reduced motion.
 */
export const Snowfield = component$<SnowfieldProps>(({ tick }) => {
  const canvasRef = useSignal<HTMLCanvasElement>();
  const handle = useSignal<NoSerialize<{ raf: number }>>();

  useOnDocument(
    "qinit",
    $(() => {
      const canvas = canvasRef.value;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const flakes: Flake[] = [];
      const state = { raf: 0, tick: 0 };
      handle.value = noSerialize(state);

      const resize = () => {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = window.innerWidth * ratio;
        canvas.height = window.innerHeight * ratio;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
      };
      resize();
      window.addEventListener("resize", resize, { passive: true });

      /** Deep winter is thick, high summer is nearly clear. */
      const densityForMonth = (month: number): number => {
        const winterness =
          Math.cos(((month - 11) / 12) * Math.PI * 2) * 0.5 + 0.5;
        return 0.12 + winterness * 0.88;
      };

      const seed = (count: number) => {
        while (flakes.length < count) {
          flakes.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            radius: 0.6 + Math.random() * 1.9,
            drift: (Math.random() - 0.5) * 0.35,
            speed: 0.18 + Math.random() * 0.55,
          });
        }
        flakes.length = Math.min(flakes.length, count);
      };

      const colour = () =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--snow")
          .trim() || "#fff";

      const draw = () => {
        const month = dateAtTick(state.tick).getMonth();
        const wanted = Math.round(18 + densityForMonth(month) * 130);
        seed(wanted);

        context.clearRect(0, 0, window.innerWidth, window.innerHeight);
        context.fillStyle = colour();
        for (const flake of flakes) {
          if (!reduced) {
            flake.y += flake.speed;
            flake.x += flake.drift;
            if (flake.y > window.innerHeight + 4) {
              flake.y = -4;
              flake.x = Math.random() * window.innerWidth;
            }
            if (flake.x < -4) flake.x = window.innerWidth + 4;
            if (flake.x > window.innerWidth + 4) flake.x = -4;
          }
          context.globalAlpha = 0.1 + (flake.radius / 2.5) * 0.28;
          context.beginPath();
          context.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
          context.fill();
        }
        context.globalAlpha = 1;

        if (!reduced) state.raf = requestAnimationFrame(draw);
      };

      // the tick is read off the element so the loop never re-subscribes
      const observer = new MutationObserver(() => {
        state.tick = Number(canvas.dataset.tick ?? 0);
      });
      observer.observe(canvas, {
        attributes: true,
        attributeFilter: ["data-tick"],
      });
      state.tick = Number(canvas.dataset.tick ?? 0);

      draw();
    }),
  );

  return (
    <canvas
      ref={canvasRef}
      data-tick={tick}
      aria-hidden="true"
      class="pointer-events-none fixed inset-0 z-0"
    />
  );
});

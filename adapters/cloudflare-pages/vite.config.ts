import { cloudflarePagesAdapter } from "@builder.io/qwik-city/adapters/cloudflare-pages/vite";
import { extendConfig } from "@builder.io/qwik-city/vite";
import baseConfig from "../../vite.config";

/**
 * Where the card lives. Only used at build time, to bake the canonical and
 * og:image URLs into the pre-rendered intro and to write the sitemap — the
 * server-rendered routes take the origin off the request instead.
 */
const origin = process.env.ORIGIN ?? "https://xmas-present-delivery.euans.space";

/**
 * The adapter is named for Pages but emits a plain module Worker — a fetch
 * handler that reads its bindings off `env` — which is what `wrangler.jsonc`
 * points `main` at.
 *
 * The intro is the one route with nothing in it that the server knows, so it
 * is pre-rendered and served straight off the edge. The game and the boards
 * are rendered per request: the boards read D1, and the game is behind a
 * `noindex` anyway.
 */
export default extendConfig(baseConfig, () => {
  return {
    build: {
      ssr: true,
      rollupOptions: {
        input: ["src/entry.cloudflare-pages.tsx", "@qwik-city-plan"],
      },
      outDir: "server",
      emptyOutDir: true,
    },
    plugins: [
      cloudflarePagesAdapter({
        ssg: { include: ["/"], origin },
        // `_routes.json` is a Pages concept. On Workers the asset server
        // decides what reaches the Worker, from `assets` in wrangler.jsonc.
        functionRoutes: false,
      }),
    ],
  };
});

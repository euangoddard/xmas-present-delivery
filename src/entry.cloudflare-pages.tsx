/*
 * WHAT IS THIS FILE?
 *
 * The production entry point. It is bundled to `server/entry.cloudflare-pages.js`
 * and is what `wrangler.jsonc` runs as the Worker: a fetch handler that takes
 * the request, the bindings (`DB`, `ASSETS`) and the execution context.
 */
import {
  createQwikCity,
  type PlatformCloudflarePages,
} from "@builder.io/qwik-city/middleware/cloudflare-pages";
import qwikCityPlan from "@qwik-city-plan";
import { manifest } from "@qwik-client-manifest";
import render from "./entry.ssr";
import type { Env } from "./server/platform";

declare global {
  interface QwikCityPlatform extends PlatformCloudflarePages {
    env: Env;
  }
}

const fetch = createQwikCity({ render, qwikCityPlan, manifest });

export { fetch };
export default { fetch };

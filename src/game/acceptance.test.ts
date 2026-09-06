/**
 * Acceptance tests for the game model, from section 1.14 of the specification
 * and extended to cover the reworked economy. Pure model only — no interface.
 *
 *   npm run test
 */
import {
  BASE_CAPACITY,
  BASE_INCOME,
  CLICK_BASE,
  TOTAL_TICKS,
  targetFor,
} from "./constants";
import { costOf, growthRate, humanize, clamp } from "./formulas";
import { formatGameDate } from "./calendar";
import {
  buy,
  canAfford,
  click,
  createInitialState,
  difficultyById,
  hasWon,
  lockReason,
  projectFinishTick,
  ratesOf,
  resolveEvent,
  step,
} from "./engine";
import { UPGRADE_BY_ID } from "./upgrades";
import type { GameState, UpgradeId } from "./types";

let failures = 0;
let passes = 0;

const check = (name: string, condition: boolean, detail = ""): void => {
  if (condition) {
    passes += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const eq = (name: string, actual: unknown, expected: unknown): void =>
  check(
    name,
    Object.is(actual, expected),
    `expected ${String(expected)}, got ${String(actual)}`,
  );

const running = (id: "kind" | "fair" | "exacting" = "kind"): GameState => {
  const state = createInitialState(id);
  state.phase = "running";
  return state;
};

console.log("\nModel");
{
  const state = createInitialState("kind");
  eq("starts on Boxing Day", formatGameDate(state.tick), "26th December 2025");
  eq("no presents at the start", state.presents, 0);
  eq("no power at the start", state.power, 0);
  eq("the sack holds something", state.capacity, BASE_CAPACITY);
  eq("kind target", state.target, targetFor(difficultyById("kind")));
}

console.log("\nClicking");
{
  const state = running();
  click(state);
  eq("a bare click makes five", state.presents, CLICK_BASE);
  eq("and credits five materials", state.materials, CLICK_BASE);

  const upgraded = running();
  upgraded.quantities.santa = 10;
  click(upgraded);
  eq(
    "ten Santa upgrades",
    upgraded.presents,
    Math.floor(CLICK_BASE * Math.pow(1.1, 10)),
  );
}

console.log("\nPrices");
{
  eq("first elf", costOf(UPGRADE_BY_ID.elf.baseCost, 0), 20);
  eq("second elf", costOf(UPGRADE_BY_ID.elf.baseCost, 1), 23);
  eq(
    "tenth elf",
    costOf(UPGRADE_BY_ID.elf.baseCost, 9),
    Math.floor(20 * Math.pow(1.15, 9)),
  );
  const state = running();
  state.materials = 100;
  buy(state, "elf");
  eq("buying spends materials", state.materials, 80);
  eq("buying does not spend presents", state.presents, 0);
  eq("and the elf is on the books", state.quantities.elf, 1);
}

console.log("\nProduction");
{
  const state = running();
  state.quantities.elf = 1;
  step(state);
  eq("one elf, one tick", state.presents, BASE_INCOME + 50);

  const two = running();
  two.quantities.elf = 1;
  step(two);
  step(two);
  eq("two ticks is one game day", two.presents, (BASE_INCOME + 50) * 2);
}

console.log("\nCompounding");
{
  eq("no duplicator, no growth", growthRate(0, 0.007), 1);
  const state = running();
  state.quantities.duplicator = 1;
  state.presents = 1_000_000;
  state.capacity = 1e12;
  step(state);
  const expected = clamp((1_000_000 + BASE_INCOME) * growthRate(1, 0.007));
  eq("one duplicator on a million", state.presents, expected);

  const ten = running();
  ten.quantities.duplicator = 10;
  ten.presents = 1_000_000;
  ten.capacity = 1e12;
  step(ten);
  check("ten duplicators beat one", ten.presents > expected);

  // Compounding never creates something from nothing, which is why a
  // multiplier bought against an empty resource is locked rather than sold.
  eq("a share of nothing is nothing", clamp(0 * growthRate(40, 0.007)), 0);
  const noReindeer = running();
  noReindeer.quantities.trainer = 40;
  noReindeer.capacity = 1e12;
  for (let i = 0; i < 100; i++) {
    step(noReindeer);
    if (noReindeer.pendingEventId) resolveEvent(noReindeer, "pay");
  }
  eq("a trainer with no herd trains nothing", noReindeer.power, 0);
}

console.log("\nThe ceiling");
{
  const state = running();
  state.capacity = 100;
  state.quantities.elf = 10;
  step(state);
  eq("presents stop at capacity", state.presents, 100);
  check("the overflow is recorded", state.lost > 0, `lost ${state.lost}`);
  check(
    "but the elves are still paid",
    state.materials === BASE_INCOME + 500,
    `materials ${state.materials}`,
  );
}

console.log("\nLocks");
{
  const state = running();
  check(
    "trainer locked without a reindeer",
    lockReason(state, UPGRADE_BY_ID.trainer) !== null,
  );
  state.materials = 1e9;
  check("and cannot be bought", !canAfford(state, UPGRADE_BY_ID.trainer));
  buy(state, "reindeer");
  eq("a reindeer gives power", state.power, 10000);
  check(
    "which unlocks the trainer",
    lockReason(state, UPGRADE_BY_ID.trainer) === null,
  );

  const noPresents = running();
  check(
    "duplicator locked with an empty store",
    lockReason(noPresents, UPGRADE_BY_ID.duplicator) !== null,
  );
}

console.log("\nEnding");
{
  const state = running();
  for (let i = 0; i < TOTAL_TICKS + 5; i++) {
    step(state);
    if (state.pendingEventId) resolveEvent(state, "refuse");
  }
  eq("the year runs out", state.phase, "ended");
  eq("and it is out of time", state.outcome, "outOfTime");
  eq("on Christmas Day", formatGameDate(state.tick), "25th December 2026");

  const nearly = running();
  nearly.presents = nearly.target;
  nearly.capacity = nearly.target;
  nearly.power = nearly.target - 1;
  check("two of three is not a win", !hasWon(nearly));
  nearly.power = nearly.target;
  check("all three is a win", hasWon(nearly));
}

console.log("\nFormatting");
{
  eq("plenty", humanize(Infinity), "plenty");
  eq("935 million", humanize(935_000_000), "935 million");
  eq("1.31 billion", humanize(1_309_000_000), "1.31 billion");
  eq("under a million keeps separators", humanize(934_182), "934,182");
}

console.log("\nProjection");
{
  const state = running();
  state.quantities.elf = 50;
  state.quantities.duplicator = 20;
  state.quantities.mechanic = 20;
  state.quantities.trainer = 20;
  state.presents = 1e6;
  state.capacity = 5e6;
  state.power = 1e6;
  const finish = projectFinishTick(state);
  check("a healthy run projects a finish", finish !== null, `got ${finish}`);
  const rates = ratesOf(state);
  check(
    "rates are reported",
    rates.presentsPerDay > 0 && rates.powerPerDay > 0,
  );
}

console.log("\nA competent run finishes in the intended window");
{
  const play = (difficulty: "kind" | "fair" | "exacting", cps: number) => {
    const state = running(difficulty);
    const order: UpgradeId[] = [];
    for (let tick = 0; tick < TOTAL_TICKS; tick++) {
      for (let c = 0; c < cps; c++) click(state);
      step(state);
      // take the paid option, which is what a player watching their rates does
      if (state.pendingEventId) resolveEvent(state, "pay");
      let bought = true;
      while (bought) {
        bought = false;
        order.length = 0;
        if (state.quantities.elf < 10) order.push("elf");
        if (state.quantities.santa < 4) order.push("santa");
        if (state.quantities.reindeer < 1) order.push("reindeer");
        if (state.quantities.sleigh < 1) order.push("sleigh");
        if (state.presents > state.capacity * 0.55)
          order.push("mechanic", "sleigh");
        if (state.power < state.target) order.push("trainer", "reindeer");
        order.push("duplicator", "mechanic", "elf");
        for (const id of order) {
          if (buy(state, id)) bought = true;
        }
      }
      if (state.phase === "ended") break;
    }
    return state;
  };

  const kind = play("kind", 4);
  eq("kind is winnable", kind.outcome, "won");
  check(
    "and lands between game-day 200 and 320",
    kind.tick >= 400 && kind.tick <= 640,
    `finished on tick ${kind.tick} (day ${kind.tick / 2})`,
  );

  const exacting = play("exacting", 4);
  check(
    "exacting is meaningfully harder than kind",
    exacting.outcome !== "won" || exacting.tick > kind.tick + 20,
    `kind ${kind.tick}, exacting ${exacting.tick}`,
  );

  const passive = play("kind", 0);
  eq("a player who never clicks can still win", passive.outcome, "won");
}

console.log(`\n${passes} passed, ${failures} failed\n`);
if (failures > 0) process.exit(1);

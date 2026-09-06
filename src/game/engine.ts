import {
  BASE_CAPACITY,
  BASE_INCOME,
  CLICK_BASE,
  DIFFICULTIES,
  TOTAL_TICKS,
  targetFor,
  type Difficulty,
} from "./constants";
import { clamp, costOf, growthRate } from "./formulas";
import { CALENDAR_EVENTS, eventById, eventTick } from "./events";
import { EMPTY_QUANTITIES, UPGRADE_BY_ID, UPGRADES } from "./upgrades";
import type { GameState, Modifier, Upgrade, UpgradeId } from "./types";

export const difficultyById = (id: Difficulty["id"]): Difficulty =>
  DIFFICULTIES.find((entry) => entry.id === id) ?? DIFFICULTIES[0];

export const createInitialState = (
  difficultyId: Difficulty["id"],
): GameState => ({
  phase: "setup",
  outcome: null,
  difficultyId,
  target: targetFor(difficultyById(difficultyId)),
  tick: 0,
  presents: 0,
  materials: 0,
  capacity: BASE_CAPACITY,
  power: 0,
  lost: 0,
  totalProduced: 0,
  quantities: { ...EMPTY_QUANTITIES },
  modifiers: [],
  resolvedEvents: [],
  pendingEventId: null,
  lastTickProduced: 0,
  lastTickLost: 0,
  clicks: 0,
  milestones: {},
});

/** Product of every active modifier acting on one quantity. */
export const modifierFor = (
  state: GameState,
  target: Modifier["target"],
): number =>
  state.modifiers
    .filter((modifier) => modifier.target === target)
    .reduce((product, modifier) => product * modifier.multiplier, 1);

/** Presents added by a single click, before modifiers. */
export const clickPower = (state: GameState): number =>
  CLICK_BASE * Math.pow(UPGRADE_BY_ID.santa.unitEffect, state.quantities.santa);

/** What the workshop produces in one tick, ignoring the ceiling. */
export const grossPerTick = (state: GameState): number => {
  const elves = state.quantities.elf * UPGRADE_BY_ID.elf.unitEffect;
  const output =
    modifierFor(state, "output") *
    difficultyById(state.difficultyId).outputModifier;
  return (BASE_INCOME + elves) * output;
};

/** Price of the next copy, after any cost modifier. */
export const priceOf = (state: GameState, upgrade: Upgrade): number =>
  Math.floor(
    costOf(upgrade.baseCost, state.quantities[upgrade.id]) *
      modifierFor(state, "cost"),
  );

/**
 * A compounding upgrade cannot act on a resource sitting at zero, so it is
 * locked rather than sold as a trap. The original happily took twenty thousand
 * presents for a duplicator that would never do anything.
 */
export const lockReason = (
  state: GameState,
  upgrade: Upgrade,
): string | null => {
  if (!upgrade.requiresNonZeroResource) return null;
  if (upgrade.resource === "power" && state.power <= 0) {
    return "Needs at least one reindeer";
  }
  if (upgrade.resource === "presents" && state.presents <= 0) {
    return "Needs presents in store to copy";
  }
  if (upgrade.resource === "capacity" && state.capacity <= 0) {
    return "Needs somewhere to put them";
  }
  return null;
};

export const canAfford = (state: GameState, upgrade: Upgrade): boolean =>
  state.materials >= priceOf(state, upgrade) &&
  lockReason(state, upgrade) === null;

/**
 * An upgrade is shown once it is within reach, so the catalogue arrives a piece
 * at a time instead of presenting seven things at once on the first screen.
 *
 * Reach is measured against lifetime production rather than the current balance,
 * or the list would shrink every time the player spent — items must never
 * disappear once seen. The cheapest thing on the list is always shown, so the
 * catalogue is never empty.
 */
export const isRevealed = (state: GameState, upgrade: Upgrade): boolean => {
  if (state.quantities[upgrade.id] > 0) return true;
  if (upgrade.baseCost === Math.min(...UPGRADES.map((entry) => entry.baseCost)))
    return true;
  return state.totalProduced >= priceOf(state, upgrade) * 0.4;
};

const applyProduction = (state: GameState, gross: number): void => {
  const duplicator = UPGRADE_BY_ID.duplicator;
  const withCopies = clamp(
    (state.presents + gross) *
      growthRate(state.quantities.duplicator, duplicator.unitEffect),
  );
  const made = Math.max(0, withCopies - state.presents);
  const room = Math.max(0, state.capacity - state.presents);
  const stored = Math.min(made, room);

  state.presents = clamp(state.presents + stored);
  // The elves are paid for everything they make, so a full sleigh throttles the
  // score without deadlocking the economy. Overflow costs presents, not income.
  state.materials = clamp(state.materials + made);
  state.totalProduced = clamp(state.totalProduced + made);
  state.lost = clamp(state.lost + (made - stored));
  state.lastTickProduced = made;
  state.lastTickLost = made - stored;
};

const recordMilestones = (state: GameState): void => {
  if (
    state.presents >= state.target &&
    state.milestones.presents === undefined
  ) {
    state.milestones.presents = state.tick;
  }
  if (
    state.capacity >= state.target &&
    state.milestones.capacity === undefined
  ) {
    state.milestones.capacity = state.tick;
  }
  if (state.power >= state.target && state.milestones.power === undefined) {
    state.milestones.power = state.tick;
  }
};

export const hasWon = (state: GameState): boolean =>
  state.presents >= state.target &&
  state.capacity >= state.target &&
  state.power >= state.target;

/**
 * Advance the game by exactly one tick.
 *
 * Mutates in place so it can drive a Qwik store directly; it is otherwise pure
 * in the sense that the result depends only on the state passed in.
 */
export const step = (state: GameState): void => {
  if (state.phase !== "running" || state.pendingEventId) return;

  state.tick += 1;

  if (state.tick >= TOTAL_TICKS) {
    state.tick = TOTAL_TICKS;
    state.phase = "ended";
    state.outcome = "outOfTime";
    return;
  }

  state.modifiers = state.modifiers.filter(
    (modifier) => modifier.untilTick > state.tick,
  );

  applyProduction(state, grossPerTick(state));

  state.capacity = clamp(
    state.capacity *
      (1 +
        (growthRate(
          state.quantities.mechanic,
          UPGRADE_BY_ID.mechanic.unitEffect,
        ) -
          1) *
          modifierFor(state, "capacityGrowth")),
  );
  state.power = clamp(
    state.power *
      (1 +
        (growthRate(
          state.quantities.trainer,
          UPGRADE_BY_ID.trainer.unitEffect,
        ) -
          1) *
          modifierFor(state, "powerGrowth")),
  );

  recordMilestones(state);

  const due = CALENDAR_EVENTS.find(
    (event) =>
      eventTick(event) === state.tick &&
      !state.resolvedEvents.some((resolved) => resolved.eventId === event.id),
  );
  if (due) state.pendingEventId = due.id;

  if (hasWon(state)) {
    state.phase = "ended";
    state.outcome = "won";
  }
};

export const click = (state: GameState): void => {
  if (state.phase !== "running" || state.pendingEventId) return;
  const made = clickPower(state) * modifierFor(state, "output");
  const room = Math.max(0, state.capacity - state.presents);
  const stored = Math.min(made, room);
  state.presents = clamp(state.presents + stored);
  state.materials = clamp(state.materials + made);
  state.totalProduced = clamp(state.totalProduced + made);
  state.lost = clamp(state.lost + (made - stored));
  state.clicks += 1;
  recordMilestones(state);
  if (hasWon(state)) {
    state.phase = "ended";
    state.outcome = "won";
  }
};

export const buy = (state: GameState, id: UpgradeId): boolean => {
  if (state.phase !== "running") return false;
  const upgrade = UPGRADE_BY_ID[id];
  if (!canAfford(state, upgrade)) return false;

  state.materials = clamp(state.materials - priceOf(state, upgrade));
  state.quantities[id] += 1;

  if (upgrade.trigger === "purchase") {
    if (upgrade.resource === "power")
      state.power = clamp(state.power + upgrade.unitEffect);
    if (upgrade.resource === "capacity") {
      state.capacity = clamp(state.capacity + upgrade.unitEffect);
    }
  }

  recordMilestones(state);
  if (hasWon(state)) {
    state.phase = "ended";
    state.outcome = "won";
  }
  return true;
};

export const resolveEvent = (state: GameState, choiceId: string): void => {
  const event = state.pendingEventId
    ? eventById(state.pendingEventId)
    : undefined;
  if (!event) return;
  const choice =
    event.choices.find((entry) => entry.id === choiceId) ?? event.choices[0];

  if (choice.costShare) {
    state.materials = clamp(state.materials * (1 - choice.costShare));
  }
  for (const modifier of choice.modifiers) {
    state.modifiers.push({
      ...modifier,
      untilTick: state.tick + choice.durationDays * 2,
    });
  }
  state.resolvedEvents.push({
    eventId: event.id,
    tick: state.tick,
    choiceId: choice.id,
  });
  state.pendingEventId = null;
};

/** Per-day figures for the readouts, so no decision is made blind. */
export interface Rates {
  presentsPerDay: number;
  capacityPerDay: number;
  powerPerDay: number;
  lostPerDay: number;
  fillFraction: number;
}

export const ratesOf = (state: GameState): Rates => {
  const duplicatorGain =
    state.presents *
    (growthRate(
      state.quantities.duplicator,
      UPGRADE_BY_ID.duplicator.unitEffect,
    ) -
      1);
  const gross = grossPerTick(state) + duplicatorGain;
  const room = Math.max(0, state.capacity - state.presents);
  const stored = Math.min(gross, room);

  const capacityGain =
    state.capacity *
    (growthRate(state.quantities.mechanic, UPGRADE_BY_ID.mechanic.unitEffect) -
      1) *
    modifierFor(state, "capacityGrowth");
  const powerGain =
    state.power *
    (growthRate(state.quantities.trainer, UPGRADE_BY_ID.trainer.unitEffect) -
      1) *
    modifierFor(state, "powerGrowth");

  return {
    presentsPerDay: stored * 2,
    capacityPerDay: capacityGain * 2,
    powerPerDay: powerGain * 2,
    lostPerDay: (gross - stored) * 2,
    fillFraction: state.capacity > 0 ? state.presents / state.capacity : 0,
  };
};

/**
 * Ticks until the last of the three objectives is met at current rates, or null
 * if it cannot be reached inside the year. Projected by simulating forward with
 * the present purchases frozen, which is cheap and honest: it answers "if I
 * change nothing from here".
 */
export const projectFinishTick = (state: GameState): number | null => {
  if (state.phase !== "running") return null;

  let presents = state.presents;
  let capacity = state.capacity;
  let power = state.power;
  const gross = grossPerTick(state);
  const dupRate = growthRate(
    state.quantities.duplicator,
    UPGRADE_BY_ID.duplicator.unitEffect,
  );
  const mechRate =
    1 +
    (growthRate(state.quantities.mechanic, UPGRADE_BY_ID.mechanic.unitEffect) -
      1) *
      modifierFor(state, "capacityGrowth");
  const trainRate =
    1 +
    (growthRate(state.quantities.trainer, UPGRADE_BY_ID.trainer.unitEffect) -
      1) *
      modifierFor(state, "powerGrowth");

  for (let tick = state.tick; tick <= TOTAL_TICKS; tick++) {
    if (
      presents >= state.target &&
      capacity >= state.target &&
      power >= state.target
    ) {
      return tick;
    }
    presents = Math.min(capacity, (presents + gross) * dupRate);
    capacity = capacity * mechRate;
    power = power * trainRate;
    if (!Number.isFinite(presents) || !Number.isFinite(capacity)) return tick;
  }
  return null;
};

/** How much sooner the run would finish if this upgrade were bought now. */
export const finishDelta = (state: GameState, id: UpgradeId): number | null => {
  const before = projectFinishTick(state);
  if (before === null) return null;

  const upgrade = UPGRADE_BY_ID[id];
  const preview: GameState = {
    ...state,
    quantities: { ...state.quantities, [id]: state.quantities[id] + 1 },
    modifiers: [...state.modifiers],
    milestones: { ...state.milestones },
    resolvedEvents: [...state.resolvedEvents],
  };
  if (upgrade.trigger === "purchase") {
    if (upgrade.resource === "power")
      preview.power = state.power + upgrade.unitEffect;
    if (upgrade.resource === "capacity")
      preview.capacity = state.capacity + upgrade.unitEffect;
  }
  const after = projectFinishTick(preview);
  if (after === null) return null;
  return before - after;
};

export const ALL_UPGRADES = UPGRADES;

/**
 * Reset a live store in place. The store object itself cannot be replaced, so
 * every field is assigned from a fresh initial state.
 */
export const resetInto = (
  state: GameState,
  difficultyId: Difficulty["id"],
): void => {
  const fresh = createInitialState(difficultyId);
  Object.assign(state, fresh, {
    quantities: { ...fresh.quantities },
    modifiers: [],
    resolvedEvents: [],
    milestones: {},
  });
};

/** Restore a saved run into a live store, field by field. */
export const restoreInto = (state: GameState, saved: GameState): void => {
  Object.assign(state, saved, {
    quantities: { ...saved.quantities },
    modifiers: [...saved.modifiers],
    resolvedEvents: [...saved.resolvedEvents],
    milestones: { ...saved.milestones },
  });
};

import type { Difficulty } from "./constants";

export type UpgradeId =
  | "elf"
  | "santa"
  | "reindeer"
  | "sleigh"
  | "trainer"
  | "mechanic"
  | "duplicator";

export type Phase = "setup" | "running" | "ended";
export type Outcome = "won" | "outOfTime";

/** Which resource an upgrade acts on, used for the locked-when-zero rule. */
export type Resource = "presents" | "capacity" | "power";

export type Trigger = "tick" | "click" | "purchase";

export interface Upgrade {
  readonly id: UpgradeId;
  readonly label: string;
  readonly effect: string;
  readonly flavour: string;
  readonly baseCost: number;
  readonly trigger: Trigger;
  readonly resource: Resource;
  /** Flat amount added, or the per-copy compounding rate. */
  readonly unitEffect: number;
  /** Compounding upgrades do nothing to a resource sitting at zero. */
  readonly requiresNonZeroResource: boolean;
}

/** A timed change to the rules, applied by a calendar event. */
export interface Modifier {
  readonly key: string;
  /** Which quantity it scales. */
  readonly target: "output" | "cost" | "powerGrowth" | "capacityGrowth";
  readonly multiplier: number;
  readonly untilTick: number;
  readonly label: string;
}

export interface ResolvedEvent {
  readonly eventId: string;
  readonly tick: number;
  readonly choiceId: string | null;
}

export interface GameState {
  phase: Phase;
  outcome: Outcome | null;
  difficultyId: Difficulty["id"];
  target: number;
  tick: number;

  /** The score. Never decreases, and never exceeds capacity. */
  presents: number;
  /** The budget. Every present made credits one, and purchases spend them. */
  materials: number;
  /** How much the sleigh can hold. A hard ceiling on presents. */
  capacity: number;
  /** How much the reindeer can pull. */
  power: number;

  /** Presents made that there was no room to keep. */
  lost: number;
  /** Everything produced, before the ceiling was applied. */
  totalProduced: number;

  quantities: Record<UpgradeId, number>;
  modifiers: Modifier[];
  resolvedEvents: ResolvedEvent[];
  /** The event waiting on the player, if any. */
  pendingEventId: string | null;

  /** Rolling production figures, for the rate readouts. */
  lastTickProduced: number;
  lastTickLost: number;
  clicks: number;

  /** Ticks at which each objective was first met, for the rail markers. */
  milestones: Partial<Record<"presents" | "capacity" | "power", number>>;
}

export interface Best {
  /** Tick at which the run was won. Lower is better. */
  tick: number;
  /** ISO date the run was recorded, for the end card. */
  recordedAt: string;
}

import type { Upgrade, UpgradeId } from "./types";

/**
 * The seven items of the original card, retuned.
 *
 * The original's ids drifted from its labels — the reindeer trainer was
 * `elf-trainer` and the sleigh mechanic `elf-mechanic`, both leftovers from an
 * earlier concept. Ids and labels are kept together here so they cannot drift
 * again.
 */
export const UPGRADES: readonly Upgrade[] = [
  {
    id: "elf",
    label: "Elf",
    effect: "Makes 100 presents a day",
    flavour: "Back on the payroll, and glad of it.",
    baseCost: 20,
    trigger: "tick",
    resource: "presents",
    unitEffect: 50,
    requiresNonZeroResource: false,
  },
  {
    id: "santa",
    label: "Santa upgrade",
    effect: "Father Christmas works 10% harder per click",
    flavour: "A stronger cup of tea, a better lathe, a second wind.",
    baseCost: 100,
    trigger: "click",
    resource: "presents",
    unitEffect: 1.1,
    requiresNonZeroResource: false,
  },
  {
    id: "reindeer",
    label: "Reindeer",
    effect: "Pulls another 10,000 presents",
    flavour: "Found grazing three valleys over.",
    baseCost: 500,
    trigger: "purchase",
    resource: "power",
    unitEffect: 10000,
    requiresNonZeroResource: false,
  },
  {
    id: "sleigh",
    label: "Sleigh upgrade",
    effect: "Stores another 75,000 presents",
    flavour: "Longer runners, deeper sides, more room for everything.",
    baseCost: 1200,
    trigger: "purchase",
    resource: "capacity",
    unitEffect: 75000,
    requiresNonZeroResource: false,
  },
  {
    id: "trainer",
    label: "Reindeer trainer",
    effect: "Reindeer grow stronger every day",
    flavour: "Hills in the morning, harness work after lunch.",
    baseCost: 9000,
    trigger: "tick",
    resource: "power",
    unitEffect: 0.003,
    requiresNonZeroResource: true,
  },
  {
    id: "mechanic",
    label: "Sleigh mechanic",
    effect: "The sleigh grows roomier every day",
    flavour: "Never happier than under a sleigh with a spanner.",
    baseCost: 10000,
    trigger: "tick",
    resource: "capacity",
    unitEffect: 0.004,
    requiresNonZeroResource: true,
  },
  {
    id: "duplicator",
    label: "Present duplicator",
    effect: "Copies a share of everything in store, every day",
    flavour: "Nobody asks how it works. It is Christmas.",
    baseCost: 30000,
    trigger: "tick",
    resource: "presents",
    unitEffect: 0.007,
    requiresNonZeroResource: true,
  },
];

export const UPGRADE_BY_ID: Record<UpgradeId, Upgrade> = Object.fromEntries(
  UPGRADES.map((upgrade) => [upgrade.id, upgrade]),
) as Record<UpgradeId, Upgrade>;

export const EMPTY_QUANTITIES: Record<UpgradeId, number> = {
  elf: 0,
  santa: 0,
  reindeer: 0,
  sleigh: 0,
  trainer: 0,
  mechanic: 0,
  duplicator: 0,
};

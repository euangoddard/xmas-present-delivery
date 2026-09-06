/**
 * The first nine reindeer are the named ones, bought in order. Beyond that they
 * are simply reindeer. Nothing mechanical hangs on the names — they exist so the
 * ninth purchase means something.
 */
export const REINDEER_NAMES = [
  "Dasher",
  "Dancer",
  "Prancer",
  "Vixen",
  "Comet",
  "Cupid",
  "Donner",
  "Blitzen",
  "Rudolph",
] as const;

export const reindeerRoster = (owned: number): string[] =>
  REINDEER_NAMES.slice(
    0,
    Math.min(owned, REINDEER_NAMES.length),
  ) as unknown as string[];

export const nextReindeerName = (owned: number): string | null =>
  owned < REINDEER_NAMES.length ? REINDEER_NAMES[owned] : null;

export const describeHerd = (owned: number): string => {
  if (owned === 0) return "No reindeer in the paddock";
  if (owned <= REINDEER_NAMES.length) {
    return reindeerRoster(owned).join(", ");
  }
  const extra = owned - REINDEER_NAMES.length;
  return `All nine, and ${extra.toLocaleString("en-GB")} more besides`;
};

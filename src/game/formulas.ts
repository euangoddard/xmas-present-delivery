import { COST_GROWTH, NUMBER_CEILING } from "./constants";

/**
 * Every value is floored, and anything past the ceiling becomes infinite so the
 * displays cannot overrun. Guards against NaN, which would otherwise propagate
 * silently through a compounding loop.
 */
export const clamp = (value: number): number => {
  if (!Number.isFinite(value)) return value > 0 ? Infinity : 0;
  const floored = Math.floor(value);
  if (floored > NUMBER_CEILING) return Infinity;
  return floored < 0 ? 0 : floored;
};

/** Purchase price, geometric in the number already owned. */
export const costOf = (baseCost: number, owned: number): number =>
  Math.floor(baseCost * Math.pow(COST_GROWTH, owned));

/**
 * Per-tick compounding rate for a multiplier upgrade.
 *
 * The rate rises with the logarithm of the number owned, so each copy is worth
 * less than the last while the next one costs more — that pairing is what keeps
 * the curve from running away. Returns 1 (no effect) when none are owned.
 */
export const growthRate = (owned: number, unitEffect: number): number =>
  owned > 0 ? 1 + unitEffect * 2 * (1 + Math.log(owned)) : 1;

const EXPONENT_NAMES = [
  "million",
  "billion",
  "trillion",
  "quadrillion",
  "quintillion",
  "sextillion",
  "septillion",
  "octillion",
  "nonillion",
  "decillion",
];

const MIN_EXPONENT = 6;
const EXPONENT_STEP = 3;

/**
 * Large numbers read as words above a million; below that they keep their
 * separators. An unrepresentable number is "plenty", which is the one piece of
 * the original's voice worth keeping verbatim.
 */
export const humanize = (value: number): string => {
  if (!Number.isFinite(value)) return "plenty";
  if (value < 1e6) return Math.floor(value).toLocaleString("en-GB");

  const index = Math.floor((Math.log10(value) - MIN_EXPONENT) / EXPONENT_STEP);
  const name = EXPONENT_NAMES[index];
  if (!name) return Math.floor(value).toLocaleString("en-GB");

  const exponent = MIN_EXPONENT + EXPONENT_STEP * index;
  const multiple = Math.round((value / Math.pow(10, exponent)) * 100) / 100;
  return `${multiple} ${name}`;
};

/** Compact form for tight spaces: 4.1M, 2.3bn. */
export const compact = (value: number): string => {
  if (!Number.isFinite(value)) return "∞";
  if (value < 1000) return String(Math.floor(value));
  const units = [
    "",
    "k",
    "M",
    "bn",
    "tn",
    "qd",
    "qn",
    "sx",
    "sp",
    "oc",
    "nn",
    "dc",
  ];
  const index = Math.min(Math.floor(Math.log10(value) / 3), units.length - 1);
  const scaled = value / Math.pow(10, index * 3);
  return `${scaled >= 100 ? Math.round(scaled) : scaled.toFixed(1)}${units[index]}`;
};

export const percent = (fraction: number): string =>
  `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;

import type { Best, GameState } from "./types";
import type { Difficulty } from "./constants";

const RUN_KEY = "present-delivery:run";
const BESTS_KEY = "present-delivery:bests";
const THEME_KEY = "present-delivery:theme";

const canStore = (): boolean => {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
};

/**
 * Every read and write is guarded: private windows, cleared site data and
 * browsers set to block storage all throw on access rather than returning null.
 */
const read = <T>(key: string): T | null => {
  if (!canStore()) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const write = (key: string, value: unknown): void => {
  if (!canStore()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — the game plays on without it */
  }
};

const remove = (key: string): void => {
  if (!canStore()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing to do */
  }
};

/** A run in progress, so a refresh no longer destroys twelve minutes of play. */
export const saveRun = (state: GameState): void => {
  if (state.phase !== "running") {
    remove(RUN_KEY);
    return;
  }
  write(RUN_KEY, state);
};

export const loadRun = (): GameState | null => {
  const state = read<GameState>(RUN_KEY);
  if (!state || state.phase !== "running" || typeof state.tick !== "number")
    return null;
  return state;
};

export const clearRun = (): void => remove(RUN_KEY);

export type Bests = Partial<Record<Difficulty["id"], Best>>;

export const loadBests = (): Bests => read<Bests>(BESTS_KEY) ?? {};

/**
 * Records a finishing tick if it beats the stored one for that difficulty.
 * Returns true when a new best was set, which the end card reports.
 */
export const recordBest = (
  difficultyId: Difficulty["id"],
  tick: number,
): boolean => {
  const bests = loadBests();
  const previous = bests[difficultyId];
  if (previous && previous.tick <= tick) return false;
  bests[difficultyId] = { tick, recordedAt: new Date().toISOString() };
  write(BESTS_KEY, bests);
  return true;
};

export type ThemePreference = "light" | "dark" | "system";

export const loadTheme = (): ThemePreference => {
  const stored = read<ThemePreference>(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
};

export const saveTheme = (theme: ThemePreference): void =>
  write(THEME_KEY, theme);

const NAME_KEY = "present-delivery:name";

/** The name last posted to the scoreboard, so nobody types it twice. */
export const loadName = (): string => read<string>(NAME_KEY) ?? "";

export const saveName = (name: string): void => write(NAME_KEY, name);

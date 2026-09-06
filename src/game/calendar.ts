import { START_DATE, TICKS_PER_DAY, TOTAL_TICKS } from "./constants";

/** The in-game date at a given tick. Each tick is half a day. */
export const dateAtTick = (tick: number): Date => {
  const date = new Date(START_DATE.getTime());
  date.setDate(date.getDate() + Math.floor(tick / TICKS_PER_DAY));
  return date;
};

export const isMorning = (tick: number): boolean => tick % TICKS_PER_DAY === 0;

const ordinal = (day: number): string => {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const formatGameDate = (tick: number): string => {
  const date = dateAtTick(tick);
  return `${date.getDate()}${ordinal(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

export const formatGameDateShort = (tick: number): string => {
  const date = dateAtTick(tick);
  return `${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)}`;
};

/** Fraction of the year elapsed, for positions on the rail. */
export const progressAtTick = (tick: number): number =>
  Math.min(1, Math.max(0, tick / TOTAL_TICKS));

/** Month boundaries as rail positions, for the engraved scale. */
export const MONTH_TICKS: readonly { tick: number; label: string }[] = (() => {
  const marks: { tick: number; label: string }[] = [];
  let lastMonth = START_DATE.getMonth();
  for (let tick = 0; tick <= TOTAL_TICKS; tick += TICKS_PER_DAY) {
    const month = dateAtTick(tick).getMonth();
    if (month !== lastMonth) {
      marks.push({ tick, label: MONTHS[month].slice(0, 3).toUpperCase() });
      lastMonth = month;
    }
  }
  return marks;
})();

/** Real seconds remaining, which is also ticks remaining. */
export const ticksRemaining = (tick: number): number =>
  Math.max(0, TOTAL_TICKS - tick);

import { TICKS_PER_DAY } from "./constants";
import type { Modifier } from "./types";

export interface EventChoice {
  readonly id: string;
  readonly label: string;
  /** Share of the material budget this costs, if any. */
  readonly costShare?: number;
  readonly outcome: string;
  readonly modifiers: readonly Omit<Modifier, "untilTick">[];
  /** Days the modifiers last. */
  readonly durationDays: number;
}

export interface CalendarEvent {
  readonly id: string;
  /** Days after Boxing Day. */
  readonly day: number;
  readonly title: string;
  readonly body: string;
  readonly choices: readonly EventChoice[];
}

const mod = (
  target: Modifier["target"],
  multiplier: number,
  label: string,
  key: string,
): Omit<Modifier, "untilTick"> => ({ key, target, multiplier, label });

/**
 * The original's year was wallpaper — 364 days of identical ticks behind a date
 * that changed. These put beats on it, each with a decision that costs
 * something real.
 */
export const CALENDAR_EVENTS: readonly CalendarEvent[] = [
  {
    id: "pay-dispute",
    day: 48,
    title: "The elves want their back pay",
    body: "They walked out once already. A delegation is at the workshop door with a figure in mind, and the year is long.",
    choices: [
      {
        id: "pay",
        label: "Settle up",
        costShare: 0.2,
        outcome: "Settled. The workshop is louder than it has been in a year.",
        modifiers: [mod("output", 1.25, "Elves settled", "pay-dispute")],
        durationDays: 70,
      },
      {
        id: "refuse",
        label: "Ask them to wait",
        outcome:
          "They stayed, but the benches are quiet and the tea breaks are long.",
        modifiers: [mod("output", 0.75, "Elves aggrieved", "pay-dispute")],
        durationDays: 45,
      },
    ],
  },
  {
    id: "thaw",
    day: 104,
    title: "The spring thaw reaches the store room",
    body: "Meltwater is under the door and rising. Whatever is on the floor is going to be wet by morning.",
    choices: [
      {
        id: "sandbag",
        label: "Sandbag the doors",
        costShare: 0.15,
        outcome: "The water stopped at the threshold. Nothing was lost.",
        modifiers: [],
        durationDays: 0,
      },
      {
        id: "accept",
        label: "Let it come",
        outcome:
          "A tenth of the store was ruined, and the sleigh took a beating.",
        modifiers: [
          mod("capacityGrowth", 0.85, "Sleigh water-damaged", "thaw"),
        ],
        durationDays: 30,
      },
    ],
  },
  {
    id: "heatwave",
    day: 168,
    title: "A heatwave at the Pole",
    body: "It is nineteen degrees outside and the workshop has no windows that open. The elves are wilting over the benches.",
    choices: [
      {
        id: "ice",
        label: "Send for ice",
        costShare: 0.18,
        outcome: "Ice all round. Work carried on much as before.",
        modifiers: [],
        durationDays: 0,
      },
      {
        id: "endure",
        label: "Press on",
        outcome: "They pressed on, slowly, for most of the summer.",
        modifiers: [mod("output", 0.7, "Heatwave", "heatwave")],
        durationDays: 50,
      },
    ],
  },
  {
    id: "timber",
    day: 232,
    title: "The timber merchant puts up their prices",
    body: "Word is that every workshop north of the circle is buying at once. A year's stock, at today's price, or take the increase.",
    choices: [
      {
        id: "bulk",
        label: "Buy the year's stock",
        costShare: 0.3,
        outcome: "The yard is full of pine and nothing costs a penny more.",
        modifiers: [],
        durationDays: 0,
      },
      {
        id: "pay-more",
        label: "Buy as you go",
        outcome: "Everything is dearer until the autumn.",
        modifiers: [mod("cost", 1.3, "Timber prices up", "timber")],
        durationDays: 55,
      },
    ],
  },
  {
    id: "flu",
    day: 302,
    title: "Something is going round the paddock",
    body: "Blitzen would not get up this morning, and two of the others are off their feed.",
    choices: [
      {
        id: "vet",
        label: "Call the vet out",
        costShare: 0.22,
        outcome: "Seen to within the week. The herd is training again.",
        modifiers: [],
        durationDays: 0,
      },
      {
        id: "rest",
        label: "Rest the herd",
        outcome:
          "They recovered in their own time, and lost condition doing it.",
        modifiers: [mod("powerGrowth", 0.5, "Herd unwell", "flu")],
        durationDays: 40,
      },
    ],
  },
  {
    id: "december",
    day: 340,
    title: "December",
    body: "Nobody needs telling. The lamps are on before four and nobody has gone home before ten all week.",
    choices: [
      {
        id: "acknowledge",
        label: "Get to work",
        outcome: "The last push is on.",
        modifiers: [mod("output", 1.6, "December crunch", "december")],
        durationDays: 24,
      },
    ],
  },
];

export const eventTick = (event: CalendarEvent): number =>
  event.day * TICKS_PER_DAY;

export const eventById = (id: string): CalendarEvent | undefined =>
  CALENDAR_EVENTS.find((event) => event.id === id);

export const eventDueAt = (tick: number): CalendarEvent | undefined =>
  CALENDAR_EVENTS.find((event) => eventTick(event) === tick);

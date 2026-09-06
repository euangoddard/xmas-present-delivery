# One year to save Christmas

An interactive Christmas card. You have from Boxing Day 2025 to Christmas Day
2026 — one real second to the half-day, so **twelve minutes and eight
seconds** — to rebuild Father Christmas's workshop, sleigh and herd.

A Qwik SPA with Tailwind 4, built to the static adapter. No backend; the only
persistence is the browser's own storage.

```bash
npm install
npm run dev        # http://localhost:5173
npm run test       # 44 acceptance tests against the game model
npm run build      # static site in dist/
```

## What this is a rebuild of

The 2014 Christmas card was an AngularJS idle game with the same premise. It was
reverse-engineered into a technology-agnostic specification, and that
specification found three structural faults which this implementation fixes.

### The faults, and what was done about them

**Two of the three objectives never bound.** In the original, a competent run
met the reindeer-power target on game-day 108 and the sleigh-capacity target on
day 132, while presents only arrived on day 250. For 118 days — nearly half the
game — two objectives were satisfied by factors of a million and the game was a
single-resource race presented as three.

Sleigh capacity is now a **hard ceiling on the present stockpile**. Presents you
have nowhere to put are left behind for good, and the interface says so as it
happens. Neglect the sleigh and you lose score every single day; a simulated
player who ignores it loses the game outright.

**The winning move was to stop playing.** Presents were simultaneously the
currency and the score, so every purchase spent the thing being measured and the
optimal line was to build multipliers for 250 ticks and then stop buying.

Production now credits two separate counters: **presents** (the score, which
never decreases) and **materials** (the budget, which purchases spend). Every
present made also pays for one material's worth of buying. Investing no longer
costs you the game.

**The difficulty setting was decorative.** Endgame growth was exponential, so the
40% spread between the easiest and hardest targets was worth about four
game-days. It now spans roughly fifty, because a fussier Father Christmas
rejects more work and the workshop runs slower as well as needing more.

Also fixed, each of which the original shipped: a tick loop that lost game-days
whenever the tab was backgrounded; compounding upgrades sold to players against
a resource of zero, where they could never do anything; no baseline income, so a
player who did not click sat at zero for twelve minutes; difficulty labels that
read backwards; and an interface that showed three totals and not one rate.

## Design

The year is the thing the original never showed, so it is the spine of the
screen: a **year rail** across the top, engraved by month, carrying the
playhead, the milestones where each objective was met, the events already
answered, the projected finish and the ghost of your best run. The three
resources read against that same scale.

Firebrick `#b22222` is inherited from the 2014 card and demoted to the accent of
_action_ — the make button, the playhead, the alert. Spruce carries capacity and
confirmation, brass carries power and achievement, and the neutrals are biased
green-cyan so they read as frost and enamel. Bricolage Grotesque sets the
display, Source Serif 4 the narrative, IBM Plex Mono every number. Light and
dark are both designed, with an explicit override.

## The economy

| Item               | Base cost | When        | Effect                        |
| ------------------ | --------- | ----------- | ----------------------------- |
| Elf                | 20        | per tick    | +50 presents                  |
| Santa upgrade      | 100       | per click   | click makes `5 × 1.1ⁿ`        |
| Reindeer           | 500       | on purchase | +10,000 power                 |
| Sleigh upgrade     | 1,200     | on purchase | +75,000 capacity              |
| Reindeer trainer   | 9,000     | per tick    | power `× growth(n, 0.003)`    |
| Sleigh mechanic    | 10,000    | per tick    | capacity `× growth(n, 0.004)` |
| Present duplicator | 30,000    | per tick    | presents `× growth(n, 0.007)` |

```
cost(n)        = floor(base × 1.15ⁿ)
growth(n, u)   = n > 0 ? 1 + u × 2 × (1 + ln n) : 1
```

Compounding rates rise with the _logarithm_ of the number owned while prices
rise geometrically; that pairing is what stops the curve running away. A
multiplier is locked, not sold, while the resource it acts on is zero.

These numbers come from a balance sweep, not from taste. A competent run lands
on game-day 250 on Kind, 270 on Fair and 290 on Exacting, with the objectives
completing within about 25 game-days of one another. `npm run test` asserts the
window, that a player who never clicks can still win, and that Exacting is
meaningfully harder than Kind.

## Also in

- **The run is saved.** A refresh no longer destroys twelve minutes of play.
- **Six calendar events** with decisions that cost real materials — a February
  pay dispute, a spring thaw, a heatwave, a timber shortage, sick reindeer, and
  December. The clock is held while one is open.
- **Rates everywhere**: presents, capacity and power per day, a live projected
  finishing date, and each purchase's effect on that date before you buy it.
- **Nine named reindeer**, in order, before they go back to being a counter.
- **Race your own ghost** — your best finish is drawn on the rail as you play.
- **A card you can send on**, on winning or losing.

## Deliberately not in

- **E-2 as an alternative economy.** The specification offered a separate
  currency _or_ a capacity ceiling; a balance sweep showed the ceiling alone did
  not remove the "stop playing to win" exploit, so both were implemented
  together instead of choosing.
- **Offline progress.** A twelve-minute game credited for time away would be
  trivial. A resumed run picks up exactly where it stopped.
- **A played Christmas Eve delivery** and **prestige carry-over** — the two
  optional items at the bottom of the specification's ranking.

## Layout

```
src/
  game/                pure model, no interface, fully testable
    constants.ts       the tuned numbers and the difficulty settings
    formulas.ts        cost, compounding, clamping, number words
    calendar.ts        tick ↔ date, the month scale
    upgrades.ts        the catalogue
    events.ts          the six calendar events
    engine.ts          step / click / buy / rates / projection
    storage.ts         saved run, best finishes, theme
    acceptance.test.ts 44 assertions, run by npm run test
  components/game/     year rail, resource tracks, workshop, catalogue,
                       status bar, event dialog, setup, end card, snow
  routes/index.tsx     the clock and the phase orchestration
```

The clock is derived from wall-clock time against an anchor rather than counted
in frames, so a throttled or hidden tab catches up the moment it comes back.

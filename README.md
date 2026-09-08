# Classroom Schedule

A period timer for a classroom projector. Pick your school's bell schedule, name
your periods once, and the screen shows what is happening now and how much time
is left in it.

No build step, no dependencies, no server — open `index.html` or host the folder
anywhere static (GitHub Pages works as-is).

## How it works

1. **Choose a bell schedule.** Six are built in (see below).
2. **Name your periods.** One text field per teaching block — "Algebra I",
   "ELA / Morning Meeting", whatever you call it. Blank fields keep the default
   name. Recess and lunch are fixed.
3. **Watch the clock.** The live screen shows the current period, a countdown to
   the bell, a progress bar, what is next, and the whole day at a glance.

Your choice and your period names are saved in `localStorage`, so the site comes
straight back to the live screen next time. It is per-device and per-browser —
nothing leaves the machine. **Edit periods** changes the names; **Change
schedule** clears the save and starts over.

## Built-in schedules

**Elementary — 2025-2026 grade-level daily instructional schedules, regular
dismissal:**

| Schedule | Day | Blocks |
| --- | --- | --- |
| TK–Kindergarten | 8:00 – 1:05 | 90 / 40 / 126 min instruction |
| 1st–2nd Grade | 8:00 – 2:05 | 115 / 58 / 143 min instruction |
| 3rd–4th Grade | 8:00 – 2:05 | 115 / 96 / 105 min instruction |
| 5th–6th Grade | 8:00 – 2:05 | 135 / 114 / 67 min instruction |

Each has a 15-minute recess, a 17-minute lunch, and a second 17-minute recess.

**Secondary:**

| Schedule | Day | Blocks |
| --- | --- | --- |
| High School — 2026-27 | 7:45 – 3:05 | Hours 1–4, Advisory, Hour 5 (90 min block), Hours 6–7 |
| Warren Middle School | 7:45 – 3:05 | 8 hours |

The high school schedule has three lunches inside the Hour 5 block. You pick
yours during setup, and Hour 5 is split around it — with Lunch 2 you get Hour 5
in two pieces (11:51–12:21 and 12:51–1:21) that share one name.

Gaps between periods are shown as passing periods automatically.

> **Note on Hour 1.** The published 2026-27 graphic prints Hour 1 as
> "7:45 – 9:32". That is a typo: every other hour is 47 minutes with 5 minutes
> of passing time, and Hour 2 starts at 8:37. This app uses **7:45 – 8:32**.

## Adding or changing a schedule

Everything lives in [`schedules.js`](schedules.js). Add an entry to `SCHEDULES`:

```js
{
  id: 'my-school',                 // unique, and stable — it is the saved key
  group: 'Secondary',              // heading on the chooser screen
  name: 'My School',
  subtitle: '6 periods, 8:15 – 3:20',
  periods: [
    { id: 'p1', name: 'Period 1', kind: 'class', start: '08:15', end: '09:10' },
    { id: 'l',  name: 'Lunch',    kind: 'break', start: '11:30', end: '12:05' }
  ]
}
```

Times are 24-hour `"HH:MM"`. `kind: 'class'` gets a name field on the setup
screen; `kind: 'break'` does not. Periods may be listed in any order — they are
sorted by start time. For a lunch that splits a block, copy the `lunchOptions` /
`lunchBlock` pattern from the high school entry.

## Checking the display at another time of day

Add `?t=HH:MM` (24-hour) to the URL to start the clock at that time and run
forward in real time — handy for seeing what 2:04 PM looks like at 9 in the
morning.

```
index.html?t=14:04
```

## Files

| File | What it holds |
| --- | --- |
| `index.html` | The three screens: choose, setup, live |
| `schedules.js` | Bell schedule data and the lunch-splitting logic |
| `app.js` | Storage, the clock, and rendering |
| `styles.css` | Styling, including a dark mode that follows the OS |

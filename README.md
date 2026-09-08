# Classroom Schedule

A period timer for a classroom TV. Pick your school's bell schedule, name your
periods once, and the screen shows what is happening now, how much time is left
in it, and rings a warning alarm before each period ends.

No build step, no dependencies, no network — open `index.html` or host the folder
anywhere static (GitHub Pages works as-is). The alarm sounds are generated in the
browser, so nothing has to load for the bell to ring.

## How it works

1. **Choose a bell schedule.** Six are built in (see below).
2. **Name your periods and pick an alarm.** One text field per teaching block —
   "Algebra I", "ELA / Morning Meeting", whatever you call it. Blank fields keep
   the default name; recess and lunch are fixed. Then choose a warning sound,
   how early it rings, and how loud.
3. **Watch the clock.** The live screen shows the current period, a countdown to
   the bell, a progress bar, what is next, and the whole day at a glance.

## The warning alarm

Five minutes before each teaching period ends, the alarm rings once and the
countdown turns red — enough warning to start wrapping up. Recess, lunch, and
passing periods do not trigger it.

Seven sounds are built in, each previewable on the setup screen:

| Sound | Character |
| --- | --- |
| Chime | Three soft bell tones. Carries without startling anyone. |
| School bell | The classic ring. Loud and unmistakable across a room. |
| Marimba | Warm wooden mallets walking up a scale. |
| Digital beeps | Four crisp electronic tones. Cuts through noise. |
| Gentle rise | A quiet two-note swell. Good for a calm room or a test. |
| Low gong | One deep, long note. The least jarring option. |
| Triple tap | Three short wood-block knocks. Brief and easy to ignore. |

The lead time can be 1, 2, 3, 5, or 10 minutes; volume is a slider. **Mute** on
the live screen silences it without losing the settings.

It rings on the tick that crosses the line, so it fires once per period — and
loading the page in the middle of a period that is already inside the warning
window stays silent rather than ringing late.

### If the alarm stays quiet

Browsers refuse to play audio until someone interacts with the page, so a TV
that reloaded overnight starts muted. When that happens the live screen shows a
**Turn on sound** bar — one click (or any button press on the remote) is enough,
and the alarm then works for the rest of the session. Pressing **Save & start**
during setup already counts, so a normal run-through never hits this.

## Look and feel

The colours and lettering follow the printed 2026-27 bell schedule: pioneer
blue (`#2e76c0`) and the mascot's navy (`#08407f`) on white, heavy italic
display type, and times set in light blue blocks (`#d8e8f8`). The Pioneer
appears as the header crest, as the browser-tab icon, and watermarked into the
corner of the countdown card. A dark theme built on the same navy takes over
when the device asks for one.

Type is [Nunito](https://fonts.google.com/specimen/Nunito) (SIL Open Font
License — see [`fonts/OFL.txt`](fonts/OFL.txt)), bundled in `fonts/` rather than
loaded from a CDN so the page renders correctly on a TV with no network. Its
digits are fixed-width, so the countdown does not jitter as it ticks.

To re-theme, change the custom properties at the top of
[`styles.css`](styles.css) — `--accent`, `--accent-deep`, `--accent-soft`,
`--surface-2` — and swap `pioneer.png` and `pioneer-icon.png`.

## Putting it on a TV

The live screen is built for a 10-foot read: at 1080p the countdown is about 220
pixels tall, and the layout puts the day's schedule in a column beside it. It
sizes itself from the viewport, so 720p, 1080p, a projector, or a phone all work
without settings.

- **Full screen** hides the browser chrome. `F` does the same from a keyboard or
  a remote with a keyboard.
- The page asks for a screen wake lock so the TV does not sleep on it. That
  needs a real `http(s)` origin — it is ignored when opened as a `file://` URL.
- Edges are padded well inside the frame so nothing lands in a TV's overscan.
- The schedule column scrolls itself and keeps the current period centred, so a
  long day needs no attention.
- Everything is reachable with a remote's D-pad; focused controls get a heavy
  outline.

### Teacher controls

During class the only button on screen is **Full screen**. Mute, Edit and
Change schedule are hidden, so a student looking at the board sees a clock and
nothing to press.

**To bring them up, press and hold the Pioneer crest in the top-left corner for
about a second and a half.** A tap does nothing, and sliding off the crest
mid-press cancels — it takes a deliberate hold. The crest dips slightly while
you hold it so you know it registered. Hold it again, press **Hide**, or press
`Escape` to put them away; they also hide themselves after 25 seconds of not
being touched, and any time the live screen reloads.

`T` does the same thing from a keyboard, which is the route to use from a TV
remote with a keyboard attached. On a remote with only a D-pad, focus the crest
and hold `OK`.

Which alarm sound is set only shows while the controls are open — but **Alarm
muted** stays on the header the whole time, so a muted alarm can't quietly stay
off for a week. **Change schedule** asks for confirmation first, since it clears
your period names.

To move the hidden press somewhere else, change what `#crest-key` is attached to
in [`app.js`](app.js); to make it longer or shorter, change `HOLD_MS`.

### Keyboard shortcuts

| Key | Does |
| --- | --- |
| `F` | Toggle full screen |
| `M` | Mute or unmute the alarm |
| `T` | Show or hide the teacher controls |
| `Escape` | Hide the teacher controls |

Your schedule, period names, and alarm settings are saved in `localStorage`, so
the site comes straight back to the live screen next time. It is per-device and per-browser —
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
| `sounds.js` | The alarm sounds, synthesized with the Web Audio API |
| `app.js` | Storage, the clock, the alarm trigger, and rendering |
| `styles.css` | Styling, including a dark mode that follows the OS |
| `pioneer.png` | The Pioneer crest and countdown-card watermark |
| `pioneer-icon.png` | Browser-tab icon |
| `fonts/` | Nunito, self-hosted, with its licence |

## Adding an alarm sound

Add an entry to `SOUNDS` in [`sounds.js`](sounds.js). Each one schedules its own
notes and returns how long it runs, in seconds:

```js
{
  id: 'two-tone',
  name: 'Two tone',
  description: 'Shown under the name on the setup screen.',
  play: function (out, at) {
    note(out, { at: at,        freq: 660, dur: 0.4, gain: 0.5, type: 'sine' });
    note(out, { at: at + 0.35, freq: 880, dur: 0.6, gain: 0.5, type: 'sine' });
    return 1.0;
  }
}
```

`note()` and `bell()` are the helpers above it. Keep peaks under about 0.7 so the
sound does not clip at full volume.

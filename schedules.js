/* Bell schedule definitions.
 *
 * Times are 24-hour "HH:MM" so they are unambiguous. Each schedule lists its
 * periods in order; gaps between one period's end and the next one's start are
 * rendered as passing periods automatically.
 *
 * kind: "class"  -> teacher can name it (shows an input on the setup screen)
 *       "break"  -> recess / lunch / advisory, name is fixed
 */

const SCHEDULES = [
  {
    id: 'fresno-tk-k',
    group: 'Elementary — 2025-2026 Regular Dismissal',
    name: 'TK–Kindergarten',
    subtitle: '8:00 – 1:05',
    periods: [
      { id: 'i1', name: 'Instruction 1', kind: 'class', start: '08:00', end: '09:30' },
      { id: 'r1', name: 'Recess',        kind: 'break', start: '09:30', end: '09:45' },
      { id: 'i2', name: 'Instruction 2', kind: 'class', start: '09:45', end: '10:25' },
      { id: 'l',  name: 'Lunch',         kind: 'break', start: '10:25', end: '10:42' },
      { id: 'r2', name: 'Recess',        kind: 'break', start: '10:42', end: '10:59' },
      { id: 'i3', name: 'Instruction 3', kind: 'class', start: '10:59', end: '13:05' }
    ]
  },
  {
    id: 'fresno-1-2',
    group: 'Elementary — 2025-2026 Regular Dismissal',
    name: '1st–2nd Grade',
    subtitle: '8:00 – 2:05',
    periods: [
      { id: 'i1', name: 'Instruction 1', kind: 'class', start: '08:00', end: '09:55' },
      { id: 'r1', name: 'Recess',        kind: 'break', start: '09:55', end: '10:10' },
      { id: 'i2', name: 'Instruction 2', kind: 'class', start: '10:10', end: '11:08' },
      { id: 'l',  name: 'Lunch',         kind: 'break', start: '11:08', end: '11:25' },
      { id: 'r2', name: 'Recess',        kind: 'break', start: '11:25', end: '11:42' },
      { id: 'i3', name: 'Instruction 3', kind: 'class', start: '11:42', end: '14:05' }
    ]
  },
  {
    id: 'fresno-3-4',
    group: 'Elementary — 2025-2026 Regular Dismissal',
    name: '3rd–4th Grade',
    subtitle: '8:00 – 2:05',
    periods: [
      { id: 'i1', name: 'Instruction 1', kind: 'class', start: '08:00', end: '09:55' },
      { id: 'r1', name: 'Recess',        kind: 'break', start: '09:55', end: '10:10' },
      { id: 'i2', name: 'Instruction 2', kind: 'class', start: '10:10', end: '11:46' },
      { id: 'l',  name: 'Lunch',         kind: 'break', start: '11:46', end: '12:03' },
      { id: 'r2', name: 'Recess',        kind: 'break', start: '12:03', end: '12:20' },
      { id: 'i3', name: 'Instruction 3', kind: 'class', start: '12:20', end: '14:05' }
    ]
  },
  {
    id: 'fresno-5-6',
    group: 'Elementary — 2025-2026 Regular Dismissal',
    name: '5th–6th Grade',
    subtitle: '8:00 – 2:05',
    periods: [
      { id: 'i1', name: 'Instruction 1', kind: 'class', start: '08:00', end: '10:15' },
      { id: 'r1', name: 'Recess',        kind: 'break', start: '10:15', end: '10:30' },
      { id: 'i2', name: 'Instruction 2', kind: 'class', start: '10:30', end: '12:24' },
      { id: 'l',  name: 'Lunch',         kind: 'break', start: '12:24', end: '12:41' },
      { id: 'r2', name: 'Recess',        kind: 'break', start: '12:41', end: '12:58' },
      { id: 'i3', name: 'Instruction 3', kind: 'class', start: '12:58', end: '14:05' }
    ]
  },
  {
    id: 'lhs-2026-27',
    group: 'Secondary',
    name: 'High School — 2026-27',
    subtitle: '7 hours + advisory, 7:45 – 3:05',
    // Hour 5 is a 90-minute block split around whichever lunch you are assigned.
    lunchOptions: [
      { id: 'lunch1', label: 'Lunch 1 (11:51 – 12:21)', start: '11:51', end: '12:21' },
      { id: 'lunch2', label: 'Lunch 2 (12:21 – 12:51)', start: '12:21', end: '12:51' },
      { id: 'lunch3', label: 'Lunch 3 (12:51 – 1:21)',  start: '12:51', end: '13:21' }
    ],
    lunchBlock: { id: 'h5', name: 'Hour 5', start: '11:51', end: '13:21' },
    periods: [
      { id: 'h1',  name: 'Hour 1',   kind: 'class', start: '07:45', end: '08:32' },
      { id: 'h2',  name: 'Hour 2',   kind: 'class', start: '08:37', end: '09:24' },
      { id: 'h3',  name: 'Hour 3',   kind: 'class', start: '09:29', end: '10:16' },
      { id: 'h4',  name: 'Hour 4',   kind: 'class', start: '10:21', end: '11:08' },
      { id: 'adv', name: 'Advisory', kind: 'class', start: '11:13', end: '11:46' },
      { id: 'h6',  name: 'Hour 6',   kind: 'class', start: '13:26', end: '14:13' },
      { id: 'h7',  name: 'Hour 7',   kind: 'class', start: '14:18', end: '15:05' }
    ]
  },
  {
    id: 'warren-ms',
    group: 'Secondary',
    name: 'Warren Middle School',
    subtitle: '8 hours, 7:45 – 3:05',
    periods: [
      { id: 'h1', name: '1st Hour', kind: 'class', start: '07:45', end: '08:40' },
      { id: 'h2', name: '2nd Hour', kind: 'class', start: '08:44', end: '09:35' },
      { id: 'h3', name: '3rd Hour', kind: 'class', start: '09:39', end: '10:30' },
      { id: 'h4', name: '4th Hour', kind: 'class', start: '10:34', end: '11:25' },
      { id: 'h5', name: '5th Hour', kind: 'class', start: '11:29', end: '12:20' },
      { id: 'h6', name: '6th Hour', kind: 'class', start: '12:24', end: '13:15' },
      { id: 'h7', name: '7th Hour', kind: 'class', start: '13:19', end: '14:10' },
      { id: 'h8', name: '8th Hour', kind: 'class', start: '14:14', end: '15:05' }
    ]
  }
];

/* Returns the full ordered period list for a schedule, expanding the Hour 5 /
 * lunch block for schedules that have one. */
function buildPeriods(schedule, lunchId) {
  const periods = schedule.periods.map((p) => ({ ...p }));

  if (schedule.lunchOptions) {
    const lunch =
      schedule.lunchOptions.find((l) => l.id === lunchId) || schedule.lunchOptions[0];
    const block = schedule.lunchBlock;

    periods.push({
      id: lunch.id,
      name: 'Lunch',
      kind: 'break',
      start: lunch.start,
      end: lunch.end
    });
    if (lunch.start > block.start) {
      periods.push({
        id: block.id + 'a',
        name: block.name,
        kind: 'class',
        labelKey: block.id,
        start: block.start,
        end: lunch.start
      });
    }
    if (lunch.end < block.end) {
      periods.push({
        id: block.id + 'b',
        name: block.name,
        kind: 'class',
        labelKey: block.id,
        start: lunch.end,
        end: block.end
      });
    }
  }

  periods.sort((a, b) => (a.start < b.start ? -1 : 1));
  return periods;
}

/* Classroom Schedule — pick a bell schedule, name your periods, watch the clock.
 * Everything is kept in localStorage on this device; there is no server. */

(function () {
  'use strict';

  var STORAGE_KEY = 'classroom-schedule.v1';

  var el = {
    screens: {
      choose: document.getElementById('screen-choose'),
      setup: document.getElementById('screen-setup'),
      live: document.getElementById('screen-live')
    },
    groups: document.getElementById('schedule-groups'),
    setupTitle: document.getElementById('setup-title'),
    setupForm: document.getElementById('setup-form'),
    periodInputs: document.getElementById('period-inputs'),
    lunchPicker: document.getElementById('lunch-picker'),
    lunchOptions: document.getElementById('lunch-options'),
    liveName: document.getElementById('live-schedule-name'),
    clock: document.getElementById('live-clock'),
    now: document.querySelector('.now'),
    nowStatus: document.getElementById('now-status'),
    nowLabel: document.getElementById('now-label'),
    nowSub: document.getElementById('now-sub'),
    nowRemaining: document.getElementById('now-remaining'),
    nowRemainingLabel: document.getElementById('now-remaining-label'),
    nowProgress: document.getElementById('now-progress'),
    nowNext: document.getElementById('now-next'),
    dayList: document.getElementById('day-list')
  };

  var state = load();
  var draft = null;   // { scheduleId, lunchId } while on the setup screen
  var ticker = null;

  /* --- storage ----------------------------------------------------------- */

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !findSchedule(parsed.scheduleId)) return null;
      parsed.labels = parsed.labels || {};
      return parsed;
    } catch (err) {
      return null;
    }
  }

  function save(next) {
    state = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      /* private browsing or a full quota — the app still works for this visit */
    }
  }

  function clearSaved() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (err) { /* ignore */ }
    state = null;
  }

  /* --- time helpers ------------------------------------------------------ */

  function toMinutes(hhmm) {
    var bits = hhmm.split(':');
    return parseInt(bits[0], 10) * 60 + parseInt(bits[1], 10);
  }

  function formatTime(hhmm) {
    var mins = toMinutes(hhmm);
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    var suffix = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + String(m).padStart(2, '0') + ' ' + suffix;
  }

  function formatRange(period) {
    return formatTime(period.start) + ' – ' + formatTime(period.end);
  }

  function formatLength(period) {
    var mins = toMinutes(period.end) - toMinutes(period.start);
    return mins + ' min';
  }

  function formatCountdown(seconds) {
    var s = Math.max(0, Math.ceil(seconds));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (h > 0) {
      return h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    }
    return m + ':' + String(sec).padStart(2, '0');
  }

  /* Seconds since midnight. `?t=13:05` pins the start of the clock so the live
   * view can be checked at any point in the day; it then runs in real time. */
  var override = (function () {
    var match = /[?&]t=(\d{1,2}):(\d{2})/.exec(window.location.search);
    if (!match) return null;
    return {
      base: parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60,
      from: Date.now()
    };
  })();

  function secondsNow() {
    if (override) {
      return override.base + (Date.now() - override.from) / 1000;
    }
    var d = new Date();
    return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  }

  function clockNow() {
    var total = Math.floor(secondsNow());
    var h = Math.floor(total / 3600) % 24;
    var m = Math.floor(total / 60) % 60;
    var suffix = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + String(m).padStart(2, '0') + ' ' + suffix;
  }

  /* --- schedule helpers -------------------------------------------------- */

  function findSchedule(id) {
    for (var i = 0; i < SCHEDULES.length; i++) {
      if (SCHEDULES[i].id === id) return SCHEDULES[i];
    }
    return null;
  }

  function labelKey(period) {
    return period.labelKey || period.id;
  }

  function labelFor(period, labels) {
    var custom = labels && labels[labelKey(period)];
    return custom && custom.trim() ? custom.trim() : period.name;
  }

  /* Periods plus the gaps between them, as one ordered list. */
  function buildTimeline(schedule, lunchId) {
    var periods = buildPeriods(schedule, lunchId);
    var timeline = [];
    for (var i = 0; i < periods.length; i++) {
      if (i > 0) {
        var gap = toMinutes(periods[i].start) - toMinutes(periods[i - 1].end);
        if (gap > 0) {
          timeline.push({
            id: 'gap-' + i,
            name: 'Passing period',
            kind: 'passing',
            start: periods[i - 1].end,
            end: periods[i].start
          });
        }
      }
      timeline.push(periods[i]);
    }
    return timeline;
  }

  /* --- screens ----------------------------------------------------------- */

  function show(which) {
    Object.keys(el.screens).forEach(function (key) {
      el.screens[key].hidden = key !== which;
    });
    if (ticker) { clearInterval(ticker); ticker = null; }
    if (which === 'live') {
      tick();
      ticker = setInterval(tick, 1000);
    }
    window.scrollTo(0, 0);
  }

  /* 1. Choose ------------------------------------------------------------- */

  function renderChoose() {
    var groups = [];
    SCHEDULES.forEach(function (schedule) {
      var group = groups.filter(function (g) { return g.name === schedule.group; })[0];
      if (!group) {
        group = { name: schedule.group, items: [] };
        groups.push(group);
      }
      group.items.push(schedule);
    });

    el.groups.innerHTML = '';
    groups.forEach(function (group) {
      var section = document.createElement('section');
      section.className = 'group';

      var heading = document.createElement('h2');
      heading.className = 'group-name';
      heading.textContent = group.name;
      section.appendChild(heading);

      var grid = document.createElement('div');
      grid.className = 'grid';

      group.items.forEach(function (schedule) {
        var periods = buildPeriods(schedule, null);
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'schedule-card';
        card.dataset.scheduleId = schedule.id;

        var name = document.createElement('div');
        name.className = 'name';
        name.textContent = schedule.name;

        var subtitle = document.createElement('div');
        subtitle.className = 'subtitle';
        subtitle.textContent = schedule.subtitle;

        var times = document.createElement('div');
        times.className = 'times';
        var blocks = periods.filter(function (p) { return p.kind === 'class'; }).length;
        var breaks = periods.filter(function (p) { return p.kind === 'break'; }).length;
        times.textContent = blocks + ' teaching blocks · ' + breaks + ' breaks';

        card.appendChild(name);
        card.appendChild(subtitle);
        card.appendChild(times);
        card.addEventListener('click', function () { startSetup(schedule.id); });
        grid.appendChild(card);
      });

      section.appendChild(grid);
      el.groups.appendChild(section);
    });
  }

  /* 2. Setup -------------------------------------------------------------- */

  function startSetup(scheduleId) {
    var existing = state && state.scheduleId === scheduleId ? state : null;
    draft = {
      scheduleId: scheduleId,
      lunchId: existing ? existing.lunchId : null
    };
    renderSetup();
    show('setup');
  }

  function renderSetup() {
    var schedule = findSchedule(draft.scheduleId);
    el.setupTitle.textContent = schedule.name;

    // Lunch choice, for schedules whose lunch splits a block.
    if (schedule.lunchOptions) {
      if (!draft.lunchId) draft.lunchId = schedule.lunchOptions[0].id;
      el.lunchPicker.hidden = false;
      el.lunchOptions.innerHTML = '';
      schedule.lunchOptions.forEach(function (option) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'lunch-option';
        button.textContent = option.label;
        button.setAttribute('aria-pressed', String(option.id === draft.lunchId));
        button.addEventListener('click', function () {
          draft.lunchId = option.id;
          renderSetup();
        });
        el.lunchOptions.appendChild(button);
      });
    } else {
      draft.lunchId = null;
      el.lunchPicker.hidden = true;
    }

    // One input per named period. A split block (Hour 5) shares a single input.
    var labels = state && state.scheduleId === draft.scheduleId ? state.labels : {};
    var seen = {};
    el.periodInputs.innerHTML = '';

    buildPeriods(schedule, draft.lunchId).forEach(function (period) {
      var key = labelKey(period);
      var row = document.createElement('div');
      row.className = 'field' + (period.kind === 'break' ? ' is-break' : '');

      var name = document.createElement('div');
      var nameText = document.createElement('div');
      nameText.className = 'field-name';
      nameText.textContent = period.name;
      var timeText = document.createElement('div');
      timeText.className = 'field-time';
      timeText.textContent = formatRange(period);
      name.appendChild(nameText);
      name.appendChild(timeText);
      row.appendChild(name);

      if (period.kind === 'break' || seen[key]) {
        var note = document.createElement('div');
        note.className = 'field-time';
        note.textContent = period.kind === 'break'
          ? formatLength(period)
          : 'Same class as above · ' + formatLength(period);
        row.appendChild(note);
      } else {
        var input = document.createElement('input');
        input.type = 'text';
        input.name = key;
        input.maxLength = 60;
        input.placeholder = 'e.g. Algebra I';
        input.value = labels[key] || '';
        input.setAttribute('aria-label', period.name);
        row.appendChild(input);
      }

      seen[key] = true;
      el.periodInputs.appendChild(row);
    });
  }

  el.setupForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var labels = {};
    Array.prototype.forEach.call(el.setupForm.querySelectorAll('input[type="text"]'),
      function (input) {
        if (input.value.trim()) labels[input.name] = input.value.trim();
      });
    save({ scheduleId: draft.scheduleId, lunchId: draft.lunchId, labels: labels });
    show('live');
  });

  /* 3. Live --------------------------------------------------------------- */

  function tick() {
    if (!state) { show('choose'); return; }

    var schedule = findSchedule(state.scheduleId);
    var timeline = buildTimeline(schedule, state.lunchId);
    var seconds = secondsNow();

    el.liveName.textContent = schedule.name;
    el.clock.textContent = clockNow();

    var current = null;
    var next = null;
    for (var i = 0; i < timeline.length; i++) {
      var startsAt = toMinutes(timeline[i].start) * 60;
      var endsAt = toMinutes(timeline[i].end) * 60;
      if (seconds >= startsAt && seconds < endsAt) { current = timeline[i]; }
      // "Next" always names a real period — a passing period is not news.
      if (!next && seconds < startsAt && timeline[i].kind !== 'passing') {
        next = timeline[i];
      }
    }

    renderNow(current, next, seconds, timeline);
    renderDay(timeline, seconds);
  }

  function renderNow(current, next, seconds, timeline) {
    var isBreak = current && (current.kind === 'break' || current.kind === 'passing');
    el.now.classList.toggle('is-break', !!isBreak);
    el.now.classList.toggle('is-idle', !current);

    if (current) {
      var startsAt = toMinutes(current.start) * 60;
      var endsAt = toMinutes(current.end) * 60;
      var label = current.kind === 'passing'
        ? 'Passing period'
        : labelFor(current, state.labels);

      el.nowStatus.textContent = 'Now';
      el.nowLabel.textContent = label;
      el.nowSub.textContent = (label === current.name ? '' : current.name + ' · ') +
        formatRange(current);
      el.nowRemaining.textContent = formatCountdown(endsAt - seconds);
      el.nowRemainingLabel.textContent = 'remaining';
      el.nowProgress.style.width =
        Math.min(100, ((seconds - startsAt) / (endsAt - startsAt)) * 100) + '%';
      el.nowNext.textContent = next
        ? 'Next: ' + describe(next) + ' at ' + formatTime(next.start)
        : 'Nothing after this — enjoy the rest of your day.';
      return;
    }

    // Outside the bell schedule: before the first bell, or after the last one.
    var first = timeline[0];
    var last = timeline[timeline.length - 1];
    el.nowProgress.style.width = '0%';

    if (seconds < toMinutes(first.start) * 60) {
      el.nowStatus.textContent = 'Before school';
      el.nowLabel.textContent = 'School has not started';
      el.nowSub.textContent = 'First bell at ' + formatTime(first.start);
      el.nowRemaining.textContent = formatCountdown(toMinutes(first.start) * 60 - seconds);
      el.nowRemainingLabel.textContent = 'until the first bell';
      el.nowNext.textContent = 'First up: ' + describe(first);
    } else {
      el.nowStatus.textContent = 'After school';
      el.nowLabel.textContent = 'The day is done';
      el.nowSub.textContent = 'Last bell was at ' + formatTime(last.end);
      el.nowRemaining.textContent = '—';
      el.nowRemainingLabel.textContent = 'see you tomorrow';
      el.nowNext.textContent = '';
    }
  }

  function describe(period) {
    return labelFor(period, state.labels);
  }

  function renderDay(timeline, seconds) {
    el.dayList.innerHTML = '';
    timeline.forEach(function (period) {
      var startsAt = toMinutes(period.start) * 60;
      var endsAt = toMinutes(period.end) * 60;
      var item = document.createElement('li');
      item.className =
        (seconds >= endsAt ? 'is-past ' : '') +
        (seconds >= startsAt && seconds < endsAt ? 'is-current ' : '') +
        (period.kind === 'break' ? 'is-break ' : '') +
        (period.kind === 'passing' ? 'is-passing' : '');

      var time = document.createElement('span');
      time.className = 'time';
      time.textContent = formatRange(period);

      var label = document.createElement('span');
      label.className = 'label';
      var named = period.kind === 'passing' ? 'Passing period' : labelFor(period, state.labels);
      label.textContent = named;
      if (named !== period.name && period.kind !== 'passing') {
        var sub = document.createElement('span');
        sub.className = 'sub';
        sub.textContent = period.name;
        label.appendChild(sub);
      }

      var len = document.createElement('span');
      len.className = 'len';
      len.textContent = formatLength(period);

      item.appendChild(time);
      item.appendChild(label);
      item.appendChild(len);
      el.dayList.appendChild(item);
    });
  }

  /* --- global actions ---------------------------------------------------- */

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-action]');
    if (!trigger) return;
    var action = trigger.dataset.action;

    if (action === 'back-to-choose') {
      show('choose');
    } else if (action === 'edit-periods') {
      startSetup(state.scheduleId);
    } else if (action === 'change-schedule') {
      clearSaved();
      renderChoose();
      show('choose');
    }
  });

  /* --- boot -------------------------------------------------------------- */

  renderChoose();
  show(state ? 'live' : 'choose');
})();

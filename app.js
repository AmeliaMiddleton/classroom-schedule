/* Classroom Schedule — pick a bell schedule, name your periods, watch the clock.
 * Everything is kept in localStorage on this device; there is no server. */

(function () {
  'use strict';

  var STORAGE_KEY = 'classroom-schedule.v1';
  var LEAD_CHOICES = [1, 2, 3, 5, 10];

  var DEFAULTS = {
    alarmOn: true,
    sound: 'chime',
    leadMinutes: 5,
    volume: 0.8
  };

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
    alarmOn: document.getElementById('alarm-on'),
    alarmDetail: document.getElementById('alarm-detail'),
    leadOptions: document.getElementById('lead-options'),
    soundOptions: document.getElementById('sound-options'),
    volume: document.getElementById('alarm-volume'),
    volumeValue: document.getElementById('alarm-volume-value'),
    soundNotice: document.getElementById('sound-notice'),
    liveName: document.getElementById('live-schedule-name'),
    clock: document.getElementById('live-clock'),
    alarmState: document.getElementById('live-alarm-state'),
    alarmNote: document.getElementById('alarm-note'),
    btnAlarm: document.getElementById('btn-alarm'),
    crestKey: document.getElementById('crest-key'),
    teacherTools: document.getElementById('teacher-tools'),
    btnFullscreen: document.getElementById('btn-fullscreen'),
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
  var draft = null;   // { scheduleId, lunchId, alarm settings } while in setup
  var ticker = null;
  var warned = { periodId: null, prevRemaining: null };

  /* --- storage ----------------------------------------------------------- */

  function withDefaults(config) {
    Object.keys(DEFAULTS).forEach(function (key) {
      if (config[key] === undefined || config[key] === null) config[key] = DEFAULTS[key];
    });
    config.labels = config.labels || {};
    return config;
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !findSchedule(parsed.scheduleId)) return null;
      return withDefaults(parsed);
    } catch (err) {
      return null;
    }
  }

  function save(next) {
    state = withDefaults(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
    return (toMinutes(period.end) - toMinutes(period.start)) + ' min';
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
    if (override) return override.base + (Date.now() - override.from) / 1000;
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
    document.body.dataset.screen = which;
    if (ticker) { clearInterval(ticker); ticker = null; }
    if (which === 'live') {
      hideTools();
      warned = { periodId: null, prevRemaining: null };
      tick();
      ticker = setInterval(tick, 1000);
      requestWakeLock();
    } else {
      releaseWakeLock();
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
    draft = withDefaults({
      scheduleId: scheduleId,
      lunchId: existing ? existing.lunchId : null,
      alarmOn: state ? state.alarmOn : undefined,
      sound: state ? state.sound : undefined,
      leadMinutes: state ? state.leadMinutes : undefined,
      volume: state ? state.volume : undefined
    });
    renderSetup();
    renderAlarmSettings();
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

  function renderAlarmSettings() {
    el.alarmOn.checked = !!draft.alarmOn;
    el.alarmDetail.hidden = !draft.alarmOn;
    el.volume.value = String(draft.volume);
    el.volumeValue.textContent = Math.round(draft.volume * 100) + '%';

    el.leadOptions.innerHTML = '';
    LEAD_CHOICES.forEach(function (minutes) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = minutes + ' min';
      chip.setAttribute('aria-pressed', String(minutes === draft.leadMinutes));
      chip.addEventListener('click', function () {
        draft.leadMinutes = minutes;
        renderAlarmSettings();
      });
      el.leadOptions.appendChild(chip);
    });

    el.soundOptions.innerHTML = '';
    Sounds.list.forEach(function (sound) {
      var option = document.createElement('div');
      option.className = 'sound-option';
      option.setAttribute('aria-current', String(sound.id === draft.sound));

      var pick = document.createElement('button');
      pick.type = 'button';
      pick.className = 'sound-pick';
      var pickName = document.createElement('span');
      pickName.className = 'sound-name';
      pickName.textContent = sound.name;
      var pickDesc = document.createElement('span');
      pickDesc.className = 'sound-desc';
      pickDesc.textContent = sound.description;
      pick.appendChild(pickName);
      pick.appendChild(pickDesc);
      pick.setAttribute('aria-pressed', String(sound.id === draft.sound));
      pick.addEventListener('click', function () {
        draft.sound = sound.id;
        renderAlarmSettings();
        Sounds.play(sound.id, draft.volume);   // picking it plays it
      });

      var preview = document.createElement('button');
      preview.type = 'button';
      preview.className = 'sound-preview';
      preview.title = 'Play ' + sound.name;
      preview.setAttribute('aria-label', 'Play ' + sound.name);
      preview.textContent = '▶';
      preview.addEventListener('click', function () {
        Sounds.play(sound.id, draft.volume);
      });

      option.appendChild(pick);
      option.appendChild(preview);
      el.soundOptions.appendChild(option);
    });
  }

  el.alarmOn.addEventListener('change', function () {
    draft.alarmOn = el.alarmOn.checked;
    el.alarmDetail.hidden = !draft.alarmOn;
  });

  el.volume.addEventListener('input', function () {
    draft.volume = parseFloat(el.volume.value);
    el.volumeValue.textContent = Math.round(draft.volume * 100) + '%';
  });

  el.volume.addEventListener('change', function () {
    Sounds.play(draft.sound, draft.volume);
  });

  el.setupForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var labels = {};
    Array.prototype.forEach.call(el.periodInputs.querySelectorAll('input[type="text"]'),
      function (input) {
        if (input.value.trim()) labels[input.name] = input.value.trim();
      });
    save({
      scheduleId: draft.scheduleId,
      lunchId: draft.lunchId,
      labels: labels,
      alarmOn: draft.alarmOn,
      sound: draft.sound,
      leadMinutes: draft.leadMinutes,
      volume: draft.volume
    });
    Sounds.unlock();   // this click is the gesture that lets audio play later
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
    renderAlarmState();

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

    checkAlarm(current, seconds);
    renderNow(current, next, seconds, timeline);
    renderDay(timeline, seconds);
  }

  /* Ring once, on the tick that crosses the warning line. Comparing against the
   * previous tick means reloading the page mid-period never sets it off. */
  function checkAlarm(current, seconds) {
    var lead = state.leadMinutes * 60;
    var isTimed = current && current.kind === 'class';
    var remaining = isTimed ? toMinutes(current.end) * 60 - seconds : null;
    var id = isTimed ? current.id : null;

    if (id !== warned.periodId) {
      warned = { periodId: id, prevRemaining: remaining };
      return;
    }

    var crossed = warned.prevRemaining !== null &&
      warned.prevRemaining > lead && remaining <= lead && remaining > 0;

    if (crossed && state.alarmOn) Sounds.play(state.sound, state.volume);
    warned.prevRemaining = remaining;
  }

  function renderAlarmState() {
    var sound = Sounds.find(state.sound);
    el.alarmState.textContent = state.alarmOn
      ? sound.name + ' · ' + state.leadMinutes + ' min warning'
      : 'Alarm muted';
    /* Which sound is set is the teacher's business, but a muted alarm stays on
     * show — otherwise it is silently off for days. */
    el.alarmNote.hidden = state.alarmOn && !toolsShown();
    el.btnAlarm.textContent = state.alarmOn ? 'Mute' : 'Unmute';
    el.btnAlarm.setAttribute('aria-pressed', String(!state.alarmOn));
    el.soundNotice.hidden = !(state.alarmOn && Sounds.blocked());
  }

  function renderNow(current, next, seconds, timeline) {
    var isBreak = current && (current.kind === 'break' || current.kind === 'passing');
    el.now.classList.toggle('is-break', !!isBreak);
    el.now.classList.toggle('is-idle', !current);

    if (current) {
      var startsAt = toMinutes(current.start) * 60;
      var endsAt = toMinutes(current.end) * 60;
      var remaining = endsAt - seconds;
      var label = current.kind === 'passing'
        ? 'Passing period'
        : labelFor(current, state.labels);

      // Colour the countdown once the warning has sounded.
      el.now.classList.toggle('is-warning',
        current.kind === 'class' && remaining <= state.leadMinutes * 60);

      el.nowStatus.textContent = 'Now';
      el.nowLabel.textContent = label;
      el.nowSub.textContent = (label === current.name ? '' : current.name + ' · ') +
        formatRange(current);
      el.nowRemaining.textContent = formatCountdown(remaining);
      el.nowRemainingLabel.textContent = 'remaining';
      el.nowProgress.style.width =
        Math.min(100, ((seconds - startsAt) / (endsAt - startsAt)) * 100) + '%';
      el.nowNext.textContent = next
        ? 'Next: ' + labelFor(next, state.labels) + ' at ' + formatTime(next.start)
        : 'Nothing after this — enjoy the rest of your day.';
      return;
    }

    // Outside the bell schedule: before the first bell, or after the last one.
    var first = timeline[0];
    var last = timeline[timeline.length - 1];
    el.now.classList.remove('is-warning');
    el.nowProgress.style.width = '0%';

    if (seconds < toMinutes(first.start) * 60) {
      el.nowStatus.textContent = 'Before school';
      el.nowLabel.textContent = 'School has not started';
      el.nowSub.textContent = 'First bell at ' + formatTime(first.start);
      el.nowRemaining.textContent = formatCountdown(toMinutes(first.start) * 60 - seconds);
      el.nowRemainingLabel.textContent = 'until the first bell';
      el.nowNext.textContent = 'First up: ' + labelFor(first, state.labels);
    } else {
      el.nowStatus.textContent = 'After school';
      el.nowLabel.textContent = 'The day is done';
      el.nowSub.textContent = 'Last bell was at ' + formatTime(last.end);
      el.nowRemaining.textContent = '—';
      el.nowRemainingLabel.textContent = 'see you tomorrow';
      el.nowNext.textContent = '';
    }
  }

  var shownCurrentId = null;

  function renderDay(timeline, seconds) {
    var currentItem = null;
    el.dayList.innerHTML = '';
    timeline.forEach(function (period) {
      var startsAt = toMinutes(period.start) * 60;
      var endsAt = toMinutes(period.end) * 60;
      var item = document.createElement('li');
      item.dataset.periodId = period.id;
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
      if (item.className.indexOf('is-current') > -1) currentItem = item;
      el.dayList.appendChild(item);
    });

    // Long schedules scroll inside their column; keep the current period in
    // view so an unattended screen never needs touching.
    var currentId = currentItem ? currentItem.dataset.periodId : null;
    if (currentItem && currentId !== shownCurrentId) {
      currentItem.scrollIntoView({ block: 'center' });
    }
    shownCurrentId = currentId;
  }

  /* --- teacher controls --------------------------------------------------
   *
   * Only Full screen is on show during class. Everything else appears when
   * the crest is held down for a moment, or when T is pressed, and hides
   * itself again shortly after so it is never left up on the board. */

  var HOLD_MS = 1500;
  var TOOLS_IDLE_MS = 25000;
  var holdTimer = null;
  var idleTimer = null;

  function toolsShown() {
    return !el.teacherTools.hidden;
  }

  function showTools() {
    el.teacherTools.hidden = false;
    el.crestKey.classList.add('is-open');
    renderAlarmState();
    resetToolsIdle();
  }

  function hideTools() {
    el.teacherTools.hidden = true;
    el.crestKey.classList.remove('is-open');
    window.clearTimeout(idleTimer);
  }

  function resetToolsIdle() {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(hideTools, TOOLS_IDLE_MS);
  }

  function toggleTools() {
    if (toolsShown()) hideTools(); else showTools();
  }

  function startHold() {
    window.clearTimeout(holdTimer);
    el.crestKey.classList.add('is-holding');
    holdTimer = window.setTimeout(function () {
      el.crestKey.classList.remove('is-holding');
      toggleTools();
    }, HOLD_MS);
  }

  function cancelHold() {
    window.clearTimeout(holdTimer);
    el.crestKey.classList.remove('is-holding');
  }

  el.crestKey.addEventListener('pointerdown', startHold);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (type) {
    el.crestKey.addEventListener(type, cancelHold);
  });
  /* A long press on a touchscreen would otherwise pop the browser's own menu. */
  el.crestKey.addEventListener('contextmenu', function (event) {
    event.preventDefault();
  });
  /* Holding Enter or Space on the focused crest works the same way, which is
   * the route a TV remote's D-pad takes. */
  el.crestKey.addEventListener('keydown', function (event) {
    if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) startHold();
  });
  el.crestKey.addEventListener('keyup', cancelHold);
  el.crestKey.addEventListener('blur', cancelHold);

  /* Keep the panel up while it is being used. */
  el.teacherTools.addEventListener('click', resetToolsIdle);

  /* --- keeping a TV awake ------------------------------------------------ */

  var wakeLock = null;

  function requestWakeLock() {
    if (!navigator.wakeLock || wakeLock) return;
    navigator.wakeLock.request('screen').then(function (lock) {
      wakeLock = lock;
      lock.addEventListener('release', function () { wakeLock = null; });
    }).catch(function () {
      /* not permitted (no gesture yet, or unsupported) — the clock still runs */
    });
  }

  function releaseWakeLock() {
    if (wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; }
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && document.body.dataset.screen === 'live') requestWakeLock();
  });

  /* --- global actions ---------------------------------------------------- */

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(function () {});
    }
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-action]');
    if (!trigger) return;
    var action = trigger.dataset.action;

    if (action === 'back-to-choose') {
      show('choose');
    } else if (action === 'edit-periods') {
      startSetup(state.scheduleId);
    } else if (action === 'change-schedule') {
      // This throws away the period names, so make it a deliberate choice.
      if (!window.confirm('Start over? This clears your period names and alarm settings.')) return;
      clearSaved();
      renderChoose();
      show('choose');
    } else if (action === 'hide-tools') {
      hideTools();
    } else if (action === 'toggle-alarm') {
      state.alarmOn = !state.alarmOn;
      save(state);
      if (state.alarmOn) Sounds.play(state.sound, state.volume);
      renderAlarmState();
    } else if (action === 'fullscreen') {
      toggleFullscreen();
    } else if (action === 'enable-sound') {
      Sounds.unlock();
      window.setTimeout(function () {
        Sounds.play(state.sound, state.volume);
        renderAlarmState();
      }, 120);
    }
  });

  /* Any interaction is a chance to satisfy the browser's autoplay rules. */
  ['click', 'keydown', 'touchend'].forEach(function (type) {
    document.addEventListener(type, function () { Sounds.unlock(); }, { once: true });
  });

  document.addEventListener('keydown', function (event) {
    if (document.body.dataset.screen !== 'live') return;
    if (event.target.matches('input, textarea')) return;
    var key = event.key.toLowerCase();
    if (key === 'f') {
      toggleFullscreen();
    } else if (key === 'm') {
      state.alarmOn = !state.alarmOn;
      save(state);
      renderAlarmState();
    } else if (key === 't') {
      toggleTools();
    } else if (event.key === 'Escape') {
      hideTools();
    }
  });

  /* --- boot -------------------------------------------------------------- */

  renderChoose();
  show(state ? 'live' : 'choose');
})();

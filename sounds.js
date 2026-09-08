/* Alarm sounds, synthesized with the Web Audio API.
 *
 * Nothing is loaded over the network — a TV that has the page cached can still
 * ring. Each sound is a function that schedules its notes on a shared context
 * and returns roughly how long it lasts, in seconds. */

var Sounds = (function () {
  'use strict';

  var ctx = null;

  /* Browsers only allow audio after a user gesture, so the context is created
   * on the first click and resumed whenever it gets suspended. */
  function context() {
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    return ctx;
  }

  function ready() {
    return !!ctx && ctx.state === 'running';
  }

  function blocked() {
    return !!ctx && ctx.state === 'suspended';
  }

  /* One plucked/struck note: quick attack, exponential decay. */
  function note(out, opts) {
    var c = out.context;
    var osc = c.createOscillator();
    var gain = c.createGain();
    var t0 = opts.at;
    var peak = opts.gain === undefined ? 0.5 : opts.gain;
    var attack = opts.attack === undefined ? 0.005 : opts.attack;

    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.glideTo) {
      osc.frequency.exponentialRampToValueAtTime(opts.glideTo, t0 + opts.dur);
    }

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);

    osc.connect(gain).connect(out);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.05);
  }

  /* A struck bell: a fundamental plus inharmonic partials. */
  function bell(out, at, freq, dur, gain) {
    var partials = [1, 2.01, 2.98, 4.16, 5.43];
    var levels = [1, 0.5, 0.32, 0.19, 0.11];
    for (var i = 0; i < partials.length; i++) {
      note(out, {
        at: at,
        freq: freq * partials[i],
        dur: dur * (1 - i * 0.13),
        gain: gain * levels[i],
        type: 'sine'
      });
    }
  }

  var SOUNDS = [
    {
      id: 'chime',
      name: 'Chime',
      description: 'Three soft bell tones. Carries without startling anyone.',
      play: function (out, at) {
        bell(out, at + 0.00, 880.00, 1.9, 0.42);
        bell(out, at + 0.28, 1108.73, 1.9, 0.36);
        bell(out, at + 0.56, 1318.51, 2.4, 0.34);
        return 3.1;
      }
    },
    {
      id: 'school-bell',
      name: 'School bell',
      description: 'The classic ring. Loud and unmistakable across a room.',
      play: function (out, at) {
        var c = out.context;
        var tremolo = c.createGain();
        var lfo = c.createOscillator();
        var lfoGain = c.createGain();

        tremolo.gain.setValueAtTime(0.0001, at);
        tremolo.gain.exponentialRampToValueAtTime(0.62, at + 0.02);
        tremolo.gain.setValueAtTime(0.62, at + 1.5);
        tremolo.gain.exponentialRampToValueAtTime(0.0001, at + 2.0);

        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(11, at);
        lfoGain.gain.setValueAtTime(0.32, at);
        lfo.connect(lfoGain).connect(tremolo.gain);
        lfo.start(at);
        lfo.stop(at + 2.1);

        tremolo.connect(out);
        [1046.5, 1318.5, 1567.98, 2093].forEach(function (freq, i) {
          var osc = c.createGain();
          osc.gain.setValueAtTime(1 / (i + 1.1), at);
          note(osc, { at: at, freq: freq, dur: 2.0, gain: 1, type: 'triangle' });
          osc.connect(tremolo);
        });
        return 2.2;
      }
    },
    {
      id: 'marimba',
      name: 'Marimba',
      description: 'Warm wooden mallets walking up a scale.',
      play: function (out, at) {
        [523.25, 659.25, 783.99, 1046.5].forEach(function (freq, i) {
          note(out, { at: at + i * 0.13, freq: freq, dur: 0.75, gain: 0.5, type: 'sine' });
          note(out, {
            at: at + i * 0.13, freq: freq * 4, dur: 0.16, gain: 0.16, type: 'sine'
          });
        });
        return 1.4;
      }
    },
    {
      id: 'beeps',
      name: 'Digital beeps',
      description: 'Four crisp electronic tones. Cuts through noise.',
      play: function (out, at) {
        for (var i = 0; i < 4; i++) {
          note(out, {
            at: at + i * 0.22, freq: 1760, dur: 0.15, gain: 0.6, type: 'square'
          });
        }
        return 1.1;
      }
    },
    {
      id: 'gentle',
      name: 'Gentle rise',
      description: 'A quiet two-note swell. Good for a calm room or a test.',
      play: function (out, at) {
        note(out, {
          at: at, freq: 440, dur: 1.2, gain: 0.42, type: 'sine', attack: 0.18, glideTo: 660
        });
        note(out, {
          at: at + 0.5, freq: 660, dur: 1.7, gain: 0.36, type: 'sine', attack: 0.22
        });
        return 2.2;
      }
    },
    {
      id: 'gong',
      name: 'Low gong',
      description: 'One deep, long note. The least jarring option.',
      play: function (out, at) {
        bell(out, at, 174.61, 3.6, 0.44);
        note(out, { at: at, freq: 87.31, dur: 3.2, gain: 0.22, type: 'sine' });
        return 3.8;
      }
    },
    {
      id: 'triple-tap',
      name: 'Triple tap',
      description: 'Three short wood-block knocks. Brief and easy to ignore.',
      play: function (out, at) {
        for (var i = 0; i < 3; i++) {
          note(out, {
            at: at + i * 0.17, freq: 900 - i * 60, dur: 0.11, gain: 0.62, type: 'triangle'
          });
        }
        return 0.7;
      }
    }
  ];

  function find(id) {
    for (var i = 0; i < SOUNDS.length; i++) {
      if (SOUNDS[i].id === id) return SOUNDS[i];
    }
    return SOUNDS[0];
  }

  /* Play a sound by id at the given volume (0–1). Safe to call when audio is
   * unavailable or still blocked — it just does nothing. */
  function play(id, volume) {
    var c = context();
    if (!c || c.state !== 'running') return false;
    var master = c.createGain();
    master.gain.setValueAtTime(volume === undefined ? 0.8 : volume, c.currentTime);
    master.connect(c.destination);
    var seconds = find(id).play(master, c.currentTime + 0.03);
    window.setTimeout(function () { master.disconnect(); }, (seconds + 0.5) * 1000);
    return true;
  }

  return {
    list: SOUNDS,
    find: find,
    play: play,
    unlock: context,
    ready: ready,
    blocked: blocked
  };
})();

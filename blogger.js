/* Reads a public Blogger blog straight from the browser — no key, no server,
 * nothing for anyone to deploy.
 *
 * Blogger answers its GData feed as JSONP when asked for `alt=json-in-script`,
 * and that is the whole trick: the plain `alt=json` feed sends no CORS headers,
 * so fetch() from a Pages origin cannot touch it, but a <script> tag can. The
 * cost is that JSONP has no error channel, so every request runs against a
 * timeout and a script `onerror`.
 *
 * Nothing in here knows about bell schedules. Give it a blog address, get the
 * posts back. */

var Blogger = (function () {
  'use strict';

  var CACHE_KEY = 'classroom-schedule.blog.v1';
  var TIMEOUT_MS = 12000;
  var MAX_POSTS = 25;
  var seq = 0;

  /* --- addresses --------------------------------------------------------- */

  /* Accepts whatever a teacher pastes — a bare host, a link to one post, the
   * feed URL itself — and reduces it to the blog's origin. Blogger always
   * serves a blog from the root of its host, custom domains included, so the
   * path is never worth keeping. Returns null if it is not an address at all. */
  function normalize(input) {
    var raw = String(input == null ? '' : input).trim();
    if (!raw) return null;
    if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw.replace(/^\/+/, '');

    var url;
    try {
      url = new URL(raw);
    } catch (err) {
      return null;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    // A hostname with no dot is a typo, not a blog.
    if (!url.hostname || url.hostname.indexOf('.') === -1) return null;
    return url.protocol + '//' + url.host;
  }

  function feedUrl(origin, callbackName) {
    return origin + '/feeds/posts/default' +
      '?alt=json-in-script' +
      '&callback=' + encodeURIComponent(callbackName) +
      '&max-results=' + MAX_POSTS +
      '&orderby=published' +
      // A classroom TV can sit on one page for weeks; without this it would
      // keep re-reading the copy the browser cached on the first morning.
      '&_=' + Date.now();
  }

  /* --- the JSONP call ---------------------------------------------------- */

  function jsonp(url, name, done) {
    var script = document.createElement('script');
    var timer = null;
    var settled = false;

    function finish(err, data) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      try {
        delete window[name];
      } catch (err2) {
        window[name] = undefined;
      }
      if (script.parentNode) script.parentNode.removeChild(script);
      done(err, data);
    }

    window[name] = function (data) { finish(null, data); };

    timer = window.setTimeout(function () {
      finish(new Error('The blog did not answer. Check the address, or the network.'));
    }, TIMEOUT_MS);

    /* Fires for a bad host, and for a blog set to private — Blogger answers
     * those with an HTML page, which is a parse error rather than a callback. */
    script.onerror = function () {
      finish(new Error('Nothing loaded from that address.'));
    };

    script.src = url;
    document.head.appendChild(script);
  }

  /* --- reading an entry -------------------------------------------------- */

  /* GData wraps every text node as { $t: "..." }. */
  function value(node) {
    return node && typeof node.$t === 'string' ? node.$t : '';
  }

  /* Post bodies are HTML. DOMParser gives us the words without running or
   * loading anything in them, and the result is only ever set with
   * textContent, so a post can never put markup on the classroom board. */
  function textFrom(html) {
    if (!html) return '';
    var text;
    try {
      text = new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
    } catch (err) {
      text = String(html).replace(/<[^>]*>/g, ' ');
    }
    return text.replace(/\s+/g, ' ').trim();
  }

  function alternateLink(entry) {
    var links = entry.link || [];
    for (var i = 0; i < links.length; i++) {
      if (links[i].rel === 'alternate' && links[i].href) return links[i].href;
    }
    return '';
  }

  function labelsOf(entry) {
    var out = [];
    (entry.category || []).forEach(function (category) {
      if (category && category.term) out.push(String(category.term));
    });
    return out;
  }

  function toDate(text) {
    var time = Date.parse(text);
    return isNaN(time) ? null : new Date(time);
  }

  function readEntry(entry) {
    return {
      id: value(entry.id),
      title: value(entry.title).trim(),
      text: textFrom(value(entry.content) || value(entry.summary)),
      labels: labelsOf(entry),
      url: alternateLink(entry),
      published: toDate(value(entry.published)),
      updated: toDate(value(entry.updated))
    };
  }

  /* --- the last good copy ------------------------------------------------
   *
   * A TV on classroom wifi will lose the network sooner or later. Keeping the
   * last answer means the board shows yesterday's posts with yesterday's date
   * on them, rather than going blank. */

  function readCache(origin) {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.origin) return null;
      if (origin && parsed.origin !== origin) return null;
      parsed.posts = (parsed.posts || []).map(function (post) {
        post.published = post.published ? new Date(post.published) : null;
        post.updated = post.updated ? new Date(post.updated) : null;
        return post;
      });
      return parsed;
    } catch (err) {
      return null;
    }
  }

  function writeCache(result) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(result, function (key, val) {
        return val instanceof Date ? val.toISOString() : val;
      }));
    } catch (err) {
      /* no room, or private browsing — the posts still show for this visit */
    }
  }

  function clearCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch (err) { /* ignore */ }
  }

  /* --- the one call the app makes ---------------------------------------- */

  /* done(err, { origin, title, posts, fetchedAt }) */
  function load(input, done) {
    var origin = normalize(input);
    if (!origin) {
      done(new Error('That does not look like a blog address.'));
      return;
    }

    var name = '__classroomBloggerFeed' + (seq += 1);
    jsonp(feedUrl(origin, name), name, function (err, data) {
      if (err) { done(err); return; }
      if (!data || !data.feed) {
        done(new Error('That address answered, but not with a Blogger feed.'));
        return;
      }

      var result = {
        origin: origin,
        title: value(data.feed.title).trim() || origin,
        posts: (data.feed.entry || []).map(readEntry),
        fetchedAt: Date.now()
      };
      writeCache(result);
      done(null, result);
    });
  }

  return {
    normalize: normalize,
    load: load,
    cached: readCache,
    forget: clearCache
  };
})();

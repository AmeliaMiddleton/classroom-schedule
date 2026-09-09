/* Google Classroom → Blogger
 * ---------------------------------------------------------------------------
 * Posts what is happening in your Classroom courses to your Blogger blog, once
 * a morning, so the classroom board can show it. You write in Classroom the way
 * you already do; nothing gets typed twice.
 *
 * This runs in YOUR Google account at script.google.com. It is not part of any
 * website and nobody else can see or change it.
 *
 * Setup is in classroom-import.html — open that page and follow the six steps.
 *
 * What it does on each run, for every active course you teach:
 *   - collects announcements you posted in the last WINDOW_DAYS days
 *   - collects assignments due between today and LOOKAHEAD_DAYS from now
 *   - writes (or rewrites) one Blogger post per course per day
 *   - labels that post with the course name, so the board can match it to a
 *     period
 *
 * Re-running it is safe: it rewrites the day's post rather than adding another.
 */

/* --- settings -------------------------------------------------------------
 * The only line you have to change is BLOG_URL. */

var BLOG_URL = 'https://your-blog.blogspot.com';

/* How far back to look for announcements, and how far ahead for due dates. */
var WINDOW_DAYS = 3;
var LOOKAHEAD_DAYS = 1;

/* Optional. The board matches a post to a period by its label, and by default
 * the label is the Classroom course name — so if the course is called
 * "Algebra I" and you named that period "Algebra I" in the app, it already
 * matches and you can leave this alone.
 *
 * Use it when the two names differ:
 *   var COURSE_LABELS = { 'Algebra I - P3': 'Hour 3' };  */
var COURSE_LABELS = {};

/* Set to true to see what would be posted without posting it. */
var DRY_RUN = false;

/* --- the one function to run ---------------------------------------------- */

function publishToBlogger() {
  var blogId = getBlogId();
  var courses = listTaughtCourses();

  if (!courses.length) {
    Logger.log('No active courses found for this account.');
    return;
  }

  courses.forEach(function (course) {
    var items = gatherForCourse(course);
    if (!items.announcements.length && !items.coursework.length) {
      Logger.log('%s: nothing to post today.', course.name);
      return;
    }

    var title = postTitleFor(course);
    var body = renderPost(course, items);
    var labels = labelsFor(course);

    if (DRY_RUN) {
      Logger.log('[dry run] %s\nlabels: %s\n%s', title, labels.join(', '), body);
      return;
    }

    var existingId = findPostIdByTitle(blogId, title);
    if (existingId) {
      updatePost(blogId, existingId, title, body, labels);
      Logger.log('%s: updated "%s".', course.name, title);
    } else {
      insertPost(blogId, title, body, labels);
      Logger.log('%s: posted "%s".', course.name, title);
    }
  });
}

/* --- run it every school morning ------------------------------------------
 * Run this ONCE. It replaces any trigger it made before, so running it again
 * just moves the time. */

function installDailyTrigger() {
  removeTriggers();
  ScriptApp.newTrigger('publishToBlogger')
    .timeBased()
    .atHour(6)          // 6am in the script's own time zone
    .everyDays(1)
    .create();
  Logger.log('Daily trigger installed for ~6am.');
}

function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'publishToBlogger') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

/* --- reading Google Classroom --------------------------------------------- */

function listTaughtCourses() {
  var courses = [];
  var pageToken = null;

  do {
    var page = Classroom.Courses.list({
      teacherId: 'me',
      courseStates: ['ACTIVE'],
      pageSize: 50,
      pageToken: pageToken
    });
    (page.courses || []).forEach(function (course) { courses.push(course); });
    pageToken = page.nextPageToken;
  } while (pageToken);

  return courses;
}

function gatherForCourse(course) {
  return {
    announcements: recentAnnouncements(course.id),
    coursework: dueSoon(course.id)
  };
}

function recentAnnouncements(courseId) {
  var cutoff = new Date().getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  var page;

  try {
    page = Classroom.Courses.Announcements.list(courseId, {
      pageSize: 20,
      orderBy: 'updateTime desc',
      announcementStates: ['PUBLISHED']
    });
  } catch (err) {
    // A course with announcements turned off answers with an error, not a list.
    Logger.log('Could not read announcements for %s: %s', courseId, err.message);
    return [];
  }

  return (page.announcements || []).filter(function (announcement) {
    var when = Date.parse(announcement.updateTime || announcement.creationTime);
    return !isNaN(when) && when >= cutoff;
  });
}

function dueSoon(courseId) {
  var page;

  try {
    page = Classroom.Courses.CourseWork.list(courseId, {
      pageSize: 40,
      orderBy: 'updateTime desc',
      courseWorkStates: ['PUBLISHED']
    });
  } catch (err) {
    Logger.log('Could not read coursework for %s: %s', courseId, err.message);
    return [];
  }

  var from = dateKey(new Date());
  var until = dateKey(new Date(new Date().getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000));

  return (page.courseWork || []).filter(function (work) {
    if (!work.dueDate) return false;
    var key = work.dueDate.year * 10000 + work.dueDate.month * 100 + work.dueDate.day;
    return key >= from && key <= until;
  }).sort(function (a, b) {
    return (a.title || '').localeCompare(b.title || '');
  });
}

/* YYYYMMDD as a number, so two dates compare with < and >. */
function dateKey(date) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/* --- writing the post ------------------------------------------------------ */

function postTitleFor(course) {
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'EEEE, MMM d');
  return course.name + ' — ' + stamp;
}

function labelsFor(course) {
  var labels = [course.name];
  var mapped = COURSE_LABELS[course.name];
  if (mapped && labels.indexOf(mapped) === -1) labels.push(mapped);
  return labels;
}

function renderPost(course, items) {
  var out = [];

  if (items.coursework.length) {
    out.push('<h3>Due</h3><ul>');
    items.coursework.forEach(function (work) {
      var due = work.dueDate
        ? ' <em>(due ' + work.dueDate.month + '/' + work.dueDate.day + ')</em>'
        : '';
      out.push('<li><strong>' + escapeHtml(work.title || 'Assignment') + '</strong>' + due);
      if (work.description) {
        out.push('<br>' + escapeHtml(shorten(work.description, 400)));
      }
      out.push('</li>');
    });
    out.push('</ul>');
  }

  if (items.announcements.length) {
    out.push('<h3>From your teacher</h3>');
    items.announcements.forEach(function (announcement) {
      out.push('<p>' + escapeHtml(shorten(announcement.text || '', 600)) + '</p>');
    });
  }

  out.push('<p><small>Posted automatically from Google Classroom.</small></p>');
  return out.join('\n');
}

function shorten(text, max) {
  var clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* --- talking to Blogger ----------------------------------------------------
 * Apps Script has no built-in Blogger service, so these are plain REST calls
 * signed with the script's own OAuth token. */

function bloggerFetch(url, options) {
  var settings = options || {};
  settings.muteHttpExceptions = true;
  settings.headers = { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() };
  if (settings.payload) settings.contentType = 'application/json';

  var response = UrlFetchApp.fetch(url, settings);
  var code = response.getResponseCode();
  var text = response.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error('Blogger answered ' + code + ': ' + text);
  }
  return JSON.parse(text);
}

/* Looked up once, then remembered — the blog's id never changes. */
function getBlogId() {
  var store = PropertiesService.getScriptProperties();
  var cached = store.getProperty('blogId:' + BLOG_URL);
  if (cached) return cached;

  if (!BLOG_URL || BLOG_URL.indexOf('your-blog') > -1) {
    throw new Error('Set BLOG_URL at the top of this script to your own blog address.');
  }

  var blog = bloggerFetch('https://www.googleapis.com/blogger/v3/blogs/byurl?url=' +
    encodeURIComponent(BLOG_URL));
  store.setProperty('blogId:' + BLOG_URL, blog.id);
  return blog.id;
}

/* The day's post is found by its exact title, which is how re-running the
 * script rewrites today's post instead of piling up duplicates. */
function findPostIdByTitle(blogId, title) {
  var found = bloggerFetch('https://www.googleapis.com/blogger/v3/blogs/' + blogId +
    '/posts?maxResults=50&fetchBodies=false&fields=items(id%2Ctitle)');
  var items = found.items || [];

  for (var i = 0; i < items.length; i++) {
    if (items[i].title === title) return items[i].id;
  }
  return null;
}

function insertPost(blogId, title, content, labels) {
  return bloggerFetch('https://www.googleapis.com/blogger/v3/blogs/' + blogId + '/posts', {
    method: 'post',
    payload: JSON.stringify({
      kind: 'blogger#post',
      title: title,
      content: content,
      labels: labels
    })
  });
}

function updatePost(blogId, postId, title, content, labels) {
  return bloggerFetch('https://www.googleapis.com/blogger/v3/blogs/' + blogId +
      '/posts/' + postId, {
    method: 'put',
    payload: JSON.stringify({
      kind: 'blogger#post',
      id: postId,
      title: title,
      content: content,
      labels: labels
    })
  });
}

// Integration adapters. Every one of these degrades gracefully:
// no credentials -> {ok:false, reason:'not_configured'}, never a thrown error.
import { readdir, stat } from 'node:fs/promises';
import { join, extname, basename, sep } from 'node:path';

const NOTION_VERSION = '2022-06-28';

/* ------------------------------------------------------------------ Notion */

export async function notionSearch(cfg, query = '') {
  const token = cfg?.notion?.token;
  if (!token) return { ok: false, reason: 'not_configured' };
  try {
    const res = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        page_size: 50,
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, reason: 'http_' + res.status, detail: body.slice(0, 400) };
    }
    const json = await res.json();
    return { ok: true, items: (json.results || []).map(notionTitleOf).filter(Boolean) };
  } catch (e) {
    return { ok: false, reason: 'network', detail: String(e.message || e) };
  }
}

// Notion page titles hide in different property shapes depending on how the page
// was made, so look in all the usual places before giving up.
function notionTitleOf(page) {
  if (!page || !page.id) return null;
  let title = '';
  const props = page.properties || {};
  for (const key of Object.keys(props)) {
    const p = props[key];
    if (p && p.type === 'title' && Array.isArray(p.title) && p.title.length) {
      title = p.title.map((t) => t.plain_text || '').join('');
      break;
    }
  }
  if (!title && Array.isArray(page.title)) {
    title = page.title.map((t) => t.plain_text || '').join('');
  }
  return {
    id: page.id,
    title: title || '(untitled)',
    url: page.url || '',
    icon: page.icon?.emoji || '',
    lastEdited: page.last_edited_time || '',
    object: page.object || 'page',
  };
}

/* -------------------------------------------------------- Google Classroom */

// Access tokens last an hour, so mint a fresh one from the refresh token.
async function googleAccessToken(cfg) {
  const g = cfg?.classroom || {};
  if (!g.client_id || !g.client_secret || !g.refresh_token) return null;
  const body = new URLSearchParams({
    client_id: g.client_id,
    client_secret: g.client_secret,
    refresh_token: g.refresh_token,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error('token exchange failed: ' + res.status + ' ' + (await res.text()).slice(0, 200));
  return (await res.json()).access_token;
}

async function gapi(token, url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(res.status + ' ' + (await res.text()).slice(0, 200));
  return res.json();
}

export async function classroomWork(cfg) {
  // Prefer the API; fall back to the calendar feed when OAuth is unavailable —
  // which is the normal case on a locked-down school account.
  if (!cfg?.classroom?.refresh_token) return classroomICal(cfg);
  try {
    const token = await googleAccessToken(cfg);
    if (!token) return { ok: false, reason: 'not_configured' };

    const courses = (await gapi(token, 'https://classroom.googleapis.com/v1/courses?studentId=me&courseStates=ACTIVE')).courses || [];
    const items = [];
    for (const c of courses) {
      let work = [];
      try {
        work = (await gapi(token, `https://classroom.googleapis.com/v1/courses/${c.id}/courseWork`)).courseWork || [];
      } catch { /* a course with no coursework, or no read access to it */ }
      for (const w of work) {
        items.push({
          id: w.id,
          courseId: c.id,
          course: c.name || '',
          title: w.title || '',
          description: (w.description || '').slice(0, 500),
          due: dueDateOf(w),
          url: w.alternateLink || '',
          workType: w.workType || '',
        });
      }
    }
    return { ok: true, courses: courses.map((c) => ({ id: c.id, name: c.name })), items };
  } catch (e) {
    return { ok: false, reason: 'api', detail: String(e.message || e) };
  }
}

function dueDateOf(w) {
  if (!w.dueDate) return null;
  const { year, month, day } = w.dueDate;
  if (!year || !month || !day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/* ------------------------------------------------- Classroom via iCal feed
   Schools routinely block third-party OAuth apps, which stops the Classroom API
   dead. Classroom also publishes each course as a calendar, and Google Calendar
   gives you a private iCal URL for it — your own data, no app to approve. This
   reads those feeds. */

// Unfold RFC 5545 continuation lines, then pull the fields we care about.
function parseICS(text) {
  const lines = text.replace(/\r\n[ \t]/g, '').split(/\r?\n/);
  const out = [];
  let cur = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') { if (cur) out.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).split(';')[0].toUpperCase();
    const val = line.slice(i + 1)
      .replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
    if (['SUMMARY', 'DESCRIPTION', 'DTSTART', 'DTEND', 'UID', 'URL'].includes(key)) cur[key] = val;
  }
  return out;
}

// DTSTART is either 20260915 or 20260915T140000Z
const icsDate = (v) => {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(v || '');
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

/* Google Calendar's Export (Settings → Import & Export) downloads a zip of .ics
   files, including calendars you are only subscribed to. That is the one route
   left when the admin blocks OAuth and you do not own the calendar, so the
   dashboard can read those files directly. */
export function assignmentsFromICS(text, fallbackName = 'Classroom') {
  const name = /X-WR-CALNAME:(.+)/.exec(text)?.[1]?.trim() || fallbackName;
  const items = [];
  for (const e of parseICS(text)) {
    const due = icsDate(e.DTSTART);
    if (!due) continue;
    items.push({
      id: e.UID || `${name}:${e.SUMMARY}:${due}`,
      course: name,
      title: (e.SUMMARY || 'Assignment').trim(),
      description: (e.DESCRIPTION || '').slice(0, 500),
      due,
      url: e.URL || '',
    });
  }
  items.sort((a, b) => a.due.localeCompare(b.due));
  return { name, items };
}

export async function classroomICal(cfg) {
  const urls = (cfg?.classroom?.icalUrls || [cfg?.classroom?.icalUrl]).filter(Boolean);
  if (!urls.length) return { ok: false, reason: 'not_configured' };

  const items = [];
  const courses = new Set();
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) return { ok: false, reason: 'http_' + res.status, detail: url.slice(0, 60) + '…' };
      const text = await res.text();
      const name = /X-WR-CALNAME:(.+)/.exec(text)?.[1]?.trim() || 'Classroom';
      courses.add(name);
      for (const e of parseICS(text)) {
        const due = icsDate(e.DTSTART);
        if (!due) continue;
        items.push({
          id: e.UID || `${name}:${e.SUMMARY}:${due}`,
          course: name,
          title: (e.SUMMARY || 'Assignment').trim(),
          description: (e.DESCRIPTION || '').slice(0, 500),
          due,
          url: e.URL || '',
        });
      }
    } catch (e) {
      return { ok: false, reason: 'network', detail: String(e.message || e).slice(0, 200) };
    }
  }
  items.sort((a, b) => a.due.localeCompare(b.due));
  return { ok: true, source: 'ical', courses: [...courses].map((n) => ({ id: n, name: n })), items };
}

/* ---------------------------------------------------------------- GoodNotes */

// GoodNotes has no API. What it does have is auto-backup: point it at a folder
// and it drops a PDF there on every change. This reads that folder.
export async function goodnotesScan(cfg, subjects = []) {
  const dir = cfg?.goodnotes?.folder;
  if (!dir) return { ok: false, reason: 'not_configured' };
  try {
    const files = [];
    await walk(dir, files, 0);
    files.sort((a, b) => b.modified.localeCompare(a.modified));
    return { ok: true, folder: dir, items: files.slice(0, 300).map((f) => ({ ...f, subjectGuess: guessSubject(f, subjects) })) };
  } catch (e) {
    return { ok: false, reason: 'fs', detail: String(e.message || e) };
  }
}

async function walk(dir, out, depth) {
  if (depth > 4 || out.length > 1000) return;
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      await walk(full, out, depth + 1);
    } else if (['.pdf', '.goodnotes'].includes(extname(e.name).toLowerCase())) {
      try {
        const s = await stat(full);
        out.push({
          name: basename(e.name, extname(e.name)),
          path: full,
          folder: dir.split(sep).pop(),
          bytes: s.size,
          modified: new Date(s.mtimeMs).toISOString(),
        });
      } catch { /* file vanished mid-scan */ }
    }
  }
}

// Match "FurtherMaths_Matrices.pdf" or a Physics/ folder to a subject.
function guessSubject(file, subjects) {
  const hay = (file.folder + ' ' + file.name).toLowerCase().replace(/[_\-]+/g, ' ');
  for (const s of subjects) {
    const n = s.name.toLowerCase();
    if (hay.includes(n)) return s.id;
    if (n === 'further maths' && /further|fm\b/.test(hay)) return s.id;
    if (n === 'computer science' && /comp sci|compsci|\bcs\b|computing/.test(hay)) return s.id;
    if (n === 'german' && /deutsch/.test(hay)) return s.id;
    if (n === 'maths' && /\bmath|\bmaths\b/.test(hay)) return s.id;
  }
  return null;
}

export function integrationStatus(cfg) {
  const ical = (cfg?.classroom?.icalUrls || [cfg?.classroom?.icalUrl]).filter(Boolean).length > 0;
  return {
    notion: Boolean(cfg?.notion?.token),
    classroom: Boolean(cfg?.classroom?.refresh_token) || ical || Boolean(cfg?.gmail?.refresh_token),
    classroomMode: cfg?.classroom?.refresh_token ? 'api'
      : cfg?.gmail?.refresh_token ? 'forwarded email'
      : ical ? 'calendar feed' : null,
    gmail: Boolean(cfg?.gmail?.refresh_token),
    goodnotes: Boolean(cfg?.goodnotes?.folder),
  };
}

/* Reading Classroom notifications out of a PERSONAL Gmail account.

   The school Workspace blocks third-party OAuth, so the Classroom API is out.
   A personal Google account has no such restriction — so if school Classroom
   mail is forwarded to a personal address, the server can read it there and
   turn each notification into homework. Read-only scope, personal mailbox. */
import { readDoc, writeDoc } from './store.mjs';
import { join } from 'node:path';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://gmail.googleapis.com/gmail/v1/users/me';

export const gmailConfigured = (cfg) => Boolean(cfg?.gmail?.refresh_token);

async function accessToken(cfg) {
  const g = cfg.gmail;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: g.client_id, client_secret: g.client_secret,
      refresh_token: g.refresh_token, grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error('token refresh failed: ' + res.status + ' ' + (await res.text()).slice(0, 160));
  return (await res.json()).access_token;
}

const header = (payload, name) =>
  (payload?.headers || []).find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

// Gmail returns bodies base64url-encoded, sometimes nested in multipart parts.
function plainText(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf8');
  }
  for (const p of payload.parts || []) {
    const t = plainText(p);
    if (t) return t;
  }
  return '';
}

/** Classroom notifications from the last `days`, newest first. */
export async function classroomMail(cfg, { days = 30, root = '.' } = {}) {
  if (!gmailConfigured(cfg)) return { ok: false, reason: 'not_configured' };
  try {
    const token = await accessToken(cfg);
    const auth = { Authorization: `Bearer ${token}` };
    const q = encodeURIComponent(
      `from:(classroom.google.com) newer_than:${days}d -subject:("invited you" OR "removed you")`);

    const list = await (await fetch(`${API}/messages?maxResults=50&q=${q}`, { headers: auth })).json();
    if (list.error) return { ok: false, reason: 'api', detail: list.error.message };
    const ids = (list.messages || []).map((m) => m.id);
    if (!ids.length) return { ok: true, items: [], checked: 0 };

    // Cache parsed messages by id — the same notifications come back every poll.
    const cacheFile = join(root, '.cache', 'gmail.json');
    const cache = (await readDoc('gmailcache', cacheFile).catch(() => null)) || {};

    const items = [];
    let fetched = 0;
    for (const id of ids) {
      if (cache[id]) { items.push(cache[id]); continue; }
      const m = await (await fetch(`${API}/messages/${id}?format=full`, { headers: auth })).json();
      if (m.error) continue;
      fetched++;
      const subject = header(m.payload, 'Subject');
      const rec = {
        id,
        subject,
        from: header(m.payload, 'From'),
        date: new Date(Number(m.internalDate)).toISOString().slice(0, 10),
        snippet: (m.snippet || '').slice(0, 400),
        body: plainText(m.payload).slice(0, 1500),
      };
      cache[id] = rec;
      items.push(rec);
    }
    await writeDoc('gmailcache', cacheFile, cache).catch(() => {});
    items.sort((a, b) => b.date.localeCompare(a.date));
    return { ok: true, items, checked: ids.length, fetched };
  } catch (e) {
    return { ok: false, reason: 'api', detail: String(e.message || e).slice(0, 240) };
  }
}

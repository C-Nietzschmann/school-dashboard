#!/usr/bin/env node
// One-time helper: gets a Google Classroom refresh token via the loopback OAuth
// flow. You sign in yourself in your own browser — this script never sees your
// password, only the code Google hands back.
//
//   node get-classroom-token.mjs
import { createServer } from 'node:http';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { exec } from 'node:child_process';
import { paths } from './lib/paths.mjs';

const PORT = 8788;
const REDIRECT = `http://localhost:${PORT}/callback`;
/* Two modes:
     node get-classroom-token.mjs           school account, Classroom API
     node get-classroom-token.mjs --gmail   PERSONAL account, read forwarded mail
   The second exists because school Workspaces block third-party OAuth while a
   personal account does not. */
const GMAIL = process.argv.includes('--gmail');
const SCOPES = (GMAIL
  ? ['https://www.googleapis.com/auth/gmail.readonly']
  : ['https://www.googleapis.com/auth/classroom.courses.readonly',
     'https://www.googleapis.com/auth/classroom.coursework.me.readonly']).join(' ');
const SECTION = GMAIL ? 'gmail' : 'classroom';

const cfg = existsSync(paths.config) ? JSON.parse(await readFile(paths.config, 'utf8')) : {};
cfg[SECTION] ||= {};

/* Credentials come from the JSON Google gives you when you create the OAuth
   client — pass its path, or drop it in ~/Downloads and it will be found. No
   copying secrets by hand.
     node get-classroom-token.mjs [path-to-client_secret_*.json]              */
async function fromGoogleJson() {
  let file = process.argv[2];
  if (!file) {
    const dir = join(homedir(), 'Downloads');
    const hit = (await readdir(dir).catch(() => []))
      .filter((f) => f.startsWith('client_secret_') && f.endsWith('.json'))
      .sort();
    if (hit.length) file = join(dir, hit[hit.length - 1]);
  }
  if (!file || !existsSync(file)) return null;
  try {
    const j = JSON.parse(await readFile(file, 'utf8'));
    const c = j.installed || j.web;
    if (!c?.client_id || !c?.client_secret) return null;
    console.log('Using OAuth client from ' + file);
    return { client_id: c.client_id, client_secret: c.client_secret };
  } catch { return null; }
}

let client_id = cfg[SECTION].client_id || cfg.classroom?.client_id;
let client_secret = cfg[SECTION].client_secret || cfg.classroom?.client_secret;
if (!client_id || !client_secret) {
  const g = await fromGoogleJson();
  if (g) ({ client_id, client_secret } = g);
}
if (!client_id || !client_secret) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  client_id = client_id || await rl.question('OAuth client ID: ');
  client_secret = client_secret || await rl.question('OAuth client secret: ');
  rl.close();
}

const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id, redirect_uri: REDIRECT, response_type: 'code',
  // select_account: without it Google silently reuses whichever account the
  // browser is already signed into — usually the personal one, not the school's.
  scope: SCOPES, access_type: 'offline', prompt: 'select_account consent',
});

console.log(GMAIL
  ? '\nOpening your browser. Sign in with your PERSONAL Google account —\nthe one the school mail is forwarded to, NOT the school account.\n'
  : '\nOpening your browser. Sign in with your SCHOOL account.\n');
console.log('If it does not open, paste this in yourself:\n' + authUrl + '\n');
exec(`open "${authUrl}"`);

const code = await new Promise((resolve, reject) => {
  const s = createServer((req, res) => {
    const u = new URL(req.url, `http://localhost:${PORT}`);
    if (u.pathname !== '/callback') return res.end();
    const err = u.searchParams.get('error');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<body style="font:16px system-ui;padding:60px;text-align:center">
      <h2>${err ? 'Denied: ' + err : 'Done — close this tab'}</h2></body>`);
    s.close();
    err ? reject(new Error(err)) : resolve(u.searchParams.get('code'));
  });
  s.listen(PORT, '127.0.0.1');
  // Google only redirects here on success or a plain "Deny". A block (Access
  // blocked, access_not_configured, not a test user) stops on its own error page
  // and never comes back, so a timeout nearly always means that page was shown.
  setTimeout(() => {
    s.close();
    reject(new Error('no reply from Google after 10 minutes. The browser almost certainly '
      + 'stopped on an error page — that page\'s error code is what to fix.'));
  }, 6e5).unref();
});

const res = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ code, client_id, client_secret, redirect_uri: REDIRECT, grant_type: 'authorization_code' }),
});
if (!res.ok) { console.error('\nToken exchange failed:', res.status, await res.text()); process.exit(1); }

const { refresh_token } = await res.json();
if (!refresh_token) { console.error('\nNo refresh token came back. Revoke the app at myaccount.google.com/permissions and run this again.'); process.exit(1); }

cfg[SECTION] = { ...cfg[SECTION], client_id, client_secret, refresh_token };
await writeFile(paths.config, JSON.stringify(cfg, null, 2));
console.log(`\n✓ Saved to ${paths.config}\n`);
const P = GMAIL ? 'GMAIL' : 'CLASSROOM';
console.log('  For the hosted dashboard, add these three to Render → Environment:');
console.log(`    ${P}_CLIENT_ID      = ` + client_id);
console.log(`    ${P}_CLIENT_SECRET  = ` + client_secret);
console.log(`    ${P}_REFRESH_TOKEN  = ` + refresh_token);
console.log('');

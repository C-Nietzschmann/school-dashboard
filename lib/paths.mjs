/* Every path the dashboard reads or writes at runtime.

   Code lives in the repository; data does not. Nothing personal is ever written
   inside the checkout, so the repository can be published as it stands and you
   keep using it with your real marks on the same machine.

   The data directory is $SCHOOL_DASHBOARD_DATA, or ~/.school-dashboard. It is
   created on import, and seeded from the *.example files shipped alongside this
   code the first time it is found empty — so a stranger who clones this gets a
   working dashboard with invented data, not an error.                          */
import { mkdirSync, existsSync, copyFileSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = dirname(dirname(fileURLToPath(import.meta.url)));

export const DATA_DIR = resolve(
  process.env.SCHOOL_DASHBOARD_DATA || join(homedir(), '.school-dashboard'));

export const paths = {
  dir:         DATA_DIR,
  data:        join(DATA_DIR, 'data.json'),
  // store.mjs appends '.backup' to whatever it is given, so the backup is named
  // here rather than guessed. Guessing it wrong is what leaked marks into git.
  backup:      join(DATA_DIR, 'data.json.backup'),
  profile:     join(DATA_DIR, 'profile.json'),
  config:      join(DATA_DIR, 'config.json'),
  whiteboards: join(DATA_DIR, 'whiteboards'),
  cache:       join(DATA_DIR, '.cache'),
};

/* Example files ship with the code and are copied on first run only. A file
   that already exists is never touched, so this is safe to run every start. */
const EXAMPLES = [
  ['data.example.json',    paths.data],
  ['profile.example.json', paths.profile],
  ['config.json.example',  paths.config],
];

export function ensureDataDir() {
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(paths.whiteboards, { recursive: true });
  mkdirSync(paths.cache, { recursive: true });

  const seeded = [];
  for (const [example, target] of EXAMPLES) {
    if (existsSync(target)) continue;
    const from = join(REPO, example);
    if (!existsSync(from)) continue;
    copyFileSync(from, target);
    seeded.push(target);
  }
  return seeded;
}

// Runs on import: seed.mjs reads the profile at module load, so the directory
// has to exist before any importer's top-level code runs.
export const seededOnFirstRun = ensureDataDir();

/* Your profile, wherever it lives.

   A host has no data directory to put it in and the file is deliberately not in
   the repository, so two escape hatches exist. Both keep it out of git:

     PROFILE_PATH   a file path — Render mounts Secret Files at /etc/secrets/
     PROFILE_JSON   the JSON inline, for hosts without secret files

   This matters more than it looks. Reference data (calendar, bell times, rota,
   targets) is replaced from the seed on every schema bump, and the seed falls
   back to generic defaults when there is no profile — so a host that cannot see
   your profile will quietly overwrite your real school calendar with an invented
   one the next time the schema moves. */
export function readProfile() {
  const inline = process.env.PROFILE_JSON;
  if (inline) {
    try { return JSON.parse(inline); }
    catch (e) { console.error('PROFILE_JSON is not valid JSON:', e.message); }
  }
  for (const file of [process.env.PROFILE_PATH, paths.profile]) {
    if (!file || !existsSync(file)) continue;
    try { return JSON.parse(readFileSync(file, 'utf8')); }
    catch (e) { console.error(`${file} is not valid JSON:`, e.message); }
  }
  return {};
}

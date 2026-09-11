/* Storage that works in both places it needs to:
   - locally, a JSON file next to the server (no database, no setup)
   - on a host, Postgres via DATABASE_URL (Render's disk does not persist on the
     free tier, so the file would be wiped on every restart)
   The document is stored whole, as JSON. It is one user's dashboard, a couple of
   hundred KB at most — a schema would buy nothing here. */
import { readFile, writeFile, rename, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const URL_ = process.env.DATABASE_URL;
let pool = null;

export const backend = () => (URL_ ? 'postgres' : 'file');

async function pg() {
  if (pool) return pool;
  const { default: PG } = await import('pg');
  pool = new PG.Pool({
    connectionString: URL_,
    ssl: URL_.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  await pool.query('CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, doc JSONB NOT NULL, updated TIMESTAMPTZ DEFAULT now())');
  return pool;
}

export async function readDoc(id, file) {
  if (URL_) {
    const { rows } = await (await pg()).query('SELECT doc FROM documents WHERE id = $1', [id]);
    return rows[0]?.doc ?? null;
  }
  if (!existsSync(file)) return null;
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (e) {
    const backup = file + '.backup';
    if (existsSync(backup)) { console.error('reading backup after:', e.message); return JSON.parse(await readFile(backup, 'utf8')); }
    throw e;
  }
}

let chain = Promise.resolve();
export function writeDoc(id, file, doc) {
  chain = chain.then(async () => {
    if (URL_) {
      await (await pg()).query(
        'INSERT INTO documents (id, doc, updated) VALUES ($1, $2, now()) ON CONFLICT (id) DO UPDATE SET doc = $2, updated = now()',
        [id, doc]);
      return;
    }
    if (existsSync(file)) await copyFile(file, file + '.backup').catch(() => {});
    const tmp = file + '.tmp';                       // rename is atomic; a crash can't truncate
    await writeFile(tmp, JSON.stringify(doc, null, 2), 'utf8');
    await rename(tmp, file);
  }).catch((e) => console.error('write failed:', e.message));
  return chain;
}

/* Server-side Claude. The key lives here, never in the page — a browser-side key
   would be readable by anyone who opens the dashboard.

   Answers are cached on a hash of the prompt. Every prompt embeds the dashboard's
   own data, so an unchanged dashboard produces an identical prompt and replays a
   stored answer for nothing. You only pay when something actually changed. */
import { createHash } from 'node:crypto';
import { readDoc, writeDoc } from './store.mjs';
import { join } from 'node:path';

const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5';
const CACHE_MS = 24 * 60 * 60 * 1000;
const MAX_PROMPT = 60000;

let client = null;
async function anthropic() {
  if (client) return client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  client = new Anthropic({ apiKey: key });
  return client;
}

export const claudeConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);
export const claudeModel = () => MODEL;

const keyFor = (prompt, maxTokens) =>
  'cache-' + createHash('sha256').update(MODEL + '|' + maxTokens + '|' + prompt).digest('hex').slice(0, 32);

export async function ask(prompt, { maxTokens = 2000, refresh = false, root } = {}) {
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return { ok: false, code: 'invalid_request', message: 'empty prompt' };
  }
  if (prompt.length > MAX_PROMPT) {
    return { ok: false, code: 'prompt_too_large', message: 'too much data to send — trim old sessions' };
  }

  const id = keyFor(prompt, maxTokens);
  const file = join(root, '.cache', id + '.json');
  if (!refresh) {
    const hit = await readDoc(id, file).catch(() => null);
    if (hit && Date.now() - (hit.at || 0) < CACHE_MS) {
      return { ok: true, text: hit.text, cached: true, model: hit.model || MODEL };
    }
  }

  const api = await anthropic();
  if (!api) return { ok: false, code: 'not_configured', message: 'ANTHROPIC_API_KEY is not set' };

  try {
    const res = await api.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    if (res.stop_reason === 'refusal') {
      return { ok: false, code: 'refused', message: 'Claude declined that one — try different wording' };
    }
    if (!text.trim()) return { ok: false, code: 'empty_completion', message: 'no answer came back' };

    await writeDoc(id, file, { text, at: Date.now(), model: MODEL }).catch(() => {});
    return { ok: true, text, cached: false, model: MODEL,
      usage: { in: res.usage.input_tokens, out: res.usage.output_tokens } };
  } catch (e) {
    const status = e?.status;
    const code = status === 401 ? 'bad_key' : status === 429 ? 'rate_limited'
      : status === 400 ? 'invalid_request' : status >= 500 ? 'upstream' : 'error';
    return { ok: false, code, message: e?.message?.slice(0, 300) || 'request failed' };
  }
}

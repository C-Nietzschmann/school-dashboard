/* ============================================================== coaching
   The queue decides WHAT to revise — that stays plain arithmetic. Claude turns
   a queued topic into something to actually do, and reads the score patterns. */
let SAMPLE = null, SERVER_CLAUDE = false, coachCtl = null;

/* Two ways to reach Claude, same interface:
   - inside a claude.ai artifact, the sample capability (billed to the viewer's
     Claude account, streams as it writes)
   - on a hosted server, POST /api/claude, where the API key stays server-side
   If neither is available the coaching UI hides itself rather than erroring. */
(async () => {
  try { SAMPLE = window.claude?.use ? await claude.use('sample') : null; }
  catch { SAMPLE = null; }
  if (!SAMPLE) {
    try { SERVER_CLAUDE = (await (await fetch('/api/claude/status')).json()).configured; }
    catch { SERVER_CLAUDE = false; }
  }
  document.body.classList.toggle('no-coach', !SAMPLE && !SERVER_CLAUDE);
})();

const DAY_MS = 86400000;

async function askText(prompt, { onText, signal, refresh = false, maxTokens = 2000 } = {}) {
  if (SAMPLE) {
    let streamed = false;
    const { text } = await SAMPLE(prompt, {
      signal, modelTier: 'quick',
      cache: { gcTime: DAY_MS, ...(refresh ? { refresh: true } : {}) },
      onText: (e) => { streamed = true; onText?.(e); },
    });
    return { text, cached: !streamed };
  }
  const r = await fetch('/api/claude', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ prompt, maxTokens, refresh }),
  });
  const d = await r.json();
  if (!d.ok) throw { code: d.code, message: d.message };
  onText?.({ text: d.text, delta: d.text });
  return { text: d.text, cached: Boolean(d.cached) };
}

async function askJson(prompt, { maxTokens = 2000 } = {}) {
  if (SAMPLE) return SAMPLE.json(prompt, { modelTier: 'quick', cache: { gcTime: DAY_MS } });
  const { text } = await askText(prompt + '\n\nReply with JSON only, no prose and no code fences.',
    { maxTokens });
  const m = text.match(/\{[\s\S]*\}/);          // tolerate a stray sentence around it
  if (!m) throw { code: 'empty_completion', message: 'no JSON came back' };
  return JSON.parse(m[0]);
}

const COACH_ERR = {
  not_granted: 'You declined Claude for this page. Reload to be asked again.',
  sampling_disabled: 'Claude is not available on this account.',
  not_configured: 'No API key set on the server — add ANTHROPIC_API_KEY.',
  bad_key: 'The API key is not valid.',
  rate_limited: 'Too many requests just now — give it a minute.',
  session_expired: 'Your session expired. Sign in again, then retry.',
  refused: 'Claude declined that one. Try a different topic.',
  empty_completion: 'Nothing came back. Try again.',
  prompt_too_large: 'Too much data to send — trim some old sessions.',
  upstream: 'Claude is having trouble right now. Try again shortly.',
};

// Escape first, then format, so nothing the model writes can inject HTML.
function mdLite(src) {
  const out = [];
  let inList = false;
  const inline = (t) => t
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*]+?)\*/g, '$1<i>$2</i>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  for (const raw of esc(src).split('\n')) {
    const line = raw.trimEnd();
    const li = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
    if (li) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push('<li>' + inline(li[1]) + '</li>');
      continue;
    }
    if (inList) { out.push('</ul>'); inList = false; }
    const hd = line.match(/^(#{2,4})\s+(.*)$/);
    if (hd) out.push('<h4>' + inline(hd[2]) + '</h4>');
    else if (line) out.push('<p>' + inline(line) + '</p>');
  }
  if (inList) out.push('</ul>');
  return out.join('');
}

async function coach(prompt, outSel, btn, { refresh = false, maxTokens = 2000 } = {}) {
  if (!SAMPLE && !SERVER_CLAUDE) return;
  const out = $(outSel);
  if (btn.dataset.busy) { coachCtl?.abort(); return; }      // a second click stops it

  coachCtl = new AbortController();
  const label = btn.dataset.label || btn.textContent;
  btn.dataset.label = label;
  btn.dataset.busy = '1';
  btn.textContent = 'Stop';
  out.innerHTML = '<div class="coach-out thinking">Thinking…</div>';

  try {
    const { cached } = await askText(prompt, {
      signal: coachCtl.signal, refresh, maxTokens,
      onText: ({ text }) => { out.innerHTML = '<div class="coach-out">' + mdLite(text) + '</div>'; },
    });
    const box = out.querySelector('.coach-out');
    if (box) {
      const tag = document.createElement('div');
      tag.className = 'coach-tag';
      tag.innerHTML = (cached ? 'unchanged since last time — replayed free' : 'fresh')
        + ' · <button class="btn ghost sm" data-coachrefresh="1">Regenerate</button>';
      box.appendChild(tag);
    }
  } catch (e) {
    if (e?.name === 'AbortError' || e?.code === 'cancelled') { if (!e.text) out.innerHTML = ''; }
    else out.innerHTML = '<div class="empty">' + esc(COACH_ERR[e?.code] || 'That did not work. Try again.') + '</div>';
  } finally {
    delete btn.dataset.busy;
    btn.textContent = label;
  }
}

const PREAMBLE = 'You are helping a UK A Level student in Year 12 (final exams summer 2028). '
  + 'Be concrete and specific to the topic named. No preamble, no encouragement, no generic study advice.';

// Claude gets the IGCSE record on every call — it is the basis of every
// prediction, and without it the advice is generic.
function baseContext() {
  return igcseSummary() + '\n'
    + S.subjects.map((s) => {
        const pr = predictedFor(s.id);
        return `${s.name}: predicted ${pr == null ? 'no data' : gradeFor(pr)}, target ${s.target}${s.locked ? ' (locked)' : ''}`;
      }).join('\n');
}

function topicContext(t) {
  const subj = subjectById(t.subjectId);
  const since = t.lastStudied ? daysBetween(t.lastStudied, todayISO()) + ' days ago' : 'never';
  return [
    'Subject: ' + subj.name,
    'Topic: ' + t.unit + ' — ' + t.name,
    'Their self-rated confidence: ' + t.confidence + '/5',
    'Last revised: ' + since,
    'Target grade: ' + subj.target,
  ].join('\n');
}

const pickedTopic = () => S.topics.find((x) => x.id === $('#coachTopic')?.value);

// Remember what produced the last answer so Regenerate can repeat it fresh.
let lastCoach = null;
function runCoach(prompt, outSel, btn, opts) {
  lastCoach = { prompt, outSel, btn, opts };
  return coach(prompt, outSel, btn, opts);
}
function coachRefresh() {
  if (!lastCoach) return;
  coach(lastCoach.prompt, lastCoach.outSel, lastCoach.btn, { ...lastCoach.opts, refresh: true });
}

function coachPlan(btn) {
  const t = pickedTopic(); if (!t) return;
  runCoach([PREAMBLE, '', topicContext(t), '',
    'Write a focused 25-minute revision plan for exactly this topic. Name the specific',
    'sub-skills to drill and the order to do them in, then finish with one worked-example',
    'type they should attempt. Short markdown headings and bullets. Under 200 words.',
  ].join('\n'), '#coachOut', btn);
}

function coachQuestions(btn) {
  const t = pickedTopic(); if (!t) return;
  runCoach([PREAMBLE, '', topicContext(t), '',
    'Write 4 exam-style A Level questions on this topic, increasing in difficulty, with',
    'realistic mark allocations in brackets. After all four, add a "## Answers" section',
    'with concise mark-scheme-style answers. Markdown.',
  ].join('\n'), '#coachOut', btn);
}

function coachAnalysis(btn) {
  const papers = S.papers.map((p) => ({
    subject: nameOf(p.subjectId), paper: p.name,
    pct: Math.round((p.mark / p.total) * 100), date: p.date,
  }));
  if (!papers.length) {
    $('#trackCoachOut').innerHTML =
      '<div class="empty">Log some past-paper scores first — there is nothing to read yet.</div>';
    return;
  }
  const targets = S.subjects.map((s) => {
    const pct = projectedPct(s.id);
    return s.name + ': target ' + s.target + ', projected ' + (pct == null ? 'no data' : Math.round(pct) + '%');
  }).join('\n');
  const weak = S.topics.filter((t) => t.finished && t.confidence <= 2)
    .map((t) => nameOf(t.subjectId) + ' — ' + t.name).slice(0, 25);

  runCoach([PREAMBLE, '', igcseSummary(), '',
    'Past-paper scores (JSON):', JSON.stringify(papers), '',
    'Targets vs projection:', targets, '',
    'Topics they rate 2/5 or below:', weak.join(', ') || 'none recorded', '',
    'Identify the three things most worth doing over the next fortnight to close the gap',
    'to target. Rank them, say why each matters given the numbers above, and give one',
    'concrete action per item. Do not restate the data back to them. Under 250 words.',
  ].join('\n'), '#trackCoachOut', btn);
}

// Queued topics first — those are what they are most likely to ask about.
function fillCoachTopics() {
  const sel = $('#coachTopic'); if (!sel) return;
  const queued = revisionQueue().map((x) => x.t);
  const rest = S.topics.filter((t) => (t.started || t.finished) && !queued.includes(t));
  const opt = (t, tag) => '<option value="' + t.id + '">'
    + esc(nameOf(t.subjectId)) + ' · ' + esc(t.name) + tag + '</option>';
  sel.innerHTML = (queued.length || rest.length)
    ? queued.map((t) => opt(t, ' — due')).join('') + rest.map((t) => opt(t, '')).join('')
    : '<option value="">Mark some topics as taught first</option>';
}


/* ------------------------------------------------- plan + card generation */

function coachReplan(btn) {
  const plan = studyPlan();
  const weak = weakSpots(6);
  const summary = plan.map((p) => `${p.subject.name} (${p.budget.toFixed(1)} h): `
    + p.blocks.map((b) => `${b.mins}min ${b.title}`).join('; ')).join('\n');
  const preds = S.subjects.map((s) => {
    const pr = predictedFor(s.id);
    return `${s.name}: predicted ${pr == null ? '?' : gradeFor(pr)}, target ${s.target}`;
  }).join('\n');

  runCoach([PREAMBLE, '', igcseSummary(), '',
    'Their subjects are Maths, Further Maths, Physics, Computer Science and German.',
    'German is a locked A* (native speaker) and needs no time.',
    'They are aiming at ETH Zürich engineering, which also means a January entrance',
    'exam on the Swiss Matura syllabus in maths, physics and chemistry.', '',
    'Current predictions vs targets:', preds, '',
    'The plan the dashboard generated for this week:', summary, '',
    weak.length ? 'Marks lost by topic so far: ' + weak.map((w) => `${w.name} (${w.marks})`).join(', ') : 'No question-level paper data yet.', '',
    'Critique this plan in at most 150 words. Say what is misallocated and what you would',
    'move, specifically. If the plan is sound, say so briefly and name the single thing',
    'that would improve it most. No pep talk.',
  ].join('\n'), '#planCoachOut', btn);
}

async function coachCards(btn) {
  if (!SAMPLE && !SERVER_CLAUDE) return;
  const t = S.topics.find((x) => x.id === $('#cardTopic')?.value);
  const out = $('#cardsCoachOut');
  if (!t) { out.innerHTML = '<div class="empty">Mark a topic as taught first.</div>'; return; }

  const label = btn.dataset.label || btn.textContent;
  btn.dataset.label = label; btn.disabled = true; btn.textContent = 'Writing…';
  out.innerHTML = '<div class="coach-out thinking">Writing cards…</div>';
  try {
    const data = await askJson([PREAMBLE, '', baseContext(), '', topicContext(t), '',
      'Write 8 flashcards for this topic: short prompt on the front, precise answer on the back.',
      'Facts, definitions, formulae and standard methods — things worth recalling cold, not essay prompts.',
      'Reply with JSON only: {"cards":[{"front":"...","back":"..."}]}',
    ].join('\n'), { maxTokens: 2500 });

    const made = (data?.cards || []).filter((c) => c.front && c.back);
    if (!made.length) { out.innerHTML = '<div class="empty">Nothing usable came back. Try again.</div>'; return; }
    mutate(() => {
      S.cards = S.cards || [];
      for (const c of made) {
        S.cards.push({ id: uid(), subjectId: t.subjectId, topicId: t.id,
          front: String(c.front).slice(0, 300), back: String(c.back).slice(0, 600),
          box: 1, due: todayISO(), lapses: 0, made: 'claude' });
      }
    });
    out.innerHTML = `<div class="coach-out">Added <b>${made.length}</b> cards for ${esc(t.name)}. They are due now — go and review them.</div>`;
  } catch (e) {
    out.innerHTML = '<div class="empty">' + esc(COACH_ERR[e.code] || 'That did not work. Try again.') + '</div>';
  } finally {
    btn.disabled = false; btn.textContent = label;
  }
}

function fillCardTopics() {
  const sel = $('#cardTopic'); if (!sel) return;
  const taught = S.topics.filter((t) => t.started || t.finished);
  sel.innerHTML = taught.length
    ? taught.map((t) => `<option value="${t.id}">${esc(nameOf(t.subjectId))} · ${esc(t.name)}</option>`).join('')
    : '<option value="">Mark some topics as taught first</option>';
}


/* --------------------------------------------- paste-in from Google Classroom
   The school blocks third-party OAuth, so the API and any live feed are out.
   What is not blocked is reading your own to-do list in the browser. Copy it,
   paste it here, and Claude turns the mess into dated assignments. No
   credentials, nothing automated against a session — just faster than typing. */
// Re-pasting the whole to-do list should be safe: match against what is already
// there so only genuinely new work is offered. Titles get normalised because
// Classroom rewords them slightly between views.
const hwKey = (title, due) =>
  String(title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 50) + '|' + (due || '');

function isNewHomework(title, due) {
  const key = hwKey(title, due);
  const loose = hwKey(title, '');
  return !S.homework.some((h) => hwKey(h.title, h.due) === key || hwKey(h.title, '') === loose);
}

/* Pull Classroom notifications out of the forwarded mailbox and turn them into
   homework. One Claude call for the whole batch, so a busy week costs the same
   as a quiet one, and the answer caches until the mail actually changes. */
async function coachGmailSync(btn) {
  const out = $('#gmOut');
  const label = btn.dataset.label || btn.textContent;
  btn.dataset.label = label; btn.disabled = true; btn.textContent = 'Checking…';
  out.innerHTML = '<div class="coach-out thinking">Reading your forwarded mail…</div>';
  try {
    const mail = await (await fetch('/api/gmail?days=30')).json();
    if (!mail.ok) {
      out.innerHTML = '<div class="empty">' + esc(
        mail.reason === 'not_configured'
          ? 'Gmail is not connected yet — run: node get-classroom-token.mjs --gmail'
          : (mail.detail || mail.reason)) + '</div>';
      return;
    }
    if (!mail.items.length) {
      out.innerHTML = '<div class="empty">No Classroom mail in the last 30 days. Is forwarding switched on?</div>';
      return;
    }

    btn.textContent = 'Reading…';
    const digest = mail.items.map((m) =>
      `[${m.date}] ${m.subject}\n${(m.body || m.snippet).replace(/\s+/g, ' ').slice(0, 300)}`).join('\n---\n');

    const data = await askJson([
      'These are Google Classroom notification emails. Extract the assignments.',
      `Today is ${todayISO()}. The academic year runs Sept 2026 to June 2027.`,
      'Resolve any relative date to YYYY-MM-DD. Use the email date as the reference point.',
      'Match each to a subject id where you can: '
        + S.subjects.map((x) => `${x.name} (${x.id})`).join(', ') + '.',
      'Skip notifications that are not new work — graded, returned, comments, invitations.',
      'Reply with JSON only: {"items":[{"title":"...","subjectId":"...","due":"YYYY-MM-DD","course":"..."}]}',
      'null for subjectId or due when unknown.',
      '', digest.slice(0, 12000),
    ].join('\n'), { maxTokens: 2500 });

    const parsed = (data?.items || []).filter((x) => x.title);
    const items = parsed.filter((x) => isNewHomework(x.title, x.due));
    const skipped = parsed.length - items.length;
    if (!items.length) {
      out.innerHTML = `<div class="empty">${parsed.length
        ? `All ${parsed.length} are already on your Homework tab.`
        : 'Nothing that looked like new work.'}</div>`;
      return;
    }
    out.innerHTML = `<table>
      <thead><tr><th>Assignment</th><th>Subject</th><th>Due</th><th></th></tr></thead>
      <tbody>${items.map((w) => `<tr>
        <td>${esc(w.title)}</td>
        <td>${w.subjectId && subjectById(w.subjectId)
          ? `<span class="row" style="gap:7px"><span class="dot" style="background:${colorOf(w.subjectId)}"></span>${esc(nameOf(w.subjectId))}</span>`
          : `<span style="color:var(--text-muted)">${esc(w.course || '—')}</span>`}</td>
        <td style="white-space:nowrap">${w.due ? esc(fmtDay(w.due)) : '—'}</td>
        <td><button class="btn sm" data-import='${esc(JSON.stringify({ t: w.title, d: w.due, s: w.subjectId }))}'>Add</button></td>
      </tr>`).join('')}</tbody></table>
      <div class="row" style="margin-top:10px">
        <button class="btn primary sm" data-importall='${esc(JSON.stringify(items.map((w) => ({ t: w.title, d: w.due, s: w.subjectId }))))}'>Add all ${items.length}</button>
        <span class="hint" style="margin:0">${mail.items.length} emails scanned${skipped ? `, ${skipped} already on your list` : ''}.</span>
      </div>`;
  } catch (e) {
    out.innerHTML = '<div class="empty">' + esc(COACH_ERR[e?.code] || 'That did not work. Try again.') + '</div>';
  } finally {
    btn.disabled = false; btn.textContent = label;
  }
}

async function coachClassroomPaste(btn) {
  const raw = $('#cgPaste')?.value?.trim();
  const out = $('#cgOut');
  if (!raw) { out.innerHTML = '<div class="empty">Paste your Classroom to-do list first.</div>'; return; }

  const label = btn.dataset.label || btn.textContent;
  btn.dataset.label = label; btn.disabled = true; btn.textContent = 'Reading…';
  out.innerHTML = '<div class="coach-out thinking">Reading it…</div>';
  try {
    const data = await askJson([
      'Extract assignments from text copied out of Google Classroom.',
      `Today is ${todayISO()}. The academic year runs Sept 2026 to June 2027.`,
      'Resolve relative dates ("Tomorrow", "Due Friday", "Sep 15") to YYYY-MM-DD.',
      'Match each to one of these subjects where you can: '
        + S.subjects.map((x) => `${x.name} (id ${x.id})`).join(', ') + '.',
      'Ignore anything already marked done or handed in.',
      'Reply with JSON only: {"items":[{"title":"...","subjectId":"...","due":"YYYY-MM-DD","course":"..."}]}',
      'Use null for subjectId if unsure, and null for due if no date is given.',
      '', 'The text:', raw.slice(0, 6000),
    ].join('\n'), { maxTokens: 2000 });

    const parsed = (data?.items || []).filter((x) => x.title);
    const items = parsed.filter((x) => isNewHomework(x.title, x.due));
    const skipped = parsed.length - items.length;
    if (!parsed.length) { out.innerHTML = '<div class="empty">Nothing that looked like an assignment.</div>'; return; }
    if (!items.length) {
      out.innerHTML = `<div class="empty">All ${parsed.length} are already on your Homework tab.</div>`;
      return;
    }
    out.innerHTML = `<table>
      <thead><tr><th>Assignment</th><th>Subject</th><th>Due</th><th></th></tr></thead>
      <tbody>${items.map((w) => `<tr>
        <td>${esc(w.title)}</td>
        <td>${w.subjectId && subjectById(w.subjectId)
          ? `<span class="row" style="gap:7px"><span class="dot" style="background:${colorOf(w.subjectId)}"></span>${esc(nameOf(w.subjectId))}</span>`
          : `<span style="color:var(--text-muted)">${esc(w.course || '—')}</span>`}</td>
        <td style="white-space:nowrap">${w.due ? esc(fmtDay(w.due)) : '—'}</td>
        <td><button class="btn sm" data-import='${esc(JSON.stringify({ t: w.title, d: w.due, s: w.subjectId }))}'>Add</button></td>
      </tr>`).join('')}</tbody></table>
      <div class="row" style="margin-top:10px">
        <button class="btn primary sm" data-importall='${esc(JSON.stringify(items.map((w) => ({ t: w.title, d: w.due, s: w.subjectId }))))}'>Add all ${items.length}</button>
        ${skipped ? `<span class="hint" style="margin:0">${skipped} already on your list, skipped.</span>` : ''}
      </div>`;
  } catch (e) {
    out.innerHTML = '<div class="empty">' + esc(COACH_ERR[e?.code] || 'That did not work. Try again.') + '</div>';
  } finally {
    btn.disabled = false; btn.textContent = label;
  }
}

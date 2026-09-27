/* The university route: a long plan (stages, tasks, courses, projects, earning
   tracks, entry requirements) turned into a short list for today and an honest
   answer to "am I on track?".

   Pure: it reads the state through getS and never writes it. The plan itself is
   yours — it lives in the state (S.route), never in this repository — and your
   ticks live beside it in S.routeDone. Inlined into app.html and companion.html
   the same way as plan.mjs, so it declares nothing at top level but this one
   function (see lib/inline.mjs).                                              */
export function createRoute(getS, now = () => new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const todayISO = () => iso(now());
  const state = () => getS() || {};
  const doneMap = () => state().routeDone || {};
  const isDone = (id) => Boolean(id && doneMap()[id]);
  const opts = () => ({ uk: state().routeOpts?.uk !== false, mit: state().routeOpts?.mit !== false });
  // Minutes per kind of work, as the original day-checklist budgeted them.
  const EST = { admin: 15, grades: 30, project: 45, course: 30, earn: 30 };
  // S.tests kinds that are real exams, worth pausing projects for.
  const EXAM_KINDS = ['exam', 'mock', 'unit'];

  // UK/MIT tasks disappear when you drop those applications; anything that also
  // serves another goal stays.
  function isActive(tags = []) {
    const opt = tags.filter((t) => t === 'uk' || t === 'mit');
    if (!opt.length || tags.some((t) => t !== 'uk' && t !== 'mit')) return true;
    const o = opts();
    return opt.some((t) => o[t]);
  }

  // The plan with every missing id filled in. Accepts the v1 shape (string
  // requirement items, exam_windows, no ids on tracks/projects/universities).
  function plan() {
    const r = state().route;
    if (!r || !Array.isArray(r.phases) || !r.phases.length) return null;
    return {
      ...r,
      examWindows: r.examWindows || r.exam_windows || [],
      courses: r.courses || [],
      deadlines: r.deadlines || [],
      earn: (r.earn || []).map((e, i) => ({ ...e, id: e.id || `earn-${i}` })),
      projects: (r.projects || []).map((p, i) => ({ ...p, id: p.id || `proj-${i}` })),
      unis: (r.unis || []).map((u, i) => {
        const id = u.id || `uni-${i}`;
        return { ...u, id, items: (u.items || []).map((it, k) => (typeof it === 'string'
          ? { id: `${id}-${k}`, text: it } : { ...it, id: it.id || `${id}-${k}` })) };
      }),
    };
  }

  // Every tickable thing in the plan, flat.
  function items(P = plan()) {
    if (!P) return [];
    const out = [];
    const base = { cost: null, note: null, url: null, critical: false };
    for (const ph of P.phases) {
      for (const t of ph.tasks || []) {
        out.push({ ...base, id: t.id, kind: 'task', text: t.text, phaseId: ph.id, tags: t.tags || [],
          critical: Boolean(t.critical), cost: t.cost || null, note: t.note || null });
      }
    }
    for (const c of P.courses) {
      out.push({ ...base, id: c.id, kind: 'course', text: c.name, phaseId: c.phase || null, tags: ['skill'],
        cost: c.cert === 'paid' ? 'certificate paid' : null, note: c.certNote || null, url: c.url || null,
        core: c.core !== false, by: c.by || '', cert: c.cert || 'none', when: c.when || '' });
    }
    for (const x of P.projects) {
      for (const s of x.steps || []) {
        out.push({ ...base, id: s.id, kind: 'step', text: s.text, phaseId: s.phase || null, tags: ['port'],
          projectId: x.id, projectName: x.name, mini: Boolean(x.mini), start: x.start || null });
      }
    }
    for (const e of P.earn) {
      for (const s of e.steps || []) {
        out.push({ ...base, id: s.id, kind: 'earn', text: s.text, phaseId: s.phase || null, tags: ['earn'],
          trackId: e.id, trackName: e.name });
      }
    }
    for (const u of P.unis) {
      for (const it of u.items) {
        out.push({ ...base, id: it.id, kind: 'req', text: it.text, phaseId: null, tags: [u.keep].filter(Boolean),
          uniId: u.id, keep: u.keep || null, req: it.req || null });
      }
    }
    return out;
  }

  const phaseIndex = (P) => new Map(P.phases.map((p, i) => [p.id, i]));

  // The stage you are in: the first one that has not ended yet.
  function stageIndex(date = todayISO(), P = plan()) {
    if (!P) return -1;
    const i = P.phases.findIndex((ph) => ph.end >= date);
    return i < 0 ? P.phases.length - 1 : i;
  }
  function phaseStart(i, P = plan()) {
    const ph = P.phases[i];
    return ph.start || (i > 0 ? addDays(P.phases[i - 1].end, 1) : addDays(ph.end, -61));
  }

  function validate() {
    const P = plan();
    if (!P) return { ok: false, duplicates: [], badPhaseRefs: [], warnings: ['there is no plan with stages'] };
    const all = items(P);
    const seen = new Set(), dup = new Set();
    for (const it of all) if (it.id) (seen.has(it.id) ? dup : seen).add(it.id);
    const ids = phaseIndex(P);
    const bad = all.filter((it) => it.phaseId && !ids.has(it.phaseId)).map((it) => ({ id: it.id, phase: it.phaseId }));
    for (const x of P.projects) if (x.start && !ids.has(x.start)) bad.push({ id: x.id, phase: x.start });
    const warnings = [];
    if (all.some((it) => !it.id)) warnings.push('some items have no id, so they cannot be ticked');
    P.phases.forEach((ph, i) => { if (!ph.end) warnings.push(`stage ${ph.id} has no end date`); else if (i && ph.end < P.phases[i - 1].end) warnings.push(`stage ${ph.id} ends before ${P.phases[i - 1].id}`); });
    return { ok: !dup.size && !bad.length, duplicates: [...dup], badPhaseRefs: bad, warnings };
  }

  const pct = (d, t) => (t ? Math.round((d / t) * 100) : 0);
  const count = (list) => ({ done: list.filter((it) => isDone(it.id)).length, total: list.length });

  function progress(date = todayISO()) {
    const P = plan();
    if (!P) return null;
    const idx = phaseIndex(P);
    const si = stageIndex(date, P);
    const all = items(P);
    const active = all.filter((it) => isActive(it.tags));
    // A stage's list: its tasks, courses and earning steps, plus mini-project steps
    // (which carry their own stage). Flagship steps belong to no single stage.
    const inStage = (it) => it.kind !== 'req' && it.phaseId && idx.has(it.phaseId) && (it.kind !== 'step' || it.mini);
    const stageItems = active.filter((it) => inStage(it) && idx.get(it.phaseId) === si);
    const st = count(stageItems);
    const ph = P.phases[si];
    const start = phaseStart(si, P);
    const span = Math.max(1, daysBetween(start, ph.end) + 1);
    const timePct = Math.min(100, Math.max(0, Math.round(((daysBetween(start, date) + 1) / span) * 100)));
    // With nothing ticked at all there is no evidence either way — never call
    // someone behind on a guess.
    const known = new Set(all.map((it) => it.id));
    const hasData = Object.keys(doneMap()).some((id) => known.has(id));
    const stagePct = pct(st.done, st.total);
    let verdict = 'unknown', behindBy = 0;
    if (hasData && !st.total) verdict = 'on-track';               // nothing asked of you in this stage
    else if (hasData) {
      const diff = stagePct - timePct;
      verdict = diff > 15 ? 'ahead' : diff >= -10 ? 'on-track' : 'behind';
      if (verdict === 'behind') behindBy = Math.max(1, Math.ceil((timePct / 100) * st.total - st.done));
    }
    const planItems = active.filter((it) => inStage(it) || (it.kind === 'step' && !it.mini));
    const stepsOf = (x) => active.filter((it) => it.kind === 'step' && it.projectId === x.id);
    const projects = P.projects.map((x) => {
      const steps = stepsOf(x);
      const c = count(steps);
      const next = steps.find((it) => !isDone(it.id));
      const startIdx = x.start && idx.has(x.start) ? idx.get(x.start)
        : Math.min(...steps.map((s) => (idx.has(s.phaseId) ? idx.get(s.phaseId) : Infinity)));
      const status = c.total && c.done === c.total ? 'done' : c.done ? 'in-progress' : startIdx > si ? 'later' : 'not-started';
      return { id: x.id, name: x.name, mini: Boolean(x.mini), kind: x.kind || '', done: c.done, total: c.total,
        pct: pct(c.done, c.total), status, next: next ? { id: next.id, text: next.text } : null };
    });
    const courses = active.filter((it) => it.kind === 'course');
    return {
      hasData,
      stage: { index: si, id: ph.id, station: ph.station, when: ph.when || '', why: ph.why || '', ...st,
        pct: stagePct, timePct, verdict, behindBy },
      plan: { ...count(planItems), pct: pct(count(planItems).done, planItems.length) },
      projects,
      courses: { ...count(courses), core: count(courses.filter((c) => c.core)) },
      earn: P.earn.map((e) => {
        const steps = active.filter((it) => it.kind === 'earn' && it.trackId === e.id);
        const next = steps.find((it) => !isDone(it.id));
        return { id: e.id, name: e.name, ...count(steps), next: next ? { id: next.id, text: next.text } : null };
      }),
      reqs: P.unis.map((u) => ({ id: u.id, name: u.name, keep: u.keep || null, active: isActive([u.keep].filter(Boolean)),
        ...count(all.filter((it) => it.kind === 'req' && it.uniId === u.id)) })),
    };
  }

  function examOn(date, P) {
    const w = P.examWindows.find((x) => x.from <= date && date <= x.to);
    if (w) return w.label || 'exams';
    const t = (state().tests || [])
      .filter((x) => x.date && EXAM_KINDS.includes(x.kind) && x.result == null && x.date >= date && daysBetween(date, x.date) <= 10)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    return t ? t.title || 'exam' : null;
  }

  // Today's short list. Deterministic: the same plan, ticks and date always give
  // the same list, so the dashboard, the companion and Claude chat agree.
  function checklist(date = todayISO(), { minutes } = {}) {
    const P = plan();
    if (!P) return null;
    const idx = phaseIndex(P);
    const si = stageIndex(date, P);
    const stage = { id: P.phases[si].id, station: P.phases[si].station };
    const wd = parse(date).getDay();
    const holiday = (state().calendar?.holidays || []).some((h) => h.start <= date && date <= h.end);
    const weekend = wd === 0 || wd === 6;

    const sizeOf = (it) => (it.kind === 'course' ? 'course' : it.kind === 'earn' ? 'earn' : it.kind === 'step' ? 'project'
      : it.tags.includes('grades') ? 'grades' : it.tags.includes('port') ? 'project' : it.tags.includes('skill') ? 'course' : 'admin');
    const stageOf = (it) => (it.kind === 'step' && !it.mini
      ? (it.start && idx.has(it.start) ? idx.get(it.start) : 0)
      : (it.phaseId && idx.has(it.phaseId) ? idx.get(it.phaseId) : Infinity));

    // Candidates: open, active, due by now. A flagship project and an earning track
    // offer only their next step — milestones are done in order.
    const cands = [];
    const nextOnly = new Set();
    for (const it of items(P)) {
      if (it.kind === 'req' || !it.id || isDone(it.id) || !isActive(it.tags)) continue;
      const i = stageOf(it);
      if (i > si) continue;
      if ((it.kind === 'step' && !it.mini) || it.kind === 'earn') {
        const key = it.projectId || it.trackId;
        if (nextOnly.has(key)) continue;
        nextOnly.add(key);
      }
      cands.push({ it, i, overdue: i < si, size: sizeOf(it), k: cands.length });
    }
    cands.sort((a, b) => (b.overdue - a.overdue) || (a.i - b.i) || (a.k - b.k));
    const row = (c, reason) => ({ id: c.it.id, kind: c.it.kind, text: c.it.kind === 'course' ? `Work on: ${c.it.text}` : c.it.text,
      minutes: EST[c.size], overdue: c.overdue, critical: c.it.critical, reason, url: c.it.url || null,
      projectName: c.it.projectName || null, trackName: c.it.trackName || null });

    // Exam time: grades only, plus one critical deadline that cannot wait.
    const examLabel = examOn(date, P);
    if (examLabel) {
      const out = [];
      const g = cands.find((c) => c.it.kind === 'task' && c.it.tags.includes('grades'));
      out.push(g ? row(g, 'exam: grades only') : { id: null, kind: 'revision', text: `Revision block: ${examLabel}`,
        minutes: 60, overdue: false, critical: false, reason: 'exam: grades only', url: null, projectName: null, trackName: null });
      const crit = cands.find((c) => c !== g && c.it.kind === 'task' && c.it.critical
        && !c.it.tags.some((t) => t === 'port' || t === 'skill' || t === 'earn'));
      if (crit) out.push(row(crit, 'critical'));
      const total = out.reduce((a, x) => a + x.minutes, 0);
      return { date, mode: 'exam', budget: total, totalMinutes: total, examLabel, stage, items: out };
    }

    const budget = minutes || (weekend || holiday ? 150 : 75);
    const picked = [], used = new Set();
    let total = 0;
    const take = (c, reason, force = false) => {
      if (!c || used.has(c)) return;
      if (!force && picked.length && total + EST[c.size] > budget) return;
      used.add(c); picked.push(row(c, reason)); total += EST[c.size];
    };
    // 1. critical items always go first (at most two)
    for (const c of cands.filter((x) => x.it.critical).slice(0, 2)) take(c, 'critical', true);
    // 2. variety: projects Mon/Wed/Fri, courses Tue/Thu, a bit of everything at weekends
    const wants = weekend || holiday ? [['project', 'project day'], ['course', 'course day'], ['earn', 'weekend earning']]
      : [1, 3, 5].includes(wd) ? [['project', 'project day']] : [['course', 'course day']];
    for (const [size, reason] of wants) take(cands.find((c) => !used.has(c) && c.size === size), reason);
    // 3. fill what is left of the time, overdue first
    for (const c of cands) {
      take(c, c.overdue ? `overdue from ${P.phases[c.i]?.station || 'an earlier stage'}` : c.size === 'admin' ? 'quick admin' : 'next in your plan');
    }
    return { date, mode: holiday ? 'holiday' : weekend ? 'weekend' : 'school', budget, totalMinutes: total, examLabel: null, stage, items: picked };
  }

  function deadlines(date = todayISO(), n = 5) {
    const P = plan();
    if (!P) return [];
    return P.deadlines.filter((d) => d.date >= date && isActive([d.tag].filter(Boolean)))
      .sort((a, b) => a.date.localeCompare(b.date)).slice(0, n)
      .map((d) => ({ date: d.date, label: d.label, approx: Boolean(d.approx), tag: d.tag || null, daysLeft: daysBetween(date, d.date) }));
  }

  return { plan, opts, isDone, todayISO, isActive, stageIndex, phaseStart, items, validate, progress, checklist, deadlines };
}

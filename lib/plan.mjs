/* The planning engine: everything that decides what to study, shared by the
   dashboard page and the server.

   The dashboard used to own this code inline, which meant the server could not
   answer "what should I do in period 3?" without a browser. It lives here now:
   server.mjs imports it for /api/app/today and the MCP connector, and app.html
   gets the same source inlined where it says @inline, so the page and the
   server can never disagree.

   Pure functions of the state and nothing else — no DOM, no fetch, no storage.
   Keep it that way: this file is pasted into a classic <script> with `export`
   stripped, so `createPlanner` must stay its only top-level name.             */
export function createPlanner(getS, now = () => new Date()) {
  /* ---------------------------------------------------------------- dates
     Local calendar dates, never UTC — toISOString() would report yesterday
     between local midnight and 02:00 in CEST, shifting every date. */
  const DAY = 864e5;
  const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const todayISO = () => isoOf(now());
  const parseD  = (s) => { const [y,m,d] = String(s).split('-').map(Number); return new Date(y, m-1, d); };
  const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / DAY);
  const toMins = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + m; };
  const hhmm = (d = now()) =>
    String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const dayKeyOf = (d = now()) => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()];
  const addDays = (iso, n) => { const d = parseD(iso); d.setDate(d.getDate() + n); return isoOf(d); };

  const subjectById = (id) => getS().subjects.find((s) => s.id === id);
  const topicById = (id) => getS().topics.find((t) => t.id === id);

  const CAL = () => getS().calendar || { terms: [], holidays: [] };
  const holidayOn = (iso) => CAL().holidays.find((h) => iso >= h.start && iso <= h.end) || null;
  const termOn    = (iso) => CAL().terms.find((t) => iso >= t.start && iso <= t.end) || null;

  /* ====================================================== the revision engine
     Spaced repetition applied to spec topics. A topic you rate 0/5 comes back
     tomorrow; one you rate 5/5 comes back in a month. Priority is how far past
     that interval you are, nudged by how much the subject is worth to you and
     whether something is due in it soon. Only topics you've marked as taught
     can enter the queue — no point revising what school hasn't covered.        */
  const INTERVALS = [1, 2, 4, 8, 16, 32];

  function priorityOf(topic, today = todayISO()) {
    const S = getS();
    if (!topic.finished) return null;   // still being taught — that is consolidation, not recall
    const interval = INTERVALS[topic.confidence] ?? 1;
    const since = topic.lastStudied ? daysBetween(topic.lastStudied, today) : interval * 2;
    const overdue = Math.max(0, since) / interval;

    const subj = subjectById(topic.subjectId);
    const maxH = Math.max(...S.subjects.map((s) => s.weeklyHours || 1), 1);
    const weight = 0.55 + 0.45 * ((subj?.weeklyHours || 1) / maxH);

    // anything due in this subject within 10 days pulls its topics up the queue
    const soon = S.homework.some((h) => !h.done && h.subjectId === topic.subjectId
      && h.due && daysBetween(today, h.due) >= 0 && daysBetween(today, h.due) <= 10);

    return overdue * weight * (soon ? 1.45 : 1);
  }

  function revisionQueue(limit = 0) {
    const today = todayISO();
    const q = getS().topics
      .map((t) => ({ t, p: priorityOf(t, today) }))
      .filter((x) => x.p !== null && x.p > 0.75)
      .sort((a, b) => b.p - a.p);
    return limit ? q.slice(0, limit) : q;
  }

  /* ================================================== grades & projection */
  function gradeFor(pct) {
    if (pct == null) return null;
    const b = Object.entries(getS().settings.boundaries).sort((x, y) => y[1] - x[1]);
    for (const [g, cut] of b) if (pct >= cut) return g;
    return 'U';
  }

  /* How the weekly budget should be split. Every subject keeps a maintenance
     share of its timetabled load; the rest is distributed by how far the
     prediction sits below target, with a floor so nothing gets abandoned. */
  function workloadPlan() {
    const S = getS();
    const budget = S.settings.weeklyTargetHours || 20;
    const cut = Object.fromEntries(Object.entries(S.settings.boundaries));
    const rows = S.subjects.map((s) => {
      const pred = predictedFor(s.id);
      const target = cut[s.target] ?? 70;
      const need = Math.max(1.5, pred == null ? 8 : target - pred);   // 1.5 = consolidation
      return { s, pred, target, need, floor: (s.weeklyHours || 1) * 0.4 };
    });
    const floors = rows.reduce((a, r) => a + r.floor, 0);
    const spare = Math.max(0, budget - floors);
    const totalNeed = rows.reduce((a, r) => a + r.need, 0) || 1;
    return rows.map((r) => ({ ...r, hours: r.floor + spare * (r.need / totalNeed) }));
  }

  // Recency-weighted mean of past-paper percentages (half-life: 3 papers), so a
  // bad mock in September stops dragging the projection down by Christmas.
  function projectedPct(subjectId) {
    const ps = getS().papers.filter((p) => p.subjectId === subjectId && p.total > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (!ps.length) return null;
    let num = 0, den = 0;
    ps.forEach((p, i) => {
      const w = Math.pow(0.5, (ps.length - 1 - i) / 3);
      num += (p.mark / p.total) * 100 * w; den += w;
    });
    return num / den;
  }

  /* ---------------------------------------------- IGCSE -> A Level prediction
     Two refinements over a flat grade lookup:
     1. Where inside the grade band the mark sat. A 7 two marks short of an 8 is
        not the same candidate as a 7 that scraped in.
     2. Subject difficulty. Further Maths is examined harder and taken by a
        self-selected cohort, so the same student lands below their Maths grade. */
  const SUBJECT_DIFFICULTY = { maths: 0, fmaths: -5, physics: 0, cs: 0, german: 0 };

  function effectiveGrade(r) {
    if (r.native) return 9.4;                       // native speaker, ceiling case
    if (r.pct == null || r.bandStart == null) return r.grade;
    const frac = Math.max(0, Math.min(0.95, (r.pct - r.bandStart) / (r.nextBand - r.bandStart)));
    return r.grade + frac;
  }

  // The school rule of thumb: A Level lands about a grade below GCSE — a 9 near
  // A*, an 8 near A, a 7 near B. Ten percentage points per grade off a 62% anchor.
  const gradeToALevel = (eff) => 62 + (eff - 7) * 10;

  function igcseBaselineFor(subjectId) {
    const S = getS();
    const rows = (S.igcse || []).filter((r) => (r.maps || []).includes(subjectId));
    const direct = rows.length > 0;
    const pick = direct ? rows : (S.igcse || []).filter((r) => (r.maps || []).length && !r.native);
    if (!pick.length) return null;
    const eff = pick.reduce((a, r) => a + effectiveGrade(r), 0) / pick.length;
    const pct = gradeToALevel(eff) + (SUBJECT_DIFFICULTY[subjectId] ?? 0);
    return { pct: Math.max(0, Math.min(100, pct)), eff, direct };
  }

  // Before you have papers the IGCSE baseline carries the projection; after three
  // papers it is entirely your real marks.
  function predictedFor(subjectId) {
    const S = getS();
    const subj = subjectById(subjectId);
    if (subj?.locked) return S.settings.boundaries[subj.target] + 8;   // treated as certain
    const proj = projectedPct(subjectId);
    const base = igcseBaselineFor(subjectId);
    const n = S.papers.filter((p) => p.subjectId === subjectId && p.total > 0).length;
    if (!base) return proj;
    if (proj == null) return base.pct;
    const w = Math.min(1, n / 3);
    return base.pct * (1 - w) + proj * w;
  }

  /* ============================================================ study stats */
  function weekStart(d = now()) {
    const x = new Date(d); const day = (x.getDay() + 6) % 7;   // Monday = 0
    x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x;
  }
  function minutesThisWeek(subjectId = null, d = now()) {
    const from = isoOf(weekStart(d));
    return getS().sessions
      .filter((s) => s.date >= from && (!subjectId || s.subjectId === subjectId))
      .reduce((a, s) => a + (Number(s.minutes) || 0), 0);
  }

  const cardsDue = (iso = todayISO()) =>
    (getS().cards || []).filter((c) => !c.due || c.due <= iso);

  /* =================================================== past-paper analysis
     A percentage tells you that you dropped marks. Question-level entries tell
     you where and why, which is the part you can act on. Marked work from the
     companion app (S.attempts) counts the same as a paper's questions. */
  function lostMarks() {
    const S = getS();
    const byTopic = {}, byType = {}, bySubject = {};
    let total = 0;
    const add = (subjectId, topicId, type, m) => {
      total += m;
      const key = topicId || (subjectId + ':unassigned');
      byTopic[key] = (byTopic[key] || 0) + m;
      byType[type] = (byType[type] || 0) + m;
      bySubject[subjectId] = (bySubject[subjectId] || 0) + m;
    };
    for (const p of S.papers) {
      for (const q of (p.questions || [])) {
        const m = Number(q.marksLost) || 0;
        if (m) add(p.subjectId, q.topicId, q.type, m);
      }
    }
    for (const a of (S.attempts || [])) {
      for (const q of (a.questions || [])) {
        const m = Number(q.marksLost) || 0;
        if (m) add(a.subjectId, q.topicId || a.topicId, q.type, m);
      }
    }
    return { byTopic, byType, bySubject, total };
  }

  function weakSpots(limit = 8) {
    const { byTopic } = lostMarks();
    return Object.entries(byTopic)
      .map(([key, marks]) => {
        const t = topicById(key);
        return { key, marks, topic: t,
          name: t ? t.name : 'Unassigned',
          subjectId: t ? t.subjectId : key.split(':')[0] };
      })
      .sort((a, b) => b.marks - a.marks)
      .slice(0, limit);
  }

  /* --------------------------------------------------------------- phases
     Past papers in week two are theatre: you cannot be tested on material you
     have not been taught. Each subject moves through three phases based on how
     much of its spec school has actually finished. */
  function phaseOf(subjectId) {
    const all = getS().topics.filter((t) => t.subjectId === subjectId);
    const fin = all.filter((t) => t.finished).length;
    if (fin < 4) return 'learning';
    return fin / (all.length || 1) < 0.45 ? 'building' : 'exam';
  }

  /* ========================================================== the study plan
     Deterministic and always current: it rebuilds from your predictions, the
     revision queue, due cards and where you actually lost marks. Log a session or
     a paper and the next render already reflects it. */
  function studyPlan() {
    const S = getS();
    const hours = Object.fromEntries(workloadPlan().map((p) => [p.s.id, p.hours]));
    const weak = weakSpots(30);
    const queue = revisionQueue();
    const due = cardsDue();

    return S.subjects.filter((s) => s.active).map((s) => {
      const budget = hours[s.id] || 0;
      const phase = phaseOf(s.id);
      let left = Math.round(budget * 60);
      const blocks = [];
      const push = (mins, title, why, topicId) => {
        if (left < 15 || mins <= 0) return;
        const m = Math.min(mins, left);
        blocks.push({ mins: m, title, why, topicId });
        left -= m;
      };

      // 1. whatever school is teaching RIGHT NOW — consolidate while it is fresh
      const live = S.topics.filter((t) => t.subjectId === s.id && t.started && !t.finished);
      for (const t of live.slice(0, 3)) {
        push(40, t.name, 'in lessons now — work through the examples while it is fresh', t.id);
      }
      // 2. marks you actually lost, once there are any
      for (const w of weak.filter((w) => w.subjectId === s.id).slice(0, 2)) {
        push(45, w.name, `${w.marks} marks lost here across your papers`, w.topic?.id);
      }
      // 3. the spaced-repetition queue, which only holds finished topics
      for (const { t } of queue.filter((q) => q.t.subjectId === s.id).slice(0, 3)) {
        push(40, t.name, `due for recall — last done ${t.lastStudied ? daysBetween(t.lastStudied, todayISO()) + 'd ago' : 'never'}, confidence ${t.confidence}/5`, t.id);
      }
      // 4. flashcards
      const dueHere = due.filter((c) => c.subjectId === s.id).length;
      if (dueHere) push(20, `${dueHere} flashcard${dueHere === 1 ? '' : 's'} due`, 'active recall — the cheapest marks on this list', null);

      // 5. the filler depends on the phase, because a past paper in week two is theatre
      const finished = S.topics.filter((t) => t.subjectId === s.id && t.finished);
      if (phase === 'learning') {
        // Rotate through what you're actually being taught. When that runs out,
        // stop inventing work — in week one there genuinely isn't more to do.
        const pool = [...live, ...finished];
        for (let i = 0; i < pool.length * 2 && left >= 25; i++) {
          const t = pool[i % pool.length];
          push(Math.min(45, left), `Textbook exercises — ${t.name}`,
            'practice on what you were just taught, while it is still fresh', t.id);
        }
      } else if (phase === 'building') {
        for (let i = 0; i < finished.length * 2 && left >= 30; i++) {
          const t = finished[i % finished.length];
          push(Math.min(50, left), `Past-paper questions — ${t.name}`,
            'questions on finished topics only, not whole papers yet', t.id);
        }
      } else {
        let paper = 1;
        while (left >= 45) {
          push(Math.min(90, left), `Past paper${paper > 1 ? ' #' + paper : ''} under timed conditions`,
            'builds exam pace, and feeds the Analysis tab', null);
          if (++paper > 6) break;
        }
      }
      return { subject: s, budget, phase, blocks, spare: left };
    });
  }

  /* ================================================================ the day
     Week A / week B. The week containing weekAStart is A; they alternate from
     there, so the answer holds across holidays and into next year. */
  function weekOf(iso = todayISO()) {
    const S = getS();
    const monday = (d) => { const x = parseD(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
    const weeks = Math.round((monday(iso) - monday(S.profile.weekAStart || S.profile.termStart)) / (7 * DAY));
    return ((weeks % 2) + 2) % 2 === 0 ? 'A' : 'B';
  }
  const dayPlan = (dayKey, iso = todayISO()) => (getS().timetable?.[weekOf(iso)]?.[dayKey]) || [];

  // Merge back-to-back slots of the same subject into one entry, so a double
  // lesson (or a double free) is one block rather than two. Slots with their
  // own titles stay apart: a tutorial followed by a study period is two things.
  function mergedDay(dayKey, iso = todayISO()) {
    const slots = dayPlan(dayKey, iso).slice()
      .sort((a, b) => (a.start || '').localeCompare(b.start || ''));
    const out = [];
    for (const sl of slots) {
      const prev = out[out.length - 1];
      const contiguous = prev && prev.subjectId === sl.subjectId && (prev.title || '') === (sl.title || '')
        && prev.end && sl.start && toMins(sl.start) - toMins(prev.end) <= 15;
      if (contiguous) { prev.end = sl.end; prev.double = true; }
      else out.push({ ...sl });
    }
    return out;
  }

  // A study period is a slot with no A Level subject that is not something
  // else with a name: tutorials, PE, assembly and the like sit on the rota as
  // non-subject slots too, but you cannot revise in them.
  const NOT_STUDY = /tutor|\bp\.?e\b|games|sport|assembly|registration|form time|enrichment|lunch|break|chapel|mentor|careers|pshe|wellbeing/i;
  const isStudySlot = (l) => l.subjectId === 'free' && !NOT_STUDY.test(l.title || '');

  // The lessons on a date: nothing on a holiday or a weekend.
  function lessonsOn(iso = todayISO()) {
    if (holidayOn(iso)) return [];
    return mergedDay(dayKeyOf(parseD(iso)), iso);
  }

  /* Study sessions you add yourself — a Saturday morning, a holiday, an evening.
     They sit next to the timetable's study periods and get the same options.
     Their keys start with "x" so they never collide with a lesson's start time. */
  const extraSlotsOn = (iso) => ((getS().extraSlots || {})[iso] || [])
    .filter((x) => x && x.key && x.start)
    .map((x) => ({ key: x.key, start: x.start, end: x.end || x.start, period: '', subjectId: 'free',
      title: x.title || 'Study session', room: '', extra: true }));
  function studySlotsOn(iso = todayISO()) {
    const fixed = lessonsOn(iso).filter(isStudySlot).map((l) => ({ ...l, key: l.start || l.period }));
    return [...fixed, ...extraSlotsOn(iso)].sort((a, b) => toMins(a.start) - toMins(b.start));
  }

  /* ================================================================= to-dos
     A task's weight is how much it matters times how soon it bites. Overdue
     work outranks everything of equal priority; undated work sinks. */
  const PRIORITY_WEIGHT = { high: 3, normal: 2, low: 1 };

  function taskScore(h, iso = todayISO()) {
    const w = PRIORITY_WEIGHT[h.priority] ?? 2;
    if (!h.due) return w * 0.6;
    const d = daysBetween(iso, h.due);
    const urgency = d < 0 ? 2.4 : d === 0 ? 2.1 : d === 1 ? 1.8 : d <= 3 ? 1.4 : d <= 7 ? 1.0 : 0.6;
    return w * urgency;
  }

  const ARCHIVE_AFTER = 14;
  /* ============================================================ mistakes
     A wrong answer from marked work stays open until you fix it. */
  function openMistakes() {
    const out = [];
    const today = todayISO();
    for (const a of (getS().attempts || [])) {
      for (const q of (a.questions || [])) {
        if (q.correct || !(Number(q.marksLost) > 0) || q.resolved) continue;
        // unfixed after ARCHIVE_AFTER days, the server archives it (archiveStale)
        const archiveOn = addDays(a.date, ARCHIVE_AFTER);
        out.push({ attemptId: a.id, date: a.date, subjectId: a.subjectId,
          topicId: q.topicId || a.topicId || null, q: q.q, marksLost: Number(q.marksLost),
          type: q.type || null, title: a.title, archiveOn, daysLeft: daysBetween(today, archiveOn) });
      }
    }
    return out.sort((x, y) => y.date.localeCompare(x.date));
  }

  /* ================================================================ mastery
     How good you are at each topic, 0–100, from evidence rather than feel.

     Every mark you gain or drop is evidence, weighted by how recent it is
     (half-life three weeks, so a bad week in September fades by November):
       - marked work: marks gained / marks available, per topic
       - tests you log a result for: the score, spread over the test's topics
       - question-level paper entries: lost marks count against the topic
       - a mistake you later fix counts back in your favour
     Your own 0–5 rating is a prior worth a couple of marks, so a topic nobody
     has tested yet still has a sensible number — but real marks soon outvote it.
     `evidence` says how much the number rests on; the app shows it so a score
     built from one worksheet does not look as sure as one built from ten.    */
  const HALF_LIFE = 21;
  // A language you speak natively (German, here): its marks go on exam technique
  // and written accuracy, not on knowing the language.
  const isNative = (s) => Boolean(s && (s.native || (getS().igcse || []).some((r) => r.native && (r.maps || []).includes(s.id))
    || (s.locked && s.id === 'german')));
  const NATIVE_ADVICE = 'As a native speaker your marks go on exam technique and written accuracy: cover every bullet point, keep to the word count, write formally, and proofread for das/dass, endings and commas.';
  const ERROR_ADVICE = {
    careless:  'Mostly careless slips — slow down on the last line and check signs, units and copying.',
    method:    'Mostly method — study worked examples, then redo the question without looking.',
    knowledge: 'Mostly knowledge gaps — re-learn the notes first, then turn them into flashcards.',
    timing:    'Mostly timing — practise timed sets and move on from stuck questions sooner.',
  };

  /* How hard a question is changes what a mark says about you, on a 1–5 scale:
     1 recall, 2 routine, 3 exam standard, 4 hard, 5 A* stretch.
       lo–hi   what no marks and full marks show: full marks on easy work shows
               at most so much; no marks on hard work still shows something
       wf, ws  how much a miss and a full-marks answer count: missing an easy
               question tells a lot, getting it right little — and the other
               way round for a hard one
     Work with no difficulty counts as exam standard — exactly as before. */
  const DIFFICULTY = {
    1: { lo: 0, hi: 0.75, wf: 1.5, ws: 0.5 }, 2: { lo: 0, hi: 0.9, wf: 1.25, ws: 0.75 }, 3: { lo: 0, hi: 1, wf: 1, ws: 1 },
    4: { lo: 0.15, hi: 1, wf: 0.75, ws: 1.25 }, 5: { lo: 0.3, hi: 1, wf: 0.5, ws: 1.5 },
  };
  const PACK_DIFFICULTY = { 'warm-up': 1, exam: 3, hard: 4, stretch: 5 };
  const band = (d) => DIFFICULTY[Math.min(5, Math.max(1, Math.round(Number(d) || 3)))];
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  // what a result shows (0–1) and how much it counts (×)
  const shown = (frac, d) => { const b = band(d); return b.lo + clamp01(frac) * (b.hi - b.lo); };
  const counts = (frac, d) => { const b = band(d); return b.wf + clamp01(frac) * (b.ws - b.wf); };

  function mastery(iso = todayISO()) {
    const S = getS();
    // a question pack's answers take the pack's difficulty where a question has none of its own
    const packDiff = {};
    for (const k of (S.packs || [])) if (k.taskId) packDiff[k.taskId] = PACK_DIFFICULTY[k.difficulty] || 3;
    const ev = {};                       // topicId -> [{date, frac, w, type?, lost?}]
    const push = (topicId, date, frac, w, extra = {}) => {
      if (!topicId || !(w > 0)) return;
      (ev[topicId] ||= []).push({ date: date || iso, frac: Math.max(0, Math.min(1, frac)), w, ...extra });
    };

    for (const a of (S.attempts || [])) {
      // one evidence item per topic per attempt: what its marks show, each
      // question counted by its marks and how hard it is
      const per = {};
      for (const q of (a.questions || [])) {
        const tid = q.topicId || a.topicId;
        if (!tid) continue;
        const max = Math.max(1, Number(q.max) || 1);
        const lost = Math.min(max, Math.max(0, Number(q.marksLost) || 0));
        const d = q.diff ?? packDiff[a.homeworkId] ?? 3;
        const r = (per[tid] ||= { max: 0, lost: 0, num: 0, den: 0, types: {} });
        r.max += max; r.lost += lost;
        const frac = (max - lost) / max, w = max * counts(frac, d);
        r.num += w * shown(frac, d); r.den += w;
        if (lost && q.type) r.types[q.type] = (r.types[q.type] || 0) + lost;
        // a fixed mistake is evidence you can now do it — half weight if you
        // only said so, full if Claude checked the redo
        if (lost && q.resolved && q.resolved !== 'archived') push(tid, q.resolvedAt || a.date, 1, lost * (q.resolved === 'checked' ? 0.6 : 0.3));
      }
      for (const [tid, r] of Object.entries(per)) {
        // as many marks count as before (up to 12), scaled by how hard they were on average
        push(tid, a.date, r.num / r.den, Math.min(r.max, 12) * (r.den / r.max), { types: r.types });
      }
    }
    // practice marked elsewhere (Assignment Arrow): its marks and difficulty, logged with the study session
    for (const s of (S.sessions || [])) {
      const e = s.evidence;
      if (!s.topicId || !e || !(e.max > 0)) continue;
      const d = e.diff ?? 3;
      push(s.topicId, s.date, shown(e.marks / e.max, d), Math.min(e.max, 12) * counts(e.marks / e.max, d));
    }
    // homework: how a to-do went (your mark, or your own 1–5), when no marked work came with it
    const markedHw = new Set((S.attempts || []).map((a) => a.homeworkId).filter(Boolean));
    for (const h of (S.homework || [])) {
      const r = h.result;
      if (!r?.topicIds?.length || markedHw.has(h.id)) continue;
      const n = Math.sqrt(r.topicIds.length);
      for (const tid of r.topicIds) {
        if (r.max > 0) push(tid, r.date || h.doneAt, r.marks / r.max, Math.min(r.max, 10) * 0.6 / n);
        else if (r.rating) push(tid, r.date || h.doneAt, (r.rating - 1) / 4, 1.5 / n);
      }
    }
    for (const t of (S.tests || [])) {
      if (t.result == null || !t.topicIds?.length) continue;
      const pct = Number(t.result) / 100;
      for (const tid of t.topicIds) push(tid, t.date, pct, 8 / Math.sqrt(t.topicIds.length));
    }
    for (const p of S.papers) {
      for (const q of (p.questions || [])) {
        const m = Number(q.marksLost) || 0;
        if (m && q.topicId) push(q.topicId, p.date, 0, Math.min(m, 6) * 0.5, { types: { [q.type]: m } });
      }
    }

    const decay = (date) => Math.pow(0.5, Math.max(0, daysBetween(date, iso)) / HALF_LIFE);
    const topics = {};
    for (const t of S.topics) {
      const items = ev[t.id] || [];
      const rated = t.lastStudied || (t.studyCount || 0) > 0 || t.confidence > 0;
      // the prior: your own rating if you have given one, otherwise "unknown"
      let num = rated ? (t.confidence / 5) * 2 : 0.5 * 0.5;
      let den = rated ? 2 : 0.5;
      let evidence = 0, recentN = 0, recentD = 0, oldN = 0, oldD = 0;
      const types = {};
      for (const e of items) {
        const w = e.w * decay(e.date);
        num += w * e.frac; den += w; evidence += w;
        if (daysBetween(e.date, iso) <= HALF_LIFE) { recentN += e.w * e.frac; recentD += e.w; }
        else { oldN += e.w * e.frac; oldD += e.w; }
        for (const [k, v] of Object.entries(e.types || {})) types[k] = (types[k] || 0) + v;
      }
      const trend = recentD && oldD
        ? (recentN / recentD - oldN / oldD > 0.08 ? 'up' : oldN / oldD - recentN / recentD > 0.08 ? 'down' : 'flat')
        : null;
      topics[t.id] = {
        score: Math.round(100 * num / den),
        evidence: +evidence.toFixed(1),
        level: evidence < 1 ? 'none' : evidence < 5 ? 'low' : evidence < 15 ? 'ok' : 'strong',
        trend, types,
      };
    }

    const subjects = {};
    for (const s of S.subjects) {
      const mine = S.topics.filter((t) => t.subjectId === s.id);
      // the subject score only counts topics you have met: started, or tested
      const met = mine.filter((t) => t.started || t.finished || topics[t.id].evidence > 0);
      const w = (t) => 1 + topics[t.id].evidence;
      const den = met.reduce((a, t) => a + w(t), 0);
      const score = den ? Math.round(met.reduce((a, t) => a + topics[t.id].score * w(t), 0) / den) : null;
      const withEv = met.filter((t) => topics[t.id].evidence >= 2);
      const byScore = (dir) => withEv.slice().sort((a, b) => dir * (topics[a.id].score - topics[b.id].score));
      const types = {};
      for (const t of mine) for (const [k, v] of Object.entries(topics[t.id].types)) types[k] = (types[k] || 0) + v;
      const dominant = Object.entries(types).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      subjects[s.id] = {
        score, met: met.length, total: mine.length,
        strongest: byScore(-1).filter((t) => topics[t.id].score >= 65).slice(0, 3).map((t) => t.id),
        weakest: byScore(1).filter((t) => topics[t.id].score < 65).slice(0, 3).map((t) => t.id),
        errorMix: types, dominant, advice: isNative(s) && (dominant || met.length) ? NATIVE_ADVICE : dominant ? ERROR_ADVICE[dominant] : null,
      };
    }
    return { topics, subjects };
  }

  /* ========================================================= study periods
     What to do with each free period today. Not one answer — up to three
     options, so you choose, each saying why it is on the list. Candidates:

       test prep   topics of a test in the next 14 days, rising as it nears and
                   the lower your level in them is
       tasks       homework, by priority × how soon it is due
       mistakes    unfixed mistakes from marked work
       current     what school is teaching now, weakest first, and a bonus if
                   you had that subject earlier today
       review      finished topics due for spaced recall, weakest first
       cards       flashcards due, as a filler

     Everything is nudged towards subjects that are behind this week's plan.
     Slots take turns, so period 3 does not just repeat period 1's list, and
     whatever you already picked for one period is not offered in another. */
  /* ========================================================== a test's plan
     From the day a test is added until you sit it, it comes first: your
     teacher's worksheets on it, then one booklet of hard exam questions aimed at
     your weak spots (as long as the time left allows), then the last free
     periods on your weakest topics. Worked out afresh every time, so it moves
     on when you do something early, and makes room when you choose something
     else for a period. */
  const TEST_WINDOW = 21;           // days ahead a test takes the top of your free periods
  const BOOKLET_MIN_PER_Q = 9;      // one hard exam question: read, done and checked
  const EVENING_MINS = 40;          // home study counted for each evening, besides free periods

  // your teacher's worksheets for it: same subject, and on its topics when it has some
  function testWorksheets(test, iso = todayISO(), m = mastery(iso)) {
    const S = getS();
    const answered = new Set((S.attempts || []).map((a) => a.worksheetId).filter(Boolean));
    const topics = new Set(test.topicIds || []);
    const level = m.topics;
    return (S.worksheets || [])
      .filter((w) => w.source !== 'arrow' && w.subjectId && w.subjectId === test.subjectId && !(w.date && w.date > iso)
        && (topics.size ? (w.topicIds || []).some((t) => topics.has(t)) : !w.date || daysBetween(w.date, iso) <= 60))
      .map((w) => ({ worksheetId: w.id, title: w.title, questions: w.questionCount || 0, doneCount: Math.min(w.questionCount || 0, w.doneCount || 0),
        topicIds: w.topicIds || [], done: answered.has(w.id) || (w.questionCount > 0 && (w.doneCount || 0) >= w.questionCount),
        level: (w.topicIds || []).length ? Math.min(...w.topicIds.map((t) => level[t]?.score ?? 50)) : 50 }))
      // the one on your weakest topic first
      .sort((a, b) => Number(a.done) - Number(b.done) || a.level - b.level);
  }

  // free periods and your own study sessions from now until the test day, plus evenings
  function studyMinutesUntil(date, iso = todayISO(), nowMins = null) {
    let mins = 0;
    for (let d = iso; d < date; d = addDays(d, 1)) {
      for (const sl of studySlotsOn(d)) {
        if (!sl.start || !sl.end || (d === iso && nowMins != null && toMins(sl.end) <= nowMins)) continue;
        mins += toMins(sl.end) - toMins(sl.start);
      }
      mins += EVENING_MINS;
    }
    return mins;
  }

  function testPlan(test, iso = todayISO(), { nowMins = null, m = mastery(iso), taken = null } = {}) {
    const S = getS();
    const daysLeft = daysBetween(iso, test.date);
    const sheets = testWorksheets(test, iso, m);
    const todo = sheets.filter((w) => !w.done);
    const subjectTopics = S.topics.filter((t) => t.subjectId === test.subjectId);
    const topicIds = test.topicIds?.length ? test.topicIds
      : subjectTopics.filter((t) => t.started || t.finished || m.topics[t.id]?.evidence > 0).map((t) => t.id);
    const weakest = topicIds.slice().sort((a, b) => (m.topics[a]?.score ?? 50) - (m.topics[b]?.score ?? 50)).slice(0, 4);
    const mistakes = openMistakes().filter((x) => x.subjectId === test.subjectId && (!test.topicIds?.length || test.topicIds.includes(x.topicId)));

    // the booklet: one per test, once the worksheets are done, sized to the time left
    const pack = (S.packs || []).find((k) => k.testId === test.id) || null;
    const packTask = pack && S.homework.find((h) => h.id === pack.taskId);
    const packMarked = pack && (S.attempts || []).some((a) => a.homeworkId === pack.taskId);
    const others = (S.tests || []).filter((t) => t.result == null && t.date && t.date >= iso && daysBetween(iso, t.date) <= TEST_WINDOW).length || 1;
    const minutesLeft = studyMinutesUntil(test.date, iso, nowMins);
    const sheetMins = todo.reduce((a, w) => a + Math.max(30, Math.min(90, (w.questions - w.doneCount || 6) * 6)), 0);
    const bookletMins = Math.max(30, Math.min(240, Math.round((minutesLeft / others - sheetMins) * 0.5 / 5) * 5));
    const size = Math.max(4, Math.min(30, Math.round(bookletMins / BOOKLET_MIN_PER_Q)));
    const status = pack ? (packTask?.done || packMarked ? 'done' : 'made')
      : test.bookletAt ? 'removed'
      : daysLeft < 1 || !test.subjectId ? 'none'
      : todo.length ? 'later' : 'wanted';
    const booklet = { status, questions: pack ? pack.questions.length : size, minutes: pack ? pack.minutes || bookletMins : bookletMins,
      ...(pack ? { packId: pack.id, taskId: pack.taskId, title: pack.title } : {}) };

    // what you didn't get in class on its topics
    const confused = (S.confusions || []).filter((c) => !c.resolved && (c.subjectId === test.subjectId || c.topicIds?.some((t) => topicIds.includes(t)))
      && (!test.topicIds?.length || c.topicIds?.some((t) => test.topicIds.includes(t))));
    // the steps in order, each with the study-period option that does it
    const steps = [
      ...todo.map((w) => ({ kind: 'worksheet', optionId: `ws:${w.worksheetId}`, worksheetId: w.worksheetId, title: w.title,
        topicId: w.topicIds[0] || null })),
      ...confused.map((c) => ({ kind: 'relearn', optionId: `relearn:${c.id}`, confusionId: c.id, topicId: c.topicIds?.[0] || null,
        title: `Re-learn: ${c.topicIds?.[0] ? topicById(c.topicIds[0])?.name || 'this topic' : c.text || 'what you didn\'t get'}` })),
      ...(status === 'made' ? [{ kind: 'booklet', optionId: `task:${pack.taskId}`, taskId: pack.taskId, packId: pack.id, title: pack.title }] : []),
      ...(status === 'wanted' ? [{ kind: 'booklet', optionId: null, title: `Booklet: ${size} hard questions (Claude is writing it)` }] : []),
      ...[...new Set(mistakes.map((x) => x.topicId).filter(Boolean))].map((tid) => ({ kind: 'mistakes', optionId: `fix:${tid}`, topicId: tid,
        title: `Fix your mistakes: ${topicById(tid)?.name || 'this topic'}` })),
      ...weakest.map((tid) => ({ kind: 'test', optionId: test.topicIds?.length ? `test:${test.id}:${tid}` : `test:${test.id}`, topicId: tid,
        title: `Revise: ${topicById(tid)?.name || 'this topic'}` })),
    ];

    // the free periods until then, each with the next step (or what you chose for it):
    // worksheets one period each, the booklet as many as its minutes need, then your
    // mistakes; the last two days go over your weakest topics. Periods an earlier
    // test's plan already uses (taken) are left to it.
    const schedule = [];
    const placed = new Set();
    let bookletMinsLeft = booklet.minutes;
    let revise = 0;
    for (let d = iso; d < test.date && schedule.length < 24; d = addDays(d, 1)) {
      const chosen = S.dayPlans?.[d] || {};
      const lastDays = daysBetween(d, test.date) <= 2;
      for (const sl of studySlotsOn(d)) {
        if (d === iso && nowMins != null && sl.end && toMins(sl.end) <= nowMins) continue;
        const key = sl.key, slot = `${d} ${key}`;
        if (taken?.has(slot)) continue;
        const mins = sl.start && sl.end ? toMins(sl.end) - toMins(sl.start) : 50;
        const c = chosen[key]?.option;
        let step = c ? steps.find((x) => x.optionId === c.id) : null;
        if (!c) {
          step = steps.find((x) => !placed.has(x) && x.kind !== 'test');
          if (!step && lastDays && weakest.length) step = steps.filter((x) => x.kind === 'test')[revise++ % weakest.length];
        }
        if (!step && !c) continue;                     // free for something else
        if (step?.kind === 'booklet') { bookletMinsLeft -= mins; if (bookletMinsLeft <= 0) placed.add(step); }
        else if (step) placed.add(step);
        if (step) taken?.add(slot);
        schedule.push({ date: d, key, start: sl.start || '', end: sl.end || '', title: sl.title || 'Free period',
          ...(step ? { step: { kind: step.kind, title: step.title, optionId: step.optionId } } : { other: c.title }),
          done: Boolean(chosen[key]?.done) });
      }
    }
    return { testId: test.id, title: test.title, date: test.date, subjectId: test.subjectId, kind: test.kind || 'test', daysLeft,
      topicIds, weakest, worksheets: sheets.map(({ level, ...w }) => w), mistakes: mistakes.length, confused: confused.length,
      marksLost: mistakes.reduce((a, x) => a + (x.marksLost || 0), 0), booklet, minutesLeft,
      phase: todo.length ? 'worksheets' : status === 'wanted' || status === 'made' ? 'booklet' : 'revise',
      steps: steps.map(({ optionId, ...s }) => ({ ...s, optionId })), schedule };
  }
  const upcomingTests = (iso = todayISO()) => (getS().tests || [])
    .filter((t) => t.result == null && t.date && t.date >= iso && daysBetween(iso, t.date) <= TEST_WINDOW)
    .sort((a, b) => a.date.localeCompare(b.date));

  function studyOptions(iso = todayISO(), { nowMins = null } = {}) {
    const S = getS();
    const lessons = lessonsOn(iso);
    const slots = studySlotsOn(iso);
    if (!slots.length) return [];

    const m = mastery(iso);
    const level = (tid) => m.topics[tid]?.score ?? 50;
    const plan = Object.fromEntries(workloadPlan().map((p) => [p.s.id, p.hours]));
    const behind = (sid) => {
      const want = (plan[sid] || 0) * 60;
      if (!want) return 1;
      const done = minutesThisWeek(sid, parseD(iso));
      return 1 + 0.5 * Math.max(0, (want - done) / want);
    };
    const taughtToday = (sid, before) => lessons.some((l) => l.subjectId === sid && toMins(l.end) <= toMins(before));
    const topicName = (tid) => topicById(tid)?.name || 'this topic';

    const cand = [];
    // one candidate per id: the same worksheet or to-do from two places keeps its better score
    const add = (c) => {
      const x = { ...c, score: c.score * (c.subjectId ? behind(c.subjectId) : 1) };
      const i = cand.findIndex((y) => y.id === x.id);
      if (i < 0) cand.push(x); else if (x.score > cand[i].score) cand[i] = x;
    };

    // a test coming up comes first: its plan's next steps top every free period
    for (const test of upcomingTests(iso)) {
      const plan = testPlan(test, iso, { nowMins, m });
      const d = plan.daysLeft;
      const when = d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`;
      const urgency = (TEST_WINDOW - d) / TEST_WINDOW;
      plan.steps.filter((s) => s.optionId && s.kind !== 'test' && s.kind !== 'mistakes').forEach((s, i) => {
        const base = { subjectId: test.subjectId, topicId: s.topicId || null, testId: test.id, score: 5 + 3 * urgency - i * 0.05 };
        if (s.kind === 'worksheet') add({ ...base, id: s.optionId, kind: 'worksheet', worksheetId: s.worksheetId, title: `Worksheet: ${s.title}`,
          why: `${test.title} ${when} · your teacher's worksheets come first` });
        if (s.kind === 'booklet') add({ ...base, id: s.optionId, kind: 'task', taskId: s.taskId, title: s.title,
          why: `${test.title} ${when} · your booklet of hard questions` });
        if (s.kind === 'relearn') add({ ...base, id: s.optionId, kind: 'relearn', confusionId: s.confusionId, title: s.title,
          why: `${test.title} ${when} · you didn't get this in class` });
      });
    }

    for (const test of (S.tests || [])) {
      if (!test.date || test.result != null) continue;
      const d = daysBetween(iso, test.date);
      if (d < 0 || d > 14) continue;
      const urgency = 1 + (14 - d) / 7;
      const when = d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`;
      if (test.topicIds?.length) {
        for (const tid of test.topicIds) {
          add({ id: `test:${test.id}:${tid}`, kind: 'test', subjectId: test.subjectId, topicId: tid, testId: test.id,
            title: `Test prep: ${topicName(tid)}`,
            why: `${test.title} ${when} · your level ${level(tid)}%`,
            score: 2.6 * urgency * (1.25 - level(tid) / 100) });
        }
      } else {
        add({ id: `test:${test.id}`, kind: 'test', subjectId: test.subjectId, testId: test.id,
          title: `Test prep: ${test.title}`, why: `${when} — past-paper questions on the unit`,
          score: 2.4 * urgency });
      }
    }

    for (const h of S.homework) {
      if (h.done) continue;
      const s = taskScore(h, iso);
      const d = h.due ? daysBetween(iso, h.due) : null;
      const when = d === null ? 'no due date' : d < 0 ? `${-d}d overdue` : d === 0 ? 'due today' : d === 1 ? 'due tomorrow' : `due in ${d} days`;
      add({ id: `task:${h.id}`, kind: 'task', subjectId: h.subjectId || null, taskId: h.id,
        title: h.title, why: `${when} · ${h.priority || 'normal'} priority`, score: s * 0.55 });
    }

    const mistakesByTopic = {};
    for (const x of openMistakes()) if (x.topicId) (mistakesByTopic[x.topicId] ||= []).push(x);
    for (const [tid, xs] of Object.entries(mistakesByTopic)) {
      const t = topicById(tid); if (!t) continue;
      add({ id: `fix:${tid}`, kind: 'mistakes', subjectId: t.subjectId, topicId: tid,
        title: `Fix your mistakes: ${t.name}`,
        why: `${xs.length} unfixed from marked work · ${xs.reduce((a, x) => a + x.marksLost, 0)} marks`,
        score: 1.3 + 0.25 * Math.min(xs.length, 4) });
    }

    // something from class you didn't get: re-learn it before the next lesson builds on it
    for (const c of (S.confusions || [])) {
      if (c.resolved) continue;
      const tid = c.topicIds?.[0] || null;
      const age = c.date ? Math.max(0, daysBetween(c.date, iso)) : 0;
      add({ id: `relearn:${c.id}`, kind: 'relearn', subjectId: c.subjectId || topicById(tid)?.subjectId || null, topicId: tid, confusionId: c.id,
        title: `Re-learn: ${tid ? topicName(tid) : c.text || 'what you didn\'t get'}`,
        why: `${c.level === 'partly' ? 'only partly got it' : 'didn\'t get it'} ${age === 0 ? 'today' : age === 1 ? 'yesterday' : `${age} days ago`}`
          + `${c.text ? ` · “${c.text.length > 80 ? c.text.slice(0, 79) + '…' : c.text}”` : ''}`,
        score: (c.level === 'partly' ? 3.0 : 4.2) + Math.min(age, 7) * 0.08 });
    }

    for (const t of S.topics) {
      if (t.started && !t.finished) {
        const firstSlot = slots[0]?.start || '12:00';
        const fresh = taughtToday(t.subjectId, firstSlot);
        add({ id: `cur:${t.id}`, kind: 'current', subjectId: t.subjectId, topicId: t.id,
          title: `Consolidate: ${t.name}`,
          why: `being taught now · your level ${level(t.id)}%${fresh ? ' · you had it earlier today' : ''}`,
          score: 0.9 + 1.4 * (1 - level(t.id) / 100) + (fresh ? 0.4 : 0) });
      } else if (t.finished) {
        const p = priorityOf(t, iso);
        if (p === null || p < 0.5) continue;
        const since = t.lastStudied ? daysBetween(t.lastStudied, iso) : null;
        add({ id: `rev:${t.id}`, kind: 'review', subjectId: t.subjectId, topicId: t.id,
          title: `Review: ${t.name}`,
          why: `due for recall · ${since === null ? 'never revised' : `last done ${since}d ago`} · level ${level(t.id)}%`,
          score: Math.min(p, 4) * 0.55 * (1.35 - level(t.id) / 100) });
      }
    }

    // a worksheet you saved and have not answered yet
    const answered = new Set((S.attempts || []).map((a) => a.worksheetId).filter(Boolean));
    for (const w of (S.worksheets || [])) {
      if (w.source === 'arrow' || answered.has(w.id) || (w.date && w.date > iso)
        || (w.questionCount > 0 && (w.doneCount || 0) >= w.questionCount)) continue;
      const age = w.date ? daysBetween(w.date, iso) : 0;
      const tid = w.topicIds?.[0] || null;
      const lv = tid ? level(tid) : 50;
      add({ id: `ws:${w.id}`, kind: 'worksheet', subjectId: w.subjectId || null, topicId: tid, worksheetId: w.id,
        title: `Worksheet: ${w.title}`,
        why: `${age === 0 ? 'saved today' : age === 1 ? 'saved yesterday' : `saved ${age}d ago`} · not answered yet${tid ? ` · your level ${lv}%` : ''}`,
        score: 1.1 + 0.9 * (1 - lv / 100) + Math.min(age, 14) * 0.05 });
    }

    // Assignment Arrow chapters: one at a time, the one you are in the middle of first
    let arrow = null;
    for (const w of (S.worksheets || [])) {
      const total = w.questionCount || 0, done = Math.min(total, w.doneCount || 0);
      if (w.source !== 'arrow' || !total || done >= total) continue;
      const tid = w.topicIds?.[0] || null;
      const lv = tid ? level(tid) : 50;
      const score = 0.9 + 0.6 * (1 - lv / 100) + (done ? 0.3 : 0);
      if (!arrow || score > arrow.score) {
        arrow = { id: `ws:${w.id}`, kind: 'worksheet', subjectId: w.subjectId || null, topicId: tid, worksheetId: w.id,
          title: `Worksheet: ${w.title}`, why: `Assignment Arrow · ${done ? `${done} of ${total} done` : `${total} questions`}${tid ? ` · your level ${lv}%` : ''}`, score };
      }
    }
    if (arrow) add(arrow);

    const due = cardsDue(iso).length;
    if (due) add({ id: 'cards', kind: 'cards', subjectId: null,
      title: `${due} flashcard${due === 1 ? '' : 's'} due`, why: 'active recall — quick marks', score: 0.35 });

    cand.sort((a, b) => b.score - a.score);

    const chosenToday = S.dayPlans?.[iso] || {};
    const used = new Set(Object.values(chosenToday).flatMap((c) => [c?.option?.id, ...(c?.more || []).map((m) => m.option?.id)]).filter(Boolean));

    return slots.map((sl) => {
      const key = sl.key;
      const mins = sl.start && sl.end ? toMins(sl.end) - toMins(sl.start) : 50;
      const pick = [];
      // the same topic or task twice in one slot is one option, not two
      const clash = (c) => pick.some((p) => p === c || (c.topicId && p.topicId === c.topicId)
        || (c.taskId && p.taskId === c.taskId) || (c.worksheetId && p.worksheetId === c.worksheetId));
      const pickFrom = (list) => {
        // best first, then the best of a kind not yet shown, then anything
        const fresh = list.filter((c) => !clash(c));
        const next = fresh.find((c) => !pick.some((p) => p.kind === c.kind)) || fresh[0];
        if (next) pick.push(next);
      };
      const open = cand.filter((c) => !used.has(c.id));
      for (let i = 0; i < 3; i++) pickFrom(open);
      for (let i = pick.length; i < 3; i++) pickFrom(cand);
      for (const p of pick) used.add(p.id);

      const choice = chosenToday[key] || null;
      const options = pick.map((c) => ({ ...c, score: +c.score.toFixed(2), mins }));
      const state = nowMins == null ? null
        : nowMins >= toMins(sl.end) ? 'past' : nowMins >= toMins(sl.start) ? 'now' : 'later';
      return { key, start: sl.start, end: sl.end, period: sl.period, mins, room: sl.room || '',
        title: sl.title || 'Free period', double: Boolean(sl.double), extra: Boolean(sl.extra), state,
        chosen: choice?.option || null, done: Boolean(choice?.done),
        more: (choice?.more || []).map((m) => ({ id: m.id, option: m.option, done: Boolean(m.done),
          minutes: m.minutes ?? null, confidence: m.confidence ?? null })),
        options: choice?.option ? [choice.option, ...options.filter((o) => o.id !== choice.option.id)].slice(0, 3) : options };
    });
  }

  /* =========================================================== study week
     Planning ahead: the study periods of the coming days with their options,
     and what you already chose for them. Weekends and holidays have no lessons,
     only the study sessions you added to them. */
  function studyWeek(from = todayISO(), days = 14) {
    const out = [];
    for (let i = 0; i < days; i++) {
      const date = addDays(from, i);
      const d = parseD(date);
      const hol = holidayOn(date);
      const weekend = d.getDay() === 0 || d.getDay() === 6;
      out.push({
        date, weekday: dayKeyOf(d), week: weekOf(date), holiday: hol ? hol.label : null, weekend,
        lessons: weekend ? [] : lessonsOn(date).map((l) => ({ key: l.start || l.period, start: l.start || '', end: l.end || '',
          subjectId: l.subjectId, title: l.title || '', room: l.room || '', study: isStudySlot(l), double: Boolean(l.double) })),
        studyPeriods: studyOptions(date),
      });
    }
    return out;
  }

  /* What you did in each study period, newest first: the pick, whether it was
     done, for how long and how it went. */
  function studyLog(days = 60, until = todayISO()) {
    const S = getS();
    const from = addDays(until, -days);
    const out = [];
    for (const [date, slots] of Object.entries(S.dayPlans || {})) {
      if (date < from || date > until) continue;
      const lessons = studySlotsOn(date);
      for (const [key, e] of Object.entries(slots || {})) {
        if (!e?.option) continue;
        const sl = lessons.find((l) => l.key === key);
        // the period's pick, then each further task done in the same period
        for (const x of [e, ...(e.more || [])]) {
          const session = x.sessionId ? S.sessions.find((s) => s.id === x.sessionId) : null;
          out.push({ date, key, ...(x === e ? {} : { item: x.id }), start: sl?.start || key.replace(/^x/, ''), end: sl?.end || '',
            option: x.option, done: Boolean(x.done), minutes: x.minutes ?? session?.minutes ?? null,
            confidence: x.confidence ?? session?.confidenceAfter ?? null, note: x.note || '' });
        }
      }
    }
    return out.sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  }

  return {
    DAY, isoOf, todayISO, parseD, daysBetween, toMins, hhmm, dayKeyOf, addDays,
    subjectById, topicById, CAL, holidayOn, termOn,
    INTERVALS, priorityOf, revisionQueue,
    gradeFor, workloadPlan, projectedPct, testPlan, testWorksheets, upcomingTests, studyMinutesUntil, TEST_WINDOW, SUBJECT_DIFFICULTY, effectiveGrade, gradeToALevel,
    igcseBaselineFor, predictedFor,
    weekStart, minutesThisWeek, cardsDue,
    lostMarks, weakSpots, phaseOf, studyPlan,
    weekOf, dayPlan, mergedDay, lessonsOn, isStudySlot, studySlotsOn, studyWeek, studyLog,
    PRIORITY_WEIGHT, taskScore, openMistakes, ARCHIVE_AFTER, mastery, ERROR_ADVICE, studyOptions, isNative,
  };
}

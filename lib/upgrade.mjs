/* One upgrade path, used by both the local server and the hosted page — they
   drifted apart once and the hosted copy silently kept stale reference data.

   Reference data (calendar, universities, milestones, IGCSE, subject targets) is
   ours to own, so an out-of-date schema simply takes the current version. Data
   the user authored — topics ticked, sessions, papers, homework, cards — is only
   ever created when absent, never overwritten. */
export function upgrade(state, seed, SCHEMA) {
  const before = state.schema || 0;

  for (const k of ['homework', 'sessions', 'papers', 'whiteboards', 'cards']) {
    if (!Array.isArray(state[k])) state[k] = [];
  }
  if (!state.topics?.length) state.topics = seed.topics;
  if (!state.subjects?.length) state.subjects = seed.subjects;
  // The timetable is REFERENCE data: it comes from the printed school rota and
  // lives in the seed. Treating it as user data meant an empty one could never
  // be recovered, and it kept disappearing. Restore it whenever it is missing
  // or empty; a schema bump replaces it outright.
  const lessonCount = (t) => !t ? 0
    : ['A', 'B'].reduce((a, w) => a + Object.values(t[w] || {}).reduce((b, d) => b + d.length, 0), 0);
  if (lessonCount(state.timetable) === 0) state.timetable = seed.timetable;
  // The route plan is reference data; which of its boxes you have ticked is not.
  // Keeping the ticks in their own map means a corrected plan never loses them —
  // an id that survives the rewrite keeps its tick, one that does not simply goes.
  if (!state.routeDone || typeof state.routeDone !== 'object') state.routeDone = {};
  if (!state.routeOpts) state.routeOpts = { uk: true, mit: true };
  state.settings = { ...seed.settings, ...(state.settings || {}) };
  if (!state.settings.periods?.length) state.settings.periods = seed.settings.periods;
  state.profile = { ...seed.profile, ...(state.profile || {}) };

  if (before >= SCHEMA) return false;

  /* School reference data normally comes from the seed, which reads your
     profile. A host that cannot see the profile produces a GENERIC seed —
     invented term dates, an empty rota — and replacing your real calendar with
     that would be silent data loss on every schema bump. So when the seed says
     it is generic, keep whatever the state already has. */
  const keepReal = seed.generic;
  if (!keepReal || !state.calendar?.terms?.length) state.calendar = seed.calendar;
  if (!keepReal || lessonCount(state.timetable) === 0) state.timetable = seed.timetable;
  if (!keepReal || !state.milestones?.length) state.milestones = seed.milestones;
  state.unis = seed.unis;
  state.route = seed.route;
  if (!state.igcse?.length || state.igcse[0].pct === undefined) state.igcse = seed.igcse;

  // targets and flags are reference data; weekly hours the user set are theirs.
  // A generic seed has no idea what you are aiming for, so it leaves targets be.
  for (const fresh of seed.subjects) {
    const mine = state.subjects.find((x) => x.id === fresh.id);
    if (!mine) { state.subjects.push(fresh); continue; }
    if (!keepReal) mine.target = fresh.target;
    mine.locked = fresh.locked;
    mine.slot = fresh.slot;
    mine.name = fresh.name;
  }
  // topics gain a started/finished lifecycle; an old `taught` means finished
  for (const t of state.topics) {
    if (t.started === undefined) t.started = Boolean(t.taught);
    if (t.finished === undefined) t.finished = Boolean(t.taught);
  }

  // The topic list is reference data too — it is the exam board's own spec,
  // not something you author. A schema bump can correct it (wrong exam board,
  // a unit swapped, a syllabus revision) same as the calendar or universities.
  // We are already inside `before < SCHEMA` here, so this runs on EVERY bump —
  // an earlier version hardcoded `before < 7`, which made it dead the moment
  // schema 7 shipped and silently no-opped on schema 8. Carry over any
  // progress already logged by matching subject + topic name, so ticks
  // surviving a wording change are not lost, while corrected/renamed/removed
  // topics simply start fresh.
  if (seed.topics) {
    const norm = (x) => String(x).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const prior = new Map(
      state.topics.map((t) => [`${t.subjectId}|${norm(t.name)}`, t]));
    state.topics = seed.topics.map((fresh) => {
      const old = prior.get(`${fresh.subjectId}|${norm(fresh.name)}`);
      return old
        ? { ...fresh, confidence: old.confidence, lastStudied: old.lastStudied,
            studyCount: old.studyCount, started: old.started, finished: old.finished,
            taught: old.finished, notes: old.notes, links: old.links }
        : fresh;
    });
  }

  state.schema = SCHEMA;
  return true;
}

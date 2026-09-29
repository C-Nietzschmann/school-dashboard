# A Level Dashboard

A single-page study dashboard for A Levels: timetable, homework, study log, past
papers, a spaced-repetition revision queue, and a grade projection built from the
papers you log. Zero dependencies for the core — one small Node process, no
framework, no build step.

**No personal data ships with this repository.** Your marks, timetable, school
calendar and API tokens live in a data directory outside the checkout. Clone it
and you get a working dashboard seeded with invented example data.

---

## Running it

```bash
git clone <your fork> school-dashboard && cd school-dashboard
npm install
node server.mjs
```

Then open <http://localhost:4732>, or double-click **start.command** in Finder.
`start-lan.command` binds to your local network instead, so an iPad or phone on
the same Wi-Fi can reach it.

On first run the dashboard creates its data directory and copies the example
files into it. Nothing else is needed.

### Where your data lives

Everything the dashboard reads or writes is in **one directory**, outside the repo:

```
$SCHOOL_DASHBOARD_DATA     # if set
~/.school-dashboard        # otherwise
```

| File | What's in it |
|---|---|
| `data.json` | Everything — subjects, topics, homework, sessions, papers, timetable |
| `data.json.backup` | The previous version, rewritten on every save |
| `profile.json` | Your results, and your school's calendar, bell times and rota |
| `config.json` | API tokens. Never served to the browser |
| `whiteboards/*.json` | One file per board |
| `.cache/` | Cached Claude answers, 24-hour TTL |
| `marks/*.json` | Explanations and corrections for each piece of marked work |

To back it up, copy that directory. To start over, delete it and restart. To keep
several students' data side by side, point `SCHOOL_DASHBOARD_DATA` somewhere else.

Writes go to a temp file and are renamed into place, so a crash mid-save cannot
truncate `data.json`.

### Pointing it at your own data

Edit `profile.json` in the data directory. Everything in it overrides the generic
defaults in `lib/seed.mjs`:

| Key | Replaces |
|---|---|
| `me` | Year group, term start, which week is week A, exam year |
| `igcse` | Your GCSE/IGCSE results — the starting point for every projection |
| `subjects` | The whole subject list, if you take different ones |
| `subjectTargets` | Just the target grades, keeping the default subjects |
| `boundaries` | Grade boundaries — **set your board's real ones** |
| `school.calendar` | Term dates and holidays |
| `school.periods` | Your bell times |
| `school.timetable` | The two-week A/B rota |
| `milestones` | Fixed dates: exam entries, application deadlines |

Anything you leave out falls back to a default. `profile.example.json` shows the
full shape, with invented values throughout. It carries `"_example": true` —
delete that line once the file is genuinely yours, because while it is there the
dashboard treats the profile as a placeholder and will never let it overwrite
real data it already holds.

When hosting, there is no data directory to put the profile in and it is not in
the repo, so point `PROFILE_PATH` at a secret file (Render mounts these under
`/etc/secrets/`), or pass the JSON inline in `PROFILE_JSON`.

Reference data (calendar, timetable, subject targets, topic lists) is restored
from the seed on a schema bump, so a corrected spec reaches you automatically.
Anything you authored — ticks, sessions, papers, homework, cards — is only ever
created when absent, never overwritten.

---

## How the revision queue works

Spaced repetition over spec topics. Rate a topic 0–5 after revising and that sets
when it comes back:

| Rating | Comes back in |
|---|---|
| 0 | 1 day |
| 1 | 2 days |
| 2 | 4 days |
| 3 | 8 days |
| 4 | 16 days |
| 5 | 32 days |

Priority is how far *past* that interval you are, weighted by the subject's
hours-per-week and boosted 45% if homework is due in that subject within 10 days.
**Only topics marked finished enter the queue** — on day one it is empty on
purpose. Tick topics off on the Revision tab as school covers them.

## How the grade projection works

Two inputs, blended:

1. **Your IGCSE baseline.** Each IGCSE maps to the A Levels it feeds. Where you
   know the raw mark, the position *inside* the grade band is used, so a high 7
   and a low 7 do not predict the same thing.
2. **Past papers you log.** A recency-weighted mean of your percentages, with a
   half-life of three papers, so one bad early mock stops dragging the projection
   down by Christmas.

The baseline's weight decays as papers arrive. **After three papers in a subject
the IGCSE drops out entirely** and the projection is your real marks alone.

Percentages become grades through the boundaries on the **On track** tab. These
ship as rough defaults (A\* 80, A 70, B 60…) and are almost certainly wrong for
your board — replace them.

---

## What each tab does

| Tab | For |
|---|---|
| Today | Today's lessons with a live progress bar, what is due, what to revise |
| Calendar | One month at a time: school days, holidays, deadlines, exams |
| Plan | A weekly study plan, weighted by how far each subject is from target |
| Revision | The spaced-repetition queue, and spec coverage per subject |
| Cards | Flashcards, Leitner boxes |
| On track | Predicted vs target grade per subject, and grade boundaries |
| Uni | Entry requirements, and what your current projection means for them |
| Homework | Deadlines, by subject |
| Study log | Hours logged, against a weekly target |
| Papers | Past papers and marks — the input to the projection |
| Analysis | Marks lost per question type, to find the pattern |
| Timetable | The two-week rota |
| Whiteboard | A canvas for working through problems |
| Files | Import, export, and integration status |

---

## The companion app

`companion.html` is the daily side: the fortnight's timetable with a choice of
what to do in each free period (and study sessions of your own, weekends too;
once the first thing is done, more tasks can be added to the same period, each
logged as its own study session), a
to-do list that understands `phys wksht 3 fri high`, and a Work tab for
worksheets, answers, notes and anything else. A worksheet is read by Claude for
its questions and topic, filed in a Drive folder of its own inside the topic's
folder, and planned into a study period; your answers are then marked against it,
with the corrections saved next to them. Notes are read for their topic and key
points and filed. Everything is checked by you before it is saved. Where the
app can't show Claude pictures (an artifact in Safari on an iPad), you just save:
the pages wait on the dashboard and a Claude Code session the app starts reads
them through the connector's `read_queue` tool and saves what it finds. Mistakes stay
listed in History until you fix them, and every marked page moves your level per
topic, which the free-period suggestions and the revision queue both use. The level
weighs how hard each question was as well as the marks. Claude rates every part from
1 (recall) to 5 (A* stretch) when it marks; question packs and Assignment Arrow bring
their own ratings. Full marks on easy recall shows less than full marks on a hard
question, and missing an easy question costs more than missing a hard one. Add a
test and the suggestions shift towards its topics as the date approaches. The
Route tab shows your whole university plan: each stage with its tasks, courses,
project and earning steps, then projects, courses, earning, universities and dates,
all tickable.

It reaches the dashboard two ways: inside Claude through a custom connector
(the URL to paste is on the Files tab — see [DEPLOY.md](DEPLOY.md)), or from this
server at `/companion`. Both use the same small API in `lib/companion.mjs`; the planning
rules live in `lib/plan.mjs`, which the dashboard page shares.

**Assignment Arrow, your own copy.** [Assignment Arrow](https://github.com/C-Nietzschmann/assignment-arrow)
is a pseudocode trainer for Cambridge 9618 and 0478. `arrow/build.mjs` makes a private copy of it with
`arrow/bridge.js` added; the site itself is not changed. In that copy, each chapter of practice questions is a
worksheet on the dashboard. A question you finish there moves its chapter on (done and left), and the time you
spent goes into the study period you are in, or a study session of its own, as one entry per chapter. That
entry grows as you do more, and the chapter's topic level moves with your marks. Only one chapter at a time is
suggested for a free period.

```
git clone --depth 1 https://github.com/C-Nietzschmann/assignment-arrow /tmp/aa
node arrow/build.mjs /tmp/aa out/arrow [its artifact link]
```

Publish `out/arrow/index.html` as an artifact, with the other files next to it, and give it `db`, `sample` and
the A Level Dashboard connector's `get_today` and `apply_changes`.

**As an app of its own.** An artifact lives on claude.ai, so it can't be added to the Dock or the Home Screen by
itself. The dashboard also serves the same copy at **`/arrow/`**, with its own name, icon and web-app manifest.
It logs through the dashboard's own API with your login, so no connector is needed there. To add it:

- on a Mac, open `/arrow/` in Safari, then File → Add to Dock;
- on an iPad or iPhone, Share → Add to Home Screen.

The companion at `/companion` can be added the same way; the two stay separate apps. The copy the site serves
lives in `arrow/site/`. After Assignment Arrow changes, rebuild it and commit:

```
node arrow/build.mjs /tmp/aa arrow/site --site
```

That copy's address goes on each chapter's worksheet, so the companion's **Open Assignment Arrow** opens it.
Each copy keeps its own saved progress, and the dashboard keeps the higher done count of the two.

**Question packs.** In a Claude Code session opened in this folder, `/question-pack maths`
(or `fmaths`, `physics`, `cs`) runs the skill in `.claude/skills/question-pack/`. It asks
for the topic, difficulty, size and source — your uploaded notes (listed by the
connector's `get_uploads`, read through the Google Drive connector), the specification,
or both — and writes an original pack in the board's style, with a mark scheme. Only
once you accept it does it go into the companion as a to-do with an **Open pack**
button. **Mark my answers** then marks your photos against that scheme.

## The route planner

The **Route** tab holds a long-range plan — the road to university: stages with dates,
tasks, courses, portfolio projects, earning steps, and each university's entry
requirements (grade requirements are checked live against your predicted grades). From
it `lib/route.mjs` works out a short list for today: critical items first, projects on
Mondays, Wednesdays and Fridays, courses on Tuesdays and Thursdays, a mix at weekends and
in holidays, and grades only in exam weeks (from the plan's exam windows, or a real exam
on the dashboard), within 75 or 150 minutes. Each stage's progress is compared with how
much of it has passed; with nothing ticked it says so instead of calling you behind.

Your plan is your data. The repository ships only an invented example; import your own in
**Files → Route plan** (a plan's JSON, or the old planner's export of ticks), or through the
connector's `route.import`. The companion shows today's route on its Today tab, and the
skills in `.claude/skills/` — `/DayChecklist`, `/Taskinfo`, `/TaskCreator` — read and tick
the same plan through the connector's `get_route` and `route.*` changes.

`npm test` runs the checks on the planner, the route engine, the change log and the connector.

## Connecting things (all optional)

Copy `config.json.example` over `config.json` in your data directory, or use
environment variables (which win over the file — use these when hosting).

- **Notion** — works today. Create an internal integration, share the pages you
  want visible with it, paste the token.
- **Google Classroom** — works only if your school's Workspace admin allows
  third-party apps. Many block it outright, and that is policy, not a bug. Two
  fallbacks are built in: paste your to-do list and let Claude parse it, or
  import an exported `.ics`.
- **Gmail** — reads Classroom notification mail forwarded to a personal address.
  The workaround when Classroom itself is blocked.
- **GoodNotes** — export only. There is no API; the dashboard reads PDFs from an
  auto-backup folder. This is a hard limit, not something a future version fixes.
- **Claude** — set `ANTHROPIC_API_KEY` for study-plan and analysis features.
  Answers are cached for 24 hours against a hash of the prompt, so nothing is
  regenerated without new data. Defaults to the cheapest model.

Hosting notes, including Postgres for persistence, are in [DEPLOY.md](DEPLOY.md).

---

## Honest limitations

- **The grade projection is a heuristic, not a prediction.** It is a weighted
  mean with a decaying baseline. It knows nothing about your syllabus, your
  teachers, or how hard the papers you chose actually were.
- **Grade boundaries ship as round numbers** and differ by board, subject and
  year. Until you replace them, every letter grade on the dashboard is
  approximate.
- **The topic lists follow Pearson Edexcel International A Level (unit-coded) and
  Cambridge International 9618 (2027–2029).** Verified against the published
  specifications in September 2026. Boards revise specs — re-check before relying
  on these for exam entries.
- **University requirements change every year.** Every entry links to its source.
  Re-check before applying; do not trust a cached page from a student project.
- **The odds model on the Uni tab is a toy.** It multiplies published base rates
  by hand-chosen factors. The direction is meaningful; the decimals are not.
- **Only topics marked finished enter the revision queue**, so an untouched
  dashboard will tell you there is nothing to revise. That is intended.
- **One user, one document.** There is no multi-user support, no sharing, and no
  access control beyond a single password when hosted.

---

## Licence

MIT — see [LICENSE](LICENSE).

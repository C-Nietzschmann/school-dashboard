# Putting this online

Everything is ready. This is the part that needs your accounts, so you have to
drive — but it should take about 20 minutes.

## Why host it at all

Only if you want **Notion and Google Classroom live on every device**. The
claude.ai artifact cannot do that: its sandbox blocks all outbound network calls,
and there is no Google Classroom connector. A hosted server has neither limit.

If you do not need those two things, stay on the artifact — it syncs your data
across devices for free and its Claude features cost you nothing extra.

## What it costs

| | Free | Starter (~$7/mo) |
|---|---|---|
| Web service | Sleeps after 15 min idle, then ~50 s to wake | Always warm |
| Postgres | **Expires after 90 days**, then you must recreate it | Persistent |

Free is fine to try. Do not put a year of study data on a database that expires
in 90 days — move to Starter, or export regularly.

Claude features become a separate cost: hosted, they need an Anthropic API key
and bill your credits, instead of running free through your Claude account.

## Steps

**1. Push to GitHub**

```bash
cd ~/Documents/school-dashboard
git init && git add -A && git commit -m "A Level dashboard"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/school-dashboard.git
git push -u origin main
```

`.gitignore` already excludes `config.json`, your data and the whiteboards, so no
secrets and no personal data leave your machine.

**2. Create the Render service**

<https://dashboard.render.com> → **New → Blueprint** → pick the repo. It reads
`render.yaml` and creates the web service plus the database.

**3. Set the password — do not skip this**

In Render → your service → **Environment**, set `DASHBOARD_PASSWORD` to something
only you know. Without it the dashboard is readable by anyone who finds the URL,
and it contains your grades and predictions. `SESSION_SECRET` generates itself.

**4. Claude features**

Add `ANTHROPIC_API_KEY` in Render → Environment. Without it the Claude buttons
hide themselves and the rest of the dashboard works normally.

Defaults to `claude-haiku-4-5`, the cheapest model — override with `CLAUDE_MODEL`
if you want a stronger one. Answers are cached on a hash of the prompt for 24
hours, and every prompt embeds your dashboard data, so **an unchanged dashboard
replays the stored answer for free**. You only pay when something actually
changed. Each answer has a Regenerate button to force a fresh one.

**5. Notion**

Add `NOTION_TOKEN` in Render's Environment tab (the value from
notion.so/my-integrations). Then in Notion, share the pages you want visible with
that integration: **•••  →  Connections**. It sees nothing you have not shared.

**6. Google Classroom**

Needs your school account, and many school Workspace accounts block third-party
apps outright — if you get `access_denied`, that is their policy and there is no
way around it from your side. Ask your IT admin.

Otherwise: <https://console.cloud.google.com> → new project → enable the
**Google Classroom API** → OAuth consent screen (External, add yourself as a test
user) → Credentials → **OAuth client ID → Desktop app**. Then locally:

```bash
node get-classroom-token.mjs
```

Sign in with the school account; it writes a refresh token to `config.json`. Copy
those three values into Render as `CLASSROOM_CLIENT_ID`, `CLASSROOM_CLIENT_SECRET`
and `CLASSROOM_REFRESH_TOKEN`. Never commit them.

**7. Moving your existing data across**

Your data currently lives in the artifact's database. To carry it over, open the
artifact, run this in the browser console, and save what it prints:

```js
copy(JSON.stringify(S))
```

Then on the hosted dashboard, signed in, paste it back:

```js
await fetch('/api/state', {method:'PUT', headers:{'Content-Type':'application/json'}, body: <paste>})
```

## The companion app (phone and iPad)

`companion.html` is a small daily app next to the dashboard: **Today** (your A/B
timetable, what to do in each free period, to-dos with priorities), **Work**
(photograph or scan your work, Claude marks it and works out the subject and
topic, you check it, it is filed in Google Drive), **History** (every mistake,
why it was wrong, the correct working, and fixing it) and **Skills** (your level
per subject and topic, and the tests you are preparing for). It keeps no data of
its own: everything goes into this dashboard.

It runs best **inside Claude**, where it can use your Google Drive connector and
Claude itself — marking is billed to your Claude plan, not to an API key. Claude
reaches the dashboard through a connector, set up once:

**1. Deploy this version.** Nothing to configure: on first start the dashboard
makes its own companion key and keeps it in the database. (Set `APP_TOKEN` in
Render → Environment only if you want to choose the key yourself.) Setting `TZ`
to your time zone is worth doing while you are there.

**2. Copy the connector URL.** Open the hosted dashboard, go to the **Files**
tab, and press **Copy** next to the URL in the **Companion app** box. It is your
dashboard's address plus `/mcp/` plus the key, ready to paste — do not type one
by hand.

**3. Add the connector.** claude.ai → **Settings → Connectors → Add custom
connector**. Name it exactly `A Level Dashboard` and paste the URL. That URL *is*
the key: anyone with it can read and change your dashboard, so keep it to
yourself. **Make a new key** in the same Files box revokes it; then update the
connector with the new URL.

**4. Connect Google Drive** in the same place, with the school account whose
Drive should hold your work. The app files into the folders you already have: a
top folder (`A Levels` unless you change it in the app), your folder for each
subject whatever you called it, and inside that the folder that matches the
topic, or the kind of work ("Class notes", "Past papers"). It makes
a folder only when nothing fits, and the review screen shows where each file will
go before anything is saved.

**5. Open the app.** The companion is published as a claude.ai artifact; open its
link in the Claude app on each device (or in Safari, then Share → Add to Home
Screen) and allow the two connectors and Claude when asked.

Without Claude, `https://<your-service>.onrender.com/companion` serves the same
app from the dashboard itself — Today, History, Skills and tests all work, and it
can go on the Home Screen too. Uploading and marking need Claude, so that page
points you there.

What it costs and where things live:

- Marking uses your Claude plan's usage. **Fast** (the default) uses the
  quickest model; **Careful** thinks longer, for proofs and long working. A page
  is never marked twice: the dashboard remembers every page it has marked.
- Photos and PDFs live in your Google Drive, never in the database. The database
  holds the marks, and each marking's explanations as a separate small row.
- On Render's free plan the dashboard sleeps after 15 minutes; the app shows
  your last synced day at once and waits up to a minute for it to wake.
- Changes made on the phone while the dashboard is open on your Mac are merged,
  not overwritten: a stale tab is refused (409), pulls the newer copy, keeps its
  own edits and saves again.

## Afterwards

`git push` redeploys automatically. Both copies still build from `app.html` —
run `node build-artifact.mjs` if you also want to keep the artifact in step.

## What stays behind

- **GoodNotes** reads a local folder, so it only ever works on the Mac.

Everything else — the dashboard, cross-device sync, Notion, Classroom and the
Claude features — runs on the hosted copy.

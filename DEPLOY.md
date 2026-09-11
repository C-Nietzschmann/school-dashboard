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

## Afterwards

`git push` redeploys automatically. Both copies still build from `app.html` —
run `node build-artifact.mjs` if you also want to keep the artifact in step.

## What stays behind

- **GoodNotes** reads a local folder, so it only ever works on the Mac.

Everything else — the dashboard, cross-device sync, Notion, Classroom and the
Claude features — runs on the hosted copy.

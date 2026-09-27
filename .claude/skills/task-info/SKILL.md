---
name: task-info
description: Turns one item from the student's university route plan (a timeline task, course, project milestone, earning step or requirement) into a self-contained hand-off brief for a new chat, using the live plan in the A Level Dashboard. Use when the user types /Taskinfo (any capitalisation, e.g. /taskinfo, /task-info), asks for details, instructions or a to-do list for a plan item or an id like "a4" or "gw2", or wants to work on one task in a separate chat.
---

# Task info

## Steps

1. Call the **A Level Dashboard** connector's `get_route` with detail `full`. It returns the
   plan, the ticks (`done`), today's checklist, progress, and `plan.context` — the standing
   background about the student.
2. Work out which item:
   - an id given directly (look it up in the phases' tasks, `courses`, `projects[].steps`,
     `earn[].steps`, `unis[].items`);
   - otherwise match the user's words against item texts; with several matches, ask;
   - with nothing given, list 6–8 open items (critical and current-stage first) and ask.
3. Gather its surroundings: its stage (`station`, `when`); for a project step, the project's
   pitch, what is already done and what comes next; for a timeline task that names a project,
   that project's progress; for a course, its link, certificate and what it feeds.
4. Check anything that can change — fees, dates, age limits, how a website works — with a
   live web search before writing. Do not trust the plan's notes for these.
5. Write the brief in ONE fenced markdown block, under ~450 words, with these headings:
   **Context** (from `plan.context`, trimmed to what matters here) · **The task** ·
   **Why it matters** · **Done means** (a concrete finish line) · **To-do** (5–10 steps, each
   one sitting, naming the button, setting, file or command; pitched at his level) ·
   **Resources** (links) · **Watch out** (cost, safety, honesty, age rules) · **Ask the helper**
   (what to ask the new chat for).
6. After the block, one or two lines only: open a new chat, paste it, and come back and say
   "done <id>" when finished — then tick it with `apply_changes` `route.tick`.

## Rules for the brief

- Teach, don't hand over finished code: he must understand and explain every line.
- Never help publish CS50 problem-set solutions.
- Mains wiring and fuse boxes: an electrician only.
- Many selling, tutoring and payment sites require 18+; under 18, a parent's account where allowed.
- No passwords, keys or personal data in public repositories.

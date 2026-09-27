---
name: day-checklist
description: Today's to-do list and progress report from the student's university route plan, read live from the A Level Dashboard. Use when the user types /DayChecklist (any capitalisation, e.g. /daychecklist, /day-checklist), or asks what to do today on their route or plan, for a daily checklist, how they are doing, whether they are on track, or how far along a project is.
---

# Day checklist

The route plan (stages, tasks, courses, projects, earning, requirements) lives in the
student's dashboard, not in this skill. The dashboard works out today's list and the
progress figures, so the dashboard, the companion app and this chat always agree.

## Steps

1. Call the **A Level Dashboard** connector's `get_route` (detail `today`). If it says there
   is no plan, tell the student to import it on the dashboard (Files → Route plan) and stop.
   If `example` is true, say it is still the example plan.
2. Present, in this order:
   - **Today** — the `checklist` items: text, minutes, and why it is on the list (`reason`).
     Show the mode first: a school day (75 min), a weekend or holiday (150 min), or exam
     time (grades only — say which exam). Mark critical items. An item with no `id` is a
     revision block, not something to tick.
   - **How you're doing** — the stage (`station`) and its verdict: on track, ahead, or behind
     by `behindBy` items; with `unknown`, say only that nothing has been ticked yet — never
     guess that they are behind. Then the whole plan's % and, per project, its % and next step.
   - **Coming up** — the next deadlines with days left (≈ when `approx`).
3. Open with one short sentence reflecting the verdict. End with one question: what did you
   finish today?
4. When they answer, map what they say to item ids (call `get_route` with detail `full` if the
   item is not on today's list), confirm anything ambiguous, then tick each with
   `apply_changes` `{type: "route.tick", itemId, id: "<unique op id>"}`. Show the updated list.

## Tone

Warm and brief. Grades decide the main application, so in exam time do not push projects.
If far behind, say so once, plainly, and point at the first overdue item rather than listing
everything. Never invent progress or items that are not in the plan.

---
name: task-creator
description: Turns something the student has decided to do into a new task in their university route plan on the A Level Dashboard, then writes a hand-off brief for it. Use when the user types /TaskCreator (any capitalisation or spelling, e.g. /taskcreator, /task-creater, /TaskCreate), or wants to add a task or milestone to their route or plan, turn an idea into a task, or get a brief for work that is not in the plan yet.
---

# Task creator

The counterpart to task-info: task-info reads an existing item, this one writes a new one.

## Steps

1. Call the **A Level Dashboard** connector's `get_route` with detail `full` for the plan, its
   stages and `plan.context`.
2. Ask up to five short questions, only for what is missing (use AskUserQuestion, with
   options where you can):
   1. What exactly is the task, and what does "done" look like?
   2. Which stage does it belong to? (offer the stages by `station` and `when`, current first)
   3. Which goal does it serve? → tags: `eth`, `de`, `uk`, `mit` (applications), `grades`,
      `port` (portfolio), `skill` (learning), `earn` (earning).
   4. Is it critical — would missing it cost an application?
   5. Does it cost money? (a short note like "≈ €25", or none)
3. Check that it doesn't already exist (compare with every item text). If it does, say so and
   offer task-info for the existing one instead.
4. Show the draft: stage, text, note, tags, critical, cost. Ask for a yes.
5. Only after the yes: `apply_changes` with one op
   `{id: "<unique op id>", type: "route.task.add", phaseId, task: {text, note, tags, critical, cost}}`.
   Report the new task id from the result.
6. Then write a hand-off brief for it exactly as the task-info skill describes (one fenced
   block, under ~450 words, same headings), ending with: open a new chat, paste it, come
   back and say "done <id>".

## Rules

- Never add a task without an explicit yes.
- Never change or delete existing items — only add.
- Keep the text to one clear sentence; details go in the note.

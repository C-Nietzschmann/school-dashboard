---
name: question-pack
description: Build an exam-style question pack for one A Level subject with the student, then (only once they accept it) put it into their companion app. Use when the user types /question-pack (optionally followed by a subject), or asks for practice questions, a question pack, a worksheet, or questions on a topic.
---

# Question pack

You interview the student, write an original exam-style question pack for one
subject, show it to them, and — only after they accept — upload it to their
companion app through the **A Level Dashboard** connector. They then work it on
paper, photograph their answers in the companion, and the companion marks the
photos against the mark scheme you wrote.

## The student's subjects

| id | Subject | Board and units |
|---|---|---|
| `maths` | Maths | Pearson Edexcel International A Level. AS: P1 (WMA11), P2 (WMA12), S1 (WST01). A2: P3, P4, M1. |
| `fmaths` | Further Maths | Pearson Edexcel IAL. AS: FP1 (WFM01), D1 (WDM11). A2: M2 (WME02). |
| `physics` | Physics | Pearson Edexcel IAL. AS: Units 1–3 (WPH11–WPH13; Unit 3 is practical skills). A2: Units 4–6. |
| `cs` | Computer Science | Cambridge International AS & A Level 9618. AS: topics 1–8 (Paper 1, theory), 9–12 (Paper 2, problem-solving and programming). A2: 13–20. |

This year is AS (Year 12), so default to year-1 topics unless asked otherwise.
The dashboard's topic list is the source of truth for names and ids.

## 1. Subject

Take it from the command argument or the session you are in. If neither
says, ask. Never mix subjects in one pack.

## 2. Read what the dashboard knows

Call `get_today` with `detail: "full"`. From it, for this subject, take:
- `topics`: id, unit, name, `started`/`finished` (being taught / done), confidence 0–5
- `weak`, `mistakes` and `mastery.topics`: where marks are being lost

## 3. Interview (AskUserQuestion, two rounds, 2–4 options each)

Build the options from that data; don't use a fixed list.

**Round 1**
- **Topic**: the 2–3 weakest topics in this subject, "what we're being taught now" (topics with `started && !finished`), and a unit. The student can also type their own.
- **Difficulty**: Warm-up · Exam standard · Hard · A* stretch → `warm-up | exam | hard | stretch`
- **Size**: 5 quick questions (~15 min) · ~30 minutes · ~60 minutes, paper-style
- **Source**: My uploaded notes · I'll attach notes now · The specification only · Notes and specification

**Round 2**
- **Style**: short answers · structured multi-part · mixed (for CS also: pseudocode/trace tables vs. theory)
- **Due**: today · tomorrow · this week · no date
- **Priority**: high · normal · low

## 4. Gather the material

- **Uploaded notes**: call `get_uploads` with `subjectId` (and `topicId` if one topic). Show the matches (title, date, kind) and let the student pick. Read each chosen file through the **Google Drive** connector by its `driveId`. If none are found, say so and offer the other sources.
- **Attached now**: read whatever they paste or attach in this chat.
- **Specification**: start from the dashboard topic names. Then use WebSearch/WebFetch to find the official specification (Pearson qualifications site for the IAL subjects, Cambridge International for 9618), and take from it the learning outcomes, command words and the formulae the student is expected to know. Cite the spec section each question targets in its mark scheme line.

Don't guess spec content you could not verify. Say what you based the pack on.

## 5. Write the pack

- Original questions in the board's style. **Never copy past-paper questions word for word**; write new ones in their manner.
- **Edexcel Maths / Further Maths**: marks shown as `[n]`. Mark scheme uses M1 (method), A1 (accuracy, depends on M), B1 (independent), `ft` for follow-through. Show key working.
- **Edexcel Physics**: command words (calculate, explain, show that, describe), units and significant figures in every numeric answer, one mark per creditworthy point in the scheme.
- **Cambridge 9618**: Cambridge pseudocode conventions (`DECLARE`, `←`, `ENDIF`, `OUTPUT`…), trace tables where useful, mark points written as "one mark per point, max n".
- Order easiest to hardest. Split multi-part questions into (a), (b), (c) within one question's `text`.
- Maths in **plain Unicode**: x², x³, √(x+1), ∫₀¹ 3x² dx, (2x+1)/(x−3), ≤, ≥, ≠, π, θ, Σ, →. No LaTeX: the companion shows text as-is.
- Every question gets `marks` (1–30), a real `topicId` from step 2, and a `markScheme` detailed enough for someone else to mark a photo of handwritten work.
- Size guide: roughly one mark per minute and a quarter at exam standard.

## 6. Show it and ask

Show the questions with their marks. Keep the mark schemes collapsed or
summarised, so as not to spoil the practice. Then AskUserQuestion:
**Accept and upload** · Make it easier · Make it harder · Change some questions.
Revise and ask again until they accept or stop.

## 7. Upload — only after "Accept"

Call `apply_changes` with one op:

```json
{"ops":[{"id":"pack-<subjectId>-<YYYYMMDD-HHMM>","type":"pack.add","pack":{
  "title":"<short title>","subjectId":"<id>","topicIds":["t…"],
  "difficulty":"exam","minutes":30,"source":"notes|spec|both",
  "due":"YYYY-MM-DD","priority":"normal",
  "questions":[{"n":"1","text":"…","marks":3,"topicId":"t…","markScheme":"M1 …\nA1 …"}]}}]}
```

Check the result has `ok: true` with a `packId` and `taskId`. Then tell the
student it's on the companion's to-do list as **Question pack: <title>**.
**Open pack** shows it; **Mark my answers** marks their photos against your
scheme. If the op fails, show the error and fix it; don't silently retry
with a new id.

## Rules

- Never call `apply_changes` before the student explicitly accepts.
- Never invent topic ids; use only ids from `get_today`.
- Don't put answers in the question text.
- One pack per accept. For a second pack, start again at step 3.

/* ============================================================================
   ASSIGNMENT ARROW - FAIR OUTPUT MARKING
   Decides whether a program's output matches what the model answer printed
   for one hidden test case. An exact match passes. Otherwise it passes when
   what the examiner cares about is right, and only the wording differs:

   - prompts are not marked: a line ending in ":" or "?", or starting with
     Enter / Input / Type / Give, is left out on both sides;
   - the remaining lines must be the same in number, and on each line
   - the numbers must match exactly and in order (3.50 is 3.5), and so must
     TRUE and FALSE;
   - every word the model answer prints must be there, allowing a spelling
     slip: same first letter, at most 1 letter wrong (2 in a word longer
     than 4 letters), capitals and a plural "s" ignored - so "Valid" is not
     "Invalid", and "even" is not "odd";
   - not / no / never / none / cannot must appear as often as in the model
     answer, so "found" is not "not found";
   - words of your own on top are fine.

   So a spelling slip ("secounds"), your own prompt, or no prompt at all no
   longer costs the marks, while printing the answer as a literal still fails
   every case but one, because the other cases use different values.
   tools/verify.mjs checks that no two test cases of a question are confused.

   Runs in a browser (window.ArrowMarking) and under Node (module.exports).
   ========================================================================== */
(function(g){
"use strict";

function lev(a, b){
  if (a === b) return 0;
  let prev = [];
  for (let j = 0; j <= b.length; j++) prev.push(j);
  for (let i = 1; i <= a.length; i++){
    const cur = [i];
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/* "Enter a number of seconds: ", "How many?" - the wording of a prompt is never marked */
function isPrompt(line){
  const t = String(line).trim();
  return /[:?]$/.test(t) || /^(please\s+)?(enter|input|type|give)\b/i.test(t);
}

const NEGATIONS = ["not", "no", "never", "none", "cannot", "nothing", "nobody", "neither", "nor"];

function tokens(line){
  const nums = [], words = [], values = [];
  (String(line).match(/-?\d+(?:\.\d+)?|[A-Za-z]+/g) || []).forEach(function(t){
    if (/\d/.test(t)) nums.push(Number(t));
    else if (/^(true|false)$/i.test(t)) values.push(t.toUpperCase());
    else if (t.length > 1 || /^[aI]$/.test(t)) words.push(t.toLowerCase().replace(/^(\w{3,}?)s$/, "$1"));
  });
  return { nums: nums, words: words, values: values };
}

/* a spelling slip: same first letter, and only a letter or two out */
function closeWord(a, b){
  if (a === b) return true;
  if (a[0] !== b[0]) return false;
  return lev(a, b) <= (Math.max(a.length, b.length) <= 4 ? 1 : 2);
}

function sameLine(got, want){
  const a = tokens(got), b = tokens(want);
  if (a.nums.length !== b.nums.length) return false;
  for (let i = 0; i < b.nums.length; i++) if (Math.abs(a.nums[i] - b.nums[i]) > 1e-9) return false;
  if (a.values.join() !== b.values.join()) return false;
  for (const w of b.words) if (!a.words.some(function(x){ return closeWord(w, x); })) return false;
  const negs = function(ws){ return ws.filter(function(w){ return NEGATIONS.indexOf(w) !== -1; }).length; };
  return negs(a.words) === negs(b.words);
}

/* { ok, loose }: loose when it passed on everything but the exact wording */
function sameOutput(got, want){
  if (got === want) return { ok:true, loose:false };
  if (got === null || got === undefined) return { ok:false, loose:false };
  const lines = function(s){ return String(s).split("\n").map(function(l){ return l.trim(); }).filter(function(l){ return l && !isPrompt(l); }); };
  const g = lines(got), w = lines(want);
  if (g.length !== w.length) return { ok:false, loose:false };
  for (let i = 0; i < w.length; i++) if (!sameLine(g[i], w[i])) return { ok:false, loose:false };
  return { ok:true, loose:true };
}

g.ArrowMarking = { sameOutput: sameOutput, isPrompt: isPrompt, closeWord: closeWord };
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) module.exports = globalThis.ArrowMarking;

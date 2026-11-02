/* ============================================================================
   LESSON INDEX
   Replaces the lesson drop-down with a list you can see at a glance: what is
   done, what is part-done, what is still to do.

   Status comes from state the app already keeps - no new bookkeeping:
     aaLab.v1 .ex          every "Your turn" exercise you have tried (lab.js)
     assignmentArrow.v1    .lessonAt, the furthest lesson you have opened
   A lesson counts as done when every one of its exercises has been answered
   correctly; part-done when some have been tried.

   Loaded last, so it can wrap renderLessonOptions without touching any of
   the files it sits on top of.
   ========================================================================== */
(function (root) {
"use strict";

var doc = root.document;
if (!doc) return;

/* ---------- state the other files already keep ---------- */
function labEx() {
  try { return JSON.parse(root.localStorage.getItem("aaLab.v1")).ex || {}; }
  catch (e) { return {}; }
}
function arrowState() {
  try { return JSON.parse(root.localStorage.getItem("assignmentArrow.v1")) || {}; }
  catch (e) { return {}; }
}
/* Ids must match the ones lab.js records against, or nothing ever shows as
   done: "<lesson>.<n>" over the lesson's exercises, with the closing check
   taking the next number after them. */
function exercisesFor(L) {
  var plus = root.LESSONS_PLUS || {};
  var list = (plus[L.id] || []).map(function (ex, i) { return { id: L.id + "." + (i + 1) }; });
  var hasCheck = (L.blocks || []).some(function (b) { return b.t === "check"; });
  if (hasCheck) list.push({ id: L.id + "." + (list.length + 1) });
  return list;
}
function statusOf(L) {
  var ex = labEx();
  var list = exercisesFor(L);
  if (!list.length) return { state: "none", done: 0, right: 0, total: 0 };
  var done = 0, right = 0;
  list.forEach(function (x) {
    var r = ex[x.id];
    if (r) { done++; if (r.ok) right++; }
  });
  var state = right >= list.length ? "done" : done ? "part" : "todo";
  return { state: state, done: done, right: right, total: list.length };
}

/* ---------- the list ---------- */
var LABEL = { done: "Done", part: "In progress", todo: "To do", none: "Read" };

function render() {
  var host = doc.getElementById("lessonIndex");
  if (!host || typeof root.activeLessons !== "function") return;
  var list = root.activeLessons();
  var pos = typeof root.lessonPos === "function" ? root.lessonPos() : 0;

  var counts = { done: 0, part: 0, todo: 0, none: 0 };
  var rows = list.map(function (L, i) {
    var s = statusOf(L);
    counts[s.state]++;
    var meter = s.total
      ? '<span class="li-meter" aria-hidden="true"><i style="width:' +
        Math.round((s.right / s.total) * 100) + '%"></i></span>'
      : "";
    var detail = s.total
      ? s.right + " of " + s.total + " right"
      : "no exercises";
    return '<button type="button" class="li-row' + (i === pos ? " is-current" : "") +
      '" data-go="' + i + '" aria-current="' + (i === pos) + '">' +
      '<span class="li-n">' + (i + 1) + "</span>" +
      '<span class="li-main"><span class="li-title">' + esc(L.title) + "</span>" +
      '<span class="li-blurb">' + esc(L.blurb || "") + "</span>" + meter + "</span>" +
      '<span class="li-state li-' + s.state + '">' + LABEL[s.state] +
      '<small>' + detail + "</small></span></button>";
  }).join("");

  host.innerHTML =
    '<div class="li-head"><span class="label">Your course</span>' +
    '<span class="li-sum">' + counts.done + " done &middot; " + counts.part +
    " in progress &middot; " + (counts.todo + counts.none) + " to go</span></div>" +
    '<div class="li-list">' + rows + "</div>";

  host.querySelectorAll("[data-go]").forEach(function (b) {
    b.addEventListener("click", function () {
      root.renderLesson(Number(b.dataset.go));
      var body = doc.getElementById("lessonBody");
      if (body) body.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ---------- styles ---------- */
var css = doc.createElement("style");
css.textContent = [
  "#lessonIndex{margin:0 0 22px}",
  ".li-head{display:flex;align-items:baseline;gap:12px;margin-bottom:9px}",
  ".li-sum{margin-left:auto;font-family:var(--display);font-size:.8rem;color:var(--ink-3)}",
  ".li-list{display:flex;flex-direction:column;gap:1px;background:var(--rule);border:1px solid var(--rule);border-radius:6px;overflow:hidden}",
  ".li-row{display:flex;gap:13px;align-items:flex-start;width:100%;text-align:left;cursor:pointer;",
  "  background:var(--surface);border:0;padding:12px 15px;font-family:var(--display)}",
  ".li-row:hover{background:var(--surface-2)}",
  ".li-row.is-current{background:var(--pen-soft)}",
  ".li-row.is-current .li-title{color:var(--pen-ink)}",
  ".li-n{font-family:var(--mono);font-size:.8rem;color:var(--ink-3);min-width:1.8em;padding-top:2px;font-variant-numeric:tabular-nums}",
  ".li-main{flex:1;min-width:0}",
  ".li-title{display:block;font-size:.96rem;font-weight:600;color:var(--ink)}",
  ".li-blurb{display:block;font-family:var(--prose);font-size:.85rem;color:var(--ink-3);margin-top:2px}",
  ".li-meter{display:block;height:4px;border-radius:3px;background:var(--surface-2);margin-top:7px;max-width:260px;overflow:hidden}",
  ".li-meter i{display:block;height:100%;background:var(--ok);border-radius:3px}",
  ".li-state{flex:0 0 auto;text-align:right;font-size:.72rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding-top:2px}",
  ".li-state small{display:block;font-weight:500;letter-spacing:0;text-transform:none;font-size:.74rem;color:var(--ink-3);margin-top:2px}",
  ".li-done{color:var(--ok)}", ".li-part{color:var(--warn)}",
  ".li-todo,.li-none{color:var(--ink-3)}",
  "@media (max-width:620px){.li-state small{display:none}}"
].join("");
doc.head.appendChild(css);

/* ---------- slot it in, and keep it in step ---------- */
function install() {
  if (typeof root.renderLessonOptions !== "function") return false;
  var sel = doc.getElementById("lessonSel");
  if (!sel) return false;

  // the drop-down stays for keyboard use, but the list is what you look at
  var row = sel.closest("div");
  if (row) row.style.display = "none";
  if (!doc.getElementById("lessonIndex")) {
    var host = doc.createElement("div");
    host.id = "lessonIndex";
    (row || sel).parentNode.insertBefore(host, row || sel);
  }

  ["renderLessonOptions", "renderLesson"].forEach(function (fn) {
    var orig = root[fn];
    if (typeof orig !== "function" || orig.__indexed) return;
    var wrapped = function () { var r = orig.apply(this, arguments); render(); return r; };
    wrapped.__indexed = true;
    root[fn] = wrapped;
  });

  // an exercise being marked changes a lesson's status
  root.addEventListener("arrowlab:exercise", render);
  render();
  return true;
}

if (!install()) {
  var tries = 0;
  var t = setInterval(function () {
    if (install() || ++tries > 40) clearInterval(t);
  }, 120);
}

})(typeof window !== "undefined" ? window : globalThis);

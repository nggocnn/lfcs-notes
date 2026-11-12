"use strict";

// ---------- storage ----------
const STORE_KEY = "lfcs-progress-v1";
const INTERVALS = [0, 1, 2, 4, 7, 14, 30]; // days per Leitner box
const DEFAULT_PREFS = {
  types: ["quiz", "lab", "mock"], domains: ["01", "02", "03", "04", "05"],
  newPerSession: 15, textSize: "m", wrapCode: true,
};

function loadStore() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { s = {}; }
  return {
    srs: s.srs || {}, misses: s.misses || {}, prefs: { ...DEFAULT_PREFS, ...(s.prefs || {}) },
    notesPos: s.notesPos || {}, lastNote: s.lastNote || null, log: s.log || {},
  };
}
let store = loadStore();
const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {} };

// ---------- dates ----------
const pad = (n) => String(n).padStart(2, "0");
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => fmt(new Date());
const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return fmt(d); };

// ---------- data ----------
let DATA, CARDS = {};
const $app = document.getElementById("app");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const TYPE_LABEL = { quiz: "Quiz", lab: "Labs", mock: "Mocks" };
const domName = (d) => (d && DATA.domains[d] ? DATA.domains[d].short : "Mixed");

function isDue(id) {
  const s = store.srs[id];
  return s && s.due <= today();
}
const isNew = (id) => !store.srs[id];
const openMiss = (id) => store.misses[id] && !store.misses[id].done;

function filtered(prefs = store.prefs, domain = null) {
  return DATA.cards.filter((c) => prefs.types.includes(c.type)
    && (domain ? c.domain === domain : (!c.domain || prefs.domains.includes(c.domain))));
}

// weighted random order: higher-weight domains surface first more often
function weightedShuffle(cards) {
  return cards
    .map((c) => ({ c, k: -Math.log(Math.random()) / ((c.domain && DATA.domains[c.domain].weight) || 15) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.c);
}

// ---------- daily log and streak ----------
const reviewedToday = () => store.log[today()] || 0;
function streak() {
  let n = 0, d = today();
  if (!store.log[d]) d = addDays(d, -1); // today not started yet: count up to yesterday
  while (store.log[d]) { n++; d = addDays(d, -1); }
  return n;
}

function applyPrefs() {
  document.documentElement.dataset.text = store.prefs.textSize;
  document.documentElement.classList.toggle("wrap-code", !!store.prefs.wrapCode);
}

// ---------- session ----------
let session = null; // { queue, total, done, again, showBack, history: [], label }

// Cards due (oldest first) then new ones, optionally limited to one domain or a count.
function queueFor({ domain = null, limit = null } = {}) {
  const pool = filtered(store.prefs, domain);
  const due = weightedShuffle(pool.filter((c) => isDue(c.id))).sort((a, b) => store.srs[a.id].due.localeCompare(store.srs[b.id].due));
  const fresh = weightedShuffle(pool.filter((c) => isNew(c.id))).slice(0, store.prefs.newPerSession);
  const ids = [...due, ...fresh].map((c) => c.id);
  return limit ? ids.slice(0, limit) : ids;
}

function startSession(kind, opts = {}) {
  let ids, label;
  if (kind === "misses") {
    ids = weightedShuffle(DATA.cards.filter((c) => openMiss(c.id))).map((c) => c.id);
    label = "Misses";
  } else if (kind === "ids") {
    ids = weightedShuffle(opts.ids.map((i) => CARDS[i]).filter(Boolean)).map((c) => c.id);
    label = opts.label || "Practice";
  } else if (kind === "browse") {
    ids = weightedShuffle(filtered(store.prefs, opts.domain)).map((c) => c.id);
    label = "Shuffle";
  } else {
    ids = queueFor(opts);
    label = opts.domain ? DATA.domains[opts.domain].short : opts.limit ? `Quick ${opts.limit}` : "Review";
  }
  if (!ids.length) {
    toast(kind === "due" || !kind ? "Nothing due. Try Shuffle or another domain." : "Nothing to study here.");
    return;
  }
  session = { queue: ids, total: ids.length, done: 0, again: 0, showBack: false, history: [], label };
  if (location.hash === "#/study") render(); else location.hash = "#/study";
}
const startWith = (ids, label) => startSession("ids", { ids, label });

// Leitner step: Hard keeps the box (at least 1), Good moves up one (two from a new card).
const nextBox = (box, grade) => grade === "good" ? Math.min(box + (box === 0 ? 2 : 1), INTERVALS.length - 1) : Math.max(box, 1);

// What each button would do to this card, for the hint under the label.
function preview(id) {
  const s = store.srs[id] || { box: 0 };
  const hard = nextBox(s.box, "hard"), good = nextBox(s.box, "good");
  const d = (box) => { const n = Math.max(1, INTERVALS[box]); return n >= 30 ? "1mo" : n >= 7 ? `${Math.round(n / 7)}w` : `${n}d`; };
  return { again: "now", hard: d(hard), good: d(good) };
}

function rate(id, grade) {
  // snapshot for undo
  session.history.push({
    id, srs: store.srs[id] ? { ...store.srs[id] } : null,
    miss: store.misses[id] ? { ...store.misses[id] } : null,
    queue: [...session.queue], done: session.done, again: session.again, log: store.log[today()] || 0,
  });
  if (session.history.length > 20) session.history.shift();

  const s = store.srs[id] ? { ...store.srs[id] } : { box: 0, reviews: 0, lapses: 0 };
  s.reviews++;
  s.last = today();
  if (grade === "again") {
    s.box = 0;
    s.lapses++;
    s.due = today();
    if (!store.misses[id] || store.misses[id].done) store.misses[id] = { date: today(), what: "", fix: "" };
    session.queue.push(id); // see it again this session
    session.again++;
  } else {
    s.box = nextBox(s.box, grade);
    s.due = addDays(today(), Math.max(1, INTERVALS[s.box]));
    session.done++;
  }
  store.srs[id] = s;
  store.log[today()] = reviewedToday() + 1;
  save();
  session.queue.shift();
  session.showBack = false;
  if (navigator.vibrate) try { navigator.vibrate(grade === "again" ? 30 : 10); } catch {}
  render();
  window.scrollTo(0, 0);
}

function undo() {
  const h = session && session.history.pop();
  if (!h) return;
  if (h.srs) store.srs[h.id] = h.srs; else delete store.srs[h.id];
  if (h.miss) store.misses[h.id] = h.miss; else delete store.misses[h.id];
  store.log[today()] = h.log;
  Object.assign(session, { queue: h.queue, done: h.done, again: h.again, showBack: true });
  save();
  render();
  toast("Undone");
}

// ---------- views ----------
function viewHome() {
  const p = store.prefs;
  const ready = queueFor();
  const dueN = filtered().filter((c) => isDue(c.id)).length;
  const newN = ready.length - dueN;
  const misses = DATA.cards.filter((c) => openMiss(c.id)).length;
  const st = streak(), done = reviewedToday();
  const allKnown = DATA.cards.filter((c) => store.srs[c.id] && store.srs[c.id].box >= 3).length;

  const tiles = Object.entries(DATA.domains).sort((a, b) => b[1].weight - a[1].weight).map(([code, d]) => {
    const cs = DATA.cards.filter((c) => c.domain === code && p.types.includes(c.type));
    const known = cs.filter((c) => store.srs[c.id] && store.srs[c.id].box >= 3).length;
    const dd = cs.filter((c) => isDue(c.id)).length;
    const pct = cs.length ? Math.round((100 * known) / cs.length) : 0;
    return `<button class="tile" data-dom="${code}" style="--c:${d.color}">
      <span class="tname">${esc(d.short)}</span>
      <span class="tw">${d.weight}%</span>
      <span class="tstat">${dd ? `<b>${dd} due</b>` : `${pct}% known`}</span>
      <span class="bar"><span style="width:${pct}%"></span></span>
    </button>`;
  }).join("");

  const typeChips = Object.entries(TYPE_LABEL).map(([t, l]) =>
    `<label class="chip"><input type="checkbox" data-type="${t}" ${p.types.includes(t) ? "checked" : ""}> ${l}</label>`).join("");
  const sizeBtns = [["s", "A−"], ["m", "A"], ["l", "A+"]].map(([k, l]) =>
    `<button class="seg ${p.textSize === k ? "on" : ""}" data-size="${k}">${l}</button>`).join("");

  $app.innerHTML = `
    <section class="hero">
      <div class="hstats">
        <div><b>${done}</b><span>today</span></div>
        <div><b>${st}</b><span>day streak</span></div>
        <div><b>${allKnown}</b><span>of ${DATA.cards.length} known</span></div>
      </div>
      <button class="primary go" data-start="due" ${ready.length ? "" : "disabled"}>
        ${ready.length ? `Start · ${ready.length} cards` : "All caught up"}
        <small>${dueN} due · ${newN} new</small>
      </button>
      <div class="quick">
        <button data-quick="10" ${ready.length ? "" : "disabled"}>⚡ Quick 10</button>
        <button data-start="misses" ${misses ? "" : "disabled"}>↺ Misses${misses ? ` (${misses})` : ""}</button>
        <button data-start="browse">🔀 Shuffle</button>
      </div>
    </section>

    <h3 class="sect">By domain <span class="muted small">tap to study one</span></h3>
    <div class="tiles">${tiles}</div>

    ${store.lastNote ? `<a class="card resume" href="#/notes/${store.lastNote}">📖 Continue reading <span class="muted">${esc(lastNoteTitle())}</span></a>` : ""}

    <details class="card settings">
      <summary>Settings</summary>
      <div class="set"><span>Card types</span><div class="chips">${typeChips}</div></div>
      <div class="set"><span>New cards per session</span>
        <div class="stepper"><button data-new="-5">−</button><b>${p.newPerSession}</b><button data-new="5">+</button></div></div>
      <div class="set"><span>Text size</span><div class="segs">${sizeBtns}</div></div>
      <label class="set"><span>Wrap long commands</span><input type="checkbox" id="wrap" ${p.wrapCode ? "checked" : ""}></label>
      <p class="muted small">Quiz = recall. Labs and Mocks = say how you'd solve the task, then check. Progress stays on this phone; back it up from Misses.</p>
    </details>`;

  $app.querySelectorAll("[data-start]").forEach((b) => b.onclick = () => startSession(b.dataset.start));
  $app.querySelector("[data-quick]").onclick = () => startSession("due", { limit: 10 });
  $app.querySelectorAll("[data-dom]").forEach((b) => b.onclick = () => startSession("due", { domain: b.dataset.dom }));
  $app.querySelectorAll("[data-type]").forEach((el) => el.onchange = () => {
    const t = [...$app.querySelectorAll("[data-type]:checked")].map((e) => e.dataset.type);
    if (!t.length) { el.checked = true; return; }
    p.types = t; save(); viewHome(); $app.querySelector(".settings").open = true;
  });
  $app.querySelectorAll("[data-new]").forEach((b) => b.onclick = () => {
    p.newPerSession = Math.min(100, Math.max(0, p.newPerSession + +b.dataset.new)); save(); viewHome(); $app.querySelector(".settings").open = true;
  });
  $app.querySelectorAll("[data-size]").forEach((b) => b.onclick = () => {
    p.textSize = b.dataset.size; save(); applyPrefs(); viewHome(); $app.querySelector(".settings").open = true;
  });
  $app.querySelector("#wrap").onchange = (e) => { p.wrapCode = e.target.checked; save(); applyPrefs(); };
}

function lastNoteTitle() {
  const [code, id] = (store.lastNote || "").split("/");
  const n = DATA.notes.find((x) => x.code === code);
  const s = n && n.sections.find((x) => x.id === id);
  return s ? s.title : "";
}

function cardMeta(c) {
  const s = store.srs[c.id];
  const st = s ? (isDue(c.id) ? "due" : `next ${s.due.slice(5)}`) : "new";
  return `<div class="meta"><span class="tag ${c.type}">${TYPE_LABEL[c.type]}</span><span style="color:${c.domain ? DATA.domains[c.domain].color : "inherit"}">${esc(domName(c.domain))}</span><span class="muted">${esc(c.id)} · ${st}</span></div>`;
}

function viewStudy() {
  if (!session || !session.queue.length) {
    const s = session;
    const more = queueFor().length;
    $app.innerHTML = s
      ? `<section class="card center done">
           <div class="big-emoji">${s.again ? "💪" : "🎉"}</div>
           <h2>Session done</h2>
           <p>${s.done} cards reviewed${s.again ? `, ${s.again} to redo` : ""}. ${reviewedToday()} today · ${streak()} day streak.</p>
           <div class="actions">
             ${more ? `<button class="primary" id="again10">Keep going · 10 more</button>` : ""}
             ${s.again ? `<a class="button" href="#/misses">Review misses</a>` : ""}
             <a class="button" href="#/">Home</a>
           </div>
         </section>`
      : `<section class="card center"><p>No session running.</p><p><a class="button primary" href="#/">Start one</a></p></section>`;
    const k = $app.querySelector("#again10");
    if (k) k.onclick = () => startSession("due", { limit: 10 });
    session = null;
    document.body.classList.remove("in-session");
    return;
  }
  document.body.classList.add("in-session");
  const c = CARDS[session.queue[0]];
  const pos = session.done + 1, total = session.done + session.queue.length;
  const pct = Math.round((100 * session.done) / Math.max(total, 1));
  const pv = preview(c.id);
  $app.innerHTML = `
    <div class="sessbar">
      <a href="#/" class="icon" aria-label="End session">✕</a>
      <div class="progress"><span style="width:${pct}%"></span></div>
      <span class="small muted">${pos}/${total}</span>
      <button class="icon" id="undo" aria-label="Undo" ${session.history.length ? "" : "disabled"}>↶</button>
    </div>
    <article class="card flash ${session.showBack ? "" : "tappable"}" id="flash">
      ${cardMeta(c)}
      <h3>${esc(c.title)}</h3>
      <div class="md front">${c.front}</div>
      ${session.showBack
        ? `<div class="md back" id="back"><div class="backlabel">${c.type === "quiz" ? "Answer" : "Solution"}</div>${c.back || "<p class='muted'>No answer in the notes.</p>"}</div>`
        : `<p class="tapmsg muted small">Think it through, then tap the card or the button</p>`}
    </article>
    <div class="answerbar">
      ${session.showBack
        ? `<button class="again" data-g="again">Again<small>${pv.again}</small></button><button class="hard" data-g="hard">Hard<small>${pv.hard}</small></button><button class="good" data-g="good">Good<small>${pv.good}</small></button>`
        : `<button class="primary wide" id="show">Show ${c.type === "quiz" ? "answer" : "solution"}</button>`}
    </div>`;
  const reveal = () => {
    session.showBack = true; render();
    const b = document.getElementById("back");
    if (b) requestAnimationFrame(() => b.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const show = $app.querySelector("#show");
  if (show) {
    show.onclick = reveal;
    $app.querySelector("#flash").onclick = (e) => { if (!e.target.closest("a, pre, code")) reveal(); };
  }
  $app.querySelector("#undo").onclick = undo;
  $app.querySelectorAll("[data-g]").forEach((b) => b.onclick = () => rate(c.id, b.dataset.g));
}

function viewCard(id) {
  const c = CARDS[id];
  if (!c) { $app.innerHTML = `<p>Card ${esc(id)} not found.</p>`; return; }
  $app.innerHTML = `
    <p class="crumbs"><a href="javascript:history.back()">← Back</a></p>
    <article class="card flash">
      ${cardMeta(c)}
      <h3>${esc(c.title)}</h3>
      <div class="md front">${c.front}</div>
      <details class="reveal"><summary>${c.type === "quiz" ? "Answer" : "Solution"}</summary><div class="md back">${c.back}</div></details>
    </article>
    <div class="actions">
      <button id="miss">${openMiss(id) ? "In misses ✓" : "Add to misses"}</button>
      ${c.domain ? `<button id="dom">Study ${esc(domName(c.domain))}</button>` : ""}
    </div>`;
  $app.querySelector("#miss").onclick = () => {
    if (!openMiss(id)) { store.misses[id] = { date: today(), what: "", fix: "" }; save(); viewCard(id); }
  };
  const d = $app.querySelector("#dom");
  if (d) d.onclick = () => startSession("due", { domain: c.domain });
}

function viewNotesIndex() {
  $app.innerHTML = `<h2>Notes</h2>` + DATA.notes.map((n) => {
    const d = DATA.domains[n.code];
    return `<section class="card"><h3><a href="#/notes/${n.code}">${esc(n.title)}</a> ${d ? `<span class="muted">${d.weight}%</span>` : ""}</h3>
      <ol class="toc compact">${n.sections.map((s) => `<li><a href="#/notes/${n.code}/${s.id}">${esc(s.title.replace(/^\d+\.\s*/, ""))}</a></li>`).join("")}</ol></section>`;
  }).join("");
}

function viewNotes(code, secId) {
  const n = DATA.notes.find((x) => x.code === code);
  if (!n) { $app.innerHTML = "<p>Not found.</p>"; return; }
  if (!secId) {
    $app.innerHTML = `<p class="crumbs"><a href="#/notes">Notes</a></p><h2>${esc(n.title)}</h2>
      ${DATA.domains[code] ? `<button class="primary wide" data-practice-dom="${code}">Study ${esc(DATA.domains[code].short)} cards</button>` : ""}
      <div class="md">${n.intro}</div>
      <ol class="toc">${n.sections.map((s) => `<li><a href="#/notes/${code}/${s.id}">${esc(s.title)}</a></li>`).join("")}</ol>`;
    const pb = $app.querySelector("[data-practice-dom]");
    if (pb) pb.onclick = () => startSession("due", { domain: code });
    return;
  }
  const i = n.sections.findIndex((s) => s.id === secId);
  const s = n.sections[i];
  if (!s) { location.hash = `#/notes/${code}`; return; }
  const prev = n.sections[i - 1], next = n.sections[i + 1];
  const key = `${code}/${secId}`;
  store.lastNote = key; save();
  $app.innerHTML = `
    <p class="crumbs"><a href="#/notes">Notes</a> › <a href="#/notes/${code}">${esc(n.title)}</a></p>
    <article class="md note"><h2>${esc(s.title)}</h2>${s.html}</article>
    <nav class="pager">
      ${prev ? `<a class="button" href="#/notes/${code}/${prev.id}"><small>← Previous</small>${esc(prev.title)}</a>` : "<span></span>"}
      ${next ? `<a class="button next" href="#/notes/${code}/${next.id}"><small>Next →</small>${esc(next.title)}</a>` : "<span></span>"}
    </nav>`;
  requestAnimationFrame(() => window.scrollTo(0, store.notesPos[key] || 0));
  currentNoteKey = key;
}
let currentNoteKey = null;
let scrollTimer;
window.addEventListener("scroll", () => {
  if (!currentNoteKey) return;
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => { store.notesPos[currentNoteKey] = Math.round(window.scrollY); save(); }, 300);
}, { passive: true });

// ---------- map (study plan overview, built from PLAN.md) ----------
const domColor = (d) => (DATA.domains[d] ? DATA.domains[d].color : "var(--muted)");

function noteSectionId(code, num) {
  const n = DATA.notes.find((x) => x.code === code);
  const s = n && n.sections.find((x) => x.title.startsWith(num + "."));
  return s ? s.id : null;
}

// Turn "02 §4, §5, 03 §1-6" / "05 Q1-2, Q21" / "2.1, 1.7" / "M1-5" into links + the card ids they cover.
function parseRefs(text, kind) {
  const links = [], ids = [];
  let dom = null;
  for (let tok of text.split(/,\s*/).filter(Boolean)) {
    const label = tok;
    const pre = tok.match(/^(\d\d)\s+(.+)$/);
    if (pre) { dom = pre[1]; tok = pre[2]; }
    let m, href = null;
    if (kind === "notes" && (m = tok.match(/^§(\d+)/)) && dom) {
      const id = noteSectionId(dom, m[1]);
      href = id ? `#/notes/${dom}/${id}` : `#/notes/${dom}`;
    } else if (kind === "quiz" && (m = tok.match(/^Q(\d+)(?:-(\d+))?$/)) && dom) {
      const a = +m[1], b = +(m[2] || m[1]);
      for (let i = a; i <= b; i++) if (CARDS[`Q${dom}-${i}`]) ids.push(`Q${dom}-${i}`);
      href = `#/card/Q${dom}-${a}`;
    } else if (kind === "labs" && (m = tok.match(/^(\d+\.\d+)$/))) {
      if (CARDS[`Lab ${m[1]}`]) ids.push(`Lab ${m[1]}`);
      href = `#/card/${encodeURIComponent("Lab " + m[1])}`;
    } else if (kind === "mocks" && (m = tok.match(/^M(\d)-(\d+)$/))) {
      const id = `M${m[1]}-T${m[2]}`;
      if (CARDS[id]) ids.push(id);
      href = `#/card/${id}`;
    }
    links.push(href ? `<a href="${href}">${esc(label)}</a>` : esc(label));
  }
  return { html: links.join(", "), ids };
}


let mapFilter = "all";
function viewMap() {
  const P = DATA.plan, doms = Object.entries(DATA.domains).sort((a, b) => b[1].weight - a[1].weight);
  const count = (code, type) => DATA.cards.filter((c) => c.domain === code && c.type === type).length;
  const known = (code) => {
    const cs = DATA.cards.filter((c) => c.domain === code);
    return cs.length ? Math.round((100 * cs.filter((c) => store.srs[c.id] && store.srs[c.id].box >= 3).length) / cs.length) : 0;
  };
  const tot = { comp: 0, quiz: 0, lab: 0, mock: 0 };
  const rows = doms.map(([code, d]) => {
    const r = { comp: P.coverage.filter((c) => c.domain === code).length, quiz: count(code, "quiz"), lab: count(code, "lab"), mock: count(code, "mock") };
    for (const k in tot) tot[k] += r[k];
    return `<tr><td><span class="swatch" style="background:${d.color}"></span>${esc(d.name)}</td><td class="n">${d.weight}%</td><td class="n">${r.comp}</td><td class="n">${r.quiz}</td><td class="n">${r.lab}</td><td class="n">${r.mock}</td><td class="n">${known(code)}%</td></tr>`;
  }).join("");

  const weeks = P.schedule.map((w) => {
    const done = w.items.filter((i) => i.done).length;
    return `<div class="week">
      <div class="whead"><b>Week ${w.week}</b><span class="muted small">${done}/${w.items.length}</span></div>
      <div class="stripe">${w.domains.map((d) => `<i style="background:${domColor(d)}"></i>`).join("")}</div>
      <div class="focus">${esc(w.title)}</div>
      <ul class="checks">${w.items.map((i) => `<li class="${i.done ? "done" : ""}">${i.html}</li>`).join("")}</ul>
    </div>`;
  }).join("");

  const nodes = (P.coverage || []).filter((c) => mapFilter === "all" || c.domain === mapFilter);
  const cov = nodes.map((c, i) => {
    const n = parseRefs(c.notes, "notes"), q = parseRefs(c.quiz, "quiz"), l = parseRefs(c.labs, "labs"), m = parseRefs(c.mocks, "mocks");
    const ids = [...q.ids, ...l.ids, ...m.ids];
    return `<div class="comp" style="border-left-color:${domColor(c.domain)}">
      <b>${esc(c.comp)}</b>
      <dl>
        <dt>Notes</dt><dd>${n.html}</dd>
        <dt>Quiz</dt><dd>${q.html}</dd>
        <dt>Labs</dt><dd>${l.html}</dd>
        <dt>Mocks</dt><dd>${m.html || '<span class="muted">labs only</span>'}</dd>
      </dl>
      <button class="small" data-practice="${esc(ids.join("|"))}">Practice these ${ids.length} cards</button>
    </div>`;
  }).join("");

  const filters = [["all", "All"], ...doms.map(([k, d]) => [k, d.short])].map(([k, t]) =>
    `<button class="chip ${mapFilter === k ? "on" : ""}" data-filter="${k}">${esc(t)}</button>`).join("");

  const sections = Object.fromEntries(DATA.notes.map((n) => [n.code, n.sections.length]));
  const quizN = DATA.cards.filter((c) => c.type === "quiz").length, labN = DATA.cards.filter((c) => c.type === "lab").length;
  const mockN = new Set(DATA.cards.filter((c) => c.type === "mock").map((c) => c.id.split("-")[0])).size;

  $app.innerHTML = `
    <h2>Study map</h2>
    ${P.status ? `<p class="banner">${esc(P.status)}</p>` : ""}

    <section class="card">
      <h3>The exam</h3>
      <div class="facts">
        <div class="fact key"><b>2 h</b><span>17-20 hands-on tasks</span></div>
        <div class="fact key"><b>67%</b><span>to pass; aim for 80% in mocks</span></div>
        <div class="fact"><b>1</b><span>free retake included</span></div>
        <div class="fact"><b>2 × 36 h</b><span>killer.sh sessions</span></div>
        <div class="fact"><b>man only</b><span><code>man</code>, <code>--help</code>, <code>/usr/share/doc</code></span></div>
      </div>
    </section>

    <section class="card">
      <h3>Domains and practice volume</h3>
      <div class="wbar">${doms.map(([, d]) => `<span style="flex:${d.weight};background:${d.color}" title="${esc(d.name)} ${d.weight}%">${d.weight}%</span>`).join("")}</div>
      <div class="scroll"><table class="dtable">
        <thead><tr><th>Domain</th><th class="n">Weight</th><th class="n">Comp.</th><th class="n">Quiz</th><th class="n">Labs</th><th class="n">Mock</th><th class="n">Known</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td>Total</td><td class="n">100%</td><td class="n">${tot.comp}</td><td class="n">${tot.quiz}</td><td class="n">${tot.lab}</td><td class="n">${tot.mock}</td><td></td></tr></tfoot>
      </table></div>
      <p class="muted small">Known = cards you rated Good at least three times in a row (box 3+).</p>
    </section>

    <section class="card">
      <h3>Six-week schedule</h3>
      <p class="muted small">About 7 hours a week, 5 sessions of 80-90 min. Ticks come from PLAN.md.</p>
      <div class="weeks">${weeks}</div>
    </section>

    <section class="card">
      <h3>Practice loop</h3>
      <ol class="loop">
        <li><b>Revise</b> the domain notes.</li>
        <li><b>Recall</b>: quiz cards before opening the answer (here, every session).</li>
        <li><b>Do</b> the labs on the VMs; each has a verify step and a hidden solution.</li>
        <li><b>Test</b>: <code>setup-mock-N.sh</code>, 2 hours, then <code>check-mock-N.sh</code>.</li>
        <li><b>Log misses</b> in PLAN.md; retest after 2 and 7 days.</li>
      </ol>
    </section>

    <section class="card">
      <h3>Lab topology</h3>
      <p class="muted small">Vagrant + VirtualBox, repo mounted at <code>/lfcs</code>.</p>
      <div class="vms">
        <div class="vm base"><b>base</b><span>Ubuntu 22.04 · 192.168.56.10</span><span>Jump host, runs the mock graders</span><code>ssh node01 · sudo -i · exit</code></div>
        <div class="vm"><b>node01</b><span>Ubuntu 22.04 · .11 · 2 GB · 3 extra disks</span><span>LVM, NFS and NBD server, libvirt (nested), LDAP</span></div>
        <div class="vm"><b>node02</b><span>Ubuntu 22.04 · .12 · 1 GB · 2 extra disks</span><span>Clients, bond and bridge (2 spare NICs), routing, firewall</span></div>
        <div class="vm"><b>rocky</b><span>Rocky Linux 9 · .13 · 1.5 GB · 1 extra disk</span><span>SELinux, dnf, firewalld, nftables</span></div>
      </div>
    </section>

    <section class="card">
      <h3>Curriculum coverage</h3>
      <p class="muted small">${nodes.length} of ${P.coverage.length} competencies. Tap a reference to open it, or practise every card behind a competency.</p>
      <div class="chips">${filters}</div>
      ${cov}
    </section>

    <section class="card">
      <h3>Repository</h3>
      <div class="scroll"><pre class="tree"><b>lfcs-notes/</b>
├── README.md                    <i># entry point and quick start</i>
├── PLAN.md                      <i># schedule, misses, coverage</i>
${DATA.notes.map((n, i) => `├── ${(n.code + "-" + n.title.toLowerCase().replace(/[^a-z]+/g, "-") + ".md").padEnd(29)}<i># ${n.code === "99" ? "outside the curriculum" : sections[n.code] + " sections"}</i>`).join("\n")}
├── <b>quizzes/</b>                     <i># ${quizN} recall questions</i>
├── <b>labs/</b>                        <i># ${labN} labs + Vagrantfile</i>
├── <b>mock/</b>                        <i># ${mockN} timed exams, setup + grader</i>
└── <b>web/</b>, tools/build_site.py     <i># this app</i></pre></div>
      <p class="small"><a target="_blank" rel="noopener" href="${DATA.repo.replace("/blob/main/", "")}">Open on GitHub</a></p>
    </section>`;

  $app.querySelectorAll("[data-filter]").forEach((b) => b.onclick = () => { mapFilter = b.dataset.filter; viewMap(); });
  $app.querySelectorAll("[data-practice]").forEach((b) => b.onclick = () => startWith(b.dataset.practice.split("|").filter(Boolean), "Topic"));
}

// ---------- search ----------
let searchIndex = null;
function textOf(html) { const d = document.createElement("div"); d.innerHTML = html; return d.textContent; }
function buildIndex() {
  searchIndex = [];
  for (const n of DATA.notes) for (const s of n.sections)
    searchIndex.push({ kind: "note", href: `#/notes/${n.code}/${s.id}`, title: `${n.title} › ${s.title}`, text: textOf(s.html) });
  for (const c of DATA.cards)
    searchIndex.push({ kind: c.type, href: `#/card/${encodeURIComponent(c.id)}`, title: `${c.id} · ${c.title}`, text: textOf(c.front + " " + c.back) });
}
let lastQuery = "";
function viewSearch() {
  $app.innerHTML = `<input type="search" id="q" placeholder="Search notes and cards (e.g. nmcli, fstab, chage)" value="${esc(lastQuery)}" autofocus><div id="results"></div>`;
  const q = $app.querySelector("#q");
  const run = () => {
    lastQuery = q.value.trim();
    const terms = lastQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const out = $app.querySelector("#results");
    if (!terms.length) { out.innerHTML = ""; return; }
    if (!searchIndex) buildIndex();
    const hits = searchIndex.filter((e) => { const t = (e.title + " " + e.text).toLowerCase(); return terms.every((w) => t.includes(w)); }).slice(0, 60);
    out.innerHTML = hits.length ? hits.map((h) => {
      const low = h.text.toLowerCase(), at = Math.max(0, low.indexOf(terms[0]) - 50);
      const snip = esc(h.text.slice(at, at + 160)).replace(new RegExp(terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "gi"), (m) => `<mark>${m}</mark>`);
      return `<a class="hit card" href="${h.href}"><span class="tag ${h.kind}">${h.kind === "note" ? "Notes" : TYPE_LABEL[h.kind]}</span> <b>${esc(h.title)}</b><span class="muted small">…${snip}…</span></a>`;
    }).join("") : `<p class="muted">No matches.</p>`;
  };
  q.oninput = run;
  run();
  q.focus();
}

// ---------- misses ----------
function missRows() {
  return Object.entries(store.misses).filter(([, m]) => !m.done).sort((a, b) => a[1].date.localeCompare(b[1].date));
}
const cell = (s) => (s || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
function missesMarkdown() {
  return missRows().map(([id, m]) =>
    `| ${m.date} | ${id} | ${cell(m.what)} | ${cell(m.fix)} | ${addDays(m.date, 2)} | ${addDays(m.date, 7)} |`).join("\n");
}

function viewMisses() {
  const rows = missRows();
  const t = today();
  $app.innerHTML = `
    <h2>Misses <span class="muted">(${rows.length})</span></h2>
    <p class="muted small">Cards you marked "Again" land here. Add a one-line note, then copy the rows into the Misses table in PLAN.md.</p>
    ${rows.length ? "" : `<p class="card center muted">No misses yet.</p>`}
    ${rows.map(([id, m]) => {
      const c = CARDS[id];
      const r2 = addDays(m.date, 2), r7 = addDays(m.date, 7);
      return `<section class="card miss" data-id="${esc(id)}">
        <div class="meta"><a href="#/card/${encodeURIComponent(id)}"><b>${esc(id)}</b></a> <span class="muted">${c ? esc(c.title) : ""}</span></div>
        <div class="small muted">Missed ${m.date} · retest <span class="${r2 <= t ? "due" : ""}">${r2}</span> and <span class="${r7 <= t ? "due" : ""}">${r7}</span></div>
        <input data-f="what" placeholder="What went wrong" value="${esc(m.what)}">
        <input data-f="fix" placeholder="Fix" value="${esc(m.fix)}">
        <button class="small" data-done>Mark fixed</button>
      </section>`;
    }).join("")}
    <div class="actions">
      <button class="primary" id="copy" ${rows.length ? "" : "disabled"}>Copy rows for PLAN.md</button>
      <textarea id="mdout" readonly rows="4" placeholder="Markdown rows appear here">${esc(missesMarkdown())}</textarea>
    </div>
    <section class="card">
      <h3>Backup</h3>
      <p class="muted small">Progress lives in this browser only. Export to move it to another device or keep a copy.</p>
      <p><button id="export">Export progress</button> <label class="button">Import<input type="file" id="import" accept="application/json" hidden></label> <button id="reset" class="danger">Reset all</button></p>
      <p class="muted small">Build ${esc(window.BUILD)} · ${DATA.cards.length} cards</p>
    </section>`;

  $app.querySelectorAll(".miss").forEach((el) => {
    const id = el.dataset.id;
    el.querySelectorAll("[data-f]").forEach((inp) => inp.oninput = () => {
      store.misses[id][inp.dataset.f] = inp.value; save();
      $app.querySelector("#mdout").value = missesMarkdown();
    });
    el.querySelector("[data-done]").onclick = () => { store.misses[id].done = today(); save(); viewMisses(); };
  });
  $app.querySelector("#copy").onclick = async () => {
    const txt = missesMarkdown();
    try { await navigator.clipboard.writeText(txt); toast("Copied"); }
    catch { const ta = $app.querySelector("#mdout"); ta.select(); document.execCommand("copy"); toast("Copied"); }
  };
  $app.querySelector("#export").onclick = () => {
    const blob = new Blob([JSON.stringify(store, null, 1)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `lfcs-progress-${today()}.json` });
    document.body.appendChild(a); a.click(); a.remove();
  };
  $app.querySelector("#import").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const s = JSON.parse(await f.text());
      if (!s.srs || !s.misses) throw new Error("not a progress file");
      localStorage.setItem(STORE_KEY, JSON.stringify(s)); store = loadStore(); toast("Imported"); viewMisses();
    } catch (err) { alert("Import failed: " + err.message); }
  };
  $app.querySelector("#reset").onclick = () => {
    if (confirm("Erase all progress and misses on this device?")) { localStorage.removeItem(STORE_KEY); store = loadStore(); viewMisses(); }
  };
}

function toast(msg) {
  const t = Object.assign(document.createElement("div"), { className: "toast", textContent: msg });
  document.body.appendChild(t); setTimeout(() => t.remove(), 1600);
}

// ---------- router ----------
function render() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  const tab = { "": "study", study: "study", card: "study", notes: "notes", map: "map", search: "search", misses: "misses" }[parts[0]] || "study";
  document.querySelectorAll("#tabs a").forEach((a) => a.classList.toggle("on", a.dataset.tab === tab));
  $app.dataset.view = parts[0] && parts[0] !== "notes" ? parts[0] : parts[0] === "notes" ? (parts[1] ? "note" : "notes") : "home";
  const mb = document.getElementById("missbadge"), mc = Object.values(store.misses).filter((m) => !m.done).length;
  if (mb) { mb.hidden = !mc; mb.textContent = mc; }
  if (parts[0] !== "notes") currentNoteKey = null;
  if (parts[0] !== "study") document.body.classList.remove("in-session");
  switch (parts[0]) {
    case "study": return viewStudy();
    case "card": return viewCard(parts.slice(1).join("/"));
    case "notes": return parts[1] ? viewNotes(parts[1], parts[2]) : viewNotesIndex();
    case "map": return viewMap();
    case "search": return viewSearch();
    case "misses": return viewMisses();
    default: return viewHome();
  }
}
window.addEventListener("hashchange", () => { render(); if (!location.hash.startsWith("#/notes/")) window.scrollTo(0, 0); });

// keyboard shortcuts on desktop: space = show, 1/2/3 = again/hard/good
document.addEventListener("keydown", (e) => {
  if (!session || !location.hash.startsWith("#/study") || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  if (e.key === " " && !session.showBack) { e.preventDefault(); session.showBack = true; render(); }
  else if (session.showBack && ["1", "2", "3"].includes(e.key)) rate(session.queue[0], ["again", "hard", "good"][+e.key - 1]);
});

fetch("data.json")
  .then((r) => r.json())
  .then((d) => {
    DATA = d;
    applyPrefs();
    for (const c of d.cards) CARDS[c.id] = c;
    render();
  })
  .catch((e) => { $app.innerHTML = `<p>Could not load data: ${esc(e.message)}</p>`; });

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  const hadController = !!navigator.serviceWorker.controller; // false on first install
  navigator.serviceWorker.register("sw.js").then((reg) => {
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      w && w.addEventListener("statechange", () => {
        if (w.state === "activated" && hadController) toast("Updated — reopen the app to get new content");
      });
    });
  });
}

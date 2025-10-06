// ================= Decision Duck — Hide scores until both lists are "Done" =================

// Utilities
const byId = (id) => document.getElementById(id);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// ----- DROPDOWNS: numbers-only 1–5 on both sides -----
function makeProScoreSelect(el) {
  el.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const o = document.createElement("option");
    o.value = String(i);
    o.textContent = i;
    el.appendChild(o);
  }
  el.value = "3";
}
function makeConScoreSelect(el) {
  el.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const o = document.createElement("option");
    o.value = String(i);
    o.textContent = i;
    el.appendChild(o);
  }
  el.value = "3";
}

// ----- State & storage -----
const state = { topic: "", pros: [], cons: [], prosLocked: false, consLocked: false }; // items: {id,text,score}
const STORAGE_KEY = "decision-duck-v3-hide-scores";

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (data && typeof data === "object") {
      state.topic      = data.topic || "";
      state.pros       = Array.isArray(data.pros) ? data.pros : [];
      state.cons       = Array.isArray(data.cons) ? data.cons : [];
      state.prosLocked = !!data.prosLocked;
      state.consLocked = !!data.consLocked;
    }
  } catch {}
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function resetAll() {
  state.topic = "";
  state.pros = [];
  state.cons = [];
  state.prosLocked = false;
  state.consLocked = false;
  save();
  renderAll();
  const rec = byId("recommendation");
  rec.classList.add("ring-2","ring-yellow-200");
  setTimeout(()=>rec.classList.remove("ring-2","ring-yellow-200"), 800);
}

// ----- DOM refs -----
const topicEl = byId("topic");
const prosListEl = byId("prosList");
const consListEl = byId("consList");
const prosTotalEl = byId("prosTotal");
const consTotalEl = byId("consTotal");
const scoreLineEl = byId("scoreLine");
const recIconEl = byId("recIcon");
const recHeadingEl = byId("recHeading");
const recTextEl = byId("recText");

// New refs for "Done" toggles (present in HTML)
const prosDoneEl = byId("prosDone");
const consDoneEl = byId("consDone");

// Helper: are we allowed to show scores?
function isScoresVisible() {
  return !!(state.prosLocked && state.consLocked);
}

// ----- Rendering list items -----
function listItemTemplate(kind, item) {
  const showScores = isScoresVisible();

  const li = document.createElement("li");
  li.className = "group flex items-center gap-2 p-2 rounded-xl border bg-white/70";
  li.innerHTML = `
    <span class="inline-flex items-center text-xs px-2 py-1 rounded-full ${
      kind === "pro"
        ? "bg-green-50 text-green-700 border border-green-200"
        : "bg-rose-50 text-rose-700 border border-rose-200"
    } ${showScores ? "" : "hidden"}">Score: <strong class="ml-1">${item.score}</strong></span>

    <span contenteditable="true" data-role="text"
          class="flex-1 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-sky-300">
      ${escapeHtml(item.text)}
    </span>

    <!-- Sliders remain 1–10; only the dropdowns are 1–5 -->
    <input type="range" min="1" max="10" value="${item.score}" data-role="slider"
           class="w-28 accent-amber-400">
    <button data-role="delete" title="Remove"
            class="opacity-70 group-hover:opacity-100 transition rounded-lg px-2 py-1 bg-slate-100 hover:bg-slate-200">
      ✕
    </button>
  `;

  const textEl = li.querySelector('[data-role="text"]');
  const sliderEl = li.querySelector('[data-role="slider"]');
  const delBtn = li.querySelector('[data-role="delete"]');

  textEl.addEventListener("input", () => {
    item.text = textEl.textContent.trim();
    save(); updateTotals();
  });

  sliderEl.addEventListener("input", () => {
    item.score = clamp(parseInt(sliderEl.value || "1", 10), 1, 10);
    if (showScores) {
      const strong = li.querySelector("strong");
      if (strong) strong.textContent = item.score;
    }
    save(); updateTotals();
  });

  delBtn.addEventListener("click", () => {
    const arr = kind === "pro" ? state.pros : state.cons;
    const i = arr.findIndex((x) => x.id === item.id);
    if (i >= 0) arr.splice(i, 1);
    save(); renderLists(); updateTotals();
  });

  return li;
}

function renderLists() {
  prosListEl.innerHTML = "";
  consListEl.innerHTML = "";
  state.pros.forEach((p) => prosListEl.appendChild(listItemTemplate("pro", p)));
  state.cons.forEach((c) => consListEl.appendChild(listItemTemplate("con", c)));
}

// ----- Totals & scoreboard -----
function totals() {
  const p = state.pros.reduce((a, b) => a + (b.score || 0), 0);
  const c = state.cons.reduce((a, b) => a + (b.score || 0), 0);
  return { p, c, net: p - c };
}

function updateTotals() {
  const t = totals();
  if (!isScoresVisible()) {
    prosTotalEl.textContent = "Total: —";
    consTotalEl.textContent = "Total: —";
    scoreLineEl.textContent = 'Lock both lists to see totals (check “I’m done adding pros/cons”).';
    return;
  }
  prosTotalEl.textContent = `Total: ${t.p}`;
  consTotalEl.textContent = `Total: ${t.c}`;
  const netText = t.net >= 0 ? `+${t.net}` : `${t.net}`;
  scoreLineEl.textContent = `Pros: ${t.p}  •  Cons: ${t.c}  •  Net: ${netText}`;
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");
}

function renderAll() {
  topicEl.value = state.topic || "";
  // reflect toggle states
  if (prosDoneEl) prosDoneEl.checked = !!state.prosLocked;
  if (consDoneEl) consDoneEl.checked = !!state.consLocked;
  renderLists();
  updateTotals();
  setNeutralRecommendation();
}

// ----- Helpful & funny recommendations -----
function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

const DUCK_QUIPS = {
  strongYes: [
    "Quack yeah — this looks pond-erful!",
    "Feather high five — let’s splash!",
    "Green light across the lily pads!"
  ],
  leanYes: [
    "Mild quack of approval 🦆",
    "Leaning yes — dip a toe first.",
    "Looks promising; test the waters."
  ],
  tie: [
    "Too close to quack confidently.",
    "Neck-and-neck like ducklings racing.",
    "Flip a coin… best two out of three?"
  ],
  leanNo: [
    "Let’s paddle back a bit.",
    "Quacktion postponed — shrink a top con first.",
    "Probably not today; save your feathers."
  ],
  strongNo: [
    "Hard no — waddle away for now.",
    "Red flag on the lily pad. Abort the splash.",
    "All feathers, no flight — skip it."
  ]
};

const DUCK_TIPS = {
  strongYes: [
    "Lock in a first step and celebrate a tiny win.",
    "Set a quick checkpoint to keep momentum."
  ],
  leanYes: [
    "Timebox a small trial.",
    "Ask one friend for a 30-second gut check."
  ],
  tie: [
    "Sleep on it and add one more pro or con tomorrow.",
    "Reframe it smaller so the next step is obvious."
  ],
  leanNo: [
    "Reduce the biggest risk, then revisit.",
    "Try a cheaper/smaller version first."
  ],
  strongNo: [
    "Try an alternate path.",
    "Write the one thing that would need to change to reconsider."
  ]
};

function setNeutralRecommendation() {
  recIconEl.textContent = "🙂";
  recHeadingEl.textContent = "Hello from Decision Duck!";
  recTextEl.textContent = 'Add items, check “I’m done” on both sides, then press "Get Recommendation."';
}

function recommend() {
  // Block recommendation if lists aren't locked
  if (!isScoresVisible()) {
    recIconEl.textContent = "🦆";
    recHeadingEl.textContent = "Finish your lists";
    recTextEl.textContent = 'Check “I’m done adding pros” and “I’m done adding cons” to reveal scores, then press Get Recommendation.';
    const card = document.getElementById("recommendation");
    card.classList.add("ring-2","ring-amber-200");
    setTimeout(() => card.classList.remove("ring-2","ring-amber-200"), 600);
    return;
  }

  const { p, c, net } = totals();

  let bucket = "tie";
  let icon = "🤔";
  if (net >= 5 && p >= 2) { bucket = "strongYes"; icon = "🎉"; }
  else if (net >= 2)      { bucket = "leanYes";   icon = "🦆"; }
  else if (net <= -5 && c >= 2) { bucket = "strongNo"; icon = "❌"; }
  else if (net <= -2)     { bucket = "leanNo";    icon = "🛑"; }

  const HEADINGS = {
    strongYes: ["Quack yeah — go for it!", "Full send, feather-friend!", "Green light!"],
    leanYes:   ["Leaning yes — dip a toe", "Looks promising", "Small quack of approval"],
    tie:       ["Duck-iberation needed", "Too close to quack", "Photo finish"],
    leanNo:    ["Probably not today", "Let’s paddle back", "Lean no — save your feathers"],
    strongNo:  ["Nope — waddle away", "Hard no from the pond", "Abort mission"]
  };

  const heading = pick(HEADINGS[bucket]);
  const quip = pick(DUCK_QUIPS[bucket]);
  const tip  = pick(DUCK_TIPS[bucket]);

  const line = `Pros ${p} vs Cons ${c}. Net ${net >= 0 ? "+" + net : net}.`;
  const topic = state.topic?.trim();
  const tail = topic ? ` (Topic: “${topic}”)` : "";

  recIconEl.textContent = icon;
  recHeadingEl.textContent = heading;
  recTextEl.textContent = `${quip} ${line} Duck tip: ${tip}.${tail}`;

  const card = document.getElementById("recommendation");
  card.classList.add("ring-2","ring-amber-200");
  setTimeout(() => card.classList.remove("ring-2","ring-amber-200"), 500);
}

// ----- Share (URL state) -----
function encodeStateToUrl() {
  const payload = btoa(encodeURIComponent(JSON.stringify(state)));
  const url = new URL(location.href);
  url.hash = `#d=${payload}`;
  return url.toString();
}
function tryLoadFromUrl() {
  if (!location.hash.startsWith("#d=")) return;
  try {
    const payload = location.hash.slice(3);
    const json = decodeURIComponent(atob(payload));
    const data = JSON.parse(json);
    if (data && typeof data === "object") {
      state.topic      = data.topic || "";
      state.pros       = Array.isArray(data.pros) ? data.pros : [];
      state.cons       = Array.isArray(data.cons) ? data.cons : [];
      state.prosLocked = !!data.prosLocked;
      state.consLocked = !!data.consLocked;
    }
  } catch {}
}

// ----- Toast -----
function toast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  t.className = "fixed left-1/2 -translate-x-1/2 bottom-6 px-4 py-2 rounded-full bg-slate-900 text-white text-sm shadow-lg";
  document.body.appendChild(t);
  setTimeout(()=> { t.style.opacity = "0"; t.style.transform = "translateY(8px)"; }, 1400);
  setTimeout(()=> t.remove(), 1900);
}

// ----- Add item helper -----
function addItem(kind, text, score) {
  if (!text || !text.trim()) return;
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    text: text.trim(),
    score: clamp(parseInt(score || "3", 10), 1, 10), // dropdowns feed 1..5; sliders up to 10
  };
  (kind === "pro" ? state.pros : state.cons).push(item);
  save(); renderLists(); updateTotals();
}

// ----- Wire events -----
function wire() {
  // Build dropdowns (1–5)
  makeProScoreSelect(byId("proScore"));
  makeConScoreSelect(byId("conScore"));

  // Topic
  topicEl.addEventListener("input", () => {
    state.topic = topicEl.value;
    save();
  });

  // Done toggles
  if (prosDoneEl) {
    prosDoneEl.addEventListener("change", () => {
      state.prosLocked = !!prosDoneEl.checked;
      save(); renderAll();
    });
  }
  if (consDoneEl) {
    consDoneEl.addEventListener("change", () => {
      state.consLocked = !!consDoneEl.checked;
      save(); renderAll();
    });
  }

  // Add pro
  byId("addProBtn").addEventListener("click", () => {
    addItem("pro", byId("proText").value, byId("proScore").value);
    byId("proText").value = "";
    byId("proText").focus();
  });
  byId("proText").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); byId("addProBtn").click(); }
  });

  // Add con
  byId("addConBtn").addEventListener("click", () => {
    addItem("con", byId("conText").value, byId("conScore").value);
    byId("conText").value = "";
    byId("conText").focus();
  });
  byId("conText").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); byId("addConBtn").click(); }
  });

  // Recommend
  byId("recommendBtn").addEventListener("click", recommend);

  // Share
  byId("shareBtn").addEventListener("click", async () => {
    const link = encodeStateToUrl();
    try { await navigator.clipboard.writeText(link); toast("Link copied! Share it with a friend."); }
    catch { prompt("Copy this link to share your decision:", link); }
  });

  // Reset
  byId("clearAllBtn").addEventListener("click", () => {
    if (confirm("Clear the topic and all items?")) resetAll();
  });
}

// ----- Init -----
tryLoadFromUrl();
load();
wire();
renderAll();
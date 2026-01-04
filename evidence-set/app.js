const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

const STORAGE_KEY = "btg_evidence_set_v1";
const HELP_SEEN_KEY = "btg_evidence_set_help_seen_v1";

/* -----------------------------
   PWA INSTALL (Add to Home Screen)
   ----------------------------- */
let deferredInstallPrompt = null;

function setupInstallUI(){
  const btn = $("#btnInstall");
  if (!btn) return;

  window.addEventListener("beforeinstallprompt", (e) => {
    // prevent mini-infobar
    e.preventDefault();
    deferredInstallPrompt = e;
    btn.hidden = false;
  });

  btn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    btn.disabled = true;
    deferredInstallPrompt.prompt();
    try { await deferredInstallPrompt.userChoice; } catch {}
    deferredInstallPrompt = null;
    btn.hidden = true;
    btn.disabled = false;
  });

  // If already installed, hide the button
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    btn.hidden = true;
  });
}

function registerServiceWorker(){
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

const Clues = [
  { id: "FP", name: "Footprint", icon: "👣", tint: "#38bdf8" },
  { id: "FG", name: "Fiber",     icon: "🧵", tint: "#a78bfa" },
  { id: "GL", name: "Glass",     icon: "🧩", tint: "#e5e7eb" },
  { id: "AS", name: "Ash",       icon: "🔥", tint: "#fb7185" },
  { id: "IN", name: "Ink",       icon: "✒️", tint: "#60a5fa" },
  { id: "KE", name: "Key",       icon: "🗝️", tint: "#fbbf24" },
  { id: "CO", name: "Coin",      icon: "🪙", tint: "#f59e0b" },
  { id: "PH", name: "Photo",     icon: "📷", tint: "#34d399" },
];

const CaseTitles = [
  "The Missing Evidence Set",
  "The Binder That Lied",
  "The Unfiled Clues",
  "The Cabinet of Mistakes",
  "The Quiet Confession",
  "The Ledger of Proof",
];

const WrenLines = {
  start: [
    "“There’s a specific set of evidence that fits this case. Find it.”",
    "“Build your set carefully. The board doesn’t lie — people do.”",
    "“Order matters. The right clues in the wrong slots still mislead.”",
  ],
  win: [
    "“That’s the set. Clean, complete, undeniable. Case closed.”",
    "“Perfect. The evidence fits like a key in a lock.”",
    "“You pinned it down. Now we can name names.”",
  ],
  lose: [
    "“No more attempts. We’ll reopen the file when we’ve got more.”",
    "“The trail’s cold. The set stays hidden… for now.”",
    "“We ran out of room to breathe. Pack it up.”",
  ],
  reveal: [
    "“You want the file? Fine. Here’s the evidence set.”",
    "“Confession time. This is what you were chasing.”",
    "“Alright. You’ll learn more from the truth than the guess.”",
  ],
  hint: [
    "“Move one clue at a time. Patterns show themselves.”",
    "“Exact marks are gold. Lock those slots first.”",
    "“Duplicates change everything. Decide the rules before you chase.”",
  ]
};

const State = {
  setSize: 4,
  attemptsMax: 10,
  dupes: true,
  daily: false,
  secret: [],
  attempt: 0,
  current: [],
  history: [],
  done: false,
  won: false,
};

function randInt(n){ return Math.floor(Math.random() * n); }
function pick(arr){ return arr[randInt(arr.length)]; }
function clueById(id){ return Clues.find(c => c.id === id); }

function todaySeedString(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function mulberry32(seed) {
  let t = seed >>> 0;
  return function() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStringToSeed(str){
  let h = 2166136261;
  for (let i=0; i<str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rngForDaily(){
  const seed = hashStringToSeed("BTG_EVIDENCE_SET_" + todaySeedString());
  return mulberry32(seed);
}

function setSpeech(text){ $("#speechText").textContent = text; }
function setStatus(text){ $("#status").textContent = text; }

function updateMeta(){
  $("#pillAttempts").textContent = `${State.attemptsMax} tries`;
  $("#pillCode").textContent = `${State.setSize} clues`;
  $("#pillDupes").textContent = `duplicates: ${State.dupes ? "ON" : "OFF"}`;
  $("#boardMeta").textContent = State.done
    ? (State.won ? `Solved in ${State.attempt} / ${State.attemptsMax}` : `Case failed (${State.attemptsMax} tries)`)
    : `Attempt ${State.attempt + 1} of ${State.attemptsMax}`;
  $("#caseBadge").textContent = State.daily ? "DAILY CASE" : "CASE FILE";
}

/* Help panel */
function setHelpVisible(visible){
  const panel = $("#howToPanel");
  const btn = $("#btnHelp");
  if (!panel || !btn) return;
  panel.hidden = !visible;
  btn.setAttribute("aria-expanded", String(visible));
  if (!visible){
    try{ localStorage.setItem(HELP_SEEN_KEY, "1"); }catch{}
  }
}
function toggleHelp(){
  const panel = $("#howToPanel");
  if (!panel) return;
  setHelpVisible(panel.hidden);
}

function buildSecret(){
  const rng = State.daily ? rngForDaily() : null;
  const pickIndex = (n) => rng ? Math.floor(rng() * n) : randInt(n);

  const ids = Clues.map(c => c.id);
  const secret = [];

  if (State.dupes){
    for (let i=0;i<State.setSize;i++) secret.push(ids[pickIndex(ids.length)]);
  } else {
    const pool = ids.slice();
    for (let i=0;i<State.setSize;i++){
      const idx = pickIndex(pool.length);
      secret.push(pool.splice(idx,1)[0]);
    }
  }
  return secret;
}

function renderPalette(){
  const pal = $("#palette");
  pal.innerHTML = "";
  Clues.forEach(clue => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "clueBtn";
    b.setAttribute("aria-label", `Add clue: ${clue.name}`);

    const icon = document.createElement("div");
    icon.className = "clueIcon";
    icon.style.background = clue.tint;
    icon.textContent = clue.icon;

    const tag = document.createElement("div");
    tag.className = "clueTag";
    tag.textContent = clue.id;

    b.appendChild(icon);
    b.appendChild(tag);
    b.addEventListener("click", () => addToCurrent(clue.id));
    pal.appendChild(b);
  });
}

function renderCurrentSlots(){
  const wrap = $("#guessSlots");
  wrap.innerHTML = "";
  for (let i=0;i<State.setSize;i++){
    const filled = State.current[i];
    const slot = document.createElement("div");
    slot.className = "slot" + (filled ? "" : " empty");

    const inner = document.createElement("div");
    inner.className = "slotInner";

    if (filled){
      const c = clueById(filled);
      inner.style.background = c.tint;
      inner.textContent = c.icon;
      slot.title = "Tap to remove this slot";
      slot.addEventListener("click", () => {
        if (State.done) return;
        State.current.splice(i,1);
        renderCurrentSlots();
        updateSubmitEnabled();
        save();
      });
    }

    slot.appendChild(inner);
    wrap.appendChild(slot);
  }
}

function shuffleInPlace(arr){
  for (let i=arr.length-1; i>0; i--){
    const j = Math.floor(Math.random() * (i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function scoreAttempt(guess, secret){
  let correct = 0;
  const secretCounts = new Map();
  const guessCounts = new Map();

  for (let i=0;i<secret.length;i++){
    if (guess[i] === secret[i]) correct++;
    else {
      secretCounts.set(secret[i], (secretCounts.get(secret[i])||0) + 1);
      guessCounts.set(guess[i], (guessCounts.get(guess[i])||0) + 1);
    }
  }

  let partial = 0;
  for (const [id, gc] of guessCounts.entries()){
    partial += Math.min(gc, secretCounts.get(id) || 0);
  }

  const marks = [];
  for (let i=0;i<correct;i++) marks.push("C");
  for (let i=0;i<partial;i++) marks.push("P");
  shuffleInPlace(marks);

  return { correct, partial, marks };
}

function renderBoard(){
  const board = $("#board");
  board.innerHTML = "";

  State.history.forEach(h => {
    const row = document.createElement("div");
    row.className = "row";

    const left = document.createElement("div");
    left.className = "rowLeft";

    h.guess.forEach(id => {
      const c = clueById(id);
      const cell = document.createElement("div");
      cell.className = "slot";
      const inner = document.createElement("div");
      inner.className = "slotInner";
      inner.style.background = c.tint;
      inner.textContent = c.icon;
      cell.appendChild(inner);
      left.appendChild(cell);
    });

    const right = document.createElement("div");
    right.className = "rowRight";
    h.marks.forEach(m => {
      const dot = document.createElement("div");
      dot.className = "mark " + (m === "C" ? "correct" : "partial");
      right.appendChild(dot);
    });

    for (let i=h.marks.length; i<State.setSize; i++){
      const dot = document.createElement("div");
      dot.className = "mark";
      right.appendChild(dot);
    }

    row.appendChild(left);
    row.appendChild(right);
    board.appendChild(row);
  });
}

function updateSubmitEnabled(){
  $("#btnSubmit").disabled = (State.done || State.current.length !== State.setSize);
}

function addToCurrent(id){
  if (State.done) return;
  if (State.current.length >= State.setSize) return;
  State.current.push(id);
  renderCurrentSlots();
  updateSubmitEnabled();
  save();
}

function clearCurrent(){
  if (State.done) return;
  State.current = [];
  renderCurrentSlots();
  updateSubmitEnabled();
  save();
}

function undoCurrent(){
  if (State.done) return;
  State.current.pop();
  renderCurrentSlots();
  updateSubmitEnabled();
  save();
}

function formatSecret(secret){
  return secret.map(id => {
    const c = clueById(id);
    return c ? `${c.icon}(${c.id})` : id;
  }).join("  ");
}

function endCase(won){
  State.done = true;
  State.won = won;
  $("#endRow").hidden = false;

  if (won){
    setSpeech(pick(WrenLines.win));
    setStatus("Case closed. You found the correct evidence set.");
  } else {
    setSpeech(pick(WrenLines.lose));
    setStatus("No more attempts. The correct set remains undiscovered.");
  }

  updateMeta();
  updateSubmitEnabled();
  save();
}

function submit(){
  if (State.done) return;
  if (State.current.length !== State.setSize) return;

  const guess = State.current.slice();
  const fb = scoreAttempt(guess, State.secret);

  State.history.push({ guess, feedback: { correct: fb.correct, partial: fb.partial }, marks: fb.marks });
  State.attempt++;
  State.current = [];

  renderBoard();
  renderCurrentSlots();
  updateMeta();
  updateSubmitEnabled();

  if (fb.correct === State.setSize) endCase(true);
  else if (State.attempt >= State.attemptsMax) endCase(false);
  else setStatus(`Logged: ${fb.correct} exact slot(s), ${fb.partial} right clue(s) in wrong slot.`);

  save();
}

function reveal(){
  if (State.done) return;
  State.done = true;
  State.won = false;
  $("#endRow").hidden = false;
  setSpeech(pick(WrenLines.reveal));
  setStatus(`REVEALED SET: ${formatSecret(State.secret)} (case ended)`);
  updateMeta();
  updateSubmitEnabled();
  save();
}

function hint(){
  if (State.done) return;
  setSpeech(pick(WrenLines.hint));
}

function applySettingsUI(){
  $$(".segBtn[data-len]").forEach(b => b.classList.toggle("active", Number(b.dataset.len) === State.setSize));
  $$(".segBtn[data-attempts]").forEach(b => b.classList.toggle("active", Number(b.dataset.attempts) === State.attemptsMax));

  $("#toggleDupes").setAttribute("aria-pressed", String(State.dupes));
  $("#toggleDupesText").textContent = State.dupes ? "ON" : "OFF";

  $("#toggleDaily").setAttribute("aria-pressed", String(State.daily));
  $("#toggleDailyText").textContent = State.daily ? "ON" : "OFF";

  updateMeta();
}

function newCase(){
  State.secret = buildSecret();
  State.attempt = 0;
  State.current = [];
  State.history = [];
  State.done = false;
  State.won = false;

  $("#endRow").hidden = true;
  $("#caseTitle").textContent = pick(CaseTitles);

  setSpeech(pick(WrenLines.start));
  setStatus("Build your first evidence set.");

  updateMeta();
  renderCurrentSlots();
  renderBoard();
  updateSubmitEnabled();
  save();
}

function toggleDupes(){ State.dupes = !State.dupes; applySettingsUI(); newCase(); }
function toggleDaily(){ State.daily = !State.daily; applySettingsUI(); newCase(); }
function onChangeSetSize(n){ State.setSize = n; applySettingsUI(); newCase(); }
function onChangeAttempts(n){ State.attemptsMax = n; applySettingsUI(); newCase(); }

function copyResult(){
  const lines = [];
  lines.push(`Evidence Set — ${State.won ? "SOLVED" : "FAILED"}`);
  lines.push(`Attempts: ${State.won ? State.attempt : State.attemptsMax}/${State.attemptsMax}`);
  lines.push(`Set size: ${State.setSize} | Dupes: ${State.dupes ? "ON" : "OFF"} | ${State.daily ? "DAILY" : "RANDOM"}`);
  lines.push("");
  State.history.forEach(h => lines.push(`${h.guess.join(" ")}  ${"●".repeat(h.feedback.correct)}${"○".repeat(h.feedback.partial)}`));
  if (!State.won) lines.push(`Answer: ${State.secret.join(" ")} | ${formatSecret(State.secret)}`);

  const text = lines.join("\n");
  (navigator.clipboard?.writeText ? navigator.clipboard.writeText(text) : Promise.reject())
    .then(() => setStatus("Copied result to clipboard."))
    .catch(() => setStatus("Clipboard blocked on this browser/file mode."));
}

function clampInt(v, min, max, fallback){
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function save(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      setSize: State.setSize,
      attemptsMax: State.attemptsMax,
      dupes: State.dupes,
      daily: State.daily,
      secret: State.secret,
      attempt: State.attempt,
      current: State.current,
      history: State.history,
      done: State.done,
      won: State.won,
      day: todaySeedString(),
    }));
  }catch{}
}

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);

    State.setSize = clampInt(data.setSize, 3, 5, 4);
    State.attemptsMax = clampInt(data.attemptsMax, 8, 12, 10);
    State.dupes = !!data.dupes;
    State.daily = !!data.daily;

    const savedDay = data.day || null;
    const nowDay = todaySeedString();
    if (State.daily && savedDay && savedDay !== nowDay) return true;

    State.secret = Array.isArray(data.secret) ? data.secret : [];
    State.attempt = Number.isFinite(data.attempt) ? data.attempt : 0;
    State.current = Array.isArray(data.current) ? data.current : [];
    State.history = Array.isArray(data.history) ? data.history : [];
    State.done = !!data.done;
    State.won = !!data.won;
    return true;
  }catch{
    return false;
  }
}

function boot(){
  renderPalette();
  const hadSave = load();

  // settings
  $$(".segBtn[data-len]").forEach(b => b.addEventListener("click", () => onChangeSetSize(Number(b.dataset.len))));
  $$(".segBtn[data-attempts]").forEach(b => b.addEventListener("click", () => onChangeAttempts(Number(b.dataset.attempts))));
  $("#toggleDupes").addEventListener("click", toggleDupes);
  $("#toggleDaily").addEventListener("click", toggleDaily);

  // actions
  $("#btnUndo").addEventListener("click", undoCurrent);
  $("#btnClear").addEventListener("click", clearCurrent);
  $("#btnSubmit").addEventListener("click", submit);
  $("#btnNewCase").addEventListener("click", newCase);
  $("#btnPlayAgain").addEventListener("click", newCase);
  $("#btnReveal").addEventListener("click", reveal);
  $("#btnHint").addEventListener("click", hint);
  $("#btnCopyResult").addEventListener("click", copyResult);

  // help
  $("#btnHelp").addEventListener("click", toggleHelp);
  $("#btnHideHelp").addEventListener("click", () => setHelpVisible(false));
  $("#btnGotIt").addEventListener("click", () => setHelpVisible(false));

  // first-time help
  let seen = false;
  try{ seen = localStorage.getItem(HELP_SEEN_KEY) === "1"; }catch{}
  setHelpVisible(!seen);

  // install + offline
  setupInstallUI();
  registerServiceWorker();

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !$("#btnSubmit").disabled) submit();
  });

  applySettingsUI();

  const validSecret = Array.isArray(State.secret) && State.secret.length === State.setSize;
  $("#caseTitle").textContent = pick(CaseTitles);

  if (hadSave && validSecret && (State.history.length > 0 || State.attempt > 0 || State.done)){
    setStatus(State.done
      ? (State.won ? "Case closed. (restored)" : `Case failed. Answer was: ${formatSecret(State.secret)} (restored)`)
      : "Investigation restored. Continue your next attempt."
    );
    setSpeech(State.done ? (State.won ? pick(WrenLines.win) : pick(WrenLines.lose)) : pick(WrenLines.start));
    $("#endRow").hidden = !State.done;

    updateMeta();
    renderCurrentSlots();
    renderBoard();
    updateSubmitEnabled();
  } else {
    newCase();
  }
}

boot();


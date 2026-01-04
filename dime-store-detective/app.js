/* Dime Store Detective — split-file build (mobile friendly + PWA-ready) */

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

function urlFor(rel){
  return new URL(rel, window.location.href).toString();
}

/* ================== TOAST ================== */
const toastEl = $("#toast");
const toastText = $("#toastText");
const toastRetry = $("#toastRetry");
let toastTimer = null;

function toast(msg, { retry=false, onRetry=null } = {}){
  toastText.textContent = msg;
  toastRetry.style.display = retry ? "inline-block" : "none";

  if (retry && typeof onRetry === "function"){
    toastRetry.onclick = onRetry;
  } else {
    toastRetry.onclick = null;
  }

  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> toastEl.classList.remove("show"), 2600);
}

/* ================== AUDIO ================== */
const audioBtn = $("#audioBtn");
const music = new Audio(urlFor("audio/2021-09-06_-_Solving_The_Crime_-_David_Fesliyan.mp3"));
music.loop = true;
music.preload = "auto";
music.volume = 0.35;

const AudioState = { enabled:false, unlocked:false };
let audioCtx = null;

function ensureAudioCtx(){
  if (!audioCtx){
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  return audioCtx;
}

async function unlockAudioOnce(){
  if (AudioState.unlocked) return;
  AudioState.unlocked = true;

  // iOS “unlock” trick
  try{
    music.muted = true;
    await music.play();
    music.pause();
    music.currentTime = 0;
  }catch(_){}
  music.muted = false;

  const ctx = ensureAudioCtx();
  if (ctx && ctx.state === "suspended"){
    try{ await ctx.resume(); }catch(_){}
  }
}

function playClick(){
  if (!AudioState.enabled) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(()=>{});

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "square";
  osc.frequency.setValueAtTime(880, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.04);
}

function setAudioUI(){
  audioBtn.textContent = AudioState.enabled ? "🔊 Audio" : "🔇 Audio";
  audioBtn.setAttribute("aria-pressed", String(AudioState.enabled));
}

function startMusicIfEnabled(){
  if (!AudioState.enabled) return;
  music.play().catch(()=>{});
}
function stopMusic(){
  try{ music.pause(); }catch(_){}
}

audioBtn.addEventListener("click", async ()=>{
  await unlockAudioOnce();
  AudioState.enabled = !AudioState.enabled;
  setAudioUI();
  playClick();
  if (AudioState.enabled) startMusicIfEnabled();
  else stopMusic();
});

window.addEventListener("pointerdown", ()=>{ unlockAudioOnce(); }, { once:true, passive:true });
setAudioUI();

/* ================== DETECTIVE SPRITE ================== */
const detImg = new Image();
detImg.src = urlFor("sprites/detective/Detectiveinterrogationsprite.png");
const DET_FRAMES = 4;
const DET_SHEET_W = 1200;
const DET_SHEET_H = 400;
const DET_FRAME_W = DET_SHEET_W / DET_FRAMES;
const DET_FRAME_H = DET_SHEET_H;
const DET_FPS = 6;

const detCanvas = $("#detective");
const detCtx = detCanvas.getContext("2d");
detCanvas.width = DET_FRAME_W;
detCanvas.height = DET_FRAME_H;

let detFrame = 0;
let detLast = 0;

/* ================== MASTER CITY ROSTER ================== */
const suspects = {
  lawson: {
    key:"lawson",
    displayName:"MR LAWSON",
    job:"Corporate Lawyer",
    location:"Riverside Offices, 12th Floor",
    tagline:"Keeps bad numbers looking respectable.",
    idleSrc:"sprites/suspects/mr_lawson_idle.png",
    talkSrc:"sprites/suspects/mr_lawson_talk.png",
    idleFrames:13,
    talkFrames:19,
    scale:1.0,
    defaultAnswers:[
      "I was at home… reading. Alone. No witnesses. Convenient, I know.",
      "The victim? I'd seen them around the office. That's it. We weren't… close.",
      "My prints? I handled the briefcase once. Weeks ago. If they’re still there, that’s your forensics department, not me."
    ]
  },
  zoe: {
    key:"zoe",
    displayName:"ZOE",
    job:"Café Owner & Barista",
    location:"Ground-Floor Café, Tower Lobby",
    tagline:"Knows every coffee order and half the city’s gossip.",
    idleSrc:"sprites/suspects/zoe_idle.png",
    talkSrc:"sprites/suspects/zoe_idle.png",
    idleFrames:8,
    talkFrames:8,
    scale:1.0,
    defaultAnswers:[
      "Last night? I was closing up the café. You can ask anyone on the late shift.",
      "I knew them as a regular. Black coffee, no sugar, always a crossword.",
      "If my prints are there, it’s because I handed them their drink—or wiped the table."
    ]
  },
  lindsay: {
    key:"lindsay",
    displayName:"LINDSAY",
    job:"Gallery Curator",
    location:"Lindsay & Co. Modern Gallery",
    tagline:"Hangs other people’s fortunes on the wall.",
    idleSrc:"sprites/suspects/lindsay_idle.png",
    talkSrc:"sprites/suspects/lindsay_idle.png",
    idleFrames:8,
    talkFrames:8,
    scale:1.0,
    defaultAnswers:[
      "I was working late at the gallery, inventory checks.",
      "We crossed paths at functions. Polite smiles only.",
      "Those fingerprints? The briefcase used to be stored at the gallery. I moved it months ago."
    ]
  },
  carol: {
    key:"carol",
    displayName:"CAROL",
    job:"Records Clerk",
    location:"Municipal Archives, Basement Level",
    tagline:"Guardian of paperwork the city wishes it had lost.",
    idleSrc:"sprites/suspects/carol_idle.png",
    talkSrc:"sprites/suspects/carol_idle.png",
    idleFrames:8,
    talkFrames:8,
    scale:1.0,
    defaultAnswers:[
      "I left the records office at eight, same as always.",
      "We only met when he came begging for old paperwork.",
      "My fingerprints are on half the crates in that building."
    ]
  },
  ben: {
    key:"ben",
    displayName:"BEN",
    job:"Night-Shift Porter",
    location:"Tower Loading Bay",
    tagline:"Moves crates, hears secrets, gets ignored.",
    idleSrc:"sprites/suspects/ben_idle.png",
    talkSrc:"sprites/suspects/ben_idle.png",
    idleFrames:8,
    talkFrames:8,
    scale:1.0,
    defaultAnswers:[
      "Night shift, same as always. Unloaded two crates, trolleyed them to the service lift like I always do.",
      "He was just the name on the manifest.",
      "Those prints? I hauled that crate with both hands."
    ]
  },
  veronica: {
    key:"veronica",
    displayName:"VERONICA",
    job:"Performance Artist",
    location:"Warehouse Studios by the River",
    tagline:"Lives for the spotlight, kills for a headline.",
    idleSrc:"sprites/suspects/veronica_idle.png",
    talkSrc:"sprites/suspects/veronica_idle.png",
    idleFrames:8,
    talkFrames:8,
    scale:1.0,
    defaultAnswers:[
      "I floated between conversations, smiling until my jaw ached.",
      "He backed my show at the last minute when everyone else pulled out.",
      "If my fingerprints are on his drink, it is because he insisted we toast."
    ]
  },
  issac: {
    key:"issac",
    displayName:"ISSAC",
    job:"Electrical Engineer",
    location:"Back-Alley Workshop, Dockside",
    tagline:"Keeps the city’s lights on and its secrets humming.",
    idleSrc:"sprites/suspects/issac_idle.png",
    talkSrc:"sprites/suspects/issac_idle.png",
    idleFrames:8,
    talkFrames:8,
    scale:1.0,
    defaultAnswers:[
      "I was alone here, tuning the generator.",
      "He came to me for advice on his numbers.",
      "My fingerprints cover every tool in this room."
    ]
  },
  darren: {
    key:"darren",
    displayName:"DARREN",
    job:"Bar Owner",
    location:"Darren’s Bar – Alley Off 5th",
    tagline:"Pours drinks, hears confessions, remembers tabs.",
    idleSrc:"sprites/suspects/darren_idle.png",
    talkSrc:"sprites/suspects/darren_idle.png",
    idleFrames:8,
    talkFrames:8,
    scale:1.0,
    defaultAnswers:[
      "Bar was full when the lights dipped.",
      "He drank here sometimes, alone in a corner.",
      "If my prints made it next door, it is because I help Issac drag spare kegs."
    ]
  },
  chris: {
    key:"chris",
    displayName:"CHRIS",
    job:"Beat Cop",
    location:"Precinct 4, River District",
    tagline:"Walks the same streets every night, sees who repeats.",
    idleSrc:"sprites/suspects/chris_idle.png",
    talkSrc:"sprites/suspects/chris_idle.png",
    idleFrames:8,
    talkFrames:8,
    scale:1.0,
    defaultAnswers:[
      "I walked the usual route.",
      "I knew him as 'the man with the briefcase'.",
      "My fingerprints on the workshop door are from earlier that week."
    ]
  },
  peter: {
    key:"peter",
    displayName:"PETER",
    job:"Maintenance Technician",
    location:"City Infrastructure Dept.",
    tagline:"Knows every boiler and back door in the district.",
    idleSrc:"sprites/suspects/peter_idle.png",
    talkSrc:"sprites/suspects/peter_idle.png",
    idleFrames:8,
    talkFrames:8,
    scale:1.0,
    defaultAnswers:[
      "I inspected the generators along the riverwalk.",
      "We met twice; he refused to pay an emergency call-out fee.",
      "If my prints are on that bench, it is because I sat down to smoke."
    ]
  },
  emma: {
    key:"emma",
    displayName:"EMMA",
    job:"Forensic Accountant",
    location:"Small Office Above The Bank",
    tagline:"Makes crooked ledgers look straight—until they crack.",
    idleSrc:"sprites/suspects/emma_idle.png",
    talkSrc:"sprites/suspects/emma_idle.png",
    idleFrames:8,
    talkFrames:8,
    scale:1.0,
    defaultAnswers:[
      "I spent the evening balancing books at home.",
      "He trusted me with his companies because I made the money look clean.",
      "The only reason my prints would be near that bench is if I ever met him there to pass documents."
    ]
  }
};

for (const key in suspects){
  suspects[key].currentAnswers = suspects[key].defaultAnswers.slice();
}

/* ================== WREN SPRITE ================== */
const wrenImg = new Image();
wrenImg.src = urlFor("sprites/suspects/wren_idle.png");
const WREN_FRAMES = 8;
const WREN_SCALE = 1.0;
let wrenFrame = 0;
let wrenLast = 0;

/* ================== RIGHT-SIDE CANVAS ================== */
const susCanvas = $("#suspect");
const susCtx = susCanvas.getContext("2d");
let susMaxW = 0;
let susMaxH = 0;

function loadSpriteImages(){
  for (const key in suspects){
    const s = suspects[key];
    s.idleImg = new Image();
    s.idleImg.src = urlFor(s.idleSrc);
    s.idleImg.onload = updateRightCanvasSize;

    s.talkImg = new Image();
    s.talkImg.src = urlFor(s.talkSrc);
    s.talkImg.onload = updateRightCanvasSize;
  }
  wrenImg.onload = updateRightCanvasSize;
}
loadSpriteImages();

function updateRightCanvasSize(){
  let w=0,h=0;
  for (const key in suspects){
    const s = suspects[key];

    if (s.idleImg.complete && s.idleImg.width){
      const fw = s.idleImg.width / s.idleFrames;
      const fh = s.idleImg.height;
      w = Math.max(w, fw * s.scale);
      h = Math.max(h, fh * s.scale);
    }
    if (s.talkImg.complete && s.talkImg.width){
      const fw = s.talkImg.width / s.talkFrames;
      const fh = s.talkImg.height;
      w = Math.max(w, fw * s.scale);
      h = Math.max(h, fh * s.scale);
    }
  }
  if (wrenImg.complete && wrenImg.width){
    const fw = wrenImg.width / WREN_FRAMES;
    const fh = wrenImg.height;
    w = Math.max(w, fw * WREN_SCALE);
    h = Math.max(h, fh * WREN_SCALE);
  }

  if (w && h){
    susMaxW = w;
    susMaxH = h;
    susCanvas.width = susMaxW;
    susCanvas.height = susMaxH;
  }
}

/* ================== VIEW / STATE ================== */
let viewMode = "suspect";
let currentSuspectKey = "lawson";
const suspectState = { state:"idle", frame:0, last:0 };

/* ================== TEXT & UI ================== */
const speakerLabel = $("#speakerLabel");
const answerEl = $("#answer");
const questionButtons = $$(".question-btn");
const suspectTabsContainer = $("#suspectTabs");

const briefBtn = $("#briefBtn");
const copBtn = $("#copBtn");
const directoryBtn = $("#directoryBtn");

const accuseBtn = $("#accuseBtn");
const nextCaseBtn = $("#nextCaseBtn");
const accuseOverlay = $("#accuseOverlay");
const accuseChoices = $("#accuseChoices");
const cancelAccuse = $("#cancelAccuse");

const directoryOverlay = $("#directoryOverlay");
const directoryClose = $("#directoryClose");
const directoryGrid = $("#directoryGrid");

/* typing */
let typingTimer = null;
let typingText = "";
let typingIndex = 0;
let anyQuestionAsked = false;
let caseClosed = false;

/* ====== CASE LOADER STATE ====== */
const DEFAULT_CASE = {
  id: 0,
  title: "Default Case – Late Office",
  culprit: "lindsay",
  brief:
    "A financier is found dead in his office late at night.\n\n" +
    "• A shattered coffee cup near the desk.\n" +
    "• A briefcase moved from its usual spot.\n" +
    "• Security cameras mysteriously disabled for a 20-minute window.\n\n" +
    "Everyone in this room touched the scene in some way. Your job is to decide whose story doesn’t hold.",
  wrenHint:
    "Look, detective, here’s what bothers me:\n\n" +
    "• The cameras die exactly when the briefcase is moved.\n" +
    "• Lawson’s alibi has no witnesses.\n" +
    "• Zoe and Lindsay both have ‘work’ reasons to be there, but only one of them had control over security.\n\n" +
    "My money? Follow whoever had access to both the gallery storage and the office locks.",
  suspects: ["lawson", "zoe", "lindsay"],
  directory: ["lawson","zoe","lindsay"],
  answers: {},
  successEnding:
    "{culprit} folds as you lay out the contradictions.\n\n" +
    "The camera blackout, the briefcase being moved, and the mismatched alibis all point the same way.\n\n" +
    "You were right. The others walk—for now.",
  failureEnding:
    "You accuse {accused}. They protest, but the circumstantial evidence is enough for an arrest… for the moment.\n\n" +
    "Later, WREN calls. Forensics and access logs quietly clear {accused} — and point back toward {culprit}.\n\n" +
    "You got someone into cuffs, but not the right one. This city’s not done with you."
};

let currentBrief = DEFAULT_CASE.brief;
let currentWrenHint = DEFAULT_CASE.wrenHint;
let culpritKey = DEFAULT_CASE.culprit;
let activeSuspects = DEFAULT_CASE.suspects.slice();
let directoryPeople = DEFAULT_CASE.directory.slice();
let currentSuccessEnding = DEFAULT_CASE.successEnding;
let currentFailureEnding = DEFAULT_CASE.failureEnding;

let currentCaseIndex = 1;
const MAX_CASES = 10;

/* ========== CHARACTERS.JSON LOADER ========== */
async function loadCharactersMeta(){
  try{
    const res = await fetch(urlFor("characters.json"), { cache:"no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = await res.json();
    const chars = data.characters || data;

    for (const key in chars){
      if (!suspects[key]) continue;
      const c = chars[key];
      const s = suspects[key];

      if (c.name)  s.displayName = c.name;
      if (c.role)  s.job = c.role;
      if (c.status) s.status = c.status;
      if (c.arc)   s.arc = c.arc;
      if (Array.isArray(c.links))   s.links = c.links;
      if (Array.isArray(c.motives)) s.motives = c.motives;
    }
    console.log("characters.json loaded");
  }catch(err){
    console.warn("characters.json not loaded, using built-in meta only.", err);
  }
}

/* simple templating for endings */
function formatEnding(template, { culprit, accused }){
  if (!template) return "";
  return template
    .replaceAll("{culprit}", culprit.displayName)
    .replaceAll("{accused}", accused.displayName);
}

/* ================== MAIN LOOP ================== */
function mainLoop(timestamp){
  drawDetective(timestamp);
  drawRightSide(timestamp);
  requestAnimationFrame(mainLoop);
}
requestAnimationFrame(mainLoop);

function drawDetective(t){
  if (!detImg.complete) return;
  if (!detLast) detLast = t;
  if (t - detLast >= 1000 / DET_FPS){
    detFrame = (detFrame + 1) % DET_FRAMES;
    detLast = t;
  }
  detCtx.clearRect(0,0,detCanvas.width,detCanvas.height);
  detCtx.drawImage(
    detImg,
    detFrame * DET_FRAME_W, 0, DET_FRAME_W, DET_FRAME_H,
    0, 0, DET_FRAME_W, DET_FRAME_H
  );
}

/* Draw either suspect or Wren */
function drawRightSide(t){
  if (viewMode === "wren"){
    if (!wrenImg.complete || !wrenImg.width) return;

    if (!wrenLast) wrenLast = t;
    if (t - wrenLast >= 1000 / 8){
      wrenFrame = (wrenFrame + 1) % WREN_FRAMES;
      wrenLast = t;
    }

    const frameW = wrenImg.width / WREN_FRAMES;
    const frameH = wrenImg.height;
    const destW = frameW * WREN_SCALE;
    const destH = frameH * WREN_SCALE;

    const dx = (susCanvas.width - destW) / 2;
    const dy = susCanvas.height - destH;

    susCtx.clearRect(0,0,susCanvas.width,susCanvas.height);
    susCtx.drawImage(
      wrenImg,
      wrenFrame * frameW, 0, frameW, frameH,
      dx, dy, destW, destH
    );
    return;
  }

  const s = suspects[currentSuspectKey];
  const img = suspectState.state === "talk" ? s.talkImg : s.idleImg;
  const frames = suspectState.state === "talk" ? s.talkFrames : s.idleFrames;
  const scale = s.scale;

  if (!img.complete || !img.width) return;

  if (!suspectState.last) suspectState.last = t;
  if (t - suspectState.last >= 1000 / 8){
    suspectState.frame = (suspectState.frame + 1) % frames;
    suspectState.last = t;
  }

  const frameW = img.width / frames;
  const frameH = img.height;
  const destW = frameW * scale;
  const destH = frameH * scale;

  const dx = (susCanvas.width - destW) / 2;
  const dy = susCanvas.height - destH;

  susCtx.clearRect(0,0,susCanvas.width,susCanvas.height);
  susCtx.drawImage(
    img,
    suspectState.frame * frameW, 0, frameW, frameH,
    dx, dy, destW, destH
  );
}

/* ================== INTERACTION ================== */
questionButtons.forEach(btn=>{
  btn.addEventListener("click", async () => {
    if (caseClosed) return;
    const index = parseInt(btn.dataset.index,10);
    if (btn.disabled) return;

    await unlockAudioOnce();
    playClick();

    viewMode = "suspect";
    anyQuestionAsked = true;
    accuseBtn.disabled = false;

    if (!detCanvas.classList.contains("visible")){
      detCanvas.classList.add("visible");
    }

    btn.disabled = true;
    btn.classList.add("used");
    playAnswer(index);
  });
});

function playAnswer(index){
  const s = suspects[currentSuspectKey];
  const arr = s.currentAnswers || s.defaultAnswers || [];
  const text = arr[index] || "…";
  startTyping(text, s.displayName);
}

function startTyping(text, speakerName){
  speakerLabel.textContent = speakerName;

  if (viewMode === "suspect"){
    suspectState.state = "talk";
    suspectState.frame = 0;
    suspectState.last = 0;
  }

  if (typingTimer) clearTimeout(typingTimer);
  typingText = text;
  typingIndex = 0;
  answerEl.textContent = "";
  typeStep();
}

function typeStep(){
  answerEl.textContent = typingText.slice(0, typingIndex);
  typingIndex++;
  if (typingIndex <= typingText.length){
    typingTimer = setTimeout(typeStep, 25);
  } else {
    typingTimer = setTimeout(()=>{
      if (viewMode === "suspect"){
        suspectState.state = "idle";
        suspectState.frame = 0;
      }
    }, 250);
  }
}

/* ====== Question reset & suspect switching ====== */
function resetQuestions(){
  questionButtons.forEach(btn=>{
    btn.disabled = false;
    btn.classList.remove("used");
  });
}

function setCurrentSuspect(key){
  if (!suspects[key]) return;
  currentSuspectKey = key;
  const s = suspects[key];

  viewMode = "suspect";
  speakerLabel.textContent = s.displayName;
  answerEl.textContent = `Interviewing ${s.displayName}. Choose a question.`;

  suspectState.state = "idle";
  suspectState.frame = 0;
  suspectState.last = 0;
}

/* build suspect tabs (hidden right now, but stays correct) */
let suspectTabs = [];
function renderSuspectTabs(){
  suspectTabsContainer.innerHTML = "";
  suspectTabs = [];
  activeSuspects.forEach(key=>{
    const s = suspects[key];
    if (!s) return;

    const btn = document.createElement("button");
    btn.className = "suspect-tab";
    btn.dataset.suspect = key;
    btn.textContent = s.displayName;

    btn.addEventListener("click", async ()=>{
      if (caseClosed) return;
      await unlockAudioOnce();
      playClick();
      if (key !== currentSuspectKey){
        resetQuestions();
        setCurrentSuspect(key);
      }
    });

    suspectTabsContainer.appendChild(btn);
    suspectTabs.push(btn);
  });
}

/* ====== DIRECTORY ====== */
function statusLabelFromCode(code){
  if (!code) return "Status unknown";
  if (code.startsWith("jailed_after_")) return "In custody";
  if (code.startsWith("fled_after_"))   return "Missing / fled";
  if (code === "mastermind")            return "Person of interest";
  if (code === "free")                  return "Active in city";
  return code.replace(/_/g," ");
}

function statusIconFromCode(code){
  if (!code) return "⚪";
  if (code.startsWith("jailed_after_")) return "🔒";
  if (code.startsWith("fled_after_"))   return "✈";
  if (code === "mastermind")            return "🎭";
  if (code === "free")                  return "⚪";
  return "•";
}

function renderDirectory(){
  directoryGrid.innerHTML = "";

  directoryPeople.forEach(key=>{
    const person = suspects[key];
    if (!person) return;

    const card = document.createElement("div");
    card.className = "directory-card";

    const initials = person.displayName
      .split(" ")
      .map(w => w[0])
      .join("")
      .slice(0,3);

    const avatar = document.createElement("div");
    avatar.className = "directory-avatar";
    avatar.textContent = initials;

    const main = document.createElement("div");
    main.className = "directory-main";

    const nameEl = document.createElement("div");
    nameEl.className = "directory-name";
    nameEl.textContent = person.displayName;

    const jobEl = document.createElement("div");
    jobEl.className = "directory-job";
    jobEl.textContent = person.job || "";

    const locEl = document.createElement("div");
    locEl.className = "directory-loc";
    locEl.textContent = person.location || "";

    const tagEl = document.createElement("div");
    tagEl.className = "directory-tagline";
    tagEl.textContent = person.tagline || person.arc || "";

    const statusWrap = document.createElement("div");
    statusWrap.className = "directory-status";

    const statusIcon = document.createElement("span");
    statusIcon.textContent = statusIconFromCode(person.status);

    const statusPill = document.createElement("span");
    statusPill.className = "directory-status-pill";
    statusPill.textContent = statusLabelFromCode(person.status);

    statusWrap.appendChild(statusIcon);
    statusWrap.appendChild(statusPill);

    const footerRow = document.createElement("div");
    footerRow.className = "directory-footer-row";

    const btn = document.createElement("button");
    btn.className = "directory-interview";
    btn.textContent = "Interview";
    btn.type = "button";

    btn.addEventListener("click", async ()=>{
      await unlockAudioOnce();
      playClick();
      directoryOverlay.classList.remove("active");
      directoryOverlay.setAttribute("aria-hidden", "true");
      resetQuestions();
      setCurrentSuspect(key);
    });

    footerRow.appendChild(btn);

    main.appendChild(nameEl);
    if (person.job) main.appendChild(jobEl);
    if (person.location) main.appendChild(locEl);
    if (person.tagline || person.arc) main.appendChild(tagEl);
    main.appendChild(statusWrap);
    main.appendChild(footerRow);

    card.appendChild(avatar);
    card.appendChild(main);

    directoryGrid.appendChild(card);
  });
}

directoryBtn.addEventListener("click", async ()=>{
  await unlockAudioOnce();
  playClick();
  renderDirectory();
  directoryOverlay.classList.add("active");
  directoryOverlay.setAttribute("aria-hidden", "false");
});

directoryClose.addEventListener("click", async ()=>{
  await unlockAudioOnce();
  playClick();
  directoryOverlay.classList.remove("active");
  directoryOverlay.setAttribute("aria-hidden", "true");
});

/* ====== Brief & Wren hint (FAIL-SAFE) ====== */
briefBtn.addEventListener("click", async ()=>{
  if (caseClosed) return;
  await unlockAudioOnce();
  playClick();

  viewMode = "suspect";
  speakerLabel.textContent = "CASE BRIEF";

  const text = (currentBrief && String(currentBrief).trim().length)
    ? currentBrief
    : "Brief unavailable. Case file missing.";

  if (typingTimer) clearTimeout(typingTimer);
  typingText = text;
  typingIndex = 0;
  typeStep();
});

copBtn.addEventListener("click", async ()=>{
  if (caseClosed) return;
  await unlockAudioOnce();
  playClick();

  viewMode = "wren";
  speakerLabel.textContent = "DETECTIVE WREN";

  const text = (currentWrenHint && String(currentWrenHint).trim().length)
    ? currentWrenHint
    : "Wren hint unavailable. Case file missing.";

  if (typingTimer) clearTimeout(typingTimer);
  typingText = text;
  typingIndex = 0;
  typeStep();
});

/* ====== Accuse flow ====== */
accuseBtn.addEventListener("click", async ()=>{
  if (caseClosed) return;
  if (!anyQuestionAsked) return;
  await unlockAudioOnce();
  playClick();
  openAccuseOverlay();
});

function openAccuseOverlay(){
  accuseChoices.innerHTML = "";

  activeSuspects.forEach(key=>{
    const s = suspects[key];
    const b = document.createElement("button");
    b.className = "accuse-btn";
    b.textContent = s.displayName;
    b.type = "button";

    b.addEventListener("click", async ()=>{
      await unlockAudioOnce();
      playClick();
      resolveAccusation(key);
    });

    accuseChoices.appendChild(b);
  });

  accuseOverlay.classList.add("active");
  accuseOverlay.setAttribute("aria-hidden", "false");
}

cancelAccuse.addEventListener("click", async ()=>{
  await unlockAudioOnce();
  playClick();
  accuseOverlay.classList.remove("active");
  accuseOverlay.setAttribute("aria-hidden", "true");
});

function resolveAccusation(key){
  accuseOverlay.classList.remove("active");
  accuseOverlay.setAttribute("aria-hidden", "true");

  caseClosed = true;
  accuseBtn.disabled = true;
  nextCaseBtn.style.display = "inline-block";

  resetQuestions();
  questionButtons.forEach(btn=>btn.disabled = true);

  viewMode = "suspect";

  const accused = suspects[key];
  const culprit = suspects[culpritKey];

  if (key === culpritKey){
    speakerLabel.textContent = "CASE CLOSED";
    answerEl.textContent = formatEnding(currentSuccessEnding || DEFAULT_CASE.successEnding, { culprit, accused });
    toast("Correct accusation.");
  } else {
    speakerLabel.textContent = "CASE PARTIALLY SOLVED";
    answerEl.textContent = formatEnding(currentFailureEnding || DEFAULT_CASE.failureEnding, { culprit, accused });
    toast("Wrong suspect.");
  }
}

/* ====== Next case & loader ====== */
nextCaseBtn.addEventListener("click", async ()=>{
  await unlockAudioOnce();
  playClick();

  currentCaseIndex++;
  if (currentCaseIndex > MAX_CASES) currentCaseIndex = 1;
  loadCase(currentCaseIndex);
});

function applyCaseToSuspects(caseData){
  for (const key in suspects){
    suspects[key].currentAnswers = suspects[key].defaultAnswers.slice();
  }
  if (caseData.answers){
    for (const key in caseData.answers){
      if (suspects[key]){
        suspects[key].currentAnswers = caseData.answers[key];
      }
    }
  }
}

/* Decide who is active in this case */
function inferActiveSuspects(caseData){
  if (Array.isArray(caseData.suspects) && caseData.suspects.length){
    return caseData.suspects.filter(k => suspects[k]);
  }

  const inferred = new Set();

  if (caseData.culprit && suspects[caseData.culprit]) inferred.add(caseData.culprit);

  if (caseData.answers){
    Object.keys(caseData.answers).forEach(k=>{
      if (suspects[k]) inferred.add(k);
    });
  }

  if (!inferred.size){
    DEFAULT_CASE.suspects.forEach(k=>inferred.add(k));
  }

  return Array.from(inferred);
}

/* Decide who appears in the directory */
function inferDirectory(caseData, active){
  if (Array.isArray(caseData.directory) && caseData.directory.length){
    return caseData.directory.filter(k => suspects[k]);
  }
  return active.slice();
}

/* ✅ SAFER CASE LOADER: detects HTML returned instead of JSON */
async function loadCase(index){
  caseClosed = false;
  anyQuestionAsked = false;
  accuseBtn.disabled = true;
  nextCaseBtn.style.display = "none";
  detCanvas.classList.remove("visible");
  resetQuestions();

  const path = `cases/case${index}.json`;
  const url = urlFor(path);

  try{
    speakerLabel.textContent = `CASE ${index}`;
    answerEl.textContent = "Loading case…";

    const res = await fetch(url, { cache:"no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const raw = await res.text();

    const trimmed = raw.trim();
    const looksLikeHtml = trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
    const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");

    if (looksLikeHtml || (!ct.includes("application/json") && !looksJson)){
      throw new Error(`Not JSON (content-type: ${ct || "unknown"})`);
    }

    const data = JSON.parse(raw);

    culpritKey           = data.culprit || DEFAULT_CASE.culprit;
    currentBrief         = data.brief || DEFAULT_CASE.brief;
    currentWrenHint      = data.wrenHint || DEFAULT_CASE.wrenHint;
    currentSuccessEnding = data.successEnding || DEFAULT_CASE.successEnding;
    currentFailureEnding = data.failureEnding || DEFAULT_CASE.failureEnding;

    applyCaseToSuspects(data);
    activeSuspects  = inferActiveSuspects(data);
    directoryPeople = inferDirectory(data, activeSuspects);

    renderSuspectTabs();
    setCurrentSuspect(activeSuspects[0] || "lawson");

    speakerLabel.textContent = `CASE ${data.id || index}`;
    answerEl.textContent = data.title || "New case loaded. Choose a suspect.";

    toast(`Loaded Case ${data.id || index}`);
  }catch(err){
    console.warn("Case load failed:", path, url, err);

    culpritKey           = DEFAULT_CASE.culprit;
    currentBrief         = DEFAULT_CASE.brief;
    currentWrenHint      = DEFAULT_CASE.wrenHint;
    currentSuccessEnding = DEFAULT_CASE.successEnding;
    currentFailureEnding = DEFAULT_CASE.failureEnding;

    applyCaseToSuspects(DEFAULT_CASE);
    activeSuspects  = DEFAULT_CASE.suspects.slice();
    directoryPeople = DEFAULT_CASE.directory.slice();

    renderSuspectTabs();
    setCurrentSuspect(activeSuspects[0]);

    speakerLabel.textContent = `CASE ${index}`;
    answerEl.textContent =
      "Case files couldn’t be loaded.\n\n" +
      "Press BRIEF to continue with the built-in case.";

    toast("Case JSON not found — using default case", {
      retry:true,
      onRetry: ()=> loadCase(index)
    });
  }
}

/* ====== INIT ====== */
(async function init(){
  // Service worker (PWA)
  if ("serviceWorker" in navigator){
    window.addEventListener("load", ()=>{
      navigator.serviceWorker.register(urlFor("sw.js")).catch(()=>{});
    });
  }

  await loadCharactersMeta();

  activeSuspects  = DEFAULT_CASE.suspects.slice();
  directoryPeople = DEFAULT_CASE.directory.slice();

  renderSuspectTabs();
  setCurrentSuspect("lawson");

  loadCase(currentCaseIndex);
})();

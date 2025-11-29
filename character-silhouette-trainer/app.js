/* --------------------------------------------------
   Character Silhouette Trainer – App Logic (FINAL FIXED)
-------------------------------------------------- */

const BASE_URL = "http://localhost:8000/";

/* --------------------------------------------------
   Silhouette List
-------------------------------------------------- */
const BASE_PATH = window.location.pathname.includes("character-silhouette-trainer")
  ? "/character-silhouette-trainer/"
  : "/";

const SILHOUETTES = [
  `${BASE_PATH}silhouettes/1e201c31-9b47-41ed-bba9-18fdf379a4ef.png`,
  `${BASE_PATH}silhouettes/4e5749a4-224b-46d6-9bc1-1df049a35de3.png`,
  `${BASE_PATH}silhouettes/5a506628-4182-44fb-8915-4c3626cd185b.png`,
  `${BASE_PATH}silhouettes/5cd397e5-2525-403f-a22d-d22ec40233e4.png`,
  `${BASE_PATH}silhouettes/6dff4d24-bf8c-4f3b-9dac-03f6e1c62f18.png`,
  `${BASE_PATH}silhouettes/008d12e9-e4db-4ba3-ba0c-0fced0ab0546.png`,
  `${BASE_PATH}silhouettes/9f4afdc0-aaef-4781-b874-32cd4ecc9ab2.png`,
  `${BASE_PATH}silhouettes/12f6ad9b-0caf-465e-a314-84ce6c3b025d.png`,
  `${BASE_PATH}silhouettes/56f537fc-74d2-4430-bbcd-0d578988447b.png`,
  `${BASE_PATH}silhouettes/74bcbf07-a92f-4a1f-935a-83ac82848d02.png`,
  `${BASE_PATH}silhouettes/75f7ac6a-2924-4835-a73a-f3beb1ff5ec7.png`,
  `${BASE_PATH}silhouettes/277b4b17-93e2-44be-92cc-b16360d0f392.png`,
  `${BASE_PATH}silhouettes/632d66a0-6fa4-49c1-9d56-1318164d6813.png`,
  `${BASE_PATH}silhouettes/699d0e09-a9b2-4860-8143-9e7bc7f47c41.png`,
  `${BASE_PATH}silhouettes/914b2431-d601-4f58-a4e5-1d3267fe400f.png`,
  `${BASE_PATH}silhouettes/2050fec5-193f-4a43-9b6b-fe73ac0afa68.png`,
  `${BASE_PATH}silhouettes/4375b79f-a55b-4797-b359-42373033c543.png`,
  `${BASE_PATH}silhouettes/6767e116-c1ee-484d-b46a-04e78d752bc9.png`,
  `${BASE_PATH}silhouettes/7736ec74-fd90-4a22-bb85-f585493171fb.png`,
  `${BASE_PATH}silhouettes/8849c5d3-5154-434e-abc0-60c82f0925e5.png`,
  `${BASE_PATH}silhouettes/8951e788-b047-4880-8ffd-3f657ca036cc.png`,
  `${BASE_PATH}silhouettes/31307554-5140-4864-89a3-5c98ac9feb64.png`,
  `${BASE_PATH}silhouettes/aaef135e-8271-45cc-95fc-bee30d3a242c.png`,
  `${BASE_PATH}silhouettes/acc22e8b-6ab4-455a-a70f-4ba046223fa1.png`,
  `${BASE_PATH}silhouettes/b4b5c195-52fe-447c-9de7-e7ed4f9fa63b.png`,
  `${BASE_PATH}silhouettes/b64e4673-ff3f-49c9-a8f6-f42d515f650d.png`,
  `${BASE_PATH}silhouettes/b0538273-629c-4e8c-a0d8-55aea30923fc.png`,
  `${BASE_PATH}silhouettes/cd9f60d1-9acb-4812-a8cd-b01ae4695277.png`,
  `${BASE_PATH}silhouettes/ChatGPT Image Nov 29, 2025, 04_56_53 AM.png`,
  `${BASE_PATH}silhouettes/ChatGPT Image Nov 29, 2025, 04_57_05 AM.png`,
  `${BASE_PATH}silhouettes/d5df44e0-9d63-404f-a5aa-22d36be7e995.png`,
  `${BASE_PATH}silhouettes/d22c337d-eb31-4cae-86d2-636ccbf9994b.png`,
  `${BASE_PATH}silhouettes/df485fd0-a767-4feb-8309-9bc0433ee79f.png`,
  `${BASE_PATH}silhouettes/e9c8e5c4-2a52-41e1-a1d0-401c0d2aed67.png`,
  `${BASE_PATH}silhouettes/e93fc591-39e2-409d-a39c-fbcb1a4f4b3b.png`,
  `${BASE_PATH}silhouettes/eb31db3b-305c-4f98-a55b-d39e6bfd6431.png`,
  `${BASE_PATH}silhouettes/ed825bc8-0f7d-48b2-898c-6bd85c869863.png`,
  `${BASE_PATH}silhouettes/f3c5378f-9ea5-420f-adc4-a8d2d5c44b80.png`,
  `${BASE_PATH}silhouettes/f90ecf77-9246-4505-9617-a4327af0981e.png`,
  `${BASE_PATH}silhouettes/f994b35b-f2a6-4c38-b356-9c2342d1c22c.png`,
  `${BASE_PATH}silhouettes/facbc7ab-9c67-466e-8fe8-59afb2df7686.png`,
  `${BASE_PATH}silhouettes/ff3072cf-7ce0-4c20-959f-cef8abef5af0.png`
];


/* --------------------------------------------------
   Elements
-------------------------------------------------- */
const imgEl = document.getElementById("silhouette-img");
const warningEl = document.getElementById("no-image-warning");
const timerDisplayEl = document.getElementById("timer-display");
const timerButtons = Array.from(document.querySelectorAll(".timer-btn"));
const newBtn = document.getElementById("new-btn");
const pdfBtn = document.getElementById("pdf-btn");
const themeBtn = document.getElementById("theme-btn");

let currentIndex = -1;
let currentDuration = 0;
let timerInterval = null;
let remainingSeconds = 0;

/* --------------------------------------------------
   Helpers
-------------------------------------------------- */
function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function updateTimerDisplay() {
  timerDisplayEl.textContent = formatTime(remainingSeconds);
}

function getRandomIndex() {
  if (SILHOUETTES.length <= 1) return 0;
  let idx;
  do idx = Math.floor(Math.random() * SILHOUETTES.length);
  while (idx === currentIndex);
  return idx;
}

/* --------------------------------------------------
   Show silhouette (FIXED)
-------------------------------------------------- */
function showRandomSilhouette() {
  if (!SILHOUETTES.length) {
    warningEl.classList.remove("hidden");
    imgEl.style.display = "none";
    return;
  }

  warningEl.classList.add("hidden");
  imgEl.style.display = "block";

  currentIndex = getRandomIndex();
  imgEl.src = BASE_URL + SILHOUETTES[currentIndex];  // ⭐ FIXED - always load from server
  imgEl.alt = "Silhouette " + (currentIndex + 1);
}

/* --------------------------------------------------
   Timer (FIXED so image clears & returns properly)
-------------------------------------------------- */
function clearTimer() {
  if (timerInterval !== null) clearInterval(timerInterval);
  timerInterval = null;
}

function startTimer(seconds) {
  clearTimer();
  currentDuration = seconds;
  remainingSeconds = seconds;
  updateTimerDisplay();
  highlightTimerButton(seconds);

  if (seconds === 0) return;

  timerInterval = setInterval(() => {
    remainingSeconds--;
    updateTimerDisplay();

    if (remainingSeconds <= 0) {
      clearTimer();

      // ⭐ FIX – hide silhouette at end of timer
      imgEl.src = "";
      imgEl.style.display = "none";

      return;
    }
  }, 1000);
}

function highlightTimerButton(seconds) {
  timerButtons.forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.seconds || 0) === seconds);
  });
}

/* --------------------------------------------------
   Theme Switching
-------------------------------------------------- */
let currentTheme = 0;
const MAX_THEMES = 4;

function cycleTheme() {
  currentTheme = (currentTheme + 1) % MAX_THEMES;
  document.body.className = `theme-${currentTheme}`;
}

/* --------------------------------------------------
   PDF WORKSHEET (FIXED PATHS)
-------------------------------------------------- */
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function openWorksheetWindow() {
  if (!SILHOUETTES.length) {
    alert("No silhouettes found.");
    return;
  }

  const toUse = shuffleArray(SILHOUETTES).slice(0, 10);
  const win = window.open("", "_blank");
  if (!win) return;

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Worksheet</title>
<style>
  @page { size: A4; margin: 1.5cm; }
  body { font-family: sans-serif; }
  .grid { display: grid; grid-template-columns: repeat(5,1fr); gap: .4cm; }
  .cell { border:1px solid #000; height:4cm; display:flex; align-items:center; justify-content:center; }
  img { max-width:100%; max-height:100%; }
</style>
</head>
<body>
<h2 style="text-align:center;">Boom Tomato – Silhouette Worksheet</h2>
<p style="text-align:center;">Gesture practice</p>
<div class="grid">
${toUse
  .map((src) => `<div class="cell"><img src="${BASE_URL + src}"></div>`)
  .join("")}
</div>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
}

/* --------------------------------------------------
   Init
-------------------------------------------------- */
function init() {
  if (SILHOUETTES.length) showRandomSilhouette();
  startTimer(0);

  timerButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      const sec = Number(btn.dataset.seconds || 0);
      showRandomSilhouette();
      startTimer(sec);
    })
  );

  newBtn.addEventListener("click", () => {
    showRandomSilhouette();
    if (currentDuration > 0) startTimer(currentDuration);
  });

  pdfBtn.addEventListener("click", openWorksheetWindow);
  themeBtn.addEventListener("click", cycleTheme);
}

document.addEventListener("DOMContentLoaded", init);

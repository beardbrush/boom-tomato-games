/* --------------------------------------------------
   Character Silhouette Trainer – Clean Final App
-------------------------------------------------- */

/* ---------------- Silhouette list ---------------- */

const SILHOUETTES = [
  "silhouettes/56f537fc-74d2-4430-bbcd-0d578988447b.png",
  "silhouettes/74bcbf07-a92f-4a1f-935a-83ac82848d02.png",
  "silhouettes/75f7ac6a-2924-4835-a73a-f3beb1ff5ec7.png",
  "silhouettes/277b4b17-93e2-44be-92cc-b16360d0f392.png",
  "silhouettes/632d66a0-6fa4-49c1-9d56-1318164d6813.png",
  "silhouettes/699d0e09-a9b2-4860-8143-9e7bc7f47c41.png",
  "silhouettes/914b2431-d601-4f58-a4e5-1d3267fe400f.png",
  "silhouettes/2050fec5-193f-4a43-9b6b-fe73ac0afa68.png",
  "silhouettes/4375b79f-a55b-4797-b359-42373033c543.png",
  "silhouettes/6767e116-c1ee-484d-b46a-04e78d752bc9.png",
  "silhouettes/7736ec74-fd90-4a22-bb85-f585493171fb.png",
  "silhouettes/8849c5d3-5154-434e-abc0-60c82f0925e5.png",
  "silhouettes/8951e788-b047-4880-8ffd-3f657ca036cc.png",
  "silhouettes/31307554-5140-4864-89a3-5c98ac9feb64.png",
  "silhouettes/aaef135e-8271-45cc-95fc-bee30d3a242c.png",
  "silhouettes/acc22e8b-6ab4-455a-a70f-4ba046223fa1.png",
  "silhouettes/b4b5c195-52fe-447c-9de7-e7ed4f9fa63b.png",
  "silhouettes/b64e4673-ff3f-49c9-a8f6-f42d515f650d.png",
  "silhouettes/cd9f60d1-9acb-4812-a8cd-b01ae4695277.png",
  "silhouettes/ChatGPT Image Nov 29, 2025, 04_56_53 AM.png",
  "silhouettes/d5df44e0-9d63-404f-a5aa-22d36be7e995.png",
  "silhouettes/d22c337d-eb31-4cae-86d2-636ccbf9994b.png",
  "silhouettes/df485fd0-a767-4feb-8309-9bc0433ee79f.png",
  "silhouettes/e9c8e5c4-2a52-41e1-a1d0-401c0d2aed67.png",
  "silhouettes/e93fc591-39e2-409d-a39c-fbcb1a4f4b3b.png",
  "silhouettes/eb31db3b-305c-4f98-a55b-d39e6bfd6431.png",
  "silhouettes/ed825bc8-0f7d-48b2-898c-6bd85c869863.png",
  "silhouettes/f3c5378f-9ea5-420f-adc4-a8d2d5c44b80.png",
  "silhouettes/f90ecf77-9246-4505-9617-a4327af0981e.png",
  "silhouettes/facbc7ab-9c67-466e-8fe8-59afb2df7686.png",
  "silhouettes/ff3072cf-7ce0-4c20-959f-cef8abef5af0.png",
  "silhouettes/1e201c31-9b47-41ed-bba9-18fdf379a4ef.png",
  "silhouettes/4e5749a4-224b-46d6-9bc1-1df049a35de3.png",
  "silhouettes/5a506628-4182-44fb-8915-4c3626cd185b.png",
  "silhouettes/5cd397e5-2525-403f-a22d-d22ec40233e4.png",
  "silhouettes/6dff4d24-bf8c-4f3b-9dac-03f6e1c62f18.png",
  "silhouettes/9f4afdc0-aaef-4781-b874-32cd4ecc9ab2.png",
  "silhouettes/12f6ad9b-0caf-465e-a314-84ce6c3b025d.png"
];

/* ---------------- DOM elements ---------------- */

const imgEl = document.getElementById("silhouette-img");
const warningEl = document.getElementById("no-image-warning");
const timerDisplayEl = document.getElementById("timer-display");
const timerButtons = Array.from(document.querySelectorAll(".timer-btn"));
const newBtn = document.getElementById("new-btn");
const pdfBtn = document.getElementById("pdf-btn");
const themeBtn = document.getElementById("theme-btn");
const timerHintEl = document.getElementById("timer-hint"); // small hint under buttons
const silhouetteAreaEl = document.querySelector(".silhouette-area");

/* ---------------- State ---------------- */

let currentIndex = -1;
let currentDuration = 0;
let timerInterval = null;
let remainingSeconds = 0;

let currentTheme = 0;
const MAX_THEMES = 4;

/* For image preloading */
const preloadedIndexes = new Set();
const PRELOAD_AHEAD = 6;

/* ---------------- Helpers ---------------- */

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function updateTimerDisplay() {
  timerDisplayEl.textContent = formatTime(remainingSeconds);
}

function getRandomIndex() {
  if (SILHOUETTES.length <= 1) return 0;
  let idx;
  do {
    idx = Math.floor(Math.random() * SILHOUETTES.length);
  } while (idx === currentIndex);
  return idx;
}

/* Preload a handful of silhouettes so they appear instantly */
function preloadSomeSilhouettes(count = PRELOAD_AHEAD) {
  const needed = [];

  while (needed.length < count && needed.length < SILHOUETTES.length) {
    const idx = Math.floor(Math.random() * SILHOUETTES.length);
    if (!preloadedIndexes.has(idx) && idx !== currentIndex) {
      needed.push(idx);
      preloadedIndexes.add(idx);
    }
  }

  needed.forEach((i) => {
    const img = new Image();
    img.src = SILHOUETTES[i];
  });
}

/* ---------------- Show silhouette ---------------- */

function showSilhouetteByIndex(idx) {
  if (!SILHOUETTES.length) {
    warningEl.classList.remove("hidden");
    imgEl.style.display = "none";
    return;
  }

  warningEl.classList.add("hidden");
  imgEl.style.display = "block";

  currentIndex = idx;
  imgEl.src = SILHOUETTES[currentIndex];
  imgEl.alt = "Silhouette " + (currentIndex + 1);

  // Whenever we show a new one, queue up a few more in the background
  preloadSomeSilhouettes();
}

function showRandomSilhouette() {
  const idx = getRandomIndex();
  showSilhouetteByIndex(idx);
}

/* ---------------- Timer ---------------- */

function clearTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startTimer(seconds) {
  clearTimer();
  currentDuration = seconds;
  remainingSeconds = seconds;
  updateTimerDisplay();
  highlightTimerButton(seconds);

  if (timerHintEl) timerHintEl.classList.add("hidden");

  if (seconds === 0) return;

  timerInterval = setInterval(() => {
    remainingSeconds -= 1;
    updateTimerDisplay();

    if (remainingSeconds <= 0) {
      clearTimer();
      remainingSeconds = 0;
      updateTimerDisplay();

      // Hide silhouette and show hint
      imgEl.src = "";
      imgEl.style.display = "none";
      if (timerHintEl) timerHintEl.classList.remove("hidden");
    }
  }, 1000);
}

function highlightTimerButton(seconds) {
  timerButtons.forEach((btn) => {
    const s = Number(btn.dataset.seconds || "0");
    if (s === seconds && seconds > 0) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

/* ---------------- Theme switching ---------------- */

function cycleTheme() {
  currentTheme = (currentTheme + 1) % MAX_THEMES;
  document.body.className = `theme-${currentTheme}`;
}

/* ---------------- Worksheet PDF ---------------- */

function shuffleArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Silhouette Worksheet – Boom Tomato</title>
<style>
  @page { size: A4; margin: 1.5cm; }
  body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    margin: 0;
    padding: 0.5cm;
  }
  h1 {
    font-size: 16px;
    text-align: center;
    margin: 0 0 0.3cm;
  }
  p {
    font-size: 11px;
    text-align: center;
    margin: 0 0 0.5cm;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-auto-rows: 4cm;
    gap: 0.4cm;
  }
  .cell {
    border: 1px solid #222;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.2cm;
  }
  .cell img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
</style>
</head>
<body>
  <h1>Boom Tomato – Silhouette Trainer Worksheet</h1>
  <p>Draw each silhouette quickly, then again with more care. Focus on gesture & proportions.</p>
  <div class="grid">
    ${toUse
      .map(
        (src) => `
      <div class="cell">
        <img src="${src}" alt="Silhouette" />
      </div>`
      )
      .join("")}
  </div>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
  }, 600);
}

/* ---------------- Swipe gestures (mobile) ---------------- */

let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 40; // pixels

function handleTouchStart(e) {
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
}

function handleTouchEnd(e) {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;

  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
    // Horizontal swipe → treat as "New Silhouette"
    doNewSilhouette();
  }
}

/* ---------------- Actions ---------------- */

function doNewSilhouette() {
  showRandomSilhouette();
  if (timerHintEl) timerHintEl.classList.add("hidden");

  if (currentDuration > 0) {
    startTimer(currentDuration);
  }
}

/* ---------------- PWA: service worker registration ---------------- */

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  // Scope will be the /character-silhouette-trainer/ folder
  navigator.serviceWorker
    .register("service-worker.js")
    .catch((err) => console.warn("[SW] registration failed", err));
}

/* ---------------- Init ---------------- */

function init() {
  if (!SILHOUETTES.length) {
    warningEl.classList.remove("hidden");
  } else {
    showRandomSilhouette();
  }

  startTimer(0);
  preloadSomeSilhouettes();

  // Timer buttons
  timerButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const sec = Number(btn.dataset.seconds || "0");
      doNewSilhouette();
      startTimer(sec);
    });
  });

  // New silhouette button
  newBtn.addEventListener("click", doNewSilhouette);

  // Worksheet
  pdfBtn.addEventListener("click", openWorksheetWindow);

  // Theme cycle
  themeBtn.addEventListener("click", cycleTheme);

  // Swipe events (mobile)
  if (silhouetteAreaEl) {
    silhouetteAreaEl.addEventListener("touchstart", handleTouchStart, { passive: true });
    silhouetteAreaEl.addEventListener("touchend", handleTouchEnd, { passive: true });
  }

  // PWA SW
  registerServiceWorker();
}

document.addEventListener("DOMContentLoaded", init);

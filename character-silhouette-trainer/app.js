/* --------------------------------------------------
   Speed Drawing Trainer – Boom Tomato Games
   FINAL STABLE VERSION
-------------------------------------------------- */

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
  "silhouettes/d22c337d-eb31-4cae-86d2-636ccbf9994b.png",
  "silhouettes/d5df44e0-9d63-404f-a5aa-22d36be7e995.png",
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

/* --------------------------------------------------
   Elements
-------------------------------------------------- */
const imgEl = document.getElementById("silhouette-img");
const timerDisplayEl = document.getElementById("timer-display");
const newBtn = document.getElementById("new-btn");
const timerButtons = document.querySelectorAll(".timer-btn");
const pdfBtn = document.getElementById("pdf-btn");

let currentIndex = 0;
let timerInterval = null;
let remainingSeconds = 0;

/* --------------------------------------------------
   Functions
-------------------------------------------------- */

function showSilhouette(index) {
  currentIndex = index;
  imgEl.src = SILHOUETTES[index];
  imgEl.style.display = "block";
}

function showRandomSilhouette() {
  const max = SILHOUETTES.length;
  let newIndex = currentIndex;
  while (newIndex === currentIndex) {
    newIndex = Math.floor(Math.random() * max);
  }
  showSilhouette(newIndex);
}

function clearTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startTimer(sec) {
  clearTimer();
  remainingSeconds = sec;
  updateTimer();

  if (sec === 0) return;

  timerInterval = setInterval(() => {
    remainingSeconds--;
    updateTimer();

    if (remainingSeconds <= 0) {
      clearTimer();
      imgEl.style.display = "none";
    }
  }, 1000);
}

function updateTimer() {
  const m = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const s = String(remainingSeconds % 60).padStart(2, "0");
  timerDisplayEl.textContent = `${m}:${s}`;
}

/* --------------------------------------------------
   PDF
-------------------------------------------------- */

function openWorksheetWindow() {
  const win = window.open("", "_blank");
  win.document.write(`
    <button onclick="window.history.back()" 
      style="position:fixed; top:10px; left:10px; z-index:1000; padding:10px; background:#03504E; color:white; border:none; border-radius:6px;">
      ⬅ Back
    </button>

    <h2 style="text-align:center;">Speed Drawing Trainer – Worksheet</h2>
    <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:10px;">
      ${SILHOUETTES.slice(0, 25).map(src => `<div><img src="${src}" style="width:100%;"></div>`).join("")}
    </div>
  `);
  win.document.close();
}

/* --------------------------------------------------
   Init
-------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  showRandomSilhouette();
  startTimer(0);

  newBtn.addEventListener("click", () => showRandomSilhouette());

  timerButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const sec = Number(btn.dataset.seconds);
      startTimer(sec);
    });
  });

  pdfBtn.addEventListener("click", openWorksheetWindow);
});

/* --------------------------------------------------
   Wedding Seating Puzzle – Final Working Engine
-------------------------------------------------- */

let deferredPrompt = null;
let CURRENT_PUZZLE = null;
let CURRENT_MODE = null;     // "demo" | "full"
let CURRENT_INDEX = 0;       // index within the pack

// Puzzle packs with correct folder paths
const PACKS = {
  demo: [
    "/wedding-seating-puzzle/content/demo/tutorial_01.json"
  ],
  full: [
    "/wedding-seating-puzzle/content/full/puzzle_01.json",
    "/wedding-seating-puzzle/content/full/puzzle_02.json",
    "/wedding-seating-puzzle/content/full/puzzle_03.json"
  ]
};

/* -----------------------------------------
   INSTALL BUTTON
----------------------------------------- */
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById("install-app-btn");
  if (btn) btn.style.display = "inline-block";
});

document.getElementById("install-app-btn")?.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  document.getElementById("install-app-btn").style.display = "none";
});

/* -----------------------------------------
   OFFLINE / UPDATE BANNERS
----------------------------------------- */
function showOffline() {
  const el = document.getElementById("offlineBanner");
  if (el) el.classList.remove("hidden");
}

function hideOffline() {
  const el = document.getElementById("offlineBanner");
  if (el) el.classList.add("hidden");
}

function showUpdateToast() {
  const el = document.getElementById("updateToast");
  if (el) el.classList.remove("hidden");
}

window.addEventListener("online", hideOffline);
window.addEventListener("offline", showOffline);

document.getElementById("btnReload")?.addEventListener("click", () => {
  window.location.reload();
});

/* -----------------------------------------
   SERVICE WORKER
----------------------------------------- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/wedding-seating-puzzle/service-worker.js")
    .then((reg) => {
      console.log("SW registered", reg);

      reg.onupdatefound = () => {
        const newWorker = reg.installing;
        newWorker.onstatechange = () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            showUpdateToast();
          }
        };
      };
    });
}

/* -----------------------------------------
   VIEW HANDLING
----------------------------------------- */
function showView(name) {
  document.querySelectorAll(".view").forEach((v) => {
    v.classList.remove("view-active");
  });
  document
    .querySelector(`.view[data-view="${name}"]`)
    ?.classList.add("view-active");
}

/* -----------------------------------------
   PACK START + LOADING
----------------------------------------- */
function startPack(mode) {
  CURRENT_MODE = mode;
  CURRENT_INDEX = 0;
  loadPuzzleFromPack();
}

function loadPuzzleFromPack() {
  const paths = PACKS[CURRENT_MODE];
  if (!paths || paths.length === 0) return;
  loadPuzzle(paths[CURRENT_INDEX], CURRENT_MODE);
}

/* -----------------------------------------
   BUTTON ACTIONS
----------------------------------------- */
document.getElementById("btnPlayDemo")?.addEventListener("click", () => {
  startPack("demo");
});

document.getElementById("btnPlayFull")?.addEventListener("click", () => {
  startPack("full");
});

document.getElementById("btnBackHome")?.addEventListener("click", () => {
  showView("home");
});

/* -----------------------------------------
   LOAD PUZZLE
----------------------------------------- */
async function loadPuzzle(path, mode) {
  CURRENT_MODE = mode;

  showView("game");
  document.getElementById("progressText").textContent = "Loading…";
  document.getElementById("gameMessage").textContent = "";
  document.getElementById("hintText").textContent = "";
  document.getElementById("mistakeCounter").textContent = "Mistakes: 0";
  document.getElementById("btnNext")?.classList.add("hidden");

  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error("File not found: " + path);

    const puzzle = await res.json();
    CURRENT_PUZZLE = puzzle;

    buildGameUI(puzzle, mode);

    // Hide "Offline" banner when game loads successfully
    hideOffline();

    document.getElementById("progressText").textContent = "";
  } catch (err) {
    console.error("Puzzle load error:", err);
    document.getElementById("progressText").textContent =
      "Error loading puzzle.";
  }
}

/* -----------------------------------------
   BUILD UI
----------------------------------------- */
function buildGameUI(data, mode) {
  document.getElementById("puzzleTitle").textContent = data.title;
  document.getElementById("puzzleSubtitle").textContent = data.description;
  document.getElementById("modeBadge").textContent = mode.toUpperCase();

  /* ---- Clues ---- */
  const clueList = document.getElementById("clueList");
  clueList.innerHTML = "";
  data.clues.forEach((c) => {
    const li = document.createElement("li");
    li.textContent = c;
    clueList.appendChild(li);
  });

  /* ---- Seating ---- */
  const board = document.getElementById("seatingBoard");
  board.innerHTML = "";

  data.tables.forEach((table) => {
    const box = document.createElement("div");
    box.className = "table-box";

    const title = document.createElement("h4");
    title.textContent = table.label;
    box.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "table-grid";

    table.seats.forEach((seatId) => {
      const seat = data.seats.find((s) => s.id === seatId);

      const card = document.createElement("div");
      card.className = "seat-card seat-empty";
      card.dataset.seatId = seatId;

      card.innerHTML = `
        <div class="seat-label">${seat.label}</div>
        <div class="seat-name">Empty</div>
      `;
      grid.appendChild(card);
    });

    box.appendChild(grid);
    board.appendChild(box);
  });

  /* ---- Guests ---- */
  const guests = document.getElementById("guestChips");
  guests.innerHTML = "";

  data.guests.forEach((g) => {
    const chip = document.createElement("div");
    chip.className = "guest-chip";
    chip.textContent = g.name;
    chip.dataset.guestId = g.id;
    chip.draggable = true;

    chip.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("guestId", g.id);
      chip.classList.add("dragging");
    });

    chip.addEventListener("dragend", () => chip.classList.remove("dragging"));
    guests.appendChild(chip);
  });

  /* ---- Drag & Drop ---- */
  document.querySelectorAll(".seat-card").forEach((seat) => {
    seat.addEventListener("dragover", (e) => {
      e.preventDefault();
      seat.classList.add("drop-hover");
    });

    seat.addEventListener("dragleave", () => {
      seat.classList.remove("drop-hover");
    });

    seat.addEventListener("drop", (e) => {
      e.preventDefault();
      seat.classList.remove("drop-hover");

      const guestId = e.dataTransfer.getData("guestId");
      const guest = data.guests.find((g) => g.id === guestId);
      if (!guest) return;

      seat.classList.remove("seat-empty");
      seat.querySelector(".seat-name").textContent = guest.name;

      const chip = document.querySelector(
        `.guest-chip[data-guest-id="${guestId}"]`
      );
      if (chip) chip.remove();
    });
  });

  /* ---- Hint button reset ---- */
  const oldHint = document.getElementById("btnShowHint");
  if (oldHint) {
    const newHint = oldHint.cloneNode(true);
    oldHint.parentNode.replaceChild(newHint, oldHint);

    newHint.addEventListener("click", () => {
      const hint = data.hints[Math.floor(Math.random() * data.hints.length)];
      document.getElementById("hintText").textContent = hint;
    });
  }
}

/* -----------------------------------------
   CHECK SEATING
----------------------------------------- */
document.getElementById("btnCheck")?.addEventListener("click", () => {
  const data = CURRENT_PUZZLE;
  if (!data) return;

  let mistakes = 0;

  Object.entries(data.answer_key).forEach(([guestId, seatId]) => {
    const seat = document.querySelector(
      `.seat-card[data-seat-id="${seatId}"]`
    );
    if (!seat) return;

    const placed = seat.querySelector(".seat-name").textContent;
    const guest = data.guests.find((g) => g.id === guestId);

    if (placed !== guest.name) mistakes++;
  });

  document.getElementById("mistakeCounter").textContent =
    `Mistakes: ${mistakes}`;

  const msg = document.getElementById("gameMessage");

  if (mistakes === 0) {
    msg.textContent = "Perfect! Everyone is seated correctly 🎉";
    document.getElementById("btnNext").classList.remove("hidden");
  } else {
    msg.textContent = `${mistakes} mistakes found. Keep adjusting!`;
  }
});

/* -----------------------------------------
   NEXT PUZZLE
----------------------------------------- */
document.getElementById("btnNext")?.addEventListener("click", () => {
  const paths = PACKS[CURRENT_MODE];

  document.getElementById("btnNext").classList.add("hidden");
  document.getElementById("gameMessage").textContent = "";
  document.getElementById("hintText").textContent = "";

  if (CURRENT_INDEX < paths.length - 1) {
    CURRENT_INDEX++;
    loadPuzzleFromPack();
  } else {
    showView("home");
    document.getElementById("progressText").textContent =
      "Great job! More puzzles coming soon 🎉";
  }
});

/* -----------------------------------------
   RESET
----------------------------------------- */
document.getElementById("btnReset")?.addEventListener("click", () => {
  if (!CURRENT_PUZZLE) return;

  document.getElementById("gameMessage").textContent = "";
  document.getElementById("hintText").textContent = "";
  document.getElementById("mistakeCounter").textContent = "Mistakes: 0";
  document.getElementById("btnNext").classList.add("hidden");

  buildGameUI(CURRENT_PUZZLE, CURRENT_MODE);
});

/* -----------------------------------------
   FOOTER YEAR
----------------------------------------- */
const yearSpan = document.getElementById("yearSpan");
if (yearSpan) yearSpan.textContent = String(new Date().getFullYear());

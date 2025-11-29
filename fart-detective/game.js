document.addEventListener("DOMContentLoaded", () => {
  const ROWS = 5;
  const COLS = 4;
  const TOTAL = ROWS * COLS;
  const MAX_CLUES = 6;

  const gridEl = document.getElementById("grid");
  const cluesLabel = document.getElementById("cluesLabel");
  const guessLabel = document.getElementById("guessLabel");
  const fartBanner = document.getElementById("fartBanner");
  const accuseBtn = document.getElementById("accuseBtn");
  const newRoundBtn = document.getElementById("newRoundBtn");
  const resultPanel = document.getElementById("resultPanel");

  let farterIndex = -1;
  let selectedIndex = null;
  let cluesLeft = MAX_CLUES;
  let roundOver = false;

  // -----------------------------------------------------------
  // RANDOM EMOJI SKIN TONES + HAIR TYPES
  // -----------------------------------------------------------
  const EMOJIS = [
    "🧑🏻","🧑🏼","🧑🏽","🧑🏾","🧑🏿",
    "👩🏻","👩🏼","👩🏽","👩🏾","👩🏿",
    "👨🏻","👨🏼","👨🏽","👨🏾","👨🏿",
    "👩‍🦰","👨‍🦰",
    "👩‍🦱","👨‍🦱",
    "👩‍🦳","👨‍🦳",
    "👩‍🦲","👨‍🦲"
  ];

  // -----------------------------------------------------------
  // RANDOM NAMES
  // -----------------------------------------------------------
  const NAME_LIST = [
    "Alex","Jordan","Taylor","Casey","Riley","Morgan","Charlie",
    "Sam","Jamie","Avery","Harper","Elliot","Rowan","Quinn",
    "Skyler","Dakota","Reese","Phoenix","River","Parker",
    "Leo","Oscar","Ethan","Mason","Lucas","Arlo","Kai",
    "Mia","Sophie","Ella","Lily","Ruby","Zara","Nina"
  ];

  const people = [];

  // -----------------------------------------------------------
  // GRID HELPERS
  // -----------------------------------------------------------
  const indexToRowCol = i => ({
    row: Math.floor(i / COLS),
    col: i % COLS
  });

  const randomInt = max => Math.floor(Math.random() * max);

  function pickFarter() {
    farterIndex = randomInt(TOTAL);
  }

  // -----------------------------------------------------------
  // BUILD GRID
  // -----------------------------------------------------------
  function createGrid() {
    gridEl.innerHTML = "";
    people.length = 0;

    for (let i = 0; i < TOTAL; i++) {
      const card = document.createElement("div");
      card.className = "person";
      card.dataset.index = i;

      const inner = document.createElement("div");
      inner.className = "person-inner";

      const emoji = document.createElement("div");
      emoji.className = "person-emoji";
      emoji.textContent = EMOJIS[randomInt(EMOJIS.length)];

      const label = document.createElement("div");
      label.className = "person-label";
      const name = NAME_LIST[randomInt(NAME_LIST.length)];
      label.textContent = name;

      inner.appendChild(emoji);
      inner.appendChild(label);
      card.appendChild(inner);
      gridEl.appendChild(card);

      card.addEventListener("click", () => onPersonClick(i));

      people.push({
        el: card,
        name: name
      });
    }
  }

  // -----------------------------------------------------------
  // CLEAR ALL ANIMATION CLASSES
  // -----------------------------------------------------------
  function resetClasses() {
    people.forEach(p => {
      p.el.classList.remove(
        "selected","correct","wrong","bounce",
        "horrified","clicked","wiggle-in","idle"
      );
    });
  }

  // -----------------------------------------------------------
  // SELECT A PERSON
  // -----------------------------------------------------------
  function setSelected(index) {
    selectedIndex = index;
    resetClasses();

    if (index !== null && people[index]) {
      const el = people[index].el;
      el.classList.add("selected", "bounce");
      setTimeout(() => el.classList.remove("bounce"), 250);
    }
  }

  function updateClueLabel() {
    cluesLabel.textContent = `Clues left: ${cluesLeft}`;
  }

  // -----------------------------------------------------------
  // ROUND START ANIMATIONS
  // -----------------------------------------------------------
  function applyStartAnimations() {
    // Wiggle in
    people.forEach((p, i) => {
      setTimeout(() => p.el.classList.add("wiggle-in"), i * 40);
    });

    // Idle after wiggle
    setTimeout(() => {
      people.forEach(p => {
        p.el.classList.remove("wiggle-in");
        p.el.classList.add("idle");
      });
    }, 800);

    // Everyone horrified except farter
    setTimeout(() => {
      people.forEach((p, i) => {
        if (i !== farterIndex) {
          p.el.classList.add("horrified");
          setTimeout(() => p.el.classList.remove("horrified"), 350);
        }
      });
    }, 400);
  }

  // -----------------------------------------------------------
  // START ROUND
  // -----------------------------------------------------------
  function startRound() {
    roundOver = false;
    cluesLeft = MAX_CLUES;
    pickFarter();
    resetClasses();
    setSelected(null);
    updateClueLabel();

    fartBanner.classList.remove("hidden");
    resultPanel.classList.add("hidden");

    guessLabel.textContent = "Tap a person for a clue, then pick someone to accuse.";
    accuseBtn.disabled = true;

    applyStartAnimations();
  }

  // -----------------------------------------------------------
  // GET CLUE
  // -----------------------------------------------------------
  function getClueText(speakerIndex) {
    if (speakerIndex === farterIndex) {
      const liarLines = [
        "It definitely wasn’t me. I’m offended you’d even ask.",
        "I’m smelling something from the other side of the lift.",
        "Whoever it was, they’re nowhere near me.",
        "You’re barking up the wrong trouser leg, detective."
      ];
      return liarLines[randomInt(liarLines.length)];
    }

    const s = indexToRowCol(speakerIndex);
    const f = indexToRowCol(farterIndex);

    const rowDiff = f.row - s.row;
    const colDiff = f.col - s.col;

    const vertical = rowDiff < 0 ? "above" : rowDiff > 0 ? "below" : null;
    const horizontal = colDiff < 0 ? "to my left" : colDiff > 0 ? "to my right" : null;

    const distance = Math.max(Math.abs(rowDiff), Math.abs(colDiff));
    const adjacent = distance === 1;

    const lines = [];

    if (adjacent) {
      lines.push("They’re really close to me. I can almost feel the heat…");
    } else if (distance >= 3) {
      lines.push("They’re a fair way from me. I’m not in the danger zone.");
    } else {
      lines.push("We’re somewhere in the same half of the lift.");
    }

    if (vertical && horizontal) {
      lines.push(`I’d say they’re ${vertical} and ${horizontal}.`);
    } else if (vertical) {
      lines.push(`I’m pretty sure they’re ${vertical} me.`);
    } else if (horizontal) {
      lines.push(`I’m getting whiffs from ${horizontal}.`);
    } else {
      lines.push("They’re on the same row as me. The air is… concentrated here.");
    }

    return lines.join(" ");
  }

  // -----------------------------------------------------------
  // PERSON CLICK
  // -----------------------------------------------------------
  function onPersonClick(index) {
    if (roundOver) return;

    setSelected(index);

    people[index].el.classList.add("clicked");
    setTimeout(() => people[index].el.classList.remove("clicked"), 250);

    accuseBtn.disabled = false;

    if (cluesLeft > 0) {
      const clue = getClueText(index);
      guessLabel.textContent = clue;
      cluesLeft -= 1;
      updateClueLabel();
    } else {
      guessLabel.textContent = "No clues left. Make your best guess and hit Accuse.";
    }
  }

  // -----------------------------------------------------------
  // ACCUSE
  // -----------------------------------------------------------
  function doAccuse() {
    if (selectedIndex === null || roundOver) return;

    roundOver = true;
    fartBanner.classList.add("hidden");
    accuseBtn.disabled = true;

    resetClasses();

    const correct = selectedIndex === farterIndex;
    const s = people[selectedIndex];
    const f = people[farterIndex];

    if (correct) {
      s.el.classList.add("correct");
      resultPanel.classList.remove("hidden");
      resultPanel.textContent =
        `✅ Correct! ${f.name} was the farter. Justice (and fresh air) is restored.`;
    } else {
      s.el.classList.add("wrong");
      f.el.classList.add("correct");
      resultPanel.classList.remove("hidden");
      resultPanel.textContent =
        `❌ Not quite. You accused ${s.name}, but ${f.name} was the true trouser trumpet.`;
    }

    guessLabel.textContent = "Tap New Round to play again.";
  }

  accuseBtn.addEventListener("click", doAccuse);
  newRoundBtn.addEventListener("click", startRound);

  // -----------------------------------------------------------
  // INIT
  // -----------------------------------------------------------
  createGrid();
  startRound();
});

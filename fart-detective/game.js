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

  const EMOJIS = [
    "🧑🏻","🧑🏼","🧑🏽","🧑🏾","🧑🏿",
    "👩🏻","👩🏼","👩🏽","👩🏾","👩🏿",
    "👨🏻","👨🏼","👨🏽","👨🏾","👨🏿",
    "👩‍🦰","👨‍🦰",
    "👩‍🦱","👨‍🦱",
    "👩‍🦳","👨‍🦳",
    "👩‍🦲","👨‍🦲"
  ];

  const NAME_LIST = [
    "Alex","Jordan","Taylor","Casey","Riley","Morgan","Charlie",
    "Sam","Jamie","Avery","Harper","Elliot","Rowan","Quinn",
    "Skyler","Dakota","Reese","Phoenix","River","Parker",
    "Leo","Oscar","Ethan","Mason","Lucas","Arlo","Kai",
    "Mia","Sophie","Ella","Lily","Ruby","Zara","Nina"
  ];

  const people = [];

  function indexToRowCol(index) {
    return {
      row: Math.floor(index / COLS),
      col: index % COLS
    };
  }

  function randomInt(max) {
    return Math.floor(Math.random() * max);
  }

  function pickFarter() {
    farterIndex = randomInt(TOTAL);
  }

  // ========================================================
  // CREATE GRID WITH RANDOM NAMES + EMOJIS
  // ========================================================
  function createGrid() {
    gridEl.innerHTML = "";
    people.length = 0;

    for (let i = 0; i < TOTAL; i++) {
      const wrapper = document.createElement("div");
      wrapper.className = "person";
      wrapper.style.setProperty("--i", i);
      wrapper.dataset.index = i;

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
      wrapper.appendChild(inner);
      gridEl.appendChild(wrapper);

      wrapper.addEventListener("click", () => onPersonClick(i));

      people.push({
        el: wrapper,
        name: name
      });
    }
  }

  function resetClasses() {
    people.forEach(p => {
      p.el.classList.remove("selected","correct","wrong","bounce","horrified","clicked","wiggle-in","idle");
    });
  }

  function setSelected(index) {
    selectedIndex = index;
    resetClasses();
    if (index !== null && people[index]) {
      const el = people[index].el;
      el.classList.add("selected","bounce");
      setTimeout(() => el.classList.remove("bounce"),250);
    }
  }

  function updateClueLabel() {
    cluesLabel.textContent = `Clues left: ${cluesLeft}`;
  }

  // ========================================================
  // ROUND START — apply animations
  // ========================================================
  function applyStartAnimations() {
    people.forEach((p, i) => {
      setTimeout(() => p.el.classList.add("wiggle-in"), i * 40);
    });

    setTimeout(() => {
      people.forEach((p,i) => {
        p.el.classList.remove("wiggle-in");
        p.el.classList.add("idle");
      });
    }, 800);

    setTimeout(() => {
      people.forEach((p,i) => {
        if (i !== farterIndex) {
          p.el.classList.add("horrified");
          setTimeout(() => p.el.classList.remove("horrified"), 400);
        }
      });
    }, 400);
  }

  // ========================================================
  // START ROUND
  // ========================================================
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

  // ========================================================
  // CLUE LOGIC
  // ========================================================
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

  // ========================================================
  // PERSON CLICK
  // ========================================================
  function onPersonClick(index) {
    if (roundOver) return;

    setSelected(index);
    people[index].el.classList.add("clicked");
    setTimeout(() => people[index].el.classList.remove("clicked"), 300);

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

  // ========================================================
  // ACCUSE
  // ========================================================
  function doAccuse() {
    if (selectedIndex === null || roundOver) return;

    roundOver = true;
    fartBanner.classList.add("hidden");
    accuseBtn.disabled = true;

    resetClasses();

    const correct = selectedIndex === farterIndex;
    const sel = people[selectedIndex];
    const farter = people[farterIndex];

    if (correct) {
      sel.el.classList.add("correct");
      resultPanel.classList.remove("hidden");
      resultPanel.textContent =
        `✅ Correct! ${farter.name} was the farter. Justice (and fresh air) is restored.`;
    } else {
      sel.el.classList.add("wrong");
      farter.el.classList.add("correct");
      resultPanel.classList.remove("hidden");
      resultPanel.textContent =
        `❌ Not quite. You accused ${sel.name}, but ${farter.name} was the true trouser trumpet.`;
    }

    guessLabel.textContent = "Tap New Round to play again.";
  }

  accuseBtn.addEventListener("click", doAccuse);
  newRoundBtn.addEventListener("click", startRound);

  createGrid();
  startRound();
});

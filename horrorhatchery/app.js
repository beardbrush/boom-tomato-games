// Horror Hatchery – Boom Tomato Games
// Simple HTML clicker/roguelite prototype

"use strict";

/* ----------------------------
   Game configuration
----------------------------- */

const PEN_COUNT = 4;
const MAX_DAYS_PER_RUN = 10;
const GROWTH_PER_CLICK_BASE = 10;
const GROWTH_REQUIRED = 100;

// Demon type templates
const DEMON_TYPES = [
  {
    id: "vampire_thrall",
    name: "Vampire Thrall",
    baseStats: { fear: 4, loyalty: 6, aesthetic: 7, chaos: 3 }
  },
  {
    id: "wolfspawn",
    name: "Wolfspawn",
    baseStats: { fear: 7, loyalty: 3, aesthetic: 4, chaos: 7 }
  },
  {
    id: "tomb_guardian",
    name: "Tomb Guardian",
    baseStats: { fear: 5, loyalty: 7, aesthetic: 3, chaos: 2 }
  }
];

const ALL_TRAITS = [
  "Nocturnal",
  "Silent",
  "Bloodthirsty",
  "Clumsy",
  "Ancient",
  "Slimy",
  "Cute",
  "Frenzied",
  "Obedient",
  "Dusty",
  "Moon-touched",
  "Hypnotic"
];

// Client archetypes
const CLIENT_ARCHETYPES = [
  {
    id: "vampire",
    name: "Count Draculow",
    label: "Vampire Lord",
    preferredTypeId: "vampire_thrall",
    favStat: "aesthetic",
    minFavStat: 6,
    maxChaos: 7,
    favTrait: "Nocturnal"
  },
  {
    id: "werewolf",
    name: "Alpha Ragnor",
    label: "Werewolf Pack Leader",
    preferredTypeId: "wolfspawn",
    favStat: "fear",
    minFavStat: 6,
    maxChaos: 10,
    favTrait: "Moon-touched"
  },
  {
    id: "mummy",
    name: "Lady Ankhesenra",
    label: "Tomb Mistress",
    preferredTypeId: "tomb_guardian",
    favStat: "loyalty",
    minFavStat: 6,
    maxChaos: 6,
    favTrait: "Ancient"
  }
];

// Night events (simple, auto-apply)
const NIGHT_EVENTS = [
  {
    id: "restful_night",
    description:
      "A rare peaceful night. All demons feel strangely refreshed. Growth increases slightly.",
    apply: (state) => {
      state.demons.forEach((d) => {
        if (d) d.growth = Math.min(GROWTH_REQUIRED, d.growth + 15);
      });
      addLog("Night: Restful sleep. All demons gained +15 growth.");
    }
  },
  {
    id: "full_moon",
    description:
      "A full moon bathes the lab. Wolfspawn grow stronger but more unruly.",
    apply: (state) => {
      state.demons.forEach((d) => {
        if (!d) return;
        if (d.typeId === "wolfspawn") {
          d.stats.fear = clamp(d.stats.fear + 1, 0, 10);
          d.stats.loyalty = clamp(d.stats.loyalty - 1, 0, 10);
        }
      });
      addLog(
        "Night: Full moon. Wolfspawn +1 Fear, -1 Loyalty."
      );
    }
  },
  {
    id: "blood_tax",
    description:
      "A mysterious tax collector from the Underworld demands payment.",
    apply: (state) => {
      if (state.coins >= 10) {
        state.coins -= 10;
        addLog("Night: Paid 10 coins to the blood tax collector.");
      } else {
        // Lose a random demon if any
        const indices = state.demons
          .map((d, i) => (d ? i : null))
          .filter((i) => i !== null);
        if (indices.length > 0) {
          const idx =
            indices[Math.floor(Math.random() * indices.length)];
          const lost = state.demons[idx];
          state.demons[idx] = null;
          addLog(
            `Night: Could not pay. A collector claimed your demon in Pen ${idx + 1} (${lost.name}).`
          );
        } else {
          addLog("Night: You had nothing to take. The collector leaves… for now.");
        }
      }
    }
  }
];

// Meta upgrades
const META_UPGRADES = [
  {
    id: "fast_growth",
    name: "Fast Growth",
    description: "+5 growth per pen click.",
    cost: 5
  },
  {
    id: "extra_start_egg",
    name: "Extra Starting Egg",
    description: "Start each run with an extra egg.",
    cost: 5
  },
  {
    id: "lucky_mutations",
    name: "Lucky Mutations",
    description: "Breeding mutations skew slightly positive.",
    cost: 5
  }
];

/* ----------------------------
   Game state
----------------------------- */

const state = {
  day: 1,
  coins: 0,
  soulShards: 0, // persistent
  demons: new Array(PEN_COUNT).fill(null),
  clients: [],
  selectedPenIndex: null,
  parentAIndex: null,
  parentBIndex: null,
  unlocks: {
    fast_growth: false,
    extra_start_egg: false,
    lucky_mutations: false
  }
};

// DOM elements
let dayDisplay,
  coinsDisplay,
  shardsDisplay,
  pensContainer,
  clientsContainer,
  demonDetailsBody,
  parentALabel,
  parentBLabel,
  setParentABtn,
  setParentBBtn,
  breedBtn,
  endDayBtn,
  logMessages,
  eventModal,
  eventDescription,
  eventOkBtn,
  gameoverModal,
  gameoverSummary,
  newRunBtn,
  metaUpgradesContainer;

/* ----------------------------
   Utility functions
----------------------------- */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ----------------------------
   Logging
----------------------------- */

function addLog(message) {
  if (!logMessages) return;
  const div = document.createElement("div");
  div.className = "log-entry";
  const time = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  });
  div.textContent = `[${time}] ${message}`;
  logMessages.prepend(div);
}

/* ----------------------------
   Meta persistence
----------------------------- */

const LOCAL_STORAGE_KEY = "horror_hatchery_meta_v1";

function loadMeta() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return;
    const meta = JSON.parse(raw);
    if (typeof meta.soulShards === "number") {
      state.soulShards = meta.soulShards;
    }
    if (meta.unlocks) {
      state.unlocks = {
        ...state.unlocks,
        ...meta.unlocks
      };
    }
  } catch (e) {
    console.warn("Failed to load meta:", e);
  }
}

function saveMeta() {
  const meta = {
    soulShards: state.soulShards,
    unlocks: state.unlocks
  };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(meta));
}

/* ----------------------------
   Demon creation & breeding
----------------------------- */

let demonIdCounter = 1;

function createRandomEgg() {
  const typeTemplate = randChoice(DEMON_TYPES);
  const name = generateDemonName(typeTemplate);
  const stats = { ...typeTemplate.baseStats };

  // Small random variance
  for (const key of Object.keys(stats)) {
    stats[key] = clamp(stats[key] + randInt(-1, 1), 0, 10);
  }

  const traits = [];
  const traitCount = randInt(1, 2);
  for (let i = 0; i < traitCount; i++) {
    const t = randChoice(ALL_TRAITS);
    if (!traits.includes(t)) traits.push(t);
  }

  return {
    id: demonIdCounter++,
    name,
    typeId: typeTemplate.id,
    typeName: typeTemplate.name,
    stats,
    traits,
    growth: 0,
    stage: "egg" // egg -> growing -> mature
  };
}

function generateDemonName(typeTemplate) {
  const prefixes = ["Glo", "Mor", "Zar", "Lil", "Vor", "Asha", "Dru", "Kel"];
  const suffixes = ["thar", "mire", "shade", "fang", "gloom", "scar", "veil"];
  return (
    randChoice(prefixes) +
    randChoice(suffixes) +
    " " +
    typeTemplate.name.split(" ")[0]
  );
}

function getGrowthPerClick() {
  let growth = GROWTH_PER_CLICK_BASE;
  if (state.unlocks.fast_growth) {
    growth += 5;
  }
  return growth;
}

function growDemon(index) {
  const demon = state.demons[index];
  if (!demon) return;

  demon.growth = clamp(
    demon.growth + getGrowthPerClick(),
    0,
    GROWTH_REQUIRED
  );

  if (demon.growth >= GROWTH_REQUIRED && demon.stage !== "mature") {
    demon.stage = "mature";
    addLog(`Demon ${demon.name} in Pen ${index + 1} has matured.`);
  } else if (demon.growth > 0 && demon.stage === "egg") {
    demon.stage = "growing";
  }
}

function breedParents() {
  const aIdx = state.parentAIndex;
  const bIdx = state.parentBIndex;
  if (aIdx == null || bIdx == null) return;
  if (aIdx === bIdx) return;

  const parentA = state.demons[aIdx];
  const parentB = state.demons[bIdx];
  if (!parentA || !parentB) return;
  if (parentA.stage !== "mature" || parentB.stage !== "mature") return;

  // Find empty pen
  const emptyIndex = state.demons.findIndex((d) => d === null);
  if (emptyIndex === -1) {
    addLog("No empty pen available for breeding.");
    return;
  }

  // Child type: choose one parent's type (we can add hybrids later)
  const typeTemplate =
    randChoice([parentA.typeId, parentB.typeId]) === parentA.typeId
      ? DEMON_TYPES.find((t) => t.id === parentA.typeId)
      : DEMON_TYPES.find((t) => t.id === parentB.typeId);

  const name = generateDemonName(typeTemplate);

  const stats = {
    fear: 0,
    loyalty: 0,
    aesthetic: 0,
    chaos: 0
  };

  for (const key of Object.keys(stats)) {
    const avg = Math.round(
      (parentA.stats[key] + parentB.stats[key]) / 2
    );
    let mutation = randInt(-2, 2);
    if (state.unlocks.lucky_mutations && mutation < 0) {
      // Skew slightly positive
      mutation += 1;
    }
    stats[key] = clamp(avg + mutation, 0, 10);
  }

  const traits = [];
  // Inherit some traits
  const combinedTraits = [
    ...parentA.traits,
    ...parentB.traits
  ];
  while (traits.length < 2 && combinedTraits.length > 0) {
    const t = randChoice(combinedTraits);
    if (!traits.includes(t)) traits.push(t);
  }
  // Chance for a random extra trait
  if (Math.random() < 0.4) {
    const extra = randChoice(ALL_TRAITS);
    if (!traits.includes(extra)) traits.push(extra);
  }

  const child = {
    id: demonIdCounter++,
    name,
    typeId: typeTemplate.id,
    typeName: typeTemplate.name,
    stats,
    traits,
    growth: 0,
    stage: "egg"
  };

  state.demons[emptyIndex] = child;
  addLog(
    `Bred a new ${child.typeName} egg (${child.name}) in Pen ${emptyIndex + 1}.`
  );
}

/* ----------------------------
   Clients / contracts
----------------------------- */

let clientIdCounter = 1;

function generateClient() {
  const arch = randChoice(CLIENT_ARCHETYPES);
  const difficulty = randInt(1, 3); // simple scale

  const minFav = arch.minFavStat + (difficulty - 1); // more difficult → higher requirement
  const maxChaos = arch.maxChaos - (difficulty - 1);

  const wantTrait =
    Math.random() < 0.5 ? arch.favTrait : randChoice(ALL_TRAITS);

  const rewardCoins = 5 + difficulty * 3;
  const rewardShards = difficulty; // 1–3

  return {
    id: clientIdCounter++,
    archetypeId: arch.id,
    name: arch.name,
    label: arch.label,
    preferredTypeId: arch.preferredTypeId,
    favStat: arch.favStat,
    minFavStat: clamp(minFav, 0, 10),
    maxChaos: clamp(maxChaos, 0, 10),
    wantedTrait: wantTrait,
    rewardCoins,
    rewardShards
  };
}

function populateClients() {
  state.clients = [];
  const count = 3;
  for (let i = 0; i < count; i++) {
    state.clients.push(generateClient());
  }
}

function demonFulfilsClient(demon, client) {
  if (!demon || !client) return false;

  // Stage
  if (demon.stage !== "mature") return false;

  // Preferred type bonus – but not required
  const matchesType = demon.typeId === client.preferredTypeId;

  // Stat checks
  const statValue = demon.stats[client.favStat];
  if (statValue < client.minFavStat) return false;
  if (demon.stats.chaos > client.maxChaos) return false;

  // Trait check (soft – if missing trait we still allow, but maybe half reward)
  const hasTrait = demon.traits.includes(client.wantedTrait);

  return {
    matchesType,
    hasTrait
  };
}

function sellDemonToClient(penIndex, clientIndex) {
  const demon = state.demons[penIndex];
  const client = state.clients[clientIndex];
  if (!demon || !client) return;

  const fulfil = demonFulfilsClient(demon, client);
  if (!fulfil) {
    addLog(
      `Client ${client.name} rejects ${demon.name}. Requirements not met.`
    );
    return;
  }

  // Reward calculations
  let coins = client.rewardCoins;
  let shards = client.rewardShards;

  if (!fulfil.matchesType) {
    coins = Math.round(coins * 0.7);
  }
  if (!fulfil.hasTrait) {
    shards = Math.max(1, shards - 1);
  }

  state.coins += coins;
  state.soulShards += shards;

  addLog(
    `Sold ${demon.name} to ${client.name} for ${coins} coins and ${shards} Soul Shard(s).`
  );

  // Remove demon and client
  state.demons[penIndex] = null;
  state.clients.splice(clientIndex, 1);

  // Update meta storage
  saveMeta();
}

/* ----------------------------
   Day / night / run
----------------------------- */

function startNewRun() {
  state.day = 1;
  state.coins = 0;
  state.demons = new Array(PEN_COUNT).fill(null);
  state.clients = [];
  state.selectedPenIndex = null;
  state.parentAIndex = null;
  state.parentBIndex = null;

  loadMeta();

  // Starting eggs
  const startingEggs = state.unlocks.extra_start_egg ? 3 : 2;
  for (let i = 0; i < startingEggs && i < PEN_COUNT; i++) {
    state.demons[i] = createRandomEgg();
  }

  populateClients();
  renderAll();
  addLog("New run started at Horror Hatchery.");
}

function endDay() {
  state.day += 1;

  if (state.day > MAX_DAYS_PER_RUN) {
    showGameOver();
    return;
  }

  // Trigger night event
  triggerNightEvent();

  // Refresh clients
  populateClients();

  renderAll();
}

function triggerNightEvent() {
  const event = randChoice(NIGHT_EVENTS);
  eventDescription.textContent = event.description;
  eventModal.classList.remove("hidden");

  // Apply immediately (simple model)
  event.apply(state);

  renderAll();
}

function closeNightEvent() {
  eventModal.classList.add("hidden");
}

function showGameOver() {
  const summary = `You survived ${MAX_DAYS_PER_RUN} days, earned ${state.coins} coins this run, and now hold a total of ${state.soulShards} Soul Shards.`;
  gameoverSummary.textContent = summary;
  gameoverModal.classList.remove("hidden");
  addLog("Run complete. Check your summary and start again when ready.");
}

function closeGameOverAndRestart() {
  gameoverModal.classList.add("hidden");
  startNewRun();
}

/* ----------------------------
   Meta upgrades
----------------------------- */

function purchaseMetaUpgrade(upgradeId) {
  const upgrade = META_UPGRADES.find((u) => u.id === upgradeId);
  if (!upgrade) return;

  if (state.unlocks[upgradeId]) {
    addLog(`${upgrade.name} is already unlocked.`);
    return;
  }

  if (state.soulShards < upgrade.cost) {
    addLog(`Not enough Soul Shards for ${upgrade.name}.`);
    return;
  }

  state.soulShards -= upgrade.cost;
  state.unlocks[upgradeId] = true;
  saveMeta();
  addLog(`Unlocked meta upgrade: ${upgrade.name}.`);

  renderMetaUpgrades();
  renderTopStats();
}

/* ----------------------------
   Rendering
----------------------------- */

function renderTopStats() {
  dayDisplay.textContent = `Day ${state.day}`;
  coinsDisplay.textContent = `Coins: ${state.coins}`;
  shardsDisplay.textContent = `Soul Shards: ${state.soulShards}`;
}

function renderPens() {
  pensContainer.innerHTML = "";

  state.demons.forEach((demon, idx) => {
    const card = document.createElement("div");
    card.className = "pen-card";
    if (state.selectedPenIndex === idx) {
      card.classList.add("selected");
    }

    card.addEventListener("click", () => {
      state.selectedPenIndex = idx;

      // Grow demon when clicked
      if (demon) {
        growDemon(idx);
      }
      updateBreedingButtons();
      renderAll();
    });

    const title = document.createElement("div");
    title.className = "pen-title";

    if (!demon) {
      title.innerHTML = `<span class="pen-empty">Empty pen</span><span>#${idx + 1}</span>`;
      card.appendChild(title);
      pensContainer.appendChild(card);
      return;
    }

    title.innerHTML = `<span class="pen-type">${demon.typeName}</span><span>#${idx + 1}</span>`;
    card.appendChild(title);

    const stage = document.createElement("div");
    stage.className = "pen-stage";
    stage.textContent = `${demon.name} – ${
      demon.stage.charAt(0).toUpperCase() + demon.stage.slice(1)
    }`;
    card.appendChild(stage);

    const progress = document.createElement("div");
    progress.className = "progress-bar";
    const fill = document.createElement("div");
    fill.className = "progress-fill";
    fill.style.width = `${(demon.growth / GROWTH_REQUIRED) * 100}%`;
    progress.appendChild(fill);
    card.appendChild(progress);

    pensContainer.appendChild(card);
  });
}

function renderSelectedDemonDetails() {
  const idx = state.selectedPenIndex;
  if (idx == null) {
    demonDetailsBody.innerHTML = "<p>No demon selected.</p>";
    return;
  }

  const demon = state.demons[idx];
  if (!demon) {
    demonDetailsBody.innerHTML = `<p>Pen ${idx + 1} is empty.</p>`;
    return;
  }

  const traitsText =
    demon.traits.length > 0 ? demon.traits.join(", ") : "None";

  demonDetailsBody.innerHTML = `
    <p><strong>${demon.name}</strong> (${demon.typeName}) – Stage: ${
    demon.stage
  }</p>
    <div class="details-grid">
      <div>Fear: ${demon.stats.fear}</div>
      <div>Loyalty: ${demon.stats.loyalty}</div>
      <div>Aesthetic: ${demon.stats.aesthetic}</div>
      <div>Chaos: ${demon.stats.chaos}</div>
    </div>
    <p class="traits-list"><strong>Traits:</strong> ${traitsText}</p>
    <p class="panel-caption">Click a client card to try selling this demon to them.</p>
  `;
}

function renderClients() {
  clientsContainer.innerHTML = "";

  if (state.clients.length === 0) {
    const p = document.createElement("p");
    p.textContent =
      "No clients at the moment. End the day to attract more business.";
    clientsContainer.appendChild(p);
    return;
  }

  state.clients.forEach((client, idx) => {
    const card = document.createElement("div");
    card.className = "client-card";

    card.addEventListener("click", () => {
      if (state.selectedPenIndex == null) {
        addLog(
          `Select a demon first, then click a client to attempt a sale.`
        );
        return;
      }
      sellDemonToClient(state.selectedPenIndex, idx);
      updateBreedingButtons();
      renderAll();
    });

    const nameLine = document.createElement("div");
    nameLine.className = "client-name";
    nameLine.textContent = client.name;
    card.appendChild(nameLine);

    const archLine = document.createElement("div");
    archLine.className = "client-archetype";
    archLine.textContent = client.label;
    card.appendChild(archLine);

    const reqLine = document.createElement("div");
    reqLine.className = "client-reqs";
    reqLine.textContent = `Wants strong ${client.favStat} (≥ ${
      client.minFavStat
    }), Chaos ≤ ${client.maxChaos}, trait like "${client.wantedTrait}".`;
    card.appendChild(reqLine);

    const prefTypeLine = document.createElement("div");
    prefTypeLine.className = "client-reqs";
    const typeName =
      DEMON_TYPES.find((t) => t.id === client.preferredTypeId)?.name ||
      "Unknown type";
    prefTypeLine.textContent = `Prefers: ${typeName}`;
    card.appendChild(prefTypeLine);

    const rewardLine = document.createElement("div");
    rewardLine.className = "client-reward";
    rewardLine.textContent = `Reward: ${client.rewardCoins} coins, ${client.rewardShards} shard(s).`;
    card.appendChild(rewardLine);

    clientsContainer.appendChild(card);
  });
}

function renderMetaUpgrades() {
  metaUpgradesContainer.innerHTML = "";

  META_UPGRADES.forEach((u) => {
    const row = document.createElement("div");
    row.className = "meta-upgrade";

    const textWrap = document.createElement("div");
    const nameSpan = document.createElement("span");
    nameSpan.className = "meta-name";
    nameSpan.textContent = u.name;
    const descSpan = document.createElement("span");
    descSpan.textContent = `${u.description} (Cost: ${u.cost} shards)`;

    textWrap.appendChild(nameSpan);
    textWrap.appendChild(descSpan);

    const btn = document.createElement("button");
    btn.textContent = state.unlocks[u.id] ? "Unlocked" : "Unlock";
    btn.disabled = state.unlocks[u.id];

    btn.addEventListener("click", () => {
      purchaseMetaUpgrade(u.id);
    });

    row.appendChild(textWrap);
    row.appendChild(btn);
    metaUpgradesContainer.appendChild(row);
  });
}

function updateBreedingButtons() {
  const hasSelected = state.selectedPenIndex != null;
  setParentABtn.disabled = !hasSelected;
  setParentBBtn.disabled = !hasSelected;

  const canBreed =
    state.parentAIndex != null &&
    state.parentBIndex != null &&
    state.parentAIndex !== state.parentBIndex &&
    state.demons[state.parentAIndex] &&
    state.demons[state.parentBIndex] &&
    state.demons[state.parentAIndex].stage === "mature" &&
    state.demons[state.parentBIndex].stage === "mature" &&
    state.demons.some((d) => d === null);

  breedBtn.disabled = !canBreed;

  parentALabel.textContent =
    state.parentAIndex == null
      ? "None"
      : `Pen ${state.parentAIndex + 1} (${state.demons[state.parentAIndex]?.name || "Empty"})`;

  parentBLabel.textContent =
    state.parentBIndex == null
      ? "None"
      : `Pen ${state.parentBIndex + 1} (${state.demons[state.parentBIndex]?.name || "Empty"})`;
}

function renderAll() {
  renderTopStats();
  renderPens();
  renderSelectedDemonDetails();
  renderClients();
  renderMetaUpgrades();
  updateBreedingButtons();
}

/* ----------------------------
   Event listeners & init
----------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  dayDisplay = document.getElementById("day-display");
  coinsDisplay = document.getElementById("coins-display");
  shardsDisplay = document.getElementById("shards-display");
  pensContainer = document.getElementById("pens-container");
  clientsContainer = document.getElementById("clients-container");
  demonDetailsBody = document.getElementById("demon-details-body");
  parentALabel = document.getElementById("parent-a-label");
  parentBLabel = document.getElementById("parent-b-label");
  setParentABtn = document.getElementById("set-parent-a-btn");
  setParentBBtn = document.getElementById("set-parent-b-btn");
  breedBtn = document.getElementById("breed-btn");
  endDayBtn = document.getElementById("end-day-btn");
  logMessages = document.getElementById("log-messages");
  eventModal = document.getElementById("event-modal");
  eventDescription = document.getElementById("event-description");
  eventOkBtn = document.getElementById("event-ok-btn");
  gameoverModal = document.getElementById("gameover-modal");
  gameoverSummary = document.getElementById("gameover-summary");
  newRunBtn = document.getElementById("new-run-btn");
  metaUpgradesContainer = document.getElementById("meta-upgrades");

  setParentABtn.addEventListener("click", () => {
    if (state.selectedPenIndex == null) return;
    state.parentAIndex = state.selectedPenIndex;
    updateBreedingButtons();
  });

  setParentBBtn.addEventListener("click", () => {
    if (state.selectedPenIndex == null) return;
    state.parentBIndex = state.selectedPenIndex;
    updateBreedingButtons();
  });

  breedBtn.addEventListener("click", () => {
    breedParents();
    renderAll();
  });

  endDayBtn.addEventListener("click", () => {
    endDay();
  });

  eventOkBtn.addEventListener("click", () => {
    closeNightEvent();
  });

  newRunBtn.addEventListener("click", () => {
    closeGameOverAndRestart();
  });

  startNewRun();
});

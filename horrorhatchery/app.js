// Horror Hatchery – Boom Tomato Games
// Simple HTML clicker/roguelite prototype

"use strict";

/* ----------------------------
   Game configuration
----------------------------- */

const PEN_COUNT = 4;
const MAX_DAYS_PER_RUN = 10;

const STARTING_COINS = 40;
const PARENT_COST = 10;
const BREED_COST = 2;

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

// Feed items – cost coins and nudge stats
const FEED_ITEMS = [
  {
    id: "blood_vial",
    name: "Blood Vial",
    shortLabel: "Blood Vial",
    cost: 2,
    description: "Cost: 2 coins. Fear +1, Aesthetic +1, Chaos +1.",
    apply: (stats) => {
      stats.fear = clamp(stats.fear + 1, 0, 10);
      stats.aesthetic = clamp(stats.aesthetic + 1, 0, 10);
      stats.chaos = clamp(stats.chaos + 1, 0, 10);
      return "Fed Blood Vial: Fear +1, Aesthetic +1, Chaos +1.";
    }
  },
  {
    id: "bone_snack",
    name: "Bone Snack",
    shortLabel: "Bone Snack",
    cost: 2,
    description: "Cost: 2 coins. Fear +1, Loyalty +1.",
    apply: (stats) => {
      stats.fear = clamp(stats.fear + 1, 0, 10);
      stats.loyalty = clamp(stats.loyalty + 1, 0, 10);
      return "Fed Bone Snack: Fear +1, Loyalty +1.";
    }
  },
  {
    id: "burial_wraps",
    name: "Burial Wraps",
    shortLabel: "Burial Wraps",
    cost: 2,
    description: "Cost: 2 coins. Loyalty +1, Chaos -1.",
    apply: (stats) => {
      stats.loyalty = clamp(stats.loyalty + 1, 0, 10);
      stats.chaos = clamp(stats.chaos - 1, 0, 10);
      return "Fed Burial Wraps: Loyalty +1, Chaos -1.";
    }
  }
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
        if (d) {
          d.growth = Math.min(GROWTH_REQUIRED, d.growth + 15);
          updateDemonStage(d);
        }
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
      addLog("Night: Full moon. Wolfspawn +1 Fear, -1 Loyalty.");
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
            `Night: Could not pay. A collector claimed your demon in Pen ${idx +
              1} (${lost.name}).`
          );
        } else {
          addLog(
            "Night: You had nothing to take. The collector leaves… for now."
          );
        }
      }
    }
  }
];

// Meta upgrades (rogue-lite)
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
    description: "Start each run with an extra egg (after your first parents).",
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
  soulShards: 0, // persistent between runs
  demons: new Array(PEN_COUNT).fill(null), // pens
  shopDemons: [], // demons you can buy as parents/stock
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
   Demon creation & stages
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
    stage: "egg" // egg -> hatchling -> mature
  };
}

// For shop: we want fully mature demons with same stat system
function createShopDemon() {
  const d = createRandomEgg();
  d.growth = GROWTH_REQUIRED;
  d.stage = "mature";
  return d;
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

// Stage thresholds: 0–29 egg, 30–79 hatchling, 80–100 mature
function updateDemonStage(demon) {
  if (demon.growth >= 80) {
    demon.stage = "mature";
  } else if (demon.growth >= 30) {
    demon.stage = "hatchling";
  } else {
    demon.stage = "egg";
  }
}

function growDemon(index) {
  const demon = state.demons[index];
  if (!demon) return;

  demon.growth = clamp(
    demon.growth + getGrowthPerClick(),
    0,
    GROWTH_REQUIRED
  );

  const wasStage = demon.stage;
  updateDemonStage(demon);

  if (demon.stage === "mature" && wasStage !== "mature") {
    addLog(`Demon ${demon.name} in Pen ${index + 1} has matured.`);
  }
}

function feedDemon(index, itemId) {
  const demon = state.demons[index];
  if (!demon) return;

  if (demon.stage === "egg") {
    addLog("You can't feed an egg. Grow it into a hatchling first.");
    return;
  }

  const item = FEED_ITEMS.find((f) => f.id === itemId);
  if (!item) return;

  if (state.coins < item.cost) {
    addLog(`Not enough coins for ${item.name}.`);
    return;
  }

  state.coins -= item.cost;
  const message = item.apply(demon.stats);
  addLog(`${message} (${demon.name} in Pen ${index + 1}).`);
}

/* ----------------------------
   Shop – buying demons
----------------------------- */

function buyDemonFromShop(shopIndex) {
  const demon = state.shopDemons[shopIndex];
  if (!demon) return;

  if (state.coins < PARENT_COST) {
    addLog("Not enough coins to buy this demon.");
    return;
  }

  const penIndex = state.demons.findIndex((d) => d === null);
  if (penIndex === -1) {
    addLog("No empty pen available. Sell or breed first.");
    return;
  }

  state.coins -= PARENT_COST;
  // Ensure it's fully mature
  demon.growth = GROWTH_REQUIRED;
  demon.stage = "mature";

  state.demons[penIndex] = demon;
  state.shopDemons.splice(shopIndex, 1);

  addLog(
    `Bought ${demon.name} (${demon.typeName}) and placed in Pen ${penIndex +
      1}.`
  );
}

/* ----------------------------
   Breeding
----------------------------- */

function breedParents() {
  const aIdx = state.parentAIndex;
  const bIdx = state.parentBIndex;
  if (aIdx == null || bIdx == null) return;
  if (aIdx === bIdx) return;

  const parentA = state.demons[aIdx];
  const parentB = state.demons[bIdx];
  if (!parentA || !parentB) return;
  if (parentA.stage !== "mature" || parentB.stage !== "mature") {
    addLog("Both parents must be Mature to breed.");
    return;
  }

  const emptyIndex = state.demons.findIndex((d) => d === null);
  if (emptyIndex === -1) {
    addLog("No empty pen available for the egg.");
    return;
  }

  if (state.coins < BREED_COST) {
    addLog(`Breeding costs ${BREED_COST} coins. You don't have enough.`);
    return;
  }

  state.coins -= BREED_COST;

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
      mutation += 1; // skew slightly positive
    }
    stats[key] = clamp(avg + mutation, 0, 10);
  }

  const traits = [];
  const combinedTraits = [...parentA.traits, ...parentB.traits];
  while (traits.length < 2 && combinedTraits.length > 0) {
    const t = randChoice(combinedTraits);
    if (!traits.includes(t)) traits.push(t);
  }
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
    `Bred a new ${child.typeName} egg (${child.name}) in Pen ${emptyIndex +
      1}.`
  );
}

/* ----------------------------
   Clients / contracts
----------------------------- */

let clientIdCounter = 1;

function generateClient() {
  const arch = randChoice(CLIENT_ARCHETYPES);
  const difficulty = randInt(1, 3);

  const minFav = arch.minFavStat + (difficulty - 1);
  const maxChaos = arch.maxChaos - (difficulty - 1);

  const wantTrait =
    Math.random() < 0.5 ? arch.favTrait : randChoice(ALL_TRAITS);

  const rewardCoins = 5 + difficulty * 3;
  const rewardShards = difficulty;

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
  if (demon.stage !== "mature") return false;

  const matchesType = demon.typeId === client.preferredTypeId;

  const statValue = demon.stats[client.favStat];
  if (statValue < client.minFavStat) return false;
  if (demon.stats.chaos > client.maxChaos) return false;

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

  state.demons[penIndex] = null;
  state.clients.splice(clientIndex, 1);

  saveMeta();
}

/* ----------------------------
   Day / night / run
----------------------------- */

function startNewRun() {
  state.day = 1;
  state.coins = STARTING_COINS;
  state.demons = new Array(PEN_COUNT).fill(null);
  state.clients = [];
  state.shopDemons = [];
  state.selectedPenIndex = null;
  state.parentAIndex = null;
  state.parentBIndex = null;

  loadMeta();

  // Generate 10 shop demons (parents/stock)
  for (let i = 0; i < 10; i++) {
    state.shopDemons.push(createShopDemon());
  }

  // Optional: extra egg if unlocked
  if (state.unlocks.extra_start_egg) {
    const egg = createRandomEgg();
    state.demons[0] = egg;
    addLog(
      "Meta upgrade: You start this run with a bonus egg in Pen 1."
    );
  }

  populateClients();
  renderAll();
  addLog("New run started at Horror Hatchery. Buy two parents to begin breeding.");
}

function endDay() {
  state.day += 1;

  if (state.day > MAX_DAYS_PER_RUN) {
    showGameOver(
      "Your hatchery licence expired after 10 days of questionable ethics."
    );
    return;
  }

  // Trigger night event
  triggerNightEvent();

  // Bankruptcy check – if you're out of coins after the night
  if (state.coins <= 0) {
    showGameOver("You ran out of coins and had to close the hatchery.");
    return;
  }

  populateClients();
  renderAll();
}

function triggerNightEvent() {
  const event = randChoice(NIGHT_EVENTS);
  eventDescription.textContent = event.description;
  eventModal.classList.remove("hidden");

  event.apply(state);
  renderAll();
}

function closeNightEvent() {
  eventModal.classList.add("hidden");
}

function showGameOver(reasonText) {
  const summary = `${reasonText}\n\nYou survived ${state.day} day(s), earned ${state.coins} coins this run, and now hold a total of ${state.soulShards} Soul Shards.`;
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
    const niceStage =
      demon.stage.charAt(0).toUpperCase() + demon.stage.slice(1);
    stage.textContent = `${demon.name} – ${niceStage}`;
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

  const niceStage =
    demon.stage.charAt(0).toUpperCase() + demon.stage.slice(1);

  demonDetailsBody.innerHTML = `
    <p><strong>${demon.name}</strong> (${demon.typeName}) – Stage: ${niceStage}</p>
    <div class="details-grid">
      <div>Fear: ${demon.stats.fear}</div>
      <div>Loyalty: ${demon.stats.loyalty}</div>
      <div>Aesthetic: ${demon.stats.aesthetic}</div>
      <div>Chaos: ${demon.stats.chaos}</div>
    </div>
    <p class="traits-list"><strong>Traits:</strong> ${traitsText}</p>
  `;

  const hint = document.createElement("p");
  hint.className = "panel-caption";
  if (demon.stage === "egg") {
    hint.textContent =
      "Tap this pen to grow the egg. At Hatchling stage you can feed it to shape its stats.";
  } else if (demon.stage === "hatchling") {
    hint.textContent =
      "This demon is a Hatchling. Feed it to nudge its stats, then keep growing it to reach Mature.";
  } else {
    hint.textContent =
      "This demon is Mature. Use it as a parent for breeding, or sell it to a client.";
  }
  demonDetailsBody.appendChild(hint);

  if (demon.stage !== "egg") {
    const feedWrapper = document.createElement("div");
    feedWrapper.className = "feed-wrapper";

    const label = document.createElement("p");
    label.className = "panel-caption";
    label.innerHTML = "<strong>Feed items (cost coins):</strong>";
    feedWrapper.appendChild(label);

    const buttonsRow = document.createElement("div");
    buttonsRow.className = "feed-buttons";

    FEED_ITEMS.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "feed-btn";
      btn.textContent = item.shortLabel;
      btn.title = item.description;
      btn.addEventListener("click", () => {
        feedDemon(idx, item.id);
        renderAll();
      });
      buttonsRow.appendChild(btn);
    });

    feedWrapper.appendChild(buttonsRow);
    demonDetailsBody.appendChild(feedWrapper);
  }

  const sellNote = document.createElement("p");
  sellNote.className = "panel-caption";
  sellNote.textContent =
    "When you're happy with a Mature demon, click a client card on the right to try selling it.";
  demonDetailsBody.appendChild(sellNote);
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
          "Select a demon first, then click a client to attempt a sale."
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

  // Shop section – buy parents / extra stock
  if (state.shopDemons.length > 0) {
    const shopTitle = document.createElement("div");
    shopTitle.className = "meta-section-title";
    shopTitle.textContent = "Breeding Stock – Buy Mature Demons";
    metaUpgradesContainer.appendChild(shopTitle);

    state.shopDemons.forEach((demon, idx) => {
      const row = document.createElement("div");
      row.className = "meta-upgrade demon-shop-row";

      const textWrap = document.createElement("div");
      const nameSpan = document.createElement("span");
      nameSpan.className = "meta-name";
      nameSpan.textContent = `${demon.name} (${demon.typeName})`;

      const statsSpan = document.createElement("span");
      statsSpan.textContent = `F:${demon.stats.fear} L:${demon.stats.loyalty} A:${demon.stats.aesthetic} C:${demon.stats.chaos}`;

      textWrap.appendChild(nameSpan);
      textWrap.appendChild(statsSpan);

      const btn = document.createElement("button");
      btn.textContent = `Buy (${PARENT_COST} coins)`;
      const noCoins = state.coins < PARENT_COST;
      const noSpace = !state.demons.some((d) => d === null);
      btn.disabled = noCoins || noSpace;
      btn.addEventListener("click", () => {
        buyDemonFromShop(idx);
        renderAll();
      });

      row.appendChild(textWrap);
      row.appendChild(btn);
      metaUpgradesContainer.appendChild(row);
    });

    const shopHint = document.createElement("p");
    shopHint.className = "panel-caption";
    shopHint.textContent =
      "Tip: Buy at least two Mature demons, set them as Parents A and B, then use Breed Parents to create eggs.";
    metaUpgradesContainer.appendChild(shopHint);
  }

  // Divider
  const divider = document.createElement("div");
  divider.style.margin = "0.5rem 0";
  divider.style.borderTop = "1px solid rgba(255,255,255,0.08)";
  metaUpgradesContainer.appendChild(divider);

  // Meta upgrades
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
    state.demons.some((d) => d === null) &&
    state.coins >= BREED_COST;

  breedBtn.disabled = !canBreed;

  parentALabel.textContent =
    state.parentAIndex == null
      ? "None"
      : `Pen ${state.parentAIndex + 1} (${
          state.demons[state.parentAIndex]?.name || "Empty"
        })`;

  parentBLabel.textContent =
    state.parentBIndex == null
      ? "None"
      : `Pen ${state.parentBIndex + 1} (${
          state.demons[state.parentBIndex]?.name || "Empty"
        })`;
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

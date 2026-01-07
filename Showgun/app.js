/* app.js — SamuraiGames (5 games, shared deck art, zero assets)
   Games:
   1) IAI      - secret pick duel (hand-based)
   2) TRICKS   - trick-taking lite with trump (UPDATED: reveal + tracker)
   3) RELICS   - market + set claiming
   4) SHOWDOWN - poker-lite (draw 5, keep 3)
   5) LANES    - 3-lane placement battle (UPDATED: AI lane reveal on resolve + history tableau)
*/
// Mobile viewport height helper (prevents iOS address-bar jumpiness)
(function(){
  function setVH(){
    document.documentElement.style.setProperty("--vh", (window.innerHeight * 0.01) + "px");
  }
  setVH();
  window.addEventListener("resize", setVH, { passive: true });
})();

const SamuraiGames = (() => {
  const $ = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));
  const SEED_KEY = "samurai_seed";

  /* ---------- utils ---------- */
  function escapeXml(s){
    return String(s).replace(/[<>&'"]/g, c => ({
      "<":"&lt;", ">":"&gt;", "&":"&amp;", "'":"&apos;", '"':"&quot;"
    }[c]));
  }
  function hash32(str){
    let h = 2166136261 >>> 0;
    for(let i=0;i<str.length;i++){
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(seed){
    return function(){
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rng=Math.random){
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(rng()*(i+1));
      [arr[i],arr[j]] = [arr[j],arr[i]];
    }
    return arr;
  }
  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  /* ---------- deck ---------- */
  const CLANS = [
    { key:"BLADE", name:"Blade", icon:"sword", kanji:"刀" },
    { key:"WAGASA", name:"Umbrella", icon:"umbrella", kanji:"傘" },
    { key:"FAN", name:"Fan", icon:"fan", kanji:"扇" },
    { key:"MASK", name:"Mask", icon:"mask", kanji:"鬼" },
  ];

  const RANKS = [
    { r:"2", v:2,  label:"Ashigaru" },
    { r:"3", v:3,  label:"Scout" },
    { r:"4", v:4,  label:"Guard" },
    { r:"5", v:5,  label:"Spearman" },
    { r:"6", v:6,  label:"Archer" },
    { r:"7", v:7,  label:"Ronin" },
    { r:"8", v:8,  label:"Duelist" },
    { r:"9", v:9,  label:"Captain" },
    { r:"10", v:10,label:"Warlord" },
    { r:"J", v:11, label:"Sensei" },
    { r:"Q", v:12, label:"Daimyo" },
    { r:"K", v:13, label:"Shogun" },
    { r:"A", v:14, label:"Legend" },
  ];

  function makeDeck(seedStr){
    const seed = hash32(seedStr);
    const rng = mulberry32(seed);
    const deck = [];
    for(const clan of CLANS){
      for(const rank of RANKS){
        deck.push({
          id: `${rank.r}-${clan.key}`,
          rank: rank.r,
          value: rank.v,
          title: rank.label,
          clanKey: clan.key,
          clanName: clan.name,
          icon: clan.icon,
          kanji: clan.kanji,
        });
      }
    }
    return shuffle(deck, rng);
  }

  /* ---------- card art (SVG) ---------- */
  function iconPath(kind){
    switch(kind){
      case "sword":
        return `
          <g transform="translate(110 165)">
            <path d="M-10 -55 L10 -55 L8 22 L-8 22 Z" fill="rgba(17,24,39,.72)"/>
            <path d="M-12 -55 L0 -84 L12 -55 Z" fill="rgba(17,24,39,.72)"/>
            <rect x="-30" y="22" width="60" height="10" rx="5" fill="rgba(17,24,39,.70)"/>
            <rect x="-6" y="32" width="12" height="34" rx="6" fill="rgba(17,24,39,.58)"/>
            <circle cx="0" cy="22" r="3" fill="rgba(255,255,255,.18)"/>
          </g>`;
      case "umbrella":
        return `
          <g transform="translate(110 165)">
            <path d="M-72 -10 Q0 -84 72 -10 Q0 12 -72 -10 Z" fill="rgba(17,24,39,.68)"/>
            <path d="M-72 -10 Q-48 12 -26 -10 Q-4 12 0 -10 Q4 12 26 -10 Q48 12 72 -10"
                  fill="none" stroke="rgba(255,255,255,.18)" stroke-width="2"/>
            <rect x="-3" y="-10" width="6" height="82" rx="3" fill="rgba(17,24,39,.58)"/>
            <path d="M3 70 q12 0 12 12 q0 12 -12 12" fill="none" stroke="rgba(17,24,39,.58)" stroke-width="6" stroke-linecap="round"/>
          </g>`;
      case "fan":
        return `
          <g transform="translate(110 165)">
            <path d="M0 70 L-74 -12 Q0 -78 74 -12 Z" fill="rgba(17,24,39,.68)"/>
            <path d="M0 70 L0 -68" stroke="rgba(255,255,255,.20)" stroke-width="2"/>
            <path d="M0 70 L-44 -50" stroke="rgba(255,255,255,.18)" stroke-width="2"/>
            <path d="M0 70 L44 -50" stroke="rgba(255,255,255,.18)" stroke-width="2"/>
            <circle cx="0" cy="70" r="7" fill="rgba(17,24,39,.72)"/>
          </g>`;
      case "mask":
        return `
          <g transform="translate(110 165)">
            <path d="M-62 -34 Q0 -86 62 -34 Q56 56 0 78 Q-56 56 -62 -34 Z" fill="rgba(17,24,39,.68)"/>
            <path d="M-26 -12 Q-12 -28 0 -12 Q12 -28 26 -12"
                  fill="none" stroke="rgba(255,255,255,.20)" stroke-width="3" stroke-linecap="round"/>
            <ellipse cx="-18" cy="10" rx="10" ry="12" fill="rgba(255,255,255,.14)"/>
            <ellipse cx="18" cy="10" rx="10" ry="12" fill="rgba(255,255,255,.14)"/>
            <path d="M-16 44 Q0 60 16 44" stroke="rgba(185,28,28,.38)" stroke-width="3" fill="none" stroke-linecap="round"/>
          </g>`;
      default: return "";
    }
  }

  function tornEdgeMaskPath(seedStr){
    const rnd = mulberry32(hash32(seedStr) ^ 0xA5A5A5A5);
    const x=14,y=14,w=192,h=280,r=20;
    const steps = 18;
    const jitter = 2.2;
    const j = () => (-1 + rnd()*2) * jitter;

    let d = `M ${x+r} ${y}`;
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      d += ` L ${(x+r + t*(w-2*r) + j()).toFixed(1)} ${(y + j()).toFixed(1)}`;
    }
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      d += ` L ${(x+w + j()).toFixed(1)} ${(y+r + t*(h-2*r) + j()).toFixed(1)}`;
    }
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      d += ` L ${(x+w-r - t*(w-2*r) + j()).toFixed(1)} ${(y+h + j()).toFixed(1)}`;
    }
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      d += ` L ${(x + j()).toFixed(1)} ${(y+h-r - t*(h-2*r) + j()).toFixed(1)}`;
    }
    d += " Z";
    return d;
  }

  function fiberStrokes(seedStr){
    const rnd = mulberry32(hash32(seedStr) ^ 0x33CCAA11);
    let out = "";
    const n = 28 + Math.floor(rnd()*18);
    for(let i=0;i<n;i++){
      const x1 = 18 + rnd()*184;
      const y1 = 18 + rnd()*272;
      const len = 10 + rnd()*24;
      const ang = rnd()*Math.PI*2;
      const x2 = x1 + Math.cos(ang)*len;
      const y2 = y1 + Math.sin(ang)*len;
      const a = 0.03 + rnd()*0.05;
      out += `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}"
        stroke="rgba(17,24,39,${a.toFixed(3)})" stroke-width="${(0.6 + rnd()*0.9).toFixed(2)}" stroke-linecap="round"/>`;
    }
    return out;
  }

  function makeInkWash(seedStr){
    const rnd = mulberry32(hash32(seedStr));
    const blobs = 3 + Math.floor(rnd()*3);
    let out = "";
    for(let i=0;i<blobs;i++){
      const x = 44 + rnd()*132;
      const y = 70 + rnd()*182;
      const s = 22 + rnd()*34;
      const a = 0.06 + rnd()*0.12;

      const dx1 = (-1 + rnd()*2) * s*0.6;
      const dy1 = (-1 + rnd()*2) * s*0.4;
      const dx2 = (-1 + rnd()*2) * s*0.5;
      const dy2 = (-1 + rnd()*2) * s*0.6;

      out += `
        <path d="
          M ${x} ${y}
          C ${x+dx1} ${y-dy1}, ${x+s} ${y-s*0.2}, ${x+s*0.6} ${y+s*0.2}
          C ${x+s*0.2} ${y+s*0.7}, ${x-dx2} ${y+s*0.4}, ${x-s*0.4} ${y+s*0.1}
          C ${x-s*0.9} ${y-s*0.2}, ${x-dx1} ${y-dy2}, ${x} ${y}
          Z"
          fill="rgba(185,28,28,1)" opacity="${a.toFixed(3)}"/>`;

      if(rnd() < 0.55){
        const dripX = x + (-12 + rnd()*24);
        const dripY = y + s*0.25;
        const dripH = 18 + rnd()*40;
        out += `<rect x="${dripX.toFixed(1)}" y="${dripY.toFixed(1)}" width="${(2 + rnd()*3).toFixed(1)}" height="${dripH.toFixed(1)}" rx="2"
                 fill="rgba(185,28,28,1)" opacity="${(a*0.55).toFixed(3)}"/>`;
      }
    }
    return out;
  }

  function cardSvgDataUri(card, seedStr){
    const key = `${seedStr}|${card.id}`;
    const icon = iconPath(card.icon);
    const ink = makeInkWash(key);
    const torn = tornEdgeMaskPath(key);
    const fibers = fiberStrokes(key);

    const topLeft = `${card.rank} • ${card.title}`;
    const clanLine = `${card.clanName} Clan`;
    const kanji = card.kanji;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="220" height="308" viewBox="0 0 220 308">
        <defs>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="rgba(0,0,0,.35)"/>
          </filter>
          <filter id="paperNoise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" seed="9"/>
            <feColorMatrix type="matrix" values="
              0.9 0   0   0   0.08
              0   0.9 0   0   0.08
              0   0   0.85 0  0.07
              0   0   0   1   0"/>
          </filter>
          <filter id="inkBleed"><feGaussianBlur stdDeviation="0.45"/></filter>
          <filter id="washBlur"><feGaussianBlur stdDeviation="2.8"/></filter>
          <linearGradient id="paperBase" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#f7f3e7"/>
            <stop offset="1" stop-color="#ece6d6"/>
          </linearGradient>
          <mask id="tornMask">
            <rect width="220" height="308" fill="black"/>
            <path d="${torn}" fill="white"/>
          </mask>
        </defs>

        <rect x="10" y="10" width="200" height="288" rx="22"
              fill="url(#paperBase)" stroke="rgba(0,0,0,.18)" stroke-width="2" filter="url(#softShadow)"/>
        <g mask="url(#tornMask)">
          <rect x="12" y="12" width="196" height="284" rx="20" filter="url(#paperNoise)" opacity="0.35"/>
          <rect x="12" y="12" width="196" height="284" rx="20" fill="rgba(255,255,255,.22)" opacity="0.55"/>
          <g opacity="0.72">${fibers}</g>
          <g filter="url(#washBlur)">${ink}</g>
        </g>

        <rect x="22" y="22" width="176" height="264" rx="18"
              fill="rgba(255,255,255,.42)" stroke="rgba(0,0,0,.08)" stroke-width="2"/>

        <text x="110" y="210" text-anchor="middle"
              font-family="system-ui,Segoe UI,Roboto" font-size="160" font-weight="900"
              fill="rgba(17,24,39,.06)">${escapeXml(kanji)}</text>

        <g filter="url(#inkBleed)">
          <text x="36" y="56" font-family="system-ui,Segoe UI,Roboto" font-size="16" font-weight="1000"
                fill="rgba(17,24,39,.88)">${escapeXml(topLeft)}</text>
          <text x="36" y="76" font-family="system-ui,Segoe UI,Roboto" font-size="12" font-weight="900"
                fill="rgba(17,24,39,.60)">${escapeXml(clanLine)}</text>
        </g>

        ${icon}

        <g transform="translate(182 262)">
          <circle cx="0" cy="0" r="22" fill="rgba(185,28,28,.10)" stroke="rgba(185,28,28,.30)" stroke-width="2"/>
          <text x="0" y="7" text-anchor="middle" font-family="system-ui,Segoe UI,Roboto" font-size="20" font-weight="1000"
                fill="rgba(185,28,28,.60)">${escapeXml(card.rank)}</text>
        </g>
      </svg>
    `.trim();

    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function backSvgDataUri(){
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="220" height="308" viewBox="0 0 220 308">
        <defs>
          <filter id="paperNoise">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" stitchTiles="stitch" seed="13"/>
            <feColorMatrix type="matrix" values="
              0.9 0   0   0   0.08
              0   0.9 0   0   0.08
              0   0   0.85 0  0.07
              0   0   0   1   0"/>
          </filter>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="rgba(0,0,0,.35)"/>
          </filter>
          <filter id="brush"><feGaussianBlur stdDeviation="1.7"/></filter>
          <linearGradient id="paperBase" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#f7f3e7"/>
            <stop offset="1" stop-color="#ece6d6"/>
          </linearGradient>
        </defs>

        <rect x="10" y="10" width="200" height="288" rx="22"
              fill="url(#paperBase)" stroke="rgba(0,0,0,.18)" stroke-width="2" filter="url(#softShadow)"/>
        <rect x="12" y="12" width="196" height="284" rx="20" filter="url(#paperNoise)" opacity="0.35"/>

        <g filter="url(#brush)" opacity="0.55">
          <path d="M30 86 C70 60, 110 64, 190 94
                   C170 140, 132 170, 30 210
                   C42 172, 50 138, 30 86 Z"
                fill="rgba(185,28,28,1)"/>
        </g>

        <g transform="translate(110 160)">
          <circle cx="0" cy="0" r="54" fill="rgba(0,0,0,.10)" stroke="rgba(0,0,0,.18)" stroke-width="2"/>
          <path d="M0 -30 L18 0 L0 30 L-18 0 Z" fill="rgba(17,24,39,.55)"/>
          <circle cx="0" cy="0" r="10" fill="rgba(17,24,39,.55)"/>
        </g>

        <text x="110" y="270" text-anchor="middle" font-family="system-ui,Segoe UI,Roboto"
              font-size="16" font-weight="1000" fill="rgba(17,24,39,.70)">
          SAMURAI DECK
        </text>
      </svg>
    `.trim();
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  const CARD_BACK = backSvgDataUri();

  function popAnim(img){
    if(!img) return;
    img.classList.remove("pop");
    requestAnimationFrame(()=> img.classList.add("pop"));
  }

  function logLine(logEl, text, cls=""){
    const div = document.createElement("div");
    div.className = "line " + cls;
    div.textContent = text;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function dealN(deck, n){
    const out = [];
    for(let i=0;i<n;i++){
      const c = deck.shift();
      if(!c) break;
      out.push(c);
    }
    return out;
  }

  function sortByValueAsc(cards){
    return cards.slice().sort((a,b)=>a.value-b.value);
  }

  /* ============================================================
     GAME 1: IAI DUEL  (unchanged)
  ============================================================ */
  function mountIAI(){
    const seedStr = localStorage.getItem(SEED_KEY) || "123456";
    const rng = mulberry32(hash32(seedStr) ^ 0x1111);

    const btnNew = $("#btnNew");
    const btnPlay = $("#btnPlay");
    const titleLine = $("#titleLine");
    const scoreLine = $("#scoreLine");
    const deckLine = $("#deckLine");
    const hintLine = $("#hintLine");
    const youMeta = $("#youMeta");
    const aiMeta = $("#aiMeta");
    const youUp = $("#youUp");
    const aiUp = $("#aiUp");
    const youHandEl = $("#youHand");
    const aiHandEl = $("#aiHand");
    const logEl = $("#log");

    const S = {
      deck: [],
      pHand: [],
      aHand: [],
      pScore: 0,
      aScore: 0,
      goal: 7,
      pSel: -1,
      aSel: -1,
      round: 1
    };

    function ui(){
      titleLine.textContent = `Round ${S.round}`;
      scoreLine.textContent = `You ${S.pScore} — ${S.aScore} Rival (Goal ${S.goal})`;
      deckLine.textContent = `Deck remaining: ${S.deck.length}`;
      youMeta.textContent = `Hand: ${S.pHand.length}`;
      aiMeta.textContent = `Hand: ${S.aHand.length}`;
      btnPlay.disabled = (S.pSel < 0);
      hintLine.textContent = (S.pSel < 0) ? "Pick 1 card. AI picks secretly too." : "Ready. Reveal when you dare.";
    }

    function renderHands(){
      youHandEl.innerHTML = "";
      S.pHand.forEach((c, idx)=>{
        const wrap = document.createElement("div");
        wrap.className = "handCard" + (idx === S.pSel ? " selected" : "");
        const img = document.createElement("img");
        img.src = cardSvgDataUri(c, seedStr);
        img.alt = `${c.rank} ${c.clanName}`;
        wrap.appendChild(img);
        wrap.addEventListener("click", ()=>{
          S.pSel = idx;
          ui();
          renderHands();
        });
        youHandEl.appendChild(wrap);
      });

      aiHandEl.innerHTML = "";
      S.aHand.forEach((_c)=>{
        const wrap = document.createElement("div");
        wrap.className = "handCard dim";
        const img = document.createElement("img");
        img.src = CARD_BACK;
        img.alt = "Rival card";
        wrap.appendChild(img);
        aiHandEl.appendChild(wrap);
      });
    }

    function refill(){
      while(S.pHand.length < 5 && S.deck.length) S.pHand.push(S.deck.shift());
      while(S.aHand.length < 5 && S.deck.length) S.aHand.push(S.deck.shift());
    }

    function aiChoose(){
      const sorted = sortByValueAsc(S.aHand).map(c => S.aHand.indexOf(c));
      if(sorted.length === 0) return -1;

      const behind = (S.aScore < S.pScore);
      const ahead = (S.aScore > S.pScore);

      if(behind){
        return sorted[Math.max(sorted.length-1 - Math.floor(rng()*2), 0)];
      }
      if(ahead){
        return sorted[Math.floor(sorted.length*0.5)];
      }
      const k = clamp(Math.floor((0.55 + rng()*0.35) * sorted.length), 0, sorted.length-1);
      return sorted[k];
    }

    function reveal(){
      if(S.pSel < 0) return;

      S.aSel = aiChoose();
      const pCard = S.pHand.splice(S.pSel,1)[0];
      const aCard = S.aHand.splice(S.aSel,1)[0];
      S.pSel = -1;
      S.aSel = -1;

      youUp.src = cardSvgDataUri(pCard, seedStr);
      aiUp.src = cardSvgDataUri(aCard, seedStr);
      popAnim(youUp); popAnim(aiUp);

      if(pCard.value > aCard.value){
        S.pScore++;
        logLine(logEl, `You win: ${pCard.rank} ${pCard.clanName} beats ${aCard.rank} ${aCard.clanName}`, "win");
      } else if(aCard.value > pCard.value){
        S.aScore++;
        logLine(logEl, `Rival wins: ${aCard.rank} ${aCard.clanName} beats ${pCard.rank} ${pCard.clanName}`, "lose");
      } else {
        S.pScore++; S.aScore++;
        logLine(logEl, `Clash tie: ${pCard.rank} vs ${aCard.rank}. Both score 1.`, "tie");
      }

      refill();
      renderHands();
      S.round++;

      if(S.pScore >= S.goal || S.aScore >= S.goal || (S.deck.length===0 && S.pHand.length===0 && S.aHand.length===0)){
        btnPlay.disabled = true;
        const res = S.pScore > S.aScore ? ["You win the duel.", "win"] :
                    S.aScore > S.pScore ? ["Rival wins the duel.", "lose"] :
                    ["Draw.", "tie"];
        logLine(logEl, res[0], res[1]);
      }

      ui();
    }

    function start(){
      $("#log").innerHTML = "";
      S.deck = shuffle(makeDeck(seedStr), rng);
      S.pHand = [];
      S.aHand = [];
      S.pScore = 0;
      S.aScore = 0;
      S.pSel = -1;
      S.round = 1;

      youUp.src = CARD_BACK;
      aiUp.src = CARD_BACK;

      refill();
      renderHands();
      logLine(logEl, "Iai Duel begins. Secret pick each round. Win by timing.", "muted");
      ui();
    }

    btnNew?.addEventListener("click", start);
    btnPlay?.addEventListener("click", reveal);

    start();
  }

  /* ============================================================
     GAME 2: RONIN TRICKS (UPDATED)
     (unchanged from your paste)
  ============================================================ */
  function mountTRICKS(){
    // --- your existing TRICKS code unchanged ---
    // (kept exactly as you provided)
    const seedStr = localStorage.getItem(SEED_KEY) || "123456";
    const rng = mulberry32(hash32(seedStr) ^ 0x2222);

    const btnNew = $("#btnNew");
    const titleLine = $("#titleLine");
    const scoreLine = $("#scoreLine");
    const trumpLine = $("#trumpLine");
    const trickLine = $("#trickLine");
    const countLine = $("#countLine");
    const youMeta = $("#youMeta");
    const aiMeta = $("#aiMeta");
    const youUp = $("#youUp");
    const aiUp = $("#aiUp");
    const youHandEl = $("#youHand");
    const aiHandEl = $("#aiHand");
    const btnPlay = $("#btnPlay");
    const btnNext = $("#btnNext");
    const logEl = $("#log");
    const unseenBox = $("#unseenBox");
    const unseenMeta = $("#unseenMeta");

    const S = {
      trump: "BLADE",
      trick: 1,
      lead: "P",
      leadClan: null,
      pHand: [],
      aHand: [],
      pScore: 0,
      aScore: 0,
      pSel: -1,
      playedP: null,
      playedA: null,
      seen: [],
      phase: "PLAY",
      nextTimer: null
    };

    function clanName(key){ return CLANS.find(c=>c.key===key)?.name || key; }
    function fmtCard(c){ return `${c.rank} ${c.clanName}`; }

    function computeUnseen(){
      const total = 52;
      const seenCount = S.seen.length;
      const yourHandCount = S.pHand.length;
      const known = seenCount + yourHandCount;
      const unseen = Math.max(0, total - known);

      const base = { BLADE:13, WAGASA:13, FAN:13, MASK:13 };
      const sub = (c) => { if(base[c.clanKey] != null) base[c.clanKey]--; };

      S.seen.forEach(sub);
      S.pHand.forEach(sub);

      return { total, seenCount, yourHandCount, known, unseen, byClan: base };
    }

    function renderUnseen(){
      if(!unseenBox) return;
      const u = computeUnseen();

      unseenMeta.textContent = `Seen: ${u.seenCount} • Known (seen + your hand): ${u.known} • Unseen: ${u.unseen}`;

      unseenBox.innerHTML = "";
      const lines = [
        `Unseen estimates (based on what you’ve seen + your current hand):`,
        `• Blade: ${u.byClan.BLADE} / 13`,
        `• Umbrella: ${u.byClan.WAGASA} / 13`,
        `• Fan: ${u.byClan.FAN} / 13`,
        `• Mask: ${u.byClan.MASK} / 13`,
        ``,
        `Note: Rival’s hand is unknown, so “unseen” includes their hand + remaining draws.`
      ];
      for(const t of lines){
        const div = document.createElement("div");
        div.className = "line muted";
        div.textContent = t;
        unseenBox.appendChild(div);
      }
      unseenBox.scrollTop = 0;
    }

    function ui(){
      titleLine.textContent = `Ronin Tricks`;
      scoreLine.textContent = `You ${S.pScore} — ${S.aScore} Rival`;
      trumpLine.textContent = `Trump: ${clanName(S.trump)}`;
      trickLine.textContent = `Trick ${S.trick}/13 • Lead: ${S.lead === "P" ? "You" : "Rival"}`;

      const u = computeUnseen();
      countLine.textContent = `Seen ${u.seenCount} • Unseen ${u.unseen}`;

      youMeta.textContent = `Hand: ${S.pHand.length}`;
      aiMeta.textContent = `Hand: ${S.aHand.length}`;

      btnPlay.disabled = !(S.phase === "PLAY" && S.pSel >= 0 && S.playedP === null);
      btnNext.disabled = !(S.phase === "REVEAL_WAIT");

      renderUnseen();
    }

    function renderHands(){
      youHandEl.innerHTML = "";
      S.pHand.forEach((c, idx)=>{
        const wrap = document.createElement("div");
        wrap.className = "handCard" + (idx === S.pSel ? " selected" : "");
        const img = document.createElement("img");
        img.src = cardSvgDataUri(c, seedStr);
        img.alt = `${c.rank} ${c.clanName}`;
        wrap.appendChild(img);
        wrap.addEventListener("click", ()=>{
          if(S.phase !== "PLAY") return;
          if(S.playedP) return;
          S.pSel = idx;
          ui();
          renderHands();
        });
        youHandEl.appendChild(wrap);
      });

      aiHandEl.innerHTML = "";
      S.aHand.forEach((_c)=>{
        const wrap = document.createElement("div");
        wrap.className = "handCard dim";
        const img = document.createElement("img");
        img.src = CARD_BACK;
        img.alt = "Rival card";
        wrap.appendChild(img);
        aiHandEl.appendChild(wrap);
      });
    }

    function startTrick(){
      S.leadClan = null;
      S.playedP = null;
      S.playedA = null;
      S.pSel = -1;
      S.phase = "PLAY";

      youUp.src = CARD_BACK;
      aiUp.src = CARD_BACK;
      popAnim(youUp); popAnim(aiUp);

      if(S.lead === "A"){
        aiPlay(true);
      }

      ui();
      renderHands();
    }

    function playableCards(hand, leadClan){
      if(!leadClan) return hand.map((_,i)=>i);
      const follow = hand.map((c,i)=>({c,i})).filter(x=>x.c.clanKey===leadClan).map(x=>x.i);
      return follow.length ? follow : hand.map((_,i)=>i);
    }

    function scheduleAutoNext(){
      if(S.nextTimer) clearTimeout(S.nextTimer);
      S.nextTimer = setTimeout(()=>{
        if(S.phase === "REVEAL_WAIT") nextTrick();
      }, 900);
    }

    function resolveTrick(){
      const p = S.playedP;
      const a = S.playedA;
      if(!p || !a) return;

      youUp.src = cardSvgDataUri(p, seedStr);
      aiUp.src = cardSvgDataUri(a, seedStr);
      popAnim(youUp); popAnim(aiUp);

      S.seen.push(p, a);

      logLine(logEl, `Reveal: You played ${fmtCard(p)} • Rival played ${fmtCard(a)}.`, "muted");

      const pTrump = (p.clanKey === S.trump);
      const aTrump = (a.clanKey === S.trump);

      let winner = null;
      if(pTrump && !aTrump) winner = "P";
      else if(aTrump && !pTrump) winner = "A";
      else {
        const leadClan = S.leadClan;
        const pFollows = (p.clanKey === leadClan);
        const aFollows = (a.clanKey === leadClan);
        if(pFollows && !aFollows) winner = "P";
        else if(aFollows && !pFollows) winner = "A";
        else {
          if(p.value > a.value) winner = "P";
          else if(a.value > p.value) winner = "A";
          else winner = (S.lead === "P") ? "P" : "A";
        }
      }

      const maskBonus = (p.clanKey==="MASK" ? 1 : 0) + (a.clanKey==="MASK" ? 1 : 0);
      if(winner === "P"){
        S.pScore += 1 + maskBonus;
        logLine(logEl, `You take the trick (+${1+maskBonus}).`, "win");
      } else {
        S.aScore += 1 + maskBonus;
        logLine(logEl, `Rival takes the trick (+${1+maskBonus}).`, "lose");
      }

      S.lead = winner;
      S.phase = "REVEAL_WAIT";

      if(S.trick >= 13){
        S.phase = "DONE";
        const res = S.pScore > S.aScore ? ["You win Ronin Tricks.", "win"] :
                    S.aScore > S.pScore ? ["Rival wins Ronin Tricks.", "lose"] :
                    ["Draw Ronin Tricks.", "tie"];
        logLine(logEl, res[0], res[1]);
        btnPlay.disabled = true;
        btnNext.disabled = true;
        ui();
        return;
      }

      ui();
      scheduleAutoNext();
    }

    function nextTrick(){
      if(S.phase !== "REVEAL_WAIT") return;
      if(S.nextTimer) clearTimeout(S.nextTimer);
      S.nextTimer = null;

      S.trick++;
      startTrick();
    }

    function aiChooseIndex(leadClan){
      const idxs = playableCards(S.aHand, leadClan);
      if(!idxs.length) return -1;

      if(leadClan && S.playedP){
        const p = S.playedP;
        let best = null;
        for(const i of idxs){
          const c = S.aHand[i];
          const canWin =
            (c.clanKey===S.trump && p.clanKey!==S.trump) ||
            (c.clanKey===p.clanKey && c.value > p.value) ||
            (p.clanKey!==S.trump && c.clanKey===S.trump);
          if(canWin){
            if(!best || c.value < best.c.value) best = {i,c};
          }
        }
        if(best) return best.i;
      }

      if(!leadClan){
        const sorted = idxs.map(i=>({i,c:S.aHand[i]})).sort((x,y)=>x.c.value-y.c.value);
        return sorted[Math.floor(sorted.length*0.55)].i;
      } else {
        let low = idxs[0];
        for(const i of idxs){
          if(S.aHand[i].value < S.aHand[low].value) low = i;
        }
        return low;
      }
    }

    function aiPlay(isLead=false){
      if(S.playedA) return;
      const idx = aiChooseIndex(S.leadClan);
      const c = S.aHand.splice(idx,1)[0];
      S.playedA = c;

      if(!S.leadClan) S.leadClan = c.clanKey;

      if(isLead){
        aiUp.src = cardSvgDataUri(c, seedStr);
        popAnim(aiUp);
      }

      if(S.playedP) resolveTrick();

      ui();
      renderHands();
    }

    function playerPlay(){
      if(S.phase !== "PLAY") return;
      if(S.pSel < 0 || S.playedP) return;

      const leadClan = S.leadClan;
      if(leadClan){
        const canFollow = S.pHand.some(x=>x.clanKey===leadClan);
        const chosen = S.pHand[S.pSel];
        if(canFollow && chosen.clanKey !== leadClan){
          logLine(logEl, `You must follow ${clanName(leadClan)} if you can.`, "lose");
          return;
        }
      }

      const c = S.pHand.splice(S.pSel,1)[0];
      S.pSel = -1;
      S.playedP = c;

      if(!S.leadClan) S.leadClan = c.clanKey;

      youUp.src = cardSvgDataUri(c, seedStr);
      popAnim(youUp);

      if(!S.playedA) aiPlay(false);
      else resolveTrick();

      ui();
      renderHands();
    }

    function start(){
      logEl.innerHTML = "";
      unseenBox && (unseenBox.innerHTML = "");

      const deck = shuffle(makeDeck(seedStr), rng);

      const trumps = ["BLADE","FAN","WAGASA"];
      S.trump = trumps[Math.floor(rng()*trumps.length)];

      S.trick = 1;
      S.pScore = 0;
      S.aScore = 0;
      S.lead = rng() < 0.5 ? "P" : "A";
      S.pSel = -1;
      S.seen = [];
      S.phase = "PLAY";
      if(S.nextTimer) clearTimeout(S.nextTimer);
      S.nextTimer = null;

      S.pHand = dealN(deck, 13);
      S.aHand = dealN(deck, 13);

      youUp.src = CARD_BACK;
      aiUp.src = CARD_BACK;

      logLine(logEl, "Ronin Tricks begins. Follow lead clan if you can. Lead wins ties.", "muted");

      startTrick();
      ui();
    }

    btnNew?.addEventListener("click", start);
    btnPlay?.addEventListener("click", playerPlay);
    btnNext?.addEventListener("click", nextTrick);

    start();
  }

  /* ============================================================
     GAME 3: DOJO RELICS (unchanged)
  ============================================================ */
  function mountRELICS(){
    // --- unchanged from your paste ---
    const seedStr = localStorage.getItem(SEED_KEY) || "123456";
    const rng = mulberry32(hash32(seedStr) ^ 0x3333);

    const btnNew = $("#btnNew");
    const titleLine = $("#titleLine");
    const scoreLine = $("#scoreLine");
    const deckLine = $("#deckLine");
    const marketMeta = $("#marketMeta");
    const marketGrid = $("#marketGrid");
    const youCollectionEl = $("#youCollection");
    const aiCollectionEl = $("#aiCollection");
    const youMeta = $("#youMeta");
    const aiMeta = $("#aiMeta");
    const btnClaim = $("#btnClaim");
    const btnEndTurn = $("#btnEndTurn");
    const btnScore = $("#btnScore");
    const logEl = $("#log");

    const S = {
      deck: [],
      market: [],
      pCol: [],
      aCol: [],
      pScore: 0,
      aScore: 0,
      selectedCol: new Set(),
      awaitingTake: true,
      over: false,
    };

    function ui(){
      titleLine.textContent = "Dojo Relics";
      scoreLine.textContent = `You ${S.pScore} — ${S.aScore} Rival`;
      deckLine.textContent = `Deck: ${S.deck.length}`;
      marketMeta.textContent = `Market: ${S.market.filter(Boolean).length}/9`;
      youMeta.textContent = `Cards: ${S.pCol.length}`;
      aiMeta.textContent = `Cards: ${S.aCol.length}`;

      btnClaim.disabled = (S.selectedCol.size !== 3 || S.over);
      btnEndTurn.disabled = (S.awaitingTake || S.over);
    }

    function renderMarket(){
      marketGrid.innerHTML = "";
      for(let i=0;i<9;i++){
        const slot = document.createElement("div");
        slot.className = "slot";
        const card = S.market[i] || null;
        if(card){
          const wrap = document.createElement("div");
          wrap.className = "handCard";
          const img = document.createElement("img");
          img.src = cardSvgDataUri(card, seedStr);
          img.alt = `${card.rank} ${card.clanName}`;
          wrap.appendChild(img);
          wrap.addEventListener("click", ()=>{
            if(S.over) return;
            if(!S.awaitingTake) return;
            takeFromMarket(i);
          });
          slot.appendChild(wrap);
        } else {
          slot.innerHTML = `<span class="pill">Empty</span>`;
        }
        marketGrid.appendChild(slot);
      }
    }

    function renderCollections(){
      youCollectionEl.innerHTML = "";
      S.pCol.forEach((c, idx)=>{
        const wrap = document.createElement("div");
        const sel = S.selectedCol.has(idx);
        wrap.className = "handCard" + (sel ? " selected" : "");
        const img = document.createElement("img");
        img.src = cardSvgDataUri(c, seedStr);
        img.alt = `${c.rank} ${c.clanName}`;
        wrap.appendChild(img);
        wrap.addEventListener("click", ()=>{
          if(S.over) return;
          if(sel) S.selectedCol.delete(idx);
          else {
            if(S.selectedCol.size >= 3) return;
            S.selectedCol.add(idx);
          }
          ui();
          renderCollections();
        });
        youCollectionEl.appendChild(wrap);
      });

      aiCollectionEl.innerHTML = "";
      S.aCol.forEach((c)=>{
        const wrap = document.createElement("div");
        wrap.className = "handCard dim";
        const img = document.createElement("img");
        img.src = cardSvgDataUri(c, seedStr);
        img.alt = `${c.rank} ${c.clanName}`;
        wrap.appendChild(img);
        aiCollectionEl.appendChild(wrap);
      });
    }

    function refillMarket(){
      for(let i=0;i<9;i++){
        if(!S.market[i] && S.deck.length){
          S.market[i] = S.deck.shift();
        }
      }
    }

    function takeFromMarket(i){
      const card = S.market[i];
      if(!card) return;
      S.market[i] = null;
      S.pCol.push(card);
      S.awaitingTake = false;
      logLine(logEl, `You take ${card.rank} of ${card.clanName}.`, "muted");
      refillMarket();
      renderMarket();
      renderCollections();
      ui();
    }

    function aiTake(){
      const options = S.market.map((c,i)=>({c,i})).filter(x=>x.c);
      if(!options.length) return;

      function scoreCard(c){
        let s = 0;
        if(c.clanKey === "MASK") s += 3.5;
        const clanCount = S.aCol.filter(x=>x.clanKey===c.clanKey).length;
        s += clanCount * 1.2;
        const sameRank = S.aCol.filter(x=>x.value===c.value).length;
        s += sameRank * 1.0;
        const vals = new Set(S.aCol.map(x=>x.value));
        if(vals.has(c.value-1)) s += 0.6;
        if(vals.has(c.value+1)) s += 0.6;
        return s + rng()*0.2;
      }

      options.sort((a,b)=>scoreCard(b.c)-scoreCard(a.c));
      const pick = options[0];
      S.market[pick.i] = null;
      S.aCol.push(pick.c);
      logLine(logEl, `Rival takes a relic.`, "muted");
      refillMarket();
    }

    function isTripletClan(cards){
      const nonMask = cards.filter(c=>c.clanKey!=="MASK");
      if(nonMask.length === 0) return true;
      const k = nonMask[0].clanKey;
      return nonMask.every(c=>c.clanKey===k);
    }

    function isPairPlusMask(cards){
      const masks = cards.filter(c=>c.clanKey==="MASK").length;
      if(masks !== 1) return false;
      const nonMask = cards.filter(c=>c.clanKey!=="MASK");
      return nonMask.length===2 && nonMask[0].value===nonMask[1].value;
    }

    function isStraight3(cards){
      const masks = cards.filter(c=>c.clanKey==="MASK").length;
      if(masks > 1) return false;
      const vals = cards.filter(c=>c.clanKey!=="MASK").map(c=>c.value).sort((a,b)=>a-b);
      if(vals.length===3){
        return vals[1]===vals[0]+1 && vals[2]===vals[1]+1;
      }
      if(vals.length===2){
        const [a,b]=vals;
        if(a===b) return false;
        if(b===a+1) return true;
        if(b===a+2) return true;
        return false;
      }
      if(vals.length===1){
        return true;
      }
      return false;
    }

    function claimSet(){
      if(S.selectedCol.size !== 3 || S.over) return;
      const idxs = Array.from(S.selectedCol).sort((a,b)=>b-a);
      const cards = idxs.map(i=>S.pCol[i]);

      let kind = null;
      let pts = 0;
      if(isPairPlusMask(cards)){ kind="Pair+Mask"; pts=3; }
      else if(isStraight3(cards)){ kind="Straight"; pts=4; }
      else if(isTripletClan(cards)){ kind="Clan Triplet"; pts=5; }

      if(!kind){
        logLine(logEl, "Not a valid set. Try: Clan Triplet, Straight, or Pair+Mask.", "lose");
        S.selectedCol.clear();
        renderCollections();
        ui();
        return;
      }

      for(const i of idxs) S.pCol.splice(i,1);
      S.pScore += pts;
      logLine(logEl, `You claim ${kind} (+${pts}).`, "win");

      S.selectedCol.clear();
      renderCollections();
      ui();
    }

    function endTurn(){
      if(S.over) return;
      if(S.awaitingTake) return;

      aiTake();
      S.awaitingTake = true;

      renderMarket();
      renderCollections();
      ui();

      const marketHas = S.market.some(Boolean);
      if(!marketHas && S.deck.length===0){
        finishScore();
      }
    }

    function scoreAutoCollection(col){
      return col.filter(c=>c.clanKey==="MASK").length;
    }

    function finishScore(){
      if(S.over) return;
      S.over = true;

      const pBonus = scoreAutoCollection(S.pCol);
      const aBonus = scoreAutoCollection(S.aCol);
      S.pScore += pBonus;
      S.aScore += aBonus;

      logLine(logEl, `End scoring: leftover Masks grant bonuses (You +${pBonus}, Rival +${aBonus}).`, "muted");

      const res = S.pScore > S.aScore ? ["You win Dojo Relics.", "win"] :
                  S.aScore > S.pScore ? ["Rival wins Dojo Relics.", "lose"] :
                  ["Dojo Relics ends in a draw.", "tie"];
      logLine(logEl, res[0], res[1]);
      ui();
    }

    function start(){
      logEl.innerHTML = "";
      S.deck = shuffle(makeDeck(seedStr), rng);
      S.market = new Array(9).fill(null);
      S.pCol = [];
      S.aCol = [];
      S.pScore = 0;
      S.aScore = 0;
      S.selectedCol.clear();
      S.awaitingTake = true;
      S.over = false;

      refillMarket();
      renderMarket();
      renderCollections();
      logLine(logEl, "Take 1 from market. Then rival takes 1. Build sets and Claim for points.", "muted");
      ui();
    }

    btnNew?.addEventListener("click", start);
    btnClaim?.addEventListener("click", claimSet);
    btnEndTurn?.addEventListener("click", endTurn);
    btnScore?.addEventListener("click", finishScore);

    start();
  }

  /* ============================================================
     GAME 4: SHOWDOWN (unchanged)
  ============================================================ */
  function mountSHOWDOWN(){
    // --- unchanged from your paste ---
    const seedStr = localStorage.getItem(SEED_KEY) || "123456";
    const rng = mulberry32(hash32(seedStr) ^ 0x4444);

    const btnNew = $("#btnNew");
    const titleLine = $("#titleLine");
    const scoreLine = $("#scoreLine");
    const roundLine = $("#roundLine");
    const youMeta = $("#youMeta");
    const aiMeta = $("#aiMeta");
    const youUp = $("#youUp");
    const aiUp = $("#aiUp");
    const youHandEl = $("#youHand");
    const aiHandEl = $("#aiHand");
    const youHandName = $("#youHandName");
    const aiHandName = $("#aiHandName");
    const btnPlay = $("#btnPlay");
    const logEl = $("#log");

    const S = {
      deck: [],
      p5: [],
      a5: [],
      pKeep: new Set(),
      pScore: 0,
      aScore: 0,
      goal: 5,
      round: 1,
      over: false,
    };

    function handEval(cards3){
      const vals = cards3.map(c=>c.value).sort((a,b)=>a-b);
      const clans = cards3.map(c=>c.clanKey);
      const sum = vals[0]+vals[1]+vals[2];

      const isFlush = (clans[0]===clans[1] && clans[1]===clans[2]);
      const isStraight = (vals[1]===vals[0]+1 && vals[2]===vals[1]+1);
      const counts = {};
      for(const v of vals) counts[v] = (counts[v]||0)+1;
      const freq = Object.values(counts).sort((a,b)=>b-a);
      const isTrips = (freq[0]===3);
      const isPair = (freq[0]===2);

      let rank = 0;
      let name = "High";
      if(isTrips){ rank=4; name="Trips"; }
      else if(isStraight){ rank=3; name="Straight"; }
      else if(isFlush){ rank=2; name="Flush"; }
      else if(isPair){ rank=1; name="Pair"; }
      return { rank, sum, name };
    }

    function ui(){
      titleLine.textContent = "Shogun Showdown";
      scoreLine.textContent = `You ${S.pScore} — ${S.aScore} Rival (Goal ${S.goal})`;
      roundLine.textContent = `Round ${S.round}`;
      youMeta.textContent = `Deck: ${S.deck.length}`;
      aiMeta.textContent = `Deck: ${S.deck.length}`;
      btnPlay.disabled = (S.pKeep.size !== 3 || S.over);
    }

    function renderHands(){
      youHandEl.innerHTML = "";
      S.p5.forEach((c, idx)=>{
        const sel = S.pKeep.has(idx);
        const wrap = document.createElement("div");
        wrap.className = "handCard" + (sel ? " selected" : "");
        const img = document.createElement("img");
        img.src = cardSvgDataUri(c, seedStr);
        img.alt = `${c.rank} ${c.clanName}`;
        wrap.appendChild(img);
        wrap.addEventListener("click", ()=>{
          if(S.over) return;
          if(sel) S.pKeep.delete(idx);
          else {
            if(S.pKeep.size >= 3) return;
            S.pKeep.add(idx);
          }
          previewHandName();
          ui();
          renderHands();
        });
        youHandEl.appendChild(wrap);
      });

      aiHandEl.innerHTML = "";
      S.a5.forEach((_c)=>{
        const wrap = document.createElement("div");
        wrap.className = "handCard dim";
        const img = document.createElement("img");
        img.src = CARD_BACK;
        img.alt = "Rival card";
        wrap.appendChild(img);
        aiHandEl.appendChild(wrap);
      });
    }

    function previewHandName(){
      if(S.pKeep.size !== 3){
        youHandName.textContent = "Pick 3";
        return;
      }
      const cards = Array.from(S.pKeep).map(i=>S.p5[i]);
      const e = handEval(cards);
      youHandName.textContent = `${e.name} (sum ${e.sum})`;
    }

    function aiPick3(){
      let best = null;
      for(let i=0;i<5;i++){
        for(let j=i+1;j<5;j++){
          for(let k=j+1;k<5;k++){
            const cards = [S.a5[i], S.a5[j], S.a5[k]];
            const e = handEval(cards);
            const score = e.rank*100 + e.sum + rng()*0.01;
            if(!best || score > best.score) best = { pick:[i,j,k], e, score };
          }
        }
      }
      return best;
    }

    function drawRound(){
      if(S.deck.length < 10){
        S.deck = shuffle(makeDeck(seedStr), rng);
      }
      S.p5 = dealN(S.deck, 5);
      S.a5 = dealN(S.deck, 5);
      S.pKeep.clear();
      youUp.src = CARD_BACK;
      aiUp.src = CARD_BACK;
      youHandName.textContent = "Pick 3";
      aiHandName.textContent = "—";
      renderHands();
      ui();
    }

    function reveal(){
      if(S.pKeep.size !== 3 || S.over) return;

      const pCards = Array.from(S.pKeep).map(i=>S.p5[i]);
      const pE = handEval(pCards);

      const ai = aiPick3();
      const aCards = ai.pick.map(i=>S.a5[i]);
      const aE = ai.e;

      youUp.src = cardSvgDataUri(pCards[0], seedStr);
      aiUp.src = cardSvgDataUri(aCards[0], seedStr);
      popAnim(youUp); popAnim(aiUp);

      aiHandEl.innerHTML = "";
      aCards.forEach(c=>{
        const wrap = document.createElement("div");
        wrap.className = "handCard";
        const img = document.createElement("img");
        img.src = cardSvgDataUri(c, seedStr);
        img.alt = `${c.rank} ${c.clanName}`;
        wrap.appendChild(img);
        aiHandEl.appendChild(wrap);
      });

      youHandName.textContent = `${pE.name} (sum ${pE.sum})`;
      aiHandName.textContent = `${aE.name} (sum ${aE.sum})`;

      const pScoreKey = pE.rank*100 + pE.sum;
      const aScoreKey = aE.rank*100 + aE.sum;

      if(pScoreKey > aScoreKey){
        S.pScore++;
        logLine(logEl, `You win the round: ${pE.name} beats ${aE.name}.`, "win");
      } else if(aScoreKey > pScoreKey){
        S.aScore++;
        logLine(logEl, `Rival wins the round: ${aE.name} beats ${pE.name}.`, "lose");
      } else {
        logLine(logEl, `Round ties: ${pE.name} = ${aE.name}.`, "tie");
      }

      if(S.pScore >= S.goal || S.aScore >= S.goal){
        S.over = true;
        const res = S.pScore > S.aScore ? ["You win Shogun Showdown.", "win"] :
                    S.aScore > S.pScore ? ["Rival wins Shogun Showdown.", "lose"] :
                    ["Draw.", "tie"];
        logLine(logEl, res[0], res[1]);
        ui();
        return;
      }

      S.round++;
      setTimeout(drawRound, 450);
    }

    function start(){
      logEl.innerHTML = "";
      S.deck = shuffle(makeDeck(seedStr), rng);
      S.pScore = 0;
      S.aScore = 0;
      S.goal = 5;
      S.round = 1;
      S.over = false;
      logLine(logEl, "Draw 5, keep 3. Best 3-card hand wins the round.", "muted");
      drawRound();
    }

    btnNew?.addEventListener("click", start);
    btnPlay?.addEventListener("click", reveal);

    start();
  }

  /* ============================================================
     GAME 5: LANES (UPDATED: AI lane reveal on resolve + history tableau)
  ============================================================ */
  function mountLANES(){
    const seedStr = localStorage.getItem(SEED_KEY) || "123456";
    const rng = mulberry32(hash32(seedStr) ^ 0x5555);

    const btnNew = $("#btnNew");
    const titleLine = $("#titleLine");
    const scoreLine = $("#scoreLine");
    const deckLine = $("#deckLine");
    const laneMeta = $("#laneMeta");
    const youMeta = $("#youMeta");
    const aiMeta = $("#aiMeta");
    const lanesEl = $("#lanes");
    const youHandEl = $("#youHand");
    const aiHandEl = $("#aiHand");
    const btnEndTurn = $("#btnEndTurn");
    const logEl = $("#log");

    const S = {
      deck: [],
      pHand: [],
      aHand: [],
      pSel: -1,
      lanes: [
        { p:[], a:[], claimed:null, revealed:false },
        { p:[], a:[], claimed:null, revealed:false },
        { p:[], a:[], claimed:null, revealed:false },
      ],
      pClaim: 0,
      aClaim: 0,
      placedThisTurn: false,
      over: false,
    };

    function fmtCard(c){
      return `${c.rank} ${c.clanName}`;
    }

    function ui(){
      titleLine.textContent = "Skirmish Lanes";
      scoreLine.textContent = `Lanes won: You ${S.pClaim} — ${S.aClaim} Rival`;
      deckLine.textContent = `Deck: ${S.deck.length}`;
      laneMeta.textContent = `Select card → click lane. End Turn after placing.`;
      youMeta.textContent = `Hand: ${S.pHand.length}`;
      aiMeta.textContent = `Hand: ${S.aHand.length}`;
      btnEndTurn.disabled = (!S.placedThisTurn || S.over);
    }

    function renderHands(){
      youHandEl.innerHTML = "";
      S.pHand.forEach((c, idx)=>{
        const wrap = document.createElement("div");
        wrap.className = "handCard" + (idx===S.pSel ? " selected" : "");
        const img = document.createElement("img");
        img.src = cardSvgDataUri(c, seedStr);
        img.alt = `${c.rank} ${c.clanName}`;
        wrap.appendChild(img);
        wrap.addEventListener("click", ()=>{
          if(S.over) return;
          S.pSel = idx;
          ui();
          renderHands();
        });
        youHandEl.appendChild(wrap);
      });

      aiHandEl.innerHTML = "";
      S.aHand.forEach((_c)=>{
        const wrap = document.createElement("div");
        wrap.className = "handCard dim";
        const img = document.createElement("img");
        img.src = CARD_BACK;
        img.alt = "Rival card";
        wrap.appendChild(img);
        aiHandEl.appendChild(wrap);
      });
    }

    function laneBonus(cards){
      if(cards.length !== 3) return 0;
      const clans = cards.map(c=>c.clanKey);
      const vals = cards.map(c=>c.value).sort((a,b)=>a-b);
      const sameClan = (clans[0]===clans[1] && clans[1]===clans[2]);
      const straight = (vals[1]===vals[0]+1 && vals[2]===vals[1]+1);
      if(sameClan) return 3;
      if(straight) return 2;
      return 0;
    }

    function laneTotal(cards){
      return cards.reduce((s,c)=>s+c.value,0) + laneBonus(cards);
    }

    function renderLanes(){
      lanesEl.innerHTML = "";
      S.lanes.forEach((ln, idx)=>{
        const lane = document.createElement("div");
        lane.className = "lane";
        const title = document.createElement("div");
        title.className = "laneTitle";

        let status = "Open";
        if(ln.claimed==="P") status = "Claimed: You";
        if(ln.claimed==="A") status = "Claimed: Rival";

        title.innerHTML = `<span>Lane ${idx+1}</span><span class="pill">${status}</span>`;
        lane.appendChild(title);

        const pRow = document.createElement("div");
        pRow.className = "laneRow";
        ln.p.forEach(c=>{
          const img = document.createElement("img");
          img.className = "cardImg small";
          img.src = cardSvgDataUri(c, seedStr);
          img.alt = "P card";
          pRow.appendChild(img);
        });
        lane.appendChild(pRow);

        const aRow = document.createElement("div");
        aRow.className = "laneRow";
        ln.a.forEach(c=>{
          const img = document.createElement("img");
          img.className = "cardImg small";
          // KEY CHANGE: reveal AI cards only if lane resolved (ln.revealed) OR match over (S.over)
          img.src = (ln.revealed || S.over) ? cardSvgDataUri(c, seedStr) : CARD_BACK;
          img.alt = "A card";
          aRow.appendChild(img);
        });
        lane.appendChild(aRow);

        lane.addEventListener("click", ()=>{
          if(S.over) return;
          if(ln.claimed) return;
          if(S.pSel < 0) return;
          if(S.placedThisTurn) return;
          if(ln.p.length >= 3) return;

          const card = S.pHand.splice(S.pSel,1)[0];
          S.pSel = -1;
          ln.p.push(card);
          S.placedThisTurn = true;

          while(S.pHand.length < 5 && S.deck.length) S.pHand.push(S.deck.shift());

          logLine(logEl, `You place ${fmtCard(card)} in Lane ${idx+1}.`, "muted");
          renderHands();
          renderLanes();
          ui();
          maybeResolveLane(idx);
        });

        lanesEl.appendChild(lane);
      });
    }

    function maybeResolveLane(idx){
      const ln = S.lanes[idx];
      if(ln.claimed) return;
      if(ln.p.length===3 && ln.a.length===3){
        // KEY CHANGE: flip AI cards face-up permanently for this lane
        ln.revealed = true;

        const pT = laneTotal(ln.p);
        const aT = laneTotal(ln.a);

        // Extra clarity: log the exact revealed AI cards and totals
        const pList = ln.p.map(fmtCard).join(", ");
        const aList = ln.a.map(fmtCard).join(", ");
        logLine(logEl, `Lane ${idx+1} reveal: You [${pList}] • Rival [${aList}]`, "muted");

        if(pT > aT){
          ln.claimed = "P";
          S.pClaim++;
          logLine(logEl, `Lane ${idx+1} resolved: You win (${pT} vs ${aT}).`, "win");
        } else if(aT > pT){
          ln.claimed = "A";
          S.aClaim++;
          logLine(logEl, `Lane ${idx+1} resolved: Rival wins (${aT} vs ${pT}).`, "lose");
        } else {
          const win = rng() < 0.5 ? "P" : "A";
          ln.claimed = win;
          if(win==="P"){ S.pClaim++; logLine(logEl, `Lane ${idx+1} resolved: Tie → You claim.`, "tie"); }
          else { S.aClaim++; logLine(logEl, `Lane ${idx+1} resolved: Tie → Rival claims.`, "tie"); }
        }

        renderLanes();
        ui();
        checkWin();
      }
    }

    function aiChooseLaneAndCard(){
      const openLanes = S.lanes.map((ln,i)=>({ln,i}))
        .filter(x=>!x.ln.claimed && x.ln.a.length < 3);
      if(!openLanes.length) return null;

      function laneNeedScore(ln){
        const pT = ln.p.reduce((s,c)=>s+c.value,0);
        return pT + rng()*2;
      }
      openLanes.sort((a,b)=>laneNeedScore(b.ln)-laneNeedScore(a.ln));
      const target = openLanes[0];

      let bestIdx = 0;
      let bestScore = -1e9;
      for(let i=0;i<S.aHand.length;i++){
        const c = S.aHand[i];
        const test = target.ln.a.concat([c]);
        let score = test.reduce((s,x)=>s+x.value,0);
        if(test.length===2){
          if(test[0].clanKey===test[1].clanKey) score += 1.2;
          if(Math.abs(test[0].value-test[1].value)===1) score += 1.0;
        }
        if(test.length===3){
          score += laneBonus(test)*3;
        }
        score += rng()*0.1;
        if(score > bestScore){ bestScore = score; bestIdx = i; }
      }
      return { laneIndex: target.i, cardIndex: bestIdx };
    }

    function aiTurn(){
      const pick = aiChooseLaneAndCard();
      if(!pick) return;
      const ln = S.lanes[pick.laneIndex];
      const card = S.aHand.splice(pick.cardIndex,1)[0];
      ln.a.push(card);

      while(S.aHand.length < 5 && S.deck.length) S.aHand.push(S.deck.shift());

      logLine(logEl, `Rival plays into Lane ${pick.laneIndex+1}.`, "muted");
      renderHands();
      renderLanes();
      ui();
      maybeResolveLane(pick.laneIndex);
    }

    function checkWin(){
      if(S.pClaim >= 2 || S.aClaim >= 2){
        S.over = true;

        // Optional clarity: once match is over, reveal all remaining AI lane cards too
        // (so the final board is fully readable)
        S.lanes.forEach(ln => { ln.revealed = true; });

        const res = S.pClaim > S.aClaim ? ["You win Skirmish Lanes.", "win"] :
                    S.aClaim > S.pClaim ? ["Rival wins Skirmish Lanes.", "lose"] :
                    ["Draw.", "tie"];
        logLine(logEl, res[0], res[1]);

        renderLanes();
        ui();
      }
    }

    function endTurn(){
      if(S.over) return;
      if(!S.placedThisTurn) return;
      S.placedThisTurn = false;
      aiTurn();
      ui();
    }

    function start(){
      logEl.innerHTML = "";
      S.deck = shuffle(makeDeck(seedStr), rng);
      S.pHand = [];
      S.aHand = [];
      S.pSel = -1;
      S.lanes = [
        { p:[], a:[], claimed:null, revealed:false },
        { p:[], a:[], claimed:null, revealed:false },
        { p:[], a:[], claimed:null, revealed:false },
      ];
      S.pClaim = 0;
      S.aClaim = 0;
      S.placedThisTurn = false;
      S.over = false;

      while(S.pHand.length < 5 && S.deck.length) S.pHand.push(S.deck.shift());
      while(S.aHand.length < 5 && S.deck.length) S.aHand.push(S.deck.shift());

      logLine(logEl, "Place 1 card per turn. End Turn to let the rival respond. Claim 2 lanes to win.", "muted");
      renderHands();
      renderLanes();
      ui();
    }

    btnNew?.addEventListener("click", start);
    btnEndTurn?.addEventListener("click", endTurn);

    start();
  }

  /* ============================================================
     Mount router
  ============================================================ */
  function mount({game}){
    switch(game){
      case "IAI": return mountIAI();
      case "TRICKS": return mountTRICKS();
      case "RELICS": return mountRELICS();
      case "SHOWDOWN": return mountSHOWDOWN();
      case "LANES": return mountLANES();
      default:
        console.error("Unknown game:", game);
    }
  }

  return { mount };
})();

/* Stair Fitness — PWA mini app (single scroll)
   - 3 stair profiles: house / work / gym
   - Each profile can be locked/unlocked
   - Session uses the active profile
   - Saves to localStorage
*/

(() => {
  const $ = (id) => document.getElementById(id);

  const STORE = {
    active: "stairs_active_profile_v1",     // "house" | "work" | "gym"
    profiles: "stairs_profiles_v1",         // { house:{stairsOneWay, stairRiseIn}, work:{...}, gym:{...} }
    locks: "stairs_profile_locks_v1",       // { house:true/false, work:true/false, gym:true/false }
    body: "stairs_body_v1",                 // shared: weight/height/pace
    sess: "stairs_session_v1",              // current flights (live)
    hist: "stairs_history_v1",              // finished sessions
    undo: "stairs_undo_v1"
  };

  const DEFAULT_PROFILE = { stairsOneWay: 13, stairRiseIn: 7.0 };
  const DEFAULT_BODY = {
    weightSt: 13.4, weightLb: 0,
    heightFt: 5, heightIn: 10,
    intensity: "general",
    stairsPerMin: 60,
    viewMode: "ascent"
  };

  const METS = { slow: 4.0, general: 6.8, fast: 8.8 };

  const LANDMARKS_FT = [
    { name:"Leaning Tower of Pisa", ft:185.9 },
    { name:"Big Ben (Elizabeth Tower)", ft:315.0 },
    { name:"Eiffel Tower", ft:1083.0 },
    { name:"Empire State Building (roof)", ft:1250.0 },
    { name:"Burj Khalifa", ft:2717.0 }
  ];

  const ACH = [
    { id:"first_flight", name:"First Flight", desc:"Log your first up+down.", rule: s => s.totalFlightsAll >= 1 },
    { id:"ten_flights", name:"10 Flights", desc:"Total flights (all time) reaches 10.", rule: s => s.totalFlightsAll >= 10 },
    { id:"fifty_flights", name:"50 Flights", desc:"Total flights (all time) reaches 50.", rule: s => s.totalFlightsAll >= 50 },
    { id:"hundred_flights", name:"100 Flights", desc:"Total flights (all time) reaches 100.", rule: s => s.totalFlightsAll >= 100 },
    { id:"pisa", name:"Pisa Height", desc:"Your best ascent equals the Leaning Tower of Pisa.", rule: s => s.bestAscentFt >= 185.9 },
    { id:"bigben", name:"Big Ben Height", desc:"Your best ascent equals Big Ben.", rule: s => s.bestAscentFt >= 315.0 },
    { id:"eiffel", name:"Eiffel Height", desc:"Your best ascent equals the Eiffel Tower.", rule: s => s.bestAscentFt >= 1083.0 }
  ];

  // helpers
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const fmt = (n,dp=1)=> isFinite(n) ? n.toLocaleString(undefined,{minimumFractionDigits:dp,maximumFractionDigits:dp}) : "—";
  const fmt0 = (n)=> isFinite(n) ? Math.round(n).toLocaleString() : "—";
  const getJSON = (k,d)=> { try{ return JSON.parse(localStorage.getItem(k)) ?? d }catch{ return d } };
  const setJSON = (k,v)=> localStorage.setItem(k, JSON.stringify(v));
  const cap = s => s ? (s.charAt(0).toUpperCase() + s.slice(1)) : "";

  const stoneToLb = (st, lb)=> (st*14) + (lb||0);
  const lbToKg = (lb)=> lb * 0.45359237;
  const inchesToFt = (inch)=> inch/12;
  const ftToM = (ft)=> ft * 0.3048;

  function ensureState(){
    const active = localStorage.getItem(STORE.active) || "house";
    localStorage.setItem(STORE.active, active);

    const profiles = getJSON(STORE.profiles, null) || {
      house: { ...DEFAULT_PROFILE },
      work:  { ...DEFAULT_PROFILE },
      gym:   { ...DEFAULT_PROFILE }
    };
    setJSON(STORE.profiles, profiles);

    const locks = getJSON(STORE.locks, null) || { house:false, work:false, gym:false };
    setJSON(STORE.locks, locks);

    const body = getJSON(STORE.body, null) || { ...DEFAULT_BODY };
    setJSON(STORE.body, body);

    const sess = getJSON(STORE.sess, null) || { flights: 0, savedAt: new Date().toISOString() };
    setJSON(STORE.sess, sess);

    const hist = getJSON(STORE.hist, null) || [];
    setJSON(STORE.hist, hist);

    return { active, profiles, locks, body, sess, hist };
  }

  function activeProfileKey(){
    return localStorage.getItem(STORE.active) || "house";
  }

  function loadStateIntoInputs(){
    const p = activeProfileKey();
    const profiles = getJSON(STORE.profiles, {});
    const locks = getJSON(STORE.locks, {house:false,work:false,gym:false});
    const body = getJSON(STORE.body, { ...DEFAULT_BODY });
    const sess = getJSON(STORE.sess, { flights: 0 });

    const cfg = profiles[p] || { ...DEFAULT_PROFILE };

    $("stairsOneWay").value = cfg.stairsOneWay ?? DEFAULT_PROFILE.stairsOneWay;
    $("stairRiseIn").value  = cfg.stairRiseIn ?? DEFAULT_PROFILE.stairRiseIn;

    $("weightSt").value = body.weightSt ?? DEFAULT_BODY.weightSt;
    $("weightLb").value = body.weightLb ?? DEFAULT_BODY.weightLb;
    $("heightFt").value = body.heightFt ?? DEFAULT_BODY.heightFt;
    $("heightIn").value = body.heightIn ?? DEFAULT_BODY.heightIn;
    $("intensity").value = body.intensity ?? DEFAULT_BODY.intensity;
    $("stairsPerMin").value = body.stairsPerMin ?? DEFAULT_BODY.stairsPerMin;
    $("viewMode").value = body.viewMode ?? DEFAULT_BODY.viewMode;

    $("flights").value = sess.flights ?? 0;

    // apply lock state to stair fields
    const locked = !!locks[p];
    $("stairsOneWay").disabled = locked;
    $("stairRiseIn").disabled  = locked;
  }

  function applyProfileUI(){
    const p = activeProfileKey();
    const locks = getJSON(STORE.locks, {house:false,work:false,gym:false});
    const locked = !!locks[p];

    $("activeBadge").textContent = `Active: ${cap(p)}${locked ? " (Locked)" : ""}`;
    $("sessionBadge").textContent = `Using: ${cap(p)}${locked ? " (Locked)" : ""}`;

    $("profileHint").innerHTML = locked
      ? `Active profile: <b>${cap(p)}</b> is <b>locked</b>. Unlock to edit stairs.`
      : `Active profile: <b>${cap(p)}</b>. Edit stairs + stair height, then save to the active slot.`;

    ["house","work","gym"].forEach(k=>{
      const chip = $(`chip-${k}`);
      if (!chip) return;
      chip.classList.toggle("on", k === p);
      chip.classList.toggle("locked", !!locks[k]);
      chip.title = locks[k] ? `${cap(k)} (locked)` : cap(k);
    });
  }

  function readInputs(){
    const stairsOneWay = clamp(Number($("stairsOneWay").value||0), 1, 500);
    const stairRiseIn  = clamp(Number($("stairRiseIn").value||0), 4, 10);

    const weightSt = clamp(Number($("weightSt").value||0), 5, 40);
    const weightLb = clamp(Number($("weightLb").value||0), 0, 13);

    const heightFt = clamp(Number($("heightFt").value||0), 3, 7);
    const heightIn = clamp(Number($("heightIn").value||0), 0, 11);

    const intensityKey = $("intensity").value;
    const met = METS[intensityKey] ?? 6.8;

    const stairsPerMin = clamp(Number($("stairsPerMin").value||0), 10, 200);

    const flights = clamp(Number($("flights").value||0), 0, 100000);
    const viewMode = $("viewMode").value;

    return {
      profileKey: activeProfileKey(),
      stairsOneWay, stairRiseIn,
      weightSt, weightLb,
      heightFt, heightIn,
      intensityKey, met,
      stairsPerMin,
      flights,
      viewMode
    };
  }

  function compute(){
    const d = readInputs();

    const riseFt = inchesToFt(d.stairRiseIn);
    const totalSteps = d.flights * (d.stairsOneWay * 2);
    const ascentSteps = d.flights * d.stairsOneWay;

    const ascentFt = ascentSteps * riseFt;
    const travelFt = totalSteps * riseFt;

    const minutes = totalSteps / d.stairsPerMin;
    const hours = minutes / 60;

    const totalLb = stoneToLb(d.weightSt, d.weightLb);
    const kg = lbToKg(totalLb);

    const kcal = d.met * kg * hours;
    const ascentPerFlightFt = d.stairsOneWay * riseFt;

    return { ...d, riseFt, totalSteps, ascentSteps, ascentFt, travelFt, minutes, hours, totalLb, kg, kcal, ascentPerFlightFt };
  }

  function saveBody(){
    const d = readInputs();
    setJSON(STORE.body, {
      weightSt:d.weightSt, weightLb:d.weightLb,
      heightFt:d.heightFt, heightIn:d.heightIn,
      intensity:d.intensityKey,
      stairsPerMin:d.stairsPerMin,
      viewMode:d.viewMode
    });
  }

  function saveSessionFlights(){
    const flights = clamp(Number($("flights").value||0), 0, 100000);
    setJSON(STORE.sess, { flights, savedAt: new Date().toISOString() });
  }

  function stampSaved(){
    $("lastSaved").textContent = `Saved: ${new Date().toLocaleTimeString()}`;
  }

  function renderKpis(targetId){
    const r = compute();
    const heightFt = (r.viewMode === "travel") ? r.travelFt : r.ascentFt;
    const heightM = ftToM(heightFt);

    const timeStr = (() => {
      if (!isFinite(r.minutes)) return "—";
      if (r.minutes < 60) return `${fmt(r.minutes,0)} min`;
      const h = Math.floor(r.minutes/60);
      const m = Math.round(r.minutes%60);
      return `${h}h ${m}m`;
    })();

    $(targetId).innerHTML = `
      <div class="kpi">
        <div class="t">Active stairs</div>
        <div class="v">${cap(r.profileKey)}</div>
        <div class="s">${fmt0(r.stairsOneWay)} stairs • ${fmt(r.stairRiseIn,1)} in rise</div>
      </div>
      <div class="kpi">
        <div class="t">Flights</div>
        <div class="v">${fmt0(r.flights)}</div>
        <div class="s">Up + down</div>
      </div>
      <div class="kpi">
        <div class="t">Stairs moved</div>
        <div class="v">${fmt0(r.totalSteps)}</div>
        <div class="s">@ ${fmt0(r.stairsPerMin)} / min</div>
      </div>
      <div class="kpi">
        <div class="t">Height (${r.viewMode === "travel" ? "travel" : "ascent"})</div>
        <div class="v">${fmt(heightFt,1)} ft</div>
        <div class="s">${fmt(heightM,1)} m • ${fmt(r.stairRiseIn,1)} in/stair</div>
      </div>
      <div class="kpi">
        <div class="t">Calories (estimate)</div>
        <div class="v">${fmt(r.kcal,0)} kcal</div>
        <div class="s">Pace: ${r.intensityKey}</div>
      </div>
      <div class="kpi">
        <div class="t">Time</div>
        <div class="v">${timeStr}</div>
        <div class="s">Estimated</div>
      </div>
    `;
  }

  function renderLandmarks(){
    const r = compute();
    let html = `
      <tr>
        <th>Landmark</th>
        <th class="right">Height</th>
        <th class="right">You</th>
        <th class="right">Flights (up)</th>
      </tr>
    `;

    for (const lm of LANDMARKS_FT){
      const pct = (r.ascentFt / lm.ft) * 100;
      const flightsNeed = (r.ascentPerFlightFt > 0) ? (lm.ft / r.ascentPerFlightFt) : NaN;

      let cls = "warn";
      if (pct >= 100) cls = "ok";
      if (pct < 25) cls = "bad";

      html += `
        <tr>
          <td>${lm.name}</td>
          <td class="right">${fmt(lm.ft,0)} ft</td>
          <td class="right"><span class="${cls}">${fmt(pct,1)}%</span></td>
          <td class="right">${fmt(flightsNeed,0)}</td>
        </tr>
      `;
    }

    $("landmarks").innerHTML = html;
  }

  function statsAllTime(){
    const hist = getJSON(STORE.hist, []);
    let totalFlightsAll = 0;
    let bestAscentFt = 0;

    for (const s of hist){
      totalFlightsAll += (s.flights || 0);
      bestAscentFt = Math.max(bestAscentFt, s.ascentFt || 0);
    }

    const r = compute();
    bestAscentFt = Math.max(bestAscentFt, r.ascentFt);

    return { totalFlightsAll, bestAscentFt };
  }

  function renderAchievements(){
    const st = statsAllTime();
    let done = 0;

    const list = ACH.map(a => {
      const ok = !!a.rule(st);
      if (ok) done++;
      return `
        <div class="ach ${ok ? "done" : ""}">
          <div>
            <div class="name">${a.name}</div>
            <div class="desc">${a.desc}</div>
          </div>
          <div class="state">${ok ? "Unlocked" : "Locked"}</div>
        </div>
      `;
    }).join("");

    $("achList").innerHTML = list;
    $("achCount").textContent = `${done}/${ACH.length}`;
  }

  function renderAll(){
    ensureState();
    applyProfileUI();

    const r = compute();
    $("subtitle").textContent = `Active: ${cap(r.profileKey)} • Rise: ${fmt(r.stairRiseIn,1)} in • ${fmt0(r.stairsOneWay)} stairs`;

    renderKpis("kpisInfo");
    renderKpis("kpisSession");
    renderLandmarks();
    renderAchievements();

    saveBody();
    saveSessionFlights();
    stampSaved();
  }

  // --- profile actions
  function setActiveProfile(p){
    localStorage.setItem(STORE.active, p);
    loadStateIntoInputs();
    renderAll();
  }

  function saveToSlot(){
    const p = activeProfileKey();
    const locks = getJSON(STORE.locks, {house:false,work:false,gym:false});
    if (locks[p]){
      alert(`${cap(p)} is locked. Unlock it to save changes.`);
      return;
    }

    const profiles = getJSON(STORE.profiles, {house:{},work:{},gym:{}});
    profiles[p] = {
      stairsOneWay: clamp(Number($("stairsOneWay").value||0), 1, 500),
      stairRiseIn:  clamp(Number($("stairRiseIn").value||0), 4, 10)
    };
    setJSON(STORE.profiles, profiles);
    renderAll();
  }

  function loadFromSlot(){
    const p = activeProfileKey();
    const profiles = getJSON(STORE.profiles, {house:{},work:{},gym:{}});
    const cfg = profiles[p];

    if (!cfg || cfg.stairsOneWay == null){
      alert(`No saved stairs in ${cap(p)} yet. Enter stairs and tap “Save to active slot”.`);
      return;
    }

    $("stairsOneWay").value = cfg.stairsOneWay;
    $("stairRiseIn").value  = cfg.stairRiseIn;
    renderAll();
  }

  function clearSlot(){
    const p = activeProfileKey();
    const locks = getJSON(STORE.locks, {house:false,work:false,gym:false});
    if (locks[p]){
      alert(`${cap(p)} is locked. Unlock it to clear.`);
      return;
    }
    if (!confirm(`Clear saved stairs for ${cap(p)}?`)) return;

    const profiles = getJSON(STORE.profiles, {house:{},work:{},gym:{}});
    profiles[p] = { ...DEFAULT_PROFILE };
    setJSON(STORE.profiles, profiles);

    $("stairsOneWay").value = DEFAULT_PROFILE.stairsOneWay;
    $("stairRiseIn").value  = DEFAULT_PROFILE.stairRiseIn;
    renderAll();
  }

  function lockSlot(on){
    const p = activeProfileKey();
    const locks = getJSON(STORE.locks, {house:false,work:false,gym:false});
    locks[p] = !!on;
    setJSON(STORE.locks, locks);
    loadStateIntoInputs();
    renderAll();
  }

  // --- flights
  function addFlight(){
    const prev = clamp(Number($("flights").value||0), 0, 100000);
    localStorage.setItem(STORE.undo, String(prev));
    $("flights").value = prev + 1;
    renderAll();
  }

  function undoFlight(){
    const prev = localStorage.getItem(STORE.undo);
    if (prev === null) return;
    $("flights").value = clamp(Number(prev||0), 0, 100000);
    localStorage.removeItem(STORE.undo);
    renderAll();
  }

  function finishSession(){
    const r = compute();
    const hist = getJSON(STORE.hist, []);
    hist.unshift({
      at: new Date().toISOString(),
      profile: r.profileKey,
      flights: r.flights,
      ascentFt: r.ascentFt,
      travelFt: r.travelFt,
      kcal: r.kcal,
      stairsOneWay: r.stairsOneWay,
      stairRiseIn: r.stairRiseIn,
      pace: r.intensityKey,
      stairsPerMin: r.stairsPerMin
    });
    setJSON(STORE.hist, hist.slice(0, 200));

    $("flights").value = 0;
    setJSON(STORE.sess, { flights: 0, savedAt: new Date().toISOString() });

    renderAll();
    document.querySelector("#screen-achievements").scrollIntoView({behavior:"smooth", block:"start"});
  }

  function downloadJSON(){
    const r = compute();
    const payload = {
      app: "Stair Fitness",
      generatedAt: new Date().toISOString(),
      activeProfile: r.profileKey,
      stairs: { oneWay: r.stairsOneWay, riseIn: r.stairRiseIn },
      body: {
        weight: { st: r.weightSt, lb: r.weightLb, totalLb: r.totalLb, kg: r.kg },
        height: { ft: r.heightFt, in: r.heightIn }
      },
      session: {
        flights: r.flights,
        steps: r.totalSteps,
        ascentFt: r.ascentFt,
        travelFt: r.travelFt,
        minutes: r.minutes,
        kcal: r.kcal,
        pace: r.intensityKey,
        stairsPerMin: r.stairsPerMin
      }
    };

    const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stairs-session.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copySummary(){
    const r = compute();
    const txt =
`Stair Fitness
Active: ${cap(r.profileKey)}
Flights: ${Math.round(r.flights)}
Stairs moved: ${Math.round(r.totalSteps)}
Ascent: ${r.ascentFt.toFixed(1)} ft
Travel: ${r.travelFt.toFixed(1)} ft
Time: ${r.minutes.toFixed(0)} min
Calories (est): ${r.kcal.toFixed(0)} kcal`;

    try{
      await navigator.clipboard.writeText(txt);
      $("btnCopy").textContent = "Copied ✓";
      setTimeout(()=> $("btnCopy").textContent="Copy summary", 900);
    }catch{
      alert(txt);
    }
  }

  function resetAll(){
    if (!confirm("Reset everything (profiles, locks, sessions, achievements progress)?")) return;
    Object.values(STORE).forEach(k => localStorage.removeItem(k));
    renderAll();
    document.querySelector("#screen-info").scrollIntoView({behavior:"smooth", block:"start"});
  }

  // bottom nav scroll-jumps + active highlight
  function setupScrollNav(){
    const navButtons = [
      { id:"navInfo", sel:"#screen-info" },
      { id:"navSession", sel:"#screen-session" },
      { id:"navAch", sel:"#screen-achievements" }
    ];

    navButtons.forEach(n=>{
      const b = $(n.id);
      if (!b) return;
      b.addEventListener("click", () => {
        document.querySelector(n.sel)?.scrollIntoView({behavior:"smooth", block:"start"});
      });
    });

    const observer = new IntersectionObserver((entries)=>{
      let best = null;
      for (const e of entries){
        if (e.isIntersecting){
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
        }
      }
      if (!best) return;

      const id = best.target.id;
      $("navInfo")?.classList.toggle("on", id === "screen-info");
      $("navSession")?.classList.toggle("on", id === "screen-session");
      $("navAch")?.classList.toggle("on", id === "screen-achievements");
    }, { threshold: [0.2, 0.35, 0.5, 0.65] });

    ["screen-info","screen-session","screen-achievements"].forEach(id=>{
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

  // PWA install prompt
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $("btnInstall").hidden = false;
  });
  $("btnInstall")?.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $("btnInstall").hidden = true;
  });

  // Service worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
  }

  function bind(){
    // profile chips
    document.querySelectorAll(".chip[data-profile]").forEach(chip=>{
      chip.addEventListener("click", () => {
        const p = chip.getAttribute("data-profile");
        setActiveProfile(p);
      });
    });

    $("btnSaveSlot").addEventListener("click", saveToSlot);
    $("btnLoadSlot").addEventListener("click", loadFromSlot);
    $("btnClearSlot").addEventListener("click", clearSlot);

    $("btnLockSlot").addEventListener("click", () => lockSlot(true));
    $("btnUnlockSlot").addEventListener("click", () => lockSlot(false));

    $("btnAddFlight").addEventListener("click", addFlight);
    $("btnUndo").addEventListener("click", undoFlight);

    $("btnFinish").addEventListener("click", finishSession);
    $("btnDownload").addEventListener("click", downloadJSON);
    $("btnCopy").addEventListener("click", copySummary);

    $("btnResetAll").addEventListener("click", resetAll);

    // rerender on input changes
    [
      "stairsOneWay","stairRiseIn",
      "weightSt","weightLb","heightFt","heightIn",
      "intensity","stairsPerMin","viewMode",
      "flights"
    ].forEach(id=>{
      $(id).addEventListener("input", renderAll);
      $(id).addEventListener("change", renderAll);
    });

    setupScrollNav();
  }

  // init
  ensureState();
  bind();
  loadStateIntoInputs();
  renderAll();
})();

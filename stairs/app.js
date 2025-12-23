/* Boz’s Stairs — PWA mini app
   Screens: info / session / achievements
   Saves to localStorage
*/

(() => {
  const $ = (id) => document.getElementById(id);

  const STORE = {
    lock: "boz_stairs_lock_v3",
    cfg:  "boz_stairs_cfg_v3",
    sess: "boz_stairs_sess_v3",
    day:  "boz_stairs_day_v3",   // today’s flights
    hist: "boz_stairs_hist_v3",  // array of sessions
    undo: "boz_stairs_undo_v3"
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
    { id:"pisa", name:"Pisa Height", desc:"Your ascent equals the Leaning Tower of Pisa.", rule: s => s.bestAscentFt >= 185.9 },
    { id:"bigben", name:"Big Ben Height", desc:"Your ascent equals Big Ben.", rule: s => s.bestAscentFt >= 315.0 },
    { id:"eiffel", name:"Eiffel Height", desc:"Your ascent equals the Eiffel Tower.", rule: s => s.bestAscentFt >= 1083.0 }
  ];

  // helpers
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const fmt = (n,dp=1)=> isFinite(n) ? n.toLocaleString(undefined,{minimumFractionDigits:dp,maximumFractionDigits:dp}) : "—";
  const fmt0 = (n)=> isFinite(n) ? Math.round(n).toLocaleString() : "—";
  const getJSON = (k,d)=> { try{ return JSON.parse(localStorage.getItem(k)) ?? d }catch{ return d } };
  const setJSON = (k,v)=> localStorage.setItem(k, JSON.stringify(v));
  const todayKey = () => new Date().toISOString().slice(0,10); // YYYY-MM-DD

  const stoneToLb = (st, lb)=> (st*14) + (lb||0);
  const lbToKg = (lb)=> lb * 0.45359237;
  const inchesToFt = (inch)=> inch/12;
  const ftToM = (ft)=> ft * 0.3048;

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

    return { stairsOneWay, stairRiseIn, weightSt, weightLb, heightFt, heightIn, intensityKey, met, stairsPerMin, flights, viewMode };
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

  function refreshLock(){
    const locked = localStorage.getItem(STORE.lock) === "1";
    const badge = $("lockBadge");
    badge.textContent = locked ? "Locked" : "Not locked";
    badge.style.background = locked ? "rgba(34,197,94,.14)" : "rgba(127,255,224,.12)";
    badge.style.borderColor = locked ? "rgba(34,197,94,.28)" : "rgba(127,255,224,.18)";

    $("stairsOneWay").disabled = locked;
    $("stairRiseIn").disabled = locked;
  }

  function saveAll(){
    const r = compute();
    setJSON(STORE.cfg, { stairsOneWay:r.stairsOneWay, stairRiseIn:r.stairRiseIn });

    setJSON(STORE.sess, {
      weightSt:r.weightSt, weightLb:r.weightLb,
      heightFt:r.heightFt, heightIn:r.heightIn,
      intensity:r.intensityKey,
      stairsPerMin:r.stairsPerMin,
      viewMode:r.viewMode,
      savedAt:new Date().toISOString()
    });

    $("lastSaved").textContent = `Saved: ${new Date().toLocaleTimeString()}`;
  }

  function loadAll(){
    const cfg = getJSON(STORE.cfg, null);
    if (cfg){
      $("stairsOneWay").value = cfg.stairsOneWay ?? $("stairsOneWay").value;
      $("stairRiseIn").value  = cfg.stairRiseIn ?? $("stairRiseIn").value;
    }
    const sess = getJSON(STORE.sess, null);
    if (sess){
      $("weightSt").value = sess.weightSt ?? $("weightSt").value;
      $("weightLb").value = sess.weightLb ?? $("weightLb").value;
      $("heightFt").value = sess.heightFt ?? $("heightFt").value;
      $("heightIn").value = sess.heightIn ?? $("heightIn").value;
      $("intensity").value = sess.intensity ?? $("intensity").value;
      $("stairsPerMin").value = sess.stairsPerMin ?? $("stairsPerMin").value;
      $("viewMode").value = sess.viewMode ?? $("viewMode").value;
    }

    // today’s flight counter (so you can keep tapping during day)
    const day = getJSON(STORE.day, { key: todayKey(), flights: 0 });
    if (day.key !== todayKey()){
      setJSON(STORE.day, { key: todayKey(), flights: 0 });
      $("flights").value = 0;
    } else {
      $("flights").value = day.flights || 0;
    }

    $("sessionDate").textContent = new Date().toLocaleDateString();
    refreshLock();
    renderAll();
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
      <div class="kpi">
        <div class="t">Ascent per flight</div>
        <div class="v">${fmt(r.ascentPerFlightFt,2)} ft</div>
        <div class="s">${fmt(r.stairsOneWay,0)} stairs up</div>
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

    // include current (today) as a “live” best
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
    const r = compute();
    $("subtitle").textContent = `Rise: ${fmt(r.stairRiseIn,1)} in • ${fmt0(r.stairsOneWay)} stairs`;

    renderKpis("kpisInfo");
    renderKpis("kpisSession");
    renderLandmarks();
    renderAchievements();

    // autosave config/session inputs
    saveAll();
  }

  // Navigation (simple)
  const screens = {
    info: $("screen-info"),
    session: $("screen-session"),
    achievements: $("screen-achievements")
  };

  function nav(to){
    for (const k of Object.keys(screens)){
      screens[k].hidden = (k !== to);
      const btn = document.querySelector(`[data-nav="${k}"]`);
      if (btn) btn.classList.toggle("on", k === to);
    }
    // bottom nav highlights
    $("navInfo").classList.toggle("on", to==="info");
    $("navSession").classList.toggle("on", to==="session");
    $("navAch").classList.toggle("on", to==="achievements");
  }

  document.querySelectorAll("[data-nav]").forEach(b=>{
    b.addEventListener("click", ()=> nav(b.getAttribute("data-nav")));
  });

  // Lock / unlock
  $("btnLock").addEventListener("click", () => {
    localStorage.setItem(STORE.lock, "1");
    refreshLock();
    renderAll();
  });
  $("btnUnlock").addEventListener("click", () => {
    localStorage.setItem(STORE.lock, "0");
    refreshLock();
  });

  // Tap flights
  $("btnAddFlight").addEventListener("click", () => {
    const prev = clamp(Number($("flights").value||0), 0, 100000);
    localStorage.setItem(STORE.undo, String(prev));
    $("flights").value = prev + 1;

    // save today counter
    setJSON(STORE.day, { key: todayKey(), flights: Number($("flights").value) });

    renderAll();
  });

  $("btnUndo").addEventListener("click", () => {
    const prev = localStorage.getItem(STORE.undo);
    if (prev === null) return;
    $("flights").value = clamp(Number(prev||0), 0, 100000);
    localStorage.removeItem(STORE.undo);
    setJSON(STORE.day, { key: todayKey(), flights: Number($("flights").value) });
    renderAll();
  });

  // Manual edit flights
  $("flights").addEventListener("input", () => {
    setJSON(STORE.day, { key: todayKey(), flights: clamp(Number($("flights").value||0),0,100000) });
    renderAll();
  });

  // Finish session -> push into history, reset today flights
  $("btnFinish").addEventListener("click", () => {
    const r = compute();
    const hist = getJSON(STORE.hist, []);
    hist.unshift({
      at: new Date().toISOString(),
      flights: r.flights,
      ascentFt: r.ascentFt,
      travelFt: r.travelFt,
      kcal: r.kcal,
      stairsOneWay: r.stairsOneWay,
      stairRiseIn: r.stairRiseIn,
      pace: r.intensityKey,
      stairsPerMin: r.stairsPerMin
    });
    setJSON(STORE.hist, hist.slice(0, 200)); // keep it light

    // reset today's flights
    $("flights").value = 0;
    setJSON(STORE.day, { key: todayKey(), flights: 0 });
    renderAll();
    nav("achievements");
  });

  // Download JSON (current session)
  $("btnDownload").addEventListener("click", () => {
    const r = compute();
    const payload = {
      app: "Boz’s Stairs",
      generatedAt: new Date().toISOString(),
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
    a.download = "boz-stairs-session.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // Copy summary
  $("btnCopy").addEventListener("click", async () => {
    const r = compute();
    const txt =
`Boz’s Stairs
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
  });

  // Reset all
  $("btnResetAll").addEventListener("click", () => {
    if (!confirm("Reset everything (lock, sessions, achievements progress)?")) return;
    Object.values(STORE).forEach(k => localStorage.removeItem(k));
    // default values
    $("stairsOneWay").value = 13;
    $("stairRiseIn").value = 7.0;
    $("weightSt").value = 13.4;
    $("weightLb").value = 0;
    $("heightFt").value = 5;
    $("heightIn").value = 10;
    $("intensity").value = "general";
    $("stairsPerMin").value = 60;
    $("flights").value = 0;
    $("viewMode").value = "ascent";
    refreshLock();
    renderAll();
    nav("info");
  });

  // Input listeners
  [
    "stairsOneWay","stairRiseIn","weightSt","weightLb","heightFt","heightIn",
    "intensity","stairsPerMin","viewMode"
  ].forEach(id=>{
    $(id).addEventListener("input", renderAll);
    $(id).addEventListener("change", renderAll);
  });

  // --- PWA install prompt
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $("btnInstall").hidden = false;
  });
  $("btnInstall").addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $("btnInstall").hidden = true;
  });

  // --- Service worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
  }

  // init
  loadAll();
  nav("info");
})();

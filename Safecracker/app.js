/* ==========================================================
   SAFECRACKER — Endurance (Mobile-only)
   - Finger dial (pointer rotate)
   - Hub press = CRACK
   - Lever = OPEN
   - Exact numbers, 0–59
   - Noise 100% = caught
   - Timer resets after each correct crack
   - Steel uses 20s per tumbler, others 30s
   - Auto progression: 8 Iron → 8 Bronze → Steel forever
   - Unlock Classic Pattern Mode at 24 safes opened
   ========================================================== */

window.SC = (() => {
  const $ = (s, root=document) => root.querySelector(s);

  const K = {
    totalMoney: "sc2_totalMoney",
    totalSafes: "sc2_totalSafes",
    bestStreak: "sc2_bestStreak",
    recent: "sc2_recent",
    settings: "sc2_settings",
    run: "sc2_run"
  };

  function nowMs(){ return performance.now(); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function wrap60(n){ return ((n % 60) + 60) % 60; }
  function pad2(n){ return String(n).padStart(2,"0"); }

  function getJSON(key, def){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) return def;
      return JSON.parse(raw);
    }catch(e){ return def; }
  }
  function setJSON(key, val){
    localStorage.setItem(key, JSON.stringify(val));
  }
  function getNum(key, def=0){
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) ? v : def;
  }
  function setNum(key, val){
    localStorage.setItem(key, String(Math.floor(Math.max(0, val))));
  }

  function fmtMoney(n){ return `$${Math.floor(n).toLocaleString()}`; }

  // ===== Progression =====
  // 8 iron, 8 bronze, then steel forever
  function getCurrentSafeType(totalSafesOpened){
    if(totalSafesOpened < 8) return "iron";
    if(totalSafesOpened < 16) return "bronze";
    return "steel";
  }

  function safeSpec(type){
    // You asked: Iron 4, Bronze 6, Steel 8 (pins/tumblers)
    if(type === "iron"){
      return { type, label:"Iron", pins:4, timePer:30, reward:12 };
    }
    if(type === "bronze"){
      return { type, label:"Bronze", pins:6, timePer:30, reward:20 };
    }
    return { type:"steel", label:"Steel", pins:8, timePer:20, reward:35 };
  }

  function unlockCount(){ return 24; } // you said unlock after 24 safes
  function isPatternUnlocked(){
    return getNum(K.totalSafes, 0) >= unlockCount();
  }

  // ===== Settings =====
  function loadSettings(){
    const def = { patternEnabled:false };
    const s = getJSON(K.settings, def);
    // If not unlocked, force off.
    if(!isPatternUnlocked()) s.patternEnabled = false;
    return s;
  }
  function saveSettings(s){
    // If not unlocked, do not allow.
    if(!isPatternUnlocked()) s.patternEnabled = false;
    setJSON(K.settings, s);
  }

  // ===== Runs =====
  function newRun(){
    return {
      active:true,
      startedAt: Date.now(),
      safesCracked: 0,
      moneyEarned: 0,
      lastSafeType: getCurrentSafeType(getNum(K.totalSafes,0)),
      streakAtEnd: 0
    };
  }

  function getRun(){
    return getJSON(K.run, null);
  }
  function setRun(run){
    setJSON(K.run, run);
  }
  function endRun(reason, extra={}){
    const run = getRun();
    if(!run || !run.active) return;

    run.active = false;
    run.endedAt = Date.now();
    run.reason = reason;
    run.streakAtEnd = run.safesCracked;
    Object.assign(run, extra);

    // best streak
    const best = getNum(K.bestStreak, 0);
    if(run.safesCracked > best) setNum(K.bestStreak, run.safesCracked);

    // recent list
    const rec = getJSON(K.recent, []);
    const stamp = new Date(run.endedAt).toLocaleString();
    const line =
      `${stamp}\n`+
      `Caught: ${reason}\n`+
      `Safes: ${run.safesCracked} • Money: ${fmtMoney(run.moneyEarned)}\n`+
      `Last: ${run.lastSafeType.toUpperCase()}`;
    const out = [line, ...rec].slice(0, 12);
    setJSON(K.recent, out);

    setRun(run);
  }

  // ===== Audio (simple + safe) =====
  let ac = null;
  function armAudio(){
    if(ac) return;
    try{ ac = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){}
  }
  function tone(freq=220, dur=0.05, type="sine", gain=0.06){
    if(!ac) return;
    const t = ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t+dur+0.02);
  }
  const clickSoft = () => tone(520, 0.055, "triangle", 0.05);
  const clunk     = () => { tone(120, 0.10, "square", 0.08); tone(90, 0.12, "sine", 0.05); };
  const failBuzz  = () => tone(70,  0.17, "square", 0.085);

  // ==========================================================
  // INDEX
  // ==========================================================
  function initIndex(){
    // register SW
    try{
      if("serviceWorker" in navigator){
        navigator.serviceWorker.register("./sw.js");
      }
    }catch(e){}

    const totalMoney = getNum(K.totalMoney, 0);
    const totalSafes = getNum(K.totalSafes, 0);
    const best = getNum(K.bestStreak, 0);
    const unlocked = isPatternUnlocked();

    const safeType = getCurrentSafeType(totalSafes);
    const spec = safeSpec(safeType);

    $("#safeName").textContent = `${spec.label} Safe`;
    $("#safeMeta").textContent = `${spec.pins}-tumbler • ${spec.timePer}s per tumbler • Reward ${fmtMoney(spec.reward)} each safe`;
    $("#timeRule").textContent = `${spec.timePer}s`;

    const settings = loadSettings();
    const note = unlocked
      ? `Classic Pattern Mode unlocked — toggle available inside the safe.`
      : `Pattern Mode locked — open <b>${unlockCount()}</b> safes to unlock.`;
    $("#patternNote").innerHTML = note;

    $("#stMoney").textContent = fmtMoney(totalMoney);
    $("#stSafes").textContent = String(totalSafes);
    $("#stBest").textContent = String(best);
    $("#stUnlock").textContent = unlocked ? "Unlocked" : "Locked";

    const run = getRun();
    const hasActive = run && run.active;
    $("#btnContinue").style.display = hasActive ? "" : "none";
    $("#runCard").style.display = hasActive ? "" : "none";
    if(hasActive){
      $("#runSafes").textContent = String(run.safesCracked);
      $("#runMoney").textContent = fmtMoney(run.moneyEarned);
      $("#runSafe").textContent = String(run.lastSafeType).toUpperCase();
    }

    // recent
    const rec = getJSON(K.recent, []);
    const recentEl = $("#recent");
    recentEl.innerHTML = "";
    if(rec.length === 0){
      const d = document.createElement("div");
      d.className = "recentItem";
      d.textContent = "No runs yet. Start a run and stack money until you're caught.";
      recentEl.appendChild(d);
    }else{
      rec.forEach(t => {
        const d = document.createElement("div");
        d.className = "recentItem";
        d.textContent = t;
        recentEl.appendChild(d);
      });
    }

    // Buttons
    $("#btnStart").addEventListener("click", () => {
      armAudio();
      const r = newRun();
      setRun(r);
      location.href = "./safe.html";
    });

    $("#btnContinue").addEventListener("click", () => {
      armAudio();
      location.href = "./safe.html";
    });

    // Achievements modal
    const openAch = () => {
      const m = $("#achModal");
      m.setAttribute("aria-hidden","false");

      $("#achMoney").textContent = fmtMoney(getNum(K.totalMoney,0));
      $("#achSafes").textContent = String(getNum(K.totalSafes,0));
      $("#achBest").textContent = String(getNum(K.bestStreak,0));
      $("#achPattern").textContent = isPatternUnlocked() ? "Unlocked" : `Locked (${unlockCount()} needed)`;

      $("#patternBox").style.display = isPatternUnlocked() ? "" : "none";
    };
    const closeAch = () => $("#achModal").setAttribute("aria-hidden","true");

    $("#btnAchievements").addEventListener("click", openAch);
    $("#btnCloseAch").addEventListener("click", closeAch);
    $("#achScrim").addEventListener("click", closeAch);

    $("#btnClearHistory").addEventListener("click", () => {
      setJSON(K.recent, []);
      closeAch();
      initIndex();
    });

    $("#btnReset").addEventListener("click", () => {
      if(!confirm("Reset Safecracker stats and runs?")) return;
      localStorage.removeItem(K.totalMoney);
      localStorage.removeItem(K.totalSafes);
      localStorage.removeItem(K.bestStreak);
      localStorage.removeItem(K.recent);
      localStorage.removeItem(K.settings);
      localStorage.removeItem(K.run);
      initIndex();
    });
  }

  // ==========================================================
  // SAFE PLAY
  // ==========================================================
  function initSafe(){
    // Basic elements
    const dialEl = $("#dial");
    const dialWrap = $("#dialWrap");
    const numRead = $("#numRead");
    const prompt = $("#prompt");
    const face = $("#safeFace");
    const lever = $("#leverBtn");
    const hubBtn = $("#hubBtn");
    const hubMode = $("#hubMode");
    const dots = $("#dots");

    const uiSafe = $("#uiSafe");
    const uiPins = $("#uiPins");
    const uiProg = $("#uiProg");
    const uiTime = $("#uiTime");
    const uiNoise = $("#uiNoise");
    const uiRunMoney = $("#uiRunMoney");
    const timerPill = $("#timerPill");

    const patternToggleWrap = $("#patternToggleWrap");
    const patternToggle = $("#patternToggle");

    // Back
    $("#btnBack").addEventListener("click", () => location.href = "./index.html");

    // Mini modal
    const mini = $("#miniModal");
    const openMini = () => {
      mini.setAttribute("aria-hidden","false");
      $("#mMoney").textContent = fmtMoney(getNum(K.totalMoney,0));
      $("#mSafes").textContent = String(getNum(K.totalSafes,0));
      $("#mBest").textContent = String(getNum(K.bestStreak,0));
      $("#mPattern").textContent = isPatternUnlocked() ? "Unlocked" : `Locked (${unlockCount()} needed)`;
    };
    const closeMini = () => mini.setAttribute("aria-hidden","true");
    $("#btnAch").addEventListener("click", openMini);
    $("#btnCloseMini").addEventListener("click", closeMini);
    $("#miniScrim").addEventListener("click", closeMini);
    $("#btnEndRun").addEventListener("click", () => {
      endRun("manual end");
      location.href = "./index.html";
    });

    // Run state
    let run = getRun();
    if(!run || !run.active){
      run = newRun();
      setRun(run);
    }

    // Safe spec based on TOTAL safes opened (progression)
    const totalSafes = getNum(K.totalSafes, 0);
    const type = getCurrentSafeType(totalSafes);
    const spec = safeSpec(type);
    run.lastSafeType = type;
    setRun(run);

    // Pattern unlock UI
    const unlocked = isPatternUnlocked();
    const settings = loadSettings();
    if(unlocked){
      patternToggleWrap.style.display = "";
      patternToggle.checked = !!settings.patternEnabled;
      hubMode.textContent = settings.patternEnabled ? "PATTERN" : "SIMPLE";
      patternToggle.addEventListener("change", () => {
        const s = loadSettings();
        s.patternEnabled = !!patternToggle.checked;
        saveSettings(s);
        hubMode.textContent = s.patternEnabled ? "PATTERN" : "SIMPLE";
        showPrompt(
          s.patternEnabled
            ? "CLASSIC PATTERN ON • RIGHT/LEFT PASS RULES APPLY"
            : "SIMPLE MODE • EXACT NUMBER THEN PRESS CRACK",
          "warn"
        );
        resetForNewSafe(true);
      });
    }else{
      hubMode.textContent = "SIMPLE";
    }

    // Safe header
    $("#hdrSafe").textContent = `${spec.label} SAFE`;
    $("#hdrSub").textContent = `${spec.pins} tumblers • ${spec.timePer}s per tumbler • Noise 100% = caught`;

    uiSafe.textContent = spec.label;
    uiPins.textContent = String(spec.pins);
    uiRunMoney.textContent = fmtMoney(run.moneyEarned);

    // Combo
    function newCombo(len){
      const arr = [];
      let last = -999;
      for(let i=0;i<len;i++){
        let n = Math.floor(Math.random()*60);
        if(Math.abs(n-last) <= 1) n = wrap60(n + 7);
        arr.push(n);
        last = n;
      }
      return arr;
    }

    // PATTERN MODE rules (classic-ish)
    // We enforce the *sequence direction logic* rather than showing numbers.
    // Pattern: for step 0 (first number) -> must be approached with RIGHT turns.
    // step 1 -> must be approached with LEFT and must have "passed" step0 at least once.
    // step 2 -> RIGHT, passed step1, etc...
    //
    // This keeps the mechanic real without needing 3 full spins constraints.
    function requiredDirForStep(step){
      // step 0: right, 1: left, 2: right, alternating
      return (step % 2 === 0) ? "right" : "left";
    }

    // Game state
    const S = {
      number: 0,
      angleDeg: 0,
      combo: [],
      step: 0,

      // timer per tumbler
      timeLimit: spec.timePer,
      timeLeft: spec.timePer,

      // noise
      noise: 0,

      // dial dragging
      dragging: false,
      lastPointerAngle: 0,
      lastDragTime: 0,

      // pattern tracking
      patternEnabled: unlocked && loadSettings().patternEnabled,
      lastMoveDir: "right",
      passedFlag: false, // becomes true when you move away/past after previous step
      lastCommittedNumber: null,

      // state flags
      locked: false,     // if caught or during open animation
      opened: false
    };

    function showPrompt(text, kind){
      prompt.classList.remove("good","bad","warn");
      if(kind) prompt.classList.add(kind);
      prompt.textContent = text;
    }

    function buildDots(){
      dots.innerHTML = "";
      for(let i=0;i<spec.pins;i++){
        const d = document.createElement("div");
        d.className = "dot" + (i < S.step ? " on" : "");
        dots.appendChild(d);
      }
      uiProg.textContent = `${S.step}/${spec.pins}`;
    }

    function setTimerUI(){
      const s = Math.max(0, Math.ceil(S.timeLeft));
      const m = Math.floor(s/60);
      const r = s % 60;
      uiTime.textContent = `${pad2(m)}:${pad2(r)}`;

      timerPill.classList.remove("bad","warn");
      const pct = S.timeLeft / S.timeLimit;
      if(pct <= 0.25) timerPill.classList.add("bad");
      else if(pct <= 0.45) timerPill.classList.add("warn");
    }

    function setNoiseUI(){
      uiNoise.textContent = `${Math.round(S.noise)}%`;
    }

    function setDialByAngle(deg){
      S.angleDeg = deg;
      dialEl.style.transform = `rotate(${deg}deg)`;

      // Convert angle to number: 0–59
      // We treat 0 at top. Our needle is at top.
      // Angle increases clockwise as deg increases (CSS rotate).
      const normalized = ((deg % 360) + 360) % 360;       // 0..359
      const num = wrap60(Math.round(normalized / 6));     // 360/60=6 deg
      S.number = num;
      numRead.textContent = pad2(num);
    }

    function setDialNumber(num){
      // map number to angle. Each number = 6deg.
      setDialByAngle(num * 6);
    }

    function enableLever(on){
      if(on){
        lever.classList.remove("disabled");
        lever.disabled = false;
      }else{
        lever.classList.add("disabled");
        lever.disabled = true;
      }
    }

    function caught(reason){
      if(S.locked) return;
      S.locked = true;
      failBuzz();
      showPrompt(`CAUGHT • ${reason.toUpperCase()}`, "bad");
      endRun(reason, { lastSafeType: spec.type });

      setTimeout(()=> location.href = "./index.html", 850);
    }

    function resetPerTumblerTimer(){
      S.timeLimit = spec.timePer;
      S.timeLeft = spec.timePer;
      setTimerUI();
    }

    function resetForNewSafe(fromToggle=false){
      // reset safe internals for a new attempt
      S.combo = newCombo(spec.pins);
      S.step = 0;
      S.passedFlag = false;
      S.lastCommittedNumber = null;
      S.opened = false;
      S.locked = false;
      resetPerTumblerTimer();
      enableLever(false);
      face.classList.remove("open");
      buildDots();

      const s = loadSettings();
      S.patternEnabled = isPatternUnlocked() && !!s.patternEnabled;
      hubMode.textContent = S.patternEnabled ? "PATTERN" : "SIMPLE";

      // Start at random
      setDialNumber(Math.floor(Math.random()*60));

      if(fromToggle){
        showPrompt("SAFE RESET • NEW COMBINATION", "warn");
      }else{
        showPrompt("SPIN THE DIAL • PRESS HUB TO CRACK", "warn");
      }
    }

    // ===== Input: dial rotate by finger =====
    function pointerAngleFromCenter(ev){
      const rect = dialWrap.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      const x = ev.clientX - cx;
      const y = ev.clientY - cy;

      // angle with 0 at top:
      const a = Math.atan2(y, x); // -pi..pi, 0 at right
      const deg = (a * 180/Math.PI) + 90; // shift so 0 is top
      return deg;
    }

    function onPointerDown(ev){
      if(S.locked) return;
      armAudio();
      dialEl.setPointerCapture(ev.pointerId);
      S.dragging = true;
      S.lastPointerAngle = pointerAngleFromCenter(ev);
      S.lastDragTime = nowMs();
    }

    function onPointerMove(ev){
      if(!S.dragging || S.locked) return;

      const a = pointerAngleFromCenter(ev);
      let delta = a - S.lastPointerAngle;

      // wrap deltas around 180 to avoid huge jumps
      if(delta > 180) delta -= 360;
      if(delta < -180) delta += 360;

      // determine direction (clockwise = right)
      if(delta > 0) S.lastMoveDir = "right";
      else if(delta < 0) S.lastMoveDir = "left";

      // Apply angle change (direct)
      const newAngle = S.angleDeg + delta;
      setDialByAngle(newAngle);

      // Noise model:
      // louder when spinning fast (deg per second).
      const t = nowMs();
      const dt = Math.max(1, t - S.lastDragTime); // ms
      const speed = Math.abs(delta) / (dt/1000);  // deg/s

      // base sensitivity per safe
      const sens = (spec.type === "steel") ? 0.020 : (spec.type === "bronze") ? 0.018 : 0.016;
      // Speed contributes noise; slow rotations are safer
      const add = clamp((speed - 90) * sens, 0, 2.8); // below ~90deg/s ~ minimal noise
      if(add > 0){
        S.noise = clamp(S.noise + add, 0, 100);
        setNoiseUI();
        if(S.noise >= 100){
          caught("noise");
          return;
        }
      }

      // tiny scrape sound occasionally (kept subtle)
      if(Math.random() < 0.06) tone(260, 0.02, "sawtooth", 0.016);

      S.lastPointerAngle = a;
      S.lastDragTime = t;
    }

    function onPointerUp(ev){
      if(!S.dragging) return;
      S.dragging = false;

      // Snap to exact number angle
      const snapped = S.number * 6;
      setDialByAngle(snapped);

      // Click when landing (subtle)
      clickSoft();
    }

    dialEl.addEventListener("pointerdown", onPointerDown);
    dialEl.addEventListener("pointermove", onPointerMove);
    dialEl.addEventListener("pointerup", onPointerUp);
    dialEl.addEventListener("pointercancel", onPointerUp);

    // ===== Crack logic =====
    function canCommitInPattern(){
      // Must be correct direction for this step
      const req = requiredDirForStep(S.step);
      if(S.lastMoveDir !== req) return false;

      // Must have "passed" since last commit to prevent just tapping repeatedly
      // For step 0 we allow immediate.
      if(S.step === 0) return true;
      return S.passedFlag;
    }

    function updatePassedFlag(){
      // If we moved away from last committed number, set passedFlag true.
      if(S.lastCommittedNumber === null) return;
      if(S.number !== S.lastCommittedNumber) S.passedFlag = true;
    }

    // update passed flag anytime number changes (cheap)
    const observer = new MutationObserver(() => updatePassedFlag());
    observer.observe(numRead, { childList:true });

    function doCrack(){
      if(S.locked) return;
      armAudio();

      // exact match only
      const target = S.combo[S.step];
      const exact = (S.number === target);

      if(!exact){
        failBuzz();
        S.noise = clamp(S.noise + 8, 0, 100); // mistakes are loud
        setNoiseUI();
        face.classList.add("shake");
        setTimeout(()=> face.classList.remove("shake"), 160);
        showPrompt("WRONG • EXACT NUMBER REQUIRED", "bad");
        if(S.noise >= 100) caught("noise");
        return;
      }

      // If pattern enabled, enforce direction/past rule
      if(S.patternEnabled){
        if(!canCommitInPattern()){
          failBuzz();
          S.noise = clamp(S.noise + 6, 0, 100);
          setNoiseUI();
          showPrompt(`PATTERN FAIL • MUST TURN ${requiredDirForStep(S.step).toUpperCase()} THEN PASS`, "bad");
          if(S.noise >= 100) caught("noise");
          return;
        }
      }

      // success
      clunk();
      S.step++;
      S.lastCommittedNumber = S.number;
      S.passedFlag = false;

      buildDots();
      resetPerTumblerTimer();

      if(S.step >= spec.pins){
        enableLever(true);
        showPrompt("LOCK READY • PULL THE LEVER TO OPEN", "good");
      }else{
        showPrompt(`TUMBLER SET • ${S.step}/${spec.pins}`, "good");
        // nudge player for pattern
        if(S.patternEnabled){
          const req = requiredDirForStep(S.step);
          showPrompt(`TUMBLER SET • NOW TURN ${req.toUpperCase()} AND PASS`, "warn");
        }
      }
    }

    hubBtn.addEventListener("pointerdown", () => armAudio());
    hubBtn.addEventListener("click", () => doCrack());

    // ===== Open logic =====
    function doOpen(){
      if(S.locked || S.step < spec.pins) return;
      armAudio();

      S.locked = true;
      enableLever(false);
      clunk();

      // door open anim
      face.classList.add("open");
      showPrompt("SAFE OPENED • TAKE THE HAUL", "good");

      // Award money + progression
      const reward = spec.reward;
      run = getRun();
      if(run && run.active){
        run.safesCracked += 1;
        run.moneyEarned += reward;
        run.lastSafeType = spec.type;
        setRun(run);
      }

      setNum(K.totalMoney, getNum(K.totalMoney,0) + reward);
      setNum(K.totalSafes, getNum(K.totalSafes,0) + 1);
      uiRunMoney.textContent = fmtMoney(getRun().moneyEarned);

      // After a short open display, load next safe (progression might change)
      setTimeout(() => {
        // Re-evaluate safe type (because totalSafes changed)
        location.href = "./safe.html";
      }, 950);
    }

    lever.addEventListener("pointerdown", () => armAudio());
    lever.addEventListener("click", doOpen);

    // ===== Timer + noise decay loop =====
    let last = nowMs();
    function loop(t){
      const dt = (t - last);
      last = t;

      if(!S.locked){
        // timer decreases always in endurance
        S.timeLeft -= dt/1000;
        if(S.timeLeft <= 0){
          S.timeLeft = 0;
          setTimerUI();
          caught("time");
          return;
        }
        setTimerUI();

        // noise decays slowly when you stop moving
        const decay = (spec.type === "steel") ? 0.022 : 0.026; // steel is tenser
        S.noise = Math.max(0, S.noise - decay * (dt/1000) * 10);
        setNoiseUI();
      }

      requestAnimationFrame(loop);
    }

    // Tiny shake animation class
    const style = document.createElement("style");
    style.textContent = `
      .shake{ animation: shake .18s linear; }
      @keyframes shake{
        0%{transform:translate(0,0);}
        25%{transform:translate(-2px,1px);}
        50%{transform:translate(2px,-1px);}
        75%{transform:translate(-1px,-2px);}
        100%{transform:translate(0,0);}
      }
    `;
    document.head.appendChild(style);

    // First init
    // set UI based on current spec
    uiSafe.textContent = spec.label;
    uiPins.textContent = String(spec.pins);
    timerPill.classList.add("warn");
    setNoiseUI();

    // update rule note
    const rule = S.patternEnabled
      ? "Classic Pattern • exact number + direction rules"
      : "Simple Mode • exact number then press CRACK";
    $("#ruleNote").textContent = `${rule} • Noise 100% = caught`;

    // show toggle only when unlocked
    if(isPatternUnlocked()){
      patternToggleWrap.style.display = "";
      patternToggle.checked = !!loadSettings().patternEnabled;
    }

    // Start safe
    resetForNewSafe(false);

    // run HUD
    uiRunMoney.textContent = fmtMoney(getRun().moneyEarned);

    // time pill baseline
    setTimerUI();

    // start loop
    requestAnimationFrame(loop);

    // iOS audio arm
    window.addEventListener("pointerdown", armAudio, { once:true });
  }

  return { initIndex, initSafe };
})();

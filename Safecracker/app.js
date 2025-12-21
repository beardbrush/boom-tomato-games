/* ==========================================================
   SAFECRACKER — Endurance (Real Dial Logic)
   - Detent click on every number
   - Gate click ONLY on exact pin
   - No visual indication
   ========================================================== */

window.SC = (() => {
  const $ = (s, r=document) => r.querySelector(s);

  const K = {
    totalMoney: "sc2_totalMoney",
    totalSafes: "sc2_totalSafes",
    bestStreak: "sc2_bestStreak",
    recent: "sc2_recent",
    settings: "sc2_settings",
    run: "sc2_run"
  };

  const wrap60 = n => ((n % 60) + 60) % 60;
  const pad2 = n => String(n).padStart(2,"0");
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

  function getJSON(k,d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d }catch{ return d } }
  function setJSON(k,v){ localStorage.setItem(k,JSON.stringify(v)) }
  function getNum(k,d=0){ const n=+localStorage.getItem(k); return Number.isFinite(n)?n:d }
  function setNum(k,v){ localStorage.setItem(k,Math.floor(v)) }

  /* ===================== AUDIO ===================== */
  let ac=null;
  function armAudio(){
    if(!ac) ac=new (window.AudioContext||window.webkitAudioContext)();
  }
  function tone(freq,dur,type,gain){
    if(!ac) return;
    const t=ac.currentTime;
    const o=ac.createOscillator();
    const g=ac.createGain();
    o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(gain,t+.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t+dur+.02);
  }

  const detentClick = ()=>tone(420,0.018,"triangle",0.035); // every number
  const gateClick   = ()=>tone(620,0.055,"triangle",0.065); // exact pin
  const clunk       = ()=>tone(110,0.12,"square",0.08);
  const failBuzz    = ()=>tone(70,0.16,"square",0.085);

  /* ===================== RUN / STATS ===================== */
  function getRun(){
    return getJSON(K.run, { money: 0, streak: 0 });
  }
  function setRun(r){
    setJSON(K.run, r);
  }

  function fmtMoney(n){
    const v = Math.max(0, Math.floor(n || 0));
    return "$" + v.toString();
  }

  function openMiniModal(){
    const modal = $("#miniModal");
    if(!modal) return;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden","false");

    const totalMoney = getNum(K.totalMoney,0);
    const totalSafes = getNum(K.totalSafes,0);
    const bestStreak = getNum(K.bestStreak,0);

    const settings = getJSON(K.settings, { patternUnlocked:false });
    $("#mMoney") && ($("#mMoney").textContent = fmtMoney(totalMoney));
    $("#mSafes") && ($("#mSafes").textContent = String(totalSafes));
    $("#mBest")  && ($("#mBest").textContent  = String(bestStreak));
    $("#mPattern") && ($("#mPattern").textContent = settings.patternUnlocked ? "Unlocked" : "Locked");
  }

  function closeMiniModal(){
    const modal = $("#miniModal");
    if(!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden","true");
  }

  function endRunToIndex(){
    // Reset run state
    setRun({ money: 0, streak: 0 });
    // Go back to index
    location.href = "./index.html";
  }

  /* ===================== SAFE ===================== */
  function initSafe(){
    // Header + UI fields
    const hdrSafe = $("#hdrSafe");
    const hdrSub  = $("#hdrSub");

    const uiSafe  = $("#uiSafe");
    const uiPins  = $("#uiPins");
    const uiProg  = $("#uiProg");
    const uiTime  = $("#uiTime");
    const uiNoise = $("#uiNoise");
    const uiRunMoney = $("#uiRunMoney");
    const timerPill = $("#timerPill");

    // Safe elements
    const dial = $("#dial");
    const dialWrap = $("#dialWrap");
    const numRead = $("#numRead");
    const hub = $("#hubBtn");
    const lever = $("#leverBtn");
    const prompt = $("#prompt");
    const face = $("#safeFace");

    // Top buttons / modal wiring
    const btnBack = $("#btnBack");
    const btnAch = $("#btnAch");
    const btnCloseMini = $("#btnCloseMini");
    const miniScrim = $("#miniScrim");
    const btnEndRun = $("#btnEndRun");

    btnBack && btnBack.addEventListener("click", () => (location.href = "./index.html"));
    btnAch && btnAch.addEventListener("click", openMiniModal);
    btnCloseMini && btnCloseMini.addEventListener("click", closeMiniModal);
    miniScrim && miniScrim.addEventListener("click", closeMiniModal);
    btnEndRun && btnEndRun.addEventListener("click", endRunToIndex);

    // Basic identity
    const SAFE_NAME = "Endurance";
    hdrSafe && (hdrSafe.textContent = "SAFE");
    hdrSub && (hdrSub.textContent = "Endurance");
    uiSafe && (uiSafe.textContent = SAFE_NAME);

    // Endurance setup
    let combo = Array.from({length:6},()=>Math.floor(Math.random()*60));
    let step = 0;

    let number = 0;
    let angle = 0;
    let lastGateFired = false;
    let locked = false;

    // Timer + Noise
    let timeLeft = 30.0;              // seconds
    let noise = 0;                    // 0..100
    let lastTick = performance.now();
    let rafId = 0;

    // Track dial speed to drive noise
    let lastAngleForSpeed = 0;
    let lastSpeedT = performance.now();

    // Run money UI (from storage)
    const run = getRun();
    uiRunMoney && (uiRunMoney.textContent = fmtMoney(run.money));

    function setOpenEnabled(on){
      if(!lever) return;
      lever.disabled = !on;
      lever.classList.toggle("disabled", !on);
      lever.classList.toggle("ready", !!on); // safe even if CSS doesn't have it
    }

    function updateTopUI(){
      uiPins && (uiPins.textContent = String(combo.length));
      uiProg && (uiProg.textContent = `${step}/${combo.length}`);
      uiTime && (uiTime.textContent = `00:${pad2(Math.max(0, Math.ceil(timeLeft)))}`);
      uiNoise && (uiNoise.textContent = `${Math.floor(noise)}%`);

      // Optional urgency styling (uses your .warn pill already)
      if(timerPill){
        if(timeLeft <= 10) timerPill.classList.add("warn");
        // keep it warn always if your CSS expects it; we won’t remove.
      }
    }

    function gameOver(msg){
      if(locked) return;
      locked = true;
      failBuzz();
      prompt && (prompt.textContent = msg);
      setOpenEnabled(false);
      // You can add a class for visuals if your CSS supports it
      face && face.classList.add("failed");
    }

    function winOpen(){
      if(locked) return;
      locked = true;
      clunk();
      face && face.classList.add("open");
      prompt && (prompt.textContent = "SAFE OPENED");

      // Update totals
      const reward = 10 + combo.length * 5; // simple reward; tweak later
      const totalMoney = getNum(K.totalMoney,0) + reward;
      const totalSafes = getNum(K.totalSafes,0) + 1;

      setNum(K.totalMoney, totalMoney);
      setNum(K.totalSafes, totalSafes);

      const r = getRun();
      r.money = (r.money||0) + reward;
      r.streak = (r.streak||0) + 1;
      setRun(r);

      setNum(K.bestStreak, Math.max(getNum(K.bestStreak,0), r.streak));

      uiRunMoney && (uiRunMoney.textContent = fmtMoney(r.money));

      // Small delay then back to index (keeps it snappy on mobile)
      setTimeout(() => {
        location.href = "./index.html";
      }, 650);
    }

    function tick(){
      if(locked){
        cancelAnimationFrame(rafId);
        return;
      }
      const now = performance.now();
      const dt = (now - lastTick) / 1000;
      lastTick = now;

      timeLeft -= dt;
      if(timeLeft <= 0){
        timeLeft = 0;
        updateTopUI();
        gameOver("TIME UP • SAFE LOCKED");
        return;
      }

      // Noise decay very slightly if you stop spinning
      noise = clamp(noise - dt * 1.5, 0, 100);

      // Noise fail
      if(noise >= 100){
        noise = 100;
        updateTopUI();
        gameOver("TOO LOUD • SAFE LOCKED");
        return;
      }

      updateTopUI();
      rafId = requestAnimationFrame(tick);
    }

    function setDialByAngle(deg){
      angle = deg;
      dial.style.transform = `rotate(${deg}deg)`;

      const n = wrap60(Math.round(((deg%360)+360)%360 / 6));
      if(n !== number){
        number = n;
        numRead && (numRead.textContent = pad2(n));

        // DETENT CLICK — every number
        detentClick();

        // Add noise per detent: higher if spinning quickly
        const now = performance.now();
        const dA = Math.abs(angle - lastAngleForSpeed);
        const dT = Math.max(1, now - lastSpeedT); // ms
        const speed = dA / dT; // deg per ms (tiny numbers)
        // Scale into something usable
        noise = clamp(noise + (1.2 + speed * 120), 0, 100);

        lastAngleForSpeed = angle;
        lastSpeedT = now;

        // reset gate latch when leaving number
        lastGateFired = false;
      }

      // GATE CLICK — exact pin, once per entry
      if(number === combo[step] && !lastGateFired){
        gateClick();
        lastGateFired = true;
      }
    }

    function pointerAngle(ev){
      const r = dialWrap.getBoundingClientRect();
      const cx = r.left + r.width/2, cy = r.top + r.height/2;
      return Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180/Math.PI + 90;
    }

    let dragging=false, lastA=0;
    dial.addEventListener("pointerdown",e=>{
      if(locked) return;
      armAudio();
      dragging=true;
      lastA=pointerAngle(e);
      dial.setPointerCapture(e.pointerId);
    });

    dial.addEventListener("pointermove",e=>{
      if(!dragging || locked) return;
      const a = pointerAngle(e);
      let d = a - lastA;
      if(d > 180) d -= 360;
      if(d < -180) d += 360;
      setDialByAngle(angle + d);
      lastA = a;
    });

    dial.addEventListener("pointerup",()=>{
      dragging=false;
      // snap cleanly
      setDialByAngle(number * 6);
    });

    /* ===== HUB COMMIT ===== */
    hub.addEventListener("click",()=>{
      if(locked) return;
      armAudio();

      if(number !== combo[step]){
        failBuzz();
        prompt && (prompt.textContent="WRONG • KEEP LISTENING");
        // penalty noise spike for wrong commit
        noise = clamp(noise + 8, 0, 100);
        updateTopUI();
        return;
      }

      clunk();
      step++;
      lastGateFired = false;

      if(step >= combo.length){
        prompt && (prompt.textContent="ALL TUMBLERS SET • OPEN");
        setOpenEnabled(true);
      }else{
        prompt && (prompt.textContent=`TUMBLER SET • ${step}/${combo.length}`);
      }

      updateTopUI();
    });

    /* ===== OPEN ===== */
    lever.addEventListener("click",()=>{
      if(step < combo.length || locked) return;
      winOpen();
    });

    // Init state
    setOpenEnabled(false);
    setDialByAngle(Math.random() * 360);

    prompt && (prompt.textContent="SPIN • LISTEN FOR THE GATE");
    updateTopUI();

    // Start tick loop
    lastTick = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  return { initSafe };
})();

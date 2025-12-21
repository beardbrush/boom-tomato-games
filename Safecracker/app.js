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

  /* ===================== SAFE ===================== */
  function initSafe(){
    const dial = $("#dial");
    const dialWrap = $("#dialWrap");
    const numRead = $("#numRead");
    const hub = $("#hubBtn");
    const lever = $("#leverBtn");
    const prompt = $("#prompt");
    const face = $("#safeFace");

    let combo = Array.from({length:6},()=>Math.floor(Math.random()*60));
    let step = 0;
    let number = 0;
    let angle = 0;
    let lastDetent = null;
    let lastGateFired = false;
    let locked = false;

    function setDialByAngle(deg){
      angle = deg;
      dial.style.transform = `rotate(${deg}deg)`;

      const n = wrap60(Math.round(((deg%360)+360)%360 / 6));
      if(n !== number){
        number = n;
        numRead.textContent = pad2(n);

        // DETENT CLICK — every number
        detentClick();

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
      const r=dialWrap.getBoundingClientRect();
      const cx=r.left+r.width/2, cy=r.top+r.height/2;
      return Math.atan2(ev.clientY-cy, ev.clientX-cx)*180/Math.PI + 90;
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
      if(!dragging||locked) return;
      const a=pointerAngle(e);
      let d=a-lastA;
      if(d>180)d-=360;
      if(d<-180)d+=360;
      setDialByAngle(angle+d);
      lastA=a;
    });

    dial.addEventListener("pointerup",()=>{
      dragging=false;
      setDialByAngle(number*6); // snap cleanly
    });

    /* ===== HUB COMMIT ===== */
    hub.addEventListener("click",()=>{
      if(locked) return;
      armAudio();

      if(number !== combo[step]){
        failBuzz();
        prompt.textContent="WRONG • KEEP LISTENING";
        return;
      }

      clunk();
      step++;
      lastGateFired=false;

      if(step >= combo.length){
        prompt.textContent="ALL TUMBLERS SET • OPEN";
        lever.disabled=false;
        lever.classList.remove("disabled");
      }else{
        prompt.textContent=`TUMBLER SET • ${step}/${combo.length}`;
      }
    });

    /* ===== OPEN ===== */
    lever.addEventListener("click",()=>{
      if(step < combo.length || locked) return;
      locked=true;
      clunk();
      face.classList.add("open");
      prompt.textContent="SAFE OPENED";
    });

    setDialByAngle(Math.random()*360);
    prompt.textContent="SPIN • LISTEN FOR THE GATE";
    lever.disabled=true;
  }

  return { initSafe };
})();

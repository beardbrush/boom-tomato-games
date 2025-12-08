// Simple Notan + Pencil + Vintage web tool
const imageInput = document.getElementById("image-input");
const baseCanvas = document.getElementById("base-canvas");
const displayCanvas = document.getElementById("display-canvas");
const notanThresholdInput = document.getElementById("notan-threshold");
const pencilContrastInput = document.getElementById("pencil-contrast");
const vintageStrengthInput = document.getElementById("vintage-strength");
const modeButtons = document.querySelectorAll(".mode-btn");
const downloadBtn = document.getElementById("download-btn");

const notanControls = document.getElementById("notan-controls");
const pencilControls = document.getElementById("pencil-controls");
const vintageControls = document.getElementById("vintage-controls");

let currentMode = "original";
let baseLoaded = false;

const baseCtx = baseCanvas.getContext("2d");
const displayCtx = displayCanvas.getContext("2d");

// --- Vintage palettes ---

// Reeves 5-colour set (simple vintage)
const VINTAGE_PALETTE_5 = [
  { r: 242, g: 206, b: 121 }, // Yellow Ochre – highlight / paper
  { r: 201, g: 132, b: 76  }, // Burnt Sienna – warm mid
  { r: 140, g: 96,  b: 64  }, // Raw Umber – deeper mid
  { r: 92,  g: 62,  b: 42  }, // Sepia – warm shadow
  { r: 32,  g: 47,  b: 79  }  // Indigo – cool deep shadow
];

// Pro "Baseball Card" palette – warm, cream & orange, blue only in deepest shadows
const VINTAGE_PALETTE_PRO = [
  { name: "Buff Titanium",   r: 235, g: 222, b: 202 }, // 0 – cream paper
  { name: "Naples Yellow",   r: 241, g: 211, b: 155 }, // 1 – warm highlight
  { name: "Yellow Ochre",    r: 214, g: 164, b:  77 }, // 2 – light mid
  { name: "Raw Sienna",      r: 201, g: 138, b:  59 }, // 3 – mid
  { name: "Burnt Sienna",    r: 166, g:  90, b:  50 }, // 4 – warm shadow
  { name: "Venetian Red",    r: 166, g:  72, b:  62 }, // 5 – red/orange accents
  { name: "Burnt Umber",     r: 122, g:  75, b:  50 }, // 6 – deep brown shadow
  { name: "Indigo Shadow",   r:  32, g:  47, b:  79 }  // 7 – only the darkest lines
];

imageInput.addEventListener("change", handleImageUpload);

modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    modeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;
    updateVisibleControls();
    if (baseLoaded) {
      renderCurrentMode();
    }
  });
});

notanThresholdInput.addEventListener("input", () => {
  if (currentMode === "notan" && baseLoaded) renderCurrentMode();
});

pencilContrastInput.addEventListener("input", () => {
  if (currentMode === "pencil" && baseLoaded) renderCurrentMode();
});

vintageStrengthInput.addEventListener("input", () => {
  if ((currentMode === "vintage" || currentMode === "vintage_pro") && baseLoaded) {
    renderCurrentMode();
  }
});

downloadBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `boom-notan-${currentMode}.png`;
  link.href = displayCanvas.toDataURL("image/png");
  link.click();
});

function updateVisibleControls() {
  notanControls.style.display = currentMode === "notan" ? "block" : "none";
  pencilControls.style.display = currentMode === "pencil" ? "block" : "none";
  // Show the vintage slider for BOTH vintage modes
  vintageControls.style.display =
    currentMode === "vintage" || currentMode === "vintage_pro" ? "block" : "none";
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = () => {
    const maxWidth = 1000;
    const scale = img.width > maxWidth ? maxWidth / img.width : 1;
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    baseCanvas.width = w;
    baseCanvas.height = h;
    displayCanvas.width = w;
    displayCanvas.height = h;

    baseCtx.clearRect(0, 0, w, h);
    baseCtx.drawImage(img, 0, 0, w, h);

    baseLoaded = true;
    downloadBtn.disabled = false;
    renderCurrentMode();
  };
  img.src = URL.createObjectURL(file);
}

// --- Rendering modes ---

function renderCurrentMode() {
  switch (currentMode) {
    case "notan":
      applyNotan();
      break;
    case "pencil":
      applyPencil();
      break;
    case "vintage":        // simple 5-colour Reeves
      applyVintageSimple();
      break;
    case "vintage_pro":    // baseball-card pro palette
      applyVintagePro();
      break;
    default:
      drawOriginal();
  }
}

function drawOriginal() {
  const w = baseCanvas.width;
  const h = baseCanvas.height;
  displayCtx.clearRect(0, 0, w, h);
  displayCtx.drawImage(baseCanvas, 0, 0);
}

// Convert to grayscale
function getGrayscaleData() {
  const w = baseCanvas.width;
  const h = baseCanvas.height;
  const srcData = baseCtx.getImageData(0, 0, w, h);
  const data = srcData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i] = data[i + 1] = data[i + 2] = lum;
  }

  return srcData;
}

function applyNotan() {
  const threshold = parseInt(notanThresholdInput.value, 10);
  const w = baseCanvas.width;
  const h = baseCanvas.height;
  const grayImage = getGrayscaleData();
  const data = grayImage.data;

  for (let i = 0; i < data.length; i += 4) {
    const v = data[i];
    const tone = v < threshold ? 20 : 235; // almost black vs almost white
    data[i] = data[i + 1] = data[i + 2] = tone;
  }

  displayCtx.putImageData(grayImage, 0, 0);
}

function applyPencil() {
  const contrast = parseInt(pencilContrastInput.value, 10); // 0–200
  const w = baseCanvas.width;
  const h = baseCanvas.height;
  const grayImage = getGrayscaleData();
  const data = grayImage.data;

  // simple contrast boost
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    let v = data[i];
    v = factor * (v - 128) + 128;
    if (v < 0) v = 0;
    if (v > 255) v = 255;
    data[i] = data[i + 1] = data[i + 2] = v;
  }

  // quick edge emphasis: blend with a slightly shifted version
  const copy = new Uint8ClampedArray(data);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const left = copy[i - 4];
      const right = copy[i + 4];
      const up = copy[i - w * 4];
      const down = copy[i + w * 4];
      const edge = Math.abs(left - right) + Math.abs(up - down);
      const v = Math.max(0, 255 - edge * 0.7); // bright paper, dark edges
      data[i] = data[i + 1] = data[i + 2] = v;
    }
  }

  displayCtx.putImageData(grayImage, 0, 0);
}

// --- Vintage A: simple Reeves 5-colour version ---

function applyVintageSimple() {
  if (!baseLoaded) return;

  const strength = parseInt(vintageStrengthInput.value, 10) / 100; // 0–1
  const w = baseCanvas.width;
  const h = baseCanvas.height;

  const src = baseCtx.getImageData(0, 0, w, h);
  const data = src.data;

  const T0 = 60;
  const T1 = 105;
  const T2 = 150;
  const T3 = 195;

  // grayscale + edge map
  const grayBuf = new Uint8ClampedArray(w * h);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    grayBuf[i / 4] = gray;
  }

  const edgeBuf = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const g0 = grayBuf[idx];

      const gx = x < w - 1 ? grayBuf[idx + 1] : g0;
      const gy = y < h - 1 ? grayBuf[idx + w] : g0;

      const edge = Math.abs(g0 - gx) + Math.abs(g0 - gy);
      edgeBuf[idx] = edge;
    }
  }

  for (let y = 0; y < h; y++) {
    const washFactor = 1 + 0.06 * Math.sin((y / h) * Math.PI * 2);

    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const di = idx * 4;

      const r0 = data[di];
      const g0 = data[di + 1];
      const b0 = data[di + 2];

      const gray = grayBuf[idx];

      let pIndex;
      if (gray < T0) {
        pIndex = 4;      // darkest → Indigo
      } else if (gray < T1) {
        pIndex = 3;      // dark → Sepia
      } else if (gray < T2) {
        pIndex = 2;      // mid → Raw Umber
      } else if (gray < T3) {
        pIndex = 1;      // light mid → Burnt Sienna
      } else {
        pIndex = 0;      // highlight → Yellow Ochre
      }

      const p = VINTAGE_PALETTE_5[pIndex];

      let r = lerp(r0, p.r * washFactor, strength);
      let g = lerp(g0, p.g * washFactor, strength);
      let b = lerp(b0, p.b * washFactor, strength);

      const edge = edgeBuf[idx];
      const edgeNorm = Math.min(edge / 255, 1);
      const lineStrength = 0.6;
      const lineDarken = 1 - edgeNorm * lineStrength;
      r *= lineDarken;
      g *= lineDarken;
      b *= lineDarken;

      const noise = (Math.random() - 0.5) * 10; // -5..+5
      r += noise;
      g += noise;
      b += noise;

      data[di]     = clamp(r);
      data[di + 1] = clamp(g);
      data[di + 2] = clamp(b);
      data[di + 3] = 255;
    }
  }

  displayCtx.putImageData(src, 0, 0);
}

// --- Vintage B: 8-colour "Baseball Card" palette ---

function applyVintagePro() {
  if (!baseLoaded) return;

  const strength = parseInt(vintageStrengthInput.value, 10) / 100; // 0–1
  const w = baseCanvas.width;
  const h = baseCanvas.height;

  const src = baseCtx.getImageData(0, 0, w, h);
  const data = src.data;

  // cream paper tint for light areas
  const PAPER_TINT = { r: 235, g: 222, b: 202 };

  // grayscale + edge map
  const grayBuf = new Uint8ClampedArray(w * h);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    grayBuf[i / 4] = gray;
  }

  const edgeBuf = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const g0 = grayBuf[idx];
      const gx = x < w - 1 ? grayBuf[idx + 1] : g0;
      const gy = y < h - 1 ? grayBuf[idx + w] : g0;
      const edge = Math.abs(g0 - gx) + Math.abs(g0 - gy);
      edgeBuf[idx] = edge;
    }
  }

  // thresholds tuned for baseball-card look (more warm, very little blue)
  const T0 = 40;   // deepest shadow
  const T1 = 80;
  const T2 = 120;
  const T3 = 155;
  const T4 = 185;
  const T5 = 210;
  const T6 = 235;  // highlights

  for (let y = 0; y < h; y++) {
    // gentle vertical wash to mimic uneven paper stain
    const washFactor = 1 + 0.05 * Math.sin((y / h) * Math.PI * 2);

    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const di = idx * 4;

      const r0 = data[di];
      const g0 = data[di + 1];
      const b0 = data[di + 2];

      const gray = grayBuf[idx];

      // map gray to one of the 8 warm palette steps
      let pIndex;
      if (gray < T0) {
        pIndex = 7; // Indigo – only extreme dark lines
      } else if (gray < T1) {
        pIndex = 6; // Burnt Umber
      } else if (gray < T2) {
        pIndex = 5; // Venetian Red
      } else if (gray < T3) {
        pIndex = 4; // Burnt Sienna
      } else if (gray < T4) {
        pIndex = 3; // Raw Sienna
      } else if (gray < T5) {
        pIndex = 2; // Yellow Ochre
      } else if (gray < T6) {
        pIndex = 1; // Naples Yellow
      } else {
        pIndex = 0; // Buff Titanium paper
      }

      const p = VINTAGE_PALETTE_PRO[pIndex];

      // move original colour towards warm palette colour
      let r = lerp(r0, p.r * washFactor, strength);
      let g = lerp(g0, p.g * washFactor, strength);
      let b = lerp(b0, p.b * washFactor, strength);

      // paper tint: light areas pick up more cream
      const lightness = gray / 255;           // 0–1
      const paperBlend = lightness * 0.45;    // up to 45% towards paper tint

      r = lerp(r, PAPER_TINT.r, paperBlend);
      g = lerp(g, PAPER_TINT.g, paperBlend);
      b = lerp(b, PAPER_TINT.b, paperBlend);

      // ink-style edge darkening
      const edge = edgeBuf[idx];
      const edgeNorm = Math.min(edge / 255, 1);
      const lineStrength = 0.65; // how strong lines show
      const lineDarken = 1 - edgeNorm * lineStrength;

      r *= lineDarken;
      g *= lineDarken;
      b *= lineDarken;

      // subtle grain
      const noise = (Math.random() - 0.5) * 8; // -4..+4
      r += noise;
      g += noise;
      b += noise;

      data[di]     = clamp(r);
      data[di + 1] = clamp(g);
      data[di + 2] = clamp(b);
      data[di + 3] = 255;
    }
  }

  displayCtx.putImageData(src, 0, 0);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

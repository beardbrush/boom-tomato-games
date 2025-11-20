// script.js
// Classic 2-tone Notan UI wiring

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("notan-canvas");
  const fileInput = document.getElementById("image-input");
  const resetBtn = document.getElementById("reset-btn");
  const thresholdRange = document.getElementById("threshold-range");
  const thresholdValue = document.getElementById("threshold-value");
  const invertToggle = document.getElementById("invert-toggle");
  const downloadBtn = document.getElementById("download-btn");
  const learnBtn = document.getElementById("learn-btn");
  const placeholder = document.getElementById("canvas-placeholder");

  const guideSection = document.getElementById("guide-section");
  const guideText = document.getElementById("guide-text");
  const guideStep = document.getElementById("guide-step");
  const prevStepBtn = document.getElementById("prev-step-btn");
  const nextStepBtn = document.getElementById("next-step-btn");

  const yearSpan = document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // Init processors
  window.NotanProcessor.init(canvas);
  window.DrawGuide.init(guideSection, guideText, guideStep);

  let currentThreshold = parseInt(thresholdRange.value, 10) || 50;
  let currentInvert = false;

  function updateNotan() {
    if (!window.NotanProcessor.hasImage) return;
    // Classic Notan: always 2 tones, black & white
    window.NotanProcessor.apply(2, currentThreshold, currentInvert);
  }

  function setHasImage(has) {
    placeholder.style.display = has ? "none" : "flex";
    resetBtn.disabled = !has;
    downloadBtn.disabled = !has;
    learnBtn.disabled = !has;
    if (!has) {
      window.DrawGuide.close();
    }
  }

  // File input
  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    window.NotanProcessor.loadImageFile(
      file,
      () => {
        setHasImage(true);
        updateNotan();
      },
      (errMsg) => {
        alert(errMsg || "Something went wrong loading the image.");
        setHasImage(false);
      }
    );
  });

  // Reset
  resetBtn.addEventListener("click", () => {
    fileInput.value = "";
    window.NotanProcessor.clear();
    setHasImage(false);
  });

  // Threshold slider
  thresholdRange.addEventListener("input", (e) => {
    currentThreshold = parseInt(e.target.value, 10) || 50;
    thresholdValue.textContent = currentThreshold;
    updateNotan();
  });

  // Invert toggle
  invertToggle.addEventListener("change", (e) => {
    currentInvert = e.target.checked;
    updateNotan();
  });

  // Download
  downloadBtn.addEventListener("click", () => {
    window.NotanProcessor.download("notan.png");
  });

  // Learn to draw
  learnBtn.addEventListener("click", () => {
    if (!window.NotanProcessor.hasImage) return;
    window.DrawGuide.reset();
    window.DrawGuide.open();
    guideSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // Guide navigation
  prevStepBtn.addEventListener("click", () => {
    window.DrawGuide.prev();
  });

  nextStepBtn.addEventListener("click", () => {
    window.DrawGuide.next();
  });
});

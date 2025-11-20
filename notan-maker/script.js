// script.js — handles UI, buttons, and Notan generation

document.addEventListener("DOMContentLoaded", () => {

  const canvas = document.getElementById("notan-canvas");
  const placeholder = document.getElementById("canvas-placeholder");
  const downloadImg = document.getElementById("notan-download-img");

  const inputImage = document.getElementById("image-input");
  const resetBtn = document.getElementById("reset-btn");
  const downloadBtn = document.getElementById("download-btn");
  const learnBtn = document.getElementById("learn-btn");

  const thresholdRange = document.getElementById("threshold-range");
  const thresholdValue = document.getElementById("threshold-value");
  const invertToggle = document.getElementById("invert-toggle");

  const twoToneBtn = document.getElementById("two-tone-btn");
  const threeToneBtn = document.getElementById("three-tone-btn");

  const guideSection = document.getElementById("guide-section");

  NotanProcessor.init(canvas);

  let currentMode = 2;

  function updateNotan() {
    if (!NotanProcessor.hasImage) return;

    const threshold = Number(thresholdRange.value);
    const invert = invertToggle.checked;

    NotanProcessor.setMode(currentMode);
    NotanProcessor.apply(threshold, invert);

    // Update downloadable image
    NotanProcessor.exportImage((dataURL) => {
      downloadImg.src = dataURL;
    });

    downloadBtn.disabled = false;
    learnBtn.disabled = false;
  }

  function setModeButtons() {
    twoToneBtn.classList.toggle("bt-button", false);
    twoToneBtn.classList.toggle("bt-button-secondary", currentMode !== 2);
    twoToneBtn.classList.toggle("bt-button", currentMode === 2);

    threeToneBtn.classList.toggle("bt-button", false);
    threeToneBtn.classList.toggle("bt-button-secondary", currentMode !== 3);
    threeToneBtn.classList.toggle("bt-button", currentMode === 3);
  }

  // IMAGE LOADING
  inputImage.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    NotanProcessor.loadImageFile(
      file,
      () => {
        placeholder.style.display = "none";
        updateNotan();
        resetBtn.disabled = false;
      },
      (err) => alert(err)
    );
  });

  // RESET
  resetBtn.addEventListener("click", () => {
    NotanProcessor.clear();
    placeholder.style.display = "flex";
    resetBtn.disabled = true;
    downloadBtn.disabled = true;
    learnBtn.disabled = true;
  });

  // THRESHOLD
  thresholdRange.addEventListener("input", () => {
    thresholdValue.textContent = thresholdRange.value;
    updateNotan();
  });

  // INVERT
  invertToggle.addEventListener("change", updateNotan);

  // MODE TOGGLE
  twoToneBtn.addEventListener("click", () => {
    currentMode = 2;
    setModeButtons();
    updateNotan();
  });

  threeToneBtn.addEventListener("click", () => {
    currentMode = 3;
    setModeButtons();
    updateNotan();
  });

  setModeButtons();

  // DOWNLOAD
  downloadBtn.addEventListener("click", () => {
    NotanProcessor.exportImage((dataURL) => {
      const a = document.createElement("a");
      a.href = dataURL;
      a.download = "notan.png";
      a.click();
    });
  });

  // LEARN GUIDE
  learnBtn.addEventListener("click", () => {
    guideSection.classList.remove("bt-guide-panel-hidden");
  });

});

// draw-guide.js
// Simple text-based step-by-step Notan drawing guide

(function () {
  const steps = [
    {
      title: "Step 1 · Squint & simplify",
      text:
        "Look at your Notan and the original photo. Squint your eyes until the details blur. " +
        "Notice only the biggest dark and light shapes. When you draw, ignore all details for now – just block in 3–5 large shapes.",
    },
    {
      title: "Step 2 · Draw the big shapes only",
      text:
        "On your paper or tablet, lightly sketch the outline of the largest dark and light areas. " +
        "Think in terms of silhouettes: sky vs. building, face vs. background, shirt vs. shadow. " +
        "Do not add eyes, windows, fingers, or tiny details yet.",
    },
    {
      title: "Step 3 · Fill in the darks",
      text:
        "Choose one flat dark value (like ink or a soft pencil). Fill in every area that is black in your Notan. " +
        "Keep the edges clean and graphic. This is where the rhythm and balance of your design appears.",
    },
    {
      title: "Step 4 · Refine edges & balance",
      text:
        "Now, compare your drawing and the Notan. Are the black shapes flowing nicely through the picture? " +
        "You can nudge edges, enlarge or shrink a dark area, or connect shapes to create stronger design. " +
        "Small tweaks here massively improve the composition.",
    },
    {
      title: "Step 5 · Optional: add light detail",
      text:
        "If you want to develop the drawing further, keep your darks as one flat family. " +
        "Add any small lines or highlights only in the light areas, so the overall Notan stays strong and readable from a distance.",
    },
  ];

  const DrawGuide = {
    sectionEl: null,
    textEl: null,
    stepEl: null,
    currentIndex: 0,

    init(sectionEl, textEl, stepEl) {
      this.sectionEl = sectionEl;
      this.textEl = textEl;
      this.stepEl = stepEl;
      this.currentIndex = 0;
      this._render();
    },

    open() {
      if (!this.sectionEl) return;
      this.sectionEl.classList.remove("bt-guide-panel-hidden");
      this._render();
    },

    close() {
      if (!this.sectionEl) return;
      this.sectionEl.classList.add("bt-guide-panel-hidden");
    },

    next() {
      if (this.currentIndex < steps.length - 1) {
        this.currentIndex++;
        this._render();
      }
    },

    prev() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this._render();
      }
    },

    reset() {
      this.currentIndex = 0;
      this._render();
    },

    _render() {
      if (!this.textEl || !this.stepEl) return;
      const step = steps[this.currentIndex];
      this.stepEl.textContent = `${this.currentIndex + 1} / ${steps.length}`;
      this.textEl.textContent = `${step.title} – ${step.text}`;
    },
  };

  window.DrawGuide = DrawGuide;
})();

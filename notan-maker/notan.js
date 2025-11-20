// notan.js
// Handles generating 2-tone and 3-tone Notan images

(function () {
  const NotanProcessor = {
    canvas: null,
    ctx: null,
    originalCanvas: null,
    originalCtx: null,
    hasImage: false,

    // Japanese Sumi-e palette
    TONE_BLACK: "#0A0A0A",
    TONE_GREY:  "#7A7A7A",
    TONE_WHITE: "#F7F4E9",

    init(canvasElement) {
      this.canvas = canvasElement;
      this.ctx = this.canvas.getContext("2d");

      this.originalCanvas = document.createElement("canvas");
      this.originalCtx = this.originalCanvas.getContext("2d");

      this.mode = 2;
    },

    loadImageFile(file, onDone, onError) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this._drawOriginal(img);
          this.hasImage = true;
          if (typeof onDone === "function") onDone();
        };
        img.onerror = () => {
          this.hasImage = false;
          if (typeof onError === "function") onError("Could not load image.");
        };
        img.src = e.target.result;
      };
      reader.onerror = () => {
        this.hasImage = false;
        if (typeof onError === "function") onError("Could not read image file.");
      };
      reader.readAsDataURL(file);
    },

    _drawOriginal(img) {
      const maxWidth = this.canvas.clientWidth || 600;
      const scale = maxWidth / img.width;

      const displayWidth = maxWidth;
      const displayHeight = img.height * scale;

      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;

      this.originalCanvas.width = displayWidth;
      this.originalCanvas.height = displayHeight;

      this.originalCtx.clearRect(0, 0, displayWidth, displayHeight);
      this.originalCtx.drawImage(img, 0, 0, displayWidth, displayHeight);

      this.ctx.clearRect(0, 0, displayWidth, displayHeight);
      this.ctx.drawImage(this.originalCanvas, 0, 0);
    },

    setMode(mode) {
      this.mode = mode;
    },

    apply(thresholdPercent, invert) {
      if (!this.hasImage) return;

      this.ctx.drawImage(this.originalCanvas, 0, 0);
      const { width, height } = this.canvas;

      const imageData = this.ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      if (this.mode === 2) {
        this._applyTwoTone(data, thresholdPercent, invert);
      } else {
        this._applyThreeTone(data, thresholdPercent);
      }

      this.ctx.putImageData(imageData, 0, 0);
    },

    _applyTwoTone(data, thresholdPercent, invert) {
      const threshold = (thresholdPercent / 100) * 255;

      const dark = invert ? this.TONE_WHITE : this.TONE_BLACK;
      const light = invert ? this.TONE_BLACK : this.TONE_WHITE;

      const darkRGB = this._parseColor(dark);
      const lightRGB = this._parseColor(light);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const useDark = gray < threshold;

        const col = useDark ? darkRGB : lightRGB;

        data[i] = col.r;
        data[i + 1] = col.g;
        data[i + 2] = col.b;
      }
    },

    _applyThreeTone(data, thresholdPercent) {
      // Split into 3 tone regions
      const high = (thresholdPercent / 100) * 255;
      const low = high * 0.5;

      const cDark = this._parseColor(this.TONE_BLACK);
      const cMid  = this._parseColor(this.TONE_GREY);
      const cLight = this._parseColor(this.TONE_WHITE);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        let col;
        if (gray < low) col = cDark;
        else if (gray < high) col = cMid;
        else col = cLight;

        data[i] = col.r;
        data[i + 1] = col.g;
        data[i + 2] = col.b;
      }
    },

    _parseColor(hex) {
      let h = hex.replace("#", "");
      return {
        r: parseInt(h.substr(0, 2), 16),
        g: parseInt(h.substr(2, 2), 16),
        b: parseInt(h.substr(4, 2), 16)
      };
    },

    clear() {
      this.hasImage = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.originalCtx.clearRect(0, 0, this.originalCanvas.width, this.originalCanvas.height);
    },

    exportImage(callback) {
      if (!this.hasImage) return;
      callback(this.canvas.toDataURL("image/png"));
    }
  };

  window.NotanProcessor = NotanProcessor;
})();

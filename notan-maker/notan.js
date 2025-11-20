// notan.js
// Classic 2-tone Notan/value processor (black & white only)

(function () {
  const NotanProcessor = {
    canvas: null,
    ctx: null,
    originalCanvas: null,
    originalCtx: null,
    hasImage: false,

    init(canvasElement) {
      this.canvas = canvasElement;
      this.ctx = this.canvas.getContext("2d");

      this.originalCanvas = document.createElement("canvas");
      this.originalCtx = this.originalCanvas.getContext("2d");
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
          if (typeof onError === "function")
            onError("Could not load image.");
        };
        img.src = e.target.result;
      };
      reader.onerror = () => {
        this.hasImage = false;
        if (typeof onError === "function") onError("Could not read file.");
      };
      reader.readAsDataURL(file);
    },

    _drawOriginal(img) {
      const maxDisplayWidth = this.canvas.clientWidth || 600;
      const scale = maxDisplayWidth / img.width;
      const displayWidth = maxDisplayWidth;
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

    /**
     * Classic Notan: 2 tones only (black & white)
     * thresholdPercent: 10–90
     * invert: boolean
     */
    apply(modeIgnored, thresholdPercent, invert) {
      if (!this.hasImage) return;

      this.ctx.drawImage(this.originalCanvas, 0, 0);

      const { width, height } = this.canvas;
      const imageData = this.ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      const threshold = (thresholdPercent / 100) * 255;

      const black = { r: 0, g: 0, b: 0 };
      const white = { r: 255, g: 255, b: 255 };

      const dark = invert ? white : black;
      const light = invert ? black : white;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        const useDark = gray < threshold;
        const col = useDark ? dark : light;

        data[i] = col.r;
        data[i + 1] = col.g;
        data[i + 2] = col.b;
      }

      this.ctx.putImageData(imageData, 0, 0);
    },

    clear() {
      this.hasImage = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.originalCtx.clearRect(
        0,
        0,
        this.originalCanvas.width,
        this.originalCanvas.height
      );
    },

    download(filename = "notan.png") {
      if (!this.hasImage) return;
      const link = document.createElement("a");
      link.download = filename;
      link.href = this.canvas.toDataURL("image/png");
      link.click();
    },
  };

  window.NotanProcessor = NotanProcessor;
})();

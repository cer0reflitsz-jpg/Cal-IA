/* ── Viewport ─────────────────────────────────────────────────
   Guarda centro y escala (px por unidad) en lugar de los cuatro
   límites: así la escala de X e Y siempre coincide y una
   circunferencia se ve redonda, no ovalada.                     */
(function (MP) {
  'use strict';

  function Viewport() {
    this.cx = 0; this.cy = 0;
    this.scale = 48;
    this.w = 800; this.h = 600;
  }

  Viewport.prototype.resize = function (w, h) { this.w = w; this.h = h; };

  Viewport.prototype.sx = function (x) { return this.w / 2 + (x - this.cx) * this.scale; };
  Viewport.prototype.sy = function (y) { return this.h / 2 - (y - this.cy) * this.scale; };
  Viewport.prototype.wx = function (px) { return this.cx + (px - this.w / 2) / this.scale; };
  Viewport.prototype.wy = function (py) { return this.cy - (py - this.h / 2) / this.scale; };

  Viewport.prototype.bounds = function () {
    return {
      xMin: this.wx(0), xMax: this.wx(this.w),
      yMin: this.wy(this.h), yMax: this.wy(0)
    };
  };

  Viewport.prototype.zoomAt = function (px, py, factor) {
    var wxBefore = this.wx(px), wyBefore = this.wy(py);
    this.scale = Math.max(0.02, Math.min(1e6, this.scale * factor));
    this.cx = wxBefore - (px - this.w / 2) / this.scale;
    this.cy = wyBefore + (py - this.h / 2) / this.scale;
  };

  Viewport.prototype.zoom = function (factor) {
    this.zoomAt(this.w / 2, this.h / 2, factor);
  };

  Viewport.prototype.panPixels = function (dx, dy) {
    this.cx -= dx / this.scale;
    this.cy += dy / this.scale;
  };

  Viewport.prototype.reset = function () {
    this.cx = 0; this.cy = 0;
    this.scale = Math.max(24, Math.min(this.w, this.h) / 13);
  };

  /** Encaja el rango x pedido dejando un margen. */
  Viewport.prototype.fitX = function (xMin, xMax) {
    this.cx = (xMin + xMax) / 2;
    this.scale = this.w / Math.max(1e-6, (xMax - xMin) * 1.1);
  };

  /** Paso "bonito" (1, 2, 5 × 10ⁿ) para una separación objetivo en píxeles. */
  Viewport.prototype.niceStep = function (targetPx) {
    var raw = (targetPx || 76) / this.scale;
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag;
    var mult = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
    return mult * mag;
  };

  MP.Viewport = Viewport;
})(window.MP = window.MP || {});

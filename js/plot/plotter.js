/* ── Motor de dibujo 2D ───────────────────────────────────────
   Cuadrícula adaptativa, ejes con números, curvas muestreadas
   por columna de píxeles con corte en discontinuidades y
   sombreado de áreas.                                           */
(function (MP) {
  'use strict';

  function css(name, el) {
    return getComputedStyle(el || document.documentElement).getPropertyValue(name).trim();
  }

  /** Prepara el canvas para pantallas de alta densidad. */
  function setupCanvas(canvas, vp) {
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (vp) vp.resize(w, h);
    return ctx;
  }

  function fmt(v, step) {
    var dec = Math.max(0, -Math.floor(Math.log(step) / Math.LN10));
    if (dec > 6) dec = 6;
    var s = v.toFixed(dec);
    if (s === '-0' || parseFloat(s) === 0) s = '0';
    return s;
  }

  function drawGrid(ctx, vp, opts) {
    opts = opts || {};
    var b = vp.bounds();
    ctx.clearRect(0, 0, vp.w, vp.h);
    ctx.fillStyle = css('--canvas-bg');
    ctx.fillRect(0, 0, vp.w, vp.h);

    var step = vp.niceStep(76);
    var minor = step / 5;

    if (opts.grid !== false) {
      // cuadrícula menor
      ctx.strokeStyle = css('--grid');
      ctx.lineWidth = 1;
      ctx.beginPath();
      var x0 = Math.ceil(b.xMin / minor) * minor;
      for (var x = x0; x <= b.xMax; x += minor) {
        var px = Math.round(vp.sx(x)) + 0.5;
        ctx.moveTo(px, 0); ctx.lineTo(px, vp.h);
      }
      var y0 = Math.ceil(b.yMin / minor) * minor;
      for (var y = y0; y <= b.yMax; y += minor) {
        var py = Math.round(vp.sy(y)) + 0.5;
        ctx.moveTo(0, py); ctx.lineTo(vp.w, py);
      }
      ctx.stroke();

      // cuadrícula mayor
      ctx.strokeStyle = css('--grid-strong');
      ctx.beginPath();
      var X0 = Math.ceil(b.xMin / step) * step;
      for (var X = X0; X <= b.xMax; X += step) {
        var PX = Math.round(vp.sx(X)) + 0.5;
        ctx.moveTo(PX, 0); ctx.lineTo(PX, vp.h);
      }
      var Y0 = Math.ceil(b.yMin / step) * step;
      for (var Y = Y0; Y <= b.yMax; Y += step) {
        var PY = Math.round(vp.sy(Y)) + 0.5;
        ctx.moveTo(0, PY); ctx.lineTo(vp.w, PY);
      }
      ctx.stroke();
    }

    if (opts.axes !== false) {
      var ax = css('--axis');
      ctx.strokeStyle = ax;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      var oy = Math.round(vp.sy(0)) + 0.5;
      var ox = Math.round(vp.sx(0)) + 0.5;
      if (oy >= 0 && oy <= vp.h) { ctx.moveTo(0, oy); ctx.lineTo(vp.w, oy); }
      if (ox >= 0 && ox <= vp.w) { ctx.moveTo(ox, 0); ctx.lineTo(ox, vp.h); }
      ctx.stroke();

      if (opts.labels !== false) {
        ctx.fillStyle = ax;
        ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        var labelY = Math.min(Math.max(oy + 4, 2), vp.h - 15);
        var Xs = Math.ceil(b.xMin / step) * step;
        for (var lx = Xs; lx <= b.xMax; lx += step) {
          if (Math.abs(lx) < step / 1e6) continue;
          ctx.fillText(fmt(lx, step), vp.sx(lx), labelY);
        }
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        var labelX = Math.min(Math.max(ox - 6, 26), vp.w - 3);
        var Ys = Math.ceil(b.yMin / step) * step;
        for (var ly = Ys; ly <= b.yMax; ly += step) {
          if (Math.abs(ly) < step / 1e6) continue;
          ctx.fillText(fmt(ly, step), labelX, vp.sy(ly));
        }
        if (ox > 8 && ox < vp.w && oy > 8 && oy < vp.h) {
          ctx.textAlign = 'right'; ctx.textBaseline = 'top';
          ctx.fillText('0', ox - 5, oy + 4);
        }
      }
    }
  }

  /**
   * Dibuja y = f(x) muestreando una vez por píxel.
   * Corta el trazo cuando detecta una discontinuidad para no
   * pintar asíntotas verticales falsas.
   */
  function drawCurve(ctx, vp, f, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();

    var started = false, prevPy = null, prevY = null;
    var limit = vp.h * 1.6;

    for (var px = -1; px <= vp.w + 1; px++) {
      var x = vp.wx(px);
      var y = f(x);
      if (!isFinite(y)) { started = false; prevPy = null; prevY = null; continue; }
      var py = vp.sy(y);

      if (started && prevPy !== null) {
        var jump = Math.abs(py - prevPy);
        var signChange = (prevY > 0) !== (y > 0);
        if (jump > limit && signChange) {
          // polo: cortamos el trazo
          started = false;
        }
      }
      if (py < -1e5) py = -1e5;
      if (py > 1e5) py = 1e5;

      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
      prevPy = py; prevY = y;
    }
    ctx.stroke();
  }

  /** Sombrea el área entre la curva y el eje X en [a, b]. */
  function drawArea(ctx, vp, f, a, b, color) {
    if (b < a) { var t = a; a = b; b = t; }
    var pa = Math.max(0, vp.sx(a)), pb = Math.min(vp.w, vp.sx(b));
    if (pb <= pa) return;
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = color;
    ctx.beginPath();
    var y0 = vp.sy(0);
    ctx.moveTo(pa, y0);
    for (var px = pa; px <= pb; px++) {
      var y = f(vp.wx(px));
      if (!isFinite(y)) continue;
      ctx.lineTo(px, Math.max(-1e4, Math.min(1e4, vp.sy(y))));
    }
    ctx.lineTo(pb, y0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = .55;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(pa, 0); ctx.lineTo(pa, vp.h);
    ctx.moveTo(pb, 0); ctx.lineTo(pb, vp.h);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Dibuja una curva implícita g(x,y) = 0 con "marching squares".
   * Permite representar x² + y² = 25, que no es una función.
   */
  function drawImplicit(ctx, vp, g, color, width) {
    var cell = 7;
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2;
    ctx.lineCap = 'round';
    ctx.beginPath();

    var cols = Math.ceil(vp.w / cell) + 1;
    var rows = Math.ceil(vp.h / cell) + 1;
    var prevRow = new Float64Array(cols + 1);
    var curRow = new Float64Array(cols + 1);

    for (var c = 0; c <= cols; c++) prevRow[c] = g(vp.wx(c * cell), vp.wy(0));

    for (var r = 1; r <= rows; r++) {
      var py = r * cell;
      for (var c2 = 0; c2 <= cols; c2++) curRow[c2] = g(vp.wx(c2 * cell), vp.wy(py));

      for (var c3 = 0; c3 < cols; c3++) {
        var v00 = prevRow[c3], v10 = prevRow[c3 + 1];
        var v01 = curRow[c3], v11 = curRow[c3 + 1];
        if (!isFinite(v00) || !isFinite(v10) || !isFinite(v01) || !isFinite(v11)) continue;
        var x0 = c3 * cell, x1 = x0 + cell, y0 = py - cell, y1 = py;
        var pts = [];
        if ((v00 > 0) !== (v10 > 0)) pts.push([x0 + cell * v00 / (v00 - v10), y0]);
        if ((v10 > 0) !== (v11 > 0)) pts.push([x1, y0 + cell * v10 / (v10 - v11)]);
        if ((v01 > 0) !== (v11 > 0)) pts.push([x0 + cell * v01 / (v01 - v11), y1]);
        if ((v00 > 0) !== (v01 > 0)) pts.push([x0, y0 + cell * v00 / (v00 - v01)]);
        if (pts.length >= 2) {
          ctx.moveTo(pts[0][0], pts[0][1]);
          ctx.lineTo(pts[1][0], pts[1][1]);
          if (pts.length === 4) {
            ctx.moveTo(pts[2][0], pts[2][1]);
            ctx.lineTo(pts[3][0], pts[3][1]);
          }
        }
      }
      var tmp = prevRow; prevRow = curRow; curRow = tmp;
    }
    ctx.stroke();
  }

  function drawPoint(ctx, vp, x, y, color, label, filled) {
    var px = vp.sx(x), py = vp.sy(y);
    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = filled === false ? css('--canvas-bg') : color;
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = color;
    ctx.stroke();
    if (label) {
      ctx.fillStyle = css('--text');
      ctx.font = 'italic 13px Cambria, Georgia, serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, px + 7, py - 5);
    }
  }

  function drawSegmentPx(ctx, x1, y1, x2, y2, color, width, dash) {
    ctx.save();
    if (dash) ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1.8;
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  MP.plot = {
    setupCanvas: setupCanvas,
    drawGrid: drawGrid,
    drawCurve: drawCurve,
    drawImplicit: drawImplicit,
    drawArea: drawArea,
    drawPoint: drawPoint,
    drawSegmentPx: drawSegmentPx,
    css: css,
    fmt: fmt
  };
})(window.MP = window.MP || {});

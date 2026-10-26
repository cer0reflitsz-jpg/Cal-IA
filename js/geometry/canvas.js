/* ── Vista de geometría ───────────────────────────────────────
   Dibuja la escena y gestiona las herramientas de construcción,
   el arrastre de puntos, el zoom y el desplazamiento.           */
(function (MP) {
  'use strict';
  var G = MP.geo, plot = MP.plot;

  var NEEDS = {          // puntos que necesita cada herramienta
    point: 1, segment: 2, line: 2, ray: 2, circle: 2, angle: 3, triangle: 3
  };

  function GeoView(canvas, scene, onChange) {
    this.canvas = canvas;
    this.scene = scene;
    this.vp = new MP.Viewport();
    this.vp.reset();
    this.tool = 'move';
    this.pending = [];
    this.selected = null;
    this.snap = true;
    this.showGrid = true;
    this.hover = null;
    this.onChange = onChange || function () {};
    this.pointers = {};
    this.drag = null;
    this.pinch = null;
    this.bind();
  }

  /** Paso del imán: el valor "redondo" más grande que no supere medio paso de cuadrícula. */
  GeoView.prototype.snapStep = function () {
    var target = this.vp.niceStep(76) / 2;
    var mag = Math.pow(10, Math.floor(Math.log(target) / Math.LN10));
    var norm = target / mag;
    var mult = norm >= 5 ? 5 : norm >= 2 ? 2 : 1;
    return mult * mag;
  };

  GeoView.prototype.snapValue = function (v) {
    if (!this.snap) return v;
    var s = this.snapStep();
    return Math.round(v / s) * s;
  };

  GeoView.prototype.setTool = function (t) {
    this.tool = t;
    this.pending = [];
    this.render();
    this.onChange();
  };

  /* ── Detección de objetos bajo el cursor ─────────────────── */
  GeoView.prototype.hitPoint = function (px, py) {
    var vp = this.vp, best = null, bestD = 11;
    this.scene.objects.forEach(function (o) {
      if (o.kind !== 'point') return;
      var d = Math.hypot(vp.sx(o.x) - px, vp.sy(o.y) - py);
      if (d < bestD) { bestD = d; best = o; }
    });
    return best;
  };

  GeoView.prototype.hitAny = function (px, py) {
    var p = this.hitPoint(px, py);
    if (p) return p;
    var vp = this.vp, scene = this.scene, best = null, bestD = 8;

    function distToSeg(x, y, x1, y1, x2, y2) {
      var dx = x2 - x1, dy = y2 - y1;
      var L = dx * dx + dy * dy;
      var t = L === 0 ? 0 : ((x - x1) * dx + (y - y1) * dy) / L;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
    }

    scene.objects.forEach(function (o) {
      var pts = scene.pointsOf(o), d = Infinity;
      if (o.kind === 'segment' && pts.length === 2) {
        d = distToSeg(px, py, vp.sx(pts[0].x), vp.sy(pts[0].y), vp.sx(pts[1].x), vp.sy(pts[1].y));
      } else if ((o.kind === 'line' || o.kind === 'ray') && pts.length === 2) {
        var far = 6000;
        var ax = vp.sx(pts[0].x), ay = vp.sy(pts[0].y);
        var bx = vp.sx(pts[1].x), by = vp.sy(pts[1].y);
        var ux = bx - ax, uy = by - ay, L = Math.hypot(ux, uy) || 1;
        ux /= L; uy /= L;
        var startX = o.kind === 'line' ? ax - ux * far : ax;
        var startY = o.kind === 'line' ? ay - uy * far : ay;
        d = distToSeg(px, py, startX, startY, ax + ux * far, ay + uy * far);
      } else if (o.kind === 'circle' && pts.length === 2) {
        var r = G.dist(pts[0], pts[1]) * vp.scale;
        d = Math.abs(Math.hypot(px - vp.sx(pts[0].x), py - vp.sy(pts[0].y)) - r);
      } else if (o.kind === 'polygon' && pts.length >= 3) {
        for (var i = 0; i < pts.length; i++) {
          var j = (i + 1) % pts.length;
          d = Math.min(d, distToSeg(px, py,
            vp.sx(pts[i].x), vp.sy(pts[i].y), vp.sx(pts[j].x), vp.sy(pts[j].y)));
        }
      }
      if (d < bestD) { bestD = d; best = o; }
    });
    return best;
  };

  /* ── Construcción ────────────────────────────────────────── */
  GeoView.prototype.pointAt = function (px, py) {
    var existing = this.hitPoint(px, py);
    if (existing) return existing;
    return this.scene.addPoint(
      this.snapValue(this.vp.wx(px)),
      this.snapValue(this.vp.wy(py))
    );
  };

  GeoView.prototype.handleClick = function (px, py) {
    var t = this.tool;

    if (t === 'move') {
      this.selected = this.hitAny(px, py);
      this.onChange();
      return;
    }
    if (t === 'delete') {
      var target = this.hitAny(px, py);
      if (target) { this.scene.remove(target.id); this.selected = null; this.onChange(); }
      return;
    }
    if (t === 'polygon') {
      var p0 = this.pointAt(px, py);
      if (this.pending.length >= 3 && this.pending[0].id === p0.id) {
        this.scene.addFrom('polygon', this.pending.map(function (q) { return q.id; }));
        this.pending = [];
        this.onChange();
        return;
      }
      if (!this.pending.some(function (q) { return q.id === p0.id; })) this.pending.push(p0);
      this.onChange();
      return;
    }

    var need = NEEDS[t];
    if (!need) return;
    var p = this.pointAt(px, py);
    this.pending.push(p);
    if (this.pending.length === need) {
      var ids = this.pending.map(function (q) { return q.id; });
      if (t === 'point') { /* el punto ya está creado */ }
      else if (t === 'triangle') this.scene.addFrom('polygon', ids);
      else this.scene.addFrom(t, ids);
      this.pending = [];
    }
    this.onChange();
  };

  GeoView.prototype.finishPolygon = function () {
    if (this.tool === 'polygon' && this.pending.length >= 3) {
      this.scene.addFrom('polygon', this.pending.map(function (q) { return q.id; }));
      this.pending = [];
      this.onChange();
    }
  };

  /* ── Eventos ─────────────────────────────────────────────── */
  GeoView.prototype.bind = function () {
    var self = this, c = this.canvas;

    function pos(e) {
      var r = c.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    c.addEventListener('pointerdown', function (e) {
      c.setPointerCapture(e.pointerId);
      var p = pos(e);
      self.pointers[e.pointerId] = p;
      var ids = Object.keys(self.pointers);
      if (ids.length === 2) {
        var a = self.pointers[ids[0]], b = self.pointers[ids[1]];
        self.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) };
        self.drag = null;
        return;
      }
      if (self.tool === 'move') {
        var hit = self.hitPoint(p.x, p.y);
        if (hit) { self.drag = { point: hit, moved: false }; return; }
        self.drag = { pan: true, last: p, moved: false };
      } else {
        self.drag = { pending: true, start: p, moved: false };
      }
    });

    c.addEventListener('pointermove', function (e) {
      var p = pos(e);
      if (self.pointers[e.pointerId]) self.pointers[e.pointerId] = p;
      self.hover = { x: self.vp.wx(p.x), y: self.vp.wy(p.y) };

      var ids = Object.keys(self.pointers);
      if (self.pinch && ids.length === 2) {
        var a = self.pointers[ids[0]], b = self.pointers[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        if (self.pinch.d > 0) {
          self.vp.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / self.pinch.d);
        }
        self.pinch.d = d;
        self.render();
        return;
      }

      if (self.drag && self.drag.point) {
        self.drag.point.x = self.snapValue(self.vp.wx(p.x));
        self.drag.point.y = self.snapValue(self.vp.wy(p.y));
        self.drag.moved = true;
        self.render();
        self.onChange();
        return;
      }
      if (self.drag && self.drag.pan) {
        self.vp.panPixels(p.x - self.drag.last.x, p.y - self.drag.last.y);
        self.drag.last = p;
        self.drag.moved = true;
        self.render();
        return;
      }
      self.render();
    });

    function end(e) {
      var p = pos(e);
      delete self.pointers[e.pointerId];
      if (Object.keys(self.pointers).length < 2) self.pinch = null;
      if (self.drag && !self.drag.moved) self.handleClick(p.x, p.y);
      self.drag = null;
      self.render();
    }
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', function (e) {
      delete self.pointers[e.pointerId];
      self.drag = null; self.pinch = null;
    });
    c.addEventListener('pointerleave', function () { self.hover = null; self.render(); });

    c.addEventListener('dblclick', function () { self.finishPolygon(); });

    c.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = c.getBoundingClientRect();
      var f = Math.pow(0.999, e.deltaY);
      self.vp.zoomAt(e.clientX - r.left, e.clientY - r.top, f);
      self.render();
    }, { passive: false });
  };

  /* ── Dibujo ──────────────────────────────────────────────── */
  GeoView.prototype.render = function () {
    var ctx = plot.setupCanvas(this.canvas, this.vp);
    var vp = this.vp, scene = this.scene, self = this;
    plot.drawGrid(ctx, vp, { grid: this.showGrid, axes: true, labels: true });

    var accent = plot.css('--geo-point');
    var sel = plot.css('--geo-sel');
    var fill = plot.css('--geo-fill');
    var text = plot.css('--text');

    function color(o) { return (self.selected && self.selected.id === o.id) ? sel : accent; }

    // polígonos primero (relleno)
    scene.objects.forEach(function (o) {
      if (o.kind !== 'polygon') return;
      var pts = scene.pointsOf(o);
      if (pts.length < 3) return;
      ctx.beginPath();
      pts.forEach(function (p, i) {
        var x = vp.sx(p.x), y = vp.sy(p.y);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = color(o); ctx.lineWidth = 2; ctx.stroke();
    });

    scene.objects.forEach(function (o) {
      var pts = scene.pointsOf(o);
      ctx.strokeStyle = color(o);
      ctx.lineWidth = 2;

      if (o.kind === 'segment' && pts.length === 2) {
        plot.drawSegmentPx(ctx, vp.sx(pts[0].x), vp.sy(pts[0].y), vp.sx(pts[1].x), vp.sy(pts[1].y), color(o), 2);
      } else if ((o.kind === 'line' || o.kind === 'ray') && pts.length === 2) {
        var ax = vp.sx(pts[0].x), ay = vp.sy(pts[0].y);
        var bx = vp.sx(pts[1].x), by = vp.sy(pts[1].y);
        var ux = bx - ax, uy = by - ay, L = Math.hypot(ux, uy) || 1;
        ux /= L; uy /= L;
        var far = Math.hypot(vp.w, vp.h) * 2;
        var sx = o.kind === 'line' ? ax - ux * far : ax;
        var sy = o.kind === 'line' ? ay - uy * far : ay;
        plot.drawSegmentPx(ctx, sx, sy, ax + ux * far, ay + uy * far, color(o), 2);
      } else if (o.kind === 'circle' && pts.length === 2) {
        var r = G.dist(pts[0], pts[1]) * vp.scale;
        ctx.beginPath();
        ctx.arc(vp.sx(pts[0].x), vp.sy(pts[0].y), r, 0, Math.PI * 2);
        ctx.strokeStyle = color(o);
        ctx.stroke();
      } else if (o.kind === 'angle' && pts.length === 3) {
        var v = pts[1];
        var a1 = Math.atan2(vp.sy(pts[0].y) - vp.sy(v.y), vp.sx(pts[0].x) - vp.sx(v.x));
        var a2 = Math.atan2(vp.sy(pts[2].y) - vp.sy(v.y), vp.sx(pts[2].x) - vp.sx(v.x));
        ctx.beginPath();
        ctx.arc(vp.sx(v.x), vp.sy(v.y), 30, a1, a2, false);
        ctx.strokeStyle = color(o);
        ctx.lineWidth = 2;
        ctx.stroke();
        var deg = G.angleAt(pts[0], pts[1], pts[2]);
        ctx.fillStyle = text;
        ctx.font = '12px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(G.num(deg, 1) + '°', vp.sx(v.x) + 44 * Math.cos((a1 + a2) / 2),
                     vp.sy(v.y) + 44 * Math.sin((a1 + a2) / 2));
      }
    });

    // puntos encima
    scene.objects.forEach(function (o) {
      if (o.kind !== 'point') return;
      plot.drawPoint(ctx, vp, o.x, o.y, color(o), o.label);
    });

    // construcción en curso
    if (this.pending.length) {
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = sel;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      this.pending.forEach(function (p, i) {
        var x = vp.sx(p.x), y = vp.sy(p.y);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      if (this.hover) ctx.lineTo(vp.sx(this.hover.x), vp.sy(this.hover.y));
      ctx.stroke();
      ctx.restore();
      this.pending.forEach(function (p) {
        plot.drawPoint(ctx, vp, p.x, p.y, sel, null);
      });
    }
  };

  GeoView.prototype.zoom = function (f) { this.vp.zoom(f); this.render(); };
  GeoView.prototype.reset = function () { this.vp.reset(); this.render(); };

  MP.GeoView = GeoView;
})(window.MP = window.MP || {});

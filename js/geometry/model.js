/* ── Modelo geométrico ────────────────────────────────────────
   Los puntos libres guardan coordenadas; el resto de objetos se
   calculan a partir de sus padres cada vez que se dibujan. Por
   eso al arrastrar un punto todo lo que depende de él se
   actualiza solo, sin recalcular la escena entera.              */
(function (MP) {
  'use strict';

  var LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function Scene() {
    this.objects = [];
    this.seq = 0;
    this.labelSeq = 0;
  }

  Scene.prototype.nextLabel = function () {
    var i = this.labelSeq++;
    var base = LABELS[i % 26];
    var sub = Math.floor(i / 26);
    return sub === 0 ? base : base + sub;
  };

  Scene.prototype.add = function (obj) {
    obj.id = 'o' + (++this.seq);
    this.objects.push(obj);
    return obj;
  };

  Scene.prototype.get = function (id) {
    for (var i = 0; i < this.objects.length; i++) {
      if (this.objects[i].id === id) return this.objects[i];
    }
    return null;
  };

  Scene.prototype.addPoint = function (x, y, label) {
    return this.add({ kind: 'point', label: label || this.nextLabel(), x: x, y: y, deps: [] });
  };

  Scene.prototype.addFrom = function (kind, deps, extra) {
    var obj = { kind: kind, label: this.nextLabel(), deps: deps.slice() };
    if (extra) for (var k in extra) obj[k] = extra[k];
    return this.add(obj);
  };

  /** Elimina un objeto y todo lo que dependía de él. */
  Scene.prototype.remove = function (id) {
    var doomed = {}; doomed[id] = true;
    var changed = true;
    while (changed) {
      changed = false;
      this.objects.forEach(function (o) {
        if (doomed[o.id]) return;
        if (o.deps.some(function (d) { return doomed[d]; })) { doomed[o.id] = true; changed = true; }
      });
    }
    this.objects = this.objects.filter(function (o) { return !doomed[o.id]; });
  };

  Scene.prototype.clear = function () {
    this.objects = []; this.seq = 0; this.labelSeq = 0;
  };

  Scene.prototype.pointsOf = function (obj) {
    var self = this;
    return obj.deps.map(function (d) { return self.get(d); }).filter(Boolean);
  };

  /* ── Cálculos geométricos ────────────────────────────────── */

  function dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }

  function slope(a, b) {
    if (Math.abs(b.x - a.x) < 1e-12) return Infinity;
    return (b.y - a.y) / (b.x - a.x);
  }

  function lineEquation(a, b) {
    if (Math.abs(b.x - a.x) < 1e-12) return 'x = ' + num(a.x);
    var m = slope(a, b), n = a.y - m * a.x;
    var s = 'y = ' + num(m) + 'x';
    if (Math.abs(n) > 1e-12) s += (n > 0 ? ' + ' : ' − ') + num(Math.abs(n));
    return s;
  }

  function polygonArea(pts) {
    var s = 0;
    for (var i = 0; i < pts.length; i++) {
      var j = (i + 1) % pts.length;
      s += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    return Math.abs(s) / 2;
  }

  function polygonPerimeter(pts) {
    var s = 0;
    for (var i = 0; i < pts.length; i++) s += dist(pts[i], pts[(i + 1) % pts.length]);
    return s;
  }

  function angleAt(a, b, c) {
    var v1 = { x: a.x - b.x, y: a.y - b.y }, v2 = { x: c.x - b.x, y: c.y - b.y };
    var d = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
    if (d < 1e-12) return NaN;
    var cosv = (v1.x * v2.x + v1.y * v2.y) / d;
    return Math.acos(Math.max(-1, Math.min(1, cosv))) * 180 / Math.PI;
  }

  function num(v, dec) {
    if (!isFinite(v)) return '∞';
    var d = dec === undefined ? 3 : dec;
    var r = Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
    if (Object.is(r, -0)) r = 0;
    return String(r);
  }

  /** Propiedades vivas de un objeto, para el panel lateral. */
  function properties(scene, obj) {
    var p = scene.pointsOf(obj), out = [];
    switch (obj.kind) {
      case 'point':
        out.push(['coordenadas', '(' + num(obj.x) + ', ' + num(obj.y) + ')']);
        break;
      case 'segment':
        if (p.length < 2) break;
        out.push(['extremos', p[0].label + p[1].label]);
        out.push(['longitud', num(dist(p[0], p[1]))]);
        out.push(['pendiente', num(slope(p[0], p[1]))]);
        out.push(['punto medio', '(' + num((p[0].x + p[1].x) / 2) + ', ' + num((p[0].y + p[1].y) / 2) + ')']);
        out.push(['recta', lineEquation(p[0], p[1])]);
        break;
      case 'line': case 'ray':
        if (p.length < 2) break;
        out.push(['pendiente', num(slope(p[0], p[1]))]);
        out.push(['ecuación', lineEquation(p[0], p[1])]);
        break;
      case 'circle': {
        if (p.length < 2) break;
        var r = dist(p[0], p[1]);
        out.push(['centro', '(' + num(p[0].x) + ', ' + num(p[0].y) + ')']);
        out.push(['radio', num(r)]);
        out.push(['diámetro', num(2 * r)]);
        out.push(['longitud', num(2 * Math.PI * r)]);
        out.push(['área', num(Math.PI * r * r)]);
        break;
      }
      case 'polygon': {
        if (p.length < 3) break;
        out.push(['vértices', p.map(function (q) { return q.label; }).join('')]);
        out.push(['perímetro', num(polygonPerimeter(p))]);
        out.push(['área', num(polygonArea(p))]);
        if (p.length === 3) {
          var a1 = angleAt(p[2], p[0], p[1]);
          var a2 = angleAt(p[0], p[1], p[2]);
          var a3 = angleAt(p[1], p[2], p[0]);
          out.push(['ángulos', num(a1, 1) + '° · ' + num(a2, 1) + '° · ' + num(a3, 1) + '°']);
          var sides = [dist(p[0], p[1]), dist(p[1], p[2]), dist(p[2], p[0])].sort(function (x, y) { return x - y; });
          var pit = Math.abs(sides[0] * sides[0] + sides[1] * sides[1] - sides[2] * sides[2]);
          if (pit < 1e-6 * Math.max(1, sides[2] * sides[2])) out.push(['tipo', 'rectángulo (Pitágoras)']);
        }
        break;
      }
      case 'angle':
        if (p.length < 3) break;
        out.push(['vértice', p[1].label]);
        out.push(['medida', num(angleAt(p[0], p[1], p[2]), 2) + '°']);
        out.push(['radianes', num(angleAt(p[0], p[1], p[2]) * Math.PI / 180, 4)]);
        break;
    }
    return out;
  }

  var KIND_LABEL = {
    point: 'punto', segment: 'segmento', line: 'recta', ray: 'semirrecta',
    circle: 'circunferencia', polygon: 'polígono', angle: 'ángulo'
  };

  function describe(scene, obj) {
    var p = scene.pointsOf(obj);
    if (obj.kind === 'point') return 'punto';
    if (obj.kind === 'polygon') return (p.length === 3 ? 'triángulo' : p.length === 4 ? 'cuadrilátero' : 'polígono') +
      ' ' + p.map(function (q) { return q.label; }).join('');
    if (obj.kind === 'circle') return 'circunferencia de centro ' + (p[0] ? p[0].label : '?');
    return (KIND_LABEL[obj.kind] || obj.kind) + ' ' + p.map(function (q) { return q.label; }).join('');
  }

  MP.geo = {
    Scene: Scene,
    dist: dist, slope: slope, lineEquation: lineEquation,
    polygonArea: polygonArea, polygonPerimeter: polygonPerimeter,
    angleAt: angleAt, properties: properties, describe: describe, num: num,
    KIND_LABEL: KIND_LABEL
  };
})(window.MP = window.MP || {});

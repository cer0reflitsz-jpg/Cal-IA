/* ── Herramienta: laboratorio de geometría ────────────────────
   Construcción de objetos, arrastre de puntos y medidas que se
   actualizan solas.                                             */
(function (MP) {
  'use strict';
  var G = MP.geo;

  var TOOLS = [
    { id: 'move', label: 'Mover', icon: 'M4 4l6 16 2-7 7-2z' },
    { id: 'point', label: 'Punto', icon: 'M12 9a3 3 0 100 6 3 3 0 000-6z' },
    { id: 'segment', label: 'Segmento', icon: 'M5 19L19 5' },
    { id: 'line', label: 'Recta', icon: 'M3 21L21 3M3 21h0M21 3h0' },
    { id: 'ray', label: 'Semirrecta', icon: 'M5 19L19 5m0 0h-5m5 0v5' },
    { id: 'circle', label: 'Circunf.', icon: 'M12 3a9 9 0 100 18 9 9 0 000-18z' },
    { id: 'triangle', label: 'Triángulo', icon: 'M12 4L21 20H3z' },
    { id: 'polygon', label: 'Polígono', icon: 'M12 3l8 6-3 10H7L4 9z' },
    { id: 'angle', label: 'Ángulo', icon: 'M4 20h16M4 20L16 5M9 20a8 8 0 002-5' },
    { id: 'delete', label: 'Borrar', icon: 'M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13' }
  ];

  var HELP = {
    move: 'Arrastra los puntos para mover la figura. Haz clic en un objeto para seleccionarlo.',
    point: 'Haz clic para crear un punto.',
    segment: 'Haz clic en dos puntos (o en dos lugares vacíos).',
    line: 'Dos puntos definen la recta.',
    ray: 'El primer clic es el origen; el segundo marca la dirección.',
    circle: 'Primer clic: centro. Segundo clic: un punto de la circunferencia.',
    triangle: 'Haz clic en los tres vértices.',
    polygon: 'Haz clic en cada vértice y termina con doble clic o pulsando en el primer punto.',
    angle: 'Tres puntos: lado, vértice, lado. El ángulo se mide en el segundo.',
    delete: 'Haz clic en un objeto para eliminarlo (también se borra lo que dependa de él).'
  };

  var view = null, scene = null, el = {};

  function renderTools() {
    el.tools.innerHTML = '';
    TOOLS.forEach(function (t) {
      var b = document.createElement('button');
      b.className = 'tool-btn';
      b.setAttribute('aria-pressed', view.tool === t.id ? 'true' : 'false');
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + t.icon +
                    '" stroke-linecap="round" stroke-linejoin="round"/></svg><span>' + t.label + '</span>';
      b.onclick = function () { view.setTool(t.id); };
      el.tools.appendChild(b);
    });
    el.help.textContent = HELP[view.tool] || '';
  }

  function renderObjects() {
    el.objects.innerHTML = '';
    var items = scene.objects.slice().reverse();
    if (!items.length) {
      el.objects.innerHTML = '<div class="empty">Todavía no hay objetos.<br>' +
        'Elige una herramienta y haz clic en el plano.</div>';
      return;
    }
    items.forEach(function (o) {
      var props = G.properties(scene, o);
      var div = document.createElement('div');
      div.className = 'obj-item' + (view.selected && view.selected.id === o.id ? ' sel' : '');
      var head = '<div class="obj-head"><span class="obj-name">' + o.label +
                 '</span><span class="obj-kind">' + G.describe(scene, o) + '</span></div>';
      var body = '<dl class="obj-props">' + props.map(function (p) {
        return '<dt>' + p[0] + '</dt><dd>' + p[1] + '</dd>';
      }).join('') + '</dl>';
      div.innerHTML = head + body;
      div.onclick = function () {
        view.selected = o;
        renderObjects();
        view.render();
      };
      el.objects.appendChild(div);
    });
  }

  function refresh() {
    renderTools();
    renderObjects();
  }

  function init() {
    el.tools = document.getElementById('geo-tools');
    el.objects = document.getElementById('geo-objects');
    el.help = document.getElementById('geo-help');
    el.canvas = document.getElementById('geo-canvas');

    scene = new G.Scene();
    view = new MP.GeoView(el.canvas, scene, refresh);

    document.getElementById('geo-snap').onchange = function (e) { view.snap = e.target.checked; };
    document.getElementById('geo-grid').onchange = function (e) { view.showGrid = e.target.checked; view.render(); };
    document.getElementById('geo-zoom-in').onclick = function () { view.zoom(1.3); };
    document.getElementById('geo-zoom-out').onclick = function () { view.zoom(1 / 1.3); };
    document.getElementById('geo-reset').onclick = function () { view.reset(); };
    document.getElementById('geo-clear').onclick = function () {
      scene.clear(); view.selected = null; view.pending = []; view.render(); refresh();
    };
    document.getElementById('geo-demo').onclick = function () { demo(); };

    demo();
    refresh();
    window.addEventListener('resize', function () { if (view) view.render(); });
  }

  /** Figura de ejemplo: un triángulo rectángulo 3-4-5 con su circunferencia. */
  function demo() {
    scene.clear();
    view.selected = null;
    view.pending = [];
    var a = scene.addPoint(-2, -1);
    var b = scene.addPoint(2, -1);
    var c = scene.addPoint(2, 2);
    scene.addFrom('polygon', [a.id, b.id, c.id]);
    scene.addFrom('angle', [a.id, b.id, c.id]);
    var d = scene.addPoint(-1, 2.5);
    var e = scene.addPoint(0.5, 2.5);
    scene.addFrom('circle', [d.id, e.id]);
    view.render();
    refresh();
  }

  /** Carga puntos y una figura concreta (usado por la sección Aprende). */
  function loadExample(points, shape) {
    scene.clear();
    view.selected = null;
    view.pending = [];
    var ids = points.map(function (p) { return scene.addPoint(p[0], p[1]).id; });
    if (shape === 'segment' && ids.length >= 2) scene.addFrom('segment', ids.slice(0, 2));
    else if (shape === 'circle' && ids.length >= 2) scene.addFrom('circle', ids.slice(0, 2));
    else if (shape === 'polygon' && ids.length >= 3) scene.addFrom('polygon', ids);
    view.render();
    refresh();
  }

  MP.tools = MP.tools || {};
  MP.tools.geometry = {
    init: init,
    redraw: function () { if (view) view.render(); },
    loadExample: loadExample
  };
})(window.MP = window.MP || {});

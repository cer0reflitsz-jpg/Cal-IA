/* ── Herramienta: graficador ──────────────────────────────────
   Varias funciones a la vez, sliders automáticos para los
   parámetros libres, zoom, desplazamiento, trazado del punto
   sobre la curva, derivada en un clic y sombreado de áreas.     */
(function (MP) {
  'use strict';
  var A = MP.ast, R = MP.render, plot = MP.plot;

  var COLORS = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8'];

  var state = {
    rows: [],
    seq: 0,
    vp: null,
    trace: true,
    grid: true,
    cursor: null,
    traceRow: null
  };

  var el = {};

  function newRow(src) {
    var row = {
      id: 'r' + (++state.seq),
      src: src || '',
      colorVar: COLORS[state.seq % COLORS.length],
      visible: true,
      params: {},
      node: null,
      error: null,
      compiled: null,
      implicit: false,
      area: null
    };
    state.rows.push(row);
    parseRow(row);
    return row;
  }

  function parseRow(row) {
    row.error = null; row.node = null; row.compiled = null; row.implicit = false;
    var src = row.src.trim();
    if (!src) return;
    try {
      var d = MP.parse.withDeclaration(src);
      var node = d.node;
      row.node = node;
      var vars = A.variables(node);

      if (node.type === 'eq' && vars.indexOf('y') >= 0) {
        row.implicit = true;
        var g = A.add([node.a, A.mul([A.num(-1), node.b])]);
        row.gFn = function (x, y, params) {
          var sc = { x: x, y: y };
          for (var k in params) if (k !== 'x' && k !== 'y') sc[k] = params[k];
          return MP.evaluate(g, sc);
        };
        vars.forEach(function (v) {
          if (v !== 'x' && v !== 'y' && row.params[v] === undefined) row.params[v] = 1;
        });
        return;
      }

      if (node.type === 'eq') node = A.add([node.a, A.mul([A.num(-1), node.b])]);
      row.compiled = MP.compile(node, 'x');
      row.plotNode = node;
      vars.forEach(function (v) {
        if (v !== 'x' && row.params[v] === undefined) row.params[v] = 1;
      });
      Object.keys(row.params).forEach(function (p) {
        if (vars.indexOf(p) < 0) delete row.params[p];
      });
    } catch (e) {
      row.error = e.message;
    }
  }

  /* ── Panel lateral ───────────────────────────────────────── */
  function renderList() {
    el.list.innerHTML = '';
    state.rows.forEach(function (row) {
      var item = document.createElement('div');
      item.className = 'expr-item';

      var head = document.createElement('div');
      head.className = 'expr-head';

      var sw = document.createElement('button');
      sw.className = 'expr-swatch' + (row.visible ? '' : ' off');
      sw.style.background = plot.css(row.colorVar);
      sw.title = row.visible ? 'Ocultar' : 'Mostrar';
      sw.setAttribute('aria-label', row.visible ? 'Ocultar función' : 'Mostrar función');
      sw.onclick = function () { row.visible = !row.visible; renderList(); draw(); };

      var input = document.createElement('input');
      input.className = 'expr-input';
      input.value = row.src;
      input.placeholder = 'f(x) = x^2';
      input.spellcheck = false;
      input.setAttribute('aria-label', 'Expresión');
      input.oninput = function () {
        row.src = input.value;
        parseRow(row);
        renderPreview(item, row);
        renderSliders(item, row);
        draw();
      };

      var acts = document.createElement('div');
      acts.className = 'expr-actions';

      var dbtn = document.createElement('button');
      dbtn.className = 'btn ghost icon sm';
      dbtn.innerHTML = '<span class="math" style="font-size:12px">f′</span>';
      dbtn.title = 'Añadir la derivada como nueva función';
      dbtn.onclick = function () { addDerivative(row); };

      var abtn = document.createElement('button');
      abtn.className = 'btn ghost icon sm';
      abtn.innerHTML = '<span class="math bigop" style="font-size:16px">∫</span>';
      abtn.title = 'Sombrear el área bajo la curva';
      abtn.onclick = function () {
        row.area = row.area ? null : { a: -1, b: 1 };
        renderSliders(item, row); draw();
      };

      var del = document.createElement('button');
      del.className = 'btn ghost icon sm danger';
      del.innerHTML = '✕';
      del.title = 'Eliminar';
      del.setAttribute('aria-label', 'Eliminar función');
      del.onclick = function () {
        state.rows = state.rows.filter(function (r) { return r.id !== row.id; });
        renderList(); draw();
      };

      acts.appendChild(dbtn); acts.appendChild(abtn); acts.appendChild(del);
      head.appendChild(sw); head.appendChild(input); head.appendChild(acts);
      item.appendChild(head);
      el.list.appendChild(item);

      renderPreview(item, row);
      renderSliders(item, row);
    });
  }

  function renderPreview(item, row) {
    var old = item.querySelector('.expr-preview, .expr-error');
    if (old) old.remove();
    if (row.error) {
      var e = document.createElement('div');
      e.className = 'expr-error';
      e.textContent = row.error;
      item.appendChild(e);
      return;
    }
    if (!row.node) return;
    var p = document.createElement('div');
    p.className = 'expr-preview';
    p.innerHTML = R.html(MP.simplify(row.node));
    item.appendChild(p);
  }

  function renderSliders(item, row) {
    Array.prototype.forEach.call(item.querySelectorAll('.slider-row, .area-row'), function (n) { n.remove(); });
    Object.keys(row.params).sort().forEach(function (p) {
      var wrap = document.createElement('div');
      wrap.className = 'slider-row';
      var name = document.createElement('span');
      name.className = 'pname'; name.textContent = p;
      var range = document.createElement('input');
      range.type = 'range'; range.min = -5; range.max = 5; range.step = 0.1;
      range.value = row.params[p];
      range.setAttribute('aria-label', 'Parámetro ' + p);
      var val = document.createElement('span');
      val.className = 'pval'; val.textContent = Number(row.params[p]).toFixed(1);
      range.oninput = function () {
        row.params[p] = parseFloat(range.value);
        val.textContent = Number(row.params[p]).toFixed(1);
        draw();
      };
      wrap.appendChild(name); wrap.appendChild(range); wrap.appendChild(val);
      item.appendChild(wrap);
    });

    if (row.area) {
      var ar = document.createElement('div');
      ar.className = 'area-row slider-row';
      ar.style.gridTemplateColumns = '1fr 1fr';
      ['a', 'b'].forEach(function (k) {
        var box = document.createElement('label');
        box.className = 'small muted';
        box.style.display = 'flex';
        box.style.alignItems = 'center';
        box.style.gap = '5px';
        box.textContent = k === 'a' ? 'de' : 'a';
        var inp = document.createElement('input');
        inp.type = 'number'; inp.className = 'field mini'; inp.step = '0.5';
        inp.value = row.area[k];
        inp.oninput = function () { row.area[k] = parseFloat(inp.value) || 0; draw(); };
        box.appendChild(inp);
        ar.appendChild(box);
      });
      item.appendChild(ar);

      var out = document.createElement('div');
      out.className = 'slider-row area-row';
      out.style.gridTemplateColumns = '1fr';
      out.dataset.areaOut = row.id;
      item.appendChild(out);
    }
  }

  function addDerivative(row) {
    if (!row.plotNode) return;
    try {
      var d = MP.calculus.derivative(row.plotNode, 'x');
      var r = newRow("f'(x) = " + R.toSource(d.result));
      r.params = Object.assign({}, row.params);
      parseRow(r);
      renderList(); draw();
      MP.app.toast('Derivada añadida al gráfico');
    } catch (e) {
      MP.app.toast('No pude derivar: ' + e.message);
    }
  }

  /* ── Dibujo ──────────────────────────────────────────────── */
  function draw() {
    if (!el.canvas) return;
    var vp = state.vp;
    var ctx = plot.setupCanvas(el.canvas, vp);
    plot.drawGrid(ctx, vp, { grid: state.grid, axes: true, labels: true });

    state.rows.forEach(function (row) {
      if (!row.visible) return;
      var color = plot.css(row.colorVar);

      if (row.implicit && row.gFn) {
        plot.drawImplicit(ctx, vp, function (x, y) { return row.gFn(x, y, row.params); }, color, 2);
        return;
      }
      if (!row.compiled) return;
      var f = function (x) { return row.compiled(x, row.params); };

      if (row.area) {
        plot.drawArea(ctx, vp, f, row.area.a, row.area.b, color);
        var res = MP.calculus.numericIntegral(f, Math.min(row.area.a, row.area.b), Math.max(row.area.a, row.area.b), 1200);
        var out = el.list.querySelector('[data-area-out="' + row.id + '"]');
        if (out) {
          out.innerHTML = '<span class="small muted">área con signo ≈ </span>' +
            '<span class="mono small">' + (Math.round(res.value * 1e6) / 1e6) + '</span>';
        }
      }
      plot.drawCurve(ctx, vp, f, color, 2.1);
    });

    // trazado sobre la curva más cercana al cursor
    if (state.trace && state.cursor) {
      var best = null;
      state.rows.forEach(function (row) {
        if (!row.visible || !row.compiled) return;
        var y = row.compiled(state.cursor.x, row.params);
        if (!isFinite(y)) return;
        var d = Math.abs(vp.sy(y) - state.cursor.py);
        if (d < 40 && (!best || d < best.d)) best = { d: d, row: row, y: y };
      });
      if (best) {
        plot.drawPoint(ctx, vp, state.cursor.x, best.y, plot.css(best.row.colorVar), null);
        el.readout.innerHTML = '<span class="math">(' +
          plot.fmt(state.cursor.x, 0.001) + ', ' + plot.fmt(best.y, 0.001) + ')</span>';
      } else {
        el.readout.textContent = plot.fmt(state.cursor.x, 0.001) + ' , ' + plot.fmt(state.cursor.y, 0.001);
      }
    }
  }

  /* ── Eventos del lienzo ──────────────────────────────────── */
  function bindCanvas() {
    var c = el.canvas, drag = null, pointers = {}, pinch = null;

    function pos(e) {
      var r = c.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    c.addEventListener('pointerdown', function (e) {
      c.setPointerCapture(e.pointerId);
      pointers[e.pointerId] = pos(e);
      var ids = Object.keys(pointers);
      if (ids.length === 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) };
        drag = null;
        return;
      }
      drag = { last: pos(e) };
    });

    c.addEventListener('pointermove', function (e) {
      var p = pos(e);
      if (pointers[e.pointerId]) pointers[e.pointerId] = p;
      var ids = Object.keys(pointers);
      if (pinch && ids.length === 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch.d > 0) state.vp.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinch.d);
        pinch.d = d;
        draw();
        return;
      }
      if (drag) {
        state.vp.panPixels(p.x - drag.last.x, p.y - drag.last.y);
        drag.last = p;
      }
      state.cursor = { x: state.vp.wx(p.x), y: state.vp.wy(p.y), py: p.y };
      draw();
    });

    function end(e) {
      delete pointers[e.pointerId];
      if (Object.keys(pointers).length < 2) pinch = null;
      drag = null;
    }
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', function () { state.cursor = null; el.readout.textContent = ''; draw(); });

    c.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = c.getBoundingClientRect();
      state.vp.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.pow(0.999, e.deltaY));
      draw();
    }, { passive: false });
  }

  /* ── Inicio ──────────────────────────────────────────────── */
  function init() {
    el.list = document.getElementById('g-list');
    el.canvas = document.getElementById('g-canvas');
    el.readout = document.getElementById('g-readout');

    state.vp = new MP.Viewport();
    state.vp.resize(el.canvas.clientWidth || 800, el.canvas.clientHeight || 600);
    state.vp.reset();

    document.getElementById('g-add').onclick = function () {
      newRow(''); renderList();
      var inputs = el.list.querySelectorAll('.expr-input');
      if (inputs.length) inputs[inputs.length - 1].focus();
    };
    document.getElementById('g-zoom-in').onclick = function () { state.vp.zoom(1.3); draw(); };
    document.getElementById('g-zoom-out').onclick = function () { state.vp.zoom(1 / 1.3); draw(); };
    document.getElementById('g-reset').onclick = function () { state.vp.reset(); draw(); };
    document.getElementById('g-grid').onchange = function (e) { state.grid = e.target.checked; draw(); };
    document.getElementById('g-trace').onchange = function (e) { state.trace = e.target.checked; draw(); };

    Array.prototype.forEach.call(document.querySelectorAll('[data-g-example]'), function (b) {
      b.onclick = function () {
        addExpression(b.dataset.gExample);
      };
    });

    bindCanvas();

    newRow('f(x) = x^2');
    newRow('g(x) = a*x + b');
    renderList();
    draw();

    window.addEventListener('resize', function () { draw(); });
  }

  function addExpression(src) {
    var empty = state.rows.filter(function (r) { return !r.src.trim(); })[0];
    if (empty) { empty.src = src; parseRow(empty); }
    else newRow(src);
    renderList();
    draw();
  }

  MP.tools = MP.tools || {};
  MP.tools.graph = { init: init, draw: draw, addExpression: addExpression, state: state };
})(window.MP = window.MP || {});

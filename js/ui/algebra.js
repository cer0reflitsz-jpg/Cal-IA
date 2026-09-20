/* ── Herramienta: álgebra y cálculo ───────────────────────────
   Una sola entrada y seis operaciones, todas con procedimiento
   y con verificación del resultado.                             */
(function (MP) {
  'use strict';
  var A = MP.ast, R = MP.render;

  var el = {}, lastResult = null;

  var OPS = [
    { id: 'simplify', label: 'Simplificar' },
    { id: 'expand', label: 'Desarrollar' },
    { id: 'factor', label: 'Factorizar' },
    { id: 'solve', label: 'Resolver' },
    { id: 'derive', label: 'Derivar' },
    { id: 'integrate', label: 'Integrar' }
  ];

  function stepsHTML(steps) {
    if (!steps || !steps.length) return '';
    return '<div class="card"><div class="label">Procedimiento</div><div class="steps">' +
      steps.map(function (s) {
        return '<div class="step"><div><div class="why">' + s.why + '</div>' +
               '<div class="what">' + s.html + '</div></div></div>';
      }).join('') + '</div></div>';
  }

  function resultBlock(tag, node, extra) {
    return '<div class="result-line"><span class="tag">' + tag + '</span>' +
           '<span class="val">' + (node ? R.html(node, 'math-lg') : '') + '</span>' +
           (extra || '') + '</div>';
  }

  function graphButton(node, label) {
    if (!node) return '';
    return '<button class="btn sm" data-graph="' + R.esc(R.toSource(node)) + '">' +
           (label || 'Ver en el graficador') + '</button>';
  }

  function run(op) {
    var src = el.input.value.trim();
    if (!src) return;
    var out = '';
    try {
      var node = MP.parse(src);
      lastResult = null;

      if (op === 'simplify') {
        var s = MP.simplify(node);
        out = resultBlock('resultado', s) +
          '<div class="btn-row">' + graphButton(s) + '</div>';
        lastResult = s;

      } else if (op === 'expand') {
        var r = MP.algebra.expand(node);
        out = resultBlock('resultado', r.result) + stepsHTML(r.steps) +
          '<div class="btn-row">' + graphButton(r.result) + '</div>';
        lastResult = r.result;

      } else if (op === 'factor') {
        var f = MP.algebra.factor(node);
        out = resultBlock('resultado', f.result) +
          (f.message ? '<div class="hint-box">' + f.message + '</div>' : '') +
          stepsHTML(f.steps) +
          '<div class="btn-row">' + graphButton(f.result) + '</div>';
        lastResult = f.result;

      } else if (op === 'solve') {
        var res = MP.algebra.solve(node);
        out = solutionsHTML(res) + stepsHTML(res.steps);
        var plotNode = node.type === 'eq'
          ? MP.simplify(A.add([node.a, A.mul([A.num(-1), node.b])]))
          : MP.simplify(node);
        out += '<div class="btn-row">' + graphButton(plotNode, 'Ver dónde corta el eje X') + '</div>';

      } else if (op === 'derive') {
        var d = MP.calculus.derivative(node);
        out = '<div class="result-line"><span class="tag">d/d' + d.variable + '</span>' +
              '<span class="val">' + R.html(d.result, 'math-lg') + '</span></div>' +
              stepsHTML(d.steps) +
              '<div class="btn-row">' +
              graphButton(MP.simplify(node), 'Graficar f') +
              graphButton(d.result, 'Graficar f′') + '</div>';
        lastResult = d.result;

      } else if (op === 'integrate') {
        var i = MP.calculus.integral(node);
        if (i.result) {
          out = resultBlock('resultado', i.display) + stepsHTML(i.steps) +
            '<div class="btn-row">' + graphButton(i.result, 'Graficar la primitiva') + '</div>';
          lastResult = i.result;
        } else {
          out = '<div class="hint-box">' + i.message + '</div>' + stepsHTML(i.steps);
        }
      }

      el.output.innerHTML = out;
      bindGraphButtons();
    } catch (e) {
      el.output.innerHTML = '<div class="error-box">' + R.esc(e.message) + '</div>';
    }
  }

  function solutionsHTML(res) {
    var out = '';
    if (res.solutions && res.solutions.length) {
      res.solutions.forEach(function (s) {
        var dec = MP.evaluate(s, {});
        var extra = (isFinite(dec) && !(s.type === 'num' && s.r.isInt()))
          ? '<span class="muted mono small">≈ ' + (Math.round(dec * 1e8) / 1e8) + '</span>' : '';
        out += resultBlock(res.variable + ' =', s, extra);
      });
    }
    if (res.approximate && res.approximate.length) {
      res.approximate.forEach(function (x) {
        out += '<div class="result-line"><span class="tag">' + res.variable +
               ' ≈</span><span class="val mono">' + x + '</span></div>';
      });
    }
    if (!res.solutions.length && !(res.approximate || []).length) {
      out += '<div class="hint-box">' + (res.message || 'Sin soluciones reales.') + '</div>';
    } else if (res.message) {
      out += '<div class="hint-box">' + res.message + '</div>';
    }
    return out;
  }

  function bindGraphButtons() {
    Array.prototype.forEach.call(el.output.querySelectorAll('[data-graph]'), function (b) {
      b.onclick = function () { MP.app.openGraph(b.dataset.graph); };
    });
  }

  function setInput(v) {
    el.input.value = v;
    el.preview.innerHTML = '';
    updatePreview();
  }

  function updatePreview() {
    var src = el.input.value.trim();
    if (!src) { el.preview.innerHTML = ''; return; }
    try {
      el.preview.innerHTML = R.html(MP.parse(src), 'math-lg');
    } catch (e) {
      el.preview.innerHTML = '<span class="muted small">' + R.esc(e.message) + '</span>';
    }
  }

  function init() {
    el.input = document.getElementById('alg-input');
    el.preview = document.getElementById('alg-preview');
    el.output = document.getElementById('alg-output');
    el.ops = document.getElementById('alg-ops');

    OPS.forEach(function (o) {
      var b = document.createElement('button');
      b.className = 'btn' + (o.id === 'solve' ? ' primary' : '');
      b.textContent = o.label;
      b.onclick = function () { run(o.id); };
      el.ops.appendChild(b);
    });

    el.input.addEventListener('input', updatePreview);
    el.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); run('solve'); }
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-alg-example]'), function (b) {
      b.onclick = function () {
        setInput(b.dataset.algExample);
        run(b.dataset.algOp || 'solve');
      };
    });

    setInput('x^2 - 5x + 6 = 0');
    el.output.innerHTML = '<div class="empty">Escribe una expresión o ecuación y elige una operación.</div>';
  }

  MP.tools = MP.tools || {};
  MP.tools.algebra = { init: init, setInput: setInput, run: run };
})(window.MP = window.MP || {});

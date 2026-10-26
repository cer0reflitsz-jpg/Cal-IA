/* ── Herramienta: calculadora ─────────────────────────────────
   Devuelve resultado exacto (fracción o radical) y decimal, y
   muestra el procedimiento cuando la entrada es una ecuación.   */
(function (MP) {
  'use strict';
  var A = MP.ast, R = MP.render;

  var KEYS = [
    ['7', '7'], ['8', '8'], ['9', '9'], ['(', '('], [')', ')'], ['C', 'clear', 'fn'],
    ['4', '4'], ['5', '5'], ['6', '6'], ['×', '*', 'op'], ['÷', '/', 'op'], ['⌫', 'back', 'fn'],
    ['1', '1'], ['2', '2'], ['3', '3'], ['+', '+', 'op'], ['−', '-', 'op'], ['^', '^', 'op'],
    ['0', '0'], ['.', '.'], ['π', 'pi'], ['e', 'e'], ['√', 'sqrt('], ['=', 'eval', 'accent'],
    ['sin', 'sin(', 'fn'], ['cos', 'cos(', 'fn'], ['tan', 'tan(', 'fn'],
    ['ln', 'ln(', 'fn'], ['log', 'log(', 'fn'], ['x', 'x', 'fn']
  ];

  var el = {}, history = [], degrees = false;

  function setInput(v) {
    el.input.value = v;
    preview();
    el.input.focus();
  }

  function insert(text) {
    var i = el.input.selectionStart === null ? el.input.value.length : el.input.selectionStart;
    var j = el.input.selectionEnd === null ? i : el.input.selectionEnd;
    var v = el.input.value;
    el.input.value = v.slice(0, i) + text + v.slice(j);
    el.input.selectionStart = el.input.selectionEnd = i + text.length;
    preview();
    el.input.focus();
  }

  function preview() {
    var src = el.input.value.trim();
    if (!src) { el.preview.innerHTML = '<span class="muted small">Escribe una expresión…</span>'; return; }
    try {
      var node = MP.parse(src);
      el.preview.innerHTML = R.html(node, 'math-lg');
    } catch (e) {
      el.preview.innerHTML = '<span class="muted small">…</span>';
    }
  }

  function decimalOf(node) {
    var v = MP.evaluate(node, {}, { degrees: degrees });
    return v;
  }

  function show(html) { el.output.innerHTML = html; }

  function compute() {
    var src = el.input.value.trim();
    if (!src) return;
    var out = '';
    try {
      var node = MP.parse(src);

      if (node.type === 'eq') {
        var res = MP.algebra.solve(node);
        out += '<div class="steps">' + res.steps.map(function (s) {
          return '<div class="step"><div><div class="why">' + s.why + '</div>' +
                 '<div class="what">' + s.html + '</div></div></div>';
        }).join('') + '</div>';
        out += solutionsHTML(res);
        show(out);
        pushHistory(src, res.solutions.length
          ? res.solutions.map(function (s) { return R.html(s); }).join(', ')
          : (res.message || ''));
        return;
      }

      var vars = A.variables(node);
      var simplified = MP.simplify(MP.expand(node));

      if (vars.length === 0) {
        var dec = decimalOf(node);
        out += '<div class="result-line"><span class="tag">exacto</span>' +
               '<span class="val">' + R.html(simplified) + '</span></div>';
        if (isFinite(dec)) {
          out += '<div class="result-line"><span class="tag">decimal</span>' +
                 '<span class="val mono">' + formatNumber(dec) + '</span></div>';
        } else {
          out += '<div class="error-box">El resultado no está definido en los números reales.</div>';
        }
        show(out);
        pushHistory(src, R.html(simplified));
        return;
      }

      out += '<div class="result-line"><span class="tag">simplificado</span>' +
             '<span class="val">' + R.html(simplified) + '</span></div>';
      out += '<div class="muted small" style="margin-top:6px">Contiene ' +
             (vars.length === 1 ? 'la variable ' : 'las variables ') + vars.join(', ') +
             '. Puedes graficarla o derivarla.</div>' +
             '<div class="btn-row" style="margin-top:8px">' +
             '<button class="btn sm" id="calc-graph">Ver en el graficador</button>' +
             '<button class="btn sm" id="calc-algebra">Abrir en álgebra</button></div>';
      show(out);
      document.getElementById('calc-graph').onclick = function () {
        MP.app.openGraph(R.toSource(simplified));
      };
      document.getElementById('calc-algebra').onclick = function () {
        MP.app.openAlgebra(src);
      };
      pushHistory(src, R.html(simplified));
    } catch (e) {
      show('<div class="error-box">' + R.esc(e.message) + '</div>');
    }
  }

  function solutionsHTML(res) {
    var out = '';
    if (res.solutions && res.solutions.length) {
      res.solutions.forEach(function (s) {
        var dec = MP.evaluate(s, {});
        out += '<div class="result-line"><span class="tag">' + res.variable + ' =</span>' +
               '<span class="val">' + R.html(s) + '</span>' +
               (isFinite(dec) && !MP.ast.isNum(s)
                 ? '<span class="muted mono small">≈ ' + formatNumber(dec) + '</span>' : '') +
               '</div>';
      });
    }
    if (res.approximate && res.approximate.length) {
      res.approximate.forEach(function (x) {
        out += '<div class="result-line"><span class="tag">' + res.variable + ' ≈</span>' +
               '<span class="val mono">' + formatNumber(x) + '</span></div>';
      });
    }
    if (res.message) out += '<div class="hint-box">' + res.message + '</div>';
    return out;
  }

  function formatNumber(v) {
    if (!isFinite(v)) return '—';
    if (Math.abs(v) >= 1e12 || (Math.abs(v) < 1e-9 && v !== 0)) return v.toExponential(8);
    var s = String(Math.round(v * 1e10) / 1e10);
    return s;
  }

  function pushHistory(src, html) {
    history.unshift({ src: src, html: html });
    if (history.length > 30) history.pop();
    renderHistory();
  }

  function renderHistory() {
    if (!history.length) {
      el.history.innerHTML = '<div class="empty">El historial aparecerá aquí.</div>';
      return;
    }
    el.history.innerHTML = '';
    history.forEach(function (h) {
      var d = document.createElement('div');
      d.className = 'history-item';
      d.innerHTML = '<div class="h-in">' + R.esc(h.src) + '</div><div class="h-out">' + h.html + '</div>';
      d.onclick = function () { setInput(h.src); };
      el.history.appendChild(d);
    });
  }

  function init() {
    el.input = document.getElementById('calc-input');
    el.preview = document.getElementById('calc-preview');
    el.output = document.getElementById('calc-output');
    el.history = document.getElementById('calc-history');
    el.keypad = document.getElementById('calc-keypad');

    KEYS.forEach(function (k) {
      var b = document.createElement('button');
      b.className = 'key' + (k[2] ? ' ' + k[2] : '');
      b.textContent = k[0];
      b.onclick = function () {
        if (k[1] === 'clear') { setInput(''); show('<div class="empty">Escribe algo y pulsa =</div>'); }
        else if (k[1] === 'back') {
          var v = el.input.value;
          setInput(v.slice(0, -1));
        }
        else if (k[1] === 'eval') compute();
        else insert(k[1]);
      };
      el.keypad.appendChild(b);
    });

    el.input.addEventListener('input', preview);
    el.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); compute(); }
    });
    document.getElementById('calc-eval').onclick = compute;
    document.getElementById('calc-deg').onclick = function () {
      degrees = !degrees;
      this.textContent = degrees ? 'GRAD' : 'RAD';
      this.classList.toggle('primary', degrees);
    };

    Array.prototype.forEach.call(document.querySelectorAll('[data-calc-example]'), function (b) {
      b.onclick = function () { setInput(b.dataset.calcExample); compute(); };
    });

    renderHistory();
    preview();
    show('<div class="empty">Escribe una operación, una expresión o una ecuación<br>y pulsa <b>=</b></div>');
  }

  MP.tools = MP.tools || {};
  MP.tools.calculator = { init: init, setInput: setInput, compute: compute };
})(window.MP = window.MP || {});

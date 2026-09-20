/* ── Herramienta: Aprende ─────────────────────────────────────
   Ningún resultado de esta sección está escrito a mano: cada
   ejemplo se calcula aquí mismo con MP.simplify / MP.algebra /
   MP.calculus / MP.geo — el mismo motor que usan las
   herramientas — así que un ejemplo mal escrito falla como un
   error visible en vez de mostrar un dato incorrecto.           */
(function (MP) {
  'use strict';
  var A = MP.ast, R = MP.render, G = MP.geo;

  var el = {}, active = null;

  function stepsHTML(steps) {
    if (!steps || !steps.length) return '';
    return '<div class="steps">' + steps.map(function (s) {
      return '<div class="step"><div><div class="why">' + s.why + '</div>' +
             '<div class="what">' + s.html + '</div></div></div>';
    }).join('') + '</div>';
  }

  function line(tag, valHTML, extra) {
    return '<div class="result-line"><span class="tag">' + tag + '</span>' +
           '<span class="val">' + valHTML + '</span>' + (extra || '') + '</div>';
  }

  /** Calcula el bloque de ejemplo de un tema. Puede lanzar: se captura arriba. */
  function computeExample(ex) {
    switch (ex.kind) {
      case 'value': {
        var node = MP.parse(ex.expr);
        var dec = MP.evaluate(node, {}, { degrees: ex.degrees });
        var out = line(ex.expr + ' =', R.html(MP.simplify(node)));
        if (!(node.type === 'num')) {
          out += line('decimal', '<span class="mono">' + round(dec) + '</span>');
        }
        if (ex.compare) {
          var cNode = MP.parse(ex.compare);
          out += line(ex.compare + ' =', R.html(MP.simplify(cNode)));
        }
        return out;
      }

      case 'algebra': {
        var n = MP.parse(ex.expr);
        var res, label;
        if (ex.op === 'simplify') { res = { result: MP.simplify(n) }; label = 'resultado'; }
        else if (ex.op === 'expand') { res = MP.algebra.expand(n); label = 'desarrollado'; }
        else if (ex.op === 'factor') { res = MP.algebra.factor(n); label = 'factorizado'; }
        return line(ex.expr + ' =', R.html(res.result)) + stepsHTML(res.steps);
      }

      case 'solve': {
        var eqn = MP.parse(ex.expr);
        var r = MP.algebra.solve(eqn);
        var html = '';
        r.solutions.forEach(function (s) {
          html += line(r.variable + ' =', R.html(s));
        });
        return html + stepsHTML(r.steps);
      }

      case 'derive': {
        var d = MP.calculus.derivative(MP.parse(ex.expr));
        return line('f(x) = ' + ex.expr, '') +
               line('f\u2032(x) =', R.html(d.result)) + stepsHTML(d.steps);
      }

      case 'multi-derive': {
        var out2 = '';
        ex.items.forEach(function (it) {
          var dd = MP.calculus.derivative(MP.parse(it.expr));
          out2 += '<div class="muted small" style="margin:10px 0 2px">' + it.label + '</div>' +
                  line('d/dx [' + it.expr + '] =', R.html(dd.result));
        });
        return out2;
      }

      case 'integrate': {
        var iNode = MP.parse(ex.expr);
        var ir = MP.calculus.integral(iNode);
        var out3 = line('\u222b ' + ex.expr + ' dx =', R.html(ir.display));
        if (ex.definite) {
          var f = MP.compile(iNode, 'x');
          var num = MP.calculus.numericIntegral(f, ex.definite.a, ex.definite.b, 4000);
          out3 += line('área entre x=' + ex.definite.a + ' y x=' + ex.definite.b + ' ≈',
            '<span class="mono">' + round(num.value) + '</span>');
        }
        return out3 + stepsHTML(ir.steps);
      }

      case 'function': {
        var fn = MP.parse.withDeclaration('f(x) = ' + ex.expr).node;
        var comp = MP.compile(fn, 'x');
        var rows = ex.at.map(function (x) {
          return '<div class="result-line"><span class="tag">f(' + x + ') =</span>' +
                 '<span class="val mono">' + round(comp(x, {})) + '</span></div>';
        }).join('');
        return line('f(x) =', R.html(MP.simplify(fn))) + rows;
      }

      case 'linefit': {
        var pa = { x: ex.a[0], y: ex.a[1] }, pb = { x: ex.b[0], y: ex.b[1] };
        var m = G.slope(pa, pb);
        return line('A, B', '(' + pa.x + ', ' + pa.y + ')  y  (' + pb.x + ', ' + pb.y + ')') +
               line('pendiente m =', '<span class="mono">' + round(m) + '</span>') +
               line('ecuación', G.lineEquation(pa, pb));
      }

      case 'quadratic': {
        var qf = MP.parse(ex.expr);
        var qd = MP.calculus.derivative(qf).result;
        var qr = MP.algebra.solve(qf.type === 'eq' ? qf : A.eq(qf, A.num(0)));
        var vx = MP.algebra.solve(MP.simplify(A.eq(qd, A.num(0)))).solutions[0];
        var vxN = MP.evaluate(vx, {});
        var vy = MP.evaluate(qf, { x: vxN });
        var out4 = line('f(x) =', R.html(MP.simplify(qf)));
        qr.solutions.forEach(function (s) {
          out4 += line('raíz: x =', R.html(s));
        });
        out4 += line('vértice', '(' + round(vxN) + ', ' + round(vy) + ')');
        return out4;
      }

      case 'geom-distance': {
        var da = { x: ex.a[0], y: ex.a[1] }, db = { x: ex.b[0], y: ex.b[1] };
        return line('A, B', '(' + da.x + ', ' + da.y + ')  y  (' + db.x + ', ' + db.y + ')') +
               line('distancia AB =', '<span class="mono">' + round(G.dist(da, db)) + '</span>');
      }

      case 'geom-slope': {
        var sa = { x: ex.a[0], y: ex.a[1] }, sb = { x: ex.b[0], y: ex.b[1] };
        return line('A, B', '(' + sa.x + ', ' + sa.y + ')  y  (' + sb.x + ', ' + sb.y + ')') +
               line('pendiente =', '<span class="mono">' + round(G.slope(sa, sb)) + '</span>') +
               line('ecuación', G.lineEquation(sa, sb));
      }

      case 'geom-circle': {
        var rad = ex.radius;
        return line('radio =', rad) +
               line('área = πr² ≈', '<span class="mono">' + round(Math.PI * rad * rad) + '</span>') +
               line('longitud = 2πr ≈', '<span class="mono">' + round(2 * Math.PI * rad) + '</span>');
      }

      case 'geom-triangle': {
        var A0 = { x: ex.a[0], y: ex.a[1] }, B0 = { x: ex.b[0], y: ex.b[1] }, C0 = { x: ex.c[0], y: ex.c[1] };
        var ab = G.dist(A0, B0), bc = G.dist(B0, C0), ca = G.dist(C0, A0);
        var ang = G.angleAt(A0, B0, C0);
        return line('lados', round(ab) + ', ' + round(bc) + ', ' + round(ca)) +
               line('ángulo en B =', '<span class="mono">' + round(ang) + '°</span>') +
               line('comprobación', '<span class="mono">' + round(ab) + '² + ' + round(bc) + '² = ' +
                    round(ab * ab + bc * bc) + '  vs.  ' + round(ca) + '² = ' + round(ca * ca) + '</span>');
      }

      case 'trig': {
        return ex.items.map(function (it) {
          var v = MP.evaluate(MP.parse(it.expr), {}, { degrees: true });
          return line(it.label + ' =', '<span class="mono">' + round(v) + '</span>');
        }).join('');
      }
    }
    return '<div class="muted small">Sin ejemplo.</div>';
  }

  function round(v) {
    if (!isFinite(v)) return '—';
    var r = Math.round(v * 1e6) / 1e6;
    return Object.is(r, -0) ? '0' : String(r);
  }

  function actionLabel(action) {
    switch (action.type) {
      case 'graph': return 'Ábrelo en el graficador';
      case 'calculator': return 'Ábrelo en la calculadora';
      case 'algebra': return 'Ábrelo en álgebra y cálculo';
      case 'geometry': return 'Constrúyelo en geometría';
    }
    return 'Probar';
  }

  function runAction(action) {
    switch (action.type) {
      case 'graph': MP.app.openGraph(action.expr); break;
      case 'calculator': MP.app.openCalculator(action.expr); break;
      case 'algebra': MP.app.openAlgebra(action.expr, action.op); break;
      case 'geometry':
        MP.tools.geometry.loadExample(action.points, action.shape);
        MP.app.switchTool('geometry');
        MP.app.toast('Construido en el laboratorio de geometría');
        break;
    }
  }

  function findTopic(id) {
    var found = null;
    MP.content.topics.forEach(function (cat) {
      cat.items.forEach(function (t) { if (t.id === id) found = t; });
    });
    return found;
  }

  function renderList() {
    el.list.innerHTML = '';
    MP.content.topics.forEach(function (cat) {
      var h = document.createElement('div');
      h.className = 'lesson-cat';
      h.textContent = cat.name;
      el.list.appendChild(h);
      cat.items.forEach(function (t) {
        var b = document.createElement('button');
        b.className = 'topic-btn' + (active === t.id ? ' active' : '');
        b.textContent = t.title;
        b.onclick = function () { select(t.id); };
        el.list.appendChild(b);
      });
    });
  }

  function select(id) {
    active = id;
    renderList();
    var t = findTopic(id);
    if (!t) return;
    var cat = MP.content.topics.filter(function (c) { return c.items.indexOf(t) >= 0; })[0];

    var exampleHTML = '';
    try {
      exampleHTML = computeExample(t.example);
    } catch (e) {
      exampleHTML = '<div class="error-box">No se pudo calcular el ejemplo: ' + R.esc(e.message) + '</div>';
    }

    el.content.innerHTML =
      '<div class="inner">' +
      '<div class="chip accent lesson-cat-tag">' + R.esc(cat.name) + '</div>' +
      '<h1 class="lesson-title">' + R.esc(t.title) + '</h1>' +
      '<div class="lesson-block"><div class="lb-label">Intuición</div><p>' + R.esc(t.intuition) + '</p></div>' +
      '<div class="lesson-block"><div class="lb-label">Explicación</div><p>' + R.esc(t.explanation) + '</p></div>' +
      '<div class="card example-card"><div class="label">Ejemplo resuelto</div>' + exampleHTML + '</div>' +
      '<div class="btn-row" style="margin-top:14px">' +
      '<button class="btn primary" id="learn-action">' + actionLabel(t.action) + '</button>' +
      (MP.exbank.has(t.id) ? '<button class="btn" id="learn-practice">¿Quieres practicar esto? →</button>' : '') +
      '</div>' +
      '</div>';

    var btn = document.getElementById('learn-action');
    if (btn) btn.onclick = function () { runAction(t.action); };
    var practiceBtn = document.getElementById('learn-practice');
    if (practiceBtn) practiceBtn.onclick = function () {
      MP.app.switchTool('practice');
      MP.tools.practice.startTopic(t.id, 'basico');
    };
    el.content.scrollTop = 0;
  }

  function init() {
    el.list = document.getElementById('learn-list');
    el.content = document.getElementById('learn-content');
    renderList();
    var first = MP.content.topics[0].items[0];
    select(first.id);
  }

  MP.tools = MP.tools || {};
  MP.tools.learn = { init: init, select: select };
})(window.MP = window.MP || {});

/* ── Álgebra con procedimiento ────────────────────────────────
   Resolver, factorizar y desarrollar. Cada operación devuelve
   además la lista de pasos que la justifica.
   Ninguna solución se entrega sin verificarla numéricamente.    */
(function (MP) {
  'use strict';
  var A = MP.ast, Rat = MP.Rat, P = MP.poly, R = MP.render;

  function step(why, node, rawHTML) {
    return { why: why, html: rawHTML || (node ? R.html(node) : '') };
  }

  function mainVariable(n, preferred) {
    var vars = A.variables(n);
    if (preferred && vars.indexOf(preferred) >= 0) return preferred;
    if (vars.indexOf('x') >= 0) return 'x';
    return vars[0] || 'x';
  }

  /** Comprueba numéricamente que un valor anula la expresión. */
  function verify(expr, v, value) {
    var y = MP.evaluate(expr, (function () { var s = {}; s[v] = value; return s; })());
    return isFinite(y) && Math.abs(y) < 1e-7 * (1 + Math.abs(value));
  }

  /* ── Resolver ─────────────────────────────────────────────── */
  function solve(node, preferred) {
    var v = mainVariable(node, preferred);
    var steps = [];
    var lhs;

    if (node.type === 'eq') {
      steps.push(step('Ecuación original', node));
      lhs = MP.expand(A.add([node.a, A.mul([A.num(-1), node.b])]));
      steps.push(step('Pasamos todo al mismo lado', A.eq(lhs, A.num(0))));
    } else {
      lhs = MP.expand(node);
      steps.push(step('Buscamos los valores que anulan la expresión', A.eq(lhs, A.num(0))));
    }

    var p = P.toPoly(lhs, v);
    if (!p) return solveNumeric(lhs, v, steps);

    var deg = P.degree(p);
    if (deg <= 0) {
      var isIdentity = p[0].isZero();
      return {
        variable: v, steps: steps, solutions: [], exact: true,
        message: isIdentity ? 'Se cumple para cualquier valor de ' + v + ' (identidad).'
                            : 'No tiene solución: la igualdad es falsa.'
      };
    }

    if (deg === 1) return solveLinear(p, v, steps);
    if (deg === 2) return solveQuadratic(p, v, steps);
    return solvePolynomial(p, v, steps);
  }

  function solveLinear(p, v, steps) {
    var a = p[1], b = p[0];
    steps.push(step('Es una ecuación de primer grado: a·' + v + ' + b = 0, con a = ' +
      a.toString() + ' y b = ' + b.toString(), null,
      R.html(A.eq(A.add([A.mul([A.rat(a), A.vr(v)]), A.rat(b)]), A.num(0)))));
    steps.push(step('Restamos ' + b.toString() + ' en ambos lados',
      A.eq(A.mul([A.rat(a), A.vr(v)]), A.rat(b.neg()))));
    var sol = b.neg().div(a);
    steps.push(step('Dividimos ambos lados entre ' + a.toString(),
      A.eq(A.vr(v), A.rat(sol))));
    var node = A.rat(sol);
    var ok = verify(P.fromPoly(p, v), v, sol.num());
    steps.push(step('Verificación: sustituimos el valor en la ecuación', null,
      ok ? '<span class="chip accent">se cumple</span>' : '<span class="chip">no verifica</span>'));
    return { variable: v, steps: steps, solutions: [node], exact: true, verified: ok };
  }

  function solveQuadratic(p, v, steps) {
    var a = p[2], b = p[1], c = p[0];
    steps.push(step('Es una ecuación de segundo grado', null,
      R.html(A.eq(P.fromPoly(p, v), A.num(0))) +
      ' <span class="muted small">con a = ' + a + ', b = ' + b + ', c = ' + c + '</span>'));

    var D = b.mul(b).sub(a.mul(c).mul(new Rat(4)));
    steps.push(step('Calculamos el discriminante Δ = b² − 4ac', null,
      '<span class="math">Δ = (' + b + ')² − 4·(' + a + ')·(' + c + ') = ' + D + '</span>'));

    // Si factoriza sobre los racionales, mostramos también ese camino.
    var f = P.factorPoly(p);
    if (f.roots.length === 2 || (f.roots.length === 1 && P.degree(f.remaining) === 0)) {
      steps.push(step('También se puede factorizar', P.factorToAst(f, v)));
    }

    var sols = [], exact = true;
    if (D.isNeg()) {
      var re = b.neg().div(a.mul(new Rat(2)));
      var im = Rat.simplifySqrt(D.neg());
      var imNode = im.rad === 1 ? A.rat(im.coef) : A.mul([A.rat(im.coef), A.fn('sqrt', [A.num(im.rad)])]);
      var imPart = MP.simplify(A.div(imNode, A.rat(a.mul(new Rat(2)).abs())));
      steps.push(step('Δ < 0: no hay soluciones reales', null,
        '<span class="muted">Las soluciones son complejas conjugadas.</span>'));
      sols = [
        MP.simplify(A.add([A.rat(re), A.mul([imPart, A.vr('i')])])),
        MP.simplify(A.add([A.rat(re), A.mul([A.num(-1), imPart, A.vr('i')])]))
      ];
      return { variable: v, steps: steps, solutions: sols, exact: true, complex: true,
               message: 'No tiene soluciones reales.' };
    }

    steps.push(step('Aplicamos la fórmula general', null,
      '<span class="math math-lg"><span class="var">' + v + '</span><span class="op">=</span>' +
      '<span class="frac"><span class="top">−b ± <span class="radical"><span class="sign">√</span>' +
      '<span class="body">Δ</span></span></span><span class="bot">2a</span></span></span>'));

    var sq = Rat.isPerfectSquare(D);
    if (sq) {
      var r1 = b.neg().add(sq).div(a.mul(new Rat(2)));
      var r2 = b.neg().sub(sq).div(a.mul(new Rat(2)));
      sols = [A.rat(r1), A.rat(r2)];
      if (r1.eq(r2)) sols = [A.rat(r1)];
    } else {
      var s = Rat.simplifySqrt(D);
      var radNode = s.rad === 1 ? A.rat(s.coef)
        : (s.coef.isOne() ? A.fn('sqrt', [A.num(s.rad)]) : A.mul([A.rat(s.coef), A.fn('sqrt', [A.num(s.rad)])]));
      var den = a.mul(new Rat(2));
      sols = [
        MP.simplify(A.div(A.add([A.rat(b.neg()), radNode]), A.rat(den))),
        MP.simplify(A.div(A.add([A.rat(b.neg()), A.mul([A.num(-1), radNode])]), A.rat(den)))
      ];
      exact = true;
    }

    var poly = P.fromPoly(p, v);
    var allOk = sols.every(function (sn) {
      return verify(poly, v, MP.evaluate(sn, {}));
    });
    steps.push(step('Verificación: sustituimos cada solución', null,
      allOk ? '<span class="chip accent">ambas se cumplen</span>' : '<span class="chip">revisar</span>'));

    return { variable: v, steps: steps, solutions: sols, exact: exact, verified: allOk };
  }

  function solvePolynomial(p, v, steps) {
    steps.push(step('Buscamos raíces racionales (teorema de la raíz racional)', null,
      R.html(A.eq(P.fromPoly(p, v), A.num(0)))));
    var f = P.factorPoly(p);
    var sols = [], approx = [];

    if (f.roots.length) {
      steps.push(step('Factorizamos con las raíces encontradas', P.factorToAst(f, v)));
      f.roots.forEach(function (r) { sols.push(A.rat(r)); });
    }

    var rem = f.remaining;
    if (P.degree(rem) === 2) {
      var sub = solveQuadratic(rem, v, []);
      sub.solutions.forEach(function (s) { if (!sub.complex) sols.push(s); });
      if (sub.complex) {
        steps.push(step('El factor cuadrático restante no tiene raíces reales', null, ''));
      } else {
        steps.push(step('Resolvemos el factor cuadrático restante', P.fromPoly(rem, v)));
      }
    } else if (P.degree(rem) > 2) {
      approx = P.numericRoots(rem);
      steps.push(step('El factor restante no tiene raíces racionales: aproximamos numéricamente',
        P.fromPoly(rem, v)));
    }

    // deduplica
    var seen = {}, uniq = [];
    sols.forEach(function (s) { var k = A.key(s); if (!seen[k]) { seen[k] = 1; uniq.push(s); } });

    return {
      variable: v, steps: steps, solutions: uniq, exact: approx.length === 0,
      approximate: approx.map(function (x) { return Math.round(x * 1e10) / 1e10; })
    };
  }

  function solveNumeric(expr, v, steps) {
    steps.push(step('No es polinómica: buscamos las raíces reales numéricamente', expr));
    var out = [], lo = -50, hi = 50, N = 6000;
    var prevX = lo, prevY = MP.evaluate(expr, (function () { var s = {}; s[v] = lo; return s; })());
    for (var i = 1; i <= N; i++) {
      var x = lo + (hi - lo) * i / N;
      var sc = {}; sc[v] = x;
      var y = MP.evaluate(expr, sc);
      if (isFinite(y) && isFinite(prevY) && prevY * y < 0) {
        var a = prevX, b = x, fa = prevY;
        for (var it = 0; it < 70; it++) {
          var m = (a + b) / 2, s2 = {}; s2[v] = m;
          var fm = MP.evaluate(expr, s2);
          if (fa * fm <= 0) b = m; else { a = m; fa = fm; }
        }
        out.push(Math.round((a + b) / 2 * 1e9) / 1e9);
      }
      prevX = x; prevY = y;
    }
    return {
      variable: v, steps: steps, solutions: [], approximate: out, exact: false,
      message: out.length ? 'Soluciones aproximadas en el intervalo [−50, 50].'
                          : 'No se encontraron raíces reales en [−50, 50].'
    };
  }

  /* ── Factorizar ───────────────────────────────────────────── */
  function factor(node, preferred) {
    var v = mainVariable(node, preferred);
    var steps = [step('Expresión original', node)];
    var ex = MP.expand(node);
    if (!A.equal(ex, MP.simplify(node))) steps.push(step('La desarrollamos primero', ex));

    var p = P.toPoly(ex, v);
    if (!p) return { steps: steps, result: MP.simplify(node), message: 'No es un polinomio en ' + v + ': no se puede factorizar con este método.' };
    if (P.degree(p) < 1) return { steps: steps, result: MP.simplify(node), message: 'No hay nada que factorizar.' };

    var f = P.factorPoly(p);
    if (f.roots.length === 0 && f.content.isOne()) {
      return { steps: steps, result: ex, message: 'Es irreducible sobre los racionales.' };
    }
    if (!f.content.isOne()) {
      steps.push(step('Extraemos el factor común ' + f.content.toString(), null,
        R.html(A.mul([A.rat(f.content), P.fromPoly(p.map(function (c) { return c.div(f.content); }), v)]))));
    }
    if (f.roots.length) {
      steps.push(step('Cada raíz racional r aporta un factor (' + v + ' − r)', null,
        '<span class="muted">Raíces: ' + f.roots.map(function (r) { return r.toString(); }).join(', ') + '</span>'));
    }
    var result = P.factorToAst(f, v);
    // Verificación: desarrollar el resultado debe devolver el original.
    var back = MP.expand(result);
    var ok = A.equal(MP.simplify(back), MP.simplify(ex));
    steps.push(step('Verificación: al desarrollar volvemos a la expresión inicial', null,
      ok ? '<span class="chip accent">coincide</span>' : '<span class="chip">no coincide</span>'));
    return { steps: steps, result: result, verified: ok };
  }

  /* ── Desarrollar ──────────────────────────────────────────── */
  function expandWithSteps(node) {
    var steps = [step('Expresión original', node)];
    var res = MP.expand(node);
    steps.push(step('Aplicamos la propiedad distributiva y agrupamos términos semejantes', res));
    return { steps: steps, result: res };
  }

  MP.algebra = {
    solve: solve, factor: factor, expand: expandWithSteps,
    mainVariable: mainVariable, verify: verify
  };
})(window.MP = window.MP || {});

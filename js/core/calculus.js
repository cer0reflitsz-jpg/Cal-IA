/* ── Cálculo ──────────────────────────────────────────────────
   derivative: completa para las reglas que se enseñan.
   integral:   limitada a las técnicas cubiertas; si no sabe
               resolver algo lo dice en vez de inventar.
   numericIntegral: Simpson compuesto, para áreas en el gráfico. */
(function (MP) {
  'use strict';
  var A = MP.ast, Rat = MP.Rat, R = MP.render, P = MP.poly;

  /* ── Derivadas ────────────────────────────────────────────── */

  var RULE_NAME = {
    constant: 'Derivada de una constante: es 0',
    variable: 'Derivada de la propia variable: es 1',
    sum: 'Regla de la suma: se deriva término a término',
    product: 'Regla del producto: (u·v)′ = u′v + uv′',
    quotient: 'Regla del cociente: (u/v)′ = (u′v − uv′)/v²',
    power: 'Regla de la potencia: (uⁿ)′ = n·uⁿ⁻¹·u′',
    expgen: 'Potencia con exponente variable: (u^v)′ = u^v·(v′·ln u + v·u′/u)',
    chain: 'Regla de la cadena: se deriva la función externa por la derivada de la interna'
  };

  var DERIV_FN = {
    sin: function (u) { return A.fn('cos', [u]); },
    cos: function (u) { return A.mul([A.num(-1), A.fn('sin', [u])]); },
    tan: function (u) { return A.div(A.num(1), A.pow(A.fn('cos', [u]), A.num(2))); },
    ln: function (u) { return A.div(A.num(1), u); },
    log: function (u) { return A.div(A.num(1), A.mul([u, A.fn('ln', [A.num(10)])])); },
    log10: function (u) { return A.div(A.num(1), A.mul([u, A.fn('ln', [A.num(10)])])); },
    exp: function (u) { return A.fn('exp', [u]); },
    sqrt: function (u) { return A.div(A.num(1), A.mul([A.num(2), A.fn('sqrt', [u])])); },
    asin: function (u) { return A.div(A.num(1), A.fn('sqrt', [A.add([A.num(1), A.mul([A.num(-1), A.pow(u, A.num(2))])])])); },
    acos: function (u) { return A.mul([A.num(-1), A.div(A.num(1), A.fn('sqrt', [A.add([A.num(1), A.mul([A.num(-1), A.pow(u, A.num(2))])])]))]); },
    atan: function (u) { return A.div(A.num(1), A.add([A.num(1), A.pow(u, A.num(2))])); },
    sinh: function (u) { return A.fn('cosh', [u]); },
    cosh: function (u) { return A.fn('sinh', [u]); },
    tanh: function (u) { return A.div(A.num(1), A.pow(A.fn('cosh', [u]), A.num(2))); },
    // |u|′ = sign(u)·u′  (definida para u ≠ 0)
    abs: function (u) { return A.fn('sign', [u]); }
  };
  DERIV_FN.arcsin = DERIV_FN.asin;
  DERIV_FN.arccos = DERIV_FN.acos;
  DERIV_FN.arctan = DERIV_FN.atan;

  function derivative(node, v, opts) {
    v = v || MP.algebra.mainVariable(node, 'x');
    var steps = [];
    var seen = {};

    function note(rule, before, after, depth) {
      if (depth > 1) return;
      var k = rule + '|' + A.key(before);
      if (seen[k]) return;
      seen[k] = 1;
      steps.push({
        why: RULE_NAME[rule] || rule,
        html: '<span class="math">' +
              '<span class="fname">d</span>/<span class="fname">d</span><span class="var">' + v + '</span>' +
              '<span class="paren">(</span>' + R.toHTML(before) + '<span class="paren">)</span>' +
              '<span class="op">=</span>' + R.toHTML(MP.simplify(after)) + '</span>'
      });
    }

    function d(n, depth) {
      switch (n.type) {
        case 'num': case 'const':
          return A.num(0);

        case 'var': {
          var r = A.num(n.name === v ? 1 : 0);
          return r;
        }

        case 'add': {
          var parts = n.args.map(function (a) { return d(a, depth + 1); });
          var res = A.add(parts);
          note('sum', n, res, depth);
          return res;
        }

        case 'mul': {
          if (n.args.length === 1) return d(n.args[0], depth);
          var terms = [];
          for (var i = 0; i < n.args.length; i++) {
            var factors = n.args.slice();
            factors[i] = d(n.args[i], depth + 1);
            terms.push(A.mul(factors));
          }
          var res2 = A.add(terms);
          // si sólo hay un factor no constante no llamamos "regla del producto"
          var nonConst = n.args.filter(function (a) { return A.variables(a).indexOf(v) >= 0; });
          if (nonConst.length > 1) note('product', n, res2, depth);
          return res2;
        }

        case 'div': {
          var num = A.add([
            A.mul([d(n.a, depth + 1), n.b]),
            A.mul([A.num(-1), n.a, d(n.b, depth + 1)])
          ]);
          var res3 = A.div(num, A.pow(n.b, A.num(2)));
          if (A.variables(n.b).indexOf(v) >= 0) note('quotient', n, res3, depth);
          return res3;
        }

        case 'pow': {
          var baseHasV = A.variables(n.base).indexOf(v) >= 0;
          var expHasV = A.variables(n.exp).indexOf(v) >= 0;
          if (!baseHasV && !expHasV) return A.num(0);
          if (!expHasV) {
            var newExp = MP.simplify(A.add([n.exp, A.num(-1)]));
            var res4 = A.mul([n.exp, A.pow(n.base, newExp), d(n.base, depth + 1)]);
            note('power', n, res4, depth);
            return res4;
          }
          if (!baseHasV && A.isNum(n.base)) {
            // a^u  →  a^u · ln(a) · u'
            var res5 = A.mul([n, A.fn('ln', [n.base]), d(n.exp, depth + 1)]);
            note('expgen', n, res5, depth);
            return res5;
          }
          var res6 = A.mul([n, A.add([
            A.mul([d(n.exp, depth + 1), A.fn('ln', [n.base])]),
            A.div(A.mul([n.exp, d(n.base, depth + 1)]), n.base)
          ])]);
          note('expgen', n, res6, depth);
          return res6;
        }

        case 'fn': {
          var f = DERIV_FN[n.name];
          if (!f) throw new Error('No conozco la derivada de ' + n.name);
          var u = n.args[0];
          var outer = f(u);
          var inner = d(u, depth + 1);
          var res7 = A.isOne(MP.simplify(inner)) ? outer : A.mul([outer, inner]);
          note(A.isVar(u, v) ? 'chain' : 'chain', n, res7, depth);
          return res7;
        }

        case 'eq':
          return A.eq(d(n.a, depth), d(n.b, depth));
      }
      throw new Error('No puedo derivar esta expresión');
    }

    var raw = d(node, 0);
    var result = MP.simplify(raw);
    if (opts && opts.expand) result = MP.expand(result);
    steps.push({ why: 'Simplificamos el resultado', html: R.html(result, 'math-lg') });
    return { result: result, steps: steps, variable: v };
  }

  /* ── Integrales ───────────────────────────────────────────── */

  function isConstIn(n, v) { return A.variables(n).indexOf(v) < 0; }

  /** ∫ n d(v)  o  null si no está cubierto. */
  function antiderivative(n, v) {
    n = MP.simplify(n);

    if (isConstIn(n, v)) return A.mul([n, A.vr(v)]);
    if (A.isVar(n, v)) return A.div(A.pow(A.vr(v), A.num(2)), A.num(2));

    if (n.type === 'add') {
      var parts = [];
      for (var i = 0; i < n.args.length; i++) {
        var q = antiderivative(n.args[i], v);
        if (!q) return null;
        parts.push(q);
      }
      return A.add(parts);
    }

    if (n.type === 'mul') {
      var consts = [], rest = [];
      n.args.forEach(function (a) { (isConstIn(a, v) ? consts : rest).push(a); });
      if (consts.length && rest.length) {
        var inner = antiderivative(rest.length === 1 ? rest[0] : A.mul(rest), v);
        if (!inner) return null;
        return A.mul(consts.concat([inner]));
      }
      if (consts.length && !rest.length) return A.mul(n.args.concat([A.vr(v)]));
      return null;
    }

    if (n.type === 'div') {
      if (isConstIn(n.b, v)) {
        var top = antiderivative(n.a, v);
        return top ? A.div(top, n.b) : null;
      }
      if (A.isOne(n.a)) return antiderivative(A.pow(n.b, A.num(-1)), v);
      return null;
    }

    if (n.type === 'pow') {
      // (a·v + b)^k
      var lin = P.toPoly(n.base, v);
      if (lin && P.degree(lin) === 1 && A.isNum(n.exp)) {
        var a = lin[1], k = n.exp.r;
        if (k.eq(new Rat(-1))) {
          return A.div(A.fn('ln', [A.fn('abs', [n.base])]), A.rat(a));
        }
        var k1 = k.add(new Rat(1));
        return A.div(A.pow(n.base, A.rat(k1)), A.rat(k1.mul(a)));
      }
      return null;
    }

    if (n.type === 'fn') {
      var u = n.args[0];
      var pl = P.toPoly(u, v);
      if (!pl || P.degree(pl) !== 1) return null;  // sólo sustitución lineal
      var a2 = pl[1];
      var base = null;
      switch (n.name) {
        case 'sin': base = A.mul([A.num(-1), A.fn('cos', [u])]); break;
        case 'cos': base = A.fn('sin', [u]); break;
        case 'exp': base = A.fn('exp', [u]); break;
        case 'sqrt': base = A.div(A.mul([A.num(2), A.pow(u, A.num(new Rat(3, 2)))]), A.num(3)); break;
        case 'ln': base = A.add([A.mul([u, A.fn('ln', [u])]), A.mul([A.num(-1), u])]); break;
        default: return null;
      }
      return A.div(base, A.rat(a2));
    }

    return null;
  }

  function integral(node, v) {
    v = v || MP.algebra.mainVariable(node, 'x');
    var steps = [{
      why: 'Integral que queremos calcular',
      html: '<span class="math"><span class="bigop">∫</span>' + R.toHTML(node) +
            ' <span class="fname">d</span><span class="var">' + v + '</span></span>'
    }];

    var F;
    try { F = antiderivative(node, v); } catch (e) { F = null; }

    if (!F) {
      return {
        result: null, steps: steps, variable: v,
        message: 'No puedo resolver esta integral simbólicamente con las técnicas implementadas ' +
                 '(inmediatas, potencias, sustitución lineal). Puedo calcularla numéricamente si me das los límites.'
      };
    }

    var simplified = MP.simplify(F);
    steps.push({ why: 'Aplicamos las reglas de integración', html: R.html(simplified) });

    // Verificación: derivar el resultado debe devolver el integrando.
    var ok = false;
    try {
      var back = MP.simplify(derivative(simplified, v).result);
      ok = A.equal(MP.simplify(MP.expand(back)), MP.simplify(MP.expand(node)));
      if (!ok) ok = sampleEqual(back, node, v);
    } catch (e) { ok = false; }

    steps.push({
      why: 'Verificación: derivamos el resultado y comprobamos que coincide con el integrando',
      html: ok ? '<span class="chip accent">coincide</span>' : '<span class="chip">no se pudo verificar</span>'
    });

    var withC = A.add([simplified, A.vr('C')]);
    return { result: simplified, display: withC, steps: steps, variable: v, verified: ok };
  }

  /** Igualdad comprobada por muestreo numérico (control de la verificación). */
  function sampleEqual(a, b, v) {
    var pts = [0.37, 1.21, 2.13, -0.71, 3.57, 0.93];
    var good = 0, used = 0;
    for (var i = 0; i < pts.length; i++) {
      var sc = {}; sc[v] = pts[i];
      var ya = MP.evaluate(a, sc), yb = MP.evaluate(b, sc);
      if (!isFinite(ya) || !isFinite(yb)) continue;
      used++;
      if (Math.abs(ya - yb) < 1e-8 * (1 + Math.abs(yb))) good++;
    }
    return used >= 3 && good === used;
  }

  /** Integral definida por Simpson compuesto. */
  function numericIntegral(f, a, b, n) {
    n = n || 2000;
    if (n % 2) n++;
    var h = (b - a) / n, s = 0, valid = true;
    for (var i = 0; i <= n; i++) {
      var y = f(a + i * h);
      if (!isFinite(y)) { valid = false; y = 0; }
      s += y * (i === 0 || i === n ? 1 : (i % 2 ? 4 : 2));
    }
    return { value: s * h / 3, valid: valid };
  }

  MP.calculus = {
    derivative: derivative,
    integral: integral,
    antiderivative: antiderivative,
    numericIntegral: numericIntegral,
    sampleEqual: sampleEqual
  };
})(window.MP = window.MP || {});

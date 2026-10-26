/* ── Polinomios de una variable ───────────────────────────────
   Representación: array de coeficientes racionales, índice =
   exponente.  [2, -5, 1]  ≡  x² − 5x + 2
   Es la base de factorizar, resolver ecuaciones y verificar.     */
(function (MP) {
  'use strict';
  var A = MP.ast, Rat = MP.Rat;

  function zero() { return [new Rat(0)]; }
  function trim(p) {
    var i = p.length - 1;
    while (i > 0 && p[i].isZero()) i--;
    return p.slice(0, i + 1);
  }
  function degree(p) { return trim(p).length - 1; }

  function addP(a, b) {
    var n = Math.max(a.length, b.length), out = [];
    for (var i = 0; i < n; i++) {
      out.push((a[i] || new Rat(0)).add(b[i] || new Rat(0)));
    }
    return trim(out);
  }
  function mulP(a, b) {
    var out = [];
    for (var i = 0; i < a.length + b.length - 1; i++) out.push(new Rat(0));
    for (var j = 0; j < a.length; j++) {
      for (var k = 0; k < b.length; k++) out[j + k] = out[j + k].add(a[j].mul(b[k]));
    }
    return trim(out);
  }
  function scaleP(a, r) { return trim(a.map(function (c) { return c.mul(r); })); }

  /** AST → polinomio en la variable v, o null si no lo es. */
  function toPoly(n, v) {
    if (!n) return null;
    switch (n.type) {
      case 'num': return [n.r];
      case 'var': return n.name === v ? [new Rat(0), new Rat(1)] : null;
      case 'const': return null;
      case 'add': {
        var acc = zero();
        for (var i = 0; i < n.args.length; i++) {
          var p = toPoly(n.args[i], v);
          if (!p) return null;
          acc = addP(acc, p);
        }
        return acc;
      }
      case 'mul': {
        var acc2 = [new Rat(1)];
        for (var j = 0; j < n.args.length; j++) {
          var q = toPoly(n.args[j], v);
          if (!q) return null;
          acc2 = mulP(acc2, q);
        }
        return acc2;
      }
      case 'div': {
        var den = toPoly(n.b, v);
        if (!den || degree(den) !== 0) return null;
        var num = toPoly(n.a, v);
        if (!num || den[0].isZero()) return null;
        return scaleP(num, den[0].inv());
      }
      case 'pow': {
        if (!A.isNum(n.exp) || !n.exp.r.isInt() || n.exp.r.n < 0 || n.exp.r.n > 40) return null;
        var base = toPoly(n.base, v);
        if (!base) return null;
        var r = [new Rat(1)];
        for (var k = 0; k < n.exp.r.n; k++) r = mulP(r, base);
        return r;
      }
      default: return null;
    }
  }

  /** Polinomio → AST ordenado de mayor a menor grado. */
  function fromPoly(p, v) {
    p = trim(p);
    var terms = [];
    for (var i = p.length - 1; i >= 0; i--) {
      if (p[i].isZero()) continue;
      var pw = (i === 0) ? null : (i === 1 ? A.vr(v) : A.pow(A.vr(v), A.num(i)));
      if (!pw) terms.push(A.rat(p[i]));
      else if (p[i].isOne()) terms.push(pw);
      else terms.push(A.mul([A.rat(p[i]), pw]));
    }
    if (terms.length === 0) return A.num(0);
    return MP.simplify(terms.length === 1 ? terms[0] : A.add(terms));
  }

  function evalP(p, x) {
    var s = 0;
    for (var i = p.length - 1; i >= 0; i--) s = s * x + p[i].num();
    return s;
  }
  function evalPRat(p, r) {
    var s = new Rat(0);
    for (var i = p.length - 1; i >= 0; i--) s = s.mul(r).add(p[i]);
    return s;
  }

  /** Divide por (x − r) con división sintética. Devuelve el cociente. */
  function deflate(p, r) {
    var out = new Array(p.length - 1);
    var carry = p[p.length - 1];
    for (var i = p.length - 2; i >= 0; i--) {
      out[i] = carry;
      carry = p[i].add(carry.mul(r));
    }
    return trim(out);
  }

  function divisors(n) {
    n = Math.abs(Math.round(n));
    var out = [];
    if (n === 0) return [1];
    for (var i = 1; i <= Math.min(n, 5000); i++) if (n % i === 0) out.push(i);
    return out;
  }

  /** Raíces racionales por el teorema de la raíz racional, con multiplicidad. */
  function rationalRoots(p) {
    p = trim(p);
    var roots = [];
    var work = p.slice();
    var guard = 0;
    while (degree(work) > 0 && guard++ < 24) {
      // limpia denominadores
      var lcm = 1;
      work.forEach(function (c) { lcm = lcm * c.d / Rat.gcd(lcm, c.d); });
      var ints = work.map(function (c) { return Math.round(c.num() * lcm); });
      var a0 = ints[0], an = ints[ints.length - 1];
      var found = null;

      if (a0 === 0) { found = new Rat(0); }
      else {
        var ps = divisors(a0), qs = divisors(an);
        outer:
        for (var i = 0; i < ps.length; i++) {
          for (var j = 0; j < qs.length; j++) {
            for (var s = 0; s < 2; s++) {
              var cand = new Rat(s === 0 ? ps[i] : -ps[i], qs[j]);
              if (evalPRat(work, cand).isZero()) { found = cand; break outer; }
            }
          }
        }
      }
      if (!found) break;
      roots.push(found);
      work = deflate(work, found);
    }
    return { roots: roots, remaining: work };
  }

  /** Raíces reales aproximadas por barrido + bisección. */
  function numericRoots(p) {
    p = trim(p);
    var n = degree(p);
    if (n < 1) return [];
    var lead = p[n].num(), bound = 1;
    for (var i = 0; i < n; i++) bound = Math.max(bound, Math.abs(p[i].num() / lead));
    bound = Math.min(1 + bound, 1e6);
    var out = [], steps = 2000, prevX = -bound, prevY = evalP(p, prevX);
    for (var k = 1; k <= steps; k++) {
      var x = -bound + (2 * bound * k) / steps;
      var y = evalP(p, x);
      if (y === 0) { out.push(x); }
      else if (prevY * y < 0) {
        var lo = prevX, hi = x, fl = prevY;
        for (var it = 0; it < 80; it++) {
          var mid = (lo + hi) / 2, fm = evalP(p, mid);
          if (fl * fm <= 0) hi = mid; else { lo = mid; fl = fm; }
        }
        out.push((lo + hi) / 2);
      }
      prevX = x; prevY = y;
    }
    return out;
  }

  /**
   * Factoriza sobre los racionales.
   * Devuelve { content: Rat, linear: [Rat roots], remaining: poly }
   */
  function factorPoly(p) {
    p = trim(p);
    // contenido: hace enteros los coeficientes y extrae el máximo común divisor
    var lcm = 1;
    p.forEach(function (c) { lcm = lcm * c.d / Rat.gcd(lcm, c.d); });
    var ints = p.map(function (c) { return Math.round(c.num() * lcm); });
    var g = 0;
    ints.forEach(function (v) { g = Rat.gcd(g || v, v); });
    if (!g) g = 1;
    var content = new Rat(g, lcm);
    var prim = p.map(function (c) { return c.div(content); });

    var rr = rationalRoots(prim);
    return { content: content, roots: rr.roots, remaining: rr.remaining };
  }

  /** Construye el AST factorizado a partir del resultado de factorPoly. */
  function factorToAst(f, v) {
    var parts = [];
    var lead = f.remaining[f.remaining.length - 1];
    var coef = f.content.mul(lead);
    var rest = scaleP(f.remaining, lead.inv());

    f.roots.forEach(function (r) {
      if (r.isZero()) { parts.push(A.vr(v)); return; }
      if (r.isInt()) {
        parts.push(A.add([A.vr(v), A.rat(r.neg())]));
      } else {
        // (x − p/q) se escribe como (qx − p), y q se absorbe en el coeficiente
        parts.push(A.add([A.mul([A.num(r.d), A.vr(v)]), A.num(-r.n)]));
        coef = coef.div(new Rat(r.d));
      }
    });
    if (degree(rest) > 0) parts.push(fromPoly(rest, v));

    // agrupa factores repetidos como potencias
    var groups = [], keys = {};
    parts.forEach(function (p2) {
      var k = A.key(p2);
      if (keys[k] === undefined) { keys[k] = groups.length; groups.push({ node: p2, n: 1 }); }
      else groups[keys[k]].n++;
    });
    var factors = groups.map(function (g2) {
      return g2.n === 1 ? g2.node : A.pow(g2.node, A.num(g2.n));
    });
    if (!coef.isOne()) factors.unshift(A.rat(coef));
    if (factors.length === 0) return A.rat(coef);
    return factors.length === 1 ? factors[0] : A.mul(factors);
  }

  MP.poly = {
    toPoly: toPoly, fromPoly: fromPoly, degree: degree, trim: trim,
    addP: addP, mulP: mulP, scaleP: scaleP,
    evalP: evalP, evalPRat: evalPRat, deflate: deflate,
    rationalRoots: rationalRoots, numericRoots: numericRoots,
    factorPoly: factorPoly, factorToAst: factorToAst
  };
})(window.MP = window.MP || {});

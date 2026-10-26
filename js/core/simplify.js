/* ── Simplificación ───────────────────────────────────────────
   Pliega constantes de forma exacta, agrupa términos semejantes,
   combina potencias de la misma base y ordena el resultado para
   que sea legible (grado descendente).                          */
(function (MP) {
  'use strict';
  var A = MP.ast, Rat = MP.Rat;

  /* Aplana sumas y productos anidados. */
  function flatten(type, args) {
    var out = [];
    args.forEach(function (a) {
      if (a.type === type) out = out.concat(flatten(type, a.args));
      else out.push(a);
    });
    return out;
  }

  /** Separa un término en coeficiente racional y resto: 3x² → {3, x²} */
  function splitCoef(n) {
    if (n.type === 'num') return { c: n.r, rest: null };
    if (n.type === 'mul') {
      var c = new Rat(1), rest = [];
      n.args.forEach(function (a) {
        if (a.type === 'num') c = c.mul(a.r); else rest.push(a);
      });
      return { c: c, rest: rest.length === 0 ? null : (rest.length === 1 ? rest[0] : A.mul(rest)) };
    }
    return { c: new Rat(1), rest: n };
  }

  /** Separa un factor en base y exponente: x³ → {x, 3} */
  function splitPow(n) {
    if (n.type === 'pow' && n.exp.type === 'num') return { base: n.base, exp: n.exp.r };
    return { base: n, exp: new Rat(1) };
  }

  function orderKey(n) {
    return [-A.degree(n), A.key(n)];
  }
  function byOrder(a, b) {
    var ka = orderKey(a), kb = orderKey(b);
    if (ka[0] !== kb[0]) return ka[0] - kb[0];
    return ka[1] < kb[1] ? -1 : ka[1] > kb[1] ? 1 : 0;
  }

  var EXACT_FN = {
    ln: function (r) { return r.isOne() ? A.num(0) : null; },
    exp: function (r) { return r.isZero() ? A.num(1) : null; },
    sin: function (r) { return r.isZero() ? A.num(0) : null; },
    cos: function (r) { return r.isZero() ? A.num(1) : null; },
    tan: function (r) { return r.isZero() ? A.num(0) : null; },
    abs: function (r) { return A.rat(r.abs()); },
    floor: function (r) { return A.num(Math.floor(r.num())); },
    ceil: function (r) { return A.num(Math.ceil(r.num())); },
    round: function (r) { return A.num(Math.round(r.num())); },
    sign: function (r) { return A.num(r.isZero() ? 0 : (r.isNeg() ? -1 : 1)); },
    log: function (r) { return r.isOne() ? A.num(0) : null; },
    log10: function (r) { return r.isOne() ? A.num(0) : null; }
  };

  function simplifySqrtNode(arg) {
    if (arg.type !== 'num') return null;
    var s = Rat.simplifySqrt(arg.r);
    if (!s) return null;                       // negativo: se deja simbólico
    if (s.rad === 1) return A.rat(s.coef);     // raíz exacta
    if (s.coef.isOne()) return null;           // ya está en su forma mínima
    return A.mul([A.rat(s.coef), A.fn('sqrt', [A.num(s.rad)])]);
  }

  function simplify(n) {
    if (!n) return n;
    switch (n.type) {
      case 'num': case 'var': case 'const':
        return n;

      case 'eq':
        return A.eq(simplify(n.a), simplify(n.b));

      case 'div': {
        var a = simplify(n.a), b = simplify(n.b);
        if (A.isZero(b)) throw new Error('División entre cero');
        if (A.isNum(a) && A.isNum(b)) return A.rat(a.r.div(b.r));
        if (A.isOne(b)) return a;
        if (A.isZero(a)) return A.num(0);
        if (A.isNum(b)) return simplify(A.mul([A.rat(b.r.inv()), a]));
        if (A.equal(a, b)) return A.num(1);
        // x²/x → x  (misma base con exponentes numéricos)
        var pa = splitPow(a), pb = splitPow(b);
        if (A.equal(pa.base, pb.base)) {
          return simplify(A.pow(pa.base, A.rat(pa.exp.sub(pb.exp))));
        }
        return A.div(a, b);
      }

      case 'pow': {
        var base = simplify(n.base), exp = simplify(n.exp);
        if (A.isNum(exp)) {
          if (exp.r.isZero()) return A.num(1);
          if (exp.r.isOne()) return base;
          if (A.isNum(base)) {
            if (exp.r.isInt()) return A.rat(base.r.pow(exp.r.num()));
            // raíz exacta: 4^(1/2) = 2, 8^(1/3) = 2
            if (exp.r.n === 1 && exp.r.d === 2) {
              var sq = simplifySqrtNode(base);
              if (sq) return sq;
            }
          }
          if (base.type === 'pow' && A.isNum(base.exp)) {
            return simplify(A.pow(base.base, A.rat(base.exp.r.mul(exp.r))));
          }
        }
        if (A.isZero(base)) return A.num(0);
        if (A.isOne(base)) return A.num(1);
        return A.pow(base, exp);
      }

      case 'fn': {
        var args = n.args.map(simplify);
        if (n.name === 'sqrt') {
          var s = simplifySqrtNode(args[0]);
          if (s) return s;
          if (args[0].type === 'pow' && A.isNum(args[0].exp) && args[0].exp.r.num() === 2) {
            return A.fn('abs', [args[0].base]);
          }
        }
        if (args.length === 1 && A.isNum(args[0]) && EXACT_FN[n.name]) {
          var ex = EXACT_FN[n.name](args[0].r);
          if (ex) return ex;
        }
        return A.fn(n.name, args);
      }

      case 'add': {
        var terms = flatten('add', n.args).map(simplify);
        var constant = new Rat(0);
        var groups = {}, order = [];
        terms.forEach(function (t) {
          if (t.type === 'add') { t = simplify(t); }
          var sp = splitCoef(t);
          if (sp.rest === null) { constant = constant.add(sp.c); return; }
          var k = A.key(sp.rest);
          if (!groups[k]) { groups[k] = { c: new Rat(0), node: sp.rest }; order.push(k); }
          groups[k].c = groups[k].c.add(sp.c);
        });
        var out = [];
        order.forEach(function (k) {
          var g = groups[k];
          if (g.c.isZero()) return;
          out.push(g.c.isOne() ? g.node : A.mul([A.rat(g.c), g.node]));
        });
        out.sort(byOrder);
        if (!constant.isZero()) out.push(A.rat(constant));
        if (out.length === 0) return A.num(0);
        if (out.length === 1) return out[0];
        return A.add(out);
      }

      case 'mul': {
        var factors = flatten('mul', n.args).map(simplify);
        var coef = new Rat(1), groups2 = {}, order2 = [], zero = false;
        factors.forEach(function (f) {
          if (f.type === 'mul') f = simplify(f);
          if (f.type === 'num') {
            if (f.r.isZero()) zero = true;
            coef = coef.mul(f.r);
            return;
          }
          var sp = splitPow(f);
          var k = A.key(sp.base);
          if (!groups2[k]) { groups2[k] = { e: new Rat(0), base: sp.base }; order2.push(k); }
          groups2[k].e = groups2[k].e.add(sp.exp);
        });
        if (zero) return A.num(0);
        var outF = [];
        order2.forEach(function (k) {
          var g = groups2[k];
          if (g.e.isZero()) return;
          outF.push(g.e.isOne() ? g.base : simplify(A.pow(g.base, A.rat(g.e))));
        });
        // un factor puede haberse convertido en número (p. ej. √2·√2 = 2)
        var rest = [];
        outF.forEach(function (f) {
          if (f.type === 'num') coef = coef.mul(f.r); else rest.push(f);
        });
        if (coef.isZero()) return A.num(0);
        rest.sort(byOrder);
        if (rest.length === 0) return A.rat(coef);
        if (coef.isOne()) return rest.length === 1 ? rest[0] : A.mul(rest);
        return A.mul([A.rat(coef)].concat(rest));
      }
    }
    return n;
  }

  /** Distribuye productos sobre sumas y desarrolla potencias enteras. */
  function expand(n) {
    if (!n) return n;
    switch (n.type) {
      case 'eq': return A.eq(expand(n.a), expand(n.b));
      case 'add': return simplify(A.add(n.args.map(expand)));
      case 'div': {
        var a = expand(n.a), b = expand(n.b);
        if (A.isNum(b)) return simplify(A.mul([A.rat(b.r.inv()), a]));
        return simplify(A.div(a, b));
      }
      case 'mul': {
        var parts = n.args.map(expand);
        var acc = [A.num(1)];
        parts.forEach(function (p) {
          var terms = (p.type === 'add') ? p.args : [p];
          var next = [];
          acc.forEach(function (x) {
            terms.forEach(function (t) { next.push(A.mul([x, t])); });
          });
          acc = next;
        });
        return simplify(A.add(acc));
      }
      case 'pow': {
        var base = expand(n.base), exp = simplify(n.exp);
        if (A.isNum(exp) && exp.r.isInt() && exp.r.n >= 0 && exp.r.n <= 12 && base.type === 'add') {
          var k = exp.r.n;
          if (k === 0) return A.num(1);
          var acc2 = base;
          for (var i = 1; i < k; i++) acc2 = expand(A.mul([acc2, base]));
          return simplify(acc2);
        }
        return simplify(A.pow(base, exp));
      }
      case 'fn': return simplify(A.fn(n.name, n.args.map(expand)));
    }
    return simplify(n);
  }

  MP.simplify = simplify;
  MP.expand = expand;
  MP.splitCoef = splitCoef;
})(window.MP = window.MP || {});

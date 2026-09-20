/* ── Árbol de sintaxis abstracta (AST) ────────────────────────
   Tipos de nodo:
     num   { r: Rat }
     var   { name }
     const { name }              pi | e
     add   { args: [] }          n-ario
     mul   { args: [] }          n-ario
     div   { a, b }
     pow   { base, exp }
     fn    { name, args: [] }
     eq    { a, b }
   Todas las transformaciones son funciones puras AST → AST.     */
(function (MP) {
  'use strict';
  var Rat = MP.Rat;

  var A = {};

  A.num = function (n, d) { return { type: 'num', r: (n instanceof Rat) ? n : new Rat(n, d) }; };
  A.rat = function (r) { return { type: 'num', r: r }; };
  A.vr = function (name) { return { type: 'var', name: name }; };
  A.cnst = function (name) { return { type: 'const', name: name }; };
  A.add = function (args) { return { type: 'add', args: args }; };
  A.mul = function (args) { return { type: 'mul', args: args }; };
  A.div = function (a, b) { return { type: 'div', a: a, b: b }; };
  A.pow = function (base, exp) { return { type: 'pow', base: base, exp: exp }; };
  A.fn = function (name, args) { return { type: 'fn', name: name, args: args }; };
  A.eq = function (a, b) { return { type: 'eq', a: a, b: b }; };
  A.neg = function (x) { return A.mul([A.num(-1), x]); };

  A.ZERO = function () { return A.num(0); };
  A.ONE = function () { return A.num(1); };

  A.isNum = function (n) { return n && n.type === 'num'; };
  A.isZero = function (n) { return A.isNum(n) && n.r.isZero(); };
  A.isOne = function (n) { return A.isNum(n) && n.r.isOne(); };
  A.isVar = function (n, name) { return n && n.type === 'var' && (!name || n.name === name); };

  /** Copia profunda. */
  A.clone = function (n) {
    if (!n) return n;
    switch (n.type) {
      case 'num': return A.rat(n.r.clone());
      case 'var': return A.vr(n.name);
      case 'const': return A.cnst(n.name);
      case 'add': return A.add(n.args.map(A.clone));
      case 'mul': return A.mul(n.args.map(A.clone));
      case 'div': return A.div(A.clone(n.a), A.clone(n.b));
      case 'pow': return A.pow(A.clone(n.base), A.clone(n.exp));
      case 'fn': return A.fn(n.name, n.args.map(A.clone));
      case 'eq': return A.eq(A.clone(n.a), A.clone(n.b));
    }
    return n;
  };

  /** Recorre todos los nodos. */
  A.walk = function (n, visit) {
    if (!n) return;
    visit(n);
    A.children(n).forEach(function (c) { A.walk(c, visit); });
  };

  A.children = function (n) {
    switch (n.type) {
      case 'add': case 'mul': case 'fn': return n.args;
      case 'div': return [n.a, n.b];
      case 'pow': return [n.base, n.exp];
      case 'eq': return [n.a, n.b];
      default: return [];
    }
  };

  /** Nombres de variable presentes, ordenados. */
  A.variables = function (n) {
    var set = {};
    A.walk(n, function (m) { if (m.type === 'var') set[m.name] = true; });
    return Object.keys(set).sort();
  };

  /** Clave canónica para comparar estructuras (usada al agrupar términos). */
  A.key = function (n) {
    if (!n) return '';
    switch (n.type) {
      case 'num': return '#' + n.r.toString();
      case 'var': return 'v' + n.name;
      case 'const': return 'c' + n.name;
      case 'add': return 'A(' + n.args.map(A.key).sort().join(',') + ')';
      case 'mul': return 'M(' + n.args.map(A.key).sort().join(',') + ')';
      case 'div': return 'D(' + A.key(n.a) + ',' + A.key(n.b) + ')';
      case 'pow': return 'P(' + A.key(n.base) + ',' + A.key(n.exp) + ')';
      case 'fn': return 'F' + n.name + '(' + n.args.map(A.key).join(',') + ')';
      case 'eq': return 'E(' + A.key(n.a) + ',' + A.key(n.b) + ')';
    }
    return '?';
  };

  A.equal = function (a, b) { return A.key(a) === A.key(b); };

  /** Grado total aproximado, usado sólo para ordenar términos. */
  A.degree = function (n, v) {
    switch (n.type) {
      case 'num': case 'const': return 0;
      case 'var': return (!v || n.name === v) ? 1 : 0;
      case 'mul': return n.args.reduce(function (s, a) { return s + A.degree(a, v); }, 0);
      case 'add': return n.args.reduce(function (m, a) { return Math.max(m, A.degree(a, v)); }, 0);
      case 'div': return A.degree(n.a, v) - A.degree(n.b, v);
      case 'pow':
        if (A.isNum(n.exp)) return A.degree(n.base, v) * n.exp.r.num();
        return A.degree(n.base, v);
      case 'fn': return 0.5;
    }
    return 0;
  };

  MP.ast = A;
})(window.MP = window.MP || {});

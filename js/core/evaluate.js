/* ── Evaluación numérica ──────────────────────────────────────
   evaluate(ast, scope, opts) → número (NaN si no está definido).
   compile(ast, varName) → función rápida para el graficador.     */
(function (MP) {
  'use strict';

  var FN = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    cot: function (x) { return 1 / Math.tan(x); },
    sec: function (x) { return 1 / Math.cos(x); },
    csc: function (x) { return 1 / Math.sin(x); },
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    ln: Math.log, log: Math.log10 || function (x) { return Math.log(x) / Math.LN10; },
    log10: Math.log10 || function (x) { return Math.log(x) / Math.LN10; },
    log2: Math.log2 || function (x) { return Math.log(x) / Math.LN2; },
    exp: Math.exp, sqrt: Math.sqrt, abs: Math.abs,
    floor: Math.floor, ceil: Math.ceil, round: Math.round,
    sign: Math.sign
  };

  var CONST = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 };

  var TRIG = { sin: 1, cos: 1, tan: 1, cot: 1, sec: 1, csc: 1 };
  var INVTRIG = { asin: 1, acos: 1, atan: 1, arcsin: 1, arccos: 1, arctan: 1 };

  /**
   * @param {object} scope  valores de las variables, p. ej. { x: 2, a: -1 }
   * @param {object} opts   { degrees: bool }  modo de ángulo
   */
  function evaluate(n, scope, opts) {
    scope = scope || {};
    opts = opts || {};
    var toRad = opts.degrees ? Math.PI / 180 : 1;
    var fromRad = opts.degrees ? 180 / Math.PI : 1;

    function ev(m) {
      switch (m.type) {
        case 'num': return m.r.num();
        case 'const': return CONST[m.name] !== undefined ? CONST[m.name] : NaN;
        case 'var':
          if (Object.prototype.hasOwnProperty.call(scope, m.name)) return scope[m.name];
          return NaN;
        case 'add': {
          var s = 0;
          for (var i = 0; i < m.args.length; i++) s += ev(m.args[i]);
          return s;
        }
        case 'mul': {
          var p = 1;
          for (var j = 0; j < m.args.length; j++) p *= ev(m.args[j]);
          return p;
        }
        case 'div': return ev(m.a) / ev(m.b);
        case 'pow': {
          var b = ev(m.base), e = ev(m.exp);
          if (b < 0 && !Number.isInteger(e)) {
            // raíz impar de un negativo: (-8)^(1/3) = -2
            var inv = 1 / e;
            if (Number.isInteger(inv) && Math.abs(inv) % 2 === 1) {
              return -Math.pow(-b, e);
            }
            return NaN;
          }
          return Math.pow(b, e);
        }
        case 'fn': {
          var f = FN[m.name];
          if (!f) return NaN;
          var a0 = ev(m.args[0]);
          if (TRIG[m.name]) return f(a0 * toRad);
          if (INVTRIG[m.name]) return f(a0) * fromRad;
          if (m.name === 'log' && m.args.length === 2) {
            return Math.log(ev(m.args[1])) / Math.log(a0);
          }
          return f(a0);
        }
        case 'eq': return ev(m.a) - ev(m.b);
      }
      return NaN;
    }
    return ev(n);
  }

  /** Devuelve f(x, params) optimizada para llamarse miles de veces. */
  function compile(ast, varName, opts) {
    varName = varName || 'x';
    var scope = {};
    return function (x, params) {
      scope[varName] = x;
      if (params) for (var k in params) if (k !== varName) scope[k] = params[k];
      return evaluate(ast, scope, opts);
    };
  }

  MP.evaluate = evaluate;
  MP.compile = compile;
  MP.CONST = CONST;
})(window.MP = window.MP || {});

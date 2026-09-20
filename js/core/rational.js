/* ── Aritmética racional exacta ───────────────────────────────
   Toda la aritmética de la aplicación pasa por aquí. Nunca se
   usa coma flotante para fracciones: 1/3 + 1/6 debe dar 1/2
   exacto, no 0.49999999999999994.                              */
(function (MP) {
  'use strict';

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a || 1;
  }

  /** Número racional n/d en forma reducida, d > 0. */
  function Rat(n, d) {
    if (d === undefined) d = 1;
    if (!isFinite(n) || !isFinite(d)) throw new Error('Número no finito');
    if (d === 0) throw new Error('División entre cero');
    if (n !== Math.round(n) || d !== Math.round(d)) {
      var r = Rat.fromNumber(n / d);
      this.n = r.n; this.d = r.d; return;
    }
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d);
    this.n = n / g;
    this.d = d / g;
  }

  Rat.prototype.add = function (o) { return new Rat(this.n * o.d + o.n * this.d, this.d * o.d); };
  Rat.prototype.sub = function (o) { return new Rat(this.n * o.d - o.n * this.d, this.d * o.d); };
  Rat.prototype.mul = function (o) { return new Rat(this.n * o.n, this.d * o.d); };
  Rat.prototype.div = function (o) {
    if (o.n === 0) throw new Error('División entre cero');
    return new Rat(this.n * o.d, this.d * o.n);
  };
  Rat.prototype.neg = function () { return new Rat(-this.n, this.d); };
  Rat.prototype.abs = function () { return new Rat(Math.abs(this.n), this.d); };
  Rat.prototype.inv = function () { return new Rat(this.d, this.n); };
  Rat.prototype.pow = function (k) {
    k = Math.round(k);
    if (k === 0) return new Rat(1);
    if (k < 0) return this.inv().pow(-k);
    return new Rat(Math.pow(this.n, k), Math.pow(this.d, k));
  };
  Rat.prototype.eq = function (o) { return this.n === o.n && this.d === o.d; };
  Rat.prototype.cmp = function (o) { var v = this.n * o.d - o.n * this.d; return v > 0 ? 1 : v < 0 ? -1 : 0; };
  Rat.prototype.isZero = function () { return this.n === 0; };
  Rat.prototype.isOne = function () { return this.n === 1 && this.d === 1; };
  Rat.prototype.isInt = function () { return this.d === 1; };
  Rat.prototype.isNeg = function () { return this.n < 0; };
  Rat.prototype.num = function () { return this.n / this.d; };
  Rat.prototype.toString = function () { return this.d === 1 ? String(this.n) : this.n + '/' + this.d; };
  Rat.prototype.clone = function () { return new Rat(this.n, this.d); };

  /** Convierte un número decimal a fracción exacta cuando es razonable. */
  Rat.fromNumber = function (x) {
    if (Number.isInteger(x)) return new Rat(x, 1);
    if (!isFinite(x)) throw new Error('Número no finito');
    // Fracciones continuas con denominador acotado.
    var sign = x < 0 ? -1 : 1, v = Math.abs(x);
    var h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = v;
    for (var i = 0; i < 30; i++) {
      var a = Math.floor(b);
      var h2 = a * h1 + h0, k2 = a * k1 + k0;
      h0 = h1; h1 = h2; k0 = k1; k1 = k2;
      if (k1 > 1e9) break;
      if (Math.abs(v - h1 / k1) < 1e-12 * Math.max(1, v)) break;
      var frac = b - a;
      if (frac < 1e-12) break;
      b = 1 / frac;
    }
    return new Rat(sign * h1, k1);
  };

  /** Parsea "3", "2.5", "0.125" de forma exacta. */
  Rat.fromDecimalString = function (s) {
    var m = /^(\d*)(?:\.(\d*))?$/.exec(s);
    if (!m) return Rat.fromNumber(parseFloat(s));
    var ip = m[1] || '0', fp = m[2] || '';
    var den = Math.pow(10, fp.length);
    return new Rat(parseInt(ip + fp, 10), den);
  };

  /** ¿n es un cuadrado perfecto? Devuelve la raíz o null. */
  function intSqrt(n) {
    if (n < 0) return null;
    var r = Math.round(Math.sqrt(n));
    return r * r === n ? r : null;
  }

  /**
   * Simplifica √(p/q) a  coef · √rad  con rad entero libre de cuadrados.
   * Ejemplo: √(12) → { coef: 2, rad: 3 };  √(9/4) → { coef: 3/2, rad: 1 }
   */
  Rat.simplifySqrt = function (r) {
    if (r.isNeg()) return null;
    // √(p/q) = √(p·q) / q
    var m = r.n * r.d, q = r.d;
    var coef = 1, rad = m;
    for (var f = 2; f * f <= rad; f++) {
      while (rad % (f * f) === 0) { rad /= f * f; coef *= f; }
    }
    return { coef: new Rat(coef, q), rad: rad };
  };

  Rat.isPerfectSquare = function (r) {
    if (r.isNeg()) return null;
    var a = intSqrt(r.n), b = intSqrt(r.d);
    return (a !== null && b !== null) ? new Rat(a, b) : null;
  };

  Rat.ZERO = new Rat(0);
  Rat.ONE = new Rat(1);
  Rat.gcd = gcd;
  Rat.intSqrt = intSqrt;

  MP.Rat = Rat;
})(window.MP = window.MP || {});

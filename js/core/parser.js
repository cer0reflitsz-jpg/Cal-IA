/* ── Lexer + Parser ───────────────────────────────────────────
   Convierte texto ("3x^2 - 5x + 2 = 0") en un AST.
   Soporta multiplicación implícita (2x, 3sin(x), (x+1)(x-2)),
   potencias asociativas por la derecha y ecuaciones.            */
(function (MP) {
  'use strict';
  var A = MP.ast, Rat = MP.Rat;

  var FUNCTIONS = {
    sin: 1, cos: 1, tan: 1, cot: 1, sec: 1, csc: 1,
    asin: 1, acos: 1, atan: 1, arcsin: 1, arccos: 1, arctan: 1,
    sinh: 1, cosh: 1, tanh: 1,
    ln: 1, log: 1, log10: 1, log2: 1, exp: 1, sqrt: 1, abs: 1,
    floor: 1, ceil: 1, round: 1, sign: 1
  };
  var CONSTANTS = { pi: 1, 'π': 1, e: 1, tau: 1, 'τ': 1 };

  function isDigit(c) { return c >= '0' && c <= '9'; }
  function isLetter(c) { return /[a-zA-Zα-ωΑ-Ω]/.test(c); }

  function tokenize(src) {
    var toks = [], i = 0;
    src = String(src)
      .replace(/·/g, '*').replace(/×/g, '*').replace(/÷/g, '/')
      .replace(/−/g, '-').replace(/–/g, '-')
      .replace(/\s+/g, ' ');

    while (i < src.length) {
      var c = src[i];
      if (c === ' ') { i++; continue; }

      if (isDigit(c) || (c === '.' && isDigit(src[i + 1]))) {
        var j = i;
        while (j < src.length && (isDigit(src[j]) || src[j] === '.')) j++;
        toks.push({ t: 'num', v: src.slice(i, j) });
        i = j; continue;
      }

      if (isLetter(c)) {
        var k = i;
        while (k < src.length && isLetter(src[k])) k++;
        var word = src.slice(i, k);
        // Coincidencia más larga primero: "sin" antes que "s"·"i"·"n".
        var pos = 0;
        while (pos < word.length) {
          var matched = null;
          for (var len = Math.min(7, word.length - pos); len >= 1; len--) {
            var cand = word.substr(pos, len).toLowerCase();
            if (FUNCTIONS[cand] || CONSTANTS[cand]) { matched = { raw: word.substr(pos, len), key: cand }; break; }
          }
          if (matched && FUNCTIONS[matched.key]) {
            toks.push({ t: 'fn', v: matched.key }); pos += matched.raw.length;
          } else if (matched && CONSTANTS[matched.key]) {
            toks.push({ t: 'const', v: matched.key === 'π' ? 'pi' : (matched.key === 'τ' ? 'tau' : matched.key) });
            pos += matched.raw.length;
          } else {
            toks.push({ t: 'var', v: word[pos] }); pos += 1;
          }
        }
        i = k; continue;
      }

      if ('+-*/^(),=<>'.indexOf(c) >= 0) { toks.push({ t: c }); i++; continue; }
      if (c === '√') { toks.push({ t: 'fn', v: 'sqrt' }); i++; continue; }
      if (c === '|') { toks.push({ t: '|' }); i++; continue; }
      if (c === '[') { toks.push({ t: '(' }); i++; continue; }
      if (c === ']') { toks.push({ t: ')' }); i++; continue; }

      throw new Error('Carácter no reconocido: "' + c + '"');
    }
    toks.push({ t: 'eof' });
    return toks;
  }

  function Parser(toks) { this.toks = toks; this.i = 0; }
  Parser.prototype.peek = function () { return this.toks[this.i]; };
  Parser.prototype.next = function () { return this.toks[this.i++]; };
  Parser.prototype.accept = function (t) {
    if (this.peek().t === t) { this.i++; return true; }
    return false;
  };
  Parser.prototype.expect = function (t) {
    if (!this.accept(t)) throw new Error('Se esperaba "' + t + '"');
  };

  Parser.prototype.parseTop = function () {
    var e = this.parseAdditive();
    if (this.accept('=')) e = A.eq(e, this.parseAdditive());
    if (this.peek().t !== 'eof') throw new Error('Expresión incompleta o símbolo sobrante');
    return e;
  };

  Parser.prototype.parseAdditive = function () {
    var left = this.parseMultiplicative();
    for (;;) {
      if (this.accept('+')) left = A.add([left, this.parseMultiplicative()]);
      else if (this.accept('-')) left = A.add([left, A.neg(this.parseMultiplicative())]);
      else return left;
    }
  };

  /** ¿El token actual puede iniciar un factor? (multiplicación implícita) */
  Parser.prototype.startsFactor = function () {
    var t = this.peek().t;
    return t === 'num' || t === 'var' || t === 'const' || t === 'fn' || t === '(' || t === '|';
  };

  Parser.prototype.parseMultiplicative = function () {
    var left = this.parseUnary();
    for (;;) {
      if (this.accept('*')) left = A.mul([left, this.parseUnary()]);
      else if (this.accept('/')) left = A.div(left, this.parseUnary());
      else if (this.startsFactor()) left = A.mul([left, this.parseUnary()]);
      else return left;
    }
  };

  Parser.prototype.parseUnary = function () {
    if (this.accept('-')) return A.neg(this.parseUnary());
    if (this.accept('+')) return this.parseUnary();
    return this.parsePower();
  };

  Parser.prototype.parsePower = function () {
    var base = this.parsePrimary();
    if (this.accept('^')) return A.pow(base, this.parseUnary()); // asoc. derecha
    return base;
  };

  Parser.prototype.parsePrimary = function () {
    var tk = this.next();
    switch (tk.t) {
      case 'num':
        return A.rat(Rat.fromDecimalString(tk.v));
      case 'var':
        return A.vr(tk.v);
      case 'const':
        return A.cnst(tk.v);
      case 'fn': {
        var args = [];
        if (this.accept('(')) {
          if (!this.accept(')')) {
            do { args.push(this.parseAdditive()); } while (this.accept(','));
            this.expect(')');
          }
        } else {
          // sqrt 9  /  sin x   → argumento sin paréntesis
          args.push(this.parsePower());
        }
        if (args.length === 0) throw new Error('La función ' + tk.v + ' necesita un argumento');
        return A.fn(tk.v, args);
      }
      case '(': {
        var e = this.parseAdditive();
        this.expect(')');
        return e;
      }
      case '|': {
        var v = this.parseAdditive();
        this.expect('|');
        return A.fn('abs', [v]);
      }
    }
    throw new Error('Expresión incompleta');
  };

  /**
   * Analiza texto y devuelve el AST.
   * Acepta "y = x^2", "f(x) = x^2" y "x^2" indistintamente.
   */
  function parse(src) {
    var s = String(src).trim();
    if (!s) throw new Error('Expresión vacía');
    // Quita la declaración "f(x) =" o "y =" del lado izquierdo.
    var decl = /^\s*([a-zA-Z])\s*\(\s*([a-zA-Z])\s*\)\s*=\s*(.+)$/.exec(s);
    if (decl) s = decl[3];
    else {
      var ydecl = /^\s*y\s*=\s*([^=]+)$/.exec(s);
      if (ydecl) s = ydecl[1];
    }
    var p = new Parser(tokenize(s));
    return p.parseTop();
  }

  /** Igual que parse pero devuelve también el nombre declarado, si lo hay. */
  parse.withDeclaration = function (src) {
    var s = String(src).trim();
    var decl = /^\s*([a-zA-Z])\s*\(\s*([a-zA-Z])\s*\)\s*=\s*(.+)$/.exec(s);
    if (decl) return { name: decl[1], variable: decl[2], node: parse(decl[3]) };
    var ydecl = /^\s*y\s*=\s*([^=]+)$/.exec(s);
    if (ydecl) return { name: 'y', variable: 'x', node: parse(ydecl[1]) };
    return { name: null, variable: 'x', node: parse(s) };
  };

  MP.parse = parse;
  MP.tokenize = tokenize;
  MP.FUNCTIONS = FUNCTIONS;
})(window.MP = window.MP || {});

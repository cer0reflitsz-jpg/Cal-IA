/* ── Renderizado de expresiones ───────────────────────────────
   toHTML(ast)   → marcado matemático (fracciones, radicales…)
   toSource(ast) → texto que el parser vuelve a aceptar
   Sin dependencias externas: el marcado lo estiliza math.css.   */
(function (MP) {
  'use strict';
  var A = MP.ast;

  var SYM = { pi: 'π', e: 'e', tau: 'τ' };
  var FN_LABEL = { arcsin: 'arcsin', arccos: 'arccos', arctan: 'arctan', ln: 'ln', log: 'log', log10: 'log', exp: 'exp' };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function numHTML(rat) {
    if (rat.isInt()) return '<span class="num">' + esc(rat.n) + '</span>';
    var sign = rat.isNeg() ? '<span class="op tight">−</span>' : '';
    return sign + frac('<span class="num">' + Math.abs(rat.n) + '</span>',
                       '<span class="num">' + rat.d + '</span>');
  }

  function frac(top, bot) {
    return '<span class="frac"><span class="top">' + top + '</span>' +
           '<span class="bot">' + bot + '</span></span>';
  }

  function paren(inner) {
    return '<span class="paren">(</span>' + inner + '<span class="paren">)</span>';
  }

  /** ¿Hay que poner paréntesis a este nodo dentro de un contexto dado? */
  function needsParen(n, ctx) {
    if (ctx === 'pow-base') {
      return n.type === 'add' || n.type === 'mul' || n.type === 'div' ||
             (n.type === 'num' && (n.r.isNeg() || !n.r.isInt()));
    }
    if (ctx === 'mul-factor') return n.type === 'add';
    if (ctx === 'neg') return n.type === 'add';
    return false;
  }

  function wrap(n, ctx, html) {
    return needsParen(n, ctx) ? paren(html) : html;
  }

  function toHTML(n) {
    if (!n) return '';
    switch (n.type) {
      case 'num': return numHTML(n.r);
      case 'var': return '<span class="var">' + esc(n.name) + '</span>';
      case 'const': return '<span class="' + (n.name === 'e' ? 'var' : 'num') + '">' +
                           esc(SYM[n.name] || n.name) + '</span>';

      case 'eq':
        return toHTML(n.a) + '<span class="op">=</span>' + toHTML(n.b);

      case 'div':
        return frac(toHTML(n.a), toHTML(n.b));

      case 'pow': {
        var b = wrap(n.base, 'pow-base', toHTML(n.base));
        return b + '<sup>' + toHTML(n.exp) + '</sup>';
      }

      case 'fn': {
        if (n.name === 'sqrt') {
          return '<span class="radical"><span class="sign">√</span>' +
                 '<span class="body">' + toHTML(n.args[0]) + '</span></span>';
        }
        if (n.name === 'abs') {
          return '<span class="paren">|</span>' + toHTML(n.args[0]) + '<span class="paren">|</span>';
        }
        var label = FN_LABEL[n.name] || n.name;
        return '<span class="fname">' + esc(label) + '</span>' +
               paren(n.args.map(toHTML).join('<span class="op tight">,</span>'));
      }

      case 'add': {
        var out = '';
        n.args.forEach(function (t, i) {
          var sp = MP.splitCoef(t);
          var negative = sp.c.isNeg();
          var term = negative ? MP.simplify(A.mul([A.num(-1), t])) : t;
          if (i === 0) {
            out += (negative ? '<span class="op tight">−</span>' : '') + toHTML(term);
          } else {
            out += '<span class="op">' + (negative ? '−' : '+') + '</span>' + toHTML(term);
          }
        });
        return out;
      }

      case 'mul': {
        var coef = null, factors = [];
        n.args.forEach(function (a) {
          if (a.type === 'num' && coef === null) coef = a.r;
          else factors.push(a);
        });
        var body = '';
        factors.forEach(function (f, i) {
          var h = wrap(f, 'mul-factor', toHTML(f));
          if (i > 0) {
            var prev = factors[i - 1];
            var needDot = (f.type === 'num') ||
                          (prev.type === 'num') ||
                          (prev.type === 'pow' && f.type === 'pow' && A.key(prev.base) === A.key(f.base));
            body += needDot ? '<span class="op tight">·</span>' : '';
          }
          body += h;
        });
        if (coef === null) return body;
        if (factors.length === 0) return numHTML(coef);

        var sign = coef.isNeg() ? '<span class="op tight">−</span>' : '';
        var absC = coef.abs();
        if (!absC.isInt()) {
          // 3/2·x se muestra como una fracción con x en el numerador
          var top = (absC.n === 1) ? body : '<span class="num">' + absC.n + '</span>' + body;
          return sign + frac(top, '<span class="num">' + absC.d + '</span>');
        }
        var lead = absC.isOne() ? '' : '<span class="num">' + absC.n + '</span>';
        var sep = (lead && factors[0].type === 'num') ? '<span class="op tight">·</span>' : '';
        return sign + lead + sep + body;
      }
    }
    return '?';
  }

  /** Envuelve en el contenedor con la clase .math */
  function html(n, extraClass) {
    return '<span class="math ' + (extraClass || '') + '">' + toHTML(n) + '</span>';
  }

  /* ── Texto reanalizable ──────────────────────────────────── */
  function toSource(n) {
    if (!n) return '';
    switch (n.type) {
      case 'num': return n.r.isInt() ? String(n.r.n) : '(' + n.r.n + '/' + n.r.d + ')';
      case 'var': return n.name;
      case 'const': return n.name;
      case 'eq': return toSource(n.a) + ' = ' + toSource(n.b);
      case 'div': return '(' + toSource(n.a) + ')/(' + toSource(n.b) + ')';
      case 'pow': return '(' + toSource(n.base) + ')^(' + toSource(n.exp) + ')';
      case 'fn': return n.name + '(' + n.args.map(toSource).join(', ') + ')';
      case 'add':
        return n.args.map(function (a, i) {
          var s = toSource(a);
          return i === 0 ? s : (s[0] === '-' ? ' - ' + s.slice(1) : ' + ' + s);
        }).join('');
      case 'mul':
        return n.args.map(function (a) {
          return (a.type === 'add') ? '(' + toSource(a) + ')' : toSource(a);
        }).join('*');
    }
    return '';
  }

  MP.render = { toHTML: toHTML, html: html, toSource: toSource, esc: esc };
})(window.MP = window.MP || {});

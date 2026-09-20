/* ── Banco de ejercicios ──────────────────────────────────────
   Un generador por tema de js/content/topics.js. Cada generador
   recibe (rng, dificultad) y construye el problema con números
   aleatorios, pero la RESPUESTA nunca se calcula a mano: siempre
   sale de volver a ejecutar el motor real (MP.algebra.solve,
   MP.calculus.derivative, MP.geo...) sobre el problema ya
   construido. Si el generador arma mal el enunciado, el propio
   motor lo delata — nunca puede quedar una respuesta incorrecta
   fija en el código.                                            */
(function (MP) {
  'use strict';
  var E = MP.exengine, A = MP.ast, R = MP.render;

  function signed(n) { return n >= 0 ? ' + ' + n : ' - ' + (-n); }
  function fmtNum(v) {
    if (!isFinite(v)) return '—';
    var r = Math.round(v * 1e6) / 1e6;
    return Object.is(r, -0) ? '0' : String(r);
  }
  function lcmInt(a, b) { return Math.abs(a * b) / gcdInt(a, b); }
  function gcdInt(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }

  var TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [7, 24, 25], [9, 12, 15]];

  /* ── Aritmética ───────────────────────────────────────────── */

  function genFracciones(rng, diff) {
    var range = { basico: [2, 6], intermedio: [2, 10], avanzado: [2, 12], desafio: [2, 15] }[diff] || [2, 6];
    var nTerms = (diff === 'avanzado' || diff === 'desafio') ? 3 : 2;
    var terms = [];
    for (var i = 0; i < nTerms; i++) {
      var d = E.randInt(rng, range[0], range[1]);
      var n = E.randInt(rng, 1, d - 1);
      var neg = i > 0 && diff !== 'basico' && rng() < 0.5;
      terms.push({ n: n, d: d, neg: neg });
    }
    var exprStr = terms.map(function (t, i) {
      var piece = t.n + '/' + t.d;
      if (i === 0) return t.neg ? '-' + piece : piece;
      return (t.neg ? ' - ' : ' + ') + piece;
    }).join('');
    var node = MP.parse(exprStr);
    var answer = MP.simplify(node);
    var val = MP.evaluate(answer, {});

    var L = terms.reduce(function (acc, t) { return lcmInt(acc, t.d); }, 1);
    var converted = terms.map(function (t) {
      var mult = L / t.d, num = t.n * mult;
      return (t.neg ? '-' : '+') + num;
    }).join(' ').replace(/^\+/, '');

    return {
      topicId: 'fracciones', difficulty: diff, type: 'numeric',
      prompt: 'Calcula y simplifica: ' + R.html(node),
      expected: val, tol: 1e-6,
      answerText: R.toSource(answer),
      hints: [
        'Busca el mínimo común múltiplo de los denominadores.',
        'Convierte cada fracción a ese denominador antes de sumar o restar: ' + converted + ' sobre ' + L + '.',
        'El resultado simplificado es ' + R.toSource(answer) + '.'
      ],
      steps: [
        { why: 'Denominador común (mcm de ' + terms.map(function (t) { return t.d; }).join(', ') + ')', html: '<span class="mono">' + L + '</span>' },
        { why: 'Convertimos cada fracción y sumamos numeradores', html: '<span class="mono">(' + converted + ') / ' + L + '</span>' },
        { why: 'Simplificamos', html: R.html(answer) }
      ]
    };
  }

  function genPotencias(rng, diff) {
    var isRoot = diff === 'avanzado' || diff === 'desafio' || rng() < 0.4;
    if (!isRoot) {
      var base = E.randInt(rng, 2, diff === 'basico' ? 5 : 9);
      var exp = E.randInt(rng, 2, diff === 'basico' ? 3 : (diff === 'intermedio' ? 4 : 5));
      var node = MP.parse(base + '^' + exp);
      var val = MP.evaluate(node, {});
      return {
        topicId: 'potencias-raices', difficulty: diff, type: 'numeric',
        prompt: 'Calcula: ' + R.html(node),
        expected: val, tol: 1e-9, answerText: String(val),
        hints: [
          base + '^' + exp + ' significa multiplicar ' + base + ' por sí mismo ' + exp + ' veces.',
          'Multiplica paso a paso: ' + new Array(exp).fill(base).join(' × ') + '.',
          'El resultado es ' + val + '.'
        ],
        steps: [
          { why: 'Escribimos la potencia como producto repetido', html: '<span class="mono">' + new Array(exp).fill(base).join(' × ') + '</span>' },
          { why: 'Multiplicamos', html: '<span class="mono">' + val + '</span>' }
        ]
      };
    }
    var coefRange = diff === 'avanzado' ? [2, 6] : [2, 9];
    var coef = E.randInt(rng, coefRange[0], coefRange[1]);
    var rad = E.pick(rng, [2, 3, 5, 6, 7, 10, 11]);
    var radicand = coef * coef * rad;
    var node2 = MP.parse('sqrt(' + radicand + ')');
    var answerNode = MP.simplify(node2);
    var val2 = MP.evaluate(node2, {});
    return {
      topicId: 'potencias-raices', difficulty: diff, type: 'numeric',
      prompt: 'Simplifica: ' + R.html(node2),
      expected: val2, tol: 1e-6,
      answerText: R.toSource(answerNode) + '  (≈ ' + fmtNum(val2) + ')',
      hints: [
        'Busca el mayor factor de ' + radicand + ' que sea un cuadrado perfecto.',
        radicand + ' = ' + (coef * coef) + ' × ' + rad + ', y ' + (coef * coef) + ' = ' + coef + '².',
        'Entonces la raíz es ' + coef + '√' + rad + '.'
      ],
      steps: [
        { why: 'Factorizamos buscando un cuadrado perfecto', html: '<span class="mono">' + radicand + ' = ' + (coef * coef) + ' × ' + rad + '</span>' },
        { why: 'Sacamos la raíz del cuadrado perfecto', html: R.html(answerNode) }
      ]
    };
  }

  function genOrden(rng, diff) {
    var a = E.randInt(rng, 1, 9), b = E.randInt(rng, 1, 9), c = E.randInt(rng, 2, 4), d = E.randInt(rng, 1, 9);
    var exprStr;
    if (diff === 'basico') exprStr = a + ' + ' + b + ' * ' + c;
    else if (diff === 'intermedio') exprStr = a + ' + ' + b + ' * ' + c + '^2';
    else if (diff === 'avanzado') exprStr = '(' + a + ' + ' + b + ') * ' + c + ' - ' + d;
    else exprStr = a + ' * (' + b + ' + ' + c + ')^2 - ' + d;
    var node = MP.parse(exprStr);
    var val = MP.evaluate(node, {});

    if (rng() < 0.35) {
      var claimTrue = rng() < 0.5;
      var claimed = claimTrue ? val : val + E.pick(rng, [-3, -2, -1, 1, 2, 3]);
      return {
        topicId: 'orden-operaciones', difficulty: diff, type: 'tf',
        prompt: '¿Es correcto que ' + R.html(node) + ' = ' + fmtNum(claimed) + '?',
        correctBool: claimTrue,
        answerText: (claimTrue ? 'Verdadero' : 'Falso') + ' — el valor correcto es ' + fmtNum(val) + '.',
        hints: ['Resuelve primero paréntesis y potencias, luego multiplicaciones, y al final sumas y restas.', 'El valor real de la expresión es ' + fmtNum(val) + '.'],
        steps: [{ why: 'Aplicamos el orden de operaciones', html: '<span class="mono">' + exprStr + ' = ' + fmtNum(val) + '</span>' }]
      };
    }
    return {
      topicId: 'orden-operaciones', difficulty: diff, type: 'numeric',
      prompt: 'Calcula respetando el orden de operaciones: ' + R.html(node),
      expected: val, tol: 1e-9, answerText: String(val),
      hints: ['Resuelve primero lo que está entre paréntesis, después las potencias.', 'Luego las multiplicaciones y divisiones, de izquierda a derecha.', 'El resultado es ' + val + '.'],
      steps: [{ why: 'Aplicamos el orden de operaciones', html: '<span class="mono">' + exprStr + ' = ' + val + '</span>' }]
    };
  }

  /* ── Álgebra ──────────────────────────────────────────────── */

  function genSimplificar(rng, diff) {
    var maxAbs = { basico: 8, intermedio: 12, avanzado: 15, desafio: 18 }[diff] || 8;
    var nTerms = { basico: 3, intermedio: 4, avanzado: 5, desafio: 5 }[diff] || 3;
    var parts = [];
    for (var i = 0; i < nTerms; i++) {
      var c = E.randNonZero(rng, -maxAbs, maxAbs);
      var isX = i % 2 === 0 || rng() < 0.6;
      parts.push(isX ? (c + 'x') : String(c));
    }
    var exprStr = parts[0] + parts.slice(1).map(function (p) {
      return p[0] === '-' ? ' - ' + p.slice(1) : ' + ' + p;
    }).join('');
    var node = MP.parse(exprStr);
    var answer = MP.simplify(node);
    return {
      topicId: 'simplificar', difficulty: diff, type: 'algebraic',
      prompt: 'Simplifica: ' + R.html(node),
      expectedNode: answer, answerText: R.toSource(answer),
      hints: [
        'Agrupa por separado los términos con x y los términos sin x.',
        'Suma los coeficientes de cada grupo.',
        'El resultado simplificado es ' + R.toSource(answer) + '.'
      ],
      steps: [
        { why: 'Agrupamos los términos semejantes', html: R.html(node) },
        { why: 'Sumamos cada grupo', html: R.html(answer) }
      ]
    };
  }

  function genProductos(rng, diff) {
    var k = E.randNonZero(rng, diff === 'basico' ? -6 : -9, diff === 'basico' ? 6 : 9);
    var m = diff === 'desafio' ? E.pick(rng, [2, 3]) : 1;
    var pool = diff === 'desafio'
      ? ['(' + m + 'x' + signed(k) + ')^2', '(x' + signed(k) + ')*(x' + signed(-k) + ')']
      : ['(x' + signed(k) + ')^2', '(x' + signed(k) + ')*(x' + signed(-k) + ')'];
    var exprStr = E.pick(rng, pool);
    var node = MP.parse(exprStr);
    var ex = MP.algebra.expand(node);
    return {
      topicId: 'productos-notables', difficulty: diff, type: 'algebraic',
      prompt: 'Desarrolla: ' + R.html(node),
      expectedNode: ex.result, answerText: R.toSource(ex.result),
      hints: [
        'Reconoce el patrón: ¿es un cuadrado de binomio o una suma por diferencia?',
        'Un cuadrado de binomio (a+b)² siempre tiene un término cruzado 2ab; no lo olvides.',
        'El resultado desarrollado es ' + R.toSource(ex.result) + '.'
      ],
      steps: ex.steps
    };
  }

  function factorLabel(r1, r2, a) {
    var lin = function (r) { return r === 0 ? 'x' : ('x' + (r > 0 ? ' − ' + r : ' + ' + (-r))); };
    var pre = (a && a !== 1) ? (a + '·') : '';
    return pre + '(' + lin(r1) + ')(' + lin(r2) + ')';
  }

  function genFactorizacion(rng, diff) {
    var range = { basico: [1, 6], intermedio: [1, 9], avanzado: [1, 12], desafio: [1, 9] }[diff] || [1, 6];
    var r1 = E.randNonZero(rng, -range[1], range[1]);
    var r2 = E.randNonZero(rng, -range[1], range[1]);
    while (r2 === r1) r2 = E.randNonZero(rng, -range[1], range[1]);
    var a = (diff === 'desafio') ? E.pick(rng, [2, 3]) : 1;
    var factoredStr = (a !== 1 ? a + '*' : '') + '(x' + signed(-r1) + ')*(x' + signed(-r2) + ')';
    var expanded = MP.expand(MP.parse(factoredStr));

    var correctLabel = factorLabel(r1, r2, a);
    var d1 = factorLabel(-r1, r2, a);
    var d2 = factorLabel(r1, -r2, a);
    var d3 = factorLabel(r1 + 1, r2, a);
    var mc = E.buildMC(rng, correctLabel, [d1, d2, d3]);

    var f = MP.algebra.factor(expanded);
    return {
      topicId: 'factorizacion', difficulty: diff, type: 'mc',
      prompt: 'Factoriza: ' + R.html(expanded),
      options: mc.options, correctId: mc.correctId, answerText: correctLabel,
      hints: [
        'Busca dos números que multiplicados den el término independiente y sumados den el coeficiente de x.',
        'Esos dos números, con el signo cambiado, son las raíces del polinomio.',
        'La factorización correcta es ' + correctLabel + '.'
      ],
      steps: f.steps
    };
  }

  function genLineal(rng, diff) {
    var x0 = E.randNonZero(rng, diff === 'basico' ? -10 : -15, diff === 'basico' ? 10 : 15);
    var a = E.randNonZero(rng, 2, diff === 'basico' ? 6 : 9);
    var b = E.randInt(rng, -12, 12);
    var exprStr;
    if (diff === 'basico') {
      var c = a * x0 + b;
      exprStr = a + 'x' + signed(b) + ' = ' + c;
    } else if (diff === 'intermedio') {
      var c2 = a * (x0 + b);
      exprStr = a + '*(x' + signed(b) + ') = ' + c2;
    } else if (diff === 'avanzado') {
      var d = E.pick(rng, [2, 3, 4]);
      var c3 = (a * x0) / d + b;
      exprStr = a + 'x/' + d + signed(b) + ' = ' + c3;
    } else {
      var b2 = E.randInt(rng, -8, 8);
      var c4Pool = [2, 3, 4, 5].filter(function (v) { return v !== a; });
      var c4 = E.pick(rng, c4Pool);
      var k = (a - c4) * x0 + a * b + b2;
      exprStr = a + '*(x' + signed(b) + ')' + signed(b2) + ' = ' + c4 + 'x' + signed(k);
    }
    var eqNode = MP.parse(exprStr);
    var r = MP.algebra.solve(eqNode);
    var val = MP.evaluate(r.solutions[0], {});
    return {
      topicId: 'ecuaciones-lineales', difficulty: diff, type: 'numeric',
      prompt: 'Resuelve: ' + R.html(eqNode),
      expected: val, tol: 1e-6, answerText: 'x = ' + R.toSource(r.solutions[0]),
      hints: [
        'Empieza por agrupar los términos con x en un lado y los números en el otro.',
        'Cada operación que hagas en un lado debe hacerse también en el otro.',
        'La solución es x = ' + R.toSource(r.solutions[0]) + '.'
      ],
      steps: r.steps
    };
  }

  function genCuadratica(rng, diff) {
    var range = { basico: [1, 6], intermedio: [1, 9], avanzado: [2, 12], desafio: [1, 9] }[diff] || [1, 6];
    var r1 = E.randNonZero(rng, -range[1], range[1]);
    var r2 = E.randNonZero(rng, -range[1], range[1]);
    while (r2 === r1) r2 = E.randNonZero(rng, -range[1], range[1]);
    var a = (diff === 'avanzado' || diff === 'desafio') ? E.pick(rng, [1, 2, 3]) : 1;
    var factoredStr = (a !== 1 ? a + '*' : '') + '(x' + signed(-r1) + ')*(x' + signed(-r2) + ')';
    var expanded = MP.expand(MP.parse(factoredStr));
    var eqNode = A.eq(expanded, A.num(0));
    var r = MP.algebra.solve(eqNode);
    var vals = r.solutions.map(function (s) { return MP.evaluate(s, {}); }).sort(function (x, y) { return x - y; });

    var lab = function (v1, v2) { return 'x = ' + fmtNum(v1) + '  o  x = ' + fmtNum(v2); };
    var correctLabel = lab(vals[0], vals[1]);
    var mc = E.buildMC(rng, correctLabel, [
      lab(-vals[0], vals[1]), lab(vals[0], -vals[1]), lab(vals[0] + 1, vals[1])
    ]);
    return {
      topicId: 'ecuaciones-cuadraticas', difficulty: diff, type: 'mc',
      prompt: 'Resuelve: ' + R.html(eqNode),
      options: mc.options, correctId: mc.correctId, answerText: correctLabel,
      hints: [
        'Puedes factorizar, o usar la fórmula general x = (−b ± √(b²−4ac)) / 2a.',
        'Calcula primero el discriminante b² − 4ac.',
        'Las soluciones son ' + correctLabel + '.'
      ],
      steps: r.steps
    };
  }

  /* ── Funciones ────────────────────────────────────────────── */

  function genQueEsFuncion(rng, diff) {
    var m = E.randNonZero(rng, diff === 'basico' ? -5 : -9, diff === 'basico' ? 5 : 9);
    var b = E.randInt(rng, -9, 9);
    var x0 = E.randInt(rng, diff === 'basico' ? -5 : -9, diff === 'basico' ? 5 : 9);
    var fn = MP.parse.withDeclaration('f(x) = ' + m + 'x' + signed(b)).node;
    var val = MP.evaluate(fn, { x: x0 });
    return {
      topicId: 'que-es-funcion', difficulty: diff, type: 'numeric',
      prompt: 'Si f(x) = ' + R.html(MP.simplify(fn)) + ', calcula f(' + x0 + ').',
      expected: val, tol: 1e-9, answerText: String(val),
      hints: ['Sustituye x por ' + x0 + ' en la fórmula de f.', 'f(' + x0 + ') = ' + m + '·(' + x0 + ')' + signed(b) + '.', 'f(' + x0 + ') = ' + val + '.'],
      steps: [{ why: 'Sustituimos x = ' + x0, html: '<span class="mono">f(' + x0 + ') = ' + m + '·(' + x0 + ')' + signed(b) + ' = ' + val + '</span>' }]
    };
  }

  function genFuncionLineal(rng, diff) {
    var x1 = E.randInt(rng, -6, 6), x2;
    do { x2 = E.randInt(rng, -6, 6); } while (x2 === x1);
    var m = E.randNonZero(rng, diff === 'basico' ? -5 : -8, diff === 'basico' ? 5 : 8);
    var b = E.randInt(rng, -9, 9);
    var y1 = m * x1 + b, y2 = m * x2 + b;
    return {
      topicId: 'funcion-lineal', difficulty: diff, type: 'numeric',
      prompt: 'Una recta pasa por A(' + x1 + ', ' + y1 + ') y B(' + x2 + ', ' + y2 + '). ¿Cuál es su pendiente?',
      expected: m, tol: 1e-6, answerText: String(m),
      hints: ['La pendiente es el cambio en y dividido por el cambio en x.', 'm = (' + y2 + ' − ' + y1 + ') / (' + x2 + ' − ' + x1 + ').', 'm = ' + m + '.'],
      steps: [{ why: 'Aplicamos la fórmula de la pendiente', html: '<span class="mono">m = (' + y2 + ' − ' + y1 + ') / (' + x2 + ' − ' + x1 + ') = ' + m + '</span>' }]
    };
  }

  function genFuncionCuadratica(rng, diff) {
    var a = diff === 'basico' ? 1 : E.pick(rng, [1, 1, 2, -1]);
    var b = E.randInt(rng, -6, 6), c = E.randInt(rng, -6, 6);
    var x0 = E.randInt(rng, -5, 5);
    var fn = MP.parse.withDeclaration('f(x) = ' + a + 'x^2' + signed(b) + 'x' + signed(c)).node;
    var val = MP.evaluate(fn, { x: x0 });
    return {
      topicId: 'funcion-cuadratica', difficulty: diff, type: 'numeric',
      prompt: 'Si f(x) = ' + R.html(MP.simplify(fn)) + ', calcula f(' + x0 + ').',
      expected: val, tol: 1e-9, answerText: String(val),
      hints: ['Sustituye x por ' + x0 + ' en toda la fórmula, con cuidado en los signos.', 'f(' + x0 + ') = ' + a + '·(' + x0 + ')²' + signed(b) + '·(' + x0 + ')' + signed(c) + '.', 'f(' + x0 + ') = ' + val + '.'],
      steps: [{ why: 'Sustituimos x = ' + x0, html: '<span class="mono">f(' + x0 + ') = ' + val + '</span>' }]
    };
  }

  /* ── Geometría ────────────────────────────────────────────── */

  function genDistancia(rng, diff) {
    var x1 = E.randInt(rng, -8, 8), y1 = E.randInt(rng, -8, 8), x2, y2, dist;
    if (diff === 'basico' || diff === 'intermedio') {
      var t = E.pick(rng, TRIPLES);
      var swap = rng() < 0.5;
      var legX = swap ? t[1] : t[0], legY = swap ? t[0] : t[1];
      var dx = legX * (rng() < 0.5 ? 1 : -1), dy = legY * (rng() < 0.5 ? 1 : -1);
      x2 = x1 + dx; y2 = y1 + dy; dist = t[2];
    } else {
      x2 = E.randInt(rng, -10, 10); y2 = E.randInt(rng, -10, 10);
      dist = Math.hypot(x2 - x1, y2 - y1);
    }
    return {
      topicId: 'distancia', difficulty: diff, type: 'numeric',
      prompt: 'Calcula la distancia entre A(' + x1 + ', ' + y1 + ') y B(' + x2 + ', ' + y2 + ').',
      expected: dist, tol: (diff === 'basico' || diff === 'intermedio') ? 1e-6 : 1e-2,
      answerText: Number.isInteger(dist) ? String(dist) : dist.toFixed(3),
      hints: ['Usa d = √((x₂−x₁)² + (y₂−y₁)²).', 'd = √((' + (x2 - x1) + ')² + (' + (y2 - y1) + ')²).', 'd ≈ ' + fmtNum(dist) + '.'],
      steps: [{ why: 'Aplicamos la fórmula de distancia', html: '<span class="mono">d = √((' + (x2 - x1) + ')² + (' + (y2 - y1) + ')²) ≈ ' + fmtNum(dist) + '</span>' }]
    };
  }

  function genPendiente(rng, diff) {
    var x1 = E.randInt(rng, -8, 8), y1 = E.randInt(rng, -8, 8);
    var dx = E.randNonZero(rng, -6, 6);
    var dy = diff === 'basico' ? dx * E.randNonZero(rng, -4, 4) : E.randNonZero(rng, -9, 9);
    var x2 = x1 + dx, y2 = y1 + dy;
    var mRat = new MP.Rat(y2 - y1, x2 - x1);
    var m = mRat.num();
    return {
      topicId: 'pendiente-recta', difficulty: diff, type: 'numeric',
      prompt: 'Calcula la pendiente de la recta que pasa por A(' + x1 + ', ' + y1 + ') y B(' + x2 + ', ' + y2 + ').',
      expected: m, tol: 1e-6, answerText: mRat.toString(),
      hints: ['m = (y₂ − y₁) / (x₂ − x₁).', 'm = (' + (y2 - y1) + ') / (' + (x2 - x1) + ').', 'm = ' + mRat.toString() + '.'],
      steps: [{ why: 'Aplicamos la fórmula de la pendiente', html: '<span class="mono">m = (' + (y2 - y1) + ')/(' + (x2 - x1) + ') = ' + mRat.toString() + '</span>' }]
    };
  }

  function genCircunferencia(rng, diff) {
    var r = E.randInt(rng, diff === 'basico' ? 2 : 3, diff === 'basico' ? 8 : 15);
    var askArea = rng() < 0.5;
    var val = askArea ? Math.PI * r * r : 2 * Math.PI * r;
    return {
      topicId: 'circunferencia', difficulty: diff, type: 'numeric',
      prompt: 'Una circunferencia tiene radio ' + r + '. Calcula su ' + (askArea ? 'área' : 'longitud') + ' (usa π ≈ 3.1416).',
      expected: val, tol: 1e-2, answerText: fmtNum(Math.round(val * 100) / 100),
      hints: [askArea ? 'El área es A = πr².' : 'La longitud es L = 2πr.', 'Sustituye r = ' + r + '.', 'El resultado es ≈ ' + fmtNum(Math.round(val * 100) / 100) + '.'],
      steps: [{ why: askArea ? 'Aplicamos A = πr²' : 'Aplicamos L = 2πr', html: '<span class="mono">≈ ' + fmtNum(Math.round(val * 100) / 100) + '</span>' }]
    };
  }

  function genPitagoras(rng, diff) {
    var t = E.pick(rng, TRIPLES);
    var scale = diff === 'basico' ? 1 : E.randInt(rng, 1, diff === 'desafio' ? 5 : 3);
    var a = t[0] * scale, b = t[1] * scale, c = t[2] * scale;
    var askHyp = diff === 'basico' || rng() < 0.5;
    var val = askHyp ? c : E.pick(rng, [a, b]);
    var given = askHyp ? [a, b] : (val === a ? [b, c] : [a, c]);
    return {
      topicId: 'pitagoras', difficulty: diff, type: 'numeric',
      prompt: askHyp
        ? 'Un triángulo rectángulo tiene catetos ' + a + ' y ' + b + '. Calcula la hipotenusa.'
        : 'Un triángulo rectángulo tiene un cateto ' + given[0] + ' y la hipotenusa ' + given[1] + '. Calcula el cateto que falta.',
      expected: val, tol: 1e-6, answerText: String(val),
      hints: ['Usa a² + b² = c², donde c es la hipotenusa.', askHyp ? (a + '² + ' + b + '² = ' + (a * a + b * b)) : (given[0] + '² + x² = ' + given[1] + '²'), 'El lado que falta mide ' + val + '.'],
      steps: [{ why: 'Aplicamos el teorema de Pitágoras', html: '<span class="mono">' + (askHyp ? (a + '² + ' + b + '² = ' + c + '²') : (given[0] + '² + x² = ' + given[1] + '²')) + '</span>' },
              { why: 'Despejamos', html: '<span class="mono">' + val + '</span>' }]
    };
  }

  /* ── Trigonometría ────────────────────────────────────────── */

  var TRIG_ANGLES = [0, 30, 45, 60, 90];

  function genTrig(rng, diff) {
    var pool = diff === 'basico' ? ['sin', 'cos'] : ['sin', 'cos', 'tan'];
    var fn = E.pick(rng, pool);
    var angles = diff === 'basico' ? [0, 30, 90] : TRIG_ANGLES;
    var angle = E.pick(rng, angles);
    if (fn === 'tan' && angle === 90) angle = E.pick(rng, [0, 30, 45, 60]);
    var node = MP.parse(fn + '(' + angle + ')');
    var val = MP.evaluate(node, {}, { degrees: true });
    return {
      topicId: 'trigonometria-basica', difficulty: diff, type: 'numeric',
      prompt: 'Calcula ' + fn + '(' + angle + '°).',
      expected: val, tol: 1e-3, answerText: fmtNum(val),
      hints: ['Piensa en el triángulo rectángulo o el círculo unitario para ese ángulo.', 'Es uno de los valores especiales de 0°, 30°, 45°, 60° o 90°.', 'El valor es ' + fmtNum(val) + '.'],
      steps: [{ why: 'Usamos el valor conocido de ' + fn + '(' + angle + '°)', html: '<span class="mono">≈ ' + fmtNum(val) + '</span>' }]
    };
  }

  /* ── Cálculo ──────────────────────────────────────────────── */

  function genDerivadaBasica(rng, diff) {
    var pool;
    if (diff === 'basico') pool = [E.randNonZero(rng, -6, 6) + 'x^' + E.randInt(rng, 2, 4)];
    else if (diff === 'intermedio') pool = [E.randNonZero(rng, -6, 6) + 'x^' + E.randInt(rng, 2, 3) + signed(E.randNonZero(rng, -6, 6)) + 'x'];
    else if (diff === 'avanzado') pool = ['sin(' + E.randNonZero(rng, 2, 4) + 'x)', 'cos(' + E.randNonZero(rng, 2, 4) + 'x)', 'exp(' + E.randNonZero(rng, 1, 3) + 'x)'];
    else pool = ['x^2*sin(x)', 'x*cos(2x)', 'sin(x)*exp(x)'];
    var node = MP.parse(E.pick(rng, pool));
    var d = MP.calculus.derivative(node);
    return {
      topicId: 'que-es-derivada', difficulty: diff, type: 'algebraic',
      prompt: 'Calcula la derivada de f(x) = ' + R.html(node),
      expectedNode: d.result, answerText: R.toSource(d.result),
      hints: ['Identifica qué regla de derivación aplica (potencia, producto, cadena…).', 'Deriva cada parte por separado y combínalas según la regla.', 'La derivada es ' + R.toSource(d.result) + '.'],
      steps: d.steps
    };
  }

  function genReglasDerivacion(rng, diff) {
    var pool;
    if (diff === 'basico') pool = ['x^2*sin(x)', 'x^3*cos(x)', 'x*exp(x)'];
    else if (diff === 'intermedio') pool = ['(x+1)/(x-2)', '(x^2)/(x+3)'];
    else if (diff === 'avanzado') pool = ['sin(3x+1)', 'cos(2x-1)', 'exp(2x)'];
    else pool = ['x^2*sin(2x)', 'sqrt(x^2+1)'];
    var node = MP.parse(E.pick(rng, pool));
    var d = MP.calculus.derivative(node);
    return {
      topicId: 'reglas-derivacion', difficulty: diff, type: 'algebraic',
      prompt: 'Calcula la derivada de f(x) = ' + R.html(node),
      expectedNode: d.result, answerText: R.toSource(d.result),
      hints: ['¿Es un producto, un cociente o una función compuesta?', 'Aplica la regla correspondiente con cuidado en cada factor.', 'La derivada es ' + R.toSource(d.result) + '.'],
      steps: d.steps
    };
  }

  function genIntegral(rng, diff) {
    var pool;
    if (diff === 'basico') pool = ['x^' + E.randInt(rng, 1, 4)];
    else if (diff === 'intermedio') pool = [E.randNonZero(rng, -5, 5) + 'x^' + E.randInt(rng, 1, 3)];
    else if (diff === 'avanzado') pool = ['sin(' + E.randNonZero(rng, 2, 4) + 'x)', 'cos(' + E.randNonZero(rng, 2, 4) + 'x)', 'exp(' + E.randNonZero(rng, 2, 4) + 'x)'];
    else pool = ['1/x', 'sqrt(x)'];
    var node = MP.parse(E.pick(rng, pool));
    var ir = MP.calculus.integral(node);
    if (!ir.result) { node = MP.parse('x^2'); ir = MP.calculus.integral(node); }
    return {
      topicId: 'que-es-integral', difficulty: diff, type: 'algebraic',
      prompt: 'Calcula (no incluyas +C): <span class="math"><span class="bigop">∫</span>' + R.toHTML(node) + ' <span class="fname">d</span><span class="var">x</span></span>',
      expectedNode: ir.result, answerText: R.toSource(ir.result),
      hints: ['Busca una función cuya derivada sea el integrando.', 'Aplica la regla de potencias o la técnica correspondiente.', 'La primitiva es ' + R.toSource(ir.result) + ' + C.'],
      steps: ir.steps
    };
  }

  /* ── Registro ─────────────────────────────────────────────── */

  var BANK = {
    'fracciones': genFracciones,
    'potencias-raices': genPotencias,
    'orden-operaciones': genOrden,
    'simplificar': genSimplificar,
    'productos-notables': genProductos,
    'factorizacion': genFactorizacion,
    'ecuaciones-lineales': genLineal,
    'ecuaciones-cuadraticas': genCuadratica,
    'que-es-funcion': genQueEsFuncion,
    'funcion-lineal': genFuncionLineal,
    'funcion-cuadratica': genFuncionCuadratica,
    'distancia': genDistancia,
    'pendiente-recta': genPendiente,
    'circunferencia': genCircunferencia,
    'pitagoras': genPitagoras,
    'trigonometria-basica': genTrig,
    'que-es-derivada': genDerivadaBasica,
    'reglas-derivacion': genReglasDerivacion,
    'que-es-integral': genIntegral
  };

  var DIFFICULTIES = ['basico', 'intermedio', 'avanzado', 'desafio'];
  var DIFF_LABEL = { basico: '🟢 Básico', intermedio: '🟡 Intermedio', avanzado: '🔴 Avanzado', desafio: '⚫ Desafío' };

  function generate(topicId, difficulty, rng) {
    var gen = BANK[topicId];
    if (!gen) throw new Error('Sin generador de ejercicios para "' + topicId + '"');
    rng = rng || E.makeRng((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
    var q = gen(rng, difficulty || 'basico');
    q.id = topicId + '-' + Math.floor(rng() * 1e9);
    return q;
  }

  MP.exbank = {
    topics: Object.keys(BANK),
    difficulties: DIFFICULTIES,
    difficultyLabel: function (d) { return DIFF_LABEL[d] || d; },
    generate: generate,
    has: function (id) { return !!BANK[id]; }
  };
})(window.MP = window.MP || {});

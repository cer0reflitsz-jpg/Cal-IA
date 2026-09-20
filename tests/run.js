/* ── Pruebas ──────────────────────────────────────────────────
   Ejecutar con:  node tests/run.js
   Cubren lo que no puede estar mal: aritmética exacta, análisis
   sintáctico, simplificación, factorización, resolución de
   ecuaciones, derivadas, integrales y geometría.                */
'use strict';
const fs = require('fs');
const path = require('path');

global.window = global;

const ROOT = path.join(__dirname, '..');
[
  'js/core/rational.js',
  'js/core/ast.js',
  'js/core/parser.js',
  'js/core/simplify.js',
  'js/core/evaluate.js',
  'js/core/render.js',
  'js/core/polynomial.js',
  'js/core/algebra.js',
  'js/core/calculus.js',
  'js/plot/viewport.js',
  'js/geometry/model.js'
].forEach(f => {
  // eslint-disable-next-line no-eval
  (0, eval)(fs.readFileSync(path.join(ROOT, f), 'utf8'));
});

const MP = global.MP;
const A = MP.ast;

let passed = 0, failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    failures.push(name + '\n      → ' + e.message);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'la condición no se cumple');
}
function eq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error((msg || '') + ' esperado "' + expected + '", obtenido "' + actual + '"');
  }
}
function near(a, b, tol, msg) {
  if (!(Math.abs(a - b) <= (tol || 1e-9))) {
    throw new Error((msg || '') + ' esperado ≈' + b + ', obtenido ' + a);
  }
}
/** Texto plano de un AST simplificado, para comparar en las pruebas. */
function src(node) { return MP.render.toSource(MP.simplify(node)); }
/** Compara dos expresiones evaluándolas en varios puntos. */
function sameFunction(a, b, v) {
  return MP.calculus.sampleEqual(a, b, v || 'x');
}
function parseS(s) { return MP.parse(s); }

/* ── Aritmética exacta ────────────────────────────────────── */
const Rat = MP.Rat;

test('1/3 + 1/6 = 1/2 exacto', () => {
  const r = new Rat(1, 3).add(new Rat(1, 6));
  eq(r.toString(), '1/2');
});

test('0.1 + 0.2 = 3/10 exacto', () => {
  const r = Rat.fromDecimalString('0.1').add(Rat.fromDecimalString('0.2'));
  eq(r.toString(), '3/10');
});

test('división entre cero lanza error', () => {
  let threw = false;
  try { new Rat(1, 0); } catch (e) { threw = true; }
  assert(threw, 'debería lanzar');
});

test('√12 se simplifica a 2√3', () => {
  const s = Rat.simplifySqrt(new Rat(12));
  eq(s.coef.toString(), '2');
  eq(s.rad, 3);
});

/* ── Análisis sintáctico ──────────────────────────────────── */
test('multiplicación implícita: 3x equivale a 3*x', () => {
  assert(A.equal(MP.simplify(parseS('3x')), MP.simplify(parseS('3*x'))));
});

test('(x+1)(x-2) se interpreta como producto', () => {
  eq(src(MP.expand(parseS('(x+1)(x-2)'))), src(parseS('x^2 - x - 2')));
});

test('la potencia asocia por la derecha: 2^3^2 = 512', () => {
  near(MP.evaluate(parseS('2^3^2'), {}), 512);
});

test('el menos unario tiene menor prioridad que la potencia', () => {
  near(MP.evaluate(parseS('-x^2'), { x: 3 }), -9);
});

test('acepta f(x) = ... y y = ...', () => {
  assert(A.equal(MP.simplify(parseS('f(x) = x^2')), MP.simplify(parseS('y = x^2'))));
});

test('una entrada inválida lanza un error legible', () => {
  let threw = false;
  try { parseS('2 +'); } catch (e) { threw = true; }
  assert(threw);
});

/* ── Simplificación ───────────────────────────────────────── */
test('2x + 3x = 5x', () => { eq(src(parseS('2x + 3x')), '5*x'); });
test('x - x = 0', () => { eq(src(parseS('x - x')), '0'); });
test('x * x = x^2', () => { eq(src(parseS('x*x')), '(x)^(2)'); });
test('x^2 / x = x', () => { eq(src(parseS('x^2/x')), 'x'); });
test('0 * x = 0', () => { eq(src(parseS('0*x')), '0'); });
test('√(x^2) = |x|', () => { eq(src(parseS('sqrt(x^2)')), 'abs(x)'); });
test('(x^2-1)/(x-1) se evalúa igual que x+1', () => {
  const e = parseS('(x^2-1)/(x-1)');
  assert(sameFunction(e, parseS('x+1')));
});

/* ── Desarrollo y factorización ───────────────────────────── */
test('(x+2)^2 = x^2 + 4x + 4', () => {
  eq(src(MP.expand(parseS('(x+2)^2'))), src(parseS('x^2 + 4x + 4')));
});

test('factorizar x^2 - 9', () => {
  const f = MP.algebra.factor(parseS('x^2 - 9'));
  assert(f.verified, 'la verificación debe pasar');
  assert(A.equal(MP.simplify(MP.expand(f.result)), MP.simplify(parseS('x^2 - 9'))));
});

test('factorizar x^2 + 5x + 6', () => {
  const f = MP.algebra.factor(parseS('x^2 + 5x + 6'));
  assert(A.equal(MP.simplify(MP.expand(f.result)), MP.simplify(parseS('x^2 + 5x + 6'))));
});

test('x^2 + 1 es irreducible sobre los racionales', () => {
  const f = MP.algebra.factor(parseS('x^2 + 1'));
  assert(/irreducible/i.test(f.message || ''), 'debe avisar de que es irreducible');
});

/* ── Ecuaciones ───────────────────────────────────────────── */
test('2x + 5 = 17  →  x = 6', () => {
  const r = MP.algebra.solve(parseS('2x + 5 = 17'));
  eq(r.solutions.length, 1);
  near(MP.evaluate(r.solutions[0], {}), 6);
  assert(r.verified, 'debe verificarse por sustitución');
});

test('3x + 7 = 22  →  x = 5', () => {
  const r = MP.algebra.solve(parseS('3x + 7 = 22'));
  near(MP.evaluate(r.solutions[0], {}), 5);
});

test('ecuación con fracciones: x/2 + 1/3 = 5/6  →  x = 1', () => {
  const r = MP.algebra.solve(parseS('x/2 + 1/3 = 5/6'));
  near(MP.evaluate(r.solutions[0], {}), 1);
});

test('x^2 - 5x + 6 = 0  →  2 y 3', () => {
  const r = MP.algebra.solve(parseS('x^2 - 5x + 6 = 0'));
  const vals = r.solutions.map(s => MP.evaluate(s, {})).sort((a, b) => a - b);
  eq(vals.length, 2);
  near(vals[0], 2); near(vals[1], 3);
});

test('x^2 - 2 = 0  →  ±√2 exacto', () => {
  const r = MP.algebra.solve(parseS('x^2 - 2 = 0'));
  const vals = r.solutions.map(s => MP.evaluate(s, {})).sort((a, b) => a - b);
  near(vals[0], -Math.SQRT2, 1e-12);
  near(vals[1], Math.SQRT2, 1e-12);
});

test('x^2 + 1 = 0 no tiene soluciones reales', () => {
  const r = MP.algebra.solve(parseS('x^2 + 1 = 0'));
  assert(r.complex === true, 'debe marcarse como compleja');
});

test('(x-1)^2 = 0 tiene una única raíz doble', () => {
  const r = MP.algebra.solve(parseS('(x-1)^2 = 0'));
  eq(r.solutions.length, 1);
  near(MP.evaluate(r.solutions[0], {}), 1);
});

test('cúbica x^3 - 6x^2 + 11x - 6 = 0  →  1, 2 y 3', () => {
  const r = MP.algebra.solve(parseS('x^3 - 6x^2 + 11x - 6 = 0'));
  const vals = r.solutions.map(s => MP.evaluate(s, {})).sort((a, b) => a - b);
  eq(vals.length, 3);
  near(vals[0], 1); near(vals[1], 2); near(vals[2], 3);
});

test('ecuación no polinómica: sin(x) = 0 se resuelve numéricamente', () => {
  const r = MP.algebra.solve(parseS('sin(x) = 0'));
  assert(r.approximate.length > 10, 'debe encontrar varias raíces');
  assert(r.approximate.some(v => Math.abs(v - Math.PI) < 1e-6), 'π debe estar entre ellas');
});

test('cada solución devuelta anula realmente la ecuación', () => {
  ['2x + 5 = 17', 'x^2 - 5x + 6 = 0', 'x^2 - 2 = 0', 'x^3 - 6x^2 + 11x - 6 = 0']
    .forEach(s => {
      const eqn = parseS(s);
      const r = MP.algebra.solve(eqn);
      const lhs = A.add([eqn.a, A.mul([A.num(-1), eqn.b])]);
      r.solutions.forEach(sol => {
        const v = MP.evaluate(sol, {});
        const y = MP.evaluate(lhs, { x: v });
        near(y, 0, 1e-8, 'la solución de ' + s + ' no anula la ecuación:');
      });
    });
});

/* ── Derivadas ────────────────────────────────────────────── */
function derivEq(input, expected) {
  const d = MP.calculus.derivative(parseS(input)).result;
  assert(sameFunction(d, parseS(expected)),
    'd/dx ' + input + ' = ' + MP.render.toSource(d) + ', se esperaba ' + expected);
}

test('derivada de una constante', () => derivEq('7', '0'));
test('regla de la potencia: x^2 → 2x', () => derivEq('x^2', '2x'));
test('polinomio: 3x^3 - 5x + 2', () => derivEq('3x^3 - 5x + 2', '9x^2 - 5'));
test('regla del producto: x^3·sin(x)', () => derivEq('x^3*sin(x)', '3x^2*sin(x) + x^3*cos(x)'));
test('regla del cociente: (x+1)/(x-1)', () => derivEq('(x+1)/(x-1)', '-2/(x-1)^2'));
test('regla de la cadena: sin(3x+1)', () => derivEq('sin(3x + 1)', '3cos(3x+1)'));
test('exponencial: e^x', () => derivEq('exp(x)', 'exp(x)'));
test('logaritmo: ln(x)', () => derivEq('ln(x)', '1/x'));
test('raíz: sqrt(x)', () => derivEq('sqrt(x)', '1/(2sqrt(x))'));
test('función compuesta doble: sin(x^2)', () => derivEq('sin(x^2)', '2x*cos(x^2)'));

test('la derivada coincide con el cociente incremental', () => {
  const f = parseS('x^3 - 2x + 1');
  const d = MP.calculus.derivative(f).result;
  [-1.3, 0.4, 2.7].forEach(x0 => {
    const h = 1e-6;
    const num = (MP.evaluate(f, { x: x0 + h }) - MP.evaluate(f, { x: x0 - h })) / (2 * h);
    near(MP.evaluate(d, { x: x0 }), num, 1e-5, 'en x=' + x0 + ':');
  });
});

/* ── Integrales ───────────────────────────────────────────── */
function integEq(input, expected) {
  const r = MP.calculus.integral(parseS(input));
  assert(r.result, 'no devolvió resultado para ∫' + input);
  assert(r.verified, 'la verificación por derivación falló para ∫' + input);
  assert(sameFunction(r.result, parseS(expected)),
    '∫' + input + ' = ' + MP.render.toSource(r.result) + ', se esperaba ' + expected);
}

test('∫x² dx = x³/3', () => integEq('x^2', 'x^3/3'));
test('∫(3x² + 2x) dx', () => integEq('3x^2 + 2x', 'x^3 + x^2'));
test('∫cos(2x) dx = sin(2x)/2', () => integEq('cos(2x)', 'sin(2x)/2'));
test('∫1/x dx = ln|x|', () => integEq('1/x', 'ln(abs(x))'));
test('∫e^x dx', () => integEq('exp(x)', 'exp(x)'));

test('una integral fuera de alcance se reconoce en vez de inventarse', () => {
  const r = MP.calculus.integral(parseS('exp(x^2)'));
  assert(r.result === null, 'no debería devolver una primitiva');
  assert(/no puedo/i.test(r.message), 'debe explicarlo');
});

test('integral definida numérica: ∫₀¹ x² dx = 1/3', () => {
  const f = MP.compile(parseS('x^2'), 'x');
  const r = MP.calculus.numericIntegral(x => f(x), 0, 1);
  near(r.value, 1 / 3, 1e-9);
});

test('área del semicírculo: ∫₋₁¹ √(1−x²) dx = π/2', () => {
  const f = MP.compile(parseS('sqrt(1 - x^2)'), 'x');
  const r = MP.calculus.numericIntegral(x => f(x), -1, 1, 20000);
  near(r.value, Math.PI / 2, 1e-4);
});

/* ── Evaluación ───────────────────────────────────────────── */
test('sin(π/6) = 0.5', () => { near(MP.evaluate(parseS('sin(pi/6)'), {}), 0.5, 1e-12); });
test('modo grados: sin(30°) = 0.5', () => {
  near(MP.evaluate(parseS('sin(30)'), {}, { degrees: true }), 0.5, 1e-12);
});
test('log(100) = 2', () => { near(MP.evaluate(parseS('log(100)'), {}), 2, 1e-12); });
test('raíz cúbica de un negativo: (-8)^(1/3) = -2', () => {
  near(MP.evaluate(parseS('(-8)^(1/3)'), {}), -2, 1e-12);
});
test('1/0 no es finito', () => { assert(!isFinite(MP.evaluate(parseS('1/x'), { x: 0 }))); });

/* ── Geometría ────────────────────────────────────────────── */
const G = MP.geo;

test('distancia entre (0,0) y (3,4) es 5', () => {
  near(G.dist({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});

test('pendiente de la recta por (1,1) y (3,5) es 2', () => {
  near(G.slope({ x: 1, y: 1 }, { x: 3, y: 5 }), 2);
});

test('ecuación de la recta por (0,1) y (2,5)', () => {
  eq(G.lineEquation({ x: 0, y: 1 }, { x: 2, y: 5 }), 'y = 2x + 1');
});

test('área del triángulo 3-4-5 es 6', () => {
  near(G.polygonArea([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }]), 6);
});

test('perímetro del triángulo 3-4-5 es 12', () => {
  near(G.polygonPerimeter([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }]), 12);
});

test('el ángulo del triángulo 3-4-5 en el vértice recto mide 90°', () => {
  near(G.angleAt({ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }), 90, 1e-9);
});

test('la escena elimina también los objetos dependientes', () => {
  const s = new G.Scene();
  const a = s.addPoint(0, 0), b = s.addPoint(1, 0);
  s.addFrom('segment', [a.id, b.id]);
  eq(s.objects.length, 3);
  s.remove(a.id);
  eq(s.objects.length, 1);
});

test('las propiedades de la circunferencia son correctas', () => {
  const s = new G.Scene();
  const c = s.addPoint(0, 0), p = s.addPoint(2, 0);
  const circ = s.addFrom('circle', [c.id, p.id]);
  const props = Object.fromEntries(G.properties(s, circ));
  eq(props['radio'], '2');
  eq(props['diámetro'], '4');
  near(parseFloat(props['área']), Math.PI * 4, 1e-3);
});

/* ── Viewport ─────────────────────────────────────────────── */
test('las conversiones mundo↔pantalla son inversas', () => {
  const vp = new MP.Viewport();
  vp.resize(800, 600); vp.reset();
  near(vp.wx(vp.sx(3.7)), 3.7, 1e-9);
  near(vp.wy(vp.sy(-2.1)), -2.1, 1e-9);
});

test('el zoom mantiene fijo el punto bajo el cursor', () => {
  const vp = new MP.Viewport();
  vp.resize(800, 600); vp.reset();
  const before = vp.wx(200);
  vp.zoomAt(200, 300, 1.7);
  near(vp.wx(200), before, 1e-9);
});

test('la escala de X y de Y coincide (los círculos no se deforman)', () => {
  const vp = new MP.Viewport();
  vp.resize(1000, 400); vp.reset();
  const b = vp.bounds();
  near((b.xMax - b.xMin) / 1000, (b.yMax - b.yMin) / 400, 1e-12);
});

/* ── Resultado ────────────────────────────────────────────── */
console.log('');
console.log('  ' + passed + ' pruebas correctas, ' + failed + ' fallidas');
if (failures.length) {
  console.log('');
  failures.forEach(f => console.log('  ✗ ' + f));
  console.log('');
  process.exit(1);
}
console.log('');

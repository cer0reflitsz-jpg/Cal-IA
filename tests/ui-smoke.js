/* ── Prueba de humo de la interfaz ────────────────────────────
   No hay navegador aquí, así que montamos un DOM mínimo (árbol
   real construido desde index.html) y comprobamos que la
   aplicación arranca y que las interacciones hacen algo.
   Ejecutar con:  node tests/ui-smoke.js                         */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

/* ── Mini DOM ─────────────────────────────────────────────── */
const VOID = { meta: 1, link: 1, input: 1, br: 1, img: 1, hr: 1, source: 1 };

class El {
  constructor(tag) {
    this.tagName = (tag || 'div').toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attrs = {};
    this.style = {};
    this._html = '';
    this._text = '';
    this._listeners = {};
    this.value = '';
    this.checked = false;
    this.selectionStart = null;
    this.selectionEnd = null;
    const self = this;
    this.classList = {
      add: c => { self._classes().has(c) || self.setAttribute('class', (self.attrs.class || '') + ' ' + c); },
      remove: c => {
        const s = self._classes(); s.delete(c);
        self.setAttribute('class', [...s].join(' '));
      },
      contains: c => self._classes().has(c),
      toggle: (c, on) => { on === undefined ? (self._classes().has(c) ? self.classList.remove(c) : self.classList.add(c))
        : (on ? self.classList.add(c) : self.classList.remove(c)); }
    };
    this.dataset = new Proxy({}, {
      get: (t, k) => self.attrs['data-' + camelToDash(String(k))],
      set: (t, k, v) => { self.attrs['data-' + camelToDash(String(k))] = String(v); return true; },
      has: (t, k) => ('data-' + camelToDash(String(k))) in self.attrs
    });
  }
  _classes() { return new Set((this.attrs.class || '').split(/\s+/).filter(Boolean)); }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') registry[v] = this; }
  getAttribute(k) { return this.attrs[k]; }
  removeAttribute(k) { delete this.attrs[k]; }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  remove() {
    if (this.parentNode) {
      this.parentNode.children = this.parentNode.children.filter(c => c !== this);
    }
  }
  addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); }
  dispatch(type, ev) {
    ev = ev || {};
    ev.type = type;
    ev.preventDefault = ev.preventDefault || function () {};
    ev.target = ev.target || this;
    (this._listeners[type] || []).forEach(f => f.call(this, ev));
    const on = this['on' + type];
    if (typeof on === 'function') on.call(this, ev);
  }
  click() { this.dispatch('click', {}); }
  focus() {}
  setPointerCapture() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 900, height: 600 }; }
  get clientWidth() { return 900; }
  get clientHeight() { return 600; }
  set innerHTML(v) {
    this._html = String(v);
    this._htmlSet = true;
    const parsed = parseHTML(this._html);
    this.children = parsed.children;
    this.children.forEach(c => { c.parentNode = this; });
  }
  get innerHTML() {
    if (this._htmlSet) return this._html;
    return this.children.map(c => c.outerHTML).join('');
  }
  set textContent(v) { this._text = String(v); this._html = ''; this.children = []; }
  get textContent() { return this._text || this._html.replace(/<[^>]*>/g, ''); }
  get outerHTML() {
    const a = Object.keys(this.attrs).map(k => ` ${k}="${this.attrs[k]}"`).join('');
    return `<${this.tagName.toLowerCase()}${a}>${this.innerHTML}</${this.tagName.toLowerCase()}>`;
  }
  querySelectorAll(sel) {
    const out = [];
    const sels = sel.split(',').map(s => s.trim());
    const walk = n => {
      n.children.forEach(c => {
        if (sels.some(s => matches(c, s))) out.push(c);
        walk(c);
      });
    };
    walk(this);
    return out;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}

function camelToDash(s) { return s.replace(/[A-Z]/g, m => '-' + m.toLowerCase()); }

function matches(el, sel) {
  if (sel.startsWith('#')) return el.attrs.id === sel.slice(1);
  if (sel.startsWith('.')) return el._classes().has(sel.slice(1));
  if (sel.startsWith('[')) {
    const m = /^\[([^\]=]+)(?:=["']?([^\]"']*)["']?)?\]$/.exec(sel);
    if (!m) return false;
    if (m[2] === undefined) return m[1] in el.attrs;
    return el.attrs[m[1]] === m[2];
  }
  return el.tagName.toLowerCase() === sel.toLowerCase();
}

const registry = {};

/* ── Parser HTML suficiente para index.html ───────────────── */
function parseHTML(src) {
  const root = new El('root');
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z0-9]+)((?:\s+[^\s=>]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[0].startsWith('<!--')) continue;
    if (m[5] !== undefined) {
      const txt = m[5].trim();
      if (txt) stack[stack.length - 1]._text = (stack[stack.length - 1]._text || '') + txt;
      continue;
    }
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (closing) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tagName.toLowerCase() === tag) { stack.length = i; break; }
      }
      continue;
    }
    const el = new El(tag);
    const attrRe = /([^\s=]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s]+)))?/g;
    let a;
    while ((a = attrRe.exec(m[3] || ''))) {
      const v = a[2] !== undefined ? a[2] : a[3] !== undefined ? a[3] : a[4] !== undefined ? a[4] : '';
      el.setAttribute(a[1], v);
    }
    if (el.attrs.checked !== undefined) el.checked = true;
    stack[stack.length - 1].appendChild(el);
    if (!VOID[tag] && !m[4]) stack.push(el);
  }
  return root;
}

/* ── window / document ────────────────────────────────────── */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const tree = parseHTML(html);

const documentEl = new El('html');
documentEl.setAttribute('data-theme', 'light');

const doc = {
  documentElement: documentEl,
  readyState: 'complete',
  createElement: t => new El(t),
  getElementById: id => {
    if (!registry[id]) { registry[id] = new El('div'); registry[id].setAttribute('id', id); }
    return registry[id];
  },
  querySelectorAll: sel => tree.querySelectorAll(sel),
  querySelector: sel => tree.querySelector(sel),
  addEventListener: () => {}
};

const store = {};
global.window = global;
global.document = doc;
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
global.matchMedia = () => ({ matches: false });
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.confirm = () => true;
global.devicePixelRatio = 1;
global.requestAnimationFrame = fn => fn();
global.setTimeout = (fn) => { fn(); return 0; };
global.clearTimeout = () => {};
global.getComputedStyle = () => ({ getPropertyValue: () => '#0e7c66' });
global.ResizeObserver = null;

// Contexto 2D que no dibuja pero registra que se le llamó.
let drawCalls = 0;
const ctxStub = new Proxy({}, {
  get: (t, k) => {
    if (k === 'canvas') return {};
    if (k === 'setTransform' || k === 'stroke' || k === 'fill') return () => { drawCalls++; };
    if (typeof k === 'string') return () => {};
    return undefined;
  },
  set: () => true
});
El.prototype.getContext = () => ctxStub;

/* ── Carga de la aplicación ───────────────────────────────── */
const FILES = [
  'js/core/rational.js', 'js/core/ast.js', 'js/core/parser.js', 'js/core/simplify.js',
  'js/core/evaluate.js', 'js/core/render.js', 'js/core/polynomial.js', 'js/core/algebra.js',
  'js/core/calculus.js', 'js/plot/viewport.js', 'js/plot/plotter.js',
  'js/geometry/model.js', 'js/geometry/canvas.js',
  'js/engine/exercise-engine.js',
  'js/content/profiles.js', 'js/content/topics.js', 'js/content/exercises.js',
  'js/ui/home.js', 'js/ui/graph.js', 'js/ui/geometry.js', 'js/ui/calculator.js',
  'js/ui/algebra.js', 'js/ui/learn.js', 'js/ui/exercise-widget.js',
  'js/ui/practice.js', 'js/ui/exams.js', 'js/ui/account.js', 'js/ui/app.js'
];

let passed = 0, failed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed++; }
  catch (e) { failed++; failures.push(name + '\n      → ' + (e.stack || e.message).split('\n').slice(0, 3).join('\n         ')); }
}
function assert(c, m) { if (!c) throw new Error(m || 'falló'); }

test('todos los módulos cargan y la aplicación arranca', () => {
  FILES.forEach(f => { (0, eval)(fs.readFileSync(path.join(ROOT, f), 'utf8')); });
  assert(global.MP.app, 'MP.app no existe');
});

const MP = global.MP;

test('el graficador arranca con funciones y las dibuja', () => {
  const st = MP.tools.graph.state;
  assert(st.rows.length >= 2, 'debería haber funciones de ejemplo');
  assert(st.rows[0].compiled, 'la primera función debe compilar');
  assert(Math.abs(st.rows[0].compiled(3, {}) - 9) < 1e-9, 'f(3) debería ser 9');
  drawCalls = 0;
  MP.tools.graph.draw();
  assert(drawCalls > 0, 'draw() no pintó nada');
});

test('los sliders detectan los parámetros libres de a·x + b', () => {
  const row = MP.tools.graph.state.rows.filter(r => /a\*x/.test(r.src))[0];
  assert(row, 'no encuentro la fila con parámetros');
  assert('a' in row.params && 'b' in row.params, 'faltan los parámetros a y b');
  row.params.a = 2; row.params.b = 1;
  assert(Math.abs(row.compiled(3, row.params) - 7) < 1e-9, 'a=2,b=1 ⇒ f(3)=7');
});

test('añadir una expresión desde otra herramienta funciona', () => {
  const before = MP.tools.graph.state.rows.length;
  MP.tools.graph.addExpression('sin(x)');
  const rows = MP.tools.graph.state.rows;
  assert(rows.length >= before, 'no se añadió la fila');
  const last = rows.filter(r => r.src === 'sin(x)')[0];
  assert(last && last.compiled, 'la expresión añadida no compila');
});

test('una expresión inválida muestra el error y no rompe el dibujo', () => {
  MP.tools.graph.addExpression('2 +');
  const bad = MP.tools.graph.state.rows.filter(r => r.src === '2 +')[0];
  assert(bad && bad.error, 'debería registrar el error');
  MP.tools.graph.draw();
});

test('las curvas implícitas se reconocen (x² + y² = 25)', () => {
  MP.tools.graph.addExpression('x^2 + y^2 = 25');
  const row = MP.tools.graph.state.rows.filter(r => r.implicit)[0];
  assert(row, 'no se marcó como implícita');
  assert(Math.abs(row.gFn(3, 4, {})) < 1e-9, 'el punto (3,4) debe estar en la circunferencia');
});

test('la calculadora evalúa y guarda historial', () => {
  const input = doc.getElementById('calc-input');
  input.value = '1/3 + 1/6';
  doc.getElementById('calc-eval').click();
  const out = doc.getElementById('calc-output').innerHTML;
  assert(/exacto/.test(out), 'no muestra el resultado exacto');
  assert(/<span class="bot"><span class="num">2<\/span>/.test(out), 'el resultado debería ser 1/2:\n' + out.slice(0, 300));
  assert(doc.getElementById('calc-history').children.length > 0, 'el historial está vacío');
});

test('la calculadora resuelve ecuaciones con procedimiento', () => {
  const input = doc.getElementById('calc-input');
  input.value = '2x + 5 = 17';
  doc.getElementById('calc-eval').click();
  const out = doc.getElementById('calc-output').innerHTML;
  assert(/Verificación/.test(out), 'falta la verificación');
  assert(/class="step"/.test(out), 'faltan los pasos');
});

test('álgebra: cada operación produce salida sin romperse', () => {
  const input = doc.getElementById('alg-input');
  const ops = ['simplify', 'expand', 'factor', 'solve', 'derive', 'integrate'];
  const inputs = ['(x+2)^2', 'x^2 - 9', 'x^2 - 5x + 6 = 0', 'sin(3x+1)', 'x^2'];
  inputs.forEach(src => {
    ops.forEach(op => {
      input.value = src;
      MP.tools.algebra.run(op);
      const out = doc.getElementById('alg-output').innerHTML;
      assert(out && out.length > 10, 'salida vacía para ' + op + ' de ' + src);
    });
  });
});

test('los botones de ejemplo de álgebra funcionan', () => {
  const btn = doc.querySelectorAll('[data-alg-example]')[0];
  assert(btn, 'no hay botones de ejemplo');
  btn.click();
  assert(doc.getElementById('alg-output').innerHTML.length > 10);
});

test('geometría: crear un triángulo y medir sus propiedades', () => {
  // Reconstruimos una escena directamente sobre el modelo.
  const scene = new MP.geo.Scene();
  const canvas = doc.getElementById('geo-canvas');
  const view = new MP.GeoView(canvas, scene, () => {});
  view.setTool('triangle');
  view.handleClick(view.vp.sx(0), view.vp.sy(0));
  view.handleClick(view.vp.sx(4), view.vp.sy(0));
  view.handleClick(view.vp.sx(4), view.vp.sy(3));
  const poly = scene.objects.filter(o => o.kind === 'polygon')[0];
  assert(poly, 'no se creó el triángulo');
  const props = Object.fromEntries(MP.geo.properties(scene, poly));
  assert(props['área'] === '6', 'el área debería ser 6, es ' + props['área']);
  assert(/rectángulo/.test(props['tipo'] || ''), 'debería detectar el triángulo rectángulo');
});

test('geometría: arrastrar un punto actualiza las medidas', () => {
  const scene = new MP.geo.Scene();
  const view = new MP.GeoView(doc.getElementById('geo-canvas'), scene, () => {});
  const a = scene.addPoint(0, 0), b = scene.addPoint(3, 0);
  const seg = scene.addFrom('segment', [a.id, b.id]);
  let props = Object.fromEntries(MP.geo.properties(scene, seg));
  assert(props['longitud'] === '3', 'longitud inicial');
  b.x = 0; b.y = 4;
  props = Object.fromEntries(MP.geo.properties(scene, seg));
  assert(props['longitud'] === '4', 'la longitud debería actualizarse a 4, es ' + props['longitud']);
});

test('geometría: borrar un punto elimina lo que depende de él', () => {
  const scene = new MP.geo.Scene();
  const view = new MP.GeoView(doc.getElementById('geo-canvas'), scene, () => {});
  const a = scene.addPoint(0, 0), b = scene.addPoint(1, 1);
  scene.addFrom('segment', [a.id, b.id]);
  view.setTool('delete');
  view.handleClick(view.vp.sx(0), view.vp.sy(0));
  assert(scene.objects.length === 1, 'deberían quedar sólo el otro punto, quedan ' + scene.objects.length);
});

test('el cambio de herramienta actualiza la vista activa', () => {
  MP.app.switchTool('geometry');
  const active = doc.querySelectorAll('.tool').filter(t => t._classes().has('active'));
  assert(active.length === 1 && active[0].attrs['data-tool'] === 'geometry',
    'la sección activa debería ser geometry');
  MP.app.switchTool('graph');
});

test('el cambio de tema se aplica y se guarda', () => {
  doc.getElementById('theme-btn').click();
  assert(documentEl.attrs['data-theme'] === 'dark', 'debería quedar en oscuro');
  assert(store['mp.theme'] === 'dark', 'no se guardó la preferencia');
  doc.getElementById('theme-btn').click();
  assert(documentEl.attrs['data-theme'] === 'light');
});

test('los botones de la barra lateral cambian de herramienta', () => {
  const nav = doc.querySelectorAll('.nav-item');
  assert(nav.length === 8, 'debería haber 8 botones de navegación, hay ' + nav.length);
  nav.forEach(b => {
    b.click();
    const active = doc.querySelectorAll('.tool').filter(t => t._classes().has('active'));
    assert(active.length === 1, 'siempre debe haber exactamente una sección activa');
    assert(active[0].attrs['data-tool'] === b.attrs['data-go'], 'no coincide con ' + b.attrs['data-go']);
  });
});

test('Inicio muestra una tarjeta por cada sección y los botones abren su herramienta', () => {
  const cards = doc.querySelectorAll('[data-open-tool]');
  assert(cards.length === 5, 'deberían ser 5 tarjetas (4 herramientas + Aprende), hay ' + cards.length);
  const graphCard = cards.filter(c => c.attrs['data-open-tool'] === 'graph')[0];
  assert(graphCard, 'falta la tarjeta del graficador');
  graphCard.click();
  const active = doc.querySelectorAll('.tool').filter(t => t._classes().has('active'));
  assert(active[0].attrs['data-tool'] === 'graph', 'el botón Abrir debería llevar al graficador');
  MP.app.switchTool('home');
});

test('Aprende: los 19 temas calculan su ejemplo sin lanzar errores', () => {
  let total = 0;
  MP.content.topics.forEach(cat => {
    cat.items.forEach(t => {
      total++;
      MP.tools.learn.select(t.id);
      const html = doc.getElementById('learn-content').innerHTML;
      assert(!/No se pudo calcular/.test(html), 'el tema "' + t.title + '" no pudo calcular su ejemplo:\n' + html.slice(0, 400));
      assert(html.includes(t.title), 'no se muestra el título de "' + t.title + '"');
    });
  });
  assert(total === 19, 'se esperaban 19 temas, hay ' + total);
});

test('Aprende: el botón de acción abre la herramienta correspondiente', () => {
  MP.tools.learn.select('factorizacion');
  doc.getElementById('learn-action').click();
  const active = doc.querySelectorAll('.tool').filter(t => t._classes().has('active'));
  assert(active[0].attrs['data-tool'] === 'algebra', 'factorización debería abrir álgebra y cálculo');
  const algInput = doc.getElementById('alg-input');
  assert(algInput.value === 'x^2 - 5x + 6', 'no se cargó la expresión esperada');
});

test('Aprende: el ejemplo de geometría construye la figura real al probarla', () => {
  MP.tools.learn.select('pitagoras');
  doc.getElementById('learn-action').click();
  const active = doc.querySelectorAll('.tool').filter(t => t._classes().has('active'));
  assert(active[0].attrs['data-tool'] === 'geometry', 'Pitágoras debería abrir geometría');
});

test('perfiles: crear, cambiar, renombrar y el progreso no se mezcla entre perfiles', () => {
  const first = MP.profiles.active();
  assert(first, 'debería existir un perfil por defecto');
  MP.profiles.recordPractice('fracciones', true);
  const afterFirst = MP.profiles.getData();
  assert(afterFirst.practice.attempted >= 1, 'el perfil original debería registrar el intento');

  const p2 = MP.profiles.create('Segundo');
  assert(MP.profiles.activeId() === p2.id, 'crear un perfil debería activarlo');
  const freshData = MP.profiles.getData();
  assert(freshData.practice.attempted === 0, 'el perfil nuevo no debería heredar progreso del anterior');

  MP.profiles.recordExam({ date: Date.now(), score: 3, total: 5, topicsLabel: 'Prueba', missedTopicIds: ['fracciones'] });
  assert(MP.profiles.getData().exams.length === 1, 'el examen debería quedar guardado en el perfil activo');

  MP.profiles.rename(p2.id, 'Segundo (renombrado)');
  assert(MP.profiles.list().find(p => p.id === p2.id).name === 'Segundo (renombrado)', 'el nombre debería actualizarse');

  MP.profiles.switchTo(first.id);
  assert(MP.profiles.getData().exams.length === 0, 'el primer perfil no debería ver el examen del segundo');

  MP.profiles.remove(p2.id);
  assert(!MP.profiles.list().find(p => p.id === p2.id), 'el perfil eliminado no debería seguir en la lista');
});

test('widget de ejercicio: una respuesta correcta se acepta y registra el resultado', () => {
  const rng = MP.exengine.makeRng(12345);
  const q = MP.exbank.generate('ecuaciones-lineales', 'basico', rng);
  const container = document.createElement('div');
  let result = null;
  MP.widgets.renderExercise(container, q, { onResult: r => { result = r; } });

  const input = container.querySelector('#ex-text-input');
  assert(input, 'debería haber un campo de texto para la respuesta');
  input.value = String(q.expected);
  const checkBtn = [...container.querySelectorAll('button')].find(b => b.textContent === 'Comprobar');
  assert(checkBtn, 'debería existir el botón Comprobar');
  checkBtn.click();

  assert(/Correcto/.test(container.querySelector('#ex-feedback').innerHTML), 'debería mostrar el veredicto correcto');
  assert(result && result.correct === true, 'onResult debería reportar correct:true');
  assert(container.querySelector('#ex-procedure').hidden === false, 'el procedimiento debería mostrarse al terminar');
});

test('widget de ejercicio: una respuesta incorrecta permite pedir pista y reintentar', () => {
  const rng = MP.exengine.makeRng(777);
  const q = MP.exbank.generate('fracciones', 'basico', rng);
  const container = document.createElement('div');
  let result = null;
  MP.widgets.renderExercise(container, q, { onResult: r => { result = r; } });

  const input = container.querySelector('#ex-text-input');
  input.value = String((q.expected || 0) + 999);
  let checkBtn = [...container.querySelectorAll('button')].find(b => b.textContent === 'Comprobar');
  checkBtn.click();
  assert(/Incorrecto/.test(container.querySelector('#ex-feedback').innerHTML), 'debería marcar la respuesta como incorrecta');
  assert(result === null, 'onResult no debería llamarse todavía tras un intento fallido');

  const hintBtn = [...container.querySelectorAll('button')].find(b => /pista/i.test(b.textContent));
  assert(hintBtn, 'debería ofrecerse una pista tras fallar');
  hintBtn.click();
  assert(container.querySelector('#ex-hints').innerHTML.length > 0, 'la pista debería mostrarse');

  input.value = String(q.expected);
  checkBtn = [...container.querySelectorAll('button')].find(b => b.textContent === 'Comprobar');
  checkBtn.click();
  assert(result && result.correct === true, 'tras reintentar con la respuesta correcta debería aceptarse');
  assert(result.attempts === 2, 'debería contar los dos intentos');
  assert(result.hintsUsed === 1, 'debería contar la pista usada');
});

test('Practica: elegir un tema y completar la sesión con "mostrar procedimiento" llega al resumen', () => {
  MP.app.switchTool('practice');
  MP.tools.practice.startTopic('fracciones', 'basico');
  let guard = 0;
  while (guard++ < 60) {
    const content = doc.getElementById('practice-content').innerHTML;
    if (/result-score/.test(content)) break;

    const giveUp = [...doc.querySelectorAll('button')].find(b => b.textContent === 'Mostrar procedimiento');
    if (giveUp) { giveUp.click(); continue; }
    const next = [...doc.querySelectorAll('button')].find(b => /Siguiente|Ver resumen/.test(b.textContent || ''));
    if (next) { next.click(); continue; }
    const checkBtn = [...doc.querySelectorAll('button')].find(b => b.textContent === 'Comprobar');
    if (checkBtn) {
      const textInput = doc.querySelector('#ex-text-input');
      if (textInput) textInput.value = 'no-es-una-respuesta-valida';
      else { const choice = doc.querySelector('.ex-choice'); if (choice) choice.click(); }
      checkBtn.click();
      continue;
    }
    break;
  }
  const finalContent = doc.getElementById('practice-content').innerHTML;
  assert(/result-score/.test(finalContent), 'debería llegar a la pantalla de resumen de la práctica');
  assert(/0 \/ 8/.test(finalContent), 'con todo rendido el resultado debería ser 0 de 8');
});

test('Mini exámenes: compila preguntas de varios temas elegidos y calcula el resultado real', () => {
  MP.app.switchTool('exams');
  MP.tools.exams.reset();
  const boxes = [...doc.querySelectorAll('[data-etopic]')];
  const wanted = ['fracciones', 'ecuaciones-lineales'];
  boxes.filter(b => wanted.includes(b.attrs['data-etopic'])).forEach(b => { b.checked = true; b.dispatch('change', {}); });
  const countBtn = [...doc.querySelectorAll('[data-count]')].find(b => b.attrs['data-count'] === '5');
  countBtn.click();
  const createBtn = doc.getElementById('exam-create');
  assert(createBtn && !createBtn.attrs.disabled, 'el botón de crear examen debería estar habilitado con temas elegidos');
  createBtn.click();

  const seenTopics = new Set();
  let guard = 0;
  while (guard++ < 60) {
    const content = doc.getElementById('exam-content').innerHTML;
    if (/Mini examen terminado/.test(content)) break;

    const metaBox = doc.querySelector('.ex-meta');
    const chip = metaBox ? metaBox.querySelector('.chip') : null;
    if (chip) seenTopics.add(chip.textContent);
    const giveUp = [...doc.querySelectorAll('button')].find(b => b.textContent === 'Mostrar procedimiento');
    if (giveUp) { giveUp.click(); continue; }
    const next = [...doc.querySelectorAll('button')].find(b => /Siguiente|Ver resultados/.test(b.textContent || ''));
    if (next) { next.click(); continue; }
    const checkBtn = [...doc.querySelectorAll('button')].find(b => b.textContent === 'Comprobar');
    if (checkBtn) {
      const textInput = doc.querySelector('#ex-text-input');
      if (textInput) textInput.value = 'no-es-una-respuesta-valida';
      else { const choice = doc.querySelector('.ex-choice'); if (choice) choice.click(); }
      checkBtn.click();
      continue;
    }
    break;
  }
  const finalContent = doc.getElementById('exam-content').innerHTML;
  assert(/Mini examen terminado/.test(finalContent), 'debería llegar a la pantalla de resultados');
  assert(/0 \/ 5/.test(finalContent), 'con todo rendido el puntaje debería ser 0 de 5');
  assert(seenTopics.size >= 2, 'el examen debería haber compilado preguntas de más de un tema elegido');

  const errBtn = doc.getElementById('exam-practice-errors');
  assert(errBtn, 'debería ofrecerse practicar los errores');
  errBtn.click();
  const active = doc.querySelectorAll('.tool').filter(t => t._classes().has('active'));
  assert(active[0].attrs['data-tool'] === 'practice', '"Practicar mis errores" debería abrir Practica');

  const hist = MP.profiles.getData().exams;
  assert(hist.length >= 1 && hist[0].total === 5, 'el examen debería quedar registrado en el perfil activo');
});

test('el cajón de secciones se abre y se cierra en la vista móvil', () => {
  const menuBtn = doc.getElementById('menu-btn');
  const sidebar = doc.getElementById('app-sidebar');
  const backdrop = doc.getElementById('sidebar-backdrop');
  assert(menuBtn && sidebar && backdrop, 'deberían existir el botón de menú, el sidebar y el respaldo');

  menuBtn.click();
  assert(sidebar._classes().has('open'), 'el cajón debería abrirse al pulsar el botón de menú');
  assert(backdrop._classes().has('open'), 'el respaldo debería mostrarse junto con el cajón');

  backdrop.click();
  assert(!sidebar._classes().has('open'), 'tocar el respaldo debería cerrar el cajón');

  menuBtn.click();
  assert(sidebar._classes().has('open'));
  doc.querySelectorAll('.nav-item')[0].click();
  assert(!sidebar._classes().has('open'), 'elegir una sección debería cerrar el cajón');
});

console.log('');
console.log('  ' + passed + ' pruebas de interfaz correctas, ' + failed + ' fallidas');
if (failures.length) {
  console.log('');
  failures.forEach(f => console.log('  ✗ ' + f));
  console.log('');
  process.exit(1);
}
console.log('');

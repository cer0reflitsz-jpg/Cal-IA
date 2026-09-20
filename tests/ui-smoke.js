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
  get className() { return this.attrs.class || ''; }
  set className(value) { this.setAttribute('class', value); }
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
  focus() { doc.activeElement = this; doc.dispatchEvent({ type: 'focusin', target: this }); }
  hasAttribute(key) { return key in this.attrs; }
  contains(node) { return node === this || this.children.some(c => c.contains(node)); }
  get isConnected() { return tree.contains(this); }
  getClientRects() {
    for (let node = this; node; node = node.parentNode) {
      if (node.hidden || (node.classList.contains('tool') && !node.classList.contains('active'))) return [];
    }
    return [this.getBoundingClientRect()];
  }
  setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
  setRangeText(text, start, end) {
    this.value = this.value.slice(0, start) + text + this.value.slice(end);
    this.setSelectionRange(start + text.length, start + text.length);
  }
  removeEventListener(type, fn) { this._listeners[type] = (this._listeners[type] || []).filter(f => f !== fn); }
  dispatchEvent(event) { this.dispatch(event.type, { target: this }); }
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
  const compound = /^([a-z]+)(\[.*\])$/.exec(sel);
  if (compound) return matches(el, compound[1]) && matches(el, compound[2]);
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
    if (el.attrs.hidden !== undefined) el.hidden = true;
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
  _listeners: {},
  addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); },
  dispatchEvent(event) { (this._listeners[event.type] || []).forEach(fn => fn(event)); }
};

const store = {};
Object.defineProperty(global, 'navigator', { value: { language: 'es-CO' }, configurable: true });
global.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options.detail; } };
global.window = global;
global.document = doc;
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
const mediaQueries = new Map();
global.matchMedia = query => {
  if (!mediaQueries.has(query)) mediaQueries.set(query, {
    matches: false, listeners: [],
    addEventListener(type, fn) { if (type === 'change') this.listeners.push(fn); },
    change(matches) { this.matches = matches; this.listeners.forEach(fn => fn(this)); }
  });
  return mediaQueries.get(query);
};
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
  'js/ui/i18n.js', 'js/ui/symbol-picker.js', 'js/ui/home.js', 'js/ui/graph.js', 'js/ui/geometry.js', 'js/ui/calculator.js',
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


test('language preference: browser defaults, persisted override and unavailable storage', () => {
  const vm = require('vm');
  const source = fs.readFileSync(path.join(ROOT, 'js/ui/i18n.js'), 'utf8');
  function boot(browserLanguage, saved, blocked) {
    const context = { window: { navigator: { language: browserLanguage } },
      localStorage: { getItem() { if (blocked) throw Error('blocked'); return saved; } } };
    vm.runInNewContext(source, context);
    return context.window.MP.i18n.getLanguage();
  }
  assert(boot('en-US', null) === 'en');
  assert(boot('fr-FR', null) === 'es');
  assert(boot('en-GB', 'es') === 'es');
  assert(boot('es-CO', 'en') === 'en');
  assert(boot('en-US', 'invalid') === 'en');
  assert(boot('en-US', null, true) === 'en');
});

test('popup follows saved language on startup and changes made in another tab', () => {
  const vm = require('vm');
  const nodes = ['symbolHintTitle', 'symbolHint', 'symbolHintDismiss'].map(key => {
    const node = new El('span'); node.setAttribute('data-i18n', key); return node;
  });
  const root = new El('html'), select = new El('select');
  const listeners = {};
  let saved = 'es', writes = 0, events = 0;
  const storage = { getItem: () => saved, setItem() { writes++; } };
  const window = { navigator: { language: 'en-US' },
    addEventListener(type, fn) { listeners[type] = fn; } };
  const document = { documentElement: root, querySelector: () => null,
    querySelectorAll: selector => selector === '[data-i18n]' ? nodes : [],
    getElementById: () => select, dispatchEvent() { events++; } };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/ui/i18n.js'), 'utf8'),
    { window, document, localStorage: storage, CustomEvent: global.CustomEvent });
  window.MP.i18n.apply();
  assert(nodes[1].textContent.startsWith('Inserta símbolos') && nodes[2].textContent === 'Entendido');
  function externalChange(value) {
    saved = value;
    if (listeners.storage) listeners.storage({ key: 'mp.lang', newValue: value, storageArea: storage });
  }
  externalChange('en');
  assert(nodes[1].textContent.startsWith('Insert symbols') && nodes[2].textContent === 'Got it');
  externalChange('es');
  assert(nodes[1].textContent.startsWith('Inserta símbolos') && nodes[2].textContent === 'Entendido');
  assert(select.value === 'es' && root.getAttribute('lang') === 'es');
  assert(writes === 0 && events === 2, 'external preference changes must not write back to storage');
});

test('language selector translates shell, metadata and home; preserves profile and tool content', () => {
  MP.app.switchTool('home');
  const profile = doc.getElementById('profile-btn-name').textContent;
  const calculator = doc.getElementById('calc-output').innerHTML;
  const select = doc.getElementById('language-select');
  select.value = 'en'; select.dispatch('change');
  assert(store['mp.lang'] === 'en');
  assert(documentEl.getAttribute('lang') === 'en');
  assert(doc.title === 'MathPath — Mathematics lab');
  assert(doc.querySelector('meta[name="description"]').getAttribute('content').startsWith('Interactive'));
  assert(doc.getElementById('tool-title').textContent === 'Home');
  assert(doc.querySelector('[data-i18n="nav.graph"]').textContent === 'Grapher');
  assert(doc.getElementById('profile-btn').getAttribute('aria-label') === 'Switch profile');
  assert(doc.getElementById('profile-btn-name').textContent === profile);
  assert(doc.getElementById('calc-output').innerHTML === calculator);
  const home = doc.getElementById('home-content').innerHTML;
  assert(home.includes('What each section does') && home.includes('Works on desktop'));
  assert(home.includes('3-4-5 triangle') && !home.includes('Abrir'));
  doc.querySelector('[data-open-tool="graph"]').click();
  assert(doc.getElementById('tool-title').textContent === 'Function grapher');
  MP.i18n.setLanguage('unsupported');
  assert(MP.i18n.getLanguage() === 'en');
  MP.i18n.setLanguage('es');
  assert(documentEl.getAttribute('lang') === 'es' && select.value === 'es');
  assert(doc.getElementById('home-content').innerHTML.includes('Qué hace cada sección'));
});

test('first-visit symbol hint is passive, bilingual and explicitly dismissible', () => {
  const hint = doc.getElementById('symbol-hint'), trigger = doc.getElementById('symbol-btn');
  assert(!hint.hidden && trigger.getAttribute('aria-describedby') === 'symbol-hint-text');
  const before = doc.activeElement;
  MP.i18n.setLanguage('en');
  assert(doc.getElementById('symbol-hint-text').textContent.includes('First click a math field'));
  assert(doc.getElementById('symbol-hint-dismiss').textContent === 'Got it');
  assert(doc.activeElement === before, 'translating the hint must not steal focus');
  MP.i18n.setLanguage('es');
  assert(doc.getElementById('symbol-hint-text').textContent.includes('Primero haz clic'));
  const dismiss = doc.getElementById('symbol-hint-dismiss');
  dismiss.focus(); dismiss.click();
  assert(hint.hidden && store['mp.symbolHintDismissed'] === '1');
  assert(doc.activeElement === trigger && !trigger.hasAttribute('aria-describedby'));
});

test('hint persists across visits, tracks touch availability and tolerates blocked storage', () => {
  const vm = require('vm');
  const source = fs.readFileSync(path.join(ROOT, 'js/ui/symbol-picker.js'), 'utf8');
  function boot(saved, touch, blocked) {
    const nodes = {};
    for (const id of ['symbol-btn', 'symbol-panel', 'symbol-hint', 'symbol-hint-dismiss']) nodes[id] = new El('div');
    let stored = saved, listener;
    const document = { activeElement: null, getElementById: id => nodes[id], addEventListener() {} };
    const media = { matches: touch, addEventListener(type, fn) { listener = fn; } };
    const window = { MP: {}, matchMedia: () => media };
    const localStorage = {
      getItem() { if (blocked) throw Error('blocked'); return stored; },
      setItem(key, value) { if (blocked) throw Error('blocked'); stored = value; }
    };
    vm.runInNewContext(source, { window, document, localStorage });
    window.MP.symbolPicker.init();
    return { nodes, document, changeTouch(value) { media.matches = value; listener(); }, stored: () => stored };
  }
  const returning = boot('1', false);
  assert(returning.nodes['symbol-hint'].hidden, 'dismissed hint must stay hidden on a fresh visit');
  const fresh = boot(null, true);
  assert(fresh.nodes['symbol-hint'].hidden && fresh.document.activeElement === null);
  fresh.changeTouch(false);
  assert(!fresh.nodes['symbol-hint'].hidden && fresh.document.activeElement === null);
  fresh.changeTouch(true); assert(fresh.nodes['symbol-hint'].hidden);
  const blocked = boot(null, false, true);
  blocked.nodes['symbol-hint-dismiss'].click();
  assert(blocked.nodes['symbol-hint'].hidden, 'dismissal works for this visit without storage');
});

test('symbol picker replaces a selection, returns focus and emits one input event', () => {
  MP.app.switchTool('calculator');
  const field = doc.getElementById('calc-input');
  const trigger = doc.getElementById('symbol-btn'), panel = doc.getElementById('symbol-panel');
  field.value = '12+34'; field.setSelectionRange(3, 5); field.focus();
  let inputs = 0;
  const listen = () => inputs++;
  field.addEventListener('input', listen);
  trigger.focus(); trigger.click();
  assert(!panel.hidden && trigger.getAttribute('aria-expanded') === 'true');
  const symbols = panel.querySelectorAll('button');
  assert(symbols.map(b => b.textContent).join(' ') === '² √ π ∑ ∫ ≤ ≥ ≠ ± ∞ θ Δ');
  assert(doc.activeElement === symbols[0]);
  symbols[2].click();
  assert(field.value === '12+π' && field.selectionStart === 4);
  assert(inputs === 1 && panel.hidden && doc.activeElement === field);
  field.removeEventListener('input', listen);
});

test('symbol picker uses native editing without duplicate input events', () => {
  const field = doc.getElementById('calc-input');
  field.value = 'xx'; field.setSelectionRange(0, 2); field.focus();
  let calls = 0, inputs = 0;
  const listen = () => inputs++;
  field.addEventListener('input', listen);
  doc.execCommand = (command, ui, text) => {
    assert(command === 'insertText' && text === '√'); calls++;
    field.setRangeText(text, field.selectionStart, field.selectionEnd);
    field.dispatchEvent(new Event('input')); return true;
  };
  doc.getElementById('symbol-btn').click();
  doc.getElementById('symbol-panel').querySelectorAll('button')[1].click();
  assert(calls === 1 && inputs === 1 && field.value === '√');
  delete doc.execCommand; field.removeEventListener('input', listen);
});

test('symbol picker ignores profile fields and rejects hidden, disabled or detached targets', () => {
  const trigger = doc.getElementById('symbol-btn'), panel = doc.getElementById('symbol-panel');
  const math = doc.getElementById('calc-input');
  math.value = '1'; math.setSelectionRange(1, 1); math.focus();
  const profile = doc.createElement('input'); profile.value = 'Name'; profile.focus();
  trigger.click(); panel.querySelectorAll('button')[0].click();
  assert(profile.value === 'Name' && math.value === '1²');
  math.disabled = true; trigger.click(); assert(panel.hidden); math.disabled = false;
  math.readOnly = true; trigger.click(); assert(panel.hidden); math.readOnly = false;
  MP.app.switchTool('home'); trigger.click(); assert(panel.hidden);
  MP.app.switchTool('graph');
  const graph = doc.querySelector('.expr-input'); graph.setSelectionRange(0, 0); graph.focus();
  graph.remove(); trigger.click(); assert(panel.hidden);
});

test('symbol picker closes on Escape, outside pointer activation and keyboard focus departure', () => {
  MP.app.switchTool('calculator');
  const field = doc.getElementById('calc-input'), trigger = doc.getElementById('symbol-btn');
  const panel = doc.getElementById('symbol-panel');
  field.focus(); trigger.click();
  doc.dispatchEvent({ type: 'keydown', key: 'Escape', preventDefault() {} });
  assert(panel.hidden && doc.activeElement === trigger);
  trigger.click();
  doc.dispatchEvent({ type: 'pointerdown', target: doc.getElementById('theme-btn') });
  assert(panel.hidden);
  trigger.click(); doc.getElementById('language-select').focus(); assert(panel.hidden);
});

test('drawer restores focus for Escape, backdrop and selection only when hiding focused navigation', () => {
  const originalMedia = global.matchMedia;
  global.matchMedia = query => ({ matches: query === '(max-width: 900px)' });
  const menu = doc.getElementById('menu-btn'), nav = doc.querySelectorAll('.nav-item')[0];
  for (const close of [() => doc.dispatchEvent({type:'keydown', key:'Escape'}),
    () => doc.getElementById('sidebar-backdrop').click(), () => nav.click()]) {
    menu.click(); nav.focus();
    assert(menu.getAttribute('aria-expanded') === 'true');
    assert(menu.getAttribute('aria-label') === 'Cerrar menú de secciones');
    close();
    assert(doc.activeElement === menu && menu.getAttribute('aria-expanded') === 'false');
    assert(menu.getAttribute('aria-label') === 'Abrir menú de secciones');
  }
  menu.click(); doc.getElementById('language-select').focus(); MP.app.closeMenu();
  assert(doc.activeElement === doc.getElementById('language-select'));
  global.matchMedia = originalMedia;
});

test('mobile drawer becomes inert immediately on close and restores access on desktop resize', () => {
  const mobile = mediaQueries.get('(max-width: 900px)');
  const menu = doc.getElementById('menu-btn'), sidebar = doc.getElementById('app-sidebar');
  const navigation = doc.querySelectorAll('.nav-item')[0];
  mobile.change(true); assert(sidebar.inert);
  menu.click(); assert(!sidebar.inert);
  navigation.focus(); MP.app.closeMenu();
  assert(sidebar.inert && doc.activeElement === menu);
  mobile.change(false); assert(!sidebar.inert);
  navigation.focus(); mobile.change(true);
  assert(sidebar.inert && doc.activeElement === menu, 'desktop focus cannot stay in the hidden mobile drawer');
  mobile.change(false); assert(!sidebar.inert);
});

test('view transitions keep navigation immediate, avoid duplicate animation and respect reduced motion', () => {
  let callback, finish, skips = 0;
  doc.startViewTransition = update => {
    callback = update;
    return { ready: { catch() {} }, skipTransition() { skips++; }, finished: { then(resolve) { finish = resolve; } } };
  };
  MP.app.switchTool('geometry');
  assert(doc.getElementById('tool-title').textContent === 'Laboratorio de geometría');
  callback(); finish();
  assert(!doc.querySelector('[data-tool="geometry"]').classList.contains('tool-enter'));
  MP.app.switchTool('calculator'); MP.app.switchTool('algebra');
  assert(skips === 1); callback(); finish();
  doc.startViewTransition = () => { throw Error('unavailable'); };
  MP.app.switchTool('home');
  assert(doc.querySelector('[data-tool="home"]').classList.contains('tool-enter'));
  const originalMedia = global.matchMedia;
  global.matchMedia = query => ({ matches: query === '(prefers-reduced-motion: reduce)' });
  let invoked = false; doc.startViewTransition = () => { invoked = true; };
  const beforeDraws = drawCalls;
  MP.app.switchTool('graph');
  assert(!invoked && drawCalls > beforeDraws);
  global.matchMedia = originalMedia; delete doc.startViewTransition;
  MP.app.switchTool('home');
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

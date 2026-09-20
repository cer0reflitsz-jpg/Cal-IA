/* ── Shell de la aplicación ───────────────────────────────────
   Navegación entre herramientas, tema y comunicación entre
   módulos (por ejemplo: "abre esto en el graficador").          */
(function (MP) {
  'use strict';

  var TOOL_TITLES = {
    home: 'Inicio',
    graph: 'Graficador de funciones',
    geometry: 'Laboratorio de geometría',
    calculator: 'Calculadora',
    algebra: 'Álgebra y cálculo',
    learn: 'Aprende',
    practice: 'Practica',
    exams: 'Mini exámenes'
  };

  var current = null;

  function store(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* modo privado */ }
  }
  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = document.getElementById('theme-btn');
    if (btn) {
      btn.textContent = theme === 'dark' ? '☀' : '☾';
      btn.title = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
      btn.setAttribute('aria-label', btn.title);
    }
    // los lienzos leen los colores del CSS: hay que repintarlos
    setTimeout(redrawAll, 0);
  }

  function redrawAll() {
    if (MP.tools.graph && MP.tools.graph.draw) MP.tools.graph.draw();
    if (MP.tools.geometry && MP.tools.geometry.redraw) MP.tools.geometry.redraw();
  }

  function switchTool(id) {
    if (!TOOL_TITLES[id]) return;
    current = id;
    Array.prototype.forEach.call(document.querySelectorAll('.tool'), function (t) {
      t.classList.toggle('active', t.dataset.tool === id);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.nav-item'), function (b) {
      b.setAttribute('aria-current', b.dataset.go === id ? 'true' : 'false');
    });
    var title = document.getElementById('tool-title');
    if (title) title.textContent = TOOL_TITLES[id];
    store('mp.tool', id);
    // el lienzo puede haber cambiado de tamaño mientras estaba oculto
    setTimeout(redrawAll, 0);
  }

  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(8px)';
    }, 2200);
  }

  /* ── Cajón de secciones (móvil) ───────────────────────────
     En escritorio el sidebar siempre está visible; en pantallas
     angostas se convierte en un cajón que se abre con el botón
     de menú, muestra los mismos grupos (Herramientas, Aprender,
     Evalúa) y se cierra solo al elegir una sección.              */
  var menuOpen = false;
  function setMenu(open) {
    menuOpen = open;
    var sidebar = document.getElementById('app-sidebar');
    var backdrop = document.getElementById('sidebar-backdrop');
    var btn = document.getElementById('menu-btn');
    if (sidebar) sidebar.classList.toggle('open', open);
    if (backdrop) backdrop.classList.toggle('open', open);
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open && MP.account && MP.account.closePanel) MP.account.closePanel();
  }
  function toggleMenu() { setMenu(!menuOpen); }
  function closeMenu() { setMenu(false); }

  function openGraph(src) {
    switchTool('graph');
    MP.tools.graph.addExpression(src);
    toast('Añadido al graficador');
  }

  function openAlgebra(src, op) {
    switchTool('algebra');
    MP.tools.algebra.setInput(src);
    if (op) MP.tools.algebra.run(op);
  }

  function openCalculator(src) {
    switchTool('calculator');
    MP.tools.calculator.setInput(src);
    MP.tools.calculator.compute();
    toast('Abierto en la calculadora');
  }

  function init() {
    var saved = load('mp.theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'));

    document.getElementById('theme-btn').onclick = function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      store('mp.theme', next);
      applyTheme(next);
    };

    Array.prototype.forEach.call(document.querySelectorAll('.nav-item'), function (b) {
      b.onclick = function () { switchTool(b.dataset.go); setMenu(false); };
    });

    var menuBtn = document.getElementById('menu-btn');
    if (menuBtn) menuBtn.onclick = function () { toggleMenu(); };
    var backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.onclick = function () { setMenu(false); };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) setMenu(false); });

    MP.tools.home.init();
    MP.tools.graph.init();
    MP.tools.geometry.init();
    MP.tools.calculator.init();
    MP.tools.algebra.init();
    MP.tools.learn.init();
    MP.tools.practice.init();
    MP.tools.exams.init();
    MP.account.init();

    switchTool(load('mp.tool') || 'home');

    // Redibuja cuando cambian los tamaños de los contenedores.
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { redrawAll(); });
      Array.prototype.forEach.call(document.querySelectorAll('.canvas-wrap'), function (n) { ro.observe(n); });
    }
  }

  MP.app = {
    init: init,
    switchTool: switchTool,
    openGraph: openGraph,
    openAlgebra: openAlgebra,
    openCalculator: openCalculator,
    toast: toast,
    redrawAll: redrawAll,
    closeMenu: closeMenu
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window.MP = window.MP || {});

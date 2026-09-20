/* Shell and home translations only. Dictionary HTML is trusted static content. */
(function (MP) {
  'use strict';
  var dictionaries = {
  "es": {
    "tool.home": "Inicio",
    "tool.graph": "Graficador de funciones",
    "tool.geometry": "Laboratorio de geometría",
    "tool.calculator": "Calculadora",
    "tool.algebra": "Álgebra y cálculo",
    "tool.learn": "Aprende",
    "tool.practice": "Practica",
    "tool.exams": "Mini exámenes",
    "nav.graph": "Graficador",
    "nav.geometry": "Geometría",
    "tools": "Herramientas",
    "learning": "Aprender",
    "assess": "Evalúa",
    "sections": "Secciones",
    "menuOpen": "Abrir menú de secciones",
    "menuClose": "Cerrar menú de secciones",
    "light": "Cambiar a modo claro",
    "dark": "Cambiar a modo oscuro",
    "profile": "Cambiar de perfil",
    "language": "Idioma",
    "symbols": "Insertar símbolo",
    "symbolGroup": "Símbolos matemáticos",
    "symbolHintTitle": "Consejo de símbolos",
    "symbolHint": "Inserta símbolos como π o √. Primero haz clic en un campo matemático; después pulsa Ω y elige un símbolo.",
    "symbolHintDismiss": "Entendido",
    "title": "MathPath — Laboratorio de matemáticas",
    "description": "Herramienta interactiva de matemáticas: graficador, geometría dinámica, calculadora simbólica, álgebra y cálculo.",
    "graphAdded": "Añadido al graficador",
    "calculatorOpened": "Abierto en la calculadora",
    "home.feature.0.title": "Graficador",
    "home.feature.0.desc": "Escribe una o varias funciones y se dibujan al instante. Zoom, desplazamiento, sliders para parámetros libres, derivada con un clic y área sombreada bajo la curva.",
    "home.feature.0.ex": "f(x) = a·x² + b·x + c",
    "home.feature.1.title": "Geometría",
    "home.feature.1.desc": "Construye puntos, segmentos, rectas, circunferencias y polígonos. Arrastra un punto y todas las medidas — distancia, pendiente, área, ángulos — se recalculan solas.",
    "home.feature.1.ex": "triángulo 3-4-5, círculo, ángulos",
    "home.feature.2.title": "Calculadora",
    "home.feature.2.desc": "Aritmética con fracciones exactas (no en coma flotante), potencias, raíces, trigonometría y ecuaciones simples, con historial.",
    "home.feature.2.ex": "1/3 + 1/6,  √50,  2x + 5 = 17",
    "home.feature.3.title": "Álgebra y cálculo",
    "home.feature.3.desc": "Simplifica, desarrolla, factoriza y resuelve ecuaciones; deriva e integra. Cada resultado se muestra con el procedimiento paso a paso y una verificación.",
    "home.feature.3.ex": "factorizar x²−5x+6,  d/dx sin(2x)",
    "home.feature.4.title": "Aprende",
    "home.feature.4.desc": "La teoría detrás de cada herramienta: intuición, explicación y un ejemplo resuelto para cada tema, calculado en vivo con el mismo motor que el resto de la aplicación.",
    "home.feature.4.ex": "fracciones, ecuaciones, derivadas…",
    "home.fact.0": "Los resultados son exactos cuando es posible: <b>1/3 + 1/6</b> da <b>1/2</b>, no <b>0.4999999999999999</b>. La aritmética se hace con fracciones, no con coma flotante.",
    "home.fact.1": "Cada ecuación resuelta se comprueba sustituyendo la solución de vuelta, y cada integral se comprueba derivando el resultado. Si algo no se puede verificar, la aplicación lo dice en vez de inventar una respuesta.",
    "home.fact.2": "No hay cuentas ni servidor: todo el cálculo ocurre en tu navegador. Nada de lo que escribes se envía a ningún sitio.",
    "home.fact.3": "La sección <b>Aprende</b> y las herramientas están conectadas: cada tema tiene un botón que abre ese mismo ejemplo en el graficador, la calculadora, álgebra o geometría.",
    "home.fact.4": "Funciona en escritorio, tablet y teléfono, con modo claro y oscuro.",
    "home.kicker": "Laboratorio de matemáticas",
    "home.tagline": "Una herramienta interactiva para calcular, graficar, construir y resolver matemáticas — no una página que habla sobre matemáticas. Cada botón hace algo real, y cada resultado está verificado.",
    "home.tools": "4 herramientas",
    "home.topics": "19 temas explicados",
    "home.libraries": "sin librerías externas",
    "home.sections": "Qué hace cada sección",
    "home.open": "Abrir",
    "home.inside": "Cómo funciona por dentro"
  },
  "en": {
    "tool.home": "Home",
    "tool.graph": "Function grapher",
    "tool.geometry": "Geometry lab",
    "tool.calculator": "Calculator",
    "tool.algebra": "Algebra and calculus",
    "tool.learn": "Learn",
    "tool.practice": "Practice",
    "tool.exams": "Mini exams",
    "nav.graph": "Grapher",
    "nav.geometry": "Geometry",
    "tools": "Tools",
    "learning": "Learning",
    "assess": "Assess",
    "sections": "Sections",
    "menuOpen": "Open section menu",
    "menuClose": "Close section menu",
    "light": "Switch to light mode",
    "dark": "Switch to dark mode",
    "profile": "Switch profile",
    "language": "Language",
    "symbols": "Insert symbol",
    "symbolGroup": "Mathematical symbols",
    "symbolHintTitle": "Symbol tip",
    "symbolHint": "Insert symbols like π or √. First click a math field, then press Ω and choose a symbol.",
    "symbolHintDismiss": "Got it",
    "title": "MathPath — Mathematics lab",
    "description": "Interactive mathematics tools: function grapher, dynamic geometry, symbolic calculator, algebra and calculus.",
    "graphAdded": "Added to the grapher",
    "calculatorOpened": "Opened in the calculator",
    "home.feature.0.title": "Grapher",
    "home.feature.0.desc": "Enter one or more functions and plot them instantly. Zoom, pan, adjust free parameters with sliders, find derivatives with one click, and shade the area under a curve.",
    "home.feature.0.ex": "f(x) = a·x² + b·x + c",
    "home.feature.1.title": "Geometry",
    "home.feature.1.desc": "Construct points, segments, lines, circles and polygons. Drag a point and all measurements — distance, slope, area and angles — update automatically.",
    "home.feature.1.ex": "3-4-5 triangle, circle, angles",
    "home.feature.2.title": "Calculator",
    "home.feature.2.desc": "Arithmetic with exact fractions (not floating point), powers, roots, trigonometry and simple equations, with history.",
    "home.feature.2.ex": "1/3 + 1/6,  √50,  2x + 5 = 17",
    "home.feature.3.title": "Algebra and calculus",
    "home.feature.3.desc": "Simplify, expand, factor and solve equations; differentiate and integrate. Each result includes a step-by-step procedure and verification.",
    "home.feature.3.ex": "factor x²−5x+6,  d/dx sin(2x)",
    "home.feature.4.title": "Learn",
    "home.feature.4.desc": "The theory behind each tool: intuition, explanations and a worked example for each topic, calculated live with the same engine as the rest of the application.",
    "home.feature.4.ex": "fractions, equations, derivatives…",
    "home.fact.0": "Results are exact whenever possible: <b>1/3 + 1/6</b> gives <b>1/2</b>, not <b>0.4999999999999999</b>. Arithmetic uses fractions, not floating point.",
    "home.fact.1": "Each solved equation is checked by substituting the solution back in, and each integral is checked by differentiating the result. If something cannot be verified, the application says so instead of inventing an answer.",
    "home.fact.2": "There are no online accounts or server: all calculations happen in your browser. Nothing you type is sent anywhere.",
    "home.fact.3": "The <b>Learn</b> section and the tools are connected: each topic has a button that opens the same example in the grapher, calculator, algebra or geometry tool.",
    "home.fact.4": "Works on desktop, tablet and phone, with light and dark modes.",
    "home.kicker": "Mathematics lab",
    "home.tagline": "An interactive tool for calculating, graphing, constructing and solving mathematics. Every button does something real, and every result is verified.",
    "home.tools": "4 tools",
    "home.topics": "19 explained topics",
    "home.libraries": "no external libraries",
    "home.sections": "What each section does",
    "home.open": "Open",
    "home.inside": "How it works inside"
  }
};

  var language;
  try { language = localStorage.getItem('mp.lang'); } catch (e) {}
  if (language !== 'es' && language !== 'en') {
    language = /^en/i.test(window.navigator && window.navigator.language || '') ? 'en' : 'es';
  }
  function t(key) { return dictionaries[language][key] || dictionaries.es[key] || key; }
  function apply() {
    document.documentElement.setAttribute('lang', language);
    document.title = t('title');
    var description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', t('description'));
    ['text', 'aria-label', 'title'].forEach(function (attribute) {
      var marker = 'data-i18n' + (attribute === 'text' ? '' : '-' + attribute);
      Array.prototype.forEach.call(document.querySelectorAll('[' + marker + ']'), function (node) {
        var value = t(node.getAttribute(marker));
        if (attribute === 'text') node.textContent = value;
        else node.setAttribute(attribute, value);
      });
    });
    var select = document.getElementById('language-select');
    if (select) select.value = language;
  }
  function updateLanguage(value) {
    language = value;
    apply();
    document.dispatchEvent(new CustomEvent('mp:languagechange', { detail: { language: language } }));
  }
  function setLanguage(value) {
    if (value !== 'es' && value !== 'en') return;
    try { localStorage.setItem('mp.lang', value); } catch (e) {}
    updateLanguage(value);
  }
  // Keep open pages, including the first-visit hint, in sync with the saved preference.
  if (window.addEventListener) window.addEventListener('storage', function (event) {
    if (event.key !== 'mp.lang' || (event.newValue !== 'es' && event.newValue !== 'en')) return;
    try { if (event.storageArea !== localStorage) return; } catch (e) { return; }
    if (event.newValue !== language) updateLanguage(event.newValue);
  });
  MP.i18n = { t: t, apply: apply, getLanguage: function () { return language; }, setLanguage: setLanguage };
})(window.MP = window.MP || {});

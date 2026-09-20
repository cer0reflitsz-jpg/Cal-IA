/* ── Herramienta: Inicio ──────────────────────────────────────
   Contenido en su mayoría fijo. Sólo conecta los botones "abrir"
   con MP.app.switchTool — nada de lo que afirma aquí sobre lo
   que hace la aplicación puede ser falso: cada botón lleva a una
   herramienta que existe y funciona.                            */
(function (MP) {
  'use strict';

  var FEATURES = [
    {
      go: 'graph', icon: '∿', title: 'Graficador',
      desc: 'Escribe una o varias funciones y se dibujan al instante. Zoom, desplazamiento, sliders para parámetros libres, derivada con un clic y área sombreada bajo la curva.',
      ex: 'f(x) = a·x² + b·x + c'
    },
    {
      go: 'geometry', icon: '△', title: 'Geometría',
      desc: 'Construye puntos, segmentos, rectas, circunferencias y polígonos. Arrastra un punto y todas las medidas — distancia, pendiente, área, ángulos — se recalculan solas.',
      ex: 'triángulo 3-4-5, círculo, ángulos'
    },
    {
      go: 'calculator', icon: '±', title: 'Calculadora',
      desc: 'Aritmética con fracciones exactas (no en coma flotante), potencias, raíces, trigonometría y ecuaciones simples, con historial.',
      ex: '1/3 + 1/6,  √50,  2x + 5 = 17'
    },
    {
      go: 'algebra', icon: '∫', title: 'Álgebra y cálculo',
      desc: 'Simplifica, desarrolla, factoriza y resuelve ecuaciones; deriva e integra. Cada resultado se muestra con el procedimiento paso a paso y una verificación.',
      ex: 'factorizar x²−5x+6,  d/dx sin(2x)'
    },
    {
      go: 'learn', icon: '✎', title: 'Aprende',
      desc: 'La teoría detrás de cada herramienta: intuición, explicación y un ejemplo resuelto para cada tema, calculado en vivo con el mismo motor que el resto de la aplicación.',
      ex: 'fracciones, ecuaciones, derivadas…'
    }
  ];

  var FACTS = [
    'Los resultados son exactos cuando es posible: <b>1/3 + 1/6</b> da <b>1/2</b>, no <b>0.4999999999999999</b>. La aritmética se hace con fracciones, no con coma flotante.',
    'Cada ecuación resuelta se comprueba sustituyendo la solución de vuelta, y cada integral se comprueba derivando el resultado. Si algo no se puede verificar, la aplicación lo dice en vez de inventar una respuesta.',
    'No hay cuentas ni servidor: todo el cálculo ocurre en tu navegador. Nada de lo que escribes se envía a ningún sitio.',
    'La sección <b>Aprende</b> y las herramientas están conectadas: cada tema tiene un botón que abre ese mismo ejemplo en el graficador, la calculadora, álgebra o geometría.',
    'Funciona en escritorio, tablet y teléfono, con modo claro y oscuro.'
  ];

  function render() {
    var html = '<div class="inner">';

    html += '<div class="hero">' +
      '<div class="kicker">Laboratorio de matemáticas</div>' +
      '<h1>MathPath</h1>' +
      '<p class="tagline">Una herramienta interactiva para calcular, graficar, construir y resolver matemáticas — no una página que habla sobre matemáticas. Cada botón hace algo real, y cada resultado está verificado.</p>' +
      '<div class="stat-row">' +
      '<span class="chip accent">4 herramientas</span>' +
      '<span class="chip">19 temas explicados</span>' +
      '<span class="chip">sin librerías externas</span>' +
      '</div>' +
      '</div>';

    html += '<div class="section-heading">Qué hace cada sección</div>';
    html += '<div class="feature-grid">';
    FEATURES.forEach(function (f) {
      html += '<div class="feature-card">' +
        '<div class="fi">' + f.icon + '</div>' +
        '<h3>' + f.title + '</h3>' +
        '<p>' + f.desc + '</p>' +
        '<div class="ex">' + f.ex + '</div>' +
        '<button class="btn sm" data-open-tool="' + f.go + '">Abrir</button>' +
        '</div>';
    });
    html += '</div>';

    html += '<div class="section-heading">Cómo funciona por dentro</div>';
    html += '<div class="fact-list">';
    FACTS.forEach(function (f) {
      html += '<div class="fact-row"><span class="fmark">✓</span><span>' + f + '</span></div>';
    });
    html += '</div>';

    html += '</div>';
    el.content.innerHTML = html;

    Array.prototype.forEach.call(el.content.querySelectorAll('[data-open-tool]'), function (b) {
      b.onclick = function () { MP.app.switchTool(b.getAttribute('data-open-tool')); };
    });
  }

  var el = {};
  function init() {
    el.content = document.getElementById('home-content');
    render();
  }

  MP.tools = MP.tools || {};
  MP.tools.home = { init: init };
})(window.MP = window.MP || {});

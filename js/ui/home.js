/* ── Herramienta: Inicio ──────────────────────────────────────
   Contenido en su mayoría fijo. Sólo conecta los botones "abrir"
   con MP.app.switchTool — nada de lo que afirma aquí sobre lo
   que hace la aplicación puede ser falso: cada botón lleva a una
   herramienta que existe y funciona.                            */
(function (MP) {
  'use strict';

  var FEATURES = [
    {
      go: 'graph', icon: '∿', title: 'home.feature.0.title',
      desc: 'home.feature.0.desc',
      ex: 'home.feature.0.ex'
    },
    {
      go: 'geometry', icon: '△', title: 'home.feature.1.title',
      desc: 'home.feature.1.desc',
      ex: 'home.feature.1.ex'
    },
    {
      go: 'calculator', icon: '±', title: 'home.feature.2.title',
      desc: 'home.feature.2.desc',
      ex: 'home.feature.2.ex'
    },
    {
      go: 'algebra', icon: '∫', title: 'home.feature.3.title',
      desc: 'home.feature.3.desc',
      ex: 'home.feature.3.ex'
    },
    {
      go: 'learn', icon: '✎', title: 'home.feature.4.title',
      desc: 'home.feature.4.desc',
      ex: 'home.feature.4.ex'
    }
  ];

  var FACTS = [
    'home.fact.0',
    'home.fact.1',
    'home.fact.2',
    'home.fact.3',
    'home.fact.4'
  ];

  var TICKER = ['f(x) = ax² + bx + c', '<b>∫</b> x² dx = x³/3 + C', '1/3 + 1/6 = 1/2', 'e<sup>iπ</sup> + 1 = 0',
    'x² − 5x + 6 = (x−2)(x−3)', '<b>d/dx</b> sin(2x) = 2cos(2x)', 'a² + b² = c²', '√50 = 5√2', 'sin(π/6) = 1/2'];

  function render() {
    var t = MP.i18n.t;
    var title = 'MathPath'.split('').map(function (c, i) {
      return '<span aria-hidden="true" style="--i:' + i + '">' + c + '</span>';
    }).join('');
    var tick = TICKER.map(function (x) { return '<span>' + x + '</span>'; }).join('');

    var html = '<div class="home-stage">';

    html += '<section class="hero-stage">' +
      '<canvas class="hero-canvas" aria-hidden="true"></canvas>' +
      '<div class="hero-copy">' +
      '<div class="kicker rv" style="--d:0">' + t('home.kicker') + '</div>' +
      '<h1 class="hero-title" aria-label="MathPath">' + title + '</h1>' +
      '<p class="tagline rv" style="--d:1">' + t('home.tagline') + '</p>' +
      '<div class="stat-row rv" style="--d:2">' +
      '<span class="chip accent">' + t('home.tools') + '</span>' +
      '<span class="chip">' + t('home.topics') + '</span>' +
      '<span class="chip">' + t('home.libraries') + '</span>' +
      '</div>' +
      '<div class="hero-cta rv" style="--d:3">' +
      '<button class="btn primary lg" data-hero-go="graph">' + t('home.open') + ' ' + t('nav.graph') + '</button>' +
      '<button class="btn lg" data-hero-go="learn">' + t('tool.learn') + '</button>' +
      '</div>' +
      '</div>' +
      '<div class="scroll-cue" aria-hidden="true"><i></i></div>' +
      '</section>';

    html += '<div class="ticker" aria-hidden="true"><div class="ticker-track">' + tick + tick + '</div></div>';

    html += '<div class="inner">';
    html += '<div class="section-heading reveal">' + t('home.sections') + '</div>';
    html += '<div class="feature-grid bento">';
    FEATURES.forEach(function (f, i) {
      html += '<div class="feature-card reveal" style="--d:' + (i % 3) + '">' +
        '<span class="fn" aria-hidden="true">0' + (i + 1) + '</span>' +
        '<div class="fi">' + f.icon + '</div>' +
        '<h3>' + t(f.title) + '</h3>' +
        '<p>' + t(f.desc) + '</p>' +
        '<div class="ex">' + t(f.ex) + '</div>' +
        '<button class="btn sm" data-open-tool="' + f.go + '">' + t('home.open') + '</button>' +
        '</div>';
    });
    html += '</div>';

    html += '<div class="section-heading reveal">' + t('home.inside') + '</div>';
    html += '<div class="fact-list">';
    FACTS.forEach(function (f, i) {
      html += '<div class="fact-row reveal" style="--d:' + (i % 3) + '"><span class="fmark">✓</span><span>' + t(f) + '</span></div>';
    });
    html += '</div>';

    html += '</div></div>';
    el.content.innerHTML = html;
    el.content.classList.add('home-pane');

    Array.prototype.forEach.call(el.content.querySelectorAll('[data-open-tool]'), function (b) {
      b.onclick = function () { MP.app.switchTool(b.getAttribute('data-open-tool')); };
    });
    Array.prototype.forEach.call(el.content.querySelectorAll('[data-hero-go]'), function (b) {
      b.onclick = function () { MP.app.switchTool(b.getAttribute('data-hero-go')); };
    });
    if (MP.fx) MP.fx.mountHome(el.content);
  }

  var el = {};
  function init() {
    el.content = document.getElementById('home-content');
    render();
    document.addEventListener('mp:languagechange', render);
  }

  MP.tools = MP.tools || {};
  MP.tools.home = { init: init };
})(window.MP = window.MP || {});

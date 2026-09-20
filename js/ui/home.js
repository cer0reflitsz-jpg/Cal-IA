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

  function render() {
    var html = '<div class="inner">';

    html += '<div class="hero">' +
      '<div class="kicker">' + MP.i18n.t('home.kicker') + '</div>' +
      '<h1>MathPath</h1>' +
      '<p class="tagline">' + MP.i18n.t('home.tagline') + '</p>' +
      '<div class="stat-row">' +
      '<span class="chip accent">' + MP.i18n.t('home.tools') + '</span>' +
      '<span class="chip">' + MP.i18n.t('home.topics') + '</span>' +
      '<span class="chip">' + MP.i18n.t('home.libraries') + '</span>' +
      '</div>' +
      '</div>';

    html += '<div class="section-heading">' + MP.i18n.t('home.sections') + '</div>';
    html += '<div class="feature-grid">';
    FEATURES.forEach(function (f) {
      html += '<div class="feature-card">' +
        '<div class="fi">' + f.icon + '</div>' +
        '<h3>' + MP.i18n.t(f.title) + '</h3>' +
        '<p>' + MP.i18n.t(f.desc) + '</p>' +
        '<div class="ex">' + MP.i18n.t(f.ex) + '</div>' +
        '<button class="btn sm" data-open-tool="' + f.go + '">' + MP.i18n.t('home.open') + '</button>' +
        '</div>';
    });
    html += '</div>';

    html += '<div class="section-heading">' + MP.i18n.t('home.inside') + '</div>';
    html += '<div class="fact-list">';
    FACTS.forEach(function (f) {
      html += '<div class="fact-row"><span class="fmark">✓</span><span>' + MP.i18n.t(f) + '</span></div>';
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
    document.addEventListener('mp:languagechange', render);
  }

  MP.tools = MP.tools || {};
  MP.tools.home = { init: init };
})(window.MP = window.MP || {});

/* ── Herramienta: Practica ────────────────────────────────────
   Elegir tema(s) y dificultad, resolver una serie de ejercicios
   generados por MP.exbank, y registrar el resultado en el
   perfil activo. También sirve como destino de "practicar mis
   errores" desde Mini exámenes: en ese caso recibe una lista de
   temas ya elegida y salta directo a la sesión.                 */
(function (MP) {
  'use strict';
  var el = {};
  var session = null; // { topics: [ids], difficulty, queue: [...generados], index, correct, wrong }

  function topicLabel(id) {
    var found = null;
    MP.content.topics.forEach(function (cat) { cat.items.forEach(function (t) { if (t.id === id) found = t; }); });
    return found ? found.title : id;
  }

  function availableTopicsByCategory() {
    return MP.content.topics.map(function (cat) {
      return { name: cat.name, items: cat.items.filter(function (t) { return MP.exbank.has(t.id); }) };
    }).filter(function (cat) { return cat.items.length > 0; });
  }

  var picked = { topics: [], difficulty: 'basico' };

  function renderPicker() {
    var cats = availableTopicsByCategory();
    var html = '<div class="inner">';
    html += '<div class="section-heading">Elige uno o varios temas</div>';
    cats.forEach(function (cat) {
      html += '<div class="practice-cat">' + cat.name + '</div><div class="practice-topic-grid">';
      cat.items.forEach(function (t) {
        var sel = picked.topics.indexOf(t.id) >= 0;
        html += '<button class="practice-topic-chip' + (sel ? ' sel' : '') + '" data-topic="' + t.id + '">' + R_esc(t.title) + '</button>';
      });
      html += '</div>';
    });

    html += '<div class="section-heading">Dificultad</div><div class="btn-row" id="practice-diff-row">';
    MP.exbank.difficulties.forEach(function (d) {
      var sel = picked.difficulty === d;
      html += '<button class="btn' + (sel ? ' primary' : '') + '" data-diff="' + d + '">' + MP.exbank.difficultyLabel(d) + '</button>';
    });
    html += '</div>';

    html += '<div class="btn-row" style="margin-top:18px">' +
      '<button class="btn primary" id="practice-start" ' + (picked.topics.length ? '' : 'disabled') + '>Comenzar práctica</button>' +
      '</div>';

    var stats = MP.profiles.getData().practice;
    if (stats.attempted > 0) {
      html += '<div class="section-heading">Tu progreso en este perfil</div>' +
        '<div class="fact-row"><span class="fmark">' + Math.round(100 * stats.correct / stats.attempted) + '%</span>' +
        '<span>' + stats.correct + ' de ' + stats.attempted + ' ejercicios correctos en total.</span></div>';
    }
    html += '</div>';
    el.content.innerHTML = html;
    bindPicker();
  }

  function R_esc(s) { return MP.render.esc(s); }

  function bindPicker() {
    Array.prototype.forEach.call(el.content.querySelectorAll('[data-topic]'), function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-topic');
        var i = picked.topics.indexOf(id);
        if (i >= 0) picked.topics.splice(i, 1); else picked.topics.push(id);
        renderPicker();
      };
    });
    Array.prototype.forEach.call(el.content.querySelectorAll('[data-diff]'), function (b) {
      b.onclick = function () { picked.difficulty = b.getAttribute('data-diff'); renderPicker(); };
    });
    var startBtn = document.getElementById('practice-start');
    if (startBtn) startBtn.onclick = function () { startSession(picked.topics.slice(), picked.difficulty, 8); };
  }

  /** Punto de entrada externo: practicar un único tema (desde "Practica este tema" en Aprende). */
  function startTopic(topicId, difficulty) {
    startSession([topicId], difficulty || 'basico', 8);
  }

  /** Punto de entrada externo: practicar varios temas a la vez (desde "Practicar mis errores"). */
  function startTopics(topicIds, difficulty, count) {
    startSession(topicIds, difficulty || 'basico', count || 6);
  }

  function startSession(topicIds, difficulty, count) {
    topicIds = topicIds.filter(function (id) { return MP.exbank.has(id); });
    if (!topicIds.length) return;
    session = { topics: topicIds, difficulty: difficulty, index: 0, correct: 0, wrong: 0, total: count };
    nextExercise();
  }

  function nextExercise() {
    if (session.index >= session.total) { renderSummary(); return; }
    var topicId = session.topics[session.index % session.topics.length];
    var q = MP.exbank.generate(topicId, session.difficulty);

    el.content.innerHTML =
      '<div class="inner">' +
      '<div class="practice-progress">' +
      '<span class="muted small">Ejercicio ' + (session.index + 1) + ' de ' + session.total + '</span>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + Math.round(100 * session.index / session.total) + '%"></div></div>' +
      '</div>' +
      '<div class="card example-card" id="practice-card"></div>' +
      '</div>';

    MP.widgets.renderExercise(document.getElementById('practice-card'), q, {
      showTopic: session.topics.length > 1,
      topicLabel: topicLabel(topicId),
      onResult: function (res) {
        if (res.correct) session.correct++; else session.wrong++;
        MP.profiles.recordPractice(topicId, res.correct);
      },
      onNext: function () { session.index++; nextExercise(); },
      nextLabel: (session.index + 1 >= session.total) ? 'Ver resumen' : 'Siguiente ejercicio'
    });
  }

  function renderSummary() {
    var pct = session.total ? Math.round(100 * session.correct / session.total) : 0;
    el.content.innerHTML =
      '<div class="inner">' +
      '<div class="section-heading">Resumen de la práctica</div>' +
      '<div class="result-summary">' +
      '<div class="result-score">' + session.correct + ' / ' + session.total + '</div>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="muted small" style="margin-top:6px">' + pct + '% correcto</div>' +
      '</div>' +
      '<div class="btn-row" style="margin-top:16px">' +
      '<button class="btn primary" id="practice-again">Practicar de nuevo</button>' +
      '<button class="btn" id="practice-back">Elegir otro tema</button>' +
      '</div></div>';
    document.getElementById('practice-again').onclick = function () {
      startSession(session.topics, session.difficulty, session.total);
    };
    document.getElementById('practice-back').onclick = function () { session = null; renderPicker(); };
  }

  function init() {
    el.content = document.getElementById('practice-content');
    renderPicker();
  }

  MP.tools = MP.tools || {};
  MP.tools.practice = { init: init, startTopic: startTopic, startTopics: startTopics, showPicker: function () { session = null; renderPicker(); } };
})(window.MP = window.MP || {});

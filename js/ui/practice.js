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
  var CAT_ICON = ['÷', 'x', 'ƒ', '△', 'θ', '∂', '∫'];

  function catIcon(name) {
    var idx = -1;
    MP.content.topics.forEach(function (c, i) { if (c.name === name) idx = i; });
    return CAT_ICON[idx] || '•';
  }

  function renderPicker() {
    var cats = availableTopicsByCategory();
    var stats = MP.profiles.getData().practice;
    var html = '<div class="inner">';

    html += '<div class="mode-hero"><span class="orb o1" aria-hidden="true">∑</span><span class="orb o2" aria-hidden="true">π</span><span class="orb o3" aria-hidden="true">√</span>' +
      '<div class="kicker">Practica</div><h2>Ejercicios nuevos cada vez</h2>' +
      '<p>Los números se generan al azar y cada respuesta se comprueba con el motor matemático. Sin respuestas memorizadas.</p>';
    if (stats.attempted > 0) {
      html += '<div class="mode-stats"><span class="chip accent">' + Math.round(100 * stats.correct / stats.attempted) + '% de acierto</span>' +
        '<span class="chip">' + stats.correct + ' / ' + stats.attempted + ' correctos</span></div>';
    }
    html += '</div>';

    html += '<div class="section-heading">Elige uno o varios temas <span class="count-pill" id="practice-count">' + picked.topics.length + '</span></div>';
    cats.forEach(function (cat) {
      html += '<div class="practice-cat"><span class="cat-ico" aria-hidden="true">' + catIcon(cat.name) + '</span>' + cat.name + '</div><div class="practice-topic-grid">';
      cat.items.forEach(function (t) {
        var sel = picked.topics.indexOf(t.id) >= 0;
        html += '<button class="practice-topic-chip' + (sel ? ' sel' : '') + '" data-topic="' + t.id + '">' + R_esc(t.title) + '</button>';
      });
      html += '</div>';
    });

    html += '<div class="section-heading">Dificultad</div><div class="btn-row seg" id="practice-diff-row">';
    MP.exbank.difficulties.forEach(function (d) {
      var sel = picked.difficulty === d;
      html += '<button class="btn seg-btn' + (sel ? ' primary' : '') + '" data-d="' + d + '" data-diff="' + d + '">' + MP.exbank.difficultyLabel(d) + '</button>';
    });
    html += '</div>';

    html += '<div class="btn-row" style="margin-top:22px">' +
      '<button class="btn primary lg start-btn" id="practice-start" ' + (picked.topics.length ? '' : 'disabled') + '>Comenzar práctica <span aria-hidden="true">→</span></button>' +
      '</div>';
    html += '</div>';
    el.content.innerHTML = html;
    bindPicker();
  }

  function R_esc(s) { return MP.render.esc(s); }

  // Los cambios de selección se aplican en el sitio: nada se vuelve a pintar ni a animar.
  function bindPicker() {
    var startBtn = document.getElementById('practice-start');
    var counter = document.getElementById('practice-count');
    Array.prototype.forEach.call(el.content.querySelectorAll('[data-topic]'), function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-topic');
        var i = picked.topics.indexOf(id);
        if (i >= 0) picked.topics.splice(i, 1); else picked.topics.push(id);
        b.classList.toggle('sel', i < 0);
        if (counter) {
          counter.textContent = picked.topics.length;
          MP.kit.bump(counter);
        }
        if (startBtn) startBtn.disabled = picked.topics.length === 0;
      };
    });
    var diffBtns = el.content.querySelectorAll('[data-diff]');
    Array.prototype.forEach.call(diffBtns, function (b) {
      b.onclick = function () {
        picked.difficulty = b.getAttribute('data-diff');
        Array.prototype.forEach.call(diffBtns, function (x) { x.classList.toggle('primary', x === b); });
      };
    });
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
    session = { topics: topicIds, difficulty: difficulty, index: 0, correct: 0, wrong: 0, total: count,
      results: [], streak: 0, best: 0, byTopic: {} };
    nextExercise();
  }

  function hudRight() {
    return (session.streak >= 2 ? '<span class="chip streak" id="hud-streak"><span class="flame" aria-hidden="true">🔥</span> racha ×' + session.streak + '</span>' : '') +
      '<span class="chip accent" id="hud-ok">✓ ' + session.correct + '</span>';
  }

  function paintHud(answeredIndex, ok) {
    var dot = el.content.querySelectorAll('.stepper .dot')[answeredIndex];
    if (dot) { dot.className = 'dot ' + (ok ? 'ok' : 'bad'); }
    var right = document.getElementById('hud-right');
    if (right) right.innerHTML = hudRight();
  }

  function nextExercise() {
    if (session.index >= session.total) { renderSummary(); return; }
    var topicId = session.topics[session.index % session.topics.length];
    var q = MP.exbank.generate(topicId, session.difficulty);
    var prev = Math.round(100 * Math.max(0, session.index - 1) / session.total);
    var now = Math.round(100 * session.index / session.total);

    el.content.innerHTML =
      '<div class="inner">' +
      '<div class="hud"><div class="hud-left">' +
      '<span class="muted small hud-count">Ejercicio ' + (session.index + 1) + ' de ' + session.total + '</span>' +
      MP.kit.stepperHTML(session.results, session.index, session.total) + '</div>' +
      '<div class="hud-right" id="hud-right">' + hudRight() + '</div></div>' +
      '<div class="practice-progress"><div class="progress-track"><div class="progress-fill" style="width:' + prev + '%"></div></div></div>' +
      '<div class="card example-card ex-card" id="practice-card"></div>' +
      '</div>';
    var fill = el.content.querySelector('.progress-fill');
    setTimeout(function () { if (fill && fill.style) fill.style.width = now + '%'; }, 40);

    var answered = session.index;
    MP.widgets.renderExercise(document.getElementById('practice-card'), q, {
      showTopic: session.topics.length > 1,
      topicLabel: topicLabel(topicId),
      onResult: function (res) {
        if (res.correct) { session.correct++; session.streak++; session.best = Math.max(session.best, session.streak); }
        else { session.wrong++; session.streak = 0; }
        session.results[answered] = !!res.correct;
        var bt = session.byTopic[topicId] = session.byTopic[topicId] || { c: 0, t: 0 };
        bt.t++; if (res.correct) bt.c++;
        MP.profiles.recordPractice(topicId, res.correct);
        paintHud(answered, res.correct);
      },
      onNext: function () { session.index++; nextExercise(); },
      nextLabel: (session.index + 1 >= session.total) ? 'Ver resumen' : 'Siguiente ejercicio'
    });
  }

  function renderSummary() {
    var pct = session.total ? Math.round(100 * session.correct / session.total) : 0;
    var g = MP.kit.grade(pct);
    var rows = Object.keys(session.byTopic).map(function (id) {
      return { id: id, label: topicLabel(id), correct: session.byTopic[id].c, total: session.byTopic[id].t };
    });
    var weak = rows.filter(function (r) { return r.correct < r.total; }).slice(0, 3);

    var html = '<div class="inner">' +
      '<div class="section-heading">Resumen de la práctica</div>' +
      '<div class="summary-hero tone-' + g.tone + '">' +
      '<div class="result-summary">' + MP.kit.ringHTML(session.correct, session.total) +
      '<div class="grade-title"><span class="grade-ico">' + g.icon + '</span> ' + g.title + '</div>' +
      '<div class="muted small">' + pct + '% correcto' + (session.best >= 2 ? ' · mejor racha ×' + session.best : '') + '</div></div>' +
      '</div>' +
      MP.kit.stepperHTML(session.results, -1, session.total);

    if (rows.length) html += '<div class="section-heading">Por tema</div>' + MP.kit.breakdownHTML(rows);
    weak.forEach(function (r) { html += MP.kit.resourcesHTML(r.id, 'Repasa: ' + r.label); });

    html += '<div class="btn-row" style="margin-top:20px">' +
      '<button class="btn primary lg" id="practice-again">Practicar de nuevo</button>' +
      '<button class="btn lg" id="practice-back">Elegir otro tema</button>' +
      '</div></div>';
    el.content.innerHTML = html;
    MP.kit.countUp(el.content);
    if (pct >= 80) MP.kit.confetti(el.content.querySelector('.ring'), 60);
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

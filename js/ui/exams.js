/* ── Herramienta: Mini exámenes ───────────────────────────────
   Compila un examen a partir de los temas y la dificultad que
   elige el usuario, tomando los ejercicios del mismo banco que
   usa Practica. Cada pregunta se genera de verdad (no hay banco
   fijo de "10 preguntas guardadas"): el examen se arma en el
   momento combinando los temas elegidos.                        */
(function (MP) {
  'use strict';
  var R = MP.render;
  var el = {};

  // Agrupación aproximada por nivel escolar chileno, sólo para poder filtrar
  // los temas del examen — es un filtro real sobre los mismos temas del banco,
  // no una lista distinta.
  var LEVEL_MAP = {
    '7-8basico': ['fracciones', 'potencias-raices', 'orden-operaciones', 'simplificar', 'distancia', 'pendiente-recta', 'circunferencia', 'pitagoras'],
    '1-2medio': ['productos-notables', 'factorizacion', 'ecuaciones-lineales', 'ecuaciones-cuadraticas', 'que-es-funcion', 'funcion-lineal', 'funcion-cuadratica', 'trigonometria-basica'],
    '3-4medio': ['que-es-derivada', 'reglas-derivacion', 'que-es-integral']
  };
  var LEVEL_LABEL = { todos: 'Todos los niveles', '7-8basico': '7° y 8° básico', '1-2medio': '1° y 2° medio', '3-4medio': '3° y 4° medio' };
  var DIFF_LABEL = { basico: '🟢 Fácil', intermedio: '🟡 Intermedio', avanzado: '🔴 Difícil', mixta: '🔥 Mixta' };

  var cfg = { level: 'todos', topics: [], count: 10, difficulty: 'mixta', timer: false };
  var exam = null; // { questions:[], index, answers:[], startTime, timerId }

  function topicMeta(id) {
    var found = null, cat = null;
    MP.content.topics.forEach(function (c) { c.items.forEach(function (t) { if (t.id === id) { found = t; cat = c.name; } }); });
    return found ? { title: found.title, category: cat } : { title: id, category: '' };
  }

  function topicsForLevel(level) {
    var ids = level === 'todos' ? MP.exbank.topics.slice() : (LEVEL_MAP[level] || []);
    return ids.filter(function (id) { return MP.exbank.has(id); });
  }

  /* ── Configuración ────────────────────────────────────────── */

  function renderConfig() {
    var levelTopics = topicsForLevel(cfg.level);
    cfg.topics = cfg.topics.filter(function (id) { return levelTopics.indexOf(id) >= 0; });

    var byCat = {};
    levelTopics.forEach(function (id) {
      var m = topicMeta(id);
      (byCat[m.category] = byCat[m.category] || []).push({ id: id, title: m.title });
    });

    var html = '<div class="inner">';
    html += '<div class="section-heading">Nivel</div><div class="btn-row">';
    Object.keys(LEVEL_LABEL).forEach(function (lv) {
      html += '<button class="btn' + (cfg.level === lv ? ' primary' : '') + '" data-level="' + lv + '">' + LEVEL_LABEL[lv] + '</button>';
    });
    html += '</div>';

    html += '<div class="section-heading">Temas <span class="muted small">(elige al menos uno)</span></div>';
    Object.keys(byCat).forEach(function (catName) {
      html += '<div class="practice-cat">' + R.esc(catName) + '</div><div class="exam-topic-list">';
      byCat[catName].forEach(function (t) {
        var checked = cfg.topics.indexOf(t.id) >= 0;
        html += '<label class="exam-topic-check"><input type="checkbox" data-etopic="' + t.id + '" ' + (checked ? 'checked' : '') + '><span>' + R.esc(t.title) + '</span></label>';
      });
      html += '</div>';
    });

    html += '<div class="section-heading">Cantidad de preguntas</div><div class="btn-row">';
    [5, 10, 15, 20].forEach(function (n) {
      html += '<button class="btn' + (cfg.count === n ? ' primary' : '') + '" data-count="' + n + '">' + n + '</button>';
    });
    html += '</div>';

    html += '<div class="section-heading">Dificultad</div><div class="btn-row">';
    Object.keys(DIFF_LABEL).forEach(function (d) {
      html += '<button class="btn' + (cfg.difficulty === d ? ' primary' : '') + '" data-ediff="' + d + '">' + DIFF_LABEL[d] + '</button>';
    });
    html += '</div>';

    html += '<div class="toggle-row" style="max-width:260px;margin-top:14px">' +
      '<span>Usar temporizador</span><label class="switch"><input type="checkbox" id="exam-timer-toggle" ' + (cfg.timer ? 'checked' : '') + '>' +
      '<span class="track"></span><span class="thumb"></span></label></div>';

    html += '<div class="btn-row" style="margin-top:18px">' +
      '<button class="btn primary" id="exam-create" ' + (cfg.topics.length ? '' : 'disabled') + '>Crear mini examen</button></div>';

    var hist = MP.profiles.getData().exams;
    if (hist.length) {
      html += '<div class="section-heading">Exámenes anteriores en este perfil</div>';
      hist.slice(0, 5).forEach(function (h) {
        html += '<div class="obj-item"><div class="obj-head"><span class="obj-name" style="font-style:normal">' +
          h.score + '/' + h.total + '</span><span class="obj-kind">' + new Date(h.date).toLocaleDateString() + ' · ' + h.topicsLabel + '</span></div></div>';
      });
    }
    html += '</div>';
    el.content.innerHTML = html;
    bindConfig();
  }

  function bindConfig() {
    Array.prototype.forEach.call(el.content.querySelectorAll('[data-level]'), function (b) {
      b.onclick = function () { cfg.level = b.getAttribute('data-level'); renderConfig(); };
    });
    Array.prototype.forEach.call(el.content.querySelectorAll('[data-etopic]'), function (c) {
      c.onchange = function () {
        var id = c.getAttribute('data-etopic'), i = cfg.topics.indexOf(id);
        if (c.checked && i < 0) cfg.topics.push(id);
        if (!c.checked && i >= 0) cfg.topics.splice(i, 1);
        var btn = document.getElementById('exam-create');
        if (btn) btn.disabled = cfg.topics.length === 0;
      };
    });
    Array.prototype.forEach.call(el.content.querySelectorAll('[data-count]'), function (b) {
      b.onclick = function () { cfg.count = parseInt(b.getAttribute('data-count'), 10); renderConfig(); };
    });
    Array.prototype.forEach.call(el.content.querySelectorAll('[data-ediff]'), function (b) {
      b.onclick = function () { cfg.difficulty = b.getAttribute('data-ediff'); renderConfig(); };
    });
    var timerToggle = document.getElementById('exam-timer-toggle');
    if (timerToggle) timerToggle.onchange = function () { cfg.timer = timerToggle.checked; };
    var createBtn = document.getElementById('exam-create');
    if (createBtn) createBtn.onclick = startExam;
  }

  /* ── Generar y ejecutar ──────────────────────────────────── */

  function pickDifficulty() {
    if (cfg.difficulty !== 'mixta') return cfg.difficulty;
    return MP.exbank.difficulties[Math.floor(Math.random() * MP.exbank.difficulties.length)];
  }

  function startExam() {
    var topics = cfg.topics.slice();
    var order = [];
    var per = Math.floor(cfg.count / topics.length), extra = cfg.count % topics.length;
    topics.forEach(function (id, idx) {
      var n = per + (idx < extra ? 1 : 0);
      for (var k = 0; k < n; k++) order.push(id);
    });
    order = MP.exengine.shuffle(MP.exengine.makeRng((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0), order);
    var questions = order.map(function (topicId) { return MP.exbank.generate(topicId, pickDifficulty()); });
    exam = {
      questions: questions, index: 0, answers: new Array(questions.length).fill(null),
      startTime: Date.now(), timerId: null, topicsLabel: topics.map(function (id) { return topicMeta(id).title; }).join(', ')
    };
    if (cfg.timer) startTimerLoop();
    renderQuestion();
  }

  function startTimerLoop() {
    exam.timerId = setInterval(function () {
      var elDisplay = document.getElementById('exam-timer-display');
      if (!elDisplay) { clearInterval(exam.timerId); return; }
      var secs = Math.floor((Date.now() - exam.startTime) / 1000);
      elDisplay.textContent = '⏱ ' + fmtTime(secs);
    }, 1000);
  }
  function fmtTime(totalSecs) {
    var m = Math.floor(totalSecs / 60), s = totalSecs % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function renderQuestion() {
    var q = exam.questions[exam.index];
    var meta = topicMeta(q.topicId);
    el.content.innerHTML =
      '<div class="inner">' +
      '<div class="practice-progress">' +
      '<span class="muted small">Pregunta ' + (exam.index + 1) + ' de ' + exam.questions.length + '</span>' +
      (cfg.timer ? '<span class="muted small mono" id="exam-timer-display" style="margin-left:10px">⏱ 00:00</span>' : '') +
      '<div class="progress-track"><div class="progress-fill" style="width:' + Math.round(100 * exam.index / exam.questions.length) + '%"></div></div>' +
      '</div>' +
      '<div class="card example-card" id="exam-card"></div>' +
      '</div>';

    MP.widgets.renderExercise(document.getElementById('exam-card'), q, {
      showTopic: true, topicLabel: meta.title,
      onResult: function (res) { exam.answers[exam.index] = res; },
      onNext: function () {
        exam.index++;
        if (exam.index >= exam.questions.length) finishExam(); else renderQuestion();
      },
      nextLabel: (exam.index + 1 >= exam.questions.length) ? 'Ver resultados' : 'Siguiente pregunta'
    });
  }

  function finishExam() {
    if (exam.timerId) clearInterval(exam.timerId);
    var correct = exam.answers.filter(function (a) { return a && a.correct; }).length;
    var total = exam.questions.length;
    var elapsed = Math.floor((Date.now() - exam.startTime) / 1000);
    var missedTopics = [];
    exam.answers.forEach(function (a, i) {
      if (a && !a.correct && missedTopics.indexOf(exam.questions[i].topicId) < 0) missedTopics.push(exam.questions[i].topicId);
    });

    MP.profiles.recordExam({
      date: Date.now(), score: correct, total: total,
      topicsLabel: exam.topicsLabel, difficulty: cfg.difficulty,
      missedTopicIds: missedTopics, timeSeconds: cfg.timer ? elapsed : null
    });

    var pct = total ? Math.round(100 * correct / total) : 0;
    var html = '<div class="inner">';
    html += '<div class="exam-result-head">🎓 Mini examen terminado</div>';
    html += '<div class="result-summary"><div class="result-score">' + correct + ' / ' + total + '</div>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="muted small" style="margin-top:6px">' + pct + '% correcto' +
      (cfg.timer ? ' · tiempo ' + fmtTime(elapsed) : '') + '</div></div>';

    html += '<div class="btn-row" style="margin:14px 0">' +
      '<span class="chip accent">✓ ' + correct + ' correctas</span>' +
      '<span class="chip">✗ ' + (total - correct) + ' incorrectas</span></div>';

    html += '<div class="section-heading">Revisión</div><div id="exam-review"></div>';

    html += '<div class="btn-row" style="margin-top:16px">' +
      '<button class="btn primary" id="exam-repeat">Repetir examen</button>';
    if (missedTopics.length) html += '<button class="btn" id="exam-practice-errors">Practicar mis errores</button>';
    html += '<button class="btn ghost" id="exam-home">Volver a configurar</button></div>';
    html += '</div>';

    el.content.innerHTML = html;

    var reviewBox = document.getElementById('exam-review');
    exam.questions.forEach(function (q, i) {
      var a = exam.answers[i] || { correct: false, gaveUp: true };
      var row = document.createElement('div');
      row.className = 'exam-review-item';
      row.innerHTML = '<button class="exam-review-head">' +
        '<span class="' + (a.correct ? 'ok' : 'bad') + '">' + (a.correct ? '✓' : '✗') + '</span>' +
        '<span class="exam-review-prompt">' + q.prompt + '</span></button>' +
        '<div class="exam-review-body" hidden>' +
        '<div class="result-line"><span class="tag">Respuesta correcta</span><span class="val">' + R.esc(q.answerText) + '</span></div>' +
        (q.steps && q.steps.length ? '<div class="steps">' + q.steps.map(function (s) {
          return '<div class="step"><div><div class="why">' + s.why + '</div><div class="what">' + s.html + '</div></div></div>';
        }).join('') + '</div>' : '') + '</div>';
      var head = row.querySelector('.exam-review-head');
      var body = row.querySelector('.exam-review-body');
      head.onclick = function () { body.hidden = !body.hidden; };
      reviewBox.appendChild(row);
    });

    document.getElementById('exam-repeat').onclick = startExam;
    document.getElementById('exam-home').onclick = function () { exam = null; renderConfig(); };
    var errBtn = document.getElementById('exam-practice-errors');
    if (errBtn) errBtn.onclick = function () {
      MP.app.switchTool('practice');
      MP.tools.practice.startTopics(missedTopics, 'basico', Math.max(6, missedTopics.length * 2));
      MP.app.toast('Practicando los temas donde fallaste');
    };
  }

  function init() {
    el.content = document.getElementById('exam-content');
    cfg.topics = [];
    renderConfig();
  }

  MP.tools = MP.tools || {};
  MP.tools.exams = { init: init, reset: function () { exam = null; cfg.topics = []; renderConfig(); } };
})(window.MP = window.MP || {});

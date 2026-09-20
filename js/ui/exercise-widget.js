/* ── Widget de ejercicio ──────────────────────────────────────
   Una sola pieza de interfaz reutilizada por Practica y por
   Mini exámenes: enunciado, entrada según el tipo, pista
   progresiva, comprobación real vía MP.exengine.checkAnswer,
   reintento y procedimiento. Nunca revela la respuesta antes de
   que el usuario compruebe al menos una vez.                    */
(function (MP) {
  'use strict';
  var R = MP.render;

  function stepsHTML(steps) {
    if (!steps || !steps.length) return '<div class="muted small">Sin procedimiento detallado para este ejercicio.</div>';
    return '<div class="steps">' + steps.map(function (s) {
      return '<div class="step"><div><div class="why">' + s.why + '</div><div class="what">' + s.html + '</div></div></div>';
    }).join('') + '</div>';
  }

  /** Quita un "+ C" final antes de comprobar una respuesta algebraica (el motor no reconoce la letra C). */
  function stripPlusC(text) {
    return String(text).replace(/\+\s*c\s*$/i, '').trim();
  }

  /**
   * Renderiza un ejercicio dentro de `container` (un elemento vacío).
   * options.onResult(state) se llama una vez resuelto (acertado o rendido),
   * con { correct, attempts, hintsUsed, gaveUp, topicId, difficulty }.
   * options.showTopic: si se muestra un chip con el tema (útil en exámenes mixtos).
   */
  function render(container, question, options) {
    options = options || {};
    var state = { attempts: 0, hintsUsed: 0, done: false, gaveUp: false };

    container.innerHTML =
      (options.showTopic ? '<div class="ex-meta"><span class="chip">' + R.esc(options.topicLabel || question.topicId) + '</span>' +
        '<span class="chip">' + MP.exbank.difficultyLabel(question.difficulty) + '</span></div>' : '') +
      '<div class="ex-prompt">' + question.prompt + '</div>' +
      '<div class="ex-input" id="ex-input-area"></div>' +
      '<div class="ex-hints" id="ex-hints"></div>' +
      '<div class="ex-feedback" id="ex-feedback"></div>' +
      '<div class="btn-row ex-actions" id="ex-actions"></div>' +
      '<div class="ex-procedure" id="ex-procedure" hidden></div>';

    var inputArea = container.querySelector('#ex-input-area');
    var hintsBox = container.querySelector('#ex-hints');
    var feedback = container.querySelector('#ex-feedback');
    var actions = container.querySelector('#ex-actions');
    var procBox = container.querySelector('#ex-procedure');

    var getAnswer = null; // función que lee la respuesta actual del usuario
    var selectedChoice = null;

    if (question.type === 'numeric' || question.type === 'algebraic') {
      inputArea.innerHTML = '<input type="text" class="field" id="ex-text-input" placeholder="Tu respuesta" autocomplete="off" spellcheck="false">';
      var textInput = inputArea.querySelector('#ex-text-input');
      textInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); onCheck(); } });
      getAnswer = function () { return textInput.value; };
    } else if (question.type === 'mc') {
      inputArea.innerHTML = '<div class="ex-choices">' + question.options.map(function (o) {
        return '<button class="ex-choice" data-choice="' + o.id + '">' +
          '<span class="ex-choice-letter">' + o.id.toUpperCase() + '</span>' +
          '<span class="ex-choice-label">' + R.esc(o.label) + '</span></button>';
      }).join('') + '</div>';
      Array.prototype.forEach.call(inputArea.querySelectorAll('.ex-choice'), function (b) {
        b.onclick = function () {
          selectedChoice = b.getAttribute('data-choice');
          Array.prototype.forEach.call(inputArea.querySelectorAll('.ex-choice'), function (x) { x.classList.remove('picked'); });
          b.classList.add('picked');
        };
      });
      getAnswer = function () { return selectedChoice; };
    } else if (question.type === 'tf') {
      inputArea.innerHTML = '<div class="ex-choices tf">' +
        '<button class="ex-choice" data-choice="true">Verdadero</button>' +
        '<button class="ex-choice" data-choice="false">Falso</button></div>';
      Array.prototype.forEach.call(inputArea.querySelectorAll('.ex-choice'), function (b) {
        b.onclick = function () {
          selectedChoice = b.getAttribute('data-choice') === 'true';
          Array.prototype.forEach.call(inputArea.querySelectorAll('.ex-choice'), function (x) { x.classList.remove('picked'); });
          b.classList.add('picked');
        };
      });
      getAnswer = function () { return selectedChoice; };
    }

    function renderHints() {
      if (state.hintsUsed === 0) { hintsBox.innerHTML = ''; return; }
      hintsBox.innerHTML = question.hints.slice(0, state.hintsUsed).map(function (h, i) {
        return '<div class="hint-box"><b>Pista ' + (i + 1) + ':</b> ' + R.esc(h) + '</div>';
      }).join('');
    }

    function finish(correct, gaveUp) {
      state.done = true;
      state.gaveUp = !!gaveUp;
      container.classList.add('ex-done');
      Array.prototype.forEach.call(inputArea.querySelectorAll('input,button'), function (n) { n.disabled = true; });
      procBox.hidden = false;
      procBox.innerHTML = '<div class="label">Procedimiento</div>' + stepsHTML(question.steps) +
        '<div class="result-line"><span class="tag">Respuesta correcta</span><span class="val">' +
        R.esc(question.answerText) + '</span></div>';
      if (typeof options.onResult === 'function') {
        options.onResult({
          correct: !!correct, attempts: state.attempts, hintsUsed: state.hintsUsed, gaveUp: state.gaveUp,
          topicId: question.topicId, difficulty: question.difficulty
        });
      }
      renderActions();
    }

    function renderActions() {
      actions.innerHTML = '';
      if (state.done) {
        if (options.onNext) {
          var nextBtn = document.createElement('button');
          nextBtn.className = 'btn primary';
          nextBtn.textContent = options.nextLabel || 'Siguiente';
          nextBtn.onclick = options.onNext;
          actions.appendChild(nextBtn);
        }
        return;
      }
      var checkBtnEl = document.createElement('button');
      checkBtnEl.className = 'btn primary';
      checkBtnEl.textContent = 'Comprobar';
      checkBtnEl.onclick = onCheck;
      actions.appendChild(checkBtnEl);

      if (state.hintsUsed < question.hints.length) {
        var hintBtn = document.createElement('button');
        hintBtn.className = 'btn ghost';
        hintBtn.textContent = state.hintsUsed === 0 ? 'Ver pista' : 'Otra pista';
        hintBtn.onclick = function () { state.hintsUsed++; renderHints(); renderActions(); };
        actions.appendChild(hintBtn);
      }
      if (state.attempts > 0) {
        var giveUpBtn = document.createElement('button');
        giveUpBtn.className = 'btn ghost';
        giveUpBtn.textContent = 'Mostrar procedimiento';
        giveUpBtn.onclick = function () { feedback.innerHTML = ''; finish(false, true); };
        actions.appendChild(giveUpBtn);
      }
    }

    function onCheck() {
      var raw = getAnswer ? getAnswer() : null;
      if (raw === null || raw === undefined || raw === '') {
        feedback.innerHTML = '<div class="hint-box">Escribe o elige una respuesta antes de comprobar.</div>';
        return;
      }
      var toCheck = (question.type === 'algebraic') ? stripPlusC(raw) : raw;
      var correct = false;
      try { correct = MP.exengine.checkAnswer(question, toCheck); } catch (e) { correct = false; }
      state.attempts++;

      if (correct) {
        feedback.innerHTML = '<div class="ex-verdict ok">✅ Correcto</div>';
        finish(true, false);
      } else {
        feedback.innerHTML = '<div class="ex-verdict bad">❌ Incorrecto' +
          (state.attempts === 1 ? ' — puedes pedir una pista o intentarlo de nuevo.' : '') + '</div>';
        renderActions();
      }
    }

    renderHints();
    renderActions();
    setTimeout(function () {
      var first = inputArea.querySelector('input, .ex-choice');
      if (first && first.focus) first.focus();
    }, 0);
  }

  MP.widgets = MP.widgets || {};
  MP.widgets.renderExercise = render;
})(window.MP = window.MP || {});

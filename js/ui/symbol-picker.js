/* Literal mathematical symbols; expression validation belongs to each tool. */
(function (MP) {
  'use strict';
  var target = null, start = 0, end = 0, trigger, panel;
  var hint, hintDismissed = false, touchOnly;
  function refreshHint() {
    var visible = !hintDismissed && !touchOnly.matches;
    hint.hidden = !visible;
    if (visible) trigger.setAttribute('aria-describedby', 'symbol-hint-text');
    else trigger.removeAttribute('aria-describedby');
  }
  function dismissHint() {
    // Only return focus if the user deliberately activated the dismiss button.
    var restore = hint.contains(document.activeElement);
    hintDismissed = true;
    try { localStorage.setItem('mp.symbolHintDismissed', '1'); } catch (e) {}
    refreshHint();
    if (restore) trigger.focus();
  }
  function eligible(field) {
    return field && field.hasAttribute('data-math-input') &&
      !field.disabled && !field.readOnly && field.isConnected && field.getClientRects().length;
  }
  function remember(field) {
    if (!eligible(field)) return;
    target = field;
    start = field.selectionStart;
    end = field.selectionEnd;
  }
  function close(restore) {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (restore) trigger.focus();
  }
  function insert(symbol) {
    if (!eligible(target)) { close(true); return; }
    var field = target, from = start, to = end, emitted = false;
    field.focus();
    field.setSelectionRange(from, to);
    function onInput() { emitted = true; }
    field.addEventListener('input', onInput);
    var inserted = false;
    try { inserted = document.execCommand && document.execCommand('insertText', false, symbol); }
    catch (e) { /* Browsers without native text editing use the range fallback. */ }
    field.removeEventListener('input', onInput);
    if (!inserted && !emitted) field.setRangeText(symbol, from, to, 'end');
    if (!emitted) field.dispatchEvent(new Event('input', { bubbles: true }));
    remember(field);
    close(false);
  }
  function init() {
    trigger = document.getElementById('symbol-btn');
    panel = document.getElementById('symbol-panel');
    hint = document.getElementById('symbol-hint');
    try { hintDismissed = localStorage.getItem('mp.symbolHintDismissed') === '1'; } catch (e) {}
    touchOnly = window.matchMedia('(hover: none) and (pointer: coarse)');
    refreshHint();
    if (touchOnly.addEventListener) touchOnly.addEventListener('change', function () {
      close(false);
      refreshHint();
    });
    document.getElementById('symbol-hint-dismiss').onclick = dismissHint;
    ['focusin', 'select', 'keyup', 'pointerup', 'input'].forEach(function (type) {
      document.addEventListener(type, function (e) { remember(e.target); });
    });
    document.addEventListener('selectionchange', function () { remember(document.activeElement); });
    trigger.onclick = function () {
      if (!panel.hidden) { close(false); return; }
      if (!eligible(target)) return;
      dismissHint();
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      panel.querySelector('button').focus();
    };
    Array.prototype.forEach.call(panel.querySelectorAll('button'), function (button) {
      button.onclick = function () { insert(button.textContent); };
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!panel.hidden) { e.preventDefault(); close(true); }
      else if (!hint.hidden) dismissHint();
    });
    document.addEventListener('pointerdown', function (e) {
      if (!panel.contains(e.target) && !trigger.contains(e.target)) close(false);
    });
    document.addEventListener('focusin', function (e) {
      if (!panel.contains(e.target) && e.target !== trigger) close(false);
    });
  }
  MP.symbolPicker = { init: init, close: function () { close(false); } };
})(window.MP = window.MP || {});

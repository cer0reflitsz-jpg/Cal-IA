/* ── Cine ─────────────────────────────────────────────────────
   Pantalla de carga, tono de color dinámico (--hue) y escenas
   de la portada. No toca la lógica de ninguna herramienta:
   app.js sólo le avisa del cambio de sección (MP.fx.onTool).   */
(function (MP) {
  'use strict';

  var root = document.documentElement;
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ── Tono dinámico ──────────────────────────────────────────
     En la portada el tono deriva solo; en cada herramienta se
     asienta suavemente en el suyo.                              */
  var TOOL_HUE = { home: 165, graph: 165, geometry: 210, calculator: 275, algebra: 25, learn: 335, practice: 130, exams: 48 };
  var hue = 165, target = 165, mode = 'tween', last = 0, raf = 0;
  var loading = true, currentTool = 'home';

  function setHue(h) {
    hue = ((h % 360) + 360) % 360;
    root.style.setProperty('--hue', hue.toFixed(1));
  }

  function frame(now) {
    raf = 0;
    if (loading) return;
    var dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (mode === 'drift') {
      setHue(hue + dt * 9);
    } else {
      var d = ((target - hue + 540) % 360) - 180;
      if (Math.abs(d) < 0.3) { setHue(target); return; }
      setHue(hue + d * (1 - Math.exp(-dt * 3.5)));
    }
    raf = requestAnimationFrame(frame);
  }

  function onTool(id, silent) {
    currentTool = id;
    if (loading) return;
    if (!silent) chapter(id);
    target = TOOL_HUE[id] != null ? TOOL_HUE[id] : 165;
    if (reduced) { setHue(target); return; }
    mode = id === 'home' ? 'drift' : 'tween';
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  /* ── Efectos globales: capítulo, ondulación, luz, interruptor ──
     Se apagan con el botón ✦ (se recuerda) o con "reducir movimiento". */
  var GLYPH = {
    home: 'M60 6a24 24 0 1 0 .1 0',
    graph: 'M2 30C17 -2 32 -2 47 30S77 62 92 30S107 -2 118 30',
    geometry: 'M12 54L60 6l48 48z',
    calculator: 'M18 30h34M35 13v34M70 22h34M70 40h34',
    algebra: 'M74 6C62 2 60 12 60 24v14c0 14-8 18-16 14',
    learn: 'M14 10h92v42H14zM60 10v42',
    practice: 'M22 32l26 20 52-42',
    exams: 'M60 6l54 22-54 22L6 28zM28 38v14c22 10 42 10 64 0V38'
  };
  var ORDER = ['home', 'graph', 'geometry', 'calculator', 'algebra', 'learn', 'practice', 'exams'];
  var chapterEl = null, chapterTimer = 0;

  function fxOff() { return root.classList.contains('no-fx') || reduced; }

  function chapter(id) {
    var ws = document.querySelector('.workspace'), title = document.getElementById('tool-title');
    if (title && !fxOff()) { title.classList.remove('swap'); void title.offsetWidth; title.classList.add('swap'); }
    if (!ws || fxOff() || id === 'home') return;
    if (!chapterEl) {
      chapterEl = document.createElement('div');
      chapterEl.className = 'chapter';
      chapterEl.setAttribute('aria-hidden', 'true');
      chapterEl.innerHTML = '<div class="chapter-wipe"></div><div class="chapter-body">' +
        '<svg viewBox="0 0 120 60"><path pathLength="1"></path></svg><div class="chapter-num"></div><div class="chapter-title"></div></div>';
      ws.appendChild(chapterEl);
    }
    chapterEl.querySelector('path').setAttribute('d', GLYPH[id] || GLYPH.home);
    chapterEl.querySelector('.chapter-num').textContent = '0' + ORDER.indexOf(id) + ' / 07';
    chapterEl.querySelector('.chapter-title').textContent = MP.i18n.t('tool.' + id);
    chapterEl.classList.remove('play');
    void chapterEl.offsetWidth;
    chapterEl.classList.add('play');
    clearTimeout(chapterTimer);
    chapterTimer = setTimeout(function () { chapterEl.classList.remove('play'); }, 1000);
  }

  function initFx() {
    // ondulación al pulsar
    document.addEventListener('pointerdown', function (e) {
      if (fxOff() || !e.target.closest) return;
      var b = e.target.closest('.btn, .key, .tool-btn, .nav-item, .topic-btn, .practice-topic-chip, .ex-choice');
      if (!b) return;
      var r = b.getBoundingClientRect(), rp = document.createElement('span');
      rp.className = 'ripple';
      rp.style.left = (e.clientX - r.left) + 'px';
      rp.style.top = (e.clientY - r.top) + 'px';
      b.appendChild(rp);
      setTimeout(function () { if (rp.parentNode) rp.parentNode.removeChild(rp); }, 700);
    });

    // luz que sigue al cursor (un solo elemento: no recalcula estilos)
    var glow = document.createElement('div');
    glow.className = 'cursor-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);
    var gx = 0, gy = 0, tx = 0, ty = 0, gr = 0;
    function glide() {
      gx += (tx - gx) * 0.14; gy += (ty - gy) * 0.14;
      glow.style.transform = 'translate(' + gx.toFixed(1) + 'px,' + gy.toFixed(1) + 'px)';
      gr = (Math.abs(tx - gx) + Math.abs(ty - gy) > 0.5) ? requestAnimationFrame(glide) : 0;
    }
    document.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!gr && !fxOff()) gr = requestAnimationFrame(glide);
    }, { passive: true });

    // interruptor de efectos
    var btn = document.getElementById('fx-btn');
    function paint() {
      var on = !root.classList.contains('no-fx');
      if (!btn) return;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.title = MP.i18n.t(on ? 'fxOn' : 'fxOff');
      btn.setAttribute('aria-label', btn.title);
    }
    if (btn) btn.onclick = function () {
      root.classList.toggle('no-fx');
      try { localStorage.setItem('mp.fx', root.classList.contains('no-fx') ? 'off' : 'on'); } catch (e) { /* modo privado */ }
      paint();
    };
    document.addEventListener('mp:languagechange', paint);
    paint();
  }

  /* ── Pantalla de carga ─────────────────────────────────────── */
  var FORMULAS = ['∫ x² dx', 'Σ n = n(n+1)/2', 'e^{iπ} + 1 = 0', '√2 ≈ 1.4142', 'a² + b² = c²', 'lim x→∞', 'd/dx sin x = cos x'];

  function runLoader() {
    var L = document.getElementById('loader');
    if (!L) { loading = false; root.classList.remove('is-loading'); return; }
    var seen = false;
    try { seen = sessionStorage.getItem('mp.seen') === '1'; sessionStorage.setItem('mp.seen', '1'); } catch (e) { /* modo privado */ }
    var dur = reduced ? 350 : (seen ? 900 : 2900);
    var count = document.getElementById('loader-count');
    var fill = document.getElementById('loader-fill');
    var formula = document.getElementById('loader-formula');
    var t0 = performance.now(), fi = -1, finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      loading = false;
      L.classList.add('done');
      root.classList.remove('is-loading');
      onTool(currentTool, true);
      setTimeout(function () { if (L.parentNode) L.parentNode.removeChild(L); }, 1400);
    }
    function step(now) {
      var p = Math.min(1, (now - t0) / dur);
      var e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      if (!reduced) setHue(165 + e * 330);
      count.textContent = ('00' + Math.round(e * 100)).slice(-3);
      fill.style.transform = 'scaleX(' + e + ')';
      var idx = Math.min(FORMULAS.length - 1, Math.floor(p * FORMULAS.length));
      if (idx !== fi) {
        fi = idx;
        formula.textContent = FORMULAS[idx];
        formula.classList.remove('pop');
        void formula.offsetWidth;
        formula.classList.add('pop');
      }
      if (p < 1) requestAnimationFrame(step); else finish();
    }
    requestAnimationFrame(step);
    setTimeout(finish, dur + 3000); // pestaña en segundo plano: no quedarse atascado
  }

  /* ── Escenas de la portada ─────────────────────────────────── */
  var SYMBOLS = ['π', '∑', '∫', '√', 'θ', '∞', 'Δ', 'x²', 'ƒ', '≈', 'λ', 'e'];
  var cleanup = null;

  function countUp(node) {
    Array.prototype.forEach.call(node.querySelectorAll ? node.querySelectorAll('.chip') : [], function (chip) {
      var m = /^(\d+)(.*)$/.exec(chip.textContent);
      if (!m || reduced) return;
      var n = +m[1], rest = m[2], t0 = performance.now();
      (function tick(now) {
        var p = Math.min(1, (now - t0) / 1100);
        chip.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))) + rest;
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }

  function mountHome(pane) {
    if (cleanup) cleanup();
    var undo = [];
    var hero = pane.querySelector('.hero-stage');
    var canvas = pane.querySelector('.hero-canvas');
    var items = pane.querySelectorAll('.reveal');

    // Aparición con el scroll
    if (!('IntersectionObserver' in window) || reduced) {
      Array.prototype.forEach.call(items, function (n) { n.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add('in');
          if (en.target.classList.contains('stat-row')) countUp(en.target);
          io.unobserve(en.target);
        });
      }, { root: pane, threshold: 0.12 });
      Array.prototype.forEach.call(items, function (n) { io.observe(n); });
      undo.push(function () { io.disconnect(); });
    }

    // Tarjetas: foco de luz y giro 3D que siguen al puntero
    Array.prototype.forEach.call(pane.querySelectorAll('.feature-card'), function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        if (!reduced) {
          card.style.setProperty('--rx', ((0.5 - py) * 7).toFixed(2) + 'deg');
          card.style.setProperty('--ry', ((px - 0.5) * 9).toFixed(2) + 'deg');
        }
      });
      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });

    if (!hero || !canvas || !canvas.getContext) { cleanup = function () { undo.forEach(function (f) { f(); }); }; return; }

    // Paralaje con el scroll
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        hero.style.setProperty('--p', Math.min(1, pane.scrollTop / (hero.offsetHeight || 1)).toFixed(3));
      });
    }
    pane.addEventListener('scroll', onScroll, { passive: true });
    undo.push(function () { pane.removeEventListener('scroll', onScroll); });

    // Lienzo: ondas que reaccionan al puntero y símbolos a la deriva
    var ctx = canvas.getContext('2d');
    var w = 0, h = 0, mx = -1e4, my = 0, visible = false, id = 0, prev = 0;
    var syms = [];
    for (var i = 0; i < 28; i++) {
      syms.push({ x: Math.random(), y: Math.random(), s: 14 + Math.random() * 30, v: 0.008 + Math.random() * 0.03, ch: SYMBOLS[i % SYMBOLS.length], ph: Math.random() * 6.28 });
    }
    function size() {
      var r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw(now) {
      id = 0;
      if (!visible || !w) return;
      var t = reduced ? 3 : now / 1000, dt = Math.min(0.05, (now - prev) / 1000 || 0);
      prev = now;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (var k = 0; k < 7; k++) {
        var base = h * (0.56 + k * 0.014), amp = 24 + k * 9, f = 0.0042 + k * 0.0008, sp = 0.5 + k * 0.13;
        ctx.beginPath();
        for (var x = 0; x <= w + 8; x += 8) {
          var near = Math.exp(-Math.pow((x - mx) / 170, 2));
          var y = base + Math.sin(x * f + t * sp + k) * amp + Math.sin(x * f * 2.3 - t * sp * 0.7) * amp * 0.4;
          y += (my - y) * near * 0.4;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'hsla(' + ((hue + k * 22) % 360).toFixed(0) + ',92%,' + (56 + k * 2) + '%,' + (0.62 - k * 0.07).toFixed(2) + ')';
        ctx.lineWidth = k === 0 ? 2.4 : 1.3;
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.textAlign = 'center';
      for (var j = 0; j < syms.length; j++) {
        var s = syms[j];
        if (!reduced) { s.y -= s.v * dt; if (s.y < -0.06) s.y = 1.06; }
        ctx.font = 'italic ' + s.s + 'px Cambria, Georgia, serif';
        ctx.fillStyle = 'hsla(' + ((hue + s.ph * 25) % 360).toFixed(0) + ',85%,72%,' + (0.1 + 0.1 * Math.sin(t + s.ph)).toFixed(3) + ')';
        ctx.fillText(s.ch, s.x * w + Math.sin(t * 0.3 + s.ph) * 16, s.y * h);
      }
      if (!reduced) id = requestAnimationFrame(draw);
    }
    function start() { if (!id && visible) { prev = performance.now(); id = requestAnimationFrame(draw); } }

    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
      hero.style.setProperty('--mx', mx + 'px');
      hero.style.setProperty('--my', my + 'px');
    });
    hero.addEventListener('pointerleave', function () { mx = -1e4; });

    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { size(); start(); });
      ro.observe(canvas);
      undo.push(function () { ro.disconnect(); });
    } else { size(); }
    if ('IntersectionObserver' in window) {
      var vo = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; start(); }, { root: pane });
      vo.observe(hero);
      undo.push(function () { vo.disconnect(); });
    } else { visible = true; start(); }
    undo.push(function () { if (id) cancelAnimationFrame(id); id = 0; visible = false; });
    cleanup = function () { undo.forEach(function (f) { f(); }); cleanup = null; };
  }

  MP.fx = { onTool: onTool, mountHome: mountHome };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initFx); else initFx();
  runLoader();
})(window.MP = window.MP || {});

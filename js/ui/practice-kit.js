/* ── Kit visual de Practica y Mini exámenes ───────────────────
   Piezas de interfaz compartidas: puntos de progreso, anillo de
   puntaje, barras por tema, bloque de enlaces y confeti. Sólo
   devuelven HTML o animan elementos; no conocen las reglas del
   ejercicio.                                                    */
(function (MP) {
  'use strict';

  var ICON = { wiki: 'fa-brands fa-wikipedia-w', khan: 'fa-solid fa-graduation-cap', video: 'fa-brands fa-youtube' };

  function esc(s) { return MP.render ? MP.render.esc(s) : String(s); }
  function motionOff() {
    var r = document.documentElement;
    return (r.classList && r.classList.contains('no-fx')) ||
      !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /** Bloque "Profundiza en este tema" con enlaces en español e inglés. */
  function resourcesHTML(topicId, title, compact) {
    var list = MP.resources ? MP.resources.links(topicId) : [];
    if (!list.length) return '';
    var html = '<div class="res-block' + (compact ? ' compact' : '') + '">' +
      '<div class="res-title"><i class="fa-solid fa-book-open" aria-hidden="true"></i> ' + esc(title || 'Profundiza en este tema') + '</div>' +
      '<div class="res-grid">';
    list.forEach(function (l, i) {
      html += '<a class="res-link" style="--si:' + i + '" href="' + l.url + '" target="_blank" rel="noopener noreferrer" ' +
        'title="' + esc(l.label + ' (' + (l.lang === 'ES' ? 'español' : 'English') + ')') + '">' +
        '<i class="' + ICON[l.site] + '" aria-hidden="true"></i>' +
        '<span class="res-name">' + esc(l.label) + '</span>' +
        '<span class="res-lang">' + l.lang + '</span></a>';
    });
    return html + '</div></div>';
  }

  /** Puntos de progreso: results[i] = true | false | undefined. */
  function stepperHTML(results, current, total) {
    var html = '<div class="stepper" role="img" aria-label="' + (current < 0 ? 'Resultado de cada pregunta' : 'Pregunta ' + (current + 1) + ' de ' + total) + '">';
    for (var i = 0; i < total; i++) {
      var r = results[i];
      var cls = r === true ? 'ok' : (r === false ? 'bad' : (i === current ? 'cur' : ''));
      html += '<span class="dot ' + cls + '" style="--si:' + i + '"></span>';
    }
    return html + '</div>';
  }

  /** Mensaje y tono según el porcentaje. */
  function grade(pct) {
    if (pct >= 90) return { tone: 'hi', icon: '🏆', title: '¡Impecable!' };
    if (pct >= 70) return { tone: 'hi', icon: '🎯', title: '¡Muy bien!' };
    if (pct >= 50) return { tone: 'mid', icon: '💪', title: 'Vas por buen camino' };
    return { tone: 'lo', icon: '🌱', title: 'A seguir practicando' };
  }

  /** Anillo animado con el puntaje al centro. */
  function ringHTML(correct, total) {
    var pct = total ? Math.round(100 * correct / total) : 0, C = 2 * Math.PI * 52;
    var g = grade(pct);
    return '<div class="ring tone-' + g.tone + '">' +
      '<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-bg" cx="60" cy="60" r="52"></circle>' +
      '<circle class="ring-fg" cx="60" cy="60" r="52" style="stroke-dasharray:' + C.toFixed(1) + ';stroke-dashoffset:' + (C * (1 - pct / 100)).toFixed(1) + ';--circ:' + C.toFixed(1) + '"></circle></svg>' +
      '<div class="ring-center"><div class="result-score" data-countup="' + correct + '" data-total="' + total + '">' + correct + ' / ' + total + '</div>' +
      '<div class="ring-pct">' + pct + '%</div></div></div>';
  }

  /** Barras por tema: rows = [{ label, correct, total }]. */
  function breakdownHTML(rows) {
    if (!rows.length) return '';
    var html = '<div class="breakdown">';
    rows.forEach(function (r, i) {
      var pct = r.total ? Math.round(100 * r.correct / r.total) : 0;
      html += '<div class="bd-row" style="--si:' + i + '"><div class="bd-head"><span>' + esc(r.label) + '</span>' +
        '<span class="muted small">' + r.correct + '/' + r.total + '</span></div>' +
        '<div class="bd-bar"><i class="' + (pct >= 70 ? 'hi' : pct >= 50 ? 'mid' : 'lo') + '" style="width:' + pct + '%"></i></div></div>';
    });
    return html + '</div>';
  }

  /** Cuenta ascendente del texto "n / total" y del porcentaje. */
  function countUp(root) {
    if (motionOff() || !root || !root.querySelectorAll || !window.requestAnimationFrame) return;
    Array.prototype.forEach.call(root.querySelectorAll('[data-countup]'), function (node) {
      var n = +node.getAttribute('data-countup'), tot = node.getAttribute('data-total'), t0 = performance.now();
      (function tick(now) {
        var p = Math.min(1, (now - t0) / 1200);
        node.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))) + ' / ' + tot;
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }

  /** Explosión de confeti desde un elemento. Falla en silencio. */
  function confetti(anchor, count) {
    try {
      if (motionOff() || !anchor || !anchor.getBoundingClientRect) return;
      var r = anchor.getBoundingClientRect();
      var box = document.createElement('div');
      box.className = 'confetti-burst';
      box.setAttribute('aria-hidden', 'true');
      box.style.left = (r.left + r.width / 2) + 'px';
      box.style.top = (r.top + Math.min(r.height / 2, 60)) + 'px';
      var n = count || 26;
      for (var i = 0; i < n; i++) {
        var b = document.createElement('i'), a = Math.random() * 6.283, d = 70 + Math.random() * 150;
        b.className = 'confetti-bit';
        b.style.setProperty('--dx', (Math.cos(a) * d).toFixed(0) + 'px');
        b.style.setProperty('--dy', (Math.sin(a) * d - 60).toFixed(0) + 'px');
        b.style.setProperty('--rot', Math.round(Math.random() * 720 - 360) + 'deg');
        b.style.setProperty('--h', Math.round(Math.random() * 360));
        box.appendChild(b);
      }
      document.body.appendChild(box);
      setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 1500);
    } catch (e) { /* adorno: nunca debe romper un ejercicio */ }
  }

  /** Pulso breve y sacudida con la Web Animations API (no chocan con las animaciones de CSS). */
  function bump(node) {
    if (!node || !node.animate || motionOff()) return;
    node.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
  }
  function shake(node) {
    if (!node || !node.animate || motionOff()) return;
    node.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(8px)' },
      { transform: 'translateX(-5px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }], { duration: 440, easing: 'ease-out' });
  }

  MP.kit = {
    bump: bump, shake: shake,
    resourcesHTML: resourcesHTML, stepperHTML: stepperHTML, ringHTML: ringHTML,
    breakdownHTML: breakdownHTML, grade: grade, countUp: countUp, confetti: confetti
  };
})(window.MP = window.MP || {});

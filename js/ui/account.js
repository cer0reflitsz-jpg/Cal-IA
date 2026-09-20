/* ── Selector de perfiles ─────────────────────────────────────
   Botón en la barra superior que abre un panel para cambiar de
   perfil, crear uno nuevo, renombrar o eliminar. Cualquier otra
   pantalla que muestre progreso debe releerlo de MP.profiles en
   cada render, así que cambiar de perfil aquí basta para que el
   resto de la aplicación quede consistente.                     */
(function (MP) {
  'use strict';
  var R = MP.render;
  var el = {}, open = false, renamingId = null;

  function initials(name) {
    var parts = String(name).trim().split(/\s+/);
    var s = (parts[0] ? parts[0][0] : '') + (parts[1] ? parts[1][0] : '');
    return s.toUpperCase() || '?';
  }

  function dot(color, letter, size) {
    size = size || 22;
    return '<span class="profile-dot" style="width:' + size + 'px;height:' + size + 'px;' +
      'font-size:' + Math.round(size * 0.42) + 'px;background:' + color + '">' + R.esc(letter) + '</span>';
  }

  function refreshButton() {
    var p = MP.profiles.active();
    if (!p) return;
    var d = el.button.querySelector('.profile-dot');
    if (d) {
      d.style.background = p.color;
      d.style.width = '20px'; d.style.height = '20px'; d.style.fontSize = '9px';
      d.textContent = initials(p.name);
    }
    el.btnName.textContent = p.name;
  }

  function renderPanel() {
    var profiles = MP.profiles.list();
    var activeId = MP.profiles.activeId();
    var html = '<div class="profile-panel-head">Perfiles en este dispositivo</div>';
    html += '<div class="profile-list">';
    profiles.forEach(function (p) {
      var isActive = p.id === activeId;
      if (renamingId === p.id) {
        html += '<div class="profile-row editing" data-id="' + p.id + '">' +
          dot(p.color, initials(p.name)) +
          '<input class="field mini profile-rename-input" value="' + R.esc(p.name) + '" data-rename="' + p.id + '">' +
          '<button class="btn sm icon" data-save-rename="' + p.id + '" title="Guardar" aria-label="Guardar nombre">✓</button>' +
          '</div>';
      } else {
        html += '<div class="profile-row' + (isActive ? ' active' : '') + '" data-id="' + p.id + '">' +
          '<button class="profile-row-main" data-switch="' + p.id + '">' +
          dot(p.color, initials(p.name)) +
          '<span class="profile-row-name">' + R.esc(p.name) + '</span>' +
          (isActive ? '<span class="chip accent sm">activo</span>' : '') +
          '</button>' +
          '<button class="btn ghost icon sm" data-rename-btn="' + p.id + '" title="Renombrar" aria-label="Renombrar perfil">✎</button>' +
          (profiles.length > 1 ? '<button class="btn ghost icon sm danger" data-remove="' + p.id + '" title="Eliminar" aria-label="Eliminar perfil">✕</button>' : '') +
          '</div>';
      }
    });
    html += '</div>';
    html += '<div class="profile-panel-foot">' +
      '<input class="field mini" id="profile-new-name" placeholder="Nombre del nuevo perfil" style="width:100%">' +
      '<button class="btn primary sm block" id="profile-new-btn" style="margin-top:6px">+ Crear perfil</button>' +
      '</div>' +
      '<div class="profile-panel-note">Los perfiles se guardan sólo en este navegador. No hay contraseña ni sincronización entre dispositivos.</div>';
    el.panel.innerHTML = html;
    bindPanelEvents();
  }

  function bindPanelEvents() {
    Array.prototype.forEach.call(el.panel.querySelectorAll('[data-switch]'), function (b) {
      b.onclick = function () {
        MP.profiles.switchTo(b.getAttribute('data-switch'));
        refreshButton();
        renderPanel();
        MP.app.toast('Perfil activo: ' + MP.profiles.active().name);
        MP.app.redrawAll();
      };
    });
    Array.prototype.forEach.call(el.panel.querySelectorAll('[data-rename-btn]'), function (b) {
      b.onclick = function () { renamingId = b.getAttribute('data-rename-btn'); renderPanel(); };
    });
    Array.prototype.forEach.call(el.panel.querySelectorAll('[data-save-rename]'), function (b) {
      var commit = function () {
        var id = b.getAttribute('data-save-rename');
        var input = el.panel.querySelector('[data-rename="' + id + '"]');
        if (input && input.value.trim()) MP.profiles.rename(id, input.value.trim());
        renamingId = null;
        refreshButton();
        renderPanel();
      };
      b.onclick = commit;
    });
    Array.prototype.forEach.call(el.panel.querySelectorAll('.profile-rename-input'), function (inp) {
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); el.panel.querySelector('[data-save-rename="' + renamingId + '"]').click(); }
      });
    });
    Array.prototype.forEach.call(el.panel.querySelectorAll('[data-remove]'), function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-remove');
        var p = MP.profiles.list().filter(function (x) { return x.id === id; })[0];
        if (p && !confirm('¿Eliminar el perfil "' + p.name + '" y todo su progreso? Esto no se puede deshacer.')) return;
        MP.profiles.remove(id);
        refreshButton();
        renderPanel();
        MP.app.redrawAll();
      };
    });
    var newBtn = document.getElementById('profile-new-btn');
    var newInput = document.getElementById('profile-new-name');
    if (newBtn) {
      newBtn.onclick = function () {
        var name = newInput.value.trim();
        if (!name) { newInput.focus(); return; }
        MP.profiles.create(name);
        refreshButton();
        renderPanel();
        MP.app.toast('Perfil "' + name + '" creado');
        MP.app.redrawAll();
      };
    }
    if (newInput) {
      newInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); newBtn.click(); } });
    }
  }

  function togglePanel(force) {
    open = force === undefined ? !open : force;
    el.panel.hidden = !open;
    el.button.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { renamingId = null; renderPanel(); }
  }

  function init() {
    el.button = document.getElementById('profile-btn');
    el.panel = document.getElementById('profile-panel');
    el.btnName = document.getElementById('profile-btn-name');

    refreshButton();
    el.button.onclick = function (e) {
      e.stopPropagation();
      if (!open && MP.app.closeMenu) MP.app.closeMenu();
      togglePanel();
    };
    document.addEventListener('click', function (e) {
      if (open && !el.panel.contains(e.target) && e.target !== el.button) togglePanel(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) togglePanel(false); });
  }

  MP.tools = MP.tools || {};
  MP.account = { init: init, refreshButton: refreshButton, closePanel: function () { togglePanel(false); } };
})(window.MP = window.MP || {});

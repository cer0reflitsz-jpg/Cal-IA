/* ── Perfiles locales ─────────────────────────────────────────
   MathPath no tiene servidor, así que "cuenta" aquí significa
   perfil guardado en este navegador, no una cuenta con
   contraseña ni sincronización entre dispositivos. Varias
   personas pueden compartir el mismo equipo y cada una mantiene
   su propio progreso, separado del resto.

   Todo el progreso (ejercicios, exámenes, cursos) se lee y
   escribe a través de este módulo, nunca con localStorage
   directo desde otro archivo — así hay un solo lugar que sabe
   cómo están organizados los datos.                             */
(function (MP) {
  'use strict';

  var KEY_INDEX = 'mp.profiles';
  var KEY_DATA_PREFIX = 'mp.pdata.';
  var COLORS = ['#0e7c66', '#2563a8', '#b3521e', '#7a3fa0', '#b3261e', '#0f7a86', '#6b7a16', '#a03f6e'];

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var v = JSON.parse(raw);
      return (v === null || v === undefined) ? fallback : v;
    } catch (e) { return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }
  function removeKey(key) {
    try { localStorage.removeItem(key); } catch (e) { /* modo privado o no soportado */ }
  }

  function emptyIndex() { return { activeId: null, list: [] }; }
  function getIndex() { return readJSON(KEY_INDEX, emptyIndex()); }
  function saveIndex(idx) { writeJSON(KEY_INDEX, idx); }

  function makeId() { return 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  function dataKey(id) { return KEY_DATA_PREFIX + id; }

  function defaultData() {
    return { practice: { attempted: 0, correct: 0, byTopic: {} }, exams: [], courses: {} };
  }

  function list() { return getIndex().list.slice(); }

  function activeId() {
    var idx = getIndex();
    if (idx.activeId && idx.list.some(function (p) { return p.id === idx.activeId; })) return idx.activeId;
    return idx.list.length ? idx.list[0].id : null;
  }

  function active() {
    var id = activeId();
    if (!id) return null;
    return getIndex().list.filter(function (p) { return p.id === id; })[0] || null;
  }

  function ensureDefault() {
    var idx = getIndex();
    if (idx.list.length === 0) {
      var p = { id: makeId(), name: 'Estudiante', color: COLORS[0], createdAt: Date.now() };
      idx.list.push(p);
      idx.activeId = p.id;
      saveIndex(idx);
      writeJSON(dataKey(p.id), defaultData());
    } else if (!idx.activeId) {
      idx.activeId = idx.list[0].id;
      saveIndex(idx);
    }
  }

  function create(name) {
    name = (name || '').trim() || 'Estudiante';
    var idx = getIndex();
    var p = { id: makeId(), name: name, color: COLORS[idx.list.length % COLORS.length], createdAt: Date.now() };
    idx.list.push(p);
    idx.activeId = p.id;
    saveIndex(idx);
    writeJSON(dataKey(p.id), defaultData());
    return p;
  }

  function switchTo(id) {
    var idx = getIndex();
    if (!idx.list.some(function (p) { return p.id === id; })) return false;
    idx.activeId = id;
    saveIndex(idx);
    return true;
  }

  function rename(id, name) {
    name = (name || '').trim();
    if (!name) return false;
    var idx = getIndex();
    var p = idx.list.filter(function (x) { return x.id === id; })[0];
    if (!p) return false;
    p.name = name;
    saveIndex(idx);
    return true;
  }

  function remove(id) {
    var idx = getIndex();
    idx.list = idx.list.filter(function (p) { return p.id !== id; });
    if (idx.activeId === id) idx.activeId = idx.list.length ? idx.list[0].id : null;
    saveIndex(idx);
    removeKey(dataKey(id));
    if (idx.list.length === 0) ensureDefault();
    return true;
  }

  function getData() {
    ensureDefault();
    return readJSON(dataKey(activeId()), defaultData());
  }
  function setData(data) {
    var id = activeId();
    return id ? writeJSON(dataKey(id), data) : false;
  }

  function recordPractice(topicId, correct) {
    var d = getData();
    d.practice.attempted++;
    if (correct) d.practice.correct++;
    if (!d.practice.byTopic[topicId]) d.practice.byTopic[topicId] = { attempted: 0, correct: 0 };
    d.practice.byTopic[topicId].attempted++;
    if (correct) d.practice.byTopic[topicId].correct++;
    setData(d);
    return d;
  }

  function recordExam(result) {
    var d = getData();
    d.exams.unshift(result);
    if (d.exams.length > 50) d.exams.length = 50;
    setData(d);
    return d;
  }

  function courseProgress(courseId) {
    return getData().courses[courseId] || { completed: [], last: null };
  }
  function markLessonComplete(courseId, lessonId) {
    var d = getData();
    if (!d.courses[courseId]) d.courses[courseId] = { completed: [], last: null };
    if (d.courses[courseId].completed.indexOf(lessonId) < 0) d.courses[courseId].completed.push(lessonId);
    d.courses[courseId].last = lessonId;
    setData(d);
    return d.courses[courseId];
  }
  function setLastLesson(courseId, lessonId) {
    var d = getData();
    if (!d.courses[courseId]) d.courses[courseId] = { completed: [], last: null };
    d.courses[courseId].last = lessonId;
    setData(d);
  }
  function unmarkLesson(courseId, lessonId) {
    var d = getData();
    if (!d.courses[courseId]) return;
    d.courses[courseId].completed = d.courses[courseId].completed.filter(function (l) { return l !== lessonId; });
    setData(d);
  }

  ensureDefault();

  MP.profiles = {
    list: list, active: active, activeId: activeId, colors: COLORS,
    create: create, switchTo: switchTo, rename: rename, remove: remove,
    getData: getData, setData: setData,
    recordPractice: recordPractice, recordExam: recordExam,
    courseProgress: courseProgress, markLessonComplete: markLessonComplete,
    setLastLesson: setLastLesson, unmarkLesson: unmarkLesson
  };
})(window.MP = window.MP || {});

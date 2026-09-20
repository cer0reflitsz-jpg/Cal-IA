/* ── Motor de ejercicios ───────────────────────────────────────
   Primitivas compartidas por todos los generadores de
   js/content/exercises.js. No depende del DOM: se puede cargar
   en Node igual que js/core, y de hecho las pruebas lo hacen así
   para machacar cada generador miles de veces.

   Principio: la respuesta correcta SIEMPRE se calcula con el
   motor matemático (MP.simplify / MP.algebra / MP.calculus /
   MP.geo) a partir de los parámetros generados — nunca se
   escribe a mano. Si el generador tiene un error, un ejercicio
   falla visiblemente en las pruebas, no en silencio para un
   estudiante real.                                              */
(function (MP) {
  'use strict';

  /** PRNG determinista (mulberry32). Con la misma semilla, la misma secuencia. */
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seedFromString(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function randInt(rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); }
  /** Entero distinto de cero en [min,max] (evita ecuaciones triviales o /0). */
  function randNonZero(rng, min, max) {
    var v; do { v = randInt(rng, min, max); } while (v === 0);
    return v;
  }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function shuffle(rng, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /** Compara dos expresiones algebraicas por equivalencia real, no por texto. */
  function algebraicEqual(userText, correctNode) {
    try {
      var userNode = MP.parse(userText);
      return MP.calculus.sampleEqual(MP.simplify(userNode), MP.simplify(correctNode),
        MP.algebra.mainVariable(correctNode, 'x'));
    } catch (e) { return false; }
  }

  /** Compara un texto con un valor o conjunto de valores numéricos, con tolerancia. */
  function numericEqual(userText, expected, tol) {
    tol = tol === undefined ? 1e-6 : tol;
    var v;
    try { v = MP.evaluate(MP.parse(String(userText).trim()), {}); } catch (e) { return false; }
    if (!isFinite(v)) return false;
    var list = Array.isArray(expected) ? expected : [expected];
    return list.some(function (e) { return Math.abs(v - e) <= tol * Math.max(1, Math.abs(e)); });
  }

  /** Construye una pregunta de opción múltiple con distractores únicos y barajados. */
  function buildMC(rng, correctLabel, distractors) {
    var pool = [correctLabel].concat(distractors.filter(function (d) { return d !== correctLabel; }));
    var seen = {}, uniq = [];
    pool.forEach(function (d) { if (!seen[d]) { seen[d] = 1; uniq.push(d); } });
    var opts = shuffle(rng, uniq).slice(0, 4);
    if (opts.indexOf(correctLabel) < 0) opts[randInt(rng, 0, opts.length - 1)] = correctLabel;
    return {
      options: opts.map(function (label, i) { return { id: String.fromCharCode(97 + i), label: label }; }),
      correctId: (function () {
        var found = 'a';
        opts.forEach(function (o, i) { if (o === correctLabel) found = String.fromCharCode(97 + i); });
        return found;
      })()
    };
  }

  /** Verifica una respuesta según el tipo de pregunta. Nunca confía en texto plano. */
  function checkAnswer(question, userAnswer) {
    switch (question.type) {
      case 'mc': return userAnswer === question.correctId;
      case 'tf': return (!!userAnswer) === (!!question.correctBool);
      case 'numeric': return numericEqual(userAnswer, question.expected, question.tol);
      case 'algebraic': return algebraicEqual(userAnswer, question.expectedNode);
    }
    return false;
  }

  MP.exengine = {
    makeRng: makeRng, seedFromString: seedFromString,
    randInt: randInt, randNonZero: randNonZero, pick: pick, shuffle: shuffle,
    algebraicEqual: algebraicEqual, numericEqual: numericEqual,
    buildMC: buildMC, checkAnswer: checkAnswer
  };
})(window.MP = window.MP || {});

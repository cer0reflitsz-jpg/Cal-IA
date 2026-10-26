/* ── Recursos externos por tema ───────────────────────────────
   Sólo datos: para cada tema del banco, la búsqueda que se
   lanza en Wikipedia, Khan Academy y YouTube, en español y en
   inglés. Son enlaces de búsqueda (no páginas escogidas una a
   una): así nunca apuntan a una dirección que ya no exista.     */
(function (MP) {
  'use strict';

  var QUERY = {
    'fracciones':             ['fracción matemática', 'fraction mathematics'],
    'potencias-raices':       ['potenciación y raíz cuadrada', 'exponents and square roots'],
    'orden-operaciones':      ['orden de las operaciones', 'order of operations'],
    'simplificar':            ['simplificar expresiones algebraicas', 'simplifying algebraic expressions'],
    'productos-notables':     ['productos notables', 'special products of binomials'],
    'factorizacion':          ['factorización de polinomios', 'factoring polynomials'],
    'ecuaciones-lineales':    ['ecuaciones lineales', 'linear equations'],
    'ecuaciones-cuadraticas': ['ecuación de segundo grado', 'quadratic equation'],
    'que-es-funcion':         ['función matemática', 'function mathematics'],
    'funcion-lineal':         ['función lineal', 'linear function'],
    'funcion-cuadratica':     ['función cuadrática', 'quadratic function'],
    'distancia':              ['distancia entre dos puntos', 'distance formula'],
    'pendiente-recta':        ['pendiente de una recta', 'slope of a line'],
    'circunferencia':         ['ecuación de la circunferencia', 'equation of a circle'],
    'pitagoras':              ['teorema de Pitágoras', 'Pythagorean theorem'],
    'trigonometria-basica':   ['razones trigonométricas', 'trigonometric ratios'],
    'que-es-derivada':        ['derivada matemática', 'derivative calculus'],
    'reglas-derivacion':      ['reglas de derivación', 'differentiation rules'],
    'que-es-integral':        ['integral cálculo', 'integral calculus']
  };

  function q(s) { return encodeURIComponent(s); }

  /** Lista de enlaces de un tema: [{ site, lang, label, url }]. */
  function links(topicId) {
    var pair = QUERY[topicId];
    if (!pair) return [];
    var es = pair[0], en = pair[1];
    return [
      { site: 'wiki',  lang: 'ES', label: 'Wikipedia', url: 'https://es.wikipedia.org/wiki/Special:Search?search=' + q(es) + '&go=Go' },
      { site: 'wiki',  lang: 'EN', label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Special:Search?search=' + q(en) + '&go=Go' },
      { site: 'khan',  lang: 'ES', label: 'Khan Academy', url: 'https://es.khanacademy.org/search?page_search_query=' + q(es) },
      { site: 'khan',  lang: 'EN', label: 'Khan Academy', url: 'https://www.khanacademy.org/search?page_search_query=' + q(en) },
      { site: 'video', lang: 'ES', label: 'Videos', url: 'https://www.youtube.com/results?search_query=' + q(es + ' explicación') },
      { site: 'video', lang: 'EN', label: 'Videos', url: 'https://www.youtube.com/results?search_query=' + q(en + ' explained') }
    ];
  }

  MP.resources = { links: links, has: function (id) { return !!QUERY[id]; } };
})(window.MP = window.MP || {});

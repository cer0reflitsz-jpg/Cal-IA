/* ── Contenido de Aprende ─────────────────────────────────────
   Sólo datos: textos e instrucciones de qué calcular. Ningún
   resultado numérico se escribe a mano aquí — js/ui/learn.js lo
   calcula con el mismo motor que usan las herramientas, así que
   nunca puede desincronizarse de lo que la aplicación hace
   realmente.
   Cada tema cubre únicamente contenido que alguna herramienta
   de la aplicación resuelve de verdad; no hay temas "de adorno". */
(function (MP) {
  'use strict';

  var TOPICS = [
    {
      name: 'Aritmética',
      items: [
        {
          id: 'fracciones',
          title: 'Fracciones',
          intuition: 'Una fracción es un reparto: 3/4 significa dividir algo en 4 partes iguales y quedarte con 3. Sumar fracciones sólo es directo cuando las partes son del mismo tamaño.',
          explanation: 'Para sumar o restar fracciones con distinto denominador, primero se convierten a un denominador común. Multiplicar es directo (numerador por numerador, denominador por denominador); dividir es multiplicar por el recíproco. Al final se simplifica dividiendo numerador y denominador por su máximo común divisor.',
          example: { kind: 'value', expr: '2/3 + 1/4' },
          action: { type: 'calculator', expr: '2/3 + 1/4' }
        },
        {
          id: 'potencias-raices',
          title: 'Potencias y raíces',
          intuition: 'Una potencia es una multiplicación repetida: 2⁵ es 2 multiplicado por sí mismo 5 veces. La raíz cuadrada hace el camino inverso: pregunta qué número, multiplicado por sí mismo, da el que tienes.',
          explanation: 'Las potencias siguen reglas fijas: aᵐ·aⁿ = aᵐ⁺ⁿ y (aᵐ)ⁿ = aᵐⁿ. Una raíz no siempre da un entero; cuando no lo hace, se deja en su forma más simple sacando fuera todo factor que sea un cuadrado perfecto.',
          example: { kind: 'value', expr: 'sqrt(72)' },
          action: { type: 'calculator', expr: 'sqrt(72)' }
        },
        {
          id: 'orden-operaciones',
          title: 'Orden de operaciones',
          intuition: 'Sin una regla común, "3 + 4 × 2²" podría leerse de más de una forma y dar resultados distintos. La convención evita esa ambigüedad.',
          explanation: 'El orden es: paréntesis primero, luego potencias y raíces, luego multiplicación y división, y por último suma y resta. Cambiar el orden con paréntesis cambia el resultado a propósito.',
          example: { kind: 'value', expr: '3 + 4*2^2', compare: '(3 + 4)*2' },
          action: { type: 'calculator', expr: '3 + 4*2^2' }
        }
      ]
    },
    {
      name: 'Álgebra',
      items: [
        {
          id: 'simplificar',
          title: 'Simplificar expresiones',
          intuition: 'Simplificar es agrupar lo que se parece: si tienes 3 manzanas y 2 manzanas más, tienes 5 manzanas, no dos cantidades sueltas.',
          explanation: 'Los términos semejantes tienen exactamente la misma parte literal (misma variable, mismo exponente). Se suman o restan sus coeficientes y la parte literal queda igual. La propiedad distributiva, a(b+c) = ab + ac, es la herramienta para abrir paréntesis antes de agrupar.',
          example: { kind: 'algebra', op: 'simplify', expr: '3x + 5 - x + 2' },
          action: { type: 'algebra', expr: '3x + 5 - x + 2', op: 'simplify' }
        },
        {
          id: 'productos-notables',
          title: 'Productos notables',
          intuition: 'Elevar un binomio al cuadrado no es elevar cada término por separado: (a+b)² no es a² + b². Se te escapa un término cruzado.',
          explanation: 'Son patrones que aparecen tan seguido que conviene reconocerlos: (a+b)² = a² + 2ab + b², (a−b)² = a² − 2ab + b², (a+b)(a−b) = a² − b². Siempre se pueden deducir aplicando la distributiva; reconocerlos sólo ahorra pasos.',
          example: { kind: 'algebra', op: 'expand', expr: '(x+3)^2' },
          action: { type: 'algebra', expr: '(x+3)^2', op: 'expand' }
        },
        {
          id: 'factorizacion',
          title: 'Factorización',
          intuition: 'Factorizar es el camino inverso de desarrollar: en vez de multiplicar para llegar a un polinomio, se busca qué multiplicación lo produce.',
          explanation: 'En x² + bx + c se buscan dos números que sumados den b y multiplicados den c: esos números son las raíces con el signo cambiado. El resultado siempre se puede comprobar desarrollándolo de nuevo — si vuelve al polinomio original, la factorización es correcta.',
          example: { kind: 'algebra', op: 'factor', expr: 'x^2 - 5x + 6' },
          action: { type: 'algebra', expr: 'x^2 - 5x + 6', op: 'factor' }
        },
        {
          id: 'ecuaciones-lineales',
          title: 'Ecuaciones lineales',
          intuition: 'Resolver una ecuación es responder: ¿qué valor de x hace que ambos lados sean iguales?',
          explanation: 'Cada operación aplicada a un lado debe aplicarse también al otro para mantener la igualdad. La estrategia es aislar x deshaciendo, en orden inverso, las operaciones que la rodean.',
          example: { kind: 'solve', expr: '4x - 9 = 19' },
          action: { type: 'algebra', expr: '4x - 9 = 19', op: 'solve' }
        },
        {
          id: 'ecuaciones-cuadraticas',
          title: 'Ecuaciones cuadráticas',
          intuition: 'Una ecuación cuadrática puede tener dos soluciones, una o ninguna real, porque una parábola puede cruzar el eje X dos veces, una vez, o ninguna.',
          explanation: 'La fórmula general x = (−b ± √(b²−4ac)) / 2a resuelve cualquier ecuación ax²+bx+c=0. El discriminante, b²−4ac, anticipa el tipo de solución: positivo da dos soluciones reales, cero da una sola, negativo da soluciones complejas.',
          example: { kind: 'solve', expr: 'x^2 - x - 6 = 0' },
          action: { type: 'algebra', expr: 'x^2 - x - 6 = 0', op: 'solve' }
        }
      ]
    },
    {
      name: 'Funciones y gráficos',
      items: [
        {
          id: 'que-es-funcion',
          title: '¿Qué es una función?',
          intuition: 'Una función es una máquina: entra un número, sale otro, siempre el mismo para la misma entrada. f(3) no puede dar dos resultados distintos.',
          explanation: 'f(x) se lee "el resultado de aplicar f a x". El conjunto de entradas válidas es el dominio; el conjunto de salidas posibles es el recorrido. Una gráfica representa la función: cada punto (x, f(x)) es un par entrada-salida.',
          example: { kind: 'function', expr: '2*x - 1', at: [-1, 0, 1, 3] },
          action: { type: 'graph', expr: '2*x - 1' }
        },
        {
          id: 'funcion-lineal',
          title: 'Función lineal',
          intuition: 'En una función lineal, cada paso igual hacia la derecha produce el mismo cambio vertical: crece o decrece a un ritmo constante.',
          explanation: 'Su forma es f(x) = mx + b. m es la pendiente: cuánto sube f(x) por cada unidad que avanza x. b es el valor de f(0), donde la recta cruza el eje Y.',
          example: { kind: 'linefit', a: [0, 1], b: [3, 7] },
          action: { type: 'graph', expr: '2x + 1' }
        },
        {
          id: 'funcion-cuadratica',
          title: 'Función cuadrática',
          intuition: 'Una función cuadrática dibuja una parábola: sube, llega a un punto extremo (el vértice), y baja simétricamente al otro lado (o al revés).',
          explanation: 'Su forma general es f(x) = ax² + bx + c. Si a > 0 la parábola abre hacia arriba y el vértice es un mínimo; si a < 0, abre hacia abajo y es un máximo. Las raíces de la función son las mismas que las soluciones de la ecuación cuadrática asociada.',
          example: { kind: 'quadratic', expr: 'x^2 - x - 6' },
          action: { type: 'graph', expr: 'x^2 - x - 6' }
        }
      ]
    },
    {
      name: 'Geometría',
      items: [
        {
          id: 'distancia',
          title: 'Distancia entre dos puntos',
          intuition: 'La distancia entre dos puntos es la longitud de la línea recta que los une: la hipotenusa de un triángulo rectángulo formado por sus diferencias en x y en y.',
          explanation: 'Si A=(x₁,y₁) y B=(x₂,y₂), la distancia es √((x₂−x₁)² + (y₂−y₁)²). Es el teorema de Pitágoras aplicado a coordenadas.',
          example: { kind: 'geom-distance', a: [1, 2], b: [4, 6] },
          action: { type: 'geometry', points: [[1, 2], [4, 6]], shape: 'segment' }
        },
        {
          id: 'pendiente-recta',
          title: 'Pendiente y ecuación de la recta',
          intuition: 'La pendiente mide qué tan inclinada está una recta: cuánto sube o baja por cada unidad que avanza horizontalmente.',
          explanation: 'Se calcula como m = (y₂−y₁)/(x₂−x₁). Con la pendiente y un punto conocido se puede escribir la ecuación completa de la recta, y = mx + b.',
          example: { kind: 'geom-slope', a: [0, 1], b: [3, 7] },
          action: { type: 'geometry', points: [[0, 1], [3, 7]], shape: 'segment' }
        },
        {
          id: 'circunferencia',
          title: 'Circunferencia',
          intuition: 'Una circunferencia es el conjunto de todos los puntos que están exactamente a la misma distancia de un centro.',
          explanation: 'Esa distancia fija es el radio. El área encerrada es πr² y la longitud del contorno es 2πr. π es la razón, siempre la misma, entre la longitud de cualquier circunferencia y su diámetro.',
          example: { kind: 'geom-circle', radius: 5 },
          action: { type: 'geometry', points: [[0, 0], [5, 0]], shape: 'circle' }
        },
        {
          id: 'pitagoras',
          title: 'Teorema de Pitágoras',
          intuition: 'En cualquier triángulo rectángulo, los cuadrados construidos sobre los dos catetos cubren, juntos, la misma área que el cuadrado construido sobre la hipotenusa.',
          explanation: 'Se escribe a² + b² = c², donde c es siempre el lado opuesto al ángulo recto. Sirve para encontrar un lado desconocido cuando se conocen los otros dos, y también para comprobar si un triángulo es realmente rectángulo.',
          example: { kind: 'geom-triangle', a: [0, 0], b: [6, 0], c: [6, 8] },
          action: { type: 'geometry', points: [[0, 0], [6, 0], [6, 8]], shape: 'polygon' }
        }
      ]
    },
    {
      name: 'Trigonometría',
      items: [
        {
          id: 'trigonometria-basica',
          title: 'Razones trigonométricas básicas',
          intuition: 'En un triángulo rectángulo, los ángulos y los lados están relacionados: cambiar un ángulo cambia la proporción entre los lados de forma predecible.',
          explanation: 'Para un ángulo agudo: seno = opuesto/hipotenusa, coseno = adyacente/hipotenusa, tangente = opuesto/adyacente. Los mismos valores se leen en el círculo unitario, donde el ángulo se mide desde el eje X positivo.',
          example: {
            kind: 'trig',
            items: [
              { label: 'sin(30°)', expr: 'sin(30)' },
              { label: 'cos(60°)', expr: 'cos(60)' },
              { label: 'tan(45°)', expr: 'tan(45)' }
            ]
          },
          action: { type: 'calculator', expr: 'sin(30)' }
        }
      ]
    },
    {
      name: 'Cálculo diferencial',
      items: [
        {
          id: 'que-es-derivada',
          title: '¿Qué es la derivada?',
          intuition: 'La derivada responde: ¿qué tan rápido está cambiando algo justo en este instante? Es la pendiente de la recta tangente en un punto, no el promedio entre dos puntos lejanos.',
          explanation: 'Se define como el límite del cociente incremental cuando el incremento tiende a cero: la pendiente entre dos puntos cada vez más cercanos. Si f(x) es una posición, f′(x) es la velocidad en ese instante.',
          example: { kind: 'derive', expr: 'x^3' },
          action: { type: 'algebra', expr: 'x^3', op: 'derive' }
        },
        {
          id: 'reglas-derivacion',
          title: 'Reglas de derivación',
          intuition: 'Calcular ese límite cada vez sería muy lento, así que existen reglas fijas según la forma de la expresión.',
          explanation: 'La regla de la potencia deriva xⁿ directamente. La regla del producto se usa cuando dos funciones se multiplican. La regla de la cadena deriva una función compuesta: la externa evaluada en la interna, multiplicada por la derivada de la interna.',
          example: { kind: 'multi-derive', items: [
            { label: 'Regla del producto', expr: 'x^2*sin(x)' },
            { label: 'Regla de la cadena', expr: 'sin(2x)' }
          ] },
          action: { type: 'algebra', expr: 'x^2*sin(x)', op: 'derive' }
        }
      ]
    },
    {
      name: 'Cálculo integral',
      items: [
        {
          id: 'que-es-integral',
          title: '¿Qué es la integral?',
          intuition: 'Si la derivada mide el cambio instantáneo, la integral hace lo contrario: acumula ese cambio. Geométricamente, es el área entre una curva y el eje X.',
          explanation: 'El teorema fundamental del cálculo conecta ambas ideas: integrar es el proceso inverso de derivar. Encontrar ∫f(x)dx es encontrar una función F(x) cuya derivada sea f(x); por eso se le suma siempre una constante C, ya que la derivada de cualquier constante es cero.',
          example: { kind: 'integrate', expr: 'x^2', definite: { a: 0, b: 1 } },
          action: { type: 'algebra', expr: 'x^2', op: 'integrate' }
        }
      ]
    }
  ];

  MP.content = { topics: TOPICS };
})(window.MP = window.MP || {});

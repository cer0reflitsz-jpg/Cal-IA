# MathPath — laboratorio de matemáticas

Herramienta web interactiva: graficador de funciones, geometría dinámica,
calculadora simbólica y álgebra con procedimiento. Sin librerías externas:
el motor matemático, el renderizador de fórmulas y el motor de dibujo son
propios.

## Ejecutar

Abre `index.html` directamente en el navegador (doble clic). No hace falta
servidor: los scripts son clásicos, no módulos ES.

Si prefieres servirlo:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Pruebas

```bash
node tests/run.js        # 66 pruebas del motor matemático
node tests/ui-smoke.js   # 16 pruebas de la interfaz (DOM mínimo propio)
```

Las pruebas no comprueban sólo que el código corra: verifican los
resultados. Las factorizaciones se desarrollan y se comparan con la
expresión original, las soluciones se sustituyen en la ecuación, las
derivadas se contrastan con el cociente incremental y las integrales se
derivan de vuelta.

## Empaquetar

```bash
node build.js   # genera dist/index.html con CSS y JS incrustados
```

El código fuente sigue repartido en archivos; `dist/` sólo existe para
poder publicar o enviar un archivo único.

## Arquitectura

Cuatro capas, de abajo arriba. Cada capa sólo conoce la anterior.

```
styles/                 tokens → base → layout → components → math
  tokens.css            colores, tipografía, tema claro y oscuro
  math.css              fracciones, radicales, exponentes

js/core/                motor matemático (no toca el DOM)
  rational.js           aritmética exacta con fracciones
  ast.js                árbol de expresiones y utilidades
  parser.js             lexer + parser (multiplicación implícita, ecuaciones)
  simplify.js           forma canónica, términos semejantes, desarrollo
  evaluate.js           evaluación numérica, grados/radianes
  render.js             AST → HTML matemático y AST → texto
  polynomial.js         polinomios, raíces racionales, factorización
  algebra.js            resolver / factorizar / desarrollar con pasos
  calculus.js           derivadas, integrales, integración numérica

js/plot/                dibujo (no conoce la interfaz)
  viewport.js           mundo ↔ pantalla, zoom, desplazamiento
  plotter.js            cuadrícula, curvas, curvas implícitas, áreas

js/geometry/
  model.js              objetos geométricos y propiedades calculadas
  canvas.js             herramientas, arrastre, selección, dibujo

js/ui/                  una herramienta por archivo
  graph.js  geometry.js  calculator.js  algebra.js
  app.js                navegación, tema, comunicación entre herramientas
```

Regla de dependencias: `core` no importa nada de `plot`, `geometry` ni
`ui`. Se puede usar el motor matemático desde Node sin navegador — es
justo lo que hacen las pruebas.

## Decisiones que conviene conocer

**Aritmética exacta.** Los números son fracciones (`Rat`), no coma
flotante. Por eso `1/3 + 1/6` da `1/2` y no `0.49999999999999994`. El
decimal se calcula sólo al final, para mostrarlo.

**El viewport guarda centro y escala**, no los cuatro límites. Así la
escala de X y de Y no puede desincronizarse y las circunferencias salen
redondas.

**Los objetos geométricos derivados no guardan coordenadas.** Un segmento
guarda los identificadores de sus dos puntos y calcula longitud y
pendiente al vuelo. Por eso arrastrar un punto actualiza todo sin
recalcular la escena.

**Las integrales tienen alcance declarado.** Cubren inmediatas, potencias
y sustitución lineal. Fuera de eso el programa lo dice en vez de inventar
una primitiva.

## Añadir una función al motor

1. `js/core/parser.js` → añádela a `FUNCTIONS`.
2. `js/core/evaluate.js` → su implementación numérica en `FN`.
3. `js/core/calculus.js` → su derivada en `DERIV_FN` y, si procede, su
   primitiva en `antiderivative`.
4. `js/core/render.js` → sólo si necesita un símbolo especial.
5. `tests/run.js` → una prueba que la contraste numéricamente.

/* ── Empaquetado ──────────────────────────────────────────────
   El código fuente vive repartido en archivos (carpetas styles
   y js). Este script produce dist/index.html con todo
   incrustado, para poder publicarlo o enviarlo como un único
   archivo. No hay minificación: el resultado sigue siendo
   legible y depurable.

   Ejecutar con:  node build.js                                  */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let out = src;

// <link rel="stylesheet" href="styles/x.css">  →  <style> … </style>
out = out.replace(/[ \t]*<link rel="stylesheet" href="([^"]+)">\n/g, (m, href) => {
  const css = fs.readFileSync(path.join(ROOT, href), 'utf8');
  return `<style>\n/* ===== ${href} ===== */\n${css}</style>\n`;
});

// <script src="js/x.js"></script>  →  <script> … </script>
out = out.replace(/[ \t]*<script src="([^"]+)"><\/script>\n/g, (m, srcPath) => {
  const js = fs.readFileSync(path.join(ROOT, srcPath), 'utf8');
  return `<script>\n/* ===== ${srcPath} ===== */\n${js}</script>\n`;
});

const distDir = path.join(ROOT, 'dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);
const outPath = path.join(distDir, 'index.html');
fs.writeFileSync(outPath, out, 'utf8');

const kb = (Buffer.byteLength(out, 'utf8') / 1024).toFixed(1);
console.log('');
console.log('  dist/index.html generado  (' + kb + ' KB, un solo archivo)');
if (/<link rel="stylesheet"|<script src=/.test(out)) {
  console.log('  AVISO: han quedado referencias externas sin incrustar');
  process.exit(1);
}
console.log('');

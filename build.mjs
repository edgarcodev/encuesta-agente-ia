import * as esbuild from 'esbuild';
import { mkdirSync, copyFileSync, readdirSync, statSync, existsSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const DIST = 'dist';

// Limpiar y recrear dist/
if (existsSync(DIST)) {
  rmSync(DIST, { recursive: true, force: true });
}
mkdirSync(DIST, { recursive: true });

// 1. Bundlear y minificar JS
await esbuild.build({
  entryPoints: ['app.js'],
  bundle: true,
  format: 'iife',
  minify: true,
  outfile: join(DIST, 'app.js'),
});
console.log('✓ dist/app.js');

// 2. Bundlear y minificar CSS
await esbuild.build({
  entryPoints: ['styles.css'],
  bundle: true,
  minify: true,
  outfile: join(DIST, 'styles.css'),
});
console.log('✓ dist/styles.css');

// 3. Copiar index.html (las rutas relativas styles.css y app.js ya apuntan
// al mismo nivel, así que en dist/ funcionan sin cambios)
copyFileSync('index.html', join(DIST, 'index.html'));
console.log('✓ dist/index.html');

// 4. Copiar images/ recursivo
function copyDirRecursive(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}
if (existsSync('images')) {
  copyDirRecursive('images', join(DIST, 'images'));
  console.log('✓ dist/images/');
}

// 5. Copiar config/preguntas/ a dist/config/preguntas/
if (existsSync('config/preguntas')) {
  copyDirRecursive('config/preguntas', join(DIST, 'config/preguntas'));
  console.log('✓ dist/config/preguntas/');
}

console.log('\nBuild completo en dist/');

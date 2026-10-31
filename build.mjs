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

// 6. Copiar login/ a dist/login/
if (existsSync('login')) {
  copyDirRecursive('login', join(DIST, 'login'));
  console.log('✓ dist/login/');
}

// 7. Copiar dashboard/ a dist/dashboard/
if (existsSync('dashboard')) {
  copyDirRecursive('dashboard', join(DIST, 'dashboard'));
  console.log('✓ dist/dashboard/');
}

// 8. Inyectar variables de entorno en config.js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: SUPABASE_URL y SUPABASE_ANON_KEY deben estar definidas como variables de entorno.');
  console.error('   Para desarrollo local, crea un archivo .env con estas variables.');
  console.error('   En Vercel, configúralas en Settings → Environment Variables.');
  process.exit(1);
}

const configFiles = [
  join(DIST, 'login', 'config.js'),
  join(DIST, 'dashboard', 'config.js'),
];

for (const file of configFiles) {
  if (existsSync(file)) {
    let content = readFileSync(file, 'utf8');
    content = content.replace('__SUPABASE_URL__', SUPABASE_URL);
    content = content.replace('__SUPABASE_ANON_KEY__', SUPABASE_ANON_KEY);
    writeFileSync(file, content, 'utf8');

    // Verificar que no quedaron placeholders
    if (content.includes('__SUPABASE_')) {
      console.error(`❌ Error: placeholders sin reemplazar en ${file}`);
      process.exit(1);
    }
  }
}
console.log('✓ Variables de entorno inyectadas en config.js');

console.log('\nBuild completo en dist/');

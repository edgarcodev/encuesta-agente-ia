# Plantilla de Encuesta — Vendedores

Esta carpeta contiene una encuesta independiente para **vendedores**, lista para desplegar en Vercel como proyecto separado.

## Estructura

```
references/vendedores/
├── index.html         ← Frontend: HTML + CSS + JS inline (38 preguntas)
├── api/
│   └── encuesta.js    ← Serverless function que guarda en Supabase
└── vercel.json        ← Configuración de rutas para Vercel
```

## Cómo usar esta plantilla para crear una nueva encuesta

1. **Duplicar la carpeta**:
   ```bash
   cp -r references/vendedores references/proveedores
   ```

2. **Cambiar en `index.html`**:
   - Título (`<title>`) y `<h1>` al nuevo tipo
   - Las preguntas (array `steps[]`) con las nuevas preguntas
   - `STORAGE_KEY` → cambiar a algo como `'megaremates_encuesta_proveedores_enviada'`
   - `NONCE` sessionStorage key → `'encuesta_nonce_proveedores'`
   - `tipo_encuesta` → `'proveedores'`

3. **Cambiar en `api/encuesta.js`**:
   - `const tipo_encuesta = 'proveedores';` (línea 8)

4. **Variables de entorno** (en Vercel dashboard):
   - `SUPABASE_URL` — URL de tu proyecto Supabase
   - `SUPABASE_SERVICE_KEY` — Service role key
   - `SECRET_NONCE` — si la encuesta principal usa uno diferente, aquí no se valida; el token se valida por longitud (20-50 chars)

5. **Base de datos**:
   - La tabla `respuestas_encuesta` ya existe. Asegúrate de que `tipo_encuesta` tenga el nuevo valor en el CHECK constraint:
   ```sql
   ALTER TABLE public.respuestas_encuesta
     DROP CONSTRAINT IF EXISTS chk_tipo_encuesta,
     ADD CONSTRAINT chk_tipo_encuesta
       CHECK (tipo_encuesta IN ('compradores', 'vendedores', 'proveedores'));
   ```

6. **Desplegar en Vercel**:
   - Conecta el repo a Vercel apuntando a esta carpeta como root, o usa un monorepo con `rootDirectory` en `vercel.json`.
   - Configura las variables de entorno en el dashboard.

## Diferencias con la encuesta principal

| Aspecto | Encuesta principal (`/`) | Encuesta independiente (`references/`) |
|---------|--------------------------|---------------------------------------|
| Preguntas | JSON externo (`config/preguntas/`) | Inline en `index.html` |
| Splash screen | Título dinámico | Título fijo |
| Auth token | `SECRET_NONCE` exacto | Longitud 20-50 chars |
| Deploy | Mismo proyecto Vercel | Proyecto Vercel separado |

## Notas

- `references/` está en `.gitignore` excepto esta carpeta `vendedores/`.
- No hay build step — `index.html` se sirve directamente.
- Las preguntas deben mantenerse sincronizadas manualmente con `config/preguntas/vendedores.json` si se actualizan en la encuesta principal.

# Registro de despliegue — Diario Mural

Resumen de la conversación sobre cómo se instaló este servidor en el hosting del usuario.

## Contexto del proyecto

- Servidor Node.js puro (`http` nativo, sin frameworks ni dependencias).
- `server.js` escucha en `process.env.PORT` y guarda el mural en `data/state.json`.
- La carpeta `data/` se crea sola (`fs.mkdir recursive`) si no existe, así que no hace falta prepararla a mano.
- `package.json` define `"start": "node server.js"`.
- Repo en GitHub: `https://github.com/fgc-ai/diario-mural-server` (rama `master`).

## Hosting utilizado

cPanel con la funcionalidad **"AI App Hosting"** (asistente de despliegue tipo Origen → Implementación, similar a Vercel/Render, propiedad de WebPros).

## Pasos seguidos

1. **Origen**: se eligió la opción "Repositorio Git" en vez de subir un `.zip`, para poder redesplegar en el futuro solo con `git push` + "Implementar".
2. El repo estaba en privado. Para poder usar la URL HTTPS (el asistente exige HTTPS solo si el repo es público, o SSH con deploy key si es privado), se cambió la visibilidad del repo a **público** con:
   ```
   gh repo edit fgc-ai/diario-mural-server --visibility public --accept-visibility-change-consequences
   ```
   No hay datos sensibles en el repo: `data/state.json` (las notas reales del mural) está en `.gitignore` y nunca se sube.
3. Se pegó la URL `https://github.com/fgc-ai/diario-mural-server.git`, rama `master`.
4. En la pantalla "Implementación" no detectó framework (normal, es Node puro sin build). Se confirmó:
   - Ruta de la aplicación: en blanco (raíz del repo).
   - Framework: "No detectado".
   - Comando de compilación: vacío.
   - Comando de inicio: `npm run start` (usa el script del `package.json`).
   - Directorio de salida: vacío.
5. Se dio clic en "Implementar".
6. Verificación post-deploy:
   - `GET /` → 200, sirve el HTML del mural.
   - `GET /api/state` → 200, la API de estado responde.
   - (Un `HEAD /` devolvió 405 — es esperado, el servidor solo maneja `GET`/`PUT` explícitamente, no es un error.)

## Resultado

Mural funcionando en: **https://postit.braincomputer.cl/**

## Pendiente / decisiones abiertas

El usuario preguntó si puede volver el repo a privado. Opciones planteadas (sin resolver aún):

1. Cambiar el origen de la app en cPanel a SSH (`git@github.com:fgc-ai/diario-mural-server.git`) y agregar la llave pública que entregue cPanel como "Deploy key" en GitHub → permite privacidad + redeploys por Git.
2. Dejarlo público (estado actual) — más simple, sin datos sensibles en el repo.
3. Volver a privado y usar "Subir archivo" (zip) en vez de Git para futuros redeploys, perdiendo el flujo automático.

## Actualizaciones futuras

Con el repo en Git conectado: hacer `git push` a `master` y volver a correr "Implementar" desde el mismo panel de cPanel.

Para respaldar los datos del mural: copiar `data/state.json` desde el servidor.

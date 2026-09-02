# Diario Mural — servidor propio

Sirve el mural desde tu propio servidor. El mismo mural se ve igual desde
cualquier dispositivo/navegador que entre a la URL, porque las notas se
guardan en `data/state.json` en el servidor (no en el navegador).

No usa frameworks: solo el módulo `http` incluido en Node.js. No hay que
instalar nada.

## Ejecutar localmente

```
node server.js
```

Abre `http://localhost:3000`. Cambia el puerto con la variable de entorno
`PORT`, por ejemplo `PORT=8080 node server.js`.

## Subirlo a tu servidor

1. Copia toda esta carpeta al servidor, por ejemplo con `scp`:
   ```
   scp -r diario-mural-server usuario@tu-servidor:/opt/diario-mural-server
   ```
   (o súbela por SFTP con FileZilla si prefieres arrastrar y soltar).

2. Entra por SSH e instala Node.js 14+ si no lo tienes:
   ```
   ssh usuario@tu-servidor
   node -v   # si falla o es muy viejo, instala Node (ejemplo Debian/Ubuntu):
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. Pruébalo en primer plano para confirmar que arranca:
   ```
   cd /opt/diario-mural-server
   node server.js
   # visita http://tu-servidor:3000 — Ctrl+C para cortar cuando confirmes
   ```

4. Déjalo corriendo permanentemente con **pm2** (sobrevive reinicios y
   caídas):
   ```
   sudo npm install -g pm2
   pm2 start server.js --name diario-mural-server
   pm2 save
   pm2 startup   # sigue la instrucción que imprime para arrancar al boot
   ```

5. Pon Nginx delante como proxy inverso para servirlo en tu dominio con
   HTTPS. Ver la sección siguiente para el bloque exacto si también vas a
   servir la versión estática en el mismo dominio.

## Sirviendo las dos versiones (estática + servidor) en un mismo dominio

Ruta sugerida: la versión estática en `/mural-simple/`, la de servidor
(Node) en `/mural-compartido/`.

1. Copia `diario-mural-standalone/index.html` a la carpeta que ya sirve
   Nginx, por ejemplo:
   ```
   mkdir -p /var/www/tu-sitio/mural-simple
   cp index.html /var/www/tu-sitio/mural-simple/index.html
   ```

2. Bloque de Nginx (ajusta `server_name`, la raíz estática y el puerto si
   cambiaste `PORT`):
   ```nginx
   server {
       listen 80;
       server_name tu-dominio.com;

       # Versión estática — Nginx la sirve directo, sin pasar por Node
       location /mural-simple/ {
           alias /var/www/tu-sitio/mural-simple/;
           index index.html;
       }

       # Versión con servidor — Nginx hace de proxy hacia Node (pm2, puerto 3000)
       location /mural-compartido/ {
           proxy_pass http://127.0.0.1:3000/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```
   Recarga Nginx: `sudo nginx -t && sudo systemctl reload nginx`.

3. (Opcional pero recomendado) HTTPS gratis con Certbot:
   ```
   sudo apt-get install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d tu-dominio.com
   ```

Con esto: `https://tu-dominio.com/mural-simple/` es la versión que guarda
en el navegador de cada quien, y `https://tu-dominio.com/mural-compartido/`
es la versión que todos ven igual porque el servidor Node guarda el
estado en `data/state.json`.

## Cómo guarda los datos

- `GET /api/state` devuelve el mural guardado (o `404` si aún no se ha
  guardado nada — el cliente muestra la nota de bienvenida en ese caso).
- `PUT /api/state` recibe el mural completo como JSON y lo escribe en
  `data/state.json`.
- El cliente (`public/index.html`) guarda automáticamente ~700ms después
  de cada cambio (mover, escribir, agregar, borrar, recolorear).

Para respaldar el mural, basta con copiar `data/state.json`.

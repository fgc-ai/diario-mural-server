// Diario Mural — servidor propio
// Sirve el cliente estático (public/) y guarda el estado del mural
// (título, notas, posiciones, colores) en data/state.json.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data', 'state.json');
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB es de sobra para un mural de notas

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon'
};

function isValidState(state) {
  return (
    state &&
    typeof state === 'object' &&
    Array.isArray(state.notes) &&
    typeof state.title === 'string'
  );
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

function serveState(res) {
  fs.readFile(DATA_FILE, 'utf8', (err, raw) => {
    if (err) {
      // Todavía no se ha guardado nada: el cliente usa su nota de bienvenida.
      sendJson(res, 404, { error: 'no_state_yet' });
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(raw);
  });
}

function saveState(req, res) {
  let received = 0;
  const chunks = [];

  req.on('data', (chunk) => {
    received += chunk.length;
    if (received > MAX_BODY_BYTES) {
      req.destroy();
      sendJson(res, 413, { error: 'payload_too_large' });
      return;
    }
    chunks.push(chunk);
  });

  req.on('end', () => {
    let state;
    try {
      state = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch (e) {
      sendJson(res, 400, { error: 'invalid_json' });
      return;
    }
    if (!isValidState(state)) {
      sendJson(res, 400, { error: 'invalid_state' });
      return;
    }
    fs.mkdir(path.dirname(DATA_FILE), { recursive: true }, (mkdirErr) => {
      if (mkdirErr) {
        sendJson(res, 500, { error: 'write_failed' });
        return;
      }
      fs.writeFile(DATA_FILE, JSON.stringify(state), (writeErr) => {
        if (writeErr) {
          sendJson(res, 500, { error: 'write_failed' });
          return;
        }
        sendJson(res, 200, { ok: true });
      });
    });
  });
}

function serveStatic(req, res, urlPath) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath === '/' || safePath === '\\' ? 'index.html' : safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('No encontrado');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/state' && req.method === 'GET') {
    serveState(res);
    return;
  }
  if (url.pathname === '/api/state' && req.method === 'PUT') {
    saveState(req, res);
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res, url.pathname);
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Método no permitido');
});

server.listen(PORT, () => {
  console.log(`Diario Mural escuchando en http://localhost:${PORT}`);
});

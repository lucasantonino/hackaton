const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const database = require('./database');

const HOST = '127.0.0.1';
const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const ALLOWED_STATUSES = ['Aberto', 'Em andamento', 'Concluído'];
const MAX_BODY_SIZE = 1024 * 1024;

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(data));
}

async function readJsonBody(request) {
  let body = '';

  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body, 'utf8') > MAX_BODY_SIZE) {
      const error = new Error('O corpo da solicitação é muito grande.');
      error.statusCode = 413;
      throw error;
    }
  }

  try {
    return JSON.parse(body);
  } catch {
    const error = new Error('Envie os dados em formato JSON válido.');
    error.statusCode = 400;
    throw error;
  }
}

function servePublicFile(request, response, pathname) {
  const publicFiles = {
    '/': ['index.html', 'text/html; charset=utf-8'],
    '/index.html': ['index.html', 'text/html; charset=utf-8'],
    '/css/style.css': ['css/style.css', 'text/css; charset=utf-8'],
    '/js/app.js': ['js/app.js', 'text/javascript; charset=utf-8']
  };
  const file = publicFiles[pathname];

  if (!file || request.method !== 'GET') {
    sendJson(response, 404, { erro: 'Recurso não encontrado.' });
    return;
  }

  const filePath = path.join(PUBLIC_DIR, file[0]);
  fs.readFile(filePath, (error, contents) => {
    if (error) {
      sendJson(response, 404, { erro: 'Arquivo da interface não encontrado.' });
      return;
    }
    response.writeHead(200, { 'Content-Type': file[1] });
    response.end(contents);
  });
}

async function handleRequest(request, response) {
  let url;
  try {
    url = new URL(request.url, `http://${HOST}:${PORT}`);
  } catch {
    sendJson(response, 400, { erro: 'Endereço de solicitação inválido.' });
    return;
  }

  const { pathname } = url;

  if (pathname === '/api/chamados' && request.method === 'GET') {
    const status = url.searchParams.get('status');
    if (status && !ALLOWED_STATUSES.includes(status)) {
      sendJson(response, 400, { erro: 'O status informado não é permitido.' });
      return;
    }

    const tickets = status
      ? database.prepare('SELECT id, titulo, solicitante, descricao, status FROM chamados WHERE status = ? ORDER BY id DESC').all(status)
      : database.prepare('SELECT id, titulo, solicitante, descricao, status FROM chamados ORDER BY id DESC').all();
    sendJson(response, 200, tickets);
    return;
  }

  if (pathname === '/api/chamados' && request.method === 'POST') {
    let data;
    try {
      data = await readJsonBody(request);
    } catch (error) {
      sendJson(response, error.statusCode || 400, { erro: error.message });
      return;
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      sendJson(response, 400, { erro: 'Envie um objeto com os dados do chamado.' });
      return;
    }

    const titulo = typeof data.titulo === 'string' ? data.titulo.trim() : '';
    const solicitante = typeof data.solicitante === 'string' ? data.solicitante.trim() : '';
    const descricao = typeof data.descricao === 'string' ? data.descricao.trim() : '';

    if (!titulo || !solicitante) {
      sendJson(response, 400, { erro: 'Título e solicitante são obrigatórios.' });
      return;
    }

    try {
      const result = database.prepare(
        'INSERT INTO chamados (titulo, solicitante, descricao) VALUES (?, ?, ?)'
      ).run(titulo, solicitante, descricao || null);
      const ticket = database.prepare(
        'SELECT id, titulo, solicitante, descricao, status FROM chamados WHERE id = ?'
      ).get(Number(result.lastInsertRowid));
      sendJson(response, 201, ticket);
    } catch {
      sendJson(response, 500, { erro: 'Não foi possível salvar o chamado.' });
    }
    return;
  }

  const statusRoute = pathname.match(/^\/api\/chamados\/(\d+)\/status$/);
  if (statusRoute && request.method === 'PATCH') {
    const id = Number(statusRoute[1]);
    if (!Number.isSafeInteger(id) || id < 1) {
      sendJson(response, 400, { erro: 'O identificador do chamado é inválido.' });
      return;
    }

    let data;
    try {
      data = await readJsonBody(request);
    } catch (error) {
      sendJson(response, error.statusCode || 400, { erro: error.message });
      return;
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      sendJson(response, 400, { erro: 'Envie um objeto com o novo status.' });
      return;
    }

    if (!ALLOWED_STATUSES.includes(data.status)) {
      sendJson(response, 400, { erro: 'Escolha um status permitido.' });
      return;
    }

    try {
      const result = database.prepare(
        'UPDATE chamados SET status = ? WHERE id = ?'
      ).run(data.status, id);

      if (result.changes === 0) {
        sendJson(response, 404, { erro: 'Chamado não encontrado.' });
        return;
      }

      const ticket = database.prepare(
        'SELECT id, titulo, solicitante, descricao, status FROM chamados WHERE id = ?'
      ).get(id);
      sendJson(response, 200, ticket);
    } catch {
      sendJson(response, 500, { erro: 'Não foi possível atualizar o chamado.' });
    }
    return;
  }

  if (pathname.startsWith('/api/')) {
    sendJson(response, 404, { erro: 'Rota da API não encontrada.' });
    return;
  }

  servePublicFile(request, response, pathname);
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch(() => {
    if (!response.headersSent) {
      sendJson(response, 500, { erro: 'Ocorreu um erro interno ao processar a solicitação.' });
    } else {
      response.destroy();
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Servidor disponível em http://${HOST}:${PORT}`);
});

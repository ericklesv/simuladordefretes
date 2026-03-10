/* =============================================
   SERVIDOR PROXY PARA API SUPERFRETE
   Evita problemas de CORS e protege o token da API
   ============================================= */

const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
const fs = require('fs');

/* =============================================
   CONFIGURAÇÕES DO SERVIDOR
   ============================================= */

const SERVER_CONFIG = {
  PORT: process.env.PORT || 3000,

  // Token da API SuperFrete
  API_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzMwODQyMjYsInN1YiI6IndLdmZZY2QwNlZmcG9aWlA0NjNBMzBpaXR4azEifQ.F6myDin_nc_FJBUmcIbNc4rQ_f-hY7rB-gkbfMNkwWE',

  // URL da API SuperFrete
  API_URL: 'https://web.superfrete.com/api/v0/calculator',

  // CEP de origem fixo
  CEP_ORIGEM: '50030230',

  // Dimensões padrão do pacote (cm)
  DIMENSOES: {
    largura: 20,
    altura: 15,
    comprimento: 25
  }
};

// Tipos MIME para servir arquivos estáticos
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

/* =============================================
   FUNÇÕES AUXILIARES
   ============================================= */

// Validação de CEP (apenas dígitos, 8 caracteres)
function validarCEP(cep) {
  return /^\d{8}$/.test(cep);
}

// Validação de peso (número positivo, máximo razoável)
function validarPeso(peso) {
  const num = parseFloat(peso);
  return !isNaN(num) && num > 0 && num <= 100;
}

// Lê o body de uma requisição POST
function lerBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalSize = 0;
    const MAX_SIZE = 10 * 1024; // 10KB limite

    req.on('data', (chunk) => {
      totalSize += chunk.length;
      if (totalSize > MAX_SIZE) {
        reject(new Error('Payload muito grande.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

// Faz requisição HTTPS à API SuperFrete
function chamarAPISuperFrete(bodyObj) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(bodyObj);
    const parsed = url.parse(SERVER_CONFIG.API_URL);

    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SERVER_CONFIG.API_TOKEN,
        'User-Agent': 'SimuladorFreteDiecast/1.0',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        resolve({ statusCode: res.statusCode, body });
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout na comunicação com a API SuperFrete.'));
    });
    req.write(postData);
    req.end();
  });
}

// Responde com JSON
function responderJSON(res, statusCode, data) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(json);
}

// Serve arquivo estático
function servirArquivoEstatico(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Arquivo não encontrado.');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

/* =============================================
   HANDLER DA ROTA /api/calcular-frete
   ============================================= */

async function handleCalcularFrete(req, res) {
  try {
    const bodyStr = await lerBody(req);
    let dados;

    try {
      dados = JSON.parse(bodyStr);
    } catch {
      return responderJSON(res, 400, { error: 'JSON inválido.' });
    }

    // Validar campos obrigatórios
    const cepDestino = String(dados.cep_destino || '').replace(/\D/g, '');
    const peso = parseFloat(dados.peso);

    if (!validarCEP(cepDestino)) {
      return responderJSON(res, 400, { error: 'CEP de destino inválido.' });
    }

    if (!validarPeso(peso)) {
      return responderJSON(res, 400, { error: 'Peso inválido.' });
    }

    // Montar body para a API SuperFrete
    const apiBody = {
      from: { postal_code: SERVER_CONFIG.CEP_ORIGEM },
      to: { postal_code: cepDestino },
      services: '1,2,3',
      options: {
        receipt: false,
        own_hand: false
      },
      products: [
        {
          weight: peso,
          width: SERVER_CONFIG.DIMENSOES.largura,
          height: SERVER_CONFIG.DIMENSOES.altura,
          length: SERVER_CONFIG.DIMENSOES.comprimento,
          quantity: 1,
          insurance_value: 0
        }
      ]
    };

    // Chamar API SuperFrete
    const apiResponse = await chamarAPISuperFrete(apiBody);

    if (apiResponse.statusCode === 401) {
      return responderJSON(res, 502, {
        error: 'Token da API inválido ou expirado. Verifique a configuração do servidor.'
      });
    }

    if (apiResponse.statusCode === 422) {
      return responderJSON(res, 422, {
        error: 'CEP não encontrado ou fora da área de cobertura.'
      });
    }

    if (apiResponse.statusCode === 400) {
      // Tentar extrair mensagem da API
      let apiErr;
      try { apiErr = JSON.parse(apiResponse.body); } catch {}
      const msg = (apiErr && apiErr.message) || 'CEP inválido ou sem cobertura para este destino.';
      return responderJSON(res, 400, { error: msg });
    }

    if (apiResponse.statusCode < 200 || apiResponse.statusCode >= 300) {
      return responderJSON(res, 502, {
        error: 'Erro na API SuperFrete (código ' + apiResponse.statusCode + ').'
      });
    }

    // Retornar resposta da API ao frontend
    let apiData;
    try {
      apiData = JSON.parse(apiResponse.body);
    } catch {
      return responderJSON(res, 502, { error: 'Resposta inválida da API SuperFrete.' });
    }

    responderJSON(res, 200, apiData);

  } catch (erro) {
    console.error('Erro no proxy:', erro.message);
    responderJSON(res, 500, {
      error: erro.message || 'Erro interno do servidor.'
    });
  }
}

/* =============================================
   SERVIDOR HTTP
   ============================================= */

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  // Endpoint da API de frete
  if (pathname === '/api/calcular-frete' && req.method === 'POST') {
    handleCalcularFrete(req, res);
    return;
  }

  // Servir arquivos estáticos
  let filePath = pathname === '/' ? '/index.html' : pathname;

  // Prevenir path traversal
  const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(__dirname, safePath);

  // Verificar se o arquivo está dentro do diretório do projeto
  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Acesso negado.');
    return;
  }

  servirArquivoEstatico(res, fullPath);
});

server.listen(SERVER_CONFIG.PORT, '0.0.0.0', () => {
  console.log('');
  console.log('==============================================');
  console.log('  Simulador de Frete — Servidor rodando!');
  console.log('==============================================');
  console.log('');
  console.log('  Porta: ' + SERVER_CONFIG.PORT);
  console.log('');
});

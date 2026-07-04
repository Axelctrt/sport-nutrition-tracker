import { createServer } from 'node:http';
import { Readable } from 'node:stream';

import { handlePhotoNutritionAiProxyRequest } from '../functions/_shared/photoNutritionAiProxy.js';

const port = Number(process.env.PHOTO_NUTRITION_AI_PROXY_PORT ?? 8787);

function toWebRequest(request) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) headers.set(key, value.join(', '));
    else if (typeof value === 'string') headers.set(key, value);
  }

  const url = `http://127.0.0.1:${port}${request.url ?? '/'}`;
  const init = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = Readable.toWeb(request);
    init.duplex = 'half';
  }

  return new Request(url, init);
}

async function writeNodeResponse(webResponse, response) {
  response.statusCode = webResponse.status;
  webResponse.headers.forEach((value, key) => response.setHeader(key, value));
  const body = webResponse.body;
  if (!body) {
    response.end();
    return;
  }

  const reader = body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    response.write(Buffer.from(value));
  }
  response.end();
}

const server = createServer(async (request, response) => {
  try {
    const webRequest = toWebRequest(request);
    const webResponse = await handlePhotoNutritionAiProxyRequest(webRequest, process.env);
    await writeNodeResponse(webResponse, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur proxy inconnue.';
    response.writeHead(500, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    response.end(JSON.stringify({ code: 'PHOTO_AI_LOCAL_PROXY_ERROR', message }));
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Proxy IA photo Gemini local actif : http://127.0.0.1:${port}/api/photo-nutrition/analyze`);
  console.log('Clé attendue côté serveur : PHOTO_NUTRITION_AI_API_KEY ou GEMINI_API_KEY');
});

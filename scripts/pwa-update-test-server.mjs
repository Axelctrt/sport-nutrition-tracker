import { execSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const port = Number(process.env.PWA_UPDATE_TEST_PORT ?? 4174);
const distDirectory = join(projectRoot, 'dist');
const buildRoot = join(projectRoot, 'test-results', 'pwa-update-builds');
const oldBuildDirectory = join(buildRoot, 'old');
const newBuildDirectory = join(buildRoot, 'new');
const markerSourcePath = join(
  projectRoot,
  'public',
  'pwa-update-test-marker.svg',
);
const markerHadOriginalContent = existsSync(markerSourcePath);
const markerOriginalContent = markerHadOriginalContent
  ? readFileSync(markerSourcePath, 'utf8')
  : null;

function markerSvg(buildName) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><metadata>${buildName}</metadata></svg>\n`;
}

function restoreMarker() {
  if (markerOriginalContent !== null) {
    writeFileSync(markerSourcePath, markerOriginalContent, 'utf8');
    return;
  }

  rmSync(markerSourcePath, { force: true });
}

function buildApplication(targetDirectory, marker) {
  writeFileSync(markerSourcePath, markerSvg(marker), 'utf8');
  execSync('npm run build', {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });

  rmSync(targetDirectory, { recursive: true, force: true });
  cpSync(distDirectory, targetDirectory, { recursive: true });
}

mkdirSync(buildRoot, { recursive: true });

try {
  buildApplication(oldBuildDirectory, 'sportpilot-pwa-build-old');
  buildApplication(newBuildDirectory, 'sportpilot-pwa-build-new');
} finally {
  restoreMarker();
}

let activeBuildDirectory = oldBuildDirectory;

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(`${JSON.stringify(payload)}\n`);
}

function resolveStaticFile(pathname) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const candidate = resolve(activeBuildDirectory, `.${requestedPath}`);
  const relativePath = relative(activeBuildDirectory, candidate);

  if (relativePath.startsWith(`..${sep}`) || relativePath === '..') return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;

  return join(activeBuildDirectory, 'index.html');
}

const server = createServer((request, response) => {
  const requestUrl = new URL(
    request.url ?? '/',
    `http://127.0.0.1:${port}`,
  );

  if (request.method === 'GET' && requestUrl.pathname === '/__pwa-test/health') {
    sendJson(response, 200, {
      ready: true,
      activeBuild:
        activeBuildDirectory === oldBuildDirectory ? 'old' : 'new',
    });
    return;
  }

  if (
    request.method === 'POST' &&
    requestUrl.pathname === '/__pwa-test/switch-to-new'
  ) {
    activeBuildDirectory = newBuildDirectory;
    sendJson(response, 200, { activeBuild: 'new' });
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(response, 405, { error: 'Méthode non autorisée.' });
    return;
  }

  const filePath = resolveStaticFile(
    decodeURIComponent(requestUrl.pathname),
  );
  if (filePath === null) {
    sendJson(response, 403, { error: 'Chemin interdit.' });
    return;
  }

  const extension = extname(filePath).toLowerCase();
  const contentType =
    contentTypes[extension] ?? 'application/octet-stream';
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Content-Type': contentType,
  };

  if (filePath.endsWith(`${sep}sw.js`)) {
    headers['Service-Worker-Allowed'] = '/';
  }

  response.writeHead(200, headers);
  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  response.end(readFileSync(filePath));
});

server.listen(port, '127.0.0.1', () => {
  console.log(
    `Serveur de mise à jour PWA prêt sur http://127.0.0.1:${port}`,
  );
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

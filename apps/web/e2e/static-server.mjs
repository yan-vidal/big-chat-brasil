import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, isAbsolute, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');
const browserOutput = resolve(projectRoot, '../../dist/apps/web/browser');
const portArgIndex = process.argv.indexOf('--port');
const port = Number(portArgIndex >= 0 ? process.argv[portArgIndex + 1] : 4200);

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

function resolveRequestPath(url) {
  const pathname = decodeURIComponent(new URL(url, `http://127.0.0.1:${port}`).pathname);
  const candidate = normalize(join(browserOutput, pathname));
  const relativePath = relative(browserOutput, candidate);

  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    return null;
  }

  if (existsSync(candidate) && extname(candidate)) {
    return candidate;
  }

  return join(browserOutput, 'index.html');
}

const server = createServer((request, response) => {
  const filePath = resolveRequestPath(request.url ?? '/');

  if (!filePath || !existsSync(filePath)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving ${browserOutput} at http://127.0.0.1:${port}`);
});

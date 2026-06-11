import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, isAbsolute, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');
const browserOutput = resolve(projectRoot, '../../dist/apps/web/browser');
const port = Number(readArg('--port') ?? 4200);
const host = process.env.WEB_HOST ?? '127.0.0.1';
const runtimeConfig = {
  apiBaseUrl: readArg('--api-base-url') ?? process.env.BCB_API_BASE_URL,
};

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

  if (filePath.endsWith('index.html')) {
    response.end(injectRuntimeConfig(readFileSync(filePath, 'utf8')));
    return;
  }

  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Serving ${browserOutput} at http://${host}:${port}`);
});

function injectRuntimeConfig(html) {
  if (!runtimeConfig.apiBaseUrl) {
    return html;
  }

  const script = `<script>window.__BCB_RUNTIME_CONFIG__=${JSON.stringify(runtimeConfig)};</script>`;

  return html.replace('</head>', `${script}</head>`);
}

function readArg(name) {
  const exactValue = process.argv.find((arg) => arg.startsWith(`${name}=`));

  if (exactValue) {
    return exactValue.slice(name.length + 1);
  }

  const index = process.argv.indexOf(name);

  if (index < 0) {
    return undefined;
  }

  return process.argv[index + 1];
}

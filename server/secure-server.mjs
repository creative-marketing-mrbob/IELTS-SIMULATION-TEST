import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleAdminEvaluatorLogin, handleAiEvaluate, handleStaffEvaluatorLogin } from './aiEvaluatorEndpoint.mjs';
import { handleSupabaseApi } from './supabaseBackend.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const port = Number(process.env.PORT || 3000);

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

async function serveStatic(req, res) {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const safePath = path.normalize(decodeURIComponent(requestUrl.pathname)).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(distDir, safePath);
  const isAssetRequest = requestUrl.pathname.startsWith('/assets/');

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    if (isAssetRequest) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end('Asset not found');
      return;
    }
    filePath = path.join(distDir, 'index.html');
  }

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
    if (path.basename(filePath) === 'index.html') {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
    } else if (requestUrl.pathname.startsWith('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    res.end(file);
  } catch {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Not found');
  }
}

const server = http.createServer((req, res) => {
  if ((req.url || '').startsWith('/api/ai-evaluate')) {
    handleAiEvaluate(req, res).catch(error => {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'AI evaluator endpoint failed.'
      }));
    });
    return;
  }

  if ((req.url || '').startsWith('/api/kie-evaluate')) {
    handleAiEvaluate(req, res).catch(error => {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'KIE evaluator endpoint failed.'
      }));
    });
    return;
  }

  if ((req.url || '').startsWith('/api/admin/evaluator-login')) {
    handleAdminEvaluatorLogin(req, res).catch(error => {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Admin evaluator login failed.'
      }));
    });
    return;
  }

  if ((req.url || '').startsWith('/api/staff/evaluator-login')) {
    handleStaffEvaluatorLogin(req, res).catch(error => {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Staff evaluator login failed.'
      }));
    });
    return;
  }

  if ((req.url || '').startsWith('/api/supabase')) {
    handleSupabaseApi(req, res).catch(error => {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Supabase API failed.'
      }));
    });
    return;
  }

  serveStatic(req, res).catch(() => {
    res.statusCode = 500;
    res.end('Server error');
  });
});

server.listen(port, () => {
  console.log(`Secure IELTS server running at http://127.0.0.1:${port}/`);
});

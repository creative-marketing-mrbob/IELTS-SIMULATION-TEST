import { handleSupabaseApi } from '../server/supabaseBackend.mjs';
import {
  handleAdminEvaluatorLogin,
  handleStaffEvaluatorLogin,
  handleAiEvaluate
} from '../server/aiEvaluatorEndpoint.mjs';

export const config = {
  maxDuration: 60
};

export default async function handler(req, res) {
  const url = new URL(req.url || '/', 'http://localhost');
  // Vercel may expose either the original URL or the rewritten function URL.
  const route = req.query?.route ?? url.searchParams.get('route');
  if (url.pathname === '/api/backend' && typeof route === 'string') {
    url.pathname = `/api/${route}`;
  }
  url.searchParams.delete('route');
  req.url = `${url.pathname}${url.search}`;

  try {
    if (url.pathname.startsWith('/api/supabase/')) {
      return await handleSupabaseApi(req, res);
    }
    const handlers = {
      '/api/admin/evaluator-login': handleAdminEvaluatorLogin,
      '/api/staff/evaluator-login': handleStaffEvaluatorLogin,
      '/api/ai-evaluate': handleAiEvaluate,
      '/api/kie-evaluate': handleAiEvaluate
    };
    const endpoint = handlers[url.pathname];
    if (endpoint) return await endpoint(req, res);
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'API endpoint not found.' }));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'API request failed.' }));
  }
}

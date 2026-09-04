import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { handleAdminEvaluatorLogin, handleAiEvaluate, handleStaffEvaluatorLogin } from './server/aiEvaluatorEndpoint.mjs'
import { handleSupabaseApi } from './server/supabaseBackend.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'secure-ai-evaluator-endpoint',
      configureServer(server) {
        server.middlewares.use('/api/ai-evaluate', (req, res) => {
          handleAiEvaluate(req, res).catch(error => {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'AI evaluator endpoint failed.'
            }));
          });
        });
        server.middlewares.use('/api/kie-evaluate', (req, res) => {
          handleAiEvaluate(req, res).catch(error => {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'KIE evaluator endpoint failed.'
            }));
          });
        });
        server.middlewares.use('/api/admin/evaluator-login', (req, res) => {
          handleAdminEvaluatorLogin(req, res).catch(error => {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Admin evaluator login failed.'
            }));
          });
        });
        server.middlewares.use('/api/staff/evaluator-login', (req, res) => {
          handleStaffEvaluatorLogin(req, res).catch(error => {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Staff evaluator login failed.'
            }));
          });
        });
        server.middlewares.use('/api/supabase', (req, res) => {
          handleSupabaseApi(req, res).catch(error => {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Supabase API failed.'
            }));
          });
        });
      }
    }
  ],
  server: {
    port: 3000,
    open: true
  }
})

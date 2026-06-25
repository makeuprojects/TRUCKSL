import './server/sanitizeEnv';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  // Parse JSON and form-url bodies with high limit for image uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Simple health check endpoints for UptimeRobot or similar services
  app.get(['/ping', '/api/health'], (req, res) => {
    res.status(200).json({ 
      status: 'ok', 
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // Register the Google Sheets and Fleet controllers router
  app.use('/api', apiRouter);

  // Integrate Vite dynamically based on production staging
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Dev Server] Mounting Vite HMR middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[Prod Server] Serving built static distribution assets...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Fleet Server] Listening on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}

startServer().catch((err) => {
  console.error('[Startup Failure] Failed to bootstrap fleet management server:', err);
});

import type { Request, Response, NextFunction } from 'express';
import { apiApp } from '../src/server/apiRouter';

// Global JSON error handler — catches any unhandled errors and always
// returns JSON (never plain text or HTML) so the frontend can parse it.
apiApp.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API] Unhandled error:', err?.message || err);
  if (!res.headersSent) {
    res.status(500).json({ error: err?.message || 'A server error occurred.' });
  }
});

// Catch-all for unknown routes — return JSON 404
apiApp.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'API route not found.' });
});

export default apiApp;

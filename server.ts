import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { apiApp } from './src/server/apiRouter';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Mount API routes (apiApp handles /api/* paths internally)
app.use(apiApp);

// Serve static assets from dist in production
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA routing
app.get('*', (_req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[API Server] Running at http://localhost:${PORT}`);
});

export { app };

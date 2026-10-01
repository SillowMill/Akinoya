import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { apiRouter } from './src/server/apiRouter';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Mount API routes
app.use('/api', apiRouter);

// Serve static assets from dist in production
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA routing
app.get('*', (_req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

if (process.env.NODE_ENV === 'production') {
  app.listen(PORT, () => {
    console.log(`[Production Server] Live at http://localhost:${PORT}`);
  });
}

export { app };

import type { Request, Response } from 'express';
import { apiApp } from './apiRouter';

/**
 * Consolidated Single Serverless Function Entrypoint for Vercel Hobby Plan (<12 functions limit).
 * Routes all /api/* requests through the unified Express apiApp router, including:
 * - POST /api/generate-planet (Fal.ai fal-ai/flux/schnell via process.env.FAL_KEY & Google Imagen 3)
 * - POST /api/sync-sheets & /api/auth/sync-sheets (Google Sheets VIP GUESTS & Subscribers sync)
 * - POST /api/nfc/register & /api/nfc/send-pin
 * - GET/POST /api/nfc/verify-dna
 * - GET/POST /api/nfc/redeem & /api/nfc/verify
 * - GET/POST /api/nfc/reset-pass & /api/nfc/reset-all-passes
 * - POST /api/whitelist/subscribe
 * - POST /api/create-checkout-session, GET /api/inventory/status, GET /api/checkout/session/:id, POST /api/webhooks/stripe
 */
export default function handler(req: Request, res: Response) {
  try {
    const rawUrl = req.url || '/api';
    const parsed = new URL(rawUrl, 'https://sillowmill.com');
    const rewrittenPath = parsed.searchParams.get('__path');

    if (rewrittenPath !== null) {
      parsed.searchParams.delete('__path');
      const cleanSubpath = rewrittenPath.replace(/^\/+/, '');
      const qs = parsed.searchParams.toString();
      req.url = `/api/${cleanSubpath}${qs ? `?${qs}` : ''}`;
    } else if (!parsed.pathname.startsWith('/api')) {
      const cleanPath = parsed.pathname.replace(/^\/+/, '');
      const qs = parsed.searchParams.toString();
      req.url = `/api/${cleanPath}${qs ? `?${qs}` : ''}`;
    }
  } catch {
    // Keep original req.url if URL parsing fails
  }

  return apiApp(req, res);
}

import type { IncomingMessage, ServerResponse } from 'http';
import { createComicCheckoutSession } from '../src/server/stripeService';

interface CustomRequest extends IncomingMessage {
  body?: any;
  query?: Record<string, string>;
}

export default async function handler(req: CustomRequest, res: ServerResponse) {
  // Always return application/json
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  try {
    // Read and parse JSON body
    let body = req.body;
    if (!body || typeof body === 'string') {
      const buffers: Buffer[] = [];
      for await (const chunk of req) {
        buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const rawText = Buffer.concat(buffers).toString('utf-8');
      body = rawText ? JSON.parse(rawText) : {};
    }

    const { customerEmail, customerName, shippingAddress, shippingCity, apartmentBus } = body || {};

    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const origin = req.headers.origin || (host ? `${proto}://${host}` : 'https://sillowmill.com');

    const session = await createComicCheckoutSession({
      customerEmail,
      customerName,
      shippingAddress,
      shippingCity,
      apartmentBus,
      origin: typeof origin === 'string' ? origin : 'https://sillowmill.com',
    });

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
      })
    );
  } catch (err: any) {
    console.error('[API create-checkout-session] Error:', err);
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        error: err?.message || 'Failed to initialize Stripe checkout session.',
      })
    );
  }
}

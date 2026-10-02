import type { IncomingMessage, ServerResponse } from 'http';
import { getStripe, loadOrders } from '../../../src/server/stripeService';

interface CustomRequest extends IncomingMessage {
  query?: Record<string, string>;
}

export default async function handler(req: CustomRequest, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const url = new URL(req.url || '', 'https://sillowmill.com');
    // Extract ID from path /api/checkout/session/:id or query param
    const pathParts = url.pathname.split('/');
    const sessionId = pathParts[pathParts.length - 1] || url.searchParams.get('id') || req.query?.id;

    if (!sessionId) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing session ID' }));
      return;
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const orders = loadOrders();
    const matchedOrder = orders.find((o) => o.id === sessionId);

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        session,
        order: matchedOrder || null,
        passId: matchedOrder ? matchedOrder.passId : `PASS-BINGAA-${session.id.slice(-8).toUpperCase()}`,
        status: session.payment_status,
        customerEmail: session.customer_details?.email,
        customerName: session.customer_details?.name,
      })
    );
  } catch (err: any) {
    console.error('[API checkout/session] Error:', err);
    res.statusCode = 404;
    res.end(JSON.stringify({ error: err?.message || 'Session not found.' }));
  }
}

import type { IncomingMessage, ServerResponse } from 'http';
import { getStripe, processCompletedCheckout, getInventoryStatus } from '../../src/server/stripeService';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Read raw payload
  const buffers: Buffer[] = [];
  for await (const chunk of req) {
    buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const rawPayload = Buffer.concat(buffers);

  let event: any;
  try {
    const stripe = getStripe();
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(rawPayload, sig as string, webhookSecret);
    } else {
      event = JSON.parse(rawPayload.toString('utf-8'));
    }
  } catch (err: any) {
    console.error('[Webhook] Signature/parse error:', err.message);
    res.statusCode = 400;
    res.end(JSON.stringify({ error: `Webhook error: ${err.message}` }));
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      const order = await processCompletedCheckout(session);
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          received: true,
          orderId: order.id,
          passId: order.passId,
          waveRemaining: getInventoryStatus().available,
        })
      );
      return;
    } catch (err: any) {
      console.error('[Webhook] Order processing error:', err);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Failed to process order' }));
      return;
    }
  }

  res.statusCode = 200;
  res.end(JSON.stringify({ received: true, event: event.type }));
}

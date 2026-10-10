import Stripe from 'stripe';

function getStripe() {
  const key =
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_API_KEY ||
    process.env.STRIPE_KEY ||
    '';

  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured in Vercel.');
  }

  return new Stripe(key, {
    apiVersion: '2026-09-30.endive',
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  const buffers = [];
  for await (const chunk of req) {
    buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const rawPayload = Buffer.concat(buffers);

  let event;
  try {
    const stripe = getStripe();
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(rawPayload, sig, webhookSecret);
    } else {
      event = JSON.parse(rawPayload.toString('utf-8'));
    }
  } catch (err) {
    console.error('[Webhook] Signature/parse error:', err.message);
    res.statusCode = 400;
    res.end(JSON.stringify({ error: `Webhook error: ${err.message}` }));
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const isMembership = session.mode === 'subscription' || session.metadata?.product === 'community_membership';
    const customerEmail = session.customer_details?.email || session.customer_email || session.metadata?.customer_email || '';
    const customerName = session.customer_details?.name || session.metadata?.customer_name || 'Patron Member';
    const passId = `PASS-BINGAA-${session.id.slice(-8).toUpperCase()}`;

    if (isMembership) {
      console.log(`[Webhook] Active subscription verified: email=${customerEmail}, is_patron=true`);
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          received: true,
          membership: true,
          email: customerEmail,
          name: customerName,
          is_patron: true,
        })
      );
      return;
    }

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        received: true,
        orderId: session.id,
        passId,
      })
    );
    return;
  }

  res.statusCode = 200;
  res.end(JSON.stringify({ received: true, event: event.type }));
}

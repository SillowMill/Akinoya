import Stripe from 'stripe';

function getStripe(): Stripe {
  const key =
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_API_KEY ||
    process.env.STRIPE_KEY ||
    '';

  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not configured in Vercel. Please check Project Settings > Environment Variables.'
    );
  }

  return new Stripe(key, {
    apiVersion: '2026-09-30.endive' as any,
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const url = new URL(req.url || '', 'https://sillowmill.com');
    const pathParts = url.pathname.split('/');
    const sessionId = pathParts[pathParts.length - 1] || url.searchParams.get('id') || req.query?.id;

    if (!sessionId) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing session ID' }));
      return;
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        session,
        passId: `PASS-BINGAA-${session.id.slice(-8).toUpperCase()}`,
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

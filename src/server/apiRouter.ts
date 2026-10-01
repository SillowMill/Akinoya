import express, { Request, Response } from 'express';
import {
  stripe,
  createComicCheckoutSession,
  processCompletedCheckout,
  getInventoryStatus,
  loadOrders,
} from './stripeService';

export const apiApp = express();
export const apiRouter = express.Router();

// Mount Stripe webhook with raw body handling BEFORE json parser
apiApp.post(
  '/api/webhooks/stripe',
  express.raw({ type: '*/*' }),
  async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;

    try {
      if (webhookSecret && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        const rawPayload = typeof req.body === 'string' ? req.body : req.body.toString('utf8');
        event = JSON.parse(rawPayload);
        console.log('[API Webhook] Signature verification bypassed for local test event');
      }
    } catch (err: any) {
      console.error(`[API Webhook] Webhook error: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      try {
        const order = await processCompletedCheckout(session);
        res.status(200).json({
          received: true,
          orderId: order.id,
          passId: order.passId,
          waveRemaining: getInventoryStatus().available,
        });
        return;
      } catch (err: any) {
        console.error('[API Webhook] Error processing checkout completion:', err);
        res.status(500).json({ error: 'Failed to process order' });
        return;
      }
    }

    res.status(200).json({ received: true, event: event.type });
  }
);

// Standard JSON middleware for remaining API routes
apiApp.use(express.json());

// 1. Create Checkout Session
apiRouter.post('/create-checkout-session', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerEmail, customerName, shippingAddress, shippingCity, apartmentBus } = req.body || {};
    const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : undefined);

    const session = await createComicCheckoutSession({
      customerEmail,
      customerName,
      shippingAddress,
      shippingCity,
      apartmentBus,
      origin,
    });

    res.status(200).json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (err: any) {
    console.error('[API] create-checkout-session error:', err);
    res.status(500).json({
      error: err.message || 'Failed to initialize Stripe Checkout session',
    });
  }
});

// 2. Inventory Status Endpoint
apiRouter.get('/inventory/status', (_req: Request, res: Response): void => {
  const inventory = getInventoryStatus();
  res.status(200).json(inventory);
});

// 3. Session Verification Endpoint
apiRouter.get('/checkout/session/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.params.id;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const orders = loadOrders();
    const matchedOrder = orders.find((o) => o.id === sessionId);

    res.status(200).json({
      session,
      order: matchedOrder || null,
      passId: matchedOrder ? matchedOrder.passId : `PASS-BINGAA-${session.id.slice(-8).toUpperCase()}`,
      status: session.payment_status,
      customerEmail: session.customer_details?.email,
      customerName: session.customer_details?.name,
    });
  } catch (err: any) {
    console.error('[API] Retrieve session error:', err);
    res.status(404).json({ error: 'Session not found or invalid' });
  }
});

apiApp.use('/api', apiRouter);

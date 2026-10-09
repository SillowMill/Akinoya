import express, { Request, Response, NextFunction } from 'express';
import {
  getStripe,
  createComicCheckoutSession,
  processCompletedCheckout,
  getInventoryStatus,
  loadOrders,
} from './stripeService';
import {
  getPassRecord,
  verifyDnaCipher,
  generateAuthenticDnaCipher,
  registerPassHolder,
  generateTransferKey,
  claimTransferKey,
  isValidPassId,
} from './nfcDnaService';

export const apiApp = express();
export const apiRouter = express.Router();

// ─── Middleware: always set JSON content-type for all /api responses ──────────
apiApp.use('/api', (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// ─── Stripe Webhook (raw body BEFORE json parser) ─────────────────────────────
apiApp.post(
  '/api/webhooks/stripe',
  express.raw({ type: '*/*' }),
  async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;

    try {
      const stripe = getStripe();
      if (webhookSecret && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        const rawPayload = typeof req.body === 'string' ? req.body : req.body.toString('utf8');
        event = JSON.parse(rawPayload);
      }
    } catch (err: any) {
      console.error(`[API Webhook] Webhook error: ${err.message}`);
      res.status(400).json({ error: `Webhook Error: ${err.message}` });
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

// ─── Standard JSON middleware for remaining routes ────────────────────────────
apiApp.use(express.json());

// ─── 1. Create Checkout Session ───────────────────────────────────────────────
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
      error: err?.message || 'Failed to initialize Stripe Checkout session',
    });
  }
});

// ─── 2. Inventory Status ──────────────────────────────────────────────────────
apiRouter.get('/inventory/status', (_req: Request, res: Response): void => {
  try {
    const inventory = getInventoryStatus();
    res.status(200).json(inventory);
  } catch (err: any) {
    console.error('[API] inventory/status error:', err);
    res.status(200).json({ wave: 'Wave 2', total: 125, claimed: 0, available: 125 });
  }
});

// ─── 3. Session Verification ──────────────────────────────────────────────────
apiRouter.get('/checkout/session/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.params.id;
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const orders = loadOrders();
    const matchedOrder = orders.find((o) => o.id === sessionId);

    res.status(200).json({
      session,
      order: matchedOrder || null,
      passId: matchedOrder
        ? matchedOrder.passId
        : `PASS-BINGAA-${session.id.slice(-8).toUpperCase()}`,
      status: session.payment_status,
      customerEmail: session.customer_details?.email,
      customerName: session.customer_details?.name,
    });
  } catch (err: any) {
    console.error('[API] Retrieve session error:', err);
    res.status(404).json({ error: 'Session not found or invalid.' });
  }
});

// ─── 4. NFC Magic Link Token Redemption & Device Binding ──────────────────────
const _nfcRedemptions = new Map<string, { deviceId: string; redeemedAt: string }>();

apiRouter.all(['/nfc/redeem', '/nfc/verify'], (req: Request, res: Response): void => {
  const token = ((req.body?.token || req.query?.token) as string)?.trim().toUpperCase();
  const deviceId = (((req.body?.deviceId || req.query?.deviceId) as string) || 'UNKNOWN_DEVICE').trim();

  if (!token) {
    res.status(400).json({
      success: false,
      error: 'MISSING_TOKEN',
      message: 'Token parameter is required for NFC redemption.',
    });
    return;
  }

  if (!isValidPassId(token)) {
    res.status(403).json({
      success: false,
      error: 'INVALID_PASS_ID',
      token,
      message: 'This Pass ID is not recognized. Please use an authentic Äkinoya NFC pass.',
    });
    return;
  }

  const existing = _nfcRedemptions.get(token);

  if (existing) {
    if (existing.deviceId === deviceId) {
      res.status(200).json({
        success: true,
        bound: true,
        isExistingDevice: true,
        token,
        message: 'NFC Pass verified for authorized device session.',
      });
      return;
    } else {
      res.status(403).json({
        success: false,
        error: 'TOKEN_ALREADY_BOUND',
        token,
        message: 'This NFC magic link has already been bound to another device. Transfer not permitted.',
      });
      return;
    }
  }

  _nfcRedemptions.set(token, {
    deviceId,
    redeemedAt: new Date().toISOString(),
  });

  res.status(200).json({
    success: true,
    bound: true,
    isNewRedemption: true,
    token,
    message: 'NFC Pass successfully redeemed and bound to device.',
  });
});

// ─── 5. NXP NTAG 424 DNA Dynamic Verification Endpoint ────────────────────────
apiRouter.all('/nfc/verify-dna', (req: Request, res: Response): void => {
  const token = (req.body?.token || req.body?.id || req.query?.token || req.query?.id) as string;
  const enc = (req.body?.enc || req.query?.enc) as string | undefined;
  const cmac = (req.body?.cmac || req.query?.cmac) as string | undefined;

  if (!isValidPassId(token)) {
    res.status(403).json({
      valid: false,
      isAuthentic: false,
      status: 'INVALID PASS ID',
      error: 'INVALID_PASS_ID',
      message: 'This Pass ID is not recognized. Use the verification link from your physical Äkinoya pass.',
    });
    return;
  }

  const result = verifyDnaCipher(token, enc, cmac);
  const pass = getPassRecord(token);

  if (!result.valid) {
    res.status(403).json({
      valid: false,
      isAuthentic: false,
      status: result.status,
      error: result.error,
      message: result.message,
      pass,
    });
    return;
  }

  res.status(200).json({
    valid: true,
    isAuthentic: Boolean(enc && result.valid),
    status: enc ? 'AUTHENTIC FOUNDING PASS VERIFIED' : result.status,
    message: result.message,
    counter: result.counter,
    pass,
  });
});

// ─── 6. Holder Pass Registration ──────────────────────────────────────────────
apiRouter.post('/nfc/register', (req: Request, res: Response): void => {
  const token = (req.body?.token || req.body?.id) as string;
  const ownerName = (req.body?.ownerName || req.body?.displayName) as string;
  const ownerEmail = (req.body?.ownerEmail || req.body?.email) as string | undefined;
  const deviceId = req.body?.deviceId as string | undefined;

  if (!token) {
    res.status(400).json({ success: false, error: 'MISSING_TOKEN', message: 'Token is required' });
    return;
  }

  if (!ownerName || !ownerName.trim()) {
    res.status(400).json({ success: false, error: 'MISSING_NAME', message: 'Owner name or handle is required' });
    return;
  }

  const result = registerPassHolder(token, ownerName, ownerEmail, deviceId);
  res.status(200).json(result);
});

// ─── 7. Ownership Transfer Protocol ───────────────────────────────────────────
apiRouter.post('/nfc/transfer', (req: Request, res: Response): void => {
  const token = (req.body?.token || req.body?.id) as string;
  const deviceId = req.body?.deviceId as string | undefined;

  if (!token) {
    res.status(400).json({ success: false, error: 'MISSING_TOKEN', message: 'Token is required' });
    return;
  }

  const result = generateTransferKey(token, deviceId);
  res.status(200).json(result);
});

// ─── 8. Claim Transferred Pass ────────────────────────────────────────────────
apiRouter.post('/nfc/claim-transfer', (req: Request, res: Response): void => {
  const transferKey = (req.body?.transferKey || req.body?.key) as string;
  const newOwnerName = (req.body?.newOwnerName || req.body?.ownerName || req.body?.name) as string;
  const newOwnerEmail = (req.body?.newOwnerEmail || req.body?.email) as string | undefined;
  const deviceId = req.body?.deviceId as string | undefined;

  if (!transferKey || !transferKey.trim()) {
    res.status(400).json({ success: false, error: 'MISSING_TRANSFER_KEY', message: 'Transfer key is required' });
    return;
  }

  if (!newOwnerName || !newOwnerName.trim()) {
    res.status(400).json({ success: false, error: 'MISSING_NAME', message: 'New owner display name is required' });
    return;
  }

  const result = claimTransferKey(transferKey, newOwnerName, newOwnerEmail, deviceId);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.status(200).json(result);
});

// ─── 9. Generate Test Dynamic Cipher ──────────────────────────────────────────
apiRouter.get('/nfc/generate-test-cipher', (req: Request, res: Response): void => {
  const token = ((req.query?.token as string) || 'AKN-VIP-2027-X0914').trim();
  const cipher = generateAuthenticDnaCipher(token);
  res.status(200).json({
    token,
    cipher,
    sampleAuthenticUrl: `https://sillowmill.com/verify?token=${token}&enc=${cipher}`,
    message: 'Generated authentic dynamic AES-128 cipher for testing.',
  });
});

// ─── Mount router ─────────────────────────────────────────────────────────────
apiApp.use('/api', apiRouter);

// ─── Global error handler (always JSON, never plain text) ─────────────────────
apiApp.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API] Unhandled error:', err?.message || err);
  if (!res.headersSent) {
    res.status(500).json({ error: err?.message || 'Internal server error.' });
  }
});

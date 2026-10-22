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
  resetPassRecord,
  resetAllPassRecords,
  verifyDnaCipher,
  generateAuthenticDnaCipher,
  registerPassHolder,
  isValidPassId,
} from './nfcDnaService';
import { handleCertificateAction } from '../../api/nfc/_certificateService.js';
import {
  resetPassInGoogleSheets,
  syncPassClaimToGoogleSheets,
  syncSubscriberRowToGoogleSheets,
  appendWhitelistEmailToGoogleSheets,
  appendWaitlistSubmissionToGoogleSheets,
  WHITELIST_SPREADSHEET_ID,
} from '../../api/nfc/_googleSheetsSync.js';
import {
  generatePlanetRenders,
  generateSectorImages,
  generateSlotRender,
  checkAndLockUserGeneration,
  lockUserGeneration,
  resetGenerationLocks,
  normalizeSlot,
  SLOT_METADATA,
  checkAndResolveDynamicVideo,
  isValAiKeyConfigured,
  verifyFalApiConnection,
  loadFalLedger,
} from '../../api/_generatePlanet';
import { checkVipTokenStatus, claimVipTokenForUser, resetAllVipTokens, isFounderEmail } from '../lib/vipTokens';
import {
  registerUserCredentials,
  loginUserCredentials,
  getUserFromSessionToken,
  updateUserPassword,
  castSubmissionVote,
  getVotesSummary,
  saveSubmissionRecord,
  getAllSubmissionRecords,
} from './authVoteService';

export const apiApp = express();
export const apiRouter = express.Router();

// ─── Gateway Health Check ─────────────────────────────────────────────────────
apiRouter.get('/', (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'online',
    protocol: 'Akinoya VIP Protocol Gateway',
    timestamp: new Date().toISOString(),
  });
});

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

    const isMembership = req.body?.plan === 'membership' || req.body?.product === 'community_membership';
    if (isMembership) {
      res.status(403).json({
        error: 'Community membership pass public checkout is locked until launch on 09/01/2027.',
      });
      return;
    }

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
    res.status(200).json({ wave: 'Wave 2', total: 100, claimed: 0, available: 100 });
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

// ─── 5.5. Send Card PIN via Resend ─────────────────────────────────────────
apiRouter.post('/nfc/send-pin', async (req: Request, res: Response): Promise<void> => {
  const result = await handleCertificateAction({
    action: 'send-pin',
    token: req.body?.token || req.body?.passId || req.body?.id,
    email: req.body?.email,
    ownerName: req.body?.ownerName || req.body?.holderName || req.body?.name,
  });
  res.status(result.status).json(result.body);
});

// ─── 6. Holder Pass Registration ──────────────────────────────────────────────
apiRouter.post('/nfc/register', async (req: Request, res: Response): Promise<void> => {
  const body = req.body || {};

  // Magic Link dispatch via Resend
  if (body.action === 'magic-link') {
    const email = ((body.email as string) || '').trim().toLowerCase();
    const token = (body.token as string) || 'AKN-VIP-2027-X0914';
    if (!email || !email.includes('@')) {
      res.status(400).json({ success: false, error: 'INVALID_EMAIL', message: 'Please enter a valid email address.' });
      return;
    }

    const resendApiKey = process.env.RESEND_API_KEY || '';
    const host = req.headers['x-forwarded-host'] || req.headers?.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = req.headers?.origin || (host ? `${proto}://${host}` : 'https://www.sillowmill.com');
    const magicUrl = `${baseUrl}/verify/${token}?auth=magic&email=${encodeURIComponent(email)}`;

    // Also synchronize magic-link VIP email to Google Sheets
    const magicHolderName = ((body.ownerName || body.holderName || email.split('@')[0]) as string).trim();
    syncPassClaimToGoogleSheets(token, magicHolderName, email).catch(() => {});

    if (!resendApiKey) {
      res.status(200).json({ success: true, message: `Magic link dispatched to ${email}.`, magicUrl, devMode: true });
      return;
    }

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.AUTH_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'Sillow Mill <auth@sillowmill.com>',
          to: [email],
          subject: 'Your Äkinoya VIP Magic Sign-In Link',
          html: `<div style="background-color: #05080e; color: #ffffff; padding: 32px; font-family: sans-serif; text-align: center; border-radius: 12px;">
            <h2 style="color: #38bdf8; margin-bottom: 12px;">Äkinoya Community Access</h2>
            <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">Click the button below to sign in instantly with your verified pass session.</p>
            <a href="${magicUrl}" style="background-color: #06b6d4; color: #000000; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">SIGN IN TO ÄKINOYA →</a>
            <p style="color: #64748b; font-size: 11px; margin-top: 24px;">If you did not request this email, you can safely ignore it.</p>
          </div>`,
        }),
      });
    } catch (err) {
      console.warn('[Register/MagicLink] Dispatch failed:', err);
    }

    res.status(200).json({ success: true, message: `Magic link dispatched to ${email}. Check your inbox!` });
    return;
  }

  // Bingäa Certificate of Authenticity actions (Card PIN + optional email OTP)
  if (body.action === 'send-pin' || body.action === 'send-otp' || body.action === 'certify') {
    const result = await handleCertificateAction(body);
    if (body.action === 'certify' && result.status === 200) {
      const certPassId = (body.token || body.passId || body.id) as string;
      const certName = (body.ownerName || body.holderName || body.name) as string;
      const certEmail = (body.email || body.ownerEmail || body.holderEmail) as string | undefined;
      if (certPassId && certName) {
        await registerPassHolder(certPassId, certName, certEmail, body.deviceId).catch(() => {});
      }
    }
    res.status(result.status).json(result.body);
    return;
  }

  const token = (body.token || body.id) as string;
  const ownerEmail = ((body.ownerEmail || body.email) as string | undefined)?.trim();
  const ownerName = ((body.ownerName || body.displayName || body.holderName || (ownerEmail ? ownerEmail.split('@')[0] : '')) as string).trim();
  const deviceId = body.deviceId as string | undefined;

  if (!token) {
    res.status(400).json({ success: false, error: 'MISSING_TOKEN', message: 'Token is required' });
    return;
  }

  if (!ownerName) {
    res.status(400).json({ success: false, error: 'MISSING_NAME', message: 'Owner name or handle is required' });
    return;
  }

  const result = await registerPassHolder(token, ownerName, ownerEmail, deviceId);
  res.status(result.success === false ? 403 : 200).json(result);
});

// ─── 6.5. Reset VIP Pass (Development / Test Reset) ──────────────────────────
apiRouter.all('/nfc/reset-pass', async (req: Request, res: Response): Promise<void> => {
  const token = ((req.body?.token || req.body?.id || req.query?.token || req.query?.id || 'AKN-VIP-2027-X001') as string)
    .trim()
    .toUpperCase();
  if (!isValidPassId(token)) {
    res.status(400).json({
      success: false,
      error: 'INVALID_PASS_ID',
      message: 'Pass ID not recognized.',
    });
    return;
  }

  const passRecord = resetPassRecord(token);
  _nfcRedemptions.delete(token);
  const sheetResult = await resetPassInGoogleSheets(token).catch(() => ({ synced: false }));

  res.status(200).json({
    success: true,
    token,
    message: `Digital VIP Pass ${token} has been reset to active / unclaimed status.`,
    pass: passRecord,
    sheetResult,
    resetAt: new Date().toISOString(),
  });
});

// ─── 6.6. Reset All VIP Passes (Non-Founder Reissuance) ───────────────────────
apiRouter.all('/nfc/reset-all-passes', async (req: Request, res: Response): Promise<void> => {
  try {
    const adminKey = req.body?.adminKey || req.query?.adminKey;
    const email = req.body?.email || req.query?.email;
    const isFounder = (adminKey && adminKey === process.env.ADMIN_KEY) || isFounderEmail(email as string);

    if (!isFounder) {
      res.status(403).json({ success: false, error: 'UNAUTHORIZED', message: 'Restricted to founder credentials.' });
      return;
    }

    // Reset local/tmp pass store for all guest tokens X001..X100
    resetAllPassRecords();

    // Re-initialize Founder Pass #0
    const founderPass = getPassRecord('AKN-VIP-2027-X0914');
    founderPass.ownerName = 'Odi Selis';
    founderPass.ownerEmail = 'odi.selis3@gmail.com';
    founderPass.isClaimed = true;
    founderPass.status = 'MASTER FOUNDER ORIGINAL';

    // In Supabase, reset guest tokens and preserve founder
    const supabaseReset = await resetAllVipTokens().catch((e: any) => ({ success: false, error: e?.message }));

    res.status(200).json({
      success: true,
      message: 'All non-founder VIP tokens have been reset and re-issued. Founder Pass (#0) remains active.',
      founderPass,
      supabaseReset,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Reset failed' });
  }
});

// ─── 7. Whitelist Subscription (Automated Google Sheets Capture) ─────────────
apiRouter.post('/whitelist/subscribe', async (req: Request, res: Response): Promise<void> => {
  const rawEmail = ((req.body?.email as string) || '').trim().toLowerCase();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rawEmail);

  if (!rawEmail || !isValidEmail) {
    res.status(400).json({ success: false, error: 'INVALID_EMAIL', message: 'Please provide a valid email address.' });
    return;
  }

  const source = ((req.body?.source as string) || 'Comic Preview Gate (Page 3 Lock)').trim();
  const chapter = ((req.body?.chapter as string) || 'Bingäa Issue #1 — Chapter 2 Preview Gate').trim();
  const notes = ((req.body?.notes as string) || 'Wave 2 Priority Notification & Early Access').trim();

  console.log(`[WHITELIST] Subscribed: ${rawEmail} (${source})`);
  const sheetSync = await appendWhitelistEmailToGoogleSheets({
    email: rawEmail,
    source,
    chapter,
    notes,
    timestamp: new Date().toISOString(),
  }).catch((err: any) => ({ success: false, error: err?.message }));

  res.status(200).json({
    success: true,
    email: rawEmail,
    source,
    chapter,
    spreadsheetId: WHITELIST_SPREADSHEET_ID,
    sheetSync,
    message: "You've been added to the Äkinoya Whitelist! You will receive priority notification for the next drop.",
  });
});

// ─── 8. Waitlist Planet Submission (Capture, Google Sheet Sync & January 9 Queue) ──
apiRouter.post(['/waitlist/submit', '/api/waitlist/submit'], async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body || {};
    const email = String(body.email || '').trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

    if (!email || !isValidEmail) {
      res.status(400).json({ success: false, error: 'INVALID_EMAIL', message: 'Please provide a valid email address.' });
      return;
    }

    const firstName = String(body.first_name || body.firstName || email.split('@')[0]).trim();
    const lastInitial = String(body.last_initial || body.lastInitial || '').trim().toUpperCase();
    const questionnaireResponses = body.questionnaire_responses || body.questionnaireResponses || body.answers || body;
    const timestamp = body.timestamp || new Date().toISOString();
    const releaseTarget = '2027-01-09T00:00:00Z';
    const generationStatus = 'queued';

    console.log(`[WAITLIST] Queued submission for ${email} (${firstName} ${lastInitial}). Release: ${releaseTarget}`);

    const syncResult = await appendWaitlistSubmissionToGoogleSheets({
      timestamp,
      firstName,
      lastInitial,
      email,
      questionnaireResponses,
      generationStatus,
      releaseTarget,
    });

    res.status(200).json({
      success: true,
      message: 'Planet request queued for batch synthesis. World will be revealed 9 januari.',
      data: {
        email,
        firstName,
        lastInitial,
        generationStatus,
        releaseTarget,
        syncResult,
      },
    });
  } catch (err: any) {
    console.error('[API] /waitlist/submit error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Internal server error processing waitlist submission' });
  }
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

// ─── 10. Generate Planet Prompts & Visuals (Fal.ai Flux Schnell Pipeline) ─────
apiRouter.all(
  ['/generate-planet', '/planet/generate', '/generate-sector-images', '/sector/generate'],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body || {};

      if (body.action === 'balance-check' || body.action === 'fal-status' || req.query?.action === 'balance-check') {
        const falStatus = await verifyFalApiConnection();
        res.status(200).json({
          success: true,
          ...falStatus,
          ledger: loadFalLedger(),
        });
        return;
      }

      if (body.resetLocks) {
        resetGenerationLocks(body.userId, body.email);
        res.status(200).json({ success: true, message: 'Generation lock reset for Founder testing.' });
        return;
      }

      if (body.markCompleted) {
        lockUserGeneration(body.userId, body.email, body.deviceId);
        res.status(200).json({ success: true, message: 'Generation locked.' });
        return;
      }

      const isSlot = Boolean(body.slot);
      if (body.userId || body.email || body.deviceId) {
        const lockCheck = await checkAndLockUserGeneration(body.userId, body.email, body.deviceId, isSlot);
        if (!lockCheck.allowed) {
          res.status(403).json({
            success: false,
            error: 'SUBMISSION_LOCKED',
            message: lockCheck.reason || 'You have already claimed your 1 generation attempt.',
          });
          return;
        }
      }

      if (body.slot) {
        const slotResult = await generateSlotRender(body.slot, body);
        res.status(200).json(slotResult);
        return;
      }

      const result = await generatePlanetRenders(body);
      res.status(200).json(result);
    } catch (err: any) {
      console.warn('[API] generate-planet queued notice:', err?.message || err);
      if (req.body?.slot) {
        const normSlot = normalizeSlot(req.body.slot);
        res.status(200).json({
          success: false,
          code: 'QUEUED_PENDING',
          status: 'QUEUED_PENDING',
          message: 'Synthesizer recalibrating.',
          slot: normSlot,
          slotIndex: (SLOT_METADATA[normSlot] || SLOT_METADATA.hero).index,
          slotLabel: (SLOT_METADATA[normSlot] || SLOT_METADATA.hero).label,
          planetName: req.body.planetName || req.body.worldName || req.body.sectorName || 'Äkinoya Frontier',
          model: 'Fal.ai Flux Schnell (QUEUED_PENDING)',
        });
        return;
      }
      res.status(200).json({
        success: false,
        code: 'QUEUED_PENDING',
        status: 'QUEUED_PENDING',
        message: 'Synthesizer recalibrating.',
      });
    }
  }
);

// ─── 10.1 Fal.ai Balance & Status Bridge ($25 Pool Verification) ─────────────
apiRouter.all(['/fal/status', '/fal/balance', '/generate-planet/balance'], async (_req: Request, res: Response): Promise<void> => {
  try {
    const status = await verifyFalApiConnection();
    res.status(200).json({
      success: true,
      ...status,
      ledger: loadFalLedger(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to verify Fal.ai balance',
      ledger: loadFalLedger(),
    });
  }
});

// ─── 11. VIP Token Verification & Single-Claim ────────────────────────────────
apiRouter.all(['/vip/verify'], async (req: Request, res: Response): Promise<void> => {
  try {
    const token = ((req.query?.token || req.query?.vip_token || req.body?.token || req.body?.vip_token) as string) || '';
    const userId = ((req.query?.userId || req.body?.userId) as string) || '';
    const email = ((req.query?.email || req.body?.email) as string) || '';
    const result = await checkVipTokenStatus(token, userId, email);
    res.status(result.allowed ? 200 : result.isAlreadyClaimed ? 403 : 400).json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'VIP verify failed' });
  }
});

apiRouter.all(['/vip/claim'], async (req: Request, res: Response): Promise<void> => {
  try {
    const token = ((req.body?.token || req.body?.vip_token || req.query?.token) as string) || '';
    const userId = ((req.body?.userId || req.query?.userId) as string) || '';
    const holderName = ((req.body?.holderName || req.body?.ownerName || req.query?.holderName) as string) || '';
    const holderEmail = ((req.body?.holderEmail || req.body?.email || req.query?.email) as string) || '';
    const result = await claimVipTokenForUser(token, userId, holderName, holderEmail);
    if (result.success && token) {
      const resolvedName = holderName || (holderEmail ? holderEmail.split('@')[0] : 'Founding VIP Holder');
      await registerPassHolder(token, resolvedName, holderEmail).catch(() => {});
      await syncPassClaimToGoogleSheets(token, resolvedName, holderEmail).catch(() => {});
    }
    res.status(result.success ? 200 : result.error?.includes('claimed') ? 403 : 400).json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'VIP claim failed' });
  }
});

// ─── 12. Direct Google Sheets Sync (VIP GUESTS & Subscribers) ─────────────────
apiRouter.all(['/sync-sheets', '/auth/sync-sheets'], async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body || {};
    const record = payload.record || payload;

    let firstName = String(record.first_name || record.firstName || '').trim();
    let lastName = String(record.last_name || record.lastName || '').trim();
    const rawFullName = String(record.fullName || record.full_name || record.holderName || record.ownerName || '').trim();
    if (!firstName && rawFullName) {
      const parts = rawFullName.split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ');
    }
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || rawFullName;
    const email = String(record.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      res.status(400).json({ success: false, error: 'Valid email is required for subscriber sync' });
      return;
    }

    const isFounder = email === 'odi.selis3@gmail.com';
    let role = isFounder ? 'CREATOR' : String(record.role || 'FREE').trim().toUpperCase();
    const rawVipCode = String(record.vip_code_redeemed || record.vipCode || record.passId || record.token || '').trim();
    const registrationDate = record.timestamp || record.created_at || new Date().toISOString();
    const claimedSector = String(
      record.worldName ||
      record.planetName ||
      record.claimed_sector ||
      record.sector ||
      ''
    ).trim();

    // 1. Sync to Subscribers tab
    const subSync = await syncSubscriberRowToGoogleSheets({
      firstName,
      lastName,
      fullName,
      email,
      role,
      vipCode: rawVipCode,
      claimedSector,
      registrationDate,
    });

    // 2. If valid VIP pass code is present, sync and lock VIP GUESTS tab
    let vipSync = null;
    const isVipPassCode = rawVipCode && rawVipCode !== 'N/A' && (
      rawVipCode.toUpperCase().startsWith('AKN-VIP') ||
      /^#?\d{1,3}$/.test(rawVipCode) ||
      /^X\d{1,4}$/i.test(rawVipCode)
    );

    if (isVipPassCode || isFounder) {
      const passIdToSync = isFounder ? 'AKN-VIP-2027-X0914' : rawVipCode;
      vipSync = await syncPassClaimToGoogleSheets(passIdToSync, fullName || email.split('@')[0], email);
    }

    res.status(200).json({
      success: subSync?.success ?? true,
      email,
      subscriberSync: subSync,
      vipSync,
      tab: 'Subscribers',
    });
  } catch (err: any) {
    console.error('[API] sync-sheets error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Internal server error syncing to Google Sheets' });
  }
});

// ─── 13. Standard Email/Password Authentication ────────────────────────────────
apiRouter.post('/auth/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, role, passCode } = req.body || {};

    // Validate VIP pass if provided
    if (passCode && String(passCode).trim()) {
      const cleanPass = String(passCode).trim().toUpperCase();
      const tokenStatus = await checkVipTokenStatus(cleanPass, null, email);
      if (tokenStatus.isAlreadyClaimed && !tokenStatus.isClaimedByMe) {
        res.status(400).json({
          success: false,
          error: 'Ai! Deze VIP-pas is al geclaimd.',
          message: 'Ai! Deze VIP-pas is al geclaimd.',
        });
        return;
      }
    }

    const result = await registerUserCredentials({
      email,
      password,
      firstName,
      lastName,
      role,
      passCode,
    });
    if (result.success && email) {
      const fullName = [firstName, lastName].filter(Boolean).join(' ') || String(email).split('@')[0];
      await syncSubscriberRowToGoogleSheets({
        firstName: firstName || fullName,
        lastName: lastName || '',
        email,
        role: result.profile?.role || role || 'FREE',
        vipCode: result.profile?.vip_code_redeemed || passCode || 'N/A',
        registrationDate: new Date().toISOString(),
      }).catch((syncErr) => console.warn('[Register] Google Sheets subscriber sync notice:', syncErr));

      if (passCode && String(passCode).trim()) {
        const cleanPass = String(passCode).trim().toUpperCase();
        await claimVipTokenForUser(cleanPass, result.user.id, fullName, email).catch(() => {});
        await registerPassHolder(cleanPass, fullName, email).catch(() => {});
        await syncPassClaimToGoogleSheets(cleanPass, fullName, email).catch((vipErr) =>
          console.warn('[Register] Google Sheets VIP claim sync notice:', vipErr)
        );
      }
    }
    res.status(result.success ? 200 : 400).json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Registration failed' });
  }
});

apiRouter.post('/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body || {};
    const result = await loginUserCredentials(email, password);
    res.status(result.success ? 200 : 401).json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Login failed' });
  }
});

apiRouter.get('/auth/session', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.token as string)) || '';
    const result = await getUserFromSessionToken(token);
    res.status(result.success ? 200 : 401).json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Session validation failed' });
  }
});

apiRouter.post('/auth/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, redirectTo } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
      return;
    }

    const resendApiKey = process.env.RESEND_API_KEY || '';
    const host = req.headers['x-forwarded-host'] || req.headers?.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const siteBase = req.headers?.origin || (host ? `${proto}://${host}` : 'https://sillowmill.com');
    const updateUrl = redirectTo || `${siteBase}/update-password`;
    const fromAddress = process.env.AUTH_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'Sillow Mill <auth@sillowmill.com>';

    if (resendApiKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [cleanEmail],
            subject: 'Sillow Mill // Security Frequency: Password Recovery',
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #05070c; color: #ffffff; padding: 40px 20px; line-height: 1.6;">
                <div style="max-width: 540px; margin: 0 auto; background-color: #0a0d14; border: 1px solid rgba(34, 211, 238, 0.3); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.85);">
                  <div style="padding: 32px 32px 24px 32px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
                    <p style="letter-spacing: 3px; font-size: 11px; font-weight: 700; color: #22d3ee; margin: 0 0 8px 0; text-transform: uppercase;">SILLOW MILL · SECURITY PROTOCOL</p>
                    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 0; letter-spacing: 0.5px;">Password Recovery Transmission</h1>
                    <p style="font-size: 12px; color: rgba(255, 255, 255, 0.5); margin: 6px 0 0 0; font-family: monospace;">Designated Frequency: ${cleanEmail}</p>
                  </div>
                  <div style="padding: 32px;">
                    <p style="font-size: 14px; color: rgba(255, 255, 255, 0.85); margin: 0 0 16px 0;">
                      A security recovery beacon was initiated for your Sillow Mill account terminal.
                    </p>
                    <p style="font-size: 13px; color: rgba(255, 255, 255, 0.65); margin: 0 0 24px 0;">
                      Click the cryptographic recovery link below to establish a new password and unlock full portal telemetry:
                    </p>
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${updateUrl}" style="background-color: #06b6d4; color: #000000; padding: 14px 32px; border-radius: 10px; font-weight: 800; font-size: 13px; letter-spacing: 1px; text-decoration: none; display: inline-block; box-shadow: 0 0 20px rgba(6, 182, 212, 0.4); text-transform: uppercase;">RESET PASSWORD NOW →</a>
                    </div>
                    <p style="font-size: 11px; color: #64748b; margin-top: 24px; text-align: center;">
                      For your protection, this recovery frequency token will expire in 60 minutes. If you did not initiate this transmission, no action is required.
                    </p>
                  </div>
                </div>
              </div>`,
          }),
        });
      } catch (sendErr) {
        console.warn('[Auth/ResetPassword] Resend dispatch warning:', sendErr);
      }
    }

    res.status(200).json({
      success: true,
      message: 'A secure recovery link has been dispatched to your designated frequency.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Password reset failed' });
  }
});

apiRouter.post('/auth/update-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required.' });
      return;
    }
    const result = await updateUserPassword(email, password);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Password update failed' });
  }
});

// ─── 14. Persistent Voting & Self-Vote Prevention ─────────────────────────────
apiRouter.post(['/dossier/vote', '/vote'], async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      submissionId,
      voterId,
      voterEmail,
      voterUsername,
      submissionAuthorId,
      submissionAuthorEmail,
      submissionAuthorUsername,
      baseVotes,
    } = req.body || {};

    const result = castSubmissionVote({
      submissionId,
      voterId: voterId || voterEmail || 'anon_voter',
      voterEmail,
      voterUsername,
      submissionAuthorId,
      submissionAuthorEmail,
      submissionAuthorUsername,
      baseVotes: Number(baseVotes) || undefined,
    });

    res.status(result.success ? 200 : result.error?.includes('Self-voting') ? 403 : 400).json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Voting failed' });
  }
});

apiRouter.get(['/dossier/votes', '/votes'], async (req: Request, res: Response): Promise<void> => {
  try {
    const voterId = (req.query.voterId as string) || '';
    const voterEmail = (req.query.voterEmail as string) || '';
    const persistentVoterId = (req.query.persistentVoterId as string) || '';
    const summary = getVotesSummary(voterId, voterEmail, persistentVoterId);
    res.status(200).json({ success: true, ...summary });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Fetch votes failed' });
  }
});

// ─── 15. Server-Side Custom Dossier Submissions Persistence ──────────────────
apiRouter.post(['/dossier/submission', '/submission'], async (req: Request, res: Response): Promise<void> => {
  try {
    const sub = req.body;
    const result = saveSubmissionRecord(sub);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to save submission' });
  }
});

apiRouter.get(['/dossier/submissions', '/submissions'], async (_req: Request, res: Response): Promise<void> => {
  try {
    const submissions = getAllSubmissionRecords();
    res.status(200).json({ success: true, submissions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch submissions' });
  }
});

// ─── 16. Dynamic Val.ai / Fal.ai Video Pipeline Status & Resolver ────────────
apiRouter.all(['/video-pipeline/status', '/generate-planet/video-check'], async (req: Request, res: Response): Promise<void> => {
  try {
    const planetId = (req.body?.planetId || req.query.planetId as string || '').trim();
    const planetName = (req.body?.planetName || req.query.planetName as string || '').trim();
    const heroImageUrl = (req.body?.heroImageUrl || req.query.heroImageUrl as string || '').trim();
    const existingVideoUrl = (req.body?.existingVideoUrl || req.query.existingVideoUrl as string || '').trim();
    const triggerSynthesis = req.body?.triggerSynthesis !== false && req.query.triggerSynthesis !== 'false';

    const result = await checkAndResolveDynamicVideo({
      planetId,
      planetName,
      heroImageUrl,
      existingVideoUrl,
      triggerSynthesis,
    });

    res.status(200).json(result);
  } catch (err: any) {
    res.status(200).json({
      success: true,
      keyConfigured: false,
      isAiVideoAvailable: false,
      videoUrl: '',
      pipelineMode: 'FALLBACK_SLIDESHOW_MONTAGE',
      status: 'FALLBACK_MONTAGE',
      error: err?.message || 'Pipeline check fallback',
    });
  }
});

// ─── Mount router at both /api and / for Express & Vercel Serverless ──────────
apiApp.use('/api', apiRouter);
apiApp.use('/', apiRouter);

// ─── Global error handler (always JSON, never plain text) ─────────────────────
apiApp.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API] Unhandled error:', err?.message || err);
  if (!res.headersSent) {
    res.status(500).json({ error: err?.message || 'Internal server error.' });
  }
});

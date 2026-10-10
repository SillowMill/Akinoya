import crypto from 'crypto';

/**
 * Bingäa Issue #1 — Certificate of Authenticity service.
 *
 * Stateless by design (Vercel serverless has no shared memory):
 *  - Card Security PIN: 6 digits derived from HMAC(PASS_PIN_SECRET, passId). The PIN is printed
 *    on the physical card; generate the full print list with `node scripts/generate-pass-pins.mjs`.
 *  - Email 2FA OTP (optional): 6 digits derived from HMAC(secret, passId|email|10-min window),
 *    delivered through Resend when RESEND_API_KEY is configured.
 *  - Certificate signature: HMAC-SHA256(CERT_SIGNING_SECRET, canonical certificate payload).
 */

export const TOTAL_EDITION_LIMIT = 100;
const OTP_WINDOW_MS = 10 * 60 * 1000;

const PIN_SECRET = process.env.PASS_PIN_SECRET || 'akinoya-founding-pass-pin-v1';
const CERT_SECRET = process.env.CERT_SIGNING_SECRET || 'akinoya-bingaa-coa-signing-v1';
const OTP_SECRET = process.env.OTP_SECRET || `${PIN_SECRET}:otp`;

const PASS_ID_PATTERNS = [/^AKN-VIP-\d{4}-[A-Z]\d{4}$/, /^AKN-\d{4}$/, /^SM\d{3}-[A-Z0-9]{4}$/];

export function normalizePassId(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().toUpperCase().replace(/^#/, '');
}

export function isValidPassId(raw) {
  const clean = normalizePassId(raw);
  return clean.length > 0 && clean.length <= 32 && PASS_ID_PATTERNS.some((re) => re.test(clean));
}

export function deriveEditionNumber(passId) {
  const clean = normalizePassId(passId);
  if (
    clean.includes('X0914') ||
    clean.includes('0914') ||
    clean === 'AKN-VIP-2027-X0914' ||
    clean === 'AKN-2027' ||
    clean === 'AKN-VIP-2027'
  ) {
    return 1;
  }
  const match = clean.match(/(\d+)/g);
  if (!match || match.length === 0) return 1;
  const parsedNumber = parseInt(match[match.length - 1], 10);
  if (isNaN(parsedNumber)) return 1;
  const bounded = (parsedNumber % TOTAL_EDITION_LIMIT) || TOTAL_EDITION_LIMIT;
  return Math.min(Math.max(bounded, 1), TOTAL_EDITION_LIMIT);
}

const hmacHex = (secret, payload) => crypto.createHmac('sha256', secret).update(payload).digest('hex');
const sixDigits = (hex) => String(parseInt(hex.slice(0, 12), 16) % 1_000_000).padStart(6, '0');

const safeEqual = (a, b) => {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

export function generateCardPin(passId) {
  return sixDigits(hmacHex(PIN_SECRET, `PIN|${normalizePassId(passId)}`));
}

export function verifyCardPin(passId, pin) {
  const clean = String(pin || '').replace(/\D/g, '');
  return clean.length === 6 && safeEqual(clean, generateCardPin(passId));
}

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));

function otpForWindow(passId, email, windowIndex) {
  return sixDigits(hmacHex(OTP_SECRET, `OTP|${normalizePassId(passId)}|${normalizeEmail(email)}|${windowIndex}`));
}

export function verifyEmailOtp(passId, email, otp) {
  const clean = String(otp || '').replace(/\D/g, '');
  if (clean.length !== 6) return false;
  const now = Math.floor(Date.now() / OTP_WINDOW_MS);
  return [now, now - 1].some((w) => safeEqual(clean, otpForWindow(passId, email, w)));
}

export function isEmailOtpConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmailOtp(passId, email) {
  if (!isEmailOtpConfigured()) {
    return {
      success: false,
      status: 503,
      error: 'EMAIL_OTP_UNAVAILABLE',
      message: 'Email verification is not available right now. You can continue with your Card PIN only.',
    };
  }

  const code = otpForWindow(passId, email, Math.floor(Date.now() / OTP_WINDOW_MS));
  const from = process.env.OTP_FROM_EMAIL || 'Sillow Mill <onboarding@resend.dev>';
  const html = `
    <div style="font-family:Arial,sans-serif;background:#05070c;color:#ffffff;padding:32px">
      <p style="letter-spacing:2px;font-size:12px;color:#67e8f9;margin:0 0 12px">SILLOW MILL · ÄKINOYA</p>
      <h1 style="font-size:20px;margin:0 0 16px">Your Bingäa certificate verification code</h1>
      <p style="font-size:32px;letter-spacing:8px;font-weight:bold;margin:0 0 16px">${code}</p>
      <p style="font-size:13px;color:#9ca3af;margin:0">Pass ${normalizePassId(passId)} · valid for 10 minutes.
      If you did not request this code, you can ignore this email.</p>
    </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [normalizeEmail(email)],
        subject: 'Your Bingäa Certificate verification code',
        html,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[COA] Resend delivery failed:', res.status, detail);
      return { success: false, status: 502, error: 'EMAIL_SEND_FAILED', message: 'Could not send the verification email.' };
    }
    return { success: true, status: 200, message: `Verification code sent to ${normalizeEmail(email)}.` };
  } catch (err) {
    console.error('[COA] Resend request error:', err?.message || err);
    return { success: false, status: 502, error: 'EMAIL_SEND_FAILED', message: 'Could not send the verification email.' };
  }
}

export async function sendEmailCardPin(passId, email, holderName = 'Founding Holder') {
  const normalizedId = normalizePassId(passId);
  if (!isValidPassId(normalizedId)) {
    return { success: false, status: 400, error: 'INVALID_PASS', message: 'This Pass ID is not recognized.' };
  }
  if (!isValidEmail(email)) {
    return { success: false, status: 400, error: 'INVALID_EMAIL', message: 'Please enter a valid email address.' };
  }

  const pin = generateCardPin(normalizedId);
  const editionNumber = deriveEditionNumber(normalizedId);
  const cleanName = sanitizeHolderName(holderName) || 'Founding Holder';
  const cleanEmail = normalizeEmail(email);

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn(`[COA DEV] RESEND_API_KEY is not set. Generated Card PIN for #${normalizedId} is: ${pin}`);
    return {
      success: true,
      status: 200,
      devMode: true,
      pin,
      message: `Card PIN generated for ${cleanEmail}. (Development notice: PIN is ${pin})`,
    };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'Sillow Mill <onboarding@resend.dev>';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #05070c; color: #ffffff; padding: 40px 20px; line-height: 1.6;">
      <div style="max-width: 540px; margin: 0 auto; background-color: #0a0d14; border: 1px solid rgba(34, 211, 238, 0.25); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
        <div style="padding: 32px 32px 24px 32px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
          <p style="letter-spacing: 3px; font-size: 11px; font-weight: 700; color: #67e8f9; margin: 0 0 8px 0; text-transform: uppercase;">SILLOW MILL · ÄKINOYA PROTOCOL</p>
          <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 0; letter-spacing: 0.5px;">Your Card Security PIN</h1>
          <p style="font-size: 12px; color: rgba(255, 255, 255, 0.5); margin: 6px 0 0 0; font-family: monospace;">Founding Pass #${normalizedId} · Edition #${editionNumber} of 100</p>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 14px; color: rgba(255, 255, 255, 0.85); margin: 0 0 16px 0;">
            Greetings, <strong>${cleanName}</strong>.
          </p>
          <p style="font-size: 13px; color: rgba(255, 255, 255, 0.7); margin: 0 0 24px 0;">
            Use the 6-digit Card Security PIN below to authenticate your Founding Member status, unlock your official Bingäa Issue #1 Certificate of Authenticity, and gain access to all exclusive downloads.
          </p>
          <div style="background-color: #000000; border: 1px solid rgba(34, 211, 238, 0.4); border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
            <div style="font-size: 11px; font-family: monospace; color: #67e8f9; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">SECURITY PIN</div>
            <div style="font-size: 38px; font-family: monospace; font-weight: 800; color: #ffffff; letter-spacing: 12px; margin-left: 12px;">${pin}</div>
          </div>
          <p style="font-size: 12px; color: rgba(255, 255, 255, 0.5); margin: 0; line-height: 1.5;">
            Physical cards display edition numbers (#${editionNumber}/100) and do not have printed PINs. This PIN is deterministically bound to pass #${normalizedId} and secures your single-device session.
          </p>
        </div>
        <div style="padding: 20px 32px; background-color: rgba(0, 0, 0, 0.4); border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center; font-size: 11px; color: rgba(255, 255, 255, 0.4); font-family: monospace;">
          Sector 04 · Äkinoya Genesis Whitelist · <a href="mailto:Odi@sillowmill.com" style="color: #67e8f9; text-decoration: none;">Odi@sillowmill.com</a>
        </div>
      </div>
    </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [cleanEmail],
        subject: `Your Äkinoya Card Security PIN — Pass #${normalizedId}`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[COA] Resend delivery error:', res.status, errText);
      let errMsg = 'Failed to deliver PIN via Resend.';
      try {
        const parsed = JSON.parse(errText);
        if (parsed.message) errMsg = parsed.message;
      } catch {}
      return { success: false, status: 502, error: 'RESEND_ERROR', message: errMsg };
    }

    return {
      success: true,
      status: 200,
      message: `Card Security PIN dispatched to ${cleanEmail}. Check your inbox.`,
    };
  } catch (err) {
    console.error('[COA] Resend request exception:', err);
    return { success: false, status: 502, error: 'RESEND_ERROR', message: 'Could not connect to email delivery service.' };
  }
}

export function sanitizeHolderName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

export function issueCertificate(passId, holderName, emailVerified = true) {
  const normalizedId = normalizePassId(passId);
  const editionNumber = deriveEditionNumber(normalizedId);
  const claimedAt = new Date().toISOString();
  const payload = ['BINGAA-ISSUE-1', normalizedId, holderName, editionNumber, claimedAt].join('|');
  const signature = hmacHex(CERT_SECRET, payload).toUpperCase();

  return {
    certificateId: `COA-BNG1-${String(editionNumber).padStart(3, '0')}-${signature.slice(0, 6)}`,
    title: 'CERTIFICATE OF AUTHENTICITY — BINGÄA ISSUE #1',
    passId: normalizedId,
    holderName,
    editionNumber,
    editionTotal: TOTAL_EDITION_LIMIT,
    status: 'OFFICIALLY VERIFIED',
    emailVerified: Boolean(emailVerified),
    claimedAt,
    signatureAlgorithm: 'HMAC-SHA256',
    signature,
  };
}

/**
 * Shared request handler for both the Vercel function (api/nfc/register.js) and the local
 * Express router. Returns { status, body }.
 */
export async function handleCertificateAction(body = {}) {
  const action = body.action;
  const passId = normalizePassId(body.token || body.passId || body.id);
  const email = normalizeEmail(body.email);

  if (!isValidPassId(passId)) {
    return { status: 400, body: { success: false, error: 'INVALID_PASS', message: 'This Pass ID is not recognized.' } };
  }

  // Action: Send Card PIN to Email via Resend
  if (action === 'send-pin') {
    const result = await sendEmailCardPin(passId, email, body.ownerName || body.holderName || body.name);
    return { status: result.status, body: result };
  }

  // Action: Optional email OTP (legacy)
  if (action === 'send-otp') {
    if (!isValidEmail(email)) {
      return { status: 400, body: { success: false, error: 'INVALID_EMAIL', message: 'Please enter a valid email address.' } };
    }
    const result = await sendEmailOtp(passId, email);
    return { status: result.status, body: result };
  }

  // Action: Authenticate Card PIN & generate Certificate of Authenticity
  if (action === 'certify') {
    const pin = body.pin;
    if (!verifyCardPin(passId, pin)) {
      return {
        status: 401,
        body: { success: false, error: 'INVALID_PIN', message: 'The 6-digit Card Security PIN does not match this pass.' },
      };
    }

    const holderName = sanitizeHolderName(body.ownerName || body.holderName || body.name);
    if (!holderName) {
      return { status: 400, body: { success: false, error: 'MISSING_NAME', message: 'A holder name is required.' } };
    }

    const cert = issueCertificate(passId, holderName, Boolean(email));
    return {
      status: 200,
      body: {
        success: true,
        status: 'OFFICIALLY VERIFIED',
        certificate: cert,
      },
    };
  }

  return { status: 400, body: { success: false, error: 'UNKNOWN_ACTION', message: 'Unsupported certificate action.' } };
}


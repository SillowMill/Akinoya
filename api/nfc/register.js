import { registerPassHolder } from './_nfcDnaService.js';
import { handleCertificateAction } from './_certificateService.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch {
    body = {};
  }

  const isSendPin = body.action === 'send-pin' || (req.url && req.url.includes('send-pin'));

  // Magic Link dispatch via Resend
  if (body.action === 'magic-link') {
    const email = (body.email || '').trim().toLowerCase();
    const token = body.token || 'AKN-VIP-2027-X0914';
    if (!email || !email.includes('@')) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ success: false, error: 'INVALID_EMAIL', message: 'Please enter a valid email address.' }));
    }

    const resendApiKey = process.env.RESEND_API_KEY || '';
    const host = req.headers['x-forwarded-host'] || req.headers?.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = req.headers?.origin || (host ? `${proto}://${host}` : 'https://www.sillowmill.com');
    const magicUrl = `${baseUrl}/verify/${token}?auth=magic&email=${encodeURIComponent(email)}`;

    if (!resendApiKey) {
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, message: `Magic link dispatched to ${email}.`, magicUrl, devMode: true }));
    }

    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Sillow Mill <onboarding@resend.dev>',
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

      const emailData = await emailRes.json().catch(() => ({}));
      if (!emailRes.ok) {
        console.warn('[Register/MagicLink] Resend error:', emailData);
      }
    } catch (err) {
      console.warn('[Register/MagicLink] Dispatch failed:', err);
    }

    res.statusCode = 200;
    return res.end(JSON.stringify({ success: true, message: `Magic link dispatched to ${email}. Check your inbox!` }));
  }

  // Bingäa Certificate of Authenticity actions (Card PIN + optional email OTP)
  if (isSendPin || body.action === 'send-otp' || body.action === 'certify') {
    const result = await handleCertificateAction({
      ...body,
      action: isSendPin ? 'send-pin' : body.action,
    });
    res.statusCode = result.status;
    return res.end(JSON.stringify(result.body));
  }

  const token = body.token || body.id;
  const ownerName = body.ownerName || body.displayName;
  const ownerEmail = body.ownerEmail || body.email;
  const deviceId = body.deviceId;

  if (!token) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ success: false, error: 'MISSING_TOKEN', message: 'Token is required' }));
  }

  if (!ownerName || !ownerName.trim()) {
    res.statusCode = 400;
    return res.end(
      JSON.stringify({ success: false, error: 'MISSING_NAME', message: 'Owner name or handle is required' })
    );
  }

  const result = registerPassHolder(token, ownerName, ownerEmail, deviceId);
  res.statusCode = 200;
  return res.end(JSON.stringify(result));
}

import fs from 'fs';
import path from 'path';

// In-memory cache for fast lookups within active container instances
const _redemptionsMemory = new Map();

// File persistence paths: /tmp is always writable across serverless executions
const TMP_FILE = '/tmp/sillow_nfc_redemptions.json';
const LOCAL_FILE = path.resolve(process.cwd(), 'data/nfc_redemptions.json');

function loadRedemptions() {
  // Check /tmp first (active runtime writes)
  try {
    if (fs.existsSync(TMP_FILE)) {
      const data = JSON.parse(fs.readFileSync(TMP_FILE, 'utf8'));
      Object.entries(data).forEach(([k, v]) => _redemptionsMemory.set(k, v));
      return _redemptionsMemory;
    }
  } catch (err) {
    console.warn('[NFC] Error reading from /tmp:', err);
  }

  // Fallback to data/nfc_redemptions.json if exists
  try {
    if (fs.existsSync(LOCAL_FILE)) {
      const data = JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8'));
      Object.entries(data).forEach(([k, v]) => {
        if (!_redemptionsMemory.has(k)) _redemptionsMemory.set(k, v);
      });
    }
  } catch {
    // Ignore if not found
  }

  return _redemptionsMemory;
}

function saveRedemptions() {
  try {
    const obj = Object.fromEntries(_redemptionsMemory);
    fs.writeFileSync(TMP_FILE, JSON.stringify(obj, null, 2), 'utf8');
    try {
      if (fs.existsSync(path.dirname(LOCAL_FILE))) {
        fs.writeFileSync(LOCAL_FILE, JSON.stringify(obj, null, 2), 'utf8');
      }
    } catch {}
  } catch (err) {
    console.warn('[NFC] Error writing redemptions:', err);
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  let body = {};
  if (req.method === 'POST') {
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch {
      body = {};
    }
  } else {
    body = req.query || {};
  }

  const rawToken = body.token || (req.query && req.query.token);
  const rawDeviceId = body.deviceId || (req.query && req.query.deviceId);

  if (!rawToken || typeof rawToken !== 'string') {
    res.statusCode = 400;
    return res.end(
      JSON.stringify({
        success: false,
        error: 'MISSING_TOKEN',
        message: 'Token query parameter is required for NFC authentication.',
      })
    );
  }

  const token = rawToken.trim().toUpperCase();
  const deviceId =
    rawDeviceId && typeof rawDeviceId === 'string'
      ? rawDeviceId.trim()
      : 'UNKNOWN_DEVICE';

  loadRedemptions();

  const existing = _redemptionsMemory.get(token);

  if (existing) {
    // Token has already been redeemed
    if (existing.deviceId === deviceId) {
      // Same device session: allow verification
      res.statusCode = 200;
      return res.end(
        JSON.stringify({
          success: true,
          bound: true,
          isExistingDevice: true,
          token,
          message: 'NFC Pass verified for authorized device session.',
        })
      );
    } else {
      // Different device trying to use an already redeemed magic link: reject to prevent link forwarding!
      res.statusCode = 403;
      return res.end(
        JSON.stringify({
          success: false,
          error: 'TOKEN_ALREADY_BOUND',
          token,
          message: 'This NFC magic link has already been bound to another device. Transfer not permitted.',
        })
      );
    }
  }

  // First redemption: bind token to this device session
  const record = {
    deviceId,
    redeemedAt: new Date().toISOString(),
    ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  };

  _redemptionsMemory.set(token, record);
  saveRedemptions();

  res.statusCode = 200;
  return res.end(
    JSON.stringify({
      success: true,
      bound: true,
      isNewRedemption: true,
      token,
      message: 'NFC Pass successfully redeemed and bound to device.',
    })
  );
}

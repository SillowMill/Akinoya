import { getPassRecord, verifyDnaCipher } from './_nfcDnaService.js';

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

  const token = body.token || body.id || req.query.token || req.query.id || 'AKN-VIP-2027-X0914';
  const enc = body.enc || req.query.enc;
  const cmac = body.cmac || req.query.cmac;

  const result = verifyDnaCipher(token, enc, cmac);
  const pass = getPassRecord(token);

  if (!result.valid) {
    res.statusCode = 403;
    return res.end(
      JSON.stringify({
        valid: false,
        isAuthentic: false,
        status: result.status,
        error: result.error,
        message: result.message,
        pass,
      })
    );
  }

  res.statusCode = 200;
  return res.end(
    JSON.stringify({
      valid: true,
      isAuthentic: Boolean(enc && result.valid),
      status: enc ? 'AUTHENTIC FOUNDING PASS VERIFIED' : result.status,
      message: result.message,
      counter: result.counter,
      pass,
    })
  );
}

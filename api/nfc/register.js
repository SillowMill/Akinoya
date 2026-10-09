import { registerPassHolder } from './_nfcDnaService.js';

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

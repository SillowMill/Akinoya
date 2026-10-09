import { claimTransferKey } from './_nfcDnaService.js';

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

  const transferKey = body.transferKey || body.key;
  const newOwnerName = body.newOwnerName || body.ownerName || body.name;
  const newOwnerEmail = body.newOwnerEmail || body.email;
  const deviceId = body.deviceId;

  if (!transferKey || !transferKey.trim()) {
    res.statusCode = 400;
    return res.end(
      JSON.stringify({ success: false, error: 'MISSING_TRANSFER_KEY', message: 'Transfer key is required' })
    );
  }

  if (!newOwnerName || !newOwnerName.trim()) {
    res.statusCode = 400;
    return res.end(
      JSON.stringify({ success: false, error: 'MISSING_NAME', message: 'New owner display name is required' })
    );
  }

  const result = claimTransferKey(transferKey, newOwnerName, newOwnerEmail, deviceId);

  if (!result.success) {
    res.statusCode = 400;
    return res.end(JSON.stringify(result));
  }

  res.statusCode = 200;
  return res.end(JSON.stringify(result));
}

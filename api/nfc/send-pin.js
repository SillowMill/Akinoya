import { sendEmailCardPin } from './_certificateService.js';

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
    return res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch {
    body = {};
  }

  const token = body.token || body.passId || body.id;
  const email = body.email;
  const ownerName = body.ownerName || body.holderName || body.name;

  if (!token) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ success: false, error: 'MISSING_TOKEN', message: 'Pass Token ID is required.' }));
  }

  if (!email) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ success: false, error: 'MISSING_EMAIL', message: 'Email address is required.' }));
  }

  const result = await sendEmailCardPin(token, email, ownerName);
  res.statusCode = result.status || (result.success ? 200 : 400);
  return res.end(JSON.stringify(result));
}

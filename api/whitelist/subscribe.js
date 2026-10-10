import fs from 'fs';
import path from 'path';

// In-memory whitelist store for serverless execution
const inMemoryWhitelist = new Set();

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

  const rawEmail = (body.email || '').trim().toLowerCase();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rawEmail);

  if (!rawEmail || !isValidEmail) {
    res.statusCode = 400;
    return res.end(
      JSON.stringify({
        success: false,
        error: 'INVALID_EMAIL',
        message: 'Please provide a valid email address.',
      })
    );
  }

  inMemoryWhitelist.add(rawEmail);

  // Optional persistent file write in environments that support filesystem
  try {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (fs.existsSync(dataDir)) {
      const filePath = path.join(dataDir, 'whitelist.json');
      let current = [];
      if (fs.existsSync(filePath)) {
        try {
          current = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch {}
      }
      if (!current.includes(rawEmail)) {
        current.push(rawEmail);
        fs.writeFileSync(filePath, JSON.stringify(current, null, 2));
      }
    }
  } catch {
    // Non-fatal if filesystem is read-only (e.g. AWS Lambda / Vercel serverless)
  }

  console.log(`[WHITELIST] New subscriber added: ${rawEmail}`);

  res.statusCode = 200;
  return res.end(
    JSON.stringify({
      success: true,
      email: rawEmail,
      message: "You've been added to the Äkinoya Whitelist! You will receive priority notification for the next drop.",
    })
  );
}

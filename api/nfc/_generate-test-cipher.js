import { generateAuthenticDnaCipher } from './_nfcDnaService.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  const token = req.query.token || (req.body && req.body.token) || 'AKN-VIP-2027-X0914';
  const cipher = generateAuthenticDnaCipher(token);

  res.statusCode = 200;
  return res.end(
    JSON.stringify({
      token,
      cipher,
      sampleAuthenticUrl: `https://sillowmill.com/verify?token=${token}&enc=${cipher}`,
      message: 'Generated authentic dynamic AES-128 cipher for testing.',
    })
  );
}

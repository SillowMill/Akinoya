import type { IncomingMessage, ServerResponse } from 'http';
import { getInventoryStatus } from '../../src/server/stripeService';

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    const status = getInventoryStatus();
    res.statusCode = 200;
    res.end(JSON.stringify(status));
  } catch (err: any) {
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        wave: 'Wave 2',
        total: 125,
        claimed: 0,
        available: 125,
      })
    );
  }
}

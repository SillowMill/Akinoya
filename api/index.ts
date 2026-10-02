import type { IncomingMessage, ServerResponse } from 'http';
import { getInventoryStatus } from '../src/server/stripeService';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const inventory = getInventoryStatus();
  res.statusCode = 200;
  res.end(
    JSON.stringify({
      status: 'online',
      message: 'Äkinoya VIP Protocol API is active',
      inventory,
    })
  );
}

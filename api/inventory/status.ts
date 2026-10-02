export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

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

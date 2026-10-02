export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.statusCode = 200;
  res.end(
    JSON.stringify({
      status: 'online',
      protocol: 'Akinoya VIP Protocol Gateway',
      timestamp: new Date().toISOString(),
    })
  );
}

import Stripe from 'stripe';

function getStripe() {
  const key =
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_API_KEY ||
    process.env.STRIPE_KEY ||
    '';

  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not configured in Vercel. Please check Project Settings > Environment Variables.'
    );
  }

  return new Stripe(key, {
    apiVersion: '2026-09-30.endive',
  });
}

function parseCityPostal(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return { city: 'Unknown', postalCode: '1000' };

  const postalMatch = trimmed.match(/\d{4,5}/);
  const postalCode = postalMatch ? postalMatch[0] : '1000';
  const city = trimmed.replace(/\d{4,5}/, '').replace(/\s+/g, ' ').trim() || trimmed;

  return { city: city || 'Unknown', postalCode };
}

function sanitizeStripeString(s) {
  return (s || '')
    .trim()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/[^\x20-\x7E\u00C0-\u024F]/g, '')
    .trim();
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  try {
    let body = req.body;
    if (!body || typeof body === 'string') {
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const rawText = Buffer.concat(buffers).toString('utf-8');
      body = rawText ? JSON.parse(rawText) : {};
    }

    const { customerEmail, customerName, shippingAddress, shippingCity, apartmentBus } = body || {};

    const host = req.headers['x-forwarded-host'] || req.headers?.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = req.headers?.origin || (host ? `${proto}://${host}` : 'https://sillowmill.com');

    const stripe = getStripe();

    const sanitizedEmail = (customerEmail || '').trim().toLowerCase() || undefined;
    const sanitizedName = sanitizeStripeString(customerName || '') || undefined;
    const sanitizedLine1 = sanitizeStripeString(shippingAddress || '') || undefined;
    const sanitizedLine2 = sanitizeStripeString(apartmentBus || '') || undefined;

    const rawCityPostal = (shippingCity || '').trim();
    const { city: parsedCity, postalCode: parsedPostal } = parseCityPostal(rawCityPostal);

    const truncate = (s, max = 480) => (s || '').slice(0, max);
    const isMembership = body.plan === 'membership' || body.product === 'community_membership';

    if (isMembership) {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: 'Sillow Mill — Community Perks & Hub',
                description: 'Monthly recurring pass to unreleased music vaults, animation early access, voting rights & lore governance.',
              },
              unit_amount: 500, // €5.00 / month
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        customer_email: sanitizedEmail,
        metadata: {
          product: 'community_membership',
          plan: 'monthly_5eur',
          customer_email: sanitizedEmail || '',
          customer_name: sanitizedName || '',
          is_patron: 'true',
        },
        success_url: `${baseUrl}/community?membership_unlocked=true&session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(sanitizedEmail || '')}`,
        cancel_url: `${baseUrl}/community?canceled=true`,
      });

      res.statusCode = 200;
      return res.end(
        JSON.stringify({
          url: session.url,
          sessionId: session.id,
        })
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Sillow Mill - Bingaa (Collectors Graphic Novel)',
              description: 'Physical First Edition Graphic Novel Drop with Scannable QR Priority Verification (Wave 2)',
              images: [`${baseUrl}/images/bingaa_comic_cover.jpg`],
            },
            unit_amount: 1499, // €14,99
          },
          quantity: 1,
        },
      ],
      customer_email: sanitizedEmail,
      metadata: {
        wave: 'Wave 2',
        product: 'bingaa_comic_drop',
        customer_name: truncate(sanitizedName || ''),
        shipping_address: truncate(sanitizedLine1 || ''),
        apartment_bus: truncate(sanitizedLine2 || ''),
        shipping_city: truncate(parsedCity),
        shipping_postal: truncate(parsedPostal),
      },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?canceled=true`,
      billing_address_collection: 'auto',
      shipping_address_collection: {
        allowed_countries: [
          'BE', 'NL', 'DE', 'FR', 'LU', 'GB', 'US', 'ES', 'IT', 'CH', 'AT',
          'DK', 'SE', 'NO', 'FI', 'IE', 'PT', 'CA', 'AU', 'JP',
        ],
      },
    });

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
      })
    );
  } catch (err) {
    console.error('[API create-checkout-session] Error:', err);
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        error: err?.message || 'Failed to initialize Stripe checkout session.',
      })
    );
  }
}

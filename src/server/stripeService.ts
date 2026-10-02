import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';

export const stripe = new Stripe(STRIPE_KEY, {
  // Must match the API version bundled with stripe@23 SDK
  apiVersion: '2026-09-30.endive' as any,
});

const ORDERS_FILE = path.resolve(process.cwd(), 'data/orders.json');
const INITIAL_WAVE_INVENTORY = 125;

export interface ComicOrder {
  id: string;
  date: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName?: string;
  shippingAddress?: string;
  apartmentBus?: string;
  shippingCity?: string;
  status: 'paid' | 'pending' | 'failed';
  wave: string;
  passId: string;
  entitled: boolean;
  paymentMethod?: string;
}

export function loadOrders(): ComicOrder[] {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('[StripeService] Error reading orders file:', err);
  }
  return [];
}

export function saveOrders(orders: ComicOrder[]): void {
  try {
    const dir = path.dirname(ORDERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (err) {
    console.error('[StripeService] Error saving orders file:', err);
  }
}

export function getInventoryStatus() {
  const orders = loadOrders();
  const claimedCount = orders.filter((o) => o.status === 'paid' && o.wave === 'Wave 2').length;
  const availableCount = Math.max(0, INITIAL_WAVE_INVENTORY - claimedCount);

  return {
    wave: 'Wave 2',
    total: INITIAL_WAVE_INVENTORY,
    claimed: claimedCount,
    available: availableCount,
  };
}

/**
 * Defensively parse a combined city+postal string like "1050 Etterbeek" or "Antwerpen 2000".
 * Falls back gracefully when no postal code digits are found.
 */
function parseCityPostal(raw: string): { city: string; postalCode: string } {
  const trimmed = (raw || '').trim();
  if (!trimmed) return { city: 'Unknown', postalCode: '1000' };

  // Extract first run of 4-5 digits as postal code
  const postalMatch = trimmed.match(/\d{4,5}/);
  const postalCode = postalMatch ? postalMatch[0] : '';
  const city = trimmed.replace(/\d{4,5}/, '').replace(/\s+/g, ' ').trim() || trimmed;

  return { city: city || 'Unknown', postalCode: postalCode || '1000' };
}

/** Strip non-printable / non-ASCII characters Stripe rejects */
function sanitizeStripeString(s: string): string {
  return (s || '')
    .trim()
    // Replace curly quotes, em dash, etc. with ASCII equivalents
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013|\u2014/g, '-')
    // Remove any remaining non-printable characters
    .replace(/[^\x20-\x7E\u00C0-\u024F]/g, '')
    .trim();
}

export async function createComicCheckoutSession(params: {
  customerEmail?: string;
  customerName?: string;
  shippingAddress?: string;
  apartmentBus?: string;
  shippingCity?: string;
  origin?: string;
}) {
  const baseUrl = params.origin || 'https://sillowmill.com';

  // Sanitize all string inputs
  const sanitizedEmail = (params.customerEmail || '').trim().toLowerCase() || undefined;
  const sanitizedName = sanitizeStripeString(params.customerName || '') || undefined;
  const sanitizedLine1 = sanitizeStripeString(params.shippingAddress || '') || undefined;
  const sanitizedLine2 = sanitizeStripeString(params.apartmentBus || '') || undefined;

  // Defensive city + postal parsing with fallback defaults
  const rawCityPostal = (params.shippingCity || '').trim();
  const { city: parsedCity, postalCode: parsedPostal } = parseCityPostal(rawCityPostal);

  // Truncate metadata values to Stripe's 500-char limit
  const truncate = (s: string, max = 480) => (s || '').slice(0, max);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: 'eur',
        product_data: {
          name: 'Bingaa - Limited Edition Comic',
          description: 'Physical First Edition Comic Drop with Scannable QR Priority Verification (Wave 2)',
          images: [`${baseUrl}/images/bingaa_comic_cover.jpg`],
        },
        unit_amount: 1499, // €14,99
      },
      quantity: 1,
    },
  ];

  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: lineItems,
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
    cancel_url: `${baseUrl}/comic?canceled=true`,
    // Use automatic_payment_methods so Stripe picks the right methods
    // for the customer's region without needing manual payment_method_types
    automatic_payment_methods: {
      enabled: true,
    },
    billing_address_collection: 'auto',
    shipping_address_collection: {
      allowed_countries: [
        'BE', 'NL', 'DE', 'FR', 'LU', 'GB', 'US', 'ES', 'IT', 'CH', 'AT',
        'DK', 'SE', 'NO', 'FI', 'IE', 'PT', 'CA', 'AU', 'JP',
      ],
    },
  };

  const session = await stripe.checkout.sessions.create(sessionConfig);
  return session;
}

export async function processCompletedCheckout(session: Stripe.Checkout.Session): Promise<ComicOrder> {
  const orders = loadOrders();
  const existingOrder = orders.find((o) => o.id === session.id);

  if (existingOrder) {
    console.log(`[StripeService] Order ${session.id} already processed`);
    return existingOrder;
  }

  const email = session.customer_details?.email || session.customer_email || 'unknown@sillowmill.com';
  const name = session.customer_details?.name || session.metadata?.customer_name || 'Collector';
  const passId = `PASS-BINGAA-${session.id.slice(-8).toUpperCase()}`;

  const newOrder: ComicOrder = {
    id: session.id,
    date: new Date().toISOString(),
    amount: (session.amount_total || 1499) / 100,
    currency: (session.currency || 'eur').toUpperCase(),
    customerEmail: email,
    customerName: name,
    shippingAddress: session.metadata?.shipping_address || session.customer_details?.address?.line1 || undefined,
    apartmentBus: session.metadata?.apartment_bus || session.customer_details?.address?.line2 || undefined,
    shippingCity: session.metadata?.shipping_city || session.customer_details?.address?.city || undefined,
    status: 'paid',
    wave: session.metadata?.wave || 'Wave 2',
    passId,
    entitled: true,
    paymentMethod: session.payment_method_types?.[0] || 'stripe',
  };

  orders.push(newOrder);
  saveOrders(orders);

  const inventory = getInventoryStatus();
  console.log(`[StripeService] Order fulfilled: ${newOrder.id}`);
  console.log(`[StripeService] Customer: ${name} <${email}>`);
  console.log(`[StripeService] Pass ID Granted: ${passId}`);
  console.log(`[StripeService] Wave 2 remaining inventory: ${inventory.available}/${inventory.total}`);
  console.log(`[StripeService] Confirmation dispatched to: ${email} (cc: Odi@sillowmill.com)`);

  return newOrder;
}

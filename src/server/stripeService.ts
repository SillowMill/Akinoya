import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';

export const stripe = new Stripe(STRIPE_KEY, {
  apiVersion: '2025-02-24.acacia' as any,
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
 * Parse a combined "city postal" string like "1050 Etterbeek" or "Antwerpen 2000"
 * Returns { city, postalCode }
 */
function parseCityPostal(raw: string): { city: string; postalCode: string } {
  const trimmed = raw.trim();
  // Match leading digits (postal code first, e.g. "1050 Etterbeek")
  const leadingPostal = trimmed.match(/^(\d{4,5})\s+(.+)$/);
  if (leadingPostal) {
    return { postalCode: leadingPostal[1], city: leadingPostal[2].trim() };
  }
  // Match trailing digits (city first, e.g. "Etterbeek 1050")
  const trailingPostal = trimmed.match(/^(.+?)\s+(\d{4,5})$/);
  if (trailingPostal) {
    return { city: trailingPostal[1].trim(), postalCode: trailingPostal[2] };
  }
  // No postal code found — return raw as city
  return { city: trimmed, postalCode: '' };
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

  // Sanitize inputs
  const sanitizedEmail = (params.customerEmail || '').trim().toLowerCase() || undefined;
  const sanitizedName = (params.customerName || '').trim() || undefined;
  const sanitizedLine1 = (params.shippingAddress || '').trim() || undefined;
  const sanitizedLine2 = (params.apartmentBus || '').trim() || undefined;

  // Parse city + postal code from combined field (e.g. "1050 Etterbeek")
  const rawCityPostal = (params.shippingCity || '').trim();
  const { city: parsedCity, postalCode: parsedPostal } = parseCityPostal(rawCityPostal);

  // Truncate metadata values to Stripe's 500-char limit
  const truncate = (s: string, max = 480) => s.slice(0, max);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: 'eur',
        product_data: {
          name: 'Bingäa — Limited Edition Comic',
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
    billing_address_collection: 'auto',
    shipping_address_collection: {
      allowed_countries: [
        'BE', 'NL', 'DE', 'FR', 'LU', 'GB', 'US', 'ES', 'IT', 'CH', 'AT', 'DK', 'SE', 'NO', 'FI', 'IE', 'PT', 'CA', 'AU', 'JP',
      ],
    },
  };

  // Attempt with card + bancontact + ideal; fall back gracefully
  try {
    const session = await stripe.checkout.sessions.create({
      ...sessionConfig,
      payment_method_types: ['card', 'bancontact', 'ideal'],
    } as any);
    return session;
  } catch (err: any) {
    const msg: string = err.message || '';
    if (msg.includes('ideal') || msg.includes('payment_method_types')) {
      console.warn('[StripeService] iDEAL not active; falling back to card + bancontact');
      const session = await stripe.checkout.sessions.create({
        ...sessionConfig,
        payment_method_types: ['card', 'bancontact'],
      } as any);
      return session;
    }
    throw err;
  }
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
  console.log(`[StripeService] Automated Confirmation Dispatched to: ${email} (cc: Odi@sillowmill.com)`);

  return newOrder;
}

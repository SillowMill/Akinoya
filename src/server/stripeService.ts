import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Lazy Stripe initialization — NEVER crash at module evaluation time
let _stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripeInstance) return _stripeInstance;

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

  _stripeInstance = new Stripe(key, {
    apiVersion: '2026-09-30.endive' as any,
  });

  return _stripeInstance;
}

const ORDERS_FILE = path.resolve(process.cwd(), 'data/orders.json');
const INITIAL_WAVE_INVENTORY = 100;

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
  product?: string;
  productTitle?: string;
}

export function loadOrders(): ComicOrder[] {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('[StripeService] Could not read orders file:', err);
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
    // Expected on serverless environments where filesystem is read-only
    console.warn('[StripeService] Read-only filesystem, skipped file write:', err);
  }
}

export function getInventoryStatus() {
  try {
    const orders = loadOrders();
    const claimedCount = orders.filter((o) => o.status === 'paid' && o.wave === 'Wave 2').length;
    const availableCount = Math.max(0, INITIAL_WAVE_INVENTORY - claimedCount);

    return {
      wave: 'Wave 2',
      total: INITIAL_WAVE_INVENTORY,
      claimed: claimedCount,
      available: availableCount,
    };
  } catch {
    return {
      wave: 'Wave 2',
      total: INITIAL_WAVE_INVENTORY,
      claimed: 0,
      available: INITIAL_WAVE_INVENTORY,
    };
  }
}

function parseCityPostal(raw: string): { city: string; postalCode: string } {
  const trimmed = (raw || '').trim();
  if (!trimmed) return { city: 'Unknown', postalCode: '1000' };

  const postalMatch = trimmed.match(/\d{4,5}/);
  const postalCode = postalMatch ? postalMatch[0] : '1000';
  const city = trimmed.replace(/\d{4,5}/, '').replace(/\s+/g, ' ').trim() || trimmed;

  return { city: city || 'Unknown', postalCode };
}

function sanitizeStripeString(s: string): string {
  return (s || '')
    .trim()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/[^\x20-\x7E\u00C0-\u024F]/g, '')
    .trim();
}

export async function createStripeCheckoutSession(params: {
  customerEmail?: string;
  customerName?: string;
  shippingAddress?: string;
  apartmentBus?: string;
  shippingCity?: string;
  productId?: string;
  productTitle?: string;
  amount?: number;
  isPhysical?: boolean;
  origin?: string;
}) {
  const stripe = getStripe();
  const baseUrl = params.origin || 'https://sillowmill.com';

  const sanitizedEmail = (params.customerEmail || '').trim().toLowerCase() || undefined;
  const sanitizedName = sanitizeStripeString(params.customerName || '') || undefined;
  const sanitizedLine1 = sanitizeStripeString(params.shippingAddress || '') || undefined;
  const sanitizedLine2 = sanitizeStripeString(params.apartmentBus || '') || undefined;

  const rawCityPostal = (params.shippingCity || '').trim();
  const { city: parsedCity, postalCode: parsedPostal } = parseCityPostal(rawCityPostal);

  const truncate = (s: string, max = 480) => (s || '').slice(0, max);

  const productId = params.productId || 'comic';
  const isPhysical = params.isPhysical ?? (productId === 'comic' || productId === 'membership');

  // Dynamic product mapping
  let productName = 'Sillow Mill - Bingaa (Collectors Graphic Novel)';
  let productDescription = 'Physical First Edition Graphic Novel Drop with Scannable QR Priority Verification (Wave 2)';
  let unitAmount = 1499; // €14,99
  let productImage = `${baseUrl}/images/bingaa_comic_cover.jpg`;

  if (productId === 'vocal') {
    productName = 'Sillow Mill - Vocal Acapella & Remix Pack';
    productDescription = 'Studio Acapellas of the whole "Dream of Akainoya" tracklist. 24-bit / 48kHz uncompressed WAV stems.';
    unitAmount = params.amount ? Math.round(params.amount * 100) : 1999;
  } else if (productId === 'logic-visualizer' || productId === 'enerwise') {
    productName = 'Sillow Mill - 2D Visualizer Production & Logic Pro Assets';
    productDescription = 'Official 2D visualizer workflow, Enerwise sound architecture, vocal chain & dedicated Logic Pro template.';
    unitAmount = params.amount ? Math.round(params.amount * 100) : 2999;
  } else if (productId === 'comic-digital') {
    productName = 'Sillow Mill - Digital Copy of Bingaa';
    productDescription = 'Complete graphic novel with interactive dual-page flipbook reader & DRM-free 4K download.';
    unitAmount = params.amount ? Math.round(params.amount * 100) : 999;
  } else if (productId === 'membership') {
    productName = 'Sillow Mill - Annual Pioneer Member Pass (All-Inclusive)';
    productDescription = 'Annual Pioneer Member Pass with Physical Welcome Booklet, Collector Pass Card, Signed Bookmark & Full Digital Vault Access';
    unitAmount = params.amount ? Math.round(params.amount * 100) : 6000;
  } else if (params.productTitle && params.amount) {
    productName = sanitizeStripeString(params.productTitle);
    unitAmount = Math.round(params.amount * 100);
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: 'eur',
        product_data: {
          name: productName,
          description: productDescription,
          images: [productImage],
        },
        unit_amount: unitAmount,
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
      product: productId,
      product_title: truncate(productName),
      customer_name: truncate(sanitizedName || ''),
      shipping_address: truncate(sanitizedLine1 || ''),
      apartment_bus: truncate(sanitizedLine2 || ''),
      shipping_city: truncate(parsedCity),
      shipping_postal: truncate(parsedPostal),
    },
    success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/?canceled=true`,
    billing_address_collection: 'auto',
  };

  if (isPhysical) {
    sessionConfig.shipping_address_collection = {
      allowed_countries: [
        'BE', 'NL', 'DE', 'FR', 'LU', 'GB', 'US', 'ES', 'IT', 'CH', 'AT',
        'DK', 'SE', 'NO', 'FI', 'IE', 'PT', 'CA', 'AU', 'JP',
      ],
    };
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);
  return session;
}

export const createComicCheckoutSession = createStripeCheckoutSession;

export async function processCompletedCheckout(session: Stripe.Checkout.Session): Promise<ComicOrder> {
  const orders = loadOrders();
  const existingOrder = orders.find((o) => o.id === session.id);

  if (existingOrder) {
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
    product: session.metadata?.product || 'comic',
    productTitle: session.metadata?.product_title || 'Sillow Mill - Bingaa (Collectors Graphic Novel)',
  };

  orders.push(newOrder);
  saveOrders(orders);

  return newOrder;
}

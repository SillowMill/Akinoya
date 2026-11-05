import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { updateUserSubscription } from './authVoteService';

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
  isSubscription?: boolean;
  subscriptionId?: string;
  customerId?: string;
  billingInterval?: string;
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
    productDescription = 'Studio Acapellas of the whole "Dream of Akainoya" tracklist. 24-bit / 48kHz uncompressed WAV stems. Instantly unlocked and securely stored in your Asset Vault inside the Hub upon purchase.';
    unitAmount = params.amount ? Math.round(params.amount * 100) : 1999;
  } else if (productId === 'workflow' || productId === 'logic-visualizer' || productId === 'enerwise') {
    productName = 'Sillow Mill - Workflow';
    productDescription = 'Official 2D visualizer workflow, Enerwise sound architecture, vocal chain & dedicated Logic Pro template. Instantly unlocked and securely stored in your Asset Vault inside the Hub upon purchase.';
    unitAmount = params.amount ? Math.round(params.amount * 100) : 2999;
  } else if (productId === 'comic-digital') {
    productName = 'Sillow Mill - Digital Copy of Bingaa';
    productDescription = 'Complete graphic novel with interactive dual-page flipbook reader & DRM-free 4K download. Instantly unlocked and securely stored in your Asset Vault inside the Hub upon purchase.';
    unitAmount = params.amount ? Math.round(params.amount * 100) : 999;
  } else if (productId === 'membership') {
    productName = 'Sillow Mill - Annual Pioneer Member Pass (All-Inclusive)';
    productDescription = 'Annual Pioneer Member Pass with Physical Welcome Booklet, Collector Pass Card, Signed Bookmark & Full Digital Vault Access instantly unlocked and securely stored in your Asset Vault inside the Hub upon purchase.';
    unitAmount = params.amount ? Math.round(params.amount * 100) : 6000;
  } else if (params.productTitle && params.amount) {
    productName = sanitizeStripeString(params.productTitle);
    unitAmount = Math.round(params.amount * 100);
  }

  const isSubscription = productId === 'membership';

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
        ...(isSubscription
          ? {
              recurring: {
                interval: 'year',
                interval_count: 1,
              },
            }
          : {}),
      },
      quantity: 1,
    },
  ];

  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    mode: isSubscription ? 'subscription' : 'payment',
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
      billing_scheme: isSubscription ? 'annual_recurring_subscription' : 'one_time_payment',
    },
    success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/?canceled=true`,
    billing_address_collection: 'auto',
  };

  // Automated recurring retention configuration for Annual Pioneer Pass
  if (isSubscription) {
    sessionConfig.payment_method_collection = 'always';
    sessionConfig.subscription_data = {
      description: 'Sillow Mill - Annual Pioneer Member Pass Recurring Subscription (€60.00/year)',
      metadata: {
        product: 'membership',
        wave: 'Wave 2',
        product_title: truncate(productName),
        customer_name: truncate(sanitizedName || ''),
        customer_email: truncate(sanitizedEmail || ''),
        billing_interval: 'year',
      },
    };
  }

  // Consolidate customer profile if customer already exists in Stripe
  if (sanitizedEmail) {
    try {
      const existingCustomers = await stripe.customers.list({
        email: sanitizedEmail,
        limit: 1,
      });
      if (existingCustomers.data && existingCustomers.data.length > 0) {
        sessionConfig.customer = existingCustomers.data[0].id;
        delete sessionConfig.customer_email;
      }
    } catch (custErr) {
      console.warn('[StripeService] Customer consolidation note:', custErr);
    }
  }

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
  const productId = session.metadata?.product || 'comic';
  const isSubscription = session.mode === 'subscription' || productId === 'membership';
  const passId = `PASS-${productId.toUpperCase()}-${session.id.slice(-8).toUpperCase()}`;

  const customerId = (typeof session.customer === 'string' ? session.customer : session.customer?.id) || undefined;
  const subscriptionId = (typeof session.subscription === 'string' ? session.subscription : session.subscription?.id) || undefined;

  const newOrder: ComicOrder = {
    id: session.id,
    date: new Date().toISOString(),
    amount: (session.amount_total || (isSubscription ? 6000 : 1499)) / 100,
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
    product: productId,
    productTitle: session.metadata?.product_title || (isSubscription ? 'Sillow Mill - Annual Pioneer Member Pass' : 'Sillow Mill Order'),
    isSubscription,
    subscriptionId,
    customerId,
    billingInterval: isSubscription ? 'year' : undefined,
  };

  orders.push(newOrder);
  saveOrders(orders);

  // Automatically grant Annual Pass entitlements and record renewal schedule
  if (isSubscription || productId === 'membership') {
    try {
      const renewalDate = new Date();
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);

      updateUserSubscription(email, {
        role: 'ANNUAL_PASS',
        subscriptionStatus: 'active',
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        subscriptionRenewalDate: renewalDate.toISOString(),
        subscriptionCancelAtPeriodEnd: false,
        hasVipPass: true,
      });
    } catch (uErr) {
      console.warn('[StripeService] Profile auto-update notice:', uErr);
    }
  }

  return newOrder;
}

/**
 * Handles automated annual renewal invoice payments from Stripe (SEPA direct debit / card domiciliëring).
 * Renews access, updates order records, and extends subscription expiration.
 */
export async function processSubscriptionInvoice(invoice: Stripe.Invoice): Promise<ComicOrder | null> {
  const invoiceId = invoice.id;
  if (!invoiceId) return null;

  const orders = loadOrders();
  const existingOrder = orders.find((o) => o.id === invoiceId);
  if (existingOrder) {
    return existingOrder;
  }

  const email = invoice.customer_email || 'unknown@sillowmill.com';
  const name = invoice.customer_name || 'Annual Member';
  const rawSub = (invoice as any).subscription ?? (invoice as any).parent?.subscription_details?.subscription;
  const subscriptionId = (typeof rawSub === 'string' ? rawSub : rawSub?.id) || undefined;
  const rawCust = invoice.customer;
  const customerId = (typeof rawCust === 'string' ? rawCust : (rawCust as any)?.id) || undefined;

  let renewalDateStr: string;
  const periodEndUnix = invoice.lines?.data?.[0]?.period?.end;
  if (periodEndUnix) {
    renewalDateStr = new Date(periodEndUnix * 1000).toISOString();
  } else {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    renewalDateStr = nextYear.toISOString();
  }

  const passId = `PASS-RENEWAL-${invoiceId.slice(-8).toUpperCase()}`;

  const renewalOrder: ComicOrder = {
    id: invoiceId,
    date: new Date().toISOString(),
    amount: (invoice.amount_paid || 6000) / 100,
    currency: (invoice.currency || 'eur').toUpperCase(),
    customerEmail: email,
    customerName: name,
    status: 'paid',
    wave: 'Wave 2',
    passId,
    entitled: true,
    paymentMethod: 'automated_annual_renewal',
    product: 'membership',
    productTitle: 'Sillow Mill - Annual Pioneer Member Pass (Automated Annual Renewal)',
    isSubscription: true,
    subscriptionId,
    customerId,
    billingInterval: 'year',
  };

  orders.push(renewalOrder);
  saveOrders(orders);

  // Extend active Annual Pass role and update next annual renewal timestamp
  try {
    updateUserSubscription(email, {
      role: 'ANNUAL_PASS',
      subscriptionStatus: 'active',
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionRenewalDate: renewalDateStr,
      subscriptionCancelAtPeriodEnd: false,
      hasVipPass: true,
    });
  } catch (uErr) {
    console.warn('[StripeService] Invoice renewal profile update notice:', uErr);
  }

  return renewalOrder;
}

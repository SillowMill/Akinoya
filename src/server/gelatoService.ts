import dotenv from 'dotenv';
dotenv.config();

export interface GelatoOrderParams {
  orderReferenceId: string;
  email: string;
  customerName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
  productType?: string;
  quantity?: number | string;
  pdfAssetUrl?: string;
}

export interface GelatoOrderResult {
  success: boolean;
  gelatoOrderId?: string;
  status?: string;
  data?: any;
  queued?: boolean;
  reason?: string;
  error?: string;
}

/**
 * Normalizes country strings to 2-letter ISO 3166-1 alpha-2 format required by Gelato API.
 */
function normalizeCountryCode(raw: string): string {
  const clean = (raw || '').trim();
  if (clean.length === 2) return clean.toUpperCase();

  const lower = clean.toLowerCase();
  const map: Record<string, string> = {
    netherlands: 'NL',
    nederland: 'NL',
    belgium: 'BE',
    belgië: 'BE',
    belgique: 'BE',
    germany: 'DE',
    deutschland: 'DE',
    france: 'FR',
    'united kingdom': 'GB',
    uk: 'GB',
    england: 'GB',
    'united states': 'US',
    usa: 'US',
    spain: 'ES',
    españa: 'ES',
    italy: 'IT',
    italia: 'IT',
    switzerland: 'CH',
    austria: 'AT',
    österreich: 'AT',
    denmark: 'DK',
    sweden: 'SE',
    norway: 'NO',
    finland: 'FI',
    ireland: 'IE',
    portugal: 'PT',
    canada: 'CA',
    australia: 'AU',
    japan: 'JP',
    luxembourg: 'LU',
  };

  return map[lower] || clean.slice(0, 2).toUpperCase() || 'NL';
}

/**
 * Dispatches an automated Print-on-Demand order request to Gelato API v2
 * for physical Comic Book drops and Member Pass physical bundles.
 */
export async function dispatchGelatoOrder(params: GelatoOrderParams): Promise<GelatoOrderResult> {
  const apiKey =
    process.env.GELATO_API_KEY ||
    process.env.GELATO_SECRET_KEY ||
    process.env.GELATO_KEY ||
    '';

  const orderRef = (params.orderReferenceId || `AKN-${Date.now()}`).trim();
  const cleanEmail = (params.email || '').trim().toLowerCase();
  const fullName = (params.customerName || 'Collector').trim();
  const nameParts = fullName.split(' ');
  const firstName = nameParts[0] || 'Collector';
  const lastName = nameParts.slice(1).join(' ') || '';

  const countryCode = normalizeCountryCode(params.country);
  const pdfUrl =
    params.pdfAssetUrl ||
    process.env.GELATO_COMIC_PDF_URL ||
    'https://sillowmill.com/assets/Bingaa.pdf';

  const productUid =
    process.env.GELATO_PRODUCT_UID ||
    'comic_books_softcover_a4_color';

  const qty = parseInt(String(params.quantity || '1'), 10) || 1;

  if (!apiKey) {
    console.log(
      `[Gelato POD] Order ${orderRef} for ${cleanEmail} logged. Note: GELATO_API_KEY is not configured in environment.`
    );
    return {
      success: true,
      queued: true,
      reason: 'GELATO_API_KEY_NOT_CONFIGURED',
    };
  }

  const payload = {
    orderType: 'order',
    orderReferenceId: orderRef,
    customerReferenceId: cleanEmail,
    currency: 'EUR',
    items: [
      {
        itemReferenceId: `${orderRef}-item-01`,
        productUid,
        files: [
          {
            type: 'default',
            url: pdfUrl,
          },
        ],
        quantity: qty,
      },
    ],
    shippingAddress: {
      firstName,
      lastName,
      companyName: '',
      addressLine1: params.addressLine1 || '-',
      addressLine2: params.addressLine2 || '',
      city: params.city || '-',
      postCode: params.postalCode || '-',
      state: '',
      country: countryCode,
      email: cleanEmail,
      phone: params.phone || '',
    },
  };

  try {
    const res = await fetch('https://api.gelato.com/v2/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.warn(`[Gelato POD] API returned status ${res.status}:`, data);
      return {
        success: false,
        status: String(res.status),
        error: data.message || `Gelato HTTP ${res.status}`,
        data,
      };
    }

    const gelatoOrderId = data.id || data.orderId || orderRef;
    console.log(`[Gelato POD] Order successfully dispatched to Gelato:`, gelatoOrderId);

    return {
      success: true,
      gelatoOrderId,
      status: data.fulfillmentStatus || 'created',
      data,
    };
  } catch (err: any) {
    console.warn(`[Gelato POD] Exception during Gelato API dispatch:`, err);
    return {
      success: false,
      error: err?.message || 'Network exception calling Gelato API',
    };
  }
}

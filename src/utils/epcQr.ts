import QRCode from 'qrcode';

export interface EpcPaymentDetails {
  recipient: string;
  iban: string;
  bic?: string;
  amount: number;
  reference: string;
  unstructuredText?: string;
}

export const KBC_PAYMENT_CONFIG = {
  accountHolder: 'Sillow Mill / Odi',
  recipientName: 'Sillow Mill',
  bankName: 'KBC Bank',
  iban: 'BE97 7460 3951 7915',
  bic: 'KREDBEBB',
  amount: 14.99,
  currency: 'EUR',
  supportEmail: 'Odi@sillowmill.com',
  kbo: '1041.720.513',
  vatNumber: 'BE 1041.720.513',
};

/**
 * Formats data according to the European Payments Council (EPC) Quick Response Code standard
 * for SEPA Credit Transfers (SCT002).
 */
export function formatEpcPayload(details: EpcPaymentDetails): string {
  const cleanIban = details.iban.replace(/\s+/g, '').toUpperCase();
  const formattedAmount = `EUR${details.amount.toFixed(2)}`;
  const bic = details.bic || KBC_PAYMENT_CONFIG.bic;

  return [
    'BCD',
    '002',
    '1',
    'SCT',
    bic,
    details.recipient,
    cleanIban,
    formattedAmount,
    '',
    details.reference,
    details.unstructuredText || `Comic Drop ${details.reference}`,
    '',
  ].join('\n');
}

export async function generateEpcQrDataUrl(details: EpcPaymentDetails): Promise<string> {
  const payload = formatEpcPayload(details);
  return await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 300,
    color: {
      dark: '#050505',
      light: '#ffffff',
    },
  });
}

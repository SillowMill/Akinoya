import { useEffect, useState } from 'react';
import { TOTAL_EDITION_LIMIT } from './holder';

/**
 * Bingäa Issue #1 — Certificate of Authenticity (client helpers).
 * Certificates are issued & signed server-side (/api/nfc/register, action "certify") and then
 * persisted permanently on the holder's device so "My Assets" always shows them.
 */

export const BINGAA_PDF_FILENAME = 'Bingäa.pdf';
export const BINGAA_PDF_URL = '/assets/Bingaa.pdf';
export const BINGAA_COVER_FILENAME = 'BingäaCover.png';
export const BINGAA_COVER_URL = '/assets/BingaaCover.png';

const CERT_STORAGE_KEY = 'akinoya_bingaa_certificates';
const CERT_EVENT = 'akinoya-certificate-updated';

export interface BingaaCertificate {
  certificateId: string;
  title: string;
  passId: string;
  holderName: string;
  editionNumber: number;
  editionTotal: number;
  status: string;
  emailVerified: boolean;
  claimedAt: string;
  signatureAlgorithm: string;
  signature: string;
}

export const normalizePassId = (raw?: string | null): string =>
  (raw || '').trim().toUpperCase().replace(/^#/, '');

/** Mirrors server-side edition derivation (api/nfc/_certificateService.js). */
export const deriveEditionNumber = (passId: string): number => {
  const clean = normalizePassId(passId);
  if (clean.includes('X0914')) return 1;
  const match = clean.match(/(\d+)/g);
  if (!match) return 1;
  return parseInt(match[match.length - 1], 10) % TOTAL_EDITION_LIMIT || 1;
};

const readAll = (): Record<string, BingaaCertificate> => {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(CERT_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const getCertificate = (passId: string): BingaaCertificate | null => {
  const cert = readAll()[normalizePassId(passId)];
  return cert && cert.signature && cert.passId ? cert : null;
};

export const saveCertificate = (cert: BingaaCertificate): void => {
  if (typeof window === 'undefined') return;
  try {
    const all = readAll();
    all[normalizePassId(cert.passId)] = cert;
    localStorage.setItem(CERT_STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable — certificate stays in memory for this session */
  }
  window.dispatchEvent(new CustomEvent(CERT_EVENT));
};

/** Reactive hook returning the stored certificate for a pass (updates across tabs). */
export const useCertificate = (passId: string): BingaaCertificate | null => {
  const [cert, setCert] = useState<BingaaCertificate | null>(() => getCertificate(passId));

  useEffect(() => {
    const sync = () => setCert(getCertificate(passId));
    sync();
    window.addEventListener(CERT_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CERT_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [passId]);

  return cert;
};

export const formatSignature = (sig: string, groups = 8): string =>
  (sig.match(/.{1,4}/g) || []).slice(0, groups).join(' ');

export const formatClaimDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
};

/** Renders the certificate to a high-resolution PNG and triggers a download. */
export const downloadCertificatePng = async (cert: BingaaCertificate): Promise<void> => {
  const W = 2400;
  const H = 1700;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  try {
    await document.fonts?.ready;
  } catch {}

  // Background & frame
  ctx.fillStyle = '#07090f';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(103, 232, 249, 0.55)';
  ctx.lineWidth = 6;
  ctx.strokeRect(70, 70, W - 140, H - 140);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.strokeRect(100, 100, W - 200, H - 200);

  const center = W / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = '#67e8f9';
  ctx.font = '600 34px ui-monospace, Menlo, monospace';
  ctx.fillText('SILLOW MILL · ÄKINOYA', center, 230);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 84px Georgia, "Times New Roman", serif';
  ctx.fillText('CERTIFICATE OF AUTHENTICITY', center, 360);
  ctx.font = '700 60px Georgia, "Times New Roman", serif';
  ctx.fillStyle = '#e5e7eb';
  ctx.fillText('BINGÄA ISSUE #1', center, 450);

  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.moveTo(500, 510);
  ctx.lineTo(W - 500, 510);
  ctx.stroke();

  const rows: [string, string][] = [
    ['REGISTERED HOLDER', cert.holderName.toUpperCase()],
    ['EDITION', `FOUNDING MEMBER COPY #${cert.editionNumber} OF ${cert.editionTotal}`],
    ['STATUS', cert.status],
    ['PASS ID', `#${cert.passId}`],
    ['CERTIFICATE ID', cert.certificateId],
    ['CLAIMED', formatClaimDate(cert.claimedAt) + (cert.emailVerified ? ' · EMAIL VERIFIED' : '')],
  ];
  let y = 640;
  for (const [label, value] of rows) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '500 30px ui-monospace, Menlo, monospace';
    ctx.fillText(label, center, y);
    ctx.fillStyle = label === 'STATUS' ? '#6ee7b7' : '#ffffff';
    ctx.font = '600 46px ui-monospace, Menlo, monospace';
    ctx.fillText(value, center, y + 58);
    y += 132;
  }

  // Signature block
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '500 26px ui-monospace, Menlo, monospace';
  ctx.fillText(`CRYPTOGRAPHIC SIGNATURE (${cert.signatureAlgorithm})`, 180, H - 250);
  ctx.fillStyle = '#a5f3fc';
  ctx.font = '500 28px ui-monospace, Menlo, monospace';
  ctx.fillText(formatSignature(cert.signature, 8), 180, H - 205);
  ctx.fillText(formatSignature(cert.signature.slice(32), 8), 180, H - 165);

  // Official stamp
  const sx = W - 360;
  const sy = H - 330;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(-0.18);
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 0, 150, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 124, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(52, 211, 153, 0.9)';
  ctx.textAlign = 'center';
  ctx.font = '700 30px ui-monospace, Menlo, monospace';
  ctx.fillText('OFFICIAL', 0, -38);
  ctx.font = '800 44px ui-monospace, Menlo, monospace';
  ctx.fillText('AUTHENTIC', 0, 14);
  ctx.font = '600 24px ui-monospace, Menlo, monospace';
  ctx.fillText(`SILLOW MILL · ${cert.editionNumber}/${cert.editionTotal}`, 0, 58);
  ctx.restore();

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bingaa-Issue-1-Certificate-${cert.certificateId}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export interface PinRequestResult {
  success: boolean;
  message?: string;
  error?: string;
  devMode?: boolean;
  pin?: string;
  status?: number;
}

export interface CertifyResult {
  success: boolean;
  certificate?: BingaaCertificate;
  message?: string;
  error?: string;
  status?: string;
}

/** Requests deterministic 6-digit Card PIN delivery to email via Resend. */
export const requestCardPin = async (
  passId: string,
  email: string,
  holderName?: string
): Promise<PinRequestResult> => {
  try {
    const res = await fetch('/api/nfc/send-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passId, email, holderName }),
    });
    const data = await res.json().catch(() => ({}));
    return {
      success: Boolean(res.ok && data?.success),
      message: data?.message,
      error: data?.error,
      devMode: data?.devMode,
      pin: data?.pin,
      status: res.status,
    };
  } catch (err: any) {
    return { success: false, error: 'NETWORK_ERROR', message: err?.message || 'Network connection error.' };
  }
};

/** Authenticates the 6-digit Card PIN and issues the signed Certificate of Authenticity. */
export const verifyAndCertify = async (
  passId: string,
  pin: string,
  holderName: string,
  email?: string
): Promise<CertifyResult> => {
  try {
    const res = await fetch('/api/nfc/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'certify',
        token: passId,
        pin,
        ownerName: holderName,
        email,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return {
      success: Boolean(res.ok && data?.success && data?.certificate),
      certificate: data?.certificate,
      message: data?.message,
      error: data?.error,
      status: data?.status,
    };
  } catch (err: any) {
    return { success: false, error: 'NETWORK_ERROR', message: err?.message || 'Network connection error.' };
  }
};


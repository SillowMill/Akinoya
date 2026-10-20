import {
  syncSubscriberRowToGoogleSheets,
  syncPassClaimToGoogleSheets,
} from './nfc/_googleSheetsSync.js';

/**
 * Handles incoming POST requests to /api/sync-sheets and /api/auth/sync-sheets.
 * Synchronizes user profiles directly into the "Subscribers" Google Sheet tab,
 * and updates/locks the "VIP GUESTS" pass row if an active VIP code is redeemed.
 */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') return res.status(200).end();
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'POST') {
    if (typeof res.status === 'function') return res.status(405).json({ error: 'Method not allowed' });
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  const sendJson = (status, data) => {
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(status).json(data);
    }
    res.statusCode = status;
    if (typeof res.setHeader === 'function') {
      res.setHeader('Content-Type', 'application/json');
    }
    return res.end(JSON.stringify(data));
  };

  try {
    const payload = req.body || {};
    const record = payload.record || payload;

    let firstName = String(record.first_name || record.firstName || '').trim();
    let lastName = String(record.last_name || record.lastName || '').trim();
    const rawFullName = String(record.fullName || record.full_name || record.holderName || record.ownerName || '').trim();
    if (!firstName && rawFullName) {
      const parts = rawFullName.split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ');
    }
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || rawFullName;
    const email = String(record.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return sendJson(400, { success: false, error: 'Valid email is required for subscriber sync' });
    }

    const isFounder = email === 'odi.selis3@gmail.com';
    let role = isFounder ? 'CREATOR' : String(record.role || 'FREE').trim().toUpperCase();
    const rawVipCode = String(record.vip_code_redeemed || record.vipCode || record.passId || record.token || '').trim();
    const registrationDate = record.timestamp || record.created_at || new Date().toISOString();
    const claimedSector = String(
      record.worldName ||
      record.planetName ||
      record.claimed_sector ||
      record.sector ||
      ''
    ).trim();

    // 1. Sync to Subscribers tab
    const subSync = await syncSubscriberRowToGoogleSheets({
      firstName,
      lastName,
      fullName,
      email,
      role,
      vipCode: rawVipCode,
      claimedSector,
      registrationDate,
    });

    // 2. If valid VIP pass code is present, sync and lock VIP GUESTS tab
    let vipSync = null;
    const isVipPassCode = rawVipCode && rawVipCode !== 'N/A' && (
      rawVipCode.toUpperCase().startsWith('AKN-VIP') ||
      /^#?\d{1,3}$/.test(rawVipCode) ||
      /^X\d{1,4}$/i.test(rawVipCode)
    );

    if (isVipPassCode || isFounder) {
      const passIdToSync = isFounder ? 'AKN-VIP-2027-X0914' : rawVipCode;
      vipSync = await syncPassClaimToGoogleSheets(passIdToSync, fullName || email.split('@')[0], email);
    }

    return sendJson(200, {
      success: subSync?.success ?? true,
      email,
      subscriberSync: subSync,
      vipSync,
      tab: 'Subscribers',
    });
  } catch (error) {
    console.error('[Google Sheets Sync] Unhandled exception:', error);
    return sendJson(500, { success: false, error: 'Internal server error syncing to Google Sheets' });
  }
}

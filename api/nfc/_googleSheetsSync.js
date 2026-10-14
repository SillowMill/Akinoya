import fs from 'fs';
import path from 'path';

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1gCYEDFNCZ2QlStvE2IuJiq4gUxrAJ08spaOvZM6Ke_0';

let _cachedAccessToken = null;
let _tokenExpiresAt = 0;

function getCredentials() {
  let clientId = process.env.GOOGLE_SHEETS_CLIENT_ID;
  let clientSecret = process.env.GOOGLE_SHEETS_CLIENT_SECRET;
  let refreshToken = process.env.GOOGLE_SHEETS_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    // Fallback to local token file if present
    const localTokenPaths = [
      '/Users/odi/.gemini/antigravity/plugin_data/gsheets/token.json',
      path.resolve(process.cwd(), '.gsheets_token.json'),
    ];
    for (const p of localTokenPaths) {
      try {
        if (fs.existsSync(p)) {
          const data = JSON.parse(fs.readFileSync(p, 'utf8'));
          clientId = clientId || data.client_id;
          clientSecret = clientSecret || data.client_secret;
          refreshToken = refreshToken || (data.token && data.token.refresh_token);
          if (clientId && clientSecret && refreshToken) break;
        }
      } catch {}
    }
  }

  return { clientId, clientSecret, refreshToken };
}

async function getAccessToken() {
  const now = Date.now();
  if (_cachedAccessToken && now < _tokenExpiresAt - 60000) {
    return _cachedAccessToken;
  }

  const { clientId, clientSecret, refreshToken } = getCredentials();
  if (!clientId || !clientSecret || !refreshToken) {
    console.warn('[Google Sheets] Missing OAuth credentials for auto-sync.');
    return null;
  }

  try {
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('[Google Sheets] OAuth token refresh failed:', res.status, errText);
      return null;
    }

    const data = await res.json();
    _cachedAccessToken = data.access_token;
    _tokenExpiresAt = now + (data.expires_in || 3600) * 1000;
    return _cachedAccessToken;
  } catch (err) {
    console.warn('[Google Sheets] Error obtaining access token:', err);
    return null;
  }
}

/**
 * Updates Column C (Holder Name), Column D (Holder Email), and Column F (Status = "Claimed") for a claimed pass in Google Sheets.
 * Leaves Column E (NFC Target URL) and Column G (Notes) intact.
 */
export async function syncPassClaimToGoogleSheets(passId, holderName, holderEmail = '') {
  try {
    const cleanId = String(passId || '').trim().toUpperCase().replace(/^#/, '');
    const cleanName = String(holderName || '').trim();
    const cleanEmail = String(holderEmail || '').trim();

    if (!cleanId || !cleanName) return { success: false, reason: 'MISSING_DATA' };

    let targetRow = null;

    if (cleanId === 'AKN-VIP-2027-X0914') {
      targetRow = 2; // Master / Founders Pass (#0)
    } else {
      const xMatch = cleanId.match(/X(\d{3,4})$/);
      if (xMatch) {
        const num = parseInt(xMatch[1], 10);
        if (num >= 1 && num <= 100) {
          targetRow = num + 2; // Row 3 = Edition #1, Row 102 = Edition #100
        }
      }
    }

    if (!targetRow) {
      console.warn(`[Google Sheets] Could not determine sheet row for Pass ID ${cleanId}`);
      return { success: false, reason: 'ROW_NOT_FOUND' };
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.warn('[Google Sheets] Skipped sync: No access token available.');
      return { success: false, reason: 'NO_TOKEN' };
    }

    const statusVal = targetRow === 2 ? 'Active / Primary Key' : 'Active / Claimed';

    let vipTab = 'VIP GUESTS';
    try {
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties.title`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (metaRes.ok) {
        const meta = await metaRes.json();
        const sheetTitles = (meta.sheets || []).map((s) => s.properties?.title);
        if (sheetTitles.includes('VIP GUESTS')) vipTab = 'VIP GUESTS';
        else if (sheetTitles.includes('VIP Guests')) vipTab = 'VIP Guests';
        else if (sheetTitles.includes('Blad1')) vipTab = 'Blad1';
        else if (sheetTitles[0]) vipTab = sheetTitles[0];
      }
    } catch {}

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`;
    const payload = {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: `'${vipTab}'!C${targetRow}`,
          values: [[cleanName]],
        },
        {
          range: `'${vipTab}'!D${targetRow}`,
          values: [[cleanEmail || '']],
        },
        {
          range: `'${vipTab}'!F${targetRow}`,
          values: [[statusVal]],
        },
      ],
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Google Sheets] batchUpdate failed for row ${targetRow}:`, res.status, errText);
      return { success: false, reason: 'API_ERROR', details: errText };
    }

    const resData = await res.json();
    return { success: true, row: targetRow, updatedCells: resData.totalUpdatedCells };
  } catch (err) {
    console.warn('[Google Sheets] Exception during sheet sync:', err);
    return { success: false, error: err.message };
  }
}

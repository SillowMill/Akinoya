import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1gCYEDFNCZ2QlStvE2IuJiq4gUxrAJ08spaOvZM6Ke_0';

let _cachedAccessToken = null;
let _tokenExpiresAt = 0;

/**
 * Sanitizes PEM private key strings by stripping outer quotes and restoring escaped newlines.
 */
function sanitizePrivateKey(rawKey) {
  if (!rawKey) return '';
  let key = String(rawKey).trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}

/**
 * Generates an RS256 signed JWT for Google Service Account authentication.
 */
function createServiceAccountJwt(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);

  const cleanKey = sanitizePrivateKey(privateKey);
  const signature = signer.sign(cleanKey, 'base64url');

  return `${unsignedToken}.${signature}`;
}

/**
 * Exchanges Google Service Account credentials for an OAuth access token.
 */
async function getServiceAccountAccessToken(clientEmail, privateKey) {
  try {
    const jwt = createServiceAccountJwt(clientEmail, privateKey);
    const params = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('[Google Sheets] Service account authentication failed:', res.status, errText);
      return null;
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 3600,
    };
  } catch (err) {
    console.warn('[Google Sheets] Error exchanging service account JWT:', err);
    return null;
  }
}

/**
 * Retrieves OAuth credentials from environment variables or local fallback files.
 */
function getOAuthCredentials() {
  let clientId = process.env.GOOGLE_SHEETS_CLIENT_ID;
  let clientSecret = process.env.GOOGLE_SHEETS_CLIENT_SECRET;
  let refreshToken = process.env.GOOGLE_SHEETS_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
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

/**
 * Acquires a valid Google Sheets access token.
 * Prioritizes Service Account authentication (GOOGLE_SHEETS_CLIENT_EMAIL / GOOGLE_SHEETS_PRIVATE_KEY),
 * falling back seamlessly to OAuth refresh tokens.
 */
export async function getAccessToken() {
  const now = Date.now();
  if (_cachedAccessToken && now < _tokenExpiresAt - 60000) {
    return _cachedAccessToken;
  }

  // 1. Service Account Authentication
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    const saAuth = await getServiceAccountAccessToken(clientEmail, privateKey);
    if (saAuth && saAuth.accessToken) {
      _cachedAccessToken = saAuth.accessToken;
      _tokenExpiresAt = now + saAuth.expiresIn * 1000;
      return _cachedAccessToken;
    }
  }

  // 2. OAuth Refresh Token Fallback
  const { clientId, clientSecret, refreshToken } = getOAuthCredentials();
  if (!clientId || !clientSecret || !refreshToken) {
    console.warn('[Google Sheets] Missing Google Sheets credentials in environment.');
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
 * Resolves the primary VIP guests tab name from spreadsheet metadata.
 */
async function resolveVipTabName(accessToken) {
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
  } catch (err) {
    console.warn('[Google Sheets] Could not query spreadsheet tabs metadata:', err);
  }
  return vipTab;
}

/**
 * Normalizes pass token strings for reliable matching.
 */
function normalizePassIdForLookup(id) {
  return String(id || '')
    .trim()
    .toUpperCase()
    .replace(/^#/, '');
}

/**
 * Dynamically locates the row index matching a Pass ID in the VIP GUESTS tab.
 * Checks Column B (Pass ID) and Column A (Edition Number), with safe fallback calculation.
 */
async function findPassRowInSheet(accessToken, tabName, rawPassId) {
  const normPass = normalizePassIdForLookup(rawPassId);
  const isMaster =
    normPass === 'AKN-VIP-2027-X0914' ||
    normPass === '0' ||
    normPass === 'FOUNDERS' ||
    normPass === 'MASTER' ||
    normPass === 'FOUNDER';

  let extractedNum = null;
  if (isMaster) {
    extractedNum = 0;
  } else {
    const matchX = normPass.match(/X(\d{1,4})$/);
    if (matchX) {
      extractedNum = parseInt(matchX[1], 10);
    } else {
      const matchNum = normPass.match(/^(\d{1,3})$/);
      if (matchNum) {
        extractedNum = parseInt(matchNum[1], 10);
      }
    }
  }

  try {
    const range = `${tabName}!A1:B120`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      range
    )}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) {
      const data = await res.json();
      const rows = data.values || [];

      for (let i = 0; i < rows.length; i++) {
        const rowIndex = i + 1; // 1-indexed sheet row
        const colA = String(rows[i][0] || '').trim();
        const colB = String(rows[i][1] || '').trim();

        const normA = normalizePassIdForLookup(colA);
        const normB = normalizePassIdForLookup(colB);

        // 1. Exact match on Column B (Pass ID)
        if (normB && (normB === normPass || normB === `AKN-VIP-2027-${normPass}`)) {
          return rowIndex;
        }

        // 2. Founders / Master Pass check
        if (
          isMaster &&
          (normB === 'AKN-VIP-2027-X0914' ||
            colA.toLowerCase().includes('founder') ||
            colA.includes('#0'))
        ) {
          return rowIndex;
        }

        // 3. Numeric match against Column A (e.g., "#1") or Column B (e.g., "AKN-VIP-2027-X001")
        if (extractedNum !== null) {
          if (
            extractedNum === 0 &&
            (colA.toLowerCase().includes('founder') || colA.includes('#0'))
          ) {
            return rowIndex;
          }
          if (normA === String(extractedNum) || normA === `#${extractedNum}`) {
            return rowIndex;
          }
          const bMatch = normB.match(/X(\d{1,4})$/);
          if (bMatch && parseInt(bMatch[1], 10) === extractedNum) {
            return rowIndex;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Google Sheets] Error scanning sheet rows:', err);
  }

  // Fallback to deterministic index calculation if row scan is inconclusive
  if (isMaster) return 2;
  if (extractedNum && extractedNum >= 1 && extractedNum <= 100) {
    return extractedNum + 2;
  }

  return null;
}

/**
 * Updates Column C (Holder Name), Column D (Holder Email), and Column F (Status)
 * for a claimed pass in Google Sheets, leaving Column E (NFC Target URL) and Column G (Notes) intact.
 */
export async function syncPassClaimToGoogleSheets(passId, holderName, holderEmail = '') {
  try {
    const cleanId = normalizePassIdForLookup(passId);
    const cleanName = String(holderName || '').trim();
    const cleanEmail = String(holderEmail || '').trim();

    if (!cleanId || !cleanName) {
      return { success: false, reason: 'MISSING_DATA' };
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.warn('[Google Sheets] Skipped sync: No access token available.');
      return { success: false, reason: 'NO_TOKEN' };
    }

    const vipTab = await resolveVipTabName(accessToken);
    const targetRow = await findPassRowInSheet(accessToken, vipTab, cleanId);

    if (!targetRow) {
      console.warn(`[Google Sheets] Could not locate sheet row for Pass ID: ${cleanId}`);
      return { success: false, reason: 'ROW_NOT_FOUND' };
    }

    const isMaster =
      cleanId === 'AKN-VIP-2027-X0914' || cleanId === '0' || targetRow === 2;
    const statusVal = isMaster ? 'Active / Primary Key' : 'Active / Claimed';

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
    return {
      success: true,
      row: targetRow,
      updatedCells: resData.totalUpdatedCells,
      tab: vipTab,
      passId: cleanId,
    };
  } catch (err) {
    console.warn('[Google Sheets] Exception during sheet sync:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Resets a VIP Pass in Google Sheets to Unclaimed / Ready to claim state.
 * Clears Holder Name (Col C) and Holder Email (Col D), sets Status (Col F) to Unclaimed.
 */
export async function resetPassInGoogleSheets(passId) {
  try {
    const cleanId = normalizePassIdForLookup(passId);
    if (!cleanId) return { success: false, reason: 'MISSING_PASS_ID' };

    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.warn('[Google Sheets] Skipped reset: No access token available.');
      return { success: false, reason: 'NO_TOKEN' };
    }

    const vipTab = await resolveVipTabName(accessToken);
    const targetRow = await findPassRowInSheet(accessToken, vipTab, cleanId);
    if (!targetRow) {
      console.warn(`[Google Sheets] Could not locate sheet row for Pass ID: ${cleanId}`);
      return { success: false, reason: 'ROW_NOT_FOUND' };
    }

    const isMaster = cleanId === 'AKN-VIP-2027-X0914' || cleanId === '0' || targetRow === 2;
    const statusVal = isMaster ? 'Ready to claim / Master Key' : 'Unclaimed / Ready to claim';

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`;
    const payload = {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: `'${vipTab}'!C${targetRow}`,
          values: [['']],
        },
        {
          range: `'${vipTab}'!D${targetRow}`,
          values: [['']],
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
      console.warn(`[Google Sheets] batchUpdate reset failed for row ${targetRow}:`, res.status, errText);
      return { success: false, reason: 'API_ERROR', details: errText };
    }

    const resData = await res.json();
    return {
      success: true,
      row: targetRow,
      updatedCells: resData.totalUpdatedCells,
      tab: vipTab,
      passId: cleanId,
    };
  } catch (err) {
    console.warn('[Google Sheets] Exception during pass reset in sheets:', err);
    return { success: false, error: err.message };
  }
}

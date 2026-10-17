import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1gCYEDFNCZ2QlStvE2IuJiq4gUxrAJ08spaOvZM6Ke_0';

export const WHITELIST_SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_WHITELIST_SPREADSHEET_ID || '1SivG6Sh9mdr3_1b_YInB5JR2Ol_SiqNkw9GtITE6gnY';

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
    const envFiles = [
      path.resolve(process.cwd(), '.env.vercel'),
      path.resolve(process.cwd(), '.env.production.local'),
      path.resolve(process.cwd(), '.env.local'),
      path.resolve(process.cwd(), '.env'),
    ];
    for (const envPath of envFiles) {
      try {
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, 'utf8');
          for (const line of content.split(/\r?\n/)) {
            const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
            if (!match) continue;
            const key = match[1];
            const val = match[2].replace(/^["']|["']$/g, '').trim();
            if (key === 'GOOGLE_SHEETS_CLIENT_ID' && !clientId) clientId = val;
            if (key === 'GOOGLE_SHEETS_CLIENT_SECRET' && !clientSecret) clientSecret = val;
            if (key === 'GOOGLE_SHEETS_REFRESH_TOKEN' && !refreshToken) refreshToken = val;
          }
          if (clientId && clientSecret && refreshToken) break;
        }
      } catch {}
    }
  }

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
 * Also synchronizes the holder into the Subscribers tab in real time.
 */
export async function syncPassClaimToGoogleSheets(passId, holderName, holderEmail = '') {
  try {
    const cleanId = normalizePassIdForLookup(passId);
    const cleanEmail = String(holderEmail || '').trim().toLowerCase();
    const isMaster =
      cleanId === 'AKN-VIP-2027-X0914' || cleanId === '0' || cleanEmail === 'odi.selis3@gmail.com';
    const derivedName =
      String(holderName || '').trim() ||
      (isMaster
        ? 'Odi Selis'
        : cleanEmail && cleanEmail.includes('@')
        ? cleanEmail.split('@')[0]
        : 'Founding VIP Holder');

    if (!cleanId) {
      return { success: false, reason: 'MISSING_PASS_ID' };
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

    const statusVal =
      isMaster || targetRow === 2 ? 'Active / Primary Key' : 'Active / Claimed';

    const dataUpdates = [
      {
        range: `'${vipTab}'!C${targetRow}`,
        values: [[derivedName]],
      },
      {
        range: `'${vipTab}'!F${targetRow}`,
        values: [[statusVal]],
      },
    ];

    if (cleanEmail) {
      dataUpdates.push({
        range: `'${vipTab}'!D${targetRow}`,
        values: [[cleanEmail]],
      });
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`;
    const payload = {
      valueInputOption: 'USER_ENTERED',
      data: dataUpdates,
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

    // Also synchronize into Subscribers tab when email is available
    if (cleanEmail && cleanEmail.includes('@')) {
      const nameParts = derivedName.split(/\s+/);
      await syncSubscriberRowToGoogleSheets({
        firstName: nameParts[0] || derivedName,
        lastName: nameParts.slice(1).join(' '),
        email: cleanEmail,
        role: isMaster ? 'CREATOR [PIONEER-2027]' : 'VIP_GUEST [PIONEER-2027]',
        vipCode: cleanId.startsWith('AKN-') ? cleanId : `AKN-VIP-2027-${cleanId}`,
        registrationDate: new Date().toISOString(),
      }).catch(() => {});
    }

    return {
      success: true,
      row: targetRow,
      updatedCells: resData.totalUpdatedCells,
      tab: vipTab,
      passId: cleanId,
      holderName: derivedName,
      holderEmail: cleanEmail,
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

/**
 * Synchronizes a VIP guest or registration record to the `VIP GUESTS` tab in
 * Google Spreadsheet 1gCYEDFNCZ2QlStvE2IuJiq4gUxrAJ08spaOvZM6Ke_0.
 * - If a specific Pass ID (e.g. AKN-VIP-2027-X001 .. X100 or X0914) is matched, updates
 *   Columns C (Holder Name), D (Holder Email), and F (Status) on that edition row.
 * - If the email already exists in Column D of VIP GUESTS, updates that row in place.
 * - Otherwise appends a 7-column row aligned with the VIP GUESTS schema:
 *   [Edition / Tier, Pass ID, Holder Name, Holder Email, Target URL / World, Status, Notes]
 */
export async function appendVipGuestRecordToSheets({
  timestamp = '',
  email = '',
  holderName = '',
  passId = '',
  founderPassStatus = '',
  worldName = '',
  role = '',
} = {}) {
  try {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, reason: 'INVALID_EMAIL' };
    }

    const isFounder = cleanEmail === 'odi.selis3@gmail.com';
    const cleanName =
      String(holderName || '').trim() ||
      (isFounder ? 'Odi Selis' : cleanEmail.split('@')[0]);

    // Check if passId or founderPassStatus contains an explicit AKN-VIP pass code
    let resolvedPassId = String(passId || '').trim().toUpperCase();
    if (!resolvedPassId && founderPassStatus) {
      const matchCode = String(founderPassStatus).match(/AKN-VIP-\d{4}-[A-Z]\d{3,4}/i);
      if (matchCode) resolvedPassId = matchCode[0].toUpperCase();
    }
    if (isFounder && (!resolvedPassId || resolvedPassId === 'N/A')) {
      resolvedPassId = 'AKN-VIP-2027-X0914';
    }

    if (resolvedPassId && resolvedPassId.startsWith('AKN-VIP-')) {
      const claimSync = await syncPassClaimToGoogleSheets(resolvedPassId, cleanName, cleanEmail);
      if (claimSync.success) {
        return claimSync;
      }
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.warn('[Google Sheets] Skipped VIP GUESTS sync: No access token available.');
      return { success: false, reason: 'NO_TOKEN' };
    }

    const vipTab = await resolveVipTabName(accessToken);

    // Check if email already exists in Column D of VIP GUESTS to avoid duplicate rows
    try {
      const scanRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
          `'${vipTab}'!A1:G200`
        )}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (scanRes.ok) {
        const scanData = await scanRes.json();
        const rows = scanData.values || [];
        for (let i = 1; i < rows.length; i++) {
          const rowIndex = i + 1;
          const colD = String(rows[i][3] || '').trim().toLowerCase();
          const colB = String(rows[i][1] || '').trim().toLowerCase();
          if (colD === cleanEmail || colB === cleanEmail) {
            const statusText =
              founderPassStatus || (isFounder ? 'Active / Primary Key' : 'Active / Registered');
            await fetch(
              `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  valueInputOption: 'USER_ENTERED',
                  data: [
                    { range: `'${vipTab}'!C${rowIndex}`, values: [[cleanName]] },
                    { range: `'${vipTab}'!D${rowIndex}`, values: [[cleanEmail]] },
                    { range: `'${vipTab}'!F${rowIndex}`, values: [[statusText]] },
                  ],
                }),
              }
            );
            return {
              success: true,
              action: 'updated_existing_row',
              row: rowIndex,
              tab: vipTab,
            };
          }
        }
      }
    } catch (scanErr) {
      console.warn('[Google Sheets] Notice scanning VIP GUESTS for existing email:', scanErr);
    }

    const rowValues = [
      role || (isFounder ? 'CREATOR' : 'VIP / PIONEER'),
      resolvedPassId && resolvedPassId !== 'N/A' ? resolvedPassId : 'WHITELIST / PIONEER',
      cleanName,
      cleanEmail,
      worldName && worldName !== 'Unclaimed' ? `SECTOR: ${worldName}` : 'https://www.sillowmill.com',
      founderPassStatus || (isFounder ? 'Active / Primary Key' : 'Registered / Active'),
      `Registered ${timestamp || new Date().toISOString()}`,
    ];

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      `'${vipTab}'!A:G`
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const res = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('[Google Sheets] VIP GUESTS append failed:', res.status, errText);
      return { success: false, reason: 'API_ERROR', details: errText };
    }

    const data = await res.json();
    return {
      success: true,
      tab: vipTab,
      updatedRange: data?.updates?.updatedRange,
      row: rowValues,
    };
  } catch (err) {
    console.warn('[Google Sheets] Exception appending to VIP GUESTS:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Upserts a subscriber row into the `Subscribers` tab of SPREADSHEET_ID
 * (1gCYEDFNCZ2QlStvE2IuJiq4gUxrAJ08spaOvZM6Ke_0).
 */
export async function syncSubscriberRowToGoogleSheets({
  firstName = '',
  lastName = '',
  fullName = '',
  email = '',
  role = 'FREE',
  vipCode = 'N/A',
  claimedSector = '',
  registrationDate = '',
}) {
  try {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, reason: 'INVALID_EMAIL' };
    }

    const token = await getAccessToken();
    if (!token) {
      return { success: false, reason: 'NO_TOKEN' };
    }

    const isFounder = cleanEmail === 'odi.selis3@gmail.com';
    let resolvedFirst = String(firstName || '').trim();
    let resolvedLast = String(lastName || '').trim();
    if (!resolvedFirst && fullName) {
      const parts = String(fullName).trim().split(/\s+/);
      resolvedFirst = parts[0] || '';
      resolvedLast = parts.slice(1).join(' ');
    }

    const regDate = registrationDate || new Date().toISOString();
    let roleDisplay = isFounder ? 'CREATOR [PIONEER-2027]' : String(role || 'FREE').trim().toUpperCase();
    if (!roleDisplay.includes('PIONEER')) {
      roleDisplay = `${roleDisplay} [PIONEER-2027]`;
    }

    let codeDisplay = isFounder ? 'AKN-VIP-2027-X0914' : String(vipCode || 'N/A').trim();
    if (claimedSector && !codeDisplay.includes(claimedSector)) {
      codeDisplay = codeDisplay && codeDisplay !== 'N/A' ? `${codeDisplay} · SECTOR: ${claimedSector}` : `SECTOR: ${claimedSector}`;
    }

    const tabName = 'Subscribers';
    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
        `${tabName}!A:F`
      )}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    let rows = [];
    if (getRes.ok) {
      const data = await getRes.json();
      rows = data.values || [];
    }

    if (rows.length === 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
          `${tabName}!A1:F1`
        )}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [
              [
                'First Name',
                'Last Name',
                'Email Address',
                'Role Status',
                'VIP Code Used',
                'Registration Date',
              ],
            ],
          }),
        }
      );
      rows = [['First Name', 'Last Name', 'Email Address', 'Role Status', 'VIP Code Used', 'Registration Date']];
    }

    let targetRowIndex = -1;
    let existingRow = null;
    for (let i = 1; i < rows.length; i++) {
      const rEmail = String(rows[i]?.[2] || '').trim().toLowerCase();
      if (rEmail === cleanEmail) {
        targetRowIndex = i + 1;
        existingRow = rows[i];
        break;
      }
    }

    if (targetRowIndex > 1 && existingRow) {
      const updatedRow = [
        resolvedFirst || existingRow[0] || (isFounder ? 'Odi' : 'Subscriber'),
        resolvedLast || existingRow[1] || (isFounder ? 'Selis' : ''),
        cleanEmail,
        isFounder
          ? 'CREATOR [PIONEER-2027]'
          : existingRow[3] && existingRow[3].includes('VIP') && !roleDisplay.includes('VIP')
          ? existingRow[3]
          : roleDisplay,
        isFounder
          ? 'AKN-VIP-2027-X0914'
          : codeDisplay && codeDisplay !== 'N/A'
          ? codeDisplay
          : existingRow[4] || 'N/A',
        existingRow[5] || regDate,
      ];

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
          `${tabName}!A${targetRowIndex}:F${targetRowIndex}`
        )}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [updatedRow] }),
        }
      );

      return { success: true, action: 'updated', row: targetRowIndex, email: cleanEmail };
    }

    const newRow = [
      resolvedFirst || (isFounder ? 'Odi' : 'Subscriber'),
      resolvedLast || (isFounder ? 'Selis' : ''),
      cleanEmail,
      roleDisplay,
      codeDisplay || 'N/A',
      regDate,
    ];

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
        `${tabName}!A:F`
      )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [newRow] }),
      }
    );

    return { success: true, action: 'appended', email: cleanEmail };
  } catch (err) {
    console.warn('[Google Sheets] syncSubscriberRowToGoogleSheets notice:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Automated Whitelist & Comic Preview Email Capture:
 * Pushes submitted whitelist / comic preview / Wave 2 notification emails directly to:
 * 1) The dedicated Google Sheet in Google Drive (`WHITELIST_SPREADSHEET_ID`: 1SivG6Sh9mdr3_1b_YInB5JR2Ol_SiqNkw9GtITE6gnY, tab `Whitelist`)
 * 2) The `Subscribers` tab of the main VIP spreadsheet (`SPREADSHEET_ID`: 1gCYEDFNCZ2QlStvE2IuJiq4gUxrAJ08spaOvZM6Ke_0)
 * 3) Local durable JSON backup (`/tmp/sillow_whitelist.json` & `data/whitelist.json`)
 */
export async function appendWhitelistEmailToGoogleSheets({
  email,
  source = 'Comic Preview Gate (Page 3 Lock)',
  chapter = 'Bingäa Issue #1 — Chapter 2 Preview Gate',
  notes = 'Wave 2 Priority Notification & Early Access',
  timestamp = '',
}) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const ts = timestamp || new Date().toISOString();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, reason: 'INVALID_EMAIL' };
  }

  // 1. Persist locally for instant resilience
  const entry = {
    timestamp: ts,
    email: cleanEmail,
    source,
    chapter,
    status: 'Whitelisted — Wave 2 Priority',
    notes,
  };

  for (const filePath of ['/tmp/sillow_whitelist.json', path.resolve(process.cwd(), 'data', 'whitelist.json')]) {
    try {
      const dir = path.dirname(filePath);
      if (fs.existsSync(dir)) {
        let list = [];
        if (fs.existsSync(filePath)) {
          try {
            list = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (!Array.isArray(list)) list = [];
          } catch {
            list = [];
          }
        }
        const existingIdx = list.findIndex((item) => String(item.email || '').toLowerCase() === cleanEmail);
        if (existingIdx >= 0) {
          list[existingIdx] = { ...list[existingIdx], ...entry, updatedAt: ts };
        } else {
          list.push(entry);
        }
        fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf8');
      }
    } catch {}
  }

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.warn('[Google Sheets Whitelist] No access token available; saved locally.');
      return { success: false, reason: 'NO_TOKEN', savedLocally: true };
    }

    // Resolve tab name in WHITELIST_SPREADSHEET_ID (defaults to 'Whitelist')
    let whitelistTab = 'Whitelist';
    try {
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${WHITELIST_SPREADSHEET_ID}?fields=sheets.properties.title`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (metaRes.ok) {
        const meta = await metaRes.json();
        const titles = (meta.sheets || []).map((s) => s.properties?.title);
        if (titles.includes('Whitelist')) whitelistTab = 'Whitelist';
        else if (titles[0]) whitelistTab = titles[0];
      }
    } catch {}

    // Check existing rows in Whitelist sheet so we update in-place if the email already registered
    let existingRowIdx = -1;
    try {
      const readRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${WHITELIST_SPREADSHEET_ID}/values/${encodeURIComponent(
          `'${whitelistTab}'!A1:F500`
        )}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (readRes.ok) {
        const readData = await readRes.json();
        const rows = readData.values || [];
        if (rows.length === 0) {
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${WHITELIST_SPREADSHEET_ID}/values/${encodeURIComponent(
              `'${whitelistTab}'!A1:F1`
            )}?valueInputOption=USER_ENTERED`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                values: [['Timestamp', 'Email Address', 'Source / Gate', 'Chapter / Drop', 'Wave Status', 'Notes']],
              }),
            }
          );
        } else {
          for (let i = 1; i < rows.length; i++) {
            const rEmail = String(rows[i]?.[1] || '').trim().toLowerCase();
            if (rEmail === cleanEmail) {
              existingRowIdx = i + 1;
              break;
            }
          }
        }
      }
    } catch {}

    const rowValues = [
      ts,
      cleanEmail,
      source,
      chapter,
      'Whitelisted — Wave 2 Priority',
      notes,
    ];

    if (existingRowIdx > 1) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${WHITELIST_SPREADSHEET_ID}/values/${encodeURIComponent(
          `'${whitelistTab}'!A${existingRowIdx}:F${existingRowIdx}`
        )}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [rowValues] }),
        }
      );
    } else {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${WHITELIST_SPREADSHEET_ID}/values/${encodeURIComponent(
          `'${whitelistTab}'!A:F`
        )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [rowValues] }),
        }
      );
    }

    // 2. Also sync into the main VIP spreadsheet Subscribers & VIP GUESTS tabs
    await syncSubscriberRowToGoogleSheets({
      firstName: cleanEmail.split('@')[0],
      email: cleanEmail,
      role: 'WHITELIST [PIONEER-2027]',
      vipCode: `WHITELIST: ${source}`,
      registrationDate: ts,
    }).catch(() => {});

    return {
      success: true,
      spreadsheetId: WHITELIST_SPREADSHEET_ID,
      tab: whitelistTab,
      email: cleanEmail,
      action: existingRowIdx > 1 ? 'updated' : 'appended',
    };
  } catch (err) {
    console.warn('[Google Sheets Whitelist] Exception syncing email:', err);
    return { success: false, error: err.message, savedLocally: true };
  }
}



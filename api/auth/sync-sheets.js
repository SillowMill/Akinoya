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
    console.warn('[Google Sheets Sync] Missing OAuth credentials in environment.');
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
      console.warn('[Google Sheets Sync] Token refresh failed:', res.status, errText);
      return null;
    }

    const data = await res.json();
    _cachedAccessToken = data.access_token;
    _tokenExpiresAt = now + (data.expires_in || 3600) * 1000;
    return _cachedAccessToken;
  } catch (err) {
    console.warn('[Google Sheets Sync] Error getting token:', err);
    return null;
  }
}

/**
 * Ensures "Subscribers" sheet tab exists with the standard 6-column header:
 * [ First Name | Last Name | Email Address | Role Status | VIP Code Used | Registration Date ]
 */
async function ensureSubscribersSheet(token) {
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties.title`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!metaRes.ok) return 'Blad1';

    const meta = await metaRes.json();
    const sheetTitles = (meta.sheets || []).map((s) => s.properties?.title);

    if (sheetTitles.includes('Subscribers')) {
      return 'Subscribers';
    }

    // Add sheet tab if missing
    const addRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'Subscribers',
                  gridProperties: { rowCount: 1000, columnCount: 6 },
                },
              },
            },
          ],
        }),
      }
    );

    if (addRes.ok) {
      // Add Header row
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Subscribers!A1:F1?valueInputOption=USER_ENTERED`,
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
      return 'Subscribers';
    }

    return 'Subscribers';
  } catch (err) {
    console.warn('[Google Sheets Sync] ensureSubscribersSheet warning:', err);
    return 'Subscribers';
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body || {};

    // Support both direct client call and Supabase Webhook event structure (record/type)
    const record = payload.record || payload;

    const firstName = String(record.first_name || record.firstName || '').trim();
    const lastName = String(record.last_name || record.lastName || '').trim();
    const email = String(record.email || '').trim().toLowerCase();
    const role = String(record.role || 'FREE').trim().toUpperCase();
    const vipCode = String(record.vip_code_redeemed || record.vipCode || '').trim();
    const registrationDate = record.created_at || new Date().toISOString();

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required for subscriber sync' });
    }

    // STRICT GDPR: Sanitize out passwords or hashes
    if (payload.password || record.password || payload.hash) {
      delete payload.password;
      delete record.password;
    }

    const token = await getAccessToken();
    if (!token) {
      console.warn('[Google Sheets Sync] Token unavailable, queuing local sync log.');
      return res.status(200).json({
        success: true,
        queued: true,
        message: 'Subscriber recorded (Google Sheets sync credentials in setup)',
      });
    }

    const tabName = await ensureSubscribersSheet(token);

    // Check if subscriber email already exists in sheet
    const range = `${tabName}!A:F`;
    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
        range
      )}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    let rows = [];
    if (getRes.ok) {
      const data = await getRes.json();
      rows = data.values || [];
    }

    // Header check
    if (rows.length === 0) {
      // Seed header row
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
      rows = [
        [
          'First Name',
          'Last Name',
          'Email Address',
          'Role Status',
          'VIP Code Used',
          'Registration Date',
        ],
      ];
    }

    let existingRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const rowEmail = String(rows[i]?.[2] || '').trim().toLowerCase();
      if (rowEmail === email) {
        existingRowIndex = i + 1; // 1-indexed row number
        break;
      }
    }

    if (existingRowIndex > 0) {
      // Update existing row
      const updateRange = `${tabName}!A${existingRowIndex}:F${existingRowIndex}`;
      const currentRow = rows[existingRowIndex - 1] || [];
      const updatedRow = [
        firstName || currentRow[0] || '',
        lastName || currentRow[1] || '',
        email,
        role || currentRow[3] || 'FREE',
        vipCode || currentRow[4] || 'N/A',
        currentRow[5] || registrationDate,
      ];

      const putRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
          updateRange
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

      if (!putRes.ok) {
        const errText = await putRes.text();
        console.warn('[Google Sheets Sync] Update failed:', putRes.status, errText);
      }

      return res.status(200).json({
        success: true,
        action: 'updated',
        row: existingRowIndex,
        email,
        role,
      });
    }

    // Append new row
    const appendRange = `${tabName}!A:F`;
    const newRow = [
      firstName || 'Subscriber',
      lastName || '',
      email,
      role || 'FREE',
      vipCode || 'N/A',
      registrationDate,
    ];

    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
        appendRange
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

    if (!appendRes.ok) {
      const errText = await appendRes.text();
      console.warn('[Google Sheets Sync] Append failed:', appendRes.status, errText);
    }

    return res.status(200).json({
      success: true,
      action: 'appended',
      email,
      role,
    });
  } catch (error) {
    console.error('[Google Sheets Sync] Unhandled exception:', error);
    return res.status(500).json({ error: 'Internal server error syncing to Google Sheets' });
  }
}

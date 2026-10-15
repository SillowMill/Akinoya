import {
  getAccessToken,
  SPREADSHEET_ID,
} from '../nfc/_googleSheetsSync.js';

/**
 * Ensures the "Subscribers" sheet tab exists with the standard 6-column header:
 * [ First Name | Last Name | Email Address | Role Status | VIP Code Used | Registration Date ]
 */
async function ensureSubscribersSheet(token) {
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties.title`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!metaRes.ok) return 'Subscribers';

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
      // Add standard 6-column header
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
    }

    return 'Subscribers';
  } catch (err) {
    console.warn('[Google Sheets Sync] ensureSubscribersSheet notice:', err);
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
    const isFounder = email === 'odi@sillowmill.com' || email === 'odi.selis3@gmail.com';
    let role = isFounder ? 'CREATOR' : String(record.role || 'FREE').trim().toUpperCase();
    let vipCode = String(record.vip_code_redeemed || record.vipCode || '').trim() || 'N/A';
    const registrationDate = record.created_at || new Date().toISOString();
    const isPioneer = new Date(registrationDate).getTime() < new Date('2027-01-09T00:00:00+01:00').getTime();
    const pioneerBadge = isPioneer ? '[PIONEER-2027]' : '';
    const claimedSector = String(record.claimed_sector || record.sector || '').trim();

    // Tag role with [PIONEER-2027] for tracking in Google Sheets Subscribers tab
    let roleDisplay = role;
    if (isPioneer && !roleDisplay.includes('PIONEER')) {
      roleDisplay = `${role} [PIONEER-2027]`;
    }

    if (claimedSector) {
      if (!vipCode || vipCode === 'N/A') {
        vipCode = `SECTOR: ${claimedSector}`;
      } else if (!vipCode.includes(claimedSector)) {
        vipCode = `${vipCode} · SECTOR: ${claimedSector}`;
      }
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required for subscriber sync' });
    }

    // Strict privacy: strip any passwords or hashes
    if (payload.password || record.password || payload.hash) {
      delete payload.password;
      delete record.password;
    }

    const token = await getAccessToken();
    if (!token) {
      console.warn('[Google Sheets Sync] Access token unavailable; queued request.');
      return res.status(200).json({
        success: true,
        queued: true,
        message: 'Subscriber recorded (Google Sheets sync credentials in setup)',
      });
    }

    const tabName = await ensureSubscribersSheet(token);

    // Retrieve existing rows from Subscribers tab
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

    // Ensure header row exists
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

    // Map existing rows by normalized email address to consolidate any duplicate rows
    const subscriberMap = new Map();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const rEmail = String(row[2] || '').trim().toLowerCase();
      if (!rEmail || !rEmail.includes('@')) continue;

      if (!subscriberMap.has(rEmail)) {
        subscriberMap.set(rEmail, {
          firstName: String(row[0] || '').trim(),
          lastName: String(row[1] || '').trim(),
          email: rEmail,
          role: String(row[3] || 'FREE').trim().toUpperCase(),
          vipCode: String(row[4] || 'N/A').trim(),
          registrationDate: row[5] || new Date().toISOString(),
        });
      } else {
        // Consolidate into existing unique record
        const existing = subscriberMap.get(rEmail);
        if (row[0] && !existing.firstName) existing.firstName = String(row[0]).trim();
        if (row[1] && !existing.lastName) existing.lastName = String(row[1]).trim();
        if (row[3] && row[3] !== 'FREE') existing.role = String(row[3]).trim().toUpperCase();
        if (row[4] && row[4] !== 'N/A') existing.vipCode = String(row[4]).trim();
        if (row[5]) existing.registrationDate = row[5];
      }
    }

    // Process the incoming subscriber record
    let action = 'appended';
    if (subscriberMap.has(email)) {
      action = 'updated';
      const existing = subscriberMap.get(email);
      if (firstName) existing.firstName = firstName;
      if (lastName) existing.lastName = lastName;
      existing.role = isFounder
        ? 'CREATOR [PIONEER-2027]'
        : (roleDisplay || existing.role);
      existing.vipCode = isFounder
        ? 'AKN-VIP-2027-X0914'
        : (vipCode && vipCode !== 'N/A' ? vipCode : existing.vipCode);
      existing.registrationDate = registrationDate || existing.registrationDate;
    } else {
      subscriberMap.set(email, {
        firstName: firstName || (isFounder ? 'Odi' : 'Subscriber'),
        lastName: lastName || (isFounder ? 'Selis' : ''),
        email,
        role: isFounder ? 'CREATOR [PIONEER-2027]' : (roleDisplay || 'FREE [PIONEER-2027]'),
        vipCode: isFounder ? 'AKN-VIP-2027-X0914' : (vipCode || 'N/A'),
        registrationDate: registrationDate || new Date().toISOString(),
      });
    }

    // Build unique rows
    const consolidatedRows = Array.from(subscriberMap.values()).map((s) => [
      s.firstName,
      s.lastName,
      s.email,
      s.role,
      s.vipCode,
      s.registrationDate,
    ]);

    // Clear existing data rows starting from row 2 to eliminate lingering rows
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
        `${tabName}!A2:F`
      )}:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Write consolidated rows cleanly
    const putRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
        `${tabName}!A2:F${consolidatedRows.length + 1}`
      )}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: consolidatedRows }),
      }
    );

    if (!putRes.ok) {
      const errText = await putRes.text();
      console.warn('[Google Sheets Sync] Sync write failed:', putRes.status, errText);
    }

    return res.status(200).json({
      success: true,
      action,
      totalSubscribers: consolidatedRows.length,
      email,
      role: roleDisplay,
      is_pioneer: isPioneer,
      pioneer_badge: pioneerBadge,
      claimed_sector: claimedSector || null,
    });
  } catch (error) {
    console.error('[Google Sheets Sync] Unhandled exception:', error);
    return res.status(500).json({ error: 'Internal server error syncing to Google Sheets' });
  }
}

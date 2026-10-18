import {
  getAccessToken,
  SPREADSHEET_ID,
  appendVipGuestRecordToSheets,
} from './nfc/_googleSheetsSync.js';

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

    // Support both direct client call and Supabase Webhook event structure (record/type)
    const record = payload.record || payload;

    let firstName = String(record.first_name || record.firstName || '').trim();
    let lastName = String(record.last_name || record.lastName || '').trim();
    const rawFullName = String(record.fullName || record.full_name || record.holderName || record.ownerName || '').trim();
    if (!firstName && rawFullName) {
      const parts = rawFullName.split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ');
    }
    const holderName = [firstName, lastName].filter(Boolean).join(' ') || rawFullName;
    const email = String(record.email || '').trim().toLowerCase();
    const isFounder = email === 'odi.selis3@gmail.com';
    let role = isFounder ? 'CREATOR' : String(record.role || 'FREE').trim().toUpperCase();
    const rawVipCode = String(record.vip_code_redeemed || record.vipCode || record.passId || record.token || '').trim();
    let vipCode = rawVipCode || 'N/A';
    const registrationDate = record.timestamp || record.created_at || new Date().toISOString();
    const isPioneer = new Date(registrationDate).getTime() < new Date('2027-01-09T00:00:00+01:00').getTime();
    const isVip = record.is_vip === true || record.is_vip_pioneer === true || record.isVipPioneer === true || role === 'VIP_GUEST' || role === 'CREATOR' || vipCode !== 'N/A' || String(record.pioneer_badge || record.pioneerBadge || '').toUpperCase().includes('VIP');
    const pioneerBadge = String(record.pioneer_badge || record.pioneerBadge || (isPioneer ? (isVip ? '[VIP-PIONEER-2027]' : '[PIONEER-2027]') : '')).trim();
    const claimedSector = String(
      record.worldName ||
      record.planetName ||
      record.claimed_sector ||
      record.sector ||
      ''
    ).trim();

    const founderPassStatus =
      record.founderPassStatus ||
      record.founder_pass_status ||
      (isFounder
        ? 'Founder Pass (#0) - Active'
        : vipCode && vipCode !== 'N/A'
        ? `Claimed (${vipCode})`
        : record.has_vip_pass || role === 'VIP_GUEST'
        ? 'VIP Pass Active'
        : 'Standard / Unclaimed');

    // Tag role with [PIONEER-2027] for tracking in Google Sheets
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
      return sendJson(400, { error: 'Valid email is required for subscriber sync' });
    }

    // Strict privacy: strip any passwords or hashes
    if (payload.password || record.password || payload.hash) {
      delete payload.password;
      delete record.password;
    }

    const token = await getAccessToken();
    if (!token) {
      console.warn('[Google Sheets Sync] Access token unavailable; queued request.');
      return sendJson(200, {
        success: true,
        queued: true,
        message: 'Subscriber recorded (Google Sheets sync credentials in setup)',
      });
    }

    // 1. Synchronize directly to VIP GUESTS tab (updates pass row if Pass ID is present, or upserts/appends guest record)
    const vipGuestsResult = await appendVipGuestRecordToSheets({
      timestamp: registrationDate,
      email,
      holderName,
      passId: rawVipCode,
      founderPassStatus,
      worldName: claimedSector || (isFounder ? 'Ämlemi' : 'Unclaimed'),
      role: roleDisplay,
    });

    // 2. Sync to Subscribers tab
    const tabName = await ensureSubscribersSheet(token);
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
        const existing = subscriberMap.get(rEmail);
        if (row[0] && !existing.firstName) existing.firstName = String(row[0]).trim();
        if (row[1] && !existing.lastName) existing.lastName = String(row[1]).trim();
        if (row[3] && row[3] !== 'FREE') existing.role = String(row[3]).trim().toUpperCase();
        if (row[4] && row[4] !== 'N/A') existing.vipCode = String(row[4]).trim();
        if (row[5]) existing.registrationDate = row[5];
      }
    }

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

    const consolidatedRows = Array.from(subscriberMap.values()).map((s) => [
      s.firstName,
      s.lastName,
      s.email,
      s.role,
      s.vipCode,
      s.registrationDate,
    ]);

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

    return sendJson(200, {
      success: true,
      action,
      vipGuestsAppend: vipGuestsResult,
      totalSubscribers: consolidatedRows.length,
      email,
      role: roleDisplay,
      founderPassStatus,
      worldName: claimedSector || null,
      is_pioneer: isPioneer,
      pioneer_badge: pioneerBadge,
      claimed_sector: claimedSector || null,
    });
  } catch (error) {
    console.error('[Google Sheets Sync] Unhandled exception:', error);
    return sendJson(500, { error: 'Internal server error syncing to Google Sheets' });
  }
}

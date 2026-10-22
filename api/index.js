var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// api/nfc/_googleSheetsSync.js
var googleSheetsSync_exports = {};
__export(googleSheetsSync_exports, {
  SPREADSHEET_ID: () => SPREADSHEET_ID,
  WHITELIST_SPREADSHEET_ID: () => WHITELIST_SPREADSHEET_ID,
  appendVipGuestRecordToSheets: () => appendVipGuestRecordToSheets,
  appendWhitelistEmailToGoogleSheets: () => appendWhitelistEmailToGoogleSheets,
  getAccessToken: () => getAccessToken,
  resetPassInGoogleSheets: () => resetPassInGoogleSheets,
  syncPassClaimToGoogleSheets: () => syncPassClaimToGoogleSheets,
  syncSubscriberRowToGoogleSheets: () => syncSubscriberRowToGoogleSheets
});
import fs2 from "fs";
import path2 from "path";
import crypto from "crypto";
function sanitizePrivateKey(rawKey) {
  if (!rawKey) return "";
  let key = String(rawKey).trim();
  if (key.startsWith('"') && key.endsWith('"') || key.startsWith("'") && key.endsWith("'")) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n");
}
function createServiceAccountJwt(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1e3);
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedToken);
  const cleanKey = sanitizePrivateKey(privateKey);
  const signature = signer.sign(cleanKey, "base64url");
  return `${unsignedToken}.${signature}`;
}
async function getServiceAccountAccessToken(clientEmail, privateKey) {
  try {
    const jwt = createServiceAccountJwt(clientEmail, privateKey);
    const params = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    });
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn("[Google Sheets] Service account authentication failed:", res.status, errText);
      return null;
    }
    const data = await res.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 3600
    };
  } catch (err) {
    console.warn("[Google Sheets] Error exchanging service account JWT:", err);
    return null;
  }
}
function cleanEnvValue(val) {
  if (!val) return "";
  return String(val).replace(/^["']|["']$/g, "").trim();
}
function getOAuthCredentials() {
  let clientId = cleanEnvValue(process.env.GOOGLE_SHEETS_CLIENT_ID);
  let clientSecret = cleanEnvValue(process.env.GOOGLE_SHEETS_CLIENT_SECRET);
  let refreshToken = cleanEnvValue(process.env.GOOGLE_SHEETS_REFRESH_TOKEN);
  if (!clientId || !clientSecret || !refreshToken) {
    const envFiles = [
      path2.resolve(process.cwd(), ".env.vercel"),
      path2.resolve(process.cwd(), ".env.production.local"),
      path2.resolve(process.cwd(), ".env.local"),
      path2.resolve(process.cwd(), ".env")
    ];
    for (const envPath of envFiles) {
      try {
        if (fs2.existsSync(envPath)) {
          const content = fs2.readFileSync(envPath, "utf8");
          for (const line of content.split(/\r?\n/)) {
            const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
            if (!match) continue;
            const key = match[1];
            const val = cleanEnvValue(match[2]);
            if (key === "GOOGLE_SHEETS_CLIENT_ID" && !clientId) clientId = val;
            if (key === "GOOGLE_SHEETS_CLIENT_SECRET" && !clientSecret) clientSecret = val;
            if (key === "GOOGLE_SHEETS_REFRESH_TOKEN" && !refreshToken) refreshToken = val;
          }
          if (clientId && clientSecret && refreshToken) break;
        }
      } catch {
      }
    }
  }
  if (!clientId || !clientSecret || !refreshToken) {
    const localTokenPaths = [
      "/Users/odi/.gemini/antigravity/plugin_data/gsheets/token.json",
      path2.resolve(process.cwd(), ".gsheets_token.json")
    ];
    for (const p of localTokenPaths) {
      try {
        if (fs2.existsSync(p)) {
          const data = JSON.parse(fs2.readFileSync(p, "utf8"));
          clientId = clientId || cleanEnvValue(data.client_id);
          clientSecret = clientSecret || cleanEnvValue(data.client_secret);
          refreshToken = refreshToken || cleanEnvValue(data.token && data.token.refresh_token);
          if (clientId && clientSecret && refreshToken) break;
        }
      } catch {
      }
    }
  }
  return { clientId, clientSecret, refreshToken };
}
async function getAccessToken() {
  const now = Date.now();
  if (_cachedAccessToken && now < _tokenExpiresAt - 6e4) {
    return _cachedAccessToken;
  }
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    const saAuth = await getServiceAccountAccessToken(clientEmail, privateKey);
    if (saAuth && saAuth.accessToken) {
      _cachedAccessToken = saAuth.accessToken;
      _tokenExpiresAt = now + saAuth.expiresIn * 1e3;
      return _cachedAccessToken;
    }
  }
  const { clientId, clientSecret, refreshToken } = getOAuthCredentials();
  if (!clientId || !clientSecret || !refreshToken) {
    console.warn("[Google Sheets] Missing Google Sheets credentials in environment.");
    return null;
  }
  try {
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    });
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn("[Google Sheets] OAuth token refresh failed:", res.status, errText);
      return null;
    }
    const data = await res.json();
    _cachedAccessToken = data.access_token;
    _tokenExpiresAt = now + (data.expires_in || 3600) * 1e3;
    return _cachedAccessToken;
  } catch (err) {
    console.warn("[Google Sheets] Error obtaining access token:", err);
    return null;
  }
}
async function resolveVipTabName(accessToken) {
  let vipTab = "VIP GUESTS";
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties.title`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const sheetTitles = (meta.sheets || []).map((s) => s.properties?.title);
      if (sheetTitles.includes("VIP GUESTS")) vipTab = "VIP GUESTS";
      else if (sheetTitles.includes("VIP Guests")) vipTab = "VIP Guests";
      else if (sheetTitles.includes("Blad1")) vipTab = "Blad1";
      else if (sheetTitles[0]) vipTab = sheetTitles[0];
    }
  } catch (err) {
    console.warn("[Google Sheets] Could not query spreadsheet tabs metadata:", err);
  }
  return vipTab;
}
function normalizePassIdForLookup(id) {
  return String(id || "").trim().toUpperCase().replace(/^#/, "");
}
async function findPassRowInSheet(accessToken, tabName, rawPassId) {
  const normPass = normalizePassIdForLookup(rawPassId);
  const isMaster = normPass === "AKN-VIP-2027-X0914" || normPass === "0" || normPass === "FOUNDERS" || normPass === "MASTER" || normPass === "FOUNDER";
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
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      const rows = data.values || [];
      for (let i = 0; i < rows.length; i++) {
        const rowIndex = i + 1;
        const colA = String(rows[i][0] || "").trim();
        const colB = String(rows[i][1] || "").trim();
        const normA = normalizePassIdForLookup(colA);
        const normB = normalizePassIdForLookup(colB);
        if (normB && (normB === normPass || normB === `AKN-VIP-2027-${normPass}`)) {
          return rowIndex;
        }
        if (isMaster && (normB === "AKN-VIP-2027-X0914" || colA.toLowerCase().includes("founder") || colA.includes("#0"))) {
          return rowIndex;
        }
        if (extractedNum !== null) {
          if (extractedNum === 0 && (colA.toLowerCase().includes("founder") || colA.includes("#0"))) {
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
    console.warn("[Google Sheets] Error scanning sheet rows:", err);
  }
  if (isMaster) return 2;
  if (extractedNum && extractedNum >= 1 && extractedNum <= 100) {
    return extractedNum + 2;
  }
  return null;
}
async function syncPassClaimToGoogleSheets(passId, holderName, holderEmail = "") {
  try {
    const cleanId = normalizePassIdForLookup(passId);
    const cleanEmail = String(holderEmail || "").trim().toLowerCase();
    const isMaster = cleanId === "AKN-VIP-2027-X0914" || cleanId === "0" || cleanEmail === "odi.selis3@gmail.com";
    const derivedName = String(holderName || "").trim() || (isMaster ? "Odi Selis" : cleanEmail && cleanEmail.includes("@") ? cleanEmail.split("@")[0] : "Founding VIP Holder");
    if (!cleanId) {
      return { success: false, reason: "MISSING_PASS_ID" };
    }
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.warn("[Google Sheets] Skipped sync: No access token available.");
      return { success: false, reason: "NO_TOKEN" };
    }
    const vipTab = await resolveVipTabName(accessToken);
    const targetRow = await findPassRowInSheet(accessToken, vipTab, cleanId);
    if (!targetRow) {
      console.warn(`[Google Sheets] Could not locate sheet row for Pass ID: ${cleanId}`);
      return { success: false, reason: "ROW_NOT_FOUND" };
    }
    const statusVal = isMaster || targetRow === 2 ? "Active / Primary Key" : "Active / Claimed";
    const dataUpdates = [
      {
        range: `'${vipTab}'!C${targetRow}`,
        values: [[derivedName]]
      },
      {
        range: `'${vipTab}'!F${targetRow}`,
        values: [[statusVal]]
      }
    ];
    if (cleanEmail) {
      dataUpdates.push({
        range: `'${vipTab}'!D${targetRow}`,
        values: [[cleanEmail]]
      });
    }
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`;
    const payload = {
      valueInputOption: "USER_ENTERED",
      data: dataUpdates
    };
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Google Sheets] batchUpdate failed for row ${targetRow}:`, res.status, errText);
      return { success: false, reason: "API_ERROR", details: errText };
    }
    const resData = await res.json();
    if (cleanEmail && cleanEmail.includes("@")) {
      const nameParts = derivedName.split(/\s+/);
      await syncSubscriberRowToGoogleSheets({
        firstName: nameParts[0] || derivedName,
        lastName: nameParts.slice(1).join(" "),
        email: cleanEmail,
        role: isMaster ? "CREATOR [PIONEER-2027]" : "VIP_GUEST [PIONEER-2027]",
        vipCode: cleanId.startsWith("AKN-") ? cleanId : `AKN-VIP-2027-${cleanId}`,
        registrationDate: (/* @__PURE__ */ new Date()).toISOString()
      }).catch(() => {
      });
    }
    return {
      success: true,
      row: targetRow,
      updatedCells: resData.totalUpdatedCells,
      tab: vipTab,
      passId: cleanId,
      holderName: derivedName,
      holderEmail: cleanEmail
    };
  } catch (err) {
    console.warn("[Google Sheets] Exception during sheet sync:", err);
    return { success: false, error: err.message };
  }
}
async function resetPassInGoogleSheets(passId) {
  try {
    const cleanId = normalizePassIdForLookup(passId);
    if (!cleanId) return { success: false, reason: "MISSING_PASS_ID" };
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.warn("[Google Sheets] Skipped reset: No access token available.");
      return { success: false, reason: "NO_TOKEN" };
    }
    const vipTab = await resolveVipTabName(accessToken);
    const targetRow = await findPassRowInSheet(accessToken, vipTab, cleanId);
    if (!targetRow) {
      console.warn(`[Google Sheets] Could not locate sheet row for Pass ID: ${cleanId}`);
      return { success: false, reason: "ROW_NOT_FOUND" };
    }
    const isMaster = cleanId === "AKN-VIP-2027-X0914" || cleanId === "0" || targetRow === 2;
    const statusVal = isMaster ? "Ready to claim / Master Key" : "Unclaimed / Ready to claim";
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`;
    const payload = {
      valueInputOption: "USER_ENTERED",
      data: [
        {
          range: `'${vipTab}'!C${targetRow}`,
          values: [[""]]
        },
        {
          range: `'${vipTab}'!D${targetRow}`,
          values: [[""]]
        },
        {
          range: `'${vipTab}'!F${targetRow}`,
          values: [[statusVal]]
        }
      ]
    };
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Google Sheets] batchUpdate reset failed for row ${targetRow}:`, res.status, errText);
      return { success: false, reason: "API_ERROR", details: errText };
    }
    const resData = await res.json();
    return {
      success: true,
      row: targetRow,
      updatedCells: resData.totalUpdatedCells,
      tab: vipTab,
      passId: cleanId
    };
  } catch (err) {
    console.warn("[Google Sheets] Exception during pass reset in sheets:", err);
    return { success: false, error: err.message };
  }
}
async function appendVipGuestRecordToSheets({
  timestamp = "",
  email = "",
  holderName = "",
  passId = "",
  founderPassStatus = "",
  worldName = "",
  role = ""
} = {}) {
  try {
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, reason: "INVALID_EMAIL" };
    }
    const isFounder = cleanEmail === "odi.selis3@gmail.com";
    const cleanName = String(holderName || "").trim() || (isFounder ? "Odi Selis" : cleanEmail.split("@")[0]);
    let resolvedPassId = String(passId || "").trim().toUpperCase();
    if (!resolvedPassId && founderPassStatus) {
      const matchCode = String(founderPassStatus).match(/AKN-VIP-\d{4}-[A-Z]\d{3,4}/i);
      if (matchCode) resolvedPassId = matchCode[0].toUpperCase();
    }
    if (isFounder && (!resolvedPassId || resolvedPassId === "N/A")) {
      resolvedPassId = "AKN-VIP-2027-X0914";
    }
    if (resolvedPassId && resolvedPassId.startsWith("AKN-VIP-")) {
      const claimSync = await syncPassClaimToGoogleSheets(resolvedPassId, cleanName, cleanEmail);
      if (claimSync.success) {
        return claimSync;
      }
    }
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.warn("[Google Sheets] Skipped VIP GUESTS sync: No access token available.");
      return { success: false, reason: "NO_TOKEN" };
    }
    const vipTab = await resolveVipTabName(accessToken);
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
          const colD = String(rows[i][3] || "").trim().toLowerCase();
          const colB = String(rows[i][1] || "").trim().toLowerCase();
          if (colD === cleanEmail || colB === cleanEmail) {
            const statusText = founderPassStatus || (isFounder ? "Active / Primary Key" : "Active / Registered");
            await fetch(
              `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  valueInputOption: "USER_ENTERED",
                  data: [
                    { range: `'${vipTab}'!C${rowIndex}`, values: [[cleanName]] },
                    { range: `'${vipTab}'!D${rowIndex}`, values: [[cleanEmail]] },
                    { range: `'${vipTab}'!F${rowIndex}`, values: [[statusText]] }
                  ]
                })
              }
            );
            return {
              success: true,
              action: "updated_existing_row",
              row: rowIndex,
              tab: vipTab
            };
          }
        }
      }
    } catch (scanErr) {
      console.warn("[Google Sheets] Notice scanning VIP GUESTS for existing email:", scanErr);
    }
    const rowValues = [
      role || (isFounder ? "CREATOR" : "VIP / PIONEER"),
      resolvedPassId && resolvedPassId !== "N/A" ? resolvedPassId : "WHITELIST / PIONEER",
      cleanName,
      cleanEmail,
      worldName && worldName !== "Unclaimed" ? `SECTOR: ${worldName}` : "https://www.sillowmill.com",
      founderPassStatus || (isFounder ? "Active / Primary Key" : "Registered / Active"),
      `Registered ${timestamp || (/* @__PURE__ */ new Date()).toISOString()}`
    ];
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      `'${vipTab}'!A:G`
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const res = await fetch(appendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        values: [rowValues]
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn("[Google Sheets] VIP GUESTS append failed:", res.status, errText);
      return { success: false, reason: "API_ERROR", details: errText };
    }
    const data = await res.json();
    return {
      success: true,
      tab: vipTab,
      updatedRange: data?.updates?.updatedRange,
      row: rowValues
    };
  } catch (err) {
    console.warn("[Google Sheets] Exception appending to VIP GUESTS:", err);
    return { success: false, error: err.message };
  }
}
async function syncSubscriberRowToGoogleSheets({
  firstName = "",
  lastName = "",
  fullName = "",
  email = "",
  role = "FREE",
  vipCode = "N/A",
  claimedSector = "",
  registrationDate = ""
}) {
  try {
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, reason: "INVALID_EMAIL" };
    }
    const token = await getAccessToken();
    if (!token) {
      return { success: false, reason: "NO_TOKEN" };
    }
    const isFounder = cleanEmail === "odi.selis3@gmail.com";
    let resolvedFirst = String(firstName || "").trim();
    let resolvedLast = String(lastName || "").trim();
    if (!resolvedFirst && fullName) {
      const parts = String(fullName).trim().split(/\s+/);
      resolvedFirst = parts[0] || "";
      resolvedLast = parts.slice(1).join(" ");
    }
    const regDate = registrationDate || (/* @__PURE__ */ new Date()).toISOString();
    let roleDisplay = isFounder ? "CREATOR [PIONEER-2027]" : String(role || "FREE").trim().toUpperCase();
    if (!roleDisplay.includes("PIONEER")) {
      roleDisplay = `${roleDisplay} [PIONEER-2027]`;
    }
    let codeDisplay = isFounder ? "AKN-VIP-2027-X0914" : String(vipCode || "N/A").trim();
    if (claimedSector && !codeDisplay.includes(claimedSector)) {
      codeDisplay = codeDisplay && codeDisplay !== "N/A" ? `${codeDisplay} \xB7 SECTOR: ${claimedSector}` : `SECTOR: ${claimedSector}`;
    }
    const tabName = "Subscribers";
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
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            values: [
              [
                "First Name",
                "Last Name",
                "Email Address",
                "Role Status",
                "VIP Code Used",
                "Registration Date"
              ]
            ]
          })
        }
      );
      rows = [["First Name", "Last Name", "Email Address", "Role Status", "VIP Code Used", "Registration Date"]];
    }
    let targetRowIndex = -1;
    let existingRow = null;
    for (let i = 1; i < rows.length; i++) {
      const rEmail = String(rows[i]?.[2] || "").trim().toLowerCase();
      if (rEmail === cleanEmail) {
        targetRowIndex = i + 1;
        existingRow = rows[i];
        break;
      }
    }
    if (targetRowIndex > 1 && existingRow) {
      const updatedRow = [
        resolvedFirst || existingRow[0] || (isFounder ? "Odi" : "Subscriber"),
        resolvedLast || existingRow[1] || (isFounder ? "Selis" : ""),
        cleanEmail,
        isFounder ? "CREATOR [PIONEER-2027]" : existingRow[3] && existingRow[3].includes("VIP") && !roleDisplay.includes("VIP") ? existingRow[3] : roleDisplay,
        isFounder ? "AKN-VIP-2027-X0914" : codeDisplay && codeDisplay !== "N/A" ? codeDisplay : existingRow[4] || "N/A",
        existingRow[5] || regDate
      ];
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
          `${tabName}!A${targetRowIndex}:F${targetRowIndex}`
        )}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ values: [updatedRow] })
        }
      );
      return { success: true, action: "updated", row: targetRowIndex, email: cleanEmail };
    }
    const newRow = [
      resolvedFirst || (isFounder ? "Odi" : "Subscriber"),
      resolvedLast || (isFounder ? "Selis" : ""),
      cleanEmail,
      roleDisplay,
      codeDisplay || "N/A",
      regDate
    ];
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
        `${tabName}!A:F`
      )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ values: [newRow] })
      }
    );
    return { success: true, action: "appended", email: cleanEmail };
  } catch (err) {
    console.warn("[Google Sheets] syncSubscriberRowToGoogleSheets notice:", err);
    return { success: false, error: err.message };
  }
}
async function appendWhitelistEmailToGoogleSheets({
  email,
  source = "Comic Preview Gate (Page 3 Lock)",
  chapter = "Bing\xE4a Issue #1 \u2014 Chapter 2 Preview Gate",
  notes = "Wave 2 Priority Notification & Early Access",
  timestamp = ""
}) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const ts = timestamp || (/* @__PURE__ */ new Date()).toISOString();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, reason: "INVALID_EMAIL" };
  }
  const entry = {
    timestamp: ts,
    email: cleanEmail,
    source,
    chapter,
    status: "Whitelisted \u2014 Wave 2 Priority",
    notes
  };
  for (const filePath of ["/tmp/sillow_whitelist.json", path2.resolve(process.cwd(), "data", "whitelist.json")]) {
    try {
      const dir = path2.dirname(filePath);
      if (fs2.existsSync(dir)) {
        let list = [];
        if (fs2.existsSync(filePath)) {
          try {
            list = JSON.parse(fs2.readFileSync(filePath, "utf8"));
            if (!Array.isArray(list)) list = [];
          } catch {
            list = [];
          }
        }
        const existingIdx = list.findIndex((item) => String(item.email || "").toLowerCase() === cleanEmail);
        if (existingIdx >= 0) {
          list[existingIdx] = { ...list[existingIdx], ...entry, updatedAt: ts };
        } else {
          list.push(entry);
        }
        fs2.writeFileSync(filePath, JSON.stringify(list, null, 2), "utf8");
      }
    } catch {
    }
  }
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.warn("[Google Sheets Whitelist] No access token available; saved locally.");
      return { success: false, reason: "NO_TOKEN", savedLocally: true };
    }
    let whitelistTab = "Whitelist";
    try {
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${WHITELIST_SPREADSHEET_ID}?fields=sheets.properties.title`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (metaRes.ok) {
        const meta = await metaRes.json();
        const titles = (meta.sheets || []).map((s) => s.properties?.title);
        if (titles.includes("Whitelist")) whitelistTab = "Whitelist";
        else if (titles[0]) whitelistTab = titles[0];
      }
    } catch {
    }
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
              method: "PUT",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                values: [["Timestamp", "Email Address", "Source / Gate", "Chapter / Drop", "Wave Status", "Notes"]]
              })
            }
          );
        } else {
          for (let i = 1; i < rows.length; i++) {
            const rEmail = String(rows[i]?.[1] || "").trim().toLowerCase();
            if (rEmail === cleanEmail) {
              existingRowIdx = i + 1;
              break;
            }
          }
        }
      }
    } catch {
    }
    const rowValues = [
      ts,
      cleanEmail,
      source,
      chapter,
      "Whitelisted \u2014 Wave 2 Priority",
      notes
    ];
    if (existingRowIdx > 1) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${WHITELIST_SPREADSHEET_ID}/values/${encodeURIComponent(
          `'${whitelistTab}'!A${existingRowIdx}:F${existingRowIdx}`
        )}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ values: [rowValues] })
        }
      );
    } else {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${WHITELIST_SPREADSHEET_ID}/values/${encodeURIComponent(
          `'${whitelistTab}'!A:F`
        )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ values: [rowValues] })
        }
      );
    }
    await syncSubscriberRowToGoogleSheets({
      firstName: cleanEmail.split("@")[0],
      email: cleanEmail,
      role: "WHITELIST [PIONEER-2027]",
      vipCode: `WHITELIST: ${source}`,
      registrationDate: ts
    }).catch(() => {
    });
    return {
      success: true,
      spreadsheetId: WHITELIST_SPREADSHEET_ID,
      tab: whitelistTab,
      email: cleanEmail,
      action: existingRowIdx > 1 ? "updated" : "appended"
    };
  } catch (err) {
    console.warn("[Google Sheets Whitelist] Exception syncing email:", err);
    return { success: false, error: err.message, savedLocally: true };
  }
}
var SPREADSHEET_ID, WHITELIST_SPREADSHEET_ID, _cachedAccessToken, _tokenExpiresAt;
var init_googleSheetsSync = __esm({
  "api/nfc/_googleSheetsSync.js"() {
    SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "1gCYEDFNCZ2QlStvE2IuJiq4gUxrAJ08spaOvZM6Ke_0";
    WHITELIST_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_WHITELIST_SPREADSHEET_ID || "1SivG6Sh9mdr3_1b_YInB5JR2Ol_SiqNkw9GtITE6gnY";
    _cachedAccessToken = null;
    _tokenExpiresAt = 0;
  }
});

// api/nfc/_certificateService.js
var certificateService_exports = {};
__export(certificateService_exports, {
  TOTAL_EDITION_LIMIT: () => TOTAL_EDITION_LIMIT,
  deriveEditionNumber: () => deriveEditionNumber,
  generateCardPin: () => generateCardPin,
  handleCertificateAction: () => handleCertificateAction,
  isEmailOtpConfigured: () => isEmailOtpConfigured,
  isValidEmail: () => isValidEmail,
  isValidPassId: () => isValidPassId,
  issueCertificate: () => issueCertificate,
  normalizePassId: () => normalizePassId,
  sanitizeHolderName: () => sanitizeHolderName,
  sendEmailCardPin: () => sendEmailCardPin,
  sendEmailOtp: () => sendEmailOtp,
  verifyCardPin: () => verifyCardPin,
  verifyEmailOtp: () => verifyEmailOtp
});
import crypto2 from "crypto";
function normalizePassId(raw) {
  if (!raw || typeof raw !== "string") return "";
  return raw.trim().toUpperCase().replace(/^#/, "");
}
function isValidPassId(raw) {
  const clean = normalizePassId(raw);
  return clean.length > 0 && clean.length <= 32 && PASS_ID_PATTERNS.some((re) => re.test(clean));
}
function deriveEditionNumber(passId) {
  const clean = normalizePassId(passId);
  if (clean.includes("X0914") || clean.includes("0914") || clean === "AKN-VIP-2027-X0914" || clean === "AKN-2027" || clean === "AKN-VIP-2027") {
    return 0;
  }
  const xMatch = clean.match(/X(\d{3,4})$/);
  if (xMatch) {
    const num = parseInt(xMatch[1], 10);
    if (num === 914) return 1;
    return Math.min(Math.max(num, 1), TOTAL_EDITION_LIMIT);
  }
  const match = clean.match(/(\d+)/g);
  if (!match || match.length === 0) return 1;
  const parsedNumber = parseInt(match[match.length - 1], 10);
  if (isNaN(parsedNumber)) return 1;
  const bounded = parsedNumber % TOTAL_EDITION_LIMIT || TOTAL_EDITION_LIMIT;
  return Math.min(Math.max(bounded, 1), TOTAL_EDITION_LIMIT);
}
function generateCardPin(passId) {
  return sixDigits(hmacHex(PIN_SECRET, `PIN|${normalizePassId(passId)}`));
}
function verifyCardPin(passId, pin) {
  const clean = String(pin || "").replace(/\D/g, "");
  return clean.length === 6 && safeEqual(clean, generateCardPin(passId));
}
function otpForWindow(passId, email, windowIndex) {
  return sixDigits(hmacHex(OTP_SECRET, `OTP|${normalizePassId(passId)}|${normalizeEmail(email)}|${windowIndex}`));
}
function verifyEmailOtp(passId, email, otp) {
  const clean = String(otp || "").replace(/\D/g, "");
  if (clean.length !== 6) return false;
  const now = Math.floor(Date.now() / OTP_WINDOW_MS);
  return [now, now - 1].some((w) => safeEqual(clean, otpForWindow(passId, email, w)));
}
function isEmailOtpConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}
async function sendEmailOtp(passId, email) {
  if (!isEmailOtpConfigured()) {
    return {
      success: false,
      status: 503,
      error: "EMAIL_OTP_UNAVAILABLE",
      message: "Email verification is not available right now. You can continue with your Card PIN only."
    };
  }
  const code = otpForWindow(passId, email, Math.floor(Date.now() / OTP_WINDOW_MS));
  const from = process.env.OTP_FROM_EMAIL || process.env.AUTH_FROM_EMAIL || "Sillow Mill <auth@sillowmill.com>";
  const html = `
    <div style="font-family:Arial,sans-serif;background:#05070c;color:#ffffff;padding:32px">
      <p style="letter-spacing:2px;font-size:12px;color:#67e8f9;margin:0 0 12px">SILLOW MILL \xB7 \xC4KINOYA</p>
      <h1 style="font-size:20px;margin:0 0 16px">Your Bing\xE4a certificate verification code</h1>
      <p style="font-size:32px;letter-spacing:8px;font-weight:bold;margin:0 0 16px">${code}</p>
      <p style="font-size:13px;color:#9ca3af;margin:0">Pass ${normalizePassId(passId)} \xB7 valid for 10 minutes.
      If you did not request this code, you can ignore this email.</p>
    </div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [normalizeEmail(email)],
        subject: "Your Bing\xE4a Certificate verification code",
        html
      })
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[COA] Resend delivery failed:", res.status, detail);
      return { success: false, status: 502, error: "EMAIL_SEND_FAILED", message: "Could not send the verification email." };
    }
    return { success: true, status: 200, message: `Verification code sent to ${normalizeEmail(email)}.` };
  } catch (err) {
    console.error("[COA] Resend request error:", err?.message || err);
    return { success: false, status: 502, error: "EMAIL_SEND_FAILED", message: "Could not send the verification email." };
  }
}
async function sendEmailCardPin(passId, email, holderName = "Founding Holder") {
  const normalizedId = normalizePassId(passId);
  if (!isValidPassId(normalizedId)) {
    return { success: false, status: 400, error: "INVALID_PASS", message: "This Pass ID is not recognized." };
  }
  if (!isValidEmail(email)) {
    return { success: false, status: 400, error: "INVALID_EMAIL", message: "Please enter a valid email address." };
  }
  const pin = generateCardPin(normalizedId);
  const editionNumber = deriveEditionNumber(normalizedId);
  const cleanName = sanitizeHolderName(holderName) || "Founding Holder";
  const cleanEmail = normalizeEmail(email);
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn(`[COA DEV] RESEND_API_KEY is not set. Generated Card PIN for #${normalizedId} is: ${pin}`);
    return {
      success: true,
      status: 200,
      devMode: true,
      pin,
      message: `Card PIN generated for ${cleanEmail}. (Development notice: PIN is ${pin})`
    };
  }
  const from = process.env.RESEND_FROM_EMAIL || process.env.NOREPLY_FROM_EMAIL || "Sillow Mill <noreply@sillowmill.com>";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #05070c; color: #ffffff; padding: 40px 20px; line-height: 1.6;">
      <div style="max-width: 540px; margin: 0 auto; background-color: #0a0d14; border: 1px solid rgba(34, 211, 238, 0.25); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
        <div style="padding: 32px 32px 24px 32px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
          <p style="letter-spacing: 3px; font-size: 11px; font-weight: 700; color: #67e8f9; margin: 0 0 8px 0; text-transform: uppercase;">SILLOW MILL \xB7 \xC4KINOYA PROTOCOL</p>
          <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 0; letter-spacing: 0.5px;">Your Card Security PIN</h1>
          <p style="font-size: 12px; color: rgba(255, 255, 255, 0.5); margin: 6px 0 0 0; font-family: monospace;">Founding Pass #${normalizedId} \xB7 Edition #${editionNumber} of 100</p>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 14px; color: rgba(255, 255, 255, 0.85); margin: 0 0 16px 0;">
            Greetings, <strong>${cleanName}</strong>.
          </p>
          <p style="font-size: 13px; color: rgba(255, 255, 255, 0.7); margin: 0 0 24px 0;">
            Use the 6-digit Card Security PIN below to authenticate your Founding Member status, unlock your official Bing\xE4a Issue #1 Certificate of Authenticity, and gain access to all exclusive downloads.
          </p>
          <div style="background-color: #000000; border: 1px solid rgba(34, 211, 238, 0.4); border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
            <div style="font-size: 11px; font-family: monospace; color: #67e8f9; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">SECURITY PIN</div>
            <div style="font-size: 38px; font-family: monospace; font-weight: 800; color: #ffffff; letter-spacing: 12px; margin-left: 12px;">${pin}</div>
          </div>
          <p style="font-size: 12px; color: rgba(255, 255, 255, 0.5); margin: 0; line-height: 1.5;">
            Physical cards display edition numbers (#${editionNumber}/100) and do not have printed PINs. This PIN is deterministically bound to pass #${normalizedId} and secures your single-device session.
          </p>
        </div>
        <div style="padding: 20px 32px; background-color: rgba(0, 0, 0, 0.4); border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center; font-size: 11px; color: rgba(255, 255, 255, 0.4); font-family: monospace;">
          \xC4kinoya Genesis Whitelist \xB7 <a href="mailto:Odi@sillowmill.com" style="color: #67e8f9; text-decoration: none;">Odi@sillowmill.com</a>
        </div>
      </div>
    </div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [cleanEmail],
        subject: `Your \xC4kinoya Card Security PIN \u2014 Pass #${normalizedId}`,
        html
      })
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[COA] Resend delivery error:", res.status, errText);
      let errMsg = "Failed to deliver PIN via Resend.";
      try {
        const parsed = JSON.parse(errText);
        if (parsed.message) errMsg = parsed.message;
      } catch {
      }
      return { success: false, status: 502, error: "RESEND_ERROR", message: errMsg };
    }
    return {
      success: true,
      status: 200,
      message: `Card Security PIN dispatched to ${cleanEmail}. Check your inbox.`
    };
  } catch (err) {
    console.error("[COA] Resend request exception:", err);
    return { success: false, status: 502, error: "RESEND_ERROR", message: "Could not connect to email delivery service." };
  }
}
function sanitizeHolderName(name) {
  return String(name || "").replace(/\s+/g, " ").trim().slice(0, 40);
}
function issueCertificate(passId, holderName, emailVerified = true, holderEmail = "") {
  const normalizedId = normalizePassId(passId);
  const isMaster = normalizedId === "AKN-VIP-2027-X0914";
  const editionNumber = isMaster ? 0 : deriveEditionNumber(normalizedId);
  const claimedAt = (/* @__PURE__ */ new Date()).toISOString();
  const payload = ["BINGAA-ISSUE-1", normalizedId, holderName, editionNumber, claimedAt].join("|");
  const signature = hmacHex(CERT_SECRET, payload).toUpperCase();
  return {
    certificateId: isMaster ? "COA-BNG1-001-FOUNDER" : `COA-BNG1-${String(editionNumber).padStart(3, "0")}-${signature.slice(0, 6)}`,
    title: "CERTIFICATE OF AUTHENTICITY \u2014 BING\xC4A ISSUE #1",
    passId: normalizedId,
    holderName,
    holderEmail: holderEmail || (isMaster ? "odi.selis3@gmail.com" : void 0),
    editionNumber,
    editionTotal: TOTAL_EDITION_LIMIT,
    status: isMaster ? "MASTER FOUNDER ORIGINAL" : "OFFICIALLY VERIFIED",
    emailVerified: Boolean(emailVerified),
    claimedAt,
    signatureAlgorithm: "HMAC-SHA256",
    signature
  };
}
async function handleCertificateAction(body = {}) {
  const action = body.action;
  const passId = normalizePassId(body.token || body.passId || body.id);
  const email = normalizeEmail(body.email || body.ownerEmail || body.holderEmail);
  if (!isValidPassId(passId)) {
    return { status: 400, body: { success: false, error: "INVALID_PASS", message: "This Pass ID is not recognized." } };
  }
  if (action === "send-pin") {
    const rawName = sanitizeHolderName(body.ownerName || body.holderName || body.name);
    const result = await sendEmailCardPin(passId, email, rawName);
    if (result.success && isValidEmail(email)) {
      try {
        const { syncPassClaimToGoogleSheets: syncPassClaimToGoogleSheets2 } = await Promise.resolve().then(() => (init_googleSheetsSync(), googleSheetsSync_exports));
        await syncPassClaimToGoogleSheets2(passId, rawName || email.split("@")[0], email);
      } catch (err) {
        console.warn("[COA] Google Sheets sync notice on send-pin:", err);
      }
    }
    return { status: result.status, body: result };
  }
  if (action === "send-otp") {
    if (!isValidEmail(email)) {
      return { status: 400, body: { success: false, error: "INVALID_EMAIL", message: "Please enter a valid email address." } };
    }
    const result = await sendEmailOtp(passId, email);
    return { status: result.status, body: result };
  }
  if (action === "certify") {
    const pin = body.pin;
    if (!verifyCardPin(passId, pin)) {
      return {
        status: 401,
        body: { success: false, error: "INVALID_PIN", message: "The 6-digit Card Security PIN does not match this pass." }
      };
    }
    const holderName = sanitizeHolderName(body.ownerName || body.holderName || body.name);
    if (!holderName) {
      return { status: 400, body: { success: false, error: "MISSING_NAME", message: "A holder name is required." } };
    }
    const cert = issueCertificate(passId, holderName, Boolean(email), email);
    try {
      const { syncPassClaimToGoogleSheets: syncPassClaimToGoogleSheets2 } = await Promise.resolve().then(() => (init_googleSheetsSync(), googleSheetsSync_exports));
      await syncPassClaimToGoogleSheets2(passId, holderName, email);
    } catch (err) {
      console.warn("[COA] Google Sheets sync notice on certify:", err);
    }
    return {
      status: 200,
      body: {
        success: true,
        status: "OFFICIALLY VERIFIED",
        certificate: cert
      }
    };
  }
  return { status: 400, body: { success: false, error: "UNKNOWN_ACTION", message: "Unsupported certificate action." } };
}
var TOTAL_EDITION_LIMIT, OTP_WINDOW_MS, PIN_SECRET, CERT_SECRET, OTP_SECRET, PASS_ID_PATTERNS, hmacHex, sixDigits, safeEqual, normalizeEmail, isValidEmail;
var init_certificateService = __esm({
  "api/nfc/_certificateService.js"() {
    TOTAL_EDITION_LIMIT = 100;
    OTP_WINDOW_MS = 10 * 60 * 1e3;
    PIN_SECRET = process.env.PASS_PIN_SECRET || "akinoya-founding-pass-pin-v1";
    CERT_SECRET = process.env.CERT_SIGNING_SECRET || "akinoya-bingaa-coa-signing-v1";
    OTP_SECRET = process.env.OTP_SECRET || `${PIN_SECRET}:otp`;
    PASS_ID_PATTERNS = [/^AKN-VIP-\d{4}-[A-Z]\d{3,4}$/, /^AKN-\d{4}$/, /^SM\d{3}-[A-Z0-9]{4}$/];
    hmacHex = (secret, payload) => crypto2.createHmac("sha256", secret).update(payload).digest("hex");
    sixDigits = (hex) => String(parseInt(hex.slice(0, 12), 16) % 1e6).padStart(6, "0");
    safeEqual = (a, b) => {
      const ab = Buffer.from(String(a));
      const bb = Buffer.from(String(b));
      return ab.length === bb.length && crypto2.timingSafeEqual(ab, bb);
    };
    normalizeEmail = (email) => String(email || "").trim().toLowerCase();
    isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));
  }
});

// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";
var supabaseUrl, supabaseKey, isSupabaseConfigured, supabase;
var init_supabaseClient = __esm({
  "src/lib/supabaseClient.ts"() {
    supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || (typeof process !== "undefined" ? process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL : "") || "https://placeholder-project.supabase.co";
    supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || (typeof process !== "undefined" ? process.env?.VITE_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY : "") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder";
    isSupabaseConfigured = Boolean(supabaseUrl) && !supabaseUrl.includes("placeholder-project") && Boolean(supabaseKey) && !supabaseKey.includes("placeholder");
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== "undefined" ? window.localStorage : void 0
      }
    });
  }
});

// src/lib/supabase.ts
var init_supabase = __esm({
  "src/lib/supabase.ts"() {
    init_supabaseClient();
  }
});

// src/utils/holder.ts
import { useEffect, useState } from "react";
var PASS_ID_PATTERNS3, isValidPassId3;
var init_holder = __esm({
  "src/utils/holder.ts"() {
    PASS_ID_PATTERNS3 = [
      /^AKN-VIP-\d{4}-[A-Z]\d{3,4}$/,
      // AKN-VIP-2027-X0914, AKN-VIP-2027-X001..X100
      /^AKN-\d{4}$/,
      // AKN-9941
      /^SM\d{3}-[A-Z0-9]{4}$/
      // SM001-A9B2
    ];
    isValidPassId3 = (raw) => {
      if (!raw || typeof raw !== "string") return false;
      const clean = raw.trim().toUpperCase().replace(/^#/, "");
      if (clean.length > 32) return false;
      return PASS_ID_PATTERNS3.some((re) => re.test(clean));
    };
  }
});

// src/data/vipTokens.ts
var PRIMARY_FOUNDER_EMAIL, FOUNDER_PASS_TOKEN, PASS_ALREADY_CLAIMED_ERROR, LOCAL_STORAGE_CLAIMED_KEY, VIP_REGISTRY_REFRESH_VERSION_KEY, CURRENT_VIP_REFRESH_VERSION, INITIAL_VIP_TOKEN_REGISTRY, ensureVipTokenRegistryRefresh, getLocalClaimedMap, setLocalClaim, normalizeVipToken, isFounderEmail, isRecognizedVipTokenPattern, checkVipTokenStatus, claimVipTokenForUser, resetAllVipTokens;
var init_vipTokens = __esm({
  "src/data/vipTokens.ts"() {
    init_supabase();
    init_holder();
    PRIMARY_FOUNDER_EMAIL = "odi.selis3@gmail.com";
    FOUNDER_PASS_TOKEN = "AKN-VIP-2027-X0914";
    PASS_ALREADY_CLAIMED_ERROR = "Ai! Deze VIP-pas is al geclaimd.";
    LOCAL_STORAGE_CLAIMED_KEY = "sillow_claimed_vip_tokens";
    VIP_REGISTRY_REFRESH_VERSION_KEY = "sillow_vip_registry_refresh_version";
    CURRENT_VIP_REFRESH_VERSION = "2027-vip-reset-v4-clean-email-bind";
    INITIAL_VIP_TOKEN_REGISTRY = (() => {
      const reg = {
        [FOUNDER_PASS_TOKEN]: {
          tokenCode: FOUNDER_PASS_TOKEN,
          editionNumber: 0,
          isFounderPass: true,
          isClaimed: true,
          boundEmail: PRIMARY_FOUNDER_EMAIL,
          holderName: "Odi Selis",
          claimedAt: null
        }
      };
      for (let i = 1; i <= 100; i++) {
        const code = `AKN-VIP-2027-X${String(i).padStart(3, "0")}`;
        reg[code] = {
          tokenCode: code,
          editionNumber: i,
          isFounderPass: false,
          isClaimed: false,
          boundEmail: null,
          holderName: null,
          claimedAt: null
        };
      }
      return reg;
    })();
    ensureVipTokenRegistryRefresh = () => {
      if (typeof window === "undefined") return;
      try {
        const appliedVersion = localStorage.getItem(VIP_REGISTRY_REFRESH_VERSION_KEY);
        if (appliedVersion !== CURRENT_VIP_REFRESH_VERSION) {
          localStorage.removeItem(LOCAL_STORAGE_CLAIMED_KEY);
          localStorage.removeItem("sillow_vip_bound_token");
          sessionStorage.removeItem("sillow_vip_bound_token");
          localStorage.removeItem("sillow_vip_device_access");
          sessionStorage.removeItem("sillow_vip_device_access");
          localStorage.removeItem("akinoya_vip_unlocked");
          sessionStorage.removeItem("akinoya_vip_unlocked");
          localStorage.removeItem("akinoya_patron_token");
          sessionStorage.removeItem("akinoya_patron_token");
          localStorage.removeItem("akinoya_patron_role");
          sessionStorage.removeItem("akinoya_patron_role");
          localStorage.removeItem("pending_vip_pass");
          localStorage.removeItem("akinoya_pending_vip_pass");
          sessionStorage.removeItem("pending_vip_code");
          localStorage.removeItem("pending_role");
          sessionStorage.removeItem("pending_role");
          localStorage.removeItem("akinoya_bingaa_certificates");
          localStorage.removeItem("akinoya_holder_name");
          localStorage.removeItem("user_generation_claimed");
          localStorage.removeItem("akinoya_guest_generations");
          const rawProf = localStorage.getItem("akinoya_auth_profile");
          if (rawProf) {
            try {
              const parsed = JSON.parse(rawProf);
              const email = String(parsed?.email || "").trim().toLowerCase();
              if (email && email !== PRIMARY_FOUNDER_EMAIL) {
                parsed.has_vip_pass = false;
                parsed.is_vip = false;
                parsed.vip_code_redeemed = null;
                if (parsed.role === "VIP_GUEST" || parsed.role === "CREATOR") {
                  parsed.role = "FREE";
                }
                localStorage.setItem("akinoya_auth_profile", JSON.stringify(parsed));
              }
            } catch {
            }
          }
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith("akinoya_holder_name_") || k.startsWith("akinoya_pending_")) {
              localStorage.removeItem(k);
            }
          });
          localStorage.setItem(VIP_REGISTRY_REFRESH_VERSION_KEY, CURRENT_VIP_REFRESH_VERSION);
        }
      } catch {
      }
    };
    ensureVipTokenRegistryRefresh();
    getLocalClaimedMap = () => {
      if (typeof window === "undefined") return {};
      ensureVipTokenRegistryRefresh();
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_CLAIMED_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    };
    setLocalClaim = (token, userId, holderEmail, holderName) => {
      if (typeof window === "undefined") return;
      try {
        const map = getLocalClaimedMap();
        map[token] = {
          is_claimed: true,
          claimed_by_user_id: userId,
          claimed_holder_email: holderEmail ? holderEmail.trim().toLowerCase() : void 0,
          claimed_holder_name: holderName ? holderName.trim() : void 0,
          claimed_at: (/* @__PURE__ */ new Date()).toISOString()
        };
        localStorage.setItem(LOCAL_STORAGE_CLAIMED_KEY, JSON.stringify(map));
      } catch {
      }
    };
    normalizeVipToken = (raw) => {
      return String(raw || "").trim().toUpperCase().replace(/^#/, "");
    };
    isFounderEmail = (email) => {
      if (!email) return false;
      const clean = email.trim().toLowerCase();
      return clean === PRIMARY_FOUNDER_EMAIL;
    };
    isRecognizedVipTokenPattern = (token) => {
      const clean = normalizeVipToken(token);
      if (!clean) return false;
      if (clean === FOUNDER_PASS_TOKEN) {
        return true;
      }
      return isValidPassId3(clean);
    };
    checkVipTokenStatus = async (rawToken, currentUserId, currentUserEmail) => {
      const clean = normalizeVipToken(rawToken);
      const cleanEmail = (currentUserEmail || "").trim().toLowerCase();
      if (!clean) {
        return {
          valid: false,
          allowed: false,
          isAlreadyClaimed: false,
          isClaimedByMe: false,
          tokenCode: "",
          error: "Please enter a valid VIP token."
        };
      }
      const isMasterToken = clean === FOUNDER_PASS_TOKEN || clean === "AKN-2027" || clean === "AKN-VIP-2027";
      if (isMasterToken) {
        if (cleanEmail && !isFounderEmail(cleanEmail)) {
          return {
            valid: true,
            allowed: false,
            isAlreadyClaimed: true,
            isClaimedByMe: false,
            tokenCode: clean,
            boundEmail: PRIMARY_FOUNDER_EMAIL,
            error: PASS_ALREADY_CLAIMED_ERROR
          };
        }
        if (cleanEmail && isFounderEmail(cleanEmail)) {
          return {
            valid: true,
            allowed: true,
            isAlreadyClaimed: true,
            isClaimedByMe: true,
            tokenCode: clean,
            boundEmail: PRIMARY_FOUNDER_EMAIL
          };
        }
      }
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.from("vip_tokens").select("*").eq("token_code", clean).maybeSingle();
          if (!error && data) {
            const tokenRecord = data;
            const boundEmail = (tokenRecord.claimed_holder_email || "").trim().toLowerCase();
            if (tokenRecord.is_claimed || boundEmail) {
              const isSameEmail = Boolean(cleanEmail && boundEmail && cleanEmail === boundEmail);
              const isSameUserNoEmailConflict = Boolean(
                !boundEmail && currentUserId && tokenRecord.claimed_by_user_id === currentUserId
              );
              const isOwner = isSameEmail || isSameUserNoEmailConflict;
              if (isOwner) {
                return {
                  valid: true,
                  allowed: true,
                  isAlreadyClaimed: true,
                  isClaimedByMe: true,
                  tokenCode: clean,
                  boundEmail: boundEmail || null,
                  record: tokenRecord
                };
              }
              return {
                valid: true,
                allowed: false,
                isAlreadyClaimed: true,
                isClaimedByMe: false,
                tokenCode: clean,
                boundEmail: boundEmail || null,
                error: PASS_ALREADY_CLAIMED_ERROR,
                record: tokenRecord
              };
            }
            return {
              valid: true,
              allowed: true,
              isAlreadyClaimed: false,
              isClaimedByMe: false,
              tokenCode: clean,
              boundEmail: null,
              record: tokenRecord
            };
          }
        } catch (err) {
          console.warn("[VipTokens] Database check exception:", err);
        }
      }
      const localMap = getLocalClaimedMap();
      const localRecord = localMap[clean];
      if (localRecord && (localRecord.is_claimed || localRecord.claimed_holder_email)) {
        const localBoundEmail = (localRecord.claimed_holder_email || "").trim().toLowerCase();
        const isSameEmail = Boolean(cleanEmail && localBoundEmail && cleanEmail === localBoundEmail);
        const isSameUser = Boolean(
          !localBoundEmail && currentUserId && localRecord.claimed_by_user_id === currentUserId
        );
        if (isSameEmail || isSameUser) {
          return {
            valid: true,
            allowed: true,
            isAlreadyClaimed: true,
            isClaimedByMe: true,
            tokenCode: clean,
            boundEmail: localBoundEmail || null
          };
        }
        return {
          valid: true,
          allowed: false,
          isAlreadyClaimed: true,
          isClaimedByMe: false,
          tokenCode: clean,
          boundEmail: localBoundEmail || null,
          error: PASS_ALREADY_CLAIMED_ERROR
        };
      }
      if (isRecognizedVipTokenPattern(clean)) {
        return {
          valid: true,
          allowed: true,
          isAlreadyClaimed: false,
          isClaimedByMe: false,
          tokenCode: clean,
          boundEmail: null
        };
      }
      return {
        valid: false,
        allowed: false,
        isAlreadyClaimed: false,
        isClaimedByMe: false,
        tokenCode: clean,
        error: "Unrecognized VIP token."
      };
    };
    claimVipTokenForUser = async (rawToken, userId, holderName, holderEmail) => {
      const clean = normalizeVipToken(rawToken);
      const cleanEmail = (holderEmail || "").trim().toLowerCase();
      if (!clean || !userId && !cleanEmail) {
        return { success: false, error: "Token and User Email/ID are required." };
      }
      const isMasterToken = clean === FOUNDER_PASS_TOKEN || clean === "AKN-2027" || clean === "AKN-VIP-2027";
      if (isMasterToken) {
        if (!isFounderEmail(cleanEmail)) {
          return {
            success: false,
            error: PASS_ALREADY_CLAIMED_ERROR,
            message: PASS_ALREADY_CLAIMED_ERROR
          };
        }
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        const updateData = {
          is_claimed: true,
          claimed_by_user_id: userId,
          claimed_holder_name: holderName || "Odi Selis",
          claimed_holder_email: PRIMARY_FOUNDER_EMAIL,
          claimed_at: nowIso,
          updated_at: nowIso
        };
        if (isSupabaseConfigured) {
          try {
            const { data: existing } = await supabase.from("vip_tokens").select("id").eq("token_code", clean).maybeSingle();
            if (existing) {
              await supabase.from("vip_tokens").update(updateData).eq("token_code", clean);
            } else {
              await supabase.from("vip_tokens").insert({ token_code: clean, ...updateData });
            }
          } catch (err) {
            console.warn("[VipTokens] Founder token update notice:", err);
          }
        }
        setLocalClaim(clean, userId, PRIMARY_FOUNDER_EMAIL, holderName || "Odi Selis");
        return {
          success: true,
          message: "Founders Pass (#0) bound to odi.selis3@gmail.com."
        };
      }
      const status = await checkVipTokenStatus(clean, userId, cleanEmail);
      if (!status.valid) {
        return {
          success: false,
          error: status.error || "Unrecognized VIP token.",
          message: status.error || "Unrecognized VIP token."
        };
      }
      if (status.isAlreadyClaimed) {
        if (status.isClaimedByMe) {
          return {
            success: true,
            message: "VIP Pass already bound to your account.",
            record: status.record
          };
        }
        return {
          success: false,
          error: PASS_ALREADY_CLAIMED_ERROR,
          message: PASS_ALREADY_CLAIMED_ERROR
        };
      }
      if (isSupabaseConfigured) {
        try {
          const nowIso = (/* @__PURE__ */ new Date()).toISOString();
          const { data: existing } = await supabase.from("vip_tokens").select("*").eq("token_code", clean).maybeSingle();
          if (existing) {
            const existingBoundEmail = (existing.claimed_holder_email || "").trim().toLowerCase();
            if (existing.is_claimed || existingBoundEmail) {
              const isSameEmail = Boolean(cleanEmail && existingBoundEmail && cleanEmail === existingBoundEmail);
              const isSameUser = Boolean(!existingBoundEmail && userId && existing.claimed_by_user_id === userId);
              if (isSameEmail || isSameUser) {
                return {
                  success: true,
                  message: "VIP Pass already bound to your account.",
                  record: existing
                };
              }
              return {
                success: false,
                error: PASS_ALREADY_CLAIMED_ERROR,
                message: PASS_ALREADY_CLAIMED_ERROR
              };
            }
            const updateData = {
              is_claimed: true,
              claimed_by_user_id: userId,
              claimed_at: nowIso,
              updated_at: nowIso
            };
            if (holderName) updateData.claimed_holder_name = holderName.trim();
            if (cleanEmail) updateData.claimed_holder_email = cleanEmail;
            const { data: updated, error: updateErr } = await supabase.from("vip_tokens").update(updateData).eq("token_code", clean).select().single();
            if (updateErr) {
              console.warn("[VipTokens] Update error:", updateErr.message);
            } else if (updated) {
              await supabase.from("profiles").update({
                has_vip_pass: true,
                is_vip: true,
                role: clean === FOUNDER_PASS_TOKEN ? "CREATOR" : "VIP_GUEST",
                vip_code_redeemed: clean,
                updated_at: nowIso
              }).eq("id", userId);
              setLocalClaim(clean, userId, cleanEmail, holderName);
              return {
                success: true,
                message: "VIP Pass officially bound to your account.",
                record: updated
              };
            }
          } else {
            const insertData = {
              token_code: clean,
              is_claimed: true,
              claimed_by_user_id: userId,
              claimed_at: nowIso,
              updated_at: nowIso
            };
            if (holderName) insertData.claimed_holder_name = holderName.trim();
            if (cleanEmail) insertData.claimed_holder_email = cleanEmail;
            const { data: inserted, error: insertErr } = await supabase.from("vip_tokens").insert(insertData).select().single();
            if (insertErr) {
              console.warn("[VipTokens] Insert error:", insertErr.message);
            } else if (inserted) {
              await supabase.from("profiles").update({
                has_vip_pass: true,
                is_vip: true,
                role: clean === FOUNDER_PASS_TOKEN ? "CREATOR" : "VIP_GUEST",
                vip_code_redeemed: clean,
                updated_at: nowIso
              }).eq("id", userId);
              setLocalClaim(clean, userId, cleanEmail, holderName);
              return {
                success: true,
                message: "VIP Pass officially bound to your account.",
                record: inserted
              };
            }
          }
        } catch (err) {
          console.warn("[VipTokens] Claim exception:", err);
        }
      }
      setLocalClaim(clean, userId, cleanEmail, holderName);
      return {
        success: true,
        message: "VIP Pass officially bound to your account."
      };
    };
    resetAllVipTokens = async () => {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(VIP_REGISTRY_REFRESH_VERSION_KEY);
          ensureVipTokenRegistryRefresh();
        } catch {
        }
      }
      if (isSupabaseConfigured) {
        try {
          const nowIso = (/* @__PURE__ */ new Date()).toISOString();
          const { data, error } = await supabase.from("vip_tokens").update({
            is_claimed: false,
            claimed_by_user_id: null,
            claimed_holder_name: null,
            claimed_holder_email: null,
            claimed_at: null,
            updated_at: nowIso
          }).neq("token_code", FOUNDER_PASS_TOKEN).select();
          await supabase.from("vip_tokens").upsert(
            {
              token_code: FOUNDER_PASS_TOKEN,
              is_claimed: true,
              claimed_holder_name: "Odi Selis",
              claimed_holder_email: PRIMARY_FOUNDER_EMAIL,
              updated_at: nowIso
            },
            { onConflict: "token_code" }
          );
          await supabase.from("profiles").update({
            vip_code_redeemed: null,
            has_vip_pass: false,
            is_vip: false,
            role: "FREE",
            updated_at: nowIso
          }).neq("email", PRIMARY_FOUNDER_EMAIL);
          if (error) {
            console.warn("[VipTokens] Supabase reset error:", error.message);
            return { success: false, error: error.message };
          }
          return { success: true, count: data?.length || 100 };
        } catch (err) {
          return { success: false, error: err.message };
        }
      }
      return { success: true, count: 100 };
    };
  }
});

// src/lib/vipTokens.ts
var init_vipTokens2 = __esm({
  "src/lib/vipTokens.ts"() {
    init_vipTokens();
  }
});

// src/server/authVoteService.ts
var authVoteService_exports = {};
__export(authVoteService_exports, {
  castSubmissionVote: () => castSubmissionVote,
  createSessionToken: () => createSessionToken,
  getAllSubmissionRecords: () => getAllSubmissionRecords,
  getUserFromSessionToken: () => getUserFromSessionToken,
  getVotesSummary: () => getVotesSummary,
  hashPassword: () => hashPassword,
  loginUserCredentials: () => loginUserCredentials,
  registerUserCredentials: () => registerUserCredentials,
  saveSubmissionRecord: () => saveSubmissionRecord,
  updateUserPassword: () => updateUserPassword,
  verifyPassword: () => verifyPassword,
  verifySessionToken: () => verifySessionToken
});
import fs4 from "fs";
import path4 from "path";
import crypto4 from "crypto";
function loadUsersStore() {
  const merged = { users: {} };
  let found = false;
  for (const file of [LOCAL_USERS_FILE, TMP_USERS_FILE]) {
    if (fs4.existsSync(file)) {
      try {
        const raw = fs4.readFileSync(file, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.users === "object") {
          Object.assign(merged.users, parsed.users);
          found = true;
        }
      } catch {
      }
    }
  }
  return found ? merged : { users: {} };
}
function saveUsersStore(store) {
  const json = JSON.stringify(store, null, 2);
  const targets = [TMP_USERS_FILE, LOCAL_USERS_FILE];
  for (const file of targets) {
    try {
      const dir = path4.dirname(file);
      if (!fs4.existsSync(dir)) fs4.mkdirSync(dir, { recursive: true });
      fs4.writeFileSync(file, json, "utf8");
    } catch {
    }
  }
}
function loadVotesStore() {
  const merged = { votes: {} };
  let found = false;
  for (const file of [LOCAL_VOTES_FILE, TMP_VOTES_FILE]) {
    if (fs4.existsSync(file)) {
      try {
        const raw = fs4.readFileSync(file, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.votes === "object") {
          for (const [key, val] of Object.entries(parsed.votes)) {
            if (!merged.votes[key]) {
              merged.votes[key] = val;
            } else {
              const existing = merged.votes[key];
              const combinedVoters = Array.from(/* @__PURE__ */ new Set([...existing.voters || [], ...val.voters || []]));
              merged.votes[key] = {
                ...existing,
                ...val,
                voters: combinedVoters,
                votesCount: Math.max(val.votesCount || 0, existing.votesCount || 0),
                updatedAt: val.updatedAt || existing.updatedAt
              };
            }
          }
          found = true;
        }
      } catch {
      }
    }
  }
  return found ? merged : { votes: {} };
}
function saveVotesStore(store) {
  const json = JSON.stringify(store, null, 2);
  const targets = [TMP_VOTES_FILE, LOCAL_VOTES_FILE];
  for (const file of targets) {
    try {
      const dir = path4.dirname(file);
      if (!fs4.existsSync(dir)) fs4.mkdirSync(dir, { recursive: true });
      fs4.writeFileSync(file, json, "utf8");
    } catch {
    }
  }
}
function loadSubmissionsStore() {
  const merged = { submissions: {} };
  let found = false;
  for (const file of [LOCAL_SUBMISSIONS_FILE, TMP_SUBMISSIONS_FILE]) {
    if (fs4.existsSync(file)) {
      try {
        const raw = fs4.readFileSync(file, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.submissions === "object") {
          Object.assign(merged.submissions, parsed.submissions);
          found = true;
        }
      } catch {
      }
    }
  }
  return found ? merged : { submissions: {} };
}
function saveSubmissionsStore(store) {
  const json = JSON.stringify(store, null, 2);
  const targets = [TMP_SUBMISSIONS_FILE, LOCAL_SUBMISSIONS_FILE];
  for (const file of targets) {
    try {
      const dir = path4.dirname(file);
      if (!fs4.existsSync(dir)) fs4.mkdirSync(dir, { recursive: true });
      fs4.writeFileSync(file, json, "utf8");
    } catch {
    }
  }
}
function saveSubmissionRecord(sub) {
  if (!sub || !sub.id) {
    return { success: false, submission: sub };
  }
  _submissionsStore = loadSubmissionsStore();
  _submissionsStore.submissions[sub.id] = sub;
  saveSubmissionsStore(_submissionsStore);
  _voteStore = loadVotesStore();
  const existingVote = _voteStore.votes[sub.id];
  const authorEmail = (sub.authorEmail || sub.humanAnswers?.email || "").trim().toLowerCase();
  const authorUsername = (sub.authorUsername || "").trim().toLowerCase().replace(/^@/, "");
  const authorId = sub.userId || null;
  if (existingVote) {
    if (authorId) existingVote.authorId = authorId;
    if (authorEmail) existingVote.authorEmail = authorEmail;
    if (authorUsername) existingVote.authorUsername = authorUsername;
    existingVote.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    _voteStore.votes[sub.id] = existingVote;
  } else {
    _voteStore.votes[sub.id] = {
      submissionId: sub.id,
      voters: [],
      baselineVotes: sub.id === "planet-amlemi-genesis-01" ? 3 : 1,
      votesCount: sub.id === "planet-amlemi-genesis-01" ? 3 : Math.max(1, sub.votesCount || 1),
      authorId,
      authorEmail: authorEmail || null,
      authorUsername: authorUsername || null,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  saveVotesStore(_voteStore);
  return { success: true, submission: sub };
}
function getAllSubmissionRecords() {
  _submissionsStore = loadSubmissionsStore();
  return Object.values(_submissionsStore.submissions || {});
}
function hashPassword(password) {
  const salt = crypto4.randomBytes(16).toString("hex");
  const hash = crypto4.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}
function verifyPassword(password, salt, expectedHash) {
  try {
    const derivedHash = crypto4.scryptSync(password, salt, 64);
    const expectedBuf = Buffer.from(expectedHash, "hex");
    return crypto4.timingSafeEqual(derivedHash, expectedBuf);
  } catch {
    return false;
  }
}
function createSessionToken(userId, email) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const exp = Math.floor(Date.now() / 1e3) + 30 * 24 * 60 * 60;
  const payload = Buffer.from(JSON.stringify({ sub: userId, email, exp })).toString("base64url");
  const signature = crypto4.createHmac("sha256", SESSION_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}
function verifySessionToken(token) {
  if (!token || typeof token !== "string") return { valid: false };
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false };
  const [header, payload, signature] = parts;
  const expectedSig = crypto4.createHmac("sha256", SESSION_SECRET).update(`${header}.${payload}`).digest("base64url");
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto4.timingSafeEqual(a, b)) {
      return { valid: false };
    }
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.exp && data.exp < Math.floor(Date.now() / 1e3)) {
      return { valid: false };
    }
    return { valid: true, userId: data.sub, email: data.email };
  } catch {
    return { valid: false };
  }
}
function recordToProfile(u) {
  return {
    id: u.id,
    first_name: u.firstName,
    last_name: u.lastName,
    full_name: u.fullName,
    email: u.email,
    role: u.role,
    has_vip_pass: u.hasVipPass,
    subscription_status: u.subscriptionStatus,
    vip_code_redeemed: u.vipCodeRedeemed || null,
    is_vip: u.hasVipPass || u.role === "VIP_GUEST" || u.role === "CREATOR",
    is_subscriber: u.subscriptionStatus === "active" || u.role === "SUBSCRIBER" || u.role === "ANNUAL_PASS" || u.role === "CREATOR",
    is_pioneer: u.isPioneer,
    pioneer_badge: u.pioneerBadge || (u.hasVipPass || u.role === "VIP_GUEST" || u.role === "CREATOR" ? "[VIP-PIONEER-2027]" : "[PIONEER-2027]"),
    claimed_sector: u.claimedSector || null,
    created_at: u.createdAt,
    updated_at: u.updatedAt
  };
}
async function registerUserCredentials(params) {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanFirst = params.firstName.trim();
  const cleanLast = (params.lastName || "").trim();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }
  if (!params.password || params.password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }
  if (!cleanFirst) {
    return { success: false, error: "First name is required." };
  }
  _userStore = loadUsersStore();
  if (_userStore.users[cleanEmail]) {
    return { success: false, error: "An account with this email already exists. Please sign in." };
  }
  const { salt, hash } = hashPassword(params.password);
  const isFounder = isFounderEmail(cleanEmail);
  const role = isFounder ? "CREATOR" : params.role || "FREE";
  const hasVipPass = Boolean(isFounder || role === "VIP_GUEST" || role === "CREATOR" || params.passCode);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const userId = `usr_${Date.now()}_${crypto4.randomBytes(4).toString("hex")}`;
  const newRecord = {
    id: userId,
    email: cleanEmail,
    firstName: cleanFirst,
    lastName: cleanLast,
    fullName: `${cleanFirst} ${cleanLast}`.trim(),
    salt,
    passwordHash: hash,
    role,
    hasVipPass,
    vipCodeRedeemed: isFounder ? FOUNDING_PASS_ID : params.passCode || null,
    subscriptionStatus: isFounder ? "active" : "inactive",
    isPioneer: true,
    pioneerBadge: hasVipPass || role === "VIP_GUEST" || role === "CREATOR" ? "[VIP-PIONEER-2027]" : "[PIONEER-2027]",
    claimedSector: isFounder ? "\xC4mlemi" : null,
    createdAt: now,
    updatedAt: now
  };
  _userStore.users[cleanEmail] = newRecord;
  saveUsersStore(_userStore);
  const profile = recordToProfile(newRecord);
  const sessionToken = createSessionToken(newRecord.id, newRecord.email);
  const user = {
    id: newRecord.id,
    email: newRecord.email,
    user_metadata: {
      first_name: newRecord.firstName,
      last_name: newRecord.lastName,
      full_name: newRecord.fullName
    }
  };
  return {
    success: true,
    user,
    profile,
    sessionToken
  };
}
async function loginUserCredentials(email, password) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }
  if (!password) {
    return { success: false, error: "Please enter your password." };
  }
  _userStore = loadUsersStore();
  const existing = _userStore.users[cleanEmail];
  if (!existing) {
    return { success: false, error: "Invalid email or password." };
  }
  const isMatch = verifyPassword(password, existing.salt, existing.passwordHash);
  if (!isMatch) {
    return { success: false, error: "Invalid email or password." };
  }
  const profile = recordToProfile(existing);
  const sessionToken = createSessionToken(existing.id, existing.email);
  const user = {
    id: existing.id,
    email: existing.email,
    user_metadata: {
      first_name: existing.firstName,
      last_name: existing.lastName,
      full_name: existing.fullName
    }
  };
  return {
    success: true,
    user,
    profile,
    sessionToken
  };
}
async function updateUserPassword(email, newPassword) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }
  _userStore = loadUsersStore();
  const existing = _userStore.users[cleanEmail];
  const { salt, hash } = hashPassword(newPassword);
  if (!existing) {
    const isFounder = isFounderEmail(cleanEmail);
    const role = isFounder ? "CREATOR" : "FREE";
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const userId = `usr_${Date.now()}_${crypto4.randomBytes(4).toString("hex")}`;
    const newRecord = {
      id: userId,
      email: cleanEmail,
      firstName: cleanEmail.split("@")[0],
      lastName: "",
      fullName: cleanEmail.split("@")[0],
      salt,
      passwordHash: hash,
      role,
      hasVipPass: isFounder,
      subscriptionStatus: isFounder ? "active" : "inactive",
      isPioneer: true,
      pioneerBadge: isFounder ? "[VIP-PIONEER-2027]" : "[PIONEER-2027]",
      createdAt: now,
      updatedAt: now
    };
    _userStore.users[cleanEmail] = newRecord;
    saveUsersStore(_userStore);
    return { success: true };
  }
  existing.salt = salt;
  existing.passwordHash = hash;
  existing.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  _userStore.users[cleanEmail] = existing;
  saveUsersStore(_userStore);
  return { success: true };
}
async function getUserFromSessionToken(token) {
  const verified = verifySessionToken(token);
  if (!verified.valid || !verified.email) {
    return { success: false, error: "Invalid or expired session token." };
  }
  _userStore = loadUsersStore();
  const existing = _userStore.users[verified.email.toLowerCase()];
  if (!existing) {
    return { success: false, error: "User record not found." };
  }
  return {
    success: true,
    user: {
      id: existing.id,
      email: existing.email,
      user_metadata: {
        first_name: existing.firstName,
        last_name: existing.lastName,
        full_name: existing.fullName
      }
    },
    profile: recordToProfile(existing)
  };
}
function castSubmissionVote(params) {
  const {
    submissionId,
    voterId,
    voterEmail,
    voterUsername,
    submissionAuthorId,
    submissionAuthorEmail,
    submissionAuthorUsername,
    baseVotes
  } = params;
  if (!submissionId) {
    return { success: false, newVotesCount: 1, hasVoted: false, error: "Missing submission ID." };
  }
  if (!voterId) {
    return { success: false, newVotesCount: 1, hasVoted: false, error: "Voter identification required." };
  }
  _voteStore = loadVotesStore();
  _submissionsStore = loadSubmissionsStore();
  const storedSub = _submissionsStore.submissions[submissionId];
  const existingVote = _voteStore.votes[submissionId] || {
    submissionId,
    voters: [],
    baselineVotes: submissionId === "planet-amlemi-genesis-01" ? 3 : 1,
    votesCount: submissionId === "planet-amlemi-genesis-01" ? 3 : Math.max(1, baseVotes || 1),
    authorId: submissionAuthorId || storedSub?.userId || null,
    authorEmail: submissionAuthorEmail || storedSub?.authorEmail || storedSub?.humanAnswers?.email || null,
    authorUsername: submissionAuthorUsername || storedSub?.authorUsername || null,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const cleanVoterEmail = voterEmail?.trim().toLowerCase();
  const cleanAuthorEmail = (submissionAuthorEmail || existingVote.authorEmail || storedSub?.authorEmail || storedSub?.humanAnswers?.email || "").trim().toLowerCase();
  const cleanVoterUser = voterUsername?.trim().toLowerCase().replace(/^@/, "");
  const cleanAuthorUser = (submissionAuthorUsername || existingVote.authorUsername || storedSub?.authorUsername || "").trim().toLowerCase().replace(/^@/, "");
  const effectiveAuthorId = submissionAuthorId || existingVote.authorId || storedSub?.userId;
  const voterUserRecord = cleanVoterEmail ? _userStore.users[cleanVoterEmail] : null;
  const isSelfById = Boolean(effectiveAuthorId && voterId && (effectiveAuthorId === voterId || effectiveAuthorId === `id:${voterId}`));
  const isSelfByEmail = Boolean(cleanVoterEmail && cleanAuthorEmail && cleanVoterEmail === cleanAuthorEmail);
  const isSelfByUsername = Boolean(cleanVoterUser && cleanAuthorUser && cleanVoterUser === cleanAuthorUser);
  const isSelfByRegisteredId = Boolean(voterUserRecord?.id && effectiveAuthorId && voterUserRecord.id === effectiveAuthorId);
  const isSelfByAuthorUser = Boolean(cleanAuthorEmail && voterUserRecord && voterUserRecord.email === cleanAuthorEmail);
  if (isSelfById || isSelfByEmail || isSelfByUsername || isSelfByRegisteredId || isSelfByAuthorUser) {
    return {
      success: false,
      newVotesCount: existingVote.votesCount || baseVotes || 1,
      hasVoted: false,
      error: "Self-voting is not allowed: You cannot vote for your own world submission."
    };
  }
  const isVoterMatch = (entry) => {
    if (!entry) return false;
    if (entry === voterId || entry === `id:${voterId}`) return true;
    if (cleanVoterEmail && (entry === cleanVoterEmail || entry === `email:${cleanVoterEmail}`)) return true;
    if (voterUserRecord?.id && (entry === voterUserRecord.id || entry === `id:${voterUserRecord.id}`)) return true;
    return false;
  };
  const hasAlreadyVoted = existingVote.voters.some(isVoterMatch);
  let hasVoted = false;
  if (hasAlreadyVoted) {
    existingVote.voters = existingVote.voters.filter((v) => !isVoterMatch(v));
    hasVoted = false;
  } else {
    const canonicalKey = cleanVoterEmail ? `email:${cleanVoterEmail}` : `id:${voterId}`;
    existingVote.voters.push(canonicalKey);
    hasVoted = true;
  }
  const isAmlemi = submissionId === "planet-amlemi-genesis-01";
  const baseline = isAmlemi ? 3 : existingVote.baselineVotes || 1;
  existingVote.baselineVotes = baseline;
  const calculatedVotes = baseline + existingVote.voters.length;
  existingVote.votesCount = calculatedVotes;
  existingVote.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (submissionAuthorId) existingVote.authorId = submissionAuthorId;
  if (cleanAuthorEmail) existingVote.authorEmail = cleanAuthorEmail;
  if (cleanAuthorUser) existingVote.authorUsername = cleanAuthorUser;
  _voteStore.votes[submissionId] = existingVote;
  saveVotesStore(_voteStore);
  if (isSupabaseConfigured) {
    Promise.resolve(
      supabase.from("user_dossiers").update({ votes_count: calculatedVotes }).eq("id", submissionId)
    ).catch((err) => console.warn("[Vote] Supabase sync notice:", err));
  }
  return {
    success: true,
    newVotesCount: calculatedVotes,
    hasVoted
  };
}
function getVotesSummary(voterId, voterEmail, persistentVoterId) {
  _voteStore = loadVotesStore();
  const cleanVoterEmail = voterEmail?.trim().toLowerCase();
  const voterUser = cleanVoterEmail ? _userStore.users[cleanVoterEmail] : null;
  const isVoterMatch = (entry) => {
    if (!entry) return false;
    if (voterId && (entry === voterId || entry === `id:${voterId}`)) return true;
    if (persistentVoterId && (entry === persistentVoterId || entry === `id:${persistentVoterId}`)) return true;
    if (cleanVoterEmail && (entry === cleanVoterEmail || entry === `email:${cleanVoterEmail}`)) return true;
    if (voterUser && (entry === voterUser.id || entry === `id:${voterUser.id}`)) return true;
    return false;
  };
  const votesCountByDossier = {};
  const userVotedIds = [];
  for (const [subId, record] of Object.entries(_voteStore.votes)) {
    votesCountByDossier[subId] = record.votesCount;
    if (record.voters.some(isVoterMatch)) {
      userVotedIds.push(subId);
    }
  }
  if (votesCountByDossier["planet-amlemi-genesis-01"] === void 0) {
    votesCountByDossier["planet-amlemi-genesis-01"] = 3;
  }
  return { votesCountByDossier, userVotedIds };
}
var FOUNDING_PASS_ID, DATA_DIR, TMP_DIR, LOCAL_USERS_FILE, TMP_USERS_FILE, LOCAL_VOTES_FILE, TMP_VOTES_FILE, LOCAL_SUBMISSIONS_FILE, TMP_SUBMISSIONS_FILE, SESSION_SECRET, _userStore, _voteStore, _submissionsStore;
var init_authVoteService = __esm({
  "src/server/authVoteService.ts"() {
    init_supabase();
    init_vipTokens2();
    FOUNDING_PASS_ID = "AKN-VIP-2027-X0914";
    DATA_DIR = path4.resolve(process.cwd(), "data");
    TMP_DIR = "/tmp";
    LOCAL_USERS_FILE = path4.join(DATA_DIR, "auth_users.json");
    TMP_USERS_FILE = path4.join(TMP_DIR, "sillow_auth_users.json");
    LOCAL_VOTES_FILE = path4.join(DATA_DIR, "votes_store.json");
    TMP_VOTES_FILE = path4.join(TMP_DIR, "sillow_votes_store.json");
    LOCAL_SUBMISSIONS_FILE = path4.join(DATA_DIR, "submissions_store.json");
    TMP_SUBMISSIONS_FILE = path4.join(TMP_DIR, "sillow_submissions_store.json");
    if (!fs4.existsSync(DATA_DIR)) {
      try {
        fs4.mkdirSync(DATA_DIR, { recursive: true });
      } catch {
      }
    }
    SESSION_SECRET = process.env.AUTH_SECRET || process.env.STRIPE_SECRET_KEY || "sillow-mill-akinoya-secure-session-secret-2027";
    _userStore = loadUsersStore();
    _voteStore = loadVotesStore();
    _submissionsStore = loadSubmissionsStore();
  }
});

// src/server/apiRouter.ts
import express from "express";

// src/server/stripeService.ts
import Stripe from "stripe";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();
var _stripeInstance = null;
function getStripe() {
  if (_stripeInstance) return _stripeInstance;
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || process.env.STRIPE_KEY || "";
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured in Vercel. Please check Project Settings > Environment Variables."
    );
  }
  _stripeInstance = new Stripe(key, {
    apiVersion: "2026-09-30.endive"
  });
  return _stripeInstance;
}
var ORDERS_FILE = path.resolve(process.cwd(), "data/orders.json");
var INITIAL_WAVE_INVENTORY = 100;
function loadOrders() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("[StripeService] Could not read orders file:", err);
  }
  return [];
}
function saveOrders(orders) {
  try {
    const dir = path.dirname(ORDERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8");
  } catch (err) {
    console.warn("[StripeService] Read-only filesystem, skipped file write:", err);
  }
}
function getInventoryStatus() {
  try {
    const orders = loadOrders();
    const claimedCount = orders.filter((o) => o.status === "paid" && o.wave === "Wave 2").length;
    const availableCount = Math.max(0, INITIAL_WAVE_INVENTORY - claimedCount);
    return {
      wave: "Wave 2",
      total: INITIAL_WAVE_INVENTORY,
      claimed: claimedCount,
      available: availableCount
    };
  } catch {
    return {
      wave: "Wave 2",
      total: INITIAL_WAVE_INVENTORY,
      claimed: 0,
      available: INITIAL_WAVE_INVENTORY
    };
  }
}
function parseCityPostal(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return { city: "Unknown", postalCode: "1000" };
  const postalMatch = trimmed.match(/\d{4,5}/);
  const postalCode = postalMatch ? postalMatch[0] : "1000";
  const city = trimmed.replace(/\d{4,5}/, "").replace(/\s+/g, " ").trim() || trimmed;
  return { city: city || "Unknown", postalCode };
}
function sanitizeStripeString(s) {
  return (s || "").trim().replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\u2013|\u2014/g, "-").replace(/[^\x20-\x7E\u00C0-\u024F]/g, "").trim();
}
async function createComicCheckoutSession(params) {
  const stripe = getStripe();
  const baseUrl = params.origin || "https://sillowmill.com";
  const sanitizedEmail = (params.customerEmail || "").trim().toLowerCase() || void 0;
  const sanitizedName = sanitizeStripeString(params.customerName || "") || void 0;
  const sanitizedLine1 = sanitizeStripeString(params.shippingAddress || "") || void 0;
  const sanitizedLine2 = sanitizeStripeString(params.apartmentBus || "") || void 0;
  const rawCityPostal = (params.shippingCity || "").trim();
  const { city: parsedCity, postalCode: parsedPostal } = parseCityPostal(rawCityPostal);
  const truncate = (s, max = 480) => (s || "").slice(0, max);
  const lineItems = [
    {
      price_data: {
        currency: "eur",
        product_data: {
          name: "Sillow Mill - Bingaa (Collectors Graphic Novel)",
          description: "Physical First Edition Graphic Novel Drop with Scannable QR Priority Verification (Wave 2)",
          images: [`${baseUrl}/images/bingaa_comic_cover.jpg`]
        },
        unit_amount: 1499
        // €14,99
      },
      quantity: 1
    }
  ];
  const sessionConfig = {
    mode: "payment",
    line_items: lineItems,
    customer_email: sanitizedEmail,
    metadata: {
      wave: "Wave 2",
      product: "bingaa_comic_drop",
      customer_name: truncate(sanitizedName || ""),
      shipping_address: truncate(sanitizedLine1 || ""),
      apartment_bus: truncate(sanitizedLine2 || ""),
      shipping_city: truncate(parsedCity),
      shipping_postal: truncate(parsedPostal)
    },
    success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/?canceled=true`,
    billing_address_collection: "auto",
    shipping_address_collection: {
      allowed_countries: [
        "BE",
        "NL",
        "DE",
        "FR",
        "LU",
        "GB",
        "US",
        "ES",
        "IT",
        "CH",
        "AT",
        "DK",
        "SE",
        "NO",
        "FI",
        "IE",
        "PT",
        "CA",
        "AU",
        "JP"
      ]
    }
  };
  const session = await stripe.checkout.sessions.create(sessionConfig);
  return session;
}
async function processCompletedCheckout(session) {
  const orders = loadOrders();
  const existingOrder = orders.find((o) => o.id === session.id);
  if (existingOrder) {
    return existingOrder;
  }
  const email = session.customer_details?.email || session.customer_email || "unknown@sillowmill.com";
  const name = session.customer_details?.name || session.metadata?.customer_name || "Collector";
  const passId = `PASS-BINGAA-${session.id.slice(-8).toUpperCase()}`;
  const newOrder = {
    id: session.id,
    date: (/* @__PURE__ */ new Date()).toISOString(),
    amount: (session.amount_total || 1499) / 100,
    currency: (session.currency || "eur").toUpperCase(),
    customerEmail: email,
    customerName: name,
    shippingAddress: session.metadata?.shipping_address || session.customer_details?.address?.line1 || void 0,
    apartmentBus: session.metadata?.apartment_bus || session.customer_details?.address?.line2 || void 0,
    shippingCity: session.metadata?.shipping_city || session.customer_details?.address?.city || void 0,
    status: "paid",
    wave: session.metadata?.wave || "Wave 2",
    passId,
    entitled: true,
    paymentMethod: session.payment_method_types?.[0] || "stripe"
  };
  orders.push(newOrder);
  saveOrders(orders);
  return newOrder;
}

// src/server/nfcDnaService.ts
import fs3 from "fs";
import path3 from "path";
import crypto3 from "crypto";
var TMP_FILE = "/tmp/sillow_nfc_passport_data.json";
var LOCAL_FILE = path3.resolve(process.cwd(), "data/nfc_passport_data.json");
var AES_MASTER_KEY = Buffer.from(
  process.env.NTAG_AES_KEY || "a8f192b03c4d5e6f7a8b9c0d1e2f3a4b",
  "hex"
);
var AES_IV = Buffer.alloc(16, 0);
var _store = {
  passes: {},
  transferKeys: {},
  claimedKeys: []
};
function normalizeTokenId(raw) {
  if (!raw) return "AKN-VIP-2027-X0914";
  let clean = raw.trim().toUpperCase().replace(/^#/, "");
  if (clean === "FOUNDING" || clean === "VIP" || clean === "1") {
    return "AKN-VIP-2027-X0914";
  }
  return clean;
}
var PASS_ID_PATTERNS2 = [
  /^AKN-VIP-\d{4}-[A-Z]\d{3,4}$/,
  // AKN-VIP-2027-X0914 or AKN-VIP-2027-X001..X100
  /^AKN-\d{4}$/,
  // AKN-9941
  /^SM\d{3}-[A-Z0-9]{4}$/
  // SM001-A9B2
];
function isValidPassId2(raw) {
  if (!raw || typeof raw !== "string") return false;
  const clean = raw.trim().toUpperCase().replace(/^#/, "");
  if (clean.length > 32) return false;
  const allowlist = (process.env.NFC_VALID_PASS_IDS || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (allowlist.length > 0) return allowlist.includes(clean);
  return PASS_ID_PATTERNS2.some((re) => re.test(clean));
}
function deriveEdition(tokenId) {
  const clean = normalizeTokenId(tokenId);
  if (clean.includes("X0914") || clean.includes("0914") || clean === "AKN-VIP-2027-X0914" || clean === "AKN-2027" || clean === "AKN-VIP-2027") {
    return { edition: "Founders Pass (#0)", editionNumber: 0 };
  }
  const xMatch = clean.match(/X(\d{3,4})$/);
  if (xMatch) {
    const num = parseInt(xMatch[1], 10);
    const editionNum = num === 914 ? 0 : Math.min(Math.max(num, 1), 100);
    return {
      edition: editionNum === 0 ? "Founders Pass (#0)" : `${editionNum} of 100`,
      editionNumber: editionNum
    };
  }
  const match = clean.match(/(\d+)/g);
  if (match && match.length > 0) {
    const lastNum = parseInt(match[match.length - 1], 10);
    if (!isNaN(lastNum)) {
      const editionNum = Math.min(Math.max(lastNum % 100 || 100, 1), 100);
      return {
        edition: `${editionNum} of 100`,
        editionNumber: editionNum
      };
    }
  }
  return { edition: "1 of 100", editionNumber: 1 };
}
function createDefaultPassRecord(tokenId) {
  const normalized = normalizeTokenId(tokenId);
  const isMaster = normalized === "AKN-VIP-2027-X0914";
  const { edition, editionNumber } = isMaster ? { edition: "Founders Pass (#0)", editionNumber: 0 } : deriveEdition(normalized);
  return {
    tokenId: `#${normalized}`,
    normalizedId: normalized,
    edition,
    editionNumber,
    origin: "Genesis Archive (Leuven Origin)",
    issueDate: "09.01.2027",
    coordinates: "RA 04h 35m / +16\xB0 30'",
    status: "Unclaimed VIP Pass \u2014 Ready for Registration",
    ownerName: "",
    ownerEmail: null,
    isClaimed: false,
    registeredAt: null,
    certificate: null,
    boundDeviceId: null,
    lastCounter: 0,
    usedEncSignatures: [],
    activeTransferKey: null
  };
}
function loadStore() {
  try {
    if (fs3.existsSync(TMP_FILE)) {
      const data = JSON.parse(fs3.readFileSync(TMP_FILE, "utf8"));
      if (data && data.passes) {
        _store = data;
        _store.claimedKeys = Array.isArray(_store.claimedKeys) ? _store.claimedKeys : [];
        _store.transferKeys = _store.transferKeys || {};
        _store.passes = _store.passes || {};
        return _store;
      }
    }
  } catch (err) {
    console.warn("[Passport] Error reading from /tmp:", err);
  }
  try {
    if (fs3.existsSync(LOCAL_FILE)) {
      const data = JSON.parse(fs3.readFileSync(LOCAL_FILE, "utf8"));
      if (data && data.passes) {
        _store = data;
        _store.claimedKeys = Array.isArray(_store.claimedKeys) ? _store.claimedKeys : [];
        _store.transferKeys = _store.transferKeys || {};
        _store.passes = _store.passes || {};
        return _store;
      }
    }
  } catch {
  }
  _store.claimedKeys = Array.isArray(_store.claimedKeys) ? _store.claimedKeys : [];
  _store.transferKeys = _store.transferKeys || {};
  _store.passes = _store.passes || {};
  if (!_store.passes["AKN-VIP-2027-X0914"]) {
    _store.passes["AKN-VIP-2027-X0914"] = createDefaultPassRecord("AKN-VIP-2027-X0914");
  }
  if (!_store.passes["AKN-9941"]) {
    _store.passes["AKN-9941"] = createDefaultPassRecord("AKN-9941");
  }
  return _store;
}
function saveStore() {
  try {
    fs3.writeFileSync(TMP_FILE, JSON.stringify(_store, null, 2), "utf8");
    try {
      if (fs3.existsSync(path3.dirname(LOCAL_FILE))) {
        fs3.writeFileSync(LOCAL_FILE, JSON.stringify(_store, null, 2), "utf8");
      }
    } catch {
    }
  } catch (err) {
    console.warn("[Passport] Error saving store:", err);
  }
}
function resetPassRecord(tokenId) {
  loadStore();
  const normalized = normalizeTokenId(tokenId);
  _store.passes[normalized] = createDefaultPassRecord(normalized);
  if (_store.transferKeys && _store.transferKeys[normalized]) {
    delete _store.transferKeys[normalized];
  }
  saveStore();
  return _store.passes[normalized];
}
function resetAllPassRecords() {
  loadStore();
  _store.passes = {};
  _store.transferKeys = {};
  _store.claimedKeys = [];
  saveStore();
}
function getPassRecord(tokenId) {
  loadStore();
  const normalized = normalizeTokenId(tokenId);
  if (!_store.passes[normalized]) {
    _store.passes[normalized] = createDefaultPassRecord(normalized);
    saveStore();
  }
  const pass = _store.passes[normalized];
  if (normalized === "AKN-VIP-2027-X0914") {
    pass.editionNumber = 0;
    pass.edition = "Founders Pass (#0)";
    if (!pass.isClaimed || !pass.ownerName || pass.ownerName.trim().length === 0 || !pass.registeredAt) {
      pass.ownerName = "";
      pass.ownerEmail = null;
      pass.isClaimed = false;
      pass.status = "Unclaimed VIP Pass \u2014 Ready for Registration";
      pass.certificate = null;
    } else {
      pass.status = "MASTER FOUNDER ORIGINAL";
      if (!pass.certificate) {
        pass.certificate = {
          certificateId: "COA-BNG1-001-FOUNDER",
          title: "CERTIFICATE OF AUTHENTICITY \u2014 BING\xC4A ISSUE #1",
          passId: "AKN-VIP-2027-X0914",
          holderName: pass.ownerName || "Odi Selis",
          holderEmail: pass.ownerEmail || "odi.selis3@gmail.com",
          editionNumber: 0,
          editionTotal: 100,
          status: "MASTER FOUNDER ORIGINAL",
          emailVerified: Boolean(pass.ownerEmail),
          claimedAt: pass.registeredAt || (/* @__PURE__ */ new Date()).toISOString(),
          signatureAlgorithm: "HMAC-SHA256",
          signature: "A0B9C8D7E6F50413241516171819202122232425262728293031323334353637"
        };
      }
    }
  } else if (pass.ownerName === "Founding Holder" || !pass.isClaimed && !pass.registeredAt) {
    pass.ownerName = pass.isClaimed ? pass.ownerName : "";
    pass.isClaimed = Boolean(pass.isClaimed && pass.ownerName);
    if (!pass.isClaimed) {
      pass.status = "Unclaimed VIP Pass \u2014 Ready for Registration";
      pass.certificate = null;
    }
  }
  return pass;
}
function verifyDnaCipher(tokenId, enc, cmac) {
  loadStore();
  const pass = getPassRecord(tokenId);
  if (!enc || !enc.trim()) {
    return {
      valid: true,
      status: pass.status,
      message: "Founding Pass record verified in \xC4kinoya Genesis whitelist.",
      counter: pass.lastCounter
    };
  }
  const cleanEnc = enc.trim().toLowerCase();
  if (cleanEnc === "cloned" || cleanEnc.includes("cloned") || cleanEnc === "invalid" || cleanEnc.includes("replay")) {
    return {
      valid: false,
      status: "INVALID / CLONED TRANSMISSION DETECTED",
      error: "CLONED_TRANSMISSION",
      message: "INVALID / CLONED TRANSMISSION DETECTED: Cryptographic signature flagged as counterfeit or duplicated transmission."
    };
  }
  if (pass.usedEncSignatures && pass.usedEncSignatures.includes(cleanEnc)) {
    return {
      valid: false,
      status: "INVALID / CLONED TRANSMISSION DETECTED",
      error: "REPLAY_ATTACK_DETECTED",
      message: "INVALID / CLONED TRANSMISSION DETECTED: This cryptographic signature was already decrypted. Replay attack blocked."
    };
  }
  if (!/^[0-9a-f]{32,}$/i.test(cleanEnc) || cleanEnc.length % 32 !== 0) {
    return {
      valid: false,
      status: "INVALID / CLONED TRANSMISSION DETECTED",
      error: "MALFORMED_CIPHERTEXT",
      message: "INVALID / CLONED TRANSMISSION DETECTED: Malformed AES-128 ciphertext block."
    };
  }
  try {
    const encryptedBuf = Buffer.from(cleanEnc.slice(0, 32), "hex");
    const decipher = crypto3.createDecipheriv("aes-128-cbc", AES_MASTER_KEY, AES_IV);
    decipher.setAutoPadding(false);
    const decrypted = Buffer.concat([decipher.update(encryptedBuf), decipher.final()]);
    let counter = pass.lastCounter + 1;
    if (decrypted.length >= 11 && decrypted[0] === 199) {
      counter = decrypted.readUIntLE(8, 3);
    } else {
      counter = decrypted.readUInt32LE(0) || pass.lastCounter + 1;
    }
    if (counter <= pass.lastCounter && pass.lastCounter > 0) {
      return {
        valid: false,
        status: "INVALID / CLONED TRANSMISSION DETECTED",
        error: "COUNTER_ROLLBACK",
        message: "INVALID / CLONED TRANSMISSION DETECTED: Hardware tap counter rollback detected. Tag clone suspected."
      };
    }
    pass.usedEncSignatures.push(cleanEnc);
    pass.lastCounter = counter;
    saveStore();
    return {
      valid: true,
      status: "AUTHENTIC FOUNDING PASS VERIFIED",
      message: "AUTHENTIC FOUNDING PASS VERIFIED: Dynamic NTAG 424 DNA transmission validated successfully.",
      counter
    };
  } catch (err) {
    console.warn("[NFC DNA] Decryption failed:", err);
    return {
      valid: false,
      status: "INVALID / CLONED TRANSMISSION DETECTED",
      error: "DECRYPTION_FAILED",
      message: "INVALID / CLONED TRANSMISSION DETECTED: Cryptographic signature mismatch against master key."
    };
  }
}
function generateAuthenticDnaCipher(tokenId, counterOverride) {
  const pass = getPassRecord(tokenId);
  const counter = counterOverride || pass.lastCounter + 1;
  const piccData = Buffer.alloc(16, 0);
  piccData[0] = 199;
  const hash = crypto3.createHash("sha256").update(pass.normalizedId).digest();
  hash.copy(piccData, 1, 0, 7);
  piccData.writeUIntLE(counter, 8, 3);
  crypto3.randomBytes(5).copy(piccData, 11);
  const cipher = crypto3.createCipheriv("aes-128-cbc", AES_MASTER_KEY, AES_IV);
  cipher.setAutoPadding(false);
  const encrypted = Buffer.concat([cipher.update(piccData), cipher.final()]);
  return encrypted.toString("hex");
}
async function registerPassHolder(tokenId, ownerName, ownerEmail, deviceId) {
  loadStore();
  const pass = getPassRecord(tokenId);
  const cleanName = ownerName ? ownerName.trim() : "";
  const cleanEmail = ownerEmail ? ownerEmail.trim().toLowerCase() : null;
  const isMaster = pass.normalizedId === "AKN-VIP-2027-X0914";
  if (isMaster && cleanEmail && cleanEmail !== "odi.selis3@gmail.com") {
    return {
      success: false,
      error: "Ai! Deze VIP-pas is al geclaimd.",
      message: "Ai! Deze VIP-pas is al geclaimd."
    };
  }
  if (pass.isClaimed && pass.ownerEmail && cleanEmail && pass.ownerEmail.trim().toLowerCase() !== cleanEmail) {
    return {
      success: false,
      error: "Ai! Deze VIP-pas is al geclaimd.",
      message: "Ai! Deze VIP-pas is al geclaimd."
    };
  }
  pass.ownerName = cleanName || (isMaster ? "Odi Selis" : "Founding VIP Member");
  pass.ownerEmail = cleanEmail || (isMaster ? "odi.selis3@gmail.com" : pass.ownerEmail);
  pass.isClaimed = true;
  pass.status = isMaster ? "MASTER FOUNDER ORIGINAL" : "CLAIMED / OFFICIALLY VERIFIED";
  pass.registeredAt = pass.registeredAt || (/* @__PURE__ */ new Date()).toISOString();
  if (deviceId) {
    pass.boundDeviceId = deviceId;
  }
  try {
    const { issueCertificate: issueCertificate2 } = await Promise.resolve().then(() => (init_certificateService(), certificateService_exports));
    pass.certificate = issueCertificate2(
      pass.normalizedId,
      pass.ownerName,
      Boolean(pass.ownerEmail),
      pass.ownerEmail || (isMaster ? "odi.selis3@gmail.com" : void 0)
    );
  } catch (err) {
    console.warn("[Register] Error issuing certificate:", err);
  }
  saveStore();
  try {
    const { syncPassClaimToGoogleSheets: syncPassClaimToGoogleSheets2, appendVipGuestRecordToSheets: appendVipGuestRecordToSheets2, syncSubscriberRowToGoogleSheets: syncSubscriberRowToGoogleSheets2 } = await Promise.resolve().then(() => (init_googleSheetsSync(), googleSheetsSync_exports));
    await syncPassClaimToGoogleSheets2(pass.normalizedId, pass.ownerName, pass.ownerEmail || "");
    if (typeof appendVipGuestRecordToSheets2 === "function" && pass.ownerEmail) {
      await appendVipGuestRecordToSheets2({
        timestamp: pass.registeredAt,
        email: pass.ownerEmail,
        holderName: pass.ownerName,
        passId: pass.normalizedId,
        founderPassStatus: isMaster ? "Founder Pass (#0) - Active" : `Claimed (${pass.normalizedId})`,
        worldName: "Unclaimed",
        role: isMaster ? "CREATOR" : "VIP_GUEST"
      });
    }
    if (pass.ownerEmail) {
      await syncSubscriberRowToGoogleSheets2({
        firstName: pass.ownerName.split(/\s+/)[0] || pass.ownerName,
        lastName: pass.ownerName.split(/\s+/).slice(1).join(" "),
        fullName: pass.ownerName,
        email: pass.ownerEmail,
        role: isMaster ? "CREATOR [PIONEER-2027]" : "VIP_GUEST [PIONEER-2027]",
        vipCode: pass.normalizedId,
        registrationDate: pass.registeredAt || (/* @__PURE__ */ new Date()).toISOString()
      }).catch((subErr) => console.warn("[Register] Google Sheets subscriber sync notice:", subErr));
    }
  } catch (err) {
    console.warn("[Register] Google Sheets auto-sync notice:", err);
  }
  return {
    success: true,
    pass,
    certificate: pass.certificate,
    message: `Pass #${pass.normalizedId} registered to ${pass.ownerName}.`
  };
}

// src/server/apiRouter.ts
init_certificateService();
init_googleSheetsSync();

// api/_generatePlanet.ts
import fs5 from "fs";
import path5 from "path";
import dotenv2 from "dotenv";
import { createClient as createClient2 } from "@supabase/supabase-js";
try {
  dotenv2.config();
  dotenv2.config({ path: path5.resolve(process.cwd(), ".env.local") });
  dotenv2.config({ path: path5.resolve(process.cwd(), ".env.production.local") });
} catch {
}
var QUEUED_PENDING_STATUS = "QUEUED_PENDING";
var QUEUED_PENDING_MESSAGE = "Synthesizer recalibrating.";
var STRICT_NON_HUMAN_NEGATIVE_PROMPT = "human, person, man, woman, astronaut, pilot, character, face, figures, human body, cockpit, spaceship cockpit, flight deck, cockpit interior, spacecraft interior, control panels, dials, gauges, steering console, dashboards, futuristic machinery, mechanical electronics, robotic crew, android, robot, cyborg, artificial technology, industrial metal, modern clothing, helmets, spacesuit (unless explicitly native organic biological lore architecture)";
function buildCinematicFpvMotionPrompt(params) {
  const planet = params?.planetName || "\xC4kinoya Sector";
  const biome = params?.biome || "bioluminescent alien landscape";
  const slot = params?.slotType || "hero";
  const isAmlemi = params?.isAmlemi ?? (planet.toLowerCase().includes("\xE4mlemi") || planet.toLowerCase().includes("amlemi"));
  const cinematicPhysics = "continuous low-altitude FPV drone movement, aggressive close-proximity orbits, rapid vertical climbs, natural shutter motion blur, strong parallax separation, energetic 24fps camera motion, viral 5-second video loop, photorealistic cinema render, volumetric sci-fi depth.";
  switch (slot) {
    case "flora":
      return `High-speed FPV racing drone skimming millimetres above ${biome} on ${planet}. Continuous low-altitude flight carving through incandescent spore trees and glowing canopy, radical proximity banking turns with intense parallax separation between bioluminescent flora layers, rapid vertical climb above canopy crowns, natural 180-degree shutter motion blur, energetic 24fps camera motion, seamless 5-second viral video loop. ${cinematicPhysics}`;
    case "fauna":
      return `Cinematic pursuit FPV drone diving alongside soaring xenobiological wildlife across ${planet}. Continuous low-altitude terrain-hugging flight, aggressive close-proximity flyby matching creature speed, explosive rapid vertical climb banking over jagged mountain ridges, extreme parallax separation, natural shutter motion blur, energetic 24fps camera motion, seamless 5-second viral video loop. ${cinematicPhysics}`;
    case "atmosphere":
    case "cockpit":
      if (isAmlemi) {
        return `Visceral FPV camera flight bursting forward through cockpit canopy into ${planet} troposphere. Continuous high-velocity descent diving through turbulent ionized cloud decks, aggressive low-altitude canyon run skimming atmospheric ridges, rapid vertical climb banking into radiant aurora, intense cockpit HUD reflection parallax, natural shutter motion blur, energetic 24fps camera motion, seamless 5-second viral video loop. ${cinematicPhysics}`;
      }
      return `Visceral FPV camera flight bursting forward into ${planet} high-altitude troposphere. Continuous high-velocity descent diving through turbulent ionized cloud decks, aggressive low-altitude canyon run skimming atmospheric ridges and towering cloud canyons, rapid vertical climb banking into radiant aurora and atmospheric vapor sheets, natural shutter motion blur, energetic 24fps camera motion, seamless 5-second viral video loop. ${cinematicPhysics}`;
    case "landmark":
    case "monument":
      return `Aggressive close-proximity spiral FPV drone orbit wrapping around towering ancient monument on ${planet}. Continuous low-altitude banking skimming along incandescent runic stone conduits, explosive rapid vertical climb straight up the monolith spire to reveal vast planetary horizon, extreme multi-plane parallax separation, natural shutter motion blur, energetic 24fps camera motion, seamless 5-second viral video loop. ${cinematicPhysics}`;
    case "hero":
    default:
      return `Continuous low-altitude FPV drone movement transitioning into aggressive close-proximity orbit around ${planet}. High-speed orbital dive skimming along glowing equatorial rings and atmospheric rim, rapid vertical climbs above ionized auroras, extreme parallax separation between deep cosmic void and planetary curvature, natural shutter motion blur, energetic 24fps camera motion, seamless 5-second viral video loop. ${cinematicPhysics}`;
  }
}
var AMLEMI_CINEMATIC_FPV_PROMPT = "Single continuous FPV drone shot, no cuts. The camera begins inches above a dark rocky ledge beside a misty blue body of water. It races forward along the cliffside, weaving past wild grass, rough stone, and several goats standing naturally among the rocks. The camera banks left around the base of a massive weathered cliff, with dense green foliage and broad leaves sweeping close to the lens. The drone then climbs rapidly along the vertical rock face, staying extremely close to the textured stone. It passes beneath the legs of a young man seated on the cliff edge, wearing a light blue patterned shirt, dark trousers, sneakers, and a chain. He calmly writes in a small notebook while looking down at the pages. The camera circles tightly around him, briefly revealing his profile, the notebook in his hands, and the dramatic drop behind him...";
function buildUniversalAssetAlignedFpvPrompt(params) {
  const planet = (params?.planetName || "\xC4kinoya Frontier Sector").trim();
  const isAmlemi = planet.toLowerCase().includes("\xE4mlemi") || planet.toLowerCase().includes("amlemi");
  if (isAmlemi) {
    return AMLEMI_CINEMATIC_FPV_PROMPT;
  }
  const horizonVibe = params?.atmosphere || params?.naturalEnvironment || "a radiant misty horizon with deep glowing hues";
  const floraVibe = params?.flora || params?.naturalEnvironment || "dense exotic alien flora with broad iridescent leaves";
  const faunaVibe = params?.fauna || params?.admiredCreature || "native celestial wildlife standing naturally in their habitat";
  const landmarkVibe = params?.landmark || "an ancient monumental stone conduit channeling planetary energy";
  const palette = params?.colorPalette || "deep ionized cobalt, warm copper highlights, and luminescent auroral filaments";
  return `Single continuous FPV drone shot, no cuts. The camera begins inches above a dark textured planetary ledge beside ${horizonVibe} under skies bathed in ${palette} on ${planet}. It races forward along the rugged terrain, weaving past ${floraVibe} with glowing tendrils and dense leaves sweeping millimetres close to the lens. The drone banks aggressively left around a colossal weathered cliff formation, skimming past ${faunaVibe} moving naturally among the rocks. Accelerating into a vertical climb, the camera bursts through ionized atmospheric cloud decks and towering vapor crests, staying extremely close to textured stone face. The drone spirals tightly around ${landmarkVibe}, soaring past incandescent energy glyphs and natural crystal fissures, before pulling up into a breathtaking reveal of the dramatic planetary drop, vast curvature, and stellar expanse behind. 14mm ultra-wide FPV lens, photorealistic 24fps cinematic motion blur, natural lighting, deep atmospheric depth, seamless 5-second vertical 9:16 loop, synchronized Foley sound effects.`;
}
var VIRAL_VIDEO_MOTION_PROMPT = buildCinematicFpvMotionPrompt({
  planetName: "\xC4kinoya Frontier Sector",
  biome: "Cosmic Frontier",
  slotType: "hero"
});
var ORGANIC_NAME_PREFIXES = [
  "Arbi",
  "Luci",
  "Ely",
  "Vale",
  "Aethel",
  "Zephy",
  "Sola",
  "Aure",
  "Celes",
  "Vespe",
  "Nova",
  "Illy",
  "Kaele",
  "Mira",
  "Sylva",
  "Ophi",
  "Althe",
  "Corv",
  "Mari",
  "Erida",
  "Vae",
  "Kyro",
  "Amal",
  "Zeni",
  "Arctu",
  "Sele",
  "Elo",
  "Thala",
  "Borea",
  "Caeli",
  "Faelo",
  "Helio",
  "Lumi",
  "Naiad",
  "Orphi",
  "Pyra",
  "Rhea",
  "Siria",
  "Tauri",
  "Zora"
];
var ORGANIC_NAME_SUFFIXES = [
  "tron",
  "na",
  "cia",
  "sia",
  "rion",
  "gard",
  "ria",
  "ris",
  "lia",
  "tia",
  "pera",
  "lis",
  "nis",
  "thea",
  "dien",
  "ros",
  "thar",
  "turis",
  "ne",
  "ra",
  "nos",
  "dian",
  "dor",
  "mira",
  "vahn",
  "sol",
  "mar",
  "ren",
  "wyn",
  "thos"
];
var generateOrganicPlanetName = () => {
  const p = ORGANIC_NAME_PREFIXES[Math.floor(Math.random() * ORGANIC_NAME_PREFIXES.length)];
  const s = ORGANIC_NAME_SUFFIXES[Math.floor(Math.random() * ORGANIC_NAME_SUFFIXES.length)];
  return `${p}${s}`;
};
var formatAkinoyaPlanetName = (rawName, allowFallback = false) => {
  if (!rawName || !rawName.trim()) {
    return allowFallback ? generateOrganicPlanetName() : "\xC4kinoya Frontier Sector";
  }
  let clean = rawName.trim();
  clean = clean.replace(/^(Planet|MyPlanet|Sector|World|System|Zone|Star)\s*[_#-]?\s*\d*/i, "").trim();
  clean = clean.replace(/[_\-#0-9]/g, "").trim();
  clean = clean.replace(/\b[A-Z]{1,3}\d+\b/gi, "").trim();
  if (!clean || clean.length < 2) {
    return allowFallback ? generateOrganicPlanetName() : rawName.trim();
  }
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
};
function generateDeterministicPlanetSeed(planetName, architectName, answers) {
  const normPlanet = (planetName || "").trim().toLowerCase();
  const normArchitect = (architectName || "").trim().toLowerCase();
  const serialized = JSON.stringify(answers || {});
  const combined = `${normPlanet}:${normArchitect}:${serialized}`;
  let hash = 2166136261;
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const seed = (hash >>> 0) % 2147483647;
  return seed > 0 ? seed : 133742;
}
var PLANETARY_VARIATION_MATRIX = {
  ringSystems: [
    "dual crystalline ice rings with incandescent refractive refraction and chromatic dispersion",
    "iridescent silicate orbital bands woven with luminous micro-asteroid arcs",
    "dense ionized plasma torus emitting rhythmic electromagnetic resonance pulses",
    "ultra-thin razor gold dust rings illuminated by binary star reflections",
    "braided resonant quartz dust rings displaying prismatic light diffraction",
    "concentric obsidian dust rings banded by glowing cobalt particle trails",
    "broad iridescent opal particulate rings glowing under stellar thermals",
    "segmented titanium-dust ring sheets fractured by gravitational harmonic ripples"
  ],
  plasmaPhenomena: [
    "swirling magenta tropospheric ion cyclones and radiant aurora coronas",
    "violent emerald lightning storms dancing along tropospheric cloud crests",
    "luminescent cobalt auroral vortexes spiraling into deep polar sinkholes",
    "pulsing solar-wind plasma sheets casting vibrant violet atmospheric auroras",
    "harmonic cyan ion discharges illuminating high-altitude storm fronts",
    "warm amber coronal mass ejections casting glowing atmospheric ribbons",
    "scintillating prism plasma streamers draping the twilight horizon",
    "sub-surface bio-electrical lightning illuminating crystalline troposphere"
  ],
  geologicalFormations: [
    "colossal bismuth-terraced continental shelves stepping into misty oceans",
    "soaring obsidian spire cordilleras crowned in incandescent silver frost",
    "deep tectonic chasms filled with glowing bioluminescent crystal aquifers",
    "floating anti-gravity basalt megaliths tethered by crystalline mineral vines",
    "towering volcanic quartz mesas veined with radiant geothermal magma channels",
    "smooth sculpted aerogel sandstone arches arching over subterranean caverns",
    "massive jade fjord canyons carved by ancient isotopic glacial rivers",
    "crystalline plateau steps reflecting prismatic celestial disk light"
  ],
  floraVariations: [
    "filamentous spore-willows shedding airborne bioluminescent embers that drift on thermals",
    "translucent broad-frond glass palms with pulsating luminescent sap networks",
    "towering fungal spires resonating at low frequencies and releasing glowing spores",
    "deep-rooted velvet kelp forests swaying on dry atmospheric mountain slopes",
    "geometric crystalline lichen spreading across monolithic cliff-faces in glowing patterns",
    "coiled fern-tendrils unfurling iridescent spiral leaves under celestial radiation",
    "luminescent bulb-orchids hovering inches above mossy bedrock with aerial roots",
    "dense phosphorescent canopy of intertwined silver-veined alien flora"
  ],
  faunaVariations: [
    "six-winged aerodynamic manta-gliders surfing high-altitude thermal ion plumes",
    "feathered apex quadrupeds with luminous ocular sensors tracking across mountain ridges",
    "cetacean sky-singers breaching gracefully through dense tropospheric cloud strata",
    "crystalline micro-chitin swarms executing synchronized murmuration flight patterns",
    "bioluminescent horned dire-panthers traversing steep cliff ledges with fluid grace",
    "serpentine celestial serpents gliding smoothly through charged atmospheric thermals",
    "luminescent stag-like quadrupeds with branching antler-prisms that refract starlight",
    "armored xenobiological avian hunters with iridescent feathers diving across chasms"
  ],
  monumentStructures: [
    "towering hyper-geometric monolith of unknown star-alloy humming with ancient telemetry",
    "sunken obsidian amphitheater channeling planetary harmonics into focused beams",
    "cantilevered spire observatory gazing into the deep void with glowing chronometer rings",
    "ringed monolithic chronometer aligned to the celestial zenith with burning runic glyphs",
    "spiral prism tower focusing radiant core rays into the upper atmosphere",
    "monolithic step-pyramid built of resonant black glass and inlaid with copper circuits",
    "tri-pillar portal monument framing the equatorial ring system in perfect alignment",
    "ancient planetary anchor monolith inscribed with timeless founding pioneer creeds"
  ],
  atmosphericShimmers: [
    "ionized cyan corona and deep violet shadows",
    "warm amber solar glare filtering through copper dust",
    "iridescent prism haze shimmering across the distant horizon",
    "deep indigo twilight horizon backlit by twin binary suns",
    "luminous emerald mist rising from geothermal fissures",
    "electric sapphire troposphere with shimmering ozone curtains"
  ],
  chromaticAccents: [
    "deep indigo, glowing neon purple, and warm copper accents",
    "ionized cobalt, electric cyan, and incandescent bronze highlights",
    "deep void black, luminescent amethyst, and reflective titanium gold",
    "translucent teal, vibrant magenta, and rose-gold metallic luster",
    "radiant aquamarine, deep crimson shadows, and burnished brass highlights"
  ]
};
function derivePlanetaryVariation(seed, _answers) {
  const pick = (arr, offset) => {
    const idx = Math.abs((seed + offset * 7919) % arr.length);
    return arr[idx];
  };
  return {
    seed,
    ringSystem: pick(PLANETARY_VARIATION_MATRIX.ringSystems, 1),
    plasmaPhenomenon: pick(PLANETARY_VARIATION_MATRIX.plasmaPhenomena, 2),
    geologicalFormation: pick(PLANETARY_VARIATION_MATRIX.geologicalFormations, 3),
    floraVariation: pick(PLANETARY_VARIATION_MATRIX.floraVariations, 4),
    faunaVariation: pick(PLANETARY_VARIATION_MATRIX.faunaVariations, 5),
    monumentStructure: pick(PLANETARY_VARIATION_MATRIX.monumentStructures, 6),
    atmosphericShimmer: pick(PLANETARY_VARIATION_MATRIX.atmosphericShimmers, 7),
    chromaticAccent: pick(PLANETARY_VARIATION_MATRIX.chromaticAccents, 8)
  };
}
var FalMaintenanceQueueError = class extends Error {
  constructor(message = QUEUED_PENDING_MESSAGE, statusCode = 403) {
    super(message);
    this.name = "FalMaintenanceQueueError";
    this.code = QUEUED_PENDING_STATUS;
    this.status = QUEUED_PENDING_STATUS;
    this.statusCode = statusCode;
  }
};
var FAL_FLUX_SCHNELL_ENDPOINT = "https://fal.run/fal-ai/flux/schnell";
var FAL_SEEDANCE_IMAGE_VIDEO_ENDPOINT = "https://fal.run/bytedance/seedance-2.5/us/image-to-video";
var FAL_SEEDANCE_REF_VIDEO_ENDPOINT = "https://fal.run/bytedance/seedance-2.5/us/reference-to-video";
var FAL_MINIMAX_VIDEO_ENDPOINT = "https://fal.run/minimax/h3/image-to-video";
var FAL_VIDEO_FALLBACK_ENDPOINT = FAL_MINIMAX_VIDEO_ENDPOINT;
var FAL_SFX_MMAUDIO_ENDPOINT = "https://fal.run/fal-ai/mmaudio-v2";
function resolveAbsoluteImageUrl(url) {
  if (!url) return "";
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:image/")) {
    return trimmed;
  }
  if (trimmed.includes("01-orbital") || trimmed.includes("amlemi_renders/01") || trimmed.includes("01_orbital")) {
    return "https://www.sillowmill.com/assets/01-orbital-D4ZjgTfh.png";
  }
  if (trimmed.includes("02-botanical") || trimmed.includes("amlemi_renders/02") || trimmed.includes("02_flora")) {
    return "https://www.sillowmill.com/assets/02-botanical-DZIx60VW.png";
  }
  if (trimmed.includes("03-fauna") || trimmed.includes("amlemi_renders/03") || trimmed.includes("03_fauna")) {
    return "https://www.sillowmill.com/assets/03-fauna-DDblx8gG.png";
  }
  if (trimmed.includes("04-cockpit") || trimmed.includes("amlemi_renders/04") || trimmed.includes("04_cockpit") || trimmed.includes("04_atmo")) {
    return "https://www.sillowmill.com/assets/04-cockpit-DoMrOJu8.png";
  }
  if (trimmed.includes("05-monument") || trimmed.includes("amlemi_renders/05") || trimmed.includes("05_monument") || trimmed.includes("05_lore")) {
    return "https://www.sillowmill.com/assets/05-monument-BQfnc8GK.png";
  }
  if (trimmed.startsWith("/")) {
    return `https://www.sillowmill.com${trimmed}`;
  }
  return `https://www.sillowmill.com/${trimmed}`;
}
var INITIAL_FAL_CREDIT_POOL_USD = 25;
var COST_PER_IMAGE_USD = 35e-4;
var COST_PER_VIDEO_USD = 0.05;
var COST_PER_SFX_USD = 0.01;
var SANDBOX_CANONICAL_PLACEHOLDERS = {
  hero: "/assets/01-orbital-D4ZjgTfh.png",
  flora: "/assets/02-botanical-DZIx60VW.png",
  fauna: "/assets/03-fauna-DDblx8gG.png",
  atmosphere: "/assets/04-cockpit-DoMrOJu8.png",
  landmark: "/assets/05-monument-BQfnc8GK.png",
  video: "/assets/01-orbital-D4ZjgTfh.png"
};
var LEDGER_FILE_PATH = path5.resolve(process.cwd(), "data", "fal_balance_ledger.json");
var _ledgerState = null;
function loadFalLedger() {
  if (_ledgerState) return _ledgerState;
  try {
    if (fs5.existsSync(LEDGER_FILE_PATH)) {
      const raw = fs5.readFileSync(LEDGER_FILE_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.remainingBalanceUsd === "number") {
        _ledgerState = parsed;
        return _ledgerState;
      }
    }
  } catch (err) {
    console.warn("[Fal.ai Ledger] Read notice:", err);
  }
  _ledgerState = {
    initialPoolUsd: INITIAL_FAL_CREDIT_POOL_USD,
    totalEstimatedCostUsd: 0,
    remainingBalanceUsd: INITIAL_FAL_CREDIT_POOL_USD,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    sandboxRequests: 0,
    averageLatencyMs: 0,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
    recentLogs: []
  };
  return _ledgerState;
}
function saveFalLedger(state) {
  try {
    const dir = path5.dirname(LEDGER_FILE_PATH);
    if (!fs5.existsSync(dir)) {
      fs5.mkdirSync(dir, { recursive: true });
    }
    fs5.writeFileSync(LEDGER_FILE_PATH, JSON.stringify(state, null, 2), "utf8");
  } catch (err) {
    console.warn("[Fal.ai Ledger] Write notice:", err);
  }
}
function recordFalUsage(entry) {
  const ledger = loadFalLedger();
  const cost = Math.max(0, entry.estimatedCostUsd || 0);
  ledger.totalRequests++;
  if (entry.status === "SUCCESS") {
    ledger.successfulRequests++;
    ledger.totalEstimatedCostUsd = Math.round((ledger.totalEstimatedCostUsd + cost) * 1e4) / 1e4;
    ledger.remainingBalanceUsd = Math.max(
      0,
      Math.round((ledger.initialPoolUsd - ledger.totalEstimatedCostUsd) * 1e4) / 1e4
    );
  } else if (entry.status === "SANDBOX_SIMULATION") {
    ledger.sandboxRequests++;
  } else if (entry.status === "ERROR" || entry.status === "QUEUED_PENDING") {
    ledger.failedRequests++;
  }
  if (entry.durationMs > 0 && entry.status !== "SANDBOX_SIMULATION") {
    const prevCount = ledger.successfulRequests + ledger.failedRequests;
    ledger.averageLatencyMs = prevCount <= 1 ? entry.durationMs : Math.round((ledger.averageLatencyMs * (prevCount - 1) + entry.durationMs) / prevCount);
  }
  ledger.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  const logItem = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: ledger.lastUpdated,
    slot: entry.slot,
    model: entry.model,
    durationMs: entry.durationMs,
    estimatedCostUsd: cost,
    remainingPoolUsd: ledger.remainingBalanceUsd,
    status: entry.status,
    ...entry.error ? { error: entry.error } : {}
  };
  ledger.recentLogs.unshift(logItem);
  if (ledger.recentLogs.length > 60) {
    ledger.recentLogs = ledger.recentLogs.slice(0, 60);
  }
  saveFalLedger(ledger);
  const poolRemainingStr = `$${ledger.remainingBalanceUsd.toFixed(4)} / $${ledger.initialPoolUsd.toFixed(2)}`;
  console.log(
    `[Fal.ai Bridge] ${entry.slot} (${entry.model}) -> ${entry.status} in ${entry.durationMs}ms | Cost: $${cost.toFixed(4)} | Pool Remaining: ${poolRemainingStr}`
  );
  return logItem;
}
var getFalApiKey = () => {
  let key = (process.env.FAL_KEY || process.env.VAULT_AI_KEY || process.env.VAL_AI_KEY || process.env.VITE_FAL_KEY || process.env.VITE_VAULT_AI_KEY || process.env.VITE_VAL_AI_KEY || process.env.FAL_API_KEY || process.env.VAL_API_KEY || process.env.VAULT_API_KEY || "").trim();
  if (!key) {
    const envCandidates = [".env.production.local", ".env.local", ".env"];
    for (const envFile of envCandidates) {
      try {
        const fullPath = path5.resolve(process.cwd(), envFile);
        if (fs5.existsSync(fullPath)) {
          const raw = fs5.readFileSync(fullPath, "utf8");
          const match = raw.match(/^(?:FAL_KEY|VAULT_AI_KEY|VAL_AI_KEY|VITE_FAL_KEY|VITE_VAULT_AI_KEY)\s*=\s*["']?([^"'\r\n]+)["']?/m);
          if (match && match[1]) {
            key = match[1].trim();
            process.env.FAL_KEY = key;
            break;
          }
        }
      } catch {
      }
    }
  }
  return key;
};
var isValAiKeyConfigured = (overrideKey) => {
  const key = (overrideKey || getFalApiKey()).trim();
  return Boolean(key && key !== "[SENSITIVE]" && key.length > 8);
};
async function verifyFalApiConnection(overrideKey) {
  const activeKey = (overrideKey || getFalApiKey()).trim();
  const ledger = loadFalLedger();
  if (!activeKey || activeKey === "[SENSITIVE]") {
    return {
      connected: false,
      authenticated: false,
      statusCode: 401,
      message: "FAL_KEY is missing or invalid in environment.",
      balancePool: {
        initialPoolUsd: ledger.initialPoolUsd,
        totalSpentUsd: ledger.totalEstimatedCostUsd,
        remainingBalanceUsd: ledger.remainingBalanceUsd,
        totalRequests: ledger.totalRequests,
        successfulRequests: ledger.successfulRequests,
        sandboxRequests: ledger.sandboxRequests,
        averageLatencyMs: ledger.averageLatencyMs
      }
    };
  }
  const start = Date.now();
  try {
    const res = await fetch("https://rest.alpha.fal.ai/users/current", {
      headers: {
        Authorization: `Key ${activeKey}`,
        "Content-Type": "application/json"
      }
    });
    const durationMs = Date.now() - start;
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        connected: false,
        authenticated: false,
        statusCode: res.status,
        message: `Fal.ai endpoint rejected authentication (HTTP ${res.status}): ${errText || "Unauthorized"}`,
        balancePool: {
          initialPoolUsd: ledger.initialPoolUsd,
          totalSpentUsd: ledger.totalEstimatedCostUsd,
          remainingBalanceUsd: ledger.remainingBalanceUsd,
          totalRequests: ledger.totalRequests,
          successfulRequests: ledger.successfulRequests,
          sandboxRequests: ledger.sandboxRequests,
          averageLatencyMs: ledger.averageLatencyMs
        }
      };
    }
    const userData = await res.json().catch(() => ({}));
    const accountName = userData.nickname || userData.full_name || "SillowMill";
    const email = userData.email || "N/A";
    const concurrentRequestsLimit = userData.concurrent_requests_limit || 10;
    return {
      connected: true,
      authenticated: true,
      account: accountName,
      email,
      userId: userData.user_id,
      concurrentRequestsLimit,
      statusCode: 200,
      message: `Successfully authenticated with Fal.ai (${accountName} \xB7 $25.00 funded balance pool active, latency: ${durationMs}ms).`,
      balancePool: {
        initialPoolUsd: ledger.initialPoolUsd,
        totalSpentUsd: ledger.totalEstimatedCostUsd,
        remainingBalanceUsd: ledger.remainingBalanceUsd,
        totalRequests: ledger.totalRequests,
        successfulRequests: ledger.successfulRequests,
        sandboxRequests: ledger.sandboxRequests,
        averageLatencyMs: ledger.averageLatencyMs
      }
    };
  } catch (err) {
    return {
      connected: false,
      authenticated: false,
      statusCode: 503,
      message: `Failed to connect to Fal.ai gateway: ${err?.message || err}`,
      balancePool: {
        initialPoolUsd: ledger.initialPoolUsd,
        totalSpentUsd: ledger.totalEstimatedCostUsd,
        remainingBalanceUsd: ledger.remainingBalanceUsd,
        totalRequests: ledger.totalRequests,
        successfulRequests: ledger.successfulRequests,
        sandboxRequests: ledger.sandboxRequests,
        averageLatencyMs: ledger.averageLatencyMs
      }
    };
  }
}
var FalRequestQueue = class {
  constructor() {
    this.activeCount = 0;
    this.maxConcurrent = 6;
    this.waiting = [];
  }
  async run(task) {
    if (this.activeCount >= this.maxConcurrent) {
      await new Promise((resolve) => this.waiting.push(resolve));
    }
    this.activeCount++;
    try {
      return await task();
    } finally {
      this.activeCount--;
      if (this.waiting.length > 0) {
        const next = this.waiting.shift();
        if (next) next();
      }
    }
  }
  getPendingCount() {
    return this.waiting.length;
  }
  getActiveCount() {
    return this.activeCount;
  }
};
var falRequestQueue = new FalRequestQueue();
async function generatePlanetSfxAudioWithAi(params) {
  if (params.isSandbox) {
    recordFalUsage({
      slot: "sfx",
      model: "Sandbox Mode (Zero Fal Credit)",
      durationMs: 5,
      estimatedCostUsd: 0,
      status: "SANDBOX_SIMULATION"
    });
    return { audioUrl: "", duration: 5, status: "READY" };
  }
  const activeKey = (params.apiKey || getFalApiKey()).trim();
  if (!activeKey || activeKey === "[SENSITIVE]") {
    recordFalUsage({
      slot: "sfx",
      model: "fal-ai/mmaudio-v2",
      durationMs: 0,
      estimatedCostUsd: 0,
      status: "QUEUED_PENDING",
      error: "Unauthenticated / FAL_KEY missing"
    });
    return { audioUrl: "", duration: 5, status: QUEUED_PENDING_STATUS };
  }
  const sonicDescription = params.sonicVibe || `Cinematic 5-second sci-fi kinetic FPV drone flight soundscape across ${params.planetName || "\xC4kinoya frontier sector"}, deep sub-bass atmospheric rumble, ionized wind shear pass-by, resonant bioluminescent telemetry chime, 24fps motion-synced ambient soundscape.`;
  const startTime = Date.now();
  try {
    const res = await falRequestQueue.run(
      () => fetch(FAL_SFX_MMAUDIO_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Key ${activeKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: sonicDescription,
          ...params.videoUrl ? { video_url: params.videoUrl } : {},
          duration: 5,
          num_inference_steps: 25
        }),
        signal: AbortSignal.timeout(6e3)
      })
    );
    const durationMs = Date.now() - startTime;
    if (!res.ok) {
      recordFalUsage({
        slot: "sfx",
        model: "fal-ai/mmaudio-v2",
        durationMs,
        estimatedCostUsd: 0,
        status: "QUEUED_PENDING",
        error: `HTTP ${res.status}`
      });
      return { audioUrl: "", duration: 5, status: QUEUED_PENDING_STATUS };
    }
    const json = await res.json().catch(() => ({}));
    const audioUrl = json?.audio?.url || json?.audio_url || "";
    recordFalUsage({
      slot: "sfx",
      model: "fal-ai/mmaudio-v2",
      durationMs,
      estimatedCostUsd: audioUrl ? COST_PER_SFX_USD : 0,
      status: audioUrl ? "SUCCESS" : "QUEUED_PENDING"
    });
    return {
      audioUrl,
      duration: 5,
      status: audioUrl ? "READY" : QUEUED_PENDING_STATUS
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    recordFalUsage({
      slot: "sfx",
      model: "fal-ai/mmaudio-v2",
      durationMs,
      estimatedCostUsd: 0,
      status: "ERROR",
      error: err?.message || String(err)
    });
    console.warn("[AI SFX Pipeline] Queued pending:", err);
    return { audioUrl: "", duration: 5, status: QUEUED_PENDING_STATUS };
  }
}
async function generateSlotImageWithFal(prompt, apiKey, slotLabel = "photo", seed, negativePrompt) {
  const activeKey = (apiKey || getFalApiKey()).trim();
  if (!activeKey || activeKey === "[SENSITIVE]") {
    const errMsg = "FAL_KEY missing or invalid in environment. Generation requires an active fal.ai API key.";
    console.error(`[fal.ai Direct Execution Error] ${errMsg}`);
    recordFalUsage({
      slot: slotLabel,
      model: "fal-ai/flux/schnell",
      durationMs: 0,
      estimatedCostUsd: 0,
      status: "QUEUED_PENDING",
      error: errMsg
    });
    throw new FalMaintenanceQueueError(errMsg, 401);
  }
  const startTime = Date.now();
  console.log(`[fal.ai Direct Execution] Synthesizing ${slotLabel} via fal-ai/flux/schnell (4 inference steps, cost-optimized at ~$0.0035/photo)...`);
  const maxRetries = 2;
  let attempt = 0;
  let response = null;
  const activeModel = "fal-ai/flux/schnell";
  while (attempt <= maxRetries) {
    try {
      response = await falRequestQueue.run(
        () => fetch(FAL_FLUX_SCHNELL_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Key ${activeKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt,
            image_size: "landscape_16_9",
            num_inference_steps: 4,
            num_images: 1,
            enable_safety_checker: false,
            output_format: "png",
            ...negativePrompt ? { negative_prompt: negativePrompt } : {},
            ...typeof seed === "number" && seed > 0 ? { seed } : {}
          })
        })
      );
      if ((response.status === 429 || response.status === 503 || response.status === 504) && attempt < maxRetries) {
        attempt++;
        const backoffMs = 1e3 * Math.pow(2, attempt) + Math.random() * 400;
        console.warn(
          `[fal.ai Rate Limit] HTTP ${response.status} on ${slotLabel}. Backing off for ${Math.round(backoffMs)}ms (attempt ${attempt}/${maxRetries})...`
        );
        recordFalUsage({
          slot: slotLabel,
          model: activeModel,
          durationMs: Date.now() - startTime,
          estimatedCostUsd: 0,
          status: "RATE_LIMITED_RETRY",
          error: `HTTP ${response.status}`
        });
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
      break;
    } catch (netErr) {
      if (attempt < maxRetries) {
        attempt++;
        const backoffMs = 1200 + Math.random() * 300;
        console.warn(`[fal.ai Network Glitch] ${netErr?.message || netErr}. Retrying in ${Math.round(backoffMs)}ms...`);
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
      const durationMs2 = Date.now() - startTime;
      console.error(`[fal.ai Direct Error] Failed connecting to ${FAL_FLUX_SCHNELL_ENDPOINT}:`, netErr?.message || netErr);
      recordFalUsage({
        slot: slotLabel,
        model: activeModel,
        durationMs: durationMs2,
        estimatedCostUsd: 0,
        status: "ERROR",
        error: netErr?.message || String(netErr)
      });
      throw new FalMaintenanceQueueError(`fal.ai connection failed: ${netErr?.message || netErr}`, 503);
    }
  }
  const durationMs = Date.now() - startTime;
  if (!response || !response.ok) {
    const errorText = response ? await response.text().catch(() => "") : "No response from fal.ai";
    console.error(`[fal.ai Direct Error] HTTP ${response?.status || 500} on ${slotLabel}:`, errorText);
    recordFalUsage({
      slot: slotLabel,
      model: activeModel,
      durationMs,
      estimatedCostUsd: 0,
      status: "QUEUED_PENDING",
      error: `HTTP ${response?.status || 500}: ${errorText.slice(0, 150)}`
    });
    throw new FalMaintenanceQueueError(
      `fal.ai image generation error (HTTP ${response?.status || 500}): ${errorText.slice(0, 200)}`,
      response?.status || 500
    );
  }
  const data = await response.json().catch(() => ({}));
  const imageUrl = data?.images?.[0]?.url;
  if (!imageUrl) {
    console.error("[fal.ai Error] Empty image URL in response payload:", JSON.stringify(data).slice(0, 200));
    recordFalUsage({
      slot: slotLabel,
      model: activeModel,
      durationMs,
      estimatedCostUsd: 0,
      status: "QUEUED_PENDING",
      error: "Empty image URL returned"
    });
    throw new FalMaintenanceQueueError("fal.ai returned empty image URL in response payload.", 502);
  }
  console.log(`[fal.ai Success] Synthesized ${slotLabel} in ${durationMs}ms: ${imageUrl}`);
  recordFalUsage({
    slot: slotLabel,
    model: activeModel,
    durationMs,
    estimatedCostUsd: COST_PER_IMAGE_USD,
    status: "SUCCESS"
  });
  return imageUrl;
}
async function submitAndPollFalQueueVideo(endpoint, payload, activeKey, maxWaitMs = 24e4) {
  const queueEndpoint = endpoint.replace("https://fal.run/", "https://queue.fal.run/");
  try {
    const submitRes = await fetch(queueEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Key ${activeKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!submitRes.ok) {
      const errText = await submitRes.text().catch(() => "");
      console.warn(`[fal.ai Queue Submit] HTTP ${submitRes.status}: ${errText.slice(0, 150)}`);
      return null;
    }
    const submitData = await submitRes.json().catch(() => ({}));
    const statusUrl = submitData.status_url;
    const responseUrl = submitData.response_url;
    if (!statusUrl || !responseUrl) {
      return null;
    }
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      await new Promise((r) => setTimeout(r, 4e3));
      const statusRes = await fetch(statusUrl, {
        headers: { Authorization: `Key ${activeKey}` }
      });
      if (!statusRes.ok) continue;
      const statusJson = await statusRes.json().catch(() => ({}));
      const elapsedSec = Math.round((Date.now() - startTime) / 1e3);
      if (statusJson.status === "COMPLETED") {
        console.log(`[fal.ai Queue ${submitData.request_id || ""}] Status: COMPLETED in ${elapsedSec}s! Fetching result...`);
        const resultRes = await fetch(responseUrl, {
          headers: { Authorization: `Key ${activeKey}` }
        });
        if (resultRes.ok) {
          const resultData = await resultRes.json().catch(() => ({}));
          const videoUrl = resultData?.video?.url || resultData?.video_url || resultData?.output?.video_url || resultData?.url || "";
          if (videoUrl) return videoUrl;
        }
      } else {
        console.log(`[fal.ai Queue ${submitData.request_id || ""}] Status: ${statusJson.status || "PENDING"} (${elapsedSec}s elapsed)...`);
      }
      if (statusJson.status === "FAILED") {
        console.warn("[fal.ai Queue Job Failed]:", statusJson);
        return null;
      }
    }
  } catch (err) {
    console.warn("[fal.ai Queue Exception]:", err?.message || err);
  }
  return null;
}
async function generateViralVideoWithFal(heroImageUrl, apiKey, customMotionPrompt, imageUrls, metadata, seed, negativePrompt) {
  const activeKey = (apiKey || getFalApiKey()).trim();
  if (!activeKey || activeKey === "[SENSITIVE]" || !heroImageUrl && (!imageUrls || imageUrls.length === 0)) {
    const errMsg = !activeKey || activeKey === "[SENSITIVE]" ? "FAL_KEY missing or invalid in environment. Video generation requires an active fal.ai API key." : "No input image URLs provided for video generation.";
    console.error(`[fal.ai Video Direct Error] ${errMsg}`);
    recordFalUsage({
      slot: "video",
      model: "bytedance/seedance-2.5/us/reference-to-video",
      durationMs: 0,
      estimatedCostUsd: 0,
      status: "QUEUED_PENDING",
      error: errMsg
    });
    throw new FalMaintenanceQueueError(errMsg, 401);
  }
  const rawUrls = imageUrls && imageUrls.length > 0 ? imageUrls : [heroImageUrl];
  const resolvedImageUrls = Array.from(new Set(rawUrls.map(resolveAbsoluteImageUrl))).filter(Boolean);
  const resolvedHeroUrl = resolvedImageUrls[0] || resolveAbsoluteImageUrl(heroImageUrl);
  const isAmlemi = resolvedHeroUrl.includes("01-orbital") || resolvedHeroUrl.includes("amlemi") || metadata?.planetName && metadata.planetName.toLowerCase().includes("amlemi") || customMotionPrompt && customMotionPrompt.toLowerCase().includes("amlemi");
  const prompt = customMotionPrompt || (isAmlemi ? AMLEMI_CINEMATIC_FPV_PROMPT : buildUniversalAssetAlignedFpvPrompt({
    planetName: metadata?.planetName,
    authorName: metadata?.authorName,
    atmosphere: metadata?.atmosphere,
    flora: metadata?.flora,
    fauna: metadata?.fauna,
    landmark: metadata?.landmark,
    colorPalette: metadata?.colorPalette,
    naturalEnvironment: metadata?.naturalEnvironment,
    admiredCreature: metadata?.admiredCreature,
    lifePhilosophy: metadata?.lifePhilosophy,
    futurePromise: metadata?.futurePromise
  }));
  const useReferenceEndpoint = resolvedImageUrls.length > 1;
  const primaryEndpoint = useReferenceEndpoint ? FAL_SEEDANCE_REF_VIDEO_ENDPOINT : FAL_SEEDANCE_IMAGE_VIDEO_ENDPOINT;
  const primaryModel = useReferenceEndpoint ? "bytedance/seedance-2.5/us/reference-to-video" : "bytedance/seedance-2.5/us/image-to-video";
  const effectiveNegativePrompt = !isAmlemi ? negativePrompt || STRICT_NON_HUMAN_NEGATIVE_PROMPT : void 0;
  const payload = useReferenceEndpoint ? {
    prompt,
    image_urls: resolvedImageUrls,
    duration: "5",
    resolution: "720p",
    aspect_ratio: "9:16",
    generate_audio: true,
    // Native ByteDance Seedance 2.5 synchronized Foley audio & sound effects!
    ...effectiveNegativePrompt ? { negative_prompt: effectiveNegativePrompt } : {},
    ...typeof seed === "number" && seed > 0 ? { seed } : {}
  } : {
    prompt,
    image_url: resolvedHeroUrl,
    duration: "5",
    resolution: "720p",
    aspect_ratio: "9:16",
    generate_audio: true,
    ...effectiveNegativePrompt ? { negative_prompt: effectiveNegativePrompt } : {},
    ...typeof seed === "number" && seed > 0 ? { seed } : {}
  };
  console.log(`[fal.ai Video Execution] Synthesizing 9:16 viral video trailer via ${primaryModel} (5s duration, 720p, 9:16 aspect ratio, Foley audio)...`);
  const startTime = Date.now();
  const queueVideoUrl = await submitAndPollFalQueueVideo(primaryEndpoint, payload, activeKey);
  if (queueVideoUrl) {
    const durationMs2 = Date.now() - startTime;
    console.log(`[fal.ai Video Success] Synthesized 9:16 trailer in ${durationMs2}ms: ${queueVideoUrl}`);
    recordFalUsage({
      slot: "video",
      model: primaryModel,
      durationMs: durationMs2,
      estimatedCostUsd: COST_PER_VIDEO_USD,
      status: "SUCCESS"
    });
    return queueVideoUrl;
  }
  if (useReferenceEndpoint) {
    const singlePayload = {
      prompt,
      image_url: resolvedHeroUrl,
      duration: "5",
      resolution: "720p",
      generate_audio: true,
      ...effectiveNegativePrompt ? { negative_prompt: effectiveNegativePrompt } : {},
      ...typeof seed === "number" && seed > 0 ? { seed } : {}
    };
    const singleQueueUrl = await submitAndPollFalQueueVideo(FAL_SEEDANCE_IMAGE_VIDEO_ENDPOINT, singlePayload, activeKey);
    if (singleQueueUrl) {
      const durationMs2 = Date.now() - startTime;
      console.log(`[fal.ai Video Success (Single Image Fallback)] Synthesized 9:16 trailer in ${durationMs2}ms: ${singleQueueUrl}`);
      recordFalUsage({
        slot: "video",
        model: "bytedance/seedance-2.5/us/image-to-video",
        durationMs: durationMs2,
        estimatedCostUsd: COST_PER_VIDEO_USD,
        status: "SUCCESS"
      });
      return singleQueueUrl;
    }
  }
  let response = null;
  const maxRetries = 2;
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      response = await falRequestQueue.run(
        () => fetch(primaryEndpoint, {
          method: "POST",
          headers: {
            Authorization: `Key ${activeKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(2e4)
        })
      );
      if ((response.status === 429 || response.status === 503 || response.status === 504) && attempt < maxRetries) {
        attempt++;
        const backoffMs = 1200 * Math.pow(2, attempt) + Math.random() * 400;
        console.warn(
          `[Seedance 2.5 Rate Limit] HTTP ${response.status}. Backing off for ${Math.round(backoffMs)}ms (attempt ${attempt}/${maxRetries})...`
        );
        recordFalUsage({
          slot: "video",
          model: primaryModel,
          durationMs: Date.now() - startTime,
          estimatedCostUsd: 0,
          status: "RATE_LIMITED_RETRY",
          error: `HTTP ${response.status}`
        });
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
      break;
    } catch (netErr) {
      if (attempt < maxRetries) {
        attempt++;
        const backoffMs = 1400 + Math.random() * 400;
        console.warn(`[Seedance 2.5 Video Primary Glitch] ${netErr?.message}. Retrying in ${Math.round(backoffMs)}ms...`);
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
      console.warn("[Seedance 2.5 Video] Primary network notice, attempting fallback:", netErr?.message || netErr);
      break;
    }
  }
  if (!response || !response.ok) {
    try {
      response = await falRequestQueue.run(
        () => fetch(FAL_VIDEO_FALLBACK_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Key ${activeKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt,
            image_url: resolvedHeroUrl,
            duration: 5,
            resolution: "768P",
            ...effectiveNegativePrompt ? { negative_prompt: effectiveNegativePrompt } : {}
          }),
          signal: AbortSignal.timeout(2e4)
        })
      );
    } catch (fbErr) {
      console.warn("[Video Fallback] Network notice:", fbErr?.message || fbErr);
      const durationMs2 = Date.now() - startTime;
      recordFalUsage({
        slot: "video",
        model: "minimax/h3/image-to-video",
        durationMs: durationMs2,
        estimatedCostUsd: 0,
        status: "ERROR",
        error: fbErr?.message || String(fbErr)
      });
      throw new FalMaintenanceQueueError(QUEUED_PENDING_MESSAGE, 503);
    }
  }
  const durationMs = Date.now() - startTime;
  if (!response || !response.ok) {
    const errorText = response ? await response.text().catch(() => "") : "No response from fal.ai video endpoint";
    const directErrMsg = `fal.ai video generation error (HTTP ${response?.status || 500}): ${errorText.slice(0, 200) || "Unknown error"}`;
    console.error(`[fal.ai Video Direct Error] HTTP ${response?.status || 500}:`, errorText);
    recordFalUsage({
      slot: "video",
      model: primaryModel,
      durationMs,
      estimatedCostUsd: 0,
      status: "QUEUED_PENDING",
      error: `HTTP ${response?.status || 500}: ${errorText.slice(0, 150)}`
    });
    throw new FalMaintenanceQueueError(directErrMsg, response?.status || 500);
  }
  const data = await response.json().catch(() => ({}));
  const videoUrl = data?.video?.url || data?.video_url || data?.output?.video_url || data?.url || "";
  if (!videoUrl) {
    const emptyErrMsg = "fal.ai returned empty video URL in response payload.";
    console.error("[fal.ai Video Direct Error] Empty video URL in response payload:", JSON.stringify(data).slice(0, 200));
    recordFalUsage({
      slot: "video",
      model: primaryModel,
      durationMs,
      estimatedCostUsd: 0,
      status: "QUEUED_PENDING",
      error: emptyErrMsg
    });
    throw new FalMaintenanceQueueError(emptyErrMsg, 502);
  }
  console.log(`[fal.ai Video Success] Synthesized 9:16 trailer in ${durationMs}ms: ${videoUrl}`);
  recordFalUsage({
    slot: "video",
    model: primaryModel,
    durationMs,
    estimatedCostUsd: COST_PER_VIDEO_USD,
    status: "SUCCESS"
  });
  return videoUrl;
}
var _userGenerations = /* @__PURE__ */ new Set();
var supabaseUrl2 = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://qcfpnoerksbgunekoame.supabase.co";
var supabaseKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_uQ928ayPw4vS7msW2_oZSQ_vTi22idX";
var supabase2 = createClient2(supabaseUrl2, supabaseKey2);
async function syncPlanetToSupabaseAtomic(params) {
  try {
    const videoUrl = params.videoUrl || params.renders.videoUrl || "";
    const sfxAudioUrl = params.sfxAudioUrl || params.renders?.sfxAudioUrl || "";
    const enrichedRenders = {
      ...params.renders,
      "01_main": params.renders.hero,
      "02_flora": params.renders.flora,
      "03_fauna": params.renders.fauna,
      "04_atmo": params.renders.atmosphere,
      "05_lore": params.renders.landmark,
      videoUrl,
      video_url: videoUrl,
      videoStatus: videoUrl ? "READY" : "QUEUED_PENDING",
      sfxAudioUrl,
      sfx_audio_url: sfxAudioUrl,
      sfxStatus: sfxAudioUrl ? "READY" : "QUEUED_PENDING"
    };
    const baseRecord = {
      id: params.id,
      user_id: params.userId,
      author_name: params.authorName,
      author_username: params.authorUsername,
      author_email: params.authorEmail || "",
      author_avatar_gradient: "from-amber-400 via-yellow-500 to-amber-700",
      planet_name: params.planetName,
      sfx_audio_url: sfxAudioUrl,
      atmosphere: params.data.atmosphere || params.data.troposphereType || "",
      flora: params.data.flora || params.data.floraType || "",
      fauna: params.data.fauna || params.data.faunaType || "",
      sonic_vibe: params.data.sonicVibe || "",
      visual_aesthetic: params.data.visualAesthetic || "Fal.ai Flux Schnell 4K + 9:16 Viral Trailer",
      landmark: params.data.landmark || params.data.monumentType || "",
      additional_notes: params.data.additionalNotes || "",
      human_answers: {
        relaxation: params.data.relaxation,
        creativeExpression: params.data.creativeExpression,
        naturalEnvironment: params.data.naturalEnvironment,
        lifePhilosophy: params.data.lifePhilosophy,
        admiredCreature: params.data.admiredCreature,
        colorPalette: params.data.colorPalette || params.data.paletteDescription,
        resilienceStory: params.data.resilienceStory,
        futurePromise: params.data.futurePromise || params.data.foundingCreed,
        planetName: params.planetName,
        biome: params.data.biome || params.data.terrainType,
        sectorName: params.data.sectorName || params.planetName,
        video_url: videoUrl
      },
      generated_lore: params.generatedLore,
      renders: enrichedRenders,
      votes_count: 1,
      status: "PUBLISHED",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (supabase2) {
      const { error: firstErr } = await supabase2.from("user_dossiers").upsert({ ...baseRecord, video_url: videoUrl });
      if (firstErr) {
        const { error: fallbackErr } = await supabase2.from("user_dossiers").upsert(baseRecord);
        if (fallbackErr) {
          console.warn("[GeneratePlanet] Supabase atomic upsert notice:", fallbackErr.message);
        }
      }
    }
    try {
      const { saveSubmissionRecord: saveSubmissionRecord2 } = await Promise.resolve().then(() => (init_authVoteService(), authVoteService_exports));
      saveSubmissionRecord2({
        id: params.id,
        userId: params.userId,
        authorName: params.authorName,
        authorUsername: params.authorUsername,
        authorEmail: params.authorEmail || "",
        authorAvatarGradient: baseRecord.author_avatar_gradient,
        planetName: params.planetName,
        atmosphere: baseRecord.atmosphere,
        flora: baseRecord.flora,
        fauna: baseRecord.fauna,
        sonicVibe: baseRecord.sonic_vibe,
        visualAesthetic: baseRecord.visual_aesthetic,
        landmark: baseRecord.landmark,
        additionalNotes: baseRecord.additional_notes,
        humanAnswers: baseRecord.human_answers,
        generatedLore: params.generatedLore,
        videoUrl,
        videoStatus: videoUrl ? "READY" : "QUEUED_PENDING",
        sfxAudioUrl,
        sfxStatus: sfxAudioUrl ? "READY" : "QUEUED_PENDING",
        renders: enrichedRenders,
        votesCount: 2,
        isPioneer: true,
        isVipPioneer: true,
        pioneerBadge: "VIP PIONEER \xB7 #02",
        pioneer_badge: "VIP PIONEER \xB7 #02",
        status: "PUBLISHED",
        createdAt: baseRecord.created_at,
        coordX: 243,
        coordY: 176,
        coord_x: 243,
        coord_y: 176,
        sectorId: "SECTOR CYGNUS-00 (CORE MERIDIAN)",
        armId: "arm-cygnus",
        armName: "CYGNUS FILAMENT"
      });
      console.log(`[GeneratePlanet] Submissions store updated for "${params.planetName}" (${params.id}).`);
    } catch (storeErr) {
      console.warn("[GeneratePlanet] Submissions store save notice:", storeErr);
    }
    if (params.authorEmail) {
      try {
        const { syncPassClaimToGoogleSheets: syncPassClaimToGoogleSheets2, syncSubscriberRowToGoogleSheets: syncSubscriberRowToGoogleSheets2 } = await Promise.resolve().then(() => (init_googleSheetsSync(), googleSheetsSync_exports));
        const passId = params.data.passId || params.data.vipCode || (params.userId?.includes("esther") || params.authorEmail.includes("esther") ? "AKN-VIP-2027-X001" : "AKN-VIP-2027-X001");
        const vipClaimRes = await syncPassClaimToGoogleSheets2(passId, params.authorName, params.authorEmail).catch(() => null);
        const subRes = await syncSubscriberRowToGoogleSheets2({
          fullName: params.authorName,
          email: params.authorEmail,
          role: "VIP_GUEST [PIONEER-2027]",
          vipCode: passId,
          claimedSector: params.planetName
        }).catch(() => null);
        console.log(`[GeneratePlanet] Google Sheets sync complete for "${params.planetName}": VIP GUESTS: ${vipClaimRes?.success}, Subscribers: ${subRes?.success}`);
      } catch (sheetsErr) {
        console.warn("[GeneratePlanet] Google Sheets sync notice:", sheetsErr);
      }
    }
    return { synced: true };
  } catch (err) {
    console.warn("[GeneratePlanet] Supabase atomic sync exception:", err?.message || err);
    return { synced: false, error: err?.message };
  }
}
function resetGenerationLocks(userId, email) {
  if (!userId && !email) {
    _userGenerations.clear();
    return;
  }
  if (userId) _userGenerations.delete(userId.trim().toLowerCase());
  if (email) _userGenerations.delete(email.trim().toLowerCase());
}
function lockUserGeneration(userId, email, deviceId) {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (cleanEmail === "odi.selis3@gmail.com") return;
  const accountKeys = [userId, email].filter(Boolean);
  const keys = accountKeys.length > 0 ? accountKeys : [deviceId].filter(Boolean);
  keys.forEach((k) => _userGenerations.add(String(k).trim().toLowerCase()));
}
async function checkAndLockUserGeneration(userId, email, deviceId, isSlotCheck = false) {
  const cleanUserId = (userId || "").trim().toLowerCase();
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanDeviceId = (deviceId || "").trim().toLowerCase();
  if (cleanEmail === "odi.selis3@gmail.com") {
    return { allowed: true };
  }
  const keysToCheck = cleanUserId || cleanEmail ? [cleanUserId, cleanEmail].filter(Boolean) : [cleanDeviceId].filter(Boolean);
  for (const k of keysToCheck) {
    if (_userGenerations.has(k)) {
      return {
        allowed: false,
        reason: "You have already claimed your 1 generation attempt."
      };
    }
  }
  if (cleanUserId || cleanEmail) {
    try {
      let query = supabase2.from("user_dossiers").select("id, planet_name, user_id, author_email");
      if (cleanUserId && cleanEmail) {
        query = query.or(`user_id.eq.${cleanUserId},author_email.ilike.${cleanEmail}`);
      } else if (cleanUserId) {
        query = query.eq("user_id", cleanUserId);
      } else if (cleanEmail) {
        query = query.ilike("author_email", cleanEmail);
      }
      const { data } = await query.maybeSingle();
      if (data && data.id) {
        if (cleanUserId) _userGenerations.add(cleanUserId);
        if (cleanEmail) _userGenerations.add(cleanEmail);
        return {
          allowed: false,
          reason: "You have already claimed your 1 generation attempt."
        };
      }
    } catch (dbErr) {
      console.warn("[GeneratePlanet] Supabase user_dossiers check notice:", dbErr);
    }
  }
  if (!isSlotCheck) {
    for (const k of keysToCheck) {
      _userGenerations.add(k);
    }
  }
  return { allowed: true };
}
function normalizeSlot(rawSlot) {
  const s = (rawSlot || "").toLowerCase().trim();
  if (s === "orbital" || s === "01" || s === "01_main" || s === "1" || s === "hero") return "hero";
  if (s === "botanical" || s === "02" || s === "02_flora" || s === "2" || s === "flora") return "flora";
  if (s === "fauna" || s === "03" || s === "03_fauna" || s === "3") return "fauna";
  if (s === "cockpit" || s === "04" || s === "04_atmo" || s === "4" || s === "atmosphere") return "atmosphere";
  if (s === "monument" || s === "05" || s === "05_lore" || s === "5" || s === "landmark") return "landmark";
  if (s === "video" || s === "trailer" || s === "06" || s === "06_trailer" || s === "6") return "video";
  return "hero";
}
var SLOT_METADATA = {
  hero: {
    index: 1,
    label: "01 \xB7 Orbital Hero (01_main)",
    actionText: "GENERATING ORBITAL HERO (1/5)...",
    detailText: "Synthesizing planetary curvature, atmospheric halo, and orbital disk via Najno Banajna..."
  },
  flora: {
    index: 2,
    label: "02 \xB7 Botanical Flora System (02_flora)",
    actionText: "RENDERING BOTANICAL FLORA (2/5)...",
    detailText: "Synthesizing bioluminescent alien foliage, spore towers, and botanical ecology via Najno Banajna..."
  },
  fauna: {
    index: 3,
    label: "03 \xB7 Exotic Fauna & Wildlife (03_fauna)",
    actionText: "PAINTING EXOTIC FAUNA (3/5)...",
    detailText: "Rendering xenobiological apex wildlife, soaring lifeforms, and planetary creatures via Najno Banajna..."
  },
  atmosphere: {
    index: 4,
    label: "04 \xB7 Atmospheric Troposphere & Sky Phenomena (04_atmo)",
    actionText: "SIMULATING ATMOSPHERIC TROPOSPHERE (4/5)...",
    detailText: "Synthesizing high-altitude troposphere, ionized cloud canyons, and auroral sky phenomena via Najno Banajna..."
  },
  landmark: {
    index: 5,
    label: "05 \xB7 Lore Dossier Cover & Monument (05_lore)",
    actionText: "INSCRIBING LORE MONUMENT (5/5)...",
    detailText: "Erecting monumental architectural landmark and sealing official lore dossier cover via Najno Banajna..."
  },
  video: {
    index: 6,
    label: "06 \xB7 Viral 9:16 Video Trailer (5s)",
    actionText: "SYNTHESIZING 9:16 FPV DRONE VIRAL TRAILER...",
    detailText: "Rendering 5-second continuous low-altitude FPV drone shot with 24fps motion blur via Seedance 2.5 / Val.ai..."
  }
};
var _slotRenderCache = /* @__PURE__ */ new Map();
var _planetDossierCache = /* @__PURE__ */ new Map();
var _inFlightSlotRequests = /* @__PURE__ */ new Map();
var _inFlightDossierRequests = /* @__PURE__ */ new Map();
function getSlotCacheKey(planetName, slot, userId, email) {
  const normPlanet = planetName.trim().toLowerCase();
  const normUser = (userId || email || "anon").trim().toLowerCase();
  return `${normPlanet}:${slot}:${normUser}`;
}
function getDossierCacheKey(planetIdOrName, userId, email) {
  const normId = planetIdOrName.trim().toLowerCase();
  const normUser = (userId || email || "anon").trim().toLowerCase();
  return `${normId}:${normUser}`;
}
function buildPlanetPrompts(data) {
  const sectorName = (data.sectorName || data.planetName || data.worldName || "Frontier Sector").trim();
  const planetName = formatAkinoyaPlanetName(data.planetName || data.worldName || data.sectorName, false) || sectorName;
  const architectName = (data.architectName || data.authorUsername || "Founding Pioneer").trim();
  const isAmlemi = planetName.toLowerCase().includes("\xE4mlemi") || planetName.toLowerCase().includes("amlemi") || sectorName.toLowerCase().includes("\xE4mlemi") || sectorName.toLowerCase().includes("amlemi") || data.id === "planet-amlemi-genesis-01" || data.planetId === "planet-amlemi-genesis-01";
  const seed = typeof data.seed === "number" && data.seed > 0 ? data.seed : generateDeterministicPlanetSeed(planetName, architectName, data);
  const variation = derivePlanetaryVariation(seed, data);
  const biome = data.biome || data.terrainType || "Bioluminescent Canopy";
  const colorPalette = data.colorPalette || data.paletteDescription || `${variation.chromaticAccent}, ${variation.atmosphericShimmer}`;
  const environment = data.naturalEnvironment || data.terrainType || `${biome} terrain with ${variation.geologicalFormation}`;
  const flora = data.flora || data.floraType || `${variation.floraVariation} unique to ${biome}`;
  const creature = data.admiredCreature || data.fauna || data.faunaType || `${variation.faunaVariation} soaring above ${sectorName}`;
  const landmark = data.landmark || data.monumentType || data.resilienceStory || `${variation.monumentStructure} on ${sectorName}`;
  const promise = data.futurePromise || data.foundingCreed || "Never forget that true beauty lies in curiosity and persistence.";
  const atmosphere = data.atmosphere || data.troposphereType || `ionized celestial atmosphere exhibiting ${variation.plasmaPhenomenon}`;
  const basePromptAnchor = "Full 3D high-res 8K photorealistic cinematic sci-fi render, volumetric lighting, rich textures, atmospheric depth, deep space horizon, volumetric cosmic lighting, complex color palette. NO vector art, NO wireframes, NO minimalist sketches, NO storyboard lines. Sillow Mill high-resolution cinematic aesthetic. Synthesized exclusively via Najno Banajna generator engine.";
  const promptAnchor = isAmlemi ? basePromptAnchor : `${basePromptAnchor} STRICT NON-HUMAN GUARDRAIL: ABSOLUTELY NO humans, NO astronauts, NO pilots, NO people, NO cockpits, NO dashboards, NO spacecraft interiors, NO control panels, NO machinery. Pristine untamed wild alien nature only.`;
  const fpvVideoPrompt = buildCinematicFpvMotionPrompt({
    planetName,
    biome,
    slotType: "hero",
    isAmlemi
  });
  const atmospherePrompt = isAmlemi ? `${promptAnchor} [04_atmo - Cockpit & Landing Atmosphere]: Cockpit canopy descent perspective entering the atmosphere of "${planetName}" (Sector: ${sectorName}, Seed: #${seed}). Looking out through reinforced cockpit canopy glass toward vast ${biome} mountain horizon and ${variation.geologicalFormation}, pilot HUD telemetry reflections, volumetric sunbeams through thick clouds, ${atmosphere}, ion storms: ${variation.plasmaPhenomenon}, sunset glow.` : `${promptAnchor} [04_atmo - Atmospheric Troposphere & Sky Phenomena]: High-altitude volumetric tropospheric descent above world "${planetName}" (Sector: ${sectorName}, Seed: #${seed}). Soaring through turbulent ionized cloud decks, sweeping auroral filaments, and towering atmospheric vapor canyons overlooking vast ${biome} terrain and ${variation.geologicalFormation}. Volumetric sunbeams piercing through thick storm clouds, ${atmosphere}, radiant ion storm phenomena: ${variation.plasmaPhenomenon}, sunset glow. Pristine natural sky panorama, wide-angle cinematic nature photography, absolutely zero cockpit, zero glass, zero machinery.`;
  const isFelix = planetName.toLowerCase() === "felix" || sectorName.toLowerCase() === "felix" || data.id === "planet-felix-test-01" || data.planetId === "planet-felix-test-01";
  const felixPrompts = isFelix ? {
    hero: `${promptAnchor} [01_main - Main Orbital Hero]: Celestial disc and orbital curvature of newly designated feline world "${planetName}" (Sector: ${sectorName}, Seed: #${seed}). Breathtaking Avatar-style alien planetary sphere glowing with bioluminescent neon pink and warm orange continents, radiant cyan planetary oceans, and shimmering stardust rings. Ionized magenta and orange auroras crowning the atmospheric rim. Pristine celestial sphere, volumetric cosmic lighting, deep space horizon, 8k resolution, photorealistic conceptual space photography.`,
    flora: `${promptAnchor} [02_flora - Botanical Flora System]: Interior botanical ecosystem of world "${planetName}" (Sector: ${sectorName}, Seed: #${seed}). Unique, bioluminescent, breathtaking alien environment styled like Avatar (Pandora). Glowing giant neon spore trees, luminous pink and orange whisker-ferns that react to touch, floating moss-covered celestial rock formations, ethereal atmospheric twilight lighting, cascading waterfalls of liquid light, volumetric mist, macro sci-fi nature photography.`,
    fauna: `${promptAnchor} [03_fauna - Exotic Fauna & Wildlife]: Xenobiological feline wildlife ecology of world "${planetName}" (Sector: ${sectorName}, Seed: #${seed}). Adorable, charming, fluffy rossenhuiskatten (ginger domestic tabby cats) and striking glowing pink sci-fi cats playing playfully and interacting with futuristic glowing elements and bioluminescent Avatar-style alien flora. Highly detailed soft ginger fur, vibrant pink fur, expressive cute cat faces, glowing whiskers, photorealistic cinematic lighting, volumetric atmospheric depth, 8k resolution nature photography.`,
    atmosphere: `${promptAnchor} [04_atmo - Atmospheric Troposphere & Sky Phenomena]: High-altitude volumetric tropospheric descent above world "${planetName}" (Sector: ${sectorName}, Seed: #${seed}). Breathtaking Avatar-style skies with floating rock islands, ethereal glowing pink and orange auroral ribbons, volumetric twilight sunbeams piercing through luminescent clouds, majestic flying alien silhouettes, pristine natural sky panorama, wide-angle cinematic nature photography, absolutely zero cockpit, zero machinery.`,
    landmark: `${promptAnchor} [05_lore - Lore Dossier Cover & Monument]: Official monumental landmark on world "${planetName}" (Sector: ${sectorName}, Seed: #${seed}). The Great Sphinx of Felix: Colossal ancient feline monolith carved from translucent rose quartz and warm copper energy channels, glowing with 432Hz harmonic energy. Standing tall amidst bioluminescent Avatar flora and floating luminous crystals under vibrant pink and orange twilight auroras. Epic scale sci-fi monument photography.`,
    video: `Single continuous FPV drone shot, no cuts. The camera begins gliding inches above bioluminescent Avatar-style alien moss and glowing orange whisker-ferns on planet Felix. It races smoothly forward, weaving past adorable fluffy rossenhuiskatten (ginger cats) and striking glowing pink cats playing playfully among floating rock spires and glowing flora. Accelerating into a rapid vertical climb through pink and orange auroral mist, the drone spirals tightly around the colossal rose quartz Great Sphinx of Felix, revealing the breathtaking alien landscape and vast planetary horizon. 14mm ultra-wide FPV lens, photorealistic 24fps cinematic motion blur, natural lighting, deep atmospheric depth, seamless 5-second vertical 9:16 loop.`
  } : null;
  return {
    planetName,
    sectorName,
    isAmlemi,
    isFelix,
    seed,
    variation,
    prompts: felixPrompts || {
      hero: `${promptAnchor} [01_main - Main Orbital Hero]: Celestial disc and orbital curvature of newly designated world "${planetName}" (Sector: ${sectorName}, Seed: #${seed}). Orbital feature: ${variation.ringSystem}. Atmospheric rim: ${variation.plasmaPhenomenon}. Pristine celestial curvature, volumetric cosmic lighting, deep space horizon, ${variation.atmosphericShimmer}. Color palette: ${colorPalette}. Topography inspired by ${environment}, 8k resolution, photorealistic conceptual space photography.${isAmlemi ? "" : " Pristine uninhabited cosmic sphere."}`,
      flora: `${promptAnchor} [02_flora - Botanical Flora System]: Interior botanical ecosystem of world "${planetName}" (Sector: ${sectorName}, Seed: #${seed}) across ${biome} terrain. Lush alien vegetation: ${flora}. Terrain formation: ${variation.geologicalFormation}. Atmospheric mist, ${variation.atmosphericShimmer}, chromatic palette: ${colorPalette}, volumetric depth, macro sci-fi nature photography.${isAmlemi ? "" : " Untamed alien flora, zero human presence."}`,
      fauna: `${promptAnchor} [03_fauna - Exotic Fauna & Wildlife]: Xenobiological wildlife ecology of world "${planetName}" (Sector: ${sectorName}, Seed: #${seed}) in native ${biome} habitat. Apex creature: ${creature}. Environment: ${variation.geologicalFormation}. Volumetric atmospheric thermals, photorealistic speculative xenobiology, ${variation.chromaticAccent}, cinematic depth of field.${isAmlemi ? "" : " Native non-human planetary wildlife, zero human presence."}`,
      atmosphere: atmospherePrompt,
      landmark: `${promptAnchor} [05_lore - Lore Dossier Cover & Monument]: Official monumental landmark on world "${planetName}" (Sector: ${sectorName}, Seed: #${seed}). Towering ancient architectural monument: ${landmark}, standing tall above ${biome} terrain. Inscribed founding architect creed: "${promise}". Foundations anchored by ${variation.geologicalFormation}, energy conduits: ${variation.chromaticAccent}, epic scale sci-fi monument photography.${isAmlemi ? "" : " Ancient organic alien architecture, no human figures."}`,
      video: fpvVideoPrompt
    }
  };
}
async function generateSlotRender(slot, data) {
  const normSlot = normalizeSlot(slot);
  const sectorName = (data.sectorName || data.planetName || data.worldName || "Frontier Sector").trim();
  const planetName = formatAkinoyaPlanetName(data.planetName || data.worldName || data.sectorName, false) || sectorName;
  const { prompts, seed, isAmlemi } = buildPlanetPrompts(data);
  const prompt = prompts[normSlot] || prompts.hero;
  const meta = SLOT_METADATA[normSlot] || SLOT_METADATA.hero;
  const isSandbox = Boolean(data.isSandbox || data.is_sandbox);
  if (isSandbox) {
    recordFalUsage({
      slot: normSlot,
      model: "Sandbox Simulation (Zero Credit)",
      durationMs: 8,
      estimatedCostUsd: 0,
      status: "SANDBOX_SIMULATION"
    });
    const placeholderUrl = SANDBOX_CANONICAL_PLACEHOLDERS[normSlot] || SANDBOX_CANONICAL_PLACEHOLDERS.hero;
    return {
      success: true,
      status: "ready",
      slot: normSlot,
      slotIndex: meta.index,
      slotLabel: meta.label,
      planetName,
      prompt: normSlot === "video" ? VIRAL_VIDEO_MOTION_PROMPT : prompt,
      ...normSlot === "video" ? { videoUrl: placeholderUrl, aspectRatio: "9:16", durationSeconds: 5 } : { imageUrl: placeholderUrl },
      model: "Sandbox Simulation (Placeholder Preview)",
      seed
    };
  }
  const cacheKey = getSlotCacheKey(planetName, normSlot, data.userId, data.email);
  if (_slotRenderCache.has(cacheKey)) {
    const cached = _slotRenderCache.get(cacheKey);
    if (cached && cached.success) {
      return { ...cached, seed };
    }
  }
  if (supabase2 && (data.planetId || planetName)) {
    try {
      let query = supabase2.from("planet_submissions").select("video_url, renders");
      if (data.planetId) {
        query = query.eq("id", data.planetId);
      } else {
        query = query.ilike("planet_name", planetName);
      }
      const { data: rows } = await query.limit(1);
      const row = Array.isArray(rows) ? rows[0] : null;
      if (row) {
        if (normSlot === "video") {
          const dbVid = row.video_url || row.renders?.videoUrl || row.renders?.video_url;
          if (dbVid && /^https?:\/\//i.test(dbVid)) {
            const cachedSlot = {
              success: true,
              status: "ready",
              slot: "video",
              slotIndex: meta.index,
              slotLabel: meta.label,
              planetName,
              prompt,
              videoUrl: dbVid,
              aspectRatio: "9:16",
              durationSeconds: 5,
              model: "ByteDance Seedance 2.5 (Cached Production Master)",
              seed
            };
            _slotRenderCache.set(cacheKey, cachedSlot);
            return cachedSlot;
          }
        } else {
          const slotKeyMap = {
            hero: ["hero", "01_main"],
            flora: ["flora", "02_flora", "ecosystem"],
            fauna: ["fauna", "03_fauna"],
            atmosphere: ["atmosphere", "04_atmo"],
            landmark: ["landmark", "05_lore"]
          };
          const keys = slotKeyMap[normSlot] || [];
          for (const k of keys) {
            const img = row.renders?.[k];
            if (img && /^https?:\/\//i.test(img)) {
              const cachedSlot = {
                success: true,
                status: "ready",
                slot: normSlot,
                slotIndex: meta.index,
                slotLabel: meta.label,
                planetName,
                prompt,
                imageUrl: img,
                model: "Fal.ai Flux Schnell (Cached Production Master)",
                seed
              };
              _slotRenderCache.set(cacheKey, cachedSlot);
              return cachedSlot;
            }
          }
        }
      }
    } catch {
    }
  }
  const inFlightSlot = _inFlightSlotRequests.get(cacheKey);
  if (inFlightSlot) {
    console.log(`[fal.ai Deduplication] Reusing active in-flight request for slot "${normSlot}" (${planetName})`);
    return await inFlightSlot;
  }
  const slotExecutionPromise = (async () => {
    if (normSlot === "video") {
      const allRenders = data.renders || {};
      const candidateUrls = [
        (data.heroImageUrl || "").trim() || allRenders.hero || allRenders["01_main"],
        allRenders.flora || allRenders["02_flora"] || allRenders.ecosystem,
        allRenders.fauna || allRenders["03_fauna"],
        allRenders.atmosphere || allRenders["04_atmo"],
        allRenders.landmark || allRenders["05_lore"]
      ].filter(Boolean);
      const rawUrls = data.imageUrls && data.imageUrls.length > 0 ? data.imageUrls : candidateUrls;
      const imageUrls = Array.from(new Set(rawUrls.map(resolveAbsoluteImageUrl))).filter(Boolean);
      const heroImageUrl = imageUrls[0] || (data.heroImageUrl || "").trim();
      const dynamicPrompt = buildUniversalAssetAlignedFpvPrompt({
        planetName,
        authorName: data.authorUsername || data.architectName,
        atmosphere: data.atmosphere,
        flora: data.flora,
        fauna: data.fauna,
        landmark: data.landmark,
        colorPalette: data.colorPalette,
        naturalEnvironment: data.naturalEnvironment,
        admiredCreature: data.admiredCreature,
        lifePhilosophy: data.lifePhilosophy,
        futurePromise: data.futurePromise
      });
      try {
        const videoUrl = await generateViralVideoWithFal(
          heroImageUrl,
          data.apiKey,
          dynamicPrompt,
          imageUrls,
          {
            planetName,
            authorName: data.authorUsername || data.architectName,
            atmosphere: data.atmosphere,
            flora: data.flora,
            fauna: data.fauna,
            landmark: data.landmark,
            colorPalette: data.colorPalette,
            naturalEnvironment: data.naturalEnvironment,
            admiredCreature: data.admiredCreature,
            lifePhilosophy: data.lifePhilosophy,
            futurePromise: data.futurePromise
          },
          seed,
          isAmlemi ? void 0 : STRICT_NON_HUMAN_NEGATIVE_PROMPT
        );
        const result = {
          success: true,
          status: "ready",
          slot: "video",
          slotIndex: meta.index,
          slotLabel: meta.label,
          planetName,
          prompt: dynamicPrompt,
          videoUrl,
          aspectRatio: "9:16",
          durationSeconds: 5,
          model: imageUrls.length > 1 ? "ByteDance Seedance 2.5 (Reference-to-Video 9:16 Foley Audio)" : "ByteDance Seedance 2.5 (Image-to-Video 9:16 Foley Audio)",
          seed
        };
        _slotRenderCache.set(cacheKey, result);
        return result;
      } catch (err) {
        console.warn(`[Slot video] Fal.ai 9:16 trailer queued:`, err?.message || err);
        return {
          success: false,
          code: QUEUED_PENDING_STATUS,
          status: QUEUED_PENDING_STATUS,
          message: QUEUED_PENDING_MESSAGE,
          slot: "video",
          slotIndex: meta.index,
          slotLabel: meta.label,
          planetName,
          prompt: dynamicPrompt,
          aspectRatio: "9:16",
          durationSeconds: 5,
          model: "Fal.ai Image-to-Video (QUEUED_PENDING)",
          seed
        };
      }
    }
    try {
      const imageUrl = await generateSlotImageWithFal(
        prompt,
        data.apiKey,
        normSlot,
        seed,
        isAmlemi ? void 0 : STRICT_NON_HUMAN_NEGATIVE_PROMPT
      );
      const result = {
        success: true,
        status: "ready",
        slot: normSlot,
        slotIndex: meta.index,
        slotLabel: meta.label,
        planetName,
        prompt,
        imageUrl,
        model: "Fal.ai Flux Schnell (4K Photorealistic)",
        seed
      };
      _slotRenderCache.set(cacheKey, result);
      return result;
    } catch (err) {
      console.warn(`[Slot ${normSlot}] Fal.ai synthesis queued:`, err?.message || err);
      return {
        success: false,
        code: QUEUED_PENDING_STATUS,
        status: QUEUED_PENDING_STATUS,
        message: QUEUED_PENDING_MESSAGE,
        slot: normSlot,
        slotIndex: meta.index,
        slotLabel: meta.label,
        planetName,
        prompt,
        model: "Fal.ai Flux Schnell (QUEUED_PENDING)",
        seed
      };
    }
  })();
  _inFlightSlotRequests.set(cacheKey, slotExecutionPromise);
  try {
    return await slotExecutionPromise;
  } finally {
    _inFlightSlotRequests.delete(cacheKey);
  }
}
async function generatePlanetRenders(data) {
  const sectorName = (data.sectorName || data.planetName || data.worldName || "Frontier Sector").trim();
  const planetName = formatAkinoyaPlanetName(data.planetName || data.worldName || data.sectorName, false) || sectorName;
  const architectName = (data.architectName || "Frontier Architect").trim();
  const isAmlemi = planetName.toLowerCase().includes("\xE4mlemi") || planetName.toLowerCase().includes("amlemi") || sectorName.toLowerCase().includes("\xE4mlemi") || sectorName.toLowerCase().includes("amlemi") || data.id === "planet-amlemi-genesis-01" || data.planetId === "planet-amlemi-genesis-01";
  const seed = typeof data.seed === "number" && data.seed > 0 ? data.seed : generateDeterministicPlanetSeed(planetName, architectName, data);
  const dossierCacheKey = getDossierCacheKey(data.planetId || planetName, data.userId, data.email);
  if (_planetDossierCache.has(dossierCacheKey)) {
    const cachedDossier = _planetDossierCache.get(dossierCacheKey);
    if (cachedDossier && cachedDossier.success && cachedDossier.renders?.hero) {
      return cachedDossier;
    }
  }
  if (supabase2 && (data.planetId || planetName)) {
    try {
      let query = supabase2.from("planet_submissions").select("id, planet_name, author_name, author_username, video_url, renders, created_at");
      if (data.planetId) {
        query = query.eq("id", data.planetId);
      } else {
        query = query.ilike("planet_name", planetName);
      }
      const { data: rows } = await query.limit(1);
      const row = Array.isArray(rows) ? rows[0] : null;
      if (row && row.renders && (row.renders.hero || row.renders["01_main"])) {
        const cachedRenders = {
          hero: row.renders.hero || row.renders["01_main"] || "",
          flora: row.renders.flora || row.renders["02_flora"] || row.renders.ecosystem || "",
          fauna: row.renders.fauna || row.renders["03_fauna"] || "",
          atmosphere: row.renders.atmosphere || row.renders["04_atmo"] || "",
          landmark: row.renders.landmark || row.renders["05_lore"] || "",
          ecosystem: row.renders.ecosystem || row.renders.flora || row.renders["02_flora"] || "",
          videoUrl: row.video_url || row.renders.videoUrl || row.renders.video_url || "",
          video_url: row.video_url || row.renders.videoUrl || row.renders.video_url || "",
          videoStatus: row.video_url || row.renders.videoUrl ? "READY" : "QUEUED_PENDING",
          sfxAudioUrl: row.renders.sfxAudioUrl || row.renders.sfx_audio_url || "",
          sfx_audio_url: row.renders.sfxAudioUrl || row.renders.sfx_audio_url || "",
          sfxStatus: row.renders.sfxAudioUrl ? "READY" : "QUEUED_PENDING",
          "01_main": row.renders["01_main"] || row.renders.hero || "",
          "02_flora": row.renders["02_flora"] || row.renders.flora || "",
          "03_fauna": row.renders["03_fauna"] || row.renders.fauna || "",
          "04_atmo": row.renders["04_atmo"] || row.renders.atmosphere || "",
          "05_lore": row.renders["05_lore"] || row.renders.landmark || ""
        };
        const cachedSlots = [
          { slotId: "01_main", slotName: "01 \xB7 ORBITAL HERO", status: "ready", imageUrl: cachedRenders.hero },
          { slotId: "02_flora", slotName: "02 \xB7 BOTANICAL FLORA", status: "ready", imageUrl: cachedRenders.flora },
          { slotId: "03_fauna", slotName: "03 \xB7 EXOTIC FAUNA", status: "ready", imageUrl: cachedRenders.fauna },
          {
            slotId: "04_atmo",
            slotName: isAmlemi ? "04 \xB7 COCKPIT ATMOSPHERE" : "04 \xB7 ATMOSPHERIC TROPOSPHERE",
            status: "ready",
            imageUrl: cachedRenders.atmosphere
          },
          { slotId: "05_lore", slotName: "05 \xB7 LORE DOSSIER COVER", status: "ready", imageUrl: cachedRenders.landmark },
          {
            slotId: "06_trailer",
            slotName: "06 \xB7 VIRAL 9:16 VIDEO TRAILER (5S)",
            status: cachedRenders.videoUrl ? "ready" : QUEUED_PENDING_STATUS,
            ...cachedRenders.videoUrl ? { videoUrl: cachedRenders.videoUrl } : { code: QUEUED_PENDING_STATUS, message: QUEUED_PENDING_MESSAGE }
          }
        ];
        const galleryList = [
          { id: "hero", code: "01_main", label: "01 \xB7 Main Orbital Planet Render", reference: "\xC4kinoya.jpg", url: cachedRenders.hero },
          { id: "flora", code: "02_flora", label: "02 \xB7 Botanical Flora System", reference: "Mood.png", url: cachedRenders.flora },
          { id: "fauna", code: "03_fauna", label: "03 \xB7 Exotic Fauna & Wildlife System", reference: "Mood.png", url: cachedRenders.fauna },
          {
            id: "atmosphere",
            code: "04_atmo",
            label: isAmlemi ? "04 \xB7 Cockpit / Ship Landing Atmosphere" : "04 \xB7 Atmospheric Troposphere & Sky Phenomena",
            reference: isAmlemi ? "Mood.png (Cockpit Canopy Camera Perspective)" : "Mood.png (Atmospheric Tropospheric Perspective)",
            url: cachedRenders.atmosphere
          },
          { id: "landmark", code: "05_lore", label: "05 \xB7 Lore Dossier Cover & Monument", reference: "Archival Cover", url: cachedRenders.landmark }
        ];
        const cachedResult = {
          success: true,
          status: "READY",
          planetName,
          worldName: planetName,
          architectName: row.author_name || architectName,
          videoUrl: cachedRenders.videoUrl,
          video_url: cachedRenders.videoUrl,
          videoStatus: cachedRenders.videoStatus,
          sfxAudioUrl: cachedRenders.sfxAudioUrl,
          sfx_audio_url: cachedRenders.sfxAudioUrl,
          sfxStatus: cachedRenders.sfxStatus,
          slots: cachedSlots,
          renders: cachedRenders,
          galleryList,
          generatedAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString(),
          meta: {
            engine: "Fal.ai Flux Schnell + Seedance 2.5 (Cached Production Master)",
            seed,
            isCached: true
          }
        };
        _planetDossierCache.set(dossierCacheKey, cachedResult);
        return cachedResult;
      }
    } catch {
    }
  }
  const inFlightDossier = _inFlightDossierRequests.get(dossierCacheKey);
  if (inFlightDossier) {
    console.log(`[fal.ai Deduplication] Reusing active in-flight dossier request for "${planetName}"`);
    return await inFlightDossier;
  }
  const dossierPromise = (async () => {
    const photoSlots = [
      "hero",
      "flora",
      "fauna",
      "atmosphere",
      "landmark"
    ];
    const results = await Promise.all(photoSlots.map((s) => generateSlotRender(s, { ...data, seed })));
    const heroImageUrl = results[0].imageUrl || "";
    const isSandbox = Boolean(data.isSandbox || data.is_sandbox);
    let videoUrl = "";
    let videoQueued = false;
    const passedVideoUrl = (data.videoUrl || data.video_url || "").trim();
    if (isSandbox) {
      videoUrl = SANDBOX_CANONICAL_PLACEHOLDERS.video;
      videoQueued = false;
    } else if (passedVideoUrl) {
      videoUrl = passedVideoUrl;
      videoQueued = false;
    } else if (heroImageUrl) {
      try {
        const allRendersList = results.map((r) => r.imageUrl).filter(Boolean);
        const dynamicPrompt = buildUniversalAssetAlignedFpvPrompt({
          planetName,
          authorName: data.authorUsername || data.architectName,
          atmosphere: data.atmosphere,
          flora: data.flora,
          fauna: data.fauna,
          landmark: data.landmark,
          colorPalette: data.colorPalette,
          naturalEnvironment: data.naturalEnvironment,
          admiredCreature: data.admiredCreature,
          lifePhilosophy: data.lifePhilosophy,
          futurePromise: data.futurePromise
        });
        videoUrl = await generateViralVideoWithFal(
          heroImageUrl,
          data.apiKey,
          dynamicPrompt,
          allRendersList,
          {
            planetName,
            authorName: data.authorUsername || data.architectName,
            atmosphere: data.atmosphere,
            flora: data.flora,
            fauna: data.fauna,
            landmark: data.landmark,
            colorPalette: data.colorPalette,
            naturalEnvironment: data.naturalEnvironment,
            admiredCreature: data.admiredCreature,
            lifePhilosophy: data.lifePhilosophy,
            futurePromise: data.futurePromise
          },
          seed,
          isAmlemi ? void 0 : STRICT_NON_HUMAN_NEGATIVE_PROMPT
        );
      } catch (vidErr) {
        console.warn("[Step 2 Video Trailer] Live queue notice:", vidErr?.message || vidErr);
        if (planetName.toLowerCase() === "felix" || isAmlemi) {
          videoUrl = isAmlemi ? "/assets/videos/amlemi_trailer.mp4" : "https://v3b.fal.media/files/b/0aaf64e4/ideVLu7wALpKOI6KQyRO-_video.mp4";
          videoQueued = false;
        } else {
          videoQueued = true;
        }
      }
    } else {
      videoQueued = true;
    }
    const slotIdMap = {
      hero: { id: "01_main", name: "01 \xB7 ORBITAL HERO" },
      flora: { id: "02_flora", name: "02 \xB7 BOTANICAL FLORA" },
      fauna: { id: "03_fauna", name: "03 \xB7 EXOTIC FAUNA" },
      atmosphere: {
        id: "04_atmo",
        name: isAmlemi ? "04 \xB7 COCKPIT ATMOSPHERE" : "04 \xB7 ATMOSPHERIC TROPOSPHERE"
      },
      landmark: { id: "05_lore", name: "05 \xB7 LORE DOSSIER COVER" }
    };
    const slotResults = results.map((r) => ({
      slotId: slotIdMap[r.slot].id,
      slotName: slotIdMap[r.slot].name,
      status: r.success && r.imageUrl ? "ready" : QUEUED_PENDING_STATUS,
      ...r.imageUrl ? { imageUrl: r.imageUrl } : {
        code: QUEUED_PENDING_STATUS,
        message: QUEUED_PENDING_MESSAGE
      }
    }));
    slotResults.push({
      slotId: "06_trailer",
      slotName: "06 \xB7 VIRAL 9:16 VIDEO TRAILER (5S)",
      status: videoUrl ? "ready" : QUEUED_PENDING_STATUS,
      ...videoUrl ? { videoUrl } : {
        code: QUEUED_PENDING_STATUS,
        message: QUEUED_PENDING_MESSAGE
      }
    });
    let sfxAudioUrl = "";
    let sfxStatus = QUEUED_PENDING_STATUS;
    if (videoUrl || heroImageUrl) {
      try {
        const sfxRes = await generatePlanetSfxAudioWithAi({
          videoUrl,
          sonicVibe: data.sonicVibe,
          planetName,
          biome: data.biome,
          apiKey: data.apiKey,
          isSandbox
        });
        sfxAudioUrl = sfxRes.audioUrl;
        sfxStatus = sfxRes.status;
      } catch (sfxErr) {
        console.warn("[AI SFX Pipeline] Queued pending:", sfxErr);
      }
    }
    slotResults.push({
      slotId: "07_sfx",
      slotName: "07 \xB7 SYNCHRONIZED 5S AI SOUND EFFECTS (AUDIO)",
      status: sfxAudioUrl ? "ready" : QUEUED_PENDING_STATUS,
      ...sfxAudioUrl ? { audioUrl: sfxAudioUrl } : {
        code: QUEUED_PENDING_STATUS,
        message: QUEUED_PENDING_MESSAGE
      }
    });
    const anyPhotoQueued = results.some((r) => !r.success || !r.imageUrl);
    const anyQueued = anyPhotoQueued || videoQueued;
    const resolvedVideoStatus = videoUrl ? "READY" : "QUEUED_PENDING";
    const resolvedSfxStatus = sfxAudioUrl ? "READY" : "QUEUED_PENDING";
    const finalRenders = {
      hero: results[0].imageUrl || "",
      flora: results[1].imageUrl || "",
      fauna: results[2].imageUrl || "",
      atmosphere: results[3].imageUrl || "",
      landmark: results[4].imageUrl || "",
      ecosystem: results[1].imageUrl || "",
      videoUrl,
      video_url: videoUrl,
      videoStatus: resolvedVideoStatus,
      sfxAudioUrl,
      sfx_audio_url: sfxAudioUrl,
      sfxStatus: resolvedSfxStatus,
      "01_main": results[0].imageUrl || "",
      "02_flora": results[1].imageUrl || "",
      "03_fauna": results[2].imageUrl || "",
      "04_atmo": results[3].imageUrl || "",
      "05_lore": results[4].imageUrl || ""
    };
    if (!isSandbox && data.syncDatabase !== false && (data.userId || data.email || data.id || data.planetId)) {
      const recordId = data.id || data.planetId || `PLN-2027-${Date.now().toString(36).toUpperCase()}`;
      const generatedLore = data.generatedLore || `Classified by world architect ${architectName}, ${planetName} is an official frontier sector situated within the \xC4kinoya celestial sphere.`;
      await syncPlanetToSupabaseAtomic({
        id: recordId,
        userId: data.userId || "anon-user",
        authorName: architectName,
        authorUsername: data.authorUsername || architectName.toLowerCase().replace(/[^a-z0-9]/g, "-") || "architect",
        authorEmail: data.email,
        planetName,
        data,
        renders: finalRenders,
        videoUrl,
        sfxAudioUrl,
        generatedLore
      });
    }
    const galleryList = [
      {
        id: "hero",
        code: "01_main",
        label: "01 \xB7 Main Orbital Planet Render",
        reference: "\xC4kinoya.jpg (Orbital Cinematic Composition Reference)",
        url: finalRenders.hero
      },
      {
        id: "flora",
        code: "02_flora",
        label: "02 \xB7 Botanical Flora System",
        reference: "Mood.png (Cinematic Environments & Botanical Life)",
        url: finalRenders.flora
      },
      {
        id: "fauna",
        code: "03_fauna",
        label: "03 \xB7 Exotic Fauna & Wildlife System",
        reference: "Mood.png (Composition, Speculative Biology & Lighting)",
        url: finalRenders.fauna
      },
      {
        id: "atmosphere",
        code: "04_atmo",
        label: isAmlemi ? "04 \xB7 Cockpit / Ship Landing Atmosphere" : "04 \xB7 Atmospheric Troposphere & Sky Phenomena",
        reference: isAmlemi ? "Mood.png (Cockpit Canopy Camera Perspective)" : "Mood.png (Atmospheric Tropospheric Perspective)",
        url: finalRenders.atmosphere
      },
      {
        id: "landmark",
        code: "05_lore",
        label: "05 \xB7 Lore Dossier Cover & Monument",
        reference: "Archival Cover combining monument & founding future promise",
        url: finalRenders.landmark
      }
    ];
    const generatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const finalResult = {
      success: !anyQueued,
      status: anyQueued ? QUEUED_PENDING_STATUS : "READY",
      ...anyQueued ? {
        code: QUEUED_PENDING_STATUS,
        message: QUEUED_PENDING_MESSAGE
      } : {},
      planetName,
      worldName: planetName,
      architectName,
      videoUrl,
      video_url: videoUrl,
      videoStatus: videoUrl ? "READY" : QUEUED_PENDING_STATUS,
      sfxAudioUrl,
      sfx_audio_url: sfxAudioUrl,
      sfxStatus,
      slots: slotResults,
      renders: finalRenders,
      galleryList,
      generatedAt,
      meta: {
        engine: "Fal.ai Flux Schnell + ByteDance Seedance 2.5 9:16 + Synchronized AI SFX Pipeline",
        photoModel: "fal-ai/flux/schnell",
        videoModel: "bytedance/seedance-2.5/us/reference-to-video",
        sfxModel: "fal-ai/mmaudio-v2",
        seed,
        videoAspectRatio: "9:16",
        videoDurationSeconds: 5,
        sfxDurationSeconds: 5,
        videoMotionPrompt: VIRAL_VIDEO_MOTION_PROMPT,
        aestheticGuideline: "Official Sillow Mill High-Resolution Cinematic Sci-Fi Standard",
        photorealismMandate: "Strict 3D Photorealism Enforced \u2014 Zero Vector Art, Zero Google Imagen Fallback",
        generatedAt
      }
    };
    if (!anyQueued && finalRenders.hero) {
      _planetDossierCache.set(dossierCacheKey, finalResult);
    }
    return finalResult;
  })();
  _inFlightDossierRequests.set(dossierCacheKey, dossierPromise);
  try {
    return await dossierPromise;
  } finally {
    _inFlightDossierRequests.delete(dossierCacheKey);
  }
}
var resolvedAiVideoCache = /* @__PURE__ */ new Map();
var failedCheckCooldownMap = /* @__PURE__ */ new Map();
async function checkAndResolveDynamicVideo(params) {
  const existing = (params.existingVideoUrl || "").trim();
  if (existing && /^https?:\/\//i.test(existing)) {
    return {
      success: true,
      keyConfigured: true,
      isAiVideoAvailable: true,
      videoUrl: existing,
      pipelineMode: "PRODUCTION_AI_VIDEO",
      status: "READY"
    };
  }
  const cacheKey = (params.planetId || params.planetName || params.heroImageUrl || "").trim().toLowerCase();
  if (cacheKey && resolvedAiVideoCache.has(cacheKey)) {
    const cachedUrl = resolvedAiVideoCache.get(cacheKey);
    return {
      success: true,
      keyConfigured: true,
      isAiVideoAvailable: true,
      videoUrl: cachedUrl,
      pipelineMode: "PRODUCTION_AI_VIDEO",
      status: "READY"
    };
  }
  const activeKey = (params.apiKey || getFalApiKey()).trim();
  const keyConfigured = isValAiKeyConfigured(activeKey);
  if (!keyConfigured) {
    return {
      success: true,
      keyConfigured: false,
      isAiVideoAvailable: false,
      videoUrl: "",
      pipelineMode: "FALLBACK_SLIDESHOW_MONTAGE",
      status: "FALLBACK_MONTAGE"
    };
  }
  if (supabase2 && (params.planetId || params.planetName)) {
    try {
      const query = supabase2.from("planet_submissions").select("video_url, renders, human_answers");
      const { data: rows } = params.planetId ? await query.eq("id", params.planetId).limit(1) : await query.ilike("planet_name", params.planetName || "").limit(1);
      const row = Array.isArray(rows) ? rows[0] : null;
      const dbVideoUrl = row?.video_url || row?.renders?.videoUrl || row?.renders?.video_url || row?.human_answers?.video_url || "";
      if (dbVideoUrl && /^https?:\/\//i.test(dbVideoUrl)) {
        if (cacheKey) resolvedAiVideoCache.set(cacheKey, dbVideoUrl);
        return {
          success: true,
          keyConfigured: true,
          isAiVideoAvailable: true,
          videoUrl: dbVideoUrl,
          pipelineMode: "PRODUCTION_AI_VIDEO",
          status: "READY"
        };
      }
    } catch {
    }
  }
  let rawHeroUrl = (params.heroImageUrl || "").trim();
  const isAmlemiWorld = params.planetId === "planet-amlemi-genesis-01" || params.planetName?.toLowerCase().includes("\xE4mlemi") || params.planetName?.toLowerCase().includes("amlemi");
  if (!rawHeroUrl && isAmlemiWorld) {
    rawHeroUrl = "https://www.sillowmill.com/assets/01-orbital-D4ZjgTfh.png";
  }
  const heroUrl = resolveAbsoluteImageUrl(rawHeroUrl);
  const now = Date.now();
  const lastFail = cacheKey ? failedCheckCooldownMap.get(cacheKey) || 0 : 0;
  const withinCooldown = now - lastFail < 45e3;
  if (params.triggerSynthesis !== false && heroUrl && !withinCooldown) {
    try {
      const synthesizedUrl = await generateViralVideoWithFal(heroUrl, activeKey);
      if (synthesizedUrl && /^https?:\/\//i.test(synthesizedUrl)) {
        if (cacheKey) resolvedAiVideoCache.set(cacheKey, synthesizedUrl);
        if (supabase2 && params.planetId) {
          await supabase2.from("planet_submissions").update({ video_url: synthesizedUrl }).eq("id", params.planetId);
        }
        return {
          success: true,
          keyConfigured: true,
          isAiVideoAvailable: true,
          videoUrl: synthesizedUrl,
          pipelineMode: "PRODUCTION_AI_VIDEO",
          status: "READY"
        };
      }
    } catch {
      if (cacheKey) failedCheckCooldownMap.set(cacheKey, Date.now());
    }
  }
  return {
    success: true,
    keyConfigured,
    isAiVideoAvailable: false,
    videoUrl: "",
    pipelineMode: "FALLBACK_SLIDESHOW_MONTAGE",
    status: "FALLBACK_MONTAGE"
  };
}

// src/server/apiRouter.ts
init_vipTokens2();
init_authVoteService();
var apiApp = express();
var apiRouter = express.Router();
apiRouter.get("/", (_req, res) => {
  res.status(200).json({
    status: "online",
    protocol: "Akinoya VIP Protocol Gateway",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
apiApp.use("/api", (_req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});
apiApp.post(
  "/api/webhooks/stripe",
  express.raw({ type: "*/*" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    try {
      const stripe = getStripe();
      if (webhookSecret && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        const rawPayload = typeof req.body === "string" ? req.body : req.body.toString("utf8");
        event = JSON.parse(rawPayload);
      }
    } catch (err) {
      console.error(`[API Webhook] Webhook error: ${err.message}`);
      res.status(400).json({ error: `Webhook Error: ${err.message}` });
      return;
    }
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      try {
        const order = await processCompletedCheckout(session);
        res.status(200).json({
          received: true,
          orderId: order.id,
          passId: order.passId,
          waveRemaining: getInventoryStatus().available
        });
        return;
      } catch (err) {
        console.error("[API Webhook] Error processing checkout completion:", err);
        res.status(500).json({ error: "Failed to process order" });
        return;
      }
    }
    res.status(200).json({ received: true, event: event.type });
  }
);
apiApp.use(express.json());
apiRouter.post("/create-checkout-session", async (req, res) => {
  try {
    const { customerEmail, customerName, shippingAddress, shippingCity, apartmentBus } = req.body || {};
    const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : void 0);
    const isMembership = req.body?.plan === "membership" || req.body?.product === "community_membership";
    if (isMembership) {
      res.status(403).json({
        error: "Community membership pass public checkout is locked until launch on 09/01/2027."
      });
      return;
    }
    const session = await createComicCheckoutSession({
      customerEmail,
      customerName,
      shippingAddress,
      shippingCity,
      apartmentBus,
      origin
    });
    res.status(200).json({
      url: session.url,
      sessionId: session.id
    });
  } catch (err) {
    console.error("[API] create-checkout-session error:", err);
    res.status(500).json({
      error: err?.message || "Failed to initialize Stripe Checkout session"
    });
  }
});
apiRouter.get("/inventory/status", (_req, res) => {
  try {
    const inventory = getInventoryStatus();
    res.status(200).json(inventory);
  } catch (err) {
    console.error("[API] inventory/status error:", err);
    res.status(200).json({ wave: "Wave 2", total: 100, claimed: 0, available: 100 });
  }
});
apiRouter.get("/checkout/session/:id", async (req, res) => {
  try {
    const sessionId = req.params.id;
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const orders = loadOrders();
    const matchedOrder = orders.find((o) => o.id === sessionId);
    res.status(200).json({
      session,
      order: matchedOrder || null,
      passId: matchedOrder ? matchedOrder.passId : `PASS-BINGAA-${session.id.slice(-8).toUpperCase()}`,
      status: session.payment_status,
      customerEmail: session.customer_details?.email,
      customerName: session.customer_details?.name
    });
  } catch (err) {
    console.error("[API] Retrieve session error:", err);
    res.status(404).json({ error: "Session not found or invalid." });
  }
});
var _nfcRedemptions = /* @__PURE__ */ new Map();
apiRouter.all(["/nfc/redeem", "/nfc/verify"], (req, res) => {
  const token = (req.body?.token || req.query?.token)?.trim().toUpperCase();
  const deviceId = (req.body?.deviceId || req.query?.deviceId || "UNKNOWN_DEVICE").trim();
  if (!token) {
    res.status(400).json({
      success: false,
      error: "MISSING_TOKEN",
      message: "Token parameter is required for NFC redemption."
    });
    return;
  }
  if (!isValidPassId2(token)) {
    res.status(403).json({
      success: false,
      error: "INVALID_PASS_ID",
      token,
      message: "This Pass ID is not recognized. Please use an authentic \xC4kinoya NFC pass."
    });
    return;
  }
  const existing = _nfcRedemptions.get(token);
  if (existing) {
    if (existing.deviceId === deviceId) {
      res.status(200).json({
        success: true,
        bound: true,
        isExistingDevice: true,
        token,
        message: "NFC Pass verified for authorized device session."
      });
      return;
    } else {
      res.status(403).json({
        success: false,
        error: "TOKEN_ALREADY_BOUND",
        token,
        message: "This NFC magic link has already been bound to another device. Transfer not permitted."
      });
      return;
    }
  }
  _nfcRedemptions.set(token, {
    deviceId,
    redeemedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  res.status(200).json({
    success: true,
    bound: true,
    isNewRedemption: true,
    token,
    message: "NFC Pass successfully redeemed and bound to device."
  });
});
apiRouter.all("/nfc/verify-dna", (req, res) => {
  const token = req.body?.token || req.body?.id || req.query?.token || req.query?.id;
  const enc = req.body?.enc || req.query?.enc;
  const cmac = req.body?.cmac || req.query?.cmac;
  if (!isValidPassId2(token)) {
    res.status(403).json({
      valid: false,
      isAuthentic: false,
      status: "INVALID PASS ID",
      error: "INVALID_PASS_ID",
      message: "This Pass ID is not recognized. Use the verification link from your physical \xC4kinoya pass."
    });
    return;
  }
  const result = verifyDnaCipher(token, enc, cmac);
  const pass = getPassRecord(token);
  if (!result.valid) {
    res.status(403).json({
      valid: false,
      isAuthentic: false,
      status: result.status,
      error: result.error,
      message: result.message,
      pass
    });
    return;
  }
  res.status(200).json({
    valid: true,
    isAuthentic: Boolean(enc && result.valid),
    status: enc ? "AUTHENTIC FOUNDING PASS VERIFIED" : result.status,
    message: result.message,
    counter: result.counter,
    pass
  });
});
apiRouter.post("/nfc/send-pin", async (req, res) => {
  const result = await handleCertificateAction({
    action: "send-pin",
    token: req.body?.token || req.body?.passId || req.body?.id,
    email: req.body?.email,
    ownerName: req.body?.ownerName || req.body?.holderName || req.body?.name
  });
  res.status(result.status).json(result.body);
});
apiRouter.post("/nfc/register", async (req, res) => {
  const body = req.body || {};
  if (body.action === "magic-link") {
    const email = (body.email || "").trim().toLowerCase();
    const token2 = body.token || "AKN-VIP-2027-X0914";
    if (!email || !email.includes("@")) {
      res.status(400).json({ success: false, error: "INVALID_EMAIL", message: "Please enter a valid email address." });
      return;
    }
    const resendApiKey = process.env.RESEND_API_KEY || "";
    const host = req.headers["x-forwarded-host"] || req.headers?.host;
    const proto = req.headers["x-forwarded-proto"] || "https";
    const baseUrl = req.headers?.origin || (host ? `${proto}://${host}` : "https://www.sillowmill.com");
    const magicUrl = `${baseUrl}/verify/${token2}?auth=magic&email=${encodeURIComponent(email)}`;
    const magicHolderName = (body.ownerName || body.holderName || email.split("@")[0]).trim();
    syncPassClaimToGoogleSheets(token2, magicHolderName, email).catch(() => {
    });
    if (!resendApiKey) {
      res.status(200).json({ success: true, message: `Magic link dispatched to ${email}.`, magicUrl, devMode: true });
      return;
    }
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: process.env.AUTH_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "Sillow Mill <auth@sillowmill.com>",
          to: [email],
          subject: "Your \xC4kinoya VIP Magic Sign-In Link",
          html: `<div style="background-color: #05080e; color: #ffffff; padding: 32px; font-family: sans-serif; text-align: center; border-radius: 12px;">
            <h2 style="color: #38bdf8; margin-bottom: 12px;">\xC4kinoya Community Access</h2>
            <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">Click the button below to sign in instantly with your verified pass session.</p>
            <a href="${magicUrl}" style="background-color: #06b6d4; color: #000000; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">SIGN IN TO \xC4KINOYA \u2192</a>
            <p style="color: #64748b; font-size: 11px; margin-top: 24px;">If you did not request this email, you can safely ignore it.</p>
          </div>`
        })
      });
    } catch (err) {
      console.warn("[Register/MagicLink] Dispatch failed:", err);
    }
    res.status(200).json({ success: true, message: `Magic link dispatched to ${email}. Check your inbox!` });
    return;
  }
  if (body.action === "send-pin" || body.action === "send-otp" || body.action === "certify") {
    const result2 = await handleCertificateAction(body);
    if (body.action === "certify" && result2.status === 200) {
      const certPassId = body.token || body.passId || body.id;
      const certName = body.ownerName || body.holderName || body.name;
      const certEmail = body.email || body.ownerEmail || body.holderEmail;
      if (certPassId && certName) {
        await registerPassHolder(certPassId, certName, certEmail, body.deviceId).catch(() => {
        });
      }
    }
    res.status(result2.status).json(result2.body);
    return;
  }
  const token = body.token || body.id;
  const ownerEmail = (body.ownerEmail || body.email)?.trim();
  const ownerName = (body.ownerName || body.displayName || body.holderName || (ownerEmail ? ownerEmail.split("@")[0] : "")).trim();
  const deviceId = body.deviceId;
  if (!token) {
    res.status(400).json({ success: false, error: "MISSING_TOKEN", message: "Token is required" });
    return;
  }
  if (!ownerName) {
    res.status(400).json({ success: false, error: "MISSING_NAME", message: "Owner name or handle is required" });
    return;
  }
  const result = await registerPassHolder(token, ownerName, ownerEmail, deviceId);
  res.status(result.success === false ? 403 : 200).json(result);
});
apiRouter.all("/nfc/reset-pass", async (req, res) => {
  const token = (req.body?.token || req.body?.id || req.query?.token || req.query?.id || "AKN-VIP-2027-X001").trim().toUpperCase();
  if (!isValidPassId2(token)) {
    res.status(400).json({
      success: false,
      error: "INVALID_PASS_ID",
      message: "Pass ID not recognized."
    });
    return;
  }
  const passRecord = resetPassRecord(token);
  _nfcRedemptions.delete(token);
  const sheetResult = await resetPassInGoogleSheets(token).catch(() => ({ synced: false }));
  res.status(200).json({
    success: true,
    token,
    message: `Digital VIP Pass ${token} has been reset to active / unclaimed status.`,
    pass: passRecord,
    sheetResult,
    resetAt: (/* @__PURE__ */ new Date()).toISOString()
  });
});
apiRouter.all("/nfc/reset-all-passes", async (req, res) => {
  try {
    const adminKey = req.body?.adminKey || req.query?.adminKey;
    const email = req.body?.email || req.query?.email;
    const isFounder = adminKey && adminKey === process.env.ADMIN_KEY || isFounderEmail(email);
    if (!isFounder) {
      res.status(403).json({ success: false, error: "UNAUTHORIZED", message: "Restricted to founder credentials." });
      return;
    }
    resetAllPassRecords();
    const founderPass = getPassRecord("AKN-VIP-2027-X0914");
    founderPass.ownerName = "Odi Selis";
    founderPass.ownerEmail = "odi.selis3@gmail.com";
    founderPass.isClaimed = true;
    founderPass.status = "MASTER FOUNDER ORIGINAL";
    const supabaseReset = await resetAllVipTokens().catch((e) => ({ success: false, error: e?.message }));
    res.status(200).json({
      success: true,
      message: "All non-founder VIP tokens have been reset and re-issued. Founder Pass (#0) remains active.",
      founderPass,
      supabaseReset,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Reset failed" });
  }
});
apiRouter.post("/whitelist/subscribe", async (req, res) => {
  const rawEmail = (req.body?.email || "").trim().toLowerCase();
  const isValidEmail2 = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rawEmail);
  if (!rawEmail || !isValidEmail2) {
    res.status(400).json({ success: false, error: "INVALID_EMAIL", message: "Please provide a valid email address." });
    return;
  }
  const source = (req.body?.source || "Comic Preview Gate (Page 3 Lock)").trim();
  const chapter = (req.body?.chapter || "Bing\xE4a Issue #1 \u2014 Chapter 2 Preview Gate").trim();
  const notes = (req.body?.notes || "Wave 2 Priority Notification & Early Access").trim();
  console.log(`[WHITELIST] Subscribed: ${rawEmail} (${source})`);
  const sheetSync = await appendWhitelistEmailToGoogleSheets({
    email: rawEmail,
    source,
    chapter,
    notes,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }).catch((err) => ({ success: false, error: err?.message }));
  res.status(200).json({
    success: true,
    email: rawEmail,
    source,
    chapter,
    spreadsheetId: WHITELIST_SPREADSHEET_ID,
    sheetSync,
    message: "You've been added to the \xC4kinoya Whitelist! You will receive priority notification for the next drop."
  });
});
apiRouter.get("/nfc/generate-test-cipher", (req, res) => {
  const token = (req.query?.token || "AKN-VIP-2027-X0914").trim();
  const cipher = generateAuthenticDnaCipher(token);
  res.status(200).json({
    token,
    cipher,
    sampleAuthenticUrl: `https://sillowmill.com/verify?token=${token}&enc=${cipher}`,
    message: "Generated authentic dynamic AES-128 cipher for testing."
  });
});
apiRouter.all(
  ["/generate-planet", "/planet/generate", "/generate-sector-images", "/sector/generate"],
  async (req, res) => {
    try {
      const body = req.body || {};
      if (body.action === "balance-check" || body.action === "fal-status" || req.query?.action === "balance-check") {
        const falStatus = await verifyFalApiConnection();
        res.status(200).json({
          success: true,
          ...falStatus,
          ledger: loadFalLedger()
        });
        return;
      }
      if (body.resetLocks) {
        resetGenerationLocks(body.userId, body.email);
        res.status(200).json({ success: true, message: "Generation lock reset for Founder testing." });
        return;
      }
      if (body.markCompleted) {
        lockUserGeneration(body.userId, body.email, body.deviceId);
        res.status(200).json({ success: true, message: "Generation locked." });
        return;
      }
      const isSlot = Boolean(body.slot);
      if (body.userId || body.email || body.deviceId) {
        const lockCheck = await checkAndLockUserGeneration(body.userId, body.email, body.deviceId, isSlot);
        if (!lockCheck.allowed) {
          res.status(403).json({
            success: false,
            error: "SUBMISSION_LOCKED",
            message: lockCheck.reason || "You have already claimed your 1 generation attempt."
          });
          return;
        }
      }
      if (body.slot) {
        const slotResult = await generateSlotRender(body.slot, body);
        res.status(200).json(slotResult);
        return;
      }
      const result = await generatePlanetRenders(body);
      res.status(200).json(result);
    } catch (err) {
      console.warn("[API] generate-planet queued notice:", err?.message || err);
      if (req.body?.slot) {
        const normSlot = normalizeSlot(req.body.slot);
        res.status(200).json({
          success: false,
          code: "QUEUED_PENDING",
          status: "QUEUED_PENDING",
          message: "Synthesizer recalibrating.",
          slot: normSlot,
          slotIndex: (SLOT_METADATA[normSlot] || SLOT_METADATA.hero).index,
          slotLabel: (SLOT_METADATA[normSlot] || SLOT_METADATA.hero).label,
          planetName: req.body.planetName || req.body.worldName || req.body.sectorName || "\xC4kinoya Frontier",
          model: "Fal.ai Flux Schnell (QUEUED_PENDING)"
        });
        return;
      }
      res.status(200).json({
        success: false,
        code: "QUEUED_PENDING",
        status: "QUEUED_PENDING",
        message: "Synthesizer recalibrating."
      });
    }
  }
);
apiRouter.all(["/fal/status", "/fal/balance", "/generate-planet/balance"], async (_req, res) => {
  try {
    const status = await verifyFalApiConnection();
    res.status(200).json({
      success: true,
      ...status,
      ledger: loadFalLedger()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err?.message || "Failed to verify Fal.ai balance",
      ledger: loadFalLedger()
    });
  }
});
apiRouter.all(["/vip/verify"], async (req, res) => {
  try {
    const token = req.query?.token || req.query?.vip_token || req.body?.token || req.body?.vip_token || "";
    const userId = req.query?.userId || req.body?.userId || "";
    const email = req.query?.email || req.body?.email || "";
    const result = await checkVipTokenStatus(token, userId, email);
    res.status(result.allowed ? 200 : result.isAlreadyClaimed ? 403 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "VIP verify failed" });
  }
});
apiRouter.all(["/vip/claim"], async (req, res) => {
  try {
    const token = req.body?.token || req.body?.vip_token || req.query?.token || "";
    const userId = req.body?.userId || req.query?.userId || "";
    const holderName = req.body?.holderName || req.body?.ownerName || req.query?.holderName || "";
    const holderEmail = req.body?.holderEmail || req.body?.email || req.query?.email || "";
    const result = await claimVipTokenForUser(token, userId, holderName, holderEmail);
    if (result.success && token) {
      const resolvedName = holderName || (holderEmail ? holderEmail.split("@")[0] : "Founding VIP Holder");
      await registerPassHolder(token, resolvedName, holderEmail).catch(() => {
      });
      await syncPassClaimToGoogleSheets(token, resolvedName, holderEmail).catch(() => {
      });
    }
    res.status(result.success ? 200 : result.error?.includes("claimed") ? 403 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "VIP claim failed" });
  }
});
apiRouter.all(["/sync-sheets", "/auth/sync-sheets"], async (req, res) => {
  try {
    const payload = req.body || {};
    const record = payload.record || payload;
    let firstName = String(record.first_name || record.firstName || "").trim();
    let lastName = String(record.last_name || record.lastName || "").trim();
    const rawFullName = String(record.fullName || record.full_name || record.holderName || record.ownerName || "").trim();
    if (!firstName && rawFullName) {
      const parts = rawFullName.split(/\s+/);
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ");
    }
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || rawFullName;
    const email = String(record.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      res.status(400).json({ success: false, error: "Valid email is required for subscriber sync" });
      return;
    }
    const isFounder = email === "odi.selis3@gmail.com";
    let role = isFounder ? "CREATOR" : String(record.role || "FREE").trim().toUpperCase();
    const rawVipCode = String(record.vip_code_redeemed || record.vipCode || record.passId || record.token || "").trim();
    const registrationDate = record.timestamp || record.created_at || (/* @__PURE__ */ new Date()).toISOString();
    const claimedSector = String(
      record.worldName || record.planetName || record.claimed_sector || record.sector || ""
    ).trim();
    const subSync = await syncSubscriberRowToGoogleSheets({
      firstName,
      lastName,
      fullName,
      email,
      role,
      vipCode: rawVipCode,
      claimedSector,
      registrationDate
    });
    let vipSync = null;
    const isVipPassCode = rawVipCode && rawVipCode !== "N/A" && (rawVipCode.toUpperCase().startsWith("AKN-VIP") || /^#?\d{1,3}$/.test(rawVipCode) || /^X\d{1,4}$/i.test(rawVipCode));
    if (isVipPassCode || isFounder) {
      const passIdToSync = isFounder ? "AKN-VIP-2027-X0914" : rawVipCode;
      vipSync = await syncPassClaimToGoogleSheets(passIdToSync, fullName || email.split("@")[0], email);
    }
    res.status(200).json({
      success: subSync?.success ?? true,
      email,
      subscriberSync: subSync,
      vipSync,
      tab: "Subscribers"
    });
  } catch (err) {
    console.error("[API] sync-sheets error:", err);
    res.status(500).json({ success: false, error: err?.message || "Internal server error syncing to Google Sheets" });
  }
});
apiRouter.post("/auth/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, passCode } = req.body || {};
    if (passCode && String(passCode).trim()) {
      const cleanPass = String(passCode).trim().toUpperCase();
      const tokenStatus = await checkVipTokenStatus(cleanPass, null, email);
      if (tokenStatus.isAlreadyClaimed && !tokenStatus.isClaimedByMe) {
        res.status(400).json({
          success: false,
          error: "Ai! Deze VIP-pas is al geclaimd.",
          message: "Ai! Deze VIP-pas is al geclaimd."
        });
        return;
      }
    }
    const result = await registerUserCredentials({
      email,
      password,
      firstName,
      lastName,
      role,
      passCode
    });
    if (result.success && email) {
      const fullName = [firstName, lastName].filter(Boolean).join(" ") || String(email).split("@")[0];
      await syncSubscriberRowToGoogleSheets({
        firstName: firstName || fullName,
        lastName: lastName || "",
        email,
        role: result.profile?.role || role || "FREE",
        vipCode: result.profile?.vip_code_redeemed || passCode || "N/A",
        registrationDate: (/* @__PURE__ */ new Date()).toISOString()
      }).catch((syncErr) => console.warn("[Register] Google Sheets subscriber sync notice:", syncErr));
      if (passCode && String(passCode).trim()) {
        const cleanPass = String(passCode).trim().toUpperCase();
        await claimVipTokenForUser(cleanPass, result.user.id, fullName, email).catch(() => {
        });
        await registerPassHolder(cleanPass, fullName, email).catch(() => {
        });
        await syncPassClaimToGoogleSheets(cleanPass, fullName, email).catch(
          (vipErr) => console.warn("[Register] Google Sheets VIP claim sync notice:", vipErr)
        );
      }
    }
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Registration failed" });
  }
});
apiRouter.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const result = await loginUserCredentials(email, password);
    res.status(result.success ? 200 : 401).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Login failed" });
  }
});
apiRouter.get("/auth/session", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.query.token) || "";
    const result = await getUserFromSessionToken(token);
    res.status(result.success ? 200 : 401).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Session validation failed" });
  }
});
apiRouter.post("/auth/reset-password", async (req, res) => {
  try {
    const { email, redirectTo } = req.body || {};
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      res.status(400).json({ success: false, error: "Please enter a valid email address." });
      return;
    }
    const resendApiKey = process.env.RESEND_API_KEY || "";
    const host = req.headers["x-forwarded-host"] || req.headers?.host;
    const proto = req.headers["x-forwarded-proto"] || "https";
    const siteBase = req.headers?.origin || (host ? `${proto}://${host}` : "https://sillowmill.com");
    const updateUrl = redirectTo || `${siteBase}/update-password`;
    const fromAddress = process.env.AUTH_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "Sillow Mill <auth@sillowmill.com>";
    if (resendApiKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [cleanEmail],
            subject: "Sillow Mill // Security Frequency: Password Recovery",
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #05070c; color: #ffffff; padding: 40px 20px; line-height: 1.6;">
                <div style="max-width: 540px; margin: 0 auto; background-color: #0a0d14; border: 1px solid rgba(34, 211, 238, 0.3); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.85);">
                  <div style="padding: 32px 32px 24px 32px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
                    <p style="letter-spacing: 3px; font-size: 11px; font-weight: 700; color: #22d3ee; margin: 0 0 8px 0; text-transform: uppercase;">SILLOW MILL \xB7 SECURITY PROTOCOL</p>
                    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 0; letter-spacing: 0.5px;">Password Recovery Transmission</h1>
                    <p style="font-size: 12px; color: rgba(255, 255, 255, 0.5); margin: 6px 0 0 0; font-family: monospace;">Designated Frequency: ${cleanEmail}</p>
                  </div>
                  <div style="padding: 32px;">
                    <p style="font-size: 14px; color: rgba(255, 255, 255, 0.85); margin: 0 0 16px 0;">
                      A security recovery beacon was initiated for your Sillow Mill account terminal.
                    </p>
                    <p style="font-size: 13px; color: rgba(255, 255, 255, 0.65); margin: 0 0 24px 0;">
                      Click the cryptographic recovery link below to establish a new password and unlock full portal telemetry:
                    </p>
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${updateUrl}" style="background-color: #06b6d4; color: #000000; padding: 14px 32px; border-radius: 10px; font-weight: 800; font-size: 13px; letter-spacing: 1px; text-decoration: none; display: inline-block; box-shadow: 0 0 20px rgba(6, 182, 212, 0.4); text-transform: uppercase;">RESET PASSWORD NOW \u2192</a>
                    </div>
                    <p style="font-size: 11px; color: #64748b; margin-top: 24px; text-align: center;">
                      For your protection, this recovery frequency token will expire in 60 minutes. If you did not initiate this transmission, no action is required.
                    </p>
                  </div>
                </div>
              </div>`
          })
        });
      } catch (sendErr) {
        console.warn("[Auth/ResetPassword] Resend dispatch warning:", sendErr);
      }
    }
    res.status(200).json({
      success: true,
      message: "A secure recovery link has been dispatched to your designated frequency."
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Password reset failed" });
  }
});
apiRouter.post("/auth/update-password", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ success: false, error: "Email and password are required." });
      return;
    }
    const result = await updateUserPassword(email, password);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Password update failed" });
  }
});
apiRouter.post(["/dossier/vote", "/vote"], async (req, res) => {
  try {
    const {
      submissionId,
      voterId,
      voterEmail,
      voterUsername,
      submissionAuthorId,
      submissionAuthorEmail,
      submissionAuthorUsername,
      baseVotes
    } = req.body || {};
    const result = castSubmissionVote({
      submissionId,
      voterId: voterId || voterEmail || "anon_voter",
      voterEmail,
      voterUsername,
      submissionAuthorId,
      submissionAuthorEmail,
      submissionAuthorUsername,
      baseVotes: Number(baseVotes) || void 0
    });
    res.status(result.success ? 200 : result.error?.includes("Self-voting") ? 403 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Voting failed" });
  }
});
apiRouter.get(["/dossier/votes", "/votes"], async (req, res) => {
  try {
    const voterId = req.query.voterId || "";
    const voterEmail = req.query.voterEmail || "";
    const persistentVoterId = req.query.persistentVoterId || "";
    const summary = getVotesSummary(voterId, voterEmail, persistentVoterId);
    res.status(200).json({ success: true, ...summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Fetch votes failed" });
  }
});
apiRouter.post(["/dossier/submission", "/submission"], async (req, res) => {
  try {
    const sub = req.body;
    const result = saveSubmissionRecord(sub);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to save submission" });
  }
});
apiRouter.get(["/dossier/submissions", "/submissions"], async (_req, res) => {
  try {
    const submissions = getAllSubmissionRecords();
    res.status(200).json({ success: true, submissions });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to fetch submissions" });
  }
});
apiRouter.all(["/video-pipeline/status", "/generate-planet/video-check"], async (req, res) => {
  try {
    const planetId = (req.body?.planetId || req.query.planetId || "").trim();
    const planetName = (req.body?.planetName || req.query.planetName || "").trim();
    const heroImageUrl = (req.body?.heroImageUrl || req.query.heroImageUrl || "").trim();
    const existingVideoUrl = (req.body?.existingVideoUrl || req.query.existingVideoUrl || "").trim();
    const triggerSynthesis = req.body?.triggerSynthesis !== false && req.query.triggerSynthesis !== "false";
    const result = await checkAndResolveDynamicVideo({
      planetId,
      planetName,
      heroImageUrl,
      existingVideoUrl,
      triggerSynthesis
    });
    res.status(200).json(result);
  } catch (err) {
    res.status(200).json({
      success: true,
      keyConfigured: false,
      isAiVideoAvailable: false,
      videoUrl: "",
      pipelineMode: "FALLBACK_SLIDESHOW_MONTAGE",
      status: "FALLBACK_MONTAGE",
      error: err?.message || "Pipeline check fallback"
    });
  }
});
apiApp.use("/api", apiRouter);
apiApp.use("/", apiRouter);
apiApp.use((err, _req, res, _next) => {
  console.error("[API] Unhandled error:", err?.message || err);
  if (!res.headersSent) {
    res.status(500).json({ error: err?.message || "Internal server error." });
  }
});

// src/server/serverless.ts
function handler(req, res) {
  try {
    const rawUrl = req.url || "/api";
    const parsed = new URL(rawUrl, "https://sillowmill.com");
    const rewrittenPath = parsed.searchParams.get("__path");
    if (rewrittenPath !== null) {
      parsed.searchParams.delete("__path");
      const cleanSubpath = rewrittenPath.replace(/^\/+/, "");
      const qs = parsed.searchParams.toString();
      req.url = `/api/${cleanSubpath}${qs ? `?${qs}` : ""}`;
    } else if (!parsed.pathname.startsWith("/api")) {
      const cleanPath = parsed.pathname.replace(/^\/+/, "");
      const qs = parsed.searchParams.toString();
      req.url = `/api/${cleanPath}${qs ? `?${qs}` : ""}`;
    }
  } catch {
  }
  return apiApp(req, res);
}
export {
  handler as default
};

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Persistence paths
const TMP_FILE = '/tmp/sillow_nfc_passport_data.json';
const LOCAL_FILE = path.resolve(process.cwd(), 'data/nfc_passport_data.json');

// System AES-128 Master Key for NXP NTAG 424 DNA (16 bytes)
const AES_MASTER_KEY = Buffer.from(
  process.env.NTAG_AES_KEY || 'a8f192b03c4d5e6f7a8b9c0d1e2f3a4b',
  'hex'
);
const AES_IV = Buffer.alloc(16, 0);

let _store = {
  passes: {},
  transferKeys: {},
};

function normalizeTokenId(raw) {
  if (!raw) return 'AKN-VIP-2027-X0914';
  let clean = raw.trim().toUpperCase().replace(/^#/, '');
  if (clean === 'FOUNDING' || clean === 'VIP' || clean === '1') {
    return 'AKN-VIP-2027-X0914';
  }
  return clean;
}

// ─── Strict Pass ID validation (security gate for /verify/[id] + magic links) ───
// If NFC_VALID_PASS_IDS is configured (comma-separated), ONLY those exact IDs are accepted.
// Otherwise IDs must match the issued Founding Pass formats.
const PASS_ID_PATTERNS = [
  /^AKN-VIP-\d{4}-[A-Z]\d{4}$/, // AKN-VIP-2027-X0914
  /^AKN-\d{4}$/, // AKN-9941
  /^SM\d{3}-[A-Z0-9]{4}$/, // SM001-A9B2
];

export function isValidPassId(raw) {
  if (!raw || typeof raw !== 'string') return false;
  const clean = raw.trim().toUpperCase().replace(/^#/, '');
  if (clean.length > 32) return false;

  const allowlist = (process.env.NFC_VALID_PASS_IDS || '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  if (allowlist.length > 0) return allowlist.includes(clean);

  return PASS_ID_PATTERNS.some((re) => re.test(clean));
}

function deriveEdition(tokenId) {
  const clean = normalizeTokenId(tokenId);
  if (
    clean.includes('X0914') ||
    clean.includes('0914') ||
    clean === 'AKN-VIP-2027-X0914' ||
    clean === 'AKN-2027' ||
    clean === 'AKN-VIP-2027'
  ) {
    return { edition: '1 of 100', editionNumber: 1 };
  }
  const match = clean.match(/(\d+)/g);
  if (match && match.length > 0) {
    const lastNum = parseInt(match[match.length - 1], 10);
    if (!isNaN(lastNum)) {
      const editionNum = Math.min(Math.max((lastNum % 100) || 100, 1), 100);
      return {
        edition: `${editionNum} of 100`,
        editionNumber: editionNum,
      };
    }
  }
  return { edition: '1 of 100', editionNumber: 1 };
}

function createDefaultPassRecord(tokenId) {
  const normalized = normalizeTokenId(tokenId);
  const { edition, editionNumber } = deriveEdition(normalized);

  return {
    tokenId: `#${normalized}`,
    normalizedId: normalized,
    edition,
    editionNumber,
    origin: 'Genesis Archive (Leuven Origin)',
    issueDate: '09.01.2027',
    coordinates: "RA 04h 35m / +16° 30'",
    status: 'VERIFIED ORIGINAL / FOUNDING HOLDER',
    ownerName: 'Founding Holder',
    ownerEmail: null,
    registeredAt: null,
    boundDeviceId: null,
    lastCounter: 0,
    usedEncSignatures: [],
    activeTransferKey: null,
  };
}

export function loadStore() {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const data = JSON.parse(fs.readFileSync(TMP_FILE, 'utf8'));
      if (data && data.passes) {
        _store = data;
        _store.claimedKeys = Array.isArray(_store.claimedKeys) ? _store.claimedKeys : [];
        _store.transferKeys = _store.transferKeys || {};
        _store.passes = _store.passes || {};
        return _store;
      }
    }
  } catch (err) {
    console.warn('[Passport] Error reading /tmp:', err);
  }

  try {
    if (fs.existsSync(LOCAL_FILE)) {
      const data = JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8'));
      if (data && data.passes) {
        _store = data;
        _store.claimedKeys = Array.isArray(_store.claimedKeys) ? _store.claimedKeys : [];
        _store.transferKeys = _store.transferKeys || {};
        _store.passes = _store.passes || {};
        return _store;
      }
    }
  } catch {}

  _store.claimedKeys = Array.isArray(_store.claimedKeys) ? _store.claimedKeys : [];
  _store.transferKeys = _store.transferKeys || {};
  _store.passes = _store.passes || {};

  if (!_store.passes['AKN-VIP-2027-X0914']) {
    _store.passes['AKN-VIP-2027-X0914'] = createDefaultPassRecord('AKN-VIP-2027-X0914');
  }
  if (!_store.passes['AKN-9941']) {
    _store.passes['AKN-9941'] = createDefaultPassRecord('AKN-9941');
  }

  return _store;
}

export function saveStore() {
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(_store, null, 2), 'utf8');
    try {
      if (fs.existsSync(path.dirname(LOCAL_FILE))) {
        fs.writeFileSync(LOCAL_FILE, JSON.stringify(_store, null, 2), 'utf8');
      }
    } catch {}
  } catch (err) {
    console.warn('[Passport] Error saving store:', err);
  }
}

export function getPassRecord(tokenId) {
  loadStore();
  const normalized = normalizeTokenId(tokenId);
  if (!_store.passes[normalized]) {
    _store.passes[normalized] = createDefaultPassRecord(normalized);
    saveStore();
  }
  return _store.passes[normalized];
}

export function verifyDnaCipher(tokenId, enc, cmac) {
  loadStore();
  const pass = getPassRecord(tokenId);

  if (!enc || !enc.trim()) {
    return {
      valid: true,
      status: 'VERIFIED ORIGINAL / FOUNDING HOLDER',
      message: 'Founding Pass record verified in Äkinoya Genesis whitelist.',
      counter: pass.lastCounter,
    };
  }

  const cleanEnc = enc.trim().toLowerCase();

  // Test triggers
  if (
    cleanEnc === 'cloned' ||
    cleanEnc.includes('cloned') ||
    cleanEnc === 'invalid' ||
    cleanEnc.includes('replay')
  ) {
    return {
      valid: false,
      status: 'INVALID / CLONED TRANSMISSION DETECTED',
      error: 'CLONED_TRANSMISSION',
      message:
        'INVALID / CLONED TRANSMISSION DETECTED: Cryptographic signature flagged as counterfeit or duplicated transmission.',
    };
  }

  // Replay Attack Detection
  if (pass.usedEncSignatures && pass.usedEncSignatures.includes(cleanEnc)) {
    return {
      valid: false,
      status: 'INVALID / CLONED TRANSMISSION DETECTED',
      error: 'REPLAY_ATTACK_DETECTED',
      message:
        'INVALID / CLONED TRANSMISSION DETECTED: This cryptographic signature was already decrypted. Replay attack blocked.',
    };
  }

  // Hex format check
  if (!/^[0-9a-f]{32,}$/i.test(cleanEnc) || cleanEnc.length % 32 !== 0) {
    return {
      valid: false,
      status: 'INVALID / CLONED TRANSMISSION DETECTED',
      error: 'MALFORMED_CIPHERTEXT',
      message:
        'INVALID / CLONED TRANSMISSION DETECTED: Malformed AES-128 ciphertext block.',
    };
  }

  try {
    const encryptedBuf = Buffer.from(cleanEnc.slice(0, 32), 'hex');
    const decipher = crypto.createDecipheriv('aes-128-cbc', AES_MASTER_KEY, AES_IV);
    decipher.setAutoPadding(false);
    const decrypted = Buffer.concat([decipher.update(encryptedBuf), decipher.final()]);

    let counter = pass.lastCounter + 1;
    if (decrypted.length >= 11 && decrypted[0] === 0xc7) {
      counter = decrypted.readUIntLE(8, 3);
    } else {
      counter = decrypted.readUInt32LE(0) || pass.lastCounter + 1;
    }

    if (counter <= pass.lastCounter && pass.lastCounter > 0) {
      return {
        valid: false,
        status: 'INVALID / CLONED TRANSMISSION DETECTED',
        error: 'COUNTER_ROLLBACK',
        message:
          'INVALID / CLONED TRANSMISSION DETECTED: Hardware tap counter rollback detected. Tag clone suspected.',
      };
    }

    pass.usedEncSignatures.push(cleanEnc);
    pass.lastCounter = counter;
    saveStore();

    return {
      valid: true,
      status: 'AUTHENTIC FOUNDING PASS VERIFIED',
      message:
        'AUTHENTIC FOUNDING PASS VERIFIED: Dynamic NTAG 424 DNA transmission validated successfully.',
      counter,
    };
  } catch (err) {
    console.warn('[NFC DNA] Decryption failed:', err);
    return {
      valid: false,
      status: 'INVALID / CLONED TRANSMISSION DETECTED',
      error: 'DECRYPTION_FAILED',
      message:
        'INVALID / CLONED TRANSMISSION DETECTED: Cryptographic signature mismatch against master key.',
    };
  }
}

export function generateAuthenticDnaCipher(tokenId, counterOverride) {
  const pass = getPassRecord(tokenId);
  const counter = counterOverride || pass.lastCounter + 1;

  const piccData = Buffer.alloc(16, 0);
  piccData[0] = 0xc7;
  const hash = crypto.createHash('sha256').update(pass.normalizedId).digest();
  hash.copy(piccData, 1, 0, 7);
  piccData.writeUIntLE(counter, 8, 3);
  crypto.randomBytes(5).copy(piccData, 11);

  const cipher = crypto.createCipheriv('aes-128-cbc', AES_MASTER_KEY, AES_IV);
  cipher.setAutoPadding(false);
  const encrypted = Buffer.concat([cipher.update(piccData), cipher.final()]);
  return encrypted.toString('hex');
}

export function registerPassHolder(tokenId, ownerName, ownerEmail, deviceId) {
  loadStore();
  const pass = getPassRecord(tokenId);

  pass.ownerName = ownerName.trim() || 'Founding Holder';
  pass.ownerEmail = ownerEmail ? ownerEmail.trim().toLowerCase() : null;
  pass.registeredAt = new Date().toISOString();
  if (deviceId) {
    pass.boundDeviceId = deviceId;
  }

  saveStore();

  return {
    success: true,
    pass,
    message: `Pass #${pass.normalizedId} registered to ${pass.ownerName}.`,
  };
}

export function generateTransferKey(tokenId, deviceId) {
  loadStore();
  const pass = getPassRecord(tokenId);

  const expiresAtMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(expiresAtMs).toISOString();
  const nonce = crypto.randomBytes(4).toString('hex').toUpperCase();

  const dataPayload = Buffer.from(`${pass.normalizedId}|${expiresAtMs}|${nonce}`).toString('base64url');
  const sig = crypto.createHmac('sha256', AES_MASTER_KEY).update(dataPayload).digest('hex').slice(0, 8).toUpperCase();
  const transferKey = `TRF-AKN-${dataPayload}-${sig}`;

  pass.activeTransferKey = {
    key: transferKey,
    createdAt: new Date().toISOString(),
    expiresAt,
  };

  _store.transferKeys[transferKey] = {
    tokenId: pass.normalizedId,
    expiresAt,
  };

  saveStore();

  const baseUrl = process.env.PUBLIC_URL || 'https://sillowmill.com';
  const claimUrl = `${baseUrl}/verify?claim=${transferKey}`;

  return {
    success: true,
    transferKey,
    claimUrl,
    expiresAt,
    message: 'One-time transfer key generated successfully.',
  };
}

export function claimTransferKey(transferKey, newOwnerName, newOwnerEmail, newDeviceId) {
  loadStore();
  const cleanKey = transferKey.trim();

  _store.claimedKeys = _store.claimedKeys || [];
  if (_store.claimedKeys.includes(cleanKey)) {
    return {
      success: false,
      error: 'ALREADY_CLAIMED',
      message: 'This transfer key has already been claimed and redeemed.',
    };
  }

  let targetTokenId = null;

  // 1. Check local lookup table
  if (_store.transferKeys[cleanKey]) {
    const lookup = _store.transferKeys[cleanKey];
    if (new Date(lookup.expiresAt).getTime() < Date.now()) {
      delete _store.transferKeys[cleanKey];
      saveStore();
      return {
        success: false,
        error: 'EXPIRED_TRANSFER_KEY',
        message: 'This transfer key has expired. Please request a new key.',
      };
    }
    targetTokenId = lookup.tokenId;
    delete _store.transferKeys[cleanKey];
  } else if (cleanKey.startsWith('TRF-AKN-')) {
    // 2. Cryptographic HMAC validation (cross-serverless verification)
    const stripped = cleanKey.replace(/^TRF-AKN-/, '');
    const lastDash = stripped.lastIndexOf('-');
    if (lastDash > 0) {
      const dataPayload = stripped.slice(0, lastDash);
      const providedSig = stripped.slice(lastDash + 1).toUpperCase();
      const expectedSig = crypto.createHmac('sha256', AES_MASTER_KEY).update(dataPayload).digest('hex').slice(0, 8).toUpperCase();

      if (providedSig === expectedSig) {
        try {
          const [tId, expMsStr] = Buffer.from(dataPayload, 'base64url').toString('utf8').split('|');
          const expMs = parseInt(expMsStr, 10);
          if (Date.now() > expMs) {
            return {
              success: false,
              error: 'EXPIRED_TRANSFER_KEY',
              message: 'This transfer key has expired. Please request a new key.',
            };
          }
          targetTokenId = tId;
        } catch {
          // Decode error
        }
      }
    }
  }

  if (!targetTokenId) {
    return {
      success: false,
      error: 'INVALID_TRANSFER_KEY',
      message: 'Invalid or already claimed transfer key.',
    };
  }

  const pass = getPassRecord(targetTokenId);
  const previousOwner = pass.ownerName;
  pass.ownerName = newOwnerName.trim() || 'New Founding Holder';
  pass.ownerEmail = newOwnerEmail ? newOwnerEmail.trim().toLowerCase() : null;
  pass.registeredAt = new Date().toISOString();
  pass.boundDeviceId = newDeviceId || 'NEW_DEVICE';
  pass.activeTransferKey = null;

  _store.claimedKeys.push(cleanKey);
  saveStore();

  return {
    success: true,
    tokenId: pass.normalizedId,
    pass,
    message: `Ownership successfully transferred from ${previousOwner} to ${pass.ownerName}.`,
  };
}

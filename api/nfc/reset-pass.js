import { resetPassRecord, isValidPassId, normalizeTokenId } from './_nfcDnaService.js';
import { resetRedemption } from './redeem.js';
import { resetPassInGoogleSheets } from './_googleSheetsSync.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://qcfpnoerksbgunekoame.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_uQ928ayPw4vS7msW2_oZSQ_vTi22idX';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  let body = {};
  if (req.method === 'POST') {
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch {
      body = {};
    }
  } else {
    body = req.query || {};
  }

  const rawToken = body.token || body.id || req.query.token || req.query.id || 'AKN-VIP-2027-X001';
  const token = normalizeTokenId(rawToken);

  if (!isValidPassId(token)) {
    res.statusCode = 400;
    return res.end(
      JSON.stringify({
        success: false,
        error: 'INVALID_PASS_ID',
        message: 'Pass ID not recognized.',
      })
    );
  }

  console.log(`[VIP Reset] Resetting VIP pass: ${token}`);

  // 1. Reset in NFC DNA Service store (in-memory & json files)
  const passRecord = resetPassRecord(token);

  // 2. Reset in NFC Redemptions store
  resetRedemption(token);

  // 3. Reset in Google Sheets if configured
  const sheetResult = await resetPassInGoogleSheets(token);

  // 4. Reset in Supabase if reachable
  let supabaseResult = { success: false, reason: 'NOT_ATTEMPTED' };
  try {
    const { error: tokenErr } = await supabase
      .from('vip_tokens')
      .update({
        is_claimed: false,
        claimed_by_user_id: null,
        claimed_holder_name: null,
        claimed_holder_email: null,
        claimed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('token_code', token);

    const { error: profErr } = await supabase
      .from('profiles')
      .update({
        vip_code_redeemed: null,
        has_vip_pass: false,
        is_vip: false,
        updated_at: new Date().toISOString(),
      })
      .eq('vip_code_redeemed', token);

    supabaseResult = {
      success: !tokenErr && !profErr,
      tokenError: tokenErr?.message,
      profileError: profErr?.message,
    };
  } catch (err) {
    supabaseResult = { success: false, error: err.message };
  }

  res.statusCode = 200;
  return res.end(
    JSON.stringify({
      success: true,
      token,
      message: `Digital VIP Pass ${token} has been fully reset to active / unclaimed status.`,
      pass: passRecord,
      sheetResult,
      supabaseResult,
      resetAt: new Date().toISOString(),
    })
  );
}

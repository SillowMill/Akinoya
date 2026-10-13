import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch {
    body = {};
  }

  const tokenParam = (body.token || body.vip_token || req.query?.token || '').trim().toUpperCase().replace(/^#/, '');
  const userId = (body.userId || req.query?.userId || '').trim();

  if (!tokenParam || !userId) {
    res.statusCode = 400;
    return res.end(JSON.stringify({
      success: false,
      error: 'MISSING_FIELDS',
      message: 'Both token and userId are required to claim VIP access.',
    }));
  }

  if (supabase) {
    try {
      const { data: existing, error: findErr } = await supabase
        .from('vip_tokens')
        .select('*')
        .eq('token_code', tokenParam)
        .maybeSingle();

      if (!findErr && existing && existing.is_claimed) {
        if (existing.claimed_by_user_id === userId) {
          res.statusCode = 200;
          return res.end(JSON.stringify({
            success: true,
            is_claimed: true,
            is_mine: true,
            message: 'Token already claimed by this user.',
          }));
        }
        res.statusCode = 403;
        return res.end(JSON.stringify({
          success: false,
          error: 'TOKEN_ALREADY_CLAIMED',
          message: 'THIS VIP LINK HAS ALREADY BEEN CLAIMED',
        }));
      }

      const nowIso = new Date().toISOString();

      if (existing) {
        await supabase
          .from('vip_tokens')
          .update({
            is_claimed: true,
            claimed_by_user_id: userId,
            claimed_at: nowIso,
            updated_at: nowIso,
          })
          .eq('token_code', tokenParam);
      } else {
        await supabase
          .from('vip_tokens')
          .insert({
            token_code: tokenParam,
            is_claimed: true,
            claimed_by_user_id: userId,
            claimed_at: nowIso,
            updated_at: nowIso,
          });
      }

      // Update public.profiles
      await supabase
        .from('profiles')
        .update({
          has_vip_pass: true,
          is_vip: true,
          role: tokenParam === 'AKN-VIP-2027-X0914' ? 'CREATOR' : 'VIP_GUEST',
          vip_code_redeemed: tokenParam,
          updated_at: nowIso,
        })
        .eq('id', userId);

      res.statusCode = 200;
      return res.end(JSON.stringify({
        success: true,
        message: 'VIP Pass successfully bound to account.',
        token: tokenParam,
      }));
    } catch (err) {
      console.warn('[API VIP Claim] Supabase claim error:', err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ success: false, error: 'DB_ERROR', message: 'Failed to bind token in database.' }));
    }
  }

  res.statusCode = 200;
  return res.end(JSON.stringify({
    success: true,
    message: 'VIP Pass successfully bound (simulated mode).',
    token: tokenParam,
  }));
}

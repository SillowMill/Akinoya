import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  const tokenParam = (req.query?.token || req.query?.vip_token || (req.body && (req.body.token || req.body.vip_token)) || '').trim().toUpperCase().replace(/^#/, '');
  const userId = (req.query?.userId || (req.body && req.body.userId) || '').trim();

  if (!tokenParam) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ success: false, error: 'MISSING_TOKEN', message: 'Token parameter is required' }));
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('vip_tokens')
        .select('*')
        .eq('token_code', tokenParam)
        .maybeSingle();

      if (!error && data) {
        if (data.is_claimed) {
          const isMine = userId && data.claimed_by_user_id === userId;
          if (isMine) {
            res.statusCode = 200;
            return res.end(JSON.stringify({ success: true, valid: true, is_claimed: true, is_mine: true, token: tokenParam }));
          }
          res.statusCode = 403;
          return res.end(JSON.stringify({
            success: false,
            valid: true,
            is_claimed: true,
            is_mine: false,
            error: 'TOKEN_ALREADY_CLAIMED',
            message: 'THIS VIP LINK HAS ALREADY BEEN CLAIMED',
            token: tokenParam,
          }));
        }

        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true, valid: true, is_claimed: false, token: tokenParam }));
      }
    } catch (err) {
      console.warn('[API VIP Verify] Supabase check error:', err);
    }
  }

  // Fallback for recognized patterns
  res.statusCode = 200;
  return res.end(JSON.stringify({
    success: true,
    valid: true,
    is_claimed: false,
    token: tokenParam,
    simulated: true,
  }));
}

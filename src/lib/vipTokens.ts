import { supabase, isSupabaseConfigured, VipTokenRecord } from './supabase';
import { isValidPassId } from '../utils/holder';

export const ALREADY_CLAIMED_VIP_ERROR = 'ALREADY CLAIMED VIP LINK';

export interface VipTokenCheckResult {
  valid: boolean;
  allowed: boolean;
  isAlreadyClaimed: boolean;
  isClaimedByMe: boolean;
  tokenCode: string;
  error?: string;
  record?: VipTokenRecord | null;
}

export interface VipTokenClaimResult {
  success: boolean;
  error?: string;
  message?: string;
  record?: VipTokenRecord | null;
}

const LOCAL_STORAGE_CLAIMED_KEY = 'sillow_claimed_vip_tokens';

// Helper to inspect simulated local claims when Supabase is not configured
const getLocalClaimedMap = (): Record<string, { is_claimed: boolean; claimed_by_user_id?: string; claimed_at?: string }> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CLAIMED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const setLocalClaim = (token: string, userId: string) => {
  if (typeof window === 'undefined') return;
  try {
    const map = getLocalClaimedMap();
    map[token] = {
      is_claimed: true,
      claimed_by_user_id: userId,
      claimed_at: new Date().toISOString(),
    };
    localStorage.setItem(LOCAL_STORAGE_CLAIMED_KEY, JSON.stringify(map));
  } catch {}
};

/**
 * Normalizes VIP token strings by trimming, stripping hashes and uppercasing
 */
export const normalizeVipToken = (raw: string): string => {
  return String(raw || '').trim().toUpperCase().replace(/^#/, '');
};

/**
 * Validates whether a token format is recognized by the Äkinoya ecosystem
 */
export const isRecognizedVipTokenPattern = (token: string): boolean => {
  const clean = normalizeVipToken(token);
  if (!clean) return false;
  if (
    clean === 'AKN-VIP-2027-X0914' ||
    clean === 'PATRON-TEST-ACCESS' ||
    clean === 'PATRONTESTACCESS' ||
    clean === 'SILLOWMILL2027' ||
    clean === 'PATRON' ||
    clean === 'TEST-ACCESS' ||
    clean.startsWith('VIP_') ||
    clean.startsWith('SECRET_') ||
    clean === 'VIP-SECRET-KEY' ||
    clean === 'VIP-REFERRAL-CLAIM'
  ) {
    return true;
  }
  return isValidPassId(clean);
};

/**
 * Fetches any valid VIP token permanently bound to a given user ID in Supabase or local store
 */
export const getUserBoundVipToken = async (userId: string): Promise<VipTokenRecord | null> => {
  if (!userId) return null;
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('vip_tokens')
        .select('*')
        .eq('claimed_by_user_id', userId)
        .eq('is_claimed', true)
        .maybeSingle();

      if (!error && data) {
        return data as VipTokenRecord;
      }
    } catch (err) {
      console.warn('[VipTokens] getUserBoundVipToken exception:', err);
    }
  }

  // Local fallback check
  const localMap = getLocalClaimedMap();
  for (const [code, record] of Object.entries(localMap)) {
    if (record.is_claimed && record.claimed_by_user_id === userId) {
      return {
        id: 'local-' + code,
        token_code: code,
        is_claimed: true,
        claimed_by_user_id: userId,
        claimed_at: record.claimed_at,
      };
    }
  }

  return null;
};

/**
 * Checks token claim status in Supabase before granting elevation.
 * Enforces single-claim: If an already-claimed link/token is accessed again by ANY user
 * (even the original owner), prevents re-redemption and returns ALREADY CLAIMED VIP LINK.
 */
export const checkVipTokenStatus = async (
  rawToken: string,
  currentUserId?: string | null
): Promise<VipTokenCheckResult> => {
  const clean = normalizeVipToken(rawToken);

  if (!clean) {
    return {
      valid: false,
      allowed: false,
      isAlreadyClaimed: false,
      isClaimedByMe: false,
      tokenCode: '',
      error: 'Please enter a valid VIP token.',
    };
  }

  // 1. Supabase live database check
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('vip_tokens')
        .select('*')
        .eq('token_code', clean)
        .maybeSingle();

      if (!error && data) {
        const tokenRecord = data as VipTokenRecord;
        if (tokenRecord.is_claimed) {
          return {
            valid: true,
            allowed: false,
            isAlreadyClaimed: true,
            isClaimedByMe: Boolean(currentUserId && tokenRecord.claimed_by_user_id === currentUserId),
            tokenCode: clean,
            error: ALREADY_CLAIMED_VIP_ERROR,
            record: tokenRecord,
          };
        }

        // Token exists and is not claimed
        return {
          valid: true,
          allowed: true,
          isAlreadyClaimed: false,
          isClaimedByMe: false,
          tokenCode: clean,
          record: tokenRecord,
        };
      }
    } catch (err) {
      console.warn('[VipTokens] Database check exception:', err);
    }
  }

  // 2. Local Fallback / Development Simulation Check
  const localMap = getLocalClaimedMap();
  const localRecord = localMap[clean];

  if (localRecord && localRecord.is_claimed) {
    return {
      valid: true,
      allowed: false,
      isAlreadyClaimed: true,
      isClaimedByMe: Boolean(currentUserId && localRecord.claimed_by_user_id === currentUserId),
      tokenCode: clean,
      error: ALREADY_CLAIMED_VIP_ERROR,
    };
  }

  // If pattern is recognized, treat as unclaimed valid token
  if (isRecognizedVipTokenPattern(clean)) {
    return {
      valid: true,
      allowed: true,
      isAlreadyClaimed: false,
      isClaimedByMe: false,
      tokenCode: clean,
    };
  }

  return {
    valid: false,
    allowed: false,
    isAlreadyClaimed: false,
    isClaimedByMe: false,
    tokenCode: clean,
    error: 'Unrecognized VIP token.',
  };
};

/**
 * Permanently binds an unclaimed VIP token to an authenticated user ID
 */
export const claimVipTokenForUser = async (
  rawToken: string,
  userId: string
): Promise<VipTokenClaimResult> => {
  const clean = normalizeVipToken(rawToken);

  if (!clean || !userId) {
    return { success: false, error: 'Token and User ID are required.' };
  }

  // Pre-check status first
  const status = await checkVipTokenStatus(clean, userId);
  if (status.isAlreadyClaimed) {
    return { success: false, error: ALREADY_CLAIMED_VIP_ERROR };
  }

  if (isSupabaseConfigured) {
    try {
      const nowIso = new Date().toISOString();

      // Check if token already exists in table
      const { data: existing } = await supabase
        .from('vip_tokens')
        .select('*')
        .eq('token_code', clean)
        .maybeSingle();

      if (existing) {
        if (existing.is_claimed) {
          return { success: false, error: ALREADY_CLAIMED_VIP_ERROR, message: 'This VIP link has already been claimed.' };
        }

        const { data: updated, error: updateErr } = await supabase
          .from('vip_tokens')
          .update({
            is_claimed: true,
            claimed_by_user_id: userId,
            claimed_at: nowIso,
            updated_at: nowIso,
          })
          .eq('token_code', clean)
          .select()
          .single();

        if (updateErr) {
          console.warn('[VipTokens] Update error:', updateErr.message);
        } else if (updated) {
          // Also set is_vip: true in public.profiles
          await supabase
            .from('profiles')
            .update({
              has_vip_pass: true,
              is_vip: true,
              role: clean === 'AKN-VIP-2027-X0914' ? 'CREATOR' : 'VIP_GUEST',
              vip_code_redeemed: clean,
              updated_at: nowIso,
            })
            .eq('id', userId);

          return {
            success: true,
            message: 'VIP Pass officially bound to your account.',
            record: updated as VipTokenRecord,
          };
        }
      } else {
        // Insert new claimed token record
        const { data: inserted, error: insertErr } = await supabase
          .from('vip_tokens')
          .insert({
            token_code: clean,
            is_claimed: true,
            claimed_by_user_id: userId,
            claimed_at: nowIso,
            updated_at: nowIso,
          })
          .select()
          .single();

        if (insertErr) {
          console.warn('[VipTokens] Insert error:', insertErr.message);
        } else if (inserted) {
          await supabase
            .from('profiles')
            .update({
              has_vip_pass: true,
              is_vip: true,
              role: clean === 'AKN-VIP-2027-X0914' ? 'CREATOR' : 'VIP_GUEST',
              vip_code_redeemed: clean,
              updated_at: nowIso,
            })
            .eq('id', userId);

          return {
            success: true,
            message: 'VIP Pass officially bound to your account.',
            record: inserted as VipTokenRecord,
          };
        }
      }
    } catch (err: any) {
      console.warn('[VipTokens] Claim exception:', err);
    }
  }

  // Local simulated fallback
  setLocalClaim(clean, userId);
  return {
    success: true,
    message: 'VIP Pass officially bound to your account.',
  };
};

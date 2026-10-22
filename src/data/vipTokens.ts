import { supabase, isSupabaseConfigured, VipTokenRecord } from '../lib/supabase';
import { isValidPassId } from '../utils/holder';

export const PRIMARY_FOUNDER_EMAIL = 'odi.selis3@gmail.com';
export const FOUNDER_PASS_TOKEN = 'AKN-VIP-2027-X0914';

export const PASS_ALREADY_CLAIMED_ERROR = 'Ai! Deze VIP-pas is al geclaimd.';
export const ALREADY_CLAIMED_VIP_ERROR = 'Ai! Deze VIP-pas is al geclaimd.';
export const OTHER_ACCOUNT_VIP_ERROR = 'Ai! Deze VIP-pas is al geclaimd.';

export interface VipTokenCheckResult {
  valid: boolean;
  allowed: boolean;
  isAlreadyClaimed: boolean;
  isClaimedByMe: boolean;
  tokenCode: string;
  boundEmail?: string | null;
  error?: string;
  record?: VipTokenRecord | null;
}

export interface VipTokenClaimResult {
  success: boolean;
  error?: string;
  message?: string;
  record?: VipTokenRecord | null;
}

export interface VipRegistryEntry {
  tokenCode: string;
  editionNumber: number;
  isFounderPass: boolean;
  isClaimed: boolean;
  boundEmail: string | null;
  holderName: string | null;
  claimedAt: string | null;
}

const LOCAL_STORAGE_CLAIMED_KEY = 'sillow_claimed_vip_tokens';
const VIP_REGISTRY_REFRESH_VERSION_KEY = 'sillow_vip_registry_refresh_version';
const CURRENT_VIP_REFRESH_VERSION = '2027-vip-reset-v4-clean-email-bind';

/**
 * Generates the clean 100-pass registry + Founder Pass (#0).
 * All guest passes (X001..X100) have zero pre-bound emails.
 * Founder Pass (#0 / AKN-VIP-2027-X0914) is designated for primary founder odi.selis3@gmail.com.
 */
export const INITIAL_VIP_TOKEN_REGISTRY: Record<string, VipRegistryEntry> = (() => {
  const reg: Record<string, VipRegistryEntry> = {
    [FOUNDER_PASS_TOKEN]: {
      tokenCode: FOUNDER_PASS_TOKEN,
      editionNumber: 0,
      isFounderPass: true,
      isClaimed: true,
      boundEmail: PRIMARY_FOUNDER_EMAIL,
      holderName: 'Odi Selis',
      claimedAt: null,
    },
  };

  for (let i = 1; i <= 100; i++) {
    const code = `AKN-VIP-2027-X${String(i).padStart(3, '0')}`;
    reg[code] = {
      tokenCode: code,
      editionNumber: i,
      isFounderPass: false,
      isClaimed: false,
      boundEmail: null,
      holderName: null,
      claimedAt: null,
    };
  }
  return reg;
})();

/**
 * One-time automatic client storage invalidation so no legacy or cached email
 * (such as odi.selis1@gmail.com) remains auto-linked to any VIP pass.
 */
export const ensureVipTokenRegistryRefresh = (): void => {
  if (typeof window === 'undefined') return;
  try {
    const appliedVersion = localStorage.getItem(VIP_REGISTRY_REFRESH_VERSION_KEY);
    if (appliedVersion !== CURRENT_VIP_REFRESH_VERSION) {
      localStorage.removeItem(LOCAL_STORAGE_CLAIMED_KEY);
      localStorage.removeItem('sillow_vip_bound_token');
      sessionStorage.removeItem('sillow_vip_bound_token');
      localStorage.removeItem('sillow_vip_device_access');
      sessionStorage.removeItem('sillow_vip_device_access');
      localStorage.removeItem('akinoya_vip_unlocked');
      sessionStorage.removeItem('akinoya_vip_unlocked');
      localStorage.removeItem('akinoya_patron_token');
      sessionStorage.removeItem('akinoya_patron_token');
      localStorage.removeItem('akinoya_patron_role');
      sessionStorage.removeItem('akinoya_patron_role');
      localStorage.removeItem('pending_vip_pass');
      localStorage.removeItem('akinoya_pending_vip_pass');
      sessionStorage.removeItem('pending_vip_code');
      localStorage.removeItem('pending_role');
      sessionStorage.removeItem('pending_role');
      localStorage.removeItem('akinoya_bingaa_certificates');
      localStorage.removeItem('akinoya_holder_name');
      localStorage.removeItem('user_generation_claimed');
      localStorage.removeItem('akinoya_guest_generations');

      // Also scrub any cached profile that had legacy auto-linked VIP status without a valid claim
      const rawProf = localStorage.getItem('akinoya_auth_profile');
      if (rawProf) {
        try {
          const parsed = JSON.parse(rawProf);
          const email = String(parsed?.email || '').trim().toLowerCase();
          if (email && email !== PRIMARY_FOUNDER_EMAIL) {
            parsed.has_vip_pass = false;
            parsed.is_vip = false;
            parsed.vip_code_redeemed = null;
            if (parsed.role === 'VIP_GUEST' || parsed.role === 'CREATOR') {
              parsed.role = 'FREE';
            }
            localStorage.setItem('akinoya_auth_profile', JSON.stringify(parsed));
          }
        } catch {}
      }

      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('akinoya_holder_name_') || k.startsWith('akinoya_pending_')) {
          localStorage.removeItem(k);
        }
      });

      localStorage.setItem(VIP_REGISTRY_REFRESH_VERSION_KEY, CURRENT_VIP_REFRESH_VERSION);
    }
  } catch {}
};

// Execute refresh check immediately when module loads in browser
ensureVipTokenRegistryRefresh();

interface LocalClaimEntry {
  is_claimed: boolean;
  claimed_by_user_id?: string;
  claimed_holder_email?: string;
  claimed_holder_name?: string;
  claimed_at?: string;
}

const getLocalClaimedMap = (): Record<string, LocalClaimEntry> => {
  if (typeof window === 'undefined') return {};
  ensureVipTokenRegistryRefresh();
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CLAIMED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const setLocalClaim = (
  token: string,
  userId: string,
  holderEmail?: string,
  holderName?: string
) => {
  if (typeof window === 'undefined') return;
  try {
    const map = getLocalClaimedMap();
    map[token] = {
      is_claimed: true,
      claimed_by_user_id: userId,
      claimed_holder_email: holderEmail ? holderEmail.trim().toLowerCase() : undefined,
      claimed_holder_name: holderName ? holderName.trim() : undefined,
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
 * Strictly checks if the email is the primary Founder Pass owner (odi.selis3@gmail.com).
 * All legacy auto-linking rules (including odi.selis1@gmail.com) are removed.
 */
export const isFounderEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return clean === PRIMARY_FOUNDER_EMAIL;
};

/**
 * Validates whether a token format is recognized by the Äkinoya ecosystem
 */
export const isRecognizedVipTokenPattern = (token: string): boolean => {
  const clean = normalizeVipToken(token);
  if (!clean) return false;
  if (clean === FOUNDER_PASS_TOKEN) {
    return true;
  }
  return isValidPassId(clean);
};

/**
 * Fetches any valid VIP token permanently bound to a given user ID or email in Supabase or local store
 */
export const getUserBoundVipToken = async (
  userId: string,
  userEmail?: string | null
): Promise<VipTokenRecord | null> => {
  const cleanEmail = (userEmail || '').trim().toLowerCase();
  if (!userId && !cleanEmail) return null;

  if (isSupabaseConfigured) {
    try {
      if (cleanEmail) {
        const { data: byEmail, error: emailErr } = await supabase
          .from('vip_tokens')
          .select('*')
          .ilike('claimed_holder_email', cleanEmail)
          .eq('is_claimed', true)
          .maybeSingle();

        if (!emailErr && byEmail) {
          return byEmail as VipTokenRecord;
        }
      }

      if (userId) {
        const { data, error } = await supabase
          .from('vip_tokens')
          .select('*')
          .eq('claimed_by_user_id', userId)
          .eq('is_claimed', true)
          .maybeSingle();

        if (!error && data) {
          const rec = data as VipTokenRecord;
          // Verify email consistency if record has an email bound
          if (
            rec.claimed_holder_email &&
            cleanEmail &&
            rec.claimed_holder_email.trim().toLowerCase() !== cleanEmail
          ) {
            return null;
          }
          return rec;
        }
      }
    } catch (err) {
      console.warn('[VipTokens] getUserBoundVipToken exception:', err);
    }
  }

  // Local fallback check
  const localMap = getLocalClaimedMap();
  for (const [code, record] of Object.entries(localMap)) {
    if (!record.is_claimed) continue;
    if (cleanEmail && record.claimed_holder_email) {
      if (record.claimed_holder_email.trim().toLowerCase() === cleanEmail) {
        return {
          id: 'local-' + code,
          token_code: code,
          is_claimed: true,
          claimed_by_user_id: record.claimed_by_user_id || userId,
          claimed_holder_email: record.claimed_holder_email,
          claimed_holder_name: record.claimed_holder_name,
          claimed_at: record.claimed_at,
        };
      }
      continue;
    }
    if (userId && record.claimed_by_user_id === userId) {
      return {
        id: 'local-' + code,
        token_code: code,
        is_claimed: true,
        claimed_by_user_id: userId,
        claimed_holder_email: record.claimed_holder_email,
        claimed_holder_name: record.claimed_holder_name,
        claimed_at: record.claimed_at,
      };
    }
  }

  return null;
};

/**
 * Checks token claim status in Supabase & local registry before granting elevation.
 * Strict 1-to-1 email binding:
 * - If bound to a different email address, blocks the claim and returns "Pass already claimed".
 */
export const checkVipTokenStatus = async (
  rawToken: string,
  currentUserId?: string | null,
  currentUserEmail?: string | null
): Promise<VipTokenCheckResult> => {
  const clean = normalizeVipToken(rawToken);
  const cleanEmail = (currentUserEmail || '').trim().toLowerCase();

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

  const isMasterToken =
    clean === FOUNDER_PASS_TOKEN || clean === 'AKN-2027' || clean === 'AKN-VIP-2027';

  // Founder Pass (#0) is strictly bound to primary Founder Pass owner (odi.selis3@gmail.com)
  if (isMasterToken) {
    if (cleanEmail && !isFounderEmail(cleanEmail)) {
      return {
        valid: true,
        allowed: false,
        isAlreadyClaimed: true,
        isClaimedByMe: false,
        tokenCode: clean,
        boundEmail: PRIMARY_FOUNDER_EMAIL,
        error: PASS_ALREADY_CLAIMED_ERROR,
      };
    }
    if (cleanEmail && isFounderEmail(cleanEmail)) {
      return {
        valid: true,
        allowed: true,
        isAlreadyClaimed: true,
        isClaimedByMe: true,
        tokenCode: clean,
        boundEmail: PRIMARY_FOUNDER_EMAIL,
      };
    }
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
        const boundEmail = (tokenRecord.claimed_holder_email || '').trim().toLowerCase();

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
              record: tokenRecord,
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
            record: tokenRecord,
          };
        }

        // Token exists and is unclaimed
        return {
          valid: true,
          allowed: true,
          isAlreadyClaimed: false,
          isClaimedByMe: false,
          tokenCode: clean,
          boundEmail: null,
          record: tokenRecord,
        };
      }
    } catch (err) {
      console.warn('[VipTokens] Database check exception:', err);
    }
  }

  // 2. Local Fallback / Registry Check
  const localMap = getLocalClaimedMap();
  const localRecord = localMap[clean];

  if (localRecord && (localRecord.is_claimed || localRecord.claimed_holder_email)) {
    const localBoundEmail = (localRecord.claimed_holder_email || '').trim().toLowerCase();
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
        boundEmail: localBoundEmail || null,
      };
    }
    return {
      valid: true,
      allowed: false,
      isAlreadyClaimed: true,
      isClaimedByMe: false,
      tokenCode: clean,
      boundEmail: localBoundEmail || null,
      error: PASS_ALREADY_CLAIMED_ERROR,
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
      boundEmail: null,
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
 * Permanently binds an unclaimed VIP token to the first email address and user ID that claims it.
 * Enforces strict 1-to-1 email binding: if already claimed by another email, returns "Pass already claimed".
 */
export const claimVipTokenForUser = async (
  rawToken: string,
  userId: string,
  holderName?: string,
  holderEmail?: string
): Promise<VipTokenClaimResult> => {
  const clean = normalizeVipToken(rawToken);
  const cleanEmail = (holderEmail || '').trim().toLowerCase();

  if (!clean || (!userId && !cleanEmail)) {
    return { success: false, error: 'Token and User Email/ID are required.' };
  }

  const isMasterToken =
    clean === FOUNDER_PASS_TOKEN || clean === 'AKN-2027' || clean === 'AKN-VIP-2027';

  // Founder Pass (#0) strict check for primary owner odi.selis3@gmail.com
  if (isMasterToken) {
    if (!isFounderEmail(cleanEmail)) {
      return {
        success: false,
        error: PASS_ALREADY_CLAIMED_ERROR,
        message: PASS_ALREADY_CLAIMED_ERROR,
      };
    }
    const nowIso = new Date().toISOString();
    const updateData: Record<string, any> = {
      is_claimed: true,
      claimed_by_user_id: userId,
      claimed_holder_name: holderName || 'Odi Selis',
      claimed_holder_email: PRIMARY_FOUNDER_EMAIL,
      claimed_at: nowIso,
      updated_at: nowIso,
    };
    if (isSupabaseConfigured) {
      try {
        const { data: existing } = await supabase
          .from('vip_tokens')
          .select('id')
          .eq('token_code', clean)
          .maybeSingle();
        if (existing) {
          await supabase.from('vip_tokens').update(updateData).eq('token_code', clean);
        } else {
          await supabase.from('vip_tokens').insert({ token_code: clean, ...updateData });
        }
      } catch (err) {
        console.warn('[VipTokens] Founder token update notice:', err);
      }
    }
    setLocalClaim(clean, userId, PRIMARY_FOUNDER_EMAIL, holderName || 'Odi Selis');
    return {
      success: true,
      message: 'Founders Pass (#0) bound to odi.selis3@gmail.com.',
    };
  }

  // Pre-check status first
  const status = await checkVipTokenStatus(clean, userId, cleanEmail);
  if (!status.valid) {
    return {
      success: false,
      error: status.error || 'Unrecognized VIP token.',
      message: status.error || 'Unrecognized VIP token.',
    };
  }

  if (status.isAlreadyClaimed) {
    if (status.isClaimedByMe) {
      return {
        success: true,
        message: 'VIP Pass already bound to your account.',
        record: status.record,
      };
    }
    return {
      success: false,
      error: PASS_ALREADY_CLAIMED_ERROR,
      message: PASS_ALREADY_CLAIMED_ERROR,
    };
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
        const existingBoundEmail = (existing.claimed_holder_email || '').trim().toLowerCase();
        if (existing.is_claimed || existingBoundEmail) {
          const isSameEmail = Boolean(cleanEmail && existingBoundEmail && cleanEmail === existingBoundEmail);
          const isSameUser = Boolean(!existingBoundEmail && userId && existing.claimed_by_user_id === userId);
          if (isSameEmail || isSameUser) {
            return {
              success: true,
              message: 'VIP Pass already bound to your account.',
              record: existing as VipTokenRecord,
            };
          }
          return {
            success: false,
            error: PASS_ALREADY_CLAIMED_ERROR,
            message: PASS_ALREADY_CLAIMED_ERROR,
          };
        }

        const updateData: Record<string, any> = {
          is_claimed: true,
          claimed_by_user_id: userId,
          claimed_at: nowIso,
          updated_at: nowIso,
        };
        if (holderName) updateData.claimed_holder_name = holderName.trim();
        if (cleanEmail) updateData.claimed_holder_email = cleanEmail;

        const { data: updated, error: updateErr } = await supabase
          .from('vip_tokens')
          .update(updateData)
          .eq('token_code', clean)
          .select()
          .single();

        if (updateErr) {
          console.warn('[VipTokens] Update error:', updateErr.message);
        } else if (updated) {
          await supabase
            .from('profiles')
            .update({
              has_vip_pass: true,
              is_vip: true,
              role: clean === FOUNDER_PASS_TOKEN ? 'CREATOR' : 'VIP_GUEST',
              vip_code_redeemed: clean,
              updated_at: nowIso,
            })
            .eq('id', userId);

          setLocalClaim(clean, userId, cleanEmail, holderName);
          return {
            success: true,
            message: 'VIP Pass officially bound to your account.',
            record: updated as VipTokenRecord,
          };
        }
      } else {
        // Insert new claimed token record
        const insertData: Record<string, any> = {
          token_code: clean,
          is_claimed: true,
          claimed_by_user_id: userId,
          claimed_at: nowIso,
          updated_at: nowIso,
        };
        if (holderName) insertData.claimed_holder_name = holderName.trim();
        if (cleanEmail) insertData.claimed_holder_email = cleanEmail;

        const { data: inserted, error: insertErr } = await supabase
          .from('vip_tokens')
          .insert(insertData)
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
              role: clean === FOUNDER_PASS_TOKEN ? 'CREATOR' : 'VIP_GUEST',
              vip_code_redeemed: clean,
              updated_at: nowIso,
            })
            .eq('id', userId);

          setLocalClaim(clean, userId, cleanEmail, holderName);
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

  // Local fallback
  setLocalClaim(clean, userId, cleanEmail, holderName);
  return {
    success: true,
    message: 'VIP Pass officially bound to your account.',
  };
};

/**
 * Resets all 100 VIP guest tokens in Supabase and local cache to unclaimed,
 * and sets odi.selis3@gmail.com as the primary Founder Pass owner.
 */
export const resetAllVipTokens = async (): Promise<{ success: boolean; count?: number; error?: string }> => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(VIP_REGISTRY_REFRESH_VERSION_KEY);
      ensureVipTokenRegistryRefresh();
    } catch {}
  }

  if (isSupabaseConfigured) {
    try {
      const nowIso = new Date().toISOString();
      // Reset all guest tokens (X001-X100) to unclaimed
      const { data, error } = await supabase
        .from('vip_tokens')
        .update({
          is_claimed: false,
          claimed_by_user_id: null,
          claimed_holder_name: null,
          claimed_holder_email: null,
          claimed_at: null,
          updated_at: nowIso,
        })
        .neq('token_code', FOUNDER_PASS_TOKEN)
        .select();

      // Ensure Founder Pass (#0) is bound to odi.selis3@gmail.com
      await supabase
        .from('vip_tokens')
        .upsert(
          {
            token_code: FOUNDER_PASS_TOKEN,
            is_claimed: true,
            claimed_holder_name: 'Odi Selis',
            claimed_holder_email: PRIMARY_FOUNDER_EMAIL,
            updated_at: nowIso,
          },
          { onConflict: 'token_code' }
        );

      // Clear automatic pass bindings on non-founder profiles
      await supabase
        .from('profiles')
        .update({
          vip_code_redeemed: null,
          has_vip_pass: false,
          is_vip: false,
          role: 'FREE',
          updated_at: nowIso,
        })
        .neq('email', PRIMARY_FOUNDER_EMAIL);

      if (error) {
        console.warn('[VipTokens] Supabase reset error:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true, count: data?.length || 100 };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  return { success: true, count: 100 };
};

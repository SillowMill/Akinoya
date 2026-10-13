import { createClient } from '@supabase/supabase-js';

export type UserRole = 'FREE' | 'GUEST' | 'VIP_GUEST' | 'SUBSCRIBER' | 'ANNUAL_PASS' | 'CREATOR';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: UserRole;
  has_vip_pass?: boolean;
  subscription_status?: string; // 'active' | 'inactive' | 'trialing' | 'canceled'
  vip_code_redeemed?: string | null;
  is_vip?: boolean;
  is_subscriber?: boolean;
  is_annual_member?: boolean;
  unlocked_assets?: string[];
  contest_submission_id?: string | null;
  has_submitted_contest?: boolean;
  // Creator Portfolios & Artist Verification
  username?: string;
  bio?: string;
  social_links?: {
    twitter?: string;
    instagram?: string;
    soundcloud?: string;
    spotify?: string;
    artstation?: string;
    website?: string;
  };
  is_artist?: boolean;
  portfolio_likes_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface VipTokenRecord {
  id: string;
  token_code: string;
  is_claimed: boolean;
  claimed_by_user_id?: string | null;
  claimed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

const supabaseUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL : '') ||
  'https://placeholder-project.supabase.co';

const supabaseAnonKey =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY : '') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  !supabaseUrl.includes('placeholder-project') &&
  Boolean(supabaseAnonKey) &&
  !supabaseAnonKey.includes('placeholder');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

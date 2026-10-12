import { createClient } from '@supabase/supabase-js';

export type UserRole = 'FREE' | 'VIP_GUEST' | 'ANNUAL_PASS' | 'CREATOR';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: UserRole;
  vip_code_redeemed?: string | null;
  is_vip?: boolean;
  is_annual_member?: boolean;
  unlocked_assets?: string[];
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

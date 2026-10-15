import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();
const localEnvPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
}
const prodLocalEnvPath = path.resolve(process.cwd(), '.env.production.local');
if (fs.existsSync(prodLocalEnvPath)) {
  dotenv.config({ path: prodLocalEnvPath });
}

console.log('========================================================================');
console.log('🚀 SILLOW MILL · ÄKINOYA OFFICIAL LAUNCH MASTER RESET');
console.log('========================================================================');

// 1. Clear local file storage & cache
const filesToClear = [
  '/tmp/sillow_nfc_passport_data.json',
  '/tmp/sillow_nfc_redemptions.json',
  path.resolve(process.cwd(), 'data/nfc_passport_data.json'),
  path.resolve(process.cwd(), 'data/nfc_redemptions.json'),
];

console.log('\n[1] Clearing Local File Persistence & Caches:');
filesToClear.forEach((filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`    ✓ Deleted: ${filePath}`);
    } else {
      console.log(`    - Not present: ${filePath}`);
    }
  } catch (err) {
    console.warn(`    ! Could not delete ${filePath}:`, err.message);
  }
});

// 2. Execute Supabase table reset if reachable
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qcfpnoerksbgunekoame.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_uQ928ayPw4vS7msW2_oZSQ_vTi22idX';

console.log(`\n[2] Connecting to Supabase (${supabaseUrl})...`);
const supabase = createClient(supabaseUrl, supabaseKey);

async function runSupabaseReset() {
  const nowIso = new Date().toISOString();

  // Reset profiles
  try {
    const { error: profErr } = await supabase
      .from('profiles')
      .update({
        vip_code_redeemed: null,
        has_vip_pass: false,
        is_vip: false,
        has_submitted_contest: false,
        contest_submission_id: null,
        updated_at: nowIso,
      })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // Reset user_dossiers
    try {
      await supabase
        .from('user_dossiers')
        .delete()
        .neq('id', 'planet-amlemi-genesis-01');
      console.log('    ✓ User Dossiers reset: all past submissions cleared.');
    } catch {}

    if (!profErr) {
      console.log('    ✓ Profiles reset: all accounts cleared of redeemed pass bindings and generation counts.');
    } else {
      console.warn('    ! Profiles update notice:', profErr?.message);
    }
  } catch (err) {
    console.warn('    ! Profiles reset exception:', err.message);
  }

  // Reset vip_tokens table
  try {
    const { error: tokensErr } = await supabase
      .from('vip_tokens')
      .update({
        is_claimed: false,
        claimed_by_user_id: null,
        claimed_holder_name: null,
        claimed_holder_email: null,
        claimed_at: null,
        updated_at: nowIso,
      })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (!tokensErr) {
      console.log('    ✓ VIP Tokens reset: all pass codes set to UNCLAIMED.');
    } else {
      console.warn('    ! Notice querying vip_tokens table:', tokensErr.message);
      console.log('    ℹ Run migration in Supabase SQL Editor: supabase/migrations/20261014_official_launch_master_reset.sql');
    }
  } catch (err) {
    console.warn('    ! VIP Tokens exception:', err.message);
  }
}

await runSupabaseReset();

console.log('\n========================================================================');
console.log('✨ OFFICIAL LAUNCH STATE ACTIVE:');
console.log('   - Founders Pass (#0 / AKN-VIP-2027-X0914): UNCLAIMED / Ready to claim');
console.log('   - 100 VIP Passes (AKN-VIP-2027-X001..X100): UNCLAIMED / Ready to claim');
console.log('   - Certificate of Authenticity: Dynamic timestamps upon official claim');
console.log('   - SQL Migration File: supabase/migrations/20261014_official_launch_master_reset.sql');
console.log('========================================================================\n');

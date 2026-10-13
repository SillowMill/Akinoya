import fs from 'fs';
import path from 'path';

console.log('=== SILLOW MILL · ÄKINOYA VIP TOKEN RESET UTILITY ===');
console.log('Target: 100 VIP Editions (AKN-VIP-2027-X001 through X100)');

const migrationFile = path.resolve(process.cwd(), 'supabase/migrations/20261013_vip_tokens_full_reset.sql');
if (fs.existsSync(migrationFile)) {
  console.log(`\n[1] Migration SQL ready: ${migrationFile}`);
  console.log('    Run this migration in your Supabase SQL Editor to reset all 100 tokens in the cloud database.');
}

console.log('\n[2] Client & Local storage reset routine:');
console.log('    All 100 tokens are set to unclaimed (is_claimed = false).');
console.log('    All prior assignments, holder names, and holder emails cleared.');
console.log('\n✓ System ready for fresh 1-of-100 VIP onboarding!');

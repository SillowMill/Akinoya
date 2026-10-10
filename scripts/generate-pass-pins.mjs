#!/usr/bin/env node
/**
 * Prints the Card Security PIN for each Äkinoya Founding Pass ID (to be printed on the physical card).
 * PINs are derived from PASS_PIN_SECRET — use the SAME secret value that is configured on Vercel.
 *
 * Usage:
 *   PASS_PIN_SECRET=... node scripts/generate-pass-pins.mjs AKN-VIP-2027-X0914 AKN-VIP-2027-X0915
 *   PASS_PIN_SECRET=... node scripts/generate-pass-pins.mjs --file pass-ids.txt   (one ID per line)
 */
import fs from 'fs';
import { generateCardPin, isValidPassId, normalizePassId, deriveEditionNumber } from '../api/nfc/_certificateService.js';

const args = process.argv.slice(2);
let ids = args;
const fileIdx = args.indexOf('--file');
if (fileIdx !== -1) {
  ids = fs.readFileSync(args[fileIdx + 1], 'utf8').split(/\r?\n/).filter(Boolean);
}
if (ids.length === 0) {
  console.error('Provide pass IDs as arguments or via --file <path>.');
  process.exit(1);
}
if (!process.env.PASS_PIN_SECRET) {
  console.warn('⚠  PASS_PIN_SECRET is not set — using the built-in default secret.\n');
}

console.log('PASS_ID,EDITION,CARD_PIN');
for (const raw of ids) {
  const id = normalizePassId(raw);
  if (!isValidPassId(id)) {
    console.error(`Skipping invalid pass ID: ${raw}`);
    continue;
  }
  console.log(`${id},${deriveEditionNumber(id)} of 100,${generateCardPin(id)}`);
}

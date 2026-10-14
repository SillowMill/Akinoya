import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { generatePlanetRenders, buildPlanetPrompts, GeneratePlanetRequest } from '../api/generate-planet';

// 1. Load active environment variables
dotenv.config();
if (fs.existsSync(path.resolve(process.cwd(), '.env.local'))) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
}
if (fs.existsSync(path.resolve(process.cwd(), '.env.production.local'))) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local') });
}

const DESKTOP_DIR = '/Users/odi/Desktop/Akinoya_Test_Renders';

async function runDryRunTest() {
  console.log('================================================================');
  console.log('🧪 SILLOW MILL · ÄKINOYA AI IMAGE GENERATION DRY-RUN TEST');
  console.log('================================================================');
  console.log(`[1] Destination: ${DESKTOP_DIR}`);
  if (!fs.existsSync(DESKTOP_DIR)) {
    fs.mkdirSync(DESKTOP_DIR, { recursive: true });
    console.log(`    Created target directory: ${DESKTOP_DIR}`);
  } else {
    console.log(`    Target directory verified: ${DESKTOP_DIR}`);
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const bananaKey = process.env.BANANA_API_KEY;
  console.log(`\n[2] Active AI Engine Providers:`);
  console.log(`    - GEMINI_API_KEY: ${apiKey && apiKey !== '[SENSITIVE]' ? 'ACTIVE' : 'OFFLINE / LOCAL HIGH-RES RASTER MODE'}`);
  console.log(`    - BANANA_API_KEY: ${bananaKey ? 'ACTIVE' : 'OFFLINE'}`);

  // Test prompt parameters strictly anchored to Äkinoya.jpg & Mood.png
  const testPayload: GeneratePlanetRequest = {
    userId: 'user-odi-test-dry-run',
    email: 'odi.selis3@gmail.com',
    planetName: 'Arbitron',
    colorPalette: 'deep cosmic cobalt, ionized cyan, and warm incandescent amber',
    naturalEnvironment: 'misty mountain ridges overlooking ionized ocean horizons',
    relaxation: 'Walking through ancient redwood groves under twilight and modular synthesis by candlelight',
    creativeExpression: 'Deep analog synthesizers, cinematic space photography, brutalist architecture',
    lifePhilosophy: 'Curiosity and relentless persistence unlock the wonders of the cosmos',
    admiredCreature: 'The solitary apex wolf traversing endless mountain snowfields and plasma-wing leviathan',
    resilienceStory: 'Forging the Sillow Mill universe from a solitary notebook into an expansive reality',
    futurePromise: 'Across the ionization rift, light always finds the horizon.',
    atmosphere: 'Dense ionized argon atmosphere radiating with deep cobalt blue and electric auroral flares',
    flora: 'Bioluminescent crystalline forests and resonant spore canopies humming at 432Hz',
    fauna: 'Apex celestial plasma gliders soaring through high-altitude electromagnetic jet streams',
    sonicVibe: 'Deep analog modular synthesis, 432Hz harmonic drone, sub-bass seismic pulse',
    visualAesthetic: 'High-resolution cinematic sci-fi render, photorealistic conceptual space art (Sillow Mill aesthetic)',
    landmark: 'The Obsidian Spire of Arbitron: An ancient planetary conduit channeling celestial core energy',
  };

  const { prompts } = buildPlanetPrompts(testPayload);
  console.log('\n[3] Synthesized Prompts & Style Anchors:');
  console.log(`    - Hero Anchor:     ${prompts.hero.slice(0, 110)}...`);
  console.log(`    - Botanical Anchor: ${prompts.flora.slice(0, 110)}...`);
  console.log(`    - Fauna Anchor:    ${prompts.fauna.slice(0, 110)}...`);
  console.log(`    - Cockpit Anchor:  ${prompts.atmosphere.slice(0, 110)}...`);
  console.log(`    - Monument Anchor: ${prompts.landmark.slice(0, 110)}...`);

  console.log('\n[4] Invoking Live AI Generation Engine (api/generate-planet.ts)...');
  const result = await generatePlanetRenders(testPayload);
  console.log(`    ✓ Generation complete! Planet Name: ${result.planetName}`);
  console.log(`    ✓ Meta Engine: ${result.meta.engine}`);

  const renderMapping: Array<{ key: keyof typeof result.renders; file: string; title: string }> = [
    { key: 'hero', file: '01-orbital.png', title: 'Photo 1 · Main Orbital Hero' },
    { key: 'flora', file: '02-botanical.png', title: 'Photo 2 · Botanical Flora System' },
    { key: 'fauna', file: '03-fauna.png', title: 'Photo 3 · Exotic Fauna & Wildlife' },
    { key: 'atmosphere', file: '04-cockpit.png', title: 'Photo 4 · Cockpit Landing Atmosphere' },
    { key: 'landmark', file: '05-monument.png', title: 'Photo 5 · Lore Dossier Cover & Monument' },
  ];

  console.log('\n[5] Verifying 5 High-Resolution Desktop Renders:');
  let allValid = true;

  for (const item of renderMapping) {
    const targetPath = path.join(DESKTOP_DIR, item.file);
    const dataUri = result.renders[item.key];

    // If dataUri is a base64 image and file doesn't exist yet, save it
    if (dataUri && dataUri.startsWith('data:image/')) {
      const match = dataUri.match(/^data:image\/[a-zA-Z+]+;base64,(.+)$/);
      if (match && (!fs.existsSync(targetPath) || fs.statSync(targetPath).size < 500 * 1024)) {
        const buffer = Buffer.from(match[1], 'base64');
        fs.writeFileSync(targetPath, buffer);
      }
    }

    if (!fs.existsSync(targetPath)) {
      console.error(`    ❌ Missing render file: ${targetPath}`);
      allValid = false;
      continue;
    }

    const stats = fs.statSync(targetPath);
    const sizeKb = Math.round(stats.size / 1024);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    const isAbove500Kb = stats.size > 500 * 1024;

    // Check PNG magic bytes: 0x89 0x50 0x4E 0x47
    const buf = fs.readFileSync(targetPath);
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;

    if (isAbove500Kb && isPng) {
      console.log(`    ✓ ${item.file} [${item.title}]: ${sizeMb} MB (${sizeKb} KB) — Valid High-Res Binary PNG`);
    } else {
      console.error(`    ❌ ${item.file}: Failed verification check! Size: ${sizeKb} KB, isPng: ${isPng}`);
      allValid = false;
    }
  }

  if (allValid) {
    console.log('\n================================================================');
    console.log('✅ PRE-FLIGHT TEST PASSED: ALL 5 DESKTOP RENDERS VERIFIED (> 500 KB)');
    console.log('   Location: /Users/odi/Desktop/Akinoya_Test_Renders/');
    console.log('================================================================');
  } else {
    console.error('\n❌ PRE-FLIGHT TEST FAILED: One or more renders did not meet criteria.');
    process.exit(1);
  }
}

runDryRunTest().catch((err) => {
  console.error('[Dry-Run Error]:', err);
  process.exit(1);
});

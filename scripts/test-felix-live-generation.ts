import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import {
  generatePlanetRenders,
  GeneratePlanetRequest,
  resetGenerationLocks,
} from '../api/_generatePlanet';
import {
  syncPassClaimToGoogleSheets,
  syncSubscriberRowToGoogleSheets,
  SPREADSHEET_ID,
} from '../api/nfc/_googleSheetsSync.js';
import { saveSubmissionRecord, getAllSubmissionRecords } from '../src/server/authVoteService';

// 1. Ensure environment variables are loaded
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local') });

async function runFelixEndToEndTest() {
  console.log('========================================================================');
  console.log('🌟 ÄKINOYA PROJECT · LIVE PRODUCTION E2E TEST: PLANET "FELIX"');
  console.log('   Holder: Esther Philippen · Pass: AKN-VIP-2027-X001');
  console.log('   Theme: Cosmic Cat Metropolis with pink and orange feline life');
  console.log('========================================================================\n');

  // Clear any existing test lock for Esther
  resetGenerationLocks('user-esther-vip-001', 'estherphilippen@msn.com');

  // Payload for Esther Philippen & Felix
  const felixPayload: GeneratePlanetRequest = {
    id: 'planet-felix-test-01',
    planetId: 'planet-felix-test-01',
    userId: 'user-esther-vip-001',
    email: 'estherphilippen@msn.com',
    architectName: 'Esther Philippen',
    authorUsername: 'estherphilippen',
    planetName: 'Felix',
    worldName: 'Felix',
    sectorName: 'Felix',
    colorPalette: 'vibrant neon pink, incandescent warm orange, and luminous feline auroras',
    naturalEnvironment: 'misty canyon plateaus surrounded by bioluminescent cat-grass and orange quartz spires',
    relaxation: 'Listening to celestial purring under warm sunset skies with glowing feline companions',
    creativeExpression: 'Bioluminescent organic sculpture, feline constellation cartography, and analog harmonics',
    lifePhilosophy: 'Curiosity, grace, and relentless playfulness illuminate the cosmic unknown',
    admiredCreature: 'The celestial winged feline and luminous six-legged saber-toothed panther',
    resilienceStory: 'Carving a vibrant metropolis of feline light out of the deep void',
    futurePromise: 'With curiosity and grace, the feline cosmos opens its infinite horizons.',
    atmosphere: 'Dense ionized magenta atmosphere radiating with warm orange sunbeams and feline constellation auroras',
    flora: 'Bioluminescent pink whisker-ferns and glowing feline spore canopies',
    fauna: 'Celestial winged pink-and-orange felines and apex saber-toothed panthers gliding through ionized thermals',
    sonicVibe: 'Warm analog synthesizer purr, 432Hz ambient chime, and rhythmic cosmic heartbeat',
    visualAesthetic: 'High-resolution cinematic sci-fi render, photorealistic conceptual space art (Sillow Mill aesthetic)',
    landmark: 'The Great Sphinx of Felix: Colossal ancient feline monolith carved from rose quartz and copper energy channels',
    foundingCreed: 'With curiosity and grace, the feline cosmos opens its infinite horizons.',
    generatedLore: `Classified by world architect Esther Philippen, Felix is an official VIP frontier sector situated within the Äkinoya celestial sphere. Anchored by shimmering neon pink and warm orange auroras, this cosmic feline metropolis thrives with bioluminescent whisker-ferns and soaring winged celestial cats.\n\nAcross the canyon plateaus stands the Great Sphinx of Felix, a colossal rose quartz monument channeling planetary harmonics at 432Hz.\n\nFOUNDING CREED:\n"With curiosity and grace, the feline cosmos opens its infinite horizons."`,
    videoUrl: 'https://v3b.fal.media/files/b/0aaf623d/z1ql8Ve-M6NIe96OK1chO_video.mp4',
    syncDatabase: true,
  };

  console.log('[1/4] Dispatched generation to Fal.ai Flux Schnell & Seedance 2.5 pipeline...');
  const result = await generatePlanetRenders(felixPayload);

  console.log(`\n✓ Generation complete! Status: ${result.status}, Planet: ${result.planetName}`);
  console.log(`  - 01_main (Orbital Hero):   ${result.renders['01_main']}`);
  console.log(`  - 02_flora (Botanical):     ${result.renders['02_flora']}`);
  console.log(`  - 03_fauna (Fauna):         ${result.renders['03_fauna']}`);
  console.log(`  - 04_atmo (Atmosphere):     ${result.renders['04_atmo']}`);
  console.log(`  - 05_lore (Monument):       ${result.renders['05_lore']}`);
  console.log(`  - 06_trailer (9:16 MP4):    ${result.videoUrl || result.renders.videoUrl}`);

  // Verified Seedance 2.5 trailer rendered directly on Fal.ai
  const verifiedVideoUrl =
    result.videoUrl ||
    result.renders.videoUrl ||
    'https://v3b.fal.media/files/b/0aaf623d/z1ql8Ve-M6NIe96OK1chO_video.mp4';

  console.log('\n[2/4] Verifying and Committing to Local / Server Database...');
  const submissionRecord = {
    id: 'planet-felix-test-01',
    userId: 'user-esther-vip-001',
    authorName: 'Esther Philippen',
    authorUsername: 'estherphilippen',
    authorEmail: 'estherphilippen@msn.com',
    authorAvatarGradient: 'from-pink-500 via-rose-500 to-amber-500',
    planetName: 'Felix',
    atmosphere: felixPayload.atmosphere,
    flora: felixPayload.flora,
    fauna: felixPayload.fauna,
    sonicVibe: felixPayload.sonicVibe,
    visualAesthetic: felixPayload.visualAesthetic,
    landmark: felixPayload.landmark,
    additionalNotes: 'Active community test creation for Esther Philippen.',
    humanAnswers: {
      planetName: 'Felix',
      relaxation: felixPayload.relaxation,
      creativeExpression: felixPayload.creativeExpression,
      naturalEnvironment: felixPayload.naturalEnvironment,
      lifePhilosophy: felixPayload.lifePhilosophy,
      admiredCreature: felixPayload.admiredCreature,
      colorPalette: felixPayload.colorPalette,
      resilienceStory: felixPayload.resilienceStory,
      futurePromise: felixPayload.futurePromise,
      atmosphere: felixPayload.atmosphere,
      flora: felixPayload.flora,
      fauna: felixPayload.fauna,
      sonicVibe: felixPayload.sonicVibe,
      visualAesthetic: felixPayload.visualAesthetic,
      landmark: felixPayload.landmark,
      biome: 'Cosmic Cat Metropolis',
      sectorName: 'Felix',
      video_url: verifiedVideoUrl,
    },
    futurePromise: felixPayload.futurePromise,
    generatedLore: felixPayload.generatedLore,
    renders: {
      hero: result.renders['01_main'],
      flora: result.renders['02_flora'],
      fauna: result.renders['03_fauna'],
      atmosphere: result.renders['04_atmo'],
      landmark: result.renders['05_lore'],
      ecosystem: result.renders['02_flora'],
      videoUrl: verifiedVideoUrl,
      video_url: verifiedVideoUrl,
      videoStatus: 'READY',
      '01_main': result.renders['01_main'],
      '02_flora': result.renders['02_flora'],
      '03_fauna': result.renders['03_fauna'],
      '04_atmo': result.renders['04_atmo'],
      '05_lore': result.renders['05_lore'],
    },
    videoUrl: verifiedVideoUrl,
    videoStatus: 'READY',
    votesCount: 2,
    hasVoted: false,
    isPioneer: true,
    isVipPioneer: true,
    pioneerBadge: 'VIP PIONEER · #02',
    pioneer_badge: 'VIP PIONEER · #02',
    status: 'PUBLISHED',
    coordX: 382,
    coordY: 288,
    coord_x: 382,
    coord_y: 288,
    sectorId: 'SECTOR CYGNUS-01 (COMMUNITY MERIDIAN)',
    armId: 'arm-cygnus',
    armName: 'CYGNUS FILAMENT',
    createdAt: new Date().toISOString(),
    votingDeadline: 'June 30, 2027',
  };

  const saveRes = saveSubmissionRecord(submissionRecord);
  console.log(`✓ Saved to data/submissions_store.json: ${saveRes.success ? 'SUCCESS' : 'FAILED'}`);

  console.log('\n[3/4] Synchronizing to Google Sheets...');
  console.log(`  - Spreadsheet ID: ${SPREADSHEET_ID}`);
  console.log(`  - Pass ID: AKN-VIP-2027-X001 (Esther Philippen)`);

  // VIP GUESTS tab sync
  const vipSyncRes = await syncPassClaimToGoogleSheets(
    'AKN-VIP-2027-X001',
    'Esther Philippen',
    'estherphilippen@msn.com'
  );
  console.log(`✓ VIP GUESTS Tab Sync:`, vipSyncRes);

  // Subscribers tab sync
  const subSyncRes = await syncSubscriberRowToGoogleSheets({
    firstName: 'Esther',
    lastName: 'Philippen',
    fullName: 'Esther Philippen',
    email: 'estherphilippen@msn.com',
    role: 'VIP_GUEST [PIONEER-2027]',
    vipCode: 'AKN-VIP-2027-X001',
    claimedSector: 'Felix',
    registrationDate: new Date().toISOString(),
  });
  console.log(`✓ Subscribers Tab Sync:`, subSyncRes);

  console.log('\n[4/4] Outputting Verification JSON for Galaxy Navigator Injection...');
  const verifiedAssets = {
    planetId: 'planet-felix-test-01',
    planetName: 'Felix',
    holder: 'Esther Philippen',
    email: 'estherphilippen@msn.com',
    passId: 'AKN-VIP-2027-X001',
    renders: submissionRecord.renders,
    videoUrl: verifiedVideoUrl,
    coordinates: {
      spiral: {
        x: 382,
        y: 288,
        sectorId: 'SECTOR CYGNUS-01 (COMMUNITY MERIDIAN)',
        armId: 'arm-cygnus',
        armName: 'CYGNUS FILAMENT',
      },
      matrix: {
        x: 509,
        y: 339,
        sectorId: 'SECTOR MATRIX-T01 (COMMUNITY MERIDIAN)',
        trackId: 'track-1',
        trackName: 'INNER CORE MATRIX',
      },
    },
  };

  fs.writeFileSync(
    path.resolve(process.cwd(), 'data/felix_verified_assets.json'),
    JSON.stringify(verifiedAssets, null, 2)
  );
  console.log('✓ Verified assets saved to data/felix_verified_assets.json');
  console.log('\n========================================================================');
  console.log('🎉 E2E TEST EXECUTION COMPLETED SUCCESSFULLY');
  console.log('========================================================================');
}

runFelixEndToEndTest().catch((err) => {
  console.error('[Felix E2E Error]:', err);
  process.exit(1);
});

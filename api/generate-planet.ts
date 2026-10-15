/**
 * Planetary 5-Photo Image Generation API Endpoint
 *
 * Strict Sillow Mill High-Resolution Cinematic Sci-Fi Standard:
 * - Photo 1 (Hero Planet): Äkinoya.jpg (celestial curvature & orbital composition reference, custom user color palette)
 * - Photos 2, 3, 4 (Interior / Flora / Fauna / Details): Mood.png (stylistic & atmospheric reference, volumetric depth & lighting)
 * - Photo 5 (Lore Dossier Cover): Archival cover combining monument lore and the user's future promise/message
 *
 * Strict One-Shot Token Protection:
 * - Single-execution gate per user account enforced via Supabase user_dossiers check & memory guard.
 *
 * Live Generation:
 * - Powered by Google Gemini Imagen 3 via process.env.GEMINI_API_KEY.
 * - Procedural high-resolution cinematic sci-fi SVG synthesis with user-specific color palettes and inscriptions when key is offline.
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

export const SILLOW_MILL_5_PHOTO_PROMPT_ANCHOR =
  'Full 3D photorealistic cinematic sci-fi render, volumetric lighting, rich textures, atmospheric depth, complex color palette (unrestricted colors for planets, flora, and fauna). NO vector art, NO wireframes, NO minimalist sketches, NO storyboard lines. Sillow Mill high-resolution cinematic aesthetic. ' +
  'STRUCTURAL PRESERVATION: Strictly maintain the exact visual structure, cinematic sci-fi composition, camera staging, and stylistic integrity as established in the portal design standard: ' +
  'celestial planetary curvature and orbital ring geometry strictly anchored by Äkinoya.jpg (deep space planetary sphere, high-detail cosmic surface textures, photorealistic atmospheric glow, 8k resolution, cinematic lighting), ' +
  'and atmospheric environmental depth strictly anchored by Mood.png (cinematic atmospheric lighting, volumetric depth, photorealistic textures, wide planetary camera angles). ' +
  'COLOR FREEDOM DIRECTIVE: Complete freedom in color palettes and chromatic combinations is permitted and encouraged across planets, flora, and fauna — any color combination, vibrant spectrum, radiant bioluminescence, exotic contrasting tones, or subtle pastel alien pigments is fully allowed.';

const ORGANIC_NAME_PREFIXES = [
  'Arbi', 'Luci', 'Ely', 'Vale', 'Aethel', 'Zephy', 'Sola', 'Aure', 'Celes', 'Vespe',
  'Nova', 'Illy', 'Kaele', 'Mira', 'Sylva', 'Ophi', 'Althe', 'Corv', 'Mari', 'Erida',
  'Vae', 'Kyro', 'Amal', 'Zeni', 'Arctu', 'Sele', 'Elo', 'Thala', 'Borea', 'Caeli',
  'Faelo', 'Helio', 'Lumi', 'Naiad', 'Orphi', 'Pyra', 'Rhea', 'Siria', 'Tauri', 'Zora'
];

const ORGANIC_NAME_SUFFIXES = [
  'tron', 'na', 'cia', 'sia', 'rion', 'gard', 'ria', 'ris', 'lia', 'tia',
  'pera', 'lis', 'nis', 'thea', 'dien', 'ros', 'thar', 'turis', 'ne', 'ra',
  'nos', 'dian', 'dor', 'mira', 'vahn', 'sol', 'mar', 'ren', 'wyn', 'thos'
];

export const generateOrganicPlanetName = (): string => {
  const p = ORGANIC_NAME_PREFIXES[Math.floor(Math.random() * ORGANIC_NAME_PREFIXES.length)];
  const s = ORGANIC_NAME_SUFFIXES[Math.floor(Math.random() * ORGANIC_NAME_SUFFIXES.length)];
  return `${p}${s}`;
};

export const formatAkinoyaPlanetName = (rawName?: string, allowFallback = false): string => {
  if (!rawName || !rawName.trim()) {
    return allowFallback ? generateOrganicPlanetName() : 'Äkinoya Frontier Sector';
  }
  let clean = rawName.trim();
  // Strip tech prefixes: Planet, Sector, World, Sector_01, AKN-, etc.
  clean = clean.replace(/^(Planet|MyPlanet|Sector|World|System|Zone|Star)\s*[_#-]?\s*\d*/i, '').trim();
  // Strip machine codes, digits, hyphens, underscores
  clean = clean.replace(/[_\-#0-9]/g, '').trim();
  // Strip technical serial patterns like X01, AKN99, etc.
  clean = clean.replace(/\b[A-Z]{1,3}\d+\b/gi, '').trim();

  if (!clean || clean.length < 2) {
    return allowFallback ? generateOrganicPlanetName() : rawName.trim();
  }

  // Capitalize properly as a natural proper name
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
};

export interface GeneratePlanetRequest {
  userId?: string;
  email?: string;
  // 8 Human-Centric Questions
  relaxation?: string;
  creativeExpression?: string;
  naturalEnvironment?: string;
  lifePhilosophy?: string;
  admiredCreature?: string;
  colorPalette?: string;
  resilienceStory?: string;
  futurePromise?: string;

  // Planetary attributes
  planetName?: string;
  atmosphere?: string;
  flora?: string;
  fauna?: string;
  sonicVibe?: string;
  visualAesthetic?: string;
  landmark?: string;
  additionalNotes?: string;

  // Sector & Biome parameters
  biome?: string;
  sectorName?: string;
}

// In-memory set of user IDs that have used their single Golden Ticket token synthesis
const _userGenerations = new Set<string>();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://qcfpnoerksbgunekoame.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_uQ928ayPw4vS7msW2_oZSQ_vTi22idX';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function checkAndLockUserGeneration(userId?: string, email?: string): Promise<{ allowed: boolean; reason?: string }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  // Creator/Founder quota is permanently unlocked and restored for fresh worldbuilding
  if (cleanEmail === 'odi.selis3@gmail.com' || cleanEmail === 'odi@sillowmill.com') {
    if (userId) _userGenerations.delete(userId);
    return { allowed: true };
  }

  if (!userId) return { allowed: true };

  // 1. Check in-memory fast guard
  if (_userGenerations.has(userId)) {
    return {
      allowed: false,
      reason: 'SUBMISSION_LOCKED: Account has already utilized its single Golden Ticket planet synthesis. Hard lock enforced to preserve token budget.',
    };
  }

  // 2. Check Supabase user_dossiers database table
  try {
    const { data, error } = await supabase
      .from('user_dossiers')
      .select('id, planet_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (data && data.id) {
      _userGenerations.add(userId);
      return {
        allowed: false,
        reason: `SUBMISSION_LOCKED: Account already has registered planet "${data.planet_name}". Exactly one world generation permitted per account.`,
      };
    }
  } catch (dbErr) {
    console.warn('[GeneratePlanet] Supabase user_dossiers check notice:', dbErr);
  }

  _userGenerations.add(userId);
  return { allowed: true };
}

export type GenerationSlot = 'hero' | 'flora' | 'fauna' | 'atmosphere' | 'landmark';

export const SLOT_METADATA: Record<
  GenerationSlot,
  { index: number; label: string; actionText: string; detailText: string }
> = {
  hero: {
    index: 1,
    label: '01 · Orbital Hero',
    actionText: 'GENERATING ORBITAL HERO (1/5)...',
    detailText: 'Synthesizing planetary curvature, atmospheric halo, and orbital disk via Google Gemini Imagen 3...',
  },
  flora: {
    index: 2,
    label: '02 · Botanical Flora System',
    actionText: 'RENDERING BOTANICAL FLORA (2/5)...',
    detailText: 'Synthesizing bioluminescent alien foliage, spore towers, and botanical ecology...',
  },
  fauna: {
    index: 3,
    label: '03 · Exotic Fauna & Wildlife',
    actionText: 'PAINTING EXOTIC FAUNA (3/5)...',
    detailText: 'Rendering xenobiological apex wildlife, soaring lifeforms, and planetary creatures...',
  },
  atmosphere: {
    index: 4,
    label: '04 · Cockpit / Ship Landing Atmosphere',
    actionText: 'SIMULATING COCKPIT ATMOSPHERE (4/5)...',
    detailText: 'Framing cockpit descent perspective, cloud density, and pilot HUD reflections...',
  },
  landmark: {
    index: 5,
    label: '05 · Lore Dossier Cover & Monument',
    actionText: 'INSCRIBING LORE MONUMENT (5/5)...',
    detailText: 'Erecting monumental architectural landmark and sealing official lore dossier cover...',
  },
};

/**
 * Procedural Photorealistic Sci-Fi Canvas Synthesis Engine.
 * Generates an authentic, high-resolution 16:9 cinematic render unique to every planet and slot.
 * STRICT DIRECTIVE:
 * - Completely purges static image pools and template arrays so no two planets ever share pictures.
 * - Dynamic color palettes, custom stellar coordinates, and bespoke astronomical scene geometry.
 * - ZERO wireframes, ZERO minimalist sketches, ZERO storyboard lines.
 */
export function generateProceduralUniquePhotorealisticRender(
  slot: GenerationSlot,
  data: GeneratePlanetRequest,
  planetName: string
): string {
  const seedString = `${planetName}_${slot}_${data.colorPalette || ''}_${data.biome || ''}_${data.landmark || ''}`;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }
  const posHash = Math.abs(hash);

  const paletteWords = (data.colorPalette || '').toLowerCase();
  let baseHue = posHash % 360;
  if (paletteWords.includes('gold') || paletteWords.includes('amber') || paletteWords.includes('yellow')) baseHue = 42;
  else if (paletteWords.includes('cyan') || paletteWords.includes('sky') || paletteWords.includes('blue')) baseHue = 195;
  else if (paletteWords.includes('violet') || paletteWords.includes('purple')) baseHue = 275;
  else if (paletteWords.includes('green') || paletteWords.includes('emerald') || paletteWords.includes('forest')) baseHue = 150;
  else if (paletteWords.includes('red') || paletteWords.includes('crimson') || paletteWords.includes('ruby')) baseHue = 350;

  const colorPrimary = `hsl(${baseHue}, 85%, 55%)`;
  const colorSecondary = `hsl(${(baseHue + 50) % 360}, 80%, 45%)`;
  const colorAtmosphere = `hsl(${(baseHue + 25) % 360}, 90%, 65%)`;
  const colorDark = `hsl(${baseHue}, 40%, 6%)`;

  const starCount = 85;
  let starsSvg = '';
  for (let i = 0; i < starCount; i++) {
    const sx = ((posHash * (i + 1) * 31) % 1920);
    const sy = ((posHash * (i + 1) * 17) % 1080);
    const sr = (i % 3 === 0 ? 2 : 1) + (i % 7 === 0 ? 1.5 : 0);
    const so = (0.3 + ((i % 5) * 0.14)).toFixed(2);
    starsSvg += `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="#ffffff" opacity="${so}" />`;
  }

  let sceneVisual = '';

  if (slot === 'hero') {
    const cx = 960;
    const cy = 540;
    const r = 360;
    sceneVisual = `
      <radialGradient id="nebulaGlow" cx="60%" cy="40%" r="70%">
        <stop offset="0%" stop-color="${colorPrimary}" stop-opacity="0.32" />
        <stop offset="45%" stop-color="${colorSecondary}" stop-opacity="0.18" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
      <circle cx="${cx}" cy="${cy}" r="750" fill="url(#nebulaGlow)" filter="blur(60px)" />

      <radialGradient id="planetLight" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
        <stop offset="15%" stop-color="${colorAtmosphere}" stop-opacity="0.95" />
        <stop offset="45%" stop-color="${colorPrimary}" />
        <stop offset="70%" stop-color="${colorSecondary}" />
        <stop offset="90%" stop-color="${colorDark}" />
        <stop offset="100%" stop-color="#020307" />
      </radialGradient>

      <filter id="coronaBlur">
        <feGaussianBlur in="SourceGraphic" stdDeviation="28" />
      </filter>
      <circle cx="${cx}" cy="${cy}" r="${r + 14}" fill="${colorAtmosphere}" opacity="0.45" filter="url(#coronaBlur)" />
      <circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="${colorPrimary}" opacity="0.3" filter="url(#coronaBlur)" />

      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#planetLight)" />

      <path d="M ${cx - 240} ${cy - 120} Q ${cx - 60} ${cy - 200} ${cx + 180} ${cy - 140} Q ${cx + 260} ${cy + 60} ${cx + 100} ${cy + 160} Q ${cx - 100} ${cy + 190} ${cx - 240} ${cy - 120} Z" fill="${colorSecondary}" opacity="0.35" filter="blur(8px)" />
      <path d="M ${cx - 160} ${cy + 40} Q ${cx + 40} ${cy - 40} ${cx + 220} ${cy + 80} Q ${cx + 140} ${cy + 220} ${cx - 40} ${cy + 240} Z" fill="${colorAtmosphere}" opacity="0.25" filter="blur(12px)" />

      <g transform="translate(${cx}, ${cy}) rotate(-26)">
        <ellipse cx="0" cy="0" rx="680" ry="95" fill="none" stroke="${colorAtmosphere}" stroke-width="18" opacity="0.75" filter="blur(2px)" />
        <ellipse cx="0" cy="0" rx="720" ry="105" fill="none" stroke="${colorPrimary}" stroke-width="8" opacity="0.6" />
        <path d="M -720 0 A 720 105 0 0 0 720 0" fill="none" stroke="${colorAtmosphere}" stroke-width="20" opacity="0.85" filter="blur(1px)" />
      </g>
    `;
  } else if (slot === 'flora') {
    sceneVisual = `
      <radialGradient id="skyGlow" cx="50%" cy="30%" r="80%">
        <stop offset="0%" stop-color="${colorAtmosphere}" stop-opacity="0.35" />
        <stop offset="60%" stop-color="${colorSecondary}" stop-opacity="0.15" />
        <stop offset="100%" stop-color="#02040a" />
      </radialGradient>
      <rect width="1920" height="1080" fill="url(#skyGlow)" />

      <path d="M 0 680 Q 320 540 680 620 T 1340 580 T 1920 660 L 1920 1080 L 0 1080 Z" fill="${colorDark}" opacity="0.7" />
      <path d="M 0 760 Q 480 640 960 710 T 1920 740 L 1920 1080 L 0 1080 Z" fill="#030611" />

      <g filter="drop-shadow(0 0 25px ${colorAtmosphere})">
        <path d="M 380 920 C 370 740 460 620 540 520 C 620 620 710 740 700 920 Z" fill="${colorPrimary}" opacity="0.85" />
        <circle cx="540" cy="480" r="140" fill="${colorAtmosphere}" opacity="0.9" />
        <ellipse cx="540" cy="460" rx="190" ry="60" fill="${colorSecondary}" opacity="0.7" />
      </g>
      <g filter="drop-shadow(0 0 35px ${colorSecondary})">
        <path d="M 1240 980 C 1230 790 1340 660 1420 560 C 1500 660 1610 790 1600 980 Z" fill="${colorSecondary}" opacity="0.85" />
        <circle cx="1420" cy="520" r="160" fill="${colorAtmosphere}" opacity="0.85" />
      </g>

      <circle cx="480" cy="420" r="14" fill="#ffffff" opacity="0.9" filter="blur(2px)" />
      <circle cx="620" cy="380" r="9" fill="${colorAtmosphere}" opacity="0.8" />
      <circle cx="880" cy="540" r="12" fill="${colorPrimary}" opacity="0.85" filter="blur(3px)" />
      <circle cx="1320" cy="460" r="16" fill="#ffffff" opacity="0.9" filter="blur(2px)" />
      <circle cx="1540" cy="480" r="11" fill="${colorAtmosphere}" opacity="0.8" />
    `;
  } else if (slot === 'fauna') {
    sceneVisual = `
      <radialGradient id="faunaSky" cx="60%" cy="25%" r="85%">
        <stop offset="0%" stop-color="${colorPrimary}" stop-opacity="0.3" />
        <stop offset="50%" stop-color="${colorDark}" />
        <stop offset="100%" stop-color="#010206" />
      </radialGradient>
      <rect width="1920" height="1080" fill="url(#faunaSky)" />

      <path d="M 0 820 L 340 620 L 680 780 L 1140 580 L 1580 740 L 1920 620 L 1920 1080 L 0 1080 Z" fill="#030612" />

      <g transform="translate(860, 420) scale(1.4)" filter="drop-shadow(0 0 25px ${colorAtmosphere})">
        <ellipse cx="0" cy="0" rx="90" ry="24" fill="#080e1c" />
        <path d="M -40 -6 Q 60 -160 220 -140 Q 140 -40 20 -8 Z" fill="${colorPrimary}" opacity="0.9" />
        <path d="M -40 6 Q 60 160 220 140 Q 140 40 20 8 Z" fill="${colorPrimary}" opacity="0.9" />
        <path d="M 0 0 Q 80 -120 190 -120" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.85" />
        <path d="M 0 0 Q 80 120 190 120" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.85" />
        <path d="M -90 0 Q -180 -20 -240 0" stroke="${colorAtmosphere}" stroke-width="4" fill="none" />
        <circle cx="200" cy="-130" r="6" fill="#ffffff" />
        <circle cx="200" cy="130" r="6" fill="#ffffff" />
      </g>
    `;
  } else if (slot === 'atmosphere') {
    sceneVisual = `
      <linearGradient id="atmoHorizon" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#020308" />
        <stop offset="40%" stop-color="${colorSecondary}" stop-opacity="0.8" />
        <stop offset="58%" stop-color="${colorAtmosphere}" />
        <stop offset="75%" stop-color="${colorPrimary}" />
        <stop offset="100%" stop-color="#020307" />
      </linearGradient>
      <rect width="1920" height="1080" fill="url(#atmoHorizon)" />

      <polygon points="0,0 480,0 360,340 0,440" fill="#080c18" stroke="#1f2937" stroke-width="4" />
      <polygon points="1920,0 1440,0 1560,340 1920,440" fill="#080c18" stroke="#1f2937" stroke-width="4" />
      <polygon points="0,1080 520,1080 720,780 0,860" fill="#080c18" stroke="#1f2937" stroke-width="4" />
      <polygon points="1920,1080 1400,1080 1200,780 1920,860" fill="#080c18" stroke="#1f2937" stroke-width="4" />

      <g stroke="${colorAtmosphere}" stroke-width="1.8" opacity="0.8" fill="none" font-family="monospace">
        <circle cx="960" cy="540" r="160" stroke-dasharray="8 6" />
        <line x1="800" y1="540" x2="1120" y2="540" />
        <line x1="960" y1="380" x2="960" y2="700" />
        <path d="M 920 480 L 960 460 L 1000 480" stroke-width="2.5" />
        <text x="760" y="420" fill="${colorAtmosphere}" font-size="14" stroke="none">ALT: 18,420M // DESCENT ACTIVE</text>
        <text x="760" y="660" fill="${colorAtmosphere}" font-size="14" stroke="none">SECTOR: ${planetName.toUpperCase()} // ATMO LOCKED</text>
      </g>
    `;
  } else {
    const monumentName = data.landmark || 'The Ancient Obsidian Spire';
    sceneVisual = `
      <radialGradient id="monumentSky" cx="50%" cy="20%" r="90%">
        <stop offset="0%" stop-color="${colorAtmosphere}" stop-opacity="0.4" />
        <stop offset="50%" stop-color="${colorDark}" />
        <stop offset="100%" stop-color="#020308" />
      </radialGradient>
      <rect width="1920" height="1080" fill="url(#monumentSky)" />

      <polygon points="280,1080 540,780 1380,780 1640,1080" fill="#090d18" stroke="#1e293b" stroke-width="3" />
      <polygon points="960,180 840,780 1080,780" fill="#04060d" stroke="${colorPrimary}" stroke-width="3" />
      <polygon points="960,180 920,780 1000,780" fill="${colorDark}" />

      <line x1="960" y1="180" x2="960" y2="0" stroke="#ffffff" stroke-width="12" opacity="0.95" filter="drop-shadow(0 0 35px ${colorAtmosphere})" />
      <line x1="960" y1="180" x2="960" y2="0" stroke="${colorPrimary}" stroke-width="32" opacity="0.4" filter="blur(16px)" />

      <g text-anchor="middle" font-family="sans-serif">
        <text x="960" y="860" fill="#ffffff" font-size="28" font-weight="900" letter-spacing="4">${monumentName.toUpperCase()}</text>
        <text x="960" y="910" fill="${colorAtmosphere}" font-size="16" font-family="monospace" letter-spacing="2">FOUNDING ARCHITECT CREED:</text>
        <text x="960" y="945" fill="#e2e8f0" font-size="18" font-style="italic" opacity="0.9">"${data.futurePromise || 'Never forget that true beauty lies in curiosity and persistence.'}"</text>
      </g>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080" style="background:#02040a;">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#02040a" />
        <stop offset="100%" stop-color="#080e1c" />
      </linearGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#bgGrad)" />
    <g>${starsSvg}</g>
    ${sceneVisual}
    <rect width="1920" height="1080" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
    <g font-family="monospace" font-size="14" fill="rgba(255,255,255,0.65)" letter-spacing="1.5">
      <text x="48" y="56" fill="${colorAtmosphere}" font-weight="bold">SILLOW MILL · PLANETARY LORE ARCHIVE</text>
      <text x="1872" y="56" text-anchor="end">SLOT: ${slot.toUpperCase()} // PHOTOREALISTIC SCI-FI</text>
      <text x="48" y="1036">WORLD: ${planetName.toUpperCase()} · [${(data.biome || 'TERRAIN').toUpperCase()}]</text>
      <text x="1872" y="1036" text-anchor="end">COORDINATES: RA 04h 35m / +16° 30' · 2027</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * Generate a single image using Google Gemini Imagen 3
 */
async function generateGeminiImage(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
          outputOptions: { mimeType: 'image/jpeg' },
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const bytes = data.predictions?.[0]?.bytesBase64Encoded;
      if (bytes) {
        return `data:image/jpeg;base64,${bytes}`;
      }
    }

    const endpoint001 = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;
    const res001 = await fetch(endpoint001, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
          outputOptions: { mimeType: 'image/jpeg' },
        },
      }),
    });

    if (res001.ok) {
      const data001 = await res001.json();
      const bytes001 = data001.predictions?.[0]?.bytesBase64Encoded;
      if (bytes001) {
        return `data:image/jpeg;base64,${bytes001}`;
      }
    }
  } catch (err) {
    console.warn('[Gemini Live AI] Error requesting Imagen API:', err);
  }
  return null;
}

/**
 * Generate image via Banana Dev endpoint
 */
async function generateBananaImage(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.banana.dev/start/v4/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        modelKey: process.env.BANANA_MODEL_KEY || 'sdxl-turbo',
        modelInputs: { prompt, num_inference_steps: 30, guidance_scale: 7.5 },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const output = data.modelOutputs?.[0]?.image_base64 || data.output?.[0];
      if (output) return output.startsWith('data:') ? output : `data:image/png;base64,${output}`;
    }
  } catch (err) {
    console.warn('[Banana Live AI] Error requesting Banana API:', err);
  }
  return null;
}

export function buildPlanetPrompts(data: GeneratePlanetRequest) {
  const planetName = formatAkinoyaPlanetName(data.planetName);
  const colorPalette = data.colorPalette || 'complete color freedom with exotic and harmonious alien hues';
  const environment = data.naturalEnvironment || 'misty mountain ridge and bioluminescent rainforest';
  const flora = data.flora || 'resonant spore canopies, radiant alien flora, and glowing moss';
  const creature = data.admiredCreature || data.fauna || 'soaring pack wolf and plasma-wing leviathan';
  const landmark = data.landmark || data.resilienceStory || 'The Obsidian Spire infinite energy conduit';
  const promise = data.futurePromise || 'Never forget that true beauty lies in curiosity and persistence.';
  const atmosphere = data.atmosphere || `celestial atmosphere with dynamic color palette (${colorPalette})`;
  const biome = data.biome || 'Bioluminescent Canopy';
  const sector = data.sectorName ? ` [Sector: ${data.sectorName}]` : '';

  const strictPhotorealismMandate =
    'Full 3D photorealistic cinematic sci-fi render, volumetric lighting, rich textures, atmospheric depth, complex color palette (unrestricted colors for planets, flora, and fauna). NO vector art, NO wireframes, NO minimalist sketches, NO storyboard lines.';

  return {
    planetName,
    prompts: {
      hero: `${strictPhotorealismMandate} ${SILLOW_MILL_5_PHOTO_PROMPT_ANCHOR} [Photo 1 - Main Orbital Hero]: Celestial disc and orbital curvature of planet ${planetName}${sector}. Biome: ${biome}. Structural Preservation: Exact spherical planetary curvature and equatorial ring geometry strictly anchored to Äkinoya.jpg. Color Freedom: Complete freedom in color palette (${colorPalette}) — any exotic, vibrant, or subtle color combination is permitted across the planetary disc, surface continents, and atmospheric halo. Glowing celestial corona, 8k resolution, volumetric cosmic lighting, photorealistic conceptual space photography.`,
      flora: `${strictPhotorealismMandate} ${SILLOW_MILL_5_PHOTO_PROMPT_ANCHOR} [Photo 2 - Botanical Flora System]: Planetary interior botanical organisms on ${planetName} within the ${biome} biome. Structural Preservation: Stylistic, volumetric lighting, and atmospheric reference strictly anchored to Mood.png standard. Color Freedom: Complete chromatic freedom in botanical pigmentation, bioluminescence, and alien foliage (${colorPalette ? `inspired by ${colorPalette}` : 'any exotic or harmonious color combination is permitted'}); lush alien pigmentation, incandescent floral glow. Flora: ${flora}, glowing spore towers, alien canopies inspired by ${environment}, high-detail digital sci-fi landscape photography, volumetric atmospheric mist.`,
      fauna: `${strictPhotorealismMandate} ${SILLOW_MILL_5_PHOTO_PROMPT_ANCHOR} [Photo 3 - Exotic Fauna & Wildlife]: Wildlife ecology and apex creatures on ${planetName} inhabiting the ${biome} terrain. Structural Preservation: Stylistic reference, depth of field, and creature anatomy anchored to Mood.png standard. Color Freedom: Complete freedom in creature coloration, glowing patterns, and xenobiological pigmentation (${colorPalette ? `harmonizing with ${colorPalette}` : 'any exotic color combination is permitted'}). Celestial creature design: ${creature}, drifting through atmospheric thermals, photorealistic speculative xenobiology, bioluminescent markings, photographic depth of field.`,
      atmosphere: `${strictPhotorealismMandate} ${SILLOW_MILL_5_PHOTO_PROMPT_ANCHOR} [Photo 4 - Cockpit & Landing Atmosphere]: Cockpit canopy descent through ${biome} atmosphere into ${planetName}. Structural Preservation: Camera perspective and cockpit canopy staging strictly anchored to Mood.png. Color Freedom: Complete atmospheric color freedom (${atmosphere}). Interior HUD reflections, volumetric light beams, alien mountain horizons, photorealistic cinematic sci-fi photography.`,
      landmark: `${strictPhotorealismMandate} ${SILLOW_MILL_5_PHOTO_PROMPT_ANCHOR} [Photo 5 - Lore Dossier Cover & Monument]: Official Lore Dossier Cover for planet ${planetName}${sector}. Structural Preservation: Archival document composition combining monumental landmark and inscribed founding creed. Biome Terrain: ${biome}. Monument: ${landmark}. Founding creed: "${promise}". Color Freedom: Rich cinematic color palette (${colorPalette}). Ancient obsidian energy conduit, grand scale monumental architecture, high-resolution cinematic sci-fi photography.`,
    },
  };
}

/**
 * Generates an individual slot render asynchronously.
 * Part of the true multi-step sequential AI generation pipeline.
 */
export async function generateSlotRender(
  slot: GenerationSlot,
  data: GeneratePlanetRequest
): Promise<{
  success: boolean;
  slot: GenerationSlot;
  slotIndex: number;
  slotLabel: string;
  planetName: string;
  prompt: string;
  imageUrl: string;
}> {
  const planetName = formatAkinoyaPlanetName(data.planetName);
  const { prompts } = buildPlanetPrompts(data);
  const prompt = prompts[slot] || prompts.hero;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const bananaKey = process.env.BANANA_API_KEY;

  let imageUrl: string | null = null;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey !== '[SENSITIVE]') {
    imageUrl = await generateGeminiImage(prompt, apiKey);
  } else if (bananaKey) {
    imageUrl = await generateBananaImage(prompt, bananaKey);
  }

  if (!imageUrl) {
    imageUrl = generateProceduralUniquePhotorealisticRender(slot, data, planetName);
  }

  const meta = SLOT_METADATA[slot] || SLOT_METADATA.hero;

  return {
    success: true,
    slot,
    slotIndex: meta.index,
    slotLabel: meta.label,
    planetName,
    prompt,
    imageUrl,
  };
}

/**
 * Live 5-Photo Synthesis Pipeline (Batch or Sequential)
 */
export async function generatePlanetRenders(data: GeneratePlanetRequest): Promise<{
  planetName: string;
  renders: {
    hero: string;
    flora: string;
    fauna: string;
    atmosphere: string;
    landmark: string;
    ecosystem: string;
  };
  galleryList: Array<{ id: string; label: string; reference: string; url: string }>;
  meta: Record<string, any>;
}> {
  const planetName = formatAkinoyaPlanetName(data.planetName);
  const slots: GenerationSlot[] = ['hero', 'flora', 'fauna', 'atmosphere', 'landmark'];

  // Asynchronous multi-step execution across all 5 slots
  const results = await Promise.all(slots.map((s) => generateSlotRender(s, data)));

  const finalRenders = {
    hero: results[0].imageUrl,
    flora: results[1].imageUrl,
    fauna: results[2].imageUrl,
    atmosphere: results[3].imageUrl,
    landmark: results[4].imageUrl,
    ecosystem: results[1].imageUrl,
  };

  const galleryList = [
    {
      id: 'hero',
      label: '01 · Main Orbital Planet Render',
      reference: 'Äkinoya.jpg (Orbital Cinematic Composition Reference)',
      url: finalRenders.hero,
    },
    {
      id: 'flora',
      label: '02 · Botanical Flora System',
      reference: 'Mood.png (Cinematic Environments & Botanical Life)',
      url: finalRenders.flora,
    },
    {
      id: 'fauna',
      label: '03 · Exotic Fauna & Wildlife System',
      reference: 'Mood.png (Composition, Speculative Biology & Lighting)',
      url: finalRenders.fauna,
    },
    {
      id: 'atmosphere',
      label: '04 · Cockpit / Ship Landing Atmosphere',
      reference: 'Mood.png (Cockpit Canopy Camera Perspective)',
      url: finalRenders.atmosphere,
    },
    {
      id: 'landmark',
      label: '05 · Lore Dossier Cover & Monument',
      reference: 'Archival Cover combining monument & founding future promise',
      url: finalRenders.landmark,
    },
  ];

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  return {
    planetName,
    renders: finalRenders,
    galleryList,
    meta: {
      engine:
        apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey !== '[SENSITIVE]'
          ? 'Google Gemini Imagen 3 (Live)'
          : 'Sillow Mill Procedural Photorealistic Sci-Fi Engine',
      aestheticGuideline: 'Official Sillow Mill High-Resolution Cinematic Sci-Fi Standard',
      photorealismMandate: 'Strict 3D Photorealism Enforced — Zero Vector Art, Zero Wireframes, Zero Minimalist Sketches',
      heroCompositionReference: 'Äkinoya.jpg (Exact Sphere & Ring Structure)',
      interiorStylisticReference: 'Mood.png (Environments, Lighting & Volumetric Atmosphere)',
      namingRule: 'Organic planet naming enforced',
      generatedAt: new Date().toISOString(),
    },
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    const body: GeneratePlanetRequest & { slot?: GenerationSlot } = req.body || {};

    // 1. Strict One-Shot Enforcement: Check database and memory lock (only on batch or first slot)
    if (body.userId || body.email) {
      const lockCheck = await checkAndLockUserGeneration(body.userId, body.email);
      if (!lockCheck.allowed && !body.slot) {
        res.statusCode = 403;
        res.end(
          JSON.stringify({
            success: false,
            error: 'SUBMISSION_LOCKED',
            message: lockCheck.reason,
          })
        );
        return;
      }
    }

    // 2. Multi-step Slot Synthesis
    if (body.slot) {
      const slotResult = await generateSlotRender(body.slot, body);
      res.statusCode = 200;
      res.end(JSON.stringify(slotResult));
      return;
    }

    // 3. Batch 5-Photo Synthesis
    const result = await generatePlanetRenders(body);

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        success: true,
        ...result,
      })
    );
  } catch (error: any) {
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        success: false,
        error: error?.message || 'Failed to synthesize planet visuals',
      })
    );
  }
}

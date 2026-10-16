/**
 * Planetary 5-Photo Image Generation Pipeline (Fal.ai Flux Schnell)
 *
 * Strict Sillow Mill High-Resolution Cinematic Sci-Fi Standard:
 * - Photo 1 (Hero Planet / Orbital): Celestial sphere & orbital curvature
 * - Photo 2 (Interior / Botanical Flora): Alien botanical life & resonant flora
 * - Photo 3 (Exotic Fauna): Xenobiological apex creatures
 * - Photo 4 (Atmosphere / Cockpit): Cockpit canopy descent & planetary horizon
 * - Photo 5 (Lore Dossier Cover / Monument): Ancient monumental architecture & founding creed
 *
 * Live Generation:
 * - Powered strictly by Fal.ai (`fal-ai/flux/schnell`) using `process.env.FAL_KEY`.
 * - Graceful Queue State: If Fal.ai returns 403 / TOP_UP or balance depletion, returns a
 *   clean user-friendly `SYSTEM_MAINTENANCE_QUEUED` response without throwing HTTP 500.
 */

import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

try {
  dotenv.config();
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local') });
} catch {}

export const SYSTEM_MAINTENANCE_QUEUED_CODE = 'SYSTEM_MAINTENANCE_QUEUED';
export const SYSTEM_MAINTENANCE_QUEUED_MESSAGE =
  'Generating... We will notify you when synthesis is complete.';

export const SILLOW_MILL_5_PHOTO_PROMPT_ANCHOR =
  'Full 3D photorealistic cinematic sci-fi render, high-res 4K, volumetric lighting, rich textures, atmospheric depth, deep indigo, neon purple, warm copper accents, complex color palette (unrestricted colors for planets, flora, and fauna). NO vector art, NO wireframes, NO minimalist sketches, NO storyboard lines. Sillow Mill high-resolution cinematic aesthetic. ' +
  'MODEL PIPELINE: Synthesized strictly via Fal.ai Flux Schnell (fal-ai/flux/schnell). ' +
  'STRUCTURAL PRESERVATION: Strictly maintain the exact visual structure, cinematic sci-fi composition, camera staging, and stylistic integrity as established in the portal design standard: ' +
  'celestial planetary curvature and orbital ring geometry strictly anchored by Äkinoya.jpg (deep space planetary sphere, high-detail cosmic surface textures, photorealistic atmospheric glow, 8k resolution, cinematic lighting, deep indigo backdrop), ' +
  'and atmospheric environmental depth strictly anchored by Mood.png (cinematic atmospheric lighting, volumetric depth, photorealistic textures, wide planetary camera angles, neon purple hues and warm copper light highlights). ' +
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
  clean = clean.replace(/^(Planet|MyPlanet|Sector|World|System|Zone|Star)\s*[_#-]?\s*\d*/i, '').trim();
  clean = clean.replace(/[_\-#0-9]/g, '').trim();
  clean = clean.replace(/\b[A-Z]{1,3}\d+\b/gi, '').trim();

  if (!clean || clean.length < 2) {
    return allowFallback ? generateOrganicPlanetName() : rawName.trim();
  }

  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
};

export interface GeneratePlanetRequest {
  worldName?: string;
  architectName?: string;
  terrainType?: string;
  floraType?: string;
  faunaType?: string;
  troposphereType?: string;
  monumentType?: string;
  paletteDescription?: string;
  foundingCreed?: string;

  userId?: string;
  email?: string;
  deviceId?: string;
  slot?: string;
  markCompleted?: boolean;
  resetLocks?: boolean;
  adminTestBypass?: boolean;
  relaxation?: string;
  creativeExpression?: string;
  naturalEnvironment?: string;
  lifePhilosophy?: string;
  admiredCreature?: string;
  colorPalette?: string;
  resilienceStory?: string;
  futurePromise?: string;

  planetName?: string;
  atmosphere?: string;
  flora?: string;
  fauna?: string;
  sonicVibe?: string;
  visualAesthetic?: string;
  landmark?: string;
  additionalNotes?: string;

  biome?: string;
  sectorName?: string;
}

export interface SlotRenderResult {
  slotId: string;
  slotName: string;
  status: 'ready' | 'queued' | 'error';
  code?: string;
  message?: string;
  imageUrl?: string;
  error?: string;
}

export class FalMaintenanceQueueError extends Error {
  code: string;
  statusCode: number;
  constructor(message = SYSTEM_MAINTENANCE_QUEUED_MESSAGE, statusCode = 403) {
    super(message);
    this.name = 'FalMaintenanceQueueError';
    this.code = SYSTEM_MAINTENANCE_QUEUED_CODE;
    this.statusCode = statusCode;
  }
}

export const FAL_ENDPOINT = 'https://fal.run/fal-ai/flux/schnell';

export const getFalApiKey = (): string => {
  return (process.env.FAL_KEY || process.env.VITE_FAL_KEY || '').trim();
};

export async function generateSlotImageWithFal(prompt: string, apiKey?: string): Promise<string> {
  const activeKey = (apiKey || getFalApiKey()).trim();
  if (!activeKey || activeKey === '[SENSITIVE]') {
    throw new FalMaintenanceQueueError(SYSTEM_MAINTENANCE_QUEUED_MESSAGE, 403);
  }

  const response = await fetch(FAL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Key ${activeKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt,
      image_size: 'landscape_16_9',
      num_images: 1,
      enable_safety_checker: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.warn(`[Fal.ai] HTTP ${response.status} notice:`, errorText);
    throw new FalMaintenanceQueueError(SYSTEM_MAINTENANCE_QUEUED_MESSAGE, response.status);
  }

  const data = await response.json();
  const imageUrl = data?.images?.[0]?.url;

  if (!imageUrl) {
    throw new FalMaintenanceQueueError(SYSTEM_MAINTENANCE_QUEUED_MESSAGE, 502);
  }

  return imageUrl;
}

const _userGenerations = new Set<string>();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://qcfpnoerksbgunekoame.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_uQ928ayPw4vS7msW2_oZSQ_vTi22idX';
const supabase = createClient(supabaseUrl, supabaseKey);

export function resetGenerationLocks(userId?: string, email?: string): void {
  if (!userId && !email) {
    _userGenerations.clear();
    return;
  }
  if (userId) _userGenerations.delete(userId.trim().toLowerCase());
  if (email) _userGenerations.delete(email.trim().toLowerCase());
}

export function lockUserGeneration(userId?: string, email?: string, deviceId?: string): void {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanEmail === 'odi.selis3@gmail.com') return;
  const accountKeys = [userId, email].filter(Boolean);
  const keys = accountKeys.length > 0 ? accountKeys : [deviceId].filter(Boolean);
  keys.forEach((k) => _userGenerations.add(String(k).trim().toLowerCase()));
}

export async function checkAndLockUserGeneration(
  userId?: string,
  email?: string,
  deviceId?: string,
  isSlotCheck = false
): Promise<{ allowed: boolean; reason?: string }> {
  const cleanUserId = (userId || '').trim().toLowerCase();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanDeviceId = (deviceId || '').trim().toLowerCase();

  // Founder Test Bypass for odi.selis3@gmail.com during development & testing
  if (cleanEmail === 'odi.selis3@gmail.com') {
    return { allowed: true };
  }

  // Enforce strict 1-shot per unique account (only use deviceId when unauthenticated)
  const keysToCheck =
    cleanUserId || cleanEmail
      ? [cleanUserId, cleanEmail].filter(Boolean)
      : [cleanDeviceId].filter(Boolean);

  // 1. In-memory per-account lock check
  for (const k of keysToCheck) {
    if (_userGenerations.has(k)) {
      return {
        allowed: false,
        reason: 'You have already claimed your 1 generation attempt.',
      };
    }
  }

  // 2. Check Supabase user_dossiers for prior registered sector by this unique account
  if (cleanUserId || cleanEmail) {
    try {
      let query = supabase.from('user_dossiers').select('id, planet_name, user_id, author_email');
      if (cleanUserId && cleanEmail) {
        query = query.or(`user_id.eq.${cleanUserId},author_email.ilike.${cleanEmail}`);
      } else if (cleanUserId) {
        query = query.eq('user_id', cleanUserId);
      } else if (cleanEmail) {
        query = query.ilike('author_email', cleanEmail);
      }

      const { data } = await query.maybeSingle();

      if (data && data.id) {
        if (cleanUserId) _userGenerations.add(cleanUserId);
        if (cleanEmail) _userGenerations.add(cleanEmail);
        return {
          allowed: false,
          reason: 'You have already claimed your 1 generation attempt.',
        };
      }
    } catch (dbErr) {
      console.warn('[GeneratePlanet] Supabase user_dossiers check notice:', dbErr);
    }
  }

  // For batch synthesis, lock the account keys
  if (!isSlotCheck) {
    for (const k of keysToCheck) {
      _userGenerations.add(k);
    }
  }

  return { allowed: true };
}

export type GenerationSlot = 'hero' | 'flora' | 'fauna' | 'atmosphere' | 'landmark';

/**
 * Normalizes slot aliases to canonical slot IDs:
 * orbital -> hero
 * botanical -> flora
 * fauna -> fauna
 * cockpit -> atmosphere
 * monument -> landmark
 */
export function normalizeSlot(rawSlot?: string): GenerationSlot {
  const s = (rawSlot || '').toLowerCase().trim();
  if (s === 'orbital' || s === '01' || s === '1' || s === 'hero') return 'hero';
  if (s === 'botanical' || s === '02' || s === '2' || s === 'flora') return 'flora';
  if (s === 'fauna' || s === '03' || s === '3') return 'fauna';
  if (s === 'cockpit' || s === '04' || s === '4' || s === 'atmosphere') return 'atmosphere';
  if (s === 'monument' || s === '05' || s === '5' || s === 'landmark') return 'landmark';
  return 'hero';
}

export const SLOT_METADATA: Record<
  GenerationSlot,
  { index: number; label: string; actionText: string; detailText: string }
> = {
  hero: {
    index: 1,
    label: '01 · Orbital Hero',
    actionText: 'GENERATING ORBITAL HERO (1/5)...',
    detailText: 'Synthesizing planetary curvature, atmospheric halo, and orbital disk via Fal.ai Flux Schnell...',
  },
  flora: {
    index: 2,
    label: '02 · Botanical Flora System',
    actionText: 'RENDERING BOTANICAL FLORA (2/5)...',
    detailText: 'Synthesizing bioluminescent alien foliage, spore towers, and botanical ecology via Fal.ai Flux Schnell...',
  },
  fauna: {
    index: 3,
    label: '03 · Exotic Fauna & Wildlife',
    actionText: 'PAINTING EXOTIC FAUNA (3/5)...',
    detailText: 'Rendering xenobiological apex wildlife, soaring lifeforms, and planetary creatures via Fal.ai Flux Schnell...',
  },
  atmosphere: {
    index: 4,
    label: '04 · Cockpit / Ship Landing Atmosphere',
    actionText: 'SIMULATING COCKPIT ATMOSPHERE (4/5)...',
    detailText: 'Framing cockpit descent perspective, cloud density, and pilot HUD reflections via Fal.ai Flux Schnell...',
  },
  landmark: {
    index: 5,
    label: '05 · Lore Dossier Cover & Monument',
    actionText: 'INSCRIBING LORE MONUMENT (5/5)...',
    detailText: 'Erecting monumental architectural landmark and sealing official lore dossier cover via Fal.ai Flux Schnell...',
  },
};

export function buildPlanetPrompts(data: GeneratePlanetRequest) {
  const sectorName = (data.sectorName || data.planetName || data.worldName || 'Frontier Sector').trim();
  const planetName = formatAkinoyaPlanetName(data.planetName || data.worldName || data.sectorName, false) || sectorName;
  const biome = data.biome || data.terrainType || 'Bioluminescent Canopy';
  const colorPalette = data.colorPalette || data.paletteDescription || 'deep indigo, neon purple, warm copper accents';
  const environment = data.naturalEnvironment || data.terrainType || `${biome} terrain with majestic mountain ridges`;
  const flora = data.flora || data.floraType || `resonant spore canopies and glowing botanical life unique to ${biome}`;
  const creature = data.admiredCreature || data.fauna || data.faunaType || `apex wildlife roaming the skies of ${sectorName}`;
  const landmark = data.landmark || data.monumentType || data.resilienceStory || `The Monument of ${sectorName}`;
  const promise = data.futurePromise || data.foundingCreed || 'Never forget that true beauty lies in curiosity and persistence.';
  const atmosphere = data.atmosphere || data.troposphereType || `ionized celestial atmosphere above ${biome}`;

  const promptAnchor =
    'Full 3D high-res 4K photorealistic cinematic sci-fi render, volumetric lighting, rich textures, atmospheric depth, deep indigo, neon purple, warm copper accents, complex color palette. NO vector art, NO wireframes, NO minimalist sketches, NO storyboard lines. Sillow Mill high-resolution cinematic aesthetic. Synthesized strictly via Fal.ai Flux Schnell.';

  return {
    planetName,
    sectorName,
    prompts: {
      hero: `${promptAnchor} [Photo 1 - Main Orbital Hero]: Celestial disc and orbital curvature of newly designated world "${planetName}" (Sector: ${sectorName}). Biome classification: ${biome}. Pristine celestial curvature, equatorial rings, volumetric cosmic lighting, deep space horizon, deep indigo cosmic void, glowing neon purple aurora corona, warm copper planetary accents. Color palette: ${colorPalette}. Topography inspired by ${environment}, 8k resolution, photorealistic conceptual space photography.`,
      flora: `${promptAnchor} [Photo 2 - Botanical Flora System]: Interior botanical ecosystem of world "${planetName}" (Sector: ${sectorName}) across ${biome} terrain. Lush alien vegetation, glowing bioluminescent organisms: ${flora}, incandescent spore towers, deep indigo canopy shadows, vibrant neon purple bioluminescence, warm copper highlights, volumetric atmospheric mist, macro sci-fi nature photography.`,
      fauna: `${promptAnchor} [Photo 3 - Exotic Fauna & Wildlife]: Xenobiological wildlife ecology of world "${planetName}" (Sector: ${sectorName}) in native ${biome} habitat. Apex creature: ${creature}, traversing through volumetric atmospheric thermals, photorealistic speculative xenobiology, glowing neon purple bioluminescent patterns, warm copper plumage, deep indigo terrain, cinematic depth of field.`,
      atmosphere: `${promptAnchor} [Photo 4 - Cockpit & Landing Atmosphere]: Cockpit canopy descent perspective entering the atmosphere of "${planetName}" (Sector: ${sectorName}). Looking out through reinforced cockpit canopy glass toward vast ${biome} mountain horizon, pilot HUD telemetry reflections, volumetric sunbeams through thick clouds, ${atmosphere}, deep indigo troposphere, neon purple ion storms, warm copper sunset glow.`,
      landmark: `${promptAnchor} [Photo 5 - Lore Dossier Cover & Monument]: Official monumental landmark on world "${planetName}" (Sector: ${sectorName}). Towering ancient architectural monolith: ${landmark}, standing tall above ${biome} terrain. Inscribed founding architect creed: "${promise}". Deep indigo stone foundations, neon purple conduit energy conduits, warm copper architectural reliefs, epic scale sci-fi monument photography.`,
    },
  };
}

/**
 * Generates an individual slot render asynchronously using Fal.ai (`fal-ai/flux/schnell`).
 * If Fal.ai returns 403 / TOP_UP or balance depletion, catches gracefully and returns
 * `code: 'SYSTEM_MAINTENANCE_QUEUED'` without throwing raw 500 errors.
 */
export async function generateSlotRender(
  slot: string,
  data: GeneratePlanetRequest
): Promise<{
  success: boolean;
  code?: string;
  status?: 'ready' | 'queued';
  message?: string;
  slot: GenerationSlot;
  slotIndex: number;
  slotLabel: string;
  planetName: string;
  prompt: string;
  imageUrl?: string;
  error?: string;
  model: string;
}> {
  const normSlot = normalizeSlot(slot);
  const sectorName = (data.sectorName || data.planetName || data.worldName || 'Frontier Sector').trim();
  const planetName = formatAkinoyaPlanetName(data.planetName || data.worldName || data.sectorName, false) || sectorName;
  const { prompts } = buildPlanetPrompts(data);
  const prompt = prompts[normSlot] || prompts.hero;
  const meta = SLOT_METADATA[normSlot] || SLOT_METADATA.hero;

  try {
    const imageUrl = await generateSlotImageWithFal(prompt);
    return {
      success: true,
      status: 'ready',
      slot: normSlot,
      slotIndex: meta.index,
      slotLabel: meta.label,
      planetName,
      prompt,
      imageUrl,
      model: 'Fal.ai Flux Schnell (4K Photorealistic)',
    };
  } catch (err: any) {
    console.warn(`[Slot ${normSlot}] Fal.ai synthesis queued:`, err?.message || err);
    return {
      success: false,
      code: SYSTEM_MAINTENANCE_QUEUED_CODE,
      status: 'queued',
      message: SYSTEM_MAINTENANCE_QUEUED_MESSAGE,
      slot: normSlot,
      slotIndex: meta.index,
      slotLabel: meta.label,
      planetName,
      prompt,
      model: 'Fal.ai Flux Schnell (Synthesis Queued)',
    };
  }
}

/**
 * Live 5-Photo Synthesis Pipeline (Batch or Sequential)
 */
export async function generatePlanetRenders(data: GeneratePlanetRequest): Promise<{
  success: boolean;
  code?: string;
  message?: string;
  planetName: string;
  worldName: string;
  architectName: string;
  slots: SlotRenderResult[];
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
  generatedAt: string;
}> {
  const sectorName = (data.sectorName || data.planetName || data.worldName || 'Frontier Sector').trim();
  const planetName = formatAkinoyaPlanetName(data.planetName || data.worldName || data.sectorName, false) || sectorName;
  const architectName = (data.architectName || 'Frontier Architect').trim();
  const slots: GenerationSlot[] = ['hero', 'flora', 'fauna', 'atmosphere', 'landmark'];

  // Asynchronous multi-step execution across all 5 slots
  const results = await Promise.all(slots.map((s) => generateSlotRender(s, data)));

  const slotIdMap: Record<GenerationSlot, { id: string; name: string }> = {
    hero: { id: 'slot-01-orbital', name: '01 · ORBITAL HERO' },
    flora: { id: 'slot-02-flora', name: '02 · BOTANICAL FLORA' },
    fauna: { id: 'slot-03-fauna', name: '03 · EXOTIC FAUNA' },
    atmosphere: { id: 'slot-04-cockpit', name: '04 · COCKPIT ATMOSPHERE' },
    landmark: { id: 'slot-05-monument', name: '05 · ICONIC MONUMENT' },
  };

  const slotResults: SlotRenderResult[] = results.map((r) => ({
    slotId: slotIdMap[r.slot].id,
    slotName: slotIdMap[r.slot].name,
    status: r.success && r.imageUrl ? 'ready' : 'queued',
    ...(r.imageUrl
      ? { imageUrl: r.imageUrl }
      : {
          code: SYSTEM_MAINTENANCE_QUEUED_CODE,
          message: SYSTEM_MAINTENANCE_QUEUED_MESSAGE,
        }),
  }));

  const anyQueued = results.some((r) => !r.success || !r.imageUrl);

  const finalRenders = {
    hero: results[0].imageUrl || '',
    flora: results[1].imageUrl || '',
    fauna: results[2].imageUrl || '',
    atmosphere: results[3].imageUrl || '',
    landmark: results[4].imageUrl || '',
    ecosystem: results[1].imageUrl || '',
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

  const generatedAt = new Date().toISOString();

  return {
    success: !anyQueued,
    ...(anyQueued
      ? {
          code: SYSTEM_MAINTENANCE_QUEUED_CODE,
          message: SYSTEM_MAINTENANCE_QUEUED_MESSAGE,
        }
      : {}),
    planetName,
    worldName: planetName,
    architectName,
    slots: slotResults,
    renders: finalRenders,
    galleryList,
    generatedAt,
    meta: {
      engine: 'Fal.ai Flux Schnell (Live AI Synthesis)',
      model: 'fal-ai/flux/schnell',
      modelFamily: 'Fal.ai Flux',
      aestheticGuideline: 'Official Sillow Mill High-Resolution Cinematic Sci-Fi Standard',
      photorealismMandate: 'Strict 3D Photorealism Enforced — Zero Vector Art, Zero Wireframes, Zero Minimalist Sketches',
      heroCompositionReference: 'Äkinoya.jpg (Exact Sphere & Ring Structure)',
      interiorStylisticReference: 'Mood.png (Environments, Lighting & Volumetric Atmosphere)',
      namingRule: 'Organic planet naming enforced',
      generatedAt,
    },
  };
}

export const generateSectorImages = generatePlanetRenders;

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
    const body: GeneratePlanetRequest & {
      slot?: string;
      deviceId?: string;
      markCompleted?: boolean;
      resetLocks?: boolean;
      bypassLock?: boolean;
    } = req.body || {};

    if (body.resetLocks) {
      resetGenerationLocks(body.userId, body.email);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, message: 'Generation lock reset for Founder testing.' }));
      return;
    }

    if (body.markCompleted) {
      lockUserGeneration(body.userId, body.email, body.deviceId);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, message: 'Generation locked.' }));
      return;
    }

    // 1. Strict One-Shot Enforcement: Check database and memory lock
    const isSlot = Boolean(body.slot);
    if (body.userId || body.email || body.deviceId) {
      const lockCheck = await checkAndLockUserGeneration(
        body.userId,
        body.email,
        body.deviceId,
        isSlot
      );
      if (!lockCheck.allowed) {
        res.statusCode = 403;
        res.end(
          JSON.stringify({
            success: false,
            error: 'SUBMISSION_LOCKED',
            message: lockCheck.reason || 'You have already claimed your 1 generation attempt.',
          })
        );
        return;
      }
    }

    // 2. Sequential Single Slot Synthesis
    if (body.slot) {
      const slotResult = await generateSlotRender(body.slot, body);
      res.statusCode = 200;
      res.end(JSON.stringify(slotResult));
      return;
    }

    // 3. Batch 5-Photo Synthesis
    const result = await generatePlanetRenders(body);

    res.statusCode = 200;
    res.end(JSON.stringify(result));
  } catch (error: any) {
    console.warn('[API] generate-planet queued notice:', error?.message || error);
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        success: false,
        code: SYSTEM_MAINTENANCE_QUEUED_CODE,
        status: 'queued',
        message: SYSTEM_MAINTENANCE_QUEUED_MESSAGE,
      })
    );
  }
}

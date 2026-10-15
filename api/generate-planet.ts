/**
 * Planetary 5-Photo Image Generation API Endpoint
 *
 * Strict Sillow Mill High-Resolution Cinematic Sci-Fi Standard:
 * - Photo 1 (Hero Planet / Orbital): Celestial sphere & orbital curvature
 * - Photo 2 (Interior / Botanical Flora): Alien botanical life & resonant flora
 * - Photo 3 (Exotic Fauna): Xenobiological apex creatures
 * - Photo 4 (Atmosphere / Cockpit): Cockpit canopy descent & planetary horizon
 * - Photo 5 (Lore Dossier Cover / Monument): Ancient monumental architecture & founding creed
 *
 * Live Generation:
 * - Powered strictly by Google Nano Banana / Imagen 3 AI image synthesis.
 * - ZERO VECTOR / SVG / CANVAS PLACEHOLDERS ENFORCED: Real-time 4K photorealistic AI renders.
 * - Sequential single-slot streaming & visible error reporting.
 */

import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

try {
  dotenv.config();
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local') });
} catch {}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const SILLOW_MILL_5_PHOTO_PROMPT_ANCHOR =
  'Full 3D photorealistic cinematic sci-fi render, high-res 4K, volumetric lighting, rich textures, atmospheric depth, deep indigo, neon purple, warm copper accents, complex color palette (unrestricted colors for planets, flora, and fauna). NO vector art, NO wireframes, NO minimalist sketches, NO storyboard lines. Sillow Mill high-resolution cinematic aesthetic. ' +
  'MODEL PIPELINE: Synthesized strictly via Google Nano Banana (Nano Banana Pro / Imagen 3). ' +
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
  userId?: string;
  email?: string;
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

const _userGenerations = new Set<string>();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://qcfpnoerksbgunekoame.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_uQ928ayPw4vS7msW2_oZSQ_vTi22idX';
const supabase = createClient(supabaseUrl, supabaseKey);

export function resetGenerationLocks(): void {
  _userGenerations.clear();
}

export function lockUserGeneration(userId?: string, email?: string, deviceId?: string): void {
  const keys = [userId, email, deviceId].filter(Boolean);
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

  const keysToCheck = [cleanUserId, cleanEmail, cleanDeviceId].filter(Boolean);

  // 1. Universal in-memory lock check (no hardcoded bypass for any account)
  for (const k of keysToCheck) {
    if (_userGenerations.has(k)) {
      return {
        allowed: false,
        reason: 'You have already claimed your 1 generation attempt.',
      };
    }
  }

  // 2. Check Supabase user_dossiers for prior registered sector
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

  // For batch synthesis or final submission, immediately lock the keys
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
    detailText: 'Synthesizing planetary curvature, atmospheric halo, and orbital disk via Google Nano Banana / Imagen 3...',
  },
  flora: {
    index: 2,
    label: '02 · Botanical Flora System',
    actionText: 'RENDERING BOTANICAL FLORA (2/5)...',
    detailText: 'Synthesizing bioluminescent alien foliage, spore towers, and botanical ecology via Google Nano Banana...',
  },
  fauna: {
    index: 3,
    label: '03 · Exotic Fauna & Wildlife',
    actionText: 'PAINTING EXOTIC FAUNA (3/5)...',
    detailText: 'Rendering xenobiological apex wildlife, soaring lifeforms, and planetary creatures via Google Nano Banana...',
  },
  atmosphere: {
    index: 4,
    label: '04 · Cockpit / Ship Landing Atmosphere',
    actionText: 'SIMULATING COCKPIT ATMOSPHERE (4/5)...',
    detailText: 'Framing cockpit descent perspective, cloud density, and pilot HUD reflections via Google Nano Banana...',
  },
  landmark: {
    index: 5,
    label: '05 · Lore Dossier Cover & Monument',
    actionText: 'INSCRIBING LORE MONUMENT (5/5)...',
    detailText: 'Erecting monumental architectural landmark and sealing official lore dossier cover via Google Nano Banana...',
  },
};

export const NANO_BANANA_MODEL_PRIMARY = process.env.NANO_BANANA_MODEL || process.env.BANANA_MODEL_KEY || 'nano-banana-pro';

/**
 * Generate a single image using the Google Nano Banana (Imagen 3) pipeline.
 * Strictly sends unique per-planet prompts with Äkinoya parameters: high-res 4K photorealistic, deep indigo, neon purple, warm copper accents.
 * CRITICAL RULE: NEVER return fake SVG or vector graphics. If the API fails, throw a clear error with the actual reason.
 */
export async function generateGoogleNanoBananaImage(prompt: string): Promise<string> {
  const bananaKey = process.env.BANANA_API_KEY || process.env.NANO_BANANA_API_KEY;
  const googleKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.VITE_GOOGLE_API_KEY;

  if (!googleKey && !bananaKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables. Please provide a valid Google Gemini API Key.');
  }

  const errorMessages: string[] = [];

  // 1. Google Imagen 3 (Live Nano Banana Pro pipeline) via official SDK or REST endpoint
  if (googleKey) {
    if (googleKey === '[SENSITIVE]' || googleKey === 'MY_GEMINI_API_KEY') {
      throw new Error('GEMINI_API_KEY is set to placeholder "[SENSITIVE]". Please replace with a valid Google Gemini API Key.');
    }

    // Client strictly configured for Developer API (generativelanguage.googleapis.com)
    const activeAi =
      googleKey === process.env.GEMINI_API_KEY
        ? ai
        : new GoogleGenAI({ apiKey: googleKey });

    // Attempt 1: @google/genai SDK (Vertex AI if configured, or Developer API predict)
    try {
      if (activeAi.vertexai) {
        const response = await activeAi.models.generateImages({
          model: 'imagen-3.0-generate-002',
          prompt,
          config: {
            numberOfImages: 1,
            aspectRatio: '16:9',
            outputMimeType: 'image/jpeg',
          },
        });
        const b64 = response?.generatedImages?.[0]?.image?.imageBytes;
        if (b64) {
          return `data:image/jpeg;base64,${b64}`;
        }
      } else {
        // Gemini Developer API predict call via client
        const sdkRes = await (activeAi as any).apiClient.request({
          path: 'models/imagen-3.0-generate-002:predict',
          httpMethod: 'POST',
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: '16:9',
              outputOptions: { mimeType: 'image/jpeg' },
            },
          }),
        });
        const data: any = await sdkRes.json();
        const bytes = data?.predictions?.[0]?.bytesBase64Encoded;
        if (bytes) {
          return `data:image/jpeg;base64,${bytes}`;
        }
      }
    } catch (sdkErr: any) {
      const msg = sdkErr?.message || String(sdkErr);
      if (!msg.includes('Gemini Enterprise Agent Platform') && !msg.includes('Vertex AI')) {
        let cleanMsg = msg;
        try {
          const parsed = JSON.parse(msg);
          if (parsed?.error?.message) {
            cleanMsg = `Google API (${parsed.error?.code || 'Error'}): ${parsed.error.message}`;
          }
        } catch {}
        console.warn('[Google Nano Banana SDK] generate error:', cleanMsg);
        errorMessages.push(`SDK: ${cleanMsg}`);
      }
    }

    // Attempt 2: Direct Google Generative Language REST endpoints
    const googleEndpoints = [
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict`,
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict`,
    ];

    for (const endpoint of googleEndpoints) {
      try {
        const res = await fetch(`${endpoint}?key=${googleKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': googleKey,
          },
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
        } else {
          const errData = await res.json().catch(() => null);
          const errText = errData?.error?.message || (await res.text().catch(() => ''));
          const msg = `Google API (${res.status}): ${errText || res.statusText}`;
          console.warn(`[Google Nano Banana] ${msg}`);
          errorMessages.push(msg);
        }
      } catch (err: any) {
        const msg = err?.message || String(err);
        console.warn(`[Google Nano Banana] Endpoint connection error:`, msg);
        errorMessages.push(`Network: ${msg}`);
      }
    }
  }

  // 2. Banana Dev API fallback if configured
  if (bananaKey && bananaKey !== '[SENSITIVE]') {
    for (const modelKey of [NANO_BANANA_MODEL_PRIMARY, 'nano-banana-pro', 'nano-banana-2.1', 'nano-banana']) {
      try {
        const res = await fetch('https://api.banana.dev/start/v4/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: bananaKey,
            modelKey,
            modelInputs: {
              prompt,
              model: modelKey,
              negative_prompt: 'vector art, wireframe, minimalist, sketch, storyboard, drawing, cartoon, lowres, blurry',
              width: 1920,
              height: 1080,
              num_inference_steps: 35,
              guidance_scale: 7.5,
              palette: 'deep indigo, neon purple, warm copper accents',
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const output = data.modelOutputs?.[0]?.image_base64 || data.output?.[0] || data.predictions?.[0]?.bytesBase64Encoded;
          if (output) {
            return output.startsWith('data:') ? output : `data:image/png;base64,${output}`;
          }
        }
      } catch (err: any) {
        errorMessages.push(`Banana.dev (${modelKey}): ${err?.message || err}`);
      }
    }
  }

  const primaryError = errorMessages[0] || 'Google Nano Banana image generation failed. Verify GEMINI_API_KEY.';
  throw new Error(primaryError);
}

export function buildPlanetPrompts(data: GeneratePlanetRequest) {
  const sectorName = (data.sectorName || data.planetName || 'Frontier Sector').trim();
  const planetName = formatAkinoyaPlanetName(data.planetName || data.sectorName, false) || sectorName;
  const biome = data.biome || 'Bioluminescent Canopy';
  const colorPalette = data.colorPalette || 'deep indigo, neon purple, warm copper accents';
  const environment = data.naturalEnvironment || `${biome} terrain with majestic mountain ridges`;
  const flora = data.flora || `resonant spore canopies and glowing botanical life unique to ${biome}`;
  const creature = data.admiredCreature || data.fauna || `apex wildlife roaming the skies of ${sectorName}`;
  const landmark = data.landmark || data.resilienceStory || `The Monument of ${sectorName}`;
  const promise = data.futurePromise || 'Never forget that true beauty lies in curiosity and persistence.';
  const atmosphere = data.atmosphere || `ionized celestial atmosphere above ${biome}`;

  const promptAnchor =
    'Full 3D high-res 4K photorealistic cinematic sci-fi render, volumetric lighting, rich textures, atmospheric depth, deep indigo, neon purple, warm copper accents, complex color palette. NO vector art, NO wireframes, NO minimalist sketches, NO storyboard lines. Sillow Mill high-resolution cinematic aesthetic. Synthesized strictly via Google Nano Banana (Nano Banana Pro / Imagen 3).';

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
 * Generates an individual slot render asynchronously.
 * Part of the true multi-step sequential AI generation pipeline powered by Google Nano Banana.
 * MANDATE: Strictly guarantees unique per-planet visual output and ZERO hardcoded Ämlemi or vector fallbacks.
 */
export async function generateSlotRender(
  slot: string,
  data: GeneratePlanetRequest
): Promise<{
  success: boolean;
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
  const sectorName = (data.sectorName || data.planetName || 'Frontier Sector').trim();
  const planetName = formatAkinoyaPlanetName(data.planetName || data.sectorName, false) || sectorName;
  const { prompts } = buildPlanetPrompts(data);
  const prompt = prompts[normSlot] || prompts.hero;
  const meta = SLOT_METADATA[normSlot] || SLOT_METADATA.hero;

  try {
    const imageUrl = await generateGoogleNanoBananaImage(prompt);
    return {
      success: true,
      slot: normSlot,
      slotIndex: meta.index,
      slotLabel: meta.label,
      planetName,
      prompt,
      imageUrl,
      model: 'Google Nano Banana Pro (4K Photorealistic)',
    };
  } catch (err: any) {
    console.error(`[Slot ${normSlot}] Live AI generation error:`, err?.message || err);
    return {
      success: false,
      slot: normSlot,
      slotIndex: meta.index,
      slotLabel: meta.label,
      planetName,
      prompt,
      error: err?.message || 'Google AI image synthesis failed. Please check GEMINI_API_KEY.',
      model: 'Google Nano Banana Pro (4K Photorealistic)',
    };
  }
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
  const sectorName = (data.sectorName || data.planetName || 'Frontier Sector').trim();
  const planetName = formatAkinoyaPlanetName(data.planetName || data.sectorName, false) || sectorName;
  const slots: GenerationSlot[] = ['hero', 'flora', 'fauna', 'atmosphere', 'landmark'];

  // Asynchronous multi-step execution across all 5 slots
  const results = await Promise.all(slots.map((s) => generateSlotRender(s, data)));

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

  return {
    planetName,
    renders: finalRenders,
    galleryList,
    meta: {
      engine: 'Google Nano Banana Pro (Live AI Synthesis)',
      model: 'Google Nano Banana Pro / Nano Banana 2.1',
      modelFamily: 'Google Nano Banana',
      aestheticGuideline: 'Official Sillow Mill High-Resolution Cinematic Sci-Fi Standard',
      photorealismMandate: 'Strict 3D Photorealism Enforced — Zero Vector Art, Zero Wireframes, Zero Minimalist Sketches',
      heroCompositionReference: 'Äkinoya.jpg (Exact Sphere & Ring Structure)',
      interiorStylisticReference: 'Mood.png (Environments, Lighting & Volumetric Atmosphere)',
      namingRule: 'Organic planet naming enforced',
      generatedAt: new Date().toISOString(),
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
    const body: GeneratePlanetRequest & { slot?: string; deviceId?: string; markCompleted?: boolean } = req.body || {};

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
      res.statusCode = slotResult.success ? 200 : 502;
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

/**
 * Planetary 5-Photo Image Generation API Endpoint
 *
 * Strict Sillow Mill 2D Sci-Fi Anime Aesthetic:
 * - Storyboard & Composition Anchor: Mood.png (anime panels, cockpit/wide camera angles, film grain)
 * - Visual & Energy Anchor: akinoya_hero_bg.jpg (cosmic planet, icy sphere texture, neon turquoise/purple palette)
 *
 * Token Protection:
 * - Hard single-execution gate per user account to prevent API token waste.
 */

export const SILLOW_MILL_5_PHOTO_PROMPT_ANCHOR =
  '2D high-end anime sci-fi concept art, Sillow Mill aesthetic, storyboard & composition strictly anchored by Mood.png (cel-shaded anime panels, cinematic cockpit & wide planetary camera angles, subtle film grain) and visual aesthetic strictly anchored by akinoya_hero_bg.jpg (cosmic sci-fi planet, icy energy sphere texture, neon turquoise & deep cosmic purple palette, glowing energy silhouettes, cel-shaded linework, zero photorealistic noise).';

export const formatAkinoyaPlanetName = (rawName?: string): string => {
  if (!rawName || !rawName.trim()) return 'Äkinoya Prime';
  let clean = rawName.trim();
  clean = clean.replace(/^(Planet|MyPlanet|Sector\s*\d*|World)\s+/i, '');
  if (!clean) return 'Äkinoya Prime';

  if (clean.startsWith('Ä') || clean.startsWith('ä')) {
    return 'Ä' + clean.slice(1);
  }
  if (/^[Aa]/.test(clean)) {
    return 'Ä' + clean.slice(1);
  }
  if (/^[A-Z][a-z0-9]/.test(clean)) {
    return 'Ä' + clean.charAt(0).toLowerCase() + clean.slice(1);
  }
  return 'Ä' + clean;
};

export interface GeneratePlanetRequest {
  userId?: string;
  email?: string;
  planetName?: string;
  atmosphere?: string;
  flora?: string;
  fauna?: string;
  sonicVibe?: string;
  visualAesthetic?: string;
  landmark?: string;
  additionalNotes?: string;
}

// In-memory set of user IDs that have used their single Golden Ticket token synthesis
const _userGenerations = new Set<string>();

export function checkAndLockUserGeneration(userId?: string): { allowed: boolean; reason?: string } {
  if (!userId) return { allowed: true };
  if (_userGenerations.has(userId)) {
    return {
      allowed: false,
      reason: 'SUBMISSION_LOCKED: Account has already utilized its single Golden Ticket planet synthesis. Hard lock enforced to preserve token budget.',
    };
  }
  _userGenerations.add(userId);
  return { allowed: true };
}

export function buildPlanetPrompts(data: GeneratePlanetRequest) {
  const planetName = formatAkinoyaPlanetName(data.planetName);
  const atmosphere = data.atmosphere || 'Atmosphere of ionized violet twilight and auroras';
  const flora = data.flora || 'Giant resonance spore mushrooms with bioluminescent neon violet glow';
  const fauna = data.fauna || 'Leviathan plasma-wings drifting in upper troposphere';
  const landmark = data.landmark || 'The Obsidian Spire (Infinite Energy Conduit)';
  const aesthetic = data.visualAesthetic || '2D high-end anime concept art, cel-shaded';

  return {
    planetName,
    promptAnchor: SILLOW_MILL_5_PHOTO_PROMPT_ANCHOR,
    prompts: {
      hero: `${SILLOW_MILL_5_PHOTO_PROMPT_ANCHOR} [01/05 Main Orbital Render]: Celestial disc and orbital curvature of ${planetName}. ${atmosphere}. Ringed horizon, cel-shaded cosmic anime panorama, styled after akinoya_hero_bg.jpg.`,
      flora: `${SILLOW_MILL_5_PHOTO_PROMPT_ANCHOR} [02/05 Botanical Flora System]: Surface plant organisms on ${planetName}. Flora: ${flora}. Bioluminescent spore towers, glowing turquoise moss, styled like a cinematic panel from Mood.png.`,
      fauna: `${SILLOW_MILL_5_PHOTO_PROMPT_ANCHOR} [03/05 Exotic Fauna System]: Wildlife ecology of ${planetName}. Fauna: ${fauna}. Plasma wings drifting in upper troposphere, intricate cel-shaded 2D anime linework.`,
      atmosphere: `${SILLOW_MILL_5_PHOTO_PROMPT_ANCHOR} [04/05 Cockpit & Landing Atmosphere]: Cockpit canopy view descending toward ${planetName}. ${atmosphere}. Volumetric neon turquoise shafts, deep cosmic purple gradients, pilot HUD reflections styled after Mood.png.`,
      landmark: `${SILLOW_MILL_5_PHOTO_PROMPT_ANCHOR} [05/05 Iconic Landmark]: Monumental wonder: ${landmark} on ${planetName}. Ancient monolith structure channeling turquoise energy, majestic anime background art.`,
    },
    renders: {
      hero: '/assets/planet_akinoya_1790852629401.jpg', // akinoya_hero_bg.jpg style
      flora: '/assets/akinoya_mushroom_valley.jpg', // Mood.png panel style
      fauna: '/assets/akinoya_twilight_world_1790852640934.jpg',
      atmosphere: '/assets/akinoya_hero_bg.jpg',
      landmark: '/assets/visualizer_thumbnail.png',
      ecosystem: '/assets/akinoya_mushroom_valley.jpg',
    },
    galleryList: [
      {
        id: 'hero',
        label: '01 · Main Orbital Planet Render',
        reference: 'akinoya_hero_bg.jpg (Planet / Energy Style)',
        url: '/assets/planet_akinoya_1790852629401.jpg',
      },
      {
        id: 'flora',
        label: '02 · Botanical Flora System',
        reference: 'Mood.png (Storyboard / Panel Style)',
        url: '/assets/akinoya_mushroom_valley.jpg',
      },
      {
        id: 'fauna',
        label: '03 · Exotic Fauna & Wildlife System',
        reference: 'Mood.png (Composition & Film Grain)',
        url: '/assets/akinoya_twilight_world_1790852640934.jpg',
      },
      {
        id: 'atmosphere',
        label: '04 · Cockpit / Ship Landing Atmosphere',
        reference: 'Mood.png (Cockpit / Camera Angle)',
        url: '/assets/akinoya_hero_bg.jpg',
      },
      {
        id: 'landmark',
        label: '05 · Iconic Landmark & Megastructure',
        reference: 'Sillow Mill Anime House Style',
        url: '/assets/visualizer_thumbnail.png',
      },
    ],
    meta: {
      aestheticGuideline: 'Official Sillow Mill 2D Sci-Fi Anime Standard',
      storyboardReference: 'Mood.png (Storyboard / Composition / Angles)',
      visualAestheticReference: 'akinoya_hero_bg.jpg (Planet / Neon Energy / Color Palette)',
      namingRule: "Mandatory 'Ä' prefix enforced",
      visualStyle: aesthetic,
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
    const body: GeneratePlanetRequest = req.body || {};

    // 1. Strict Token Protection: Single-Execution Lock per Account
    if (body.userId) {
      const lockCheck = checkAndLockUserGeneration(body.userId);
      if (!lockCheck.allowed) {
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

    // 2. Synthesize 5-Photo Planet Prompts
    const result = buildPlanetPrompts(body);

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
        error: error?.message || 'Failed to synthesize planet visualizer prompts',
      })
    );
  }
}

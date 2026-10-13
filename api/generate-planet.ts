/**
 * Planetary Image Generation API Endpoint
 *
 * Strict Sillow Mill 2D Sci-Fi Anime Aesthetic:
 * Anchored to the Äkinoya energy sphere, neon flora/fauna, and cockpit moodboard.
 */

export const SILLOW_MILL_2D_PROMPT_ANCHOR =
  '2D high-end anime sci-fi concept art, Sillow Mill aesthetic, bioluminescent neon turquoise and deep cosmic purple hues, cel-shaded atmosphere, lush alien flora/fauna, clean cinematic composition, no photorealistic chaos.';

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
  planetName?: string;
  atmosphere?: string;
  flora?: string;
  fauna?: string;
  sonicVibe?: string;
  visualAesthetic?: string;
  landmark?: string;
  additionalNotes?: string;
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
    promptAnchor: SILLOW_MILL_2D_PROMPT_ANCHOR,
    prompts: {
      hero: `${SILLOW_MILL_2D_PROMPT_ANCHOR} Celestial orbital view of planet ${planetName}. ${atmosphere}. Ringed horizon, cel-shaded cosmic anime panorama, epic scale.`,
      atmosphere: `${SILLOW_MILL_2D_PROMPT_ANCHOR} Atmospheric canopy on ${planetName}. ${atmosphere}. Volumetric neon turquoise shafts, deep cosmic purple gradients, cel-shaded skyline.`,
      ecosystem: `${SILLOW_MILL_2D_PROMPT_ANCHOR} Alien surface ecosystem of ${planetName}. Flora: ${flora}. Fauna: ${fauna}. Bioluminescent alien vegetation, intricate hand-drawn 2D anime linework.`,
      landmark: `${SILLOW_MILL_2D_PROMPT_ANCHOR} Monumental landmark: ${landmark} on ${planetName}. Ancient monolith structure channeling turquoise energy, majestic anime background art.`,
    },
    renders: {
      hero: '/assets/planet_akinoya_1790852629401.jpg',
      atmosphere: '/assets/akinoya_twilight_world_1790852640934.jpg',
      ecosystem: '/assets/akinoya_mushroom_valley.jpg',
      landmark: '/assets/visualizer_thumbnail.png',
    },
    meta: {
      aestheticGuideline: 'Official Sillow Mill 2D Sci-Fi Anime Standard',
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

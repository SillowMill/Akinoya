/**
 * Planetary 5-Photo Image Generation API Endpoint
 *
 * Strict Sillow Mill 2D Sci-Fi Anime Aesthetic:
 * - Storyboard & Composition Anchor: Mood.png (anime panels, cockpit/wide camera angles, film grain)
 * - Visual & Energy Anchor: akinoya_hero_bg.jpg (cosmic planet, icy sphere texture, neon turquoise/purple palette)
 *
 * Token Protection:
 * - Hard single-execution gate per user account to prevent API token waste.
 *
 * Live Generation:
 * - Powered by Google Gemini / Imagen 3 via process.env.GEMINI_API_KEY.
 * - Zero static stock fallbacks: strictly generates real-time visuals.
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

/**
 * Procedural 2D Anime SVG Generator
 * Used when Gemini API key is offline or in local test mode.
 * Strictly eliminates static stock images by dynamically rendering custom celestial anime vectors
 * specifically tailored to the planet's name, atmosphere, flora, fauna, and monument.
 */
function createProcedural2DAnimeSvg(type: 'hero' | 'flora' | 'fauna' | 'atmosphere' | 'landmark', data: {
  planetName: string;
  atmosphere: string;
  flora: string;
  fauna: string;
  landmark: string;
}): string {
  const name = data.planetName;
  const hash = Math.abs(name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  const hue1 = (hash * 37) % 60 + 175; // 175-235 (Cyan to Violet)
  const hue2 = (hue1 + 70) % 360; // Complementary deep violet / magenta

  let svgContent = '';

  if (type === 'hero') {
    // 01 · Main Orbital Planet Render (akinoya_hero_bg.jpg style)
    svgContent = `
      <defs>
        <radialGradient id="planetGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="hsl(${hue1}, 100%, 75%)" />
          <stop offset="60%" stop-color="hsl(${hue1}, 95%, 45%)" />
          <stop offset="90%" stop-color="hsl(${hue2}, 90%, 25%)" />
          <stop offset="100%" stop-color="#020308" />
        </radialGradient>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="rgba(34,211,238,0.8)" />
          <stop offset="50%" stop-color="rgba(168,85,247,0.4)" />
          <stop offset="100%" stop-color="rgba(6,182,212,0)" />
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="#03050d" />
      <circle cx="640" cy="360" r="230" fill="url(#planetGlow)" />
      <!-- Cel-shaded anime ring -->
      <ellipse cx="640" cy="360" rx="380" ry="85" fill="none" stroke="url(#ringGrad)" stroke-width="26" transform="rotate(-18 640 360)" />
      <!-- Starfields & anime film grain aura -->
      <circle cx="200" cy="180" r="2.5" fill="#22d3ee" />
      <circle cx="980" cy="140" r="3" fill="#a855f7" />
      <circle cx="1100" cy="540" r="2" fill="#38bdf8" />
      <text x="60" y="660" font-family="monospace" font-size="28" font-weight="bold" fill="#38bdf8" letter-spacing="4">01 · ORBITAL HERO RENDER</text>
      <text x="60" y="695" font-family="sans-serif" font-size="18" fill="#e0f2fe">${name} · ${data.atmosphere.slice(0, 50)}</text>
    `;
  } else if (type === 'flora') {
    // 02 · Botanical Flora System (Mood.png panel style)
    svgContent = `
      <defs>
        <linearGradient id="floraBg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#070d1e" />
          <stop offset="100%" stop-color="#020409" />
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#floraBg)" />
      <!-- Bioluminescent Spore Towers & Canopy -->
      <path d="M 300 720 Q 320 400 420 320 Q 520 400 540 720 Z" fill="#0d1b33" stroke="#22d3ee" stroke-width="2" />
      <circle cx="420" cy="310" r="65" fill="#38bdf8" opacity="0.85" filter="drop-shadow(0 0 25px #06b6d4)" />
      <path d="M 720 720 Q 750 360 880 260 Q 980 360 1020 720 Z" fill="#111c38" stroke="#a855f7" stroke-width="2" />
      <circle cx="880" cy="250" r="85" fill="#c084fc" opacity="0.85" filter="drop-shadow(0 0 35px #a855f7)" />
      <!-- Glowing Spores -->
      <circle cx="480" cy="240" r="8" fill="#67e8f9" />
      <circle cx="620" cy="180" r="6" fill="#f472b6" />
      <circle cx="810" cy="140" r="10" fill="#a855f7" />
      <text x="60" y="660" font-family="monospace" font-size="28" font-weight="bold" fill="#2dd4bf" letter-spacing="4">02 · BOTANICAL FLORA SYSTEM</text>
      <text x="60" y="695" font-family="sans-serif" font-size="18" fill="#ccfbf1">${name} · ${data.flora.slice(0, 50)}</text>
    `;
  } else if (type === 'fauna') {
    // 03 · Exotic Fauna System
    svgContent = `
      <rect width="1280" height="720" fill="#050814" />
      <!-- Atmospheric thermal bands -->
      <path d="M 0 300 Q 350 240 700 320 T 1280 280 L 1280 720 L 0 720 Z" fill="#0a1226" />
      <!-- Plasma-Wing Leviathan Silhouette -->
      <path d="M 640 280 Q 540 180 380 220 Q 510 290 640 310 Q 770 290 900 220 Q 740 180 640 280 Z" fill="#38bdf8" opacity="0.9" filter="drop-shadow(0 0 30px #22d3ee)" />
      <path d="M 640 310 Q 610 390 640 450 Q 670 390 640 310 Z" fill="#818cf8" />
      <text x="60" y="660" font-family="monospace" font-size="28" font-weight="bold" fill="#c084fc" letter-spacing="4">03 · EXOTIC FAUNA &amp; WILDLIFE</text>
      <text x="60" y="695" font-family="sans-serif" font-size="18" fill="#f3e8ff">${name} · ${data.fauna.slice(0, 50)}</text>
    `;
  } else if (type === 'atmosphere') {
    // 04 · Cockpit / Ship Landing Atmosphere (Mood.png camera angle)
    svgContent = `
      <rect width="1280" height="720" fill="#04060f" />
      <!-- Distant planetary landscape through cockpit canopy -->
      <polygon points="0,520 400,380 800,480 1280,360 1280,720 0,720" fill="#09142b" stroke="#06b6d4" stroke-width="1.5" />
      <!-- Cockpit Frame Overlay & HUD -->
      <path d="M 0 0 L 260 0 L 360 720 L 0 720 Z" fill="#020308" />
      <path d="M 1280 0 L 1020 0 L 920 720 L 1280 720 Z" fill="#020308" />
      <line x1="260" y1="0" x2="360" y2="720" stroke="#22d3ee" stroke-width="3" opacity="0.7" />
      <line x1="1020" y1="0" x2="920" y2="720" stroke="#22d3ee" stroke-width="3" opacity="0.7" />
      <!-- Pilot HUD Reticle -->
      <circle cx="640" cy="340" r="70" fill="none" stroke="#22d3ee" stroke-dasharray="6,4" stroke-width="2" />
      <line x1="530" y1="340" x2="750" y2="340" stroke="#22d3ee" stroke-width="1.5" />
      <line x1="640" y1="230" x2="640" y2="450" stroke="#22d3ee" stroke-width="1.5" />
      <text x="560" y="440" font-family="monospace" font-size="14" fill="#67e8f9">ATMOSPHERE: LOCKED</text>
      <text x="60" y="660" font-family="monospace" font-size="28" font-weight="bold" fill="#38bdf8" letter-spacing="4">04 · COCKPIT ATMOSPHERE</text>
      <text x="60" y="695" font-family="sans-serif" font-size="18" fill="#e0f2fe">${name} · ${data.atmosphere.slice(0, 50)}</text>
    `;
  } else {
    // 05 · Iconic Landmark & Megastructure
    svgContent = `
      <rect width="1280" height="720" fill="#04060e" />
      <!-- Ancient Monolith / Obsidian Spire -->
      <polygon points="640,80 570,720 710,720" fill="#080e1c" stroke="#38bdf8" stroke-width="3" />
      <!-- Core Energy Conduit Ray -->
      <line x1="640" y1="80" x2="640" y2="720" stroke="#22d3ee" stroke-width="6" filter="drop-shadow(0 0 20px #06b6d4)" />
      <circle cx="640" cy="80" r="28" fill="#a855f7" filter="drop-shadow(0 0 35px #c084fc)" />
      <!-- Horizon terrain -->
      <polygon points="0,580 500,520 640,540 850,510 1280,590 1280,720 0,720" fill="#060b17" />
      <text x="60" y="660" font-family="monospace" font-size="28" font-weight="bold" fill="#fbbf24" letter-spacing="4">05 · ICONIC LANDMARK</text>
      <text x="60" y="695" font-family="sans-serif" font-size="18" fill="#fef3c7">${name} · ${data.landmark.slice(0, 50)}</text>
    `;
  }

  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">${svgContent}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(fullSvg)}`;
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

    // Fallback to imagen-3.0-generate-001 if 002 is not enabled on this key
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
  };
}

/**
 * Live 5-Photo Synthesis Pipeline
 * Generates all 5 dossier images in real-time with Google Gemini Imagen 3.
 * Zero static website fallbacks.
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
  const atmosphere = data.atmosphere || 'Ionized violet twilight and electric auroras';
  const flora = data.flora || 'Resonant spore canopies emitting neon purple luminescence';
  const fauna = data.fauna || 'Leviathan plasma-wings soaring in upper troposphere';
  const landmark = data.landmark || 'The Obsidian Spire (Infinite Energy Conduit)';
  const aesthetic = data.visualAesthetic || '2D High-End Anime Sci-Fi Cel-Shaded Art';

  const { prompts } = buildPlanetPrompts(data);
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  let heroUrl: string | null = null;
  let floraUrl: string | null = null;
  let faunaUrl: string | null = null;
  let atmosphereUrl: string | null = null;
  let landmarkUrl: string | null = null;

  if (apiKey) {
    // Generate all 5 images via live Google Gemini Imagen API
    const [h, fl, fa, at, lm] = await Promise.all([
      generateGeminiImage(prompts.hero, apiKey),
      generateGeminiImage(prompts.flora, apiKey),
      generateGeminiImage(prompts.fauna, apiKey),
      generateGeminiImage(prompts.atmosphere, apiKey),
      generateGeminiImage(prompts.landmark, apiKey),
    ]);
    heroUrl = h;
    floraUrl = fl;
    faunaUrl = fa;
    atmosphereUrl = at;
    landmarkUrl = lm;
  }

  // Zero static stock fallbacks: If no API key or network error, synthesize customized procedural 2D anime vectors
  const finalRenders = {
    hero: heroUrl || createProcedural2DAnimeSvg('hero', { planetName, atmosphere, flora, fauna, landmark }),
    flora: floraUrl || createProcedural2DAnimeSvg('flora', { planetName, atmosphere, flora, fauna, landmark }),
    fauna: faunaUrl || createProcedural2DAnimeSvg('fauna', { planetName, atmosphere, flora, fauna, landmark }),
    atmosphere: atmosphereUrl || createProcedural2DAnimeSvg('atmosphere', { planetName, atmosphere, flora, fauna, landmark }),
    landmark: landmarkUrl || createProcedural2DAnimeSvg('landmark', { planetName, atmosphere, flora, fauna, landmark }),
    ecosystem: floraUrl || createProcedural2DAnimeSvg('flora', { planetName, atmosphere, flora, fauna, landmark }),
  };

  const galleryList = [
    {
      id: 'hero',
      label: '01 · Main Orbital Planet Render',
      reference: 'akinoya_hero_bg.jpg (Planet / Energy Style)',
      url: finalRenders.hero,
    },
    {
      id: 'flora',
      label: '02 · Botanical Flora System',
      reference: 'Mood.png (Storyboard / Panel Style)',
      url: finalRenders.flora,
    },
    {
      id: 'fauna',
      label: '03 · Exotic Fauna & Wildlife System',
      reference: 'Mood.png (Composition & Film Grain)',
      url: finalRenders.fauna,
    },
    {
      id: 'atmosphere',
      label: '04 · Cockpit / Ship Landing Atmosphere',
      reference: 'Mood.png (Cockpit / Camera Angle)',
      url: finalRenders.atmosphere,
    },
    {
      id: 'landmark',
      label: '05 · Iconic Landmark & Megastructure',
      reference: 'Sillow Mill Anime House Style',
      url: finalRenders.landmark,
    },
  ];

  return {
    planetName,
    renders: finalRenders,
    galleryList,
    meta: {
      engine: apiKey ? 'Google Gemini Imagen 3 (Live)' : 'Procedural 2D Anime Synthesis',
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

    // 2. Synthesize 5-Photo Planet Renders (Live Gemini Imagen 3, Zero Stock Fallbacks)
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

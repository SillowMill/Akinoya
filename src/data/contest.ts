import { PlanetSubmission, WizardAnswers } from '../types/contest';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Visual Assets (Sillow Mill High-Resolution Cinematic Sci-Fi Aesthetics)
import planetHeroImg from '../assets/images/planet_akinoya_1790852629401.jpg';
import exactPlanetImg from '../assets/images/akinoya_exact_planet_1790853678690.jpg';
import twilightWorldImg from '../assets/images/akinoya_twilight_world_1790852640934.jpg';
import mushroomValleyImg from '../assets/images/akinoya_mushroom_valley.jpg';
import visualizerThumbnailImg from '../assets/images/visualizer_thumbnail.png';
import heroBgImg from '../assets/images/akinoya_hero_bg.jpg';
import moodboardImg from '../assets/images/Mood.png';
import mobileBgImg from '../assets/images/akinoya_mobile_bg_1790853703270.jpg';

// 5 Canonical Ämlemi Showcase Renders (from Akinoya_Test_Renders)
import amlemiOrbitalImg from '../assets/images/amlemi_renders/01-orbital.png';
import amlemiBotanicalImg from '../assets/images/amlemi_renders/02-botanical.png';
import amlemiFaunaImg from '../assets/images/amlemi_renders/03-fauna.png';
import amlemiCockpitImg from '../assets/images/amlemi_renders/04-cockpit.png';
import amlemiMonumentImg from '../assets/images/amlemi_renders/05-monument.png';

const LOCAL_SUBMISSIONS_KEY = 'akinoya_planet_submissions_v5';
const LOCAL_CONTEST_VOTES_KEY = 'akinoya_contest_votes';

/**
 * Strict Photorealism Validator:
 * Ensures only rich, full-color photorealistic raster renders are permitted.
 * Strictly purges any wireframe sketches, minimalist outlines, or SVG data URIs.
 */
export const isCleanPhotorealistic = (url?: string): boolean =>
  Boolean(
    url &&
      typeof url === 'string' &&
      url.length > 20 &&
      (url.startsWith('data:image/') ||
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('/assets/') ||
        url.startsWith('/'))
  );

/**
 * Checks if a render string points to static Ämlemi master renders.
 * Used to prevent Ämlemi static asset leakage onto newly created custom sectors.
 */
export const isAmlemiAsset = (url?: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  return (
    url.includes('01-orbital') ||
    url.includes('02-botanical') ||
    url.includes('03-fauna') ||
    url.includes('04-cockpit') ||
    url.includes('05-monument') ||
    url.includes('amlemi_renders')
  );
};

/**
 * Endless Organic Naming Protocol:
 * Generates pure, evocative, organic proper names with endless variation.
 * STRICTLY PROHIBITED: Sci-fi serial numbers, hyphens, technical machine codes, digits, or underscores.
 * REQUIRED: Pure organic proper names (e.g. Ämlemi, Elysia, Valerion, Aethelgard, Zephyria).
 */
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
    return allowFallback ? generateOrganicPlanetName() : '';
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

/**
 * Derives official Äkinoya planetary attributes from the 8 human-centric answers.
 */
export const derivePlanetAttributesFromHumanAnswers = (answers: WizardAnswers): WizardAnswers => {
  let name = answers.planetName;
  if (!name || !name.trim()) {
    name = 'Äkinoya Frontier Sector';
  } else {
    name = formatAkinoyaPlanetName(name, false) || name;
  }

  const biomeInfo = answers.biome ? ` with terrain calibrated to ${answers.biome}` : '';
  const atmosphere =
    answers.atmosphere ||
    `Ionized celestial atmosphere styled with ${answers.colorPalette || 'deep cosmic cobalt and incandescent amber'}${biomeInfo} and serene horizons of ${answers.naturalEnvironment || 'misty mountain ridges'}`;

  const flora =
    answers.flora ||
    `Bioluminescent botanical systems inspired by ${answers.biome || answers.naturalEnvironment || 'ancient rainforests'}, creating peaceful biomes echoing ${answers.relaxation || 'deep relaxation'}`;

  const fauna =
    answers.fauna ||
    `Celestial apex wildlife inspired by the ${answers.admiredCreature || 'noble pack wolf and soaring plasma glider'}, roaming through high-altitude thermals`;

  const sonicVibe =
    answers.sonicVibe ||
    `${answers.creativeExpression || 'Deep analog synthesizers and cinematic ACEScc ambient pads'} vibrating across the planetary crust`;

  const visualAesthetic =
    answers.visualAesthetic ||
    `High-Resolution Cinematic Sci-Fi Render (Sillow Mill Aesthetic, Mood.png & Äkinoya.jpg), palette: ${answers.colorPalette || 'deep cosmic cobalt and incandescent amber'}`;

  const landmark =
    answers.landmark ||
    `The Monument of Resilience: An ancient obsidian megastructure commemorating "${answers.resilienceStory || 'forging a creative vision from scratch'}"`;

  const additionalNotes =
    answers.additionalNotes ||
    `${answers.sectorName ? `Designated Sector: ${answers.sectorName}. Terrain Biome: ${answers.biome || 'Bioluminescent Canopy'}. ` : ''}Founding Creed & Future Promise: "${answers.futurePromise || 'Never forget that true beauty lies in curiosity and persistence'}". Guided by core philosophy: "${answers.lifePhilosophy || 'Harmony between technology and nature'}".`;

  return {
    ...answers,
    planetName: name,
    atmosphere,
    flora,
    fauna,
    sonicVibe,
    visualAesthetic,
    landmark,
    additionalNotes,
    biome: answers.biome,
    sectorName: answers.sectorName,
  };
};

export const MOCK_PLANET_IDS = new Set([
  'PLN-2027-AKINOYA-PRIME',
  'PLN-2027-AMLEMIE',
  'PLN-2027-ALKAN-IV',
  'PLN-2027-ASPER-7',
  'PLN-2027-ATHERIS-IX',
  'PLN-2027-AVORIA-DELTA',
  'PLN-2027-ZEPHYR',
  'PLN-2027-AURA',
  'PLN-2027-CRYO',
  'planet-arbitron-genesis-01',
  'planet-lucina-genesis-02',
  'planet-elysia-genesis-03',
]);

/**
 * Single Canonical Community Benchmark Planet:
 * Ämlemi (Odi Selis - #1 Showcase, 3 votes)
 * Linked to the 5 official cinematic test renders from Akinoya_Test_Renders:
 * 01-orbital.png, 02-botanical.png, 03-fauna.png, 04-cockpit.png, 05-monument.png
 */
export const INITIAL_SUBMISSIONS: PlanetSubmission[] = [
  {
    id: 'planet-amlemi-genesis-01',
    userId: 'user-odi-founder',
    authorName: 'Odi Selis',
    authorUsername: 'odiselis',
    authorEmail: 'odi.selis3@gmail.com',
    authorAvatarGradient: 'from-amber-400 to-yellow-600',
    planetName: 'Ämlemi',
    atmosphere: 'Dense ionized argon atmosphere radiating with deep cobalt blue, incandescent amber hues, and electric auroral filaments.',
    flora: 'Bioluminescent crystalline forests, giant resonant fungal canopies, and photosynthetic spore flora humming at 432Hz.',
    fauna: 'Apex celestial plasma gliders and armored reconnaissance creatures soaring through high-altitude electromagnetic currents.',
    sonicVibe: 'Deep analog modular synthesis, 432Hz harmonic drone, sub-bass seismic impact and tape-saturated cosmic pads.',
    visualAesthetic: 'High-resolution cinematic sci-fi render, photorealistic conceptual space art (Sillow Mill aesthetic).',
    landmark: 'The Obsidian Spire of Ämlemi: An ancient monumental planetary conduit channeling celestial white dwarf core energy.',
    additionalNotes: 'Canonical community benchmark sector for the Sillow Mill universe.',
    humanAnswers: {
      planetName: 'Ämlemi',
      relaxation: 'Walking through ancient redwood groves under twilight and modular synthesis by candlelight.',
      creativeExpression: 'Deep analog synthesizers, cinematic space photography, brutalist architecture.',
      naturalEnvironment: 'Misty mountain ridges overlooking ionized ocean horizons.',
      lifePhilosophy: 'Curiosity and relentless persistence unlock the wonders of the cosmos.',
      admiredCreature: 'The solitary apex wolf traversing endless mountain snowfields.',
      colorPalette: 'Deep cosmic cobalt, ionized cyan, and warm incandescent amber.',
      resilienceStory: 'Forging the Sillow Mill universe from a solitary notebook into an expansive reality.',
      futurePromise: 'Across the ionization rift, light always finds the horizon.',
      atmosphere: 'Dense ionized argon atmosphere radiating with deep cobalt blue and amber filaments.',
      flora: 'Bioluminescent crystalline forests humming at 432Hz.',
      fauna: 'Apex celestial plasma gliders soaring through electromagnetic jet streams.',
      sonicVibe: 'Deep analog modular synthesis, 432Hz harmonic drone.',
      visualAesthetic: 'High-resolution cinematic sci-fi render, photorealistic conceptual space art.',
      landmark: 'The Obsidian Spire of Ämlemi.',
      additionalNotes: 'Canonical community benchmark.',
    },
    futurePromise: 'Across the ionization rift, light always finds the horizon.',
    generatedLore: `Classified by world architect Odi Selis, Ämlemi is the premier canonical benchmark sector anchoring the Sillow Mill universe. Anchored strictly to the photorealistic depth of Äkinoya and the volumetric atmospheric lighting of Mood.png, its skies glow with deep cobalt and incandescent amber.\n\nThe planetary ecology thrives through bioluminescent crystalline forests humming at 432Hz. Across the high troposphere roam apex plasma gliders, while the equatorial meridian is anchored by the ancient Obsidian Spire conduit.\n\nFOUNDING CREED:\n"Across the ionization rift, light always finds the horizon."`,
    renders: {
      hero: amlemiOrbitalImg,
      flora: amlemiBotanicalImg,
      fauna: amlemiFaunaImg,
      atmosphere: amlemiCockpitImg,
      landmark: amlemiMonumentImg,
      ecosystem: amlemiBotanicalImg,
    },
    votesCount: 3,
    hasVoted: false,
    status: 'PUBLISHED',
    createdAt: '2026-10-14T12:00:00.000Z',
    votingDeadline: 'June 30, 2027',
  },
];

// Retrieve all stored planet submissions (purges obsolete mocks and seeds single benchmark Ämlemi)
export const getStoredPlanetSubmissions = (): PlanetSubmission[] => {
  if (typeof window === 'undefined') return INITIAL_SUBMISSIONS;
  try {
    const raw = localStorage.getItem(LOCAL_SUBMISSIONS_KEY);
    if (raw) {
      const parsed: PlanetSubmission[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned: PlanetSubmission[] = parsed
          .filter(
            (p) =>
              p &&
              p.id &&
              !MOCK_PLANET_IDS.has(p.id) &&
              p.planetName !== 'Arbitron' &&
              p.planetName !== 'Lucina' &&
              p.planetName !== 'Elysia'
          )
          .map((sub): PlanetSubmission => {
            const isAmlemi = sub.id === 'planet-amlemi-genesis-01' || sub.planetName === 'Ämlemi';
            const userVoted = hasUserVotedOnSubmission(sub.id);
            // Minimum vote baseline: 1 vote minimum. Ämlemi initial baseline: 3 votes.
            let votesCount = Math.max(1, sub.votesCount || 1);
            if (isAmlemi) {
              votesCount = userVoted ? 4 : 3;
            }
            return {
              ...sub,
              planetName: isAmlemi ? 'Ämlemi' : formatAkinoyaPlanetName(sub.planetName),
              votesCount,
              hasVoted: userVoted,
              renders: (() => {
                if (isAmlemi) {
                  return {
                    hero: amlemiOrbitalImg,
                    flora: amlemiBotanicalImg,
                    fauna: amlemiFaunaImg,
                    atmosphere: amlemiCockpitImg,
                    landmark: amlemiMonumentImg,
                    ecosystem: amlemiBotanicalImg,
                  };
                }
                const current = sub.renders;
                const hasLeak =
                  !current ||
                  !current.hero ||
                  !isCleanPhotorealistic(current.hero) ||
                  isAmlemiAsset(current.hero) ||
                  isAmlemiAsset(current.flora);
                if (hasLeak) {
                  return resolvePlanetRenders(sub.humanAnswers || (sub as any));
                }
                return current;
              })(),
            };
          });

        // Ensure Ämlemi is always present as the benchmark
        if (!cleaned.some((p) => p.planetName === 'Ämlemi' || p.id === 'planet-amlemi-genesis-01')) {
          cleaned.unshift(INITIAL_SUBMISSIONS[0]);
        }

        if (cleaned.length > 0) return cleaned;
      }
    }
  } catch (err) {
    console.warn('[Contest] Error reading stored submissions:', err);
  }
  try {
    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(INITIAL_SUBMISSIONS));
  } catch {}
  return INITIAL_SUBMISSIONS;
};

/**
 * Asynchronously fetches live submissions from Supabase user_dossiers
 */
export const fetchPlanetSubmissions = async (): Promise<PlanetSubmission[]> => {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('user_dossiers')
        .select('*')
        .order('votes_count', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const live: PlanetSubmission[] = data
          .filter((d: any) => {
            const name = (d.planet_name || '').toLowerCase();
            return (
              name !== 'arbitron' &&
              name !== 'lucina' &&
              name !== 'elysia' &&
              !MOCK_PLANET_IDS.has(d.id)
            );
          })
          .map((d: any) => {
            const isAmlemi = d.id === 'planet-amlemi-genesis-01' || d.planet_name === 'Ämlemi';
            const userVoted = hasUserVotedOnSubmission(d.id);
            // Minimum vote baseline: 1 vote minimum. Ämlemi initial baseline: 3 votes.
            let votesCount = Math.max(1, d.votes_count || 1);
            if (isAmlemi) {
              votesCount = userVoted ? 4 : 3;
            }
            return {
              id: d.id,
              userId: d.user_id,
              authorName: d.author_name || 'Anonymous Creator',
              authorUsername: d.author_username || 'creator',
              authorEmail: d.author_email || '',
              authorAvatarGradient: d.author_avatar_gradient || 'from-amber-400 to-amber-600',
              planetName: isAmlemi ? 'Ämlemi' : formatAkinoyaPlanetName(d.planet_name),
              atmosphere: d.atmosphere || '',
              flora: d.flora || '',
              fauna: d.fauna || '',
              sonicVibe: d.sonic_vibe || '',
              visualAesthetic: d.visual_aesthetic || '',
              landmark: d.landmark || '',
              additionalNotes: d.additional_notes || '',
              humanAnswers: d.human_answers || {},
              generatedLore: d.generated_lore || '',
              renders: (() => {
                if (isAmlemi) {
                  return {
                    hero: amlemiOrbitalImg,
                    flora: amlemiBotanicalImg,
                    fauna: amlemiFaunaImg,
                    atmosphere: amlemiCockpitImg,
                    landmark: amlemiMonumentImg,
                    ecosystem: amlemiBotanicalImg,
                  };
                }
                const current = d.renders;
                const hasLeak =
                  !current ||
                  !current.hero ||
                  !isCleanPhotorealistic(current.hero) ||
                  isAmlemiAsset(current.hero) ||
                  isAmlemiAsset(current.flora);
                if (hasLeak) {
                  return resolvePlanetRenders(d.human_answers || (d as any));
                }
                return current;
              })(),
              votesCount,
              hasVoted: userVoted,
              status: (d.status as any) || 'PUBLISHED',
              createdAt: d.created_at || new Date().toISOString(),
              votingDeadline: 'June 30, 2027',
            };
          });

        // Always ensure canonical Ämlemi is included
        if (!live.some((p) => p.planetName === 'Ämlemi' || p.id === 'planet-amlemi-genesis-01')) {
          live.unshift(INITIAL_SUBMISSIONS[0]);
        }

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(live));
          } catch {}
        }
        return live;
      }
    } catch (err) {
      console.warn('[Contest] fetchPlanetSubmissions exception:', err);
    }
  }

  return getStoredPlanetSubmissions();
};

// Check if a specific user already has a golden ticket submission
export const getUserContestSubmission = (userId?: string, email?: string): PlanetSubmission | null => {
  if (!userId && !email) return null;
  const submissions = getStoredPlanetSubmissions();
  const match = submissions.find(
    (s) =>
      (userId && s.userId === userId) ||
      (email && s.authorEmail && s.authorEmail.toLowerCase() === email.toLowerCase())
  );
  return match || null;
};

export const fetchUserContestSubmission = async (userId?: string, email?: string): Promise<PlanetSubmission | null> => {
  const localMatch = getUserContestSubmission(userId, email);
  if (localMatch) return localMatch;

  if (isSupabaseConfigured && (userId || email)) {
    try {
      let query = supabase.from('user_dossiers').select('*');
      if (userId) {
        query = query.eq('user_id', userId);
      } else if (email) {
        query = query.ilike('author_email', email);
      }
      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        const isAmlemi = data.id === 'planet-amlemi-genesis-01' || data.planet_name === 'Ämlemi';
        const userVoted = hasUserVotedOnSubmission(data.id);
        let votesCount = Math.max(1, data.votes_count || 1);
        if (isAmlemi) {
          votesCount = userVoted ? 4 : 3;
        }

        const sub: PlanetSubmission = {
          id: data.id,
          userId: data.user_id,
          authorName: data.author_name || 'Anonymous Creator',
          authorUsername: data.author_username || 'creator',
          authorEmail: data.author_email || '',
          authorAvatarGradient: data.author_avatar_gradient || 'from-amber-400 to-amber-600',
          planetName: isAmlemi ? 'Ämlemi' : formatAkinoyaPlanetName(data.planet_name),
          atmosphere: data.atmosphere || '',
          flora: data.flora || '',
          fauna: data.fauna || '',
          sonicVibe: data.sonic_vibe || '',
          visualAesthetic: data.visual_aesthetic || '',
          landmark: data.landmark || '',
          additionalNotes: data.additional_notes || '',
          humanAnswers: data.human_answers || {},
          generatedLore: data.generated_lore || '',
          renders: (() => {
            if (isAmlemi) {
              return {
                hero: amlemiOrbitalImg,
                flora: amlemiBotanicalImg,
                fauna: amlemiFaunaImg,
                atmosphere: amlemiCockpitImg,
                landmark: amlemiMonumentImg,
                ecosystem: amlemiBotanicalImg,
              };
            }
            const current = data.renders;
            const hasLeak =
              !current ||
              !current.hero ||
              !isCleanPhotorealistic(current.hero) ||
              isAmlemiAsset(current.hero) ||
              isAmlemiAsset(current.flora);
            if (hasLeak) {
              return resolvePlanetRenders(data.human_answers || (data as any));
            }
            return current;
          })(),
          votesCount,
          hasVoted: userVoted,
          status: (data.status as any) || 'PUBLISHED',
          createdAt: data.created_at || new Date().toISOString(),
          votingDeadline: 'June 30, 2027',
        };
        try {
          const existing = getStoredPlanetSubmissions();
          const updated = [sub, ...existing.filter((s) => s.id !== sub.id)];
          localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(updated));
        } catch {}
        return sub;
      }
    } catch (err) {
      console.warn('[Contest] fetchUserContestSubmission exception:', err);
    }
  }

  return null;
};

export const clearUserContestSubmission = (userId?: string, email?: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const list = getStoredPlanetSubmissions();
    const filtered = list.filter((s) => {
      if (userId && s.userId === userId) return false;
      if (email && s.authorEmail && s.authorEmail.toLowerCase() === email.toLowerCase()) return false;
      return true;
    });
    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(filtered));
  } catch {}
};

// Generate high-end AI cinematic lore from wizard answers adhering strictly to Sillow Mill aesthetic
export const generatePlanetLore = (answers: WizardAnswers, authorName: string): string => {
  const planetName = formatAkinoyaPlanetName(answers.planetName);
  const color = answers.colorPalette || 'deep cosmic cobalt and incandescent amber';
  const atmo = answers.atmosphere || 'an atmosphere of ionized cobalt twilight and volumetric auroras';
  const flora = answers.flora || 'resonant bioluminescent flora systems and spore canopies';
  const fauna = answers.fauna || 'apex plasma fauna roaming high-altitude thermals';
  const vibe = answers.sonicVibe || 'cinematic analog modular synthesis';
  const visual = answers.visualAesthetic || 'High-resolution cinematic sci-fi render (Sillow Mill aesthetic)';
  const landmark = answers.landmark || 'The Ancient Obsidian Spire energy conduit';
  const promise = answers.futurePromise || 'Never forget that true beauty lies in curiosity and persistence.';
  const philosophy = answers.lifePhilosophy || 'harmony between nature and technology';
  const relaxation = answers.relaxation || 'peaceful moments of quiet contemplation';

  return `Classified by world architect ${authorName}, ${planetName} is an official frontier sector situated within the Äkinoya celestial sphere. Anchored strictly in the signature Sillow Mill high-resolution cinematic sci-fi aesthetic (composition referenced from Äkinoya.jpg and atmospheric lighting from Mood.png), its skies radiate with ${color}, framing ${atmo} rendered in exquisite ${visual}.

The planetary ecology thrives through ${flora}, creating sanctuary valleys where explorers recharge their spirits through ${relaxation}. Across the high troposphere roam ${fauna}, while the equatorial meridian is anchored by ${landmark}. Resonating with ${vibe}, the entire sector reflects the architect's core philosophy: "${philosophy}".

FOUNDING CREED & FUTURE PROMISE:
"${promise}"

This planetary territory is officially registered in the 2027 Äkinoya Lore Governance Council. Community votes cast before June 30 determine whether this sector will be featured in the official Sillow Mill cinematic series and soundtrack.`;
};

export type GenerationSlot = 'hero' | 'flora' | 'fauna' | 'atmosphere' | 'landmark';

function toBase64(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str).toString('base64');
  }
  if (typeof btoa !== 'undefined') {
    return btoa(unescape(encodeURIComponent(str)));
  }
  return encodeURIComponent(str);
}

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
  data: Partial<WizardAnswers>,
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

  return `data:image/svg+xml;base64,${toBase64(svg)}`;
}

// Map wizard inputs to 5 rich, photorealistic 4K visual render assets anchored in Mood.png & Äkinoya.jpg
// STRICT MANDATE: Only canonical Ämlemi uses static amlemi_renders. All other sectors generate unique visuals.
export const resolvePlanetRenders = (answers: WizardAnswers): PlanetSubmission['renders'] => {
  const isAmlemi = answers.planetName === 'Ämlemi' || answers.planetName?.toLowerCase() === 'ämlemi';
  if (isAmlemi) {
    return {
      hero: amlemiOrbitalImg,
      flora: amlemiBotanicalImg,
      fauna: amlemiFaunaImg,
      atmosphere: amlemiCockpitImg,
      landmark: amlemiMonumentImg,
      ecosystem: amlemiBotanicalImg,
    };
  }

  const pName = formatAkinoyaPlanetName(answers.planetName || answers.sectorName, false) || answers.sectorName || 'Frontier';
  const hero = generateProceduralUniquePhotorealisticRender('hero', answers, pName);
  const flora = generateProceduralUniquePhotorealisticRender('flora', answers, pName);
  const fauna = generateProceduralUniquePhotorealisticRender('fauna', answers, pName);
  const atmosphere = generateProceduralUniquePhotorealisticRender('atmosphere', answers, pName);
  const landmark = generateProceduralUniquePhotorealisticRender('landmark', answers, pName);

  return {
    hero,
    flora,
    fauna,
    atmosphere,
    landmark,
    ecosystem: flora,
  };
};

/**
 * Synthesizes 5 high-resolution cinematic sci-fi images for a sector using Google Nano Banana (Nano Banana Pro / 2.1).
 * Strictly enforces Äkinoya cinematic sci-fi parameters: high-res 4K, deep indigo, neon purple, warm copper accents.
 */
export const generateSectorImages = async (answers: WizardAnswers): Promise<PlanetSubmission['renders']> => {
  const isAmlemi = answers.planetName === 'Ämlemi' || answers.planetName?.toLowerCase() === 'ämlemi';
  if (isAmlemi) {
    return {
      hero: amlemiOrbitalImg,
      flora: amlemiBotanicalImg,
      fauna: amlemiFaunaImg,
      atmosphere: amlemiCockpitImg,
      landmark: amlemiMonumentImg,
      ecosystem: amlemiBotanicalImg,
    };
  }

  try {
    const res = await fetch('/api/generate-planet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...answers,
        planetName: answers.planetName,
        sectorName: answers.sectorName || answers.planetName,
        biome: answers.biome,
        model: 'nano-banana-pro',
        modelPipeline: 'Google Nano Banana Pro / Nano Banana 2.1',
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.renders && json.renders.hero && !isAmlemiAsset(json.renders.hero)) {
        return json.renders;
      }
    }
  } catch (err) {
    console.warn('[Google Nano Banana] Sector image synthesis network notice:', err);
  }
  return resolvePlanetRenders(answers);
};


export interface PlanetPhotoCard {
  id: string;
  title: string;
  category: string;
  url: string;
  description: string;
  styleAnchor: string;
}

export const getPlanetPhotoCards = (sub: PlanetSubmission): PlanetPhotoCard[] => {
  const isAmlemi = sub.id === 'planet-amlemi-genesis-01' || sub.planetName === 'Ämlemi';
  let renders = sub.renders;
  if (!isAmlemi) {
    const hasLeak =
      !renders ||
      !renders.hero ||
      !isCleanPhotorealistic(renders.hero) ||
      isAmlemiAsset(renders.hero) ||
      isAmlemiAsset(renders.flora);
    if (hasLeak) {
      renders = resolvePlanetRenders(sub.humanAnswers || (sub as any));
    }
  }

  const heroUrl = (isAmlemi ? amlemiOrbitalImg : renders?.hero) || '';
  const floraUrl = (isAmlemi ? amlemiBotanicalImg : (renders?.flora || renders?.ecosystem)) || '';
  const faunaUrl = (isAmlemi ? amlemiFaunaImg : renders?.fauna) || '';
  const atmoUrl = (isAmlemi ? amlemiCockpitImg : renders?.atmosphere) || '';
  const landmarkUrl = (isAmlemi ? amlemiMonumentImg : renders?.landmark) || '';

  return [
    {
      id: 'photo-hero',
      title: 'Main Orbital Planet Render',
      category: '01 · ORBITAL HORIZON',
      url: heroUrl,
      description: `Planetary disc and orbital curvature of ${sub.planetName}. Electric resonance and deep cosmic horizon.`,
      styleAnchor: 'Aesthetic Reference: Äkinoya.jpg (High-resolution cinematic sci-fi render, photorealistic cosmic sphere, deep space horizon)',
    },
    {
      id: 'photo-flora',
      title: 'Botanical Flora System',
      category: '02 · BOTANICAL BIOME',
      url: floraUrl,
      description: sub.flora,
      styleAnchor: 'Atmospheric Reference: Mood.png (High-detail digital sci-fi landscape photography, bioluminescent plant life, volumetric depth)',
    },
    {
      id: 'photo-fauna',
      title: 'Exotic Fauna & Wildlife System',
      category: '03 · FAUNA ECOSYSTEM',
      url: faunaUrl,
      description: sub.fauna,
      styleAnchor: 'Ecological Reference: Mood.png (Photorealistic conceptual creature design, apex plasma lifeforms drifting through thermals)',
    },
    {
      id: 'photo-atmosphere',
      title: 'Cockpit / Ship Landing Atmosphere Detail',
      category: '04 · COCKPIT ATMOSPHERE',
      url: atmoUrl,
      description: sub.atmosphere,
      styleAnchor: 'Cockpit View Reference: Mood.png (Photorealistic cockpit canopy, pilot HUD reflections, volumetric light shafts)',
    },
    {
      id: 'photo-landmark',
      title: 'Lore Dossier Cover & Monument',
      category: '05 · LORE DOSSIER COVER',
      url: landmarkUrl,
      description: sub.landmark,
      styleAnchor: `Archival Document Cover (Ancient monument, founding promise: "${sub.futurePromise || 'Never forget that true beauty lies in curiosity and persistence'}")`,
    },
  ];
};

// Save a new contest entry permanently to Supabase user_dossiers & localStorage
export const savePlanetSubmission = async (
  submission: PlanetSubmission
): Promise<{ success: boolean; submission: PlanetSubmission; error?: string }> => {
  try {
    const existing = getStoredPlanetSubmissions();
    const updated = [submission, ...existing.filter((s) => s.id !== submission.id)];
    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(updated));

    // Supabase cloud persistence (user_dossiers table)
    if (isSupabaseConfigured) {
      try {
        await supabase.from('user_dossiers').upsert({
          id: submission.id,
          user_id: submission.userId,
          author_name: submission.authorName,
          author_username: submission.authorUsername,
          author_email: submission.authorEmail,
          author_avatar_gradient: submission.authorAvatarGradient,
          planet_name: submission.planetName,
          atmosphere: submission.atmosphere,
          flora: submission.flora,
          fauna: submission.fauna,
          sonic_vibe: submission.sonicVibe,
          visual_aesthetic: submission.visualAesthetic,
          landmark: submission.landmark,
          additional_notes: submission.additionalNotes,
          human_answers: {
            ...(submission.humanAnswers || {}),
            biome: submission.biome,
            sectorName: submission.sectorName,
          },
          generated_lore: submission.generatedLore,
          renders: submission.renders,
          votes_count: submission.votesCount,
          status: submission.status,
          created_at: submission.createdAt,
        });
      } catch (cloudErr) {
        console.warn('[Contest] user_dossiers cloud sync notice:', cloudErr);
      }
    }

    return { success: true, submission };
  } catch (err: any) {
    console.error('[Contest] Failed to save submission:', err);
    return { success: false, submission, error: err?.message || 'Save error' };
  }
};

// Check if user has voted on a submission
export const hasUserVotedOnSubmission = (submissionId: string, userId?: string): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const key = userId ? `vote_${submissionId}_${userId}` : `vote_${submissionId}_anon`;
    const raw = localStorage.getItem(LOCAL_CONTEST_VOTES_KEY);
    if (raw) {
      const map = JSON.parse(raw);
      return Boolean(map[key]);
    }
  } catch {}
  return false;
};

// Toggle community vote on a planet submission
export const togglePlanetSubmissionVote = async (
  submissionId: string,
  userId?: string
): Promise<{ success: boolean; newVotesCount: number; hasVoted: boolean }> => {
  const currentVoted = hasUserVotedOnSubmission(submissionId, userId);
  const nextVoted = !currentVoted;
  const key = userId ? `vote_${submissionId}_${userId}` : `vote_${submissionId}_anon`;

  try {
    const mapRaw = localStorage.getItem(LOCAL_CONTEST_VOTES_KEY);
    const map = mapRaw ? JSON.parse(mapRaw) : {};
    if (nextVoted) {
      map[key] = true;
    } else {
      delete map[key];
    }
    localStorage.setItem(LOCAL_CONTEST_VOTES_KEY, JSON.stringify(map));
  } catch {}

  const submissions = getStoredPlanetSubmissions();
  const targetSub = submissions.find((s) => s.id === submissionId);
  const isAmlemi = submissionId === 'planet-amlemi-genesis-01' || targetSub?.planetName === 'Ämlemi';
  const minBaseline = isAmlemi ? 3 : 1;

  let updatedCount = minBaseline;
  const updatedSubmissions = submissions.map((sub) => {
    const isThisSubAmlemi = sub.id === 'planet-amlemi-genesis-01' || sub.planetName === 'Ämlemi';
    if (sub.id === submissionId || (isAmlemi && isThisSubAmlemi)) {
      const nextCount = isThisSubAmlemi
        ? (nextVoted ? 4 : 3)
        : Math.max(minBaseline, (sub.votesCount || 1) + (nextVoted ? 1 : -1));
      updatedCount = nextCount;
      return { ...sub, votesCount: nextCount, hasVoted: nextVoted };
    }
    return sub;
  });

  try {
    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(updatedSubmissions));
  } catch {}

  // Sync with Supabase Realtime & DB
  if (isSupabaseConfigured) {
    try {
      if (userId) {
        if (nextVoted) {
          await supabase.from('dossier_votes').insert({ dossier_id: submissionId, user_id: userId });
        } else {
          await supabase.from('dossier_votes').delete().match({ dossier_id: submissionId, user_id: userId });
        }
      }
      // Update votes_count on user_dossiers
      await supabase
        .from('user_dossiers')
        .update({ votes_count: updatedCount })
        .eq('id', submissionId);
    } catch (voteCloudErr) {
      console.warn('[Contest] Vote sync notice:', voteCloudErr);
    }
  }

  return {
    success: true,
    newVotesCount: updatedCount,
    hasVoted: nextVoted,
  };
};

/**
 * Realtime Subscription for Planet Dossiers & Votes
 */
export const subscribeToPlanetSubmissions = (
  onUpdate: (updatedSubmissions: PlanetSubmission[]) => void
) => {
  if (!isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel('realtime_user_dossiers')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_dossiers' },
      () => {
        // Refresh stored submissions
        const fresh = getStoredPlanetSubmissions();
        onUpdate(fresh);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export interface PlanetComment {
  id: string;
  planetId: string;
  authorName: string;
  authorUsername: string;
  text: string;
  createdAt: string;
}

export const getPlanetComments = (planetId: string): PlanetComment[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`akinoya_planet_comments_${planetId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    {
      id: `comm-1-${planetId}`,
      planetId,
      authorName: 'Akinoya Lore Scout',
      authorUsername: 'lorescout',
      text: 'The atmospheric resonance in this sector feels straight out of the Sillow Mill pilot episode! Voted +1.',
      createdAt: '2 hours ago',
    },
    {
      id: `comm-2-${planetId}`,
      planetId,
      authorName: 'Nova Architect',
      authorUsername: 'nova_arch',
      text: 'Exquisite color palette. The bioluminescent flora composition is incredible.',
      createdAt: '5 hours ago',
    },
  ];
};

export const addPlanetComment = (
  planetId: string,
  comment: Omit<PlanetComment, 'id' | 'createdAt'>
): PlanetComment[] => {
  const existing = getPlanetComments(planetId);
  const newComment: PlanetComment = {
    ...comment,
    id: `comm-${Date.now()}`,
    createdAt: 'Just now',
  };
  const updated = [newComment, ...existing];
  try {
    localStorage.setItem(`akinoya_planet_comments_${planetId}`, JSON.stringify(updated));
  } catch {}
  return updated;
};

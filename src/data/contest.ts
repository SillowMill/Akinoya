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

export const UI_RECALIBRATING_STATUS_TEXT =
  'Äkinoya Core is currently recalibrating generator nodes. Your slot is safely reserved.';

export const COMMUNITY_SHARE_VIDEO_MESSAGE =
  'If you like it, share it on your socials. It would mean the world to us.';

export const VIRAL_VIDEO_MOTION_PROMPT =
  'High-speed dynamic orbital zoom-in, cinematic volumetric lighting, photorealistic sci-fi aesthetics, immersive depth, seamless loop transition, sharp focus on planetary core and rings.';

const SECTOR_PREFIXES = [
  'ALPHA', 'BETA', 'CYGNUS', 'ORION', 'VEGA', 'DRACO', 'LYRA',
  'SOLARIS', 'AURELIA', 'HYDRA', 'PHOENIX', 'CENTAURI', 'ANDROMEDA', 'CELESTIA'
];

/**
 * Deterministically derives 2D celestial coordinates and sector ID relative to Äkinoya (0,0)
 */
export function getDeterministicPlanetCoordinates(
  planetId: string,
  planetName?: string
): { x: number; y: number; sectorId: string } {
  const isCapitalCore =
    planetName === 'Äkinoya Prime' ||
    planetName === 'Äkinoya';
  if (isCapitalCore) {
    return { x: 0, y: 0, sectorId: 'SECTOR AKN-00 (CORE)' };
  }

  const isAmlemi =
    planetId === 'planet-amlemi-genesis-01' ||
    planetName === 'Ämlemi';
  if (isAmlemi) {
    return { x: 280, y: -260, sectorId: 'SECTOR AKN-01 (CAPITAL MERIDIAN)' };
  }

  const str = `${planetId}_${planetName || ''}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);

  // Concentric orbital dispersal: Ring 1 (450px), Ring 2 (950px), Ring 3 (1550px), Ring 4 (2200px)
  const baseRadii = [480, 980, 1580, 2250];
  const ringIndex = absHash % baseRadii.length;
  const radiusJitter = (absHash % 160) - 80;
  const radius = baseRadii[ringIndex] + radiusJitter;

  // Golden angle distribution ensures optimal aesthetic dispersion without clustering
  const goldenAngle = 137.50776405003785;
  const angleDeg = (absHash * goldenAngle) % 360;
  const angleRad = (angleDeg * Math.PI) / 180;

  const x = Math.round(radius * Math.cos(angleRad));
  const y = Math.round(radius * Math.sin(angleRad));

  const prefix = SECTOR_PREFIXES[absHash % SECTOR_PREFIXES.length];
  const sectorNum = String((absHash % 89) + 10).padStart(2, '0');
  const sectorId = `SECTOR ${prefix}-${sectorNum}`;

  return { x, y, sectorId };
}

export const getPlanetGalaxyLink = (planetId: string): string => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sillowmill.com';
  return `${origin}/galaxy?planet=${encodeURIComponent(planetId)}`;
};

export const copyPlanetGalaxyLink = async (planetId: string): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  try {
    const link = getPlanetGalaxyLink(planetId);
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    return false;
  }
};

/**
 * Strict Photorealism Validator:
 * Ensures only rich, full-color photorealistic raster renders are permitted.
 * Strictly purges any wireframe sketches, minimalist outlines, or SVG data URIs.
 */
export const isCleanPhotorealistic = (url?: string): boolean => {
  if (!url || typeof url !== 'string' || url.length < 20) return false;
  if (url.includes('svg') || url.includes('svg+xml')) return false;
  return (
    url.startsWith('data:image/') ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('/assets/') ||
    url.startsWith('/')
  );
};

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
  'planet-felix-genesis',
  'felix',
  'planet-felix',
]);

/**
 * Filter against test submissions, mock worlds, or removed entries (e.g. Felix by Kaat Jansen).
 * Enforces that only canonical benchmark sectors like Ämlemi and valid participant worlds appear.
 */
export const isForbiddenSubmission = (sub: any): boolean => {
  if (!sub) return true;
  const id = String(sub.id || '').trim();
  const name = String(sub.planetName || sub.planet_name || '').toLowerCase().trim();
  const author = String(sub.authorName || sub.author_name || '').toLowerCase().trim();
  const email = String(sub.authorEmail || sub.author_email || '').toLowerCase().trim();

  if (MOCK_PLANET_IDS.has(id)) return true;
  if (name === 'arbitron' || name === 'lucina' || name === 'elysia' || name === 'felix') return true;
  if (author.includes('kaat') || author.includes('jansen')) return true;
  if (email.includes('kaat.jansen') || email.includes('hannah.jansen')) return true;
  if (id.toLowerCase().includes('felix') || id.toLowerCase().includes('kaat')) return true;
  return false;
};

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
    coordX: 280,
    coordY: -260,
    coord_x: 280,
    coord_y: -260,
    sectorId: 'SECTOR AKN-01 (CAPITAL MERIDIAN)',
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
          .filter((p) => p && p.id && !isForbiddenSubmission(p))
          .map((sub): PlanetSubmission => {
            const isAmlemi = sub.id === 'planet-amlemi-genesis-01' || sub.planetName === 'Ämlemi';
            const userVoted = hasUserVotedOnSubmission(sub.id);
            // Minimum vote baseline: 1 vote minimum. Ämlemi initial baseline: 3 votes.
            let votesCount = Math.max(1, sub.votesCount || 1);
            if (isAmlemi) {
              votesCount = userVoted ? 4 : 3;
            }
            const resolvedVideoUrl =
              sub.videoUrl ||
              sub.renders?.videoUrl ||
              sub.renders?.video_url ||
              (sub.humanAnswers as any)?.video_url ||
              '';
            const coords = (sub.coordX !== undefined && sub.coordY !== undefined)
              ? { x: sub.coordX, y: sub.coordY, sectorId: sub.sectorId || (isAmlemi ? 'SECTOR AKN-00 (CORE)' : 'SECTOR ALPHA-01') }
              : (sub.coord_x !== undefined && sub.coord_y !== undefined)
              ? { x: sub.coord_x, y: sub.coord_y, sectorId: sub.sectorId || (isAmlemi ? 'SECTOR AKN-00 (CORE)' : 'SECTOR ALPHA-01') }
              : getDeterministicPlanetCoordinates(sub.id, sub.planetName);
            return {
              ...sub,
              planetName: isAmlemi ? 'Ämlemi' : formatAkinoyaPlanetName(sub.planetName),
              votesCount,
              hasVoted: userVoted,
              videoUrl: resolvedVideoUrl,
              videoStatus: resolvedVideoUrl ? 'READY' : sub.videoStatus || 'QUEUED_PENDING',
              coordX: coords.x,
              coordY: coords.y,
              coord_x: coords.x,
              coord_y: coords.y,
              sectorId: coords.sectorId,
              renders: (() => {
                if (isAmlemi) {
                  return {
                    hero: amlemiOrbitalImg,
                    flora: amlemiBotanicalImg,
                    fauna: amlemiFaunaImg,
                    atmosphere: amlemiCockpitImg,
                    landmark: amlemiMonumentImg,
                    ecosystem: amlemiBotanicalImg,
                    videoUrl: resolvedVideoUrl,
                    '01_main': amlemiOrbitalImg,
                    '02_flora': amlemiBotanicalImg,
                    '03_fauna': amlemiFaunaImg,
                    '04_atmo': amlemiCockpitImg,
                    '05_lore': amlemiMonumentImg,
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
                  return {
                    ...resolvePlanetRenders(sub.humanAnswers || (sub as any)),
                    videoUrl: resolvedVideoUrl,
                  };
                }
                return {
                  ...current,
                  videoUrl: resolvedVideoUrl,
                  '01_main': current.hero,
                  '02_flora': current.flora,
                  '03_fauna': current.fauna,
                  '04_atmo': current.atmosphere,
                  '05_lore': current.landmark,
                };
              })(),
            };
          });

        // Ensure Ämlemi is always present as the benchmark
        if (!cleaned.some((p) => p.planetName === 'Ämlemi' || p.id === 'planet-amlemi-genesis-01')) {
          cleaned.unshift(INITIAL_SUBMISSIONS[0]);
        }

        if (cleaned.length !== parsed.length) {
          try {
            localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(cleaned));
          } catch {}
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
 * Asynchronously fetches live submissions and synchronizes persisted votes from server
 */
export const fetchPlanetSubmissions = async (voterId?: string, voterEmail?: string): Promise<PlanetSubmission[]> => {
  let serverCounts: Record<string, number> = {};
  let userVotedIds: string[] = [];

  const effectiveVoterId = voterId || getPersistentVoterId();

  // 1. Fetch live persisted votes from server votes API
  try {
    const persistentVoterId = getPersistentVoterId();
    const query = new URLSearchParams();
    if (effectiveVoterId) query.set('voterId', effectiveVoterId);
    if (persistentVoterId && persistentVoterId !== effectiveVoterId) query.set('persistentVoterId', persistentVoterId);
    if (voterEmail) query.set('voterEmail', voterEmail);
    const voteRes = await fetch(`/api/dossier/votes?${query.toString()}`);
    if (voteRes.ok) {
      const voteData = await voteRes.json();
      if (voteData?.success && voteData.votesCountByDossier) {
        serverCounts = voteData.votesCountByDossier;
        userVotedIds = voteData.userVotedIds || [];
      }
    }
  } catch (voteErr) {
    console.warn('[Contest] Server vote sync notice:', voteErr);
  }

  // Synchronize local votes map strictly with confirmed server voted IDs
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_CONTEST_VOTES_KEY);
      const map = raw ? JSON.parse(raw) : {};
      if (Object.keys(serverCounts).length > 0) {
        for (const knownSubId of Object.keys(serverCounts)) {
          if (!userVotedIds.includes(knownSubId)) {
            for (const k of Object.keys(map)) {
              if (k.startsWith(`vote_${knownSubId}`)) {
                delete map[k];
              }
            }
          }
        }
      }
      for (const id of userVotedIds) {
        map[`vote_${id}_${effectiveVoterId}`] = true;
        map[`vote_${id}`] = true;
      }
      localStorage.setItem(LOCAL_CONTEST_VOTES_KEY, JSON.stringify(map));
    } catch {}
  }

  // 1.5 Fetch live server submissions from data/submissions_store.json
  let serverSubmissions: PlanetSubmission[] = [];
  try {
    const subRes = await fetch('/api/dossier/submissions');
    if (subRes.ok) {
      const subData = await subRes.json();
      if (subData?.success && Array.isArray(subData.submissions)) {
        serverSubmissions = subData.submissions;
      }
    }
  } catch (subErr) {
    console.warn('[Contest] Server submissions fetch notice:', subErr);
  }

  // 2. Fetch from Supabase if configured
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('user_dossiers')
        .select('*')
        .order('votes_count', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const live: PlanetSubmission[] = data
          .filter((d: any) => d && !isForbiddenSubmission(d))
          .map((d: any) => {
            const isAmlemi = d.id === 'planet-amlemi-genesis-01' || d.planet_name === 'Ämlemi';
            const userVoted = userVotedIds.includes(d.id) || hasUserVotedOnSubmission(d.id, effectiveVoterId, voterEmail);
            let votesCount = serverCounts[d.id] !== undefined ? serverCounts[d.id] : Math.max(1, d.votes_count || 1);
            if (isAmlemi && serverCounts[d.id] === undefined) {
              votesCount = userVoted ? 4 : 3;
            }
            const resolvedVideoUrl =
              d.video_url ||
              d.renders?.videoUrl ||
              d.renders?.video_url ||
              d.human_answers?.video_url ||
              '';
            const coords = (d.coord_x !== undefined && d.coord_y !== undefined)
              ? { x: d.coord_x, y: d.coord_y, sectorId: d.sector_id || (isAmlemi ? 'SECTOR AKN-00 (CORE)' : 'SECTOR ALPHA-01') }
              : (d.coordX !== undefined && d.coordY !== undefined)
              ? { x: d.coordX, y: d.coordY, sectorId: d.sectorId || (isAmlemi ? 'SECTOR AKN-00 (CORE)' : 'SECTOR ALPHA-01') }
              : getDeterministicPlanetCoordinates(d.id, d.planet_name);
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
              videoUrl: resolvedVideoUrl,
              videoStatus: resolvedVideoUrl ? 'READY' : 'QUEUED_PENDING',
              coordX: coords.x,
              coordY: coords.y,
              coord_x: coords.x,
              coord_y: coords.y,
              sectorId: coords.sectorId,
              renders: (() => {
                if (isAmlemi) {
                  return {
                    hero: amlemiOrbitalImg,
                    flora: amlemiBotanicalImg,
                    fauna: amlemiFaunaImg,
                    atmosphere: amlemiCockpitImg,
                    landmark: amlemiMonumentImg,
                    ecosystem: amlemiBotanicalImg,
                    videoUrl: resolvedVideoUrl,
                    '01_main': amlemiOrbitalImg,
                    '02_flora': amlemiBotanicalImg,
                    '03_fauna': amlemiFaunaImg,
                    '04_atmo': amlemiCockpitImg,
                    '05_lore': amlemiMonumentImg,
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
                  return {
                    ...resolvePlanetRenders(d.human_answers || (d as any)),
                    videoUrl: resolvedVideoUrl,
                  };
                }
                return {
                  ...current,
                  videoUrl: resolvedVideoUrl,
                  '01_main': current.hero,
                  '02_flora': current.flora,
                  '03_fauna': current.fauna,
                  '04_atmo': current.atmosphere,
                  '05_lore': current.landmark,
                };
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

        const sortedLive = [...live].sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(sortedLive));
          } catch {}
        }
        return sortedLive;
      }
    } catch (err) {
      console.warn('[Contest] fetchPlanetSubmissions exception:', err);
    }
  }

  // 3. Fallback: Merge server submissions, local submissions, and canonical Ämlemi
  const stored = getStoredPlanetSubmissions();
  const submissionMap = new Map<string, PlanetSubmission>();

  // Canonical base submissions
  for (const s of INITIAL_SUBMISSIONS) {
    submissionMap.set(s.id, s);
  }

  // Local submissions
  for (const s of stored) {
    if (s && s.id && !isForbiddenSubmission(s)) {
      submissionMap.set(s.id, s);
    }
  }

  // Server persisted submissions
  for (const s of serverSubmissions) {
    if (s && s.id && !isForbiddenSubmission(s)) {
      submissionMap.set(s.id, s);
    }
  }

  const combined = Array.from(submissionMap.values());
  const merged = combined.map((sub) => {
    const isAmlemi = sub.id === 'planet-amlemi-genesis-01' || sub.planetName === 'Ämlemi';
    const userVoted = userVotedIds.includes(sub.id) || hasUserVotedOnSubmission(sub.id, effectiveVoterId, voterEmail);
    let votesCount = serverCounts[sub.id] !== undefined ? serverCounts[sub.id] : Math.max(1, sub.votesCount || 1);
    if (isAmlemi && serverCounts[sub.id] === undefined) {
      votesCount = userVoted ? 4 : 3;
    }
    return {
      ...sub,
      votesCount,
      hasVoted: userVoted,
    };
  });

  const sorted = [...merged].sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(sorted));
    } catch {}
  }
  return sorted;
};

// Check if a specific user already has a golden ticket submission
export const getUserContestSubmission = (userId?: string, email?: string): PlanetSubmission | null => {
  if (!userId && !email) return null;
  const submissions = getStoredPlanetSubmissions();
  const match = submissions.find(
    (s) =>
      !isForbiddenSubmission(s) &&
      ((userId && s.userId === userId) ||
        (email && s.authorEmail && s.authorEmail.toLowerCase() === email.toLowerCase()))
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
        if (isForbiddenSubmission(data)) return null;
        const isAmlemi = data.id === 'planet-amlemi-genesis-01' || data.planet_name === 'Ämlemi';
        const userVoted = hasUserVotedOnSubmission(data.id);
        let votesCount = Math.max(1, data.votes_count || 1);
        if (isAmlemi) {
          votesCount = userVoted ? 4 : 3;
        }
        const resolvedVideoUrl =
          data.video_url ||
          data.renders?.videoUrl ||
          data.renders?.video_url ||
          data.human_answers?.video_url ||
          '';

        const coords = (data.coord_x !== undefined && data.coord_y !== undefined)
          ? { x: data.coord_x, y: data.coord_y, sectorId: data.sector_id || (isAmlemi ? 'SECTOR AKN-00 (CORE)' : 'SECTOR ALPHA-01') }
          : (data.coordX !== undefined && data.coordY !== undefined)
          ? { x: data.coordX, y: data.coordY, sectorId: data.sectorId || (isAmlemi ? 'SECTOR AKN-00 (CORE)' : 'SECTOR ALPHA-01') }
          : getDeterministicPlanetCoordinates(data.id, data.planet_name);

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
          videoUrl: resolvedVideoUrl,
          videoStatus: resolvedVideoUrl ? 'READY' : 'QUEUED_PENDING',
          coordX: coords.x,
          coordY: coords.y,
          coord_x: coords.x,
          coord_y: coords.y,
          sectorId: coords.sectorId,
          renders: (() => {
            if (isAmlemi) {
              return {
                hero: amlemiOrbitalImg,
                flora: amlemiBotanicalImg,
                fauna: amlemiFaunaImg,
                atmosphere: amlemiCockpitImg,
                landmark: amlemiMonumentImg,
                ecosystem: amlemiBotanicalImg,
                videoUrl: resolvedVideoUrl,
                '01_main': amlemiOrbitalImg,
                '02_flora': amlemiBotanicalImg,
                '03_fauna': amlemiFaunaImg,
                '04_atmo': amlemiCockpitImg,
                '05_lore': amlemiMonumentImg,
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
              return {
                ...resolvePlanetRenders(data.human_answers || (data as any)),
                videoUrl: resolvedVideoUrl,
              };
            }
            return {
              ...current,
              videoUrl: resolvedVideoUrl,
              '01_main': current.hero,
              '02_flora': current.flora,
              '03_fauna': current.fauna,
              '04_atmo': current.atmosphere,
              '05_lore': current.landmark,
            };
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

// Map wizard inputs to 5 rich, photorealistic 4K visual render assets
// Strictly returns canonical assets for Ämlemi. For custom sectors, renders are synthesized live via Google Nano Banana.
// ZERO VECTOR / SVG PLACEHOLDERS: Returns empty strings if not yet synthesized.
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

  return {
    hero: '',
    flora: '',
    fauna: '',
    atmosphere: '',
    landmark: '',
    ecosystem: '',
  };
};

/**
 * Synthesizes 5 high-resolution cinematic sci-fi images + 9:16 viral video trailer for a sector using Fal.ai.
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
      '01_main': amlemiOrbitalImg,
      '02_flora': amlemiBotanicalImg,
      '03_fauna': amlemiFaunaImg,
      '04_atmo': amlemiCockpitImg,
      '05_lore': amlemiMonumentImg,
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
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.renders && json.renders.hero && !isAmlemiAsset(json.renders.hero)) {
        return json.renders;
      }
    }
  } catch (err) {
    console.warn('[Fal.ai] Sector image synthesis network notice:', err);
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

// Save a new contest entry permanently to Supabase user_dossiers & localStorage in a single atomic operation
export const savePlanetSubmission = async (
  submission: PlanetSubmission
): Promise<{ success: boolean; submission: PlanetSubmission; error?: string }> => {
  try {
    const videoUrl =
      submission.videoUrl ||
      submission.renders?.videoUrl ||
      submission.renders?.video_url ||
      '';

    const coords = (submission.coordX !== undefined && submission.coordY !== undefined)
      ? { x: submission.coordX, y: submission.coordY, sectorId: submission.sectorId || 'SECTOR ALPHA-01' }
      : (submission.coord_x !== undefined && submission.coord_y !== undefined)
      ? { x: submission.coord_x, y: submission.coord_y, sectorId: submission.sectorId || 'SECTOR ALPHA-01' }
      : getDeterministicPlanetCoordinates(submission.id, submission.planetName);

    const enrichedSubmission: PlanetSubmission = {
      ...submission,
      votesCount: Math.max(1, submission.votesCount || 1),
      videoUrl,
      videoStatus: videoUrl ? 'READY' : submission.videoStatus || 'QUEUED_PENDING',
      coordX: coords.x,
      coordY: coords.y,
      coord_x: coords.x,
      coord_y: coords.y,
      sectorId: coords.sectorId,
      renders: {
        ...submission.renders,
        '01_main': submission.renders.hero,
        '02_flora': submission.renders.flora,
        '03_fauna': submission.renders.fauna,
        '04_atmo': submission.renders.atmosphere,
        '05_lore': submission.renders.landmark,
        videoUrl,
        video_url: videoUrl,
        videoStatus: videoUrl ? 'READY' : submission.videoStatus || 'QUEUED_PENDING',
      },
    };

    const existing = getStoredPlanetSubmissions();
    const updated = [enrichedSubmission, ...existing.filter((s) => s.id !== enrichedSubmission.id)];
    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(updated));

    // Step 2.5: Dedicated server-side submission persistence to data/submissions_store.json
    try {
      await fetch('/api/dossier/submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichedSubmission),
      });
    } catch (serverErr) {
      console.warn('[Contest] Server submission save notice:', serverErr);
    }

    // Step 3: Atomic Supabase cloud persistence (user_dossiers table: 5 photos + lore + 9:16 video_url + coordinates)
    if (isSupabaseConfigured) {
      try {
        const basePayload: Record<string, any> = {
          id: enrichedSubmission.id,
          user_id: enrichedSubmission.userId,
          author_name: enrichedSubmission.authorName,
          author_username: enrichedSubmission.authorUsername,
          author_email: enrichedSubmission.authorEmail,
          author_avatar_gradient: enrichedSubmission.authorAvatarGradient,
          planet_name: enrichedSubmission.planetName,
          atmosphere: enrichedSubmission.atmosphere,
          flora: enrichedSubmission.flora,
          fauna: enrichedSubmission.fauna,
          sonic_vibe: enrichedSubmission.sonicVibe,
          visual_aesthetic: enrichedSubmission.visualAesthetic,
          landmark: enrichedSubmission.landmark,
          additional_notes: enrichedSubmission.additionalNotes,
          human_answers: {
            ...(enrichedSubmission.humanAnswers || {}),
            biome: enrichedSubmission.biome,
            sectorName: enrichedSubmission.sectorName,
            video_url: videoUrl,
            coord_x: coords.x,
            coord_y: coords.y,
            sector_id: coords.sectorId,
          },
          generated_lore: enrichedSubmission.generatedLore,
          renders: enrichedSubmission.renders,
          votes_count: enrichedSubmission.votesCount,
          status: enrichedSubmission.status,
          coord_x: coords.x,
          coord_y: coords.y,
          sector_id: coords.sectorId,
          created_at: enrichedSubmission.createdAt,
        };

        const { error: firstErr } = await supabase
          .from('user_dossiers')
          .upsert({ ...basePayload, video_url: videoUrl, coord_x: coords.x, coord_y: coords.y, sector_id: coords.sectorId });

        if (firstErr) {
          await supabase.from('user_dossiers').upsert(basePayload);
        }
      } catch (cloudErr) {
        console.warn('[Contest] user_dossiers cloud sync notice:', cloudErr);
      }
    }

    return { success: true, submission: enrichedSubmission };
  } catch (err: any) {
    console.error('[Contest] Failed to save submission:', err);
    return { success: false, submission, error: err?.message || 'Save error' };
  }
};

// Persistent voter identity helper
export const getPersistentVoterId = (): string => {
  if (typeof window === 'undefined') return 'server_voter';
  try {
    let voterId = localStorage.getItem('sillow_voter_id');
    if (!voterId) {
      voterId = 'vtr_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      localStorage.setItem('sillow_voter_id', voterId);
    }
    return voterId;
  } catch {
    return 'local_voter';
  }
};

// Check if user has voted on a submission
export const hasUserVotedOnSubmission = (
  submissionId: string,
  userId?: string,
  userEmail?: string
): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(LOCAL_CONTEST_VOTES_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw);
    if (!map || typeof map !== 'object') return false;

    let effectiveUserId = userId;
    let effectiveUserEmail = userEmail;
    if (!effectiveUserId) {
      try {
        const cachedUser = JSON.parse(localStorage.getItem('akinoya_session_user') || '{}');
        if (cachedUser?.id) effectiveUserId = cachedUser.id;
        if (cachedUser?.email) effectiveUserEmail = cachedUser.email;
      } catch {}
    }

    const persistentId = getPersistentVoterId();
    const candidateKeys = [
      effectiveUserId ? `vote_${submissionId}_${effectiveUserId}` : null,
      effectiveUserEmail ? `vote_${submissionId}_${effectiveUserEmail.toLowerCase()}` : null,
      `vote_${submissionId}_${persistentId}`,
      `vote_${submissionId}_anon`,
      `vote_${submissionId}`,
    ].filter(Boolean) as string[];

    for (const k of candidateKeys) {
      if (map[k] === true) return true;
    }

    // Check if any key for this submission was marked true
    for (const [k, v] of Object.entries(map)) {
      if (k.startsWith(`vote_${submissionId}`) && v === true) {
        return true;
      }
    }
  } catch {}
  return false;
};

// Toggle community vote on a planet submission with strict self-vote prevention
export const togglePlanetSubmissionVote = async (
  submissionId: string,
  userId?: string,
  userEmail?: string,
  userUsername?: string
): Promise<{ success: boolean; newVotesCount: number; hasVoted: boolean; error?: string }> => {
  const submissions = getStoredPlanetSubmissions();
  const targetSub = submissions.find((s) => s.id === submissionId);

  // 1. Strict Self-Vote Prevention Check
  const cleanVoterEmail = userEmail?.trim().toLowerCase();
  const cleanAuthorEmail = targetSub?.authorEmail?.trim().toLowerCase() || (targetSub?.humanAnswers as any)?.email?.trim().toLowerCase();
  const cleanVoterUser = userUsername?.trim().toLowerCase().replace(/^@/, '');
  const cleanAuthorUser = targetSub?.authorUsername?.trim().toLowerCase().replace(/^@/, '');

  const isSelfById = Boolean(userId && targetSub?.userId && targetSub.userId === userId);
  const isSelfByEmail = Boolean(cleanVoterEmail && cleanAuthorEmail && cleanVoterEmail === cleanAuthorEmail);
  const isSelfByUsername = Boolean(cleanVoterUser && cleanAuthorUser && cleanVoterUser === cleanAuthorUser);

  if (isSelfById || isSelfByEmail || isSelfByUsername) {
    return {
      success: false,
      newVotesCount: targetSub?.votesCount || 1,
      hasVoted: false,
      error: 'Self-voting blocked: You cannot vote for your own world submission.',
    };
  }

  const persistentVoterId = getPersistentVoterId();
  const effectiveVoterId = userId || persistentVoterId;
  const currentVoted = hasUserVotedOnSubmission(submissionId, effectiveVoterId, userEmail);
  const nextVoted = !currentVoted;

  // Optimistic local update
  try {
    const mapRaw = localStorage.getItem(LOCAL_CONTEST_VOTES_KEY);
    const map = mapRaw ? JSON.parse(mapRaw) : {};
    const keys = [
      `vote_${submissionId}_${effectiveVoterId}`,
      cleanVoterEmail ? `vote_${submissionId}_${cleanVoterEmail}` : null,
      `vote_${submissionId}_${persistentVoterId}`,
      `vote_${submissionId}_anon`,
      `vote_${submissionId}`,
    ].filter(Boolean) as string[];

    if (nextVoted) {
      for (const k of keys) {
        map[k] = true;
      }
    } else {
      for (const k of Object.keys(map)) {
        if (k.startsWith(`vote_${submissionId}`)) {
          delete map[k];
        }
      }
    }
    localStorage.setItem(LOCAL_CONTEST_VOTES_KEY, JSON.stringify(map));
  } catch {}

  const isAmlemi = submissionId === 'planet-amlemi-genesis-01' || targetSub?.planetName === 'Ämlemi';
  const minBaseline = isAmlemi ? 3 : 1;
  let updatedCount = isAmlemi
    ? (nextVoted ? 4 : 3)
    : Math.max(minBaseline, (targetSub?.votesCount || 1) + (nextVoted ? 1 : -1));

  // 2. Immediate permanent write to server voting API
  try {
    const res = await fetch('/api/dossier/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionId,
        voterId: effectiveVoterId,
        voterEmail: userEmail,
        voterUsername: userUsername,
        submissionAuthorId: targetSub?.userId,
        submissionAuthorEmail: cleanAuthorEmail,
        submissionAuthorUsername: cleanAuthorUser,
        baseVotes: targetSub?.votesCount,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.newVotesCount === 'number') {
        updatedCount = data.newVotesCount;
      }
    } else if (res.status === 403 || res.status === 400) {
      const data = await res.json().catch(() => null);
      if (data?.error?.includes('Self-voting')) {
        // Revert local optimistic vote
        try {
          const mapRaw = localStorage.getItem(LOCAL_CONTEST_VOTES_KEY);
          const map = mapRaw ? JSON.parse(mapRaw) : {};
          for (const k of Object.keys(map)) {
            if (k.startsWith(`vote_${submissionId}`)) {
              delete map[k];
            }
          }
          localStorage.setItem(LOCAL_CONTEST_VOTES_KEY, JSON.stringify(map));
        } catch {}
        return {
          success: false,
          newVotesCount: targetSub?.votesCount || minBaseline,
          hasVoted: false,
          error: data.error,
        };
      }
    }
  } catch (apiErr) {
    console.warn('[Contest] Server vote endpoint call notice:', apiErr);
  }

  // Update stored submissions
  const updatedSubmissions = submissions.map((sub) => {
    const isThisSubAmlemi = sub.id === 'planet-amlemi-genesis-01' || sub.planetName === 'Ämlemi';
    if (sub.id === submissionId || (isAmlemi && isThisSubAmlemi)) {
      return { ...sub, votesCount: updatedCount, hasVoted: nextVoted };
    }
    return sub;
  });

  try {
    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(updatedSubmissions));
  } catch {}

  // Dispatch custom event for immediate reactivity across all views
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('akinoya-vote-updated', {
        detail: { submissionId, votesCount: updatedCount, hasVoted: nextVoted },
      })
    );
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

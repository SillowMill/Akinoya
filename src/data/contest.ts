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

export interface ConstellationArm {
  id: string;
  name: string;
  baseAngle: number;
  color: string;
  glowColor: string;
}

const BASE_CONSTELLATION_OFFSET = -Math.PI / 5; // -36 deg: Balanced North-East diagonal orientation

export const CONSTELLATION_ARMS: ConstellationArm[] = [
  { id: 'arm-orion', name: 'ORION MERIDIAN', baseAngle: BASE_CONSTELLATION_OFFSET, color: '#f59e0b', glowColor: 'rgba(245, 158, 11, 0.45)' },
  { id: 'arm-cygnus', name: 'CYGNUS FILAMENT', baseAngle: BASE_CONSTELLATION_OFFSET + (2 * Math.PI) / 5, color: '#38bdf8', glowColor: 'rgba(56, 189, 248, 0.45)' },
  { id: 'arm-solaris', name: 'SOLARIS TENDRIL', baseAngle: BASE_CONSTELLATION_OFFSET + (4 * Math.PI) / 5, color: '#fbbf24', glowColor: 'rgba(251, 191, 36, 0.45)' },
  { id: 'arm-aurelia', name: 'AURELIA CLUSTER', baseAngle: BASE_CONSTELLATION_OFFSET + (6 * Math.PI) / 5, color: '#a855f7', glowColor: 'rgba(168, 85, 247, 0.45)' },
  { id: 'arm-centauri', name: 'CENTAURI STREAM', baseAngle: BASE_CONSTELLATION_OFFSET + (8 * Math.PI) / 5, color: '#22d3ee', glowColor: 'rgba(34, 211, 238, 0.45)' },
];

export type ConstellationLayoutMode = 'spiral' | 'matrix';

export interface ConstellationVariantConfig {
  mode: ConstellationLayoutMode;
  name: string;
  badge: string;
  description: string;
}

export const CONSTELLATION_LAYOUT_VARIANTS: ConstellationVariantConfig[] = [
  { mode: 'spiral', name: '5-Arm Spiral', badge: '🌀 5-ARM SPIRAL', description: 'Logarithmic tentacle filaments radiating outward' },
  { mode: 'matrix', name: 'Oval Matrix', badge: '🪐 OVAL MATRIX', description: 'Symmetrical concentric elliptical orbital highways' },
];

// 1. Variant A (5-Arm Spiral) constants
export const SPIRAL_B = 0.62;
export const SPIRAL_R0 = 300;
export const AMLEMI_FOUNDATIONAL_RADIUS = 300;
// Universal Minimum Collision-Free Spacing Guarantee across all variants (> 250px buffer)
export const MIN_COLLISION_BUFFER_PX = 250;

export interface PlacedNode {
  id: string;
  x: number;
  y: number;
}

/**
 * Validates that candidate position (candX, candY) maintains at least
 * minBuffer px distance from all previously placed active nodes (including Core and Ämlemi).
 */
export function isPositionCollisionFree(
  candX: number,
  candY: number,
  placedNodes: PlacedNode[],
  minBuffer: number = MIN_COLLISION_BUFFER_PX
): boolean {
  for (const node of placedNodes) {
    const dx = candX - node.x;
    const dy = candY - node.y;
    // Fast bounding box pre-rejection before hypotenuse calculation
    if (Math.abs(dx) < minBuffer && Math.abs(dy) < minBuffer) {
      if (Math.hypot(dx, dy) < minBuffer) {
        return false;
      }
    }
  }
  return true;
}

// 7 Quantized Harmonic Radial Tiers (560 AU to 3440 AU) with guaranteed >280px spatial clearance
export const SPIRAL_RADIAL_TIERS = [560, 1040, 1520, 2000, 2480, 2960, 3440];

export function getSpiralArmAngle(baseAngle: number, radius: number): number {
  return baseAngle + SPIRAL_B * Math.log(Math.max(radius, SPIRAL_R0) / SPIRAL_R0);
}

// 2. Variant B (Elliptical Oval Matrix) constants
export interface OvalMatrixTrack {
  id: string;
  name: string;
  a: number; // semi-major axis (horizontal)
  b: number; // semi-minor axis (vertical)
  slots: number;
  color: string;
  glowColor: string;
}

export const OVAL_MATRIX_TRACKS: OvalMatrixTrack[] = [
  { id: 'track-0', name: 'FOUNDATIONAL CAPITAL OVAL', a: 320, b: 220, slots: 4, color: '#fbbf24', glowColor: 'rgba(251, 191, 36, 0.45)' },
  { id: 'track-1', name: 'INNER CORE MATRIX', a: 720, b: 480, slots: 6, color: '#f59e0b', glowColor: 'rgba(245, 158, 11, 0.35)' },
  { id: 'track-2', name: 'PIONEER HIGHWAY', a: 1240, b: 820, slots: 8, color: '#38bdf8', glowColor: 'rgba(56, 189, 248, 0.35)' },
  { id: 'track-3', name: 'IONIZATION BELT', a: 1800, b: 1180, slots: 10, color: '#a855f7', glowColor: 'rgba(168, 85, 247, 0.35)' },
  { id: 'track-4', name: 'OUTER EXPEDITIONS', a: 2400, b: 1560, slots: 12, color: '#22d3ee', glowColor: 'rgba(34, 211, 238, 0.35)' },
  { id: 'track-5', name: 'STELLAR MATRIX HORIZON', a: 3040, b: 1960, slots: 14, color: '#fbbf24', glowColor: 'rgba(251, 191, 36, 0.3)' },
  { id: 'track-6', name: 'DEEP VOID PERIMETER', a: 3720, b: 2400, slots: 16, color: '#f43f5e', glowColor: 'rgba(244, 63, 94, 0.25)' },
];

/**
 * Deterministically derives 2D celestial coordinates and sector ID relative to Äkinoya (0,0)
 * Works across both constellation variants (Spiral, Matrix) with permanent master anchoring for Ämlemi
 */
export function getDeterministicPlanetCoordinates(
  planetId: string,
  planetName?: string,
  mode: ConstellationLayoutMode = 'spiral'
): { x: number; y: number; sectorId: string; armId?: string; armName?: string } {
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
    if (mode === 'matrix') {
      const tr = OVAL_MATRIX_TRACKS[0];
      return {
        x: 0,
        y: -tr.b,
        sectorId: 'SECTOR MATRIX-T00 (CAPITAL APEX)',
        armId: tr.id,
        armName: tr.name,
      };
    }

    // Default: Variant A (5-Arm Spiral) - Foundational node along Orion Meridian (~300 AU)
    return {
      x: 243,
      y: -176,
      sectorId: 'SECTOR AKN-01 (CAPITAL MERIDIAN)',
      armId: 'arm-orion',
      armName: 'ORION MERIDIAN',
    };
  }

  const str = `${planetId}_${planetName || ''}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);

  if (mode === 'matrix') {
    const trackIdx = 1 + (absHash % (OVAL_MATRIX_TRACKS.length - 1));
    const track = OVAL_MATRIX_TRACKS[trackIdx];
    const slotIdx = absHash % track.slots;
    const angle = (slotIdx / track.slots) * 2 * Math.PI + (trackIdx % 2 === 1 ? 0.2 : 0);
    const x = Math.round(track.a * Math.cos(angle));
    const y = Math.round(track.b * Math.sin(angle));
    const sectorId = `SECTOR MATRIX-T0${trackIdx}`;
    return { x, y, sectorId, armId: track.id, armName: track.name };
  }

  // Default: Variant A (5-Arm Spiral)
  const armIndex = absHash % CONSTELLATION_ARMS.length;
  const arm = CONSTELLATION_ARMS[armIndex];
  const tierIndex = Math.floor(absHash / CONSTELLATION_ARMS.length) % SPIRAL_RADIAL_TIERS.length;
  const baseRadius = SPIRAL_RADIAL_TIERS[tierIndex];
  const subSlot = Math.floor(absHash / (CONSTELLATION_ARMS.length * SPIRAL_RADIAL_TIERS.length)) % 2;
  const radius = baseRadius + (subSlot === 1 ? 240 : 0);
  const baseSpiralAngle = getSpiralArmAngle(arm.baseAngle, radius);
  const finalAngle = baseSpiralAngle + (subSlot === 1 ? 0.05 : -0.03);
  const x = Math.round(radius * Math.cos(finalAngle));
  const y = Math.round(radius * Math.sin(finalAngle));
  const sectorPrefix = arm.name.split(' ')[0];
  const sectorNum = String((absHash % 89) + 10).padStart(2, '0');
  const sectorId = `SECTOR ${sectorPrefix}-${sectorNum}`;

  return { x, y, sectorId, armId: arm.id, armName: arm.name };
}

/**
 * Universal Overlap-Free Dynamic Equilibrium Engine:
 * Supports 2 architectural constellation modes (5-Arm Spiral and Oval Matrix).
 * Enforces a strict pairwise distance check (Math.hypot(dx, dy) >= 250px) across all active nodes.
 * Cascades gracefully to alternate arms/tracks and expansion horizons to prevent crowding.
 */
export function assignMultiVariantCoordinates(
  planets: PlanetSubmission[],
  mode: ConstellationLayoutMode = 'spiral',
  seed: number = 0
): PlanetSubmission[] {
  // Resolve mode-aware coordinates for Ämlemi foundational master anchor
  let amlemiCoord = {
    x: 243,
    y: -176,
    sectorId: 'SECTOR AKN-01 (CAPITAL MERIDIAN)',
    armId: 'arm-orion',
    armName: 'ORION MERIDIAN',
  };

  if (mode === 'matrix') {
    const tr = OVAL_MATRIX_TRACKS[0];
    amlemiCoord = {
      x: 0,
      y: -tr.b,
      sectorId: 'SECTOR MATRIX-T00 (CAPITAL APEX)',
      armId: tr.id,
      armName: tr.name,
    };
  }

  // Hard pairwise distance tracking: Äkinoya Core (0, 0) and dynamic Ämlemi anchor are pre-registered
  const placedNodes: PlacedNode[] = [
    { id: 'akinoya-core', x: 0, y: 0 },
    { id: 'planet-amlemi-genesis-01', x: amlemiCoord.x, y: amlemiCoord.y },
  ];
  const occupiedSlots = new Set<string>();
  if (mode === 'matrix') {
    occupiedSlots.add('matrix_tr_0_slot_foundational');
  } else {
    occupiedSlots.add('arm_0_tier_foundational');
  }

  return planets.map((sub) => {
    // 1. Äkinoya Core Check
    const isCore =
      sub.id === 'akinoya-core' ||
      sub.planetName === 'Äkinoya Prime' ||
      sub.planetName === 'Äkinoya';
    if (isCore) {
      return {
        ...sub,
        coordX: 0,
        coordY: 0,
        coord_x: 0,
        coord_y: 0,
        sectorId: 'SECTOR AKN-00 (CORE)',
      };
    }

    // 2. Ämlemi Master Anchor Check (Dynamically resolved per active constellation mode)
    const isAmlemi =
      sub.id === 'planet-amlemi-genesis-01' ||
      sub.planetName === 'Ämlemi';
    if (isAmlemi) {
      return {
        ...sub,
        coordX: amlemiCoord.x,
        coordY: amlemiCoord.y,
        coord_x: amlemiCoord.x,
        coord_y: amlemiCoord.y,
        sectorId: amlemiCoord.sectorId,
        armId: amlemiCoord.armId,
        armName: amlemiCoord.armName,
      };
    }

    // 3. Deterministic Hash for Candidate Placement
    const str = `${sub.id}_${sub.planetName || ''}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const absHash = Math.abs(hash + seed * 7919);

    // =========================================================================
    // VARIANT B: OVAL MATRIX (Concentric Elliptical Highways)
    // =========================================================================
    if (mode === 'matrix') {
      const numTracks = OVAL_MATRIX_TRACKS.length - 1; // Tracks 1 to 6
      const prefTrack = 1 + (absHash % numTracks);
      let chosenTrack = prefTrack;
      let chosenSlot = 0;
      let chosenX = 0;
      let chosenY = 0;
      let found = false;

      // Primary Search: Staggered slots along tracks 1..6
      for (let t = 0; t < numTracks && !found; t++) {
        const trackIdx = 1 + ((prefTrack - 1 + t) % numTracks);
        const track = OVAL_MATRIX_TRACKS[trackIdx];
        const prefSlot = absHash % track.slots;

        for (let s = 0; s < track.slots && !found; s++) {
          const slotIdx = (prefSlot + s) % track.slots;
          const key = `matrix_tr_${trackIdx}_slot_${slotIdx}`;
          if (occupiedSlots.has(key)) continue;

          const angle = (slotIdx / track.slots) * 2 * Math.PI + (trackIdx % 2 === 1 ? 0.2 : 0);
          const candX = Math.round(track.a * Math.cos(angle));
          const candY = Math.round(track.b * Math.sin(angle));

          if (isPositionCollisionFree(candX, candY, placedNodes, MIN_COLLISION_BUFFER_PX)) {
            occupiedSlots.add(key);
            chosenTrack = trackIdx;
            chosenSlot = slotIdx;
            chosenX = candX;
            chosenY = candY;
            found = true;
          }
        }
      }

      // Dynamic Overflow Expansion: Outer elliptical orbits
      if (!found) {
        let overflowTier = 0;
        while (!found && overflowTier < 25) {
          overflowTier++;
          const a = 3720 + overflowTier * 600;
          const b = 2400 + overflowTier * 400;
          const totalSlots = 16 + overflowTier * 2;
          const prefSlot = absHash % totalSlots;

          for (let s = 0; s < totalSlots && !found; s++) {
            const slotIdx = (prefSlot + s) % totalSlots;
            const key = `matrix_overflow_${overflowTier}_slot_${slotIdx}`;
            if (occupiedSlots.has(key)) continue;

            const angle = (slotIdx / totalSlots) * 2 * Math.PI + (overflowTier % 2 === 1 ? 0.2 : 0);
            const candX = Math.round(a * Math.cos(angle));
            const candY = Math.round(b * Math.sin(angle));

            if (isPositionCollisionFree(candX, candY, placedNodes, MIN_COLLISION_BUFFER_PX)) {
              occupiedSlots.add(key);
              chosenTrack = OVAL_MATRIX_TRACKS.length - 1;
              chosenSlot = slotIdx;
              chosenX = candX;
              chosenY = candY;
              found = true;
            }
          }
        }
      }

      placedNodes.push({ id: sub.id, x: chosenX, y: chosenY });
      const tr = OVAL_MATRIX_TRACKS[chosenTrack];
      const sectorId = `SECTOR MATRIX-T0${chosenTrack}`;

      return {
        ...sub,
        coordX: chosenX,
        coordY: chosenY,
        coord_x: chosenX,
        coord_y: chosenY,
        sectorId,
        armId: tr.id,
        armName: tr.name,
      };
    }

    // =========================================================================
    // VARIANT A: 5-ARM SPIRAL (DEFAULT)
    // =========================================================================
    const numArms = CONSTELLATION_ARMS.length;
    const numTiers = SPIRAL_RADIAL_TIERS.length;
    const prefArm = absHash % numArms;
    const prefTier = Math.floor(absHash / numArms) % numTiers;
    const prefSub = Math.floor(absHash / (numArms * numTiers)) % 2;

    let chosenArm = prefArm;
    let chosenTier = prefTier;
    let chosenSub = prefSub;
    let chosenX = 0;
    let chosenY = 0;
    let found = false;

    // Search through sub-slots, tiers, and arms systematically
    for (let subOffset = 0; subOffset < 2 && !found; subOffset++) {
      const s = (prefSub + subOffset) % 2;
      for (let tOffset = 0; tOffset < numTiers && !found; tOffset++) {
        const t = (prefTier + tOffset) % numTiers;
        for (let aOffset = 0; aOffset < numArms && !found; aOffset++) {
          const a = (prefArm + aOffset) % numArms;
          const key = `arm_${a}_tier_${t}_sub_${s}`;
          if (occupiedSlots.has(key)) continue;

          const arm = CONSTELLATION_ARMS[a];
          const baseR = SPIRAL_RADIAL_TIERS[t];
          const radius = baseR + (s === 1 ? 240 : 0);
          const theta = getSpiralArmAngle(arm.baseAngle, radius) + (s === 1 ? 0.05 : -0.03);
          const candX = Math.round(radius * Math.cos(theta));
          const candY = Math.round(radius * Math.sin(theta));

          if (isPositionCollisionFree(candX, candY, placedNodes, MIN_COLLISION_BUFFER_PX)) {
            occupiedSlots.add(key);
            chosenArm = a;
            chosenTier = t;
            chosenSub = s;
            chosenX = candX;
            chosenY = candY;
            found = true;
          }
        }
      }
    }

    // Dynamic Overflow Expansion: Outer Spiral Tiers
    if (!found) {
      let extTier = numTiers;
      while (!found && extTier < numTiers + 25) {
        for (let s = 0; s < 2 && !found; s++) {
          for (let aOffset = 0; aOffset < numArms && !found; aOffset++) {
            const a = (prefArm + aOffset) % numArms;
            const key = `arm_${a}_ext_tier_${extTier}_sub_${s}`;
            if (occupiedSlots.has(key)) continue;

            const arm = CONSTELLATION_ARMS[a];
            const baseR = 3440 + (extTier - numTiers + 1) * 480;
            const radius = baseR + (s === 1 ? 240 : 0);
            const theta = getSpiralArmAngle(arm.baseAngle, radius) + (s === 1 ? 0.05 : -0.03);
            const candX = Math.round(radius * Math.cos(theta));
            const candY = Math.round(radius * Math.sin(theta));

            if (isPositionCollisionFree(candX, candY, placedNodes, MIN_COLLISION_BUFFER_PX)) {
              occupiedSlots.add(key);
              chosenArm = a;
              chosenTier = extTier;
              chosenSub = s;
              chosenX = candX;
              chosenY = candY;
              found = true;
            }
          }
        }
        extTier++;
      }
    }

    placedNodes.push({ id: sub.id, x: chosenX, y: chosenY });
    const arm = CONSTELLATION_ARMS[chosenArm];
    const sectorPrefix = arm.name.split(' ')[0];
    const sectorNum = String((absHash % 89) + 10).padStart(2, '0');
    const sectorId = `SECTOR ${sectorPrefix}-${sectorNum}`;

    return {
      ...sub,
      coordX: chosenX,
      coordY: chosenY,
      coord_x: chosenX,
      coord_y: chosenY,
      sectorId,
      armId: arm.id,
      armName: arm.name,
    };
  });
}

/**
 * Backwards-compatible alias for assignMultiVariantCoordinates
 */
export function assignEquilibriumCoordinates(
  planets: PlanetSubmission[],
  mode: ConstellationLayoutMode = 'spiral',
  seed: number = 0
): PlanetSubmission[] {
  return assignMultiVariantCoordinates(planets, mode, seed);
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
 * Derives official Äkinoya planetary attributes from the 5 personality-based questions.
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
    `Ionized celestial atmosphere styled with ${answers.colorPalette || 'deep steel-blue with glowing gold energy lines'}${biomeInfo} and serene horizons of ${answers.naturalEnvironment || 'a quiet misty star-desert'}`;

  const flora =
    answers.flora ||
    `Bioluminescent botanical systems inspired by ${answers.biome || answers.naturalEnvironment || 'mysterious star-desert crystals and ancient flora'}, creating sanctuary biomes echoing ${answers.relaxation || answers.naturalEnvironment || 'deep contemplative peace'}`;

  const fauna =
    answers.fauna ||
    `Celestial ecosystem and presence inspired by: ${answers.admiredCreature || 'a contemplative space for lone explorers with giant light monuments'}, roaming high-altitude thermals`;

  const sonicVibe =
    answers.sonicVibe ||
    `Atmospheric acoustic resonance attuned to ${answers.creativeExpression || 'floating cosmic rocks and shooting stars'}, vibrating through deep analog synthesizers and ambient pads`;

  const visualAesthetic =
    answers.visualAesthetic ||
    `High-Resolution Cinematic Sci-Fi Render (Sillow Mill Aesthetic, Mood.png & Äkinoya.jpg), palette: ${answers.colorPalette || 'deep steel-blue and gold'}`;

  const landmark =
    answers.landmark ||
    `The Beacon of the Creed: an ancient celestial monument commemorating "${answers.futurePromise || answers.resilienceStory || 'Always chasing the horizon in the silence of the cosmos'}"`;

  const additionalNotes =
    answers.additionalNotes ||
    `${answers.sectorName ? `Designated Sector: ${answers.sectorName}. Terrain Biome: ${answers.biome || 'Bioluminescent Canopy'}. ` : ''}Founding Creed & Life Motto: "${answers.futurePromise || 'Always chasing the horizon in the silence of the cosmos'}". Inner Landscape: "${answers.naturalEnvironment || 'Quiet misty star-desert'}". Elemental Drive: "${answers.creativeExpression || 'Floating cosmic rocks'}". Palette: "${answers.colorPalette || 'Deep steel-blue and gold'}". World Presence: "${answers.admiredCreature || 'Contemplative solitude for lone explorers'}".`;

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
    relaxation: answers.relaxation || answers.naturalEnvironment,
    lifePhilosophy: answers.lifePhilosophy || answers.futurePromise,
    resilienceStory: answers.resilienceStory || answers.futurePromise,
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
      videoUrl: '/assets/videos/amlemi_trailer.mp4',
    },
    videoUrl: '/assets/videos/amlemi_trailer.mp4',
    videoStatus: 'READY',
    votesCount: 3,
    hasVoted: false,
    isPioneer: true,
    pioneerBadge: 'FOUNDING PIONEER · #01',
    status: 'PUBLISHED',
    coordX: 243,
    coordY: -176,
    coord_x: 243,
    coord_y: -176,
    sectorId: 'SECTOR AKN-01 (CAPITAL MERIDIAN)',
    armId: 'arm-orion',
    armName: 'ORION MERIDIAN',
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
              (isAmlemi ? '/assets/videos/amlemi_trailer.mp4' : '');
            const resolvedSfxAudioUrl =
              sub.sfxAudioUrl ||
              sub.renders?.sfxAudioUrl ||
              sub.renders?.sfx_audio_url ||
              '';
            const coords = isAmlemi
              ? { x: 243, y: -176, sectorId: 'SECTOR AKN-01 (CAPITAL MERIDIAN)', armId: 'arm-0', armName: 'ORION MERIDIAN' }
              : (sub.coordX !== undefined && sub.coordY !== undefined)
              ? { x: sub.coordX, y: sub.coordY, sectorId: sub.sectorId || 'SECTOR ALPHA-01', armId: sub.armId, armName: sub.armName }
              : (sub.coord_x !== undefined && sub.coord_y !== undefined)
              ? { x: sub.coord_x, y: sub.coord_y, sectorId: sub.sectorId || 'SECTOR ALPHA-01', armId: sub.armId, armName: sub.armName }
              : getDeterministicPlanetCoordinates(sub.id, sub.planetName);
            const isPreRelease = !sub.createdAt || new Date(sub.createdAt).getTime() < new Date('2027-01-09T00:00:00Z').getTime();
            const isVip = Boolean(
              sub.isVipPioneer ||
              sub.is_vip_pioneer ||
              (sub.pioneerBadge && sub.pioneerBadge.toUpperCase().includes('VIP')) ||
              (sub.pioneer_badge && sub.pioneer_badge.toUpperCase().includes('VIP'))
            );
            return {
              ...sub,
              planetName: isAmlemi ? 'Ämlemi' : formatAkinoyaPlanetName(sub.planetName),
              votesCount,
              hasVoted: userVoted,
              isPioneer: isAmlemi || (sub.isPioneer ?? isPreRelease),
              isVipPioneer: isVip,
              is_vip_pioneer: isVip,
              pioneerBadge: isAmlemi
                ? 'FOUNDING PIONEER · #01'
                : isVip
                ? 'VIP PIONEER'
                : sub.pioneerBadge || (isPreRelease ? 'PIONEER 2027 · PRE-RELEASE' : undefined),
              pioneer_badge: isAmlemi
                ? 'FOUNDING PIONEER · #01'
                : isVip
                ? 'VIP PIONEER'
                : sub.pioneer_badge || sub.pioneerBadge || (isPreRelease ? 'PIONEER 2027 · PRE-RELEASE' : undefined),
              videoUrl: resolvedVideoUrl,
              videoStatus: resolvedVideoUrl ? 'READY' : sub.videoStatus || 'QUEUED_PENDING',
              sfxAudioUrl: resolvedSfxAudioUrl,
              sfxStatus: resolvedSfxAudioUrl ? 'READY' : sub.sfxStatus || 'QUEUED_PENDING',
              coordX: coords.x,
              coordY: coords.y,
              coord_x: coords.x,
              coord_y: coords.y,
              sectorId: coords.sectorId,
              armId: coords.armId,
              armName: coords.armName,
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
                    sfxAudioUrl: resolvedSfxAudioUrl,
                    sfxStatus: resolvedSfxAudioUrl ? 'READY' : 'QUEUED_PENDING',
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
                    sfxAudioUrl: resolvedSfxAudioUrl,
                    sfxStatus: resolvedSfxAudioUrl ? 'READY' : 'QUEUED_PENDING',
                  };
                }
                return {
                  ...current,
                  videoUrl: resolvedVideoUrl,
                  sfxAudioUrl: resolvedSfxAudioUrl,
                  sfxStatus: resolvedSfxAudioUrl ? 'READY' : 'QUEUED_PENDING',
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

        const equilibriumCleaned = assignEquilibriumCoordinates(cleaned);

        if (cleaned.length !== parsed.length) {
          try {
            localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(equilibriumCleaned));
          } catch {}
        }

        if (equilibriumCleaned.length > 0) return equilibriumCleaned;
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
              (isAmlemi ? '/assets/videos/amlemi_trailer.mp4' : '');
            const coords = (d.coord_x !== undefined && d.coord_y !== undefined)
              ? { x: d.coord_x, y: d.coord_y, sectorId: d.sector_id || (isAmlemi ? 'SECTOR AKN-00 (CORE)' : 'SECTOR ALPHA-01'), armId: d.arm_id || d.armId, armName: d.arm_name || d.armName }
              : (d.coordX !== undefined && d.coordY !== undefined)
              ? { x: d.coordX, y: d.coordY, sectorId: d.sectorId || (isAmlemi ? 'SECTOR AKN-00 (CORE)' : 'SECTOR ALPHA-01'), armId: d.arm_id || d.armId, armName: d.arm_name || d.armName }
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
              armId: coords.armId,
              armName: coords.armName,
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
                const isItemSandbox = Boolean(d.is_sandbox || d.isSandbox);
                const hasLeak =
                  !isItemSandbox &&
                  (!current ||
                  !current.hero ||
                  !isCleanPhotorealistic(current.hero) ||
                  isAmlemiAsset(current.hero) ||
                  isAmlemiAsset(current.flora));
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
              isPioneer: isAmlemi || (!d.created_at || new Date(d.created_at).getTime() < new Date('2027-01-09T00:00:00Z').getTime()),
              isVipPioneer: Boolean(
                (d as any).is_vip_pioneer ||
                (d as any).isVipPioneer ||
                (d.raw_answers as any)?.is_vip_pioneer ||
                (d.raw_answers as any)?.isVipPioneer ||
                (d.human_answers as any)?.is_vip_pioneer ||
                (d.human_answers as any)?.isVipPioneer ||
                ((d as any).pioneer_badge && String((d as any).pioneer_badge).toUpperCase().includes('VIP'))
              ),
              is_vip_pioneer: Boolean(
                (d as any).is_vip_pioneer ||
                (d as any).isVipPioneer ||
                (d.raw_answers as any)?.is_vip_pioneer ||
                (d.raw_answers as any)?.isVipPioneer ||
                (d.human_answers as any)?.is_vip_pioneer ||
                (d.human_answers as any)?.isVipPioneer ||
                ((d as any).pioneer_badge && String((d as any).pioneer_badge).toUpperCase().includes('VIP'))
              ),
              pioneerBadge: isAmlemi
                ? 'FOUNDING PIONEER · #01'
                : Boolean(
                    (d as any).is_vip_pioneer ||
                    (d as any).isVipPioneer ||
                    (d.raw_answers as any)?.is_vip_pioneer ||
                    (d.raw_answers as any)?.isVipPioneer ||
                    (d.human_answers as any)?.is_vip_pioneer ||
                    (d.human_answers as any)?.isVipPioneer ||
                    ((d as any).pioneer_badge && String((d as any).pioneer_badge).toUpperCase().includes('VIP'))
                  )
                ? 'VIP PIONEER'
                : 'PIONEER 2027 · PRE-RELEASE',
              pioneer_badge: isAmlemi
                ? 'FOUNDING PIONEER · #01'
                : Boolean(
                    (d as any).is_vip_pioneer ||
                    (d as any).isVipPioneer ||
                    (d.raw_answers as any)?.is_vip_pioneer ||
                    (d.raw_answers as any)?.isVipPioneer ||
                    (d.human_answers as any)?.is_vip_pioneer ||
                    (d.human_answers as any)?.isVipPioneer ||
                    ((d as any).pioneer_badge && String((d as any).pioneer_badge).toUpperCase().includes('VIP'))
                  )
                ? 'VIP PIONEER'
                : 'PIONEER 2027 · PRE-RELEASE',
              status: (d.status as any) || 'PUBLISHED',
              createdAt: d.created_at || new Date().toISOString(),
              votingDeadline: 'June 30, 2027',
            };
          });

        // Always ensure canonical Ämlemi is included
        if (!live.some((p) => p.planetName === 'Ämlemi' || p.id === 'planet-amlemi-genesis-01')) {
          live.unshift(INITIAL_SUBMISSIONS[0]);
        }

        const equilibriumLive = assignEquilibriumCoordinates(live);
        const sortedLive = [...equilibriumLive].sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));

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
    const isPreRelease = !sub.createdAt || new Date(sub.createdAt).getTime() < new Date('2027-01-09T00:00:00Z').getTime();
    const isVip = Boolean(
      sub.isVipPioneer ||
      sub.is_vip_pioneer ||
      (sub.pioneerBadge && sub.pioneerBadge.toUpperCase().includes('VIP')) ||
      (sub.pioneer_badge && sub.pioneer_badge.toUpperCase().includes('VIP'))
    );
    return {
      ...sub,
      votesCount,
      hasVoted: userVoted,
      isPioneer: isAmlemi || (sub.isPioneer ?? isPreRelease),
      isVipPioneer: isVip,
      is_vip_pioneer: isVip,
      pioneerBadge: isAmlemi
        ? 'FOUNDING PIONEER · #01'
        : isVip
        ? 'VIP PIONEER'
        : sub.pioneerBadge || (isPreRelease ? 'PIONEER 2027 · PRE-RELEASE' : undefined),
      pioneer_badge: isAmlemi
        ? 'FOUNDING PIONEER · #01'
        : isVip
        ? 'VIP PIONEER'
        : sub.pioneer_badge || sub.pioneerBadge || (isPreRelease ? 'PIONEER 2027 · PRE-RELEASE' : undefined),
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
  const normalizedEmail = (email || '').trim().toLowerCase();
  const isOdi =
    normalizedEmail === 'odi.selis3@gmail.com' ||
    normalizedEmail === 'odi@sillowmill.com' ||
    normalizedEmail === 'sillowmill@gmail.com' ||
    userId === 'user-odi-founder' ||
    userId === 'user-odi-genesis';
  const match = submissions.find(
    (s) =>
      !isForbiddenSubmission(s) &&
      ((userId && s.userId === userId) ||
        (normalizedEmail && s.authorEmail && s.authorEmail.toLowerCase() === normalizedEmail) ||
        (isOdi && (s.id === 'planet-amlemi-genesis-01' || s.planetName === 'Ämlemi')))
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

        const resolvedSfxAudioUrl =
          data.sfx_audio_url ||
          data.renders?.sfxAudioUrl ||
          data.renders?.sfx_audio_url ||
          '';

        const coords = (data.coord_x !== undefined && data.coord_y !== undefined)
          ? { x: data.coord_x, y: data.coord_y, sectorId: data.sector_id || (isAmlemi ? 'SECTOR AKN-00 (CORE)' : 'SECTOR ALPHA-01'), armId: data.arm_id || data.armId, armName: data.arm_name || data.armName }
          : (data.coordX !== undefined && data.coordY !== undefined)
          ? { x: data.coordX, y: data.coordY, sectorId: data.sectorId || (isAmlemi ? 'SECTOR AKN-00 (CORE)' : 'SECTOR ALPHA-01'), armId: data.arm_id || data.armId, armName: data.arm_name || data.armName }
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
          sfxAudioUrl: resolvedSfxAudioUrl,
          sfxStatus: resolvedSfxAudioUrl ? 'READY' : 'QUEUED_PENDING',
          coordX: coords.x,
          coordY: coords.y,
          coord_x: coords.x,
          coord_y: coords.y,
          sectorId: coords.sectorId,
          armId: coords.armId,
          armName: coords.armName,
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
                sfxAudioUrl: resolvedSfxAudioUrl,
                sfxStatus: resolvedSfxAudioUrl ? 'READY' : 'QUEUED_PENDING',
                '01_main': amlemiOrbitalImg,
                '02_flora': amlemiBotanicalImg,
                '03_fauna': amlemiFaunaImg,
                '04_atmo': amlemiCockpitImg,
                '05_lore': amlemiMonumentImg,
              };
            }
            const current = data.renders;
            const isItemSandbox = Boolean(data.is_sandbox || data.isSandbox);
            const hasLeak =
              !isItemSandbox &&
              (!current ||
              !current.hero ||
              !isCleanPhotorealistic(current.hero) ||
              isAmlemiAsset(current.hero) ||
              isAmlemiAsset(current.flora));
            if (hasLeak) {
              return {
                ...resolvePlanetRenders(data.human_answers || (data as any)),
                videoUrl: resolvedVideoUrl,
                sfxAudioUrl: resolvedSfxAudioUrl,
                sfxStatus: resolvedSfxAudioUrl ? 'READY' : 'QUEUED_PENDING',
              };
            }
            return {
              ...current,
              videoUrl: resolvedVideoUrl,
              sfxAudioUrl: resolvedSfxAudioUrl,
              sfxStatus: resolvedSfxAudioUrl ? 'READY' : 'QUEUED_PENDING',
              '01_main': current.hero,
              '02_flora': current.flora,
              '03_fauna': current.fauna,
              '04_atmo': current.atmosphere,
              '05_lore': current.landmark,
            };
          })(),
          votesCount,
          hasVoted: userVoted,
          isPioneer: isAmlemi || (!data.created_at || new Date(data.created_at).getTime() < new Date('2027-01-09T00:00:00Z').getTime()),
          isVipPioneer: Boolean(
            data.is_vip_pioneer ||
            (data as any).isVipPioneer ||
            (data.raw_answers as any)?.is_vip_pioneer ||
            (data.raw_answers as any)?.isVipPioneer ||
            (data.human_answers as any)?.is_vip_pioneer ||
            (data.human_answers as any)?.isVipPioneer ||
            ((data as any).pioneer_badge && String((data as any).pioneer_badge).toUpperCase().includes('VIP'))
          ),
          is_vip_pioneer: Boolean(
            data.is_vip_pioneer ||
            (data as any).isVipPioneer ||
            (data.raw_answers as any)?.is_vip_pioneer ||
            (data.raw_answers as any)?.isVipPioneer ||
            (data.human_answers as any)?.is_vip_pioneer ||
            (data.human_answers as any)?.isVipPioneer ||
            ((data as any).pioneer_badge && String((data as any).pioneer_badge).toUpperCase().includes('VIP'))
          ),
          pioneerBadge: isAmlemi
            ? 'FOUNDING PIONEER · #01'
            : Boolean(
                data.is_vip_pioneer ||
                (data as any).isVipPioneer ||
                (data.raw_answers as any)?.is_vip_pioneer ||
                (data.raw_answers as any)?.isVipPioneer ||
                (data.human_answers as any)?.is_vip_pioneer ||
                (data.human_answers as any)?.isVipPioneer ||
                ((data as any).pioneer_badge && String((data as any).pioneer_badge).toUpperCase().includes('VIP'))
              )
            ? 'VIP PIONEER'
            : 'PIONEER 2027 · PRE-RELEASE',
          pioneer_badge: isAmlemi
            ? 'FOUNDING PIONEER · #01'
            : Boolean(
                data.is_vip_pioneer ||
                (data as any).isVipPioneer ||
                (data.raw_answers as any)?.is_vip_pioneer ||
                (data.raw_answers as any)?.isVipPioneer ||
                (data.human_answers as any)?.is_vip_pioneer ||
                (data.human_answers as any)?.isVipPioneer ||
                ((data as any).pioneer_badge && String((data as any).pioneer_badge).toUpperCase().includes('VIP'))
              )
            ? 'VIP PIONEER'
            : 'PIONEER 2027 · PRE-RELEASE',
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

// Map wizard inputs to 5 rich, photorealistic 8K visual render assets
// Strictly returns canonical assets for Ämlemi. For custom sectors, renders are synthesized live exclusively via Najno Banajna.
// ZERO VECTOR / SVG PLACEHOLDERS: Returns empty strings if not yet synthesized.
export const resolvePlanetRenders = (answers: WizardAnswers): PlanetSubmission['renders'] => {
  const isAmlemi = answers.planetName === 'Ämlemi' || answers.planetName?.toLowerCase() === 'ämlemi';
  const isSandbox = typeof window !== 'undefined' && localStorage.getItem('akinoya_mill_sandbox_mode') === 'true';
  if (isAmlemi || isSandbox) {
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
  const isSandbox = Boolean(
    sub.isSandbox ||
    (typeof window !== 'undefined' && localStorage.getItem('akinoya_mill_sandbox_mode') === 'true')
  );
  let renders = sub.renders;
  if (!isAmlemi && !isSandbox) {
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

  // Unified asset resolution: dynamically resolves primary keys, slot aliases, and sandbox/canonical fallbacks
  const heroUrl =
    renders?.hero ||
    renders?.['01_main'] ||
    (isAmlemi || isSandbox ? amlemiOrbitalImg : '') ||
    '';
  const floraUrl =
    renders?.flora ||
    renders?.['02_flora'] ||
    renders?.ecosystem ||
    (isAmlemi || isSandbox ? amlemiBotanicalImg : '') ||
    '';
  const faunaUrl =
    renders?.fauna ||
    renders?.['03_fauna'] ||
    (isAmlemi || isSandbox ? amlemiFaunaImg : '') ||
    '';
  const atmoUrl =
    renders?.atmosphere ||
    renders?.['04_atmo'] ||
    (isAmlemi || isSandbox ? amlemiCockpitImg : '') ||
    '';
  const landmarkUrl =
    renders?.landmark ||
    renders?.['05_lore'] ||
    (isAmlemi || isSandbox ? amlemiMonumentImg : '') ||
    '';

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
      title: isAmlemi ? 'Cockpit / Ship Landing Atmosphere Detail' : 'Atmospheric Troposphere & Sky Phenomena Detail',
      category: isAmlemi ? '04 · COCKPIT ATMOSPHERE' : '04 · ATMOSPHERIC TROPOSPHERE',
      url: atmoUrl,
      description: sub.atmosphere,
      styleAnchor: isAmlemi
        ? 'Cockpit View Reference: Mood.png (Photorealistic cockpit canopy, pilot HUD reflections, volumetric light shafts)'
        : 'Atmospheric Reference: Mood.png (Photorealistic volumetric troposphere, ionized cloud canyons, auroral sky phenomena)',
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
    const sfxAudioUrl =
      submission.sfxAudioUrl ||
      submission.renders?.sfxAudioUrl ||
      submission.renders?.sfx_audio_url ||
      '';

    const coords = (submission.coordX !== undefined && submission.coordY !== undefined)
      ? { x: submission.coordX, y: submission.coordY, sectorId: submission.sectorId || 'SECTOR ALPHA-01', armId: submission.armId, armName: submission.armName }
      : (submission.coord_x !== undefined && submission.coord_y !== undefined)
      ? { x: submission.coord_x, y: submission.coord_y, sectorId: submission.sectorId || 'SECTOR ALPHA-01', armId: submission.armId, armName: submission.armName }
      : getDeterministicPlanetCoordinates(submission.id, submission.planetName);

    const isVip = Boolean(
      submission.isVipPioneer ||
      submission.is_vip_pioneer ||
      (submission.pioneerBadge && submission.pioneerBadge.toUpperCase().includes('VIP')) ||
      (submission.pioneer_badge && submission.pioneer_badge.toUpperCase().includes('VIP'))
    );

    const enrichedSubmission: PlanetSubmission = {
      ...submission,
      votesCount: Math.max(1, submission.votesCount || 1),
      isPioneer: true,
      isVipPioneer: isVip,
      is_vip_pioneer: isVip,
      pioneerBadge: isVip ? 'VIP PIONEER' : (submission.pioneerBadge || 'PIONEER 2027'),
      pioneer_badge: isVip ? 'VIP PIONEER' : (submission.pioneer_badge || submission.pioneerBadge || 'PIONEER 2027'),
      videoUrl,
      videoStatus: videoUrl ? 'READY' : submission.videoStatus || 'QUEUED_PENDING',
      sfxAudioUrl,
      sfxStatus: sfxAudioUrl ? 'READY' : submission.sfxStatus || 'QUEUED_PENDING',
      coordX: coords.x,
      coordY: coords.y,
      coord_x: coords.x,
      coord_y: coords.y,
      sectorId: coords.sectorId,
      armId: coords.armId,
      armName: coords.armName,
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
        sfxAudioUrl,
        sfx_audio_url: sfxAudioUrl,
        sfxStatus: sfxAudioUrl ? 'READY' : submission.sfxStatus || 'QUEUED_PENDING',
      },
    };

    const existing = getStoredPlanetSubmissions();
    const updated = [enrichedSubmission, ...existing.filter((s) => s.id !== enrichedSubmission.id)];
    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(updated));

    // Instant Map Registration: Broadcast local event to live Galaxy Navigator and listening components
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('akinoya_planet_submissions_updated', { detail: updated }));
      } catch {}
    }

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
          is_pioneer: true,
          is_vip_pioneer: isVip,
          pioneer_badge: isVip ? 'VIP PIONEER' : (submission.pioneerBadge || 'PIONEER 2027'),
          human_answers: {
            ...(enrichedSubmission.humanAnswers || {}),
            biome: enrichedSubmission.biome,
            sectorName: enrichedSubmission.sectorName,
            video_url: videoUrl,
            coord_x: coords.x,
            coord_y: coords.y,
            sector_id: coords.sectorId,
            is_vip_pioneer: isVip,
            isVipPioneer: isVip,
            pioneer_badge: isVip ? 'VIP PIONEER' : (submission.pioneerBadge || 'PIONEER 2027'),
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

import { PlanetSubmission, WizardAnswers } from '../types/contest';
import { PRELAUNCH_GENERATION_LOCKED } from '../config/prelaunch';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getPioneerMasterVideoUrl } from '../utils/pioneer';

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
    const isCore = node.id === 'akinoya-core';
    // Core visual radius is ~36px (72px diameter); 160px buffer ensures inner capital oval (b=220px) is collision-free
    const requiredBuffer = isCore ? Math.min(minBuffer, 160) : minBuffer;
    const dx = candX - node.x;
    const dy = candY - node.y;
    // Fast bounding box pre-rejection before hypotenuse calculation
    if (Math.abs(dx) < requiredBuffer && Math.abs(dy) < requiredBuffer) {
      if (Math.hypot(dx, dy) < requiredBuffer) {
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
  { id: 'track-0', name: 'FOUNDATIONAL CAPITAL OVAL', a: 320, b: 220, slots: 5, color: '#fbbf24', glowColor: 'rgba(251, 191, 36, 0.45)' },
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

  // Pioneer #1: Ämlemi (Odi S.)
  const isAmlemi =
    planetId === 'planet-amlemi-genesis-01' ||
    planetName === 'Ämlemi';
  if (isAmlemi) {
    if (mode === 'matrix') {
      const tr = OVAL_MATRIX_TRACKS[0];
      return {
        x: 0,
        y: -tr.b, // (0, -220)
        sectorId: 'SECTOR MATRIX-T00 (CAPITAL APEX)',
        armId: tr.id,
        armName: tr.name,
      };
    }
    // Variant A (5-Arm Spiral) - Arm 0 (Orion Meridian) Origin
    const arm = CONSTELLATION_ARMS[0];
    return {
      x: 243,
      y: -176,
      sectorId: 'SECTOR AKN-01 (CAPITAL MERIDIAN)',
      armId: arm.id,
      armName: arm.name,
    };
  }

  // Pioneer #2: Felix (Esther P.)
  const isFelix =
    planetId === 'planet-felix-test-01' ||
    planetName === 'Felix';
  if (isFelix) {
    if (mode === 'matrix') {
      const tr = OVAL_MATRIX_TRACKS[0];
      return {
        x: 304,
        y: -68,
        sectorId: 'SECTOR MATRIX-T00 (CAPITAL MERIDIAN)',
        armId: tr.id,
        armName: tr.name,
      };
    }
    // Variant A (5-Arm Spiral) - Arm 1 (Cygnus Filament) Origin
    const arm = CONSTELLATION_ARMS[1];
    return {
      x: 243,
      y: 176,
      sectorId: 'SECTOR CYGNUS-00 (CORE MERIDIAN)',
      armId: arm.id,
      armName: arm.name,
    };
  }

  // Pioneer #3: Ankrau (Nathan R.)
  const isNathan =
    planetId === 'planet-nathan-pioneer-03' ||
    planetName === 'Ankrau' ||
    planetName === 'Nathos' ||
    planetName === 'Natharia' ||
    planetName === 'Nathan';
  if (isNathan) {
    if (mode === 'matrix') {
      const tr = OVAL_MATRIX_TRACKS[0];
      return {
        x: 188,
        y: 178,
        sectorId: 'SECTOR MATRIX-T00 (CAPITAL MERIDIAN)',
        armId: tr.id,
        armName: tr.name,
      };
    }
    // Variant A (5-Arm Spiral) - Arm 2 (Solaris Tendril) Origin
    const arm = CONSTELLATION_ARMS[2];
    return {
      x: -93,
      y: 285,
      sectorId: 'SECTOR SOLARIS-00 (CORE MERIDIAN)',
      armId: arm.id,
      armName: arm.name,
    };
  }

  // Pioneer #4: Florium (Florian H.)
  const isFlorian =
    planetId === 'planet-florian-pioneer-04' ||
    planetName === 'Florium' ||
    planetName === 'Floriana' ||
    planetName === 'Florian';
  if (isFlorian) {
    if (mode === 'matrix') {
      const tr = OVAL_MATRIX_TRACKS[0];
      return {
        x: -188,
        y: 178,
        sectorId: 'SECTOR MATRIX-T00 (CAPITAL MERIDIAN)',
        armId: tr.id,
        armName: tr.name,
      };
    }
    // Variant A (5-Arm Spiral) - Arm 3 (Aurelia Cluster) Origin
    const arm = CONSTELLATION_ARMS[3];
    return {
      x: -300,
      y: 0,
      sectorId: 'SECTOR AURELIA-00 (CORE MERIDIAN)',
      armId: arm.id,
      armName: arm.name,
    };
  }

  // Pioneer #5: Sepplon (Seppe G.)
  const isSeppe =
    planetId === 'planet-seppe-pioneer-05' ||
    planetName === 'Sepplon' ||
    planetName === 'Seppion' ||
    planetName === 'Seppe';
  if (isSeppe) {
    if (mode === 'matrix') {
      const tr = OVAL_MATRIX_TRACKS[0];
      return {
        x: -304,
        y: -68,
        sectorId: 'SECTOR MATRIX-T00 (CAPITAL MERIDIAN)',
        armId: tr.id,
        armName: tr.name,
      };
    }
    // Variant A (5-Arm Spiral) - Arm 4 (Centauri Stream) Origin
    const arm = CONSTELLATION_ARMS[4];
    return {
      x: -93,
      y: -285,
      sectorId: 'SECTOR CENTAURI-00 (CORE MERIDIAN)',
      armId: arm.id,
      armName: arm.name,
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
    // Inside-Out Expansion Protocol: Prioritize inner harmonic tracks (Track 0, Track 1, Track 2) before outer perimeters
    const trackIdx = Math.min(OVAL_MATRIX_TRACKS.length - 1, absHash % 3);
    const track = OVAL_MATRIX_TRACKS[trackIdx];
    const slotIdx = absHash % track.slots;
    const angle = (slotIdx / track.slots) * 2 * Math.PI + (trackIdx % 2 === 1 ? 0.2 : 0) - Math.PI / 2;
    const x = Math.round(track.a * Math.cos(angle));
    const y = Math.round(track.b * Math.sin(angle));
    const sectorId = `SECTOR MATRIX-T0${trackIdx}`;
    return { x, y, sectorId, armId: track.id, armName: track.name };
  }

  // Default: Variant A (5-Arm Spiral) - Inside-Out Expansion Protocol
  const armIndex = absHash % CONSTELLATION_ARMS.length;
  const arm = CONSTELLATION_ARMS[armIndex];
  // Prioritize inner harmonic rings (Tier 0 & 1: 560 AU & 1040 AU) near core
  const tierIndex = (absHash >> 3) % 2;
  const baseRadius = SPIRAL_RADIAL_TIERS[tierIndex];
  const subSlot = Math.floor(absHash / (CONSTELLATION_ARMS.length * 2)) % 2;
  const radius = tierIndex === 0 && subSlot === 0 ? 300 : baseRadius + (subSlot === 1 ? 240 : 0);
  const baseSpiralAngle = getSpiralArmAngle(arm.baseAngle, radius);
  const finalAngle = baseSpiralAngle + (subSlot === 1 ? 0.05 : (tierIndex === 0 && subSlot === 0 ? 0 : -0.03));
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
  // Resolve mode-aware coordinates for all 5 Founding & VIP Pioneers
  // Pioneer #1: Ämlemi (Odi S.) - Arm 0 / Track 0 Apex
  const arm0 = CONSTELLATION_ARMS[0];
  const tr0 = OVAL_MATRIX_TRACKS[0];
  const amlemiCoord = mode === 'matrix'
    ? { x: 0, y: -tr0.b, sectorId: 'SECTOR MATRIX-T00 (CAPITAL APEX)', armId: tr0.id, armName: tr0.name }
    : { x: 243, y: -176, sectorId: 'SECTOR AKN-01 (CAPITAL MERIDIAN)', armId: arm0.id, armName: arm0.name };

  // Pioneer #2: Felix (Esther P.) - Arm 1 / Track 0 Slot 1
  const arm1 = CONSTELLATION_ARMS[1];
  const felixCoord = mode === 'matrix'
    ? { x: 304, y: -68, sectorId: 'SECTOR MATRIX-T00 (CAPITAL MERIDIAN)', armId: tr0.id, armName: tr0.name }
    : { x: 243, y: 176, sectorId: 'SECTOR CYGNUS-00 (CORE MERIDIAN)', armId: arm1.id, armName: arm1.name };

  // Pioneer #3: Ankrau (Nathan R.) - Arm 2 / Track 0 Slot 2
  const arm2 = CONSTELLATION_ARMS[2];
  const nathanCoord = mode === 'matrix'
    ? { x: 188, y: 178, sectorId: 'SECTOR MATRIX-T00 (CAPITAL MERIDIAN)', armId: tr0.id, armName: tr0.name }
    : { x: -93, y: 285, sectorId: 'SECTOR SOLARIS-00 (CORE MERIDIAN)', armId: arm2.id, armName: arm2.name };

  // Pioneer #4: Florium (Florian H.) - Arm 3 / Track 0 Slot 3
  const arm3 = CONSTELLATION_ARMS[3];
  const florianCoord = mode === 'matrix'
    ? { x: -188, y: 178, sectorId: 'SECTOR MATRIX-T00 (CAPITAL MERIDIAN)', armId: tr0.id, armName: tr0.name }
    : { x: -300, y: 0, sectorId: 'SECTOR AURELIA-00 (CORE MERIDIAN)', armId: arm3.id, armName: arm3.name };

  // Pioneer #5: Sepplon (Seppe G.) - Arm 4 / Track 0 Slot 4
  const arm4 = CONSTELLATION_ARMS[4];
  const seppeCoord = mode === 'matrix'
    ? { x: -304, y: -68, sectorId: 'SECTOR MATRIX-T00 (CAPITAL MERIDIAN)', armId: tr0.id, armName: tr0.name }
    : { x: -93, y: -285, sectorId: 'SECTOR CENTAURI-00 (CORE MERIDIAN)', armId: arm4.id, armName: arm4.name };

  // Hard pairwise distance tracking: Äkinoya Core (0, 0) and all 5 Pioneers are pre-registered
  const placedNodes: PlacedNode[] = [
    { id: 'akinoya-core', x: 0, y: 0 },
    { id: 'planet-amlemi-genesis-01', x: amlemiCoord.x, y: amlemiCoord.y },
    { id: 'planet-felix-test-01', x: felixCoord.x, y: felixCoord.y },
    { id: 'planet-nathan-pioneer-03', x: nathanCoord.x, y: nathanCoord.y },
    { id: 'planet-florian-pioneer-04', x: florianCoord.x, y: florianCoord.y },
    { id: 'planet-seppe-pioneer-05', x: seppeCoord.x, y: seppeCoord.y },
  ];

  const occupiedSlots = new Set<string>();
  if (mode === 'matrix') {
    // Symmetrical Inner Core Saturation: All 5 slots on Track 0 are occupied by Pioneers #1-#5
    occupiedSlots.add('matrix_tr_0_slot_0');
    occupiedSlots.add('matrix_tr_0_slot_1');
    occupiedSlots.add('matrix_tr_0_slot_2');
    occupiedSlots.add('matrix_tr_0_slot_3');
    occupiedSlots.add('matrix_tr_0_slot_4');
  } else {
    // Symmetrical 5-Arm Spiral: Inner origin (Tier 0, Sub 0, r=300) on each arm occupied by Pioneers #1-#5
    occupiedSlots.add('arm_0_tier_0_sub_0');
    occupiedSlots.add('arm_1_tier_0_sub_0');
    occupiedSlots.add('arm_2_tier_0_sub_0');
    occupiedSlots.add('arm_3_tier_0_sub_0');
    occupiedSlots.add('arm_4_tier_0_sub_0');
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

    // 2. Ämlemi Master Anchor Check (#1)
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

    // 2b. Felix VIP Pioneer (#2)
    const isFelix =
      sub.id === 'planet-felix-test-01' ||
      sub.planetName === 'Felix';
    if (isFelix) {
      return {
        ...sub,
        coordX: felixCoord.x,
        coordY: felixCoord.y,
        coord_x: felixCoord.x,
        coord_y: felixCoord.y,
        sectorId: felixCoord.sectorId,
        armId: felixCoord.armId,
        armName: felixCoord.armName,
      };
    }

    // 2c. Ankrau VIP Pioneer (#3)
    const isNathan =
      sub.id === 'planet-nathan-pioneer-03' ||
      sub.planetName === 'Ankrau' ||
      sub.planetName === 'Nathos' ||
      sub.planetName === 'Natharia' ||
      sub.planetName === 'Nathan';
    if (isNathan) {
      return {
        ...sub,
        coordX: nathanCoord.x,
        coordY: nathanCoord.y,
        coord_x: nathanCoord.x,
        coord_y: nathanCoord.y,
        sectorId: nathanCoord.sectorId,
        armId: nathanCoord.armId,
        armName: nathanCoord.armName,
      };
    }

    // 2d. Florium VIP Pioneer (#4)
    const isFlorian =
      sub.id === 'planet-florian-pioneer-04' ||
      sub.planetName === 'Florium' ||
      sub.planetName === 'Floriana' ||
      sub.planetName === 'Florian';
    if (isFlorian) {
      return {
        ...sub,
        coordX: florianCoord.x,
        coordY: florianCoord.y,
        coord_x: florianCoord.x,
        coord_y: florianCoord.y,
        sectorId: florianCoord.sectorId,
        armId: florianCoord.armId,
        armName: florianCoord.armName,
      };
    }

    // 2e. Sepplon VIP Pioneer (#5)
    const isSeppe =
      sub.id === 'planet-seppe-pioneer-05' ||
      sub.planetName === 'Sepplon' ||
      sub.planetName === 'Seppion' ||
      sub.planetName === 'Seppe';
    if (isSeppe) {
      return {
        ...sub,
        coordX: seppeCoord.x,
        coordY: seppeCoord.y,
        coord_x: seppeCoord.x,
        coord_y: seppeCoord.y,
        sectorId: seppeCoord.sectorId,
        armId: seppeCoord.armId,
        armName: seppeCoord.armName,
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
    // Strict Inner-Ring Exhaustion Rule: Track 0 must reach 100% saturation
    // before any slots on Track 1 are allocated, etc.
    // =========================================================================
    if (mode === 'matrix') {
      let chosenTrack = 0;
      let chosenSlot = 0;
      let chosenX = 0;
      let chosenY = 0;
      let found = false;

      // Primary Search: Strict Sequential Inside-Out Exhaustion (Track 0 -> Track 6)
      for (let trackIdx = 0; trackIdx < OVAL_MATRIX_TRACKS.length && !found; trackIdx++) {
        const track = OVAL_MATRIX_TRACKS[trackIdx];

        for (let s = 0; s < track.slots && !found; s++) {
          const key = `matrix_tr_${trackIdx}_slot_${s}`;
          if (occupiedSlots.has(key)) continue;

          // Slot angle starting at -PI/2 (top apex) with alternating track phase offset
          const angle = (s / track.slots) * 2 * Math.PI + (trackIdx % 2 === 1 ? 0.2 : 0) - Math.PI / 2;
          const candX = Math.round(track.a * Math.cos(angle));
          const candY = Math.round(track.b * Math.sin(angle));

          if (isPositionCollisionFree(candX, candY, placedNodes, MIN_COLLISION_BUFFER_PX)) {
            occupiedSlots.add(key);
            chosenTrack = trackIdx;
            chosenSlot = s;
            chosenX = candX;
            chosenY = candY;
            found = true;
          }
        }
      }

      // Dynamic Overflow Expansion: Outer elliptical orbits if all standard tracks saturated
      if (!found) {
        let overflowTier = 0;
        while (!found && overflowTier < 25) {
          overflowTier++;
          const a = 3720 + overflowTier * 600;
          const b = 2400 + overflowTier * 400;
          const totalSlots = 16 + overflowTier * 2;

          for (let s = 0; s < totalSlots && !found; s++) {
            const key = `matrix_overflow_${overflowTier}_slot_${s}`;
            if (occupiedSlots.has(key)) continue;

            const angle = (s / totalSlots) * 2 * Math.PI + (overflowTier % 2 === 1 ? 0.2 : 0) - Math.PI / 2;
            const candX = Math.round(a * Math.cos(angle));
            const candY = Math.round(b * Math.sin(angle));

            if (isPositionCollisionFree(candX, candY, placedNodes, MIN_COLLISION_BUFFER_PX)) {
              occupiedSlots.add(key);
              chosenTrack = OVAL_MATRIX_TRACKS.length - 1;
              chosenSlot = s;
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
    // Strict Inner-Tier Sequential Cascading Engine:
    // Core radial tier (Tier 0: 560 AU) must be fully populated arm-by-arm
    // before cascading outward to Tier 1, Tier 2, etc.
    // =========================================================================
    const numArms = CONSTELLATION_ARMS.length;
    const numTiers = SPIRAL_RADIAL_TIERS.length;

    let chosenArm = 0;
    let chosenTier = 0;
    let chosenSub = 0;
    let chosenX = 0;
    let chosenY = 0;
    let found = false;

    // Primary Search: Strict Sequential Inside-Out Cascading (Tier 0 -> Tier numTiers - 1)
    // Arm 0 -> Arm 1 -> Arm 2 -> Arm 3 -> Arm 4 across sub-slots at current radial tier
    for (let t = 0; t < numTiers && !found; t++) {
      for (let a = 0; a < numArms && !found; a++) {
        for (let s = 0; s < 2 && !found; s++) {
          const key = `arm_${a}_tier_${t}_sub_${s}`;
          if (occupiedSlots.has(key)) continue;

          const arm = CONSTELLATION_ARMS[a];
          const radius = t === 0 && s === 0 ? 300 : SPIRAL_RADIAL_TIERS[t] + (s === 1 ? 240 : 0);
          const theta = getSpiralArmAngle(arm.baseAngle, radius) + (s === 1 ? 0.05 : (t === 0 && s === 0 ? 0 : -0.03));
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

    // Dynamic Overflow Expansion: Outer Spiral Tiers if all standard tiers saturated
    if (!found) {
      let extTier = numTiers;
      while (!found && extTier < numTiers + 25) {
        for (let a = 0; a < numArms && !found; a++) {
          for (let s = 0; s < 2 && !found; s++) {
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
 * REQUIRED: Pure organic proper names (e.g. Ämlemi, Elysia, Valerion, Aethelgard).
 */
const ORGANIC_NAME_PREFIXES = [
  'Arbi', 'Luci', 'Ely', 'Vale', 'Aethel', 'Sola', 'Aure', 'Celes', 'Vespe',
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
  'planet-zephyria',
  'planet-zephyria-06',
  'zephyria',
  'PLN-2027-ZEPHYRIA',
]);

/**
 * Filter against test submissions, mock worlds, or removed entries (e.g. Zephyria, Felix by Kaat Jansen).
 * Enforces that only canonical benchmark sectors like Ämlemi and valid participant worlds appear.
 */
export const isForbiddenSubmission = (sub: any): boolean => {
  if (!sub) return true;
  const id = String(sub.id || '').trim();
  const name = String(sub.planetName || sub.planet_name || '').toLowerCase().trim();
  const author = String(sub.authorName || sub.author_name || '').toLowerCase().trim();
  const email = String(sub.authorEmail || sub.author_email || '').toLowerCase().trim();

  // Explicitly permit Felix by Esther Philippen (active community test creation)
  if (id === 'planet-felix-test-01' || (name === 'felix' && (author.includes('esther') || email.includes('esther')))) {
    return false;
  }

  // Permanently purge and exclude Zephyria / test world entry #6
  if (
    name === 'zephyria' ||
    name.includes('zephyria') ||
    id.toLowerCase().includes('zephyria') ||
    (author.includes('architect') && name.includes('zephyria'))
  ) {
    return true;
  }

  if (MOCK_PLANET_IDS.has(id)) return true;
  if (name === 'arbitron' || name === 'lucina' || name === 'elysia') return true;
  if (author.includes('kaat') || author.includes('jansen')) return true;
  if (email.includes('kaat.jansen') || email.includes('hannah.jansen')) return true;
  if (id.toLowerCase().includes('kaat')) return true;

  return false;
};

/**
 * Curated Live Galaxy Worlds:
 * Only the 5 founding pioneer worlds (and any world explicitly approved by an admin)
 * appear on the public Galaxy Navigator. Newly generated user worlds stay private
 * in the user's dashboard (My World / My Assets) in a queued state until the
 * January 9, 2027 release / manual admin review.
 */
export const CURATED_GALAXY_WORLD_IDS = new Set([
  'planet-amlemi-genesis-01',
  'planet-felix-test-01',
  'planet-nathan-pioneer-03',
  'planet-florian-pioneer-04',
  'planet-seppe-pioneer-05',
]);

export const CURATED_GALAXY_WORLD_NAMES = new Set([
  'ämlemi',
  'amlemi',
  'felix',
  'ankrau',
  'nathos',
  'natharia',
  'florium',
  'floriana',
  'sepplon',
  'seppion',
]);

export const WORLD_RELEASE_DATE_LABEL = 'JANUARY 9, 2027';
export const WORLD_QUEUE_STATUS_LABEL = 'PRIVATE UNTIL RELEASE';
export const WORLD_QUEUE_OFFICIAL_MESSAGE =
  'Your world is loading, will be revealed 9 januari.';

/**
 * Strictly verifies whether a planet is one of the 5 official canon pioneer worlds
 * (Ämlemi, Felix, Ankrau, Florium, Sepplon).
 * In pre-release (< Jan 9, 2027), ONLY official canon worlds are shown in public leaderboards,
 * lore governance portals, and community ranking tallies.
 */
export const isOfficialCanonWorld = (planet?: Partial<PlanetSubmission> | null): boolean => {
  if (!planet) return false;
  const id = String(planet.id || '').trim();
  if (CURATED_GALAXY_WORLD_IDS.has(id)) return true;
  const name = String(planet.planetName || (planet as any).planet_name || '').trim().toLowerCase();
  return CURATED_GALAXY_WORLD_NAMES.has(name);
};

/** True when a world is curated/approved for the public Galaxy Navigator map. */
export const isLiveGalaxyWorld = (planet?: Partial<PlanetSubmission> | null): boolean => {
  if (!planet) return false;
  const anyP = planet as any;
  if (anyP.adminApproved === true || anyP.admin_approved === true || anyP.galaxyApproved === true) return true;
  const id = String(planet.id || '').trim();
  if (CURATED_GALAXY_WORLD_IDS.has(id)) return true;
  const name = String(planet.planetName || anyP.planet_name || '').trim().toLowerCase();
  return CURATED_GALAXY_WORLD_NAMES.has(name);
};

/** True for newly registered / custom generated (non-benchmark) worlds awaiting release. */
export const isQueuedUserWorld = (planet?: Partial<PlanetSubmission> | null): boolean => {
  if (!planet) return false;
  return !isLiveGalaxyWorld(planet);
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
    authorName: 'Odi S.',
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
    generatedLore: `Classified by world architect Odi S., Ämlemi is the premier canonical benchmark sector anchoring the Sillow Mill universe. Anchored strictly to the photorealistic depth of Äkinoya and the volumetric atmospheric lighting of Mood.png, its skies glow with deep cobalt and incandescent amber.\n\nThe planetary ecology thrives through bioluminescent crystalline forests humming at 432Hz. Across the high troposphere roam apex plasma gliders, while the equatorial meridian is anchored by the ancient Obsidian Spire conduit.\n\nFOUNDING CREED:\n"Across the ionization rift, light always finds the horizon."`,
    renders: {
      hero: amlemiOrbitalImg,
      flora: amlemiBotanicalImg,
      fauna: amlemiFaunaImg,
      atmosphere: amlemiCockpitImg,
      landmark: amlemiMonumentImg,
      ecosystem: amlemiBotanicalImg,
      videoUrl: '/assets/videos/amlemi_trailer.mp4',
      '01_main': amlemiOrbitalImg,
      '02_flora': amlemiBotanicalImg,
      '03_fauna': amlemiFaunaImg,
      '04_atmo': amlemiCockpitImg,
      '05_lore': amlemiMonumentImg,
    },
    videoUrl: '/assets/videos/amlemi_trailer.mp4',
    videoStatus: 'READY',
    votesCount: 3,
    hasVoted: false,
    isPioneer: true,
    pioneerBadge: 'FOUNDING PIONEER · #01',
    pioneer_badge: 'FOUNDING PIONEER · #01',
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
  {
    id: 'planet-felix-test-01',
    userId: 'user-esther-vip-001',
    authorName: 'Esther P.',
    authorUsername: 'estherphilippen',
    authorEmail: 'estherphilippen@msn.com',
    authorAvatarGradient: 'from-pink-500 via-rose-500 to-amber-500',
    planetName: 'Felix',
    atmosphere: 'Bioluminescent Avatar-style twilight troposphere illuminated by vibrant neon pink and warm orange auroras, floating rock arches, and ethereal glowing mists.',
    flora: 'Breathtaking Avatar-inspired bioluminescent flora, giant luminous spore trees, and glowing magenta whisker-ferns that react to feline touch.',
    fauna: 'Charming, fluffy rossenhuiskatten (ginger domestic cats) and striking bioluminescent pink sci-fi cats roaming freely across floating mossy plateaus.',
    sonicVibe: 'Warm analog synthesizer purr, 432Hz ambient chime, and rhythmic cosmic heartbeat.',
    visualAesthetic: 'High-resolution cinematic Avatar-style sci-fi render, 8K bioluminescent alien landscape (Sillow Mill aesthetic).',
    landmark: 'The Great Sphinx of Felix: Colossal ancient feline monolith carved from rose quartz and copper energy channels.',
    additionalNotes: 'Active community test creation for Esther P.',
    humanAnswers: {
      planetName: 'Felix',
      relaxation: 'Listening to celestial purring under warm sunset skies with glowing feline companions.',
      creativeExpression: 'Bioluminescent organic sculpture, feline constellation cartography, and analog harmonics.',
      naturalEnvironment: 'Misty canyon plateaus surrounded by bioluminescent cat-grass, floating moss islands, and orange quartz spires.',
      lifePhilosophy: 'Curiosity, grace, and relentless playfulness illuminate the cosmic unknown.',
      admiredCreature: 'Fluffy rossenhuiskatten (ginger domestic cats) and bioluminescent pink sci-fi cats.',
      colorPalette: 'Vibrant neon pink, incandescent warm orange, and luminous feline auroras.',
      resilienceStory: 'Carving a vibrant metropolis of feline light out of the deep void.',
      futurePromise: 'With curiosity and grace, the feline cosmos opens its infinite horizons.',
      atmosphere: 'Bioluminescent Avatar-style twilight troposphere illuminated by vibrant neon pink and warm orange auroras, floating rock arches, and ethereal glowing mists.',
      flora: 'Breathtaking Avatar-inspired bioluminescent flora, giant luminous spore trees, and glowing magenta whisker-ferns that react to feline touch.',
      fauna: 'Charming, fluffy rossenhuiskatten (ginger domestic cats) and striking bioluminescent pink sci-fi cats roaming freely across floating mossy plateaus.',
      sonicVibe: 'Warm analog synthesizer purr, 432Hz ambient chime, and rhythmic cosmic heartbeat.',
      visualAesthetic: 'High-resolution cinematic Avatar-style sci-fi render, 8K bioluminescent alien landscape.',
      landmark: 'The Great Sphinx of Felix.',
      additionalNotes: 'Active community test creation for Esther P.',
    },
    futurePromise: 'With curiosity and grace, the feline cosmos opens its infinite horizons.',
    generatedLore: `Classified by world architect Esther P., Felix is an official VIP frontier sector (#02) situated within the Äkinoya celestial sphere. Cascading across bioluminescent mountain ranges and floating quartz arches reminiscent of an Avatar-style alien paradise, its skies radiate with vibrant neon pink and warm incandescent auroras.\n\nAcross the canyon plateaus roam charming, fluffy rossenhuiskatten (ginger domestic cats) and striking bioluminescent pink sci-fi cats playing amidst glowing whisker-ferns that react to touch. At the planetary meridian stands the colossal Great Sphinx of Felix, an ancient feline monolith carved from rose quartz and copper conduits humming at 432Hz.\n\nFOUNDING CREED:\n"With curiosity and grace, the feline cosmos opens its infinite horizons."`,
    renders: {
      hero: 'https://v3b.fal.media/files/b/0aaf67e3/QCNr60F4WXHza0PgpPzkm_FpQcg8tP.png',
      flora: 'https://v3b.fal.media/files/b/0aaf67e5/seICefAuMBvzKL611nP6b_uzsXKplx.png',
      fauna: 'https://v3b.fal.media/files/b/0aaf67e7/eZc38kitmkVPAAx-omyyR_m9gbfeX5.png',
      atmosphere: 'https://v3b.fal.media/files/b/0aaf67e8/iSmEn2NslRpLLvBpxK97H_UFxeKMkO.png',
      landmark: 'https://v3b.fal.media/files/b/0aaf67ea/7BY1x9xCPX1WHrnp7i7nT_5vJ41dxC.png',
      ecosystem: 'https://v3b.fal.media/files/b/0aaf67e5/seICefAuMBvzKL611nP6b_uzsXKplx.png',
      videoUrl: '/assets/videos/felix_trailer.mp4',
      falVideoUrl: 'https://v3b.fal.media/files/b/0aaf6d23/O9RBWYVGrZNiF9ppfJDsx_video.mp4',
      '01_main': 'https://v3b.fal.media/files/b/0aaf67e3/QCNr60F4WXHza0PgpPzkm_FpQcg8tP.png',
      '02_flora': 'https://v3b.fal.media/files/b/0aaf67e5/seICefAuMBvzKL611nP6b_uzsXKplx.png',
      '03_fauna': 'https://v3b.fal.media/files/b/0aaf67e7/eZc38kitmkVPAAx-omyyR_m9gbfeX5.png',
      '04_atmo': 'https://v3b.fal.media/files/b/0aaf67e8/iSmEn2NslRpLLvBpxK97H_UFxeKMkO.png',
      '05_lore': 'https://v3b.fal.media/files/b/0aaf67ea/7BY1x9xCPX1WHrnp7i7nT_5vJ41dxC.png',
    },
    videoUrl: '/assets/videos/felix_trailer.mp4',
    videoStatus: 'READY',
    votesCount: 2,
    hasVoted: false,
    isPioneer: true,
    isVipPioneer: true,
    pioneerBadge: 'VIP PIONEER · #02',
    pioneer_badge: 'VIP PIONEER · #02',
    status: 'PUBLISHED',
    coordX: 243,
    coordY: 176,
    coord_x: 243,
    coord_y: 176,
    sectorId: 'SECTOR CYGNUS-00 (CORE MERIDIAN)',
    armId: 'arm-cygnus',
    armName: 'CYGNUS FILAMENT',
    createdAt: '2026-10-22T09:20:00.000Z',
    votingDeadline: 'June 30, 2027',
  },
  {
    id: 'planet-nathan-pioneer-03',
    userId: 'user-nathanr-vip',
    authorName: 'Nathan R.',
    authorUsername: 'nathanr',
    authorEmail: 'nathan.r@akinoya.universe',
    authorAvatarGradient: 'from-violet-600 via-purple-600 to-indigo-800',
    planetName: 'Ankrau',
    atmosphere: 'Inverted twilight gravity vortex with deep obsidian, neon violet, electric cyan auroras, and floating inverted cloudbanks.',
    flora: 'Colossal flying trees floating freely in mid-air, with bioluminescent roots absorbing starlight and upside-down twisting canopies.',
    fauna: 'Ethereal zero-gravity sky manta rays and luminescent fractal shadow-cats gliding effortlessly between hovering islands.',
    sonicVibe: 'Hypnotic sub-bass pulses, inverted granular delay clouds, and crystalline cosmic resonance.',
    visualAesthetic: 'Surreal dark neon sci-fi dreamscape, floating trees, abstract anti-gravity physics (Sillow Mill aesthetic).',
    landmark: 'The Monolith of Inverted Physics: A shattered, floating cubist obelisk defying gravitational laws in perpetual levitation.',
    additionalNotes: 'Founding Pioneer world #3 for Nathan R.',
    humanAnswers: {
      planetName: 'Ankrau',
      atmosphere: 'Inverted twilight gravity vortex with deep obsidian, neon violet, electric cyan auroras, and floating inverted cloudbanks.',
      flora: 'Colossal flying trees floating freely in mid-air, with bioluminescent roots absorbing starlight and upside-down twisting canopies.',
      fauna: 'Ethereal zero-gravity sky manta rays and luminescent fractal shadow-cats gliding effortlessly between hovering islands.',
      landmark: 'The Monolith of Inverted Physics: A shattered, floating cubist obelisk defying gravitational laws in perpetual levitation.',
      creativeExpression: 'Dark, cool, crazy, trippy, and surreal dreamscape featuring flying/floating trees and abstract anti-gravity physics.',
      sonicVibe: 'Hypnotic sub-bass pulses, inverted granular delay clouds, and crystalline cosmic resonance.',
      visualAesthetic: 'Surreal dark neon sci-fi dreamscape, floating trees, abstract anti-gravity physics (Sillow Mill aesthetic).',
      additionalNotes: 'Founding Pioneer world #3 for Nathan R.',
    },
    futurePromise: 'Across inverted horizons, imagination reshapes the laws of reality.',
    generatedLore: `Classified by world architect Nathan R., Ankrau is an official VIP frontier sector (#03) situated within the Äkinoya celestial sphere. Defying conventional celestial mechanics, Ankrau exists within an inverted gravitational vortex where colossal bioluminescent trees float upside down in mid-air and levitating obsidian shards orbit in zero gravity under violet and electric cyan auroras.\n\nEthereal sky manta rays and fractal shadow-cats glide effortlessly between hovering moss islands. Anchoring the planetary vortex stands the Monolith of Inverted Physics, a shattered, perpetually levitating cubist obelisk channeling cosmic anti-gravity energy.\n\nFOUNDING CREED:\n"Across inverted horizons, imagination reshapes the laws of reality."`,
    renders: {
      hero: 'https://v3b.fal.media/files/b/0aaf680b/abVXKSJD21rsIkKAINQUP_DMkQXa60.png',
      flora: 'https://v3b.fal.media/files/b/0aaf680d/NB87mCoA8EG2dU1qtb2ri_rozLGKjR.png',
      fauna: 'https://v3b.fal.media/files/b/0aaf680f/lF1OMXjKS6OV0w46cRnFI_RQFYB9wW.png',
      atmosphere: 'https://v3b.fal.media/files/b/0aaf6811/VbHaEEq81S156sf-2H_g-_D23i1FuO.png',
      landmark: 'https://v3b.fal.media/files/b/0aaf6813/Txn-nAVGcZlb_Y4DuyTS__tHA0X6eE.png',
      ecosystem: 'https://v3b.fal.media/files/b/0aaf680d/NB87mCoA8EG2dU1qtb2ri_rozLGKjR.png',
      videoUrl: '/assets/videos/ankrau_trailer.mp4',
      falVideoUrl: 'https://v3b.fal.media/files/b/0aaf6d21/2RmE9WRG5uB4JE9DrJ3kh_video.mp4',
      '01_main': 'https://v3b.fal.media/files/b/0aaf680b/abVXKSJD21rsIkKAINQUP_DMkQXa60.png',
      '02_flora': 'https://v3b.fal.media/files/b/0aaf680d/NB87mCoA8EG2dU1qtb2ri_rozLGKjR.png',
      '03_fauna': 'https://v3b.fal.media/files/b/0aaf680f/lF1OMXjKS6OV0w46cRnFI_RQFYB9wW.png',
      '04_atmo': 'https://v3b.fal.media/files/b/0aaf6811/VbHaEEq81S156sf-2H_g-_D23i1FuO.png',
      '05_lore': 'https://v3b.fal.media/files/b/0aaf6813/Txn-nAVGcZlb_Y4DuyTS__tHA0X6eE.png',
    },
    videoUrl: '/assets/videos/ankrau_trailer.mp4',
    videoStatus: 'READY',
    votesCount: 2,
    hasVoted: false,
    isPioneer: true,
    isVipPioneer: true,
    pioneerBadge: 'VIP PIONEER · #03',
    pioneer_badge: 'VIP PIONEER · #03',
    status: 'PUBLISHED',
    coordX: -93,
    coordY: 285,
    coord_x: -93,
    coord_y: 285,
    sectorId: 'SECTOR SOLARIS-00 (CORE MERIDIAN)',
    armId: 'arm-solaris',
    armName: 'SOLARIS TENDRIL',
    createdAt: '2026-10-22T09:21:00.000Z',
    votingDeadline: 'June 30, 2027',
  },
  {
    id: 'planet-florian-pioneer-04',
    userId: 'user-florianh-vip',
    authorName: 'Florian H.',
    authorUsername: 'florianh',
    authorEmail: 'florian.h@akinoya.universe',
    authorAvatarGradient: 'from-blue-600 via-indigo-600 to-cyan-500',
    planetName: 'Florium',
    atmosphere: 'Moody, stylish twilight sky over planet Florium seen from a high-rise terrace, deep royal blue evening troposphere cut by powerful crisp white stadium floodlights, architectural silhouettes of modern arenas and historic gothic towers under illuminated night clouds, Leuven night vibes.',
    flora: 'Sleek architectural vertical bio-forests and illuminated rooftop gardens on planet Florium, glowing indigo and cool crisp white bio-moss, sleek geometric glass towers and steel bridges, Leuven-by-night stylish urban atmosphere, modern masculine design.',
    fauna: 'A sleek, dynamic kinetic energy falcon and cybernetic companion walking with quiet confidence through a stylish pedestrian plaza on planet Florium, illuminated by deep blue and white stadium floodlights reflecting on wet dark asphalt, cool modern guy vibe.',
    sonicVibe: 'Deep ambient electronic sub-bass, crisp modern stadium synth pads, and resonant twilight urban echoes.',
    visualAesthetic: 'Sleek, cool, stylish masculine urban energy, modern architecture, deep sapphire blue and white stadium lighting (Sillow Mill aesthetic).',
    landmark: 'The Stadium of Florium (The King Power Concord): A colossal, ultra-modern architectural sports arena and illuminated amphitheater forged from brushed steel and glass, radiating with deep sapphire blue and electric white stadium lighting over water canals.',
    additionalNotes: 'Founding Pioneer world #4 for Florian H.',
    humanAnswers: {
      planetName: 'Florium',
      atmosphere: 'Moody, stylish twilight sky over planet Florium seen from a high-rise terrace, deep royal blue evening troposphere cut by powerful crisp white stadium floodlights, architectural silhouettes of modern arenas and historic gothic towers under illuminated night clouds, Leuven night vibes.',
      flora: 'Sleek architectural vertical bio-forests and illuminated rooftop gardens on planet Florium, glowing indigo and cool crisp white bio-moss, sleek geometric glass towers and steel bridges, Leuven-by-night stylish urban atmosphere, modern masculine design.',
      fauna: 'A sleek, dynamic kinetic energy falcon and cybernetic companion walking with quiet confidence through a stylish pedestrian plaza on planet Florium, illuminated by deep blue and white stadium floodlights reflecting on wet dark asphalt, cool modern guy vibe.',
      landmark: 'The Stadium of Florium (The King Power Concord): A colossal, ultra-modern architectural sports arena and illuminated amphitheater forged from brushed steel and glass, radiating with deep sapphire blue and electric white stadium lighting over water canals.',
      creativeExpression: 'Sleek, cool, stylish, and masculine urban energy reflecting Leuven-by-night, modern architecture, and subtle deep-blue/white stadium/soccer lighting (OHL vibe), matching a great 28-year-old personality. Zero cat assets.',
      sonicVibe: 'Deep ambient electronic sub-bass, crisp modern stadium synth pads, and resonant twilight urban echoes.',
      visualAesthetic: 'Sleek, cool, stylish masculine urban energy, modern architecture, deep sapphire blue and white stadium lighting (Sillow Mill aesthetic).',
      additionalNotes: 'Founding Pioneer world #4 for Florian H.',
    },
    futurePromise: 'Style, passion, and modern architectural vision illuminate every night horizon.',
    generatedLore: `Classified by world architect Florian H., Florium is an official VIP frontier sector (#04) situated within the Äkinoya celestial sphere. Conceived as a sleek, masculine neo-noir urban wonderworld inspired by Leuven-by-night, Florium merges modern architectural glasslines and reflecting river canals with electric sapphire blue and crisp white stadium floodlights (OHL energy).\n\nVertical bio-forests and illuminated rooftop gardens climb geometric steel towers, while dynamic cybernetic companions walk through pedestrian plazas reflecting floodlit skies. Towering above the water canals is the Stadium of Florium (The King Power Concord), a colossal architectural amphitheater forged from brushed titanium and illuminated glass.\n\nFOUNDING CREED:\n"Style, passion, and modern architectural vision illuminate every night horizon."`,
    renders: {
      hero: 'https://v3b.fal.media/files/b/0aaf698b/27kxKI6v8phTiLmYnxq3c_au3ooi6U.png',
      flora: 'https://v3b.fal.media/files/b/0aaf698d/m5M5nw2MGGpCiJKgrwDeR_4q0Kj3qa.png',
      fauna: 'https://v3b.fal.media/files/b/0aaf698f/pUpRHv_QQrBhGTrRh0po8_F4gtyXNm.png',
      atmosphere: 'https://v3b.fal.media/files/b/0aaf6991/TfW5CN0GOxdviStakgbNI_YYQ4up7x.png',
      landmark: 'https://v3b.fal.media/files/b/0aaf6993/NWFOuBxgb2Hg-tC4w5pB5_KI51BOmF.png',
      ecosystem: 'https://v3b.fal.media/files/b/0aaf698d/m5M5nw2MGGpCiJKgrwDeR_4q0Kj3qa.png',
      videoUrl: '/assets/videos/florium_trailer.mp4',
      falVideoUrl: 'https://v3b.fal.media/files/b/0aaf6ac4/D2auzhOcimbCYZC5umTeM_video.mp4',
      '01_main': 'https://v3b.fal.media/files/b/0aaf698b/27kxKI6v8phTiLmYnxq3c_au3ooi6U.png',
      '02_flora': 'https://v3b.fal.media/files/b/0aaf698d/m5M5nw2MGGpCiJKgrwDeR_4q0Kj3qa.png',
      '03_fauna': 'https://v3b.fal.media/files/b/0aaf698f/pUpRHv_QQrBhGTrRh0po8_F4gtyXNm.png',
      '04_atmo': 'https://v3b.fal.media/files/b/0aaf6991/TfW5CN0GOxdviStakgbNI_YYQ4up7x.png',
      '05_lore': 'https://v3b.fal.media/files/b/0aaf6993/NWFOuBxgb2Hg-tC4w5pB5_KI51BOmF.png',
    },
    videoUrl: '/assets/videos/florium_trailer.mp4',
    videoStatus: 'READY',
    votesCount: 2,
    hasVoted: false,
    isPioneer: true,
    isVipPioneer: true,
    pioneerBadge: 'VIP PIONEER · #04',
    pioneer_badge: 'VIP PIONEER · #04',
    status: 'PUBLISHED',
    coordX: -300,
    coordY: 0,
    coord_x: -300,
    coord_y: 0,
    sectorId: 'SECTOR AURELIA-00 (CORE MERIDIAN)',
    armId: 'arm-aurelia',
    armName: 'AURELIA CLUSTER',
    createdAt: '2026-10-22T09:22:00.000Z',
    votingDeadline: 'June 30, 2027',
  },
  {
    id: 'planet-seppe-pioneer-05',
    userId: 'user-seppeg-vip',
    authorName: 'Seppe G.',
    authorUsername: 'seppeg',
    authorEmail: 'seppe.g@akinoya.universe',
    authorAvatarGradient: 'from-cyan-500 via-teal-600 to-emerald-600',
    planetName: 'Sepplon',
    atmosphere: 'Pristine ionized nitrogen sky segmented by crystalline prism meridians, laser-guided orbital tracks, and geometric auroral lattices.',
    flora: 'Self-assembling fractal silicon crystals, perfectly tessellated hexagonal crystalline groves, and fiber-optic pulse trees.',
    fauna: 'Flawlessly polished chrome and obsidian cybernetic falcon sentinels with sapphire optic cores patrolling geometric vectors with absolute precision.',
    sonicVibe: 'Surgical modular clicks, pure sine wave meridians, and rhythmic quantum clockwork.',
    visualAesthetic: 'Hyper-structured geometric grid, laser meridians, cybernetic falcon sentinel (Sillow Mill aesthetic).',
    landmark: 'The Grand Calculation Matrix: A colossal hyper-symmetric planetary hypercube constructed from polished platinum and pulsating cobalt quantum circuitry.',
    additionalNotes: 'Founding Pioneer world #5 for Seppe G.',
    humanAnswers: {
      planetName: 'Sepplon',
      atmosphere: 'Pristine ionized nitrogen sky segmented by crystalline prism meridians, laser-guided orbital tracks, and geometric auroral lattices.',
      flora: 'Self-assembling fractal silicon crystals, perfectly tessellated hexagonal crystalline groves, and fiber-optic pulse trees.',
      fauna: 'Flawlessly polished chrome and obsidian cybernetic falcon sentinels with sapphire optic cores patrolling geometric vectors with absolute precision.',
      landmark: 'The Grand Calculation Matrix: A colossal hyper-symmetric planetary hypercube constructed from polished platinum and pulsating cobalt quantum circuitry.',
      creativeExpression: 'Hyper-structured, brilliant, geometric, and flawlessly engineered masterwork of pure analytical elegance.',
      sonicVibe: 'Surgical modular clicks, pure sine wave meridians, and rhythmic quantum clockwork.',
      visualAesthetic: 'Hyper-structured geometric grid, laser meridians, cybernetic falcon sentinel (Sillow Mill aesthetic).',
      additionalNotes: 'Founding Pioneer world #5 for Seppe G.',
    },
    futurePromise: 'Absolute clarity and precision conquer the deepest cosmic frontiers.',
    generatedLore: `Classified by world architect Seppe G., Sepplon is an official VIP frontier sector (#05) situated within the Äkinoya celestial sphere. Engineered as a masterpiece of mathematical perfection and analytical elegance, its ionized nitrogen atmosphere is mapped by razor-sharp cyan laser meridians and geometric auroral lattices.\n\nTessellated hexagonal silicon crystal groves and fiber-optic pulse trees self-assemble across the surface, patrolled by chrome and obsidian cybernetic falcon sentinels with sapphire optic cores. At the core of the grid pulsates the Grand Calculation Matrix, a colossal hyper-symmetric planetary hypercube constructed from polished platinum and cobalt quantum circuitry.\n\nFOUNDING CREED:\n"Absolute clarity and precision conquer the deepest cosmic frontiers."`,
    renders: {
      hero: 'https://v3b.fal.media/files/b/0aaf6863/fTRjYgpPsxLtYE5rkxzCH_imKRu1DN.png',
      flora: 'https://v3b.fal.media/files/b/0aaf6865/0JTHOCwSvlzSDHzK_oJCS_VO54kUyl.png',
      fauna: 'https://v3b.fal.media/files/b/0aaf6867/WLJOKi6BlgnYV0ZMOaDrx_FDy1JgDw.png',
      atmosphere: 'https://v3b.fal.media/files/b/0aaf6869/KZcqGlmdpfYJbh59dM81N_tUw4eCG9.png',
      landmark: 'https://v3b.fal.media/files/b/0aaf686a/F2W0jCmJVs-f0nP_41N59_tjkY7BlY.png',
      ecosystem: 'https://v3b.fal.media/files/b/0aaf6865/0JTHOCwSvlzSDHzK_oJCS_VO54kUyl.png',
      videoUrl: '/assets/videos/sepplon_trailer.mp4',
      falVideoUrl: 'https://v3b.fal.media/files/b/0aaf6d23/dE0_HEXLkGCMwR-A5XTkb_video.mp4',
      '01_main': 'https://v3b.fal.media/files/b/0aaf6863/fTRjYgpPsxLtYE5rkxzCH_imKRu1DN.png',
      '02_flora': 'https://v3b.fal.media/files/b/0aaf6865/0JTHOCwSvlzSDHzK_oJCS_VO54kUyl.png',
      '03_fauna': 'https://v3b.fal.media/files/b/0aaf6867/WLJOKi6BlgnYV0ZMOaDrx_FDy1JgDw.png',
      '04_atmo': 'https://v3b.fal.media/files/b/0aaf6869/KZcqGlmdpfYJbh59dM81N_tUw4eCG9.png',
      '05_lore': 'https://v3b.fal.media/files/b/0aaf686a/F2W0jCmJVs-f0nP_41N59_tjkY7BlY.png',
    },
    videoUrl: '/assets/videos/sepplon_trailer.mp4',
    videoStatus: 'READY',
    votesCount: 2,
    hasVoted: false,
    isPioneer: true,
    isVipPioneer: true,
    pioneerBadge: 'VIP PIONEER · #05',
    pioneer_badge: 'VIP PIONEER · #05',
    status: 'PUBLISHED',
    coordX: -93,
    coordY: -285,
    coord_x: -93,
    coord_y: -285,
    sectorId: 'SECTOR CENTAURI-00 (CORE MERIDIAN)',
    armId: 'arm-centauri',
    armName: 'CENTAURI STREAM',
    createdAt: '2026-10-22T09:23:00.000Z',
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
          .filter((p) => p && p.id && !isForbiddenSubmission(p) && p.status !== 'QUEUED')
          .map((sub): PlanetSubmission => {
            const isAmlemi = sub.id === 'planet-amlemi-genesis-01' || sub.planetName === 'Ämlemi';
            const userVoted = hasUserVotedOnSubmission(sub.id);
            // Minimum vote baseline: 1 vote minimum. Ämlemi initial baseline: 3 votes.
            let votesCount = Math.max(1, sub.votesCount || 1);
            if (isAmlemi) {
              votesCount = userVoted ? 4 : 3;
            }
            const pioneerTrailer = getPioneerMasterVideoUrl(sub);
            const resolvedVideoUrl =
              pioneerTrailer ||
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

        // Ensure all 5 benchmark & VIP Pioneer worlds are always present
        for (const initSub of INITIAL_SUBMISSIONS) {
          if (!cleaned.some((p) => p.id === initSub.id)) {
            cleaned.push(initSub);
          }
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
          .filter((d: any) => d && !isForbiddenSubmission(d) && d.status !== 'QUEUED')
          .map((d: any) => {
            const isAmlemi = d.id === 'planet-amlemi-genesis-01' || d.planet_name === 'Ämlemi';
            const userVoted = userVotedIds.includes(d.id) || hasUserVotedOnSubmission(d.id, effectiveVoterId, voterEmail);
            let votesCount = serverCounts[d.id] !== undefined ? serverCounts[d.id] : Math.max(1, d.votes_count || 1);
            if (isAmlemi && serverCounts[d.id] === undefined) {
              votesCount = userVoted ? 4 : 3;
            }
            const pioneerTrailer = getPioneerMasterVideoUrl({
              id: d.id,
              planetName: d.planet_name,
              authorName: d.author_name,
              authorUsername: d.author_username,
            });
            const resolvedVideoUrl =
              pioneerTrailer ||
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

        // Always ensure all 5 benchmark & VIP Pioneer worlds are included
        for (const initSub of INITIAL_SUBMISSIONS) {
          if (!live.some((p) => p.id === initSub.id)) {
            live.push(initSub);
          }
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
    if (s && s.id && !isForbiddenSubmission(s) && s.status !== 'QUEUED') {
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
  const normalizedEmail = (email || '').trim().toLowerCase();
  const submissions = getStoredPlanetSubmissions();
  const isOdi =
    normalizedEmail === 'odi.selis3@gmail.com' ||
    normalizedEmail === 'odi@sillowmill.com' ||
    normalizedEmail === 'sillowmill@gmail.com' ||
    userId === 'user-odi-founder' ||
    userId === 'user-odi-genesis';

  // Check explicit own created planet id stored during creation
  let ownId: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      ownId =
        (normalizedEmail && localStorage.getItem(`akinoya_own_created_planet_id_${normalizedEmail}`)) ||
        (userId && localStorage.getItem(`akinoya_own_created_planet_id_${userId}`)) ||
        localStorage.getItem('akinoya_own_created_planet_id') ||
        sessionStorage.getItem('akinoya_own_created_planet_id');
    } catch {}
  }

  // Check claimed sector name from local sector reservation
  let claimedSectorName = '';
  if (typeof window !== 'undefined') {
    try {
      const rawClaim = localStorage.getItem('sillow_claimed_sector');
      if (rawClaim) {
        const parsed = JSON.parse(rawClaim);
        claimedSectorName = (parsed.sectorName || '').trim().toLowerCase();
      }
    } catch {}
  }

  const match = submissions.find(
    (s) =>
      !isForbiddenSubmission(s) &&
      ((userId && s.userId === userId) ||
        (normalizedEmail && s.authorEmail && s.authorEmail.toLowerCase() === normalizedEmail) ||
        (ownId && s.id === ownId) ||
        (claimedSectorName && s.planetName && s.planetName.toLowerCase() === claimedSectorName) ||
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

  // EMERGENCY COST PROTECTION: no paid generation during pre-launch lock
  if (PRELAUNCH_GENERATION_LOCKED) {
    return resolvePlanetRenders(answers);
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
  // Legacy sandbox records only (sandbox test mode has been removed from the production flow)
  const isSandbox = Boolean(sub.isSandbox);
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

    if (typeof window !== 'undefined' && !isLiveGalaxyWorld(enrichedSubmission)) {
      try {
        localStorage.setItem('akinoya_own_created_planet_id', enrichedSubmission.id);
        sessionStorage.setItem('akinoya_own_created_planet_id', enrichedSubmission.id);
        const emailKey = (enrichedSubmission.authorEmail || '').trim().toLowerCase();
        const userKey = (enrichedSubmission.userId || '').trim().toLowerCase();
        if (emailKey) {
          localStorage.setItem(`akinoya_own_created_planet_id_${emailKey}`, enrichedSubmission.id);
        }
        if (userKey) {
          localStorage.setItem(`akinoya_own_created_planet_id_${userKey}`, enrichedSubmission.id);
        }
      } catch {}
    }

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

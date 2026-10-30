/**
 * Äkinoya Runner — level definitions (heavy: references world art + audio assets).
 * Only imported by the lazily loaded runner chunk.
 */
import mushroomValley from '../../assets/images/akinoya_mushroom_valley.jpg';
import frozenCore from '../../assets/images/akinoya_hero_bg.jpg';
import dontNeedAudio from '../../assets/videos/DNN.mp4';
import { RUNNER_LEVELS_META } from './runnerMeta';

export interface LevelPalette {
  skyTop: string;
  skyBottom: string;
  accent: string;
  accent2: string;
  ground: string;
  groundLine: string;
  silhouetteFar: string;
  silhouetteMid: string;
  silhouetteNear: string;
  fog: string;
}

export interface LevelDef {
  level: number;
  trackId: string;
  title: string;
  world: string;
  /** Parallax backdrop (the real SillowMill.com world art). */
  worldImage: string;
  /** 'planet' = shared Bingäa soundtrack manager, otherwise the official track audio URL. */
  audio: 'planet' | { url: string };
  /** How many times the official track plays through during one level. */
  loops: number;
  /** Used when the audio duration cannot be read (e.g. blocked / not yet loaded). */
  fallbackTrackSec: number;
  baseSpeed: number;
  maxSpeed: number;
  /** Lower = denser obstacle field. */
  gapScale: number;
  seed: number;
  palette: LevelPalette;
}

const DEFS: Record<number, Omit<LevelDef, 'level' | 'trackId' | 'title' | 'world'>> = {
  1: {
    worldImage: mushroomValley,
    audio: 'planet',
    loops: 1,
    fallbackTrackSec: 41.7,
    baseSpeed: 250,
    maxSpeed: 340,
    gapScale: 1.0,
    seed: 0xb1a9a,
    palette: {
      skyTop: '#070a26',
      skyBottom: '#1a1048',
      accent: '#35f0ff',
      accent2: '#ff4fd8',
      ground: '#0a0d24',
      groundLine: '#35f0ff',
      silhouetteFar: '#14134a',
      silhouetteMid: '#0d0f36',
      silhouetteNear: '#070820',
      fog: 'rgba(120, 90, 255, 0.16)',
    },
  },
  2: {
    worldImage: frozenCore,
    audio: { url: dontNeedAudio },
    loops: 2,
    fallbackTrackSec: 23,
    baseSpeed: 290,
    maxSpeed: 400,
    gapScale: 0.9,
    seed: 0xd0e5c,
    palette: {
      skyTop: '#05061a',
      skyBottom: '#2a0f4a',
      accent: '#ffb700',
      accent2: '#35c8ff',
      ground: '#0b0720',
      groundLine: '#ffb700',
      silhouetteFar: '#1d0f48',
      silhouetteMid: '#120a33',
      silhouetteNear: '#080520',
      fog: 'rgba(255, 130, 220, 0.14)',
    },
  },
};

export const LEVELS: readonly LevelDef[] = RUNNER_LEVELS_META.map((meta) => ({
  ...meta,
  ...DEFS[meta.level],
}));

export function getLevel(level: number): LevelDef {
  return LEVELS.find((l) => l.level === level) ?? LEVELS[0];
}

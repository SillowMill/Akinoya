/**
 * Äkinoya Runner — lightweight metadata (safe to import statically from the main bundle).
 *
 * Everything heavy (engine, sprite atlas, world art) lives in the lazily loaded
 * `AkinoyaRunner` chunk; this file only holds the track → level mapping and the
 * persisted progression so the hub / navigation can talk to the game without
 * pulling the game code into the main platform bundle.
 */

export interface RunnerLevelMeta {
  /** 1-based level number. */
  level: number;
  /** Visualizer track id (see VISUALIZER_TRACKS in UnlockedExperience). */
  trackId: string;
  title: string;
  world: string;
}

/** Level 1: Bingäa · Level 2: Don't Need. Completing a level unlocks the next. */
export const RUNNER_LEVELS_META: readonly RunnerLevelMeta[] = [
  { level: 1, trackId: '02', title: 'Bingäa', world: 'Mushroom Valley' },
  { level: 2, trackId: '01', title: "Don't Need", world: 'Frozen Core' },
];

export function getRunnerLevelForTrack(trackId: string | null | undefined): number | null {
  if (!trackId) return null;
  return RUNNER_LEVELS_META.find((l) => l.trackId === trackId)?.level ?? null;
}

const STORAGE_KEY = 'akinoya_runner_progress_v1';

export interface RunnerProgress {
  /** Highest unlocked level (>= 1). */
  unlocked: number;
  best: Record<number, number>;
  bestDistance: Record<number, number>;
  stars: Record<number, number>;
}

const DEFAULT_PROGRESS: RunnerProgress = { unlocked: 1, best: {}, bestDistance: {}, stars: {} };

export function loadRunnerProgress(): RunnerProgress {
  if (typeof window === 'undefined') return { ...DEFAULT_PROGRESS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS, best: {}, bestDistance: {}, stars: {} };
    const parsed = JSON.parse(raw) as Partial<RunnerProgress>;
    return {
      unlocked: Math.min(RUNNER_LEVELS_META.length, Math.max(1, Number(parsed.unlocked) || 1)),
      best: parsed.best && typeof parsed.best === 'object' ? parsed.best : {},
      bestDistance: parsed.bestDistance && typeof parsed.bestDistance === 'object' ? parsed.bestDistance : {},
      stars: parsed.stars && typeof parsed.stars === 'object' ? parsed.stars : {},
    };
  } catch {
    return { ...DEFAULT_PROGRESS, best: {}, bestDistance: {}, stars: {} };
  }
}

export function saveRunnerProgress(progress: RunnerProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // storage unavailable (private mode) — progression simply won't persist
  }
}

/** Records a finished run in Endless Mode; unlocks next level if distance threshold is reached. */
export function recordRunnerResult(
  level: number,
  score: number,
  distanceMeters: number,
  _orbs: number
): { progress: RunnerProgress; isNewHigh: boolean; isNewBestDist: boolean; unlockedNext: boolean } {
  const progress = loadRunnerProgress();
  const prevBest = progress.best[level] ?? 0;
  const prevBestDist = progress.bestDistance[level] ?? 0;
  const isNewHigh = score > prevBest;
  const isNewBestDist = distanceMeters > prevBestDist;

  progress.best[level] = Math.max(prevBest, Math.round(score));
  progress.bestDistance[level] = Math.max(prevBestDist, Math.round(distanceMeters));

  // Surviving past 400m in Level 1 unlocks Level 2
  let unlockedNext = false;
  if (level === 1 && distanceMeters >= 400 && progress.unlocked < 2) {
    progress.unlocked = 2;
    unlockedNext = true;
  }

  saveRunnerProgress(progress);
  return { progress, isNewHigh, isNewBestDist, unlockedNext };
}

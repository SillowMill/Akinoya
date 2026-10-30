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
  stars: Record<number, number>;
}

const DEFAULT_PROGRESS: RunnerProgress = { unlocked: 1, best: {}, stars: {} };

export function loadRunnerProgress(): RunnerProgress {
  if (typeof window === 'undefined') return { ...DEFAULT_PROGRESS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS, best: {}, stars: {} };
    const parsed = JSON.parse(raw) as Partial<RunnerProgress>;
    return {
      unlocked: Math.min(RUNNER_LEVELS_META.length, Math.max(1, Number(parsed.unlocked) || 1)),
      best: parsed.best && typeof parsed.best === 'object' ? parsed.best : {},
      stars: parsed.stars && typeof parsed.stars === 'object' ? parsed.stars : {},
    };
  } catch {
    return { ...DEFAULT_PROGRESS, best: {}, stars: {} };
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

/** Records a finished run; unlocks the next level when `completed`. */
export function recordRunnerResult(
  level: number,
  score: number,
  stars: number,
  completed: boolean
): RunnerProgress {
  const progress = loadRunnerProgress();
  progress.best[level] = Math.max(progress.best[level] ?? 0, Math.round(score));
  if (completed) {
    progress.stars[level] = Math.max(progress.stars[level] ?? 0, stars);
    progress.unlocked = Math.min(
      RUNNER_LEVELS_META.length,
      Math.max(progress.unlocked, level + 1)
    );
  }
  saveRunnerProgress(progress);
  return progress;
}

/**
 * EMERGENCY FAL.AI COST PROTECTION — KILL SWITCH (fail-closed)
 *
 * All paid fal.ai generation (Flux / Nano Banana images, Seedance / MiniMax video,
 * MMAudio / Stable Audio SFX) is BLOCKED unless the environment explicitly sets:
 *
 *     FAL_GENERATION_ENABLED=true
 *
 * Layers enforced by this module:
 *  1. `isFalGenerationBlocked()` — single source of truth used by API routes and the
 *     key resolver (`getFalApiKey()` returns '' while blocked, so no request can authenticate).
 *  2. `installFalNetworkGuard()` — patches global `fetch` in the server runtime so any
 *     outbound request to fal.ai / fal.run hosts is rejected immediately, even if some
 *     code path bypasses the route-level checks.
 *
 * Read-only CDN asset hosts (e.g. `*.fal.media`, already-generated files) are NOT blocked.
 */

export const PRELAUNCH_MESSAGE = 'Your world will be available on the ninth of January.';

export const isFalGenerationBlocked = (): boolean => {
  const flag = String(process.env.FAL_GENERATION_ENABLED || '').trim().toLowerCase();
  return flag !== 'true';
};

/** Paid inference / account API hosts. CDN hosts like `fal.media` are intentionally excluded. */
const BLOCKED_FAL_HOST_PATTERN = /(^|\.)fal\.(run|ai)$/i;

export const isBlockedFalUrl = (input: unknown): boolean => {
  try {
    const raw =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.href
        : input && typeof input === 'object' && 'url' in (input as any)
        ? String((input as any).url)
        : '';
    if (!raw) return false;
    const host = new URL(raw).hostname;
    return BLOCKED_FAL_HOST_PATTERN.test(host);
  } catch {
    return false;
  }
};

export class FalGenerationBlockedError extends Error {
  code = 'FAL_GENERATION_BLOCKED';
  constructor(target?: string) {
    super(`[FAL KILL SWITCH] Outbound fal.ai request blocked${target ? ` (${target})` : ''}. ${PRELAUNCH_MESSAGE}`);
    this.name = 'FalGenerationBlockedError';
  }
}

let guardInstalled = false;

export const installFalNetworkGuard = (): void => {
  if (guardInstalled) return;
  const g = globalThis as any;
  if (typeof g.fetch !== 'function') return;
  const originalFetch = g.fetch.bind(globalThis);
  g.fetch = (input: any, init?: any) => {
    if (isFalGenerationBlocked() && isBlockedFalUrl(input)) {
      let target = '';
      try {
        target = new URL(typeof input === 'string' ? input : input?.url || String(input)).host;
      } catch {}
      console.warn(`[FAL KILL SWITCH] Blocked outbound request to ${target || 'fal.ai'}`);
      return Promise.reject(new FalGenerationBlockedError(target));
    }
    return originalFetch(input, init);
  };
  guardInstalled = true;
};

/** Standard pre-launch response returned instead of any paid generation result. */
export const buildPrelaunchBlockedResponse = (extra: Record<string, unknown> = {}) => ({
  success: false,
  prelaunch: true,
  code: 'PRELAUNCH_GENERATION_LOCKED',
  status: 'QUEUED_PENDING',
  message: PRELAUNCH_MESSAGE,
  ...extra,
});

// Install as early as possible on module load (server runtime only).
installFalNetworkGuard();

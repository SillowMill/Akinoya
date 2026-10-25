import { useEffect, useState } from 'react';

/**
 * Wraps a handler so it runs at most once per animation frame.
 * Prevents scroll/resize listeners from flooding the main thread on older devices.
 */
export function rafThrottle<T extends (...args: never[]) => void>(fn: T): T & { cancel: () => void } {
  let frame = 0;
  let lastArgs: Parameters<T> | null = null;
  const throttled = ((...args: Parameters<T>) => {
    lastArgs = args;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (lastArgs) fn(...lastArgs);
    });
  }) as T & { cancel: () => void };
  throttled.cancel = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };
  return throttled;
}

/** rAF-throttled `window.innerWidth < breakpoint` check. */
export function useIsBelowWidth(breakpoint: number): boolean {
  const [isBelow, setIsBelow] = useState<boolean>(() =>
    typeof window === 'undefined' ? false : window.innerWidth < breakpoint
  );

  useEffect(() => {
    const update = rafThrottle(() => setIsBelow(window.innerWidth < breakpoint));
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    return () => {
      update.cancel();
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [breakpoint]);

  return isBelow;
}

/**
 * Detects mobile in-app browsers (TikTok, Instagram, Facebook, etc.)
 */
export function checkIsInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  return /TikTok|Instagram|FBAN|FBAV|Twitter|Snapchat|Line|MicroMessenger|musical_ly/i.test(ua);
}

/**
 * Detects lower-performance devices (few cores, low memory, reduced-motion preference)
 * or in-app WebViews, flagging <html data-perf="lite"> & <html data-inapp="true">
 * so CSS can drop expensive blurs, glows & shadows for smooth 60 FPS scrolling.
 */
export function applyPerformanceTier(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const cores = nav.hardwareConcurrency || 8;
    const memory = nav.deviceMemory || 8;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const isInApp = checkIsInAppBrowser();
    const isLite = cores <= 4 || memory <= 4 || Boolean(reducedMotion) || isInApp;
    document.documentElement.dataset.perf = isLite ? 'lite' : 'full';
    if (isInApp) {
      document.documentElement.dataset.inapp = 'true';
    }
  } catch {
    // Ignore detection failures; default to full experience
  }
}

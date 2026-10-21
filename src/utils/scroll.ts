/**
 * Universal Smooth Scroll to Visualizer Hub Archive
 *
 * Accurately scrolls and frames the welcoming header widget:
 * "ÄKINOYA VISUALIZER ARCHIVE – VIP ACCESS GRANTED"
 * across all devices (desktop, tablet, mobile), accounting for
 * the sticky top navigation header and comfortable breathing margin.
 */

export const scrollToVisualizerHub = (smooth = true, delay = 0) => {
  if (typeof window === 'undefined') return;

  const performScroll = (): boolean => {
    const target =
      document.getElementById('akinoya-visualizer-archive') ||
      document.getElementById('akinoya-visualizer-archive-header') ||
      document.getElementById('akinoya-visualizer-hub-view');

    if (!target) return false;

    // Detect sticky top navigation bar
    const topBar = document.querySelector('header');
    const topBarHeight = topBar
      ? topBar.getBoundingClientRect().height
      : (window.innerWidth < 640 ? 54 : 64);

    // Responsive breathing margin: 12px on mobile, 20px on tablet/desktop
    const breathingMargin = window.innerWidth < 640 ? 12 : 20;
    const totalOffset = topBarHeight + breathingMargin;

    // Document-relative top position
    const rect = target.getBoundingClientRect();
    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const destinationY = Math.max(0, Math.round(rect.top + currentScrollY - totalOffset));

    // Clear any previous generic scroll restore cache that could fight this navigation
    try {
      sessionStorage.removeItem('akinoya_portal_scroll_y');
    } catch {
      // Ignore
    }

    // Check user preference for reduced motion
    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : (smooth ? 'smooth' : 'auto');

    // 1. Primary programmatic scroll with calculated pixel offset
    window.scrollTo({
      top: destinationY,
      behavior,
    });

    // 2. Secondary fallback using native scrollIntoView if supported
    if (typeof target.scrollIntoView === 'function' && prefersReducedMotion) {
      target.scrollIntoView({ behavior: 'auto', block: 'start' });
    }

    return true;
  };

  const execute = () => {
    // If element is already rendered in DOM, scroll immediately
    if (performScroll()) {
      // Follow-up alignment check after Framer Motion entrance animation settles (~160ms)
      setTimeout(() => {
        performScroll();
      }, 180);
      return;
    }

    // Polling retry for when component is mounting or route is transitioning
    let attempts = 0;
    const maxAttempts = 25; // 25 * 40ms = 1000ms max
    const interval = setInterval(() => {
      attempts++;
      if (performScroll()) {
        clearInterval(interval);
        setTimeout(() => {
          performScroll();
        }, 180);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 40);
  };

  if (delay > 0) {
    setTimeout(execute, delay);
  } else {
    execute();
  }
};

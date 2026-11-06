import React, { useEffect, useRef } from 'react';

/**
 * Star particle data structure for the celestial header animation layer.
 */
interface HeaderStar {
  xPct: number;       // Horizontal position (0..1 percentage of header width)
  yPct: number;       // Vertical position (0..1 percentage of header height)
  radius: number;     // Micro-radius in CSS pixels (0.3px to 1.8px depending on tier)
  baseAlpha: number;  // Minimum breathing opacity (>= 0.20)
  maxAlpha: number;   // Maximum twinkling opacity (<= 0.90)
  speed: number;      // Twinkle pulsation frequency
  phase: number;      // Phase offset [0, 2π]
  color: 'white' | 'cyan' | 'gold';
  hasHalo: boolean;   // Delicate celestial glow for guide stars
}

/**
 * HeaderStarfield — Lightweight, high-performance celestial particle layer
 * positioned exclusively inside the main top navigation header behind the Sillow Mill
 * logo and interactive actions.
 *
 * Performance & Stability Guarantees:
 * - Stable Seed Generation on Mount: Star constellation is generated strictly once upon component mount.
 * - Zero Scroll Re-renders: Scrolling and mobile address bar height shifts do NOT re-generate stars.
 * - Debounced Resize: Window/container resize events throttled to max 1 execution per 250ms.
 * - IntersectionObserver: Animation loop completely freezes when scrolled out of view and resumes instantly.
 * - Strict Visual Parity: Colors, opacities, and radii remain 100% faithful to the celestial palette.
 */
export const HeaderStarfield: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let isIntersecting = true;
    let isDocVisible = typeof document !== 'undefined' ? !document.hidden : true;
    let lastRenderTime = 0;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    const reducedMotion =
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    const isLitePerf =
      typeof document !== 'undefined' &&
      (document.documentElement.dataset.perf === 'lite' ||
        document.documentElement.dataset.inapp === 'true');

    let width = 0;
    let height = 0;
    let dpr = 1;

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. Stable Seed Generation on Mount Only (Strictly Once per Refresh)
    // ─────────────────────────────────────────────────────────────────────────────
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1280;

    let tier: 'desktop' | 'tablet' | 'mobile';
    if (screenW >= 1024) {
      tier = 'desktop';
    } else if (screenW >= 768) {
      tier = 'tablet';
    } else {
      tier = 'mobile';
    }

    // Three-Tier Ultra-Fine Responsive Configuration:
    // Desktop (>= 1024px): 45-60 stars, 0.8px - 1.8px radius
    // Tablet (768px - 1023px): 25-35 stars, 0.5px - 1.2px radius
    // Mobile (< 768px): 15-20 stars, 0.3px - 0.8px radius
    let count: number;
    let minRadius: number;
    let maxRadius: number;
    let guideStarCount: number;

    if (tier === 'desktop') {
      count = isLitePerf ? 38 : 52; // ~45–60 stars
      minRadius = 0.8;
      maxRadius = 1.8;
      guideStarCount = 4;
    } else if (tier === 'tablet') {
      count = isLitePerf ? 20 : 30; // ~25–35 stars
      minRadius = 0.5;
      maxRadius = 1.2;
      guideStarCount = 3;
    } else {
      count = isLitePerf ? 14 : 18; // ~15–20 stars
      minRadius = 0.3;
      maxRadius = 0.8;
      guideStarCount = 2;
    }

    // Generate permanent, immutable constellation positions for this session
    const stars: HeaderStar[] = [];
    for (let i = 0; i < count; i++) {
      const rand = Math.random();
      let color: 'white' | 'cyan' | 'gold' = 'white';
      // Universe palette hierarchy: 55% Starlight White, 30% Faint Cyan, 15% Celestial Gold
      if (rand < 0.55) {
        color = 'white';
      } else if (rand < 0.85) {
        color = 'cyan';
      } else {
        color = 'gold';
      }

      // Guide stars take the upper radius tier; regular stars span the micro-to-mid range
      const isGuideStar = i < guideStarCount;
      const radius = isGuideStar
        ? maxRadius - (maxRadius - minRadius) * 0.25 * Math.random()
        : minRadius + Math.random() * (maxRadius - minRadius) * 0.75;

      stars.push({
        xPct: Math.random(),
        yPct: 0.1 + Math.random() * 0.8, // keep safely away from extreme borders
        radius,
        baseAlpha: 0.2 + Math.random() * 0.1,    // 0.20 .. 0.30
        maxAlpha: 0.78 + Math.random() * 0.12,  // 0.78 .. 0.90
        speed: 0.0014 + Math.random() * 0.0016, // gentle 2.5s - 5s cycle
        phase: Math.random() * Math.PI * 2,
        color,
        hasHalo: isGuideStar,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. Render Single Frame
    // ─────────────────────────────────────────────────────────────────────────────
    const renderFrame = (time: number) => {
      if (!ctx || width === 0 || height === 0) return;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const len = stars.length;
      for (let i = 0; i < len; i++) {
        const star = stars[i];
        const x = star.xPct * width;
        const y = star.yPct * height;

        // Smooth sinusoidal twinkling pulsation strictly bounded between [0.20, 0.90]
        const pulse = 0.5 + 0.5 * Math.sin(time * star.speed + star.phase);
        const alpha = Math.min(0.9, Math.max(0.2, star.baseAlpha + (star.maxAlpha - star.baseAlpha) * pulse));

        let rgb = '245, 248, 255'; // starlight white
        if (star.color === 'cyan') {
          rgb = '103, 232, 249';  // faint celestial cyan (Tailwind cyan-300)
        } else if (star.color === 'gold') {
          rgb = '251, 191, 36';   // delicate starlight gold (Tailwind amber-300)
        }

        // Soft micro-halo for prominent celestial stars
        if (star.hasHalo && alpha > 0.45) {
          const haloRadius = star.radius * 3.2;
          const haloGrad = ctx.createRadialGradient(x, y, 0, x, y, haloRadius);
          haloGrad.addColorStop(0, `rgba(${rgb}, ${alpha * 0.38})`);
          haloGrad.addColorStop(1, `rgba(${rgb}, 0)`);
          ctx.beginPath();
          ctx.arc(x, y, haloRadius, 0, Math.PI * 2);
          ctx.fillStyle = haloGrad;
          ctx.fill();
        }

        // Star core
        ctx.beginPath();
        ctx.arc(x, y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
        ctx.fill();
      }

      ctx.restore();
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. Animation Loop & Viewport Freezing
    // ─────────────────────────────────────────────────────────────────────────────
    const targetInterval = isLitePerf ? 33 : 16;

    const loop = (now: number) => {
      if (!isIntersecting || !isDocVisible) {
        animId = 0;
        return;
      }

      if (now - lastRenderTime >= targetInterval) {
        renderFrame(now);
        lastRenderTime = now;
      }
      animId = requestAnimationFrame(loop);
    };

    const startLoop = () => {
      if (!animId && !reducedMotion && isIntersecting && isDocVisible) {
        lastRenderTime = performance.now();
        animId = requestAnimationFrame(loop);
      }
    };

    const stopLoop = () => {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = 0;
      }
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. Responsive Canvas Resizing with Debounce (Never Mutates Star Seed)
    // ─────────────────────────────────────────────────────────────────────────────
    const handleResize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const newW = Math.round(rect.width);
      const newH = Math.round(rect.height);
      if (newW === 0 || newH === 0) return;

      // Prevent minor sub-pixel or vertical browser toolbar collapses from triggering canvas reallocation
      if (Math.abs(newW - width) < 2 && Math.abs(newH - height) < 2) return;

      width = newW;
      height = newH;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      // Render static frame immediately if in reduced motion or frozen
      if (reducedMotion || !isIntersecting) {
        renderFrame(0);
      }
    };

    // Throttled / debounced resize helper (max 1 execution per 250ms)
    const debouncedResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        handleResize();
      }, 250);
    };

    // Initial dimension setup
    handleResize();

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. IntersectionObserver: Freeze Animation Out of Viewport
    // ─────────────────────────────────────────────────────────────────────────────
    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          const nowVisible = entry ? entry.isIntersecting : true;
          if (nowVisible !== isIntersecting) {
            isIntersecting = nowVisible;
            if (isIntersecting) {
              startLoop();
            } else {
              stopLoop();
            }
          }
        },
        {
          rootMargin: '60px 0px 60px 0px', // Pre-activate slightly before entering viewport
          threshold: 0,
        }
      );
      intersectionObserver.observe(canvas);
    }

    // ResizeObserver tracks container layout shifts with debounce
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        debouncedResize();
      });
      resizeObserver.observe(canvas);
    }

    window.addEventListener('resize', debouncedResize, { passive: true });

    if (!reducedMotion) {
      startLoop();
    }

    // Pause canvas execution completely when tab is backgrounded
    const handleVisibilityChange = () => {
      isDocVisible = !document.hidden;
      if (isDocVisible && isIntersecting) {
        startLoop();
      } else {
        stopLoop();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });

    // ─────────────────────────────────────────────────────────────────────────────
    // 6. Cleanup
    // ─────────────────────────────────────────────────────────────────────────────
    return () => {
      stopLoop();
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener('resize', debouncedResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (resizeObserver) resizeObserver.disconnect();
      if (intersectionObserver) intersectionObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="header-starfield-canvas absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden"
      style={{
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        willChange: 'transform, opacity',
        opacity: 0.95,
      }}
    />
  );
};

export default React.memo(HeaderStarfield);

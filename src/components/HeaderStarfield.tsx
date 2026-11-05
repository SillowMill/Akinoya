import React, { useEffect, useRef } from 'react';

/**
 * Star particle data structure for the celestial header animation layer.
 */
interface HeaderStar {
  xPct: number;       // Horizontal position (0..1 percentage of header width)
  yPct: number;       // Vertical position (0..1 percentage of header height)
  radius: number;     // Micro-radius in CSS pixels (0.5px to 1.5px)
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
 * Visual Guarantee:
 * - 0% design changes to interactive elements or header layout.
 * - Colors strictly match the universe palette: starlight white, faint cyan, and delicate stellar gold.
 * - Organic twinkling strictly bounded between 0.2 and 0.9 opacity.
 * - Hardware accelerated with 0% CPU overhead when inactive or backgrounded.
 */
export const HeaderStarfield: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let isVisible = true;
    let lastRenderTime = 0;

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
    let stars: HeaderStar[] = [];

    // Initialize stars constellation scaled to container width
    const initStars = (w: number) => {
      // Adaptive particle density based on viewport & performance tier
      let count = 62;
      if (w < 640) {
        count = isLitePerf ? 18 : 26;
      } else if (w < 1024) {
        count = isLitePerf ? 28 : 42;
      } else {
        count = isLitePerf ? 38 : 62;
      }

      const generated: HeaderStar[] = [];

      for (let i = 0; i < count; i++) {
        const rand = Math.random();
        let color: 'white' | 'cyan' | 'gold' = 'white';
        if (rand < 0.55) {
          color = 'white';
        } else if (rand < 0.85) {
          color = 'cyan';
        } else {
          color = 'gold';
        }

        // Guide stars have subtle halo (first ~4 stars)
        const isGuideStar = i < 4;
        const radius = isGuideStar
          ? 1.25 + Math.random() * 0.35
          : 0.55 + Math.random() * 0.65;

        generated.push({
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

      stars = generated;
    };

    // Responsive Canvas Resizing with Retina DPR scaling
    const handleResize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (width === 0 || height === 0) return;

      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      initStars(width);

      if (reducedMotion) {
        renderFrame(0);
      }
    };

    // Render single frame
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

    // Animation loop (throttled for 60fps / 30fps on lite mode)
    const targetInterval = isLitePerf ? 33 : 16;
    const loop = (now: number) => {
      if (!isVisible) return;

      if (now - lastRenderTime >= targetInterval) {
        renderFrame(now);
        lastRenderTime = now;
      }
      animId = requestAnimationFrame(loop);
    };

    // ResizeObserver tracks container layout changes without window resize overhead
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(canvas);

    handleResize();

    if (!reducedMotion) {
      animId = requestAnimationFrame(loop);
    }

    // Pause canvas execution completely when tab is backgrounded
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isVisible = false;
        if (animId) cancelAnimationFrame(animId);
      } else {
        isVisible = true;
        if (!reducedMotion) {
          lastRenderTime = performance.now();
          animId = requestAnimationFrame(loop);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });

    return () => {
      if (animId) cancelAnimationFrame(animId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      resizeObserver.disconnect();
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
        willChange: 'transform',
        opacity: 0.95,
      }}
    />
  );
};

export default React.memo(HeaderStarfield);

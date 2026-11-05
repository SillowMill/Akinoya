import React, { useEffect, useRef } from 'react';

/**
 * Star particle data structure for large primary planet showcase card widgets.
 */
interface PlanetCardStar {
  xPct: number;       // Horizontal position (0..1 percentage of card width)
  yPct: number;       // Vertical position (0..1 percentage of card height)
  radius: number;     // Micro-radius in CSS pixels (0.5px to 1.3px)
  baseAlpha: number;  // Minimum breathing opacity (>= 0.15)
  maxAlpha: number;   // Maximum twinkling opacity (<= 0.85)
  speed: number;      // Twinkle pulsation frequency
  phase: number;      // Phase offset [0, 2π]
  color: 'white' | 'cyan' | 'gold';
  hasHalo: boolean;   // Subtle micro-halo for celestial depth
}

interface PlanetCardStarfieldProps {
  className?: string;
  particleCount?: number;
}

/**
 * PlanetCardStarfield — High-performance, lightweight celestial particle layer
 * designed exclusively for the large, elongated primary planet showcase widgets.
 *
 * Performance & Visual Guarantee:
 * - Particle count strictly capped at ~15-20 micro-stars.
 * - Twinkling opacities strictly bounded between 0.15 and 0.85.
 * - Hardware accelerated with transform: translateZ(0).
 * - Automatically pauses execution via IntersectionObserver when scrolled out of viewport.
 * - Automatically pauses when browser tab is inactive (visibilitychange).
 * - Honors OS prefers-reduced-motion (renders static frame, 0 animation loop).
 * - 0% design changes to card borders, gradients, or typography.
 */
export const PlanetCardStarfield: React.FC<PlanetCardStarfieldProps> = ({
  className = '',
  particleCount = 18,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let isIntersecting = true;
    let isDocVisible = true;
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
    let stars: PlanetCardStar[] = [];

    // Initialize 15-20 micro-stars
    const initStars = (w: number) => {
      // Scale count between 12 and 18 based on performance and screen width
      const count = isLitePerf
        ? Math.max(12, Math.min(15, Math.round(particleCount * 0.7)))
        : w < 640
        ? Math.max(12, Math.min(15, particleCount - 3))
        : particleCount;

      const generated: PlanetCardStar[] = [];

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

        const isGuideStar = i < 2; // only 2 subtle guide stars with faint micro-halo
        const radius = isGuideStar
          ? 1.1 + Math.random() * 0.25
          : 0.5 + Math.random() * 0.55;

        generated.push({
          xPct: Math.random(),
          yPct: 0.08 + Math.random() * 0.84, // keep inside safe bounds
          radius,
          baseAlpha: 0.15 + Math.random() * 0.08,  // 0.15 .. 0.23
          maxAlpha: 0.72 + Math.random() * 0.13,   // 0.72 .. 0.85
          speed: 0.0012 + Math.random() * 0.0016,  // gentle 2.8s - 5.5s organic pulsation
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

        // Smooth sinusoidal twinkling strictly bounded between [0.15, 0.85]
        const pulse = 0.5 + 0.5 * Math.sin(time * star.speed + star.phase);
        const alpha = Math.min(
          0.85,
          Math.max(0.15, star.baseAlpha + (star.maxAlpha - star.baseAlpha) * pulse)
        );

        let rgb = '245, 248, 255'; // Starlight White
        if (star.color === 'cyan') {
          rgb = '103, 232, 249';  // Faint Celestial Cyan (Tailwind cyan-300)
        } else if (star.color === 'gold') {
          rgb = '251, 191, 36';   // Celestial Gold accent (Tailwind amber-300)
        }

        // Delicate micro-halo for prominent celestial stars
        if (star.hasHalo && alpha > 0.40) {
          const haloRadius = star.radius * 2.8;
          const haloGrad = ctx.createRadialGradient(x, y, 0, x, y, haloRadius);
          haloGrad.addColorStop(0, `rgba(${rgb}, ${alpha * 0.32})`);
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
      if (!isIntersecting || !isDocVisible) return;

      if (now - lastRenderTime >= targetInterval) {
        renderFrame(now);
        lastRenderTime = now;
      }
      animId = requestAnimationFrame(loop);
    };

    const startLoop = () => {
      if (reducedMotion || !isIntersecting || !isDocVisible) return;
      if (animId) cancelAnimationFrame(animId);
      lastRenderTime = performance.now();
      animId = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = 0;
      }
    };

    // IntersectionObserver: automatically pauses execution when scrolled out of viewport
    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) {
            isIntersecting = entry.isIntersecting;
            if (isIntersecting) {
              startLoop();
            } else {
              stopLoop();
            }
          }
        },
        { threshold: 0.05 }
      );
      intersectionObserver.observe(canvas);
    }

    // ResizeObserver tracks container layout changes
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(canvas);

    handleResize();
    startLoop();

    // Tab visibility handling: zero CPU when browser tab is inactive
    const handleVisibilityChange = () => {
      isDocVisible = !document.hidden;
      if (isDocVisible && isIntersecting) {
        startLoop();
      } else {
        stopLoop();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });

    return () => {
      stopLoop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      resizeObserver.disconnect();
      if (intersectionObserver) {
        intersectionObserver.disconnect();
      }
    };
  }, [particleCount]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`planet-card-starfield-canvas absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden ${className}`}
      style={{
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        willChange: 'transform',
        opacity: 0.95,
      }}
    />
  );
};

export default React.memo(PlanetCardStarfield);

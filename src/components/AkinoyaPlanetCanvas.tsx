import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { rafThrottle } from '../utils/performance';
import exactPlanetDesktop from '../assets/images/akinoya_hero_bg.jpg';
import exactPlanetMobile from '../assets/images/akinoya_hero_bg.jpg';
import akinoyaVistaImg from '../assets/images/akinoya_twilight_world_1790852640934.jpg';

interface AkinoyaPlanetCanvasProps {
  viewMode?: 'orbit' | 'surface';
  hideOverlay?: boolean;
  isUnlocked?: boolean;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  pulseSpeed: number;
  color: string;
}

export const AkinoyaPlanetCanvas: React.FC<AkinoyaPlanetCanvasProps> = ({
  viewMode = 'orbit',
  isUnlocked = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    // Size canvas to the LARGEST viewport so iPad/iOS toolbar collapse never exposes black edges
    const measure = () => ({
      w: window.innerWidth,
      h: Math.max(window.innerHeight, window.screen?.height || 0, document.documentElement.clientHeight),
    });
    let { w: width, h: height } = measure();
    canvas.width = width;
    canvas.height = height;

    // Only re-allocate the canvas on real layout changes (width / orientation), never on
    // toolbar show/hide during scroll — resetting canvas.width wipes it to black on WebKit.
    const handleResize = rafThrottle(() => {
      if (!canvas) return;
      const next = measure();
      if (next.w === width && next.h <= height) return;
      width = canvas.width = next.w;
      height = canvas.height = next.h;
    });

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    // Subtle twinkling stars & bioluminescent energy motes
    const isMobile = window.innerWidth < 768;
    const isLite = document.documentElement.dataset.perf === 'lite';
    const particleCount = isLite ? 35 : isMobile ? 65 : 120; // Optimized for mobile / older CPUs
    const particles: Particle[] = [];
    const colors = [
      'rgba(103, 232, 249, ', // cyan
      'rgba(56, 189, 248, ',  // sky blue
      'rgba(192, 132, 252, ', // purple nebula
      'rgba(255, 255, 255, ', // starlight
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * (isMobile ? 1.8 : 2.2) + 0.6,
        speedX: (Math.random() - 0.5) * (isMobile ? 0.15 : 0.22),
        speedY: (Math.random() - 0.5) * (isMobile ? 0.15 : 0.22),
        opacity: Math.random() * 0.75 + 0.25,
        pulseSpeed: 0.015 + Math.random() * 0.02,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let frame = 0;
    let isRunning = true;

    const render = () => {
      if (!isRunning) return;
      frame++;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const currentOpacity =
          p.opacity * (0.6 + 0.4 * Math.sin(frame * p.pulseSpeed + i));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.max(0.1, currentOpacity)})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    // Pause the animation loop while the tab is hidden to save CPU/battery
    const handleVisibility = () => {
      if (document.hidden) {
        isRunning = false;
        cancelAnimationFrame(animationFrameId);
      } else if (!isRunning) {
        isRunning = true;
        render();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    render();

    return () => {
      isRunning = false;
      handleResize.cancel();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Determine active background image (Background 1 vs Background 2)
  const isBackground2 = isUnlocked ? viewMode !== 'orbit' || true : false;
  const currentBgKey = isUnlocked ? (viewMode === 'orbit' ? 'bg2-world' : 'bg1-landing') : 'bg1-landing';

  return (
    <div
      className="akinoya-bg-layer fixed top-0 left-0 right-0 pointer-events-none overflow-hidden bg-[#050505] z-0"
      style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)', willChange: 'transform' }}
    >
      {/* Background exact photograph representation with Framer Motion smooth cross-fade */}
      <div className="absolute inset-0">
        <AnimatePresence mode="sync">
          {!isUnlocked ? (
            <motion.div
              key="bg1-locked"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              <picture className="w-full h-full block">
                <source media="(max-width: 767px)" srcSet={exactPlanetMobile} />
                <img
                  src={exactPlanetDesktop}
                  alt="Background 1: Planet Äkinoya Locked Landing State"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center filter brightness-[0.92] contrast-[1.05]"
                />
              </picture>
            </motion.div>
          ) : (
            <motion.div
              key={viewMode === 'orbit' ? 'bg2-unlocked-world' : 'bg1-unlocked-orbit'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              <img
                src={viewMode === 'orbit' ? akinoyaVistaImg : exactPlanetDesktop}
                alt="Background 2: Unlocked Äkinoya World State"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center filter brightness-90 contrast-105"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Atmospheric depth overlay for legible typography while retaining artwork beauty */}
      <div className="absolute inset-0 bg-radial from-transparent via-black/35 to-[#050505]/75 pointer-events-none" />

      {/* Twinkling particle layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen opacity-80"
      />
    </div>
  );
};

import React, { useEffect, useRef } from 'react';
import exactPlanetDesktop from '../assets/images/akinoya_exact_planet_1790853678690.jpg';
import exactPlanetMobile from '../assets/images/akinoya_mobile_bg_1790853703270.jpg';
import akinoyaVistaImg from '../assets/images/akinoya_twilight_world_1790852640934.jpg';

interface AkinoyaPlanetCanvasProps {
  viewMode?: 'orbit' | 'surface';
  hideOverlay?: boolean;
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
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Subtle twinkling stars & bioluminescent energy motes
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 65 : 120; // Optimized for mobile CPU/battery
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

    const render = () => {
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

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden bg-[#050505] z-0">
      {/* Background exact photograph representation */}
      <div className="absolute inset-0">
        {viewMode === 'orbit' ? (
          <picture className="w-full h-full block">
            {/* Mobile portrait view: 9:16 aspect ratio */}
            <source
              media="(max-width: 767px)"
              srcSet={exactPlanetMobile}
            />
            {/* Desktop landscape view: 16:9 aspect ratio */}
            <img
              src={exactPlanetDesktop}
              alt="Planet Äkinoya in cosmic orbit with lightning and icy silhouette"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center filter brightness-[0.92] contrast-[1.05]"
            />
          </picture>
        ) : (
          <img
            src={akinoyaVistaImg}
            alt="Äkinoya Twilight Surface Vista"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center filter brightness-80 contrast-110"
          />
        )}
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

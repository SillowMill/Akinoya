import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Compass,
  Search,
  ZoomIn,
  ZoomOut,
  Target,
  Sparkles,
  Trophy,
  Share2,
  X,
  ArrowLeft,
  ChevronRight,
  Globe2,
  Video,
  Download,
  ThumbsUp,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Layers,
  MapPin,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { PlanetSubmission } from '../types/contest';
import {
  getStoredPlanetSubmissions,
  fetchPlanetSubmissions,
  subscribeToPlanetSubmissions,
  togglePlanetSubmissionVote,
  copyPlanetGalaxyLink,
  getPlanetGalaxyLink,
  getPlanetPhotoCards,
  PlanetPhotoCard,
  COMMUNITY_SHARE_VIDEO_MESSAGE,
} from '../data/contest';
import { soundManager } from '../utils/audio';
import { useAuth } from '../context/AuthContext';
import { PlanetDossierModal } from './PlanetDossierModal';
import akinoyaHeroBg from '../assets/images/akinoya_hero_bg.jpg';

interface GalaxyNavigatorProps {
  onBackToHome: () => void;
  onNavigateToContest?: () => void;
  onNavigateToCommunity?: () => void;
  onOpenCreator?: (username: string) => void;
  onNavigateToVisualizerHub?: () => void;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  color: string;
  layer: number; // 0: distant (slow parallax), 1: mid, 2: foreground
}

interface CameraTarget {
  x: number;
  y: number;
  zoom: number;
  startTime: number;
  duration: number;
  startX: number;
  startY: number;
  startZoom: number;
}

const ORBITAL_RINGS = [
  { radius: 500, label: '500 AU · INNER CORE RING', color: 'rgba(245, 158, 11, 0.25)' },
  { radius: 1000, label: '1000 AU · PIONEER ORBIT', color: 'rgba(56, 189, 248, 0.22)' },
  { radius: 1650, label: '1650 AU · IONIZATION REEF', color: 'rgba(168, 85, 247, 0.2)' },
  { radius: 2400, label: '2400 AU · OUTER COMMUNITY EXPEDITIONS', color: 'rgba(56, 189, 248, 0.16)' },
  { radius: 3300, label: '3300 AU · DEEP STELLAR HORIZON', color: 'rgba(255, 255, 255, 0.1)' },
];

export const GalaxyNavigator: React.FC<GalaxyNavigatorProps> = ({
  onBackToHome,
  onNavigateToContest,
  onNavigateToCommunity,
  onOpenCreator,
  onNavigateToVisualizerHub,
}) => {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Community planets state
  const [planets, setPlanets] = useState<PlanetSubmission[]>(() => getStoredPlanetSubmissions());
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetSubmission | null>(null);
  const [hoveredPlanet, setHoveredPlanet] = useState<PlanetSubmission | null>(null);
  const [isAkinoyaModalOpen, setIsAkinoyaModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  // Mobile Bottom Sheet active photo index
  const [mobilePhotoIdx, setMobilePhotoIdx] = useState<number>(0);
  const [mobileIsDownloading, setMobileIsDownloading] = useState<boolean>(false);

  // Pan & Zoom Engine
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 0.65 : 0.85));
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  panRef.current = pan;
  zoomRef.current = zoom;

  // Inertia and Drag Tracking
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const velocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastMoveTimeRef = useRef<number>(0);
  const inertiaAnimRef = useRef<number | null>(null);

  // Two-Finger Pinch Tracking
  const touchesRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);

  // Camera Animation
  const cameraTargetRef = useRef<CameraTarget | null>(null);

  // Starfield Simulation State
  const starsRef = useRef<Star[]>([]);

  // Mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch Supabase and local planets & setup realtime subscription
  useEffect(() => {
    let isMounted = true;
    fetchPlanetSubmissions().then((subs) => {
      if (isMounted && subs.length > 0) {
        setPlanets(subs);
      }
    });

    const unsubscribe = subscribeToPlanetSubmissions((updated) => {
      if (isMounted) {
        setPlanets(updated);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Initialize deterministic Starfield
  useEffect(() => {
    const stars: Star[] = [];
    const count = isMobile ? 320 : 650;
    const colors = ['#ffffff', '#bae6fd', '#fef08a', '#e9d5ff', '#67e8f9'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.pow(Math.random(), 0.55) * 4200;
      const layer = Math.random() < 0.6 ? 0 : Math.random() < 0.88 ? 1 : 2;
      const radius = layer === 0 ? Math.random() * 0.9 + 0.3 : layer === 1 ? Math.random() * 1.3 + 0.8 : Math.random() * 2.2 + 1.2;
      stars.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        radius,
        baseAlpha: Math.random() * 0.6 + 0.25,
        twinkleSpeed: Math.random() * 0.03 + 0.008,
        color: colors[Math.floor(Math.random() * colors.length)],
        layer,
      });
    }
    starsRef.current = stars;
  }, [isMobile]);

  // Smooth Camera Pan to Coordinates
  const panTo = useCallback((targetX: number, targetY: number, targetZoom?: number, duration = 800) => {
    if (inertiaAnimRef.current) {
      cancelAnimationFrame(inertiaAnimRef.current);
      inertiaAnimRef.current = null;
    }

    const currentPan = panRef.current;
    const currentZoom = zoomRef.current;
    const desiredZoom = targetZoom !== undefined ? targetZoom : Math.max(0.75, currentZoom);

    // Screen Center in coordinates: We want (targetX, targetY) to be at screen center (pan.x = -targetX, pan.y = -targetY)
    cameraTargetRef.current = {
      x: -targetX,
      y: -targetY,
      zoom: desiredZoom,
      startTime: performance.now(),
      duration,
      startX: currentPan.x,
      startY: currentPan.y,
      startZoom: currentZoom,
    };
  }, []);

  // Deep-Linking Reader (?planet=... or ?coord=x,y)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const planetId = params.get('planet');
    const coordParam = params.get('coord');

    if (planetId) {
      const found = planets.find((p) => p.id === planetId || p.planetName.toLowerCase() === planetId.toLowerCase());
      if (found) {
        setSelectedPlanet(found);
        panTo(found.coordX ?? 0, found.coordY ?? 0, 1.05, 900);
      }
    } else if (coordParam) {
      const [rawX, rawY] = coordParam.split(',');
      const cx = parseFloat(rawX);
      const cy = parseFloat(rawY);
      if (!isNaN(cx) && !isNaN(cy)) {
        panTo(cx, cy, 1.0, 900);
      }
    }
  }, [planets, panTo]);

  // Canvas Render Loop (Parallax Starfield, Grid Rings & Radial Celestial Rays)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = (time: number) => {
      // 1. Process active camera animation
      if (cameraTargetRef.current) {
        const ct = cameraTargetRef.current;
        const elapsed = time - ct.startTime;
        const progress = Math.min(1, elapsed / ct.duration);
        // EaseInOutCubic
        const ease =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        const nextX = ct.startX + (ct.x - ct.startX) * ease;
        const nextY = ct.startY + (ct.y - ct.startY) * ease;
        const nextZoom = ct.startZoom + (ct.zoom - ct.startZoom) * ease;

        setPan({ x: nextX, y: nextY });
        setZoom(nextZoom);

        if (progress >= 1) {
          cameraTargetRef.current = null;
        }
      }

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const curPan = panRef.current;
      const curZoom = zoomRef.current;

      // 2. Cosmic Background Ambient Gradient
      const bgGrad = ctx.createRadialGradient(
        centerX + curPan.x * curZoom * 0.1,
        centerY + curPan.y * curZoom * 0.1,
        50,
        centerX,
        centerY,
        Math.max(width, height)
      );
      bgGrad.addColorStop(0, '#0a0d1f');
      bgGrad.addColorStop(0.4, '#04060d');
      bgGrad.addColorStop(1, '#010206');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 3. Central Äkinoya Golden Core Glow
      const coreScreenX = centerX + curPan.x * curZoom;
      const coreScreenY = centerY + curPan.y * curZoom;
      const coreGrad = ctx.createRadialGradient(
        coreScreenX,
        coreScreenY,
        10 * curZoom,
        coreScreenX,
        coreScreenY,
        380 * curZoom
      );
      coreGrad.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
      coreGrad.addColorStop(0.3, 'rgba(245, 158, 11, 0.12)');
      coreGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.04)');
      coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(coreScreenX, coreScreenY, 380 * curZoom, 0, Math.PI * 2);
      ctx.fill();

      // Concentric revolving and pulsing golden orbital rings centered symmetrically at Äkinoya Core (0, 0)
      const ringPulse = Math.sin(time * 0.0025);
      const innerRadius = (36 + ringPulse * 1.5) * curZoom;
      const outerRadius = (50 + Math.cos(time * 0.002) * 2) * curZoom;
      const ringAlpha = 0.55 + ringPulse * 0.15;

      ctx.save();
      ctx.translate(coreScreenX, coreScreenY);

      // Inner revolving dashed golden orbital ring
      ctx.save();
      ctx.rotate((time * 0.0006) % (Math.PI * 2));
      ctx.strokeStyle = `rgba(245, 158, 11, ${ringAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8 * curZoom, 6 * curZoom]);
      ctx.beginPath();
      ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Outer counter-revolving dashed golden orbital ring
      ctx.save();
      ctx.rotate((-time * 0.00035) % (Math.PI * 2));
      ctx.strokeStyle = `rgba(251, 191, 36, ${ringAlpha * 0.75})`;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5 * curZoom, 8 * curZoom]);
      ctx.beginPath();
      ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.restore();

      // 4. Parallax Starfield
      const stars = starsRef.current;
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        const parallaxFactor = star.layer === 0 ? 0.08 : star.layer === 1 ? 0.25 : 0.65;
        const sx = centerX + (star.x + curPan.x * parallaxFactor) * (curZoom * 0.85 + 0.15);
        const sy = centerY + (star.y + curPan.y * parallaxFactor) * (curZoom * 0.85 + 0.15);

        // Bounds culling
        if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) continue;

        const twinkle = Math.sin(time * star.twinkleSpeed + i) * 0.25;
        const alpha = Math.max(0.1, Math.min(1, star.baseAlpha + twinkle));

        ctx.fillStyle = star.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(sx, sy, star.radius * Math.min(1.5, Math.max(0.7, curZoom)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // 5. Orbital Distance Rings centered at Äkinoya (0, 0)
      ctx.lineWidth = 1;
      for (const ring of ORBITAL_RINGS) {
        const ringRadius = ring.radius * curZoom;
        if (ringRadius < 5) continue;

        ctx.strokeStyle = ring.color;
        ctx.setLineDash([4 * curZoom, 8 * curZoom]);
        ctx.beginPath();
        ctx.arc(coreScreenX, coreScreenY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Ring distance label badge
        if (ringRadius > 80 && curZoom > 0.4) {
          ctx.font = `${Math.max(9, Math.min(11, 10 * curZoom))}px monospace`;
          ctx.fillStyle = ring.color.replace(/[\d\.]+\)$/, '0.75)');
          ctx.textAlign = 'left';
          ctx.fillText(ring.label, coreScreenX + 10, coreScreenY - ringRadius + 14);
        }
      }
      ctx.setLineDash([]);

      // 6. Subtle Coordinate Crosshair Rays from Core
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(coreScreenX - 3500 * curZoom, coreScreenY);
      ctx.lineTo(coreScreenX + 3500 * curZoom, coreScreenY);
      ctx.moveTo(coreScreenX, coreScreenY - 3500 * curZoom);
      ctx.lineTo(coreScreenX, coreScreenY + 3500 * curZoom);
      ctx.stroke();

      // 7. Hovered Connection Vector Line (from Core to hovered node)
      if (hoveredPlanet && (hoveredPlanet.coordX !== 0 || hoveredPlanet.coordY !== 0)) {
        const px = centerX + (curPan.x + (hoveredPlanet.coordX ?? 0)) * curZoom;
        const py = centerY + (curPan.y + (hoveredPlanet.coordY ?? 0)) * curZoom;
        const distanceAU = Math.round(Math.hypot(hoveredPlanet.coordX ?? 0, hoveredPlanet.coordY ?? 0));

        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(coreScreenX, coreScreenY);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.setLineDash([]);

        // Midpoint distance tag
        const midX = (coreScreenX + px) / 2;
        const midY = (coreScreenY + py) / 2;
        ctx.font = '10px monospace';
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.fillText(`VECTOR: ${distanceAU} AU`, midX, midY - 6);
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [hoveredPlanet]);

  // Pointer Interaction Handlers (Inertia Drag & Gestures)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // If clicking a UI button or modal, do not initiate canvas drag
    if ((e.target as HTMLElement).closest('.interactive-hud-element')) return;

    if (inertiaAnimRef.current) {
      cancelAnimationFrame(inertiaAnimRef.current);
      inertiaAnimRef.current = null;
    }
    cameraTargetRef.current = null;

    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
    velocityRef.current = { x: 0, y: 0 };
    lastMoveTimeRef.current = performance.now();

    // Track multi-touch
    touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touchesRef.current.size === 2) {
      const [t1, t2] = Array.from(touchesRef.current.values());
      pinchStartDistRef.current = Math.hypot(t2.x - t1.x, t2.y - t1.y);
      pinchStartZoomRef.current = zoomRef.current;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;

    touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Handle two-finger pinch-to-zoom
    if (touchesRef.current.size === 2 && pinchStartDistRef.current !== null) {
      const [t1, t2] = Array.from(touchesRef.current.values());
      const currentDist = Math.hypot(t2.x - t1.x, t2.y - t1.y);
      const scale = currentDist / pinchStartDistRef.current;
      const nextZoom = Math.min(2.5, Math.max(0.28, pinchStartZoomRef.current * scale));
      setZoom(nextZoom);
      return;
    }

    const now = performance.now();
    const dt = Math.max(1, now - lastMoveTimeRef.current);
    const dx = e.clientX - lastPointerPosRef.current.x;
    const dy = e.clientY - lastPointerPosRef.current.y;

    const curZoom = zoomRef.current;
    // Map screen movement to universal coordinate delta
    const coordDx = dx / curZoom;
    const coordDy = dy / curZoom;

    setPan((prev) => ({
      x: prev.x + coordDx,
      y: prev.y + coordDy,
    }));

    // Velocity exponential moving average for inertia damping
    velocityRef.current = {
      x: (coordDx / dt) * 16,
      y: (coordDy / dt) * 16,
    };

    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
    lastMoveTimeRef.current = now;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    touchesRef.current.delete(e.pointerId);
    if (touchesRef.current.size < 2) {
      pinchStartDistRef.current = null;
    }

    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    // Apply inertia damping physics
    let vx = velocityRef.current.x;
    let vy = velocityRef.current.y;
    const speed = Math.hypot(vx, vy);

    if (speed > 0.4) {
      const stepInertia = () => {
        vx *= 0.92;
        vy *= 0.92;

        setPan((prev) => ({
          x: prev.x + vx,
          y: prev.y + vy,
        }));

        if (Math.hypot(vx, vy) > 0.08) {
          inertiaAnimRef.current = requestAnimationFrame(stepInertia);
        } else {
          inertiaAnimRef.current = null;
        }
      };
      inertiaAnimRef.current = requestAnimationFrame(stepInertia);
    }
  };

  // Wheel Zoom Centered on Cursor
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (inertiaAnimRef.current) {
      cancelAnimationFrame(inertiaAnimRef.current);
      inertiaAnimRef.current = null;
    }

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const currentZoom = zoomRef.current;
    const nextZoom = Math.min(2.5, Math.max(0.28, currentZoom * zoomFactor));

    setZoom(nextZoom);
  };

  // Zoom Button Controls
  const handleZoomIn = () => {
    soundManager.playTone(660, 0.04);
    setZoom((prev) => Math.min(2.5, prev * 1.25));
  };

  const handleZoomOut = () => {
    soundManager.playTone(520, 0.04);
    setZoom((prev) => Math.max(0.28, prev * 0.8));
  };

  const handleCenterAkinoya = () => {
    soundManager.playTone(800, 0.06);
    panTo(0, 0, isMobile ? 0.68 : 0.9, 800);
  };

  // Search filter
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return planets.filter(
      (p) =>
        p.planetName.toLowerCase().includes(q) ||
        (p.sectorId && p.sectorId.toLowerCase().includes(q)) ||
        p.authorName.toLowerCase().includes(q) ||
        p.authorUsername.toLowerCase().includes(q)
    );
  }, [planets, searchQuery]);

  const handleSelectSearchResult = (planet: PlanetSubmission) => {
    soundManager.playTone(740, 0.06);
    setSearchQuery('');
    setIsSearchFocused(false);
    setSelectedPlanet(planet);
    panTo(planet.coordX ?? 0, planet.coordY ?? 0, 1.1, 850);
  };

  // Planet Click
  const handlePlanetClick = (planet: PlanetSubmission) => {
    soundManager.playTone(680, 0.05);
    setSelectedPlanet(planet);
    setMobilePhotoIdx(0);
    // Smooth camera pan to center clicked node
    panTo(planet.coordX ?? 0, planet.coordY ?? 0, Math.max(1.0, zoomRef.current), 700);
  };

  // Äkinoya Hub Click -> Open Planet Preview / Dossier Widget
  const handleAkinoyaClick = () => {
    soundManager.playTone(880, 0.07);
    setIsAkinoyaModalOpen(true);
    panTo(0, 0, Math.max(1.1, zoomRef.current), 700);
  };

  // Copy Sector Link Handler
  const handleCopySectorLink = async (planetId: string) => {
    soundManager.playTone(720, 0.05);
    const success = await copyPlanetGalaxyLink(planetId);
    if (success) {
      setIsCopiedLink(true);
      setTimeout(() => setIsCopiedLink(false), 2200);
    }
  };

  // Mobile Bottom Sheet Vote Action
  const handleMobileVote = async (planetId: string) => {
    soundManager.playTone(740, 0.06);
    const res = await togglePlanetSubmissionVote(planetId, user?.id);
    setPlanets((prev) =>
      prev.map((p) => (p.id === planetId ? { ...p, votesCount: res.newVotesCount, hasVoted: res.hasVoted } : p))
    );
    if (selectedPlanet && selectedPlanet.id === planetId) {
      setSelectedPlanet((prev) =>
        prev ? { ...prev, votesCount: res.newVotesCount, hasVoted: res.hasVoted } : null
      );
    }
  };

  // Mobile Trailer Download
  const handleMobileDownloadTrailer = async (planet: PlanetSubmission) => {
    const videoUrl = planet.videoUrl || planet.renders?.video_url;
    if (!videoUrl) return;
    soundManager.playTone(740, 0.06);
    setMobileIsDownloading(true);
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = (planet.planetName || 'akinoya-sector').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      link.href = blobUrl;
      link.download = `${safeName}-9x16-trailer.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setMobileIsDownloading(false);
    }
  };

  // Current distance from core in AU
  const distanceAU = Math.round(Math.hypot(pan.x, pan.y));

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      style={{ touchAction: 'none' }}
      className="relative w-full h-[100dvh] bg-[#020308] text-white overflow-hidden select-none cursor-grab active:cursor-grabbing font-sans"
    >
      {/* Background Starfield & Orbit Rings Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

      {/* TOP NAVIGATION BAR / SCI-FI HEADER */}
      <header className="interactive-hud-element absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-[#060914]/95 via-[#060914]/80 to-transparent p-3 sm:p-4 backdrop-blur-md flex items-center justify-between gap-3 border-b border-white/5">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-mono transition-all cursor-pointer min-h-[40px] shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Home</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300 shrink-0">
              <Compass className="w-4 h-4 animate-spin" style={{ animationDuration: '24s' }} />
            </span>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-display font-bold tracking-wider text-white truncate flex items-center gap-2">
                <span>GALAXY NAVIGATOR</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-950 border border-cyan-400/40 text-cyan-300">
                  LIVE 2D/3D MAP
                </span>
              </h1>
              <p className="text-[10px] font-mono text-white/40 truncate hidden sm:block">
                Universal Astrogation Map · Drag to Explore · Scroll or Pinch to Zoom
              </p>
            </div>
          </div>
        </div>

        {/* Global Navigation Links */}
        <div className="flex items-center gap-2 shrink-0">
          {onNavigateToContest && (
            <button
              type="button"
              onClick={onNavigateToContest}
              className="px-3 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 min-h-[40px]"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Contest Showcase</span>
            </button>
          )}

          {onNavigateToCommunity && (
            <button
              type="button"
              onClick={onNavigateToCommunity}
              className="px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-500/30 text-cyan-300 text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 min-h-[40px]"
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Lore Hub</span>
            </button>
          )}
        </div>
      </header>

      {/* FLOATING TOP SEARCH BAR */}
      <div className="interactive-hud-element absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md">
        <div className="relative">
          <div className="relative flex items-center bg-[#070c1a]/90 backdrop-blur-xl border border-cyan-500/40 focus-within:border-amber-400/80 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.18)] transition-all overflow-hidden">
            <Search className="w-4 h-4 text-cyan-400 ml-3.5 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search planet, sector code (e.g. ALPHA-07), architect..."
              className="w-full py-2.5 px-3 bg-transparent text-xs text-white placeholder-white/40 font-mono focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-2 text-white/50 hover:text-white cursor-pointer mr-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Autocomplete Dropdown */}
          {isSearchFocused && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#060914]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-white/5 z-50">
              {searchResults.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectSearchResult(p)}
                  className="p-3 hover:bg-cyan-950/40 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-display font-bold text-white group-hover:text-amber-300 transition-colors">
                        {p.planetName}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-400/30">
                        {p.sectorId || 'SECTOR ALPHA-01'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-white/50 block truncate">
                      By @{p.authorUsername} · ({p.coordX ?? 0}, {p.coordY ?? 0}) AU
                    </span>
                  </div>
                  <button
                    type="button"
                    className="px-2 py-1 rounded-lg bg-cyan-950/80 group-hover:bg-amber-400 group-hover:text-black text-cyan-300 font-mono text-[10px] font-bold transition-all shrink-0 flex items-center gap-1"
                  >
                    <span>Jump</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ASTROGATION COORDINATES HUD (Bottom Left) */}
      <div className="interactive-hud-element absolute bottom-4 left-4 z-30 hidden sm:flex flex-col gap-1.5 p-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 font-mono text-[10.5px] text-white/70 shadow-lg">
        <div className="flex items-center gap-2 text-cyan-300 font-bold">
          <Target className="w-3.5 h-3.5 text-cyan-400" />
          <span>ASTROGATION HUD</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-white/60">
          <span>COORDINATES:</span>
          <span className="text-white font-bold text-right">
            X: {Math.round(-pan.x)} · Y: {Math.round(-pan.y)}
          </span>
          <span>DISTANCE TO CORE:</span>
          <span className="text-amber-300 font-bold text-right">{distanceAU} AU</span>
          <span>OPTICAL ZOOM:</span>
          <span className="text-white font-bold text-right">{(zoom * 100).toFixed(0)}%</span>
          <span>CHARTED WORLDS:</span>
          <span className="text-cyan-300 font-bold text-right">{planets.length} SECTORS</span>
        </div>
      </div>

      {/* FLOATING ACTION CONTROLS (Bottom Right) */}
      <div className="interactive-hud-element absolute bottom-4 right-4 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={handleCenterAkinoya}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.35)] min-h-[42px]"
          title="Center on Capital Core Äkinoya (0, 0)"
        >
          <Target className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Center Äkinoya</span>
        </button>

        <div className="flex items-center bg-black/70 backdrop-blur-xl border border-white/15 rounded-xl p-0.5 shadow-lg">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-white/10" />
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE UNIVERSAL CANVAS / NODES LAYER                                */}
      {/* Container is translated and scaled with pan and zoom                      */}
      {/* ========================================================================= */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: '50%',
          width: 0,
          height: 0,
        }}
      >
        <div
          className="relative pointer-events-auto"
          style={{
            transform: `translate3d(${pan.x * zoom}px, ${pan.y * zoom}px, 0) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isDraggingRef.current ? 'none' : 'transform 0.05s ease-out',
          }}
        >
          {/* ===================================================================== */}
          {/* 1. CAPITAL CORE NODE: ÄKINOYA (X: 0, Y: 0)                            */}
          {/* ===================================================================== */}
          <div
            onClick={handleAkinoyaClick}
            onPointerEnter={() => {
              soundManager.playTone(660, 0.03);
              setHoveredPlanet({
                id: 'akinoya-core',
                userId: 'founder',
                authorName: 'Sillow Mill Core',
                authorUsername: 'akinoya',
                authorEmail: 'contact@sillowmill.com',
                planetName: 'Äkinoya Capital Core',
                coordX: 0,
                coordY: 0,
                sectorId: 'SECTOR AKN-00 (CORE)',
                votesCount: 999,
                status: 'PUBLISHED',
                atmosphere: 'Genesis Capital of the Sillow Mill universe.',
                flora: 'Bioluminescent fungal canopies and resonant crystal spires.',
                fauna: 'High-altitude celestial gliders.',
                sonicVibe: '432Hz ambient harmonic drone.',
                visualAesthetic: 'Cinematic golden twilight sci-fi vista.',
                landmark: 'The Core Citadel of Äkinoya.',
                generatedLore: 'The central gravitational anchor of the Sillow Mill universe.',
                renders: { hero: akinoyaHeroBg },
              } as PlanetSubmission);
            }}
            onPointerLeave={() => setHoveredPlanet(null)}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20 flex items-center justify-center select-none"
            style={{ left: 0, top: 0, width: 56, height: 56 }}
          >
            {/* Multi-layered Pulsing Golden Aura centered symmetrically on (0, 0) */}
            <div className="absolute -inset-7 rounded-full bg-amber-400/20 blur-xl animate-pulse pointer-events-none" />
            <div
              className="absolute -inset-3 rounded-full border border-amber-400/50 animate-spin pointer-events-none"
              style={{ animationDuration: '14s' }}
            />
            <div
              className="absolute -inset-5 rounded-full border border-dashed border-amber-300/40 animate-spin pointer-events-none"
              style={{ animationDuration: '28s', animationDirection: 'reverse' }}
            />

            {/* Core Orb */}
            <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.8)] group-hover:scale-115 transition-transform duration-300 bg-black flex items-center justify-center shrink-0">
              <img
                src={akinoyaHeroBg}
                alt="Äkinoya Capital Core"
                className="w-full h-full object-cover scale-110 group-hover:rotate-12 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/40 via-transparent to-yellow-300/40" />
            </div>

            {/* Capital Core Badge Label - positioned below orb without affecting container coordinates */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 flex flex-col items-center pointer-events-none whitespace-nowrap">
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-mono font-extrabold text-[9px] tracking-widest uppercase shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center gap-1">
                <span>👑 ÄKINOYA CORE (0, 0)</span>
              </span>
              <span className="text-[11px] font-display font-extrabold text-white tracking-wider mt-0.5 group-hover:text-amber-300 transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                Capital of Sillow Mill
              </span>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* 2. COMMUNITY PLANET NODES (Distributed by Deterministic Coordinates) */}
          {/* ===================================================================== */}
          {planets.map((planet) => {
            const posX = planet.coordX ?? 0;
            const posY = planet.coordY ?? 0;
            // Prevent exact overlap with Äkinoya (0, 0)
            if (posX === 0 && posY === 0 && planet.id !== 'akinoya-core') {
              return null;
            }

            const isAmlemi = planet.id === 'planet-amlemi-genesis-01' || planet.planetName === 'Ämlemi';
            const isHovered = hoveredPlanet?.id === planet.id;
            const isSelected = selectedPlanet?.id === planet.id;
            const photoCards = getPlanetPhotoCards(planet);
            const thumbnail = photoCards[0]?.url || planet.renders?.hero || '';
            const isTopVoted = planet.votesCount >= 3;

            return (
              <div
                key={planet.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlanetClick(planet);
                }}
                onPointerEnter={() => {
                  soundManager.playTone(600, 0.025);
                  setHoveredPlanet(planet);
                }}
                onPointerLeave={() => setHoveredPlanet(null)}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10 flex flex-col items-center select-none"
                style={{ left: posX, top: posY }}
              >
                {/* Active / Top-Voted Beacon Ripple */}
                {isTopVoted && (
                  <div className="absolute w-16 h-16 -top-2 -left-2 rounded-full border border-amber-400/50 animate-ping pointer-events-none opacity-40" />
                )}

                {/* Reticle Focus Rings */}
                {(isHovered || isSelected) && (
                  <div
                    className="absolute w-20 h-20 -top-4 -left-4 rounded-full border border-cyan-400/70 animate-spin pointer-events-none"
                    style={{ animationDuration: '8s' }}
                  />
                )}

                {/* Celestial Planet Orb */}
                <div
                  className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 transition-all duration-300 bg-[#070c18] flex items-center justify-center shadow-lg ${
                    isAmlemi
                      ? 'border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)] group-hover:scale-120'
                      : isSelected
                      ? 'border-cyan-400 scale-120 shadow-[0_0_25px_rgba(6,182,212,0.7)]'
                      : isHovered
                      ? 'border-cyan-300 scale-115 shadow-[0_0_20px_rgba(6,182,212,0.5)]'
                      : 'border-white/40 group-hover:border-cyan-300 group-hover:scale-110'
                  }`}
                >
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={planet.planetName}
                      className="w-full h-full object-cover group-hover:rotate-6 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-cyan-950 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
                    </div>
                  )}

                  {/* Gradient atmospheric shell */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/20 pointer-events-none" />
                </div>

                {/* Planet Label Pill */}
                <div className="mt-2 flex flex-col items-center pointer-events-none">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 group-hover:border-cyan-400/60 shadow-md">
                    <span className="text-[8.5px] font-mono text-cyan-400 font-bold tracking-wider uppercase">
                      {planet.sectorId || 'SECTOR'}
                    </span>
                    <span className="text-white/20 text-[8px]">·</span>
                    <span className="text-[8.5px] font-mono text-amber-300 font-bold">
                      {planet.votesCount}★
                    </span>
                  </div>

                  <span className="text-xs font-display font-bold text-white tracking-wide mt-0.5 group-hover:text-cyan-300 transition-colors drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] whitespace-nowrap">
                    {planet.planetName}
                  </span>

                  <span className="text-[9px] font-mono text-white/50 tracking-wider">
                    @{planet.authorUsername}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MOBILE-FIRST SWIPEABLE DOSSIER BOTTOM SHEET / DRAWER                   */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isMobile && selectedPlanet && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="interactive-hud-element fixed bottom-0 left-0 right-0 z-50 bg-[#060914]/98 border-t border-cyan-500/40 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.9)] max-h-[86vh] flex flex-col overflow-hidden backdrop-blur-2xl"
          >
            {/* Drag Handle & Top Action Bar */}
            <div className="p-3 bg-[#080d1d] border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-white/25 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
              <div className="flex items-center gap-2 mt-1 min-w-0">
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-400/40 shrink-0">
                  {selectedPlanet.sectorId || 'SECTOR'}
                </span>
                <h3 className="text-sm font-display font-bold text-white truncate">
                  {selectedPlanet.planetName}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0 mt-1">
                <button
                  type="button"
                  onClick={() => handleCopySectorLink(selectedPlanet.id)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-[10px] font-mono transition-colors cursor-pointer flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3 text-amber-400" />
                  <span>{isCopiedLink ? 'Copied' : 'Share'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPlanet(null)}
                  className="w-8 h-8 rounded-lg bg-white/10 text-white/80 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Mobile Sheet Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 9:16 Video Player or Hero Visual */}
              {selectedPlanet.videoUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
                    <span className="flex items-center gap-1">
                      <Video className="w-3.5 h-3.5 text-cyan-400" />
                      <span>🎥 9:16 VIRAL TRAILER · 5S LOOP</span>
                    </span>
                    <span className="text-emerald-400 font-bold">READY</span>
                  </div>

                  <div className="relative w-full max-w-[220px] aspect-[9/16] mx-auto rounded-2xl overflow-hidden bg-black border border-cyan-400/40 shadow-xl">
                    <video
                      src={selectedPlanet.videoUrl}
                      poster={selectedPlanet.renders?.hero || undefined}
                      controls
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleMobileDownloadTrailer(selectedPlanet)}
                    disabled={mobileIsDownloading}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{mobileIsDownloading ? 'Saving MP4...' : '⬇ Download 9:16 MP4 Trailer'}</span>
                  </button>
                </div>
              ) : (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10">
                  <img
                    src={selectedPlanet.renders?.hero || akinoyaHeroBg}
                    alt={selectedPlanet.planetName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                    <span className="text-xs font-mono text-cyan-300">
                      Coordinates: ({selectedPlanet.coordX ?? 0}, {selectedPlanet.coordY ?? 0}) AU
                    </span>
                  </div>
                </div>
              )}

              {/* 5-Photo Carousel Preview */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider block">
                  5-Photo Visual Archive (01_main – 05_lore)
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {getPlanetPhotoCards(selectedPlanet).map((photo, i) => (
                    <div
                      key={photo.id}
                      onClick={() => setMobilePhotoIdx(i)}
                      className={`relative aspect-square rounded-lg overflow-hidden border cursor-pointer ${
                        mobilePhotoIdx === i ? 'border-amber-400 scale-105' : 'border-white/10 opacity-70'
                      }`}
                    >
                      <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>

              {/* World Lore & Creed */}
              <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white/60">Architect:</span>
                  <span className="text-cyan-300 font-bold">
                    {selectedPlanet.authorName} (@{selectedPlanet.authorUsername})
                  </span>
                </div>
                {selectedPlanet.futurePromise && (
                  <p className="text-xs font-sans text-amber-200/90 italic border-l-2 border-amber-400 pl-2">
                    "{selectedPlanet.futurePromise}"
                  </p>
                )}
                {selectedPlanet.generatedLore && (
                  <p className="text-xs font-sans text-white/80 line-clamp-3">
                    {selectedPlanet.generatedLore}
                  </p>
                )}
              </div>

              {/* Mobile Actions: Cast Vote & Close */}
              <div className="flex items-center gap-2 pt-1 pb-4">
                <button
                  type="button"
                  onClick={() => handleMobileVote(selectedPlanet.id)}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                    selectedPlanet.hasVoted
                      ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black'
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${selectedPlanet.hasVoted ? 'fill-black' : ''}`} />
                  <span>{selectedPlanet.hasVoted ? 'Voted' : `Vote (${selectedPlanet.votesCount})`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPlanet(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 4. DESKTOP FULL CONTEST DOSSIER MODAL                                     */}
      {/* ========================================================================= */}
      {!isMobile && selectedPlanet && (
        <PlanetDossierModal
          planet={selectedPlanet}
          isOpen={Boolean(selectedPlanet)}
          onClose={() => setSelectedPlanet(null)}
          onVote={(id) => handleMobileVote(id)}
          onOpenCreator={onOpenCreator}
        />
      )}

      {/* ========================================================================= */}
      {/* 5. CAPITAL CORE ÄKINOYA MODAL                                             */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAkinoyaModalOpen && (
          <div className="interactive-hud-element fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
            <div className="fixed inset-0" onClick={() => setIsAkinoyaModalOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-lg bg-[#070c18] border border-amber-400/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-amber-400 text-black">
                    <Compass className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-display font-extrabold text-white">
                      Äkinoya · Capital Core
                    </h2>
                    <span className="text-[10px] font-mono text-amber-300">
                      Anchor Coordinates: (0, 0) AU · Capital of Sillow Mill
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAkinoyaModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative aspect-video rounded-xl overflow-hidden border border-amber-400/30 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
                <img
                  src={akinoyaHeroBg}
                  alt="Äkinoya Capital Core · Bingäa Visualizer"
                  className="w-full h-full object-cover scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end justify-between p-3.5">
                  <span className="text-xs font-mono text-cyan-300 font-semibold">
                    Bingäa Visualizer · Protocol Release 2027
                  </span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-400 text-black">
                    CAPITAL CORE
                  </span>
                </div>
              </div>

              <p className="text-xs font-sans text-white/80 leading-relaxed">
                Äkinoya represents the celestial capital core of the Sillow Mill universe.
                All community worlds, pioneer expeditions, and creator sectors orbit outward in
                concentric astronomical harmonic rings calibrated to the golden angle (137.5°).
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAkinoyaModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAkinoyaModalOpen(false);
                    if (onNavigateToVisualizerHub) {
                      onNavigateToVisualizerHub();
                    } else {
                      onBackToHome();
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.35)] flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Go To Visualizer Hub</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GalaxyNavigator;

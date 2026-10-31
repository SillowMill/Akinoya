import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { rafThrottle } from '../utils/performance';
import {
  Compass,
  Search,
  ZoomIn,
  ZoomOut,
  Target,
  Sparkles,
  Trophy,
  X,
  ArrowLeft,
  ChevronRight,
  Globe2,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { PlanetSubmission } from '../types/contest';
import {
  getStoredPlanetSubmissions,
  fetchPlanetSubmissions,
  subscribeToPlanetSubmissions,
  togglePlanetSubmissionVote,
  getPlanetPhotoCards,
  CONSTELLATION_ARMS,
  getSpiralArmAngle,
  ConstellationLayoutMode,
  CONSTELLATION_LAYOUT_VARIANTS,
  OVAL_MATRIX_TRACKS,
  assignMultiVariantCoordinates,
  isForbiddenSubmission,
  isLiveGalaxyWorld,
} from '../data/contest';
import { soundManager } from '../utils/audio';
import { useAuth } from '../context/AuthContext';
import { isFoundingPioneerPlanet, isPioneerPlanet, isVipPioneerPlanet } from '../utils/pioneer';
import { formatAuthorName } from '../utils/holder';
import { PlanetDossierModal } from './PlanetDossierModal';
import { scrollToVisualizerHub } from '../utils/scroll';
import akinoyaHeroBg from '../assets/images/akinoya_hero_bg-CiYAZVRx.jpg';

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
  rotation: number;
  startTime: number;
  duration: number;
  startX: number;
  startY: number;
  startZoom: number;
  startRotation: number;
}

export type PerformanceTier = 'high' | 'medium' | 'low';

const ORBITAL_RINGS = [
  { radius: 300, label: '300 AU · FOUNDATIONAL CAPITAL ORBIT (ÄMLEMI)', color: 'rgba(251, 191, 36, 0.05)' },
  { radius: 540, label: '540 AU · INNER CORE HARMONIC RING', color: 'rgba(255, 255, 255, 0.04)' },
  { radius: 1000, label: '1000 AU · PIONEER ORBIT', color: 'rgba(255, 255, 255, 0.04)' },
  { radius: 1480, label: '1480 AU · IONIZATION REEF', color: 'rgba(255, 255, 255, 0.035)' },
  { radius: 1960, label: '1960 AU · SOLAR FLARE BELT', color: 'rgba(255, 255, 255, 0.035)' },
  { radius: 2440, label: '2440 AU · OUTER COMMUNITY EXPEDITIONS', color: 'rgba(255, 255, 255, 0.03)' },
  { radius: 3400, label: '3400 AU · DEEP STELLAR HORIZON', color: 'rgba(255, 255, 255, 0.03)' },
];

export const GalaxyNavigator: React.FC<GalaxyNavigatorProps> = ({
  onBackToHome,
  onNavigateToContest,
  onNavigateToCommunity,
  onOpenCreator,
  onNavigateToVisualizerHub,
}) => {
  const { user, profile } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const worldRotationWrapperRef = useRef<HTMLDivElement | null>(null);
  const worldLayerRef = useRef<HTMLDivElement | null>(null);

  // Direct-DOM HUD refs for zero-react-rerender 60fps updates
  const hudCoordRef = useRef<HTMLSpanElement | null>(null);
  const hudDistRef = useRef<HTMLSpanElement | null>(null);
  const hudZoomRef = useRef<HTMLSpanElement | null>(null);

  // Community planets state & Pioneer filter
  const [planets, setPlanets] = useState<PlanetSubmission[]>(() => getStoredPlanetSubmissions());
  const [mapFilter, setMapFilter] = useState<'all' | 'pioneer'>('all');
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetSubmission | null>(null);
  const [hoveredPlanet, setHoveredPlanet] = useState<PlanetSubmission | null>(null);

  // Synchronized True Edition Rank for Selected Planet (#1 Ämlemi, #2 Felix, #3+...)
  const selectedPlanetEditionRank = useMemo(() => {
    if (!selectedPlanet) return undefined;
    if (selectedPlanet.id === 'planet-amlemi-genesis-01' || selectedPlanet.planetName?.toLowerCase() === 'ämlemi') return 1;
    if (selectedPlanet.id === 'planet-felix-test-01' || selectedPlanet.planetName?.toLowerCase() === 'felix') return 2;
    const idx = planets.findIndex((p) => p.id === selectedPlanet.id);
    return idx >= 0 ? idx + 1 : undefined;
  }, [selectedPlanet, planets]);
  const [isAkinoyaModalOpen, setIsAkinoyaModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  // Constellation Architectural Layout & Restructure Engine
  // Universal Matrix View Access: Fully enabled across mobile, tablet, and desktop
  const [layoutMode, setLayoutMode] = useState<ConstellationLayoutMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('akinoya_constellation_layout_mode');
        if (saved === 'spiral' || saved === 'matrix') return saved;
      } catch {}
    }
    return 'spiral';
  });
  const [restructureSeed, setRestructureSeed] = useState<number>(0);
  const [isMorphing, setIsMorphing] = useState<boolean>(false);

  // Dynamic Frame Budgeting & Adaptive Performance Scaling (60 FPS Locked)
  const [perfTier, setPerfTier] = useState<PerformanceTier>(() => {
    if (typeof window === 'undefined') return 'high';
    const cores = navigator.hardwareConcurrency || 4;
    const isMobileDevice = window.innerWidth < 768;
    if (cores <= 2 || (isMobileDevice && cores <= 4)) return 'low';
    if (cores <= 4 || isMobileDevice) return 'medium';
    return 'high';
  });
  const perfTierRef = useRef<PerformanceTier>(perfTier);
  perfTierRef.current = perfTier;

  const lastFrameTimestampRef = useRef<number>(performance.now());
  const avgFrameTimeRef = useRef<number>(16.6);
  const frameSampleCountRef = useRef<number>(0);

  // Layout-thrash-free canvas dimensions cache
  const canvasDimsRef = useRef<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  const layoutModeRef = useRef<ConstellationLayoutMode>(layoutMode);
  layoutModeRef.current = layoutMode;

  const animatingRef = useRef<boolean>(false);
  const morphStartTimeRef = useRef<number>(0);
  const nodePositionsRef = useRef<
    Map<
      string,
      {
        currentX: number;
        currentY: number;
        startX: number;
        startY: number;
        targetX: number;
        targetY: number;
      }
    >
  >(new Map());

  // Dynamically compute equilibrium coordinates across active layout mode & seed (purging Zephyria / test entries)
  const layoutPlanets = useMemo(() => {
    const cleaned = planets.filter(
      (p) =>
        p &&
        p.id &&
        !isForbiddenSubmission(p) &&
        // Isolation: newly generated user worlds stay private until admin review / Jan 9, 2027 release
        isLiveGalaxyWorld(p) &&
        p.planetName?.toLowerCase() !== 'zephyria' &&
        !p.planetName?.toLowerCase().includes('zephyria') &&
        !p.id?.toLowerCase().includes('zephyria')
    );
    return assignMultiVariantCoordinates(cleaned, layoutMode, restructureSeed);
  }, [planets, layoutMode, restructureSeed]);

  const filteredPlanets = useMemo(() => {
    const base = mapFilter === 'pioneer' ? layoutPlanets.filter((p) => isPioneerPlanet(p)) : layoutPlanets;
    return [...base].sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));
  }, [layoutPlanets, mapFilter]);

  const pioneerPlanetsCount = useMemo(
    () => layoutPlanets.filter((p) => isPioneerPlanet(p)).length,
    [layoutPlanets]
  );

  interface LatticeEdge {
    nodeA: PlanetSubmission;
    nodeB: PlanetSubmission;
    color: string;
    glowColor: string;
  }

  // Precomputed Constellation Lattice Edges (100% allocation-free and sort-free 60fps render loop)
  const latticeEdges = useMemo<LatticeEdge[]>(() => {
    if (!filteredPlanets || filteredPlanets.length < 2) return [];

    const edges: LatticeEdge[] = [];

    if (layoutMode === 'spiral') {
      const armGroups = new Map<string, PlanetSubmission[]>();
      for (const arm of CONSTELLATION_ARMS) {
        armGroups.set(arm.id, []);
      }
      for (const p of filteredPlanets) {
        if ((p.coordX ?? 0) === 0 && (p.coordY ?? 0) === 0) continue;
        const armId = p.armId || CONSTELLATION_ARMS[0].id;
        if (armGroups.has(armId)) {
          armGroups.get(armId)!.push(p);
        }
      }
      for (const arm of CONSTELLATION_ARMS) {
        const nodes = armGroups.get(arm.id);
        if (!nodes || nodes.length < 2) continue;
        nodes.sort((a, b) => {
          const rA = Math.hypot(a.coordX ?? 0, a.coordY ?? 0);
          const rB = Math.hypot(b.coordX ?? 0, b.coordY ?? 0);
          return rA - rB;
        });
        for (let i = 0; i < nodes.length - 1; i++) {
          edges.push({
            nodeA: nodes[i],
            nodeB: nodes[i + 1],
            color: arm.color,
            glowColor: arm.glowColor,
          });
        }
      }
    } else if (layoutMode === 'matrix') {
      // In Matrix mode, omit inter-planet lattice chords to keep the orbital matrix pristine
      // and prevent thick, stray alignment vectors from connecting across tracks.
      return [];
    }

    return edges;
  }, [filteredPlanets, layoutMode]);

  const latticeEdgesRef = useRef<LatticeEdge[]>(latticeEdges);
  latticeEdgesRef.current = latticeEdges;

  // Dual-Synchronized 60+ FPS Interpolation Coordinator
  useEffect(() => {
    const isFirstRun = nodePositionsRef.current.size === 0;
    const now = performance.now();

    if (!isFirstRun) {
      morphStartTimeRef.current = now;
      animatingRef.current = true;
      setIsMorphing(true);
    }

    filteredPlanets.forEach((p) => {
      const targetX = p.coordX ?? 0;
      const targetY = p.coordY ?? 0;
      const existing = nodePositionsRef.current.get(p.id);

      if (existing && !isFirstRun) {
        nodePositionsRef.current.set(p.id, {
          currentX: existing.currentX,
          currentY: existing.currentY,
          startX: existing.currentX,
          startY: existing.currentY,
          targetX,
          targetY,
        });
      } else {
        nodePositionsRef.current.set(p.id, {
          currentX: targetX,
          currentY: targetY,
          startX: targetX,
          startY: targetY,
          targetX,
          targetY,
        });
      }
    });

    if (!isFirstRun) {
      const timer = setTimeout(() => {
        setIsMorphing(false);
        animatingRef.current = false;
      }, 660);
      return () => clearTimeout(timer);
    }
  }, [layoutMode, restructureSeed, filteredPlanets]);

  // High-frequency Pan, Zoom & Rotation Refs (60fps GPU pipeline without React re-render lag)
  const initialZoom = typeof window !== 'undefined' && window.innerWidth < 768 ? 0.65 : 0.85;
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomRef = useRef<number>(initialZoom);
  const rotationRef = useRef<number>(0);

  const planetsRef = useRef(filteredPlanets);
  planetsRef.current = filteredPlanets;
  const selectedPlanetRef = useRef(selectedPlanet);
  selectedPlanetRef.current = selectedPlanet;
  const hoveredPlanetRef = useRef(hoveredPlanet);
  hoveredPlanetRef.current = hoveredPlanet;

  // DOM Node Recycling & Virtualization Refs (Direct GPU Visibility Management)
  const planetNodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Multi-Touch, Inertia & Gesture Tracking Refs
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedBeyondTapRef = useRef(false);
  const wasMultiTouchRef = useRef(false);
  const lastCentroidRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const velocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastMoveTimeRef = useRef<number>(0);
  const inertiaAnimRef = useRef<number | null>(null);

  // Active Pointers Map & Two-Finger Pinch/Rotate State
  const touchesRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(initialZoom);
  const pinchStartAngleRef = useRef<number | null>(null);
  const pinchStartRotRef = useRef<number>(0);

  // Camera Animation
  const cameraTargetRef = useRef<CameraTarget | null>(null);

  // Starfield Simulation State
  const starsRef = useRef<Star[]>([]);

  // Spatial Viewport Culling & DOM Node Recycling Engine (Eliminates off-screen DOM overhead)
  const updateNodeVisibility = useCallback(() => {
    if (isMorphing) return;

    const width = canvasDimsRef.current.width || window.innerWidth;
    const height = canvasDimsRef.current.height || window.innerHeight;
    const curPan = panRef.current;
    const curZoom = zoomRef.current;
    const curRot = rotationRef.current;

    // Viewport buffer margin so nodes are restored before crossing the edge
    const margin = 200;
    const cosR = curRot === 0 ? 1 : Math.cos(curRot);
    const sinR = curRot === 0 ? 0 : Math.sin(curRot);
    const centerX = width / 2;
    const centerY = height / 2;

    const hoveredId = hoveredPlanetRef.current?.id;
    const selectedId = selectedPlanetRef.current?.id;

    for (const [id, el] of planetNodeRefs.current.entries()) {
      if (!el) continue;
      // Always keep active/selected/hovered/founding nodes visible
      if (id === hoveredId || id === selectedId || id === 'planet-amlemi-genesis-01') {
        if (el.style.display === 'none') el.style.display = '';
        continue;
      }

      const pos = nodePositionsRef.current.get(id);
      const px = pos ? pos.currentX : 0;
      const py = pos ? pos.currentY : 0;

      // Project world coordinate to screen space
      const sxWorld = (px + curPan.x) * curZoom;
      const syWorld = (py + curPan.y) * curZoom;
      const screenX = centerX + (sxWorld * cosR - syWorld * sinR);
      const screenY = centerY + (sxWorld * sinR + syWorld * cosR);

      // Fast AABB intersection test with viewport + margin
      const isVisible =
        screenX >= -margin &&
        screenX <= width + margin &&
        screenY >= -margin &&
        screenY <= height + margin;

      if (isVisible) {
        if (el.style.display === 'none') el.style.display = '';
      } else {
        if (el.style.display !== 'none') el.style.display = 'none';
      }
    }
  }, [isMorphing]);

  // Direct GPU DOM Transform & HUD Synchronizer (Runs in <0.1ms with zero React overhead)
  const syncWorldTransformAndHud = useCallback(() => {
    const curPan = panRef.current;
    const curZoom = zoomRef.current;
    const curRot = rotationRef.current;

    if (worldLayerRef.current) {
      worldLayerRef.current.style.transform = `translate3d(${curPan.x * curZoom}px, ${curPan.y * curZoom}px, 0) scale(${curZoom})`;
    }
    if (worldRotationWrapperRef.current) {
      const deg = (curRot * 180) / Math.PI;
      worldRotationWrapperRef.current.style.transform = `rotate3d(0, 0, 1, ${deg}deg)`;
    }
    if (hudCoordRef.current) {
      hudCoordRef.current.textContent = `X: ${Math.round(-curPan.x)} · Y: ${Math.round(-curPan.y)}`;
    }
    if (hudDistRef.current) {
      hudDistRef.current.textContent = `${Math.round(Math.hypot(curPan.x, curPan.y))} AU`;
    }
    if (hudZoomRef.current) {
      hudZoomRef.current.textContent = `${(curZoom * 100).toFixed(0)}%`;
    }

    // Spatial Viewport Culling & DOM Node Recycling (Skips off-screen rendering)
    updateNodeVisibility();
  }, [updateNodeVisibility]);

  // Re-evaluate node visibility once morph completes
  useEffect(() => {
    if (!isMorphing) {
      updateNodeVisibility();
    } else {
      // During morph, ensure all nodes are visible for the sci-fi transition
      for (const el of planetNodeRefs.current.values()) {
        if (el && el.style.display === 'none') {
          el.style.display = '';
        }
      }
    }
  }, [isMorphing, updateNodeVisibility]);

  // Ensure initial transform is applied on mount
  useEffect(() => {
    syncWorldTransformAndHud();
  }, [syncWorldTransformAndHud]);

  // Mobile & Desktop detection & Layout-thrash-free Canvas size cache
  useEffect(() => {
    const handleResize = rafThrottle(() => {
      const mobile = window.innerWidth < 768;
      const desktop = window.innerWidth >= 1024;
      setIsMobile(mobile);
      setIsDesktop(desktop);
      if (canvasRef.current) {
        canvasDimsRef.current = {
          width: canvasRef.current.clientWidth || window.innerWidth,
          height: canvasRef.current.clientHeight || window.innerHeight,
        };
      }
    });
    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
    return () => {
      handleResize.cancel();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Native Non-Passive Multi-Touch & Safari Gesture Blocker (Prevents 2/3/4-finger browser glitches)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isHudTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement && Boolean(target.closest('.interactive-hud-element'));

    const handleTouchStartNative = (e: TouchEvent) => {
      if (isHudTarget(e.target)) return;
      // Immediately suppress browser multi-finger gestures (2+ fingers pinch, 3-finger swipe/dismiss)
      if (e.touches.length >= 2 && e.cancelable) {
        e.preventDefault();
      }
    };

    const handleTouchMoveNative = (e: TouchEvent) => {
      if (isHudTarget(e.target)) return;
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const handleGestureNative = (e: Event) => {
      if (isHudTarget(e.target)) return;
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchstart', handleTouchStartNative, { passive: false });
    container.addEventListener('touchmove', handleTouchMoveNative, { passive: false });
    container.addEventListener('gesturestart', handleGestureNative, { passive: false });
    container.addEventListener('gesturechange', handleGestureNative, { passive: false });
    container.addEventListener('gestureend', handleGestureNative, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStartNative);
      container.removeEventListener('touchmove', handleTouchMoveNative);
      container.removeEventListener('gesturestart', handleGestureNative);
      container.removeEventListener('gesturechange', handleGestureNative);
      container.removeEventListener('gestureend', handleGestureNative);
    };
  }, []);

  // Viewport scroll stabilization: Decoupled via requestAnimationFrame (Zero layout thrashing)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevWidth = document.body.style.width;
    const prevHeight = document.body.style.height;

    document.body.style.overflow = 'hidden';
    document.body.style.height = '100dvh';

    let scrollRafId: number | null = null;
    const handleScrollLock = () => {
      if (scrollRafId !== null) return;
      scrollRafId = requestAnimationFrame(() => {
        scrollRafId = null;
        if (window.scrollY !== 0 || window.scrollX !== 0) {
          window.scrollTo(0, 0);
        }
      });
    };

    window.addEventListener('scroll', handleScrollLock, { passive: true });

    const visualViewport = window.visualViewport;
    let viewportRafId: number | null = null;
    const handleViewportResize = () => {
      if (viewportRafId !== null) return;
      viewportRafId = requestAnimationFrame(() => {
        viewportRafId = null;
        if (window.scrollY !== 0 || window.scrollX !== 0) {
          window.scrollTo(0, 0);
        }
      });
    };

    if (visualViewport) {
      visualViewport.addEventListener('resize', handleViewportResize);
      visualViewport.addEventListener('scroll', handleViewportResize);
    }

    return () => {
      if (scrollRafId !== null) cancelAnimationFrame(scrollRafId);
      if (viewportRafId !== null) cancelAnimationFrame(viewportRafId);
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.width = prevWidth;
      document.body.style.height = prevHeight;
      window.removeEventListener('scroll', handleScrollLock);
      if (visualViewport) {
        visualViewport.removeEventListener('resize', handleViewportResize);
        visualViewport.removeEventListener('scroll', handleViewportResize);
      }
    };
  }, []);

  // Fetch Supabase and local planets & setup realtime subscription
  useEffect(() => {
    let isMounted = true;
    fetchPlanetSubmissions(user?.id, user?.email).then((subs) => {
      if (isMounted && subs.length > 0) {
        setPlanets(subs);
      }
    });

    const unsubscribe = subscribeToPlanetSubmissions((updated) => {
      if (isMounted) {
        setPlanets(updated);
      }
    });

    // Instant Map Registration: Listen for newly synthesized planets from Mill Wizard
    const handleLocalUpdate = (e: any) => {
      if (!isMounted) return;
      const fresh = (e && e.detail && Array.isArray(e.detail)) ? e.detail : getStoredPlanetSubmissions();
      if (fresh.length > 0) {
        setPlanets(fresh);
      }
    };

    window.addEventListener('akinoya_planet_submissions_updated', handleLocalUpdate);
    window.addEventListener('storage', handleLocalUpdate);

    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener('akinoya_planet_submissions_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleLocalUpdate);
    };
  }, [user?.id, user?.email]);

  // Initialize rich, deep-space Starfield with adaptive density based on performance tier
  useEffect(() => {
    const stars: Star[] = [];
    const count = perfTier === 'low' ? 200 : perfTier === 'medium' ? 380 : (isMobile ? 480 : 700);
    const colors = ['#ffffff', '#bae6fd', '#fef08a', '#e9d5ff', '#67e8f9', '#f0f9ff'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.pow(Math.random(), 0.52) * 4400;
      const layer = Math.random() < 0.62 ? 0 : Math.random() < 0.88 ? 1 : 2;
      const radius =
        layer === 0
          ? Math.random() * 0.75 + 0.25
          : layer === 1
          ? Math.random() * 1.25 + 0.75
          : Math.random() * 2.2 + 1.4;

      stars.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        radius,
        baseAlpha: layer === 0 ? Math.random() * 0.45 + 0.15 : Math.random() * 0.55 + 0.3,
        twinkleSpeed: Math.random() * 0.035 + 0.008,
        color: colors[Math.floor(Math.random() * colors.length)],
        layer,
      });
    }
    starsRef.current = stars;
  }, [isMobile, perfTier]);

  // Smooth Camera Pan to Coordinates
  const panTo = useCallback((targetX: number, targetY: number, targetZoom?: number, duration = 800, targetRotation = 0) => {
    if (inertiaAnimRef.current) {
      cancelAnimationFrame(inertiaAnimRef.current);
      inertiaAnimRef.current = null;
    }

    const currentPan = panRef.current;
    const currentZoom = zoomRef.current;
    const currentRotation = rotationRef.current;
    const desiredZoom = targetZoom !== undefined ? targetZoom : Math.max(0.75, currentZoom);

    // Screen Center in coordinates: We want (targetX, targetY) to be at screen center (pan.x = -targetX, pan.y = -targetY)
    cameraTargetRef.current = {
      x: -targetX,
      y: -targetY,
      zoom: desiredZoom,
      rotation: targetRotation,
      startTime: performance.now(),
      duration,
      startX: currentPan.x,
      startY: currentPan.y,
      startZoom: currentZoom,
      startRotation: currentRotation,
    };
  }, []);

  // Deep-Linking Reader (?planet=... or ?coord=x,y)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const planetId = params.get('planet');
    const coordParam = params.get('coord');

    if (planetId) {
      const found = planets.find(
        (p) => isLiveGalaxyWorld(p) && (p.id === planetId || p.planetName.toLowerCase() === planetId.toLowerCase())
      );
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
      // Dynamic Frame Budgeting & Adaptive Performance Monitor (Locked 60 FPS Engine)
      const frameDelta = time - lastFrameTimestampRef.current;
      lastFrameTimestampRef.current = time;

      if (frameDelta > 0 && frameDelta < 250) {
        avgFrameTimeRef.current = avgFrameTimeRef.current * 0.94 + frameDelta * 0.06;
        frameSampleCountRef.current++;

        // Sample frame budget over ~75 frames (approx 1.25 seconds)
        if (frameSampleCountRef.current > 75) {
          frameSampleCountRef.current = 0;
          const currentAvg = avgFrameTimeRef.current;

          // Drop tier if frame drops detected (>22.5ms = below ~44 FPS)
          if (currentAvg > 22.5) {
            if (perfTierRef.current === 'high') {
              perfTierRef.current = 'medium';
              setPerfTier('medium');
            } else if (perfTierRef.current === 'medium' && currentAvg > 26.5) {
              perfTierRef.current = 'low';
              setPerfTier('low');
            }
          } else if (currentAvg < 17.1 && !isMobile) {
            // Gracefully recover to higher tier if sustained 58-60 FPS
            if (perfTierRef.current === 'low') {
              perfTierRef.current = 'medium';
              setPerfTier('medium');
            } else if (perfTierRef.current === 'medium') {
              perfTierRef.current = 'high';
              setPerfTier('high');
            }
          }
        }
      }

      // 1. Process active camera animation directly on GPU refs with Sci-Fi Velvet Easing
      if (cameraTargetRef.current) {
        const ct = cameraTargetRef.current;
        const elapsed = time - ct.startTime;
        const progress = Math.min(1, elapsed / ct.duration);
        // AAA Sci-Fi Velvet Easing: Instant velocity with cubic velvet deceleration (cubic-bezier(0.16, 1, 0.3, 1))
        const ease = 1 - Math.pow(1 - progress, 4);

        panRef.current = {
          x: ct.startX + (ct.x - ct.startX) * ease,
          y: ct.startY + (ct.y - ct.startY) * ease,
        };
        zoomRef.current = ct.startZoom + (ct.zoom - ct.startZoom) * ease;
        rotationRef.current = ct.startRotation + (ct.rotation - ct.startRotation) * ease;

        syncWorldTransformAndHud();

        if (progress >= 1) {
          cameraTargetRef.current = null;
        }
      }

      // Interpolate planet coordinates during restructure / layout morphing with Sci-Fi Velvet Easing
      if (animatingRef.current) {
        const elapsed = time - morphStartTimeRef.current;
        const progress = Math.min(1, Math.max(0, elapsed / 650));
        const ease = 1 - Math.pow(1 - progress, 4);

        nodePositionsRef.current.forEach((node) => {
          node.currentX = node.startX + (node.targetX - node.startX) * ease;
          node.currentY = node.startY + (node.targetY - node.startY) * ease;
        });

        if (progress >= 1) {
          animatingRef.current = false;
        }
      }

      // Pre-cached canvas dimensions (100% layout-thrash-free 60fps loop)
      const width = canvasDimsRef.current.width || window.innerWidth;
      const height = canvasDimsRef.current.height || window.innerHeight;

      const targetDpr =
        perfTierRef.current === 'low'
          ? 1
          : perfTierRef.current === 'medium'
          ? Math.min(1.5, window.devicePixelRatio || 1)
          : Math.min(2, window.devicePixelRatio || 1);

      const targetW = Math.round(width * targetDpr);
      const targetH = Math.round(height * targetDpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.scale(targetDpr, targetDpr);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const curPan = panRef.current;
      const curZoom = zoomRef.current;
      const curRot = rotationRef.current;
      const isLite = perfTierRef.current === 'low';
      const isBalanced = perfTierRef.current === 'medium';

      // 2. Cosmic Background Ambient Gradient (Lightweight flat fill on low-end)
      if (isLite) {
        ctx.fillStyle = '#03050c';
        ctx.fillRect(0, 0, width, height);
      } else {
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
      }

      // Apply synchronized 2-finger map rotation around screen center
      if (curRot !== 0) {
        ctx.translate(centerX, centerY);
        ctx.rotate(curRot);
        ctx.translate(-centerX, -centerY);
      }

      // 3. Central Äkinoya Golden Core Glow (Optimized for low-end)
      const coreScreenX = centerX + curPan.x * curZoom;
      const coreScreenY = centerY + curPan.y * curZoom;
      if (!isLite) {
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
      } else {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.09)';
        ctx.beginPath();
        ctx.arc(coreScreenX, coreScreenY, 160 * curZoom, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Parallax Starfield with Multilayer Depth, Twinkling & Dynamic Capping
      const stars = starsRef.current;
      const maxStarCount = isLite ? 160 : isBalanced ? 320 : stars.length;
      const boundMargin = Math.max(width, height) * 0.45;

      for (let i = 0; i < maxStarCount; i++) {
        const star = stars[i];
        const parallaxFactor = star.layer === 0 ? 0.06 : star.layer === 1 ? 0.22 : 0.6;
        const sx = centerX + (star.x + curPan.x * parallaxFactor) * (curZoom * 0.85 + 0.15);
        const sy = centerY + (star.y + curPan.y * parallaxFactor) * (curZoom * 0.85 + 0.15);

        // Bounds culling (expanded for rotation)
        if (sx < -boundMargin || sx > width + boundMargin || sy < -boundMargin || sy > height + boundMargin) continue;

        const twinkle =
          Math.sin(time * star.twinkleSpeed + i) * 0.32 +
          Math.cos(time * star.twinkleSpeed * 0.6 + i * 1.7) * 0.12;
        const alpha = Math.max(0.08, Math.min(1, star.baseAlpha + twinkle));

        // On low-tier, draw all stars with ultra-fast fillRect (zero arc overhead)
        if (isLite) {
          ctx.fillStyle = star.color;
          ctx.globalAlpha = alpha;
          const sz = star.radius * 1.2;
          ctx.fillRect(sx - sz * 0.5, sy - sz * 0.5, sz, sz);
          continue;
        }

        // Soft radiant glow for foreground stellar beacons on high/medium tier
        if (!isLite && star.layer === 2 && alpha > 0.55) {
          ctx.fillStyle = star.color;
          ctx.globalAlpha = alpha * 0.2;
          ctx.beginPath();
          ctx.arc(sx, sy, star.radius * 2.4 * Math.min(1.4, Math.max(0.7, curZoom)), 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = star.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(sx, sy, star.radius * Math.min(1.5, Math.max(0.7, curZoom)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // 5. Orbital Distance Rings centered at Äkinoya (0, 0) - Faint Ghost Rings
      ctx.lineWidth = 0.75;
      for (const ring of ORBITAL_RINGS) {
        const ringRadius = ring.radius * curZoom;
        if (ringRadius < 5) continue;

        ctx.strokeStyle = ring.color;
        ctx.setLineDash([3 * curZoom, 8 * curZoom]);
        ctx.beginPath();
        ctx.arc(coreScreenX, coreScreenY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Ring distance label badge - faint ghost text
        if (ringRadius > 80 && curZoom > 0.45) {
          ctx.font = `${Math.max(8, Math.min(9.5, 9 * curZoom))}px monospace`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.textAlign = 'left';
          ctx.fillText(ring.label, coreScreenX + 10, coreScreenY - ringRadius + 12);
        }
      }
      ctx.setLineDash([]);

      // Helper: get current interpolated position of a planet node
      const getNodePos = (p: PlanetSubmission) => {
        const interp = nodePositionsRef.current.get(p.id);
        if (interp) {
          return { x: interp.currentX, y: interp.currentY };
        }
        return { x: p.coordX ?? 0, y: p.coordY ?? 0 };
      };

      const activeMode = layoutModeRef.current;

      // 5b. Constellation Architectural Infrastructure - Delicate Ghost Blueprint Vectors
      if (activeMode === 'spiral') {
        const armStep = isLite ? 60 : isBalanced ? 42 : 30;
        // 5-Arm Logarithmic Spiral Constellation Arms - Soft Ghost Blueprint Filaments
        for (const arm of CONSTELLATION_ARMS) {
          ctx.save();

          // Subtle atmospheric spiral filament glow
          ctx.strokeStyle = arm.glowColor.replace(/[\d.]+\)$/, '0.025)');
          ctx.lineWidth = Math.max(1.5, 2.5 * curZoom);
          ctx.beginPath();
          let isFirst = true;
          for (let r = 240; r <= 3500; r += armStep) {
            const theta = getSpiralArmAngle(arm.baseAngle, r);
            const sx = coreScreenX + r * Math.cos(theta) * curZoom;
            const sy = coreScreenY + r * Math.sin(theta) * curZoom;
            if (isFirst) {
              ctx.moveTo(sx, sy);
              isFirst = false;
            } else {
              ctx.lineTo(sx, sy);
            }
          }
          ctx.stroke();

          // Crisp ghost-line structural filament
          ctx.strokeStyle = arm.color;
          ctx.globalAlpha = 0.06;
          ctx.lineWidth = 0.75;
          ctx.setLineDash([4 * curZoom, 8 * curZoom]);
          ctx.beginPath();
          isFirst = true;
          for (let r = 240; r <= 3500; r += armStep) {
            const theta = getSpiralArmAngle(arm.baseAngle, r);
            const sx = coreScreenX + r * Math.cos(theta) * curZoom;
            const sy = coreScreenY + r * Math.sin(theta) * curZoom;
            if (isFirst) {
              ctx.moveTo(sx, sy);
              isFirst = false;
            } else {
              ctx.lineTo(sx, sy);
            }
          }
          ctx.stroke();
          ctx.setLineDash([]);

          // Faint Sci-Fi Arm Name Badge at outer extremity
          if (curZoom > 0.42) {
            const labelRadius = 3450;
            const labelTheta = getSpiralArmAngle(arm.baseAngle, labelRadius);
            const lx = coreScreenX + labelRadius * Math.cos(labelTheta) * curZoom;
            const ly = coreScreenY + labelRadius * Math.sin(labelTheta) * curZoom;
            ctx.font = `bold ${Math.max(8.5, Math.min(10, 9 * curZoom))}px monospace`;
            ctx.fillStyle = arm.color;
            ctx.globalAlpha = 0.3;
            ctx.textAlign = 'center';
            ctx.fillText(`✦ ${arm.name}`, lx, ly);
          }

          ctx.restore();
        }
      } else if (activeMode === 'matrix') {
        // Concentric Elliptical Oval Matrix Highways - Optimized Viewport Culling & Single-Pass Rasterization
        const screenMargin = 120;
        const isUltra = perfTierRef.current === 'high';

        for (const track of OVAL_MATRIX_TRACKS) {
          const rx = track.a * curZoom;
          const ry = track.b * curZoom;
          if (rx < 10) continue;

          // 1. Fast AABB intersection test with viewport
          const minX = coreScreenX - rx;
          const maxX = coreScreenX + rx;
          const minY = coreScreenY - ry;
          const maxY = coreScreenY + ry;

          // Completely outside viewport bounds
          if (maxX < -screenMargin || minX > width + screenMargin || maxY < -screenMargin || minY > height + screenMargin) {
            continue;
          }

          // 2. Enclosing test: If screen viewport is entirely inside the ellipse, the border does not cross the screen
          if (
            minX < -screenMargin &&
            maxX > width + screenMargin &&
            minY < -screenMargin &&
            maxY > height + screenMargin
          ) {
            const rx2 = rx * rx;
            const ry2 = ry * ry;
            const c1 = ((-screenMargin - coreScreenX) ** 2) / rx2 + ((-screenMargin - coreScreenY) ** 2) / ry2;
            const c2 = ((width + screenMargin - coreScreenX) ** 2) / rx2 + ((-screenMargin - coreScreenY) ** 2) / ry2;
            const c3 = ((-screenMargin - coreScreenX) ** 2) / rx2 + ((height + screenMargin - coreScreenY) ** 2) / ry2;
            const c4 = ((width + screenMargin - coreScreenX) ** 2) / rx2 + ((height + screenMargin - coreScreenY) ** 2) / ry2;
            if (c1 < 0.95 && c2 < 0.95 && c3 < 0.95 && c4 < 0.95) {
              continue;
            }
          }

          ctx.save();

          // Adaptive dash optimization: On large ellipses (rx > 2200) or low tier, use ultra-crisp hairline to avoid thousands of dash calculations
          const useSolidHairline = isLite || rx > 2200;

          if (isUltra && !useSolidHairline) {
            // Subtle oval halo glow (Ultra tier only)
            ctx.strokeStyle = track.glowColor.replace(/[\d.]+\)$/, '0.025)');
            ctx.lineWidth = Math.max(1.5, 2.2 * curZoom);
            ctx.beginPath();
            ctx.ellipse(coreScreenX, coreScreenY, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Structural elliptical highway line
          ctx.strokeStyle = track.color;
          ctx.globalAlpha = 0.07;
          ctx.lineWidth = 0.8;
          if (!useSolidHairline) {
            const dashLen = Math.max(6, Math.min(16, 5 * curZoom));
            const gapLen = Math.max(8, Math.min(22, 8 * curZoom));
            ctx.setLineDash([dashLen, gapLen]);
          }
          ctx.beginPath();
          ctx.ellipse(coreScreenX, coreScreenY, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Faint Track Designation Badge at vertical apex (suppressed on track-0 to keep Ämlemi's apex clean)
          if (track.id !== 'track-0' && curZoom > 0.38) {
            const badgeY = coreScreenY - ry - 8 * curZoom;
            if (badgeY >= -50 && badgeY <= height + 50 && coreScreenX >= -100 && coreScreenX <= width + 100) {
              ctx.font = `bold ${Math.max(8.5, Math.min(10, 9 * curZoom))}px monospace`;
              ctx.fillStyle = track.color;
              ctx.globalAlpha = 0.32;
              ctx.textAlign = 'center';
              ctx.fillText(`🪐 ${track.name}`, coreScreenX, badgeY);
            }
          }

          ctx.restore();
        }
      }

      // 5c. Target World Connection & Constellation Connectors
      const currentPlanets = planetsRef.current;
      if (currentPlanets && currentPlanets.length > 0) {
        const activeHoveredId = hoveredPlanetRef.current?.id;
        const activeSelectedId = selectedPlanetRef.current?.id;

        const amlemiNode = currentPlanets.find(
          (p) => p.id === 'planet-amlemi-genesis-01' || p.planetName === 'Ämlemi'
        );

        if (activeMode === 'matrix') {
          // =========================================================================
          // MATRIX VIEW: Pure Single Clean Dotted Line to Active Target World
          // Eliminate all thick, stray alignment lines/vectors across matrix tracks.
          // Exactly one clean dotted line connects Äkinoya Core (0,0) to the target world.
          // =========================================================================
          const targetPlanet = hoveredPlanetRef.current || selectedPlanetRef.current || amlemiNode;
          if (targetPlanet && (targetPlanet.coordX !== 0 || targetPlanet.coordY !== 0)) {
            const tPos = getNodePos(targetPlanet);
            const tx = coreScreenX + tPos.x * curZoom;
            const ty = coreScreenY + tPos.y * curZoom;
            const isTargetActive =
              targetPlanet.id === activeHoveredId || targetPlanet.id === activeSelectedId;

            ctx.save();
            ctx.strokeStyle = isTargetActive
              ? 'rgba(251, 191, 36, 0.95)'
              : 'rgba(245, 158, 11, 0.45)';
            ctx.lineWidth = isTargetActive ? 1.25 : 1.0;
            ctx.setLineDash([4 * curZoom, 4 * curZoom]);
            ctx.beginPath();
            ctx.moveTo(coreScreenX, coreScreenY);
            ctx.lineTo(tx, ty);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
          }
        } else {
          // =========================================================================
          // SPIRAL VIEW: Constellation Arms & Multi-Node Lattice Filaments
          // =========================================================================
          // Foundational Master Anchor: Golden genesis link from Äkinoya Core (0,0) to Ämlemi
          if (amlemiNode) {
            const amPos = getNodePos(amlemiNode);
            const amX = coreScreenX + amPos.x * curZoom;
            const amY = coreScreenY + amPos.y * curZoom;
            const isAmlemiActive =
              amlemiNode.id === activeHoveredId || amlemiNode.id === activeSelectedId;

            ctx.save();
            ctx.strokeStyle = isAmlemiActive
              ? 'rgba(251, 191, 36, 0.95)'
              : 'rgba(245, 158, 11, 0.45)';
            ctx.lineWidth = isAmlemiActive ? 2.0 : 1.0;
            ctx.setLineDash([4 * curZoom, 4 * curZoom]);
            ctx.beginPath();
            ctx.moveTo(coreScreenX, coreScreenY);
            ctx.lineTo(amX, amY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
          }

          // Precomputed Edges: Spiral Arm Filaments
          const edges = latticeEdgesRef.current;
          if (edges && edges.length > 0) {
            const defaultEdgesByColor = new Map<string, Array<{ x1: number; y1: number; x2: number; y2: number }>>();
            const highlightedEdges: Array<{ x1: number; y1: number; x2: number; y2: number; color: string }> = [];

            for (let i = 0; i < edges.length; i++) {
              const edge = edges[i];
              const p1 = getNodePos(edge.nodeA);
              const p2 = getNodePos(edge.nodeB);

              const s1x = coreScreenX + p1.x * curZoom;
              const s1y = coreScreenY + p1.y * curZoom;
              const s2x = coreScreenX + p2.x * curZoom;
              const s2y = coreScreenY + p2.y * curZoom;

              // Viewport edge culling
              const edgeBound = boundMargin;
              if (
                (s1x < -edgeBound && s2x < -edgeBound) ||
                (s1x > width + edgeBound && s2x > width + edgeBound) ||
                (s1y < -edgeBound && s2y < -edgeBound) ||
                (s1y > height + edgeBound && s2y > height + edgeBound)
              ) {
                continue;
              }

              const isHighlighted =
                edge.nodeA.id === activeHoveredId ||
                edge.nodeB.id === activeHoveredId ||
                edge.nodeA.id === activeSelectedId ||
                edge.nodeB.id === activeSelectedId;

              if (isHighlighted) {
                highlightedEdges.push({ x1: s1x, y1: s1y, x2: s2x, y2: s2y, color: edge.color });
              } else {
                let group = defaultEdgesByColor.get(edge.color);
                if (!group) {
                  group = [];
                  defaultEdgesByColor.set(edge.color, group);
                }
                group.push({ x1: s1x, y1: s1y, x2: s2x, y2: s2y });
              }
            }

            // 1. Batched Non-Highlighted Filaments
            ctx.save();
            ctx.lineWidth = 0.75;
            if (!isLite) {
              ctx.setLineDash([3 * curZoom, 6 * curZoom]);
            }
            for (const [color, segs] of defaultEdgesByColor.entries()) {
              ctx.strokeStyle = color;
              ctx.globalAlpha = 0.12;
              ctx.beginPath();
              for (let j = 0; j < segs.length; j++) {
                ctx.moveTo(segs[j].x1, segs[j].y1);
                ctx.lineTo(segs[j].x2, segs[j].y2);
              }
              ctx.stroke();
            }
            ctx.setLineDash([]);
            ctx.restore();

            // 2. High-Priority Highlighted Lattice Connectors (Fixed h.x2 coordinate)
            if (highlightedEdges.length > 0) {
              ctx.save();
              ctx.lineWidth = 1.75;
              ctx.globalAlpha = 0.95;
              for (let k = 0; k < highlightedEdges.length; k++) {
                const h = highlightedEdges[k];
                ctx.strokeStyle = h.color;
                ctx.beginPath();
                ctx.moveTo(h.x1, h.y1);
                ctx.lineTo(h.x2, h.y2);
                ctx.stroke();
              }
              ctx.restore();
            }
          }

          // 6. Subtle Coordinate Crosshair Rays from Core (Spiral mode only)
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.moveTo(coreScreenX - 3500 * curZoom, coreScreenY);
          ctx.lineTo(coreScreenX + 3500 * curZoom, coreScreenY);
          ctx.moveTo(coreScreenX, coreScreenY - 3500 * curZoom);
          ctx.lineTo(coreScreenX, coreScreenY + 3500 * curZoom);
          ctx.stroke();

          // 7. Hovered Connection Vector Line (from Core to hovered node in Spiral mode)
          const hoveredNode = hoveredPlanetRef.current;
          if (hoveredNode && (hoveredNode.coordX !== 0 || hoveredNode.coordY !== 0)) {
            const hPos = getNodePos(hoveredNode);
            const px = coreScreenX + hPos.x * curZoom;
            const py = coreScreenY + hPos.y * curZoom;
            const distAU = Math.round(Math.hypot(hPos.x, hPos.y));

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
            ctx.fillText(`VECTOR: ${distAU} AU`, midX, midY - 6);
          }
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [syncWorldTransformAndHud]);

  // Helper: Compute centroid of all currently active touch/pointer points
  const getTouchesCentroid = () => {
    const pts = Array.from(touchesRef.current.values());
    if (pts.length === 0) return { x: 0, y: 0 };
    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < pts.length; i++) {
      sumX += pts[i].x;
      sumY += pts[i].y;
    }
    return { x: sumX / pts.length, y: sumY / pts.length };
  };

  // Re-anchor multi-touch state whenever a finger is added or lifted (eliminates 1↔2↔3+ finger jumps)
  const reanchorMultiTouch = () => {
    const count = touchesRef.current.size;
    velocityRef.current = { x: 0, y: 0 };
    lastMoveTimeRef.current = performance.now();

    if (count > 0) {
      lastCentroidRef.current = getTouchesCentroid();
    }

    if (count === 2) {
      wasMultiTouchRef.current = true;
      const [t1, t2] = Array.from(touchesRef.current.values());
      pinchStartDistRef.current = Math.max(10, Math.hypot(t2.x - t1.x, t2.y - t1.y));
      pinchStartZoomRef.current = zoomRef.current;
      pinchStartAngleRef.current = Math.atan2(t2.y - t1.y, t2.x - t1.x);
      pinchStartRotRef.current = rotationRef.current;
    } else {
      pinchStartDistRef.current = null;
      pinchStartAngleRef.current = null;
      if (count >= 3) {
        wasMultiTouchRef.current = true;
      }
    }
  };

  // Glitch-Free Multi-Touch & Pointer Interaction Handlers (60fps Direct GPU)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.interactive-hud-element')) return;

    // Secure pointer capture for uninterrupted gesture tracking across boundaries
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {}

    if (inertiaAnimRef.current) {
      cancelAnimationFrame(inertiaAnimRef.current);
      inertiaAnimRef.current = null;
    }
    cameraTargetRef.current = null;

    touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (touchesRef.current.size === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      hasMovedBeyondTapRef.current = false;
      wasMultiTouchRef.current = false;
    }

    reanchorMultiTouch();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !touchesRef.current.has(e.pointerId)) return;

    touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const touchCount = touchesRef.current.size;

    // 3 or more fingers: stabilize & smoothly pan by centroid only without zoom/velocity jumps
    if (touchCount >= 3) {
      wasMultiTouchRef.current = true;
      hasMovedBeyondTapRef.current = true;
      const centroid = getTouchesCentroid();
      const dx = centroid.x - lastCentroidRef.current.x;
      const dy = centroid.y - lastCentroidRef.current.y;
      const curZoom = zoomRef.current;
      const curRot = rotationRef.current;
      const cos = Math.cos(-curRot);
      const sin = Math.sin(-curRot);

      panRef.current = {
        x: panRef.current.x + (dx * cos - dy * sin) / curZoom,
        y: panRef.current.y + (dx * sin + dy * cos) / curZoom,
      };
      lastCentroidRef.current = centroid;
      velocityRef.current = { x: 0, y: 0 };
      syncWorldTransformAndHud();
      return;
    }

    // 2 fingers: simultaneous pinch-to-zoom + centroid pan + smooth 2-finger rotation
    if (touchCount === 2 && pinchStartDistRef.current !== null) {
      wasMultiTouchRef.current = true;
      hasMovedBeyondTapRef.current = true;
      const [t1, t2] = Array.from(touchesRef.current.values());
      const currentDist = Math.max(10, Math.hypot(t2.x - t1.x, t2.y - t1.y));
      const scale = currentDist / pinchStartDistRef.current;
      const nextZoom = Math.min(2.6, Math.max(0.28, pinchStartZoomRef.current * scale));

      // Smooth 2-finger twist rotation (with subtle deadzone for rock-solid pinch)
      if (pinchStartAngleRef.current !== null && currentDist > 36) {
        const currentAngle = Math.atan2(t2.y - t1.y, t2.x - t1.x);
        let angleDelta = currentAngle - pinchStartAngleRef.current;
        if (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
        if (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
        if (Math.abs(angleDelta) > 0.035) {
          rotationRef.current = pinchStartRotRef.current + angleDelta;
        }
      }

      // Pan by 2-finger midpoint delta
      const centroid = getTouchesCentroid();
      const dx = centroid.x - lastCentroidRef.current.x;
      const dy = centroid.y - lastCentroidRef.current.y;
      const curRot = rotationRef.current;
      const cos = Math.cos(-curRot);
      const sin = Math.sin(-curRot);

      panRef.current = {
        x: panRef.current.x + (dx * cos - dy * sin) / nextZoom,
        y: panRef.current.y + (dx * sin + dy * cos) / nextZoom,
      };
      zoomRef.current = nextZoom;
      lastCentroidRef.current = centroid;
      velocityRef.current = { x: 0, y: 0 };

      syncWorldTransformAndHud();
      return;
    }

    // 1 finger / mouse drag
    if (touchCount === 1) {
      const now = performance.now();
      const dt = Math.max(1, now - lastMoveTimeRef.current);
      const centroid = getTouchesCentroid();
      const dx = centroid.x - lastCentroidRef.current.x;
      const dy = centroid.y - lastCentroidRef.current.y;

      if (Math.hypot(centroid.x - dragStartRef.current.x, centroid.y - dragStartRef.current.y) > 7) {
        hasMovedBeyondTapRef.current = true;
      }

      const curZoom = zoomRef.current;
      const curRot = rotationRef.current;
      const cos = Math.cos(-curRot);
      const sin = Math.sin(-curRot);

      const coordDx = (dx * cos - dy * sin) / curZoom;
      const coordDy = (dx * sin + dy * cos) / curZoom;

      panRef.current = {
        x: panRef.current.x + coordDx,
        y: panRef.current.y + coordDy,
      };

      // Responsive velvet velocity tracking (60fps EMA)
      const instVx = (coordDx / dt) * 16;
      const instVy = (coordDy / dt) * 16;
      velocityRef.current = {
        x: velocityRef.current.x * 0.4 + instVx * 0.6,
        y: velocityRef.current.y * 0.4 + instVy * 0.6,
      };

      lastCentroidRef.current = centroid;
      lastMoveTimeRef.current = now;
      syncWorldTransformAndHud();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}

    touchesRef.current.delete(e.pointerId);

    // If fingers remain on screen (e.g., 3→2 or 2→1), re-anchor centroid cleanly without ending drag
    if (touchesRef.current.size > 0) {
      reanchorMultiTouch();
      return;
    }

    pinchStartDistRef.current = null;
    pinchStartAngleRef.current = null;

    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    // Only apply inertia after a clean single-finger pan (never fling after a multi-touch pinch)
    if (wasMultiTouchRef.current) {
      velocityRef.current = { x: 0, y: 0 };
      return;
    }

    let vx = velocityRef.current.x;
    let vy = velocityRef.current.y;
    const speed = Math.hypot(vx, vy);

    if (speed > 0.25) {
      const stepInertia = () => {
        // Frictionless velvet kinetic inertia
        vx *= 0.938;
        vy *= 0.938;

        panRef.current = {
          x: panRef.current.x + vx,
          y: panRef.current.y + vy,
        };
        syncWorldTransformAndHud();

        if (Math.hypot(vx, vy) > 0.04) {
          inertiaAnimRef.current = requestAnimationFrame(stepInertia);
        } else {
          inertiaAnimRef.current = null;
        }
      };
      inertiaAnimRef.current = requestAnimationFrame(stepInertia);
    }
  };

  // Wheel / Trackpad Zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (inertiaAnimRef.current) {
      cancelAnimationFrame(inertiaAnimRef.current);
      inertiaAnimRef.current = null;
    }

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.91;
    const nextZoom = Math.min(2.6, Math.max(0.28, zoomRef.current * zoomFactor));
    zoomRef.current = nextZoom;
    syncWorldTransformAndHud();
  };

  // Zoom Button Controls (Velvet Camera Animation)
  const handleZoomIn = () => {
    soundManager.playTone(660, 0.04);
    const targetZoom = Math.min(2.6, zoomRef.current * 1.28);
    panTo(-panRef.current.x, -panRef.current.y, targetZoom, 320, rotationRef.current);
  };

  const handleZoomOut = () => {
    soundManager.playTone(520, 0.04);
    const targetZoom = Math.max(0.28, zoomRef.current * 0.78);
    panTo(-panRef.current.x, -panRef.current.y, targetZoom, 320, rotationRef.current);
  };

  const handleCenterAkinoya = () => {
    soundManager.playTone(800, 0.06);
    panTo(0, 0, isMobile ? 0.68 : 0.9, 800, 0);
  };

  // Search filter - ranked dynamically by persistent community votes (purging Zephyria)
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q || q === 'zephyria' || q.includes('zephyria')) return [];
    return filteredPlanets
      .filter(
        (p) =>
          !p.planetName.toLowerCase().includes('zephyria') &&
          !p.id.toLowerCase().includes('zephyria') &&
          (p.planetName.toLowerCase().includes(q) ||
            (p.sectorId && p.sectorId.toLowerCase().includes(q)) ||
            p.authorName.toLowerCase().includes(q) ||
            p.authorUsername.toLowerCase().includes(q))
      )
      .sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));
  }, [filteredPlanets, searchQuery]);

  const handleSwitchLayout = useCallback(
    (mode: ConstellationLayoutMode) => {
      if (mode === layoutMode) {
        handleTriggerRestructure();
        return;
      }
      soundManager.playAcousticSweep(540, 780, 0.14);
      setLayoutMode(mode);
      try {
        localStorage.setItem('akinoya_constellation_layout_mode', mode);
      } catch {}
    },
    [layoutMode]
  );

  const handleTriggerRestructure = useCallback(() => {
    soundManager.playAcousticSweep(460, 880, 0.16);
    setRestructureSeed((prev) => prev + 1);
  }, []);

  // Synchronize selectedPlanet coordinates when layout mode or restructure changes
  useEffect(() => {
    if (selectedPlanet) {
      const updated = filteredPlanets.find((p) => p.id === selectedPlanet.id);
      if (updated && (updated.coordX !== selectedPlanet.coordX || updated.coordY !== selectedPlanet.coordY)) {
        setSelectedPlanet(updated);
      }
    }
  }, [filteredPlanets, selectedPlanet]);

  const handleSelectSearchResult = (planet: PlanetSubmission) => {
    soundManager.playTone(740, 0.06);
    setSearchQuery('');
    setIsSearchFocused(false);
    setSelectedPlanet(planet);
    panTo(planet.coordX ?? 0, planet.coordY ?? 0, 1.1, 850, 0);
  };

  // Planet Click (ignore if user was dragging or pinching)
  const handlePlanetClick = (planet: PlanetSubmission) => {
    if (hasMovedBeyondTapRef.current || wasMultiTouchRef.current) return;
    soundManager.playTone(680, 0.05);
    setSelectedPlanet(planet);
    panTo(planet.coordX ?? 0, planet.coordY ?? 0, Math.max(1.0, zoomRef.current), 700, 0);
  };

  // Äkinoya Hub Click -> Open Planet Preview / Dossier Widget
  const handleAkinoyaClick = () => {
    if (hasMovedBeyondTapRef.current || wasMultiTouchRef.current) return;
    soundManager.playTone(880, 0.07);
    setIsAkinoyaModalOpen(true);
    panTo(0, 0, Math.max(1.1, zoomRef.current), 700, 0);
  };

  // Vote Action inside Full-Screen PlanetDossierModal
  const handleVotePlanet = async (planetId: string) => {
    soundManager.playTone(740, 0.06);
    const userEmail = (user?.email || profile?.email || '').trim().toLowerCase();
    const userUsername = profile?.username || user?.user_metadata?.username || user?.user_metadata?.full_name || '';
    const res = await togglePlanetSubmissionVote(planetId, user?.id, userEmail, userUsername);
    if (!res.success && res.error) {
      soundManager.playError();
      alert(res.error);
      return;
    }
    setPlanets((prev) =>
      prev.map((p) => (p.id === planetId ? { ...p, votesCount: res.newVotesCount, hasVoted: res.hasVoted } : p))
    );
    if (selectedPlanet && selectedPlanet.id === planetId) {
      setSelectedPlanet((prev) =>
        prev ? { ...prev, votesCount: res.newVotesCount, hasVoted: res.hasVoted } : null
      );
    }
  };

  // Portaled Capital Core Äkinoya Modal node
  const akinoyaModalNode = (
    <AnimatePresence>
      {isAkinoyaModalOpen && (
        <motion.div
          key="akinoya-core-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="interactive-hud-element fixed inset-0 z-[9999] w-screen h-[100dvh] flex items-center justify-center p-4 bg-[#02040a]/95 backdrop-blur-xl transform-gpu select-none"
          style={{ willChange: 'opacity' }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="fixed inset-0 z-0" onClick={() => setIsAkinoyaModalOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative z-10 w-full max-w-lg bg-[#070c18] border border-amber-400/50 rounded-2xl p-6 shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(245,158,11,0.25)] space-y-4 transform-gpu"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex flex-col items-start gap-1">
                <span className="inline-flex px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-mono font-extrabold text-[10px] tracking-widest uppercase shadow-[0_0_15px_rgba(245,158,11,0.5)] items-center gap-1">
                  <span>👑 ÄKINOYA CORE</span>
                </span>
                <span className="text-[11px] font-display font-extrabold text-white tracking-wider">
                  Capital of Sillow Mill
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAkinoyaModalOpen(false)}
                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center cursor-pointer"
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
              Äkinoya stands as the cosmic genesis core of Sillow Mill. Here lies the anchor of all 11 immersive visualizers and the central storyline of the Äkinoya Protocol. Experience the core visual saga, from which all surrounding community sectors, pioneer expeditions, and creator worlds expand outward into the uncharted galaxy.
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
                  scrollToVisualizerHub(true, 50);
                  if (onNavigateToVisualizerHub) {
                    onNavigateToVisualizerHub();
                  } else if (typeof window !== 'undefined') {
                    window.location.href = '/unlocked';
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
        </motion.div>
      )}
    </AnimatePresence>
  );


  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      style={{
        touchAction: 'none',
        overscrollBehavior: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] bg-[#020308] text-white overflow-hidden select-none cursor-grab active:cursor-grabbing font-sans z-30 transform-gpu"
    >
      {/* Background Starfield & Orbit Rings Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0 transform-gpu" />

      {/* TOP NAVIGATION BAR / SCI-FI HEADER */}
      <header className={`interactive-hud-element absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-[#060914]/95 via-[#060914]/80 to-transparent p-3 sm:p-4 ${perfTier === 'low' ? 'bg-[#060914]/98' : 'backdrop-blur-md'} flex items-center justify-between gap-3 border-b border-white/5`}>
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
                <span className="hidden sm:inline px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-950 border border-cyan-400/40 text-cyan-300">
                  LIVE 2D/3D MAP
                </span>
              </h1>
              <p className="text-[10px] font-mono text-white/40 truncate hidden sm:block">
                Universal Astrogation Map · Drag to Pan · Pinch to Zoom &amp; Rotate
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

      {/* FLOATING TOP SEARCH & PIONEER FILTER BAR */}
      <div
        className="interactive-hud-element absolute left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md space-y-2"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 5rem)' }}
      >
        <div className="relative">
          {/* Backdrop to dismiss search on tap outside */}
          {isSearchFocused && (
            <div
              className="fixed inset-0 z-10 pointer-events-auto"
              onClick={() => setIsSearchFocused(false)}
            />
          )}

          <div className={`relative z-20 flex items-center bg-gradient-to-r from-cyan-950/60 via-[#070c1a]/90 to-[#050914]/90 ${perfTier === 'low' ? 'bg-[#070c1a]' : 'backdrop-blur-xl'} border border-cyan-500/40 focus-within:border-amber-400/80 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.18)] transition-all overflow-hidden`}>
            <Search className="w-4 h-4 text-cyan-400 ml-3.5 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                setIsSearchFocused(true);
                window.scrollTo(0, 0);
              }}
              onBlur={() => {
                setTimeout(() => window.scrollTo(0, 0), 100);
              }}
              placeholder="Search planet, Pioneer, or architect..."
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
            <div className={`absolute top-full left-0 right-0 mt-2 bg-[#060914]/95 ${perfTier === 'low' ? 'bg-[#060914]' : 'backdrop-blur-xl'} border border-cyan-500/30 rounded-2xl shadow-2xl max-h-48 sm:max-h-64 overflow-y-auto divide-y divide-white/5 z-50`}>
              {searchResults.map((p) => {
                const isFounder = isFoundingPioneerPlanet(p);
                const isPioneer = isPioneerPlanet(p);
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectSearchResult(p)}
                    className="p-3 hover:bg-cyan-950/40 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-display font-bold text-white group-hover:text-amber-300 transition-colors">
                          {p.planetName}
                        </span>
                        {isPioneer && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-300 text-[8.5px] font-mono font-extrabold tracking-wider uppercase shadow-[0_0_8px_rgba(251,191,36,0.35)]">
                            {isFounder
                              ? '👑 FOUNDING PIONEER'
                              : isVipPioneerPlanet(p)
                              ? '👑 VIP PIONEER'
                              : '⚡ PIONEER'}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-white/50 block truncate mt-0.5">
                        By {formatAuthorName(p.authorName || p.authorUsername)} · ({p.coordX ?? 0}, {p.coordY ?? 0}) AU
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-400/40 text-amber-300 font-mono text-[10px] font-extrabold shadow-[0_0_10px_rgba(251,191,36,0.25)]">
                        ★ {p.votesCount}
                      </span>
                      <button
                        type="button"
                        className="px-2 py-1 rounded-lg bg-cyan-950/80 group-hover:bg-amber-400 group-hover:text-black text-cyan-300 font-mono text-[10px] font-bold transition-all shrink-0 flex items-center gap-1"
                      >
                        <span>Jump</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pioneer Map Filter Pill Bar */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              soundManager.playTone(620, 0.04);
              setMapFilter('all');
            }}
            className={`px-2.5 py-1 rounded-full font-mono text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5 ${perfTier === 'low' ? 'bg-[#060a14]' : 'backdrop-blur-xl'} ${
              mapFilter === 'all'
                ? 'bg-cyan-950/90 border border-cyan-400/70 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.35)]'
                : 'bg-[#060a14]/80 border border-white/15 text-white/60 hover:text-white'
            }`}
          >
            <Globe2 className="w-3 h-3 text-cyan-400" />
            <span>All Worlds ({layoutPlanets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playTone(740, 0.05);
              setMapFilter(mapFilter === 'pioneer' ? 'all' : 'pioneer');
            }}
            className={`px-2.5 py-1 rounded-full font-mono text-[10px] font-extrabold tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5 ${perfTier === 'low' ? 'bg-[#060a14]' : 'backdrop-blur-xl'} ${
              mapFilter === 'pioneer'
                ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 text-black border border-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.55)]'
                : 'bg-amber-950/60 border border-amber-400/50 text-amber-300 hover:bg-amber-900/70 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
            }`}
            title="Filter planets created prior to official release (Jan 9, 2027)"
          >
            <Sparkles className={`w-3 h-3 ${mapFilter === 'pioneer' ? 'text-black' : 'text-amber-300'}`} />
            <span>⚡ Pioneer Worlds ({pioneerPlanetsCount})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEFT-HAND VERTICAL ARCHITECTURE & RESTRUCTURE CONTROL DOCK               */}
      {/* Sleek, minimalist vertical glassmorphic dock for mobile, tablet & desktop */}
      {/* ========================================================================= */}
      <nav
        aria-label="Constellation Architectural Layout Dock"
        className={`interactive-hud-element absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1.5 p-1.5 rounded-2xl bg-gradient-to-b from-[#060a16]/92 via-[#071026]/92 to-[#060a16]/92 ${perfTier === 'low' ? 'bg-[#060a16]' : 'backdrop-blur-2xl'} border border-cyan-500/35 shadow-[0_8px_32px_rgba(0,0,0,0.75),0_0_20px_rgba(6,182,212,0.18)] select-none`}
        style={{ touchAction: 'manipulation' }}
      >
        <div className="text-[7.5px] font-mono font-bold tracking-widest text-cyan-400/60 uppercase px-1 py-0.5 text-center hidden sm:block">
          ARCH
        </div>

        {/* Constellation Layout Variant Buttons */}
        <div className="flex flex-col items-center gap-1.5">
          {CONSTELLATION_LAYOUT_VARIANTS.map((variant) => {
            const isActive = layoutMode === variant.mode;
            const icon = variant.mode === 'spiral' ? '🌀' : '🪐';
            const shortName = variant.mode === 'spiral' ? 'Spiral' : 'Matrix';

            return (
              <button
                key={variant.mode}
                type="button"
                onClick={() => handleSwitchLayout(variant.mode)}
                disabled={isMorphing}
                className={`relative group flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 text-black shadow-[0_0_16px_rgba(251,191,36,0.6)] font-extrabold scale-105'
                    : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
                } ${isMorphing ? 'opacity-60 pointer-events-none' : ''}`}
                title={`${variant.name} (${variant.description})`}
                aria-label={`Switch to ${variant.name}`}
              >
                <span className="text-base sm:text-lg leading-none">{icon}</span>
                <span
                  className={`text-[7.5px] sm:text-[8px] font-mono tracking-tighter uppercase mt-0.5 leading-none ${
                    isActive ? 'text-black font-black' : 'text-white/60 group-hover:text-white'
                  }`}
                >
                  {shortName}
                </span>

                {/* Active Indicator Pip on Left Border */}
                {isActive && (
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r-full bg-amber-300 shadow-[0_0_8px_#fbbf24]" />
                )}

                {/* Floating Glassmorphic Tooltip on Desktop hover */}
                <span className="pointer-events-none absolute left-full ml-3 hidden sm:group-hover:flex items-center px-2.5 py-1 rounded-lg bg-[#060c18]/95 border border-cyan-500/40 text-cyan-200 text-[10px] font-mono font-semibold whitespace-nowrap shadow-xl z-50">
                  {variant.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sleek Hairline Divider */}
        <div className="w-6 h-px bg-white/15 my-0.5" />

        {/* 60+ FPS Fluid Restructure Action Button */}
        <button
          type="button"
          onClick={handleTriggerRestructure}
          disabled={isMorphing}
          className={`relative group flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/50 text-cyan-200 hover:text-white transition-all duration-200 cursor-pointer shadow-[0_0_14px_rgba(6,182,212,0.25)] active:scale-95 ${
            isMorphing ? 'opacity-60 pointer-events-none' : ''
          }`}
          title="Restructure Constellation (60fps Fluid Morph)"
          aria-label="Restructure Constellation"
        >
          <RefreshCw className={`w-4 h-4 text-cyan-300 ${isMorphing ? 'animate-spin' : ''}`} />
          <span className="text-[7.5px] sm:text-[8px] font-mono tracking-tighter uppercase text-cyan-300/80 group-hover:text-cyan-200 mt-0.5 leading-none">
            Morph
          </span>

          {/* Floating Glassmorphic Tooltip on Desktop hover */}
          <span className="pointer-events-none absolute left-full ml-3 hidden sm:group-hover:flex items-center px-2.5 py-1 rounded-lg bg-[#060c18]/95 border border-cyan-500/40 text-cyan-200 text-[10px] font-mono font-semibold whitespace-nowrap shadow-xl z-50">
            Restructure Constellation
          </span>
        </button>
      </nav>

      {/* ASTROGATION COORDINATES HUD (Bottom Left) — Direct-DOM 60fps Refs */}
      <div className={`interactive-hud-element absolute bottom-4 left-4 z-30 hidden sm:flex flex-col gap-1.5 p-3.5 rounded-2xl bg-gradient-to-br from-cyan-950/45 via-[#060a14]/90 to-[#040812]/95 ${perfTier === 'low' ? 'bg-[#060a14]' : 'backdrop-blur-xl'} border border-cyan-500/30 font-mono text-[10.5px] text-white/70 shadow-[0_8px_30px_rgba(0,0,0,0.6),0_0_20px_rgba(34,211,238,0.12)]`}>
        <div className="flex items-center gap-2 text-cyan-300 font-bold">
          <Target className="w-3.5 h-3.5 text-cyan-400" />
          <span>ASTROGATION HUD</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-white/60">
          <span>COORDINATES:</span>
          <span ref={hudCoordRef} className="text-white font-bold text-right">
            X: 0 · Y: 0
          </span>
          <span>DISTANCE TO CORE:</span>
          <span ref={hudDistRef} className="text-amber-300 font-bold text-right">
            0 AU
          </span>
          <span>OPTICAL ZOOM:</span>
          <span ref={hudZoomRef} className="text-white font-bold text-right">
            {(initialZoom * 100).toFixed(0)}%
          </span>
          <span>CONSTELLATION:</span>
          <span className="text-amber-300 font-extrabold text-right uppercase drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]">
            {layoutMode === 'spiral' ? '5-ARM SPIRAL' : 'OVAL MATRIX'}
          </span>
          <span>CHARTED WORLDS:</span>
          <span className="text-cyan-300 font-extrabold text-right drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]">
            {filteredPlanets.length} WORLDS
          </span>
          <span>PIONEER WORLDS:</span>
          <span className="text-amber-300 font-extrabold text-right drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]">
            ⚡ {pioneerPlanetsCount} PRE-RELEASE
          </span>
          <span>ENGINE STATUS:</span>
          <span className="text-right">
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-mono font-black uppercase tracking-wider ${
                perfTier === 'high'
                  ? 'bg-emerald-950/80 border border-emerald-400/60 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.35)]'
                  : perfTier === 'medium'
                  ? 'bg-cyan-950/80 border border-cyan-400/60 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.35)]'
                  : 'bg-amber-950/80 border border-amber-400/60 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.35)]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              <span>{perfTier === 'high' ? 'AAA 60FPS · ULTRA' : perfTier === 'medium' ? 'AAA 60FPS · BALANCED' : '60FPS · LITE'}</span>
            </span>
          </span>
        </div>
      </div>

      {/* FLOATING ACTION CONTROLS (Bottom Right) */}
      <div className="interactive-hud-element absolute bottom-4 right-4 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={handleTriggerRestructure}
          disabled={isMorphing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_18px_rgba(6,182,212,0.25)] min-h-[42px]"
          title="Restructure Constellation (60fps Fluid Morph)"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isMorphing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Restructure</span>
        </button>

        <button
          type="button"
          onClick={handleCenterAkinoya}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.35)] min-h-[42px]"
          title="Center on Capital Core Äkinoya (0, 0)"
        >
          <Target className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Center Äkinoya</span>
        </button>

        <div className="flex items-center bg-[#060a14] border border-white/15 rounded-xl p-0.5 shadow-lg">
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
      {/* INTERACTIVE UNIVERSAL CANVAS / NODES LAYER (60FPS DIRECT GPU TRANSFORM)   */}
      {/* ========================================================================= */}
      <div
        ref={worldRotationWrapperRef}
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: '50%',
          width: 0,
          height: 0,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        <div
          ref={worldLayerRef}
          className="relative pointer-events-auto"
          style={{
            transform: `translate3d(0px, 0px, 0) scale(${initialZoom})`,
            transformOrigin: '0 0',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
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
                planetName: 'Äkinoya Core',
                coordX: 0,
                coordY: 0,
                sectorId: 'SECTOR AKN-00 (CORE)',
                votesCount: 999,
                status: 'PUBLISHED',
                atmosphere: 'Capital of Sillow Mill',
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
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20 flex items-center justify-center select-none touch-manipulation rounded-full"
            style={{
              left: 0,
              top: 0,
              width: 72,
              height: 72,
              borderRadius: '50%',
              WebkitBorderRadius: '50%',
              backfaceVisibility: 'hidden',
            }}
          >
            {/* 1. Volumetric Golden Corona & Core Flare */}
            <div
              className="absolute -inset-10 rounded-full bg-gradient-to-tr from-amber-500/25 via-yellow-400/15 to-transparent blur-2xl animate-pulse pointer-events-none"
              style={{ borderRadius: '50%' }}
            />
            <div
              className="absolute -inset-5 rounded-full bg-amber-400/20 blur-lg pointer-events-none"
              style={{ borderRadius: '50%' }}
            />

            {/* 2. Tier 1: Outer Astrolabe Ring with 4 Cardinal Star-Diamonds (Clockwise Drift) */}
            <div
              className="absolute -inset-8 rounded-full border border-amber-400/35 galaxy-orbit-spin-slow pointer-events-none"
              style={{ borderRadius: '50%' }}
            >
              {/* Cardinal Navigation Pips */}
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45 bg-gradient-to-br from-yellow-100 to-amber-400 shadow-[0_0_8px_#fbbf24]" />
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rotate-45 bg-gradient-to-br from-yellow-100 to-amber-400 shadow-[0_0_8px_#fbbf24]" />
              <span className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45 bg-gradient-to-br from-yellow-100 to-amber-400 shadow-[0_0_8px_#fbbf24]" />
              <span className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45 bg-gradient-to-br from-yellow-100 to-amber-400 shadow-[0_0_8px_#fbbf24]" />
            </div>

            {/* 3. Tier 2: Mid Segmented Energy Crest (Counter-Clockwise Rotation) */}
            <div
              className="absolute -inset-5 rounded-full border border-dashed border-amber-300/60 galaxy-orbit-spin-reverse pointer-events-none"
              style={{ borderRadius: '50%' }}
            />

            {/* 4. Tier 3: Concentric Geometric Hairline Resonator */}
            <div
              className="absolute -inset-3 rounded-full border border-amber-400/25 pointer-events-none"
              style={{ borderRadius: '50%' }}
            />

            {/* 5. Tier 4: Inner High-Precision Dotted Orbital Halo (Clockwise Rotation) */}
            <div
              className="absolute -inset-1.5 rounded-full border border-dotted border-amber-200/90 galaxy-orbit-spin-fast pointer-events-none"
              style={{ borderRadius: '50%' }}
            />

            {/* 6. Capital Core Planet Orb: Refined 72px Scale with Luminous Gold Border */}
            <div
              className="relative w-[70px] h-[70px] sm:w-[72px] sm:h-[72px] rounded-full overflow-hidden border-2 border-amber-300 shadow-[0_0_40px_rgba(245,158,11,0.9),0_0_80px_rgba(251,191,36,0.4),inset_0_0_24px_rgba(245,158,11,0.5)] group-hover:scale-108 transition-all duration-300 bg-black flex items-center justify-center shrink-0"
              style={{
                borderRadius: '50%',
                WebkitBorderRadius: '50%',
                overflow: 'hidden',
                WebkitMaskImage: '-webkit-radial-gradient(white, black)',
              }}
            >
              <img
                src={akinoyaHeroBg}
                alt="Äkinoya Core"
                className="w-full h-full object-cover scale-110 group-hover:rotate-12 transition-transform duration-700 pointer-events-none select-none"
                style={{
                  borderRadius: '50%',
                  WebkitBorderRadius: '50%',
                }}
                draggable={false}
              />
              <div
                className="absolute inset-0 bg-gradient-to-tr from-amber-500/40 via-transparent to-yellow-200/40 pointer-events-none"
                style={{ borderRadius: '50%' }}
              />
            </div>

            {/* Capital Core Badge Label */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3.5 flex flex-col items-center pointer-events-none whitespace-nowrap text-center">
              <span className="inline-flex px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-mono font-black text-[9.5px] tracking-widest uppercase shadow-[0_0_20px_rgba(245,158,11,0.6)] items-center gap-1">
                <span>👑 ÄKINOYA CORE</span>
              </span>
              <span className="text-xs font-display font-extrabold text-white tracking-wider mt-0.5 group-hover:text-amber-300 transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                Capital of Sillow Mill
              </span>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* 2. COMMUNITY PLANET NODES (Distributed by Deterministic Coordinates) */}
          {/* ===================================================================== */}
          {filteredPlanets.map((planet, index) => {
            const posX = planet.coordX ?? 0;
            const posY = planet.coordY ?? 0;
            if (posX === 0 && posY === 0 && planet.id !== 'akinoya-core') {
              return null;
            }

            const isAmlemi = isFoundingPioneerPlanet(planet);
            const isVipPioneer = isVipPioneerPlanet(planet);
            const isPioneer = isPioneerPlanet(planet);
            const isHovered = hoveredPlanet?.id === planet.id;
            const isSelected = selectedPlanet?.id === planet.id;
            const photoCards = getPlanetPhotoCards(planet);
            const thumbnail = photoCards[0]?.url || planet.renders?.hero || '';
            const rankNumber = index + 1;
            const planetEditionNumber =
              planet.id === 'planet-amlemi-genesis-01' || planet.planetName?.toLowerCase() === 'ämlemi'
                ? 1
                : planet.id === 'planet-felix-test-01' || planet.planetName?.toLowerCase() === 'felix'
                ? 2
                : (planets.findIndex((p) => p.id === planet.id) >= 0 ? planets.findIndex((p) => p.id === planet.id) + 1 : rankNumber);

            return (
              <div
                key={planet.id}
                ref={(el) => {
                  if (el) planetNodeRefs.current.set(planet.id, el);
                  else planetNodeRefs.current.delete(planet.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlanetClick(planet);
                }}
                onPointerEnter={() => {
                  soundManager.playTone(600, 0.025);
                  setHoveredPlanet(planet);
                }}
                onPointerLeave={() => setHoveredPlanet(null)}
                className="absolute cursor-pointer group z-10 flex items-center justify-center select-none touch-manipulation rounded-full"
                style={{
                  left: 0,
                  top: 0,
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  WebkitBorderRadius: '50%',
                  transform: `translate3d(${posX}px, ${posY}px, 0) translate(-50%, -50%)`,
                  transition: isMorphing
                    ? 'transform 650ms cubic-bezier(0.16, 1, 0.3, 1)'
                    : 'none',
                  willChange: isMorphing ? 'transform' : 'auto',
                  backfaceVisibility: 'hidden',
                }}
              >
                {/* Pioneer Status Floating Marker Above Orb */}
                {isPioneer && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none whitespace-nowrap">
                    {isAmlemi ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black font-mono font-extrabold text-[8.5px] tracking-widest uppercase shadow-[0_0_16px_rgba(251,191,36,0.65)]">
                        <span>👑 FOUNDING PIONEER · #01</span>
                      </span>
                    ) : isVipPioneer ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black font-mono font-extrabold text-[8.5px] tracking-widest uppercase shadow-[0_0_14px_rgba(245,158,11,0.6)]">
                        <span>👑 VIP PIONEER</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/90 border border-amber-400/60 text-amber-300 font-mono font-extrabold text-[8px] tracking-widest uppercase shadow-[0_0_12px_rgba(245,158,11,0.35)]">
                        <span>⚡ PIONEER</span>
                      </span>
                    )}
                  </div>
                )}

                {/* 1. Radiant Pulsing Golden Halo (Ämlemi Master Anchor or Selected Planet) */}
                {(isAmlemi || isSelected) && (
                  <div
                    className="absolute -inset-4 rounded-full bg-gradient-to-tr from-amber-500/30 via-yellow-400/20 to-transparent blur-md animate-pulse pointer-events-none"
                    style={{ borderRadius: '50%' }}
                  />
                )}

                {/* 2. Outer Counter-Clockwise Orbit Ring (Exclusively for #01 Founding Pioneer Ämlemi) */}
                {isAmlemi && (
                  <div
                    className="absolute -inset-3.5 rounded-full border border-dashed border-amber-400/40 galaxy-orbit-spin-reverse pointer-events-none"
                    style={{
                      borderRadius: '50%',
                      WebkitBorderRadius: '50%',
                    }}
                  />
                )}

                {/* 3. Single Orbit Ring Standard: Concentric Rotating Dashed Orbit Ring */}
                {/* For all newly generated / community planet nodes: Exactly ONE single rotating dashed orbit ring (Minimalist & Uncluttered) */}
                <div
                  className={`absolute ${
                    isAmlemi ? '-inset-1.5' : '-inset-2.5'
                  } rounded-full border border-dashed pointer-events-none ${
                    isAmlemi ? 'galaxy-orbit-spin-fast' : 'galaxy-orbit-spin'
                  } ${
                    isAmlemi
                      ? 'border-amber-300/90 shadow-[0_0_14px_rgba(251,191,36,0.5)]'
                      : isSelected
                      ? 'border-amber-300/95 shadow-[0_0_14px_rgba(251,191,36,0.6)]'
                      : isHovered
                      ? 'border-amber-300/85 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                      : 'border-amber-400/60'
                  }`}
                  style={{
                    borderRadius: '50%',
                    WebkitBorderRadius: '50%',
                  }}
                >
                  {/* Cardinal Satellite Pip (Exclusively for #01 Founding Pioneer Ämlemi) */}
                  {isAmlemi && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_#fbbf24]"
                      style={{ borderRadius: '50%' }}
                    />
                  )}
                </div>

                {/* Celestial Planet Orb with Glowing Solid Gold Primary Border */}
                <div
                  className={`relative w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400 transition-all duration-300 bg-[#070c18] flex items-center justify-center shrink-0 ${
                    isAmlemi
                      ? 'shadow-[0_0_28px_rgba(245,158,11,0.8)] group-hover:scale-120'
                      : isSelected
                      ? 'scale-120 shadow-[0_0_26px_rgba(245,158,11,0.75)]'
                      : isHovered
                      ? 'scale-115 shadow-[0_0_22px_rgba(245,158,11,0.65)]'
                      : 'shadow-[0_0_18px_rgba(245,158,11,0.45)] group-hover:scale-110'
                  }`}
                  style={{
                    borderRadius: '50%',
                    WebkitBorderRadius: '50%',
                    overflow: 'hidden',
                    WebkitMaskImage: '-webkit-radial-gradient(white, black)',
                  }}
                >
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={planet.planetName}
                      className="w-full h-full object-cover group-hover:rotate-6 transition-transform duration-700 pointer-events-none select-none"
                      style={{
                        borderRadius: '50%',
                        WebkitBorderRadius: '50%',
                      }}
                      draggable={false}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div
                      className="w-full h-full bg-gradient-to-br from-amber-950 via-slate-900 to-black flex items-center justify-center"
                      style={{ borderRadius: '50%' }}
                    >
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                    </div>
                  )}

                  {/* Gradient atmospheric shell */}
                  <div
                    className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/20 pointer-events-none"
                    style={{ borderRadius: '50%' }}
                  />
                </div>

                {/* Planet Label: Positioned cleanly below orb without shifting orb center */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 flex flex-col items-center pointer-events-none whitespace-nowrap">
                  <span className="text-xs font-display font-bold text-white tracking-wide group-hover:text-amber-300 transition-colors drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                    {planet.planetName}
                  </span>

                  <span className="text-[9.5px] font-mono text-white/60 tracking-wider">
                    {formatAuthorName(planet.authorName || planet.authorUsername)}
                  </span>

                  <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#060c18]/90 border border-amber-400/45 shadow-[0_0_12px_rgba(251,191,36,0.28)]">
                    <span className="text-[9px] font-mono font-black text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]">
                      #{planetEditionNumber}
                    </span>
                    <span className="text-white/25 text-[8px]">·</span>
                    <span className="text-[9px] font-mono font-extrabold text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]">
                      ★ {planet.votesCount}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. UNIFIED FULL-SCREEN PORTALED DOSSIER MODAL (MOBILE, TABLET & DESKTOP)  */}
      {/* ========================================================================= */}
      <PlanetDossierModal
        planet={selectedPlanet}
        isOpen={Boolean(selectedPlanet)}
        editionRank={selectedPlanetEditionRank}
        onClose={() => setSelectedPlanet(null)}
        onVote={(id) => handleVotePlanet(id)}
        onOpenCreator={onOpenCreator}
      />

      {/* ========================================================================= */}
      {/* 4. PORTALED CAPITAL CORE ÄKINOYA MODAL (z-[9999])                         */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' ? createPortal(akinoyaModalNode, document.body) : akinoyaModalNode}
    </div>
  );
};

export default GalaxyNavigator;

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Sparkles,
  ShieldCheck,
  Camera,
  Film,
  Maximize2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Layers,
  Eye,
  Lock,
  X,
  Globe2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'motion/react';
import { PlanetSubmission } from '../types/contest';
import { getPlanetPhotoCards } from '../data/contest';
import {
  isFoundingPioneerPlanet,
  isPioneerPlanet,
  isVipPioneerPlanet,
  getPioneerMasterVideoUrl,
} from '../utils/pioneer';
import { formatTitleCaseUserName } from '../utils/holder';
import { soundManager } from '../utils/audio';
import sillowMillLogoUrl from '../assets/images/Sillowmilllogo.png';
import {
  deriveWorldVerificationMeta,
  renderWorldStoryBadgeBlob,
  downloadOrShareFileBlob,
  useDynamicWorldVideo,
  LiveStoryTrailerViewport,
  isMobileOrTabletDevice,
  getCacheBustedUrl,
  triggerDirectDownload,
  downloadOrShareVideoDirect,
  prewarmTrailerFastStartBlob,
} from './WorldStoryVerificationBadge';
import { watermarkAndSavePhoto, renderWatermarkedPhotoBlob } from '../utils/watermarkPhoto';

export type MasterAssetSlideId = 'archive_4k' | 'story_card' | 'video_trailer';

interface MyAssetsMasterCarouselProps {
  dossier: PlanetSubmission;
  editionRank?: number;
  isSimulationMode?: boolean;
  onUnlockSimulation?: () => void;
  onNavigateToGalaxy?: (planetId?: string) => void;
}

const SLIDE_TABS: {
  id: MasterAssetSlideId;
  index: string;
  label: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'video_trailer',
    index: '01',
    label: '9:16 MP4 Trailer Loop',
    badge: 'VAL.AI FPV',
    icon: Film,
  },
  {
    id: 'story_card',
    index: '02',
    label: '9:16 Story Verification Card',
    badge: 'OFFICIAL AFFICHE',
    icon: ShieldCheck,
  },
  {
    id: 'archive_4k',
    index: '03',
    label: '4K Planetary Archive',
    badge: '4K UHD MASTER',
    icon: Camera,
  },
];

/**
 * Loads an image safely with crossOrigin fallback for Canvas rendering.
 */
function loadImageForCanvas(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      const fallback = new Image();
      fallback.onload = () => resolve(fallback);
      fallback.onerror = () => resolve(null);
      fallback.src = src;
    };
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Cleanly embeds Sillowmilllogo.png and official universe provenance
 * as a subtle, high-end watermark in the bottom-left corner of any exported planetary image.
 */
export async function renderWatermarkedImageBlob(
  sourceUrl: string,
  meta: {
    planetName?: string;
    stageCategory?: string;
    verificationCode?: string;
    authorName?: string;
  }
): Promise<Blob | null> {
  return renderWatermarkedPhotoBlob(sourceUrl, {
    planetName: meta.planetName,
    category: meta.stageCategory,
  });
}

/**
 * 9:16 Official Story Verification Card view component.
 * Rendered identically on both the main carousel slide and inside the fullscreen viewer modal.
 */
const StoryCard9x16View: React.FC<{
  dossier: PlanetSubmission;
  meta: ReturnType<typeof deriveWorldVerificationMeta>;
  photoCards: ReturnType<typeof getPlanetPhotoCards>;
  onTapToFullscreen?: () => void;
  showFullscreenHint?: boolean;
}> = ({ dossier, meta, photoCards, onTapToFullscreen, showFullscreenHint = false }) => {
  const heroPhoto = photoCards[0];
  const subPhotos = photoCards.slice(1, 5);

  return (
    <div
      onClick={onTapToFullscreen}
      className={`relative w-full max-w-[340px] sm:max-w-[375px] aspect-[9/16] rounded-[26px] p-3.5 sm:p-4 bg-gradient-to-b from-[#040915] via-[#060d1f] to-[#02050b] border-2 border-amber-400/60 shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_35px_rgba(245,158,11,0.22)] flex flex-col justify-between overflow-hidden select-none ${
        onTapToFullscreen
          ? 'cursor-pointer group active:scale-[0.99] transition-all hover:border-amber-300 hover:shadow-[0_25px_80px_rgba(245,158,11,0.35)]'
          : ''
      }`}
    >
      {/* Inner Cyan Hairline Frame */}
      <div className="absolute inset-2 rounded-[20px] border border-cyan-400/25 pointer-events-none z-20" />
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-cyan-400/15 rounded-full blur-2xl pointer-events-none" />

      {/* Interactive Fullscreen Tap Badge - Exclusively Mobile/Tablet (lg:hidden) */}
      {showFullscreenHint && (
        <div className="absolute top-3.5 right-3.5 z-30 pointer-events-none lg:hidden">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/85 border border-amber-400/70 text-[9px] font-mono font-bold text-amber-300 tracking-wider shadow-lg backdrop-blur-md group-hover:scale-105 group-hover:bg-amber-950/90 transition-all">
            <Maximize2 className="w-3 h-3 text-amber-300" />
            <span>FULLSCREEN 9:16</span>
          </div>
        </div>
      )}

      {/* 1. TOP-LEVEL BRANDING HEADER */}
      <div className="relative z-10 flex items-center justify-between gap-2 pb-2 border-b border-white/15">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/[0.06] border border-white/20 p-1.5 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(255,255,255,0.16)]">
            <img
              src={sillowMillLogoUrl}
              alt="Sillow Mill Official Logo"
              className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.55)]"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs sm:text-[13px] font-display font-black tracking-[0.16em] text-white uppercase leading-none truncate drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
              SILLOW MILL
            </div>
            <div className="text-[7.5px] sm:text-[8px] font-mono font-extrabold text-white/90 tracking-[0.13em] uppercase mt-1 truncate">
              CELOMILLE · ÄKINOYA UNIVERSE
            </div>
          </div>
        </div>

        <div className="shrink-0 min-w-[50px] sm:min-w-[58px] px-2.5 py-1 rounded-xl bg-gradient-to-br from-amber-500/30 via-yellow-500/20 to-cyan-500/20 border border-amber-300/75 flex flex-col items-center justify-center text-center shadow-[0_0_15px_rgba(251,191,36,0.35)]">
          <span className="block text-[6.5px] font-mono font-bold uppercase tracking-widest text-amber-200/90">
            EDITION
          </span>
          <span className="block text-xs sm:text-sm font-display font-black bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent leading-tight">
            #{meta.worldNumber}
          </span>
        </div>
      </div>

      {/* 2. PLANET TITLE, HOLDER INFO & SECTOR SPECIFICATIONS */}
      <div className="relative z-10 pt-1.5 pb-1.5 border-b border-cyan-400/20">
        <div className="inline-flex items-center gap-1 text-[8px] sm:text-[8.5px] font-mono font-extrabold text-amber-300 uppercase tracking-wider">
          <Sparkles className="w-2.5 h-2.5 text-amber-300 shrink-0" />
          <span className="truncate">
            {meta.isAmlemi
              ? 'FOUNDING PIONEER · GENESIS BENCHMARK'
              : meta.isVipPioneer
              ? 'VIP PIONEER · 2027 ARCHIVE'
              : meta.isPioneer
              ? 'PIONEER 2027 · PRE-RELEASE'
              : 'VERIFIED PLANETARY ARCHIVE'}
          </span>
        </div>
        <h4 className="text-base sm:text-lg font-display font-black text-white tracking-wide uppercase truncate mt-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
          {dossier.planetName}
        </h4>
        <div className="text-[8.5px] sm:text-[9px] font-mono text-white/85 truncate mt-0.5">
          HOLDER: <strong className="text-white font-bold">{formatTitleCaseUserName(dossier.authorName)}</strong> ·{' '}
          <span className="text-cyan-300 font-bold">{dossier.sectorId || 'SECTOR AKN-01'}</span>
        </div>
      </div>

      {/* 3. 5-Photo Vertical Collage */}
      <div className="relative z-10 flex-1 my-1.5 flex flex-col gap-1.5 min-h-0">
        <div className="relative flex-[1.3] min-h-0 rounded-xl overflow-hidden border border-amber-400/55 bg-slate-950 shadow-md">
          {heroPhoto?.url && (
            <img
              src={heroPhoto.url}
              alt={heroPhoto.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent pointer-events-none" />
          <div className="absolute top-1.5 left-2 px-1.5 py-0.5 rounded bg-black/75 border border-amber-400/40 text-[7px] font-mono font-bold text-amber-300 uppercase tracking-wider">
            01_MAIN · ORBITAL HORIZON
          </div>
          <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between gap-1">
            <span className="text-[9.5px] font-sans font-bold text-white truncate">
              {heroPhoto?.title || 'Orbital Horizon'}
            </span>
            <span className="text-[7px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-400/40 px-1.5 py-0.2 rounded">
              4K VERIFIED
            </span>
          </div>
        </div>

        <div className="flex-[1.5] grid grid-cols-2 grid-rows-2 gap-1.5 min-h-0">
          {subPhotos.map((photo, idx) => {
            const slotTags = ['02 · FLORA', '03 · FAUNA', '04 · CANOPY', '05 · LORE'];
            return (
              <div
                key={photo.id || idx}
                className="relative rounded-lg overflow-hidden border border-cyan-400/35 bg-slate-950 min-h-0"
              >
                {photo.url && (
                  <img
                    src={photo.url}
                    alt={photo.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent pointer-events-none" />
                <div className="absolute bottom-1 left-1.5 right-1.5">
                  <span className="block text-[6.5px] font-mono font-bold text-cyan-300 uppercase tracking-wider truncate">
                    {slotTags[idx]}
                  </span>
                  <span className="block text-[8px] font-sans font-semibold text-white truncate">
                    {photo.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Streamlined Minimalist Footer */}
      <div className="relative z-10 p-2 rounded-xl bg-[#071022]/90 border border-amber-400/35 space-y-1.5">
        <p className="text-[8px] sm:text-[8.5px] font-sans italic text-amber-100/95 line-clamp-1 leading-snug">
          &ldquo;
          {dossier.futurePromise ||
            dossier.generatedLore ||
            'Synthesized planetary archive bound to the Sillow Mill universe.'}
          &rdquo;
        </p>

        <div className="px-2 py-1 rounded-lg bg-[#040914]/95 border border-cyan-400/35 flex items-center justify-between gap-1.5 text-[7.5px] font-mono">
          <span className="text-cyan-300 font-bold truncate">
            CODE: {meta.verificationCode}
          </span>
          <span className="text-emerald-400 font-bold shrink-0">● AUTHENTICATED</span>
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <img
              src={sillowMillLogoUrl}
              alt="Sillow Mill Logo"
              className="w-5 h-5 object-contain shrink-0 drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]"
            />
            <span className="text-[7.5px] font-display font-black tracking-[0.12em] text-white uppercase truncate">
              SILLOW MILL
            </span>
          </div>
          <span className="text-[7px] font-mono text-white/60 shrink-0">sillowmill.com</span>
        </div>
      </div>
    </div>
  );
};

export const MyAssetsMasterCarousel: React.FC<MyAssetsMasterCarouselProps> = React.memo(({
  dossier,
  editionRank,
  isSimulationMode = false,
  onUnlockSimulation,
  onNavigateToGalaxy,
}) => {
  const [activeSlide, setActiveSlide] = useState<MasterAssetSlideId>('video_trailer');
  const [slideDirection, setSlideDirection] = useState<number>(1);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);
  const [isExportingBadge, setIsExportingBadge] = useState<boolean>(false);
  const [isExportingTrailer, setIsExportingTrailer] = useState<boolean>(false);
  const [isCopiedCode, setIsCopiedCode] = useState<boolean>(false);
  const [isDownloadingPhoto, setIsDownloadingPhoto] = useState<boolean>(false);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<{ url: string; title: string; category: string } | null>(null);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState<boolean>(false);
  const [fullscreenSlide, setFullscreenSlide] = useState<MasterAssetSlideId>('video_trailer');

  // Video playback controls for Slide 1
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Touch gesture tracking for smooth swipe navigation
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const carouselContainerRef = useRef<HTMLDivElement | null>(null);

  // Dynamic Val.ai / Fal.ai Video Pipeline check & automatic promotion
  const dynamicVideo = useDynamicWorldVideo(dossier);

  // Prewarm FastStart MP4 trailer blob for 0ms instantaneous saving/sharing to iOS Photos & Desktop
  useEffect(() => {
    if (dossier) {
      const activeVideoUrl =
        getPioneerMasterVideoUrl(dossier) ||
        dynamicVideo.videoUrl ||
        dossier.videoUrl ||
        dossier.renders?.videoUrl ||
        dossier.renders?.video_url;
      if (activeVideoUrl) {
        prewarmTrailerFastStartBlob(activeVideoUrl, dossier);
      }
    }
  }, [dossier, dynamicVideo.videoUrl]);

  const photoCards = useMemo(() => getPlanetPhotoCards(dossier), [dossier]);
  const meta = useMemo(
    () => deriveWorldVerificationMeta(dossier, editionRank),
    [dossier, editionRank]
  );

  const activePhoto = photoCards[activePhotoIdx] || photoCards[0];
  const worldNameDisplay = (dossier.planetName || 'ÄMLEMI').toUpperCase();

  // Handle slide transitions circularly: Video Trailer (01) -> Story Card (02) -> 4K Archive (03)
  const slideOrder: MasterAssetSlideId[] = ['video_trailer', 'story_card', 'archive_4k'];

  const goToSlide = useCallback(
    (target: MasterAssetSlideId, direction?: number) => {
      soundManager.playTone(620, 0.04);
      const currentIndex = slideOrder.indexOf(activeSlide);
      const targetIndex = slideOrder.indexOf(target);
      const dir = direction !== undefined ? direction : targetIndex >= currentIndex ? 1 : -1;
      setSlideDirection(dir);
      setActiveSlide(target);
    },
    [activeSlide, slideOrder]
  );

  const handlePrevSlide = useCallback(() => {
    const currentIndex = slideOrder.indexOf(activeSlide);
    const prevIndex = (currentIndex - 1 + slideOrder.length) % slideOrder.length;
    goToSlide(slideOrder[prevIndex], -1);
  }, [activeSlide, slideOrder, goToSlide]);

  const handleNextSlide = useCallback(() => {
    const currentIndex = slideOrder.indexOf(activeSlide);
    const nextIndex = (currentIndex + 1) % slideOrder.length;
    goToSlide(slideOrder[nextIndex], 1);
  }, [activeSlide, slideOrder, goToSlide]);

  const openFullscreenViewer = useCallback((slideId: MasterAssetSlideId) => {
    soundManager.playTone(720, 0.05);
    setFullscreenSlide(slideId);
    if (slideId === 'archive_4k') {
      setFullscreenPhoto(activePhoto);
    }
    setIsFullscreenModalOpen(true);
  }, [activePhoto]);

  const handlePrevFullscreenSlide = useCallback(() => {
    const currentIndex = slideOrder.indexOf(fullscreenSlide);
    const prevIndex = (currentIndex - 1 + slideOrder.length) % slideOrder.length;
    soundManager.playTone(600, 0.03);
    setFullscreenSlide(slideOrder[prevIndex]);
  }, [fullscreenSlide, slideOrder]);

  const handleNextFullscreenSlide = useCallback(() => {
    const currentIndex = slideOrder.indexOf(fullscreenSlide);
    const nextIndex = (currentIndex + 1) % slideOrder.length;
    soundManager.playTone(600, 0.03);
    setFullscreenSlide(slideOrder[nextIndex]);
  }, [fullscreenSlide, slideOrder]);

  // Keyboard navigation when user is on carousel or in fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFullscreenModalOpen) {
        if (e.key === 'Escape') {
          setIsFullscreenModalOpen(false);
          setFullscreenPhoto(null);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePrevFullscreenSlide();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextFullscreenSlide();
        }
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevSlide();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextSlide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevSlide, handleNextSlide, isFullscreenModalOpen, handlePrevFullscreenSlide, handleNextFullscreenSlide]);

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      if (dx < 0) {
        handleNextSlide();
      } else {
        handlePrevSlide();
      }
    }
  };

  // Copy Verification Code
  const handleCopyCode = () => {
    soundManager.playTone(720, 0.05);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(meta.verificationCode);
      setIsCopiedCode(true);
      setTimeout(() => setIsCopiedCode(false), 2200);
    }
  };

  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(() =>
    typeof window !== 'undefined' ? isMobileOrTabletDevice() : false
  );
  useEffect(() => {
    setIsMobileDevice(isMobileOrTabletDevice());
  }, []);

  // Save High-Resolution 4K Picture with Sillow Mill Trademark Watermark to Photos
  const handleDownload4kPhoto = async () => {
    if (!activePhoto?.url) return;
    soundManager.playTone(740, 0.06);
    setIsDownloadingPhoto(true);
    const safePlanet = (dossier.planetName || 'akinoya-world').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const safeStage = activePhoto.category.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const filename = `sillowmill-${safePlanet}-4k-${safeStage}.jpg`;
    const shareTitle = `${dossier.planetName || 'Ämlemi'} — 4K Master Picture`;
    const shareText = `Verified Genesis World: ${activePhoto.title}`;

    try {
      await watermarkAndSavePhoto(activePhoto.url, filename, shareTitle, shareText, {
        planetName: dossier.planetName,
        photoTitle: activePhoto.title,
        category: activePhoto.category,
        worldNumber: meta.worldNumber,
        slotIndex: activePhotoIdx,
        dossier,
      });
    } finally {
      setIsDownloadingPhoto(false);
    }
  };

  // Download 9:16 Story Badge (PNG or Camera Roll via Web Share on iOS)
  const handleDownloadStoryBadge = async () => {
    soundManager.playTone(780, 0.07);
    setIsExportingBadge(true);
    try {
      const blob = await renderWorldStoryBadgeBlob(dossier, editionRank);
      if (!blob) return;
      const safeName = (dossier.planetName || 'akinoya-world').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      const filename = `sillowmill-${safeName}-story-badge-9x16.png`;
      const shareTitle = `${dossier.planetName || 'Ämlemi'} — 9:16 Story Card`;
      const shareText = `Verified Genesis World: ${dossier.planetName || 'Ämlemi'}`;
      await downloadOrShareFileBlob(blob, filename, 'image/png', shareTitle, shareText);
    } finally {
      setIsExportingBadge(false);
    }
  };

  // Share 9:16 Story Badge
  const handleShareStoryBadge = async () => {
    soundManager.playTone(840, 0.07);
    setIsExportingBadge(true);
    try {
      const blob = await renderWorldStoryBadgeBlob(dossier, editionRank);
      if (!blob) return;
      const safeName = (dossier.planetName || 'akinoya-world').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      const file = new File([blob], `sillowmill-${safeName}-story-9x16.png`, { type: 'image/png' });

      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${dossier.planetName} — Sillow Mill 9:16 Story Verification Badge`,
          text: `Verified Planetary Dossier #${meta.worldNumber}: ${dossier.planetName} (${meta.verificationCode})`,
          url: meta.shareUrl,
          files: [file],
        });
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sillowmill-${safeName}-story-badge-9x16.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // User cancelled share sheet
    } finally {
      setIsExportingBadge(false);
    }
  };

  // Download 9:16 MP4 Trailer
  const handleDownloadTrailerMp4 = async () => {
    soundManager.playTone(740, 0.07);
    setIsExportingTrailer(true);
    const safeName = (dossier.planetName || 'akinoya-world').toLowerCase().replace(/[^a-z0-9-_]/g, '-');

    const filename = `sillowmill-${safeName}-9x16-trailer.mp4`;
    const shareTitle = `${dossier.planetName || 'Ämlemi'} — Sillow Mill 9:16 Trailer`;
    const shareText = `Verified Genesis World: ${dossier.planetName || 'Ämlemi'}`;

    try {
      const activeVideoUrl =
        getPioneerMasterVideoUrl(dossier) ||
        dynamicVideo.videoUrl ||
        dossier.videoUrl ||
        dossier.renders?.videoUrl ||
        dossier.renders?.video_url ||
        '/assets/videos/amlemi_trailer.mp4';

      await downloadOrShareVideoDirect(activeVideoUrl, filename, shareTitle, shareText, dossier, editionRank);
    } finally {
      setIsExportingTrailer(false);
    }
  };

  const lastTouchTimeRef = useRef<number>(0);
  const lastAudioTouchTimeRef = useRef<number>(0);

  const toggleVideoPlayback = (e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
      if ('preventDefault' in e && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
    }
    const video = videoElementRef.current;
    if (video) {
      const willPlay = video.paused;
      soundManager.playTone(willPlay ? 660 : 440, 0.05);
      requestAnimationFrame(() => {
        if (!video) return;
        if (willPlay) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
        setIsPlayingVideo(willPlay);
      });
    } else {
      soundManager.playTone(isPlayingVideo ? 440 : 660, 0.05);
      setIsPlayingVideo((prev) => !prev);
    }
  };

  const toggleAudio = (e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
      if ('preventDefault' in e && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
    }
    const video = videoElementRef.current;
    if (video) {
      const nextMuted = !video.muted;
      soundManager.playTone(nextMuted ? 440 : 680, 0.05);
      requestAnimationFrame(() => {
        if (!video) return;
        video.muted = nextMuted;
        setIsMuted(nextMuted);
      });
    } else {
      soundManager.playTone(isMuted ? 680 : 440, 0.05);
      setIsMuted((prev) => !prev);
    }
  };

  // Slide Animation Variants
  const slideVariants: Variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 80 : -80,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring' as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.28 },
        scale: { duration: 0.28 },
      },
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 80 : -80,
      opacity: 0,
      scale: 0.98,
      transition: {
        x: { type: 'spring' as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
      },
    }),
  };

  const heroPhoto = photoCards[0];
  const subPhotos = photoCards.slice(1, 5);

  return (
    <div
      ref={carouselContainerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        willChange: 'transform',
        overflowAnchor: 'none',
      }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#080d1a] via-[#050914] to-[#02050b] border-2 border-amber-400/50 shadow-[0_20px_70px_rgba(0,0,0,0.85),0_0_40px_rgba(245,158,11,0.18)] p-4 sm:p-6 md:p-8 space-y-6 select-none"
    >
      {/* Ambient Radial Specular Glows */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/80 to-transparent pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-500/12 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-500/12 rounded-full blur-3xl pointer-events-none" />

      {/* ─── 1. TOP CAROUSEL HEADER: SINGLE ÄMLEMI DISPLAY & PROVENANCE ─── */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-extrabold tracking-widest uppercase bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.45)]">
              <Sparkles className="w-3 h-3 text-black shrink-0" />
              <span>MY ASSETS · MASTER MULTI-MEDIA CAROUSEL</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-cyan-950/90 text-cyan-200 border border-cyan-400/40">
              <ShieldCheck className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>AUTHENTICATED ARTIFACT SUITE</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-400/40">
              <span>EDITION #{meta.worldNumber}</span>
            </span>
          </div>

          {/* Primary World Identifier Headline with Official Sillow Mill Emblem & Chrome Divider */}
          <div className="flex items-center gap-2.5 sm:gap-3 pt-0.5">
            {/* Shimmering Logo with subtle cinematic glow & glass housing */}
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-white/[0.12] via-white/[0.04] to-transparent p-1.5 border border-white/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none opacity-70" />
              <img
                src={sillowMillLogoUrl}
                alt="Sillow Mill Emblem"
                className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]"
              />
            </div>

            {/* Minimalist Reflective Chrome / Brushed Metal Vertical Divider */}
            <div
              className="h-5 sm:h-6 w-[1.5px] bg-gradient-to-b from-white/10 via-white/50 to-white/10 shadow-[0_0_8px_rgba(255,255,255,0.35)] shrink-0"
              aria-hidden="true"
            />

            <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-black text-white tracking-wide uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
              {worldNameDisplay}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-white/70">
            <span>
              HOLDER: <strong className="text-white font-bold">{formatTitleCaseUserName(dossier.authorName)}</strong>
            </span>
            <span>·</span>
            <span className="text-cyan-300 font-bold">{dossier.sectorId || 'SECTOR AKN-01'}</span>
            <span>·</span>
            <span className="text-amber-300 font-semibold">{meta.verificationCode}</span>
            <span>·</span>
            <span className="text-white/50">ENGINE: NAJNO BANAJNA 8K</span>
          </div>
        </div>

        {/* Global Slide Navigation Counter & Quick Links */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onNavigateToGalaxy && (
            <button
              type="button"
              onClick={() => onNavigateToGalaxy(dossier.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/40 text-cyan-200 text-xs font-mono font-semibold transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.2)]"
            >
              <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Explore in</span> Galaxy
            </button>
          )}

          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-xs font-mono font-bold text-white/70">
            SLIDE <span className="text-amber-300">{slideOrder.indexOf(activeSlide) + 1}</span> / 3
          </div>
        </div>
      </div>

      {/* ─── 2. DISTINCT 3-BUTTON ASSET SELECTOR SUITE ─── */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 w-full">
        {SLIDE_TABS.map((tab) => {
          const isActive = activeSlide === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => goToSlide(tab.id)}
              className={`relative flex items-center justify-between sm:justify-start gap-3 px-4 py-3.5 rounded-2xl font-mono text-xs font-bold transition-all duration-200 cursor-pointer min-h-[58px] border-2 shadow-lg active:scale-[0.98] hover:scale-[1.01] touch-manipulation ${
                isActive
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 border-amber-300 text-black shadow-[0_0_30px_rgba(245,158,11,0.45),0_8px_24px_rgba(0,0,0,0.6)] font-extrabold'
                  : 'bg-[#060c1c]/90 hover:bg-[#0c1630] border-white/15 hover:border-cyan-400/50 text-white/80 hover:text-white shadow-[0_6px_20px_rgba(0,0,0,0.5)]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black border transition-all ${
                    isActive
                      ? 'bg-black text-amber-300 border-black/40 shadow-sm'
                      : 'bg-cyan-950/80 text-cyan-300 border-cyan-400/40'
                  }`}
                >
                  {tab.index}
                </span>
                <div className="text-left min-w-0">
                  <span className="block truncate tracking-wide uppercase text-xs sm:text-[12.5px] leading-tight font-extrabold">
                    {tab.label}
                  </span>
                  <span
                    className={`block text-[9.5px] font-mono tracking-widest uppercase mt-0.5 ${
                      isActive ? 'text-black/85 font-extrabold' : 'text-cyan-400/90'
                    }`}
                  >
                    {tab.badge}
                  </span>
                </div>
              </div>

              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                  isActive
                    ? 'bg-black/20 text-black border-black/20'
                    : 'bg-white/5 text-cyan-400 border-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── 3. CAROUSEL MAIN VIEWPORT WITH SLEEK FLOATING CIRCULAR BLUE ARROWS ─── */}
      <div
        ref={carouselContainerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          willChange: 'transform',
          overflowAnchor: 'none',
        }}
        className="relative z-10 min-h-[580px] sm:min-h-[620px] flex items-center justify-center"
      >
        {/* Sleek Minimalist Circular Blue Navigation Arrow (Left) - Symmetrically anchored floating arrow */}
        <button
          type="button"
          onClick={handlePrevSlide}
          className="absolute -left-2 sm:-left-4 lg:-left-5 xl:-left-6 top-1/2 -translate-y-1/2 z-30 min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#040916]/92 hover:bg-cyan-950/95 border-2 border-cyan-400/60 hover:border-cyan-300 text-cyan-300 hover:text-white flex items-center justify-center transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.9),0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] cursor-pointer active:scale-95 hover:scale-105 touch-manipulation group"
          aria-label="Previous Asset Slide"
          title="Previous Asset Slide (or press Left Arrow)"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-300 group-hover:scale-110 transition-transform" />
        </button>

        {/* Sleek Minimalist Circular Blue Navigation Arrow (Right) - Symmetrically anchored floating arrow */}
        <button
          type="button"
          onClick={handleNextSlide}
          className="absolute -right-2 sm:-right-4 lg:-right-5 xl:-right-6 top-1/2 -translate-y-1/2 z-30 min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#040916]/92 hover:bg-cyan-950/95 border-2 border-cyan-400/60 hover:border-cyan-300 text-cyan-300 hover:text-white flex items-center justify-center transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.9),0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] cursor-pointer active:scale-95 hover:scale-105 touch-manipulation group"
          aria-label="Next Asset Slide"
          title="Next Asset Slide (or press Right Arrow)"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-300 group-hover:scale-110 transition-transform" />
        </button>

        {/* Dynamic Multi-Media Carousel Slides Container */}
        <div
          className="w-full px-2 sm:px-8 lg:px-10 touch-pan-y-lock"
          style={{ touchAction: 'pan-y' }}
        >
          <AnimatePresence mode="wait" custom={slideDirection}>
            {/* ══════════════════════════════════════════════════════════════════
                SLIDE 1: 4K PLANETARY RENDER ARCHIVE (Image 4 format)
               ══════════════════════════════════════════════════════════════════ */}
            {activeSlide === 'archive_4k' && (
              <motion.div
                key="slide-archive-4k"
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                style={{
                  transform: 'translate3d(0, 0, 0)',
                  WebkitTransform: 'translate3d(0, 0, 0)',
                  willChange: 'transform, opacity',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
                className="space-y-4"
              >
                {/* Main 4K Cinematic Display Stage - Completely Pure, Crisp & Uncluttered Render */}
                <div
                  onClick={() => openFullscreenViewer('archive_4k')}
                  className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-[520px] rounded-2xl overflow-hidden bg-black border border-amber-400/40 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_30px_rgba(245,158,11,0.15)] group cursor-pointer hover:border-amber-300 transition-all select-none"
                  title="Click to view 4K master in full screen"
                >
                  {activePhoto?.url && (
                    <img
                      src={activePhoto.url}
                      alt={activePhoto.title}
                      loading="eager"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-[1.015] transition-transform duration-700 select-none pointer-events-none"
                    />
                  )}
                </div>

                {/* Clean Information & Action Bar Below the 4K Render (Zero Overlap on Image) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-1">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-display font-black text-white tracking-wide truncate">
                        {activePhoto.title}
                      </h3>
                      <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-400/40 text-[9.5px] font-mono font-bold text-amber-300 uppercase tracking-wider">
                        {activePhoto.category}
                      </span>
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-400/30 text-[9.5px] font-mono text-cyan-300">
                        3840 × 2160 UHD
                      </span>
                    </div>
                    <p className="text-xs font-sans text-white/70 line-clamp-1 leading-relaxed">
                      {activePhoto.description || 'Synthesized high-detail planetary sector telemetry.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openFullscreenViewer('archive_4k')}
                      className="inline-flex lg:hidden items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-cyan-300 text-xs font-mono font-bold transition-all cursor-pointer min-h-[42px] touch-manipulation"
                      title="Inspect in 4K Fullscreen"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-cyan-300" />
                      <span>FULLSCREEN</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload4kPhoto();
                      }}
                      disabled={isDownloadingPhoto}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-mono text-xs font-extrabold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.35)] shrink-0 min-h-[42px] touch-manipulation"
                      title="Save watermarked 4K Master Picture directly to device Photos"
                    >
                      <Download className="w-4 h-4 text-black" />
                      <span>
                        {isDownloadingPhoto
                          ? 'Saving picture to Photos...'
                          : 'Save picture to Photos'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 5-Photo Stage Thumbnails Strip (01 Main through 05 Lore) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                  {photoCards.slice(0, 5).map((card, idx) => {
                    const isSelected = idx === activePhotoIdx;
                    return (
                      <button
                        key={card.id || idx}
                        type="button"
                        onClick={() => {
                          soundManager.playTone(660 + idx * 30, 0.04);
                          setActivePhotoIdx(idx);
                        }}
                        className={`group relative rounded-xl overflow-hidden aspect-[4/3] border-2 transition-all duration-300 cursor-pointer text-left ${
                          isSelected
                            ? 'border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.45)] scale-[1.02]'
                            : 'border-white/10 hover:border-cyan-400/60 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <img src={card.url} alt={card.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                        <div className="absolute top-1.5 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-mono font-bold text-amber-300">
                          0{idx + 1}
                        </div>
                        <div className="absolute bottom-1.5 left-2 right-2">
                          <span className="block text-[9px] font-mono text-cyan-300 uppercase tracking-wider truncate">
                            {card.category.split('·')[1]?.trim() || card.category}
                          </span>
                          <span className="block text-[10.5px] font-sans font-bold text-white truncate">
                            {card.title}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                SLIDE 2: INTERACTIVE 9:16 STORY VERIFICATION CARD (Image 6 format)
               ══════════════════════════════════════════════════════════════════ */}
            {activeSlide === 'story_card' && (
              <motion.div
                key="slide-story-card"
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                style={{
                  transform: 'translate3d(0, 0, 0)',
                  WebkitTransform: 'translate3d(0, 0, 0)',
                  willChange: 'transform, opacity',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
                className="flex flex-col lg:flex-row items-center justify-center gap-6 md:gap-8 py-2"
              >
                {/* 9:16 Story Card View Component with Fullscreen Tap Handler */}
                <StoryCard9x16View
                  dossier={dossier}
                  meta={meta}
                  photoCards={photoCards}
                  onTapToFullscreen={() => openFullscreenViewer('story_card')}
                  showFullscreenHint
                />

                {/* Side Specifications & Direct Download Actions Panel */}
                <div className="space-y-4 max-w-md w-full">
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase bg-cyan-950/90 text-cyan-200 border border-cyan-400/40">
                      ARTIFACT 02 · SOCIAL STORY AFFICHE
                    </span>
                    <h3 className="text-lg sm:text-xl font-display font-black text-white tracking-wide">
                      Official 9:16 Story Verification Badge
                    </h3>
                    <p className="text-xs font-sans text-white/70 leading-relaxed">
                      Pixel-perfect 1080×1920 social story card format. Tailored for TikTok, Instagram Stories, YouTube Shorts, and X. Contains the cryptographic verification hash confirming your world ownership.
                    </p>
                  </div>

                  {/* Verification Code Box */}
                  <div className="p-3.5 rounded-xl bg-black/60 border border-cyan-400/30 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block text-[9.5px] font-mono text-white/50 uppercase">CRYPTOGRAPHIC CODE</span>
                      <span className="block text-xs font-mono font-bold text-cyan-300 truncate">
                        {meta.verificationCode}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/40 text-cyan-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      {isCopiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopiedCode ? 'COPIED' : 'COPY'}</span>
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadStoryBadge}
                      disabled={isExportingBadge}
                      className="w-full px-5 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-mono text-xs font-extrabold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(245,158,11,0.4)] min-h-[46px]"
                    >
                      <Download className="w-4 h-4 text-black" />
                      <span>
                        {isExportingBadge
                          ? (isMobileDevice ? 'SAVING STORY CARD TO PHOTOS...' : 'RENDERING HIGH-RES AFFICHE...')
                          : (isMobileDevice ? 'SAVE STORY CARD TO PHOTOS' : 'DOWNLOAD 9:16 STORY CARD (PNG)')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShareStoryBadge}
                      disabled={isExportingBadge}
                      className="w-full px-5 py-3.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/50 text-cyan-200 hover:text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(6,182,212,0.25)] min-h-[46px]"
                    >
                      <Share2 className="w-4 h-4 text-cyan-300" />
                      <span>SHARE TO INSTAGRAM / TIKTOK</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                SLIDE 3: ANIMATED 9:16 MP4 TRAILER LOOP (Val.ai Pipeline)
               ══════════════════════════════════════════════════════════════════ */}
            {activeSlide === 'video_trailer' && (
              <motion.div
                key="slide-video-trailer"
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                style={{
                  transform: 'translate3d(0, 0, 0)',
                  WebkitTransform: 'translate3d(0, 0, 0)',
                  willChange: 'transform, opacity',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
                className="flex flex-col lg:flex-row items-center justify-center gap-6 md:gap-8 py-2"
              >
                {/* 9:16 Animated Video Trailer Stage */}
                <div
                  onClick={(e) => {
                    // Tap on stage toggles playback cleanly without triggering fullscreen takeover
                    toggleVideoPlayback(e);
                  }}
                  style={{
                    transform: 'translateZ(0)',
                    WebkitTransform: 'translateZ(0)',
                    willChange: 'transform',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    touchAction: 'pan-y',
                  }}
                  className="video-stage-container video-player-gpu relative w-full max-w-[340px] sm:max-w-[375px] aspect-[9/16] rounded-[26px] overflow-hidden bg-[#030712] border-2 border-cyan-400/60 shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_35px_rgba(6,182,212,0.25)] flex flex-col justify-between select-none cursor-pointer group md:hover:border-cyan-300 md:hover:shadow-[0_25px_80px_rgba(6,182,212,0.4)] md:transition-all touch-pan-y-lock"
                >
                  {/* Interactive Fullscreen Tap Badge */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openFullscreenViewer('video_trailer');
                    }}
                    className="absolute top-3.5 right-3.5 z-30 pointer-events-auto cursor-pointer focus:outline-none"
                    title="Open Fullscreen 9:16"
                    aria-label="Open Fullscreen 9:16"
                  >
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/85 border border-cyan-400/70 text-[9px] font-mono font-bold text-cyan-300 tracking-wider shadow-lg backdrop-blur-md hover:bg-cyan-950/90 hover:scale-105 transition-all">
                      <Maximize2 className="w-3 h-3 text-cyan-300" />
                      <span>FULLSCREEN 9:16</span>
                    </div>
                  </button>

                  <LiveStoryTrailerViewport
                    dossier={dossier}
                    meta={meta}
                    photoCards={photoCards}
                    activeVideoUrl={dynamicVideo.videoUrl}
                    isMuted={isMuted}
                    onToggleAudio={toggleAudio}
                    isPlaying={isPlayingVideo}
                    onTogglePlay={toggleVideoPlayback}
                    onPlaybackStateChange={setIsPlayingVideo}
                    onVideoElementReady={(el) => {
                      videoElementRef.current = el;
                    }}
                  />

                  {/* Playback Controls Floating Bar */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-14 left-3 right-3 z-30 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-black/85 border border-white/20 backdrop-blur-md touch-control-lock"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleVideoPlayback}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
                        title={isPlayingVideo ? 'Pause Video' : 'Play Video'}
                      >
                        {isPlayingVideo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                      </button>
                      <button
                        type="button"
                        onClick={toggleAudio}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
                        title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4 text-white/60" /> : <Volume2 className="w-4 h-4 text-cyan-300" />}
                      </button>
                    </div>

                    <span className="text-[9.5px] font-mono font-bold text-cyan-300">
                      {dynamicVideo.isAiVideo ? 'VAL.AI FPV 24FPS' : '60FPS ORBITAL KEN BURNS'}
                    </span>
                  </div>
                </div>

                {/* Side Specifications & Video Download Actions Panel */}
                <div className="space-y-4 max-w-md w-full">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase bg-amber-950/90 text-amber-300 border border-amber-400/40">
                        ARTIFACT 01 · 9:16 MP4 TRAILER LOOP
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-display font-black text-white tracking-wide">
                      Cinematic FPV Video Pipeline
                    </h3>
                    <p className="text-xs font-sans text-white/70 leading-relaxed">
                      Continuous low-altitude FPV drone movement, aggressive close-proximity orbits, rapid vertical climbs, natural shutter motion blur, and strong parallax separation. Synthesized for seamless 5-second viral looping.
                    </p>
                  </div>

                  {/* Dynamic Pipeline Telemetry Box */}
                  <div className="p-3.5 rounded-xl bg-black/60 border border-amber-400/30 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-white/50">PIPELINE STATUS</span>
                      <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        {dynamicVideo.isAiVideo ? 'VAL.AI PRODUCTION AI VIDEO' : 'DYNAMIC ACTIVE MONTAGE'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-white/50">PHYSICS ENGINE</span>
                      <span className="text-cyan-300 font-semibold">FPV Drone Proximity 24fps</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-white/50">ASPECT RATIO</span>
                      <span className="text-white font-semibold">9:16 Vertical (1080×1920)</span>
                    </div>
                  </div>

                  {/* Video Download Action Button */}
                  <div className="space-y-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadTrailerMp4}
                      disabled={isExportingTrailer}
                      className="w-full px-5 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-mono text-xs font-extrabold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(245,158,11,0.4)] min-h-[46px]"
                    >
                      <Download className="w-4 h-4 text-black" />
                      <span>
                        {isExportingTrailer
                          ? (isMobileDevice ? 'SAVING TRAILER TO PHOTOS...' : 'GENERATING MP4 VIDEO...')
                          : (isMobileDevice ? 'SAVE TRAILER TO PHOTOS' : 'DOWNLOAD 9:16 MP4 TRAILER')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShareStoryBadge}
                      disabled={isExportingBadge}
                      className="w-full px-5 py-3.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/50 text-cyan-200 hover:text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(6,182,212,0.25)] min-h-[46px]"
                    >
                      <Share2 className="w-4 h-4 text-cyan-300" />
                      <span>SHARE TRAILER LINK &amp; CODE</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── 4. CAROUSEL FOOTER TELEMETRY & GUEST SIMULATION NOTICE ─── */}
      {isSimulationMode && (
        <div className="relative z-10 p-3.5 rounded-xl bg-amber-950/40 border border-amber-400/35 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="text-xs font-mono text-amber-200">
            <strong className="text-amber-300 uppercase font-bold">GUEST SIMULATION PREVIEW:</strong> Exploring Odi&apos;s verified benchmark assets. Synthesize your own sector with 1 Golden Ticket to mint personal assets.
          </div>
          {onUnlockSimulation && (
            <button
              type="button"
              onClick={onUnlockSimulation}
              className="px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-extrabold shrink-0 cursor-pointer shadow-md"
            >
              SYNTHESIZE YOUR WORLD →
            </button>
          )}
        </div>
      )}

      {/* ─── 5. FULLSCREEN 9:16 MULTI-ASSET VIEWER & SWITCHER MODAL ─── */}
      {isFullscreenModalOpen &&
        createPortal(
          <div
            style={{ transform: 'translate3d(0,0,0)', willChange: 'transform, opacity', overflowAnchor: 'none' }}
            className="fixed inset-0 z-[10000] w-screen h-[100dvh] flex flex-col justify-between bg-black/95 backdrop-blur-2xl p-2.5 sm:p-5 select-none overflow-y-auto transform-gpu"
            onClick={() => {
              setIsFullscreenModalOpen(false);
              setFullscreenPhoto(null);
            }}
            onTouchStart={(e) => {
              if (e.touches.length === 1) {
                touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
              }
            }}
            onTouchEnd={(e) => {
              if (!touchStartRef.current || e.changedTouches.length === 0) return;
              const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
              const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
              touchStartRef.current = null;
              if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.25) {
                if (dx < 0) {
                  handleNextFullscreenSlide();
                } else {
                  handlePrevFullscreenSlide();
                }
              }
            }}
          >
            {/* Modal Dialog Content Container */}
            <div
              className="relative max-w-5xl w-full mx-auto my-auto flex flex-col rounded-2xl overflow-hidden bg-[#040814] border border-cyan-400/40 shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(6,182,212,0.2)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* TOP HEADER: Branding + Slide Switcher Tabs + Close */}
              <div className="p-3 sm:p-4 bg-[#060c1d] border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 w-full sm:w-auto justify-between sm:justify-start">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-8 h-8 rounded-lg bg-white/[0.08] border border-white/20 p-1 flex items-center justify-center shrink-0 shadow-sm">
                      <img
                        src={sillowMillLogoUrl}
                        alt="Sillow Mill Emblem"
                        className="w-full h-full object-contain filter drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]"
                      />
                    </div>
                    <div className="h-5 w-[1px] bg-white/20 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider truncate">
                        {meta.isAmlemi ? 'FOUNDING PIONEER' : 'PIONEER DOSSIER'} · #{meta.worldNumber}
                      </div>
                      <div className="text-sm sm:text-base font-display font-black text-white uppercase tracking-wider truncate">
                        {worldNameDisplay}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Close Button */}
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playTone(500, 0.04);
                      setIsFullscreenModalOpen(false);
                      setFullscreenPhoto(null);
                    }}
                    className="sm:hidden w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                    aria-label="Close Fullscreen"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Switcher Pills inside Fullscreen Modal */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 w-full sm:w-auto justify-center">
                  {SLIDE_TABS.map((tab) => {
                    const isActive = fullscreenSlide === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          soundManager.playTone(640, 0.03);
                          setFullscreenSlide(tab.id);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black shadow-md'
                            : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.index}</span>
                        <span className="hidden md:inline">
                          {tab.id === 'video_trailer' ? 'TRAILER' : tab.id === 'story_card' ? 'STORY' : '4K'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Desktop Close & Quick Action */}
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playTone(500, 0.04);
                      setIsFullscreenModalOpen(false);
                      setFullscreenPhoto(null);
                    }}
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                    aria-label="Close Fullscreen"
                    title="Close Fullscreen (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* CENTER DISPLAY STAGE WITH CHEVRONS */}
              <div className="relative flex-1 min-h-[460px] sm:min-h-[520px] flex items-center justify-center p-3 sm:p-6 bg-black/90">
                {/* Left Switcher Arrow */}
                <button
                  type="button"
                  onClick={handlePrevFullscreenSlide}
                  className="absolute left-2 sm:left-4 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/85 hover:bg-[#09152e] border-2 border-amber-400/60 text-amber-300 hover:text-white flex items-center justify-center transition-all shadow-[0_0_20px_rgba(0,0,0,0.9),0_0_15px_rgba(245,158,11,0.35)] cursor-pointer active:scale-95"
                  aria-label="Previous Slide"
                  title="Previous Slide (Left Arrow)"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Right Switcher Arrow */}
                <button
                  type="button"
                  onClick={handleNextFullscreenSlide}
                  className="absolute right-2 sm:right-4 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/85 hover:bg-[#09152e] border-2 border-cyan-400/60 text-cyan-300 hover:text-white flex items-center justify-center transition-all shadow-[0_0_20px_rgba(0,0,0,0.9),0_0_15px_rgba(6,182,212,0.35)] cursor-pointer active:scale-95"
                  aria-label="Next Slide"
                  title="Next Slide (Right Arrow)"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* 1. Video Trailer Fullscreen View */}
                {fullscreenSlide === 'video_trailer' && (
                  <div
                    style={{
                      transform: 'translateZ(0)',
                      WebkitTransform: 'translateZ(0)',
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                    }}
                    className="video-player-gpu relative w-full max-w-[340px] sm:max-w-[380px] aspect-[9/16] max-h-[68dvh] rounded-[24px] overflow-hidden bg-black border-2 border-cyan-400/60 shadow-[0_0_40px_rgba(6,182,212,0.3)] flex flex-col justify-between"
                  >
                    <LiveStoryTrailerViewport
                      dossier={dossier}
                      meta={meta}
                      photoCards={photoCards}
                      activeVideoUrl={dynamicVideo.videoUrl}
                      isMuted={isMuted}
                      onToggleAudio={toggleAudio}
                      isPlaying={isPlayingVideo}
                      onTogglePlay={toggleVideoPlayback}
                      onPlaybackStateChange={setIsPlayingVideo}
                      onVideoElementReady={(el) => {
                        videoElementRef.current = el;
                      }}
                    />
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-black/85 border border-white/20 backdrop-blur-md touch-control-lock"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={toggleVideoPlayback}
                          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
                          title={isPlayingVideo ? 'Pause Video' : 'Play Video'}
                        >
                          {isPlayingVideo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                        </button>
                        <button
                          type="button"
                          onClick={toggleAudio}
                          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
                          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                        >
                          {isMuted ? <VolumeX className="w-4 h-4 text-white/60" /> : <Volume2 className="w-4 h-4 text-cyan-300" />}
                        </button>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-cyan-300">
                        {dynamicVideo.isAiVideo ? 'VAL.AI FPV 24FPS' : '60FPS ORBITAL KEN BURNS'}
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. Story Card Fullscreen View */}
                {fullscreenSlide === 'story_card' && (
                  <StoryCard9x16View
                    dossier={dossier}
                    meta={meta}
                    photoCards={photoCards}
                  />
                )}

                {/* 3. 4K Master Photo Fullscreen View */}
                {fullscreenSlide === 'archive_4k' && (
                  <div className="w-full max-w-4xl flex flex-col items-center space-y-3">
                    <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-[58dvh] rounded-2xl overflow-hidden bg-black border border-amber-400/50 shadow-2xl flex items-center justify-center">
                      <img
                        src={activePhoto.url}
                        alt={activePhoto.title}
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute top-3 left-4 px-2.5 py-1 rounded bg-black/80 border border-amber-400/50 text-[10px] font-mono font-bold text-amber-300 uppercase">
                        {activePhoto.category} · {activePhoto.title}
                      </div>
                    </div>
                    {/* 5-Photo Strip in Fullscreen */}
                    <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full">
                      {photoCards.slice(0, 5).map((card, idx) => (
                        <button
                          key={card.id || idx}
                          type="button"
                          onClick={() => {
                            soundManager.playTone(660 + idx * 30, 0.04);
                            setActivePhotoIdx(idx);
                          }}
                          className={`w-16 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                            idx === activePhotoIdx ? 'border-amber-400 scale-105' : 'border-white/20 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={card.url} alt={card.title} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* BOTTOM ACTION DOCK */}
              <div className="p-3.5 sm:p-4 bg-[#060c1d] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-mono text-white/70">
                  <span className="text-cyan-300 font-bold">{meta.verificationCode}</span>
                  <span>·</span>
                  <span className="text-amber-300">{dossier.sectorId || 'SECTOR AKN-01'}</span>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  {fullscreenSlide === 'video_trailer' && (
                    <button
                      type="button"
                      onClick={handleDownloadTrailerMp4}
                      disabled={isExportingTrailer}
                      className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-mono text-xs font-extrabold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.35)] min-h-[42px]"
                    >
                      <Download className="w-4 h-4 text-black" />
                      <span>
                        {isExportingTrailer
                          ? (isMobileDevice ? 'SAVING TRAILER TO PHOTOS...' : 'GENERATING MP4...')
                          : (isMobileDevice ? 'SAVE TRAILER TO PHOTOS' : 'DOWNLOAD 9:16 TRAILER (MP4)')}
                      </span>
                    </button>
                  )}

                  {fullscreenSlide === 'story_card' && (
                    <button
                      type="button"
                      onClick={handleDownloadStoryBadge}
                      disabled={isExportingBadge}
                      className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-mono text-xs font-extrabold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.35)] min-h-[42px]"
                    >
                      <Download className="w-4 h-4 text-black" />
                      <span>
                        {isExportingBadge
                          ? (isMobileDevice ? 'SAVING STORY CARD TO PHOTOS...' : 'RENDERING...')
                          : (isMobileDevice ? 'SAVE STORY CARD TO PHOTOS' : 'DOWNLOAD STORY CARD (PNG)')}
                      </span>
                    </button>
                  )}

                  {fullscreenSlide === 'archive_4k' && (
                    <button
                      type="button"
                      onClick={handleDownload4kPhoto}
                      disabled={isDownloadingPhoto}
                      className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-mono text-xs font-extrabold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.35)] min-h-[42px]"
                    >
                      <Download className="w-4 h-4 text-black" />
                      <span>
                        {isDownloadingPhoto
                          ? 'Saving picture to Photos...'
                          : 'Save picture to Photos'}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleShareStoryBadge}
                    disabled={isExportingBadge}
                    className="px-4 py-2.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/50 text-cyan-200 hover:text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[42px]"
                  >
                    <Share2 className="w-4 h-4 text-cyan-300" />
                    <span className="hidden sm:inline">SHARE</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
});

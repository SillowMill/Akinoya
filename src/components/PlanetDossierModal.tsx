import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Trophy,
  ThumbsUp,
  Globe2,
  Trees,
  Compass,
  Volume2,
  Camera,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Layers,
  ShieldCheck,
  Video,
  Download,
  Heart,
  MapPin,
  Play,
  Copy,
  Check,
  Radar,
} from 'lucide-react';
import { PlanetSubmission } from '../types/contest';
import {
  getPlanetPhotoCards,
  PlanetPhotoCard,
  UI_RECALIBRATING_STATUS_TEXT,
  COMMUNITY_SHARE_VIDEO_MESSAGE,
  VIRAL_VIDEO_MOTION_PROMPT,
  copyPlanetGalaxyLink,
} from '../data/contest';
import { soundManager } from '../utils/audio';
import {
  isFoundingPioneerPlanet,
  isPioneerPlanet,
  isVipPioneerPlanet,
  getPioneerMasterVideoUrl,
} from '../utils/pioneer';
import { formatTitleCaseUserName, formatAuthorName } from '../utils/holder';
import {
  LiveStoryTrailerViewport,
  StoryCard9x16View,
  renderWorldStoryBadgeBlob,
  downloadOrShareFileBlob,
  useDynamicWorldVideo,
  deriveWorldVerificationMeta,
  isMobileOrTabletDevice,
  getCacheBustedUrl,
  downloadOrShareVideoDirect,
  triggerDirectDownload,
  prewarmTrailerFastStartBlob,
} from './WorldStoryVerificationBadge';
import { watermarkAndSavePhoto } from '../utils/watermarkPhoto';

export interface PlanetDossierModalProps {
  planet: PlanetSubmission | null;
  isOpen: boolean;
  editionRank?: number;
  onClose: () => void;
  onVote?: (planetId: string) => void;
  onOpenCreator?: (username: string) => void;
  onNavigateToGalaxy?: (planetId?: string) => void;
}

export type DossierModalTab = 'trailer' | 'story_card' | 0 | 1 | 2 | 3 | 4;
const DOSSIER_TABS: DossierModalTab[] = ['trailer', 'story_card', 0, 1, 2, 3, 4];

export const PlanetDossierModal: React.FC<PlanetDossierModalProps> = React.memo(({
  planet,
  isOpen,
  editionRank,
  onClose,
  onVote,
  onOpenCreator,
  onNavigateToGalaxy,
}) => {
  // Retain last active planet reference so exit animation remains completely fluid when planet is cleared
  const lastPlanetRef = useRef<PlanetSubmission | null>(planet);
  if (planet) {
    lastPlanetRef.current = planet;
  }
  const activePlanet = planet || lastPlanetRef.current;

  // Active view tab: 'trailer' (9:16 Video), 'story_card' (9:16 Affiche), or 0..4 (Sector Photos)
  const [activeTab, setActiveTab] = useState<DossierModalTab>('trailer');
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isCopiedGalaxyLink, setIsCopiedGalaxyLink] = useState<boolean>(false);
  const [isCopiedCode, setIsCopiedCode] = useState<boolean>(false);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(() =>
    typeof window !== 'undefined' ? isMobileOrTabletDevice() : false
  );
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleCopyGalaxyLink = async () => {
    if (!activePlanet) return;
    soundManager.playTone(720, 0.05);
    const success = await copyPlanetGalaxyLink(activePlanet.id);
    if (success) {
      setIsCopiedGalaxyLink(true);
      setTimeout(() => setIsCopiedGalaxyLink(false), 2200);
    }
  };

  // Reset active tab on planet change
  useEffect(() => {
    if (planet?.id) {
      setActiveTab('trailer');
      setIsZoomed(false);
    }
  }, [planet?.id]);

  const photoCards: PlanetPhotoCard[] = activePlanet ? getPlanetPhotoCards(activePlanet) : [];

  const handleNextPhoto = () => {
    soundManager.playTone(600, 0.04);
    setIsZoomed(false);
    const curIdx = DOSSIER_TABS.indexOf(activeTab);
    const nextIdx = (curIdx + 1) % DOSSIER_TABS.length;
    setActiveTab(DOSSIER_TABS[nextIdx]);
  };

  const handlePrevPhoto = () => {
    soundManager.playTone(550, 0.04);
    setIsZoomed(false);
    const curIdx = DOSSIER_TABS.indexOf(activeTab);
    const prevIdx = (curIdx - 1 + DOSSIER_TABS.length) % DOSSIER_TABS.length;
    setActiveTab(DOSSIER_TABS[prevIdx]);
  };

  // Handle escape and left/right arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZoomed) {
          setIsZoomed(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextPhoto();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevPhoto();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isZoomed, onClose, activeTab]);

  // Scroll lock with guaranteed cleanup
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  const dynamicVideo = useDynamicWorldVideo(activePlanet);
  const meta = useMemo(
    () => (activePlanet ? deriveWorldVerificationMeta(activePlanet, editionRank) : null),
    [activePlanet, editionRank]
  );

  const pioneerVideo = getPioneerMasterVideoUrl(activePlanet);
  const videoUrl =
    pioneerVideo ||
    dynamicVideo.videoUrl ||
    activePlanet?.videoUrl ||
    activePlanet?.renders?.videoUrl ||
    activePlanet?.renders?.video_url ||
    (activePlanet?.humanAnswers as any)?.video_url ||
    '';

  // Prewarm FastStart MP4 trailer blob for 0ms instantaneous saving/sharing to iOS Photos & Desktop
  useEffect(() => {
    if (isOpen && activePlanet) {
      prewarmTrailerFastStartBlob(videoUrl, activePlanet);
    }
  }, [isOpen, activePlanet, videoUrl]);

  const isTrailerTab = activeTab === 'trailer';
  const isStoryCardTab = activeTab === 'story_card';
  const isPhotoTab = typeof activeTab === 'number';
  const currentPhoto = isPhotoTab ? photoCards[activeTab] || photoCards[0] : photoCards[0];
  const heroPhotoUrl = photoCards[0]?.url || activePlanet?.renders?.hero || '';

  const handleCopyCode = () => {
    if (!meta?.verificationCode) return;
    soundManager.playTone(720, 0.05);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(meta.verificationCode);
      setIsCopiedCode(true);
      setTimeout(() => setIsCopiedCode(false), 2200);
    }
  };

  const handleDownloadTrailer = async () => {
    if (!activePlanet) return;
    soundManager.playTone(740, 0.06);
    setIsDownloading(true);
    const safeName = (activePlanet.planetName || 'akinoya-sector')
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-');
    const filename = `sillowmill-${safeName}-9x16-trailer.mp4`;
    const shareTitle = `${activePlanet.planetName || 'Ämlemi'} — Sillow Mill 9:16 Trailer`;
    const shareText = `Verified Planetary Dossier: ${activePlanet.planetName || 'Ämlemi'}`;

    try {
      const activeVideoUrl = videoUrl || '/assets/videos/amlemi_trailer.mp4';
      await downloadOrShareVideoDirect(activeVideoUrl, filename, shareTitle, shareText, activePlanet || undefined, editionRank);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadStoryBadge = async () => {
    if (!activePlanet) return;
    soundManager.playTone(780, 0.07);
    setIsDownloading(true);
    try {
      const blob = await renderWorldStoryBadgeBlob(activePlanet, editionRank);
      if (!blob) return;
      const safeName = (activePlanet.planetName || 'akinoya-world')
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-');
      const filename = `sillowmill-${safeName}-story-card-9x16.png`;
      const shareTitle = `${activePlanet.planetName || 'Ämlemi'} — 9:16 Story Card`;
      const shareText = `Verified Planetary Story Card: ${activePlanet.planetName || 'Ämlemi'} (${meta?.verificationCode || ''})`;
      await downloadOrShareFileBlob(blob, filename, 'image/png', shareTitle, shareText);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPhoto = async (photo: PlanetPhotoCard) => {
    if (!photo?.url || !activePlanet) return;
    soundManager.playTone(740, 0.06);
    setIsDownloading(true);
    const safePlanet = (activePlanet.planetName || 'akinoya-world').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const safeTitle = (photo.title || 'photo').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const filename = `sillowmill-${safePlanet}-${safeTitle}.jpg`;
    const shareTitle = `${activePlanet.planetName || 'Ämlemi'} — ${photo.title}`;
    const shareText = `Verified 4K Genesis World: ${photo.title}`;

    try {
      await watermarkAndSavePhoto(photo.url, filename, shareTitle, shareText, {
        planetName: activePlanet.planetName,
        photoTitle: photo.title,
        category: photo.category,
        slotIndex: typeof activeTab === 'number' ? activeTab : 0,
        dossier: activePlanet,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTouchStartStage = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEndStage = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx < 0) handleNextPhoto();
      else handlePrevPhoto();
    }
  };

  const modalNode = (
    <AnimatePresence>
      {isOpen && activePlanet && (
        <motion.div
          key="planet-dossier-fullscreen-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="interactive-hud-element fixed inset-0 z-[9999] w-screen h-[100dvh] flex items-center justify-center p-0 sm:p-4 lg:p-6 overflow-hidden bg-[#02040a]/95 backdrop-blur-xl transform-gpu select-none"
          style={{ willChange: 'opacity' }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Backdrop click to close */}
          <div className="fixed inset-0 z-0" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{ willChange: 'transform, opacity', overflowAnchor: 'none', transform: 'translate3d(0,0,0)' }}
            className="relative z-10 w-full max-w-6xl h-[100dvh] sm:h-auto sm:max-h-[94dvh] bg-[#050811] border-0 sm:border sm:border-cyan-500/40 rounded-none sm:rounded-3xl shadow-[0_25px_90px_rgba(0,0,0,0.95),0_0_50px_rgba(6,182,212,0.18)] flex flex-col overflow-hidden transform-gpu"
          >
            {/* Top Modal Header Bar */}
            <header className="px-3 sm:px-6 py-2 sm:py-4 bg-[#070c18] border-b border-white/10 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-tr ${
                    activePlanet.authorAvatarGradient || 'from-amber-400 to-yellow-600'
                  } flex items-center justify-center font-bold text-black text-xs sm:text-sm shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.3)]`}
                >
                  {activePlanet.authorName.slice(0, 1)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-x-1.5 sm:gap-x-2 gap-y-0.5 flex-wrap min-w-0">
                    <h2 className="text-sm sm:text-lg font-display font-extrabold text-white tracking-wide truncate max-w-full">
                      {activePlanet.planetName}
                    </h2>
                    {isPioneerPlanet(activePlanet) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 rounded-full bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-600/25 border border-amber-400/65 text-amber-200 text-[8.5px] sm:text-[9.5px] font-mono font-extrabold tracking-wider uppercase shadow-[0_0_12px_rgba(251,191,36,0.35)]">
                        <Sparkles className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                        <span>
                          {isFoundingPioneerPlanet(activePlanet)
                            ? '👑 FOUNDING PIONEER'
                            : isVipPioneerPlanet(activePlanet)
                            ? '👑 VIP PIONEER'
                            : activePlanet.pioneerBadge || '⚡ PIONEER 2027'}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-x-1.5 sm:gap-x-2 gap-y-0.5 flex-wrap text-[10.5px] sm:text-xs font-mono text-white/50 min-w-0">
                    <span className="truncate">By {formatTitleCaseUserName(activePlanet.authorName)}</span>
                    <span className="hidden xs:inline text-white/30">·</span>
                    <span className="text-cyan-400 truncate">@{activePlanet.authorUsername}</span>
                    {onOpenCreator && (
                      <button
                        type="button"
                        onClick={() => onOpenCreator(activePlanet.authorUsername)}
                        className="text-[10px] text-white/60 hover:text-white underline cursor-pointer inline-flex items-center gap-0.5 ml-0.5"
                      >
                        <span className="hidden xs:inline">Portfolio</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyGalaxyLink}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                  title="Copy Shareable Planet Link"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isCopiedGalaxyLink ? 'Link Copied!' : 'Copy Planet Link'}</span>
                </button>

                {onNavigateToGalaxy && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToGalaxy(activePlanet.id);
                    }}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/40 text-cyan-200 text-xs font-mono transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                  >
                    <Radar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>View in Galaxy</span>
                  </button>
                )}

                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-950/70 via-[#081224]/90 to-amber-950/60 border border-amber-400/50 text-xs font-mono font-extrabold shadow-[0_0_15px_rgba(251,191,36,0.28)]">
                  <Trophy className="w-3.5 h-3.5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                  <span className="bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
                    {activePlanet.votesCount} Votes
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="min-w-[36px] min-h-[36px] w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
                  title="Close Dossier"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </header>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-6 space-y-4 sm:space-y-6">
              {/* 1. STAGE VIEWPORT: 9:16 TRAILER, 9:16 STORY CARD, OR 4K SECTOR PHOTO */}
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    {isTrailerTab ? (
                      <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
                    ) : isStoryCardTab ? (
                      <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
                    ) : (
                      <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
                    )}
                    <h3 className="text-[11px] sm:text-xs font-mono font-bold text-white uppercase tracking-wider truncate">
                      {isTrailerTab
                        ? `🎥 9:16 Trailer · ${activePlanet.planetName} (5s Loop)`
                        : isStoryCardTab
                        ? `🪪 9:16 Story Card · Official Verification Affiche`
                        : `${currentPhoto.title} · Sector 0${(activeTab as number) + 1} of 05`}
                    </h3>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono text-cyan-400/80 shrink-0">
                    {isTrailerTab
                      ? 'VIRAL 9:16 (5.0S)'
                      : isStoryCardTab
                      ? '1080×1920 AFFICHE'
                      : currentPhoto.category}
                  </span>
                </div>

                {/* Main Viewport */}
                {isTrailerTab || isStoryCardTab ? (
                  <div
                    className="relative w-full flex flex-col items-center justify-center space-y-3 sm:space-y-4 touch-pan-y-lock py-2"
                    style={{ touchAction: 'pan-y' }}
                    onTouchStart={handleTouchStartStage}
                    onTouchEnd={handleTouchEndStage}
                  >
                    {/* Stage Toggle Pill: Switch seamlessly between 9:16 Video Trailer and 9:16 Story Card */}
                    <div className="flex items-center justify-center gap-1.5 p-1 rounded-xl bg-[#040914]/90 border border-cyan-400/30 backdrop-blur-md">
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playTone(760, 0.05);
                          setActiveTab('trailer');
                        }}
                        className={`px-3.5 py-1.5 rounded-lg font-mono text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isTrailerTab
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                            : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>🎥 9:16 Video Trailer</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playTone(720, 0.05);
                          setActiveTab('story_card');
                        }}
                        className={`px-3.5 py-1.5 rounded-lg font-mono text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isStoryCardTab
                            ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                            : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>🪪 9:16 Story Card</span>
                      </button>
                    </div>

                    {/* 9:16 Viewport Stage */}
                    {isTrailerTab ? (
                      <div
                        className="video-stage-container video-player-gpu relative mx-auto rounded-2xl overflow-hidden bg-black border border-cyan-400/60 shadow-[0_0_40px_rgba(6,182,212,0.35),0_20px_50px_rgba(0,0,0,0.9)] flex items-center justify-center touch-pan-y-lock"
                        style={{
                          height: 'min(64vh, 560px)',
                          aspectRatio: '9 / 16',
                          width: 'auto',
                          maxWidth: 'calc(min(64vh, 560px) * 9 / 16)',
                          transform: 'translateZ(0)',
                          WebkitTransform: 'translateZ(0)',
                          willChange: 'transform',
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          touchAction: 'pan-y',
                        }}
                      >
                        {meta && (
                          <LiveStoryTrailerViewport
                            dossier={activePlanet}
                            meta={meta}
                            photoCards={photoCards}
                            activeVideoUrl={dynamicVideo.videoUrl}
                          />
                        )}
                      </div>
                    ) : (
                      <div
                        className="relative mx-auto rounded-2xl overflow-hidden flex items-center justify-center touch-pan-y-lock"
                        style={{
                          height: 'min(64vh, 560px)',
                          aspectRatio: '9 / 16',
                          width: 'auto',
                          maxWidth: 'calc(min(64vh, 560px) * 9 / 16)',
                          transform: 'translateZ(0)',
                          WebkitTransform: 'translateZ(0)',
                          willChange: 'transform',
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          touchAction: 'pan-y',
                        }}
                      >
                        {meta && (
                          <StoryCard9x16View
                            dossier={activePlanet}
                            meta={meta}
                            photoCards={photoCards}
                            className="!max-w-none !w-full !h-full"
                          />
                        )}
                      </div>
                    )}

                    {/* Action Buttons under 9:16 Stage */}
                    <div className="w-full max-w-sm flex flex-col items-center space-y-1.5 sm:space-y-2 pt-0.5">
                      {isTrailerTab ? (
                        <>
                          <button
                            type="button"
                            onClick={handleDownloadTrailer}
                            disabled={isDownloading}
                            className="w-full py-2.5 px-4 rounded-xl font-mono text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer active:scale-95 touch-manipulation select-none"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>
                              {isDownloading
                                ? (isMobileDevice ? 'Saving Trailer...' : 'Preparing MP4...')
                                : (isMobileDevice
                                    ? 'Save Trailer to Photos'
                                    : dynamicVideo.isAiVideo
                                    ? '⬇ Download Fal.ai 9:16 MP4 Trailer'
                                    : '⬇ Download 9:16 MP4 Trailer')}
                            </span>
                          </button>

                          <p className="text-[10px] sm:text-xs font-sans text-cyan-100/85 text-center leading-tight sm:leading-relaxed italic flex items-center justify-center gap-1.5">
                            <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0 fill-amber-400/30" />
                            <span>{COMMUNITY_SHARE_VIDEO_MESSAGE}</span>
                          </p>

                          <p className="text-[9px] sm:text-[10px] font-mono text-white/45 text-center hidden xs:block">
                            Motion Prompt: "{VIRAL_VIDEO_MOTION_PROMPT}"
                          </p>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={handleDownloadStoryBadge}
                          disabled={isDownloading}
                          className="w-full py-2.5 px-4 rounded-xl font-mono text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-500 hover:from-cyan-300 hover:to-sky-300 text-black shadow-[0_0_20px_rgba(6,182,212,0.35)] cursor-pointer active:scale-95 touch-manipulation select-none"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>
                            {isDownloading
                              ? (isMobileDevice ? 'Saving Story Card...' : 'Rendering 9:16 PNG...')
                              : (isMobileDevice
                                  ? 'Save Story Card to Photos'
                                  : '⬇ Download 9:16 Story Card (PNG)')}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Navigation Arrows */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevPhoto();
                      }}
                      aria-label="Previous Slide"
                      className="absolute left-1.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#040916]/90 hover:bg-cyan-950/95 active:scale-95 text-white border border-cyan-400/40 flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.85),0_0_15px_rgba(6,182,212,0.25)] touch-manipulation"
                      title="Previous Slide"
                    >
                      <ChevronLeft className="w-6 h-6 text-cyan-300" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextPhoto();
                      }}
                      aria-label="Next Slide"
                      className="absolute right-1.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#040916]/90 hover:bg-cyan-950/95 active:scale-95 text-white border border-cyan-400/40 flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.85),0_0_15px_rgba(6,182,212,0.25)] touch-manipulation"
                      title="Next Slide"
                    >
                      <ChevronRight className="w-6 h-6 text-cyan-300" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/9] rounded-2xl overflow-hidden bg-[#030712] border border-cyan-500/40 shadow-[0_0_40px_rgba(56,189,248,0.15)] flex items-center justify-center group touch-pan-y-lock"
                    style={{ touchAction: 'pan-y' }}
                    onTouchStart={handleTouchStartStage}
                    onTouchEnd={handleTouchEndStage}
                  >
                    {currentPhoto.url ? (
                      <>
                        <img
                          src={currentPhoto.url}
                          alt=""
                          aria-hidden="true"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-35 scale-110 select-none pointer-events-none"
                        />
                        <img
                          src={currentPhoto.url}
                          alt={currentPhoto.title}
                          className={`relative z-10 w-full h-full object-contain mx-auto transition-all duration-300 select-none ${
                            isZoomed ? 'scale-125 cursor-zoom-out' : 'group-hover:scale-102 cursor-zoom-in'
                          }`}
                          onClick={() => setIsZoomed(!isZoomed)}
                          draggable={false}
                        />
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#070d1e] via-[#050813] to-black space-y-2.5">
                        <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
                        <span className="text-xs font-mono font-bold text-cyan-200 uppercase tracking-wider">
                          STATUS: QUEUED_PENDING
                        </span>
                        <p className="text-xs font-sans text-white/80 max-w-md leading-relaxed">
                          {UI_RECALIBRATING_STATUS_TEXT}
                        </p>
                      </div>
                    )}

                    {/* Navigation Arrows on Photo Stage */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevPhoto();
                      }}
                      aria-label="Previous Archive Photo"
                      className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#040916]/90 hover:bg-cyan-950/95 active:scale-95 text-white border border-cyan-400/40 flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.85),0_0_15px_rgba(6,182,212,0.25)] touch-manipulation"
                      title="Previous Photo"
                    >
                      <ChevronLeft className="w-6 h-6 text-cyan-300" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextPhoto();
                      }}
                      aria-label="Next Archive Photo"
                      className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#040916]/90 hover:bg-cyan-950/95 active:scale-95 text-white border border-cyan-400/40 flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.85),0_0_15px_rgba(6,182,212,0.25)] touch-manipulation"
                      title="Next Photo"
                    >
                      <ChevronRight className="w-6 h-6 text-cyan-300" />
                    </button>
                  </div>
                )}

                {/* Direct Save-to-Photos Action for 4K Photos */}
                {isPhotoTab && currentPhoto?.url && (
                  <div className="w-full max-w-md mx-auto flex flex-col items-center space-y-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleDownloadPhoto(currentPhoto)}
                      disabled={isDownloading}
                      className="w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer active:scale-95 touch-manipulation select-none"
                      title="Save picture to Photos"
                    >
                      <Download className="w-3.5 h-3.5 text-black" />
                      <span>
                        {isDownloading ? 'Saving picture to Photos...' : 'Save picture to Photos'}
                      </span>
                    </button>
                  </div>
                )}

                {/* 7-Tab Filmstrip: 🎥 9:16 Trailer, 🪪 9:16 Story Card, and 5 Sector Photos */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-2.5">
                  {/* Tab 0: 🎥 9:16 Trailer */}
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playTone(760, 0.05);
                      setIsZoomed(false);
                      setActiveTab('trailer');
                    }}
                    className={`relative aspect-[16/10] rounded-xl overflow-hidden border transition-all cursor-pointer text-left flex flex-col items-center justify-center p-1.5 touch-manipulation select-none ${
                      isTrailerTab
                        ? 'border-amber-400 ring-2 ring-amber-400/50 bg-gradient-to-br from-amber-950/80 via-[#070d1e] to-black shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                        : 'border-amber-500/30 hover:border-amber-400/60 bg-gradient-to-br from-[#0a1228] to-black opacity-85 hover:opacity-100'
                    }`}
                  >
                    {heroPhotoUrl && (
                      <img
                        src={heroPhotoUrl}
                        alt="9:16 Trailer"
                        className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none select-none"
                      />
                    )}
                    <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-0.5 pointer-events-none select-none">
                      <Video className="w-3.5 h-3.5 text-amber-300" />
                      <span className="text-[9px] font-mono font-extrabold text-amber-300 leading-tight">
                        🎥 9:16 Trailer
                      </span>
                      <span className="text-[7.5px] font-mono text-cyan-300/90 uppercase">
                        FAL.AI FPV
                      </span>
                    </div>
                  </button>

                  {/* Tab 1: 🪪 9:16 Story Card */}
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playTone(720, 0.05);
                      setIsZoomed(false);
                      setActiveTab('story_card');
                    }}
                    className={`relative aspect-[16/10] rounded-xl overflow-hidden border transition-all cursor-pointer text-left flex flex-col items-center justify-center p-1.5 touch-manipulation select-none ${
                      isStoryCardTab
                        ? 'border-cyan-400 ring-2 ring-cyan-400/50 bg-gradient-to-br from-cyan-950/80 via-[#070d1e] to-black shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                        : 'border-cyan-500/30 hover:border-cyan-400/60 bg-gradient-to-br from-[#081226] to-black opacity-85 hover:opacity-100'
                    }`}
                  >
                    {heroPhotoUrl && (
                      <img
                        src={heroPhotoUrl}
                        alt="9:16 Story Card"
                        className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none select-none"
                      />
                    )}
                    <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-0.5 pointer-events-none select-none">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
                      <span className="text-[9px] font-mono font-extrabold text-cyan-300 leading-tight">
                        🪪 Story Card
                      </span>
                      <span className="text-[7.5px] font-mono text-amber-300/90 uppercase">
                        VERIFIED 9:16
                      </span>
                    </div>
                  </button>

                  {/* Tabs 2..6: 5-Photo Thumbnails */}
                  {photoCards.map((card, idx) => {
                    const isSelected = activeTab === idx;
                    return (
                      <button
                        key={card.id || idx}
                        type="button"
                        onClick={() => {
                          soundManager.playTone(540 + idx * 40, 0.04);
                          setIsZoomed(false);
                          setActiveTab(idx as 0 | 1 | 2 | 3 | 4);
                        }}
                        className={`relative aspect-[16/10] rounded-xl overflow-hidden border transition-all cursor-pointer text-left touch-manipulation select-none ${
                          isSelected
                            ? 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                            : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100 bg-[#070d1e]'
                        }`}
                      >
                        {card.url ? (
                          <img src={card.url} alt={card.title} className="w-full h-full object-cover pointer-events-none select-none" />
                        ) : (
                          <div className="w-full h-full bg-[#070d1e] flex items-center justify-center pointer-events-none select-none">
                            <Sparkles className="w-4 h-4 text-amber-300/60" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1 sm:p-1.5 pointer-events-none select-none">
                          <span className="text-[8.5px] font-mono font-bold text-white truncate leading-tight">
                            0{idx + 1} · {card.title.split(' ')[0]}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. UNIVERSAL 5-SECTOR MULTI-ASSET STORYCARD PREVIEW GRID */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      5-Sector Planetary Asset Suite · 4K Master Telemetry
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-300">
                    CLICK SECTOR CARD TO INSPECT
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                  {photoCards.slice(0, 5).map((card, idx) => {
                    const isSelected = activeTab === idx;
                    const sectorTags = ['01 · ORBITAL', '02 · FLORA', '03 · FAUNA', '04 · ATMO', '05 · LANDMARK'];
                    return (
                      <button
                        key={card.id || idx}
                        type="button"
                        onClick={() => {
                          soundManager.playTone(540 + idx * 40, 0.04);
                          setIsZoomed(false);
                          setActiveTab(idx as 0 | 1 | 2 | 3 | 4);
                        }}
                        className={`group relative rounded-xl overflow-hidden aspect-[4/3] border-2 transition-all duration-300 cursor-pointer text-left ${
                          isSelected
                            ? 'border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.45)] scale-[1.02] ring-2 ring-amber-400/50'
                            : 'border-white/10 hover:border-cyan-400/60 opacity-80 hover:opacity-100 bg-[#060b17]'
                        }`}
                      >
                        {card.url ? (
                          <img
                            src={card.url}
                            alt={card.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#070d1e] flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-amber-300/60 animate-pulse" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 border border-amber-400/40 text-[7.5px] font-mono font-bold text-amber-300">
                          {sectorTags[idx]}
                        </div>
                        <div className="absolute bottom-1.5 left-1.5 right-1.5">
                          <span className="block text-[8px] font-mono text-cyan-300 uppercase tracking-wider truncate">
                            {card.category}
                          </span>
                          <span className="block text-[9.5px] font-sans font-bold text-white truncate">
                            {card.title}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. HIGH-VISIBILITY PROVENANCE & VERIFICATION STATUS STRIP */}
              {meta && (
                <div className="p-3 sm:p-4 rounded-xl bg-[#060d1b] border border-cyan-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#040914] border border-cyan-400/40 text-[11px] font-mono text-cyan-300 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>CODE: {meta.verificationCode}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] font-mono text-white/70 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {isCopiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopiedCode ? 'COPIED' : 'COPY'}</span>
                    </button>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-[9.5px] font-mono font-extrabold text-emerald-300">
                      ● AUTHENTICATED
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-[9.5px] font-mono font-extrabold text-amber-300">
                      EDITION #{meta.worldNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    <span className="text-[10px] font-mono text-white/60 truncate">
                      SECTOR: <strong className="text-white">{activePlanet.sectorId || 'SECTOR AKN-01'}</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* 4. DYNAMIC STORY CARD & ACTIVE ASSET LORE ARCHIVE */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#080e22] via-[#050916] to-[#02050e] border border-cyan-500/30 shadow-[0_4px_24px_rgba(0,0,0,0.6)] space-y-3 transition-all duration-300">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase tracking-wider border bg-amber-500/20 border-amber-400/60 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>PLANETARY DOSSIER &amp; LORE ARCHIVE</span>
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-cyan-300/80">
                    OFFICIAL CITIZEN REGISTRY
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-base sm:text-lg font-display font-bold text-white tracking-wide">
                    {activePlanet.planetName} · Sector Telemetry
                  </h4>

                  <p className="text-xs sm:text-sm text-white/90 font-sans leading-relaxed whitespace-pre-line">
                    {activePlanet.generatedLore}
                  </p>
                </div>
              </div>

              {/* 5. ENVIRONMENTAL SPECIFICATIONS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Atmosphere */}
                <div className={`p-3.5 rounded-xl bg-[#090e1d] border transition-all ${
                  activeTab === 3
                    ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'border-white/10 hover:border-white/20'
                } space-y-1`}>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-300 font-semibold">
                    <Globe2 className="w-3.5 h-3.5" />
                    <span>Atmosphere &amp; Spectra</span>
                    {activeTab === 3 && <span className="ml-auto text-[9px] font-mono text-cyan-400">● ACTIVE SLOT</span>}
                  </div>
                  <p className="text-xs text-white/70 font-sans">{activePlanet.atmosphere}</p>
                </div>

                {/* Flora */}
                <div className={`p-3.5 rounded-xl bg-[#090e1d] border transition-all ${
                  activeTab === 1
                    ? 'border-emerald-400 ring-2 ring-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'border-white/10 hover:border-white/20'
                } space-y-1`}>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-300 font-semibold">
                    <Trees className="w-3.5 h-3.5" />
                    <span>Flora Ecosystem</span>
                    {activeTab === 1 && <span className="ml-auto text-[9px] font-mono text-emerald-400">● ACTIVE SLOT</span>}
                  </div>
                  <p className="text-xs text-white/70 font-sans">{activePlanet.flora}</p>
                </div>

                {/* Fauna */}
                <div className={`p-3.5 rounded-xl bg-[#090e1d] border transition-all ${
                  activeTab === 2
                    ? 'border-purple-400 ring-2 ring-purple-400/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                    : 'border-white/10 hover:border-white/20'
                } space-y-1`}>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-purple-300 font-semibold">
                    <Compass className="w-3.5 h-3.5" />
                    <span>Fauna &amp; Wildlife</span>
                    {activeTab === 2 && <span className="ml-auto text-[9px] font-mono text-purple-400">● ACTIVE SLOT</span>}
                  </div>
                  <p className="text-xs text-white/70 font-sans">{activePlanet.fauna}</p>
                </div>

                {/* Sonic Vibe */}
                <div className={`p-3.5 rounded-xl bg-[#090e1d] border transition-all ${
                  isTrailerTab
                    ? 'border-amber-400/70 ring-1 ring-amber-400/30'
                    : 'border-white/10 hover:border-white/20'
                } space-y-1`}>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-amber-300 font-semibold">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Sonic Vibe &amp; Acoustic Style</span>
                  </div>
                  <p className="text-xs text-white/70 font-sans">{activePlanet.sonicVibe}</p>
                </div>

                {/* Visual Aesthetic */}
                <div className={`p-3.5 rounded-xl bg-[#090e1d] border transition-all ${
                  activeTab === 0 || isTrailerTab
                    ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'border-white/10 hover:border-white/20'
                } space-y-1`}>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-pink-300 font-semibold">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Visual Aesthetic Pipeline</span>
                    {activeTab === 0 && <span className="ml-auto text-[9px] font-mono text-cyan-400">● ACTIVE SLOT</span>}
                  </div>
                  <p className="text-xs text-white/70 font-sans">{activePlanet.visualAesthetic}</p>
                </div>

                {/* Landmark */}
                <div className={`p-3.5 rounded-xl bg-[#090e1d] border transition-all ${
                  activeTab === 4
                    ? 'border-yellow-400 ring-2 ring-yellow-400/40 shadow-[0_0_15px_rgba(250,204,21,0.3)]'
                    : 'border-white/10 hover:border-white/20'
                } space-y-1`}>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-yellow-300 font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Iconic Planet Landmark</span>
                    {activeTab === 4 && <span className="ml-auto text-[9px] font-mono text-yellow-400">● ACTIVE SLOT</span>}
                  </div>
                  <p className="text-xs text-white/70 font-sans">{activePlanet.landmark}</p>
                </div>
              </div>

              {/* 6. FOUNDING CREED & FUTURE PROMISE */}
              {activePlanet.futurePromise && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/80 via-yellow-950/60 to-[#080d1a] border border-amber-500/30 space-y-1">
                  <div className="text-[11px] font-mono text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Founding Creed &amp; Future Promise</span>
                  </div>
                  <p className="text-xs sm:text-sm text-white/90 font-sans italic">
                    "{activePlanet.futurePromise}"
                  </p>
                </div>
              )}

              {/* 7. ARCHITECT TRANSMISSIONS & SECRET NOTES */}
              {activePlanet.additionalNotes && (
                <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 space-y-1">
                  <div className="text-[11px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                    Architect Transmissions &amp; Story Secrets
                  </div>
                  <p className="text-xs text-white/70 font-sans italic">
                    "{activePlanet.additionalNotes}"
                  </p>
                </div>
              )}
            </div>

            {/* Modal Sticky Bottom Action Footer */}
            <footer className="px-2.5 sm:px-4 py-1.5 sm:py-2.5 bg-[#050914]/95 backdrop-blur-xl border-t border-white/10 shrink-0">
              {/* --- MOBILE COMPACT DOCK (< 640px) --- */}
              <div className="flex sm:hidden flex-col gap-1.5 w-full">
                <div className="flex items-center justify-between text-[10px] font-mono text-white/70 px-0.5">
                  <div className="flex items-center gap-1 text-emerald-400">
                    <ShieldCheck className="w-3 h-3 shrink-0" />
                    <span>Golden Ticket Verified</span>
                  </div>
                  <span className="font-bold text-amber-300 bg-amber-950/70 border border-amber-400/40 px-1.5 py-[1px] rounded-full">
                    ★ {activePlanet.votesCount} Votes
                  </span>
                </div>

                <div className="flex items-center gap-1.5 w-full">
                  <button
                    type="button"
                    onClick={handleCopyGalaxyLink}
                    className="h-[34px] px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 font-mono text-[10.5px] transition-colors cursor-pointer flex items-center justify-center gap-1 shrink-0"
                    title="Copy Shareable Planet Link"
                  >
                    <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{isCopiedGalaxyLink ? 'Copied' : 'Link'}</span>
                  </button>

                  {onNavigateToGalaxy && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToGalaxy(activePlanet.id);
                      }}
                      className="h-[34px] px-2.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/40 text-cyan-200 font-mono text-[10.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0"
                    >
                      <Radar className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>Galaxy</span>
                    </button>
                  )}

                  {onVote && (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playTone(740, 0.08);
                        onVote(activePlanet.id);
                      }}
                      className={`h-[34px] flex-1 px-3 rounded-lg text-[10.5px] font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                        activePlanet.hasVoted
                          ? 'bg-amber-400 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                          : 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black'
                      }`}
                    >
                      <ThumbsUp className={`w-3 h-3 ${activePlanet.hasVoted ? 'fill-black' : ''}`} />
                      <span className="truncate">{activePlanet.hasVoted ? 'Voted' : 'Vote'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    className="h-[34px] px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 font-mono text-[10.5px] transition-colors cursor-pointer shrink-0"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* --- DESKTOP / TABLET DUAL-ZONE DOCK (>= 640px) --- */}
              <div className="hidden sm:flex items-center justify-between gap-2.5 w-full">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/70">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">One Golden Ticket Verified</span>
                  </div>
                  <span className="text-[11px] font-mono font-extrabold text-amber-300 bg-amber-950/70 border border-amber-400/40 px-2 py-0.5 rounded-full shrink-0 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                    ★ {activePlanet.votesCount} Community Votes
                  </span>
                </div>

                <div className="flex items-center gap-1.5 justify-end">
                  <button
                    type="button"
                    onClick={handleCopyGalaxyLink}
                    className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 font-mono text-[11px] transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Copy Shareable Planet Link"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isCopiedGalaxyLink ? 'Link Copied!' : 'Copy Link'}</span>
                  </button>

                  {onNavigateToGalaxy && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToGalaxy(activePlanet.id);
                      }}
                      className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/40 text-cyan-200 font-mono text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                    >
                      <Radar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>View in Galaxy</span>
                    </button>
                  )}

                  {onVote && (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playTone(740, 0.08);
                        onVote(activePlanet.id);
                      }}
                      className={`min-h-[36px] px-4 py-1.5 rounded-xl text-[11px] font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                        activePlanet.hasVoted
                          ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                          : 'bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${activePlanet.hasVoted ? 'fill-black' : ''}`} />
                      <span>{activePlanet.hasVoted ? 'Voted for World' : 'Vote for World'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 font-mono text-[11px] transition-colors cursor-pointer"
                  >
                    Close Dossier
                  </button>
                </div>
              </div>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
});

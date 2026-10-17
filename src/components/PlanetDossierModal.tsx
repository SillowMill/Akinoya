import React, { useState, useEffect, useRef } from 'react';
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
import { isFoundingPioneerPlanet, isPioneerPlanet } from '../utils/pioneer';

export interface PlanetDossierModalProps {
  planet: PlanetSubmission | null;
  isOpen: boolean;
  onClose: () => void;
  onVote?: (planetId: string) => void;
  onOpenCreator?: (username: string) => void;
  onNavigateToGalaxy?: (planetId?: string) => void;
}

export const PlanetDossierModal: React.FC<PlanetDossierModalProps> = ({
  planet,
  isOpen,
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

  // activePhotoIdx: 0..4 for the 5 photos, or 5 for the "🎥 9:16 Trailer" tab
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isCopiedGalaxyLink, setIsCopiedGalaxyLink] = useState<boolean>(false);
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

  // Reset active photo on planet change
  useEffect(() => {
    if (planet?.id) {
      setActivePhotoIdx(0);
      setIsZoomed(false);
    }
  }, [planet?.id]);

  const photoCards: PlanetPhotoCard[] = activePlanet ? getPlanetPhotoCards(activePlanet) : [];
  const totalTabs = Math.max(1, photoCards.length + 1); // 5 photos + 1 "🎥 9:16 Trailer" tab

  const handleNextPhoto = () => {
    soundManager.playTone(600, 0.04);
    setIsZoomed(false);
    setActivePhotoIdx((prev) => (prev + 1) % totalTabs);
  };

  const handlePrevPhoto = () => {
    soundManager.playTone(550, 0.04);
    setIsZoomed(false);
    setActivePhotoIdx((prev) => (prev - 1 + totalTabs) % totalTabs);
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
        setIsZoomed(false);
        setActivePhotoIdx((prev) => (prev + 1) % totalTabs);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsZoomed(false);
        setActivePhotoIdx((prev) => (prev - 1 + totalTabs) % totalTabs);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isZoomed, onClose, totalTabs]);

  // Scroll lock with guaranteed cleanup (no orphaned locks on close/unmount)
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  const isTrailerTab = activePhotoIdx === photoCards.length;
  const currentPhoto = photoCards[activePhotoIdx] || photoCards[0];
  const videoUrl =
    activePlanet?.videoUrl ||
    activePlanet?.renders?.videoUrl ||
    activePlanet?.renders?.video_url ||
    (activePlanet?.humanAnswers as any)?.video_url ||
    '';
  const heroPhotoUrl = photoCards[0]?.url || activePlanet?.renders?.hero || '';

  const handleDownloadTrailer = async () => {
    if (!activePlanet || !videoUrl) return;
    soundManager.playTone(740, 0.06);
    setIsDownloading(true);
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = (activePlanet.planetName || 'akinoya-sector')
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-');
      link.href = blobUrl;
      link.download = `${safeName}-9x16-trailer.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
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
            style={{ willChange: 'transform, opacity' }}
            className="relative z-10 w-full max-w-6xl h-[100dvh] sm:h-auto sm:max-h-[94dvh] bg-[#050811] border-0 sm:border sm:border-cyan-500/40 rounded-none sm:rounded-3xl shadow-[0_25px_90px_rgba(0,0,0,0.95),0_0_50px_rgba(6,182,212,0.18)] flex flex-col overflow-hidden transform-gpu"
          >
            {/* Top Modal Header Bar */}
            <header className="px-3.5 sm:px-6 py-3 sm:py-4 bg-[#070c18] border-b border-white/10 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${
                    activePlanet.authorAvatarGradient || 'from-amber-400 to-yellow-600'
                  } flex items-center justify-center font-bold text-black text-sm shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.3)]`}
                >
                  {activePlanet.authorName.slice(0, 1)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-x-2 gap-y-1 flex-wrap min-w-0">
                    <h2 className="text-base sm:text-lg font-display font-extrabold text-white tracking-wide truncate max-w-full">
                      {activePlanet.planetName}
                    </h2>
                    {isPioneerPlanet(activePlanet) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-600/25 border border-amber-400/65 text-amber-200 text-[9.5px] font-mono font-extrabold tracking-wider uppercase shadow-[0_0_12px_rgba(251,191,36,0.35)]">
                        <Sparkles className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                        <span>
                          {isFoundingPioneerPlanet(activePlanet)
                            ? '👑 FOUNDING PIONEER · #01'
                            : activePlanet.pioneerBadge || '⚡ PIONEER 2027'}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap text-xs font-mono text-white/50 min-w-0">
                    <span>By {activePlanet.authorName}</span>
                    <span>·</span>
                    <span className="text-cyan-400">@{activePlanet.authorUsername}</span>
                    {onOpenCreator && (
                      <button
                        type="button"
                        onClick={() => onOpenCreator(activePlanet.authorUsername)}
                        className="text-[10px] text-white/60 hover:text-white underline cursor-pointer ml-1 inline-flex items-center gap-1"
                      >
                        <span>Creator Portfolio</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
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
                    <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
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
                  className="min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
                  title="Close Dossier"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-6 space-y-5 sm:space-y-6">
              {/* 1. 5-PHOTO ARCHIVE + 🎥 9:16 TRAILER INTERACTIVE GALLERY */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {isTrailerTab ? (
                      <Video className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Camera className="w-4 h-4 text-cyan-400" />
                    )}
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      {isTrailerTab
                        ? `🎥 9:16 Viral Video Trailer · ${activePlanet.planetName} (5s Vertical Loop)`
                        : `${currentPhoto.title} · Photo 0${activePhotoIdx + 1} of 05`}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400/80">
                    {isTrailerTab ? '06 · VIRAL 9:16 TRAILER (5.0S)' : currentPhoto.category}
                  </span>
                </div>

                {/* Main Viewport: Either 9:16 Vertical Trailer or 16:9 Photo */}
                {isTrailerTab ? (
                  <div
                    className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#070d1e] via-[#050813] to-black border border-amber-400/40 shadow-[0_0_40px_rgba(245,158,11,0.18)] p-4 sm:p-6 flex flex-col items-center space-y-4"
                    onTouchStart={handleTouchStartStage}
                    onTouchEnd={handleTouchEndStage}
                  >
                    {/* Strict 9:16 Vertical Video Player */}
                    <div className="relative w-full max-w-[240px] xs:max-w-[270px] aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-cyan-400/50 shadow-[0_0_30px_rgba(6,182,212,0.3)] flex items-center justify-center">
                      {videoUrl ? (
                        <video
                          src={videoUrl}
                          poster={heroPhotoUrl || undefined}
                          controls
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="relative w-full h-full flex flex-col items-center justify-center p-4 text-center overflow-hidden">
                          {heroPhotoUrl && (
                            <img
                              src={heroPhotoUrl}
                              alt={activePlanet.planetName}
                              className="absolute inset-0 w-full h-full object-cover opacity-35 scale-110"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-b from-[#070d1e]/90 via-[#050813]/85 to-black/95" />
                          <div className="relative z-10 flex flex-col items-center space-y-3 px-2">
                            <div className="relative w-12 h-12 rounded-full border border-cyan-400/50 bg-cyan-950/60 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                              <div
                                className="absolute inset-0 rounded-full border border-dashed border-amber-400/50 animate-spin"
                                style={{ animationDuration: '8s' }}
                              />
                              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-cyan-200 uppercase tracking-wider">
                              STATUS: QUEUED_PENDING
                            </span>
                            <p className="text-[11px] font-sans text-white/85 leading-relaxed">
                              {UI_RECALIBRATING_STATUS_TEXT}
                            </p>
                            <span className="text-[9.5px] font-mono text-white/45">
                              9:16 Vertical · 5s Orbital Loop
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Download Button + Genuine Community Message */}
                    <div className="w-full max-w-md flex flex-col items-center space-y-2.5">
                      <button
                        type="button"
                        onClick={handleDownloadTrailer}
                        disabled={!videoUrl || isDownloading}
                        className={`w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          videoUrl
                            ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer'
                            : 'bg-white/5 border border-white/15 text-white/50 cursor-not-allowed'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>
                          {isDownloading ? 'Preparing MP4...' : '⬇ Download 9:16 MP4 Trailer'}
                        </span>
                      </button>

                      <p className="text-xs font-sans text-cyan-100/85 text-center leading-relaxed italic flex items-center justify-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400/30" />
                        <span>{COMMUNITY_SHARE_VIDEO_MESSAGE}</span>
                      </p>

                      <p className="text-[10px] font-mono text-white/45 text-center">
                        Motion Prompt: "{VIRAL_VIDEO_MOTION_PROMPT}"
                      </p>
                    </div>

                    {/* Sleek Left/Right Navigation Arrows */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevPhoto();
                      }}
                      aria-label="Previous Archive Slide"
                      className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#040916]/90 hover:bg-cyan-950/95 active:scale-95 text-white border border-cyan-400/40 flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.85),0_0_15px_rgba(6,182,212,0.25)] touch-manipulation"
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
                      aria-label="Next Archive Slide"
                      className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#040916]/90 hover:bg-cyan-950/95 active:scale-95 text-white border border-cyan-400/40 flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.85),0_0_15px_rgba(6,182,212,0.25)] touch-manipulation"
                      title="Next Slide"
                    >
                      <ChevronRight className="w-6 h-6 text-cyan-300" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-[21/9] rounded-2xl overflow-hidden bg-black/95 border border-cyan-500/40 shadow-[0_0_40px_rgba(56,189,248,0.15)] group"
                    onTouchStart={handleTouchStartStage}
                    onTouchEnd={handleTouchEndStage}
                  >
                    {currentPhoto.url ? (
                      <img
                        src={currentPhoto.url}
                        alt={currentPhoto.title}
                        className={`w-full h-full object-cover transition-all duration-300 select-none ${
                          isZoomed ? 'scale-125 cursor-zoom-out' : 'group-hover:scale-102 cursor-zoom-in'
                        }`}
                        onClick={() => setIsZoomed(!isZoomed)}
                        draggable={false}
                      />
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

                    {/* Bottom-center subtle slide badge on photo stage */}
                    <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-[#040915]/85 border border-white/15 text-[10px] font-mono text-cyan-200 flex items-center gap-2 shadow-lg">
                      <span className="font-bold text-amber-300">0{activePhotoIdx + 1} / 05</span>
                      <span className="text-white/40">·</span>
                      <span className="truncate max-w-[160px] sm:max-w-[260px]">{currentPhoto.title}</span>
                    </div>

                    {/* Sleek Left/Right Navigation Arrows (Always visible on mobile/tablet & desktop) */}
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

                {/* Dedicated Mobile & Tablet Gallery Control Bar (lg:hidden) for effortless one-handed photo cycling */}
                <div className="flex lg:hidden items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#070d1b] border border-cyan-500/25">
                  <button
                    type="button"
                    onClick={handlePrevPhoto}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 active:scale-95 border border-cyan-400/35 text-cyan-200 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer touch-manipulation"
                  >
                    <ChevronLeft className="w-4 h-4 text-cyan-400" />
                    <span>Prev</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {photoCards.map((card, idx) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => {
                          soundManager.playTone(540 + idx * 40, 0.04);
                          setActivePhotoIdx(idx);
                        }}
                        aria-label={`View photo ${idx + 1}`}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          activePhotoIdx === idx
                            ? 'w-5 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                            : 'w-2 bg-white/25 hover:bg-white/40'
                        }`}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playTone(760, 0.05);
                        setActivePhotoIdx(photoCards.length);
                      }}
                      aria-label="View 9:16 Trailer"
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        isTrailerTab
                          ? 'w-5 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                          : 'w-2 bg-amber-400/35 hover:bg-amber-400/60'
                      }`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleNextPhoto}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 active:scale-95 border border-cyan-400/35 text-cyan-200 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer touch-manipulation"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4 text-cyan-400" />
                  </button>
                </div>

                {/* 5-Photo Thumbnail Filmstrip + 🎥 9:16 Trailer Tab */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                  {photoCards.map((card, idx) => {
                    const isActive = activePhotoIdx === idx;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => {
                          soundManager.playTone(540 + idx * 40, 0.04);
                          setActivePhotoIdx(idx);
                        }}
                        className={`relative aspect-[16/10] rounded-xl overflow-hidden border transition-all cursor-pointer text-left touch-manipulation select-none ${
                          isActive
                            ? 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                            : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
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
                          <span className="text-[9px] font-mono font-bold text-white truncate leading-tight">
                            0{idx + 1} · {card.title.split(' ')[0]}
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {/* Dedicated 🎥 9:16 Trailer Tab */}
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playTone(760, 0.05);
                      setActivePhotoIdx(photoCards.length);
                    }}
                    className={`relative aspect-[16/10] rounded-xl overflow-hidden border transition-all cursor-pointer text-left flex flex-col items-center justify-center p-1.5 touch-manipulation select-none ${
                      isTrailerTab
                        ? 'border-amber-400 ring-2 ring-amber-400/50 bg-gradient-to-br from-amber-950/80 via-[#070d1e] to-black shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                        : 'border-amber-500/30 hover:border-amber-400/60 bg-gradient-to-br from-[#0a1228] to-black opacity-90 hover:opacity-100'
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
                      <Video className="w-4 h-4 text-amber-300" />
                      <span className="text-[9.5px] font-mono font-extrabold text-amber-300 leading-tight">
                        🎥 9:16 Trailer
                      </span>
                      <span className="text-[8px] font-mono text-cyan-300/90 uppercase">
                        5s Vertical
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. SYNTHESIZED PLANETARY LORE */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#080d1a] border border-white/10 space-y-2.5">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Sparkles className="w-4 h-4" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                    Official Lore Dossier · 2027 Governance Archive
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-white/80 font-sans leading-relaxed whitespace-pre-line">
                  {activePlanet.generatedLore}
                </p>
              </div>

              {/* 3. ENVIRONMENTAL SPECIFICATIONS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#090e1d] border border-white/10 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-300 font-semibold">
                    <Globe2 className="w-3.5 h-3.5" />
                    <span>Atmosphere &amp; Spectra</span>
                  </div>
                  <p className="text-xs text-white/70 font-sans">{activePlanet.atmosphere}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#090e1d] border border-white/10 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-300 font-semibold">
                    <Trees className="w-3.5 h-3.5" />
                    <span>Flora Ecosystem</span>
                  </div>
                  <p className="text-xs text-white/70 font-sans">{activePlanet.flora}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#090e1d] border border-white/10 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-purple-300 font-semibold">
                    <Compass className="w-3.5 h-3.5" />
                    <span>Fauna &amp; Wildlife</span>
                  </div>
                  <p className="text-xs text-white/70 font-sans">{activePlanet.fauna}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#090e1d] border border-white/10 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-amber-300 font-semibold">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Sonic Vibe &amp; Acoustic Style</span>
                  </div>
                  <p className="text-xs text-white/70 font-sans">{activePlanet.sonicVibe}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#090e1d] border border-white/10 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-pink-300 font-semibold">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Visual Aesthetic Pipeline</span>
                  </div>
                  <p className="text-xs text-white/70 font-sans">{activePlanet.visualAesthetic}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#090e1d] border border-white/10 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-yellow-300 font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Iconic Planet Landmark</span>
                  </div>
                  <p className="text-xs text-white/70 font-sans">{activePlanet.landmark}</p>
                </div>
              </div>

              {/* 4. FOUNDING CREED & FUTURE PROMISE */}
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

              {/* 5. WORLD ARCHITECT SECRET NOTES (If present) */}
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
            <footer className="px-4 sm:px-5 py-3 sm:py-3.5 bg-[#070c18] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                <div className="flex items-center gap-1.5 text-xs font-mono text-white/60">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>One Golden Ticket Verified</span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-300">
                  {activePlanet.votesCount} Total Community Votes
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyGalaxyLink}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 font-mono text-xs transition-colors cursor-pointer flex items-center gap-1.5"
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
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/40 text-cyan-200 font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                  >
                    <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
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
                    className={`min-h-[42px] px-5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                      activePlanet.hasVoted
                        ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                        : 'bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${activePlanet.hasVoted ? 'fill-black' : ''}`} />
                    <span>{activePlanet.hasVoted ? 'Voted for World' : 'Cast Vote for World'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 font-mono text-xs transition-colors cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};

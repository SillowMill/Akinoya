import React, { useState, useRef } from 'react';
import {
  Camera,
  Video,
  Download,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Play,
  Heart,
  MapPin,
  Globe2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { PlanetSubmission } from '../types/contest';
import {
  getPlanetPhotoCards,
  UI_RECALIBRATING_STATUS_TEXT,
  COMMUNITY_SHARE_VIDEO_MESSAGE,
  VIRAL_VIDEO_MOTION_PROMPT,
  copyPlanetGalaxyLink,
} from '../data/contest';
import { soundManager } from '../utils/audio';

const SLOT_CODES = ['01_main', '02_flora', '03_fauna', '04_atmo', '05_lore'];
const SLOT_LABELS = ['01 Main', '02 Botanical', '03 Exotic', '04 Atmo', '05 Lore'];

interface MyWorldProps {
  dossier: PlanetSubmission;
  onInspectModal?: (dossier: PlanetSubmission) => void;
  onRetryVideoSynthesis?: () => void;
  isSynthesizingVideo?: boolean;
  onNavigateToGalaxy?: (planetId?: string) => void;
}

export const MyWorld: React.FC<MyWorldProps> = ({
  dossier,
  onInspectModal,
  onRetryVideoSynthesis,
  isSynthesizingVideo = false,
  onNavigateToGalaxy,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopiedGalaxyLink, setIsCopiedGalaxyLink] = useState(false);
  const photoCards = getPlanetPhotoCards(dossier);

  // Mobile carousel (opens on 01 Main by default)
  const [activeSlide, setActiveSlide] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const safeIdx = Math.min(activeSlide, Math.max(0, photoCards.length - 1));
  const activeCard = photoCards[safeIdx];
  const goToSlide = (delta: number) => {
    soundManager.playTone(600, 0.03);
    setActiveSlide((prev) => {
      const total = photoCards.length || 1;
      return (prev + delta + total) % total;
    });
  };

  const handleCopyGalaxyLink = async () => {
    soundManager.playTone(720, 0.05);
    const success = await copyPlanetGalaxyLink(dossier.id);
    if (success) {
      setIsCopiedGalaxyLink(true);
      setTimeout(() => setIsCopiedGalaxyLink(false), 2200);
    }
  };
  const videoUrl =
    dossier.videoUrl ||
    dossier.renders?.videoUrl ||
    dossier.renders?.video_url ||
    '';
  const heroPhotoUrl = photoCards[0]?.url || dossier.renders?.hero || '';
  const isVideoReady = Boolean(videoUrl);

  const handleDownloadTrailer = async () => {
    soundManager.playTone(740, 0.06);
    if (!videoUrl) return;
    setIsDownloading(true);
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = (dossier.planetName || 'akinoya-sector')
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

  return (
    <div className="p-5 sm:p-6 md:p-7 rounded-2xl bg-gradient-to-br from-cyan-950/35 via-[#050a14]/85 to-[#030710]/95 backdrop-blur-xl border border-cyan-500/30 space-y-6 md:space-y-7 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_25px_rgba(6,182,212,0.12)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4 pb-3.5 border-b border-white/10">
        <div className="flex items-center gap-x-2.5 gap-y-1.5 flex-wrap min-w-0">
          <Camera className="w-4 h-4 text-amber-400 shrink-0" />
          <h3 className="text-xs sm:text-sm md:text-base font-mono font-bold uppercase tracking-wider text-white min-w-0 break-words">
            Synthesized 5-Photo Visual Archive &amp; 9:16 Viral Trailer
          </h3>
        </div>

        <div className="hidden sm:flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleCopyGalaxyLink}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/85 hover:text-white text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap min-h-[40px]"
            title="Copy Shareable Planet Link"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>{isCopiedGalaxyLink ? 'Link Copied!' : 'Copy Planet Link'}</span>
          </button>

          {onNavigateToGalaxy && (
            <button
              type="button"
              onClick={() => onNavigateToGalaxy(dossier.id)}
              className="px-3.5 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/40 text-cyan-200 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.25)] whitespace-nowrap min-h-[40px]"
            >
              <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>View in Galaxy</span>
            </button>
          )}

          <span className="text-[10px] font-mono text-cyan-400 hidden xl:inline">
            5-Photo 4K Archive · 9:16 Trailer (5s)
          </span>
        </div>
      </div>

      {/* Main Layout: 9:16 Vertical Video Trailer + 5 Photo Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-7 items-stretch">
        {/* LEFT COLUMN: 9:16 Viral Vertical Video Trailer */}
        <div className="lg:col-span-4 flex flex-col items-center space-y-4 bg-gradient-to-b from-[#070d1e]/90 via-[#050813]/90 to-[#02050c]/95 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 md:p-6 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
          <div className="w-full flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300">
              <Video className="w-3.5 h-3.5 text-cyan-400" />
              <span>🎥 9:16 Viral Trailer · 5s Loop</span>
            </span>
            <span
              className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                isVideoReady
                  ? 'bg-emerald-950/80 border-emerald-400/50 text-emerald-300'
                  : 'bg-cyan-950/80 border-cyan-400/40 text-cyan-200'
              }`}
            >
              {isVideoReady ? 'READY · 9:16' : 'QUEUED_PENDING'}
            </span>
          </div>

          {/* Strict 9:16 Vertical Viewport */}
          <div className="relative w-full max-w-[260px] md:max-w-[290px] aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-cyan-400/40 shadow-[0_0_30px_rgba(6,182,212,0.25)] flex items-center justify-center">
            {isVideoReady ? (
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
                    alt={dossier.planetName}
                    className="absolute inset-0 w-full h-full object-cover opacity-35 scale-110 transition-transform duration-1000"
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
                    {isSynthesizingVideo ? 'SYNTHESIZING 9:16 TRAILER...' : 'STATUS: QUEUED_PENDING'}
                  </span>

                  <p className="text-[11px] font-sans text-white/85 leading-relaxed">
                    {UI_RECALIBRATING_STATUS_TEXT}
                  </p>

                  <span className="text-[9.5px] font-mono text-white/45 leading-tight">
                    9:16 Vertical · 5.0s Orbital Loop
                  </span>

                  {onRetryVideoSynthesis && !isSynthesizingVideo && (
                    <button
                      type="button"
                      onClick={onRetryVideoSynthesis}
                      className="mt-1 px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/40 text-cyan-200 font-mono text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Check Trailer Node</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Prominent [⬇ Download 9:16 MP4 Trailer] Button */}
          <button
            type="button"
            onClick={handleDownloadTrailer}
            disabled={!isVideoReady || isDownloading}
            className={`w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              isVideoReady
                ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer'
                : 'bg-white/5 border border-white/15 text-white/50 cursor-not-allowed'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {isDownloading ? 'Preparing MP4...' : '⬇ Download 9:16 MP4 Trailer'}
            </span>
          </button>

          {/* Galaxy Navigator & Sector Link Quick Actions */}
          <div className="w-full grid grid-cols-2 gap-2">
            {onNavigateToGalaxy && (
              <button
                type="button"
                onClick={() => onNavigateToGalaxy(dossier.id)}
                className="py-2 px-2.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/40 text-cyan-200 font-mono text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>View in Galaxy</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyGalaxyLink}
              className={`py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-mono text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                !onNavigateToGalaxy ? 'col-span-2' : ''
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>{isCopiedGalaxyLink ? 'Copied!' : 'Planet Link'}</span>
            </button>
          </div>

          {/* Genuine Community Message Directly Beneath the Video Player */}
          <p className="text-xs font-sans text-cyan-100/85 text-center leading-relaxed italic px-2 flex items-center justify-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400/30" />
            <span>{COMMUNITY_SHARE_VIDEO_MESSAGE}</span>
          </p>
        </div>

        {/* RIGHT COLUMN: 5 Photo Cards (01_main through 05_lore) */}
        <div className="lg:col-span-8 flex flex-col gap-4 min-w-0">
          {/* MOBILE & TABLET (< 1024px): interactive photo viewer with sleek left/right arrows */}
          <div className="lg:hidden space-y-3">
            <div
              className="relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-2xl overflow-hidden bg-black border border-cyan-500/35 shadow-[0_0_30px_rgba(6,182,212,0.15)] touch-pan-y select-none"
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  touchStartXRef.current = e.touches[0].clientX;
                } else {
                  touchStartXRef.current = null;
                }
              }}
              onTouchEnd={(e) => {
                if (touchStartXRef.current === null || e.changedTouches.length === 0) return;
                const dx = e.changedTouches[0].clientX - touchStartXRef.current;
                touchStartXRef.current = null;
                if (Math.abs(dx) > 40) goToSlide(dx < 0 ? 1 : -1);
              }}
            >
              {activeCard?.url ? (
                <img
                  key={activeCard.id}
                  src={activeCard.url}
                  alt={activeCard.title}
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-cover select-none"
                  onClick={() => {
                    if (onInspectModal) {
                      soundManager.playTone(660, 0.05);
                      onInspectModal(dossier);
                    }
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-[#070d1e] via-[#050813] to-black flex flex-col items-center justify-center p-4 text-center space-y-1.5">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-cyan-200 uppercase">QUEUED_PENDING</span>
                  <p className="text-[10px] font-sans text-white/75 leading-snug">{UI_RECALIBRATING_STATUS_TEXT}</p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />

              {/* Sleek Left/Right Navigation Arrows */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(-1);
                }}
                aria-label="Previous photo"
                className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 z-20 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-[#040916]/90 hover:bg-cyan-950/95 border border-cyan-400/40 text-white flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.85),0_0_15px_rgba(6,182,212,0.25)] touch-manipulation"
              >
                <ChevronLeft className="w-6 h-6 text-cyan-300" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(1);
                }}
                aria-label="Next photo"
                className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 z-20 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-[#040916]/90 hover:bg-cyan-950/95 border border-cyan-400/40 text-white flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.85),0_0_15px_rgba(6,182,212,0.25)] touch-manipulation"
              >
                <ChevronRight className="w-6 h-6 text-cyan-300" />
              </button>

              <div className="absolute left-3.5 right-3.5 bottom-3 flex items-end justify-between gap-2 pointer-events-none">
                <div className="min-w-0">
                  <span className="text-[9.5px] font-mono font-bold tracking-wider text-amber-300 uppercase block truncate">
                    {SLOT_CODES[safeIdx]} · {activeCard?.category}
                  </span>
                  <h4 className="text-xs sm:text-sm font-sans font-semibold text-white truncate">{activeCard?.title}</h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#040915]/85 border border-white/15 text-[10px] font-mono font-bold text-cyan-300 shrink-0">
                  0{safeIdx + 1} / 0{photoCards.length}
                </span>
              </div>
            </div>

            {/* Mobile & Tablet Quick-Cycle Control Bar */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#070d1b] border border-cyan-500/25">
              <button
                type="button"
                onClick={() => goToSlide(-1)}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 active:scale-95 border border-cyan-400/35 text-cyan-200 font-mono text-xs font-bold flex items-center gap-1 cursor-pointer touch-manipulation"
              >
                <ChevronLeft className="w-4 h-4 text-cyan-400" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1.5">
                {photoCards.map((photo, index) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => {
                      soundManager.playTone(600, 0.03);
                      setActiveSlide(index);
                    }}
                    aria-label={`Select photo ${index + 1}`}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      index === safeIdx
                        ? 'w-5 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                        : 'w-2 bg-white/25 hover:bg-white/45'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => goToSlide(1)}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 active:scale-95 border border-cyan-400/35 text-cyan-200 font-mono text-xs font-bold flex items-center gap-1 cursor-pointer touch-manipulation"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4 text-cyan-400" />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {photoCards.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => {
                    soundManager.playTone(600, 0.03);
                    setActiveSlide(index);
                  }}
                  className={`relative rounded-lg overflow-hidden border transition-all cursor-pointer touch-manipulation select-none ${
                    index === safeIdx
                      ? 'border-amber-400 ring-1 ring-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.45)]'
                      : 'border-white/10 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="aspect-square bg-black">
                    {photo.url ? (
                      <img src={photo.url} alt={photo.title} className="w-full h-full object-cover pointer-events-none" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#070d1e]">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300/70" />
                      </div>
                    )}
                  </div>
                  <span className="block py-0.5 text-[8.5px] font-mono font-bold text-white bg-black/80 truncate px-1 text-center">
                    {SLOT_LABELS[index]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* DESKTOP (>= 1024px): bento grid filling the full container */}
          <div className="hidden lg:grid grid-cols-6 grid-rows-[repeat(3,minmax(0,1fr))] gap-3.5 lg:flex-1 lg:min-h-[520px]">
            {photoCards.map((photo, index) => {
              const hasPhoto = Boolean(photo.url);
              const spanClass =
                index === 0
                  ? 'col-span-4 row-span-2'
                  : index === 1 || index === 2
                  ? 'col-span-2 row-span-1'
                  : 'col-span-3 row-span-1';

              return (
                <div
                  key={photo.id}
                  onClick={() => {
                    if (onInspectModal) {
                      soundManager.playTone(660, 0.05);
                      onInspectModal(dossier);
                    }
                  }}
                  className={`${spanClass} group relative rounded-xl overflow-hidden bg-black/80 border border-white/10 hover:border-amber-400/50 transition-colors cursor-pointer flex flex-col justify-end p-3.5 shadow-md min-h-0`}
                >
                  {hasPhoto ? (
                    <>
                      <img
                        src={photo.url}
                        alt={photo.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 will-change-transform"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-b from-[#070d1e] via-[#050813] to-black flex flex-col items-center justify-center p-3 text-center space-y-1.5">
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span className="text-[9.5px] font-mono font-bold text-cyan-200 uppercase">QUEUED_PENDING</span>
                      <p className="text-[9.5px] font-sans text-white/75 leading-snug">{UI_RECALIBRATING_STATUS_TEXT}</p>
                    </div>
                  )}

                  <div className="relative z-10 flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono font-bold tracking-wider text-amber-300 uppercase block truncate">
                        {SLOT_CODES[index]} · {photo.category}
                      </span>
                      <h4 className="text-xs font-sans font-semibold text-white truncate group-hover:text-amber-200">
                        {photo.title}
                      </h4>
                    </div>
                    {hasPhoto && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cinematic Motion Prompt Info Strip */}
          <div className="p-3.5 rounded-xl bg-[#070b16] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-[9.5px] font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <Play className="w-3 h-3 text-cyan-400" />
                <span>9:16 Orbital Motion Directive (5.0s Loop)</span>
              </span>
              <p className="text-[11px] font-mono text-white/60 leading-relaxed">
                "{VIRAL_VIDEO_MOTION_PROMPT}"
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyWorld;

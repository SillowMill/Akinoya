import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { getPioneerMasterVideoUrl } from '../utils/pioneer';
import {
  useDynamicWorldVideo,
  isMobileOrTabletDevice,
  getCacheBustedUrl,
  downloadOrShareVideoDirect,
  prewarmTrailerFastStartBlob,
  LiveStoryTrailerViewport,
  deriveWorldVerificationMeta,
} from './WorldStoryVerificationBadge';
import { watermarkAndSavePhoto } from '../utils/watermarkPhoto';
import { formatTitleCaseUserName } from '../utils/holder';
import sillowMillLogoUrl from '../assets/images/Sillowmilllogo.png';
import amlemiOrbitalImg from '../assets/images/amlemi_renders/01-orbital.png';

const SLOT_CODES = ['01_main', '02_flora', '03_fauna', '04_atmo', '05_lore'];
const SLOT_LABELS = ['01 Main', '02 Botanical', '03 Exotic', '04 Atmo', '05 Lore'];

interface MyWorldProps {
  dossier: PlanetSubmission;
  onInspectModal?: (dossier: PlanetSubmission) => void;
  onRetryVideoSynthesis?: () => void;
  isSynthesizingVideo?: boolean;
  onNavigateToGalaxy?: (planetId?: string) => void;
}

export const MyWorld: React.FC<MyWorldProps> = React.memo(({
  dossier,
  onInspectModal,
  onRetryVideoSynthesis,
  isSynthesizingVideo = false,
  onNavigateToGalaxy,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingPhoto, setIsDownloadingPhoto] = useState(false);
  const [isCopiedGalaxyLink, setIsCopiedGalaxyLink] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(() =>
    typeof window !== 'undefined' ? isMobileOrTabletDevice() : false
  );
  const photoCards = useMemo(() => getPlanetPhotoCards(dossier), [dossier]);
  const meta = useMemo(() => deriveWorldVerificationMeta(dossier), [dossier]);
  const formattedAuthor = useMemo(() => formatTitleCaseUserName(dossier.authorName), [dossier.authorName]);
  const planetThumbnailUrl = useMemo(
    () => photoCards[0]?.url || dossier.renders?.hero || dossier.renders?.['01_main'] || amlemiOrbitalImg,
    [photoCards, dossier.renders]
  );

  useEffect(() => {
    setIsMobileDevice(isMobileOrTabletDevice());
  }, []);

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
  const dynamicVideo = useDynamicWorldVideo(dossier);
  const pioneerVideo = getPioneerMasterVideoUrl(dossier);
  const videoUrl =
    pioneerVideo ||
    dynamicVideo.videoUrl ||
    dossier.videoUrl ||
    dossier.renders?.videoUrl ||
    dossier.renders?.video_url ||
    '';
  const heroPhotoUrl = photoCards[0]?.url || dossier.renders?.hero || '';
  const isVideoReady = Boolean(videoUrl);

  // Prewarm FastStart MP4 trailer blob for 0ms instantaneous saving/sharing to iOS Photos & Desktop
  useEffect(() => {
    if (dossier && videoUrl) {
      prewarmTrailerFastStartBlob(videoUrl, dossier);
    }
  }, [dossier, videoUrl]);

  const handleDownloadTrailer = async () => {
    soundManager.playTone(740, 0.06);
    if (!videoUrl) return;
    setIsDownloading(true);
    const safeName = (dossier.planetName || 'akinoya-sector')
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-');
    const filename = `sillowmill-${safeName}-9x16-trailer.mp4`;
    const shareTitle = `${dossier.planetName || 'Ämlemi'} — Sillow Mill 9:16 Trailer`;
    const shareText = `Verified Planetary Dossier: ${dossier.planetName || 'Ämlemi'}`;

    try {
      await downloadOrShareVideoDirect(videoUrl, filename, shareTitle, shareText, dossier);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPhoto = async (photo: (typeof photoCards)[0]) => {
    if (!photo?.url || !dossier) return;
    soundManager.playTone(740, 0.06);
    setIsDownloadingPhoto(true);
    const safePlanet = (dossier.planetName || 'akinoya-world').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const safeTitle = (photo.title || 'photo').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const filename = `sillowmill-${safePlanet}-${safeTitle}.jpg`;
    const shareTitle = `${dossier.planetName || 'Ämlemi'} — ${photo.title}`;
    const shareText = `Verified 4K Genesis World: ${photo.title}`;

    const photoIndex = photoCards.findIndex((p) => p.id === photo.id);
    try {
      await watermarkAndSavePhoto(photo.url, filename, shareTitle, shareText, {
        planetName: dossier.planetName,
        photoTitle: photo.title,
        category: photo.category,
        slotIndex: photoIndex >= 0 ? photoIndex : safeIdx,
        dossier,
      });
    } finally {
      setIsDownloadingPhoto(false);
    }
  };

  return (
    <div
      className="relative overflow-hidden p-5 sm:p-6 md:p-8 rounded-3xl bg-gradient-to-b from-[#060c1e]/90 via-[#030612]/92 to-[#01040a]/98 backdrop-blur-2xl border border-cyan-400/35 space-y-6 md:space-y-8 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_40px_rgba(6,182,212,0.18)]"
      style={{
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        willChange: 'transform',
        overflowAnchor: 'none',
      }}
    >
      {/* ─── MULTI-LAYERED RADIAL NEBULA GLOWS (INDIGO, STELLAR GOLD, ELECTRIC CYAN) ─── */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-400/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-indigo-600/12 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/80 via-amber-300/80 to-transparent pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-x-2.5 sm:gap-x-3 gap-y-1.5 flex-wrap min-w-0">
          {/* Official Ämlemi Planetary Thumbnail Render (Matching Official Galaxy Navigator Celestial Orb) */}
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 shrink-0 group flex items-center justify-center">
            {/* Single Delicate Dotted Ring Structure */}
            <div
              className="absolute -inset-2 rounded-full border border-dotted border-amber-300/85 pointer-events-none animate-spin"
              style={{ animationDuration: '20s' }}
            />

            {/* Celestial Planet Orb with Glowing Solid Gold Primary Border */}
            <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-amber-400 bg-[#070c18] flex items-center justify-center shrink-0 shadow-[0_0_24px_rgba(245,158,11,0.8)] group-hover:scale-110 transition-all duration-300">
              <img
                src={planetThumbnailUrl}
                alt={`${dossier.planetName || 'Ämlemi'} Planetary Horizon`}
                className="w-full h-full object-cover group-hover:rotate-6 transition-transform duration-700"
                draggable={false}
                loading="eager"
                decoding="async"
              />
              {/* Gradient Atmospheric Shell matching Galaxy Navigator (Crystal-Clear Purity) */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/20 pointer-events-none" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider truncate flex items-center gap-1.5">
              <span>{dossier.planetName || 'ÄKINOYA SECTOR'}</span>
              <span className="text-white/40">·</span>
              <span className="text-cyan-300">ARCHITECT: {formattedAuthor}</span>
            </div>
            <h3 className="text-xs sm:text-sm md:text-base font-mono font-bold uppercase tracking-wider text-white min-w-0 break-words drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              Synthesized 5-Photo Visual Archive &amp; 9:16 Viral Trailer
            </h3>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2.5 flex-wrap shrink-0">
          {dossier.status === 'QUEUED' || (dossier as any).isWaitlist ? (
            <span className="px-3.5 py-2 rounded-xl bg-amber-950/80 border border-amber-400/50 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.25)] animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>World will be revealed 9 januari</span>
            </span>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Queued / Waitlist Reveal Notification Banner */}
      {(dossier.status === 'QUEUED' || (dossier as any).isWaitlist) && (
        <div className="relative z-10 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/80 via-[#071126]/90 to-cyan-950/80 border-2 border-amber-400/50 p-4 sm:p-5 shadow-[0_10px_35px_rgba(0,0,0,0.7),0_0_25px_rgba(245,158,11,0.25)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent pointer-events-none" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-amber-400 text-black shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <div className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-amber-300">
                  PRIVATE PREVIEW · EXPANSION QUEUE
                </div>
                <div className="text-xs sm:text-sm text-white/90 font-sans mt-0.5">
                  Your custom planetary coordinates are safely locked. Full constellation reveal occurs on <strong className="text-amber-300">9 januari 2027</strong>.
                </div>
              </div>
            </div>
            <span className="shrink-0 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/60 text-amber-300 text-[10px] font-mono font-extrabold tracking-wider whitespace-nowrap">
              WORLD WILL BE REVEALED 9 JANUARI 2027
            </span>
          </div>
        </div>
      )}

      {/* Main Layout: 9:16 Vertical Video Trailer + 5 Photo Cards */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-7 items-stretch">
        {/* LEFT COLUMN: 9:16 Viral Vertical Video Trailer */}
        <div className="lg:col-span-4 flex flex-col items-center space-y-4 bg-gradient-to-b from-[#070e24]/90 via-[#040817]/90 to-[#02040d]/95 border border-cyan-400/40 rounded-2xl p-4 sm:p-5 md:p-6 shadow-[0_0_35px_rgba(6,182,212,0.2)]">
          <div className="w-full flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300">
              <Video className="w-3.5 h-3.5 text-cyan-400" />
              <span>🎥 9:16 Viral Trailer · 5s Loop</span>
            </span>
            <span
              className={`text-[9px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                isVideoReady
                  ? 'bg-emerald-950/80 border-emerald-400/50 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                  : 'bg-cyan-950/80 border-cyan-400/40 text-cyan-200'
              }`}
            >
              {isVideoReady ? 'READY · 9:16' : 'QUEUED_PENDING'}
            </span>
          </div>

          {/* Strict 9:16 Vertical Viewport */}
          <div
            className="video-stage-container video-player-gpu relative w-full max-w-[260px] md:max-w-[290px] aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-cyan-400/50 shadow-[0_0_35px_rgba(6,182,212,0.3)] flex items-center justify-center touch-pan-y-lock"
            style={{
              transform: 'translateZ(0)',
              WebkitTransform: 'translateZ(0)',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              touchAction: 'manipulation',
            }}
          >
            {isVideoReady ? (
              <LiveStoryTrailerViewport
                dossier={dossier}
                meta={meta}
                photoCards={photoCards}
                activeVideoUrl={videoUrl}
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
              {isDownloading
                ? (isMobileDevice ? 'Saving Trailer to Photos...' : 'Preparing MP4...')
                : (isMobileDevice ? 'Save Trailer to Photos' : '⬇ Download 9:16 MP4 Trailer')}
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
              style={{ transform: 'translate3d(0,0,0)', willChange: 'transform', overflowAnchor: 'none' }}
              className="relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-2xl overflow-hidden bg-black border border-cyan-400/50 shadow-[0_0_35px_rgba(6,182,212,0.25)] touch-pan-y select-none transform-gpu"
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
                  src={getCacheBustedUrl(activeCard.url)}
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

              {/* Sleek Blue Navigation Arrows - Perfectly Centered Vertically without Overlapping Text */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(-1);
                }}
                aria-label="Previous photo"
                className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-30 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-[#040916]/92 hover:bg-cyan-950/95 border-2 border-cyan-400/60 hover:border-cyan-300 text-cyan-300 hover:text-white flex items-center justify-center cursor-pointer active:scale-95 hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,0,0,0.9),0_0_15px_rgba(6,182,212,0.4)] touch-manipulation"
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
                className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-30 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-[#040916]/92 hover:bg-cyan-950/95 border-2 border-cyan-400/60 hover:border-cyan-300 text-cyan-300 hover:text-white flex items-center justify-center cursor-pointer active:scale-95 hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,0,0,0.9),0_0_15px_rgba(6,182,212,0.4)] touch-manipulation"
              >
                <ChevronRight className="w-6 h-6 text-cyan-300" />
              </button>

              <div className="absolute top-3 right-3 z-20 pointer-events-none px-2.5 py-0.5 rounded-full bg-[#040915]/85 border border-white/15 text-[10px] font-mono font-bold text-cyan-300 shrink-0">
                0{safeIdx + 1} / 0{photoCards.length}
              </div>
            </div>

            {/* Direct Save-to-Photos Action for Active Photo (Mobile & Tablet) */}
            {activeCard?.url && (
              <button
                type="button"
                onClick={() => handleDownloadPhoto(activeCard)}
                disabled={isDownloadingPhoto}
                className="w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer touch-manipulation min-h-[42px]"
                title="Save picture to Photos"
              >
                <Download className="w-3.5 h-3.5 text-black" />
                <span>
                  {isDownloadingPhoto ? 'Saving picture to Photos...' : 'Save picture to Photos'}
                </span>
              </button>
            )}

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
                    {hasPhoto && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPhoto(photo);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-black/80 hover:bg-amber-400 text-cyan-300 hover:text-black border border-white/20 hover:border-amber-400 cursor-pointer shadow-md"
                          title="Save picture to Photos"
                          aria-label="Save picture to Photos"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      </div>
                    )}
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
});

export default MyWorld;

import React, { useState } from 'react';
import {
  Camera,
  Video,
  Download,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Play,
  Heart,
} from 'lucide-react';
import { PlanetSubmission } from '../types/contest';
import {
  getPlanetPhotoCards,
  UI_RECALIBRATING_STATUS_TEXT,
  COMMUNITY_SHARE_VIDEO_MESSAGE,
  VIRAL_VIDEO_MOTION_PROMPT,
} from '../data/contest';
import { soundManager } from '../utils/audio';

interface MyWorldProps {
  dossier: PlanetSubmission;
  onInspectModal?: (dossier: PlanetSubmission) => void;
  onRetryVideoSynthesis?: () => void;
  isSynthesizingVideo?: boolean;
}

export const MyWorld: React.FC<MyWorldProps> = ({
  dossier,
  onInspectModal,
  onRetryVideoSynthesis,
  isSynthesizingVideo = false,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const photoCards = getPlanetPhotoCards(dossier);
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
    <div className="p-5 sm:p-6 rounded-2xl bg-black/60 border border-white/10 space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-white">
            Synthesized 5-Photo Visual Archive &amp; 9:16 Viral Trailer
          </h3>
        </div>
        <span className="text-[10px] font-mono text-cyan-400">
          5-Photo 4K Archive (01_main – 05_lore) · 9:16 Vertical Trailer (5s)
        </span>
      </div>

      {/* Main Layout: 9:16 Vertical Video Trailer + 5 Photo Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: 9:16 Viral Vertical Video Trailer */}
        <div className="lg:col-span-4 flex flex-col items-center space-y-3.5 bg-gradient-to-b from-[#070d1e]/90 via-[#050813]/90 to-black/95 border border-cyan-500/30 rounded-2xl p-4 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
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
          <div className="relative w-full max-w-[260px] aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-cyan-400/40 shadow-[0_0_30px_rgba(6,182,212,0.25)] flex items-center justify-center">
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

          {/* Genuine Community Message Directly Beneath the Video Player */}
          <p className="text-xs font-sans text-cyan-100/85 text-center leading-relaxed italic px-2 flex items-center justify-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400/30" />
            <span>{COMMUNITY_SHARE_VIDEO_MESSAGE}</span>
          </p>
        </div>

        {/* RIGHT COLUMN: 5 Photo Cards (01_main through 05_lore) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {photoCards.map((photo, index) => {
              const slotCode =
                index === 0
                  ? '01_main'
                  : index === 1
                  ? '02_flora'
                  : index === 2
                  ? '03_fauna'
                  : index === 3
                  ? '04_atmo'
                  : '05_lore';
              const hasPhoto = Boolean(photo.url);

              return (
                <div
                  key={photo.id}
                  onClick={() => {
                    if (onInspectModal) {
                      soundManager.playTone(660, 0.05);
                      onInspectModal(dossier);
                    }
                  }}
                  className="group relative rounded-xl overflow-hidden bg-black/80 border border-white/10 hover:border-amber-400/50 transition-all cursor-pointer aspect-[16/10] flex flex-col justify-end p-3 shadow-md"
                >
                  {hasPhoto ? (
                    <>
                      <img
                        src={photo.url}
                        alt={photo.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-b from-[#070d1e] via-[#050813] to-black flex flex-col items-center justify-center p-3 text-center space-y-1.5">
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span className="text-[9.5px] font-mono font-bold text-cyan-200 uppercase">
                        QUEUED_PENDING
                      </span>
                      <p className="text-[9.5px] font-sans text-white/75 leading-snug">
                        {UI_RECALIBRATING_STATUS_TEXT}
                      </p>
                    </div>
                  )}

                  <div className="relative z-10 flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <span className="text-[8.5px] font-mono font-bold tracking-wider text-amber-300 uppercase block truncate">
                        {slotCode} · {photo.category}
                      </span>
                      <h4 className="text-[11px] font-sans font-semibold text-white truncate group-hover:text-amber-200">
                        {photo.title}
                      </h4>
                    </div>
                    {hasPhoto && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
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
};

export default MyWorld;

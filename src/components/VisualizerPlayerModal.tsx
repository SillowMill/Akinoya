import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Sparkles,
  AudioWaveform,
  Film,
} from 'lucide-react';
import { VisualizerTrack } from './UnlockedExperience';
import { planetSoundtrack } from '../utils/soundtrack';
import akinoyaVistaImg from '../assets/images/akinoya_twilight_world_1790852640934.jpg';

export interface VisualizerPlayerModalProps {
  isOpen: boolean;
  activeTrack: VisualizerTrack | null;
  tracks: VisualizerTrack[];
  onClose: () => void;
  onSelectTrack: (track: VisualizerTrack) => void;
  isVipMode?: boolean;
}

export const VisualizerPlayerModal: React.FC<VisualizerPlayerModalProps> = ({
  isOpen,
  activeTrack,
  tracks,
  onClose,
  onSelectTrack,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const trackStripRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [feedbackIcon, setFeedbackIcon] = useState<'play' | 'pause' | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentIndex = tracks.findIndex((t) => t.id === activeTrack?.id);
  const totalTracks = tracks.length;
  const isTrack02 = activeTrack?.id === '02';
  const hasVideo = Boolean(activeTrack?.videoUrl);

  // Trigger brief visual feedback on play/pause
  const showFeedback = (type: 'play' | 'pause') => {
    setFeedbackIcon(type);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedbackIcon(null);
    }, 550);
  };

  // Close handler with audio cleanup
  const handleClose = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    planetSoundtrack.pause();
    onClose();
  }, [onClose]);

  // Navigate to Previous Track
  const handlePrevTrack = useCallback(() => {
    if (currentIndex === -1 || totalTracks === 0) return;
    const prevIndex = (currentIndex - 1 + totalTracks) % totalTracks;
    onSelectTrack(tracks[prevIndex]);
  }, [currentIndex, totalTracks, tracks, onSelectTrack]);

  // Navigate to Next Track
  const handleNextTrack = useCallback(() => {
    if (currentIndex === -1 || totalTracks === 0) return;
    const nextIndex = (currentIndex + 1) % totalTracks;
    onSelectTrack(tracks[nextIndex]);
  }, [currentIndex, totalTracks, tracks, onSelectTrack]);

  // Toggle Play / Pause
  const handleTogglePlay = useCallback(() => {
    if (isTrack02) {
      const willPlay = !planetSoundtrack.isPlaying;
      if (willPlay) {
        planetSoundtrack.play();
        videoRef.current?.play().catch(() => {});
        showFeedback('play');
      } else {
        planetSoundtrack.pause();
        videoRef.current?.pause();
        showFeedback('pause');
      }
      setIsPlaying(willPlay);
    } else if (videoRef.current && hasVideo) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
        showFeedback('play');
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
        showFeedback('pause');
      }
    } else {
      setIsPlaying((prev) => {
        const next = !prev;
        showFeedback(next ? 'play' : 'pause');
        return next;
      });
    }
  }, [isTrack02, hasVideo]);

  // Toggle Mute / Unmute
  const handleToggleMute = useCallback(() => {
    if (isTrack02) {
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);
      planetSoundtrack.setVolume(nextMuted ? 0 : 0.65);
    } else if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  }, [isTrack02, isMuted]);

  // Toggle Fullscreen
  const handleToggleFullscreen = useCallback(() => {
    const el = containerRef.current || videoRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if ((videoRef.current as any)?.webkitEnterFullscreen) {
        (videoRef.current as any).webkitEnterFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  }, []);

  // Sync Video & Audio when activeTrack changes
  useEffect(() => {
    if (!isOpen || !activeTrack) return;

    setCurrentTime(0);
    setDuration(0);

    const videoEl = videoRef.current;

    if (isTrack02) {
      // Bingäa: Video plays muted in background, audio played by master planetSoundtrack
      if (videoEl) {
        videoEl.muted = true;
        videoEl.defaultMuted = true;
        videoEl.play().catch(() => {});
      }
      planetSoundtrack.play();
      setIsPlaying(true);
      setIsMuted(false);
    } else if (hasVideo && videoEl) {
      // Don't Need or other video: Video audio unmuted, pause planetSoundtrack
      planetSoundtrack.pause();
      videoEl.muted = false;
      videoEl.defaultMuted = false;
      videoEl.volume = 1.0;
      videoEl
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsMuted(false);
        })
        .catch(() => {
          // If browser blocked unmuted autoplay, mute and continue playing
          videoEl.muted = true;
          videoEl.play().catch(() => {});
          setIsMuted(true);
        });
    } else {
      // Scheduled track
      planetSoundtrack.pause();
      setIsPlaying(true);
    }

    // Auto-scroll track strip so active pill is visible
    if (trackStripRef.current) {
      const activePill = trackStripRef.current.querySelector<HTMLElement>(`[data-track-id="${activeTrack.id}"]`);
      if (activePill) {
        activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [isOpen, activeTrack?.id, isTrack02, hasVideo]);

  // 100% Page Scroll Lock when modal is active
  useEffect(() => {
    if (!isOpen) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyWidth = document.body.style.width;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Prevent Safari background elastic overscroll
    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.modal-allow-scroll')) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Keyboard Shortcuts (Escape to close, Arrows to switch tracks, Space to play/pause)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevTrack();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextTrack();
      } else if (e.key === ' ') {
        e.preventDefault();
        handleTogglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.width = originalBodyWidth;
      document.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, [isOpen, handleClose, handlePrevTrack, handleNextTrack, handleTogglePlay]);

  // Touch Swipe Handlers for mobile binge-watching
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    // Minimum swipe threshold: 45px horizontal and predominantly horizontal
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        handleNextTrack();
      } else {
        handlePrevTrack();
      }
    }
  };

  // Video time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  if (typeof document === 'undefined' || !isOpen || !activeTrack) return null;

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[999999] flex items-center justify-center select-none"
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(5, 7, 12, 0.94)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          touchAction: 'none',
        }}
        onClick={handleClose}
      >
        {/* Modal Window Card */}
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: 'translateZ(0)',
            WebkitTransform: 'translateZ(0)',
            touchAction: 'manipulation',
          }}
          className="relative w-full max-w-4xl max-h-[96dvh] mx-3 xs:mx-4 sm:mx-6 rounded-2xl sm:rounded-3xl border border-white/12 bg-[#060911]/98 shadow-[0_0_60px_rgba(0,240,255,0.18),0_25px_50px_-12px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden"
        >
          {/* Top Bar: Live HUD & Close Button */}
          <div className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3.5 bg-black/60 border-b border-white/10 shrink-0">
            {/* Left: Track Status & Index */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)] shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold truncate">
                    TRACK #{activeTrack.id}
                  </span>
                  <span className="text-white/30 text-[9px] font-mono">/</span>
                  <span className="text-[9px] sm:text-[10px] font-mono text-white/50 tracking-wide">
                    {currentIndex + 1} OF {totalTracks}
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.2 rounded-full text-[8.5px] font-mono tracking-widest uppercase bg-cyan-950/80 border border-cyan-400/40 text-cyan-300">
                    {hasVideo ? '4K 60FPS MASTER' : 'PIPELINE ARCHIVE'}
                  </span>
                </div>
                <h2 className="text-xs sm:text-base font-display font-bold text-white truncate max-w-[220px] xs:max-w-[280px] sm:max-w-md">
                  {activeTrack.title}
                </h2>
              </div>
            </div>

            {/* Right: Quick Close Button (Min 44x44px touch target) */}
            <button
              type="button"
              aria-label="Close visualizer modal"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="w-11 h-11 sm:w-12 sm:h-12 -mr-1 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white/75 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 hover:border-white/25 shadow-lg shrink-0"
              style={{ touchAction: 'manipulation' }}
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Central Visualizer Stage (16:9 Maximize Ratio & Mobile Fit) */}
          <div
            onClick={handleTogglePlay}
            className="relative w-full aspect-video max-h-[50vh] sm:max-h-[56vh] bg-black flex items-center justify-center overflow-hidden cursor-pointer group/stage"
          >
            {hasVideo ? (
              <video
                ref={videoRef}
                key={activeTrack.videoUrl}
                src={activeTrack.videoUrl}
                poster={activeTrack.artworkUrl || akinoyaVistaImg}
                autoPlay
                loop
                playsInline
                preload="auto"
                disablePictureInPicture
                disableRemotePlayback
                controlsList="nodownload nofullscreen noremoteplayback"
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                {...({
                  'webkit-playsinline': 'true',
                  'x5-playsinline': 'true',
                  playsinline: 'true',
                } as any)}
                className="w-full h-full object-cover object-center pointer-events-none"
              />
            ) : (
              /* Ambient Audio Visualizer Hologram for Upcoming Tracks */
              <div className="relative w-full h-full flex flex-col items-center justify-center p-4 text-center">
                <img
                  src={activeTrack.artworkUrl || akinoyaVistaImg}
                  alt={activeTrack.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-50 scale-105 animate-pulse"
                  style={{ animationDuration: '7s' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,black_80%)] pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center max-w-md mx-auto space-y-2.5">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_24px_rgba(0,240,255,0.35)]">
                    <AudioWaveform className="w-6 h-6 text-cyan-400 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-400/40 text-emerald-300 font-semibold tracking-wider uppercase">
                      ● AUDIO TRANSMISSION MATRIX
                    </span>
                    <h3 className="text-base sm:text-xl font-display font-extrabold text-white mt-1">
                      {activeTrack.title}
                    </h3>
                    <p className="text-[10px] sm:text-xs font-mono text-cyan-300/80 mt-0.5">
                      3D Visualizer master rendering in progress
                    </p>
                  </div>

                  {/* Pulsing Audio Telemetry Waveform Bars */}
                  <div className="flex items-center gap-1 sm:gap-1.5 h-7 sm:h-9 pt-1">
                    {[35, 65, 90, 45, 80, 100, 75, 40, 65, 85, 55, 95, 70, 50, 85, 60].map((h, i) => (
                      <div
                        key={i}
                        className="w-0.5 sm:w-1 rounded-full bg-gradient-to-t from-cyan-400 to-emerald-400 transition-all duration-300"
                        style={{
                          height: `${isPlaying ? h : 15}%`,
                          animation: 'pulse 1.2s ease-in-out infinite alternate',
                          animationDelay: `${i * 0.08}s`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Quick Jump Buttons to Available Visualizers */}
                  <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onSelectTrack(tracks[0])}
                      className="px-3 py-1 rounded-lg bg-white/10 hover:bg-cyan-500/20 text-white text-[10px] font-mono border border-white/15 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Film className="w-3 h-3 text-cyan-400" />
                      <span>STREAM TRACK 01</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectTrack(tracks[1])}
                      className="px-3 py-1 rounded-lg bg-white/10 hover:bg-cyan-500/20 text-white text-[10px] font-mono border border-white/15 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Film className="w-3 h-3 text-cyan-400" />
                      <span>STREAM TRACK 02</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Visual Feedback on Play/Pause Click */}
            <AnimatePresence>
              {feedbackIcon && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/60 backdrop-blur-md border border-cyan-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.4)]">
                    {feedbackIcon === 'play' ? (
                      <Play className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400 fill-cyan-400 ml-1" />
                    ) : (
                      <Pause className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white" />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating Side Prev Button (Left) */}
            <button
              type="button"
              aria-label="Previous track"
              onClick={(e) => {
                e.stopPropagation();
                handlePrevTrack();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                handlePrevTrack();
              }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/55 hover:bg-black/85 active:bg-cyan-500/25 text-white/80 hover:text-white border border-white/15 hover:border-cyan-400/60 shadow-[0_0_20px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all cursor-pointer backdrop-blur-md z-10 group"
              style={{ touchAction: 'manipulation' }}
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 -ml-0.5 group-hover:scale-110 transition-transform" />
            </button>

            {/* Floating Side Next Button (Right) */}
            <button
              type="button"
              aria-label="Next track"
              onClick={(e) => {
                e.stopPropagation();
                handleNextTrack();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                handleNextTrack();
              }}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/55 hover:bg-black/85 active:bg-cyan-500/25 text-white/80 hover:text-white border border-white/15 hover:border-cyan-400/60 shadow-[0_0_20px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all cursor-pointer backdrop-blur-md z-10 group"
              style={{ touchAction: 'manipulation' }}
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 -mr-0.5 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* Interactive Scrubber Bar (When duration exists) */}
          {duration > 0 && (
            <div className="relative w-full bg-black/90 px-3.5 sm:px-6 pt-2 pb-1 border-t border-white/5 shrink-0">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 sm:h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-cyan-400 transition-all hover:bg-white/25"
                style={{ touchAction: 'manipulation' }}
              />
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-white/50 pt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}

          {/* Quick Track Switcher Strip */}
          <div
            ref={trackStripRef}
            className="px-3.5 sm:px-6 py-2 bg-black/80 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none modal-allow-scroll shrink-0"
            style={{ touchAction: 'pan-x' }}
          >
            <span className="text-[9px] font-mono text-cyan-400/90 font-bold tracking-wider uppercase shrink-0 mr-1 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
              TRACKS:
            </span>
            {tracks.map((t) => {
              const isActive = t.id === activeTrack.id;
              const hasVid = Boolean(t.videoUrl);
              return (
                <button
                  key={t.id}
                  data-track-id={t.id}
                  type="button"
                  onClick={() => onSelectTrack(t)}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-[10.5px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/70 font-bold shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                      : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10'
                  }`}
                  style={{ touchAction: 'manipulation' }}
                >
                  <span className={isActive ? 'text-cyan-400 font-bold' : 'text-white/40'}>#{t.id}</span>
                  <span className="truncate max-w-[95px] xs:max-w-[125px]">{t.title}</span>
                  {hasVid && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />}
                </button>
              );
            })}
          </div>

          {/* Bottom Player Controls HUD */}
          <div className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 bg-[#070b13] border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
            {/* Left: Play/Pause, Prev, Next */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Play / Pause Toggle Button */}
              <button
                type="button"
                onClick={handleTogglePlay}
                className="flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-300 text-black text-xs font-mono font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.4)] min-h-[40px] sm:min-h-[42px]"
                style={{ touchAction: 'manipulation' }}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-black" />
                    <span className="hidden xs:inline">PAUSE</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-black ml-0.5" />
                    <span className="hidden xs:inline">PLAY</span>
                  </>
                )}
              </button>

              {/* Prev Track Quick Button */}
              <button
                type="button"
                aria-label="Previous track"
                onClick={handlePrevTrack}
                className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/70 hover:text-white border border-white/10 transition-colors cursor-pointer min-h-[40px] flex items-center justify-center"
                style={{ touchAction: 'manipulation' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Next Track Quick Button */}
              <button
                type="button"
                aria-label="Next track"
                onClick={handleNextTrack}
                className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/70 hover:text-white border border-white/10 transition-colors cursor-pointer min-h-[40px] flex items-center justify-center"
                style={{ touchAction: 'manipulation' }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Audio Volume / Fullscreen / Stream Tag */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Mute / Unmute Button */}
              <button
                type="button"
                aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                onClick={handleToggleMute}
                className={`p-2 sm:p-2.5 rounded-xl border transition-colors cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
                  isMuted
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                <span className="hidden sm:inline text-[10px] font-mono">
                  {isMuted ? 'MUTED' : isTrack02 ? 'BINGÄA AUDIO' : 'AUDIO ACTIVE'}
                </span>
              </button>

              {/* Fullscreen Button */}
              <button
                type="button"
                aria-label="Toggle fullscreen"
                onClick={handleToggleFullscreen}
                className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/70 hover:text-white border border-white/10 transition-colors cursor-pointer min-h-[40px] flex items-center justify-center"
                style={{ touchAction: 'manipulation' }}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

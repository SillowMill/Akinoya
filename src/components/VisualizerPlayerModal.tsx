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
  EyeOff,
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

export const VisualizerPlayerModal: React.FC<VisualizerPlayerModalProps> = React.memo(({
  isOpen,
  activeTrack,
  tracks,
  onClose,
  onSelectTrack,
}) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const lastTouchTimeRef = useRef<number>(0);
  const trackStripRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentIndex = tracks.findIndex((t) => t.id === activeTrack?.id);
  const totalTracks = tracks.length;
  const isTrack02 = activeTrack?.id === '02';
  const hasVideo = Boolean(activeTrack?.videoUrl);

  // TikTok-Style 2-Second Inactivity Auto-Fade Timer
  const resetControlsTimer = useCallback(() => {
    setControlsVisible(true);
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (isPlaying) {
      inactivityTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 2000);
    }
  }, [isPlaying]);

  // Keep controls visible whenever paused; auto-fade after 2s when playing
  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    } else {
      resetControlsTimer();
    }
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [isPlaying, resetControlsTimer]);

  // True Native Fullscreen Request
  const requestNativeFullscreen = useCallback(() => {
    const target = overlayRef.current || containerRef.current || document.documentElement;
    try {
      if (target.requestFullscreen) {
        target.requestFullscreen().catch(() => {
          document.documentElement.requestFullscreen?.().catch(() => {});
        });
      } else if ((target as any).webkitRequestFullscreen) {
        (target as any).webkitRequestFullscreen();
      } else if ((target as any).webkitRequestFullScreen) {
        (target as any).webkitRequestFullScreen();
      } else if ((target as any).mozRequestFullScreen) {
        (target as any).mozRequestFullScreen();
      } else if ((target as any).msRequestFullscreen) {
        (target as any).msRequestFullscreen();
      } else if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
        // iOS Safari iPhone fallback
        (videoRef.current as any).webkitEnterFullscreen();
      }
    } catch (err) {
      console.warn('Native fullscreen request error:', err);
    }
  }, []);

  // True Native Fullscreen Exit
  const exitNativeFullscreen = useCallback(() => {
    const doc = document as any;
    try {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.webkitCancelFullScreen) {
        doc.webkitCancelFullScreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    } catch (err) {
      console.warn('Native fullscreen exit error:', err);
    }
  }, []);

  // Toggle Fullscreen / Theater mode
  const handleToggleFullscreen = useCallback(() => {
    resetControlsTimer();
    const doc = document as any;
    const isCurrentlyNativeFs = Boolean(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    if (!isFullscreen && !isCurrentlyNativeFs) {
      requestNativeFullscreen();
      setIsFullscreen(true);
    } else {
      exitNativeFullscreen();
      setIsFullscreen(false);
    }
  }, [isFullscreen, requestNativeFullscreen, exitNativeFullscreen, resetControlsTimer]);

  // Synchronize fullscreen state across all standard and vendor-prefixed browser events
  useEffect(() => {
    const onFullscreenChange = () => {
      const doc = document as any;
      const isFs = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);

    const videoEl = videoRef.current;
    const onVideoBeginFs = () => setIsFullscreen(true);
    const onVideoEndFs = () => setIsFullscreen(false);
    if (videoEl) {
      videoEl.addEventListener('webkitbeginfullscreen', onVideoBeginFs);
      videoEl.addEventListener('webkitendfullscreen', onVideoEndFs);
    }

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('mozfullscreenchange', onFullscreenChange);
      document.removeEventListener('MSFullscreenChange', onFullscreenChange);
      if (videoEl) {
        videoEl.removeEventListener('webkitbeginfullscreen', onVideoBeginFs);
        videoEl.removeEventListener('webkitendfullscreen', onVideoEndFs);
      }
    };
  }, [activeTrack?.id]);

  // Close handler with audio, video and fullscreen cleanup
  const handleClose = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    planetSoundtrack.pause();
    exitNativeFullscreen();
    setIsFullscreen(false);
    setControlsVisible(true);
    onClose();
  }, [onClose, exitNativeFullscreen]);

  // Navigate to Previous Track
  const handlePrevTrack = useCallback(() => {
    if (currentIndex === -1 || totalTracks === 0) return;
    const prevIndex = (currentIndex - 1 + totalTracks) % totalTracks;
    onSelectTrack(tracks[prevIndex]);
    resetControlsTimer();
  }, [currentIndex, totalTracks, tracks, onSelectTrack, resetControlsTimer]);

  // Navigate to Next Track
  const handleNextTrack = useCallback(() => {
    if (currentIndex === -1 || totalTracks === 0) return;
    const nextIndex = (currentIndex + 1) % totalTracks;
    onSelectTrack(tracks[nextIndex]);
    resetControlsTimer();
  }, [currentIndex, totalTracks, tracks, onSelectTrack, resetControlsTimer]);

  // Toggle Play / Pause
  const handleTogglePlay = useCallback(() => {
    resetControlsTimer();
    if (isTrack02) {
      const willPlay = !planetSoundtrack.isPlaying;
      if (willPlay) {
        planetSoundtrack.play();
        videoRef.current?.play().catch(() => {});
      } else {
        planetSoundtrack.pause();
        videoRef.current?.pause();
      }
      setIsPlaying(willPlay);
    } else if (videoRef.current && hasVideo) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [isTrack02, hasVideo, resetControlsTimer]);

  // True 'Hide Interface' Mode: Immediately hides all UI elements and cursor (no persistent button)
  const handleHideInterface = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    setControlsVisible(false);
  }, []);

  // Mobile / Tablet Stage Tap: Toggles minimal controls overlay cleanly
  const handleStageTap = useCallback(() => {
    setControlsVisible((prev) => {
      const next = !prev;
      if (next) {
        resetControlsTimer();
      } else {
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
      }
      return next;
    });
  }, [resetControlsTimer]);

  // Desktop Stage Click (Mouse click to play/pause, or restores controls if hidden)
  const handleStageClick = useCallback(() => {
    if (Date.now() - lastTouchTimeRef.current < 500) return;

    if (!controlsVisible) {
      resetControlsTimer();
      return;
    }

    handleTogglePlay();
  }, [controlsVisible, handleTogglePlay, resetControlsTimer]);

  // Mouse move handler: instantly wakes up interface and restores cursor
  const handleMouseMove = useCallback(() => {
    resetControlsTimer();
  }, [resetControlsTimer]);

  // Toggle Mute / Unmute
  const handleToggleMute = useCallback(() => {
    resetControlsTimer();
    if (isTrack02) {
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);
      planetSoundtrack.setVolume(nextMuted ? 0 : 0.65);
    } else if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  }, [isTrack02, isMuted, resetControlsTimer]);

  // Sync Video & Audio when activeTrack changes
  useEffect(() => {
    if (!isOpen || !activeTrack) return;

    setCurrentTime(0);
    setDuration(0);

    const videoEl = videoRef.current;

    if (isTrack02) {
      // Bingäa: Video plays muted in continuous loop, audio handled by planetSoundtrack
      if (videoEl) {
        videoEl.muted = true;
        videoEl.defaultMuted = true;
        videoEl.loop = true;
        videoEl.play().catch(() => {});
      }
      planetSoundtrack.play();
      setIsPlaying(true);
      setIsMuted(false);
    } else if (hasVideo && videoEl) {
      // Don't Need or other video: Unmuted continuous loop, pause planetSoundtrack
      planetSoundtrack.pause();
      videoEl.muted = false;
      videoEl.defaultMuted = false;
      videoEl.loop = true;
      videoEl.volume = 1.0;
      videoEl
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsMuted(false);
        })
        .catch(() => {
          videoEl.muted = true;
          videoEl.play().catch(() => {});
          setIsMuted(true);
        });
    } else {
      planetSoundtrack.pause();
      setIsPlaying(true);
    }

    // Auto-scroll track strip so active pill is centered
    if (trackStripRef.current) {
      const activePill = trackStripRef.current.querySelector<HTMLElement>(`[data-track-id="${activeTrack.id}"]`);
      if (activePill) {
        activePill.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
      }
    }
  }, [isOpen, activeTrack?.id, isTrack02, hasVideo]);

  // Clean up video playback pipeline on component unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

  // Dynamic orientation and viewport resize listener for zero-lag re-alignment
  useEffect(() => {
    const handleOrientationOrResize = () => {
      if (trackStripRef.current && activeTrack) {
        const activePill = trackStripRef.current.querySelector<HTMLElement>(`[data-track-id="${activeTrack.id}"]`);
        if (activePill) {
          activePill.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
        }
      }
    };
    window.addEventListener('resize', handleOrientationOrResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationOrResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleOrientationOrResize);
      window.removeEventListener('orientationchange', handleOrientationOrResize);
    };
  }, [activeTrack?.id]);

  // 100% Page Scroll Lock without heavy touchmove listeners (smooth 60fps on mobile)
  useEffect(() => {
    if (!isOpen) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Keyboard Shortcuts (Escape to close, H to toggle interface, Arrows to switch tracks, Space to play/pause)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!controlsVisible) {
          resetControlsTimer();
        } else if (isFullscreen) {
          handleToggleFullscreen();
        } else {
          handleClose();
        }
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        if (controlsVisible) {
          handleHideInterface();
        } else {
          resetControlsTimer();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevTrack();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextTrack();
      } else if (e.key === ' ') {
        e.preventDefault();
        handleTogglePlay();
      } else {
        resetControlsTimer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [isOpen, isFullscreen, controlsVisible, handleClose, handleToggleFullscreen, handleHideInterface, handlePrevTrack, handleNextTrack, handleTogglePlay, resetControlsTimer]);

  // Touch Handlers: Clean tap-to-toggle overlay & horizontal swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    lastTouchTimeRef.current = Date.now();
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    // Minimum swipe threshold: 45px horizontal
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        handleNextTrack();
      } else {
        handlePrevTrack();
      }
      return;
    }

    // Small movement indicates a clean touch tap -> toggle minimal streaming overlay
    if (Math.abs(deltaX) < 15 && Math.abs(deltaY) < 15) {
      handleStageTap();
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
    resetControlsTimer();
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

  // Cinematic state: when interface is hidden and video is playing, hide cursor completely
  const isCinematicCursorHidden = !controlsVisible && isPlaying;

  return createPortal(
    <AnimatePresence>
      <div
        ref={overlayRef}
        className={`fixed inset-0 z-[999999] select-none ${
          isFullscreen ? 'w-screen h-screen flex flex-col bg-black p-0 m-0' : 'flex items-center justify-center p-2 xs:p-3 sm:p-5'
        }`}
        style={{
          width: '100vw',
          height: '100dvh',
          minHeight: '100dvh',
          backgroundColor: isFullscreen ? '#000000' : 'rgba(5, 7, 12, 0.96)',
          cursor: isCinematicCursorHidden ? 'none' : 'default',
          willChange: 'opacity',
          touchAction: 'manipulation',
        }}
        onClick={handleClose}
        onMouseMove={handleMouseMove}
        onTouchStart={resetControlsTimer}
        onTouchMove={resetControlsTimer}
      >
        {/* Modal Window Card */}
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          onMouseMove={handleMouseMove}
          style={{
            transform: 'translateZ(0)',
            WebkitTransform: 'translateZ(0)',
            willChange: 'transform, opacity',
            touchAction: 'manipulation',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            cursor: isCinematicCursorHidden ? 'none' : 'default',
          }}
          className={`relative flex flex-col overflow-hidden ${
            isFullscreen
              ? 'w-full h-full max-w-none max-h-none mx-0 rounded-none border-0 bg-black'
              : 'w-full max-w-4xl max-h-[96dvh] rounded-2xl sm:rounded-3xl border border-white/12 bg-[#060911] shadow-[0_0_60px_rgba(0,240,255,0.16),0_25px_50px_-12px_rgba(0,0,0,0.9)]'
          }`}
        >
          {/* Top Bar: Title & Close Button (Fades to opacity: 0 after 2s inactivity) */}
          <div
            className={`flex items-center justify-between transition-opacity duration-300 shrink-0 ${
              isFullscreen
                ? 'absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/90 via-black/50 to-transparent border-0 px-4 sm:px-8 py-3'
                : 'px-3.5 sm:px-6 py-2.5 sm:py-3 bg-black/75 border-b border-white/10'
            } ${
              controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Left: Track Status & Title */}
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
                </div>
                <h2 className="text-xs sm:text-base font-display font-bold text-white truncate max-w-[200px] xs:max-w-[260px] sm:max-w-md">
                  {activeTrack.title}
                </h2>
              </div>
            </div>

            {/* Right: Close Button */}
            <div className="flex items-center gap-2 shrink-0">
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
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white/75 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 hover:border-white/25 shadow-lg shrink-0"
                style={{ touchAction: 'manipulation' }}
              >
                <X className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
              </button>
            </div>
          </div>

          {/* Central Visualizer Stage: Zero Overlapping Obstacles on Mobile/Tablet */}
          <div
            onClick={handleStageClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              willChange: 'transform',
              transform: 'translateZ(0)',
              WebkitTransform: 'translateZ(0)',
              touchAction: 'manipulation',
              cursor: isCinematicCursorHidden ? 'none' : 'pointer',
            }}
            className={`relative w-full bg-black flex items-center justify-center overflow-hidden group/stage ${
              isFullscreen
                ? 'flex-1 h-full max-h-none'
                : 'aspect-video max-h-[50vh] sm:max-h-[56vh]'
            }`}
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
                style={{
                  willChange: 'transform',
                  transform: 'translateZ(0)',
                  WebkitTransform: 'translateZ(0)',
                }}
                className={`w-full h-full pointer-events-none transition-all duration-300 ${
                  isFullscreen ? 'object-contain' : 'object-cover object-center'
                }`}
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

            {/* Desktop-Only Floating Side Prev Button (Hidden on mobile/tablet to eliminate video clutter) */}
            <button
              type="button"
              aria-label="Previous track"
              onClick={(e) => {
                e.stopPropagation();
                handlePrevTrack();
              }}
              className={`hidden lg:flex absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 hover:bg-black/90 active:bg-cyan-500/30 text-white/85 hover:text-white border border-white/15 hover:border-cyan-400/60 shadow-[0_4px_24px_rgba(0,0,0,0.7)] items-center justify-center backdrop-blur-md z-30 transition-all duration-300 cursor-pointer ${
                controlsVisible
                  ? 'opacity-85 hover:opacity-100 active:opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              }`}
              style={{
                willChange: 'transform, opacity',
                transform: 'translateZ(0)',
                touchAction: 'manipulation',
              }}
            >
              <ChevronLeft className="w-6 h-6 -ml-0.5 transition-transform group-hover/stage:scale-105" />
            </button>

            {/* Desktop-Only Floating Side Next Button (Hidden on mobile/tablet to eliminate video clutter) */}
            <button
              type="button"
              aria-label="Next track"
              onClick={(e) => {
                e.stopPropagation();
                handleNextTrack();
              }}
              className={`hidden lg:flex absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 hover:bg-black/90 active:bg-cyan-500/30 text-white/85 hover:text-white border border-white/15 hover:border-cyan-400/60 shadow-[0_4px_24px_rgba(0,0,0,0.7)] items-center justify-center backdrop-blur-md z-30 transition-all duration-300 cursor-pointer ${
                controlsVisible
                  ? 'opacity-85 hover:opacity-100 active:opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              }`}
              style={{
                willChange: 'transform, opacity',
                transform: 'translateZ(0)',
                touchAction: 'manipulation',
              }}
            >
              <ChevronRight className="w-6 h-6 -mr-0.5 transition-transform group-hover/stage:scale-105" />
            </button>
          </div>

          {/* Bottom Area: Scrubber, Track Strip & Controls HUD */}
          <div
            className={`transition-opacity duration-300 shrink-0 ${
              isFullscreen
                ? 'absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black via-black/90 to-transparent border-t border-white/10 px-3.5 sm:px-8 pt-3 flex flex-col gap-1.5'
                : 'flex flex-col'
            } ${
              controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Interactive Scrubber Bar */}
            {duration > 0 && (
              <div
                className={`relative w-full px-3.5 sm:px-6 pt-1.5 pb-1 ${
                  isFullscreen ? 'bg-transparent' : 'bg-black/90 border-t border-white/5'
                }`}
              >
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
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-white/50 pt-0.5">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            )}

            {/* Quick Track Switcher Strip */}
            <div
              ref={trackStripRef}
              className={`px-3.5 sm:px-6 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none modal-allow-scroll ${
                isFullscreen
                  ? 'bg-black/60 rounded-xl backdrop-blur-md border border-white/10 my-0.5'
                  : 'bg-black/80 border-t border-white/5'
              }`}
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
                    onClick={() => {
                      onSelectTrack(t);
                      resetControlsTimer();
                    }}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[10.5px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/80 font-bold shadow-[0_0_12px_rgba(0,240,255,0.3)] scale-[1.02]'
                        : 'bg-white/5 hover:bg-white/10 text-white/65 hover:text-white border border-white/10'
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
            <div
              className={`px-3.5 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-3 shrink-0 ${
                isFullscreen
                  ? 'bg-transparent border-0'
                  : 'bg-[#070b13] border-t border-white/10'
              }`}
              style={{
                paddingBottom: isFullscreen
                  ? 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))'
                  : 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))',
              }}
            >
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

              {/* Right: Desktop 'Hide interface' / Audio Mute / Fullscreen */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* Desktop 'Hide interface' Toggle Button */}
                <button
                  type="button"
                  aria-label="Hide interface"
                  title="Hide interface and cursor for pure cinema viewing (or press H)"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHideInterface();
                  }}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/70 hover:text-white border border-white/10 hover:border-cyan-400/40 text-[11px] font-mono transition-colors cursor-pointer min-h-[40px]"
                  style={{ touchAction: 'manipulation' }}
                >
                  <EyeOff className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Hide interface</span>
                </button>

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

                {/* Fullscreen Button with True Native Fullscreen API Integration */}
                <button
                  type="button"
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  onClick={handleToggleFullscreen}
                  className={`p-2 sm:p-2.5 rounded-xl border transition-colors cursor-pointer min-h-[40px] flex items-center justify-center ${
                    isFullscreen
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'
                  }`}
                  style={{ touchAction: 'manipulation' }}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
});

VisualizerPlayerModal.displayName = 'VisualizerPlayerModal';

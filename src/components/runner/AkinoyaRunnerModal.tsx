import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X,
  Grid,
  HelpCircle,
  Lock,
  Gamepad2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { RunnerEngine, type RunnerEvent, type RunnerAssets } from './engine';
import { getLevel, LEVELS, type LevelDef } from './levels';
import {
  loadRunnerProgress,
  recordRunnerResult,
  type RunnerProgress,
} from './runnerMeta';
import rigAtlasUrl from '../../assets/images/runner/mill_rig.png';

export interface AkinoyaRunnerModalProps {
  isOpen: boolean;
  initialLevel?: number;
  onClose: () => void;
}

type ModalView = 'loading' | 'playing' | 'paused' | 'gameover' | 'levelselect';

interface GameOverData {
  score: number;
  orbs: number;
  distance: number;
  isNewHigh: boolean;
  isNewBestDist: boolean;
  newLevelUnlocked: boolean;
}

export const AkinoyaRunnerModal: React.FC<AkinoyaRunnerModalProps> = ({
  isOpen,
  initialLevel = 1,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RunnerEngine | null>(null);
  const insetMeasureRef = useRef<HTMLDivElement>(null);

  const [currentLevelNum, setCurrentLevelNum] = useState<number>(initialLevel);
  const [view, setView] = useState<ModalView>('loading');
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [progress, setProgress] = useState<RunnerProgress>(() => loadRunnerProgress());

  const [gameOverData, setGameOverData] = useState<GameOverData | null>(null);

  // Sync initial level when opening
  useEffect(() => {
    if (isOpen) {
      const validLevel = LEVELS.some((l) => l.level === initialLevel) ? initialLevel : 1;
      setCurrentLevelNum(validLevel);
      setProgress(loadRunnerProgress());
    }
  }, [isOpen, initialLevel]);

  // Detect touch device
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }
  }, []);

  // Safe area reader helper
  const updateInsets = useCallback(() => {
    if (!engineRef.current || !insetMeasureRef.current) return;
    const style = window.getComputedStyle(insetMeasureRef.current);
    const top = parseFloat(style.paddingTop) || 0;
    const right = parseFloat(style.paddingRight) || 0;
    const bottom = parseFloat(style.paddingBottom) || 0;
    const left = parseFloat(style.paddingLeft) || 0;
    engineRef.current.setInsets({ top, right, bottom, left });
  }, []);

  // Event handler from canvas engine
  const handleEngineEvent = useCallback(
    (ev: RunnerEvent) => {
      const currentLevel = currentLevelNum;
      if (ev.type === 'gameover') {
        const res = recordRunnerResult(currentLevel, ev.score, ev.distance, ev.orbs);
        setProgress(res.progress);
        setGameOverData({
          score: ev.score,
          orbs: ev.orbs,
          distance: ev.distance,
          isNewHigh: res.isNewHigh,
          isNewBestDist: res.isNewBestDist,
          newLevelUnlocked: res.unlockedNext,
        });
        setView('gameover');
      } else if (ev.type === 'pause-request') {
        setView('paused');
      }
    },
    [currentLevelNum]
  );

  // Load level assets and start engine
  const startLevel = useCallback(
    (lvlNum: number) => {
      if (!canvasRef.current) return;
      setView('loading');
      setCurrentLevelNum(lvlNum);

      // Clean up previous engine
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }

      const levelDef: LevelDef = getLevel(lvlNum);

      // Preload rig and world art in parallel
      const loadImg = (src: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to load ${src}`));
          img.src = src;
        });

      Promise.all([loadImg(rigAtlasUrl), loadImg(levelDef.worldImage)])
        .then(([rigImg, worldImg]) => {
          if (!canvasRef.current) return;
          const assets: RunnerAssets = {
            rig: rigImg,
            world: worldImg,
          };

          const engine = new RunnerEngine(canvasRef.current, {
            level: levelDef,
            assets,
            onEvent: handleEngineEvent,
          });
          engine.setMuted(isMuted);
          engineRef.current = engine;
          updateInsets();
          engine.start();
          setView('playing');
        })
        .catch((err) => {
          console.error('[AkinoyaRunner] Asset load failed:', err);
          // Fallback with null world image if world image failed
          loadImg(rigAtlasUrl).then((rigImg) => {
            if (!canvasRef.current) return;
            const engine = new RunnerEngine(canvasRef.current, {
              level: levelDef,
              assets: { rig: rigImg, world: null },
              onEvent: handleEngineEvent,
            });
            engine.setMuted(isMuted);
            engineRef.current = engine;
            updateInsets();
            engine.start();
            setView('playing');
          });
        });
    },
    [handleEngineEvent, isMuted, updateInsets]
  );

  // Lifecycle when modal opens/closes or level changes
  useEffect(() => {
    if (!isOpen) {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
      return;
    }

    startLevel(currentLevelNum);

    const onResize = () => {
      if (engineRef.current) {
        engineRef.current.resize();
        updateInsets();
      }
      const fs = Boolean(
        document.fullscreenElement ||
          (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
      );
      setIsFullscreen(fs);
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    document.addEventListener('fullscreenchange', onResize);
    document.addEventListener('webkitfullscreenchange', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      document.removeEventListener('fullscreenchange', onResize);
      document.removeEventListener('webkitfullscreenchange', onResize);
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [isOpen, currentLevelNum, startLevel, updateInsets]);

  // Fullscreen toggle handler
  const toggleFullscreen = async () => {
    const el = containerRef.current || document.documentElement;
    try {
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if ((el as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          await (el as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
          await (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
        }
      }
    } catch {
      // Fullscreen not permitted or cancelled
    }
  };

  // Mute toggle handler
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (engineRef.current) {
      engineRef.current.setMuted(nextMuted);
    }
  };

  // Pause / Resume handlers
  const handlePause = () => {
    if (engineRef.current && view === 'playing') {
      engineRef.current.pause();
      setView('paused');
    }
  };

  const handleResume = () => {
    if (engineRef.current && view === 'paused') {
      engineRef.current.resume();
      setView('playing');
    }
  };

  const handleRetry = () => {
    if (engineRef.current) {
      engineRef.current.restart();
      setView('playing');
    } else {
      startLevel(currentLevelNum);
    }
  };

  const handleSelectLevel = (lvl: number) => {
    if (lvl <= progress.unlocked) {
      startLevel(lvl);
    }
  };

  if (!isOpen) return null;

  const currentLevelDef = getLevel(currentLevelNum);
  const bestScore = progress.best[currentLevelNum] ?? 0;
  const bestDist = progress.bestDistance[currentLevelNum] ?? 0;

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[10000] bg-black select-none overflow-hidden touch-none"
      style={{
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      {/* Hidden safe-area measurement element */}
      <div
        ref={insetMeasureRef}
        aria-hidden="true"
        className="pointer-events-none absolute opacity-0"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
        }}
      />

      {/* Main Game Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-pointer"
        style={{
          imageRendering: 'auto',
          touchAction: 'none',
        }}
      />

      {/* Top Floating Controls Bar */}
      <div
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between pointer-events-none"
        style={{
          paddingTop: 'max(10px, env(safe-area-inset-top, 10px))',
          paddingLeft: 'max(14px, env(safe-area-inset-left, 14px))',
          paddingRight: 'max(14px, env(safe-area-inset-right, 14px))',
        }}
      >
        {/* Game Title Tag */}
        <div className="flex items-center gap-2 pointer-events-auto bg-black/60 backdrop-blur-md border border-cyan-500/30 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(53,240,255,0.2)]">
          <Gamepad2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest text-cyan-300 uppercase">
            Äkinoya // {currentLevelDef.title}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Tutorial / Help */}
          <button
            onClick={() => setShowTutorial(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/80 hover:text-white hover:border-cyan-400 hover:bg-black/80 transition-all active:scale-95"
            title="Controls & Instructions"
            aria-label="Controls"
          >
            <HelpCircle className="w-4 h-4 text-cyan-300" />
          </button>

          {/* Mute */}
          <button
            onClick={toggleMute}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/80 hover:text-white hover:border-cyan-400 hover:bg-black/80 transition-all active:scale-95"
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label="Toggle audio"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/80 hover:text-white hover:border-cyan-400 hover:bg-black/80 transition-all active:scale-95"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Pause (when playing) */}
          {view === 'playing' && (
            <button
              onClick={handlePause}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-cyan-400/50 text-cyan-300 hover:text-white hover:bg-cyan-500/30 transition-all active:scale-95 shadow-[0_0_10px_rgba(53,240,255,0.25)]"
              title="Pause"
              aria-label="Pause game"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/80 hover:text-white hover:border-red-400 hover:bg-red-500/20 transition-all active:scale-95"
            title="Close Runner"
            aria-label="Close runner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Minimalist Touch Assist Buttons (Subtle & Unobtrusive) */}
      {isTouchDevice && view === 'playing' && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none flex justify-between items-end p-4"
          style={{
            paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
            paddingLeft: 'max(16px, env(safe-area-inset-left, 16px))',
            paddingRight: 'max(16px, env(safe-area-inset-right, 16px))',
          }}
        >
          {/* SLIDE BUTTON */}
          <button
            type="button"
            aria-label="Slide"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              engineRef.current?.slideStart(true);
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
              engineRef.current?.slideEnd();
            }}
            onPointerCancel={(e) => {
              e.preventDefault();
              e.stopPropagation();
              engineRef.current?.slideEnd();
            }}
            className="pointer-events-auto w-14 h-14 rounded-full bg-black/25 hover:bg-black/40 backdrop-blur-[2px] border border-white/15 text-white/50 active:bg-amber-500/25 active:border-amber-400 active:text-amber-200 active:scale-90 flex flex-col items-center justify-center transition-all select-none"
          >
            <ChevronDown className="w-5 h-5" />
            <span className="text-[8px] font-mono font-bold tracking-widest leading-none mt-0.5">SLIDE</span>
          </button>

          {/* JUMP BUTTON */}
          <button
            type="button"
            aria-label="Jump"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              engineRef.current?.jump();
            }}
            className="pointer-events-auto w-14 h-14 rounded-full bg-black/25 hover:bg-black/40 backdrop-blur-[2px] border border-white/15 text-white/50 active:bg-cyan-500/25 active:border-cyan-400 active:text-cyan-200 active:scale-90 flex flex-col items-center justify-center transition-all select-none"
          >
            <ChevronUp className="w-5 h-5" />
            <span className="text-[8px] font-mono font-bold tracking-widest leading-none mt-0.5">JUMP</span>
          </button>
        </div>
      )}

      {/* TUTORIAL / INSTRUCTIONS POP-UP */}
      {showTutorial && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-gradient-to-b from-[#10142e] to-[#070918] border border-cyan-500/40 rounded-2xl p-5 shadow-[0_0_35px_rgba(53,240,255,0.25)] font-mono text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center mx-auto mb-3">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">
              PILOT MANUAL
            </h3>
            <p className="text-[10px] text-cyan-400/80 uppercase tracking-widest mb-4">
              ÄKINOYA ENDLESS RUNNER
            </p>
            <div className="space-y-2.5 text-xs text-white/80 text-left mb-5 bg-white/5 p-3.5 rounded-xl border border-white/10">
              <div>
                <span className="text-cyan-300 font-bold block text-[10px] uppercase">JUMP / DOUBLE JUMP</span>
                <span className="text-white/70">Tap screen or press Space / ↑</span>
              </div>
              <div>
                <span className="text-amber-300 font-bold block text-[10px] uppercase">SLIDE / DUCK</span>
                <span className="text-white/70">Swipe down or press ↓</span>
              </div>
              <div>
                <span className="text-pink-300 font-bold block text-[10px] uppercase">ENDLESS OBJECTIVE</span>
                <span className="text-white/70">Survive infinitely, collect orbs & beat your distance record!</span>
              </div>
            </div>
            <button
              onClick={() => setShowTutorial(false)}
              className="w-full py-2.5 bg-cyan-400 hover:bg-cyan-300 text-black font-bold rounded-xl text-xs active:scale-95 transition-all shadow-[0_0_15px_rgba(53,240,255,0.4)]"
            >
              ENGAGE MISSION
            </button>
          </div>
        </div>
      )}

      {/* MODAL OVERLAY: LOADING */}
      {view === 'loading' && (
        <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-lg flex flex-col items-center justify-center p-6 text-center">
          <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <div className="w-12 h-12 rounded-full border border-pink-500/40 animate-pulse" />
            <Gamepad2 className="w-6 h-6 text-cyan-300" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-wider text-white mb-2 font-mono uppercase">
            SYNCING SATELLITE...
          </h2>
          <p className="text-xs sm:text-sm text-cyan-300/80 font-mono tracking-widest">
            LOADING {currentLevelDef.world.toUpperCase()} // TRACK {currentLevelDef.trackId}
          </p>
        </div>
      )}

      {/* MODAL OVERLAY: PAUSED */}
      {view === 'paused' && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#10142e] to-[#070918] border border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(53,240,255,0.2)] text-center animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black tracking-wider font-mono text-white mb-1 uppercase">
              MISSION PAUSED
            </h2>
            <p className="text-xs text-cyan-400/80 font-mono tracking-widest uppercase mb-6">
              {currentLevelDef.title} ({currentLevelDef.world})
            </p>

            <div className="flex flex-col gap-3 font-mono">
              <button
                onClick={handleResume}
                className="w-full py-3 px-4 rounded-xl bg-cyan-500 text-black font-bold tracking-wider hover:bg-cyan-400 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(53,240,255,0.4)]"
              >
                <Play className="w-4 h-4 fill-black" /> RESUME
              </button>

              <button
                onClick={handleRetry}
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 border border-white/20 font-semibold tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> RETRY
              </button>

              <button
                onClick={() => setView('levelselect')}
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 border border-white/20 font-semibold tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Grid className="w-4 h-4" /> SELECT LEVEL
              </button>

              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 font-semibold tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <X className="w-4 h-4" /> EXIT TO HUB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL OVERLAY: GAME OVER (Endless Mode) */}
      {view === 'gameover' && gameOverData && (
        <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#250d18] to-[#0c050a] border border-rose-500/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(244,63,94,0.25)] text-center animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-2xl sm:text-3xl font-black tracking-wider font-mono text-rose-400 mb-1 uppercase drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]">
              RUN TERMINATED
            </h2>
            <p className="text-xs text-rose-300/70 font-mono tracking-widest uppercase mb-5">
              ORBITAL SIGNAL LOST
            </p>

            {/* Unlock Banner if Level 2 was just unlocked */}
            {gameOverData.newLevelUnlocked && (
              <div className="mb-4 py-2 px-3 bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-cyan-500/20 border border-cyan-400/40 rounded-xl">
                <span className="text-[11px] font-mono font-bold tracking-wider text-cyan-200">
                  ★ NEW SECTOR UNLOCKED: FROZEN CORE ★
                </span>
              </div>
            )}

            {/* Stats box */}
            <div className="bg-black/50 border border-rose-500/20 rounded-xl p-4 mb-6 grid grid-cols-2 gap-3 text-left font-mono">
              <div>
                <div className="text-[10px] text-white/50 tracking-wider">DISTANCE</div>
                <div className="text-xl font-bold text-cyan-300">
                  {gameOverData.distance} M
                </div>
                {gameOverData.isNewBestDist && (
                  <span className="text-[9px] text-emerald-400 font-bold tracking-wider">NEW RECORD!</span>
                )}
              </div>
              <div>
                <div className="text-[10px] text-white/50 tracking-wider">FINAL SCORE</div>
                <div className="text-xl font-bold text-white">
                  {String(Math.round(gameOverData.score)).padStart(5, '0')}
                </div>
                {gameOverData.isNewHigh && !gameOverData.isNewBestDist && (
                  <span className="text-[9px] text-emerald-400 font-bold tracking-wider">NEW BEST!</span>
                )}
              </div>
              <div className="col-span-2 pt-1 border-t border-white/10 flex items-center justify-between text-xs text-amber-400">
                <span>ORBS COLLECTED:</span>
                <span className="font-bold">◆ {gameOverData.orbs}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 font-mono">
              <button
                onClick={handleRetry}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold tracking-wider hover:from-cyan-400 hover:to-cyan-300 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(53,240,255,0.4)]"
              >
                <RotateCcw className="w-4 h-4" /> PLAY AGAIN
              </button>

              <button
                onClick={() => setView('levelselect')}
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 border border-white/20 font-semibold tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Grid className="w-4 h-4" /> SELECT LEVEL
              </button>

              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 font-semibold tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" /> EXIT TO HUB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL OVERLAY: LEVEL SELECT */}
      {view === 'levelselect' && (
        <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gradient-to-b from-[#0f142b] to-[#070914] border border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(53,240,255,0.2)] text-center animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black tracking-wider font-mono text-white mb-1 uppercase">
              SELECT SECTOR
            </h2>
            <p className="text-xs text-cyan-400/80 font-mono tracking-widest uppercase mb-6">
              ÄKINOYA ENDLESS RUNNER SECTORS
            </p>

            <div className="flex flex-col gap-3 mb-6">
              {LEVELS.map((lvl) => {
                const isUnlocked = lvl.level <= progress.unlocked;
                const isSelected = lvl.level === currentLevelNum;
                const lvlBestScore = progress.best[lvl.level] ?? 0;
                const lvlBestDist = progress.bestDistance[lvl.level] ?? 0;

                return (
                  <button
                    key={lvl.level}
                    disabled={!isUnlocked}
                    onClick={() => handleSelectLevel(lvl.level)}
                    className={`w-full p-4 rounded-xl border text-left font-mono transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/15 shadow-[0_0_20px_rgba(53,240,255,0.25)]'
                        : isUnlocked
                        ? 'border-white/15 bg-white/5 hover:bg-white/10 hover:border-cyan-400/50'
                        : 'border-white/5 bg-white/[0.02] opacity-45 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base ${
                          isUnlocked ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-white/30'
                        }`}
                      >
                        {isUnlocked ? lvl.level : <Lock className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white tracking-wider uppercase">
                          {lvl.title}
                        </div>
                        <div className="text-[11px] text-white/50">{lvl.world}</div>
                        {isUnlocked && (lvlBestDist > 0 || lvlBestScore > 0) && (
                          <div className="text-[10px] text-cyan-400 mt-0.5">
                            BEST: {lvlBestDist}M · {String(lvlBestScore).padStart(5, '0')} PTS
                          </div>
                        )}
                        {!isUnlocked && (
                          <div className="text-[10px] text-amber-400 mt-0.5">
                            SURVIVE 400M IN SECTOR 1 TO UNLOCK
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 font-mono">
              <button
                onClick={() => setView('playing')}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 border border-white/20 font-semibold tracking-wider active:scale-95 transition-all"
              >
                CANCEL
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 font-semibold tracking-wider active:scale-95 transition-all"
              >
                EXIT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
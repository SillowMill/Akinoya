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
  ArrowRight,
  Trophy,
  Star,
  Lock,
  Gamepad2,
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

type ModalView = 'loading' | 'playing' | 'paused' | 'gameover' | 'victory' | 'levelselect';

interface VictoryData {
  score: number;
  orbs: number;
  orbsTotal: number;
  stars: number;
  livesLeft: number;
  isNewHigh: boolean;
  newLevelUnlocked: boolean;
}

interface GameOverData {
  score: number;
  orbs: number;
  progress: number;
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
  const [progress, setProgress] = useState<RunnerProgress>(() => loadRunnerProgress());

  const [victoryData, setVictoryData] = useState<VictoryData | null>(null);
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
      if (ev.type === 'complete') {
        const prevUnlocked = progress.unlocked;
        const prevBest = progress.best[currentLevel] ?? 0;
        const nextProg = recordRunnerResult(currentLevel, ev.score, ev.stars, true);
        setProgress(nextProg);
        setVictoryData({
          score: ev.score,
          orbs: ev.orbs,
          orbsTotal: ev.orbsTotal,
          stars: ev.stars,
          livesLeft: ev.livesLeft,
          isNewHigh: ev.score > prevBest,
          newLevelUnlocked: nextProg.unlocked > prevUnlocked,
        });
        setView('victory');
      } else if (ev.type === 'gameover') {
        const prevBest = progress.best[currentLevel] ?? 0;
        if (ev.score > prevBest) {
          const nextProg = recordRunnerResult(currentLevel, ev.score, 0, false);
          setProgress(nextProg);
        }
        setGameOverData({
          score: ev.score,
          orbs: ev.orbs,
          progress: ev.progress,
        });
        setView('gameover');
      } else if (ev.type === 'pause-request') {
        setView('paused');
      }
    },
    [currentLevelNum, progress]
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

  const handleNextLevel = () => {
    const nextNum = currentLevelNum + 1;
    if (LEVELS.some((l) => l.level === nextNum)) {
      startLevel(nextNum);
    }
  };

  const handleSelectLevel = (lvl: number) => {
    if (lvl <= progress.unlocked) {
      startLevel(lvl);
    }
  };

  if (!isOpen) return null;

  const currentLevelDef = getLevel(currentLevelNum);
  const hasNextLevel = LEVELS.some((l) => l.level === currentLevelNum + 1);

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
            Äkinoya Runner // L{currentLevelNum}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
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

      {/* Touch Assist Overlay Buttons (Mobile / Tablet only) */}
      {isTouchDevice && view === 'playing' && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none flex justify-between items-end p-4"
          style={{
            paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
            paddingLeft: 'max(18px, env(safe-area-inset-left, 18px))',
            paddingRight: 'max(18px, env(safe-area-inset-right, 18px))',
          }}
        >
          {/* SLIDE BUTTON */}
          <button
            type="button"
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
            className="pointer-events-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-black/60 backdrop-blur-md border border-amber-400/40 text-amber-300 active:bg-amber-400/40 active:scale-95 flex flex-col items-center justify-center gap-1 shadow-[0_0_20px_rgba(251,191,36,0.18)]"
          >
            <span className="text-[10px] font-mono font-bold tracking-widest text-amber-200">SLIDE</span>
            <span className="text-xs">▼</span>
          </button>

          {/* JUMP BUTTON */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              engineRef.current?.jump();
            }}
            className="pointer-events-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-black/60 backdrop-blur-md border border-cyan-400/50 text-cyan-300 active:bg-cyan-400/40 active:scale-95 flex flex-col items-center justify-center gap-1 shadow-[0_0_20px_rgba(53,240,255,0.25)]"
          >
            <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-200">JUMP</span>
            <span className="text-xs">▲</span>
          </button>
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
              LVL {currentLevelNum} · {currentLevelDef.title} ({currentLevelDef.world})
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

      {/* MODAL OVERLAY: GAME OVER */}
      {view === 'gameover' && gameOverData && (
        <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#250d18] to-[#0c050a] border border-rose-500/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(244,63,94,0.25)] text-center animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-2xl sm:text-3xl font-black tracking-wider font-mono text-rose-400 mb-1 uppercase drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]">
              CRITICAL FAILURE
            </h2>
            <p className="text-xs text-rose-300/70 font-mono tracking-widest uppercase mb-6">
              ORBITAL SYNC LOST · REACHED {Math.round(gameOverData.progress * 100)}%
            </p>

            {/* Stats box */}
            <div className="bg-black/50 border border-rose-500/20 rounded-xl p-4 mb-6 grid grid-cols-2 gap-3 text-left font-mono">
              <div>
                <div className="text-[10px] text-white/50 tracking-wider">SCORE</div>
                <div className="text-lg font-bold text-white">
                  {String(Math.round(gameOverData.score)).padStart(5, '0')}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/50 tracking-wider">ORBS COLLECTED</div>
                <div className="text-lg font-bold text-amber-400">◆ {gameOverData.orbs}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 font-mono">
              <button
                onClick={handleRetry}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white font-bold tracking-wider hover:from-rose-500 hover:to-rose-400 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.4)]"
              >
                <RotateCcw className="w-4 h-4" /> TRY AGAIN
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
                <X className="w-4 h-4" /> EXIT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL OVERLAY: VICTORY */}
      {view === 'victory' && victoryData && (
        <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#0e1f38] to-[#070b1a] border border-cyan-400/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(53,240,255,0.3)] text-center animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-2xl sm:text-3xl font-black tracking-wider font-mono text-cyan-300 mb-1 uppercase drop-shadow-[0_0_15px_rgba(53,240,255,0.6)]">
              LEVEL COMPLETE!
            </h2>
            <p className="text-xs text-cyan-400/80 font-mono tracking-widest uppercase mb-4">
              {currentLevelDef.title} CONQUERED
            </p>

            {/* Stars */}
            <div className="flex justify-center items-center gap-3 mb-5">
              {[1, 2, 3].map((starIdx) => (
                <div
                  key={starIdx}
                  className={`transition-all transform ${
                    starIdx <= victoryData.stars
                      ? 'text-amber-400 scale-110 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]'
                      : 'text-white/20 scale-90'
                  }`}
                >
                  <Star className={`w-8 h-8 ${starIdx <= victoryData.stars ? 'fill-amber-400' : ''}`} />
                </div>
              ))}
            </div>

            {/* Unlock Banner if Level 2 was just unlocked */}
            {victoryData.newLevelUnlocked && (
              <div className="mb-4 py-2 px-3 bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-cyan-500/20 border border-cyan-400/40 rounded-xl">
                <span className="text-[11px] font-mono font-bold tracking-wider text-cyan-200">
                  ★ NEW LEVEL UNLOCKED: LEVEL 2 ★
                </span>
              </div>
            )}

            {/* Stats box */}
            <div className="bg-black/50 border border-cyan-500/20 rounded-xl p-4 mb-6 grid grid-cols-2 gap-3 text-left font-mono">
              <div>
                <div className="text-[10px] text-white/50 tracking-wider">FINAL SCORE</div>
                <div className="text-lg font-bold text-white">
                  {String(Math.round(victoryData.score)).padStart(5, '0')}
                </div>
                {victoryData.isNewHigh && (
                  <span className="text-[9px] text-emerald-400 font-bold tracking-wider">NEW RECORD!</span>
                )}
              </div>
              <div>
                <div className="text-[10px] text-white/50 tracking-wider">ORBS COLLECTED</div>
                <div className="text-lg font-bold text-cyan-400">
                  ◆ {victoryData.orbs} / {victoryData.orbsTotal}
                </div>
                <span className="text-[9px] text-white/40 tracking-wider">
                  {victoryData.livesLeft} {victoryData.livesLeft === 1 ? 'LIFE' : 'LIVES'} REMAINING
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 font-mono">
              {hasNextLevel && (
                <button
                  onClick={handleNextLevel}
                  className="w-full py-3 px-4 rounded-xl bg-cyan-400 text-black font-bold tracking-wider hover:bg-cyan-300 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(53,240,255,0.5)]"
                >
                  NEXT LEVEL <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={handleRetry}
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 border border-white/20 font-semibold tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> REPLAY LEVEL
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
              SELECT LEVEL
            </h2>
            <p className="text-xs text-cyan-400/80 font-mono tracking-widest uppercase mb-6">
              ÄKINOYA SECTOR MISSIONS
            </p>

            <div className="flex flex-col gap-3 mb-6">
              {LEVELS.map((lvl) => {
                const isUnlocked = lvl.level <= progress.unlocked;
                const isSelected = lvl.level === currentLevelNum;
                const bestScore = progress.best[lvl.level] ?? 0;
                const starsCount = progress.stars[lvl.level] ?? 0;

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
                        {isUnlocked && bestScore > 0 && (
                          <div className="text-[10px] text-cyan-400 mt-0.5">
                            BEST: {String(bestScore).padStart(5, '0')}
                          </div>
                        )}
                      </div>
                    </div>

                    {isUnlocked && (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= starsCount
                                ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                                : 'text-white/15'
                            }`}
                          />
                        ))}
                      </div>
                    )}
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
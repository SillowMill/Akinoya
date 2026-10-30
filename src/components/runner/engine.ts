/**
 * Äkinoya Runner — lightweight HTML5 Canvas 2D engine.
 *
 *  - Zero dependencies (no PixiJS/Phaser payload): everything is drawn with the Canvas 2D API,
 *    static art is pre-rendered once into offscreen strips so a frame is ~15 drawImage calls.
 *  - Articulated "puppet" animation of the real Mill character (head / torso / arms / legs cut
 *    from MilLLL.PNG) with run cycle, jump, double-jump flip and slide.
 *  - Multi-layer parallax built from the actual SillowMill.com world art + procedural silhouettes.
 *  - Logical resolution scales to any viewport / orientation (see `layout()`).
 *  - Music is the level's official track; the level length is derived from the track length so
 *    picture and audio stay in sync.
 */
import type { LevelDef, LevelPalette } from './levels';
import { RIG_PARTS, RIG_ORDER, RIG_SOURCE, type RigPartName } from './millRig';
import { planetSoundtrack } from '../../utils/soundtrack';

/* ------------------------------------------------------------------------------------------ */
/* Public types                                                                                */
/* ------------------------------------------------------------------------------------------ */

export type RunnerState = 'ready' | 'playing' | 'paused' | 'complete' | 'gameover';

export type RunnerEvent =
  | { type: 'complete'; score: number; orbs: number; orbsTotal: number; stars: number; livesLeft: number }
  | { type: 'gameover'; score: number; orbs: number; progress: number }
  | { type: 'pause-request' };

export interface RunnerAssets {
  rig: HTMLImageElement;
  world: HTMLImageElement | null;
}

export interface RunnerOptions {
  level: LevelDef;
  assets: RunnerAssets;
  onEvent: (event: RunnerEvent) => void;
  reducedMotion?: boolean;
  /** Cap for devicePixelRatio (lower on weak devices / in-app browsers). */
  maxDpr?: number;
  /** DEV-only: freeze the character in a pose for visual verification. */
  debugPose?: 'run' | 'jump' | 'double' | 'slide' | null;
}

/* ------------------------------------------------------------------------------------------ */
/* Tunables (logical units, 1 unit ≈ 1 CSS px at a 360-high view)                              */
/* ------------------------------------------------------------------------------------------ */

const CHAR_H = 108;
const GRAVITY = 2300;
const JUMP_V = 800;
const DOUBLE_JUMP_V = 720;
const FAST_FALL_V = 950;
const COYOTE_TIME = 0.09;
const JUMP_BUFFER = 0.13;
const SLIDE_MIN = 0.32;
const SLIDE_TOUCH = 0.62;
const SLIDE_MAX = 1.15;
const INVULN_TIME = 1.5;
const START_LIVES = 3;
const MAX_PARTICLES = 56;

const STAND_W = 30;
const STAND_H = 90;
const SLIDE_W = 56;
const SLIDE_H = 36;

const DRONE_BOTTOM = 54;
const DRONE_TOP = 148;

/* ------------------------------------------------------------------------------------------ */
/* Helpers                                                                                     */
/* ------------------------------------------------------------------------------------------ */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/* ------------------------------------------------------------------------------------------ */
/* Level audio (official track, synchronised with the level clock)                             */
/* ------------------------------------------------------------------------------------------ */

interface LevelAudio {
  play(): void;
  pause(): void;
  seek(t: number): void;
  setMuted(muted: boolean): void;
  readonly time: number;
  readonly duration: number;
  readonly playing: boolean;
  dispose(): void;
}

function createLevelAudio(level: LevelDef): LevelAudio {
  if (level.audio === 'planet') {
    let muted = false;
    return {
      play() {
        planetSoundtrack.setVolume(muted ? 0 : 0.65);
        void planetSoundtrack.play();
      },
      pause() {
        planetSoundtrack.pause();
      },
      seek(t: number) {
        planetSoundtrack.seek(t);
      },
      setMuted(m: boolean) {
        muted = m;
        planetSoundtrack.setVolume(m ? 0 : 0.65);
      },
      get time() {
        return planetSoundtrack.currentTime;
      },
      get duration() {
        const d = planetSoundtrack.duration;
        return Number.isFinite(d) && d > 1 ? d : 0;
      },
      get playing() {
        return planetSoundtrack.isPlaying;
      },
      dispose() {
        planetSoundtrack.pause();
        planetSoundtrack.setVolume(0.65);
      },
    };
  }

  const audio = new Audio(level.audio.url);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 1;
  return {
    play() {
      void audio.play().catch(() => {});
    },
    pause() {
      audio.pause();
    },
    seek(t: number) {
      if (Number.isFinite(t)) audio.currentTime = Math.max(0, t);
    },
    setMuted(m: boolean) {
      audio.muted = m;
    },
    get time() {
      return audio.currentTime;
    },
    get duration() {
      return Number.isFinite(audio.duration) && audio.duration > 1 ? audio.duration : 0;
    },
    get playing() {
      return !audio.paused;
    },
    dispose() {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    },
  };
}

/* ------------------------------------------------------------------------------------------ */
/* World entities                                                                              */
/* ------------------------------------------------------------------------------------------ */

type ObstacleKind = 'spike' | 'barrier' | 'drone';

interface Obstacle {
  kind: ObstacleKind;
  x: number; // world x (centre)
  w: number;
  h: number;
  bottom: number; // height above ground of the lowest point
  variant: number;
}

interface Orb {
  x: number;
  y: number; // height above ground
  taken: boolean;
  phase: number;
}

interface Particle {
  active: boolean;
  x: number; // world-ish screen x (logical)
  y: number; // logical screen y
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface PartPose {
  rot: number;
  dx: number;
  dy: number;
  sy: number;
}

interface Pose {
  bodyRot: number;
  dx: number;
  dy: number;
  sx: number;
  sy: number;
  parts: Record<RigPartName, PartPose>;
}

const makePartPose = (): PartPose => ({ rot: 0, dx: 0, dy: 0, sy: 1 });
const makePose = (): Pose => ({
  bodyRot: 0,
  dx: 0,
  dy: 0,
  sx: 1,
  sy: 1,
  parts: {
    legL: makePartPose(),
    armL: makePartPose(),
    torso: makePartPose(),
    head: makePartPose(),
    legR: makePartPose(),
    armR: makePartPose(),
  },
});

/* ------------------------------------------------------------------------------------------ */
/* Engine                                                                                      */
/* ------------------------------------------------------------------------------------------ */

export class RunnerEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly level: LevelDef;
  private readonly palette: LevelPalette;
  private readonly assets: RunnerAssets;
  private readonly onEvent: (event: RunnerEvent) => void;
  private readonly reducedMotion: boolean;
  private readonly maxDpr: number;
  private readonly debugPose: RunnerOptions['debugPose'];
  private audio: LevelAudio;

  private state: RunnerState = 'ready';
  private raf = 0;
  private lastTs = 0;
  private dirty = true;
  private destroyed = false;
  private muted = false;

  // view (logical units)
  private dpr = 1;
  private cssW = 640;
  private cssH = 360;
  private W = 640;
  private H = 360;
  private scale = 1;
  private groundY = 280;
  private playerX = 140;
  private portrait = false;
  private layersKey = '';

  // cached layers
  private skyGradient: CanvasGradient | null = null;
  private groundGradient: CanvasGradient | null = null;
  private veilGradient: CanvasGradient | null = null;
  private fogGradient: CanvasGradient | null = null;
  private vignetteGradient: CanvasGradient | null = null;
  private farStrip: HTMLCanvasElement | null = null;
  private midStrip: HTMLCanvasElement | null = null;
  private nearStrip: HTMLCanvasElement | null = null;
  private starsStrip: HTMLCanvasElement | null = null;
  private glowSprite: HTMLCanvasElement | null = null;
  private orbSprite: HTMLCanvasElement | null = null;
  private stripW = 960;
  private stripPx = 1;

  // simulation
  private rng: () => number = mulberry32(1);
  private t = 0;
  private distance = 0;
  private finishX = 0;
  private totalSec = 40;
  private score = 0;
  private orbsCollected = 0;
  private orbsSpawned = 0;
  private lives = START_LIVES;
  private invuln = 0;
  private shake = 0;
  private finishing = false;
  private speedMul = 1;
  private nextSpawn = 0;
  private obstacles: Obstacle[] = [];
  private orbList: Orb[] = [];
  private particles: Particle[] = [];
  private runPhase = 0;
  private dustTimer = 0;
  private hintTimer = 0;
  private inputKind: 'touch' | 'keyboard' = 'keyboard';
  private insets = { top: 0, right: 0, bottom: 0, left: 0 };

  private player = {
    y: 0,
    vy: 0,
    onGround: true,
    jumpsLeft: 2,
    coyote: 0,
    jumpBuffer: 0,
    sliding: false,
    slideT: 0,
    slideHold: false,
    slideKey: false,
    slideQueued: false,
    flipT: 0,
    land: 0,
    ascend: false,
  };
  private pose: Pose = makePose();
  private target: Pose = makePose();

  // pointer gesture
  private gesture: { id: number; x: number; y: number; swiped: boolean } | null = null;

  private readonly cleanup: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement, opts: RunnerOptions) {
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.canvas = canvas;
    this.ctx = ctx;
    this.level = opts.level;
    this.palette = opts.level.palette;
    this.assets = opts.assets;
    this.onEvent = opts.onEvent;
    this.reducedMotion = Boolean(opts.reducedMotion);
    this.maxDpr = opts.maxDpr ?? 2;
    this.debugPose = opts.debugPose ?? null;
    this.audio = createLevelAudio(opts.level);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff' });
    }

    this.bindInput();
    this.resize();
    this.reset();
    this.raf = requestAnimationFrame(this.frame);
  }

  /* -------------------------------- lifecycle -------------------------------- */

  start(): void {
    if (this.destroyed) return;
    this.reset();
    this.state = 'playing';
    this.lastTs = 0;
    this.audio.seek(0);
    this.audio.setMuted(this.muted);
    this.audio.play();
  }

  restart(): void {
    this.start();
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.audio.pause();
    this.releaseSlide();
    this.dirty = true;
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.lastTs = 0;
    this.resyncAudio();
    this.audio.play();
  }

  getState(): RunnerState {
    return this.state;
  }

  /** CSS-px safe-area insets (notch / home indicator) so the canvas HUD never hides behind device chrome. */
  setInsets(insets: { top: number; right: number; bottom: number; left: number }): void {
    this.insets = insets;
    this.dirty = true;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.audio.setMuted(muted);
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.cleanup.forEach((fn) => fn());
    this.cleanup.length = 0;
    this.audio.dispose();
  }

  /* -------------------------------- input -------------------------------- */

  jump(): void {
    if (this.state !== 'playing' || this.finishing) return;
    const p = this.player;
    p.sliding = false;
    p.slideQueued = false;
    if (p.onGround || p.coyote > 0) {
      p.vy = JUMP_V;
      p.onGround = false;
      p.jumpsLeft = 1;
      p.coyote = 0;
      p.ascend = true;
      this.burst(this.playerX, this.groundY, 7, this.palette.accent, 90);
    } else if (p.jumpsLeft > 0) {
      p.vy = DOUBLE_JUMP_V;
      p.jumpsLeft -= 1;
      p.flipT = 0.0001;
      p.ascend = true;
      this.burst(this.playerX, this.groundY - p.y, 9, this.palette.accent2, 120);
    } else {
      p.jumpBuffer = JUMP_BUFFER;
    }
  }

  slideStart(hold = false): void {
    if (this.state !== 'playing' || this.finishing) return;
    const p = this.player;
    p.slideHold = hold;
    p.slideKey = hold;
    if (p.onGround) {
      if (!p.sliding) {
        p.sliding = true;
        p.slideT = 0;
        this.burst(this.playerX - 6, this.groundY, 6, this.palette.accent, 70);
      }
    } else {
      p.vy = Math.min(p.vy, -FAST_FALL_V);
      p.slideQueued = true;
    }
  }

  slideEnd(): void {
    this.player.slideHold = false;
  }

  private releaseSlide(): void {
    this.player.slideHold = false;
  }

  private bindInput(): void {
    const canvas = this.canvas;

    const onPointerDown = (e: PointerEvent) => {
      this.inputKind = e.pointerType === 'mouse' ? 'keyboard' : 'touch';
      if (this.gesture) return;
      this.gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, swiped: false };
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      this.jump(); // zero-lag: jump on touch-down
    };
    const onPointerMove = (e: PointerEvent) => {
      const g = this.gesture;
      if (!g || g.id !== e.pointerId || g.swiped) return;
      const dy = e.clientY - g.y;
      const dx = e.clientX - g.x;
      if (dy > 22 && dy > Math.abs(dx) * 0.8) {
        g.swiped = true;
        this.slideStart(false);
      }
    };
    const endGesture = (e: PointerEvent) => {
      if (this.gesture && this.gesture.id === e.pointerId) this.gesture = null;
    };
    const onContext = (e: Event) => e.preventDefault();

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', endGesture);
    canvas.addEventListener('pointercancel', endGesture);
    canvas.addEventListener('contextmenu', onContext);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) {
        if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
        return;
      }
      switch (e.code) {
        case 'Space':
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault();
          this.inputKind = 'keyboard';
          this.jump();
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          this.inputKind = 'keyboard';
          this.slideStart(true);
          break;
        case 'Escape':
        case 'KeyP':
          e.preventDefault();
          this.onEvent({ type: 'pause-request' });
          break;
        default:
          break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') this.slideEnd();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onVisibility = () => {
      if (document.hidden && this.state === 'playing') this.onEvent({ type: 'pause-request' });
    };
    document.addEventListener('visibilitychange', onVisibility);
    const onBlur = () => {
      if (this.state === 'playing') this.onEvent({ type: 'pause-request' });
    };
    window.addEventListener('blur', onBlur);

    const onResize = () => this.resize();
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
    const vv = window.visualViewport;
    vv?.addEventListener('resize', onResize);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
      ro = new ResizeObserver(onResize);
      ro.observe(canvas.parentElement);
    }

    this.cleanup.push(() => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endGesture);
      canvas.removeEventListener('pointercancel', endGesture);
      canvas.removeEventListener('contextmenu', onContext);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      vv?.removeEventListener('resize', onResize);
      ro?.disconnect();
    });
  }

  /* -------------------------------- layout -------------------------------- */

  /** Fits the logical playfield to any viewport (portrait / landscape, phone / tablet / desktop). */
  resize(): void {
    const parent = this.canvas.parentElement;
    const cssW = Math.max(1, parent?.clientWidth || window.innerWidth);
    const cssH = Math.max(1, parent?.clientHeight || window.innerHeight);
    const dpr = Math.min(this.maxDpr, window.devicePixelRatio || 1);

    const pxW = Math.round(cssW * dpr);
    const pxH = Math.round(cssH * dpr);
    if (this.canvas.width !== pxW || this.canvas.height !== pxH) {
      this.canvas.width = pxW;
      this.canvas.height = pxH;
    }
    this.cssW = cssW;
    this.cssH = cssH;
    this.dpr = dpr;

    const aspect = cssW / cssH;
    this.portrait = aspect < 1.25;
    if (!this.portrait) {
      this.H = 360;
      this.W = this.H * aspect;
    } else {
      this.W = 440;
      this.H = Math.max(360, this.W / aspect);
    }
    this.scale = cssW / this.W;
    this.groundY = this.portrait ? this.H * 0.7 : this.H * 0.78;
    this.playerX = this.W * (this.portrait ? 0.24 : 0.22);

    this.rebuildLayers();
    this.dirty = true;
  }

  private rebuildLayers(): void {
    const key = `${Math.round(this.W)}x${Math.round(this.H)}@${this.dpr.toFixed(2)}:${Math.round(this.groundY)}`;
    if (key === this.layersKey) return;
    this.layersKey = key;

    const ctx = this.ctx;
    const pal = this.palette;
    const sky = ctx.createLinearGradient(0, 0, 0, this.groundY);
    sky.addColorStop(0, pal.skyTop);
    sky.addColorStop(1, pal.skyBottom);
    this.skyGradient = sky;
    const ground = ctx.createLinearGradient(0, this.groundY, 0, this.H);
    ground.addColorStop(0, pal.ground);
    ground.addColorStop(1, '#03030c');
    this.groundGradient = ground;
    const veil = ctx.createLinearGradient(0, 0, 0, this.groundY);
    veil.addColorStop(0, 'rgba(4,5,22,0.50)');
    veil.addColorStop(1, 'rgba(8,6,30,0.18)');
    this.veilGradient = veil;
    const fog = ctx.createLinearGradient(0, this.groundY - 70, 0, this.groundY);
    fog.addColorStop(0, 'rgba(0,0,0,0)');
    fog.addColorStop(1, pal.fog);
    this.fogGradient = fog;
    const vg = ctx.createRadialGradient(this.W / 2, this.H / 2, this.H * 0.45, this.W / 2, this.H / 2, Math.max(this.W, this.H) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,10,0.42)');
    this.vignetteGradient = vg;

    this.stripPx = Math.min(1.25, this.scale * this.dpr);
    this.stripW = 960;
    this.starsStrip = this.buildStars();
    this.farStrip = this.buildRidge(pal.silhouetteFar, 210, 0.9, pal.accent2);
    this.midStrip = this.level.level === 1
      ? this.buildMushrooms(pal.silhouetteMid, 250)
      : this.buildSpires(pal.silhouetteMid, 230, 11);
    this.nearStrip = this.buildSpires(pal.silhouetteNear, 150, 29, true);
    this.glowSprite = this.buildGlow(pal.accent);
    this.orbSprite = this.buildOrb(pal.accent);
  }

  private makeStrip(heightUnits: number): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } {
    const c = document.createElement('canvas');
    c.width = Math.ceil(this.stripW * this.stripPx);
    c.height = Math.ceil(heightUnits * this.stripPx);
    const g = c.getContext('2d')!;
    g.scale(this.stripPx, this.stripPx);
    return { c, g };
  }

  private buildStars(): HTMLCanvasElement {
    const h = Math.max(120, this.groundY);
    const { c, g } = this.makeStrip(h);
    const r = mulberry32(this.level.seed ^ 0x51ed);
    for (let i = 0; i < 90; i++) {
      const a = 0.25 + r() * 0.6;
      g.fillStyle = `rgba(255,255,255,${a})`;
      const s = r() < 0.12 ? 1.8 : 1;
      g.fillRect(r() * this.stripW, r() * h * 0.8, s, s);
    }
    return c;
  }

  private buildRidge(color: string, height: number, amp: number, rim: string): HTMLCanvasElement {
    const { c, g } = this.makeStrip(height);
    const r = mulberry32(this.level.seed ^ 0x77);
    const p1 = r() * 6;
    const p2 = r() * 6;
    const p3 = r() * 6;
    g.beginPath();
    g.moveTo(0, height);
    for (let x = 0; x <= this.stripW; x += 8) {
      const u = (x / this.stripW) * Math.PI * 2;
      const y = height * 0.52 - amp * (34 * Math.sin(u * 3 + p1) + 22 * Math.sin(u * 7 + p2) + 11 * Math.sin(u * 13 + p3));
      g.lineTo(x, y);
    }
    g.lineTo(this.stripW, height);
    g.closePath();
    g.fillStyle = color;
    g.fill();
    g.strokeStyle = hexToRgba(rim, 0.22);
    g.lineWidth = 1.5;
    g.stroke();
    return c;
  }

  private buildMushrooms(color: string, height: number): HTMLCanvasElement {
    const { c, g } = this.makeStrip(height);
    const r = mulberry32(this.level.seed ^ 0x3a);
    const glow = this.palette.accent2;
    const count = 9;
    for (let i = 0; i < count; i++) {
      const baseX = ((i + 0.5) / count) * this.stripW + (r() - 0.5) * 40;
      const mh = 110 + r() * 110;
      const capW = 52 + r() * 44;
      const stemW = capW * 0.2;
      for (const off of [-this.stripW, 0, this.stripW]) {
        const x = baseX + off;
        if (x < -capW || x > this.stripW + capW) continue;
        const topY = height - mh;
        g.fillStyle = color;
        g.beginPath();
        g.moveTo(x - stemW, height);
        g.quadraticCurveTo(x - stemW * 0.5, height - mh * 0.55, x - stemW * 0.7, topY + 10);
        g.lineTo(x + stemW * 0.7, topY + 10);
        g.quadraticCurveTo(x + stemW * 0.5, height - mh * 0.55, x + stemW, height);
        g.closePath();
        g.fill();
        g.beginPath();
        g.ellipse(x, topY + 8, capW, capW * 0.42, 0, Math.PI, 0);
        g.quadraticCurveTo(x, topY + 22, x - capW, topY + 8);
        g.closePath();
        g.fill();
        g.strokeStyle = hexToRgba(glow, 0.5);
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x - capW * 0.92, topY + 12);
        g.quadraticCurveTo(x, topY + 30, x + capW * 0.92, topY + 12);
        g.stroke();
      }
    }
    g.fillStyle = color;
    g.fillRect(0, height - 14, this.stripW, 14);
    return c;
  }

  private buildSpires(color: string, height: number, salt: number, jagged = false): HTMLCanvasElement {
    const { c, g } = this.makeStrip(height);
    const r = mulberry32(this.level.seed ^ (0x9e + salt));
    const count = jagged ? 26 : 14;
    const accent = this.palette.accent;
    g.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const baseX = (i / count) * this.stripW + r() * 30;
      const w = (jagged ? 26 : 38) + r() * 34;
      const h = (jagged ? 40 : 70) + r() * (jagged ? 90 : 150);
      for (const off of [-this.stripW, 0, this.stripW]) {
        const x = baseX + off;
        if (x < -w || x > this.stripW + w) continue;
        g.beginPath();
        g.moveTo(x - w * 0.5, height);
        g.lineTo(x - w * 0.12, height - h * 0.82);
        g.lineTo(x + (r() - 0.5) * 6, height - h);
        g.lineTo(x + w * 0.16, height - h * 0.7);
        g.lineTo(x + w * 0.5, height);
        g.closePath();
        g.fill();
        g.strokeStyle = hexToRgba(accent, jagged ? 0.28 : 0.4);
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(x - w * 0.12, height - h * 0.82);
        g.lineTo(x + (r() - 0.5) * 6, height - h);
        g.lineTo(x + w * 0.16, height - h * 0.7);
        g.stroke();
      }
    }
    g.fillStyle = color;
    g.fillRect(0, height - 10, this.stripW, 10);
    return c;
  }

  private buildGlow(color: string): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, hexToRgba(color, 0.55));
    grad.addColorStop(0.45, hexToRgba(color, 0.16));
    grad.addColorStop(1, hexToRgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return c;
  }

  private buildOrb(color: string): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const halo = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    halo.addColorStop(0, hexToRgba(color, 0.65));
    halo.addColorStop(1, hexToRgba(color, 0));
    g.fillStyle = halo;
    g.fillRect(0, 0, 64, 64);
    const core = g.createRadialGradient(28, 27, 1, 32, 32, 11);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.5, color);
    core.addColorStop(1, hexToRgba(color, 0.85));
    g.fillStyle = core;
    g.beginPath();
    g.arc(32, 32, 10, 0, Math.PI * 2);
    g.fill();
    return c;
  }

  /* -------------------------------- simulation -------------------------------- */

  private reset(): void {
    this.rng = mulberry32(this.level.seed);
    this.t = 0;
    this.distance = 0;
    this.score = 0;
    this.orbsCollected = 0;
    this.orbsSpawned = 0;
    this.lives = START_LIVES;
    this.invuln = 0;
    this.shake = 0;
    this.finishing = false;
    this.speedMul = 1;
    this.obstacles.length = 0;
    this.orbList.length = 0;
    this.hintTimer = 0;
    this.runPhase = 0;
    this.dustTimer = 0;
    Object.assign(this.player, {
      y: 0, vy: 0, onGround: true, jumpsLeft: 2, coyote: 0, jumpBuffer: 0,
      sliding: false, slideT: 0, slideHold: false, slideKey: false, slideQueued: false, flipT: 0, land: 0, ascend: false,
    });
    for (const p of this.particles) p.active = false;

    // Level length follows the official track: loops × track length (fallback when unreadable).
    const trackSec = this.audio.duration || this.level.fallbackTrackSec;
    this.totalSec = Math.max(20, trackSec * this.level.loops);
    // Integrate the deterministic speed curve to find the finish line.
    let d = 0;
    const steps = 600;
    for (let i = 0; i < steps; i++) d += this.speedAt((i + 0.5) / steps) * (this.totalSec / steps);
    this.finishX = d;
    this.nextSpawn = this.W * 1.5;
    this.dirty = true;
  }

  private speedAt(progress: number): number {
    const warm = smooth(clamp(progress / 0.04, 0, 1)) * 0.35 + 0.65;
    const ramp = smooth(clamp(progress, 0, 1));
    return lerp(this.level.baseSpeed, this.level.maxSpeed, ramp) * warm;
  }

  private get progress(): number {
    return clamp(this.t / this.totalSec, 0, 1);
  }

  private resyncAudio(): void {
    const dur = this.audio.duration;
    if (!dur) return;
    const expected = this.t % dur;
    const actual = this.audio.time;
    const drift = Math.abs(expected - actual);
    if (drift > 0.3 && drift < dur - 0.3) this.audio.seek(expected);
  }

  private frame = (ts: number): void => {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = this.lastTs ? Math.min(0.034, (ts - this.lastTs) / 1000) : 0.016;
    this.lastTs = ts;

    if (this.state === 'playing') {
      this.update(dt);
      this.render(dt);
    } else if (this.dirty || this.state === 'ready') {
      this.render(0);
      this.dirty = false;
    }
  };

  private update(dt: number): void {
    const p = this.player;
    this.t += dt;
    this.hintTimer += dt;

    // ---- speed / distance
    const targetMul = this.finishing ? 0 : 1;
    this.speedMul += (targetMul - this.speedMul) * Math.min(1, dt * (this.finishing ? 2.6 : 6));
    const speed = this.speedAt(this.progress) * this.speedMul;
    this.distance += speed * dt;
    this.score += (speed * dt) / 10;

    // ---- finish
    if (!this.finishing && this.distance >= this.finishX) {
      this.finishing = true;
    }
    if (this.finishing && this.speedMul < 0.04) {
      this.finish();
      return;
    }

    // ---- invulnerability / shake
    if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3.2);

    // ---- player physics (y = height above ground)
    if (p.onGround) {
      p.coyote = COYOTE_TIME;
    } else {
      p.coyote = Math.max(0, p.coyote - dt);
      p.vy -= GRAVITY * dt;
      p.y += p.vy * dt;
      if (p.vy < 0) p.ascend = false;
      if (p.flipT > 0) p.flipT = Math.min(1, p.flipT + dt / 0.46);
      if (p.y <= 0) {
        p.y = 0;
        p.vy = 0;
        p.onGround = true;
        p.jumpsLeft = 2;
        p.flipT = 0;
        p.land = 1;
        this.burst(this.playerX, this.groundY, 8, this.palette.accent, 110);
        if (p.slideQueued) {
          p.slideQueued = false;
          p.sliding = true;
          p.slideT = 0;
        }
        if (p.jumpBuffer > 0) {
          p.jumpBuffer = 0;
          this.jump();
        }
      }
    }
    if (p.jumpBuffer > 0) p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    if (p.land > 0) p.land = Math.max(0, p.land - dt * 6);

    if (p.sliding) {
      p.slideT += dt;
      // keyboard: slide while ↓ is held (min SLIDE_MIN, max SLIDE_MAX); touch swipe: fixed SLIDE_TOUCH
      const minTime = p.slideKey ? SLIDE_MIN : SLIDE_TOUCH;
      if (p.slideT >= SLIDE_MAX || (!p.slideHold && p.slideT >= minTime)) p.sliding = false;
    }

    // ---- run cycle phase advances with ground speed
    this.runPhase += dt * Math.PI * 2 * 2.5 * (speed / 300 + 0.15);
    this.dustTimer -= dt;
    if (p.onGround && this.dustTimer <= 0 && speed > 80) {
      this.dustTimer = p.sliding ? 0.04 : 0.1;
      this.burst(this.playerX - 10, this.groundY, 1, 'rgba(210,235,255,0.7)', 60, p.sliding ? 1.4 : 1);
    }

    // ---- spawn / cull
    const spawnHorizon = this.distance + (this.W - this.playerX) + 120;
    while (this.nextSpawn < spawnHorizon && this.nextSpawn < this.finishX - this.W * 0.9) {
      this.spawnPattern(this.nextSpawn);
    }
    const cullX = this.distance - this.playerX - 120;
    while (this.obstacles.length && this.obstacles[0].x < cullX) this.obstacles.shift();
    while (this.orbList.length && this.orbList[0].x < cullX) this.orbList.shift();

    // ---- collisions
    this.collide();

    // ---- particles
    for (const q of this.particles) {
      if (!q.active) continue;
      q.life -= dt;
      if (q.life <= 0) {
        q.active = false;
        continue;
      }
      q.x += q.vx * dt - speed * dt * 0.55;
      q.y += q.vy * dt;
      q.vy += 160 * dt;
    }

    // ---- audio drift correction (cheap, ~1 Hz)
    if (Math.floor(this.t) !== Math.floor(this.t - dt)) this.resyncAudio();
  }

  private spawnPattern(x: number): void {
    const r = this.rng;
    const prog = clamp(x / this.finishX, 0, 1);
    const speed = this.speedAt(prog);
    const roll = r();

    let extent = 60;
    if (roll < 0.34) {
      // single crystal
      this.addSpike(x, 40 + r() * 22);
      extent = 40;
      if (r() < 0.55) this.addOrbArc(x, 4, 120, 150);
    } else if (roll < 0.5 && prog > 0.12) {
      // twin crystals — low so the jump comfortably clears both
      this.addSpike(x, 38 + r() * 12);
      this.addSpike(x + 56, 38 + r() * 12);
      extent = 100;
      this.addOrbArc(x + 28, 5, 105, 170);
    } else if (roll < 0.68) {
      // tall pylon
      this.obstacles.push({ kind: 'barrier', x, w: 26, h: 100, bottom: 0, variant: Math.floor(r() * 3) });
      extent = 30;
      if (r() < 0.5) this.addOrbArc(x, 4, 150, 150);
    } else if (roll < 0.9) {
      // hover drone: slide under it or double-jump over it
      this.obstacles.push({
        kind: 'drone', x, w: 64, h: DRONE_TOP - DRONE_BOTTOM, bottom: DRONE_BOTTOM, variant: Math.floor(r() * 3),
      });
      extent = 64;
      // orbs on the ground under the drone reward the slide
      for (let i = 0; i < 4; i++) this.addOrb(x - 36 + i * 24, 22);
    } else {
      // breather: pure orb line
      for (let i = 0; i < 6; i++) this.addOrb(x + i * 30, 30 + Math.sin(i * 0.9) * 8);
      extent = 170;
    }

    const gapSec = lerp(1.5, 0.92, smooth(prog)) * this.level.gapScale * (0.92 + r() * 0.3);
    this.nextSpawn = x + extent + Math.max(0.82, gapSec) * speed;
  }

  private addSpike(x: number, h: number): void {
    this.obstacles.push({ kind: 'spike', x, w: 38, h, bottom: 0, variant: Math.floor(this.rng() * 3) });
  }

  private addOrb(x: number, y: number): void {
    this.orbList.push({ x, y, taken: false, phase: this.rng() * 6.28 });
    this.orbsSpawned++;
  }

  private addOrbArc(cx: number, count: number, peak: number, width: number): void {
    for (let i = 0; i < count; i++) {
      const u = count === 1 ? 0.5 : i / (count - 1);
      this.addOrb(cx - width / 2 + u * width, 30 + Math.sin(u * Math.PI) * (peak - 30));
    }
  }

  private collide(): void {
    const p = this.player;
    const pw = p.sliding ? SLIDE_W : STAND_W;
    const ph = p.sliding ? SLIDE_H : STAND_H;
    const px0 = this.distance - pw / 2;
    const px1 = this.distance + pw / 2;
    const py0 = p.y + 2;
    const py1 = p.y + ph;

    // orbs
    for (const o of this.orbList) {
      if (o.taken) continue;
      if (o.x < px0 - 18 || o.x > px1 + 18) continue;
      if (o.y > py0 - 16 && o.y < py1 + 16) {
        o.taken = true;
        this.orbsCollected++;
        this.score += 50;
        this.burst(this.playerX + (o.x - this.distance), this.groundY - o.y, 5, this.palette.accent, 90);
      }
    }

    if (this.invuln > 0) return;
    for (const ob of this.obstacles) {
      if (ob.x + ob.w < px0 - 20 || ob.x - ob.w > px1 + 20) continue;
      // forgiving hit-boxes
      const shrinkX = ob.kind === 'spike' ? 0.26 : 0.14;
      const shrinkTop = ob.kind === 'spike' ? 0.18 : 0.06;
      const ox0 = ob.x - ob.w / 2 + ob.w * shrinkX;
      const ox1 = ob.x + ob.w / 2 - ob.w * shrinkX;
      const oy0 = ob.bottom + (ob.kind === 'drone' ? 4 : 0);
      const oy1 = ob.bottom + ob.h - ob.h * shrinkTop;
      if (px1 > ox0 && px0 < ox1 && py1 > oy0 && py0 < oy1) {
        this.hit();
        return;
      }
    }
  }

  private hit(): void {
    this.lives -= 1;
    this.invuln = INVULN_TIME;
    this.shake = this.reducedMotion ? 0 : 1;
    this.player.sliding = false;
    this.burst(this.playerX, this.groundY - this.player.y - 40, 14, '#ff5577', 180);
    if (this.lives <= 0) {
      this.state = 'gameover';
      this.audio.pause();
      this.dirty = true;
      this.onEvent({
        type: 'gameover',
        score: Math.round(this.score),
        orbs: this.orbsCollected,
        progress: clamp(this.distance / this.finishX, 0, 1),
      });
    }
  }

  private finish(): void {
    this.score += this.lives * 200;
    const orbRatio = this.orbsSpawned ? this.orbsCollected / this.orbsSpawned : 1;
    const stars = 1 + (this.lives >= 2 ? 1 : 0) + (orbRatio >= 0.6 ? 1 : 0);
    this.state = 'complete';
    this.dirty = true;
    this.audio.pause();
    this.onEvent({
      type: 'complete',
      score: Math.round(this.score),
      orbs: this.orbsCollected,
      orbsTotal: this.orbsSpawned,
      stars,
      livesLeft: this.lives,
    });
  }

  private burst(x: number, y: number, n: number, color: string, power: number, size = 1): void {
    if (this.reducedMotion) return;
    for (let i = 0; i < n; i++) {
      const q = this.particles.find((pp) => !pp.active);
      if (!q) return;
      const a = -Math.PI * (0.15 + Math.random() * 0.7);
      const s = power * (0.35 + Math.random() * 0.65);
      q.active = true;
      q.x = x;
      q.y = y;
      q.vx = Math.cos(a) * s * 0.9 - 30;
      q.vy = Math.sin(a) * s;
      q.maxLife = q.life = 0.28 + Math.random() * 0.32;
      q.size = (1.6 + Math.random() * 2.4) * size;
      q.color = color;
    }
  }

  /* -------------------------------- pose / animation -------------------------------- */

  private setTarget(dt: number): void {
    const p = this.player;
    const T = this.target;
    const parts = T.parts;
    const s = Math.sin(this.runPhase);
    const c = Math.cos(this.runPhase);

    // defaults
    T.bodyRot = 0; T.dx = 0; T.dy = 0; T.sx = 1; T.sy = 1;
    for (const k of RIG_ORDER) {
      const pp = parts[k];
      pp.rot = 0; pp.dx = 0; pp.dy = 0; pp.sy = 1;
    }

    const mode =
      this.debugPose === 'slide' ? 'slide'
      : this.debugPose === 'jump' || this.debugPose === 'double' ? 'air'
      : this.debugPose === 'run' ? 'run'
      : p.sliding ? 'slide' : p.onGround ? 'run' : 'air';

    if (mode === 'run') {
      const legAmp = 0.66;
      parts.legL.rot = s * legAmp;
      parts.legR.rot = -s * legAmp;
      const liftL = Math.max(0, -parts.legL.rot) / legAmp;
      const liftR = Math.max(0, -parts.legR.rot) / legAmp;
      parts.legL.dy = -liftL * 8;
      parts.legR.dy = -liftR * 8;
      parts.legL.sy = 1 - liftL * 0.09;
      parts.legR.sy = 1 - liftR * 0.09;
      parts.armL.rot = -s * 0.78;
      parts.armR.rot = s * 0.78;
      T.bodyRot = 0.15 + 0.025 * c;
      T.dy = -Math.abs(s) * 4.5;
      parts.head.rot = -0.07 + 0.035 * s;
      parts.head.dy = -Math.abs(c) * 1.4;
      parts.torso.rot = 0.02 * s;
    } else if (mode === 'air') {
      const dbl = this.debugPose === 'double' || p.flipT > 0;
      const rising = this.debugPose ? true : p.vy > 0;
      if (dbl) {
        // tucked flip
        parts.legL.rot = -1.35;
        parts.legR.rot = -1.1;
        parts.armL.rot = 0.5;
        parts.armR.rot = -0.9;
        parts.legL.sy = parts.legR.sy = 0.9;
        T.bodyRot = (this.debugPose === 'double' ? 0.55 : p.flipT) * Math.PI * 2;
      } else if (rising) {
        parts.legL.rot = -1.05;
        parts.legR.rot = 0.4;
        parts.armL.rot = 2.45;
        parts.armR.rot = -2.25;
        parts.legL.sy = 0.92;
        T.bodyRot = 0.04;
        T.sy = 1.05;
        T.sx = 0.96;
      } else {
        parts.legL.rot = -0.55;
        parts.legR.rot = 0.5;
        parts.armL.rot = 1.9;
        parts.armR.rot = -1.75;
        T.bodyRot = 0.1;
        T.sy = 1.03;
        T.sx = 0.98;
      }
      parts.head.rot = -0.1;
    } else {
      // slide: lean back, legs thrust forward
      T.bodyRot = -1.22;
      T.dy = CHAR_H * 0.22;
      T.dx = -4;
      parts.legL.rot = -0.2;
      parts.legR.rot = -0.1;
      parts.armL.rot = 0.5;
      parts.armR.rot = -0.25;
      parts.head.rot = 0.18;
    }

    if (p.land > 0 && mode === 'run') {
      T.sy *= 1 - 0.15 * p.land;
      T.sx *= 1 + 0.12 * p.land;
    }

    // ease the live pose toward the target (fast enough to keep the run cycle crisp)
    const k = 1 - Math.exp(-dt * (mode === 'air' && p.flipT > 0 ? 60 : 36));
    const P = this.pose;
    const isFlip = mode === 'air' && (p.flipT > 0 || this.debugPose === 'double');
    P.bodyRot = isFlip ? T.bodyRot : lerp(P.bodyRot, T.bodyRot, k);
    P.dx = lerp(P.dx, T.dx, k);
    P.dy = lerp(P.dy, T.dy, k);
    P.sx = lerp(P.sx, T.sx, k);
    P.sy = lerp(P.sy, T.sy, k);
    for (const name of RIG_ORDER) {
      const a = P.parts[name];
      const b = T.parts[name];
      a.rot = lerp(a.rot, b.rot, k);
      a.dx = lerp(a.dx, b.dx, k);
      a.dy = lerp(a.dy, b.dy, k);
      a.sy = lerp(a.sy, b.sy, k);
    }
  }

  /* -------------------------------- rendering -------------------------------- */

  private render(dt: number): void {
    const ctx = this.ctx;
    const k = this.dpr * this.scale;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    this.setTarget(dt || 0.016);

    // camera shake
    let sx = 0;
    let sy = 0;
    if (this.shake > 0) {
      sx = (Math.random() - 0.5) * 8 * this.shake;
      sy = (Math.random() - 0.5) * 6 * this.shake;
    }

    ctx.save();
    ctx.translate(sx, sy);
    this.drawBackground();
    this.drawGround();
    this.drawFinish();
    this.drawEntities();
    this.drawPlayer();
    this.drawParticles();
    this.drawForeground();
    ctx.restore();

    this.drawHud();
  }

  private drawTiled(strip: HTMLCanvasElement | null, factor: number, destY: number, destH: number, alpha = 1): void {
    if (!strip) return;
    const ctx = this.ctx;
    const w = this.stripW;
    const off = -((this.distance * factor) % w);
    ctx.globalAlpha = alpha;
    for (let x = off; x < this.W; x += w) {
      ctx.drawImage(strip, x, destY, w, destH);
    }
    ctx.globalAlpha = 1;
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const pal = this.palette;
    const W = this.W;
    const gy = this.groundY;

    ctx.fillStyle = this.skyGradient ?? pal.skyTop;
    ctx.fillRect(-20, -20, W + 40, gy + 22);

    // distant stars (slowest layer)
    this.drawTiled(this.starsStrip, 0.015, 0, Math.max(120, gy), 0.9);

    // real SillowMill.com world art, mirrored-tiled parallax
    const img = this.assets.world;
    if (img && img.naturalWidth) {
      const ih = gy * 1.02;
      const iw = (img.naturalWidth / img.naturalHeight) * ih;
      const off = -((this.distance * 0.045) % (iw * 2));
      ctx.globalAlpha = 0.78;
      for (let i = 0, x = off; x < W + iw; i++, x += iw) {
        if (x + iw < 0) continue;
        if (i % 2 === 0) {
          ctx.drawImage(img, x, gy - ih, iw, ih);
        } else {
          ctx.save();
          ctx.translate(x + iw, gy - ih);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0, iw, ih);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    }
    // readability veil
    ctx.fillStyle = this.veilGradient ?? 'rgba(4,5,22,0.4)';
    ctx.fillRect(-20, -20, W + 40, gy + 22);

    // procedural parallax silhouettes
    const farH = 210;
    this.drawTiled(this.farStrip, 0.12, gy - farH * 0.78, farH);
    const midH = this.level.level === 1 ? 250 : 230;
    this.drawTiled(this.midStrip, 0.3, gy - midH + 6, midH);
    const nearH = 150;
    this.drawTiled(this.nearStrip, 0.62, gy - nearH + 8, nearH);

    // low fog band
    ctx.fillStyle = this.fogGradient ?? pal.fog;
    ctx.fillRect(-20, gy - 70, W + 40, 70);
  }

  private drawGround(): void {
    const ctx = this.ctx;
    const pal = this.palette;
    const W = this.W;
    const gy = this.groundY;
    const H = this.H;

    ctx.fillStyle = this.groundGradient ?? pal.ground;
    ctx.fillRect(-20, gy, W + 40, H - gy + 20);

    // neon edge + soft band
    ctx.fillStyle = hexToRgba(pal.groundLine, 0.12);
    ctx.fillRect(-20, gy, W + 40, 9);
    ctx.fillStyle = hexToRgba(pal.groundLine, 0.9);
    ctx.fillRect(-20, gy - 1, W + 40, 2);

    // perspective grid (cheap line set scrolling with the world)
    const vx = W * 0.5;
    const vy = gy - 90;
    ctx.lineWidth = 1;
    ctx.strokeStyle = hexToRgba(pal.groundLine, 0.2);
    ctx.beginPath();
    const spacing = 70;
    const base = -((this.distance) % spacing);
    for (let x = base - spacing * 2; x < W + spacing * 3; x += spacing) {
      const bx = x + (x - vx) * ((H - gy) / (gy - vy));
      ctx.moveTo(x, gy);
      ctx.lineTo(bx, H + 4);
    }
    for (let i = 1; i <= 4; i++) {
      const y = gy + Math.pow(i / 4, 1.8) * (H - gy);
      ctx.moveTo(-20, y);
      ctx.lineTo(W + 20, y);
    }
    ctx.stroke();
  }

  private worldToScreenX(wx: number): number {
    return this.playerX + (wx - this.distance);
  }

  private drawFinish(): void {
    const sx = this.worldToScreenX(this.finishX);
    if (sx > this.W + 80 || sx < -80) return;
    const ctx = this.ctx;
    const gy = this.groundY;
    const pal = this.palette;
    ctx.fillStyle = hexToRgba(pal.accent, 0.12);
    ctx.fillRect(sx - 34, gy - 190, 68, 190);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(sx - 36, gy - 190, 5, 190);
    ctx.fillRect(sx + 31, gy - 190, 5, 190);
    ctx.fillRect(sx - 36, gy - 192, 72, 5);
    // checker strip
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff' : '#10122c';
      ctx.fillRect(sx - 34 + i * 7.6, gy - 6, 7.6, 6);
    }
    ctx.font = '700 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('FINISH', sx, gy - 198);
  }

  private drawEntities(): void {
    const ctx = this.ctx;
    const pal = this.palette;
    const gy = this.groundY;
    const tNow = this.t;

    for (const o of this.orbList) {
      if (o.taken) continue;
      const x = this.worldToScreenX(o.x);
      if (x < -20 || x > this.W + 20) continue;
      const y = gy - o.y + Math.sin(tNow * 4 + o.phase) * 3;
      if (this.orbSprite) ctx.drawImage(this.orbSprite, x - 16, y - 16, 32, 32);
    }

    for (const ob of this.obstacles) {
      const x = this.worldToScreenX(ob.x);
      if (x < -80 || x > this.W + 80) continue;
      if (ob.kind === 'spike') this.drawSpike(ob, x, gy, pal);
      else if (ob.kind === 'barrier') this.drawBarrier(ob, x, gy, pal);
      else this.drawDrone(ob, x, gy, pal);
    }
  }

  private drawSpike(ob: Obstacle, x: number, gy: number, pal: LevelPalette): void {
    const ctx = this.ctx;
    if (this.glowSprite) ctx.drawImage(this.glowSprite, x - 40, gy - ob.h - 14, 80, ob.h + 30);
    const h = ob.h;
    const w = ob.w;
    const shards: Array<[number, number, number]> = [
      [-w * 0.34, h * 0.62, w * 0.3],
      [w * 0.3, h * 0.74, w * 0.32],
      [0, h, w * 0.4],
    ];
    for (const [dx, sh, sw] of shards) {
      ctx.fillStyle = pal.accent2;
      ctx.beginPath();
      ctx.moveTo(x + dx - sw / 2, gy);
      ctx.lineTo(x + dx - sw * 0.1, gy - sh);
      ctx.lineTo(x + dx + sw / 2, gy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.beginPath();
      ctx.moveTo(x + dx - sw / 2, gy);
      ctx.lineTo(x + dx - sw * 0.1, gy - sh);
      ctx.lineTo(x + dx - sw * 0.02, gy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(8,4,28,0.34)';
      ctx.beginPath();
      ctx.moveTo(x + dx + sw / 2, gy);
      ctx.lineTo(x + dx - sw * 0.1, gy - sh);
      ctx.lineTo(x + dx + sw * 0.05, gy);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawBarrier(ob: Obstacle, x: number, gy: number, pal: LevelPalette): void {
    const ctx = this.ctx;
    if (this.glowSprite) ctx.drawImage(this.glowSprite, x - 46, gy - ob.h - 16, 92, ob.h + 36);
    const w = ob.w;
    const h = ob.h;
    ctx.fillStyle = '#12143a';
    ctx.fillRect(x - w / 2, gy - h, w, h);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(x - 2, gy - h + 6, 4, h - 12);
    ctx.fillRect(x - w / 2, gy - h, w, 4);
    ctx.fillRect(x - w / 2 - 3, gy - 8, w + 6, 8);
    // pulsing beacon
    const pulse = 0.55 + 0.45 * Math.sin(this.t * 6 + ob.x);
    ctx.fillStyle = hexToRgba('#ffffff', 0.5 + 0.5 * pulse);
    ctx.beginPath();
    ctx.arc(x, gy - h - 5, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawDrone(ob: Obstacle, x: number, gy: number, pal: LevelPalette): void {
    const ctx = this.ctx;
    const top = gy - (ob.bottom + ob.h);
    const bottom = gy - ob.bottom;
    const midY = (top + bottom) / 2 + Math.sin(this.t * 3 + ob.x * 0.01) * 3;
    if (this.glowSprite) ctx.drawImage(this.glowSprite, x - 70, midY - 56, 140, 112);
    // hull
    ctx.fillStyle = '#17194a';
    ctx.beginPath();
    ctx.moveTo(x - 32, midY);
    ctx.lineTo(x - 18, midY - 22);
    ctx.lineTo(x + 18, midY - 22);
    ctx.lineTo(x + 32, midY);
    ctx.lineTo(x + 18, midY + 22);
    ctx.lineTo(x - 18, midY + 22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = pal.accent2;
    ctx.lineWidth = 2;
    ctx.stroke();
    // eye
    ctx.fillStyle = hexToRgba('#ff3a5e', 0.9);
    ctx.beginPath();
    ctx.arc(x, midY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 2, midY - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    // rotors
    const rot = Math.sin(this.t * 40) * 3;
    ctx.fillStyle = hexToRgba(pal.accent, 0.8);
    ctx.fillRect(x - 40 - rot, midY - 26, 26 + rot * 2, 2.5);
    ctx.fillRect(x + 14 - rot, midY - 26, 26 + rot * 2, 2.5);
    // scan beam towards the ground (tells the player there is room to slide underneath)
    const grad = ctx.createLinearGradient(0, midY + 22, 0, gy);
    grad.addColorStop(0, hexToRgba('#ff3a5e', 0.28));
    grad.addColorStop(1, hexToRgba('#ff3a5e', 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x - 16, midY + 22);
    ctx.lineTo(x + 16, midY + 22);
    ctx.lineTo(x + 30, gy);
    ctx.lineTo(x - 30, gy);
    ctx.closePath();
    ctx.fill();
  }

  private drawPlayer(): void {
    const ctx = this.ctx;
    const p = this.player;
    const x = this.playerX;
    const footY = this.groundY - p.y;

    // ground contact shadow (shrinks with height)
    const sh = clamp(1 - p.y / 260, 0.25, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.38 * sh})`;
    ctx.beginPath();
    ctx.ellipse(x + 4, this.groundY + 3, 30 * sh, 6 * sh, 0, 0, Math.PI * 2);
    ctx.fill();

    // aura
    if (this.glowSprite) {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(this.glowSprite, x - 70, footY - CHAR_H - 18, 140, CHAR_H + 60);
      ctx.globalAlpha = 1;
    }

    // invulnerability blink
    let alpha = 1;
    if (this.invuln > 0) alpha = Math.floor(this.t * 14) % 2 === 0 ? 0.35 : 0.9;
    ctx.globalAlpha = alpha;
    this.drawMill(ctx, x, footY, CHAR_H);
    ctx.globalAlpha = 1;
  }

  private drawMill(ctx: CanvasRenderingContext2D, x: number, footY: number, h: number): void {
    const atlas = this.assets.rig;
    const s = h / RIG_SOURCE.h;
    const footX = RIG_SOURCE.w / 2;
    const footSrcY = RIG_SOURCE.h;
    const pose = this.pose;
    const chestY = (450 - footSrcY) * s;

    ctx.save();
    ctx.translate(x, footY);
    ctx.scale(pose.sx, pose.sy);
    ctx.translate(pose.dx, pose.dy);
    ctx.translate(0, chestY);
    ctx.rotate(pose.bodyRot);
    ctx.translate(0, -chestY);

    for (const name of RIG_ORDER) {
      const part = RIG_PARTS[name];
      const pp = pose.parts[name];
      const pvx = (part.px - footX) * s + pp.dx;
      const pvy = (part.py - footSrcY) * s + pp.dy;
      ctx.save();
      ctx.translate(pvx, pvy);
      if (pp.rot) ctx.rotate(pp.rot);
      if (pp.sy !== 1) ctx.scale(1, pp.sy);
      ctx.drawImage(
        atlas,
        part.sx, part.sy, part.sw, part.sh,
        (part.ox - part.px) * s, (part.oy - part.py) * s, part.ow * s, part.oh * s
      );
      ctx.restore();
    }
    ctx.restore();
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const q of this.particles) {
      if (!q.active) continue;
      const a = clamp(q.life / q.maxLife, 0, 1);
      ctx.globalAlpha = a * 0.85;
      ctx.fillStyle = q.color;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.size * (0.5 + a * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawForeground(): void {
    if (this.reducedMotion) return;
    const ctx = this.ctx;
    const speed = this.speedAt(this.progress) * this.speedMul;
    if (speed < 120) return;
    ctx.strokeStyle = hexToRgba('#ffffff', 0.12);
    ctx.lineWidth = 1;
    ctx.beginPath();
    const n = 9;
    for (let i = 0; i < n; i++) {
      const lane = (i * 0.618 + 0.17) % 1;
      const y = this.groundY * (0.22 + lane * 0.75);
      const len = 36 + ((i * 37) % 64);
      const x = this.W - (((this.distance * (1.4 + (i % 3) * 0.35)) + i * 211) % (this.W + len * 2)) + len;
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
    }
    ctx.stroke();
  }

  private drawHud(): void {
    const ctx = this.ctx;
    const pal = this.palette;
    const W = this.W;
    const safeTop = Math.max(14, this.insets.top + 6);
    const safeLeft = 16 + this.insets.left;
    const safeRight = 14 + this.insets.right;
    const font = (size: number, weight = 700) => `${weight} ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;

    // vignette
    if (this.vignetteGradient) {
      ctx.fillStyle = this.vignetteGradient;
      ctx.fillRect(0, 0, W, this.H);
    }

    // score (top-left)
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = font(9, 600);
    ctx.fillText('SCORE', safeLeft, safeTop + 6);
    ctx.fillStyle = '#ffffff';
    ctx.font = font(22);
    ctx.fillText(String(Math.round(this.score)).padStart(5, '0'), safeLeft, safeTop + 28);
    ctx.fillStyle = pal.accent;
    ctx.font = font(10, 600);
    ctx.fillText(`◆ ${this.orbsCollected}`, safeLeft, safeTop + 44);

    // hearts (below the DOM buttons, right)
    ctx.textAlign = 'right';
    ctx.font = font(15);
    for (let i = 0; i < START_LIVES; i++) {
      ctx.fillStyle = i < this.lives ? '#ff4d7a' : 'rgba(255,255,255,0.18)';
      ctx.fillText('♥', W - safeRight - i * 20, safeTop + 64);
    }

    // level progress (top-centre)
    const barW = Math.min(180, Math.max(80, (W - safeLeft - safeRight) * 0.34));
    const bx = W / 2 - barW / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = font(9, 600);
    ctx.fillText(`LVL ${this.level.level} · ${this.level.title.toUpperCase()}`, W / 2, safeTop + 8);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(bx, safeTop + 15, barW, 4);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(bx, safeTop + 15, barW * clamp(this.distance / this.finishX, 0, 1), 4);

    // controls hint (first seconds)
    if (this.state === 'playing' && this.hintTimer < 4.5) {
      const a = this.hintTimer < 3.6 ? 1 : 1 - (this.hintTimer - 3.6) / 0.9;
      ctx.globalAlpha = clamp(a, 0, 1) * 0.9;
      ctx.fillStyle = 'rgba(8,10,34,0.62)';
      const text = this.inputKind === 'touch'
        ? 'TAP = JUMP  ·  TAP AGAIN IN AIR = DOUBLE JUMP  ·  SWIPE DOWN = SLIDE'
        : 'SPACE / ↑ = JUMP  ·  ↑ AGAIN IN AIR = DOUBLE JUMP  ·  ↓ = SLIDE  ·  ESC = PAUSE';
      ctx.font = font(this.portrait ? 9 : 11, 600);
      const tw = Math.min(W - safeLeft - safeRight - 16, ctx.measureText(text).width + 24);
      const hy = this.groundY + (this.H - this.groundY) * 0.42;
      ctx.fillRect(W / 2 - tw / 2, hy - 15, tw, 26);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(text, W / 2, hy + 2, W - safeLeft - safeRight - 20);
      ctx.globalAlpha = 1;
    }
  }
}

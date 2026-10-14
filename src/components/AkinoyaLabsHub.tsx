import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Download,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
  Sliders,
  Maximize2,
  ChevronRight,
  ChevronDown,
  UploadCloud,
  FileCode,
  Film,
  Camera,
  Cpu,
  Palette,
  Eye,
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FolderDown,
  Volume2,
  Clock,
  Compass,
  Key,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';

import millAvatar from '../assets/images/mill_photo.jpg';
import moodboardImg from '../assets/images/Mood.png';
import bingaaComicCover from '../assets/images/bingaa_comic_cover.jpg';
import akinoyaVistaImg from '../assets/images/akinoya_twilight_world_1790852640934.jpg';
import visualizerThumbnailImg from '../assets/images/visualizer_thumbnail.png';
import akinoyaPlanetImg from '../assets/images/akinoya_exact_planet_1790853678690.jpg';
import { BINGAA_PDF_URL, BINGAA_PDF_FILENAME } from '../utils/certificate';

export const LABS_RELEASE_DATE = new Date('2027-01-09T00:00:00Z');

interface AkinoyaLabsHubProps {
  isMember?: boolean;
  onOpenAuthModal?: () => void;
  onNavigateVerify?: () => void;
}

interface DropzoneState {
  fileName: string;
  fileSize: string;
  status: 'idle' | 'uploading' | 'analyzed';
  score?: number;
  message?: string;
}

// Stylized Footprint Pair SVG Icon ("de voetstapjes")
const FootstepIcon: React.FC<{
  className?: string;
  isActive?: boolean;
  pulse?: boolean;
}> = ({ className = 'w-5 h-5', isActive = false, pulse = false }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`${className} ${pulse ? 'animate-pulse' : ''} transition-all duration-300`}
    style={{
      filter: isActive
        ? 'drop-shadow(0 0 8px rgba(0,242,254,0.9))'
        : 'drop-shadow(0 0 3px rgba(0,242,254,0.3))',
    }}
  >
    {/* Left Footprint */}
    <g transform="translate(4, 6) rotate(-8 10 16)">
      {/* Heel */}
      <ellipse
        cx="7"
        cy="25"
        rx="4"
        ry="4.5"
        fill={isActive ? '#00f2fe' : 'rgba(0, 242, 254, 0.45)'}
      />
      {/* Sole */}
      <path
        d="M3 14 C3 8, 11 8, 11 14 C11 18, 9 20, 7 20 C5 20, 3 18, 3 14 Z"
        fill={isActive ? '#00f2fe' : 'rgba(0, 242, 254, 0.45)'}
      />
      {/* Treads */}
      <circle cx="4" cy="5" r="1.2" fill={isActive ? '#fff' : '#00f2fe'} />
      <circle cx="7" cy="4" r="1.3" fill={isActive ? '#fff' : '#00f2fe'} />
      <circle cx="10" cy="5" r="1.2" fill={isActive ? '#fff' : '#00f2fe'} />
    </g>

    {/* Right Footprint (slightly ahead) */}
    <g transform="translate(26, 0) rotate(8 10 16)">
      {/* Heel */}
      <ellipse
        cx="7"
        cy="25"
        rx="4"
        ry="4.5"
        fill={isActive ? '#00f2fe' : 'rgba(0, 242, 254, 0.45)'}
      />
      {/* Sole */}
      <path
        d="M3 14 C3 8, 11 8, 11 14 C11 18, 9 20, 7 20 C5 20, 3 18, 3 14 Z"
        fill={isActive ? '#00f2fe' : 'rgba(0, 242, 254, 0.45)'}
      />
      {/* Treads */}
      <circle cx="4" cy="5" r="1.2" fill={isActive ? '#fff' : '#00f2fe'} />
      <circle cx="7" cy="4" r="1.3" fill={isActive ? '#fff' : '#00f2fe'} />
      <circle cx="10" cy="5" r="1.2" fill={isActive ? '#fff' : '#00f2fe'} />
    </g>
  </svg>
);

export const AkinoyaLabsHub: React.FC<AkinoyaLabsHubProps> = ({
  isMember = false,
  onOpenAuthModal,
  onNavigateVerify,
}) => {
  // Active Stage Tracking for Interactive Navigation
  const [activeStageId, setActiveStageId] = useState<number>(1);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  // Dropzone State for Stage 01 and Stage 02 (Interactive Sandbox)
  const [dropzoneState1, setDropzoneState1] = useState<DropzoneState>({
    fileName: '',
    fileSize: '',
    status: 'idle',
  });
  const [dropzoneState2, setDropzoneState2] = useState<DropzoneState>({
    fileName: '',
    fileSize: '',
    status: 'idle',
  });
  const [dropzoneState3, setDropzoneState3] = useState<DropzoneState>({
    fileName: '',
    fileSize: '',
    status: 'idle',
  });
  const [dropzoneState4, setDropzoneState4] = useState<DropzoneState>({
    fileName: '',
    fileSize: '',
    status: 'idle',
  });
  const [dropzoneState5, setDropzoneState5] = useState<DropzoneState>({
    fileName: '',
    fileSize: '',
    status: 'idle',
  });

  // Countdown Timer State for Release Date (January 9, 2027)
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = LABS_RELEASE_DATE.getTime() - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  // Smooth scroll handler
  const scrollToStage = (stageNum: number) => {
    setActiveStageId(stageNum);
    soundManager.playTone(580, 0.05);
    const element = document.getElementById(`stage-${stageNum}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Download simulation / triggers
  const handleDownloadStage1 = () => {
    soundManager.playTone(660, 0.08);
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#00f2fe', '#a855f7', '#fbbf24'],
      });
    } catch {
      // Confetti fallback
    }

    // Trigger PDF download
    const link = document.createElement('a');
    link.href = BINGAA_PDF_URL;
    link.download = BINGAA_PDF_FILENAME;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadStage2 = () => {
    soundManager.playTone(660, 0.08);
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#00f2fe', '#38bdf8', '#c084fc'],
      });
    } catch {
      // Confetti fallback
    }

    // Trigger image anchor download
    const link = document.createElement('a');
    link.href = moodboardImg;
    link.download = 'Akinoya_Style_Anchor_Pack_v1.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadLockedStage = (stageTitle: string) => {
    if (!isMember) {
      soundManager.playTone(330, 0.08);
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    soundManager.playTone(720, 0.08);
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f2fe', '#fbbf24', '#ffffff'],
      });
    } catch {
      // Confetti fallback
    }
    alert(`[VIP Access Granted] Initiating master archive download for: ${stageTitle}`);
  };

  // Dropzone simulation handler
  const handleSimulatedDrop = (
    e: React.DragEvent<HTMLDivElement> | React.ChangeEvent<HTMLInputElement>,
    stageNum: number
  ) => {
    e.preventDefault();
    soundManager.playTone(520, 0.06);

    let fileName = 'Uploaded_Asset.dat';
    let fileSize = '4.2 MB';

    if ('dataTransfer' in e && e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0];
      fileName = file.name;
      fileSize = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    } else if ('target' in e) {
      const target = e.target as HTMLInputElement;
      if (target.files?.[0]) {
        const file = target.files[0];
        fileName = file.name;
        fileSize = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      }
    }

    const setDropzone =
      stageNum === 1
        ? setDropzoneState1
        : stageNum === 2
        ? setDropzoneState2
        : stageNum === 3
        ? setDropzoneState3
        : stageNum === 4
        ? setDropzoneState4
        : setDropzoneState5;

    setDropzone({
      fileName,
      fileSize,
      status: 'uploading',
    });

    setTimeout(() => {
      soundManager.playTone(880, 0.1);
      setDropzone({
        fileName,
        fileSize,
        status: 'analyzed',
        score: Math.floor(Math.random() * 8) + 92, // 92% - 99%
        message: 'Spatial layout verified. Ready for pipeline synthesis.',
      });
    }, 900);
  };

  return (
    <div className="relative w-full text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Cosmic Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-cyan-600/10 via-purple-600/10 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-2/3 left-1/3 w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        {/* ======================================================== */}
        {/* HEADER: ÄKINOYA LABS UNIVERSAL WORKFLOW VAULT           */}
        {/* ======================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl bg-gradient-to-r from-[#0d1222]/90 via-[#0a0e1c]/90 to-[#070912]/95 border border-cyan-500/30 p-6 sm:p-10 shadow-[0_0_50px_rgba(0,242,254,0.12)] overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 font-bold tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,242,254,0.25)]">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  ÄKINOYA LABS · UNIVERSAL PIPELINE
                </span>
                <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-purple-950/80 border border-purple-400/40 text-purple-300 font-bold tracking-wider">
                  HYBRID AI / BLENDER 3D FRAMEWORK
                </span>
                {isMember ? (
                  <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-bold tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    PASS HOLDER VIP UNLOCKED
                  </span>
                ) : (
                  <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 font-semibold tracking-wider">
                    STAGES 01 &amp; 02 FREE PREVIEW
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-black text-white tracking-tight leading-tight">
                Universal Production Workflow &amp;{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-purple-400">
                  Case Study Vault
                </span>
              </h1>

              <p className="text-sm sm:text-base text-white/75 font-sans leading-relaxed">
                Step into the battle-tested hybrid AI &amp; Blender production pipeline developed by
                Sillow Mill. Guided by <strong>Mill</strong> along our glowing cyan footstep trail,
                learn the theory behind high-end generative cinema, explore Odi&apos;s real-world
                case studies for <em>Bingäa</em> &amp; <em>Äkinoya</em>, and test your own assets in
                dedicated sandbox dropzones.
              </p>
            </div>

            {/* Guide Avatar & Transmission Callout */}
            <div className="shrink-0 flex items-center gap-4 p-4 rounded-2xl bg-black/60 border border-cyan-500/40 shadow-[0_0_25px_rgba(0,242,254,0.15)] max-w-md">
              <div className="relative shrink-0">
                <img
                  src={millAvatar}
                  alt="Mill - Pipeline Guide"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.5)]"
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-cyan-400 text-black flex items-center justify-center font-bold text-[10px] shadow-sm">
                  ✓
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-cyan-300 tracking-wider">
                    GUIDE: MILL
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    LIVE
                  </span>
                </div>
                <p className="text-xs text-white/80 font-sans leading-snug">
                  &ldquo;Follow my cyan footprints along the trail. I will break down each production
                  stage from storyboard to theatrical polish!&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Quick-Jump Milestone Ribbon */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider">
              <FootstepIcon className="w-4 h-4" isActive pulse />
              <span>Footstep Milestones:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 1, label: '01 Storyboard', free: true },
                { id: 2, label: '02 Style Lock', free: true },
                { id: 3, label: '03 Blender Previs', free: false },
                { id: 4, label: '04 Prompt Engine', free: false },
                { id: 5, label: '05 Polish & LUTs', free: false },
              ].map((m) => {
                const isLocked = !isMember && !m.free;
                const isCurrent = activeStageId === m.id;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => scrollToStage(m.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,242,254,0.4)] scale-105'
                        : isLocked
                        ? 'bg-white/5 hover:bg-white/10 text-white/50 border border-white/10'
                        : 'bg-white/10 hover:bg-white/15 text-white/80 hover:text-white border border-white/10'
                    }`}
                  >
                    <span>{m.label}</span>
                    {isLocked && <Lock className="w-3 h-3 text-amber-400/80" />}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ======================================================== */}
        {/* INTERACTIVE GLOWING TRAIL & STAGES (DESKTOP & MOBILE)     */}
        {/* ======================================================== */}
        <div className="relative">
          {/* Vertical Cyan Guide Line down the timeline (Mobile left-aligned, Desktop centered) */}
          <div className="absolute left-6 md:left-1/2 top-10 bottom-24 w-1 -translate-x-1/2 bg-gradient-to-b from-cyan-400 via-purple-500 to-cyan-500/40 rounded-full shadow-[0_0_15px_rgba(0,242,254,0.5)] z-0 pointer-events-none" />

          {/* ======================================================== */}
          {/* STAGE 01: PRE-PRODUCTION & STORYBOARD BLUEPRINT           */}
          {/* ======================================================== */}
          <div id="stage-1" className="relative z-10 pt-6 pb-12 sm:pb-16 group">
            {/* Center Node / Footstep Marker */}
            <div className="absolute left-6 md:left-1/2 top-12 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => scrollToStage(1)}
                className="w-12 h-12 rounded-2xl bg-[#090e1c] border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(0,242,254,0.6)] cursor-pointer hover:scale-110 transition-transform"
                title="Stage 01: Pre-Production & Storyboard Blueprint"
              >
                <FootstepIcon className="w-6 h-6" isActive pulse />
              </button>
              <span className="hidden md:inline-block px-2 py-0.5 rounded bg-black/80 border border-cyan-500/40 text-[10px] font-mono font-bold text-cyan-300">
                STAGE 01
              </span>
            </div>

            {/* Desktop Staggered Grid (Theory on Left, Case Study & Dropzone on Right) */}
            <div className="pl-14 md:pl-0 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 items-start">
              {/* Column A: Universal Workflow Theory & Mill Guide Note */}
              <div className="space-y-6">
                <div className="p-6 sm:p-8 rounded-3xl bg-black/70 border border-cyan-500/30 hover:border-cyan-400/50 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-400 text-black font-mono font-extrabold text-xs tracking-wider shadow-[0_0_12px_rgba(0,242,254,0.4)]">
                        STAGE 01
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-400/40 font-bold uppercase tracking-wider">
                        PRE-PRODUCTION
                      </span>
                    </div>
                    <span className="text-xs font-mono text-white/50">WEEK 01</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white">
                    Storyboard Blueprints &amp; Spatial Planning
                  </h2>

                  <div className="space-y-3 text-xs sm:text-sm text-white/75 leading-relaxed font-sans">
                    <p>
                      <strong>The Universal Rule:</strong> Before touching a single 3D shader or
                      firing an AI prompt, cinematic pacing must be solved on 2D planes. Translating
                      narrative scripts into structural storyboards isolates blocking mistakes early.
                    </p>
                    <ul className="space-y-2 pl-4 list-disc marker:text-cyan-400">
                      <li>
                        <strong>Aspect Ratio Enforcement:</strong> Standardize on 2.39:1 Anamorphic
                        to prevent dynamic crop distortions across generative models.
                      </li>
                      <li>
                        <strong>The Hybrid Fork:</strong> Decide which shots require graybox Blender
                        spatial geometry vs. pure text-to-video diffusion.
                      </li>
                      <li>
                        <strong>Beat Mapping:</strong> Break sequences into 3-second tension intervals
                        to match temporal coherence windows.
                      </li>
                    </ul>
                  </div>

                  {/* Mill Guide Callout Box */}
                  <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-3.5">
                    <img
                      src={millAvatar}
                      alt="Mill"
                      className="w-10 h-10 rounded-xl object-cover border border-cyan-400 shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-cyan-300">
                          MILL&apos;S PRO TIP
                        </span>
                        <FootstepIcon className="w-3.5 h-3.5" isActive />
                      </div>
                      <p className="text-xs text-cyan-100/90 font-sans leading-relaxed">
                        &ldquo;Narrative clarity always precedes pixels! If your 2D storyboard has no
                        compositional tension, no neural network in existence will solve it for you.
                        Map your camera vectors first.&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column B: Odi's Practical Case Study & Dropzone */}
              <div className="space-y-6">
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0c1224]/90 to-black/90 border border-purple-500/30 hover:border-purple-400/50 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-500/20 pb-4">
                    <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-purple-950/80 border border-purple-400/40 text-purple-300 font-bold tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-purple-400" />
                      ODI&apos;S CASE STUDY &amp; ASSET VAULT
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                      FREE DOWNLOAD
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg sm:text-xl font-display font-bold text-white">
                      How Odi Mapped <em>Bingäa</em>
                    </h3>
                    <p className="text-xs sm:text-sm text-white/70 font-sans mt-1">
                      Case study deconstructing how the initial <em>Bingäa</em> comic panels and
                      narrative scripts were translated into cinematic camera setups.
                    </p>
                  </div>

                  {/* Storyboard Cover Preview */}
                  <div
                    onClick={() => setSelectedPreviewImage(bingaaComicCover)}
                    className="relative rounded-2xl overflow-hidden border border-white/10 group/img cursor-pointer aspect-[16/9] bg-black/80"
                  >
                    <img
                      src={bingaaComicCover}
                      alt="Bingäa Comic & Storyboard Preview"
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500 opacity-80 group-hover/img:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          Click to enlarge comic storyboard
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 border border-white/20 text-white/80">
                          18 PANELS
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Official Free Asset Slot */}
                  <div className="p-4 rounded-2xl bg-black/60 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white">
                          Odi&apos;s Storyboard Blueprint PDF
                        </span>
                        <span className="text-[10px] font-mono text-cyan-300">12.4 MB</span>
                      </div>
                      <p className="text-[11px] text-white/60">
                        Official director breakdown of <em>Bingäa</em> scene transitions &amp; pacing notes.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadStage1}
                      className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold text-xs tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(0,242,254,0.3)] flex items-center justify-center gap-2 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Blueprint</span>
                    </button>
                  </div>

                  {/* Interactive Community Dropzone */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                      <UploadCloud className="w-3.5 h-3.5 text-purple-400" />
                      Community Storyboard Sandbox Dropzone
                    </span>

                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleSimulatedDrop(e, 1)}
                      className="relative p-5 rounded-2xl border-2 border-dashed border-purple-500/30 hover:border-cyan-400/60 bg-black/40 hover:bg-black/60 transition-all text-center space-y-2 cursor-pointer group/drop"
                    >
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => handleSimulatedDrop(e, 1)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex justify-center">
                        <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-400/40 flex items-center justify-center text-purple-300 group-hover/drop:scale-110 transition-transform">
                          <UploadCloud className="w-5 h-5 text-cyan-400" />
                        </div>
                      </div>
                      <p className="text-xs font-mono text-white/80">
                        Drag &amp; drop your storyboard file or{' '}
                        <span className="text-cyan-300 underline">browse files</span>
                      </p>
                      <p className="text-[10px] font-mono text-white/50">
                        Accepts PDF, PNG, JPG · Up to 50 MB
                      </p>

                      {dropzoneState1.status === 'uploading' && (
                        <div className="pt-2 flex items-center justify-center gap-2 text-xs font-mono text-cyan-300">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Parsing scene blocking...</span>
                        </div>
                      )}

                      {dropzoneState1.status === 'analyzed' && (
                        <div className="pt-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-400/40 text-left space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-300">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {dropzoneState1.fileName} ({dropzoneState1.fileSize})
                            </span>
                            <span>Score: {dropzoneState1.score}%</span>
                          </div>
                          <p className="text-[11px] text-emerald-200/80 font-sans">
                            {dropzoneState1.message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footstep Connectors Between Stage 01 and Stage 02 */}
          <div className="flex justify-center items-center py-4 relative z-10">
            <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#080d1a] border border-cyan-500/30 text-cyan-300 text-xs font-mono">
              <FootstepIcon className="w-4 h-4" isActive pulse />
              <span>Mill guides you deeper along the trail...</span>
              <FootstepIcon className="w-4 h-4" isActive pulse />
            </div>
          </div>

          {/* ======================================================== */}
          {/* STAGE 02: ASSET-FIRST ART DIRECTION & ANCHORING          */}
          {/* ======================================================== */}
          <div id="stage-2" className="relative z-10 pt-6 pb-12 sm:pb-16 group">
            {/* Center Node / Footstep Marker */}
            <div className="absolute left-6 md:left-1/2 top-12 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => scrollToStage(2)}
                className="w-12 h-12 rounded-2xl bg-[#090e1c] border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(0,242,254,0.6)] cursor-pointer hover:scale-110 transition-transform"
                title="Stage 02: Asset-First Art Direction & Multi-Modal Anchoring"
              >
                <FootstepIcon className="w-6 h-6" isActive pulse />
              </button>
              <span className="hidden md:inline-block px-2 py-0.5 rounded bg-black/80 border border-cyan-500/40 text-[10px] font-mono font-bold text-cyan-300">
                STAGE 02
              </span>
            </div>

            {/* Desktop Staggered Grid (Case Study on Left, Theory on Right for weaving feel) */}
            <div className="pl-14 md:pl-0 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 items-start">
              {/* Column A: Odi's Practical Case Study (Weaving layout) */}
              <div className="space-y-6">
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0c1224]/90 to-black/90 border border-purple-500/30 hover:border-purple-400/50 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-500/20 pb-4">
                    <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-purple-950/80 border border-purple-400/40 text-purple-300 font-bold tracking-wider flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-purple-400" />
                      ODI&apos;S CASE STUDY &amp; ASSET VAULT
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                      FREE DOWNLOAD
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg sm:text-xl font-display font-bold text-white">
                      Locking the <em>Äkinoya</em> Style
                    </h3>
                    <p className="text-xs sm:text-sm text-white/70 font-sans mt-1">
                      Demonstrating how <code>Äkinoya.jpg</code> and <code>Mood.png</code> were
                      anchored as hard multi-modal constraints to prevent visual drift.
                    </p>
                  </div>

                  {/* Dual Image Preview (Mood.png & Twilight Vista) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setSelectedPreviewImage(moodboardImg)}
                      className="relative rounded-2xl overflow-hidden border border-white/10 group/thumb cursor-pointer aspect-square bg-black/80"
                    >
                      <img
                        src={moodboardImg}
                        alt="Moodboard Anchors"
                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover/thumb:bg-transparent transition-colors flex items-end p-2.5">
                        <span className="text-[10px] font-mono font-bold text-cyan-300 bg-black/70 px-2 py-0.5 rounded border border-white/10">
                          Mood.png (Style Anchor)
                        </span>
                      </div>
                    </div>

                    <div
                      onClick={() => setSelectedPreviewImage(akinoyaVistaImg)}
                      className="relative rounded-2xl overflow-hidden border border-white/10 group/thumb cursor-pointer aspect-square bg-black/80"
                    >
                      <img
                        src={akinoyaVistaImg}
                        alt="Twilight Vista"
                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover/thumb:bg-transparent transition-colors flex items-end p-2.5">
                        <span className="text-[10px] font-mono font-bold text-purple-300 bg-black/70 px-2 py-0.5 rounded border border-white/10">
                          Äkinoya.jpg (Master Vista)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Official Free Asset Slot */}
                  <div className="p-4 rounded-2xl bg-black/60 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white">
                          Äkinoya Style Anchor Pack v1
                        </span>
                        <span className="text-[10px] font-mono text-cyan-300">28.6 MB</span>
                      </div>
                      <p className="text-[11px] text-white/60">
                        24 high-resolution reference anchors, color palettes, and optical tokens.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadStage2}
                      className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold text-xs tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(0,242,254,0.3)] flex items-center justify-center gap-2 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Pack</span>
                    </button>
                  </div>

                  {/* Interactive Style Dropzone */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                      <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                      Style Anchor Calibration Dropzone
                    </span>

                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleSimulatedDrop(e, 2)}
                      className="relative p-5 rounded-2xl border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/60 bg-black/40 hover:bg-black/60 transition-all text-center space-y-2 cursor-pointer group/drop"
                    >
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp"
                        onChange={(e) => handleSimulatedDrop(e, 2)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex justify-center">
                        <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-400/40 flex items-center justify-center text-cyan-300 group-hover/drop:scale-110 transition-transform">
                          <Palette className="w-5 h-5 text-cyan-400" />
                        </div>
                      </div>
                      <p className="text-xs font-mono text-white/80">
                        Drop style reference image to calculate{' '}
                        <span className="text-cyan-300 underline">chromatic coherence</span>
                      </p>
                      <p className="text-[10px] font-mono text-white/50">
                        Accepts PNG, JPG · Up to 30 MB
                      </p>

                      {dropzoneState2.status === 'uploading' && (
                        <div className="pt-2 flex items-center justify-center gap-2 text-xs font-mono text-cyan-300">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Extracting optical token weights...</span>
                        </div>
                      )}

                      {dropzoneState2.status === 'analyzed' && (
                        <div className="pt-2 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-400/40 text-left space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-300">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {dropzoneState2.fileName} ({dropzoneState2.fileSize})
                            </span>
                            <span>Coherence: {dropzoneState2.score}%</span>
                          </div>
                          <p className="text-[11px] text-cyan-200/80 font-sans">
                            {dropzoneState2.message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Column B: Universal Workflow Theory & Mill Guide Note */}
              <div className="space-y-6">
                <div className="p-6 sm:p-8 rounded-3xl bg-black/70 border border-cyan-500/30 hover:border-cyan-400/50 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-400 text-black font-mono font-extrabold text-xs tracking-wider shadow-[0_0_12px_rgba(0,242,254,0.4)]">
                        STAGE 02
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-400/40 font-bold uppercase tracking-wider">
                        ART DIRECTION
                      </span>
                    </div>
                    <span className="text-xs font-mono text-white/50">WEEK 02</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white">
                    Asset-First Art Direction &amp; Multi-Modal Anchoring
                  </h2>

                  <div className="space-y-3 text-xs sm:text-sm text-white/75 leading-relaxed font-sans">
                    <p>
                      <strong>The Ironclad Principle:</strong> Generative models default to generic
                      averages unless strictly anchored. In professional film pipelines, asset quality
                      dictates film quality.
                    </p>
                    <ul className="space-y-2 pl-4 list-disc marker:text-cyan-400">
                      <li>
                        <strong>Character Turnarounds &amp; Hero Props:</strong> Render 360° turnarounds
                        of every hero subject before rolling video diffusion.
                      </li>
                      <li>
                        <strong>Multi-Modal Reference Ingestion:</strong> Bind reference images into
                        image-to-image conditioning nodes at fixed 0.65 - 0.75 denoising strength.
                      </li>
                      <li>
                        <strong>Chromatic Discipline:</strong> Lock a tight 3-color palette (e.g.,
                        obsidian, copper neon, bioluminescent cyan) to prevent chromatic bleed.
                      </li>
                    </ul>
                  </div>

                  {/* Mill Guide Callout Box */}
                  <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-3.5">
                    <img
                      src={millAvatar}
                      alt="Mill"
                      className="w-10 h-10 rounded-xl object-cover border border-cyan-400 shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-cyan-300">
                          MILL&apos;S PRO TIP
                        </span>
                        <FootstepIcon className="w-3.5 h-3.5" isActive />
                      </div>
                      <p className="text-xs text-cyan-100/90 font-sans leading-relaxed">
                        &ldquo;Style drift is the silent killer of AI cinema! If you feed text prompts
                        without image anchors, character faces change every 2 seconds. Anchor your
                        key art, and enforce prompt seeds.&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* THE 50% MEMBER WALL & RELEASE GATING (JANUARY 9, 2027)    */}
          {/* ======================================================== */}
          <div className="relative my-12 sm:my-16 z-30">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative rounded-3xl bg-gradient-to-b from-[#0a0f20]/95 via-[#070b18]/95 to-[#050711]/98 border-2 border-cyan-400/60 p-6 sm:p-12 shadow-[0_0_60px_rgba(0,242,254,0.2)] overflow-hidden"
            >
              {/* Glowing Aura & Beams */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-cyan-400/15 blur-3xl rounded-full pointer-events-none" />
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-purple-500/15 blur-3xl rounded-full pointer-events-none" />

              <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-400/60 text-cyan-300 font-mono text-xs font-extrabold tracking-wider shadow-[0_0_15px_rgba(0,242,254,0.3)]">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>THE ÄKINOYA MEMBER WALL · THRESHOLD CHECKPOINT</span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-4xl font-display font-black text-white tracking-tight">
                    Official Public Release Unlocks{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-amber-300">
                      January 9, 2027
                    </span>
                  </h2>
                  <p className="text-xs sm:text-base text-white/75 max-w-2xl mx-auto font-sans leading-relaxed">
                    You have crossed the halfway mark of the Sillow Mill pipeline! Advanced Stages
                    03 through 05, Odi&apos;s complete Blender camera rigs, structured JSON prompt
                    vaults, and DaVinci color LUTs are reserved for active Pass Holders.
                  </p>
                </div>

                {/* Live Countdown Timer Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-2xl mx-auto">
                  {[
                    { label: 'DAYS', value: timeLeft.days },
                    { label: 'HOURS', value: timeLeft.hours },
                    { label: 'MINUTES', value: timeLeft.minutes },
                    { label: 'SECONDS', value: timeLeft.seconds },
                  ].map((unit) => (
                    <div
                      key={unit.label}
                      className="p-3 sm:p-4 rounded-2xl bg-black/60 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,242,254,0.1)] flex flex-col items-center justify-center"
                    >
                      <span className="text-2xl sm:text-4xl font-mono font-black text-cyan-300">
                        {String(unit.value).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] sm:text-xs font-mono font-bold text-white/50 tracking-wider mt-1">
                        {unit.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Mill Transmission at the Wall */}
                <div className="max-w-xl mx-auto p-4 rounded-2xl bg-[#090e1d]/80 border border-cyan-500/30 flex items-center gap-3.5 text-left">
                  <img
                    src={millAvatar}
                    alt="Mill"
                    className="w-12 h-12 rounded-xl object-cover border border-cyan-400 shrink-0"
                  />
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                      MILL AT THE CHECKPOINT
                      <FootstepIcon className="w-3.5 h-3.5" isActive />
                    </span>
                    <p className="text-xs text-white/80 font-sans">
                      &ldquo;Halt, explorer! Beyond this gate lies our motion control rigs and prompt
                      token engines. Pass holders proceed immediately!&rdquo;
                    </p>
                  </div>
                </div>

                {/* Dynamic CTA depending on Member Status */}
                {isMember ? (
                  <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-400/50 max-w-md mx-auto flex items-center justify-center gap-2.5 text-emerald-300 font-mono font-bold text-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>AUTHENTICATED PASS HOLDER — FULL PIPELINE UNSEALED</span>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playTone(660, 0.08);
                        if (onOpenAuthModal) onOpenAuthModal();
                      }}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-mono font-extrabold text-xs tracking-wider transition-all cursor-pointer shadow-[0_0_25px_rgba(251,191,36,0.5)] flex items-center justify-center gap-2"
                    >
                      <span>CLAIM VIP INVITATION →</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playTone(520, 0.06);
                        if (onNavigateVerify) {
                          onNavigateVerify();
                        } else {
                          window.location.href = '/verify';
                        }
                      }}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-mono font-bold text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Key className="w-4 h-4 text-cyan-300" />
                      <span>VERIFY NFC PASS KEY</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* ======================================================== */}
          {/* STAGE 03: BLENDER 3D PREVIS & MOTION CONTROL (GATED)      */}
          {/* ======================================================== */}
          <div
            id="stage-3"
            className={`relative z-10 pt-6 pb-12 sm:pb-16 transition-all duration-500 ${
              !isMember ? 'filter blur-[1px] opacity-75' : ''
            }`}
          >
            {/* Center Node / Footstep Marker */}
            <div className="absolute left-6 md:left-1/2 top-12 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => scrollToStage(3)}
                className={`w-12 h-12 rounded-2xl bg-[#090e1c] border-2 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                  isMember
                    ? 'border-cyan-400 shadow-[0_0_20px_rgba(0,242,254,0.6)]'
                    : 'border-white/20 shadow-none'
                }`}
                title="Stage 03: Blender 3D Previs & Motion Control"
              >
                {isMember ? (
                  <FootstepIcon className="w-6 h-6" isActive pulse />
                ) : (
                  <Lock className="w-5 h-5 text-amber-400" />
                )}
              </button>
              <span className="hidden md:inline-block px-2 py-0.5 rounded bg-black/80 border border-white/20 text-[10px] font-mono font-bold text-white/60">
                STAGE 03
              </span>
            </div>

            <div className="pl-14 md:pl-0 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 items-start">
              {/* Column A: Universal Theory */}
              <div className="space-y-6">
                <div className="p-6 sm:p-8 rounded-3xl bg-black/70 border border-white/10 hover:border-cyan-400/40 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-purple-500 text-black font-mono font-extrabold text-xs tracking-wider">
                        STAGE 03
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-400/40 font-bold uppercase tracking-wider">
                        3D PREVIS
                      </span>
                    </div>
                    {!isMember && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        MEMBERS ONLY
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white">
                    Blender 3D Previs &amp; Motion Control
                  </h2>

                  <div className="space-y-3 text-xs sm:text-sm text-white/75 leading-relaxed font-sans">
                    <p>
                      <strong>The Spatial Anchor:</strong> Generative video models cannot comprehend
                      physical camera depth without structural guides. Gray-box Blender rigs provide
                      exact mathematical camera moves.
                    </p>
                    <ul className="space-y-2 pl-4 list-disc marker:text-cyan-400">
                      <li>
                        <strong>Graybox Rigs:</strong> Low-poly geometric proxies representing ship
                        cockpits, celestial monoliths, and terrain ridges.
                      </li>
                      <li>
                        <strong>Depth Map Passes:</strong> Export 16-bit Z-depth and Normal map
                        sequences to drive ControlNet motion conditioning.
                      </li>
                      <li>
                        <strong>Focal Length Discipline:</strong> Lock virtual cameras to 35mm / 50mm
                        anamorphic lens simulations to match live-action cinema.
                      </li>
                    </ul>
                  </div>

                  {/* Mill Guide Callout Box */}
                  <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-3.5">
                    <img
                      src={millAvatar}
                      alt="Mill"
                      className="w-10 h-10 rounded-xl object-cover border border-cyan-400 shrink-0"
                    />
                    <div className="space-y-1">
                      <span className="text-[11px] font-mono font-bold text-cyan-300">
                        MILL&apos;S PRO TIP
                      </span>
                      <p className="text-xs text-white/80 font-sans leading-relaxed">
                        &ldquo;Never let generative AI hallucinate camera moves! Animate a gray box
                        in Blender first, render a depth pass, and let diffusion paint the light.&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column B: Odi's Case Study & Member Dropzone */}
              <div className="space-y-6">
                <div className="p-6 sm:p-8 rounded-3xl bg-black/70 border border-purple-500/20 hover:border-purple-400/40 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-500/20 pb-4">
                    <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-purple-950/80 border border-purple-400/40 text-purple-300 font-bold tracking-wider flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-purple-400" />
                      ODI&apos;S CASE STUDY &amp; ASSET VAULT
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold">
                      .BLEND ARCHIVE
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg sm:text-xl font-display font-bold text-white">
                      Ship Warp Sequences &amp; Cockpit Rigging
                    </h3>
                    <p className="text-xs sm:text-sm text-white/70 font-sans mt-1">
                      Deconstructing the 3D gray-box geometry and camera velocity curves used for the
                      high-speed interstellar approach sequence.
                    </p>
                  </div>

                  {/* Thumbnail */}
                  <div
                    onClick={() => setSelectedPreviewImage(visualizerThumbnailImg)}
                    className="relative rounded-2xl overflow-hidden border border-white/10 group/thumb cursor-pointer aspect-[16/9] bg-black/80"
                  >
                    <img
                      src={visualizerThumbnailImg}
                      alt="Cockpit Previs Thumbnail"
                      className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                      <span className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        Blender Camera Trajectory Preview
                      </span>
                    </div>
                  </div>

                  {/* Asset Slot */}
                  <div className="p-4 rounded-2xl bg-black/60 border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white">
                          Blender Camera Rig &amp; Warp Previs .blend
                        </span>
                        <span className="text-[10px] font-mono text-cyan-300">148 MB</span>
                      </div>
                      <p className="text-[11px] text-white/60">
                        Complete Cycles gray-box project with baked camera trajectories.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadLockedStage('Blender Camera Rig & Warp Previs .blend')}
                      className={`px-4 py-2.5 rounded-xl font-mono font-bold text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 ${
                        isMember
                          ? 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-[0_0_15px_rgba(0,242,254,0.3)]'
                          : 'bg-white/10 hover:bg-white/15 text-white/70 border border-white/10'
                      }`}
                    >
                      {isMember ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      <span>{isMember ? 'Download .blend' : 'Unlock with Pass'}</span>
                    </button>
                  </div>

                  {/* Dropzone */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono font-bold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                      <UploadCloud className="w-3.5 h-3.5 text-white/40" />
                      Blender Scene Geometry Audit Dropzone
                    </span>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleSimulatedDrop(e, 3)}
                      className="p-4 rounded-2xl border border-dashed border-white/15 bg-black/40 text-center space-y-1.5 cursor-pointer relative"
                    >
                      <input
                        type="file"
                        accept=".blend,.fbx,.obj"
                        onChange={(e) => handleSimulatedDrop(e, 3)}
                        disabled={!isMember}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                      />
                      <p className="text-xs font-mono text-white/70">
                        {isMember
                          ? 'Drop .blend or .fbx scene file for camera velocity validation'
                          : 'Sign in with Pass to activate 3D geometry audit'}
                      </p>
                      <p className="text-[10px] font-mono text-white/40">Accepts .blend, .fbx, .obj</p>

                      {dropzoneState3.status === 'analyzed' && (
                        <div className="pt-2 p-2 rounded-xl bg-cyan-950/40 border border-cyan-400/40 text-left text-xs font-mono text-cyan-300">
                          ✓ {dropzoneState3.fileName} ({dropzoneState3.fileSize}) — Ready for Depth Pass.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* STAGE 04: STRUCTURED MULTI-BLOCK PROMPT ENGINEERING      */}
          {/* ======================================================== */}
          <div
            id="stage-4"
            className={`relative z-10 pt-6 pb-12 sm:pb-16 transition-all duration-500 ${
              !isMember ? 'filter blur-[1px] opacity-75' : ''
            }`}
          >
            {/* Center Node / Footstep Marker */}
            <div className="absolute left-6 md:left-1/2 top-12 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => scrollToStage(4)}
                className={`w-12 h-12 rounded-2xl bg-[#090e1c] border-2 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                  isMember
                    ? 'border-cyan-400 shadow-[0_0_20px_rgba(0,242,254,0.6)]'
                    : 'border-white/20 shadow-none'
                }`}
                title="Stage 04: Structured Multi-Block Prompt Engineering"
              >
                {isMember ? (
                  <FootstepIcon className="w-6 h-6" isActive pulse />
                ) : (
                  <Lock className="w-5 h-5 text-amber-400" />
                )}
              </button>
              <span className="hidden md:inline-block px-2 py-0.5 rounded bg-black/80 border border-white/20 text-[10px] font-mono font-bold text-white/60">
                STAGE 04
              </span>
            </div>

            <div className="pl-14 md:pl-0 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 items-start">
              {/* Column A: Case Study (Weaving layout) */}
              <div className="space-y-6">
                <div className="p-6 sm:p-8 rounded-3xl bg-black/70 border border-purple-500/20 hover:border-purple-400/40 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-500/20 pb-4">
                    <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-purple-950/80 border border-purple-400/40 text-purple-300 font-bold tracking-wider flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-purple-400" />
                      ODI&apos;S CASE STUDY &amp; ASSET VAULT
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold">
                      JSON PROMPT VAULT
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg sm:text-xl font-display font-bold text-white">
                      Master Prompt Templates for <em>Äkinoya</em>
                    </h3>
                    <p className="text-xs sm:text-sm text-white/70 font-sans mt-1">
                      The exact 4-block syntax used across Gemini 1.5 Pro and Imagen 3 to generate
                      the monolithic twilight sequences.
                    </p>
                  </div>

                  {/* Concrete Prompt Syntax Card */}
                  <div className="p-4 rounded-2xl bg-black/90 border border-cyan-500/30 font-mono text-xs space-y-2 text-cyan-200">
                    <div className="text-[10px] text-white/40 border-b border-white/10 pb-1">
                      SYNTAX FORMULA v2.4
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      <span className="text-cyan-400 font-bold">[BLOCK 1: SCENE CONTEXT]</span> 2.39:1 anamorphic cinematography, twilight alien atmosphere, monolithic obsidian ruins...
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      <span className="text-purple-400 font-bold">[BLOCK 2: ACTIVE ANCHOR]</span> Locked to Äkinoya.jpg palette, bioluminescent cyan veins (#00f2fe), copper rim lighting...
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      <span className="text-amber-400 font-bold">[BLOCK 3: OPTICALS]</span> Panavision C-Series anamorphic flare, volumetric mist, 35mm film grain, shallow depth of field...
                    </p>
                  </div>

                  {/* Asset Slot */}
                  <div className="p-4 rounded-2xl bg-black/60 border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white">
                          Master Prompt Vault &amp; Negative Token List .json
                        </span>
                        <span className="text-[10px] font-mono text-cyan-300">2.1 MB</span>
                      </div>
                      <p className="text-[11px] text-white/60">
                        Over 120 production-tested prompts and negative weight tables.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadLockedStage('Master Prompt Vault .json')}
                      className={`px-4 py-2.5 rounded-xl font-mono font-bold text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 ${
                        isMember
                          ? 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-[0_0_15px_rgba(0,242,254,0.3)]'
                          : 'bg-white/10 hover:bg-white/15 text-white/70 border border-white/10'
                      }`}
                    >
                      {isMember ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      <span>{isMember ? 'Download .json' : 'Unlock with Pass'}</span>
                    </button>
                  </div>

                  {/* Dropzone */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono font-bold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                      <UploadCloud className="w-3.5 h-3.5 text-white/40" />
                      Prompt Token Syntax Evaluator Dropzone
                    </span>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleSimulatedDrop(e, 4)}
                      className="p-4 rounded-2xl border border-dashed border-white/15 bg-black/40 text-center space-y-1.5 cursor-pointer relative"
                    >
                      <input
                        type="file"
                        accept=".json,.txt"
                        onChange={(e) => handleSimulatedDrop(e, 4)}
                        disabled={!isMember}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                      />
                      <p className="text-xs font-mono text-white/70">
                        {isMember
                          ? 'Drop custom prompt JSON or TXT file to evaluate token density'
                          : 'Sign in with Pass to test prompt syntax evaluator'}
                      </p>
                      <p className="text-[10px] font-mono text-white/40">Accepts .json, .txt</p>

                      {dropzoneState4.status === 'analyzed' && (
                        <div className="pt-2 p-2 rounded-xl bg-purple-950/40 border border-purple-400/40 text-left text-xs font-mono text-purple-300">
                          ✓ {dropzoneState4.fileName} — Token structure validated (98% coherence).
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Column B: Universal Theory */}
              <div className="space-y-6">
                <div className="p-6 sm:p-8 rounded-3xl bg-black/70 border border-white/10 hover:border-cyan-400/40 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-purple-500 text-black font-mono font-extrabold text-xs tracking-wider">
                        STAGE 04
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-400/40 font-bold uppercase tracking-wider">
                        PROMPT ARCHITECTURE
                      </span>
                    </div>
                    {!isMember && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        MEMBERS ONLY
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white">
                    Structured Multi-Block Prompt Engineering
                  </h2>

                  <div className="space-y-3 text-xs sm:text-sm text-white/75 leading-relaxed font-sans">
                    <p>
                      <strong>Mathematical Token Grouping:</strong> Professional prompting is not
                      stream-of-consciousness writing. It is systematic parameter configuration
                      grouped into distinct logical partitions.
                    </p>
                    <ul className="space-y-2 pl-4 list-disc marker:text-cyan-400">
                      <li>
                        <strong>Context &amp; Genre Block:</strong> Hard-code narrative universe tokens
                        first to bias latent space toward cinematic science fiction.
                      </li>
                      <li>
                        <strong>Reference Binding:</strong> Explicitly instruct the model on which
                        features of the multi-modal anchor image must remain immutable.
                      </li>
                      <li>
                        <strong>Negative Weight Stacking:</strong> Suppress digital oversaturation,
                        plastic skin shaders, and deformed perspective rays.
                      </li>
                    </ul>
                  </div>

                  {/* Mill Guide Callout Box */}
                  <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-3.5">
                    <img
                      src={millAvatar}
                      alt="Mill"
                      className="w-10 h-10 rounded-xl object-cover border border-cyan-400 shrink-0"
                    />
                    <div className="space-y-1">
                      <span className="text-[11px] font-mono font-bold text-cyan-300">
                        MILL&apos;S PRO TIP
                      </span>
                      <p className="text-xs text-white/80 font-sans leading-relaxed">
                        &ldquo;Random prompts give random results. Group your tokens into four
                        distinct blocks, and never omit optical camera descriptors!&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* STAGE 05: ITERATIVE GENERATION, REFINEMENT & POLISH       */}
          {/* ======================================================== */}
          <div
            id="stage-5"
            className={`relative z-10 pt-6 pb-12 sm:pb-16 transition-all duration-500 ${
              !isMember ? 'filter blur-[1px] opacity-75' : ''
            }`}
          >
            {/* Center Node / Footstep Marker */}
            <div className="absolute left-6 md:left-1/2 top-12 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => scrollToStage(5)}
                className={`w-12 h-12 rounded-2xl bg-[#090e1c] border-2 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                  isMember
                    ? 'border-cyan-400 shadow-[0_0_20px_rgba(0,242,254,0.6)]'
                    : 'border-white/20 shadow-none'
                }`}
                title="Stage 05: Iterative Generation, Refinement & Polish"
              >
                {isMember ? (
                  <FootstepIcon className="w-6 h-6" isActive pulse />
                ) : (
                  <Lock className="w-5 h-5 text-amber-400" />
                )}
              </button>
              <span className="hidden md:inline-block px-2 py-0.5 rounded bg-black/80 border border-white/20 text-[10px] font-mono font-bold text-white/60">
                STAGE 05
              </span>
            </div>

            <div className="pl-14 md:pl-0 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 items-start">
              {/* Column A: Universal Theory */}
              <div className="space-y-6">
                <div className="p-6 sm:p-8 rounded-3xl bg-black/70 border border-white/10 hover:border-cyan-400/40 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-black font-mono font-extrabold text-xs tracking-wider">
                        STAGE 05
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-400/40 font-bold uppercase tracking-wider">
                        THEATRICAL FINISHING
                      </span>
                    </div>
                    {!isMember && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        MEMBERS ONLY
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white">
                    Iterative Generation, Refinement &amp; Polish
                  </h2>

                  <div className="space-y-3 text-xs sm:text-sm text-white/75 leading-relaxed font-sans">
                    <p>
                      <strong>The Final 10% Separation:</strong> Raw AI generations are merely raw
                      rushes. Theatrical cinema is achieved through surgical post-production, optical
                      flow stabilization, and ACES color science.
                    </p>
                    <ul className="space-y-2 pl-4 list-disc marker:text-cyan-400">
                      <li>
                        <strong>Temporal De-flickering:</strong> Run 3-frame optical flow passes to
                        stabilize high-frequency AI micro-jitter.
                      </li>
                      <li>
                        <strong>4K Neural Spatial Reconstruction:</strong> Model-assisted 4K upscaling
                        with organic grain synthesis to avoid plastic AI textures.
                      </li>
                      <li>
                        <strong>DaVinci Resolve ACES Grading:</strong> Map footage into cinematic color
                        spaces with custom Sillow Mill print film emulation LUTs.
                      </li>
                    </ul>
                  </div>

                  {/* Mill Guide Callout Box */}
                  <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-3.5">
                    <img
                      src={millAvatar}
                      alt="Mill"
                      className="w-10 h-10 rounded-xl object-cover border border-cyan-400 shrink-0"
                    />
                    <div className="space-y-1">
                      <span className="text-[11px] font-mono font-bold text-cyan-300">
                        MILL&apos;S PRO TIP
                      </span>
                      <p className="text-xs text-white/80 font-sans leading-relaxed">
                        &ldquo;You made it to the summit! Treat AI renders like raw film scans from a
                        vintage camera. The colorist and sound designer breathe the true life into
                        the frames.&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column B: Odi's Case Study & Member Dropzone */}
              <div className="space-y-6">
                <div className="p-6 sm:p-8 rounded-3xl bg-black/70 border border-purple-500/20 hover:border-purple-400/40 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-500/20 pb-4">
                    <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-purple-950/80 border border-purple-400/40 text-purple-300 font-bold tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      ODI&apos;S CASE STUDY &amp; ASSET VAULT
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold">
                      DAVINCI LUTS &amp; PRESETS
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg sm:text-xl font-display font-bold text-white">
                      Final Render Polish &amp; 4K Cinematic Delivery
                    </h3>
                    <p className="text-xs sm:text-sm text-white/70 font-sans mt-1">
                      The exact post-processing nodes, temporal de-flickering, and DaVinci color grading
                      pipeline used on the official Sillow Mill teaser.
                    </p>
                  </div>

                  {/* Master Planet Render Preview */}
                  <div
                    onClick={() => setSelectedPreviewImage(akinoyaPlanetImg)}
                    className="relative rounded-2xl overflow-hidden border border-white/10 group/thumb cursor-pointer aspect-[16/9] bg-black/80"
                  >
                    <img
                      src={akinoyaPlanetImg}
                      alt="Final 4K Master Render"
                      className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                      <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        Official 4K Master Deliverable Preview
                      </span>
                    </div>
                  </div>

                  {/* Asset Slot */}
                  <div className="p-4 rounded-2xl bg-black/60 border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white">
                          Äkinoya DaVinci Color LUTs &amp; Finishing Presets .cube
                        </span>
                        <span className="text-[10px] font-mono text-cyan-300">84.2 MB</span>
                      </div>
                      <p className="text-[11px] text-white/60">
                        Official 3D LUT cubes (.cube) calibrated for ACEScc and Rec.709.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadLockedStage('Äkinoya DaVinci Color LUTs .cube')}
                      className={`px-4 py-2.5 rounded-xl font-mono font-bold text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 ${
                        isMember
                          ? 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-[0_0_15px_rgba(0,242,254,0.3)]'
                          : 'bg-white/10 hover:bg-white/15 text-white/70 border border-white/10'
                      }`}
                    >
                      {isMember ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      <span>{isMember ? 'Download .cube' : 'Unlock with Pass'}</span>
                    </button>
                  </div>

                  {/* Dropzone */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono font-bold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                      <UploadCloud className="w-3.5 h-3.5 text-white/40" />
                      4K Theatrical Deliverable Audit Dropzone
                    </span>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleSimulatedDrop(e, 5)}
                      className="p-4 rounded-2xl border border-dashed border-white/15 bg-black/40 text-center space-y-1.5 cursor-pointer relative"
                    >
                      <input
                        type="file"
                        accept=".mov,.mp4,.exr"
                        onChange={(e) => handleSimulatedDrop(e, 5)}
                        disabled={!isMember}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                      />
                      <p className="text-xs font-mono text-white/70">
                        {isMember
                          ? 'Drop .mov or .mp4 master render for broadcast compliance audit'
                          : 'Sign in with Pass to test broadcast compliance audit'}
                      </p>
                      <p className="text-[10px] font-mono text-white/40">Accepts .mov, .mp4, .exr</p>

                      {dropzoneState5.status === 'analyzed' && (
                        <div className="pt-2 p-2 rounded-xl bg-amber-950/40 border border-amber-400/40 text-left text-xs font-mono text-amber-300">
                          ✓ {dropzoneState5.fileName} — Master compliance: 2.39:1 Anamorphic verified.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Fullscreen Image Inspection */}
      <AnimatePresence>
        {selectedPreviewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPreviewImage(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
          >
            <div className="relative max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden border border-cyan-500/40 shadow-[0_0_50px_rgba(0,242,254,0.3)]">
              <img
                src={selectedPreviewImage}
                alt="Enlarged Case Study Asset"
                className="w-full h-full object-contain max-h-[85vh]"
              />
              <button
                type="button"
                onClick={() => setSelectedPreviewImage(null)}
                className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-black/80 border border-white/20 text-white font-mono text-xs hover:bg-white/20 transition-colors"
              >
                Close ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

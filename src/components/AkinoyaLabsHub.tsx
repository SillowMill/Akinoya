import React, { useState, useEffect } from 'react';
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
  FolderOpen,
  Volume2,
  Clock,
  Compass,
  X,
  ExternalLink,
  Crown,
  HardDrive,
  Music,
  Disc,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';
import {
  VAULT_STAGE_FOLDER_IDS,
  VAULT_STAGE_NAMES,
  getVaultFolderIdForStage,
} from '../utils/drive';

import millAvatar from '../assets/images/mill_photo.jpg';
import moodboardImg from '../assets/images/Mood.png';
import bingaaComicCover from '../assets/images/bingaa_comic_cover.jpg';
import akinoyaVistaImg from '../assets/images/akinoya_twilight_world_1790852640934.jpg';
import visualizerThumbnailImg from '../assets/images/visualizer_thumbnail.png';
import akinoyaPlanetImg from '../assets/images/akinoya_exact_planet_1790853678690.jpg';

// Bespoke Gemini / Imagen 3 Generated Stage Visuals
import stage01Img from '../assets/images/stage_01_storyboard_blueprint.jpg';
import stage02Img from '../assets/images/stage_02_character_reference_sheet.jpg';
import stage03Img from '../assets/images/stage_03_cockpit_previs_wireframe.jpg';
import stage04Img from '../assets/images/stage_04_cybernetic_prompt_datastream.jpg';
import stage05Img from '../assets/images/stage_05_cinematic_color_grading_waveform.jpg';

// Character Locking Master Assets (from Character Locking folder)
import millLockingImg from '../assets/images/character_locking/MilLLL.PNG';
import odiLockingImg from '../assets/images/character_locking/Odi.JPG';
import sillowLockingImg from '../assets/images/character_locking/Sillow.JPG';

import { BINGAA_PDF_URL, BINGAA_PDF_FILENAME } from '../utils/certificate';

export const LABS_RELEASE_DATE = new Date('2027-01-09T00:00:00Z');

export interface AkinoyaLabsHubProps {
  isMember?: boolean; // active paid monthly subscriber or VIP pass holder
  onOpenAuthModal?: () => void;
  onNavigateVerify?: () => void;
  onNavigateToVault?: (folderId?: string) => void;
}

interface StageDetail {
  id: number;
  stageNumber: string;
  tag: string;
  navLabel: string;
  richIcon: string;
  timeframe: string;
  title: string;
  subtitle: string;
  vaultFolderMapping: string;
  isAdvancedLocked: boolean; // Stage 3, 4, 5 default locked for non-paid users
  heroImage: string;
  heroImageAlt: string;
  themeDescription: string;
  millTransmission: string;
  millProTip: string;
  universalTheory: {
    heading: string;
    description: string;
    bullets: Array<{ title: string; detail: string }>;
  };
  odiCaseStudy: {
    title: string;
    summary: string;
    deepDiveNarrative: string;
    previewThumbnails: Array<{ img: string; caption: string }>;
  };
  masterAsset: {
    title: string;
    fileName: string;
    fileSize: string;
    fileFormat: string;
    vaultPath: string;
    description: string;
    downloadUrl?: string;
    downloadFileName?: string;
    specs: Array<{ key: string; val: string }>;
  };
  technicalSpecs: Array<{ label: string; value: string }>;
  characterDownloads?: Array<{
    name: string;
    fileName: string;
    size: string;
    format: string;
    img: string;
    downloadUrl: string;
    description: string;
  }>;
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
      <ellipse
        cx="7"
        cy="25"
        rx="4"
        ry="4.5"
        fill={isActive ? '#00f2fe' : 'rgba(0, 242, 254, 0.45)'}
      />
      <path
        d="M3 14 C3 8, 11 8, 11 14 C11 18, 9 20, 7 20 C5 20, 3 18, 3 14 Z"
        fill={isActive ? '#00f2fe' : 'rgba(0, 242, 254, 0.45)'}
      />
      <circle cx="4" cy="5" r="1.2" fill={isActive ? '#fff' : '#00f2fe'} />
      <circle cx="7" cy="4" r="1.3" fill={isActive ? '#fff' : '#00f2fe'} />
      <circle cx="10" cy="5" r="1.2" fill={isActive ? '#fff' : '#00f2fe'} />
    </g>

    {/* Right Footprint */}
    <g transform="translate(26, 0) rotate(8 10 16)">
      <ellipse
        cx="7"
        cy="25"
        rx="4"
        ry="4.5"
        fill={isActive ? '#00f2fe' : 'rgba(0, 242, 254, 0.45)'}
      />
      <path
        d="M3 14 C3 8, 11 8, 11 14 C11 18, 9 20, 7 20 C5 20, 3 18, 3 14 Z"
        fill={isActive ? '#00f2fe' : 'rgba(0, 242, 254, 0.45)'}
      />
      <circle cx="4" cy="5" r="1.2" fill={isActive ? '#fff' : '#00f2fe'} />
      <circle cx="7" cy="4" r="1.3" fill={isActive ? '#fff' : '#00f2fe'} />
      <circle cx="10" cy="5" r="1.2" fill={isActive ? '#fff' : '#00f2fe'} />
    </g>
  </svg>
);

export const AkinoyaLabsHub: React.FC<AkinoyaLabsHubProps> = ({
  isMember = false,
  onOpenAuthModal: _onOpenAuthModal,
  onNavigateVerify: _onNavigateVerify,
  onNavigateToVault,
}) => {
  // Deep-Dive Modal State
  const [selectedStageForModal, setSelectedStageForModal] = useState<StageDetail | null>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const [activeStageId, setActiveStageId] = useState<number>(1);

  // Countdown Timer State pointing to January 9, 2027
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const diff = LABS_RELEASE_DATE.getTime() - now;

      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  // Active Stage Detection on Scroll (for Desktop Sidebar & Mobile Fast-Jump Bar)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const stageNum = Number(entry.target.id.replace('stage-', ''));
            if (stageNum >= 1 && stageNum <= 5) {
              setActiveStageId(stageNum);
            }
          }
        }
      },
      { rootMargin: '-15% 0px -55% 0px', threshold: 0.1 }
    );

    for (let i = 1; i <= 5; i++) {
      const el = document.getElementById(`stage-${i}`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const handleJumpToStage = (stageNum: number) => {
    setActiveStageId(stageNum);
    soundManager.playTone(580, 0.05);
    const target = document.getElementById(`stage-${stageNum}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Comprehensive 5-Stage Data Architecture (Mapped to Drive Vault Folders)
  const STAGES: StageDetail[] = [
    {
      id: 1,
      stageNumber: '01',
      tag: 'PRE-PRODUCTION',
      navLabel: 'Pre-Production',
      richIcon: '🎬',
      timeframe: 'WEEK 01 · NARRATIVE BEDROCK',
      title: 'Pre-Production & Storyboards',
      subtitle: 'Translating narrative scripts into 2.39:1 anamorphic storyboards',
      vaultFolderMapping: '01 · Storyboards',
      isAdvancedLocked: true,
      heroImage: stage01Img,
      heroImageAlt: 'Sci-fi cinematic storyboard blueprint under a cosmic teal sky',
      themeDescription: 'Sci-fi cinematic storyboard blueprint under a cosmic teal sky (Gemini/Imagen 3)',
      millTransmission:
        'Narrative clarity always precedes pixels! If your storyboard lacks compositional tension, no generative video model can fix it.',
      millProTip:
        'Standardize strictly on 2.39:1 Anamorphic ratio to prevent AI perspective stretching and aspect drift.',
      universalTheory: {
        heading: 'Translating Scripts into Structural Storyboards',
        description:
          'In professional hybrid pipelines, visual pacing and spatial geometry must be locked before firing generative video passes or setting 3D keyframes.',
        bullets: [
          {
            title: '2.39:1 Anamorphic Framing',
            detail:
              'Establishes hard horizontal letterboxing constraints that keep AI models anchored to cinematic film ratios rather than square social crops.',
          },
          {
            title: 'The Hybrid Previs Fork',
            detail:
              'Determines early which scenes require gray-box Blender camera rigs versus direct image-to-video generative synthesis.',
          },
          {
            title: '3-Second Tension Intervals',
            detail:
              'Subdivides sequences into 3-second narrative beats matching current generative AI temporal coherence windows.',
          },
        ],
      },
      odiCaseStudy: {
        title: 'How Odi Mapped Bingäa',
        summary:
          'Deconstructing the initial Leuven snow dance script and 18 comic panels of Bingäa.',
        deepDiveNarrative:
          'Odi began by writing the narrative core—a poetic sequence exploring isolation, monolithic ruins, and the celestial return to Bingäa. Rather than prompting scenes blindly, Odi hand-drafted 18 key comic panels establishing camera angles, character proportions, and atmospheric mist densities. This storyboard blueprint served as the non-negotiable anchor for every subsequent 3D setup and AI video pass.',
        previewThumbnails: [
          { img: bingaaComicCover, caption: 'Bingäa Comic Book Cover & Visual Beat Sheet' },
          { img: stage01Img, caption: 'Cosmic Core Descent 2.39:1 Storyboard Blueprint' },
        ],
      },
      masterAsset: {
        title: 'Bingäa Storyboard Blueprint PDF Package',
        fileName: 'Bingäa_Issue01_Director_Script.pdf',
        fileSize: '12.4 MB',
        fileFormat: 'PDF Document (Vector + 300 DPI)',
        vaultPath: 'Drive / 01_PreProduction_Storyboards / Bingaa_Comic_Script_Breakdown',
        description: 'Official 18-panel director breakdown with scene annotations, camera focal notes, and timing charts.',
        specs: [
          { key: 'Framing Ratio', val: '2.39:1 CinemaScope Anamorphic' },
          { key: 'Panel Count', val: '18 Director Plates' },
          { key: 'Format', val: 'Print-Ready Vector PDF + 300 DPI' },
          { key: 'Access Tier', val: 'Locked · Jan 9, 2027 (Annual Pass)' },
        ],
      },
      technicalSpecs: [
        { label: 'Aspect Ratio', value: '2.39:1 Anamorphic' },
        { label: 'Camera Lens', value: '35mm / 50mm Prime' },
        { label: 'Temporal Window', value: '3.0s coherent beats' },
        { label: 'Primary Engine', value: 'Gemini Lore + 2D Figma' },
      ],
    },
    {
      id: 2,
      stageNumber: '02',
      tag: 'ART DIRECTION',
      navLabel: 'Art Direction',
      richIcon: '🎨',
      timeframe: 'WEEK 02 · AESTHETIC FOUNDATION',
      title: 'Art Direction & Character Locking',
      subtitle: 'Multi-modal conditioning and character turnaround sheets',
      vaultFolderMapping: '02 · Art Direction',
      isAdvancedLocked: true,
      heroImage: millLockingImg,
      heroImageAlt: 'Character locking hero visual featuring Mill in biological exploration suit (MiLLLL.PNG)',
      themeDescription: 'Master character locking turnaround plate (MiLLLL.PNG)',
      millTransmission:
        'Style drift is the silent killer of AI cinema! Anchor your character sheets and color palettes before rendering a single final frame.',
      millProTip:
        'Inject reference turnaround plates into image-to-image conditioning nodes at 0.65 to 0.75 denoising strength.',
      universalTheory: {
        heading: 'Asset-First Art Direction & Multi-Modal Anchoring',
        description:
          'Generative diffusion models naturally regress toward generic averages unless anchored by high-resolution reference assets with strict chromatic constraints.',
        bullets: [
          {
            title: 'Turnaround Model Sheets',
            detail:
              'Generate 360-degree turnaround views (front, 3/4, side, rear) for all hero characters, suits, and hero props.',
          },
          {
            title: 'Multi-Modal Conditioning',
            detail:
              'Bind master reference imagery directly into conditioning latents, ensuring facial geometry and suit fabrics remain identical across cuts.',
          },
          {
            title: 'Three-Tone Chromatic Restraint',
            detail:
              'Enforce a strict 3-color palette (e.g., #00f2fe Cyan Galaxy, #b142f0 Purple Void Nebula, #404040 Obsidian Grey) to prevent digital rainbow artifacts.',
          },
        ],
      },
      odiCaseStudy: {
        title: 'Locking the Äkinoya Style & Core Cast',
        summary: 'How Mill, Odi, and Sillow were locked using high-resolution turnaround plates.',
        deepDiveNarrative:
          'To achieve a signature aesthetic across hundreds of experimental generation passes, Odi locked three foundational character reference sheets from the Character Locking vault: Mill in her environmental bio-analyst suit (MiLLLL.PNG), Odi in tactical mechanic reconnaissance armor (Odi.JPG), and Sillow as the lead planetary explorer (Sillow.JPG). Character sheets were formalized, freezing their visors, harnesses, and cyan/purple palette swatches.',
        previewThumbnails: [
          { img: millLockingImg, caption: 'Mill Lead Bio-Analyst Master Turnaround (MiLLLL.PNG)' },
          { img: odiLockingImg, caption: 'Odi Scout Mechanic Turnaround (Odi.JPG)' },
          { img: sillowLockingImg, caption: 'Sillow Lead Explorer Turnaround (Sillow.JPG)' },
        ],
      },
      characterDownloads: [
        {
          name: 'Mill — Lead Bio-Analyst Master Plate',
          fileName: 'MilLLL.PNG',
          size: '6.7 MB',
          format: '4K UHD Lossless PNG',
          img: millLockingImg,
          downloadUrl: '',
          description: 'Master lossless character turnaround and visual anchor plate for Mill with environmental bio-analyst suit and cyan visor.',
        },
        {
          name: 'Odi — Scout & Mechanic Model Sheet',
          fileName: 'Odi.JPG',
          size: '275 KB',
          format: 'High-Res JPG · 300 DPI',
          img: odiLockingImg,
          downloadUrl: '',
          description: 'Armored reconnaissance suit model plate detailing tactical harness, tool holsters, and terrain equipment.',
        },
        {
          name: 'Sillow — Lead Explorer Master Sheet',
          fileName: 'Sillow.JPG',
          size: '280 KB',
          format: 'High-Res JPG · 300 DPI',
          img: sillowLockingImg,
          downloadUrl: '',
          description: 'Master 4-angle turnaround character sheet for Sillow with cybernetic visor annotations and exploration suit Mark IV specs.',
        },
      ],
      masterAsset: {
        title: 'Äkinoya Character Locking Master Pack (Mill, Odi, Sillow)',
        fileName: 'MilLLL.PNG',
        fileSize: '7.3 MB',
        fileFormat: 'PNG + JPG Master Set',
        vaultPath: 'Drive / 02 · Art Direction & Character Anchors / Character_Sheets_Sillow_Odi_Mill',
        description: 'Complete 3-character high-resolution reference locking plates: MiLLLL.PNG (Mill), Odi.JPG (Odi), and Sillow.JPG (Sillow).',
        specs: [
          { key: 'Resolution', val: '4096 x 2160 (4K UHD)' },
          { key: 'Lead Character', val: 'Mill (MiLLLL.PNG)' },
          { key: 'Scout Rig', val: 'Odi (Odi.JPG)' },
          { key: 'Explorer Sheet', val: 'Sillow (Sillow.JPG)' },
        ],
      },
      technicalSpecs: [
        { label: 'Conditioning Denoise', value: '0.65 – 0.72' },
        { label: 'Palette Swatches', value: '#00f2fe / #b142f0' },
        { label: 'Character Locking', value: 'Mill, Odi, Sillow' },
        { label: 'Diffusion Model', value: 'Imagen 3 Multi-Modal' },
      ],
    },
    {
      id: 3,
      stageNumber: '03',
      tag: 'AUDIO & DAW',
      navLabel: 'Audio & DAW',
      richIcon: '🎵',
      timeframe: 'WEEK 03 · SONIC MASTERING',
      title: 'Studio Audio Masters & DAW Templates',
      subtitle: 'Uncompressed 24-bit 96kHz audio masters and Ableton Live .als projects',
      vaultFolderMapping: '03 · Audio Masters',
      isAdvancedLocked: true,
      heroImage: stage05Img,
      heroImageAlt: 'Studio audio master visualizer and Ableton modular synthesis chain',
      themeDescription: 'Studio audio masters & Ableton modular synthesis DAW templates (Sillow Mill Audio)',
      millTransmission:
        'Sound is half the cinematic picture! Low-frequency modular drones and analog synthesizers give the Äkinoya universe its true weight.',
      millProTip:
        'Anchor your sub-bass fundamental to 432Hz harmonic tuning to complement volumetric cosmic visuals.',
      universalTheory: {
        heading: 'Cinematic Sonic Architecture & Stem Groups',
        description:
          'A cinematic sci-fi world requires tactile sonic engineering. Stems are grouped into Sub-Bass, Analog Arp, Modular Drones, and Granular Atmospheric FX.',
        bullets: [
          {
            title: '24-bit / 96kHz Resolution',
            detail:
              'Preserves extreme dynamic headroom and high-frequency harmonics essential for theatrical space acoustics.',
          },
          {
            title: 'Modular DAW Routing',
            detail:
              'Pre-configured Ableton Live .als project files with routing for analog saturation, tape delays, and sidechain compression.',
          },
          {
            title: 'Atmospheric Granular Textures',
            detail:
              'Real physical foley layered with granular resynthesis, echoing the crystalline winds of Bingäa.',
          },
        ],
      },
      odiCaseStudy: {
        title: 'Mastering the Teaser Soundtrack at 128 BPM',
        summary: 'How analog synthesis and sub-bass drones were sculpted in Ableton Live.',
        deepDiveNarrative:
          'Odi crafted the official Sillow Mill sonic identity using vintage analog synths and granular foley. The main teaser audio was mastered at 96kHz with distinct stem groups. Community members can inspect the full DAW arrangement and audition uncompressed masters directly in the vault.',
        previewThumbnails: [
          { img: stage05Img, caption: 'Studio Audio Master Console & ACEScc Monitor' },
        ],
      },
      masterAsset: {
        title: 'Sillow Mill Studio Audio Master & Ableton Pack',
        fileName: 'Sillow_Mill_Teaser_Audio_Master_96kHz.wav',
        fileSize: '185 MB',
        fileFormat: '24-bit 96kHz WAV + .als Project',
        vaultPath: 'Drive / 03 · Audio Masters & DAW Templates',
        description: 'Uncompressed master recording and Ableton Live 11/12 project template with operator chains and stem groups.',
        specs: [
          { key: 'Audio Resolution', val: '24-bit / 96kHz Stereo' },
          { key: 'Tempo / Key', val: '128 BPM / D-Minor' },
          { key: 'DAW Template', val: 'Ableton Live 11.3+ / 12' },
          { key: 'Access Tier', val: 'Paid Monthly Subscriber / VIP' },
        ],
      },
      technicalSpecs: [
        { label: 'Sample Rate', value: '96,000 Hz 24-bit' },
        { label: 'Tuning Reference', value: '432 Hz Celestial' },
        { label: 'DAW Engine', value: 'Ableton Live Studio' },
        { label: 'Stem Groups', value: '5 Discrete Bands' },
      ],
    },
    {
      id: 4,
      stageNumber: '04',
      tag: '3D PREVIS',
      navLabel: '3D Previs',
      richIcon: '🧊',
      timeframe: 'WEEK 04 · KINEMATIC STAGING',
      title: 'Blender 3D Previs & Motion Control',
      subtitle: 'Gray-box camera rigs, lens physics, and depth-map conditioning',
      vaultFolderMapping: '04 · 3D Previs & Rigs',
      isAdvancedLocked: true,
      heroImage: stage03Img,
      heroImageAlt: '3D wireframe & gray-box spaceship cockpit staging with cyan volumetric light',
      themeDescription: '3D wireframe & gray-box spaceship cockpit staging with cyan volumetric light (Gemini/Imagen 3)',
      millTransmission:
        'Never let generative AI hallucinate camera trajectories! Animate a gray-box in Blender first, render a depth pass, and let AI illuminate the frame.',
      millProTip:
        'Lock virtual camera focal lengths to 35mm anamorphic prime lenses with fixed sensor dimensions matching ARRI Alexa LF.',
      universalTheory: {
        heading: 'Kinematic 3D Geometry as Generative Conditioning',
        description:
          'Generative video models lack intrinsic three-dimensional spatial awareness. By staging scenes in Blender 3D first, creators enforce mathematically perfect camera moves.',
        bullets: [
          {
            title: 'Gray-Box Mesh Proxies',
            detail:
              'Low-polygon structural proxies define walls, ship canopies, and cockpit chairs, providing exact collision and occlusion boundaries.',
          },
          {
            title: 'Z-Depth & Normal Pass Ingestion',
            detail:
              'Render 16-bit Z-depth and surface normal passes from Blender Cycles to guide ControlNet video generation without temporal tearing.',
          },
          {
            title: 'Camera Velocity Matching',
            detail:
              'Smooth acceleration curves (CAM_TRAJ_A and VEL_PATH) prevent erratic camera jumps that destroy cinematic immersion.',
          },
        ],
      },
      odiCaseStudy: {
        title: 'Ship Warp Sequences & Cockpit Lighting Dynamics',
        summary: 'Deconstructing the 3D cockpit rig and warp velocity transitions.',
        deepDiveNarrative:
          'For the intense approach toward Bingäa, Odi modeled a high-precision cockpit gray-box in Blender. The camera was animated traversing along a forward trajectory with subtle cockpit chassis vibration. Odi extracted the 16-bit depth pass and fed it into the AI video engine, ensuring the cockpit canopy remained razor-sharp while the hyperspace streak blurred outside.',
        previewThumbnails: [
          { img: stage03Img, caption: 'Blender 3.6+ Cockpit Previs & Camera Tracker Gizmos' },
          { img: visualizerThumbnailImg, caption: 'Cinematic Visualizer Final Cockpit Composite' },
        ],
      },
      masterAsset: {
        title: 'Warp Previs .blend Scene Archive',
        fileName: 'Cockpit_Camera_Velocity_Rig.blend',
        fileSize: '148 MB',
        fileFormat: '.blend File (Blender 3.6 LTS / 4.2)',
        vaultPath: 'Drive / 04 · Blender 3D Previs & Cockpit Rigs',
        description: 'Complete Blender 3.6+ project containing animated cockpit geometry, camera rigs, and depth render passes.',
        specs: [
          { key: 'Software', val: 'Blender 3.6 LTS / 4.2' },
          { key: 'Render Engine', val: 'Cycles / Eevee Next' },
          { key: 'Camera Tracker', val: 'Baked Kinematic Curves' },
          { key: 'Access Tier', val: 'Locked · Jan 9, 2027 (Subscribers)' },
        ],
      },
      technicalSpecs: [
        { label: 'Virtual Lens', value: '35mm Anamorphic Prime' },
        { label: 'Pass Formats', value: '16-bit Z-Depth + Normals' },
        { label: 'Frame Rate', value: '24.000 FPS Cinematic' },
        { label: 'Rig Trajectory', value: 'CAM_TRAJ_A / VEL_PATH' },
      ],
    },
    {
      id: 5,
      stageNumber: '05',
      tag: 'PROMPTS & FINISHING',
      navLabel: 'Prompt Engine',
      richIcon: '⚡',
      timeframe: 'WEEK 05 · GENERATIVE PRECISION',
      title: 'Prompt Engineering Bibles & LUTs',
      subtitle: 'The 4-block syntax token pipeline for Gemini & Imagen generative engines',
      vaultFolderMapping: '05 · Prompt Bibles',
      isAdvancedLocked: true,
      heroImage: stage04Img,
      heroImageAlt: 'Cybernetic data-stream interface showing 4-block structured syntax tokens',
      themeDescription: 'Cybernetic data-stream interface showing 4-block structured syntax tokens (Gemini/Imagen 3)',
      millTransmission:
        'Random prompts yield random results! Master prompts treat language like structured parameter code grouped into four functional partitions.',
      millProTip:
        'Always specify negative constraints to suppress plastic digital skin, oversaturated neon, and warped geometry.',
      universalTheory: {
        heading: 'The 4-Block Structured Prompt Architecture',
        description:
          'Modern generative models respond with highest coherence when prompts are partitioned into clear semantic domains rather than prose paragraphs.',
        bullets: [
          {
            title: '[01_SUBJECT_ACTION]',
            detail:
              'Defines core actor, posture, spatial movement, and environmental interaction with zero stylistic fluff.',
          },
          {
            title: '[02_LIGHTING_ATMOSPHERE]',
            detail:
              'Dictates key-to-fill ratio, volumetric mist, color temperature, and specific rim light hues (#00f2fe, #b142f0).',
          },
          {
            title: '[03_CAMERA_OPTICS_2.39:1]',
            detail:
              'Specifies optical physics: Panavision C-series anamorphic flare, shallow depth of field, 35mm film grain, shutter angle.',
          },
          {
            title: '[04_NEGATIVE_CONSTRAINTS]',
            detail:
              'Explicitly excludes digital plastic shaders, deformed geometry, lens distortion artifacts, and over-sharpening.',
          },
        ],
      },
      odiCaseStudy: {
        title: 'Master Prompt Templates for Äkinoya & Bingäa',
        summary: 'The exact syntax tables used across Gemini 1.5 Pro and Imagen 3.',
        deepDiveNarrative:
          'Odi developed a centralized JSON prompt repository where every scene was mapped into standardized 4-block templates. By locking Block 2 (Lighting & Palette) and Block 3 (Camera Optics), Odi could swap Block 1 (Subject) while retaining 100% visual and optical uniformity across every render.',
        previewThumbnails: [
          { img: stage04Img, caption: 'Cybernetic Prompt Terminal & Token Weight Nodes' },
          { img: akinoyaPlanetImg, caption: 'Final 4K Master Deliverable Frame' },
        ],
      },
      masterAsset: {
        title: 'Master Prompt Vault .json & DaVinci LUT Pack',
        fileName: 'Master_Prompt_Vault_120_Templates.json',
        fileSize: '90.7 MB',
        fileFormat: '.json Database + .cube 3D LUTs',
        vaultPath: 'Drive / 05_Prompt_Engineering_Bibles',
        description: 'Over 120 production-tested prompt templates, negative token weight tables, and ACEScc 3D LUT cubes.',
        specs: [
          { key: 'Templates', val: '120+ Scene Formulas' },
          { key: 'Color LUTs', val: '65x65x65 .cube ACEScc' },
          { key: 'Engines', val: 'Gemini 1.5 / Imagen 3' },
          { key: 'Access Tier', val: 'Locked · Jan 9, 2027 (Subscribers)' },
        ],
      },
      technicalSpecs: [
        { label: 'Prompt Formula', value: '4-Block Semantic Syntax' },
        { label: 'Negative Weighting', value: '-1.85 Artifact Suppression' },
        { label: 'Color Space', value: 'ACEScc v1.3 DaVinci' },
        { label: 'Seed Locking', value: 'Strict Deterministic Seeds' },
      ],
    },
  ];

  // Stage Selection Handler (Directly opens Stage Deep-Dive Modal for all users)
  const handleOpenStageModal = (stage: StageDetail) => {
    soundManager.playTone(580, 0.05);
    setSelectedStageForModal(stage);
  };

  // Asset Vault Action Handler (Navigates internally to Drive Asset Vault)
  const handleDownloadAsset = (stage: StageDetail) => {
    soundManager.playTone(720, 0.09);
    try {
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#00f2fe', '#fbbf24', '#b142f0'],
      });
    } catch {
      // Confetti fallback
    }

    // Close deep-dive modal to smoothly transition to vault
    setSelectedStageForModal(null);

    const folderId = VAULT_STAGE_FOLDER_IDS[stage.stageNumber] || 'folder-01';
    if (onNavigateToVault) {
      onNavigateToVault(folderId);
    }
  };

  const handleDownloadCustomFile = (_url: string, _fileName: string) => {
    soundManager.playTone(720, 0.09);
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#00f2fe', '#fbbf24', '#b142f0'],
      });
    } catch {
      // Fallback
    }

    setSelectedStageForModal(null);
    if (onNavigateToVault) {
      onNavigateToVault('folder-02');
    }
  };

  return (
    <div className="relative w-full text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Cosmic Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-cyan-600/10 via-purple-600/10 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-2/3 left-1/3 w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* ======================================================== */}
        {/* WELCOMING INTAKE BANNER & WORKFLOW-ASSET MAPPING          */}
        {/* ======================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl bg-gradient-to-r from-[#0d1326]/95 via-[#0a0f1d]/90 to-[#070a14]/98 border border-cyan-500/30 p-5 sm:p-6 shadow-[0_0_35px_rgba(0,242,254,0.12)] overflow-hidden space-y-4"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 font-bold tracking-wider flex items-center gap-1 shadow-sm">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  ÄKINOYA LABS · ARCHITECTURE &amp; VAULT DIRECTORY
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-400/40 text-purple-300 font-bold tracking-wider">
                  PRODUCTION PIPELINE
                </span>
                {isMember ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-bold tracking-wider flex items-center gap-1">
                    <Crown className="w-3 h-3 text-emerald-400" />
                    PAID SUBSCRIBER ACTIVE
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300/90 font-semibold tracking-wider flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    VIEW-ONLY PREVIEWS · GATED JAN 9, 2027
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-black text-white tracking-tight leading-tight">
                The <em>Äkinoya</em> &amp; <em>Bingäa</em> Production Pipeline
              </h1>

              <p className="text-xs sm:text-sm text-white/75 font-sans leading-relaxed">
                Welcome to the creative engine of Sillow Mill. This 5-stage roadmap is the exact
                battle-tested hybrid AI &amp; Blender workflow developed to produce the <em>Äkinoya</em> cinematic
                universe and <em>Bingäa</em> narrative. Every stage below maps <strong>1-to-1</strong> with
                production deliverables inside our <strong>Drive Asset Vault</strong>.
              </p>
            </div>

            {/* Compact Mill Guide Callout */}
            <div className="shrink-0 flex items-center gap-3 p-3 px-4 rounded-2xl bg-black/60 border border-cyan-500/30 self-start lg:self-auto max-w-sm">
              <div className="relative shrink-0">
                <img
                  src={millAvatar}
                  alt="Mill"
                  className="w-10 h-10 rounded-xl object-cover border-2 border-cyan-400 shadow-[0_0_12px_rgba(0,242,254,0.4)]"
                />
                <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 border border-black" />
              </div>
              <div className="text-[11px] leading-snug font-sans">
                <span className="font-mono font-bold text-cyan-300 block">Mill (Pipeline Guide):</span>
                <span className="text-white/80">
                  &ldquo;Inspect timeline specifications freely. All full asset downloads &amp; master archives unlock on January 9, 2027.&rdquo;
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[11px] font-mono text-white/60">
              Master project files, Blender 3D rigs, DAW stems, and PDFs are organized inside the Sillow Mill Production Vault.
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundManager.playTone(580, 0.05);
                  if (onNavigateToVault) onNavigateToVault('folder-01');
                }}
                className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold text-xs tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(0,242,254,0.3)] flex items-center justify-center gap-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>VIEW ASSET VAULT →</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Strict 100% Asset Vault Locking Notice Banner */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-950/60 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-bold tracking-wide">
              🔒 ANNUAL PASS REQUIRED — Downloads unlock for Paid Annual Members on January 9, 2027 (€60/year).
            </span>
          </div>
          <span className="text-[10px] text-amber-400/90 font-bold tracking-wider shrink-0 uppercase">
            STAGES 01–05 LOCKED PRIOR TO LAUNCH
          </span>
        </div>

        {/* ======================================================== */}
        {/* MOBILE STICKY STAGE FAST-JUMP BAR (< 768px)              */}
        {/* ======================================================== */}
        <div className="md:hidden sticky top-2 z-40 my-2 flex justify-center w-full px-2 pointer-events-none">
          <div className="pointer-events-auto backdrop-blur-xl bg-black/85 border border-cyan-500/40 rounded-full px-2 py-1 shadow-[0_4px_30px_rgba(0,242,254,0.25)] flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full">
            {STAGES.map((s) => {
              const isActive = activeStageId === s.id;
              const isLocked = s.isAdvancedLocked && !isMember;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleJumpToStage(s.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,242,254,0.7)] font-extrabold scale-105'
                      : isLocked
                      ? 'bg-white/5 hover:bg-white/10 text-white/50 border border-white/10'
                      : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10'
                  }`}
                >
                  <span>{s.richIcon} {s.stageNumber}</span>
                  {isLocked && <Lock className="w-2.5 h-2.5 text-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* UNIFIED 5-STAGE ROADMAP (INTEGRATED SINGLE SIDEBAR)      */}
        {/* ======================================================== */}
        <div className="w-full">
          {/* ====================================================== */}
          {/* MAIN ROADMAP CARDS & WEAVING FOOTSTEPS                  */}
          {/* ====================================================== */}
          <div className="relative space-y-10 sm:space-y-12">
            {/* Desktop Center Glowing Cyan Guide Line (Hidden on Mobile) */}
            <div className="hidden md:block absolute left-1/2 top-10 bottom-24 w-1 -translate-x-1/2 bg-gradient-to-b from-cyan-400 via-purple-500 to-cyan-500/40 rounded-full shadow-[0_0_15px_rgba(0,242,254,0.5)] z-0 pointer-events-none" />

            {STAGES.map((stage, index) => {
              const isStageLocked = stage.isAdvancedLocked && !isMember;
              const isEven = index % 2 === 0;

              return (
                <div
                  key={stage.id}
                  id={`stage-${stage.id}`}
                  className={`relative z-10 pt-4 pb-6 transition-all duration-300 ${
                    isStageLocked ? 'group/locked' : 'group/active'
                  }`}
                >
                  {/* Desktop Center Node Footstep Marker (Hidden on Mobile) */}
                  <div className="hidden md:flex absolute left-1/2 top-10 -translate-x-1/2 -translate-y-1/2 z-20 flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenStageModal(stage)}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                        isStageLocked
                          ? 'bg-[#090b14] border-2 border-amber-500/40 shadow-none hover:scale-105'
                          : 'bg-[#090e1c] border-2 border-cyan-400 shadow-[0_0_20px_rgba(0,242,254,0.6)] hover:scale-110'
                      }`}
                      title={isStageLocked ? 'Stage Locked (Subscribers Only)' : `Open Stage ${stage.stageNumber} Deep-Dive`}
                    >
                      {isStageLocked ? (
                        <Lock className="w-5 h-5 text-amber-400" />
                      ) : (
                        <FootstepIcon className="w-6 h-6" isActive pulse />
                      )}
                    </button>
                    <span className="hidden md:inline-block px-2 py-0.5 rounded bg-black/80 border border-white/20 text-[10px] font-mono font-bold text-white/60">
                      STAGE {stage.stageNumber}
                    </span>
                  </div>

                  {/* Mobile-Only Top Accent Footstep Badge */}
                  <div className="md:hidden flex items-center justify-between gap-2 p-3 rounded-2xl bg-[#090e1c]/90 border border-cyan-500/40 mb-3 shadow-[0_0_15px_rgba(0,242,254,0.15)]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center shrink-0">
                        <FootstepIcon className="w-4 h-4" isActive pulse />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-mono font-bold text-cyan-300 block truncate">
                          STAGE {stage.stageNumber} · {stage.richIcon} {stage.navLabel}
                        </span>
                        <span className="text-[10px] font-mono text-white/50 block truncate">
                          {stage.timeframe}
                        </span>
                      </div>
                    </div>

                    {isStageLocked ? (
                      <button
                        type="button"
                        onClick={() => handleOpenStageModal(stage)}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white/90 text-[10.5px] font-mono font-bold cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        <Lock className="w-2.5 h-2.5 text-amber-400" />
                        <span>Inspect Stage</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenStageModal(stage)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-400 text-black text-[10.5px] font-mono font-bold cursor-pointer shrink-0"
                      >
                        Deep Dive →
                      </button>
                    )}
                  </div>

                  {/* Full-Width Mobile Cards & Staggered Desktop Layout */}
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-14 items-center">
                    {/* Visual Card Column (Hidden on Mobile for Stage 01 for Clean Text Layout) */}
                    <div className={`space-y-4 ${isEven ? 'md:order-1' : 'md:order-2'} ${stage.id === 1 ? 'hidden md:block' : ''}`}>
                      <div
                        onClick={() => handleOpenStageModal(stage)}
                        className={`relative rounded-3xl overflow-hidden border transition-all cursor-pointer shadow-[0_4px_35px_rgba(0,0,0,0.7)] ${
                          isStageLocked
                            ? 'bg-black/60 border-white/10 hover:border-amber-400/40 opacity-70 hover:opacity-85'
                            : 'bg-black/80 border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_35px_rgba(0,242,254,0.25)] hover:scale-[1.01]'
                        }`}
                      >
                        {/* Bespoke 16:9 Gemini/Imagen Visual Banner */}
                        <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/90 group/banner">
                          <img
                            src={stage.heroImage}
                            alt={stage.heroImageAlt}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover/banner:scale-105 opacity-85 group-hover/banner:opacity-100"
                          />
                          <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                          {/* Top Overlay Badges (Hidden on mobile < md to keep render 100% clean & unobscured) */}
                          <div className="hidden md:flex absolute top-4 left-4 right-4 items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-cyan-400 text-black font-mono font-extrabold text-xs tracking-wider shadow-md">
                                STAGE {stage.stageNumber}
                              </span>
                              <span className="text-[10.5px] font-mono px-2.5 py-0.5 rounded bg-black/70 border border-cyan-400/40 text-cyan-300 font-bold uppercase tracking-wider">
                                {stage.tag}
                              </span>
                            </div>

                            {isStageLocked ? (
                              <span className="text-[10.5px] font-mono px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-bold flex items-center gap-1.5 shadow-sm">
                                <Lock className="w-3 h-3 text-amber-400" />
                                LOCKED · JAN 9, 2027
                              </span>
                            ) : (
                              <span className="text-[10.5px] font-mono px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 font-bold flex items-center gap-1 shadow-sm">
                                <Eye className="w-3 h-3" />
                                DEEP-DIVE MODAL
                              </span>
                            )}
                          </div>

                          {/* Bottom Overlay Title & Action Indicator (Hidden on mobile < md) */}
                          <div className="hidden md:flex absolute bottom-4 left-4 right-4 items-end justify-between">
                            <div className="space-y-0.5 max-w-[80%]">
                              <span className="text-[10px] font-mono text-cyan-300/80 uppercase tracking-wider">
                                {stage.timeframe}
                              </span>
                              <h3 className="text-base sm:text-xl font-display font-bold text-white leading-tight">
                                {stage.title}
                              </h3>
                            </div>

                            <div className="w-9 h-9 rounded-xl bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 group-hover/banner:bg-cyan-400 group-hover/banner:text-black transition-all">
                              <ChevronRight className="w-5 h-5" />
                            </div>
                          </div>
                        </div>

                        {/* Card Body Brief */}
                        <div className="p-4 sm:p-5 space-y-3">
                          {/* Mobile-Only Header Block (Positioned neatly below visual container) */}
                          <div className="md:hidden space-y-1.5 pb-2 border-b border-white/10">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded bg-cyan-400 text-black font-mono font-extrabold text-[10px] tracking-wider shadow-sm">
                                  STAGE {stage.stageNumber}
                                </span>
                                <span className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-black/60 border border-cyan-400/40 text-cyan-300 font-bold uppercase">
                                  {stage.tag}
                                </span>
                              </div>
                              {isStageLocked ? (
                                <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                                  LOCKED
                                </span>
                              ) : (
                                <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 font-bold flex items-center gap-1">
                                  <Eye className="w-2.5 h-2.5" />
                                  DEEP DIVE
                                </span>
                              )}
                            </div>
                            <div className="space-y-0.5 pt-0.5">
                              <span className="text-[9.5px] font-mono text-cyan-300/80 uppercase tracking-wider block">
                                {stage.timeframe}
                              </span>
                              <h3 className="text-base font-display font-bold text-white leading-tight">
                                {stage.title}
                              </h3>
                            </div>
                          </div>

                          <p className="text-xs sm:text-sm text-white/70 font-sans leading-relaxed">
                            {stage.subtitle}
                          </p>

                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              soundManager.playTone(720, 0.08);
                              const folderId = VAULT_STAGE_FOLDER_IDS[stage.stageNumber] || 'folder-01';
                              if (onNavigateToVault) onNavigateToVault(folderId);
                            }}
                            className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono cursor-pointer hover:text-cyan-300 transition-colors"
                          >
                            <span className="text-cyan-300 font-semibold flex items-center gap-1.5 truncate mr-2">
                              <Sparkles className="w-3.5 h-3.5 shrink-0" />
                              📁 Vault Folder: {stage.vaultFolderMapping}
                            </span>
                            <span className="text-white/70 hover:text-cyan-400 underline shrink-0 font-bold">
                              VIEW ASSET VAULT →
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Narrative & Master Asset Brief Column */}
                    <div className={`space-y-4 ${isEven ? 'md:order-2' : 'md:order-1'}`}>
                      <div className="p-6 rounded-3xl bg-[#0a0f1d]/80 border border-cyan-500/20 space-y-4">
                        <div className="flex items-center gap-2">
                          <img
                            src={millAvatar}
                            alt="Mill"
                            loading="lazy"
                            decoding="async"
                            className="w-9 h-9 rounded-xl object-cover border border-cyan-400 shrink-0"
                          />
                          <div>
                            <div className="text-[11px] font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                              MILL&apos;S DIRECTIVE
                              <FootstepIcon className="w-3.5 h-3.5" isActive />
                            </div>
                            <span className="text-[10px] font-mono text-white/50">
                              STAGE {stage.stageNumber} ARCHITECTURE
                            </span>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-white/80 font-sans italic leading-relaxed">
                          &ldquo;{stage.millTransmission}&rdquo;
                        </p>

                        {/* Master Asset Delivery Spec Box (Clean, No Uploader) */}
                        <div className="p-3.5 rounded-2xl bg-black/50 border border-cyan-500/30 space-y-2">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <FolderDown className="w-3.5 h-3.5 text-cyan-400" />
                              Deliverable Asset
                            </span>
                            <span className="text-cyan-300 font-semibold">{stage.masterAsset.fileSize}</span>
                          </div>
                          <p className="text-[11.5px] text-white/70 font-sans">
                            {stage.masterAsset.title} ({stage.masterAsset.fileFormat})
                          </p>
                        </div>

                        {/* Milestone Card Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playTone(720, 0.08);
                              const folderId = VAULT_STAGE_FOLDER_IDS[stage.stageNumber] || 'folder-01';
                              if (onNavigateToVault) onNavigateToVault(folderId);
                            }}
                            className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,242,254,0.3)]"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>VIEW ASSET VAULT →</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenStageModal(stage)}
                            className="w-full sm:w-auto py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {isStageLocked ? (
                              <>
                                <Lock className="w-3.5 h-3.5 text-amber-400" />
                                <span>Inspect Stage</span>
                              </>
                            ) : (
                              <>
                                <span>Inspect Stage</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Midway Checkpoint: 50% Member Wall Banner after Stage 03 */}
                  {stage.id === 3 && (
                    <div className="relative my-12 sm:my-16 z-30">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="relative rounded-3xl bg-gradient-to-b from-[#0a0f20]/95 via-[#070b18]/95 to-[#050711]/98 border-2 border-cyan-400/60 p-6 sm:p-10 shadow-[0_0_60px_rgba(0,242,254,0.2)] overflow-hidden text-center space-y-6"
                      >
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-400/60 text-cyan-300 font-mono text-xs font-extrabold tracking-wider shadow-[0_0_15px_rgba(0,242,254,0.3)]">
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>THE ÄKINOYA MEMBER WALL · PAID SUBSCRIBER GATE</span>
                        </div>

                        <div className="space-y-2 max-w-3xl mx-auto">
                          <h2 className="text-2xl sm:text-4xl font-display font-black text-white tracking-tight">
                            Full Asset Downloads &amp; Advanced Stages Release{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-amber-300">
                              January 9, 2027
                            </span>
                          </h2>
                          <p className="text-xs sm:text-base text-white/75 font-sans leading-relaxed">
                            All users have view-only access to inspect the professional theory and
                            visual specifications across all 5 workflow stages. Master 3D Blender camera rigs,
                            master prompt databases, and DaVinci color LUTs unlock on{' '}
                            <strong>January 9, 2027</strong>.
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

                      </motion.div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* COMPREHENSIVE STAGE DEEP-DIVE MODAL (NO UPLOADERS)        */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedStageForModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStageForModal(null)}
              className="fixed inset-0 bg-black/95"
            />

            {/* Modal Dialog Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#070b16] border border-cyan-400/50 shadow-[0_0_80px_rgba(0,242,254,0.25)] z-10 text-white font-sans space-y-6 p-6 sm:p-8"
            >
              {/* Sticky Modal Header Bar */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-lg bg-cyan-400 text-black font-mono font-extrabold text-xs tracking-wider shadow-[0_0_12px_rgba(0,242,254,0.4)]">
                    STAGE {selectedStageForModal.stageNumber}
                  </span>
                  <span className="text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider">
                    {selectedStageForModal.tag}
                  </span>
                  <span className="hidden sm:inline text-xs font-mono text-white/50">
                    · {selectedStageForModal.timeframe}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundManager.playTone(440, 0.05);
                    setSelectedStageForModal(null);
                  }}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Hero Visual & Banner */}
              <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 group/hero aspect-[21/9] sm:aspect-[2.39/1] bg-black/90">
                <img
                  src={selectedStageForModal.heroImage}
                  alt={selectedStageForModal.heroImageAlt}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex items-end p-5">
                  <div className="space-y-1 w-full">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/70 border border-cyan-400/40 text-cyan-300">
                      BESPOKE GEMINI / IMAGEN 3 PIPELINE VISUAL
                    </span>
                    <h2 className="text-xl sm:text-3xl font-display font-extrabold text-white">
                      {selectedStageForModal.title}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPreviewImage(selectedStageForModal.heroImage)}
                  className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black/90 border border-white/20 text-white font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Expand Visual</span>
                </button>
              </div>

              {/* Mill's Dialogue Banner inside Modal */}
              <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 flex items-start gap-4">
                <img
                  src={millAvatar}
                  alt="Mill"
                  className="w-12 h-12 rounded-xl object-cover border-2 border-cyan-400 shrink-0 shadow-[0_0_12px_rgba(0,242,254,0.4)]"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-300">
                      MILL&apos;S DIRECTIVE &amp; PRO TIP
                    </span>
                    <FootstepIcon className="w-3.5 h-3.5" isActive />
                  </div>
                  <p className="text-xs sm:text-sm text-cyan-100/90 font-sans leading-relaxed">
                    &ldquo;{selectedStageForModal.millTransmission}&rdquo;
                  </p>
                  <p className="text-[11px] text-cyan-300 font-mono">
                    💡 Pro Tip: {selectedStageForModal.millProTip}
                  </p>
                </div>
              </div>

              {/* Two-Column Deep-Dive Content: Theory vs Case Study */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Column 1: Universal Workflow Theory */}
                <div className="p-6 rounded-2xl bg-black/60 border border-white/10 space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-mono font-bold text-white tracking-wider uppercase">
                      Universal Production Theory
                    </h3>
                  </div>

                  <h4 className="text-base font-display font-bold text-cyan-200">
                    {selectedStageForModal.universalTheory.heading}
                  </h4>

                  <p className="text-xs sm:text-sm text-white/75 font-sans leading-relaxed">
                    {selectedStageForModal.universalTheory.description}
                  </p>

                  <div className="space-y-3 pt-2">
                    {selectedStageForModal.universalTheory.bullets.map((b) => (
                      <div key={b.title} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                        <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-cyan-400" />
                          {b.title}
                        </span>
                        <p className="text-xs text-white/70 font-sans leading-relaxed pl-5">
                          {b.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 2: Odi's Practical Case Study */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0c1224]/80 to-black/80 border border-purple-500/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-400" />
                      <h3 className="text-sm font-mono font-bold text-purple-200 tracking-wider uppercase">
                        Odi&apos;s Practical Case Study
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-400/30">
                      DIRECTOR VAULT
                    </span>
                  </div>

                  <h4 className="text-base font-display font-bold text-white">
                    {selectedStageForModal.odiCaseStudy.title}
                  </h4>

                  <p className="text-xs text-white/70 font-sans leading-relaxed">
                    {selectedStageForModal.odiCaseStudy.summary}
                  </p>

                  <p className="text-xs sm:text-sm text-white/80 font-sans leading-relaxed bg-black/40 p-3.5 rounded-xl border border-white/5">
                    {selectedStageForModal.odiCaseStudy.deepDiveNarrative}
                  </p>

                  {/* Case Study Image Thumbnails */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {selectedStageForModal.odiCaseStudy.previewThumbnails.map((th) => (
                      <div
                        key={th.caption}
                        onClick={() => setSelectedPreviewImage(th.img)}
                        className="relative rounded-xl overflow-hidden border border-white/10 group/thumb cursor-pointer aspect-[16/9] bg-black/70"
                      >
                        <img
                          src={th.img}
                          alt={th.caption}
                          className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                          <span className="text-[10px] font-mono text-cyan-200 truncate">
                            {th.caption}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Technical Specifications Grid */}
              <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                <span className="text-[11px] font-mono font-bold text-white/60 uppercase tracking-wider">
                  Technical Specifications &amp; Pipeline Standards
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {selectedStageForModal.technicalSpecs.map((spec) => (
                    <div key={spec.label} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-[10px] font-mono text-white/40 block">{spec.label}</span>
                      <span className="text-xs font-mono font-bold text-cyan-300">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Character Locking Download Plates (Stage 02 Custom Master Files) */}
              {selectedStageForModal.characterDownloads && (
                <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#0e1222]/90 to-black/90 border border-purple-500/40 space-y-4 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                  <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-purple-400" />
                      <h4 className="text-sm font-mono font-bold text-purple-200 tracking-wider uppercase">
                        Character Locking Vault Plates (MiLLLL.PNG · Odi.JPG · Sillow.JPG)
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-400/30">
                      3 MASTER PLATES
                    </span>
                  </div>

                  <p className="text-xs text-white/70 font-sans">
                    Official character turnaround sheets and visual anchors from the Character Locking vault, ready for direct multi-modal conditioning and pipeline study.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {selectedStageForModal.characterDownloads.map((char) => (
                      <div
                        key={char.fileName}
                        className="p-3.5 rounded-xl bg-black/60 border border-white/10 hover:border-purple-400/40 space-y-3 flex flex-col justify-between transition-all"
                      >
                        <div className="space-y-2">
                          <div
                            onClick={() => setSelectedPreviewImage(char.img)}
                            className="aspect-[4/3] rounded-lg overflow-hidden bg-black/80 border border-white/10 cursor-pointer relative group/char"
                          >
                            <img
                              src={char.img}
                              alt={char.name}
                              className="w-full h-full object-cover group-hover/char:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                              <span className="text-[9.5px] font-mono text-purple-300 truncate">
                                Click to inspect plate
                              </span>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-xs font-mono font-bold text-white">
                              <span className="truncate">{char.fileName}</span>
                              <span className="text-[10px] text-purple-300 shrink-0 font-normal">{char.size}</span>
                            </div>
                            <span className="text-[10px] font-mono text-white/50 block">{char.name}</span>
                            <p className="text-[10.5px] text-white/70 font-sans mt-1 line-clamp-2">
                              {char.description}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDownloadCustomFile(char.downloadUrl, char.fileName)}
                          className="w-full py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>VIEW ASSET VAULT →</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Master Archive Download Card (Clean UI - Uploaders Removed) */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-black/90 border border-cyan-500/40 space-y-4 shadow-[0_0_30px_rgba(0,242,254,0.15)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm sm:text-base font-mono font-extrabold text-white">
                        {selectedStageForModal.masterAsset.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-400/40 font-bold">
                        {selectedStageForModal.masterAsset.fileSize} · {selectedStageForModal.masterAsset.fileFormat}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 font-sans">
                      {selectedStageForModal.masterAsset.description}
                    </p>
                    <div className="text-[10.5px] font-mono text-cyan-400 flex items-center gap-1.5 pt-1">
                      <HardDrive className="w-3 h-3" />
                      <span>{selectedStageForModal.masterAsset.vaultPath}</span>
                    </div>
                    <div className="text-[10.5px] font-mono text-cyan-300/80 flex items-center gap-1.5 pt-0.5">
                      <FolderDown className="w-3 h-3 text-cyan-400" />
                      <span>Master archives, 3D rigs, stems &amp; PDFs are organized inside the Sillow Mill Production Vault</span>
                    </div>
                  </div>

                  {/* Download Action Button */}
                  <div className="shrink-0">
                    {isMember ? (
                      <button
                        type="button"
                        onClick={() => handleDownloadAsset(selectedStageForModal)}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold text-xs tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(0,242,254,0.4)] flex items-center justify-center gap-2"
                      >
                        <FolderOpen className="w-4 h-4" />
                        <span>VIEW ASSET VAULT →</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDownloadAsset(selectedStageForModal)}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 font-mono font-bold text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>VAULT LOCKED · PAID SUBSCRIBERS</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* File Specifications Ribbon */}
                <div className="pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  {selectedStageForModal.masterAsset.specs.map((sp) => (
                    <div key={sp.key} className="p-2 rounded-lg bg-black/40 border border-white/5">
                      <span className="text-white/40 block text-[9.5px] uppercase">{sp.key}</span>
                      <span className="text-white/90 font-bold">{sp.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal for Fullscreen Image Inspection */}
      <AnimatePresence>
        {selectedPreviewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPreviewImage(null)}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
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

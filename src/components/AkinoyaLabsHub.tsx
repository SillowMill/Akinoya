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
  X,
  ExternalLink,
  Crown,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';

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

import { BINGAA_PDF_URL, BINGAA_PDF_FILENAME } from '../utils/certificate';

export const LABS_RELEASE_DATE = new Date('2027-01-09T00:00:00Z');

export interface AkinoyaLabsHubProps {
  isMember?: boolean; // active paid monthly subscriber or VIP pass holder
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

interface StageDetail {
  id: number;
  stageNumber: string;
  tag: string;
  timeframe: string;
  title: string;
  subtitle: string;
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
  assetSlot: {
    title: string;
    fileSize: string;
    fileFormat: string;
    description: string;
    downloadUrl?: string;
    downloadFileName?: string;
    specs: Array<{ key: string; val: string }>;
  };
  technicalSpecs: Array<{ label: string; value: string }>;
  dropzoneConfig: {
    title: string;
    hint: string;
    accepts: string;
  };
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
  onOpenAuthModal,
  onNavigateVerify,
}) => {
  // Deep-Dive Modal State
  const [selectedStageForModal, setSelectedStageForModal] = useState<StageDetail | null>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const [activeStageId, setActiveStageId] = useState<number>(1);

  // Dropzone State for Sandbox Interactivity
  const [dropzones, setDropzones] = useState<Record<number, DropzoneState>>({
    1: { fileName: '', fileSize: '', status: 'idle' },
    2: { fileName: '', fileSize: '', status: 'idle' },
    3: { fileName: '', fileSize: '', status: 'idle' },
    4: { fileName: '', fileSize: '', status: 'idle' },
    5: { fileName: '', fileSize: '', status: 'idle' },
  });

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

  // Comprehensive 5-Stage Data Architecture
  const STAGES: StageDetail[] = [
    {
      id: 1,
      stageNumber: '01',
      tag: 'PRE-PRODUCTION',
      timeframe: 'WEEK 01 · NARRATIVE BEDROCK',
      title: 'Pre-Production & Storyboards',
      subtitle: 'Translating narrative scripts into 2.39:1 anamorphic storyboards',
      isAdvancedLocked: false,
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
      assetSlot: {
        title: 'Bingäa Storyboard Blueprint PDF',
        fileSize: '12.4 MB',
        fileFormat: 'PDF Document',
        description: 'Official 18-panel director breakdown with scene annotations, camera focal notes, and timing charts.',
        downloadUrl: BINGAA_PDF_URL,
        downloadFileName: BINGAA_PDF_FILENAME,
        specs: [
          { key: 'Resolution', val: 'Vector + 300 DPI Raster' },
          { key: 'Aspect Ratio', val: '2.39:1 CinemaScope' },
          { key: 'Panels', val: '18 Storyboard Plates' },
          { key: 'Access Tier', val: 'Paid Subscriber / VIP Pass' },
        ],
      },
      technicalSpecs: [
        { label: 'Aspect Ratio', value: '2.39:1 Anamorphic' },
        { label: 'Camera Lens', value: '35mm / 50mm Prime' },
        { label: 'Temporal Window', value: '3.0s coherent beats' },
        { label: 'Primary Engine', value: 'Gemini Lore + 2D Figma' },
      ],
      dropzoneConfig: {
        title: 'Community Storyboard Sandbox Dropzone',
        hint: 'Drop your storyboard PDF or image sequence to audit panel pacing',
        accepts: '.pdf, .png, .jpg, .jpeg',
      },
    },
    {
      id: 2,
      stageNumber: '02',
      tag: 'ART DIRECTION',
      timeframe: 'WEEK 02 · AESTHETIC FOUNDATION',
      title: 'Art Direction & Character Locking',
      subtitle: 'Multi-modal conditioning and character turnaround sheets',
      isAdvancedLocked: false,
      heroImage: stage02Img,
      heroImageAlt: 'Multi-modal character reference sheet featuring Sillow, Odi, and Mill',
      themeDescription: 'Multi-modal character reference sheet featuring Sillow, Odi, and Mill (Gemini/Imagen 3)',
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
        title: 'Locking the Äkinoya Style',
        summary: 'How Äkinoya.jpg and Mood.png were established as strict style anchors.',
        deepDiveNarrative:
          'To achieve a signature aesthetic across hundreds of experimental generation passes, Odi locked two foundational master images: Äkinoya.jpg for cosmic atmospheric horizons and Mood.png for interior cinematic lighting and creature anatomy. Character sheets were formalized for Sillow (Lead Explorer), Odi (Scout/Mechanic), and Mill (Bio-Analyst), freezing their visors, harnesses, and cyan/purple palette swatches.',
        previewThumbnails: [
          { img: moodboardImg, caption: 'Mood.png Primary Atmospheric Style Anchor' },
          { img: akinoyaVistaImg, caption: 'Äkinoya.jpg Twilight Planetary Horizon' },
        ],
      },
      assetSlot: {
        title: 'Äkinoya Style Anchor Pack v1',
        fileSize: '28.6 MB',
        fileFormat: 'ZIP Archive',
        description: '24 high-resolution reference anchors, character turnaround plates, and digital optical token tables.',
        downloadUrl: moodboardImg,
        downloadFileName: 'Akinoya_Style_Anchor_Pack_v1.png',
        specs: [
          { key: 'Anchors', val: '24 Reference Plates' },
          { key: 'Color Profiles', val: 'ACEScc + sRGB' },
          { key: 'Character Sheets', val: 'Sillow, Odi, Mill' },
          { key: 'Access Tier', val: 'Paid Subscriber / VIP Pass' },
        ],
      },
      technicalSpecs: [
        { label: 'Conditioning Denoise', value: '0.65 – 0.72' },
        { label: 'Palette Swatches', value: '#00f2fe / #b142f0' },
        { label: 'Character Rigs', value: 'Sillow, Odi, Mill' },
        { label: 'Diffusion Model', value: 'Imagen 3 Multi-Modal' },
      ],
      dropzoneConfig: {
        title: 'Style Anchor Calibration Dropzone',
        hint: 'Drop your character or style reference image to calculate chromatic coherence',
        accepts: '.png, .jpg, .jpeg, .webp',
      },
    },
    {
      id: 3,
      stageNumber: '03',
      tag: '3D PREVIS',
      timeframe: 'WEEK 03 · KINEMATIC STAGING',
      title: 'Blender 3D Previs & Motion Control',
      subtitle: 'Gray-box camera rigs, lens physics, and depth-map conditioning',
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
      assetSlot: {
        title: 'Warp Previs .blend Scene Archive',
        fileSize: '148 MB',
        fileFormat: '.blend File',
        description: 'Complete Blender 3.6+ project containing animated cockpit geometry, camera rigs, and depth render passes.',
        specs: [
          { key: 'Software', val: 'Blender 3.6 LTS / 4.2' },
          { key: 'Render Engine', val: 'Cycles / Eevee Next' },
          { key: 'Camera Tracker', val: 'Baked Kinematic Curves' },
          { key: 'Access Tier', val: 'Paid Subscriber / VIP Pass' },
        ],
      },
      technicalSpecs: [
        { label: 'Virtual Lens', value: '35mm Anamorphic Prime' },
        { label: 'Pass Formats', value: '16-bit Z-Depth + Normals' },
        { label: 'Frame Rate', value: '24.000 FPS Cinematic' },
        { label: 'Rig Trajectory', value: 'CAM_TRAJ_A / VEL_PATH' },
      ],
      dropzoneConfig: {
        title: 'Blender Scene Geometry Audit Dropzone',
        hint: 'Drop .blend or .fbx scene file for camera velocity validation (Paid Subscribers)',
        accepts: '.blend, .fbx, .obj',
      },
    },
    {
      id: 4,
      stageNumber: '04',
      tag: 'PROMPT ARCHITECTURE',
      timeframe: 'WEEK 04 · GENERATIVE PRECISION',
      title: 'Structured Multi-Block Prompt Engineering',
      subtitle: 'The 4-block syntax formula for Gemini & Imagen generative engines',
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
        ],
      },
      assetSlot: {
        title: 'Master Prompt Vault .json Repository',
        fileSize: '2.1 MB',
        fileFormat: '.json Database',
        description: 'Over 120 production-tested prompt templates, negative token weight tables, and seed logs.',
        specs: [
          { key: 'Templates', val: '120+ Scene Formulas' },
          { key: 'Format', val: 'Structured JSON Schema' },
          { key: 'Engines', val: 'Gemini 1.5 / Imagen 3' },
          { key: 'Access Tier', val: 'Paid Subscriber / VIP Pass' },
        ],
      },
      technicalSpecs: [
        { label: 'Prompt Formula', value: '4-Block Semantic Syntax' },
        { label: 'Negative Weighting', value: '-1.85 Artifact Suppression' },
        { label: 'Optical Tokens', value: 'Anamorphic flare, 35mm grain' },
        { label: 'Seed Locking', value: 'Strict Deterministic Seeds' },
      ],
      dropzoneConfig: {
        title: 'Prompt Token Syntax Evaluator Dropzone',
        hint: 'Drop custom prompt JSON or TXT file to evaluate token density (Paid Subscribers)',
        accepts: '.json, .txt',
      },
    },
    {
      id: 5,
      stageNumber: '05',
      tag: 'THEATRICAL FINISHING',
      timeframe: 'WEEK 05 · THEATRICAL MASTER',
      title: 'Iterative Polish, De-Flicker & Grading',
      subtitle: 'Temporal stabilization, 4K spatial reconstruction, and ACES color science',
      isAdvancedLocked: true,
      heroImage: stage05Img,
      heroImageAlt: '4K cinematic split-screen color grading waveform analysis',
      themeDescription: '4K cinematic split-screen color grading waveform analysis (Gemini/Imagen 3)',
      millTransmission:
        'You reached the summit! Treat raw AI generations like raw camera negative scans. The colorist and sound engineer breathe real life into the pixels.',
      millProTip:
        'Map your video pipeline into DaVinci Resolve using ACEScc color science and custom print film emulation LUTs.',
      universalTheory: {
        heading: 'Post-Production Engineering for Theatrical Cinema',
        description:
          'Raw AI video outputs suffer from temporal micro-flicker, floating noise patterns, and compressed color gamuts. Professional finishing transforms raw rushes into theatrical cinema.',
        bullets: [
          {
            title: '3-Frame Optical Flow De-Flicker',
            detail:
              'Analyzes adjacent motion vectors to smooth out generative luminance fluctuations and high-frequency noise.',
          },
          {
            title: '4K Neural Spatial Reconstruction',
            detail:
              'Upscales footage to 3840x1600 (2.39:1 Anamorphic) while synthesizing organic 35mm silver halide film grain.',
          },
          {
            title: 'ACEScc Color Grading & RGB Parade',
            detail:
              'Balances tonal curves across professional waveform monitors, harmonizing shadows and incandescent cyan/copper highlights.',
          },
        ],
      },
      odiCaseStudy: {
        title: 'Final 4K Cinematic Delivery & Master Color Profiles',
        summary: 'The exact post-processing nodes and DaVinci color grading suite.',
        deepDiveNarrative:
          'Odi graded the official Sillow Mill teaser on calibrated studio monitors using DaVinci Resolve Studio. By translating the raw LogC4 video generations through an ACEScc transformation into a custom 3D LUT cube, the blacks gained rich obsidian density while the bioluminescent flora radiated with warm, analog warmth.',
        previewThumbnails: [
          { img: stage05Img, caption: 'DaVinci Studio Split-Screen: Raw LogC4 vs 4K ACEScc Grade' },
          { img: akinoyaPlanetImg, caption: 'Final 4K Master Deliverable Frame' },
        ],
      },
      assetSlot: {
        title: 'Äkinoya DaVinci Color LUTs .cube Pack',
        fileSize: '84.2 MB',
        fileFormat: '.cube 3D LUTs',
        description: 'Official 3D LUT cubes calibrated for ACEScc and Rec.709 color spaces with print film emulations.',
        specs: [
          { key: 'Format', val: '65x65x65 .cube LUTs' },
          { key: 'Color Spaces', val: 'ACEScc, LogC4, Rec.709' },
          { key: 'Presets', val: '8 Theatrical Profiles' },
          { key: 'Access Tier', val: 'Paid Subscriber / VIP Pass' },
        ],
      },
      technicalSpecs: [
        { label: 'Color Science', value: 'ACEScc v1.3' },
        { label: 'Master Output', value: '3840x1600 ProRes 4444 XQ' },
        { label: 'Temporal Stabilization', value: '3-Frame Optical Flow' },
        { label: 'Film Grain Profile', value: 'Kodak 5219 500T 35mm' },
      ],
      dropzoneConfig: {
        title: '4K Theatrical Deliverable Audit Dropzone',
        hint: 'Drop .mov or .mp4 master render for broadcast compliance audit (Paid Subscribers)',
        accepts: '.mov, .mp4, .exr',
      },
    },
  ];

  // Stage Selection Handler
  const handleOpenStageModal = (stage: StageDetail) => {
    // Stage 3, 4, 5 are locked for non-paid guests
    if (stage.isAdvancedLocked && !isMember) {
      soundManager.playTone(330, 0.08);
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    soundManager.playTone(580, 0.05);
    setSelectedStageForModal(stage);
  };

  // Download Handler (Strictly Restricted to Paid Subscribers / VIP Pass Holders)
  const handleDownloadAsset = (stage: StageDetail) => {
    if (!isMember) {
      soundManager.playTone(330, 0.08);
      alert(
        '🔒 Master Asset Downloads Restricted\n\nFull master files, 3D rigs, and prompt vaults are reserved exclusively for active Paid Monthly Subscribers and VIP Pass Holders.\n\nPublic Release Date: January 9, 2027.\nClaim your VIP Invitation or authenticate your Pass to unlock immediate downloads.'
      );
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    // Member is authenticated & paid
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

    if (stage.assetSlot.downloadUrl) {
      const link = document.createElement('a');
      link.href = stage.assetSlot.downloadUrl;
      link.download = stage.assetSlot.downloadFileName || stage.assetSlot.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert(`[VIP Access Granted] Initiating master archive download: ${stage.assetSlot.title}`);
    }
  };

  // Dropzone simulation handler
  const handleDropzoneUpload = (
    e: React.DragEvent<HTMLDivElement> | React.ChangeEvent<HTMLInputElement>,
    stageId: number
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

    setDropzones((prev) => ({
      ...prev,
      [stageId]: {
        fileName,
        fileSize,
        status: 'uploading',
      },
    }));

    setTimeout(() => {
      soundManager.playTone(880, 0.1);
      setDropzones((prev) => ({
        ...prev,
        [stageId]: {
          fileName,
          fileSize,
          status: 'analyzed',
          score: Math.floor(Math.random() * 7) + 93,
          message: 'Spatial layout & optical token consistency verified for pipeline synthesis.',
        },
      }));
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
                  ÄKINOYA LABS · KNOWLEDGE PORTAL
                </span>
                <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-purple-950/80 border border-purple-400/40 text-purple-300 font-bold tracking-wider">
                  5-STAGE ROADMAP · DEEP-DIVE MODALS
                </span>
                {isMember ? (
                  <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-bold tracking-wider flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    PAID SUBSCRIBER / VIP PASS ACTIVE
                  </span>
                ) : (
                  <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300/90 font-semibold tracking-wider flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" />
                    DOWNLOADS &amp; STAGES 3–5 GATED
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-black text-white tracking-tight leading-tight">
                Interactive Production Roadmap &amp;{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-purple-400">
                  Deep-Dive Vault
                </span>
              </h1>

              <p className="text-sm sm:text-base text-white/75 font-sans leading-relaxed">
                Step into the battle-tested hybrid AI &amp; Blender production pipeline developed by
                Sillow Mill. Guided by <strong>Mill</strong> along our glowing cyan footstep trail,
                each stage widget is an interactive portal opening a deep-dive knowledge modal with
                custom-generated Gemini/Imagen visuals. Full asset downloads and advanced features
                are strictly reserved for active <strong>paid monthly subscribers &amp; VIP members</strong>,
                tied to the official countdown of <strong>January 9, 2027</strong>.
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
                    ONLINE
                  </span>
                </div>
                <p className="text-xs text-white/80 font-sans leading-snug">
                  &ldquo;Click any roadmap stage widget to enter its Deep-Dive Modal! Explore the
                  Gemini-generated visuals and director blueprints.&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Quick-Jump Milestone Navigation */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider">
              <FootstepIcon className="w-4 h-4" isActive pulse />
              <span>Interactive Stages:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {STAGES.map((s) => {
                const isLocked = s.isAdvancedLocked && !isMember;

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleOpenStageModal(s)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                      isLocked
                        ? 'bg-black/50 hover:bg-black/80 text-white/40 border border-white/10 hover:border-amber-400/40'
                        : 'bg-white/10 hover:bg-cyan-500/20 text-white hover:text-cyan-200 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,242,254,0.15)]'
                    }`}
                  >
                    <span>{s.stageNumber} {s.tag}</span>
                    {isLocked ? (
                      <Lock className="w-3 h-3 text-amber-400" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-cyan-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ======================================================== */}
        {/* 5-STAGE INTERACTIVE ROADMAP CARDS & WEAVING FOOTSTEPS     */}
        {/* ======================================================== */}
        <div className="relative space-y-12">
          {/* Vertical Glowing Cyan Spine */}
          <div className="absolute left-6 md:left-1/2 top-10 bottom-24 w-1 -translate-x-1/2 bg-gradient-to-b from-cyan-400 via-purple-500 to-cyan-500/40 rounded-full shadow-[0_0_15px_rgba(0,242,254,0.5)] z-0 pointer-events-none" />

          {STAGES.map((stage, index) => {
            const isStageLocked = stage.isAdvancedLocked && !isMember;
            const isEven = index % 2 === 0;

            return (
              <div
                key={stage.id}
                id={`stage-${stage.id}`}
                className={`relative z-10 pt-4 pb-8 transition-all duration-300 ${
                  isStageLocked ? 'group/locked' : 'group/active'
                }`}
              >
                {/* Center Node Footstep Marker */}
                <div className="absolute left-6 md:left-1/2 top-10 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1">
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

                {/* Staggered Desktop Card Layout */}
                <div className="pl-14 md:pl-0 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 items-center">
                  {/* Left Column (or Right on alternating items) */}
                  <div className={`space-y-4 ${isEven ? 'md:order-1' : 'md:order-2'}`}>
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
                          className="w-full h-full object-cover transition-transform duration-700 group-hover/banner:scale-105 opacity-85 group-hover/banner:opacity-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                        {/* Top Overlay Badges */}
                        <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
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

                        {/* Bottom Overlay Title & Action Indicator */}
                        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
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
                      <div className="p-5 space-y-3">
                        <p className="text-xs sm:text-sm text-white/70 font-sans leading-relaxed">
                          {stage.subtitle}
                        </p>

                        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                          <span className="text-cyan-300 font-semibold flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            {stage.themeDescription}
                          </span>
                          <span className="text-white/50 underline">Open Portal →</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (Theory & Pro Tip Snippet) */}
                  <div className={`space-y-4 ${isEven ? 'md:order-2' : 'md:order-1'}`}>
                    <div className="p-6 rounded-3xl bg-[#0a0f1d]/80 border border-cyan-500/20 space-y-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={millAvatar}
                          alt="Mill"
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

                      {/* Technical Specs Tags */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                        {stage.technicalSpecs.slice(0, 2).map((sp) => (
                          <div key={sp.label} className="p-2 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono">
                            <span className="text-white/40 block text-[9.5px] uppercase">{sp.label}</span>
                            <span className="text-cyan-200 font-bold">{sp.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Portal Launch Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenStageModal(stage)}
                        className={`w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          isStageLocked
                            ? 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300'
                            : 'bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 hover:shadow-[0_0_15px_rgba(0,242,254,0.2)]'
                        }`}
                      >
                        {isStageLocked ? (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Unlock with Paid Subscription</span>
                          </>
                        ) : (
                          <>
                            <span>Open Deep-Dive Knowledge Modal</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Midway Checkpoint: 50% Member Wall Banner after Stage 02 */}
                {stage.id === 2 && (
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
                          Free guests have view-only access to inspect the professional theory and
                          visual specifications for Stages 01 and 02. Advanced Stages 03 through 05,
                          raw 3D Blender camera rigs, master prompt databases, and DaVinci color LUTs
                          are strictly restricted to active <strong>paid monthly subscribers and VIP members</strong>.
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

                      {/* Dynamic CTA depending on Member Status */}
                      {isMember ? (
                        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-400/50 max-w-md mx-auto flex items-center justify-center gap-2.5 text-emerald-300 font-mono font-bold text-xs">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span>PAID SUBSCRIBER ACCESS ACTIVE — ALL 5 STAGES UNSEALED</span>
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
                    </motion.div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* COMPREHENSIVE STAGE DEEP-DIVE MODAL                       */}
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
              className="fixed inset-0 bg-black/85 backdrop-blur-xl"
            />

            {/* Modal Dialog Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#070b16]/98 border border-cyan-400/50 shadow-[0_0_80px_rgba(0,242,254,0.25)] z-10 text-white font-sans space-y-6 p-6 sm:p-8"
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

              {/* Asset Dropzone & Download Privilege Section (Strictly Restricted to Paid Subscribers) */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-purple-950/20 to-black/80 border border-cyan-500/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-extrabold text-white">
                        {selectedStageForModal.assetSlot.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-400/40 font-bold">
                        {selectedStageForModal.assetSlot.fileSize} · {selectedStageForModal.assetSlot.fileFormat}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 font-sans">
                      {selectedStageForModal.assetSlot.description}
                    </p>
                  </div>

                  {/* Download CTA Button */}
                  <div className="shrink-0">
                    {isMember ? (
                      <button
                        type="button"
                        onClick={() => handleDownloadAsset(selectedStageForModal)}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold text-xs tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(0,242,254,0.4)] flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>DOWNLOAD MASTER ASSET</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDownloadAsset(selectedStageForModal)}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 font-mono font-bold text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>DOWNLOAD LOCKED · PAID SUBSCRIBERS</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Interactive Dropzone Sandbox */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                    {selectedStageForModal.dropzoneConfig.title}
                  </span>

                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropzoneUpload(e, selectedStageForModal.id)}
                    className="relative p-5 rounded-2xl border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/60 bg-black/40 hover:bg-black/60 transition-all text-center space-y-2 cursor-pointer group/drop"
                  >
                    <input
                      type="file"
                      accept={selectedStageForModal.dropzoneConfig.accepts}
                      onChange={(e) => handleDropzoneUpload(e, selectedStageForModal.id)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex justify-center">
                      <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-400/40 flex items-center justify-center text-cyan-300 group-hover/drop:scale-110 transition-transform">
                        <UploadCloud className="w-5 h-5 text-cyan-400" />
                      </div>
                    </div>
                    <p className="text-xs font-mono text-white/80">
                      {selectedStageForModal.dropzoneConfig.hint} or{' '}
                      <span className="text-cyan-300 underline">browse files</span>
                    </p>
                    <p className="text-[10px] font-mono text-white/50">
                      Accepts {selectedStageForModal.dropzoneConfig.accepts} · Up to 50 MB
                    </p>

                    {dropzones[selectedStageForModal.id]?.status === 'uploading' && (
                      <div className="pt-2 flex items-center justify-center gap-2 text-xs font-mono text-cyan-300">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Evaluating structural geometry &amp; token density...</span>
                      </div>
                    )}

                    {dropzones[selectedStageForModal.id]?.status === 'analyzed' && (
                      <div className="pt-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-400/40 text-left space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-300">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {dropzones[selectedStageForModal.id]?.fileName} ({dropzones[selectedStageForModal.id]?.fileSize})
                          </span>
                          <span>Audit Score: {dropzones[selectedStageForModal.id]?.score}%</span>
                        </div>
                        <p className="text-[11px] text-emerald-200/80 font-sans">
                          {dropzones[selectedStageForModal.id]?.message}
                        </p>
                      </div>
                    )}
                  </div>
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
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
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

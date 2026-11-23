import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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

import millAvatar from '../assets/images/mill_photo.webp';
import moodboardImg from '../assets/images/Mood.webp';
import bingaaComicCover from '../assets/images/bingaa_comic_cover.webp';
import akinoyaVistaImg from '../assets/images/akinoya_twilight_world_1790852640934.webp';
import visualizerThumbnailImg from '../assets/images/visualizer_thumbnail.webp';
import akinoyaPlanetImg from '../assets/images/akinoya_exact_planet_1790853678690.webp';

// Bespoke Gemini / Imagen 3 Generated Stage Visuals
import stage01Img from '../assets/images/stage_01_storyboard_blueprint.webp';
import stage02Img from '../assets/images/stage_02_character_reference_sheet.webp';
import stage03Img from '../assets/images/stage_03_cockpit_previs_wireframe.webp';
import stage04Img from '../assets/images/stage_04_cybernetic_prompt_datastream.webp';
import stage05Img from '../assets/images/stage_05_cinematic_color_grading_waveform.webp';

// Character Locking Master Assets (from Character Locking folder)
import millLockingImg from '../assets/images/character_locking/MilLLL.webp';
import odiLockingImg from '../assets/images/character_locking/Odi.webp';
import sillowLockingImg from '../assets/images/character_locking/Sillow.webp';

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
    role?: string;
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
  // Deep-Dive Modal State & Stage Persistence
  const [selectedStageForModal, setSelectedStageForModal] = useState<StageDetail | null>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const modalScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [activeStageId] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase().replace('#', '');
      if (hash.startsWith('stage-')) {
        const num = Number(hash.replace('stage-', ''));
        if (num >= 1 && num <= 5) return num;
      }
      const saved = sessionStorage.getItem('akinoya_labs_active_stage');
      const num = Number(saved);
      if (num >= 1 && num <= 5) return num;
    }
    return 1;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('akinoya_labs_active_stage', String(activeStageId));
    }
  }, [activeStageId]);

  // Reset Deep-Dive scroll position to top whenever opening a stage
  useEffect(() => {
    if (selectedStageForModal && modalScrollContainerRef.current) {
      modalScrollContainerRef.current.scrollTop = 0;
    }
  }, [selectedStageForModal]);

  // Lock background scroll, hide portrait bottom tray, and handle Escape key when modal or lightbox is active
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (selectedStageForModal || selectedPreviewImage) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.body.classList.add('workflow-modal-open');

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (selectedPreviewImage) {
            setSelectedPreviewImage(null);
          } else if (selectedStageForModal) {
            setSelectedStageForModal(null);
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.classList.remove('workflow-modal-open');
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [selectedStageForModal, selectedPreviewImage]);

  // Auto-scroll to active stage on initial load if stage > 1
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.toLowerCase().replace('#', '');
    const targetStage = hash.startsWith('stage-')
      ? Number(hash.replace('stage-', ''))
      : activeStageId;

    if (targetStage && targetStage > 1 && targetStage <= 5) {
      const delays = [150, 400, 800];
      delays.forEach((delay) => {
        setTimeout(() => {
          const el = document.getElementById(`stage-${targetStage}`);
          if (el) {
            el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
          }
        }, delay);
      });
    }
  }, []);

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

  // Open Stage Deep-Dive Modal via Universal Event (e.g. from Community Hub Left Sidebar or Stage Navigation)
  useEffect(() => {
    const handleOpenExternalStageModal = (e: Event) => {
      const customEvent = e as CustomEvent<{ stageId: number }>;
      if (customEvent.detail && customEvent.detail.stageId) {
        const stage = STAGES.find((s) => s.id === customEvent.detail.stageId);
        if (stage) {
          handleOpenStageModal(stage);
        }
      }
    };

    window.addEventListener('open-workflow-stage-modal', handleOpenExternalStageModal as EventListener);
    return () => {
      window.removeEventListener('open-workflow-stage-modal', handleOpenExternalStageModal as EventListener);
    };
  }, []);

  // Standardized 5-Step 3D-to-AI + Logic Pro DAW Pipeline (1-to-1 Vault Mapping)
  const STAGES: StageDetail[] = [
    {
      id: 1,
      stageNumber: '01',
      tag: '3D GREYBOXING',
      navLabel: 'World Greyboxing',
      richIcon: '🏗️',
      timeframe: 'STEP 01 · BLENDER + AI ENV',
      title: 'World Greyboxing (AI-Assisted 3D Environment)',
      subtitle:
        'Converting concept art and world-building sketches of Sillow Mill locations (Akainoya landscapes, spaceship interiors) into precise 3D greybox environments via Blender + AI tooling.',
      vaultFolderMapping: '01_Blender_Greybox_Base/',
      isAdvancedLocked: false,
      heroImage: akinoyaVistaImg,
      heroImageAlt: '3D greybox environment terrain and spaceship hull architecture for Akainoya locations',
      themeDescription: 'Blender + AI-assisted 3D greybox environments for Akainoya landscapes and ship interiors',
      millTransmission:
        'Stop prompting from blank frames! Build the spatial truth in Blender first—Akainoya canyons and starship corridors need real 3D perspective before neural styling.',
      millProTip:
        'For internal handoffs (Mac Lee & env artists) and community builds alike: enforce 1 BU = 1m real-world scale and snap the floor plane to Z=0 before blocking corridors.',
      universalTheory: {
        heading: 'From Concept Sketch to Metric 3D Greybox',
        description:
          'Concept art establishes mood, while a Blender greybox establishes immutable geometry, horizon sightlines, and ceiling heights that keep multi-cut neural renders physically coherent.',
        bullets: [
          {
            title: 'AI-Assisted Environment Blockout',
            detail:
              'Translate Sillow Mill sketches and Akainoya concept plates into rough sculptural terrains, monolith volumes, and bulkhead bays in Blender.',
          },
          {
            title: 'Modular Architecture Shells',
            detail:
              'Build clean low-poly interior shells for spaceships, cockpits, and outposts with real door widths, viewport frames, and walkable deck grids.',
          },
          {
            title: 'Clean Scene Hygiene for Team Handoff',
            detail:
              'Separate Collections by Terrain, Architecture, and Sky Dome so Mac Lee and collaborators can inspect or swap layout modules in seconds.',
          },
        ],
      },
      odiCaseStudy: {
        title: 'Greyboxing Akainoya Landscapes & Starship Interiors',
        summary:
          'Translating hand-drawn Sillow Mill sketches into raw .blend environment blockouts.',
        deepDiveNarrative:
          'Instead of chasing unstable text-to-video prompts, Odi starts in Blender with raw world-building blockouts of Akainoya obsidian spires and ship corridors. Using AI-assisted depth projection onto simple low-poly geometry, every cliff overhang and corridor bulkhead stays 100% locked across wide, medium, and reverse angles.',
        previewThumbnails: [
          { img: akinoyaVistaImg, caption: 'Akainoya Twilight Terrain Greybox Baseline' },
          { img: stage01Img, caption: 'Architectural Corridor & Horizon Blockout Framing' },
        ],
      },
      masterAsset: {
        title: '01_Blender_Greybox_Base/ Master Package',
        fileName: 'Akainoya_Greybox_Environment_Base.blend',
        fileSize: '184 MB',
        fileFormat: '.blend (Blender 3.6 LTS / 4.2)',
        vaultPath: 'Vault / 01_Workflow / 01_Blender_Greybox_Base/',
        description:
          'Raw 3D environment .blend files, procedural Akainoya terrain geometry, and spaceship interior architecture blockouts.',
        specs: [
          { key: 'Deliverables', val: 'Raw .blend + Terrain + Hulls' },
          { key: 'World Scale', val: 'Metric 1 BU = 1 Meter' },
          { key: 'Workflow Role', val: 'Environment Bedrock (Team + Community)' },
          { key: 'Vault Folder', val: '01_Blender_Greybox_Base/' },
        ],
      },
      technicalSpecs: [
        { label: 'Unit System', value: 'Metric (1.0 BU = 1m)' },
        { label: 'Geometry Budget', value: 'Clean Low-Poly Greybox' },
        { label: 'Handoff Format', value: '.blend + Collection Tree' },
        { label: 'Vault Directory', value: '01_Blender_Greybox_Base/' },
      ],
    },
    {
      id: 2,
      stageNumber: '02',
      tag: 'SPATIAL BLOCKING',
      navLabel: 'Spatial Blocking & Proxies',
      richIcon: '🧍',
      timeframe: 'STEP 02 · PROXIES & RIGS',
      title: 'Spatial Blocking & Character Proxies',
      subtitle:
        'Placing 3D stand-ins for characters, vehicles, and props to lock down scale, perspective, gravity, and composition before any neural rendering occurs.',
      vaultFolderMapping: '02_Spatial_Blocking_Rigs/',
      isAdvancedLocked: false,
      heroImage: stage03Img,
      heroImageAlt: '3D character proxy stand-ins, vehicle cockpit rig, and spatial blocking guides in Blender',
      themeDescription: '3D character proxies, vehicle rigs, and prop setups locking composition and gravity',
      millTransmission:
        'Scale drift ruins immersion! Drop calibrated character proxies, vehicle cockpits, and grounded props into the greybox before you ever touch a shader or neural pass.',
      millProTip:
        'Check eye-line height (~1.7m standing stand-in) and contact shadows on deck plates so characters feel anchored by real gravity—zero floating feet.',
      universalTheory: {
        heading: 'Scale, Gravity & Composition Prior to Rendering',
        description:
          'Spatial blocking treats 3D stand-in armatures, ship rigs, and prop bounds as non-negotiable physical anchors—eliminating warped anatomy and shifting prop sizes between shots.',
        bullets: [
          {
            title: 'Calibrated Character Proxies',
            detail:
              'Place proportion-accurate 3D stand-in rigs for Mill, Odi, and Sillow inside scenes to validate shoulder width, reach, and camera sightlines.',
          },
          {
            title: 'Vehicle Rigs & Cockpit Ergonomics',
            detail:
              'Snap transport skiffs, dropship hulls, and console seats onto constrained motion splines with locked pilot clearance.',
          },
          {
            title: 'Gravity & Prop Placement Locks',
            detail:
              'Verify every crate, instrument console, and geological prop rests flush against floor colliders with accurate perspective foreshortening.',
          },
        ],
      },
      odiCaseStudy: {
        title: 'Locking Cockpit & Explorer Blocking Before Previz',
        summary:
          'How character proxies and rigged vehicle cages stabilize fast camera moves and multi-character scenes.',
        deepDiveNarrative:
          'Before animating any final shot, Odi and internal collaborators (including Mac Lee) stage every explorer beat using greybox stand-in rigs and vehicle cages. Cockpit control sticks, visor clearances, and over-the-shoulder staging are verified directly inside Blender so downstream 24fps Workbench renders preserve exact human-to-ship scale.',
        previewThumbnails: [
          { img: stage03Img, caption: 'Cockpit Velocity Rig & Proxy Pilot Clearance' },
          { img: visualizerThumbnailImg, caption: 'Composition Check Against Locked Foreground Scale' },
        ],
      },
      masterAsset: {
        title: '02_Spatial_Blocking_Rigs/ Master Archive',
        fileName: 'Cockpit_Camera_Velocity_Rig.blend',
        fileSize: '216 MB',
        fileFormat: '.blend + .fbx Proxy Rigs',
        vaultPath: 'Vault / 01_Workflow / 02_Spatial_Blocking_Rigs/',
        description:
          'Calibrated 3D character proxy rigs, rigged cockpit & vehicle assemblies, and standardized prop placement setups.',
        specs: [
          { key: 'Proxy Rig Spec', val: 'Mill / Odi / Sillow Scale Cages' },
          { key: 'Vehicle Rigs', val: 'Cockpit + Warp Tunnel Mesh' },
          { key: 'Constraint Check', val: 'Gravity & Floor Snap Active' },
          { key: 'Vault Folder', val: '02_Spatial_Blocking_Rigs/' },
        ],
      },
      technicalSpecs: [
        { label: 'Proxy Rig Height', value: 'Calibrated Human / Suit' },
        { label: 'Prop Grounding', value: 'Surface-Snap Validated' },
        { label: 'Rig Exports', value: '.blend + .fbx Proxies' },
        { label: 'Vault Directory', value: '02_Spatial_Blocking_Rigs/' },
      ],
    },
    {
      id: 3,
      stageNumber: '03',
      tag: '24FPS PREVIZ · AUDIO SYNC',
      navLabel: '24fps Workbench Previz',
      richIcon: '🎥',
      timeframe: 'STEP 03 · MULTICAM + AUDIO TIMING',
      title: 'Cinematic Multicam & 24fps Workbench Previz',
      subtitle:
        'Setting up virtual camera rigs and lens framing timed directly to the musical rhythm and tempo. Exporting light, fast 24fps Workbench previz renders to serve as the exact skeletal timeline.',
      vaultFolderMapping: '03_24fps_Camera_Previz/',
      isAdvancedLocked: true,
      heroImage: stage01Img,
      heroImageAlt: 'Multicam 24fps Blender Workbench previz timeline locked to audio beat markers',
      themeDescription: '24fps Blender Workbench multicam previz timed directly to Logic Pro WAV stems',
      millTransmission:
        'Music and audio stems dictate the timeline! Drop the "Dream of Akainoya" WAV stem markers straight into Blender VSE so every 24fps Workbench cut lands on the exact bar.',
      millProTip:
        'Render pure Blender Workbench (flat MatCap / Wireframe + Camera Safe Frame) at true 24.000 FPS—fast iteration beats heavy Cycles renders during edit lock.',
      universalTheory: {
        heading: 'Audio-Driven Multicam Timing & 24fps Skeleton',
        description:
          'Your Step 3 Workbench edit is the immutable skeletal timeline of the entire film. Virtual camera focal lengths and cut points are driven directly by musical phrasing from Step 5 DAW stems.',
        bullets: [
          {
            title: 'Tempo-Locked Timeline Markers',
            detail:
              'Import WAV stems from 05_Audio_DAW_Templates_Stems/WAV_Stems/ into Blender VSE so kick transients, risers, and "Dream of Akainoya" vocal cues dictate cut points.',
          },
          {
            title: 'Multicam Lens & Trajectory Rigs',
            detail:
              'Switch cleanly across 24mm wide establishing cameras, 35mm anamorphic tracking dollies, and 85mm close-up rigs without breaking eyeline.',
          },
          {
            title: 'Fast 24fps Workbench Exports',
            detail:
              'Output lightweight 24fps MP4/EXR previz passes in minutes so Mac Lee, Odi, and community remixers can approve rhythm before expensive neural passes.',
          },
        ],
      },
      odiCaseStudy: {
        title: 'Synchronizing 24fps Camera Cuts to "Dream of Akainoya"',
        summary:
          'How Logic Pro bar markers and WAV stems dictate the exact cut points in the 24fps Workbench edit.',
        deepDiveNarrative:
          'Before generating a single stylized frame, Odi imports the tempo-locked WAV stems from 05_Audio_DAW_Templates_Stems/WAV_Stems/ into the timing timeline. Every multicam switch in Blender is keyed to transient hits and lyrical phrases at 24.000 FPS—creating a lightweight skeletal Workbench edit that downstream Step 4 @TAG direction and Step 5 neural rendering obey down to the frame.',
        previewThumbnails: [
          { img: stage01Img, caption: '24fps Anamorphic Framing & Cut Sheet' },
          { img: stage03Img, caption: 'Multicam Trajectory Curves (CAM_TRAJ_A)' },
        ],
      },
      masterAsset: {
        title: '03_24fps_Camera_Previz/ Timeline Bundle',
        fileName: 'Akainoya_24fps_Workbench_Previz_Pack.zip',
        fileSize: '420 MB',
        fileFormat: '24fps MP4 + Camera JSON + EXR Depth',
        vaultPath: 'Vault / 01_Workflow / 03_24fps_Camera_Previz/',
        description:
          'Light Blender Workbench previz renders, multicam animation passes, lens metadata, and audio-synced edit timelines.',
        specs: [
          { key: 'Frame Rate', val: '24.000 FPS Native Timeline' },
          { key: 'Render Engine', val: 'Blender Workbench (Fast Pass)' },
          { key: 'Cut Driver', val: 'DAW Stem Markers (WAV_Stems/)' },
          { key: 'Vault Folder', val: '03_24fps_Camera_Previz/' },
        ],
      },
      technicalSpecs: [
        { label: 'Playback Rate', value: '24.000 FPS Strict' },
        { label: 'Camera Lenses', value: '24mm / 35mm / 50mm / 85mm' },
        { label: 'Timing Lock', value: 'WAV_Stems/ Scene Markers' },
        { label: 'Vault Directory', value: '03_24fps_Camera_Previz/' },
      ],
    },
    {
      id: 4,
      stageNumber: '04',
      tag: '@TAG DIRECTION',
      navLabel: '@TAG Scene Direction',
      richIcon: '🏷️',
      timeframe: 'STEP 04 · VISUAL CONTINUITY',
      title: 'Canonical @TAG Reference & Scene Direction',
      subtitle:
        'Linking the 24fps previz to approved visual anchor sheets (@TAG for character looks, lighting parameters, and asset materials) to guarantee absolute visual continuity across cuts.',
      vaultFolderMapping: '04_Canonical_Tag_References/',
      isAdvancedLocked: true,
      heroImage: millLockingImg,
      heroImageAlt: 'Canonical @TAG character turnaround sheet and scene direction visual anchor for Mill',
      themeDescription: 'Canonical @TAG visual anchor sheets for character continuity, lighting guides & textures',
      millTransmission:
        'Every cut reads from the exact same visual bible! Bind each 24fps Workbench shot to canonical @TAG look-up sheets so suits, faces, and rim lighting never morph.',
      millProTip:
        'Always cite canonical @TAG tokens (@MILL_SUIT_V1, @ODI_SCOUT_V1, @SILLOW_EXPLORER_V1) alongside locked lighting ratios and material sheets for zero look-drift.',
      universalTheory: {
        heading: 'Deterministic @TAG Look-Up Direction',
        description:
          'Replacing brittle text-only descriptions, canonical @TAG anchors tie approved 4K character sheets, shader swatches, and lighting diagrams directly onto Step 3 previz shots.',
        bullets: [
          {
            title: 'Canonical Character @TAG Sheets',
            detail:
              'Reference locked turnaround plates (@MILL_SUIT_V1 mushroom helmet bio-analyst, @ODI_SCOUT_V1 tactical scout, @SILLOW_EXPLORER_V1 dreadlocks & harness).',
          },
          {
            title: 'Scene Lighting & Atmospheric Guides',
            detail:
              'Lock key/rim light direction, #00f2fe Cyan Galaxy / #b142f0 Purple Void values, and fog density per scene before neural synthesis.',
          },
          {
            title: 'Texture Packages & Shot Matrix',
            detail:
              'Pair 3D proxy IDs from Step 2 with surface PBR references and @TAG look-up tables so Mac Lee and the team share one deterministic vocabulary.',
          },
        ],
      },
      odiCaseStudy: {
        title: 'Binding 24fps Previz Cuts to Canonical @TAG Anchors',
        summary:
          'How master image sheets, lighting guides, and texture packages keep Mill, Odi, and Sillow identical across every angle.',
        deepDiveNarrative:
          'To eliminate AI style drift across complex edits, Odi formalized every hero asset into canonical @TAG look-up sheets inside 04_Canonical_Tag_References/. Each shot in the Step 3 Workbench edit tags exact character plates, lighting direction cards, and shader swatches so Step 5 neural rendering preserves every buckle, visor tint, and fabric weave.',
        previewThumbnails: [
          { img: millLockingImg, caption: '@MILL_SUIT_V1 — Alien Bio-Analyst Anchor Sheet' },
          { img: odiLockingImg, caption: '@ODI_SCOUT_V1 — Scout Mechanic Tactical Sheet' },
          { img: sillowLockingImg, caption: '@SILLOW_EXPLORER_V1 — Explorer Turnaround Sheet' },
        ],
      },
      characterDownloads: [
        {
          name: 'Mill',
          role: '@MILL_SUIT_V1 · Bio-Analyst',
          fileName: '@MILL_SUIT_V1 — Master Character Plate',
          size: '6.7 MB',
          format: '4K Canonical @TAG Plate',
          img: millLockingImg,
          downloadUrl: '',
          description: 'Canonical @TAG turnaround sheet: alien bio-analyst in environmental suit with mushroom helmet archetype.',
        },
        {
          name: 'Odi',
          role: '@ODI_SCOUT_V1 · Scout Mechanic',
          fileName: '@ODI_SCOUT_V1 — Tactical Recon Sheet',
          size: '275 KB',
          format: 'Canonical @TAG Plate',
          img: odiLockingImg,
          downloadUrl: '',
          description: 'Canonical @TAG turnaround sheet: scout mechanic without dreadlocks wearing tactical reconnaissance armor.',
        },
        {
          name: 'Sillow',
          role: '@SILLOW_EXPLORER_V1 · Lead Explorer',
          fileName: '@SILLOW_EXPLORER_V1 — Explorer Turnaround',
          size: '280 KB',
          format: 'Canonical @TAG Plate',
          img: sillowLockingImg,
          downloadUrl: '',
          description: 'Canonical @TAG turnaround sheet: lead planetary explorer styled with distinct dreadlocks and tactical harness.',
        },
      ],
      masterAsset: {
        title: '04_Canonical_Tag_References/ Master Kit',
        fileName: 'Canonical_Tag_Reference_Bible.zip',
        fileSize: '58.4 MB',
        fileFormat: '4K PNG Sheets + Lighting Guides + @TAG Lookup',
        vaultPath: 'Vault / 01_Workflow / 04_Canonical_Tag_References/',
        description:
          'Approved master image sheets, character lighting guides, PBR texture packages, and canonical @TAG look-up tables.',
        specs: [
          { key: 'Cast @TAGs', val: '@MILL / @ODI / @SILLOW' },
          { key: 'Palette Lock', val: '#00f2fe Cyan / #b142f0 Void' },
          { key: 'Includes', val: 'Lighting Guides + Textures' },
          { key: 'Vault Folder', val: '04_Canonical_Tag_References/' },
        ],
      },
      technicalSpecs: [
        { label: '@TAG Vocabulary', value: 'Strict Look-Up Registry' },
        { label: 'Palette Swatches', value: '#00f2fe / #b142f0' },
        { label: 'Reference Tier', value: '4K Master Image Sheets' },
        { label: 'Vault Directory', value: '04_Canonical_Tag_References/' },
      ],
    },
    {
      id: 5,
      stageNumber: '05',
      tag: 'NEURAL + LOGIC DAW',
      navLabel: 'Neural Render & Logic DAW',
      richIcon: '🎛️',
      timeframe: 'STEP 05 · AUDIO-VISUAL MASTERING',
      title: 'Neural Rendering & Audio-Visual Finishing (DAW Integration)',
      subtitle:
        'Final AI neural rendering over the 3D-previz skeleton, seamlessly married with the master audio track, Logic Pro DAW template, and WAV stems.',
      vaultFolderMapping: '05_Audio_DAW_Templates_Stems/',
      isAdvancedLocked: true,
      heroImage: stage05Img,
      heroImageAlt: 'Final neural render composite paired with Logic Pro Master Template waveform and stem busses',
      themeDescription: 'Final 3D-to-AI neural rendering integrated directly with Logic_Pro_Master_Template.logicx and WAV stems',
      millTransmission:
        'This is where sight and sound fuse into the final master! Drive neural render passes strictly over your Step 3 previz skeleton, then marry them inside Logic_Pro_Master_Template.logicx.',
      millProTip:
        'Open Logic_Pro_Master_Template.logicx first—its telemetry automation markers, vocal chains, and "Dream of Akainoya" WAV stems feed straight into the 2D Visualizer Production & Logic Pro Asset bundle.',
      universalTheory: {
        heading: '3D-Locked Neural Synthesis & Logic Pro DAW Mastering',
        description:
          'Unlike unstable raw video prompts, Step 5 uses Step 3 24fps previz geometry + Step 4 @TAG anchors to render cinema-grade frames synced sample-for-frame to Logic Pro audio stems.',
        bullets: [
          {
            title: '3D-Skeleton Neural Rendering',
            detail:
              'Condition final AI diffusion & ACEScc film grading strictly over the Step 3 24fps Workbench timeline and Step 4 @TAG visual anchors.',
          },
          {
            title: 'Logic_Pro_Master_Template.logicx Integration',
            detail:
              'Pre-routed vocal chains (my vocal chain), Enerwise sound architecture busses, sub-bass sidechains, and telemetry scene markers locked to 24fps edits.',
          },
          {
            title: 'WAV_Stems/ & Visualizer_Logic_Assets/',
            detail:
              'Full "Dream of Akainoya" acapellas, remix stems, reactive audio triggers, and MIDI data powering both the final audio mix and 2D Visualizer reactive parameters.',
          },
        ],
      },
      odiCaseStudy: {
        title: 'Marrying Neural Renders with Logic Pro & "Dream of Akainoya" Stems',
        summary:
          'How the Logic_Pro_Master_Template.logicx project, vocal chain, and reactive MIDI assets complete the 2D Visualizer bundle.',
        deepDiveNarrative:
          'Every Step 3 cut point already originates from the tempo markers inside 05_Audio_DAW_Templates_Stems/. Once Step 5 neural rendering completes over the 24fps skeleton, the visuals drop right back beside Logic_Pro_Master_Template.logicx—giving internal collaborators (Mac Lee) and Vault members the complete vocal chain, "Dream of Akainoya" tracklist stems in WAV_Stems/, and reactive triggers in Visualizer_Logic_Assets/.',
        previewThumbnails: [
          { img: stage05Img, caption: 'Logic_Pro_Master_Template.logicx & ACEScc Mastering' },
          { img: visualizerThumbnailImg, caption: '2D Visualizer Reactive Audio-Visual Output' },
          { img: akinoyaPlanetImg, caption: '4K Final Neural Master Frame' },
        ],
      },
      masterAsset: {
        title: '05_Audio_DAW_Templates_Stems/ & Logic Pro Pack',
        fileName: 'Logic_Pro_Master_Template.logicx',
        fileSize: '425 MB',
        fileFormat: '.logicx + 24-bit WAV_Stems + MIDI + .cube LUT',
        vaultPath: 'Vault / 01_Workflow / 05_Audio_DAW_Templates_Stems/',
        description:
          'Core Logic_Pro_Master_Template.logicx (vocal chain, stem busses, telemetry markers), WAV_Stems/ aligned to scene markers, and Visualizer_Logic_Assets/ reactive MIDI triggers.',
        specs: [
          { key: 'Core DAW File', val: 'Logic_Pro_Master_Template.logicx' },
          { key: 'Stem Library', val: 'WAV_Stems/ ("Dream of Akainoya")' },
          { key: 'Visualizer Bundle', val: 'Visualizer_Logic_Assets/ + MIDI' },
          { key: 'Vault Folder', val: '05_Audio_DAW_Templates_Stems/' },
        ],
      },
      technicalSpecs: [
        { label: 'DAW Standard', value: 'Logic Pro (.logicx)' },
        { label: 'Vocal & Mix Chain', value: 'Enerwise + Telemetry Busses' },
        { label: 'Audio Stems', value: '24-bit WAV_Stems/ Scene-Synced' },
        { label: 'Vault Directory', value: '05_Audio_DAW_Templates_Stems/' },
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
      onNavigateToVault(VAULT_STAGE_FOLDER_IDS['04']);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-[#050812] text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Solid Dark Sci-Fi Backdrop (Masks out all background photography for 100% contrast & maximum readability) */}
      <div className="absolute inset-0 bg-[#050812] z-0 pointer-events-none" />

      {/* Subtle Atmospheric Ambient Glow (Lightweight local container, GPU-accelerated) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-600/5 blur-[120px] rounded-full" />
        <div className="absolute top-2/3 left-1/3 w-[450px] h-[450px] bg-purple-600/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* ======================================================== */}
        {/* WELCOMING INTAKE BANNER & WORKFLOW-ASSET MAPPING          */}
        {/* ======================================================== */}
        <div
          style={{ willChange: 'opacity, transform' }}
          className="relative rounded-3xl bg-[#090e1f] border border-cyan-500/30 p-5 sm:p-6 shadow-[0_0_35px_rgba(0,242,254,0.12)] overflow-hidden space-y-4 transform-gpu"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 font-bold tracking-wider flex items-center gap-1 shadow-sm">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  ÄKINOYA LABS · 3D-TO-AI &amp; LOGIC PRO PIPELINE
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-400/40 text-purple-300 font-bold tracking-wider">
                  TEAM (MAC LEE) &amp; COMMUNITY WORKFLOW
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
                The 5-Step 3D-to-AI <em>Sillow Mill</em> &amp; <em>Bingäa</em> Pipeline
              </h1>

              <p className="text-xs sm:text-sm text-white/75 font-sans leading-relaxed">
                Standardized for both our internal production crew (Mac Lee &amp; 3D team) and
                community members. Every scene locks 3D greybox geometry, spatial proxies, and{' '}
                <strong>24fps Workbench previz</strong> timed to <strong>&ldquo;Dream of Akainoya&rdquo;</strong>{' '}
                stems before <strong>@TAG direction</strong> and{' '}
                <strong>Logic Pro DAW finishing</strong>—mapped <strong>1-to-1</strong> inside the{' '}
                <strong>Asset Vault Hub</strong>.
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
                  &ldquo;Music stems set Step 3 cut points, @TAG anchors Step 4 continuity, and Logic_Pro_Master_Template.logicx finishes Step 5.&rdquo;
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[11px] font-mono text-white/60">
              Vault Tree: 01_Blender_Greybox_Base/ · 02_Spatial_Blocking_Rigs/ · 03_24fps_Camera_Previz/ · 04_Canonical_Tag_References/ · 05_Audio_DAW_Templates_Stems/
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
        </div>

        {/* Strict 100% Asset Vault Locking Notice Banner */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-950/60 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-bold tracking-wide">
              ANNUAL PASS REQUIRED — Instantly unlocked in Asset Vault for Paid Annual Members (€60/year).
            </span>
          </div>
          <span className="text-[10px] text-amber-400/90 font-bold tracking-wider shrink-0 uppercase">
            STEPS 01–05 LOCKED PRIOR TO LAUNCH
          </span>
        </div>

        {/* ======================================================== */}
        {/* UNIFIED 5-STAGE ROADMAP (INTEGRATED SINGLE SIDEBAR)      */}
        {/* ======================================================== */}
        <div className="w-full">
          {/* ====================================================== */}
          {/* MAIN ROADMAP CARDS & WEAVING FOOTSTEPS                  */}
          {/* ====================================================== */}
          <div className="relative space-y-10 sm:space-y-12">
            {/* Desktop Center Glowing Cyan Guide Line (>= 1024px) */}
            <div className="hidden lg:block absolute left-1/2 top-10 bottom-24 w-1 -translate-x-1/2 bg-gradient-to-b from-cyan-400 via-purple-500 to-cyan-500/40 rounded-full shadow-[0_0_15px_rgba(0,242,254,0.5)] z-0 pointer-events-none" />

            {STAGES.map((stage, index) => {
              const isStageLocked = stage.isAdvancedLocked && !isMember;
              const isEven = index % 2 === 0;

              return (
                <div
                  key={stage.id}
                  id={`stage-${stage.id}`}
                  className={`relative z-10 pt-6 pb-6 overflow-visible transition-all duration-300 ${
                    isStageLocked ? 'group/locked' : 'group/active'
                  }`}
                >
                  {/* Desktop Center Node Footstep Marker (>= 1024px) */}
                  <div className="hidden lg:flex absolute left-1/2 top-10 -translate-x-1/2 -translate-y-1/2 z-30 flex-col items-center gap-1 pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => handleOpenStageModal(stage)}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer transform-gpu ${
                        isStageLocked
                          ? 'bg-[#090b14] border-2 border-amber-500/40 shadow-none hover:scale-105'
                          : 'bg-[#090e1c] border-2 border-cyan-400 shadow-[0_0_20px_rgba(0,242,254,0.6)] hover:scale-110'
                      }`}
                      title={isStageLocked ? 'Step Locked (Subscribers Only)' : `Open Step ${stage.stageNumber} Deep-Dive`}
                    >
                      {isStageLocked ? (
                        <Lock className="w-5 h-5 text-amber-400" />
                      ) : (
                        <FootstepIcon className="w-6 h-6" isActive pulse />
                      )}
                    </button>
                    <span className="hidden lg:inline-block px-2 py-0.5 rounded bg-black/85 border border-white/20 text-[10px] font-mono font-bold text-white/75 whitespace-nowrap shadow-sm">
                      STEP {stage.stageNumber}
                    </span>
                  </div>

                  {/* Mobile & iPad Portrait Top Accent Footstep Badge (< 1024px) */}
                  <div
                    onClick={() => handleOpenStageModal(stage)}
                    className="lg:hidden flex flex-wrap xs:flex-nowrap items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-[#090e1c]/95 border border-cyan-500/40 mb-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.6)] cursor-pointer hover:border-cyan-400 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center shrink-0">
                        <FootstepIcon className="w-4 h-4" isActive pulse />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-mono font-bold text-cyan-300 block truncate">
                          STEP {stage.stageNumber} · {stage.richIcon} {stage.navLabel}
                        </span>
                        <span className="text-[10px] font-mono text-white/50 block truncate">
                          {stage.timeframe}
                        </span>
                      </div>
                    </div>

                    {isStageLocked ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenStageModal(stage);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white/90 text-[10.5px] font-mono font-bold cursor-pointer shrink-0 ml-auto flex items-center gap-1 whitespace-nowrap"
                      >
                        <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                        <span>Inspect Step</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenStageModal(stage);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-400 text-black text-[10.5px] font-mono font-bold cursor-pointer shrink-0 ml-auto shadow-sm whitespace-nowrap"
                      >
                        Deep Dive →
                      </button>
                    )}
                  </div>

                  {/* Responsive Grid: Single-Column for Mobile/iPad Portrait (< 1024px) & Alternating 2-Column Desktop (>= 1024px) */}
                  <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-14 items-center">
                    {/* Visual Card Column */}
                    <div className={`space-y-4 overflow-visible ${isEven ? 'lg:order-1' : 'lg:order-2'}`}>
                      <div
                        onClick={() => handleOpenStageModal(stage)}
                        className={`relative rounded-3xl overflow-visible border transition-transform duration-200 cursor-pointer shadow-[0_4px_35px_rgba(0,0,0,0.7)] ${
                          isStageLocked
                            ? 'bg-[#060a15] border-white/10 hover:border-amber-400/40 opacity-85 hover:opacity-100'
                            : 'bg-[#070d1e] border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_35px_rgba(0,242,254,0.25)] hover:scale-[1.01]'
                        }`}
                      >
                        {/* Bespoke 16:9 Visual Banner with Rounded Image Clipping & Crisp Stacked Overlays */}
                        <div className="relative aspect-[16/9] w-full rounded-t-3xl overflow-hidden bg-[#050811] group/banner">
                          {/* Lightweight GPU-accelerated skeletal base */}
                          <div className="absolute inset-0 bg-[#070d1a] pointer-events-none" />
                          <img
                            src={stage.heroImage}
                            alt={stage.heroImageAlt}
                            loading="lazy"
                            decoding="async"
                            style={{ willChange: 'opacity, transform' }}
                            className={`relative z-10 w-full h-full object-cover transition-all duration-300 group-hover/banner:scale-105 opacity-90 group-hover/banner:opacity-100 transform-gpu ${
                              stage.id === 4 ? 'filter blur-[13px] group-hover/banner:blur-[10px] scale-[1.04]' : ''
                            }`}
                          />
                          {stage.id === 4 && (
                            <div className="absolute inset-0 z-25 flex items-center justify-center p-3 pointer-events-none">
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/90 border border-purple-400/60 text-[10px] font-mono font-bold text-purple-200 shadow-lg backdrop-blur-md">
                                <ShieldCheck className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                                <span>SECURITY BLUR ACTIVE</span>
                              </div>
                            </div>
                          )}
                          {/* Desktop-Only Image Gradient (z-20) */}
                          <div className="hidden xl:block absolute inset-0 z-20 bg-gradient-to-t from-black via-black/35 to-black/25 pointer-events-none" />

                          {/* Top Overlay Badges (Desktop Only >= 1280px, strictly z-30 above image & gradient) */}
                          <div className="hidden xl:flex flex-wrap items-center justify-between gap-2 absolute top-4 left-4 right-4 z-30 pointer-events-none">
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                              <span className="px-2.5 py-1 rounded-lg bg-cyan-400 text-black font-mono font-extrabold text-xs tracking-wider shadow-md shrink-0">
                                STEP {stage.stageNumber}
                              </span>
                              <span className="text-[10.5px] font-mono px-2.5 py-0.5 rounded bg-black/80 border border-cyan-400/50 text-cyan-300 font-bold uppercase tracking-wider shrink-0">
                                {stage.tag}
                              </span>
                            </div>

                            {isStageLocked ? (
                              <span className="text-[10.5px] font-mono px-2.5 py-1 rounded-full bg-amber-950/90 border border-amber-400/60 text-amber-300 font-bold flex items-center gap-1.5 shadow-sm shrink-0 ml-auto">
                                <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                                <span>LOCKED · JAN 9, 2027</span>
                              </span>
                            ) : (
                              <span className="text-[10.5px] font-mono px-2.5 py-1 rounded-full bg-cyan-950/90 border border-cyan-400/50 text-cyan-300 font-bold flex items-center gap-1 shadow-sm shrink-0 ml-auto">
                                <Eye className="w-3 h-3 shrink-0" />
                                <span>DEEP-DIVE MODAL</span>
                              </span>
                            )}
                          </div>

                          {/* Bottom Overlay Title & Action Indicator (Desktop Only >= 1280px, strictly z-30) */}
                          <div className="hidden xl:flex absolute bottom-4 left-4 right-4 z-30 items-end justify-between gap-3">
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <span className="text-[10px] font-mono text-cyan-300/90 uppercase tracking-wider block">
                                {stage.timeframe}
                              </span>
                              <h3 className="text-base sm:text-xl font-display font-bold text-white leading-tight">
                                {stage.title}
                              </h3>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenStageModal(stage);
                              }}
                              className="w-9 h-9 rounded-xl bg-cyan-400/20 hover:bg-cyan-400 hover:text-black border border-cyan-400/40 flex items-center justify-center text-cyan-300 group-hover/banner:bg-cyan-400 group-hover/banner:text-black transition-all cursor-pointer shrink-0"
                              title={`Inspect Step ${stage.stageNumber} Deep-Dive`}
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* Card Body Brief */}
                        <div className="p-4 sm:p-5 space-y-3">
                          {/* Mobile & Tablet Header Block (< 1280px, wrapping badge row prevents right-edge clipping) */}
                          <div className="xl:hidden space-y-2 pb-2.5 border-b border-white/10">
                            <div className="flex flex-wrap items-center justify-between gap-1.5 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                <span className="px-2 py-0.5 rounded bg-cyan-400 text-black font-mono font-extrabold text-[10px] tracking-wider shadow-sm shrink-0">
                                  STEP {stage.stageNumber}
                                </span>
                                <span className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-black/60 border border-cyan-400/40 text-cyan-300 font-bold uppercase max-w-full truncate">
                                  {stage.tag}
                                </span>
                              </div>
                              {isStageLocked ? (
                                <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold flex items-center gap-1 shrink-0 ml-auto">
                                  <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                  <span>LOCKED</span>
                                </span>
                              ) : (
                                <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 font-bold flex items-center gap-1 shrink-0 ml-auto">
                                  <Eye className="w-2.5 h-2.5 shrink-0" />
                                  <span>DEEP DIVE</span>
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
                            className="pt-2 border-t border-white/10 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs font-mono cursor-pointer hover:text-cyan-300 transition-colors min-w-0"
                          >
                            <span className="text-cyan-300 font-semibold flex items-center gap-1.5 truncate min-w-0 flex-1 mr-1">
                              <Sparkles className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">📁 Vault: {stage.vaultFolderMapping}</span>
                            </span>
                            <span className="text-white/70 hover:text-cyan-400 underline shrink-0 font-bold whitespace-nowrap">
                              VIEW ASSET VAULT →
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Narrative & Master Asset Brief Column */}
                    <div className={`space-y-4 transform-gpu ${isEven ? 'lg:order-2' : 'lg:order-1'}`} style={{ willChange: 'opacity, transform' }}>
                      <div
                        onClick={() => handleOpenStageModal(stage)}
                        style={{ willChange: 'opacity, transform' }}
                        className="p-6 rounded-3xl bg-[#070d1e] border border-cyan-500/30 hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(0,242,254,0.15)] transition-colors duration-200 cursor-pointer space-y-4 transform-gpu"
                      >
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
                              STEP {stage.stageNumber} ARCHITECTURE
                            </span>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-white/80 font-sans italic leading-relaxed">
                          &ldquo;{stage.millTransmission}&rdquo;
                        </p>

                        {/* Master Asset Delivery Spec Box (Clickable to Inspect Step Deliverables) */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenStageModal(stage);
                          }}
                          className="p-3.5 rounded-2xl bg-black/50 hover:bg-black/70 border border-cyan-500/30 hover:border-cyan-400/60 transition-all cursor-pointer space-y-2 group/asset"
                          title="Click to Inspect Step Deliverables & Architecture"
                        >
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="font-bold text-white flex items-center gap-1.5 group-hover/asset:text-cyan-300 transition-colors">
                              <FolderDown className="w-3.5 h-3.5 text-cyan-400" />
                              Deliverable Asset
                            </span>
                            <span className="text-cyan-300 font-semibold">{stage.masterAsset.fileSize}</span>
                          </div>
                          <p className="text-[11.5px] text-white/70 font-sans group-hover/asset:text-white/90 transition-colors">
                            {stage.masterAsset.title} ({stage.masterAsset.fileFormat})
                          </p>
                        </div>

                        {/* Milestone Card Action Buttons */}
                        <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center lg:items-stretch xl:items-center gap-2.5 pt-1 w-full min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              soundManager.playTone(720, 0.08);
                              const folderId = VAULT_STAGE_FOLDER_IDS[stage.stageNumber] || 'folder-01';
                              if (onNavigateToVault) onNavigateToVault(folderId);
                            }}
                            className="flex-1 min-w-0 py-2.5 px-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,242,254,0.3)] whitespace-nowrap overflow-hidden"
                          >
                            <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">VIEW ASSET VAULT →</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenStageModal(stage);
                            }}
                            className="shrink-0 py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-mono text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            {isStageLocked ? (
                              <>
                                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>Inspect Step</span>
                              </>
                            ) : (
                              <>
                                <span>Inspect Step</span>
                                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Midway Checkpoint: 50% Member Wall Banner after Step 03 */}
                  {stage.id === 3 && (
                    <div className="relative my-12 sm:my-16 z-30">
                      <div
                        style={{ willChange: 'opacity, transform' }}
                        className="relative rounded-3xl bg-[#070d1e] border-2 border-cyan-400/60 p-6 sm:p-10 shadow-[0_0_60px_rgba(0,242,254,0.2)] overflow-hidden text-center space-y-6 transform-gpu"
                      >
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-400/60 text-cyan-300 font-mono text-xs font-extrabold tracking-wider shadow-[0_0_15px_rgba(0,242,254,0.3)]">
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>THE ÄKINOYA MEMBER WALL · PAID SUBSCRIBER GATE</span>
                        </div>

                        <div className="space-y-2 max-w-3xl mx-auto">
                          <h2 className="text-2xl sm:text-4xl font-display font-black text-white tracking-tight">
                            Full Asset Downloads &amp; Advanced Steps Release{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-amber-300">
                              January 9, 2027
                            </span>
                          </h2>
                          <p className="text-xs sm:text-base text-white/75 font-sans leading-relaxed">
                            All users have view-only access to inspect the 5-step 3D-to-AI architecture and
                            visual specs. Raw greybox `.blend` bases, 24fps Workbench rigs, canonical `@TAG` look-up sheets, and `Logic_Pro_Master_Template.logicx` audio stems unlock on{' '}
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
                              className="p-3 sm:p-4 rounded-2xl bg-[#040814] border border-cyan-500/40 shadow-[0_0_15px_rgba(0,242,254,0.1)] flex flex-col items-center justify-center"
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
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* COMPREHENSIVE STAGE DEEP-DIVE MODAL (PORTALED TO BODY)   */}
      {/* ======================================================== */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {selectedStageForModal && (
              <div
                className="fixed inset-0 z-[100000] flex items-center justify-center p-2.5 sm:p-5 overflow-hidden select-none"
                style={{
                  touchAction: 'none',
                  paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
                }}
              >
                {/* Backdrop Blur (touchAction: none stops background hub bleed on iOS/mobile) */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedStageForModal(null)}
                  style={{ touchAction: 'none' }}
                  className="fixed inset-0 bg-black/85 backdrop-blur-md z-0 cursor-pointer"
                />

                {/* Modal Dialog Shell (Flex column: pinned header + independent touch-scrolling body) */}
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 12 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  onClick={(e) => e.stopPropagation()}
                  className="workflow-deepdive-card relative z-10 w-full max-w-4xl flex flex-col rounded-3xl bg-[#070b16]/98 border-2 border-cyan-400/60 shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(0,242,254,0.3)] text-white font-sans overflow-hidden overscroll-contain select-text"
                  style={{ touchAction: 'pan-y' }}
                >
                  {/* Pinned Modal Header Bar (Never scrolls away or traps user) */}
                  <div className="shrink-0 flex items-center justify-between gap-2 border-b border-white/10 px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 bg-[#070b16]/98 z-20">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                      <span className="px-2.5 sm:px-3 py-1 rounded-lg bg-cyan-400 text-black font-mono font-extrabold text-[11px] sm:text-xs tracking-wider shadow-[0_0_12px_rgba(0,242,254,0.4)] shrink-0">
                        STEP {selectedStageForModal.stageNumber}
                      </span>
                      <span className="text-[11px] sm:text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider truncate">
                        {selectedStageForModal.tag}
                      </span>
                      <span className="hidden sm:inline text-xs font-mono text-white/50 truncate">
                        · {selectedStageForModal.timeframe}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playTone(440, 0.05);
                        setSelectedStageForModal(null);
                      }}
                      className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer shrink-0 touch-manipulation"
                      title="Close Modal"
                      aria-label="Close Deep Dive"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Kinetic Touch-Scrollable Content Body */}
                  <div
                    ref={modalScrollContainerRef}
                    className="workflow-deepdive-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y px-4 sm:px-6 lg:px-8 py-5 space-y-6 [scrollbar-width:thin]"
                    style={{
                      WebkitOverflowScrolling: 'touch',
                      overscrollBehaviorY: 'contain',
                      paddingBottom: 'max(28px, calc(env(safe-area-inset-bottom, 0px) + 24px))',
                    }}
                  >
                    {/* Modal Hero Visual & Banner */}
                    <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 group/hero aspect-[16/9] sm:aspect-[2.39/1] bg-black/90">
                      <img
                        src={selectedStageForModal.heroImage}
                        alt={selectedStageForModal.heroImageAlt}
                        className={`relative z-10 w-full h-full object-cover transition-all duration-300 ${
                          selectedStageForModal.id === 4 ? 'filter blur-[13px] scale-[1.04]' : ''
                        }`}
                      />
                      {selectedStageForModal.id === 4 && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center pointer-events-none">
                          <div className="px-4 py-2.5 rounded-xl bg-black/85 border border-purple-500/50 backdrop-blur-md shadow-[0_0_30px_rgba(168,85,247,0.4)] flex items-center gap-2 text-purple-200 font-mono text-xs font-bold uppercase tracking-wider">
                            <ShieldCheck className="w-4 h-4 text-purple-300 shrink-0" />
                            <span>CANONICAL @TAG SHEET · PROTECTED</span>
                          </div>
                        </div>
                      )}
                      {/* Desktop-Only Image Gradient & Title Overlay (z-25 above blur/img, below button) */}
                      <div className="hidden xl:flex absolute inset-0 z-25 bg-gradient-to-t from-black/90 via-black/20 to-transparent items-end p-5 pointer-events-none">
                        <div className="space-y-1 w-full">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/70 border border-cyan-400/40 text-cyan-300">
                            3D-TO-AI PIPELINE SPECIFICATION · VAULT MAPPED
                          </span>
                          <h2 className="text-xl sm:text-3xl font-display font-extrabold text-white">
                            {selectedStageForModal.title}
                          </h2>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedPreviewImage(selectedStageForModal.heroImage)}
                        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 px-2.5 sm:px-3 py-1.5 rounded-lg bg-black/75 hover:bg-black/95 border border-white/25 text-white font-mono text-[11px] sm:text-xs flex items-center gap-1.5 transition-colors cursor-pointer touch-manipulation"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-cyan-300" />
                        <span>Expand Visual</span>
                      </button>
                    </div>

                  {/* Mobile & iPad Header Block (Clean Visual Below Imagery for < 1280px) */}
                  <div className="xl:hidden p-4 rounded-2xl bg-black/60 border border-white/10 space-y-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/70 border border-cyan-400/40 text-cyan-300">
                      STEP {selectedStageForModal.stageNumber} · {selectedStageForModal.tag}
                    </span>
                    <h2 className="text-lg sm:text-xl font-display font-extrabold text-white">
                      {selectedStageForModal.title}
                    </h2>
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        {selectedStageForModal.odiCaseStudy.previewThumbnails.map((th) => {
                          const isProtectedTagStage = selectedStageForModal.id === 4;
                          return (
                            <div
                              key={th.caption}
                              onClick={() => setSelectedPreviewImage(th.img)}
                              className="relative rounded-xl overflow-hidden border border-white/10 hover:border-purple-400/50 group/thumb cursor-pointer aspect-[16/9] bg-black/70 select-none"
                            >
                              <img
                                src={th.img}
                                alt={th.caption}
                                className={`w-full h-full object-cover transition-all duration-300 pointer-events-none select-none ${
                                  isProtectedTagStage
                                    ? 'filter blur-[12px] group-hover/thumb:blur-[9px] scale-105'
                                    : 'group-hover/thumb:scale-105'
                                }`}
                              />
                              {isProtectedTagStage && (
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-2 pointer-events-none">
                                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/80 border border-purple-400/50 text-purple-200 uppercase tracking-wider shadow-sm flex items-center gap-1 backdrop-blur-sm">
                                    <ShieldCheck className="w-3 h-3 text-purple-300" />
                                    Security Blur
                                  </span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-2 pointer-events-none">
                                <span className="text-[10px] font-mono text-cyan-200 truncate font-semibold">
                                  {th.caption}
                                </span>
                              </div>
                            </div>
                          );
                        })}
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

                  {/* Canonical @TAG Reference Plates (Step 04 Custom Master Files) */}
                  {selectedStageForModal.characterDownloads && (
                    <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#0e1222]/90 to-black/90 border border-purple-500/40 space-y-4 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                      <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-purple-400" />
                          <h4 className="text-sm font-mono font-bold text-purple-200 tracking-wider uppercase">
                            Canonical @TAG Reference Sheets (Mill · Odi · Sillow)
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-400/30">
                          3 MASTER PLATES
                        </span>
                      </div>

                      <p className="text-xs text-white/70 font-sans">
                        Official canonical @TAG visual anchor sheets from 04_Canonical_Tag_References/, ready for lighting calibration and cut-to-cut continuity.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 pt-1">
                        {selectedStageForModal.characterDownloads.map((char, index) => (
                          <div
                            key={char.name}
                            className={`p-4 sm:p-5 rounded-2xl bg-[#080d1c]/90 border border-purple-500/30 hover:border-purple-400/60 flex flex-col justify-between transition-all shadow-lg hover:shadow-[0_0_25px_rgba(168,85,247,0.2)] ${
                              index === 2 ? 'sm:col-span-2 sm:max-w-md sm:mx-auto sm:w-full lg:col-span-1 lg:max-w-none' : ''
                            }`}
                          >
                            <div className="space-y-3.5 flex-1 flex flex-col">
                              {/* Preview Image with Stylish Asset Security Blur */}
                              <div
                                onClick={() => setSelectedPreviewImage(char.img)}
                                className="aspect-[4/3] rounded-xl overflow-hidden bg-black/90 border border-white/10 hover:border-purple-400/60 cursor-pointer relative group/char select-none shrink-0"
                              >
                                <img
                                  src={char.img}
                                  alt={`${char.name} — ${char.role || ''}`}
                                  className="w-full h-full object-cover filter blur-[8px] group-hover/char:blur-[5px] scale-105 transition-all duration-300 pointer-events-none select-none"
                                />

                                {/* Standardized Security Badge Placement - Top Right */}
                                <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none">
                                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-black/80 border border-purple-400/40 text-purple-300 backdrop-blur-md flex items-center gap-1 font-bold shadow-sm">
                                    <ShieldCheck className="w-3 h-3 text-purple-400" />
                                    LOCKED
                                  </span>
                                </div>

                                {/* Anti-Screenshot Security Overlay */}
                                <div className="absolute inset-0 bg-black/40 group-hover/char:bg-black/20 transition-colors flex flex-col items-center justify-center p-3 text-center pointer-events-none">
                                  <div className="p-2 rounded-full bg-purple-950/85 border border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.4)] mb-1.5 backdrop-blur-sm">
                                    <ShieldCheck className="w-4 h-4 text-purple-300" />
                                  </div>
                                  <span className="text-[10px] font-mono font-bold tracking-widest text-purple-200 uppercase">
                                    SECURITY PROTECTED
                                  </span>
                                  <span className="text-[9px] font-mono text-white/70 mt-0.5">
                                    Anti-Screenshot Blur Active
                                  </span>
                                </div>

                                {/* Bottom Bar: Inspect Plate & Format */}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2.5 flex items-center justify-between pointer-events-none">
                                  <span className="text-[9.5px] font-mono text-cyan-300 flex items-center gap-1 font-semibold">
                                    <Eye className="w-3 h-3 text-cyan-400" /> Inspect Plate
                                  </span>
                                  <span className="text-[8.5px] font-mono px-2 py-0.5 rounded-full bg-purple-900/80 border border-purple-400/30 text-purple-200 font-semibold">
                                    {char.format}
                                  </span>
                                </div>
                              </div>

                              {/* Character Details */}
                              <div className="space-y-1.5 flex-1 flex flex-col">
                                <div className="flex items-center justify-between gap-2">
                                  <h5 className="text-sm sm:text-base font-display font-bold text-white tracking-wide">
                                    {char.name}
                                  </h5>
                                  <span className="text-[10px] font-mono text-purple-300 px-2.5 py-0.5 rounded-md bg-purple-950/80 border border-purple-500/30 font-semibold shrink-0">
                                    {char.size}
                                  </span>
                                </div>
                                {char.role && (
                                  <span className="text-xs font-mono font-bold text-cyan-300 block">
                                    {char.role}
                                  </span>
                                )}
                                <p className="text-xs text-white/70 font-sans leading-relaxed pt-1">
                                  {char.description}
                                </p>
                              </div>
                            </div>

                            {/* Standardized Asset Action Button */}
                            <button
                              type="button"
                              onClick={() => {
                                soundManager.playTone(580, 0.05);
                                if (onNavigateToVault) onNavigateToVault(VAULT_STAGE_FOLDER_IDS['04']);
                              }}
                              className="w-full min-h-[42px] py-2.5 px-4 mt-4 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-200 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shrink-0"
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
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Lightbox Modal for Fullscreen Image Inspection (PORTALED TO BODY) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {selectedPreviewImage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedPreviewImage(null)}
                style={{ touchAction: 'none' }}
                className="fixed inset-0 z-[100010] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8 overflow-hidden cursor-zoom-out select-none"
              >
                {(() => {
                  const isCharacterPlate =
                    selectedStageForModal?.id === 4 ||
                    selectedPreviewImage === millLockingImg ||
                    selectedPreviewImage === odiLockingImg ||
                    selectedPreviewImage === sillowLockingImg;

                  return (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="relative m-auto max-w-5xl max-h-[88dvh] rounded-2xl overflow-hidden border border-cyan-500/40 shadow-[0_0_50px_rgba(0,242,254,0.3)] bg-black cursor-default"
                    >
                      <img
                        src={selectedPreviewImage}
                        alt="Enlarged Case Study Asset"
                        className={`w-full h-full object-contain max-h-[85dvh] select-none pointer-events-none ${
                          isCharacterPlate ? 'filter blur-[13px] scale-[1.04]' : ''
                        }`}
                      />
                      {isCharacterPlate && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                          <div className="px-5 py-3.5 rounded-2xl bg-black/85 border border-purple-500/50 backdrop-blur-md shadow-[0_0_40px_rgba(168,85,247,0.5)] space-y-1.5 max-w-md">
                            <div className="flex items-center justify-center gap-2 text-purple-300 font-mono text-xs font-bold uppercase tracking-widest">
                              <ShieldCheck className="w-4 h-4 text-purple-400" />
                              <span>ANTI-SCREENSHOT SECURITY BLUR</span>
                            </div>
                            <p className="text-[11px] font-mono text-white/80 leading-relaxed">
                              Proprietary character designs and turnaround plates are protected against scraping. Uncensored lossless master plates unlock for members on Jan 9, 2027.
                            </p>
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedPreviewImage(null)}
                        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 px-3 py-1.5 rounded-lg bg-black/85 border border-white/25 text-white font-mono text-xs hover:bg-white/20 transition-colors cursor-pointer touch-manipulation"
                      >
                        Close ✕
                      </button>
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

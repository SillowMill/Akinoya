import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  Film,
  Music,
  Download,
  Lock,
  Unlock,
  Eye,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Search,
  Grid,
  List,
  Layers,
  Sliders,
  Sparkles,
  ShieldCheck,
  Crown,
  Play,
  Pause,
  ArrowLeft,
  X,
  File,
  CheckCircle2,
  HardDrive,
  Info,
  ExternalLink,
  Laptop,
  Box,
  Disc,
  ShoppingBag,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';

import moodboardImg from '../assets/images/Mood.webp';
import akinoyaVistaImg from '../assets/images/akinoya_twilight_world_1790852640934.webp';
import stage01Img from '../assets/images/stage_01_storyboard_blueprint.webp';
import stage02Img from '../assets/images/stage_02_character_reference_sheet.webp';
import stage03Img from '../assets/images/stage_03_cockpit_previs_wireframe.webp';
import stage04Img from '../assets/images/stage_04_cybernetic_prompt_datastream.webp';
import stage05Img from '../assets/images/stage_05_cinematic_color_grading_waveform.webp';
import vocalAcapellaImg from '../assets/images/vocal_acapella_remix_pack.webp';
import bingaaComicCover from '../assets/images/bingaa_comic_cover.webp';
import akinoyaPassCard from '../assets/images/akinoya_pass_card_1790852652003.webp';
import akinoyaHeroBg from '../assets/images/akinoya_hero_bg-CiYAZVRx.webp';

// Character Locking Master Assets (from Character Locking folder)
import millCharacterImg from '../assets/images/character_locking/MilLLL.webp';
import odiCharacterImg from '../assets/images/character_locking/Odi.webp';
import sillowCharacterImg from '../assets/images/character_locking/Sillow.webp';

import { BINGAA_PDF_URL, BINGAA_PDF_FILENAME } from '../utils/certificate';
import { VAULT_STAGE_FOLDER_IDS, VAULT_STAGE_NAMES } from '../utils/drive';

export interface DriveFolderVaultProps {
  isMember?: boolean;
  onOpenAuthModal?: () => void;
  initialFolderId?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  extension: string;
  size: string;
  typeBadge: string;
  badgeColor: string;
  modified: string;
  isLocked: boolean;
  productId?: string;
  downloadUrl?: string;
  downloadFileName?: string;
  previewImg?: string;
  isAudio?: boolean;
  description: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  displayName: string;
  shortName?: string;
  richIcon: string;
  category: string;
  itemCount: number;
  totalSize: string;
  isLocked: boolean;
  productId?: string;
  subfolders?: DriveFolder[];
  files?: DriveFile[];
}

export const DriveFolderVault: React.FC<DriveFolderVaultProps> = ({
  isMember = false,
  onOpenAuthModal,
  initialFolderId,
}) => {
  // Navigation State (Drive Path Navigation)
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [folderPath, setFolderPath] = useState<Array<{ id: string; name: string }>>([
    { id: 'root', name: 'Sillow Mill Drive' },
  ]);

  // View Mode: 'list' or 'grid' (Apple Finder style)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<DriveFile | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Owned products set memoized to eliminate redundant localStorage JSON parsing loops
  const ownedProductsSet = useMemo(() => {
    try {
      const owned = localStorage.getItem('akinoya_owned_products');
      if (owned) {
        return new Set<string>(JSON.parse(owned));
      }
    } catch {}
    return new Set<string>();
  }, []);

  // Check if item or folder is unlocked for the user
  const isItemUnlocked = useCallback(
    (item?: { isLocked?: boolean; productId?: string } | null): boolean => {
      if (!item) return false;
      if (isMember) return true;
      if (!item.isLocked) return true;
      if (ownedProductsSet.has('membership') || ownedProductsSet.has('all-inclusive')) return true;
      if (item.productId && ownedProductsSet.has(item.productId)) return true;
      if (
        (item.productId === 'comic' || item.productId === 'comic-digital') &&
        (ownedProductsSet.has('comic') || ownedProductsSet.has('comic-digital'))
      )
        return true;
      if (
        (item.productId === 'workflow' || item.productId === 'logic-visualizer') &&
        (ownedProductsSet.has('workflow') || ownedProductsSet.has('logic-visualizer'))
      )
        return true;
      if (
        item.productId === 'world-synthesis' &&
        (ownedProductsSet.has('world-synthesis') ||
          ownedProductsSet.has('membership') ||
          ownedProductsSet.has('all-inclusive'))
      )
        return true;
      return false;
    },
    [isMember, ownedProductsSet]
  );

  // Trigger Checkout for Gated Deliverables
  const handleTriggerCheckoutForProduct = (productId?: string) => {
    soundManager.playTone(660, 0.08);
    let productDetails: any = null;

    if (productId === 'vocal') {
      productDetails = {
        id: 'vocal',
        title: 'Sillow Mill — Vocal Acapella & Remix Pack',
        subtitle: 'Studio acapellas (dry/wet), stems & remix audio',
        badge: 'VOCAL ACAPELLAS & STEMS · €19.99',
        priceValue: '19.99',
        isPhysical: false,
        image: vocalAcapellaImg,
        deliveryNotice: 'Instant Access · Asset Vault inside the Hub',
        allocationNotice: 'Instant Master Stems · 24-bit / 48kHz WAV',
      };
    } else if (productId === 'comic-digital') {
      productDetails = {
        id: 'comic-digital',
        title: 'Sillow Mill — Digital Copy of Bingäa',
        subtitle: 'Pristine 4K digital copy, flipbook reader & print-ready assets',
        badge: 'DIGITAL GRAPHIC NOVEL · 4K MASTER · €9.99',
        priceValue: '9.99',
        isPhysical: false,
        image: bingaaComicCover,
        deliveryNotice: 'Instant Access · Asset Vault inside the Hub',
        allocationNotice: 'Pristine 4K Resolution · Web Reader + Offline PDF',
      };
    } else if (productId === 'comic') {
      productDetails = {
        id: 'comic',
        title: "Sillow Mill — Bingäa (Collector's Graphic Novel)",
        subtitle: "Bingäa Issue #01 — Collector's Print & 4K Digital Master",
        badge: "PHYSICAL PRINT & 4K DIGITAL · €14.99",
        priceValue: '14.99',
        isPhysical: true,
        image: bingaaComicCover,
        allocationNotice: 'Pristine 4K Resolution + Physical Collector Softcover Book',
        deliveryNotice: 'Free Express Delivery · Physical Shipping + Instant Digital Sync',
      };
    } else if (productId === 'workflow' || productId === 'logic-visualizer') {
      productDetails = {
        id: 'workflow',
        title: 'Sillow Mill — Workflow',
        subtitle: 'Official 2D visualizer workflow, Enerwise sound architecture, vocal chain & dedicated Logic Pro template',
        badge: 'WORKFLOW & LOGIC PRO · €29.99',
        priceValue: '29.99',
        isPhysical: false,
        image: stage03Img,
        deliveryNotice: 'Instant Access · Asset Vault inside the Hub',
        allocationNotice: 'Complete Äkinoya Workflow · Blender Previs & Logic Pro Template',
      };
    } else if (productId === 'membership') {
      productDetails = {
        id: 'membership',
        title: 'Sillow Mill — Annual Pioneer Member Pass',
        subtitle: 'Folder 1 (Workflow), all 3 Master Folders + Physical Welcome Booklet',
        badge: 'ANNUAL ALL-INCLUSIVE PASS · €60/YR',
        priceValue: '60.00',
        isPhysical: true,
        image: akinoyaPassCard,
        allocationNotice: 'Wave 2 Physical Booklet & Collector Pass Card Included',
        deliveryNotice: 'Free Express Delivery · Physical Shipping + Instant Vault Access',
      };
    } else if (productId === 'world-synthesis') {
      productDetails = {
        id: 'world-synthesis',
        title: 'Sillow Mill — Synthesize & Feature Your World',
        subtitle: "Synthesize your custom planet, cover full 3D rendering & video trailer generation costs, and secure your official co-creation spot to feature directly in a future cinematic visualizer once all 11 visualizers are released",
        badge: 'CO-CREATION PASS · LIMITED SECTOR EXPANSION',
        priceValue: '14.99',
        isPhysical: false,
        image: akinoyaHeroBg,
        deliveryNotice: 'Instant Access · Asset Vault inside the Hub',
        allocationNotice: '5-Photo 4K Dossier · 9:16 Video Loop · Visualizer Slot',
      };
    } else {
      // Default / Folder 1 -> Workflow add-on (€29.99, digital)
      productDetails = {
        id: 'workflow',
        title: 'Sillow Mill — Workflow',
        subtitle: 'Official 2D visualizer workflow, Enerwise sound architecture, vocal chain & dedicated Logic Pro template',
        badge: 'WORKFLOW & LOGIC PRO · €29.99',
        priceValue: '29.99',
        isPhysical: false,
        image: stage03Img,
        deliveryNotice: 'Instant Access · Asset Vault inside the Hub',
        allocationNotice: 'Complete Äkinoya Workflow · Blender Previs & Logic Pro Template',
      };
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('akinoya-open-checkout', { detail: productDetails }));
    }
  };

  // Reorganized Top-Level Master Folders & Dissected Pipeline Structure
  const DRIVE_HIERARCHY: DriveFolder[] = [
    // ═══════════════════════════════════════════════════════════════════════
    // MASTER FOLDER 1: Workflow
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'folder-01',
      name: '01_Workflow',
      displayName: 'Folder 1 · Workflow',
      shortName: '01 · Workflow',
      richIcon: '🎛️',
      category: 'Dissected 5-Stage Production Pipeline, Storyboards & DAW Templates',
      itemCount: 23,
      totalSize: '1.28 GB',
      isLocked: true,
      productId: 'workflow',
      subfolders: [
        {
          id: 'stage-01',
          name: '01_Storyboards_Script_Blueprints',
          displayName: '01 · Storyboards & Script Blueprints',
          shortName: '01 · Storyboards',
          richIcon: '🎬',
          category: 'Storyboards & 2.39:1 framing specs',
          itemCount: 6,
          totalSize: '33.1 MB',
          isLocked: true,
          productId: 'workflow',
          files: [
            {
              id: 'file-01-1',
              name: 'Bingäa_Issue01_Director_Script.pdf',
              extension: 'PDF',
              size: '12.4 MB',
              typeBadge: 'PDF Document',
              badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
              modified: 'Oct 12, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage01Img,
              description: 'Official 18-panel director breakdown with scene annotations, camera focal notes, and timing charts.',
            },
            {
              id: 'file-01-2',
              name: 'Scene_Blocking_Director_Notes.txt',
              extension: 'TXT',
              size: '48 KB',
              typeBadge: 'Script Notes',
              badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
              modified: 'Oct 11, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage01Img,
              description: 'Raw text notes from Odi detailing character motivation, pacing beats, and cinematic lighting cues.',
            },
            {
              id: 'file-01-3',
              name: 'Anamorphic_Keyframe_Grids.png',
              extension: 'PNG',
              size: '8.2 MB',
              typeBadge: '2.39:1 Grid',
              badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
              modified: 'Oct 10, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage01Img,
              description: 'High-resolution CinemaScope letterbox keyframe grids with safety margins and title-safe overlays.',
            },
            {
              id: 'file-01-4',
              name: 'Leuven_Snow_Dance_Sequence_Sheet.pdf',
              extension: 'PDF',
              size: '6.8 MB',
              typeBadge: 'Beat Sheet',
              badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
              modified: 'Oct 09, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage01Img,
              description: 'Frame-by-frame beat breakdown of the emotional dance in the snow, translated into camera focal lengths.',
            },
            {
              id: 'file-01-5',
              name: 'Pacing_Tension_Timeline_2.39.xlsx',
              extension: 'XLSX',
              size: '1.2 MB',
              typeBadge: 'Timing Chart',
              badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
              modified: 'Oct 08, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage01Img,
              description: 'Mathematical tension curve tracking shot duration, camera velocity, and audio frequency peaks.',
            },
            {
              id: 'file-01-6',
              name: 'Story_Beat_Breakdown_18_Panels.pdf',
              extension: 'PDF',
              size: '4.5 MB',
              typeBadge: 'Story Beats',
              badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
              modified: 'Oct 07, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage01Img,
              description: 'Visual storyboard summary with shot descriptions, camera directions, and scene transitions.',
            },
          ],
        },
        {
          id: 'stage-02',
          name: '02_ArtDirection_Character_Anchors',
          displayName: '02 · Art Direction & Character Anchors',
          shortName: '02 · Art Direction',
          richIcon: '🎨',
          category: 'Character Turnarounds, Mood Anchors & Swatches',
          itemCount: 6,
          totalSize: '52.6 MB',
          isLocked: true,
          productId: 'workflow',
          files: [
            {
              id: 'file-02-1',
              name: 'Sillow — Lead Planetary Explorer',
              extension: 'JPG',
              size: '280 KB',
              typeBadge: 'Explorer Sheet',
              badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
              modified: 'Oct 14, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: sillowCharacterImg,
              description: 'The lead planetary explorer styled with distinct dreadlocks and a tactical harness.',
            },
            {
              id: 'file-02-2',
              name: 'Odi — Scout Mechanic',
              extension: 'JPG',
              size: '275 KB',
              typeBadge: 'Scout Rig',
              badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
              modified: 'Oct 14, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: odiCharacterImg,
              description: 'The scout mechanic without dreadlocks, wearing tactical reconnaissance armor.',
            },
            {
              id: 'file-02-3',
              name: 'Mill — Alien Bio-Analyst',
              extension: 'PNG',
              size: '6.7 MB',
              typeBadge: '4K Master Anchor',
              badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
              modified: 'Oct 14, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: millCharacterImg,
              description: 'The alien bio-analyst in her environmental suit with the mushroom helmet archetype.',
            },
            {
              id: 'file-02-4',
              name: 'Mood_Primary_Atmospheric_Anchor.png',
              extension: 'PNG',
              size: '8.25 MB',
              typeBadge: 'Master Style Anchor',
              badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
              modified: 'Oct 10, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: moodboardImg,
              description: 'Official Mood.png reference used to condition all atmospheric lighting and creature designs.',
            },
            {
              id: 'file-02-5',
              name: 'Twilight_World_Master_Vista.jpg',
              extension: 'JPG',
              size: '3.2 MB',
              typeBadge: 'Planetary Horizon',
              badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
              modified: 'Oct 09, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: akinoyaVistaImg,
              description: 'Master orbital perspective reference for Äkinoya twilight atmospheric curvature.',
            },
            {
              id: 'file-02-6',
              name: 'Akinoya_Cosmic_Cyan_Palette_Swatches.ase',
              extension: 'ASE',
              size: '512 KB',
              typeBadge: 'Adobe Swatch',
              badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
              modified: 'Oct 08, 2026',
              isLocked: true,
              productId: 'workflow',
              description: 'Digital color swatch palette containing locked hex values: #00f2fe (Cyan Galaxy), #b142f0 (Purple Void).',
            },
          ],
        },
        {
          id: 'stage-03',
          name: '03_Logic_Pro_Sound_Architecture',
          displayName: '03 · Logic Pro Project & DAW Architecture',
          shortName: '03 · DAW Architecture',
          richIcon: '🎹',
          category: 'Logic Pro Template, Enerwise Architecture & Presets',
          itemCount: 3,
          totalSize: '108.5 MB',
          isLocked: true,
          productId: 'workflow',
          files: [
            {
              id: 'file-03-1',
              name: 'Akinoya_Vocal_Chain_Logic_Pro_Template.logicx',
              extension: 'LOGICX',
              size: '56.0 MB',
              typeBadge: 'Logic Pro Project',
              badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
              modified: 'Oct 14, 2026',
              isLocked: true,
              productId: 'workflow',
              description: 'Dedicated Logic Pro project template featuring Enerwise sound architecture, my vocal chain routing, bus compression, and spatial imaging.',
            },
            {
              id: 'file-03-2',
              name: 'Akinoya_Modular_Synth_Ableton_Template.als',
              extension: 'ALS',
              size: '48.0 MB',
              typeBadge: 'Ableton Live 11/12',
              badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
              modified: 'Oct 12, 2026',
              isLocked: true,
              productId: 'workflow',
              description: 'Production DAW project file with routing, custom operator chains, and analog saturation racks ready to load.',
            },
            {
              id: 'file-03-3',
              name: 'Enerwise_Mastering_Channel_Strip_Preset.cst',
              extension: 'CST',
              size: '4.5 MB',
              typeBadge: 'Channel Strip',
              badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
              modified: 'Oct 11, 2026',
              isLocked: true,
              productId: 'workflow',
              description: 'Official Enerwise sound architecture channel strip preset for Logic Pro, delivering pristine spectral clarity and warmth.',
            },
          ],
        },
        {
          id: 'stage-04',
          name: '04_Blender_3D_Previs_Cockpit_Rigs',
          displayName: '04 · Blender 3D Previs & Cockpit Rigs',
          shortName: '04 · 3D Previs & Rigs',
          richIcon: '🧊',
          category: '3D Cockpit, EXR Sequences & Camera Trajectories',
          itemCount: 4,
          totalSize: '601.4 MB',
          isLocked: true,
          productId: 'workflow',
          files: [
            {
              id: 'file-04-1',
              name: 'Cockpit_Camera_Velocity_Rig.blend',
              extension: 'BLEND',
              size: '148 MB',
              typeBadge: 'Blender 3.6+ Project',
              badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
              modified: 'Oct 14, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage03Img,
              description: 'Fully rigged 3D cockpit scene with animated camera tracking curves (CAM_TRAJ_A) and forward velocity paths.',
            },
            {
              id: 'file-04-2',
              name: 'Warp_Tunnel_Kinematic_Curves.fbx',
              extension: 'FBX',
              size: '32 MB',
              typeBadge: '3D Geometry',
              badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
              modified: 'Oct 12, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage03Img,
              description: 'High-speed hyperspace warp tunnel polygonal mesh with vertex color coordinates for emissive shader passes.',
            },
            {
              id: 'file-04-3',
              name: '16bit_ZDepth_Normal_Pass_Sequence.exr',
              extension: 'EXR',
              size: '420 MB',
              typeBadge: 'OpenEXR Sequence',
              badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
              modified: 'Oct 11, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage03Img,
              description: 'Uncompressed 16-bit float depth and normal map sequence for multi-modal ControlNet video conditioning.',
            },
            {
              id: 'file-04-4',
              name: 'Anamorphic_Lens_Camera_Tracking_Data.json',
              extension: 'JSON',
              size: '1.4 MB',
              typeBadge: 'Tracker Data',
              badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
              modified: 'Oct 10, 2026',
              isLocked: true,
              productId: 'workflow',
              description: 'Synthesized camera tracking coordinate points formatted for import into Nuke, After Effects, and Blender.',
            },
          ],
        },
        {
          id: 'stage-05',
          name: '05_Prompt_Engineering_Bibles',
          displayName: '05 · Prompt Engineering Bibles & LUTs',
          shortName: '05 · Prompt Bibles',
          richIcon: '⚡',
          category: 'Multi-Block Prompt Databases & ACEScc 3D LUTs',
          itemCount: 4,
          totalSize: '90.7 MB',
          isLocked: true,
          productId: 'workflow',
          files: [
            {
              id: 'file-05-1',
              name: 'Master_Prompt_Vault_120_Templates.json',
              extension: 'JSON',
              size: '2.1 MB',
              typeBadge: 'JSON Schema',
              badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
              modified: 'Oct 14, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage04Img,
              description: 'Centralized database containing 120 production-tested 4-block syntax prompts for Gemini 1.5 Pro and Imagen 3.',
            },
            {
              id: 'file-05-2',
              name: 'Negative_Token_Suppression_Dictionary.txt',
              extension: 'TXT',
              size: '180 KB',
              typeBadge: 'Negative Token Dictionary',
              badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
              modified: 'Oct 12, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage04Img,
              description: 'Weighted negative token array designed to suppress digital plastic shaders, deformed geometry, and edge noise.',
            },
            {
              id: 'file-05-3',
              name: 'Gemini_Imagen3_Seed_Matrix.json',
              extension: 'JSON',
              size: '840 KB',
              typeBadge: 'Seed Matrix',
              badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
              modified: 'Oct 10, 2026',
              isLocked: true,
              productId: 'workflow',
              description: 'Verified deterministic seed numbers yielding photorealistic results across Äkinoya cosmic planetary landscapes.',
            },
            {
              id: 'file-05-4',
              name: 'Akinoya_ACEScc_PrintFilm_Emulation.cube',
              extension: 'CUBE',
              size: '84.2 MB',
              typeBadge: '3D LUT Cube',
              badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
              modified: 'Oct 09, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage05Img,
              description: 'Official 65x65x65 3D LUT cube calibrated for ACEScc and Rec.709 color spaces with custom film print density.',
            },
          ],
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // MASTER FOLDER 2: Vocal Acapella & Remix Pack
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'folder-02',
      name: '02_Vocal_Acapella_Remix_Pack',
      displayName: 'Folder 2 · Vocal Acapella & Remix Pack',
      shortName: '02 · Vocal & Remix Pack',
      richIcon: '🎙️',
      category: 'Studio Acapellas, Dry/Wet Vocal Stems & Remix Audio',
      itemCount: 6,
      totalSize: '645.0 MB',
      isLocked: true,
      productId: 'vocal',
      files: [
        {
          id: 'file-vocal-1',
          name: 'Sillow_Mill_Studio_Lead_Acapella_Dry_96kHz.wav',
          extension: 'WAV',
          size: '142 MB',
          typeBadge: '24-bit 96kHz Dry Vocal',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          modified: 'Oct 14, 2026',
          isLocked: true,
          isAudio: true,
          productId: 'vocal',
          previewImg: vocalAcapellaImg,
          description: 'Pristine raw studio lead vocal stems recorded through custom tube preamp, 100% dry and uncompressed for remixing.',
        },
        {
          id: 'file-vocal-2',
          name: 'Sillow_Mill_Vocal_Harmony_Adlibs_Wet_96kHz.wav',
          extension: 'WAV',
          size: '168 MB',
          typeBadge: '96kHz Wet Harmonies',
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          modified: 'Oct 14, 2026',
          isLocked: true,
          isAudio: true,
          productId: 'vocal',
          description: 'Full stereophonic vocal backing tracks, octave harmonies, atmospheric ad-libs, and celestial reverb tails.',
        },
        {
          id: 'file-vocal-3',
          name: 'Bingaa_Atmospheric_Stem_Pack_128BPM.zip',
          extension: 'ZIP',
          size: '240 MB',
          typeBadge: 'Full Track Stems (128 BPM)',
          badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
          modified: 'Oct 13, 2026',
          isLocked: true,
          productId: 'vocal',
          description: 'Isolated stems: Sub-Bass, Analog Arp, Modular Drones, Granular FX, and Cinematic Percussion at 128 BPM.',
        },
        {
          id: 'file-vocal-4',
          name: 'Sillow_Mill_Teaser_Audio_Master_96kHz.wav',
          extension: 'WAV',
          size: '185 MB',
          typeBadge: '24-bit 96kHz Master',
          badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
          modified: 'Oct 14, 2026',
          isLocked: true,
          isAudio: true,
          productId: 'vocal',
          previewImg: vocalAcapellaImg,
          description: 'Uncompressed studio master recording featuring modular analog synthesis, 432Hz harmonic drones, and sub-bass impact.',
        },
        {
          id: 'file-vocal-5',
          name: 'Analog_Drones_432Hz_SubBass_Impulse.wav',
          extension: 'WAV',
          size: '64 MB',
          typeBadge: 'Sub-Bass Impulse',
          badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
          modified: 'Oct 11, 2026',
          isLocked: true,
          isAudio: true,
          productId: 'vocal',
          description: 'Sub-bass celestial resonance impulse calibrated to 432Hz fundamental frequency for sci-fi atmosphere.',
        },
        {
          id: 'file-vocal-6',
          name: 'Vocal_Pitch_Key_Guide_MIDI_Files.zip',
          extension: 'ZIP',
          size: '12 MB',
          typeBadge: 'MIDI & Key Guide',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          modified: 'Oct 10, 2026',
          isLocked: true,
          productId: 'vocal',
          description: 'MIDI files, chord progressions, tempo maps, and vocal tuning guides for Ableton, FL Studio, and Logic Pro.',
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // MASTER FOLDER 3: Digital Copy of Bingäa
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'folder-03',
      name: '03_Digital_Copy_of_Bingaa',
      displayName: 'Folder 3 · Digital Copy of Bingäa',
      shortName: '03 · Digital Copy of Bingäa',
      richIcon: '📖',
      category: 'Pristine 4K Graphic Novel Files, Web Reader Assets & Offline Editions',
      itemCount: 4,
      totalSize: '285.4 MB',
      isLocked: true,
      productId: 'comic-digital',
      files: [
        {
          id: 'file-comic-1',
          name: 'Bingaa_Collector_Graphic_Novel_Issue01_4K_Master.pdf',
          extension: 'PDF',
          size: '184 MB',
          typeBadge: '4K Master Edition',
          badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
          modified: 'Oct 14, 2026',
          isLocked: true,
          productId: 'comic-digital',
          downloadUrl: BINGAA_PDF_URL,
          downloadFileName: BINGAA_PDF_FILENAME,
          previewImg: bingaaComicCover,
          description: 'Pristine full-resolution 4K digital print master of Bingäa Issue #01 with interactive double-page spread formatting.',
        },
        {
          id: 'file-comic-2',
          name: 'Bingaa_Digital_Flipbook_DualPage_Reader_Assets.zip',
          extension: 'ZIP',
          size: '64 MB',
          typeBadge: 'Web Reader Bundle',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          modified: 'Oct 14, 2026',
          isLocked: true,
          productId: 'comic-digital',
          previewImg: bingaaComicCover,
          description: 'Offline dual-page flipbook reader assets and uncompressed page plate exports for iPad, tablets, and desktop viewers.',
        },
        {
          id: 'file-comic-3',
          name: 'Bingaa_Cover_Art_Print_Ready_300DPI.tiff',
          extension: 'TIFF',
          size: '25 MB',
          typeBadge: '300 DPI CMYK Print',
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          modified: 'Oct 12, 2026',
          isLocked: true,
          productId: 'comic-digital',
          previewImg: bingaaComicCover,
          description: 'Commercial printing press master TIFF file of the official Bingäa Issue #01 cover art at 300 DPI with bleed margins.',
        },
        {
          id: 'file-comic-4',
          name: 'Bingaa_Issue01_Director_Script_FullColor.pdf',
          extension: 'PDF',
          size: '12.4 MB',
          typeBadge: 'Script & Illustrated Panels',
          badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
          modified: 'Oct 11, 2026',
          isLocked: true,
          productId: 'comic-digital',
          previewImg: stage01Img,
          description: 'Full-color director script with dialogue passages, camera angle cues, and behind-the-scenes panel commentary.',
        },
      ],
    },
  ];

  // Helper: Find current folder object or return null (root)
  const getCurrentFolder = (): DriveFolder | null => {
    if (currentFolderId === 'root') return null;

    for (const root of DRIVE_HIERARCHY) {
      if (root.id === currentFolderId) return root;
      if (root.subfolders) {
        for (const sub of root.subfolders) {
          if (sub.id === currentFolderId) return sub;
        }
      }
    }
    return null;
  };

  const currentFolder = getCurrentFolder();

  // Sync with initialFolderId (e.g. when navigated from workflow stages 01-05)
  useEffect(() => {
    if (!initialFolderId) return;

    if (initialFolderId === 'root') {
      setCurrentFolderId('root');
      setFolderPath([{ id: 'root', name: 'Sillow Mill Drive' }]);
      return;
    }

    // Match initialFolderId against top-level master folders and subfolders
    for (const root of DRIVE_HIERARCHY) {
      if (
        root.id === initialFolderId ||
        root.name.toLowerCase().includes(initialFolderId.toLowerCase()) ||
        root.displayName.toLowerCase().includes(initialFolderId.toLowerCase()) ||
        root.shortName?.toLowerCase().includes(initialFolderId.toLowerCase())
      ) {
        setCurrentFolderId(root.id);
        setFolderPath([
          { id: 'root', name: 'Sillow Mill Drive' },
          { id: root.id, name: root.displayName },
        ]);
        return;
      }

      if (root.subfolders) {
        for (const sub of root.subfolders) {
          if (
            sub.id === initialFolderId ||
            sub.name.toLowerCase().includes(initialFolderId.toLowerCase()) ||
            sub.displayName.toLowerCase().includes(initialFolderId.toLowerCase()) ||
            sub.shortName?.toLowerCase().includes(initialFolderId.toLowerCase())
          ) {
            setCurrentFolderId(sub.id);
            setFolderPath([
              { id: 'root', name: 'Sillow Mill Drive' },
              { id: root.id, name: root.displayName },
              { id: sub.id, name: sub.displayName },
            ]);
            return;
          }
        }
      }
    }
  }, [initialFolderId]);

  // Navigation handlers
  const handleOpenFolder = (folder: DriveFolder) => {
    soundManager.playTone(520, 0.05);
    setCurrentFolderId(folder.id);
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.displayName }]);
  };

  const handleNavigateBreadcrumb = (index: number) => {
    soundManager.playTone(480, 0.05);
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    setCurrentFolderId(newPath[newPath.length - 1].id);
  };

  const handleDownloadFile = (file: DriveFile) => {
    soundManager.playTone(660, 0.08);
    const unlocked = isItemUnlocked(file);

    if (unlocked) {
      if (file.downloadUrl) {
        const a = document.createElement('a');
        a.href = file.downloadUrl;
        a.download = file.downloadFileName || file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
      if (file.previewImg) {
        setSelectedFileForPreview(file);
        return;
      }
    } else {
      // Route to checkout for locked asset
      handleTriggerCheckoutForProduct(file.productId);
    }
  };

  const handleToggleAudio = (fileId: string) => {
    if (playingAudioId === fileId) {
      setPlayingAudioId(null);
      soundManager.playTone(380, 0.05);
    } else {
      setPlayingAudioId(fileId);
      soundManager.playTone(660, 0.08);
    }
  };

  // Get current items to render with memoization for 60 FPS touch navigation
  const subfoldersToRender = useMemo(() => {
    return currentFolder ? currentFolder.subfolders || [] : DRIVE_HIERARCHY;
  }, [currentFolder]);

  const filesToRender = useMemo(() => {
    return currentFolder ? currentFolder.files || [] : [];
  }, [currentFolder]);

  const allHierarchyFiles = useMemo(() => {
    return DRIVE_HIERARCHY.flatMap((r) => [
      ...(r.files || []),
      ...(r.subfolders?.flatMap((s) => s.files || []) || []),
    ]);
  }, []);

  // Filter with search query if active
  const filteredFolders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return subfoldersToRender;
    return subfoldersToRender.filter((f) =>
      f.displayName.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)
    );
  }, [searchQuery, subfoldersToRender]);

  const filteredFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filesToRender;
    const source = currentFolder ? filesToRender : allHierarchyFiles;
    return source.filter((f) =>
      f.name.toLowerCase().includes(q) || f.extension.toLowerCase().includes(q)
    );
  }, [searchQuery, currentFolder, filesToRender, allHierarchyFiles]);

  return (
    <div className="relative w-full text-white font-sans space-y-5">
      {/* ======================================================== */}
      {/* APPLE-VIBES MACOS FINDER WINDOW FRAME                    */}
      {/* ======================================================== */}
      <div
        className="w-full max-w-full box-border rounded-3xl bg-gradient-to-b from-[#0f1424]/95 via-[#0b0f1a]/95 to-[#070912]/98 border border-cyan-500/30 shadow-[0_10px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(0,242,254,0.12)] overflow-hidden"
        style={{
          WebkitMaskImage: '-webkit-radial-gradient(white, black)',
          transform: 'translateZ(0)',
        }}
      >
        {/* macOS Title Bar with Window Controls */}
        <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 bg-black/60 border-b border-white/10 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Apple Traffic Light Dots */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] inline-block shadow-sm" />
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] inline-block shadow-sm" />
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#27c93f] border border-[#1aab29] inline-block shadow-sm" />
            </div>

            <div className="h-4 w-px bg-white/15 mx-0.5 sm:mx-1 shrink-0" />

            <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-mono text-white/70 min-w-0 truncate">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="font-bold text-white truncate">Sillow Mill Drive</span>
              <span className="text-white/40 hidden md:inline truncate">· 3 Production Master Folders &amp; Asset Vault</span>
            </div>
          </div>

          {/* Access Status & Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setCurrentFolderId('root');
                setFolderPath([{ id: 'root', name: 'Sillow Mill Drive' }]);
                soundManager.playTone(520, 0.05);
              }}
              className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(0,242,254,0.3)] flex items-center gap-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>VAULT DIRECTORY</span>
            </button>
            {isMember ? (
              <span className="text-[9.5px] sm:text-[10px] font-mono px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold flex items-center gap-1 shadow-sm whitespace-nowrap">
                <Crown className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="hidden xs:inline">ALL-INCLUSIVE PASS ACTIVE</span>
                <span className="xs:hidden">PASS ACTIVE</span>
              </span>
            ) : (
              <span className="text-[9.5px] sm:text-[10px] font-mono px-2 sm:px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold flex items-center gap-1 shadow-sm whitespace-nowrap">
                <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="hidden xs:inline">SECURE ASSET VAULT</span>
                <span className="xs:hidden">VAULT</span>
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Asset Vault Notice Banner */}
        {isMember ? (
          <div className="px-4 py-2.5 bg-emerald-950/60 border-b border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-emerald-300">
            <div className="flex items-center gap-2 min-w-0">
              <Crown className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold tracking-wide truncate">
                ALL-INCLUSIVE VAULT ACCESS ACTIVE — All 3 Master Folders, Acapellas &amp; 4K Deliverables Unlocked.
              </span>
            </div>
            <span className="text-[10px] text-emerald-400/90 font-bold tracking-wider shrink-0 uppercase">
              DIRECT DOWNLOADS ACTIVE
            </span>
          </div>
        ) : (
          <div className="px-4 py-2.5 bg-cyan-950/60 border-b border-cyan-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-cyan-300">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-bold tracking-wide truncate">
                SILLOW MILL ASSET VAULT — Dissected into 3 Dedicated Master Production Folders.
              </span>
            </div>
            <span className="text-[10px] text-cyan-400/90 font-bold tracking-wider shrink-0 uppercase">
              OWNED ASSETS UNLOCKED · GATED ASSETS AVAILABLE À LA CARTE
            </span>
          </div>
        )}

        {/* Finder Toolbar: Search & High-Contrast Breadcrumbs */}
        <div className="p-3 sm:p-4 bg-black/40 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* High-Contrast Breadcrumbs Navigation */}
          <div className="flex items-center gap-1.5 text-xs font-mono overflow-x-auto [scrollbar-width:none] py-1 max-w-full">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold shrink-0 hidden md:inline">
              PATH:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {folderPath.map((item, index) => {
                const isLast = index === folderPath.length - 1;
                const isRoot = index === 0;

                return (
                  <React.Fragment key={item.id}>
                    <button
                      type="button"
                      onClick={() => !isLast && handleNavigateBreadcrumb(index)}
                      disabled={isLast}
                      className={`transition-all rounded-lg text-xs font-mono flex items-center gap-1.5 shrink-0 ${
                        isLast
                          ? 'text-cyan-200 font-bold bg-cyan-950/80 border border-cyan-400/50 shadow-[0_0_12px_rgba(56,189,248,0.25)] px-2.5 py-1 cursor-default'
                          : 'text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 cursor-pointer active:scale-[0.98]'
                      }`}
                      title={isLast ? `Current location: ${item.name}` : `Navigate back to ${item.name}`}
                    >
                      {isRoot ? (
                        <HardDrive className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      ) : (
                        <Folder className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      )}
                      <span className="truncate max-w-[170px] sm:max-w-[240px]">{item.name}</span>
                    </button>
                    {!isLast && (
                      <ChevronRight className="w-3.5 h-3.5 text-cyan-400/70 shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Right Toolbar Controls: Search and View Mode */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search Box */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stems, presets, comics..."
                className="pl-8 pr-7 py-1.5 text-xs rounded-xl bg-white/5 border border-white/10 focus:border-cyan-400 text-white placeholder-white/40 outline-none w-48 sm:w-56 font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-white/40 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-300' : 'text-white/50 hover:text-white'
                }`}
                title="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-300' : 'text-white/50 hover:text-white'
                }`}
                title="Grid view"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Finder Content Area */}
        <div className="p-3.5 sm:p-5 md:p-6 space-y-6 min-h-[420px] w-full max-w-full box-border">
          {/* Prominent Directory Return Header: Positioned at top-left of file/folder view when inside any sub-folder */}
          {folderPath.length > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:px-4 sm:py-3 rounded-2xl bg-gradient-to-r from-cyan-950/70 via-[#091424] to-black border border-cyan-500/40 shadow-[0_0_20px_rgba(56,189,248,0.15)]">
              <div className="flex flex-wrap items-center gap-2">
                {/* Prominent Back to Vault Folders CTA */}
                <button
                  type="button"
                  onClick={() => handleNavigateBreadcrumb(0)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-mono font-bold text-xs sm:text-sm shadow-[0_0_15px_rgba(56,189,248,0.35)] transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98] group"
                  title="Return to main 3 Master Folders overview"
                >
                  <ArrowLeft className="w-4 h-4 text-white group-hover:-translate-x-0.5 transition-transform" />
                  <span>Back to Vault Folders</span>
                </button>

                {/* If nested deeper than 1 level, also provide Up One Level */}
                {folderPath.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleNavigateBreadcrumb(folderPath.length - 2)}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 hover:text-white font-mono text-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                    title={`Go up one level to ${folderPath[folderPath.length - 2].name}`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-white/50" />
                    <span>Up one level</span>
                  </button>
                )}
              </div>

              {/* Active Current Directory Status Badge */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-white/40 hidden md:inline">Viewing Folder:</span>
                <span className="px-2.5 py-1 rounded-lg bg-black/70 border border-cyan-400/30 text-cyan-200 font-bold flex items-center gap-1.5 truncate max-w-[280px]">
                  <FolderOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{folderPath[folderPath.length - 1].name}</span>
                </span>
              </div>
            </div>
          )}

          {/* Folders Group */}
          {filteredFolders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-cyan-400" />
                  Folders ({filteredFolders.length})
                </span>
              </div>

              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5'
                    : 'space-y-2.5'
                }
              >
                {filteredFolders.map((folder) => {
                  const isUnlocked = isItemUnlocked(folder);

                  if (viewMode === 'grid') {
                    return (
                      <div
                        key={folder.id}
                        onClick={() => handleOpenFolder(folder)}
                        className={`group rounded-2xl border transition-all cursor-pointer flex flex-col justify-between p-4 sm:p-5 ${
                          !isUnlocked
                            ? 'bg-black/50 border-white/10 hover:border-amber-400/50 shadow-md'
                            : 'bg-[#0a0f1e]/90 border-cyan-500/30 hover:border-cyan-400 hover:shadow-[0_0_24px_rgba(0,242,254,0.18)] hover:scale-[1.015]'
                        }`}
                        style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
                      >
                        <div className="flex items-start gap-3.5 min-w-0 mb-3.5">
                          {/* Rich Folder Emoji / Icon */}
                          <div
                            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 text-xl sm:text-2xl transition-transform group-hover:scale-105 ${
                              !isUnlocked
                                ? 'bg-amber-950/40 border border-amber-400/30 shadow-sm'
                                : 'bg-cyan-950/60 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,242,254,0.25)]'
                            }`}
                          >
                            {folder.richIcon}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <h4 className="text-xs sm:text-sm font-mono font-bold text-white group-hover:text-cyan-200 truncate">
                              {folder.displayName}
                            </h4>
                            <div className="text-[10px] sm:text-[10.5px] font-mono text-cyan-300/80 truncate">
                              {folder.category}
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 mt-auto">
                          <div className="text-[10px] font-mono text-white/50 flex items-center gap-1.5 truncate">
                            <span>{folder.itemCount} items</span>
                            <span>·</span>
                            <span>{folder.totalSize}</span>
                          </div>

                          <div className="shrink-0">
                            {isUnlocked ? (
                              <span className="text-[9.5px] sm:text-[10px] font-mono px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-bold flex items-center gap-1 shadow-sm whitespace-nowrap">
                                <Unlock className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>UNLOCKED</span>
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold flex items-center gap-1 whitespace-nowrap">
                                  <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>LOCKED</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleTriggerCheckoutForProduct(folder.productId)}
                                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold text-[10px] shadow-[0_0_10px_rgba(56,189,248,0.3)] transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                >
                                  <ShoppingBag className="w-3 h-3 shrink-0" />
                                  <span>BUY</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // List View
                  return (
                    <div
                      key={folder.id}
                      onClick={() => handleOpenFolder(folder)}
                      className={`group rounded-2xl border transition-all cursor-pointer p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        !isUnlocked
                          ? 'bg-black/50 border-white/10 hover:border-amber-400/40'
                          : 'bg-[#0a0e1b]/80 border-cyan-500/30 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,242,254,0.15)]'
                      }`}
                      style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 text-xl transition-transform group-hover:scale-105 ${
                            !isUnlocked
                              ? 'bg-amber-950/40 border border-amber-400/30 shadow-sm'
                              : 'bg-cyan-950/60 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,242,254,0.2)]'
                          }`}
                        >
                          {folder.richIcon}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs sm:text-sm font-mono font-bold text-white group-hover:text-cyan-200 truncate">
                            {folder.displayName}
                          </div>
                          <div className="text-[10px] font-mono text-white/50 flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="text-cyan-300/80 truncate">{folder.category}</span>
                            <span>·</span>
                            <span>{folder.itemCount} items</span>
                            <span className="hidden xs:inline">·</span>
                            <span className="hidden xs:inline">{folder.totalSize}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                        <span className="sm:hidden text-[10px] font-mono text-white/40">
                          {folder.totalSize}
                        </span>
                        {isUnlocked ? (
                          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.2)] whitespace-nowrap">
                            <Unlock className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>UNLOCKED</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold flex items-center gap-1 whitespace-nowrap">
                              <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>STILL LOCKED</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleTriggerCheckoutForProduct(folder.productId)}
                              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold text-[10px] shadow-[0_0_12px_rgba(56,189,248,0.3)] transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            >
                              <ShoppingBag className="w-3 h-3 shrink-0" />
                              <span>BUY NOW</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Files Group */}
          {filteredFiles.length > 0 && (
            <div className="space-y-3 pt-2">
              <span className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                <File className="w-3.5 h-3.5 text-cyan-400" />
                Files ({filteredFiles.length})
              </span>

              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5'
                    : 'space-y-2.5'
                }
              >
                {filteredFiles.map((file) => {
                  const isFileUnlocked = isItemUnlocked(file);

                  if (viewMode === 'grid') {
                    return (
                      <div
                        key={file.id}
                        className="group rounded-2xl border transition-all p-3.5 sm:p-4 flex flex-col justify-between bg-[#0a0f1e]/90 border-white/10 hover:border-cyan-400/50 shadow-md hover:shadow-[0_0_24px_rgba(0,242,254,0.15)]"
                        style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
                      >
                        <div>
                          {/* Proportional Preview Image Thumbnail */}
                          {file.previewImg && (
                            <div
                              onClick={() => setSelectedFileForPreview(file)}
                              className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/80 border border-white/10 group-hover:border-cyan-400/40 mb-3 cursor-pointer group/thumb"
                            >
                              <img
                                src={file.previewImg}
                                alt={file.name}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300 pointer-events-none"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover/thumb:opacity-30 transition-opacity" />
                              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 border border-white/20 text-[9px] font-mono text-cyan-300 flex items-center gap-1 backdrop-blur-sm shadow-sm">
                                <Eye className="w-3 h-3 shrink-0" />
                                <span>PREVIEW</span>
                              </div>
                            </div>
                          )}

                          {/* File Header */}
                          <div className="flex items-start gap-3 min-w-0 mb-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
                              {file.extension === 'PDF' && <FileText className="w-5 h-5 text-red-400" />}
                              {file.extension === 'PNG' && <Film className="w-5 h-5 text-cyan-400" />}
                              {file.extension === 'JPG' && <Film className="w-5 h-5 text-purple-400" />}
                              {file.extension === 'BLEND' && <Layers className="w-5 h-5 text-amber-400" />}
                              {file.extension === 'JSON' && <FileCode className="w-5 h-5 text-emerald-400" />}
                              {file.extension === 'CUBE' && <Sliders className="w-5 h-5 text-purple-400" />}
                              {file.extension === 'WAV' && <Music className="w-5 h-5 text-teal-400" />}
                              {file.extension === 'ALS' && <Disc className="w-5 h-5 text-amber-400" />}
                              {file.extension === 'LOGICX' && <Music className="w-5 h-5 text-indigo-400" />}
                              {file.extension === 'TIFF' && <Film className="w-5 h-5 text-purple-400" />}
                              {file.extension === 'ZIP' && <Box className="w-5 h-5 text-teal-400" />}
                              {file.extension !== 'PDF' &&
                                file.extension !== 'PNG' &&
                                file.extension !== 'JPG' &&
                                file.extension !== 'BLEND' &&
                                file.extension !== 'JSON' &&
                                file.extension !== 'CUBE' &&
                                file.extension !== 'WAV' &&
                                file.extension !== 'ALS' &&
                                file.extension !== 'LOGICX' &&
                                file.extension !== 'TIFF' &&
                                file.extension !== 'ZIP' && (
                                  <File className="w-5 h-5 text-white/60" />
                                )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <h4 className="text-xs sm:text-sm font-mono font-bold text-white group-hover:text-cyan-200 truncate">
                                {file.name}
                              </h4>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-white/50">
                                <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${file.badgeColor}`}>
                                  {file.typeBadge}
                                </span>
                                <span>{file.size}</span>
                                {file.isAudio && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-400/30 font-bold">
                                    AUDIO
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* File Action Bar */}
                        <div className="pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 mt-auto">
                          <div className="flex items-center gap-1.5">
                            {file.isAudio && (
                              <button
                                type="button"
                                onClick={() => handleToggleAudio(file.id)}
                                className="px-2 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-300 text-[10px] font-mono font-bold transition-colors cursor-pointer flex items-center gap-1"
                              >
                                {playingAudioId === file.id ? (
                                  <>
                                    <Pause className="w-3 h-3 fill-teal-300" />
                                    <span>Playing</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3 h-3 fill-teal-300 ml-0.5" />
                                    <span>Listen</span>
                                  </>
                                )}
                              </button>
                            )}

                            {file.previewImg && !file.isAudio && (
                              <button
                                type="button"
                                onClick={() => setSelectedFileForPreview(file)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                                title="Quick Preview"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 ml-auto">
                            {isFileUnlocked ? (
                              <button
                                type="button"
                                onClick={() => handleDownloadFile(file)}
                                className="px-2.5 py-1 rounded-lg font-mono text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 whitespace-nowrap"
                              >
                                <Download className="w-3 h-3 text-cyan-400 shrink-0" />
                                <span>DOWNLOAD</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleTriggerCheckoutForProduct(file.productId)}
                                className="px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_10px_rgba(56,189,248,0.3)] whitespace-nowrap"
                              >
                                <Lock className="w-3 h-3 text-amber-300 shrink-0" />
                                <span>UNLOCK</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // List View
                  return (
                    <div
                      key={file.id}
                      className="group rounded-2xl border transition-all p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/60 border-white/10 hover:border-cyan-400/40"
                      style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* File Format Icon */}
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
                          {file.extension === 'PDF' && <FileText className="w-5 h-5 text-red-400" />}
                          {file.extension === 'PNG' && <Film className="w-5 h-5 text-cyan-400" />}
                          {file.extension === 'JPG' && <Film className="w-5 h-5 text-purple-400" />}
                          {file.extension === 'BLEND' && <Layers className="w-5 h-5 text-amber-400" />}
                          {file.extension === 'JSON' && <FileCode className="w-5 h-5 text-emerald-400" />}
                          {file.extension === 'CUBE' && <Sliders className="w-5 h-5 text-purple-400" />}
                          {file.extension === 'WAV' && <Music className="w-5 h-5 text-teal-400" />}
                          {file.extension === 'ALS' && <Disc className="w-5 h-5 text-amber-400" />}
                          {file.extension === 'LOGICX' && <Music className="w-5 h-5 text-indigo-400" />}
                          {file.extension === 'TIFF' && <Film className="w-5 h-5 text-purple-400" />}
                          {file.extension === 'ZIP' && <Box className="w-5 h-5 text-teal-400" />}
                          {file.extension !== 'PDF' &&
                            file.extension !== 'PNG' &&
                            file.extension !== 'JPG' &&
                            file.extension !== 'BLEND' &&
                            file.extension !== 'JSON' &&
                            file.extension !== 'CUBE' &&
                            file.extension !== 'WAV' &&
                            file.extension !== 'ALS' &&
                            file.extension !== 'LOGICX' &&
                            file.extension !== 'TIFF' &&
                            file.extension !== 'ZIP' && (
                              <File className="w-5 h-5 text-white/60" />
                            )}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs sm:text-sm font-mono font-bold text-white group-hover:text-cyan-200 truncate flex items-center gap-1.5">
                            <span className="truncate">{file.name}</span>
                            {file.isAudio && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-400/30 shrink-0">
                                AUDIO
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-white/50 flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${file.badgeColor}`}>
                              {file.typeBadge}
                            </span>
                            <span>{file.size}</span>
                            <span>·</span>
                            <span>Modified {file.modified}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-1.5 sm:gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 w-full sm:w-auto">
                        {file.isAudio && (
                          <button
                            type="button"
                            onClick={() => handleToggleAudio(file.id)}
                            className="px-2.5 py-1 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-300 text-[10.5px] font-mono font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                            title="Preview Audio"
                          >
                            {playingAudioId === file.id ? (
                              <>
                                <Pause className="w-3 h-3 fill-teal-300 shrink-0" />
                                <span>Playing</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-teal-300 ml-0.5 shrink-0" />
                                <span>Listen</span>
                              </>
                            )}
                          </button>
                        )}

                        {file.previewImg && (
                          <button
                            type="button"
                            onClick={() => setSelectedFileForPreview(file)}
                            className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                            title="Quick Preview"
                          >
                            <Eye className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        )}

                        {isFileUnlocked ? (
                          <>
                            <span className="text-[9.5px] sm:text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-bold flex items-center gap-1 whitespace-nowrap">
                              <Unlock className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="hidden sm:inline">UNLOCKED</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDownloadFile(file)}
                              className="px-2.5 sm:px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 whitespace-nowrap"
                            >
                              <Download className="w-3 h-3 text-cyan-400 shrink-0" />
                              <span>DOWNLOAD</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-[9.5px] sm:text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold flex items-center gap-1 whitespace-nowrap">
                              <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="hidden sm:inline">LOCKED</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleTriggerCheckoutForProduct(file.productId)}
                              className="px-2.5 sm:px-3 py-1.5 rounded-xl font-mono text-[10.5px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_12px_rgba(56,189,248,0.35)] whitespace-nowrap"
                            >
                              <ShoppingBag className="w-3 h-3 shrink-0" />
                              <span>GET ACCESS</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredFolders.length === 0 && filteredFiles.length === 0 && (
            <div className="p-8 text-center rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <FolderOpen className="w-8 h-8 text-white/30 mx-auto" />
              <p className="text-xs font-mono text-white/60">No files or folders found matching query.</p>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* APPLE QUICKLOOK STYLE PREVIEW LIGHTBOX                   */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedFileForPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFileForPreview(null)}
              className="fixed inset-0 bg-black/95 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#080d1a] border border-cyan-400/50 p-6 z-10 space-y-4 shadow-[0_0_60px_rgba(0,242,254,0.3)]"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono text-cyan-300 font-bold uppercase">
                    APPLE QUICKLOOK · {selectedFileForPreview.extension}
                  </span>
                  <h3 className="text-base sm:text-lg font-display font-bold text-white">
                    {selectedFileForPreview.name}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedFileForPreview(null)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedFileForPreview.previewImg && (() => {
                const isCharPlate =
                  selectedFileForPreview.name.includes('Mill') ||
                  selectedFileForPreview.name.includes('Odi') ||
                  selectedFileForPreview.name.includes('Sillow') ||
                  selectedFileForPreview.previewImg === millCharacterImg ||
                  selectedFileForPreview.previewImg === odiCharacterImg ||
                  selectedFileForPreview.previewImg === sillowCharacterImg;

                const isBookOrComic =
                  selectedFileForPreview.name.toLowerCase().includes('comic') ||
                  selectedFileForPreview.name.toLowerCase().includes('graphic novel') ||
                  selectedFileForPreview.name.toLowerCase().includes('bingäa') ||
                  selectedFileForPreview.extension === 'PDF' ||
                  selectedFileForPreview.previewImg === bingaaComicCover;

                return (
                  <div
                    className={`relative rounded-2xl overflow-hidden border border-white/15 bg-black select-none ${
                      isBookOrComic
                        ? 'aspect-[3/4] max-h-[60vh] max-w-sm mx-auto shadow-[0_12px_40px_rgba(0,0,0,0.85)]'
                        : 'aspect-video w-full shadow-[0_12px_40px_rgba(0,0,0,0.7)]'
                    }`}
                  >
                    <img
                      src={selectedFileForPreview.previewImg}
                      alt={selectedFileForPreview.name}
                      className={`w-full h-full ${
                        isBookOrComic ? 'object-contain' : 'object-cover'
                      } select-none pointer-events-none ${
                        isCharPlate ? 'filter blur-[8px] scale-[1.02]' : ''
                      }`}
                    />
                    {isCharPlate && (
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4 text-center pointer-events-none">
                        <div className="px-5 py-3 rounded-2xl bg-black/85 border border-purple-500/50 backdrop-blur-none lg:backdrop-blur-md shadow-[0_0_25px_rgba(168,85,247,0.4)] space-y-1">
                          <div className="flex items-center justify-center gap-2 text-purple-300 font-mono text-xs font-bold uppercase tracking-wider">
                            <ShieldCheck className="w-4 h-4 text-purple-400" />
                            <span>ANTI-SCREENSHOT SECURITY BLUR</span>
                          </div>
                          <span className="text-[11px] font-mono text-white/75 block">
                            Proprietary character design · High-res uncensored master plates unlock Jan 9, 2027
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <p className="text-xs sm:text-sm text-white/75 font-sans leading-relaxed">
                {selectedFileForPreview.description}
              </p>

              <div className="pt-2 flex items-center justify-between border-t border-white/10">
                <span className="text-xs font-mono text-white/50">
                  Size: {selectedFileForPreview.size} · Modified: {selectedFileForPreview.modified}
                </span>

                {isItemUnlocked(selectedFileForPreview) ? (
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(selectedFileForPreview)}
                    className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 font-mono font-bold text-xs tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-[0_0_15px_rgba(56,189,248,0.25)]"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>DOWNLOAD FILE</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>STILL LOCKED</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const pid = selectedFileForPreview.productId;
                        setSelectedFileForPreview(null);
                        handleTriggerCheckoutForProduct(pid);
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold text-xs tracking-wider shadow-[0_0_20px_rgba(56,189,248,0.4)] transition-all cursor-pointer flex items-center gap-2"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>GET ACCESS NOW</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

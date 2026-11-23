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
        deliveryNotice: 'Instant Digital Access • Incl. VAT',
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
        deliveryNotice: 'Instant Digital Access • Incl. VAT',
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
        deliveryNotice: 'Free Global Shipping • Incl. VAT',
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
        deliveryNotice: 'Instant Digital Access • Incl. VAT',
        allocationNotice: 'Complete Äkinoya Workflow · Blender Previs & Logic Pro Template',
      };
    } else if (productId === 'membership') {
      productDetails = {
        id: 'membership',
        title: 'Sillow Mill — Annual Pioneer Member Pass',
        subtitle: 'Folder 1 (Workflow), all 3 Master Folders + Pioneer Lounge Access',
        badge: 'ANNUAL ALL-INCLUSIVE PASS · €60/YR',
        priceValue: '60.00',
        isPhysical: true,
        image: akinoyaPassCard,
        allocationNotice: 'All Production Packs, Vocal Stems & 4K Graphic Novel Included',
        deliveryNotice: 'Instant Digital Access • Incl. VAT',
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
        deliveryNotice: 'Instant Digital Access • Incl. VAT',
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
        deliveryNotice: 'Instant Digital Access • Incl. VAT',
        allocationNotice: 'Complete Äkinoya Workflow · Blender Previs & Logic Pro Template',
      };
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('akinoya-open-checkout', { detail: productDetails }));
    }
  };

  // Standardized 5-Step 3D-to-AI + Logic Pro DAW Asset Vault Hierarchy
  const DRIVE_HIERARCHY: DriveFolder[] = [
    // ═══════════════════════════════════════════════════════════════════════
    // MASTER FOLDER 1: Workflow (3D-to-AI Pipeline + Logic Pro DAW)
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'folder-01',
      name: '01_Workflow',
      displayName: 'Folder 1 · Workflow',
      shortName: '01 · Workflow',
      richIcon: '🎛️',
      category: '5-Step 3D-to-AI Production Pipeline & Logic Pro DAW Templates',
      itemCount: 5,
      totalSize: '1.31 GB',
      isLocked: true,
      productId: 'workflow',
      subfolders: [
        {
          id: 'stage-01',
          name: '01_Blender_Greybox_Base',
          displayName: '01_Blender_Greybox_Base/',
          shortName: '01 · Blender Greybox Base',
          richIcon: '🏗️',
          category: 'Raw .blend environments, terrain geometry & architecture blockouts',
          itemCount: 4,
          totalSize: '184.6 MB',
          isLocked: true,
          productId: 'workflow',
          files: [
            {
              id: 'file-01-1',
              name: 'Akainoya_Landscape_Greybox_Base.blend',
              extension: 'BLEND',
              size: '96.4 MB',
              typeBadge: 'Blender 4.2 Environment',
              badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
              modified: 'Nov 12, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: akinoyaVistaImg,
              description: 'Raw 3D environment .blend file for Akainoya spire valleys and horizon terrain at calibrated 1 BU = 1m metric scale.',
            },
            {
              id: 'file-01-2',
              name: 'Spaceship_Interior_Architecture_Blockout.blend',
              extension: 'BLEND',
              size: '64.2 MB',
              typeBadge: 'Spaceship Hull Blockout',
              badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
              modified: 'Nov 11, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage01Img,
              description: 'Modular spaceship corridor, bulkhead doorway, and command deck architectural greybox blockout ready for spatial staging.',
            },
            {
              id: 'file-01-3',
              name: 'Akainoya_Terrain_Displacement_Mesh.fbx',
              extension: 'FBX',
              size: '22.8 MB',
              typeBadge: '3D Terrain Geometry',
              badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
              modified: 'Nov 10, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: akinoyaVistaImg,
              description: 'Clean quad-topology terrain geometry exported for multi-DCC compatibility and AI depth projection.',
            },
            {
              id: 'file-01-4',
              name: 'World_Greybox_Team_Handoff_Spec.pdf',
              extension: 'PDF',
              size: '1.2 MB',
              typeBadge: 'Pipeline Spec (Mac Lee)',
              badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
              modified: 'Nov 09, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage01Img,
              description: 'Collection naming, origin pivot, and Blender world-scale protocol for internal team (Mac Lee) and community collaborators.',
            },
          ],
        },
        {
          id: 'stage-02',
          name: '02_Spatial_Blocking_Rigs',
          displayName: '02_Spatial_Blocking_Rigs/',
          shortName: '02 · Spatial Blocking Rigs',
          richIcon: '🧍',
          category: 'Character proxies, vehicle rigs & prop placement setups',
          itemCount: 4,
          totalSize: '216.0 MB',
          isLocked: true,
          productId: 'workflow',
          files: [
            {
              id: 'file-02-1',
              name: 'Mill_Odi_Sillow_Character_Proxies.blend',
              extension: 'BLEND',
              size: '34.0 MB',
              typeBadge: 'Character Proxy Rigs',
              badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
              modified: 'Nov 14, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage03Img,
              description: 'Proportion-locked 3D stand-in armatures for Mill, Odi, and Sillow to lock down scale, eyelines, and gravity before rendering.',
            },
            {
              id: 'file-02-2',
              name: 'Cockpit_Camera_Velocity_Rig.blend',
              extension: 'BLEND',
              size: '148.0 MB',
              typeBadge: 'Vehicle & Cockpit Rig',
              badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
              modified: 'Nov 14, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage03Img,
              description: 'Rigged spaceship cockpit seating cage with constrained pilot ergonomics, control yoke arcs, and camera mount splines.',
            },
            {
              id: 'file-02-3',
              name: 'Transport_Vehicle_Scale_Proxies.fbx',
              extension: 'FBX',
              size: '18.6 MB',
              typeBadge: 'Vehicle Proxy Cage',
              badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
              modified: 'Nov 12, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage03Img,
              description: 'Low-poly vehicle rigs and landing skid proxy bounds anchored to ground collision planes.',
            },
            {
              id: 'file-02-4',
              name: 'Scene_Prop_Placement_Gravity_Setups.blend',
              extension: 'BLEND',
              size: '15.4 MB',
              typeBadge: 'Prop Blocking Pack',
              badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
              modified: 'Nov 11, 2026',
              isLocked: true,
              productId: 'workflow',
              description: 'Modular field instruments, console terminals, and cargo props locked to Z-surface contact rules for zero floating artifacts.',
            },
          ],
        },
        {
          id: 'stage-03',
          name: '03_24fps_Camera_Previz',
          displayName: '03_24fps_Camera_Previz/',
          shortName: '03 · 24fps Camera Previz',
          richIcon: '🎥',
          category: 'Light Workbench renders, camera animation passes & timing timelines',
          itemCount: 4,
          totalSize: '425.2 MB',
          isLocked: true,
          productId: 'workflow',
          files: [
            {
              id: 'file-03-1',
              name: 'Akainoya_24fps_Workbench_Previz.mp4',
              extension: 'MP4',
              size: '42.0 MB',
              typeBadge: '24fps Workbench Edit',
              badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
              modified: 'Nov 14, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage01Img,
              description: 'Lightweight 24fps Blender Workbench skeletal timeline timed directly to Logic Pro WAV_Stems/ musical beat markers.',
            },
            {
              id: 'file-03-2',
              name: 'Multicam_Lens_Animation_Passes.json',
              extension: 'JSON',
              size: '1.8 MB',
              typeBadge: 'Camera Trajectory Data',
              badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
              modified: 'Nov 13, 2026',
              isLocked: true,
              productId: 'workflow',
              description: 'Virtual multicam focal length switches (24mm/35mm/50mm/85mm) and baked CAM_TRAJ_A animation passes.',
            },
            {
              id: 'file-03-3',
              name: 'Audio_Synced_24fps_Timing_Timeline.edl',
              extension: 'EDL',
              size: '420 KB',
              typeBadge: 'Scene Marker EDL',
              badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
              modified: 'Nov 12, 2026',
              isLocked: true,
              productId: 'workflow',
              description: 'Frame-accurate 24.000 FPS edit decision list driven by "Dream of Akainoya" WAV stem bar markers from folder 05.',
            },
            {
              id: 'file-03-4',
              name: '16bit_ZDepth_Normal_Pass_Sequence.exr',
              extension: 'EXR',
              size: '381.0 MB',
              typeBadge: 'OpenEXR Depth Pass',
              badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
              modified: 'Nov 11, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage03Img,
              description: 'Uncompressed 16-bit Z-depth and normal maps exported alongside Workbench previz to anchor Step 5 neural rendering.',
            },
          ],
        },
        {
          id: 'stage-04',
          name: '04_Canonical_Tag_References',
          displayName: '04_Canonical_Tag_References/',
          shortName: '04 · Canonical @TAG Refs',
          richIcon: '🏷️',
          category: 'Master image sheets, lighting guides, texture packages & @TAG look-ups',
          itemCount: 6,
          totalSize: '58.4 MB',
          isLocked: true,
          productId: 'workflow',
          files: [
            {
              id: 'file-04-1',
              name: '@MILL_SUIT_V1 — Mill (Alien Bio-Analyst Sheet)',
              extension: 'PNG',
              size: '6.7 MB',
              typeBadge: 'Canonical @TAG Plate',
              badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
              modified: 'Nov 14, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: millCharacterImg,
              description: 'Canonical @TAG visual anchor sheet for Mill in her environmental suit with mushroom helmet archetype.',
            },
            {
              id: 'file-04-2',
              name: '@ODI_SCOUT_V1 — Odi (Scout Mechanic Sheet)',
              extension: 'JPG',
              size: '275 KB',
              typeBadge: 'Canonical @TAG Plate',
              badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
              modified: 'Nov 14, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: odiCharacterImg,
              description: 'Canonical @TAG turnaround sheet for Odi (scout mechanic without dreadlocks, tactical reconnaissance armor).',
            },
            {
              id: 'file-04-3',
              name: '@SILLOW_EXPLORER_V1 — Sillow (Planetary Explorer Sheet)',
              extension: 'JPG',
              size: '280 KB',
              typeBadge: 'Canonical @TAG Plate',
              badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
              modified: 'Nov 14, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: sillowCharacterImg,
              description: 'Canonical @TAG sheet for Sillow styled with distinct dreadlocks and tactical explorer harness.',
            },
            {
              id: 'file-04-4',
              name: 'Mood_Lighting_Direction_Master_Sheet.png',
              extension: 'PNG',
              size: '18.4 MB',
              typeBadge: 'Character Lighting Guide',
              badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
              modified: 'Nov 12, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: moodboardImg,
              description: 'Master lighting ratio guide and key/rim keyframe sheet guaranteeing cut-to-cut atmospheric continuity.',
            },
            {
              id: 'file-04-5',
              name: 'Akainoya_PBR_Texture_Palette_Package.ase',
              extension: 'ASE',
              size: '31.5 MB',
              typeBadge: 'Texture & Swatch Pack',
              badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
              modified: 'Nov 10, 2026',
              isLocked: true,
              productId: 'workflow',
              description: 'Curated texture material swatches and locked palette values (#00f2fe Cyan Galaxy, #b142f0 Purple Void) for asset shaders.',
            },
            {
              id: 'file-04-6',
              name: 'Canonical_Tag_Lookup_Registry.json',
              extension: 'JSON',
              size: '1.2 MB',
              typeBadge: '@TAG Look-Up Sheet',
              badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
              modified: 'Nov 09, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage04Img,
              description: 'Shot-by-shot lookup sheet linking 24fps Workbench cuts to canonical character, lighting, and material @TAG identifiers.',
            },
          ],
        },
        {
          id: 'stage-05',
          name: '05_Audio_DAW_Templates_Stems',
          displayName: '05_Audio_DAW_Templates_Stems/',
          shortName: '05 · Audio & Logic Pro DAW',
          richIcon: '🎹',
          category: 'Logic_Pro_Master_Template.logicx, WAV_Stems/ & Visualizer_Logic_Assets/',
          itemCount: 5,
          totalSize: '425.0 MB',
          isLocked: true,
          productId: 'workflow',
          subfolders: [
            {
              id: 'stage-05-wav-stems',
              name: 'WAV_Stems',
              displayName: 'WAV_Stems/',
              shortName: 'WAV_Stems/',
              richIcon: '🔊',
              category: 'Acapellas, mix stems & unreleased audio masters aligned to scene markers',
              itemCount: 3,
              totalSize: '342.0 MB',
              isLocked: true,
              productId: 'workflow',
              files: [
                {
                  id: 'file-05-wav-1',
                  name: 'Dream_of_Akainoya_Master_Mix_Stems_96kHz.wav',
                  extension: 'WAV',
                  size: '164.0 MB',
                  typeBadge: '24-bit 96kHz Mix Stems',
                  badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
                  modified: 'Nov 14, 2026',
                  isLocked: true,
                  isAudio: true,
                  productId: 'workflow',
                  previewImg: stage05Img,
                  description: 'Uncompressed 24-bit / 96kHz mix stems & unreleased master aligned frame-for-frame to Step 3 24fps scene markers.',
                },
                {
                  id: 'file-05-wav-2',
                  name: 'Dream_of_Akainoya_Vocal_Stem_Reference.wav',
                  extension: 'WAV',
                  size: '92.0 MB',
                  typeBadge: 'Scene-Aligned Vocal Stem',
                  badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                  modified: 'Nov 14, 2026',
                  isLocked: true,
                  isAudio: true,
                  productId: 'workflow',
                  previewImg: vocalAcapellaImg,
                  description: 'Tempo-locked reference vocal stem & phrasing cue track synced to Logic_Pro_Master_Template.logicx bar markers.',
                },
                {
                  id: 'file-05-wav-3',
                  name: 'Sillow_Mill_SubBass_Modular_Drones_128BPM.wav',
                  extension: 'WAV',
                  size: '86.0 MB',
                  typeBadge: '128 BPM Synth Stem',
                  badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
                  modified: 'Nov 12, 2026',
                  isLocked: true,
                  isAudio: true,
                  productId: 'workflow',
                  description: 'Isolated 432Hz analog synth bass & atmospheric drone stem dictating Step 3 camera cut energy transitions.',
                },
              ],
            },
            {
              id: 'stage-05-visualizer-assets',
              name: 'Visualizer_Logic_Assets',
              displayName: 'Visualizer_Logic_Assets/',
              shortName: 'Visualizer_Logic_Assets/',
              richIcon: '⚡',
              category: 'Reactive audio triggers & MIDI data linked to visualizer reactivity',
              itemCount: 3,
              totalSize: '21.8 MB',
              isLocked: true,
              productId: 'workflow',
              files: [
                {
                  id: 'file-05-vis-1',
                  name: 'Visualizer_Audio_Reactive_Triggers.mid',
                  extension: 'MID',
                  size: '1.4 MB',
                  typeBadge: 'MIDI Reactive Triggers',
                  badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                  modified: 'Nov 14, 2026',
                  isLocked: true,
                  productId: 'workflow',
                  previewImg: stage05Img,
                  description: 'Timecode-locked MIDI note triggers driving camera shake, emission blooms, and cut switches inside the 2D Visualizer pipeline.',
                },
                {
                  id: 'file-05-vis-2',
                  name: 'Logic_Pro_Visualizer_Automation_Curves.json',
                  extension: 'JSON',
                  size: '2.4 MB',
                  typeBadge: 'Telemetry Automation',
                  badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                  modified: 'Nov 13, 2026',
                  isLocked: true,
                  productId: 'workflow',
                  description: 'Sub-bass envelope curves exported from Logic Pro to sync AI shader modulation and audio-reactive visualizer telemetry.',
                },
                {
                  id: 'file-05-vis-3',
                  name: 'Akinoya_ACEScc_Finishing_LUT.cube',
                  extension: 'CUBE',
                  size: '18.0 MB',
                  typeBadge: 'ACEScc Finishing LUT',
                  badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
                  modified: 'Nov 11, 2026',
                  isLocked: true,
                  productId: 'workflow',
                  previewImg: stage05Img,
                  description: 'Official finishing 3D LUT cube applied over Step 5 neural renders to unify contrast and cosmic cyan/violet highlight rolloff.',
                },
              ],
            },
          ],
          files: [
            {
              id: 'file-05-1',
              name: 'Logic_Pro_Master_Template.logicx',
              extension: 'LOGICX',
              size: '56.0 MB',
              typeBadge: 'Core Logic Pro Template',
              badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
              modified: 'Nov 14, 2026',
              isLocked: true,
              productId: 'workflow',
              previewImg: stage05Img,
              description: 'The core Logic Pro production template featuring pre-routed vocal chains (my vocal chain), Enerwise stem busses, "Dream of Akainoya" tracklist specs, and 24fps telemetry automation markers.',
            },
            {
              id: 'file-05-2',
              name: 'Enerwise_Vocal_Chain_Channel_Strip.cst',
              extension: 'CST',
              size: '4.5 MB',
              typeBadge: 'Logic Pro Channel Strip',
              badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
              modified: 'Nov 13, 2026',
              isLocked: true,
              productId: 'workflow',
              description: 'Standardized vocal chain & bus compression channel strip preset powering Logic_Pro_Master_Template.logicx.',
            },
            {
              id: 'file-05-3',
              name: 'Dream_of_Akainoya_DAW_Scene_Markers.pdf',
              extension: 'PDF',
              size: '700 KB',
              typeBadge: 'Tempo & Cut Map',
              badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
              modified: 'Nov 12, 2026',
              isLocked: true,
              productId: 'workflow',
              description: 'Tracklist specs & scene-marker timing bridge explaining how Logic Pro bars drive Step 3 24fps previz cuts and feed the 2D Visualizer Production bundle.',
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
          description: 'MIDI files, chord progressions, tempo maps, and vocal tuning guides ready for Logic Pro (Logic_Pro_Master_Template.logicx) and major DAWs.',
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

  // Recursive directory lookup (supports 3-level nested paths such as 05_Audio_DAW_Templates_Stems/WAV_Stems/)
  const findFolderWithTrail = useCallback(
    (
      folders: DriveFolder[],
      predicate: (f: DriveFolder) => boolean,
      trail: Array<{ id: string; name: string }> = [{ id: 'root', name: 'Sillow Mill Drive' }]
    ): { folder: DriveFolder; trail: Array<{ id: string; name: string }> } | null => {
      for (const f of folders) {
        const nextTrail = [...trail, { id: f.id, name: f.displayName }];
        if (predicate(f)) return { folder: f, trail: nextTrail };
        if (f.subfolders) {
          const found = findFolderWithTrail(f.subfolders, predicate, nextTrail);
          if (found) return found;
        }
      }
      return null;
    },
    []
  );

  const collectAllFiles = useCallback((folders: DriveFolder[]): DriveFile[] => {
    return folders.flatMap((f) => [
      ...(f.files || []),
      ...(f.subfolders ? collectAllFiles(f.subfolders) : []),
    ]);
  }, []);

  // Helper: Find current folder object or return null (root)
  const getCurrentFolder = (): DriveFolder | null => {
    if (currentFolderId === 'root') return null;
    return findFolderWithTrail(DRIVE_HIERARCHY, (f) => f.id === currentFolderId)?.folder || null;
  };

  const currentFolder = getCurrentFolder();

  // Sync with initialFolderId (e.g. when navigated from workflow steps 01-05)
  useEffect(() => {
    if (!initialFolderId) return;

    if (initialFolderId === 'root') {
      setCurrentFolderId('root');
      setFolderPath([{ id: 'root', name: 'Sillow Mill Drive' }]);
      return;
    }

    const q = initialFolderId.toLowerCase();
    const match =
      findFolderWithTrail(DRIVE_HIERARCHY, (f) => f.id === initialFolderId) ||
      findFolderWithTrail(
        DRIVE_HIERARCHY,
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.displayName.toLowerCase().includes(q) ||
          Boolean(f.shortName?.toLowerCase().includes(q))
      );

    if (match) {
      setCurrentFolderId(match.folder.id);
      setFolderPath(match.trail);
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
    return collectAllFiles(DRIVE_HIERARCHY);
  }, [collectAllFiles]);

  const renderFileExtensionIcon = (extension: string) => {
    switch (extension) {
      case 'PDF':
        return <FileText className="w-5 h-5 text-red-400" />;
      case 'PNG':
      case 'MP4':
        return <Film className="w-5 h-5 text-cyan-400" />;
      case 'JPG':
      case 'TIFF':
        return <Film className="w-5 h-5 text-purple-400" />;
      case 'BLEND':
      case 'FBX':
      case 'EXR':
        return <Layers className="w-5 h-5 text-amber-400" />;
      case 'JSON':
      case 'EDL':
        return <FileCode className="w-5 h-5 text-emerald-400" />;
      case 'CUBE':
        return <Sliders className="w-5 h-5 text-purple-400" />;
      case 'WAV':
      case 'MID':
        return <Music className="w-5 h-5 text-teal-400" />;
      case 'ALS':
        return <Disc className="w-5 h-5 text-amber-400" />;
      case 'LOGICX':
      case 'CST':
        return <Music className="w-5 h-5 text-indigo-400" />;
      case 'ZIP':
        return <Box className="w-5 h-5 text-teal-400" />;
      default:
        return <File className="w-5 h-5 text-white/60" />;
    }
  };

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
                              {renderFileExtensionIcon(file.extension)}
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
                          {renderFileExtensionIcon(file.extension)}
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
                  selectedFileForPreview.name.includes('@MILL') ||
                  selectedFileForPreview.name.includes('@ODI') ||
                  selectedFileForPreview.name.includes('@SILLOW') ||
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

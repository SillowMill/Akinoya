import React, { useState } from 'react';
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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';

import moodboardImg from '../assets/images/Mood.png';
import akinoyaVistaImg from '../assets/images/akinoya_twilight_world_1790852640934.jpg';
import stage01Img from '../assets/images/stage_01_storyboard_blueprint.jpg';
import stage02Img from '../assets/images/stage_02_character_reference_sheet.jpg';
import stage03Img from '../assets/images/stage_03_cockpit_previs_wireframe.jpg';
import stage04Img from '../assets/images/stage_04_cybernetic_prompt_datastream.jpg';
import stage05Img from '../assets/images/stage_05_cinematic_color_grading_waveform.jpg';
import { BINGAA_PDF_URL, BINGAA_PDF_FILENAME } from '../utils/certificate';

export interface DriveFolderVaultProps {
  isMember?: boolean;
  onOpenAuthModal?: () => void;
}

export interface DriveFile {
  id: string;
  name: string;
  extension: string;
  size: string;
  typeBadge: string;
  badgeColor: string;
  modified: string;
  isLocked: boolean; // locked for free users (Stages 3-5 or full downloads)
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
  isLocked: boolean; // Root folders 04, 05 locked until Jan 9, 2027
  subfolders?: DriveFolder[];
  files?: DriveFile[];
}

export const DriveFolderVault: React.FC<DriveFolderVaultProps> = ({
  isMember = false,
  onOpenAuthModal,
}) => {
  // Navigation State (Drive Path Navigation)
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [folderPath, setFolderPath] = useState<Array<{ id: string; name: string }>>([
    { id: 'root', name: 'Sillow Mill Production Vault' },
  ]);

  // View Mode: 'list' or 'grid' (Apple Finder style)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<DriveFile | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Workflow-Mapped Apple & Google Drive Directory Hierarchy
  const DRIVE_HIERARCHY: DriveFolder[] = [
    {
      id: 'folder-01',
      name: '01_Storyboards_Script_Blueprints',
      displayName: '01 · Storyboards & Script Blueprints',
      shortName: '01 · Storyboards',
      richIcon: '🎬',
      category: 'Storyboards & 2.39:1 framing specs',
      itemCount: 6,
      totalSize: '33.1 MB',
      isLocked: false,
      subfolders: [
        {
          id: 'subfolder-01-1',
          name: 'Bingaa_Comic_Script_Breakdown',
          displayName: 'Bingaa_Comic_Script_Breakdown',
          richIcon: '📄',
          category: 'Director Script & Panels',
          itemCount: 3,
          totalSize: '20.6 MB',
          isLocked: false,
          files: [
            {
              id: 'file-01-1',
              name: 'Bingäa_Issue01_Director_Script.pdf',
              extension: 'PDF',
              size: '12.4 MB',
              typeBadge: 'PDF Document',
              badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
              modified: 'Oct 12, 2026',
              isLocked: false,
              downloadUrl: BINGAA_PDF_URL,
              downloadFileName: BINGAA_PDF_FILENAME,
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
              isLocked: false,
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
              isLocked: false,
              previewImg: stage01Img,
              description: 'High-resolution CinemaScope letterbox keyframe grids with safety margins and title-safe overlays.',
            },
          ],
        },
        {
          id: 'subfolder-01-2',
          name: 'Framing_Beat_Sheets',
          displayName: 'Framing_Beat_Sheets',
          richIcon: '📐',
          category: 'Pacing & Beat Timelines',
          itemCount: 3,
          totalSize: '12.5 MB',
          isLocked: false,
          files: [
            {
              id: 'file-01-4',
              name: 'Leuven_Snow_Dance_Sequence_Sheet.pdf',
              extension: 'PDF',
              size: '6.8 MB',
              typeBadge: 'Beat Sheet',
              badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
              modified: 'Oct 09, 2026',
              isLocked: false,
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
              isLocked: false,
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
              isLocked: false,
              previewImg: stage01Img,
              description: 'Visual storyboard summary with shot descriptions, camera directions, and scene transitions.',
            },
          ],
        },
      ],
    },
    {
      id: 'folder-02',
      name: '02_ArtDirection_Character_Anchors',
      displayName: '02 · Art Direction & Character Anchors',
      shortName: '02 · Art Direction',
      richIcon: '🎨',
      category: 'Character sheets, brand assets & mood anchors',
      itemCount: 6,
      totalSize: '52.6 MB',
      isLocked: false,
      subfolders: [
        {
          id: 'subfolder-02-1',
          name: 'Character_Sheets_Sillow_Odi_Mill',
          displayName: 'Character_Sheets_Sillow_Odi_Mill',
          richIcon: '👤',
          category: 'Character Turnarounds',
          itemCount: 3,
          totalSize: '40.6 MB',
          isLocked: false,
          files: [
            {
              id: 'file-02-1',
              name: 'Sillow_Lead_Explorer_Turnaround.png',
              extension: 'PNG',
              size: '14.2 MB',
              typeBadge: '4K Model Sheet',
              badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
              modified: 'Oct 13, 2026',
              isLocked: false,
              downloadUrl: stage02Img,
              downloadFileName: 'Sillow_Lead_Explorer_Turnaround.png',
              previewImg: stage02Img,
              description: 'High-res 4-angle turnaround sheet with cybernetic visor annotations and exploration suit Mark IV specs.',
            },
            {
              id: 'file-02-2',
              name: 'Odi_Mechanic_Rig_Turnaround.png',
              extension: 'PNG',
              size: '13.8 MB',
              typeBadge: '4K Model Sheet',
              badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
              modified: 'Oct 13, 2026',
              isLocked: false,
              previewImg: stage02Img,
              description: 'Turnaround plates detailing Odi’s armored reconnaissance suit, tool holsters, and heavy terrain boots.',
            },
            {
              id: 'file-02-3',
              name: 'Mill_BioAnalyst_Suit_Turnaround.png',
              extension: 'PNG',
              size: '12.6 MB',
              typeBadge: '4K Model Sheet',
              badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
              modified: 'Oct 13, 2026',
              isLocked: false,
              previewImg: stage02Img,
              description: 'Character turnaround model sheet for Mill in environmental bio-analyst suit with cyan visor display.',
            },
          ],
        },
        {
          id: 'subfolder-02-2',
          name: 'Chromatic_Color_Profiles',
          displayName: 'Chromatic_Color_Profiles',
          richIcon: '🌈',
          category: 'Color Palettes & Swatches',
          itemCount: 3,
          totalSize: '12.0 MB',
          isLocked: false,
          files: [
            {
              id: 'file-02-4',
              name: 'Mood_Primary_Atmospheric_Anchor.png',
              extension: 'PNG',
              size: '8.25 MB',
              typeBadge: 'Master Style Anchor',
              badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
              modified: 'Oct 10, 2026',
              isLocked: false,
              downloadUrl: moodboardImg,
              downloadFileName: 'Mood_Primary_Atmospheric_Anchor.png',
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
              isLocked: false,
              downloadUrl: akinoyaVistaImg,
              downloadFileName: 'Twilight_World_Master_Vista.jpg',
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
              isLocked: false,
              description: 'Digital color swatch palette containing locked hex values: #00f2fe (Cyan Galaxy), #b142f0 (Purple Void).',
            },
          ],
        },
      ],
    },
    {
      id: 'folder-03',
      name: '03_AudioMasters_DAW_Templates',
      displayName: '03 · Audio Masters & DAW Templates',
      shortName: '03 · Audio Masters',
      richIcon: '🎵',
      category: 'Studio audio masters & Ableton .als templates',
      itemCount: 4,
      totalSize: '537.0 MB',
      isLocked: false,
      files: [
        {
          id: 'file-03-1',
          name: 'Sillow_Mill_Teaser_Audio_Master_96kHz.wav',
          extension: 'WAV',
          size: '185 MB',
          typeBadge: '24-bit 96kHz Master',
          badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
          modified: 'Oct 14, 2026',
          isLocked: false,
          isAudio: true,
          previewImg: stage05Img,
          description: 'Uncompressed studio master recording featuring modular analog synthesis, 432Hz harmonic drones, and sub-bass impact.',
        },
        {
          id: 'file-03-2',
          name: 'Bingaa_Atmospheric_Stem_Pack_128BPM.zip',
          extension: 'ZIP',
          size: '240 MB',
          typeBadge: 'Studio Stems Bundle',
          badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
          modified: 'Oct 13, 2026',
          isLocked: false,
          description: 'Isolated stems: Sub-Bass, Analog Arp, Modular Drones, Granular FX, and Cinematic Percussion at 128 BPM.',
        },
        {
          id: 'file-03-3',
          name: 'Akinoya_Modular_Synth_Ableton_Template.als',
          extension: 'ALS',
          size: '48 MB',
          typeBadge: 'Ableton Live 11/12',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          modified: 'Oct 12, 2026',
          isLocked: false,
          description: 'Production DAW project file with routing, custom operator chains, and analog saturation racks ready to load.',
        },
        {
          id: 'file-03-4',
          name: 'Analog_Drones_432Hz_SubBass_Impulse.wav',
          extension: 'WAV',
          size: '64 MB',
          typeBadge: 'Sub-Bass Impulse',
          badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
          modified: 'Oct 11, 2026',
          isLocked: false,
          isAudio: true,
          description: 'Sub-bass celestial resonance impulse calibrated to 432Hz fundamental frequency for sci-fi atmosphere.',
        },
      ],
    },
    {
      id: 'folder-04',
      name: '04_Blender_3D_Previs_Cockpit_Rigs',
      displayName: '04 · Blender 3D Previs & Cockpit Rigs',
      shortName: '04 · 3D Previs & Rigs',
      richIcon: '🧊',
      category: '3D cockpit & warp rigs — Locked',
      itemCount: 4,
      totalSize: '601.4 MB',
      isLocked: true,
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
          description: 'Synthesized camera tracking coordinate points formatted for import into Nuke, After Effects, and Blender.',
        },
      ],
    },
    {
      id: 'folder-05',
      name: '05_Prompt_Engineering_Bibles',
      displayName: '05 · Prompt Engineering Bibles',
      shortName: '05 · Prompt Bibles',
      richIcon: '⚡',
      category: 'Multi-block prompt json vaults — Locked',
      itemCount: 4,
      totalSize: '90.7 MB',
      isLocked: true,
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
          previewImg: stage05Img,
          description: 'Official 65x65x65 3D LUT cube calibrated for ACEScc and Rec.709 color spaces with custom film print density.',
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

  // Navigation handlers
  const handleOpenFolder = (folder: DriveFolder) => {
    soundManager.playTone(520, 0.05);

    if (folder.isLocked && !isMember) {
      soundManager.playTone(330, 0.08);
      alert(
        `🔒 ${folder.displayName} is Locked\n\nAdvanced production stages 04–05 and master 3D/prompt archives are reserved for Paid Monthly Subscribers & VIP Pass Holders.\n\nOfficial Public Release: January 9, 2027.`
      );
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

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
    if (!isMember) {
      soundManager.playTone(330, 0.08);
      alert(
        `🔒 Download Restricted\n\nDirect file downloads from the Sillow Mill Vault require an active Paid Monthly Subscription or VIP Pass.\n\nFile: ${file.name} (${file.size})\nOfficial Public Release: January 9, 2027.`
      );
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    soundManager.playTone(720, 0.09);
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#00f2fe', '#fbbf24', '#b142f0'],
      });
    } catch {
      // Confetti fallback
    }

    if (file.downloadUrl) {
      const link = document.createElement('a');
      link.href = file.downloadUrl;
      link.download = file.downloadFileName || file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert(`[VIP Access Granted] Initiating master file download for: ${file.name}`);
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

  // Get current items to render
  const subfoldersToRender = currentFolder
    ? currentFolder.subfolders || []
    : DRIVE_HIERARCHY;

  const filesToRender = currentFolder
    ? currentFolder.files || []
    : [];

  // Filter with search query if active
  const filteredFolders = searchQuery.trim()
    ? subfoldersToRender.filter((f) =>
        f.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : subfoldersToRender;

  const filteredFiles = searchQuery.trim()
    ? (currentFolder
        ? filesToRender
        : DRIVE_HIERARCHY.flatMap((r) => [
            ...(r.files || []),
            ...(r.subfolders?.flatMap((s) => s.files || []) || []),
          ])
      ).filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : filesToRender;

  return (
    <div className="relative w-full text-white font-sans space-y-5">
      {/* ======================================================== */}
      {/* APPLE-VIBES MACOS FINDER WINDOW FRAME                    */}
      {/* ======================================================== */}
      <div className="rounded-3xl bg-gradient-to-b from-[#0f1424]/95 via-[#0b0f1a]/95 to-[#070912]/98 border border-cyan-500/30 shadow-[0_10px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(0,242,254,0.12)] overflow-hidden">
        {/* macOS Title Bar with Window Controls */}
        <div className="px-5 py-3.5 bg-black/60 border-b border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Apple Traffic Light Dots */}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] inline-block shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] inline-block shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] inline-block shadow-sm" />
            </div>

            <div className="h-4 w-px bg-white/15 mx-1" />

            <div className="flex items-center gap-2 text-xs font-mono text-white/70">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-white">Sillow Mill Production Drive</span>
              <span className="text-white/40">· macOS / Drive Hybrid Vault</span>
            </div>
          </div>

          {/* Access Status Pill */}
          <div className="flex items-center gap-2">
            {isMember ? (
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold flex items-center gap-1 shadow-sm">
                <Crown className="w-3 h-3 text-emerald-400" />
                PAID SUBSCRIBER ACTIVE
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold flex items-center gap-1 shadow-sm">
                <Lock className="w-3 h-3 text-amber-400" />
                VIEW-ONLY PREVIEWS · GATED
              </span>
            )}
          </div>
        </div>

        {/* macOS Toolbar (Search, Breadcrumbs & View Toggle) */}
        <div className="p-4 bg-black/40 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Breadcrumb Path */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-mono text-white/70">
            {folderPath.map((item, index) => {
              const isLast = index === folderPath.length - 1;
              return (
                <React.Fragment key={item.id}>
                  {index > 0 && <ChevronRight className="w-3 h-3 text-white/30 shrink-0" />}
                  <button
                    type="button"
                    onClick={() => handleNavigateBreadcrumb(index)}
                    className={`hover:text-cyan-300 transition-colors cursor-pointer whitespace-nowrap ${
                      isLast
                        ? 'text-cyan-300 font-bold underline underline-offset-4 decoration-cyan-400'
                        : 'text-white/60'
                    }`}
                  >
                    {item.name}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Search & View Switcher */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative min-w-[190px] sm:min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vault files..."
                className="w-full bg-black/60 border border-white/15 focus:border-cyan-400 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white outline-none font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Apple View Mode Switch */}
            <div className="flex items-center bg-black/60 border border-white/15 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => {
                  soundManager.playTone(480, 0.04);
                  setViewMode('list');
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-cyan-400 text-black shadow-sm'
                    : 'text-white/50 hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  soundManager.playTone(480, 0.04);
                  setViewMode('grid');
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-cyan-400 text-black shadow-sm'
                    : 'text-white/50 hover:text-white'
                }`}
                title="Grid View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Directory Content Area */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Folders Group */}
          {filteredFolders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-cyan-400" />
                  Folders ({filteredFolders.length})
                </span>
                {folderPath.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleNavigateBreadcrumb(folderPath.length - 2)}
                    className="text-[11px] font-mono text-cyan-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Back up</span>
                  </button>
                )}
              </div>

              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5'
                    : 'space-y-2'
                }
              >
                {filteredFolders.map((folder) => {
                  const isLockedForUser = folder.isLocked && !isMember;

                  return (
                    <div
                      key={folder.id}
                      onClick={() => handleOpenFolder(folder)}
                      className={`group rounded-2xl border transition-all cursor-pointer ${
                        viewMode === 'grid'
                          ? 'p-4 space-y-3'
                          : 'p-3.5 flex items-center justify-between gap-3'
                      } ${
                        isLockedForUser
                          ? 'bg-black/40 border-white/10 hover:border-amber-400/40 opacity-70 hover:opacity-85'
                          : 'bg-[#0a0e1b]/80 border-cyan-500/30 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,242,254,0.15)] hover:scale-[1.01]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Rich Folder Emoji / Icon */}
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-xl transition-transform group-hover:scale-105 ${
                            isLockedForUser
                              ? 'bg-amber-950/40 border border-amber-400/30 shadow-sm'
                              : 'bg-cyan-950/60 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,242,254,0.2)]'
                          }`}
                        >
                          {isLockedForUser ? '🔒' : folder.richIcon}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs sm:text-sm font-mono font-bold text-white group-hover:text-cyan-200 truncate">
                            <span className="sm:hidden">{folder.shortName || folder.displayName}</span>
                            <span className="hidden sm:inline">{folder.displayName}</span>
                          </div>
                          <div className="text-[10px] font-mono text-white/50 flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="truncate max-w-[140px] sm:max-w-none">{folder.category}</span>
                            <span>·</span>
                            <span>{folder.itemCount} items</span>
                            <span className="hidden xs:inline">·</span>
                            <span className="hidden xs:inline">{folder.totalSize}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isLockedForUser ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold">
                            LOCKED · JAN 9
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-cyan-400/80 group-hover:text-cyan-200 flex items-center gap-0.5">
                            Open <ChevronRight className="w-3.5 h-3.5" />
                          </span>
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
                    : 'space-y-2'
                }
              >
                {filteredFiles.map((file) => {
                  const isLockedForUser = file.isLocked && !isMember;

                  return (
                    <div
                      key={file.id}
                      className={`group rounded-2xl border transition-all ${
                        viewMode === 'grid'
                          ? 'p-4 space-y-3 bg-[#0a0f1e]/80 border-white/10 hover:border-cyan-400/40'
                          : 'p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/60 border-white/10 hover:border-cyan-400/40'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* File Format Icon */}
                        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
                          {file.extension === 'PDF' && <FileText className="w-5 h-5 text-red-400" />}
                          {file.extension === 'PNG' && <Film className="w-5 h-5 text-cyan-400" />}
                          {file.extension === 'JPG' && <Film className="w-5 h-5 text-purple-400" />}
                          {file.extension === 'BLEND' && <Layers className="w-5 h-5 text-amber-400" />}
                          {file.extension === 'JSON' && <FileCode className="w-5 h-5 text-emerald-400" />}
                          {file.extension === 'CUBE' && <Sliders className="w-5 h-5 text-purple-400" />}
                          {file.extension === 'WAV' && <Music className="w-5 h-5 text-teal-400" />}
                          {file.extension === 'ALS' && <Disc className="w-5 h-5 text-amber-400" />}
                          {file.extension !== 'PDF' &&
                            file.extension !== 'PNG' &&
                            file.extension !== 'JPG' &&
                            file.extension !== 'BLEND' &&
                            file.extension !== 'JSON' &&
                            file.extension !== 'CUBE' &&
                            file.extension !== 'WAV' &&
                            file.extension !== 'ALS' && (
                              <File className="w-5 h-5 text-white/60" />
                            )}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs sm:text-sm font-mono font-bold text-white group-hover:text-cyan-200 truncate flex items-center gap-2">
                            <span className="truncate">{file.name}</span>
                            {file.isAudio && (
                              <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-400/30">
                                AUDIO
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-white/50 flex flex-wrap items-center gap-2">
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
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        {file.isAudio && (
                          <button
                            type="button"
                            onClick={() => handleToggleAudio(file.id)}
                            className="p-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-300 text-xs font-mono font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                            title="Preview Audio"
                          >
                            {playingAudioId === file.id ? (
                              <>
                                <Pause className="w-3.5 h-3.5 fill-teal-300" />
                                <span>Playing</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-teal-300 ml-0.5" />
                                <span>Listen</span>
                              </>
                            )}
                          </button>
                        )}

                        {file.previewImg && (
                          <button
                            type="button"
                            onClick={() => setSelectedFileForPreview(file)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                            title="Quick Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDownloadFile(file)}
                          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isLockedForUser
                              ? 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300'
                              : 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-[0_0_12px_rgba(0,242,254,0.3)]'
                          }`}
                        >
                          {isLockedForUser ? (
                            <>
                              <Lock className="w-3 h-3 text-amber-400" />
                              <span>Gated</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3 h-3" />
                              <span>Download</span>
                            </>
                          )}
                        </button>
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
              className="fixed inset-0 bg-black/90 backdrop-blur-md"
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

              {selectedFileForPreview.previewImg && (
                <div className="relative rounded-2xl overflow-hidden border border-white/15 aspect-[16/9] bg-black">
                  <img
                    src={selectedFileForPreview.previewImg}
                    alt={selectedFileForPreview.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <p className="text-xs sm:text-sm text-white/75 font-sans leading-relaxed">
                {selectedFileForPreview.description}
              </p>

              <div className="pt-2 flex items-center justify-between border-t border-white/10">
                <span className="text-xs font-mono text-white/50">
                  Size: {selectedFileForPreview.size} · Modified: {selectedFileForPreview.modified}
                </span>

                <button
                  type="button"
                  onClick={() => handleDownloadFile(selectedFileForPreview)}
                  className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold text-xs tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-[0_0_15px_rgba(0,242,254,0.3)]"
                >
                  {selectedFileForPreview.isLocked && !isMember ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-black" />
                      <span>UNLOCK WITH SUBSCRIBER PASS</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>DOWNLOAD ASSET</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

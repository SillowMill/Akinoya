import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  Film,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  FileText,
  Music,
  Layers,
  Image as ImageIcon,
  Send,
  ThumbsUp,
  MessageSquare,
  MessageCircle,
  Vote,
  X,
  ArrowLeft,
  Maximize2,
  ChevronRight,
  ChevronDown,
  Lock,
  Unlock,
  Radio,
  Cpu,
  Eye,
  Share2,
  ExternalLink,
  Users,
  Compass,
  Key,
  FolderDown,
  Sliders,
  Flame,
  Check,
  Crown,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import bingaaComicCover from '../assets/images/bingaa_comic_cover.jpg';
import akinoyaVistaImg from '../assets/images/akinoya_twilight_world_1790852640934.jpg';
import visualizerThumbnailImg from '../assets/images/visualizer_thumbnail.png';
import { BINGAA_PDF_URL, BINGAA_PDF_FILENAME, BINGAA_COVER_URL, BINGAA_COVER_FILENAME } from '../utils/certificate';

export type CreativeHubSection = 'downloads' | 'workflows' | 'visualizer' | 'discussion' | 'governance';

interface AssetVaultItem {
  id: string;
  title: string;
  category: string;
  fileFormat: string;
  fileSize: string;
  description: string;
  downloadUrl: string;
  fileName: string;
  thumbnailUrl: string;
  isAudio?: boolean;
}

interface WorkflowItem {
  id: string;
  title: string;
  toolstack: string;
  duration: string;
  description: string;
  videoPlaceholderUrl: string;
  metrics: { fps: string; engine: string; resolution: string };
  comments: WorkflowComment[];
}

interface WorkflowComment {
  id: string;
  author: string;
  role: 'CREATOR' | 'PATRON MEMBER' | 'FOUNDING VIP';
  timestamp: string;
  text: string;
}

interface VisualizerTrackItem {
  id: string;
  trackNumber: string;
  title: string;
  status: string;
  duration: string;
  fps: string;
  renderEngine: string;
  synopsis: string;
  previewImage: string;
}

interface DiscussionPost {
  id: string;
  author: string;
  role: 'CREATOR' | 'PATRON MEMBER' | 'FOUNDING VIP';
  avatarBg: string;
  timestamp: string;
  content: string;
  imageUrl?: string;
  likes: number;
  hasLiked?: boolean;
  replies: DiscussionReply[];
}

interface DiscussionReply {
  id: string;
  author: string;
  role: 'CREATOR' | 'PATRON MEMBER' | 'FOUNDING VIP';
  avatarBg: string;
  timestamp: string;
  content: string;
}

interface GovernanceBallot {
  id: string;
  title: string;
  category: string;
  description: string;
  totalVotes: number;
  userVoteId?: string;
  options: { id: string; label: string; votes: number }[];
}

interface CommunityHubProps {
  onBackToHome: () => void;
  onOpenAuthModal?: () => void;
}

export const CommunityHub: React.FC<CommunityHubProps> = ({ onBackToHome, onOpenAuthModal }) => {
  // Authentication & Patron preview state
  const [patronToken, setPatronToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('akinoya_patron_token');
      const vip = sessionStorage.getItem('akinoya_vip_token');
      const urlParams = new URLSearchParams(window.location.search);
      const paramToken = urlParams.get('pass') || urlParams.get('token');
      if (paramToken?.toUpperCase().includes('PATRON')) {
        sessionStorage.setItem('akinoya_patron_token', 'PATRON-TEST-ACCESS');
        return 'PATRON-TEST-ACCESS';
      }
      return stored || vip || null;
    }
    return null;
  });

  const [patronName, setPatronName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('akinoya_patron_name') || 'Patron Member #042';
    }
    return 'Patron Member #042';
  });

  // Active Hub Section
  const [activeSection, setActiveSection] = useState<CreativeHubSection>('downloads');

  // Download Toast
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  // Audio Preview state in Asset Vault
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Visualizer Theater state
  const [activeVisualizerTrack, setActiveVisualizerTrack] = useState<number>(0);
  const [isTheaterPlaying, setIsTheaterPlaying] = useState<boolean>(false);
  const [isTheaterMuted, setIsTheaterMuted] = useState<boolean>(false);

  // Workflows Comments Drawer state
  const [openWorkflowDrawerId, setOpenWorkflowDrawerId] = useState<string | null>(null);
  const [workflowCommentInputs, setWorkflowCommentInputs] = useState<Record<string, string>>({});

  // Discussion state
  const [discussionInput, setDiscussionInput] = useState('');
  const [discussionImage, setDiscussionImage] = useState<string | null>(null);
  const discussionFileInputRef = useRef<HTMLInputElement>(null);
  const [activeReplyPost, setActiveReplyPost] = useState<DiscussionPost | null>(null);
  const [replyInputText, setReplyInputText] = useState('');

  const isSimulatedPatron = patronToken === 'PATRON-TEST-ACCESS';

  // 1. ASSET & DOWNLOAD VAULT DATA
  const assetVaultItems: AssetVaultItem[] = [
    {
      id: 'asset-pdf',
      title: 'Bingäa Issue #01 — Complete 32-Page Master Print Edition',
      category: 'GRAPHIC NOVEL MASTER',
      fileFormat: 'PDF ARCHIVE',
      fileSize: '114.8 MB · 300 DPI CMYK',
      description:
        'Uncompressed production print file including full 32-page narrative sequence, wraparound cover art, author lore glossary, and high-resolution typography vectors.',
      downloadUrl: BINGAA_PDF_URL,
      fileName: BINGAA_PDF_FILENAME,
      thumbnailUrl: bingaaComicCover,
    },
    {
      id: 'asset-stems',
      title: 'Sub-Orbital Drift — 16-Track Studio Audio Stem Archive',
      category: 'UNRELEASED MUSIC STEMS',
      fileFormat: 'ZIP STEMS',
      fileSize: '348.2 MB · 24-BIT / 96kHz WAV',
      description:
        'Isolated studio stems: analog modular synth arpeggios, sub-bass 808 transient beds, spatial reverb tails, and binaural atmosphere channels for remixing and production study.',
      downloadUrl: '/assets/SubOrbitalDrift_Stems.zip',
      fileName: 'SubOrbitalDrift_Stems_96kHz.zip',
      thumbnailUrl: visualizerThumbnailImg,
      isAudio: true,
    },
    {
      id: 'asset-4k-render',
      title: 'Äkinoya Twilight World — 4K Volumetric Environment Render',
      category: '3D CONCEPT ASSET',
      fileFormat: '4K PNG',
      fileSize: '28.4 MB · 3840 x 2160 UHD',
      description:
        'Raw cinematic beauty render illustrating the ionized stratosphere and obsidian spires of Planet Äkinoya. Zero compression, full dynamic range with alpha channel.',
      downloadUrl: akinoyaVistaImg,
      fileName: 'Akinoya_Twilight_World_4K_Master.png',
      thumbnailUrl: akinoyaVistaImg,
    },
    {
      id: 'asset-cover-art',
      title: 'Bingäa Official Cover Art — High-Res Vector Illustration',
      category: 'OFFICIAL ARTWORK',
      fileFormat: 'PNG + SVG VECTORS',
      fileSize: '18.2 MB · ULTRA-RES',
      description:
        'Original digital painting and layer comp for the official graphic novel cover, suitable for large format poster prints and digital wallpaper collections.',
      downloadUrl: BINGAA_COVER_URL,
      fileName: BINGAA_COVER_FILENAME,
      thumbnailUrl: bingaaComicCover,
    },
  ];

  // 2. WORKFLOWS & CREATIVE LAB DATA
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([
    {
      id: 'wf-volumetric',
      title: 'Atmospheric Ionization & Twilight Horizon Simulation',
      toolstack: 'Blender 4.2 · Octane Render · DaVinci Resolve',
      duration: '14:28 Breakdown',
      description:
        'Behind-the-scenes breakdown of how we achieved the signature twilight purple-cyan color transitions using volumetric scatter nodes, velocity particle emitters, and spectral grading curves.',
      videoPlaceholderUrl: akinoyaVistaImg,
      metrics: { fps: '60.00', engine: 'OCTANE SPECTRAL', resolution: '4K DCI' },
      comments: [
        {
          id: 'wfc-1',
          author: 'Elena Vance',
          role: 'PATRON MEMBER',
          timestamp: '2h ago',
          text: 'The density multiplier you used for the high-altitude cloud rim creates incredible cinematic depth.',
        },
        {
          id: 'wfc-2',
          author: 'Odi',
          role: 'CREATOR',
          timestamp: '1h ago',
          text: 'Thanks Elena! We layered two separate absorption shaders with subtle chromatic aberration at the horizon edge.',
        },
      ],
    },
    {
      id: 'wf-audio-synthesis',
      title: 'Sound Design: Modular Analog Synthesis for Planetary Signals',
      toolstack: 'Ableton Live 12 · Eurorack Modular · Moog Sub 37',
      duration: '18:40 Breakdown',
      description:
        'Deep dive into the harmonic FM synthesis techniques used to construct the extraterrestrial radio telemetry audio loops that play across the Äkinoya surface.',
      videoPlaceholderUrl: visualizerThumbnailImg,
      metrics: { fps: 'N/A', engine: 'BINAURAL 3D STEREO', resolution: '96kHz/24bit' },
      comments: [
        {
          id: 'wfc-3',
          author: 'Kaelen Thorne',
          role: 'PATRON MEMBER',
          timestamp: '3h ago',
          text: 'Can you share the filter envelope settings for the low-frequency drone in the opening sequence?',
        },
      ],
    },
    {
      id: 'wf-storyboard',
      title: 'Graphic Novel Composition: Visual Pacing from Thumbnails to Inks',
      toolstack: 'Clip Studio Paint EX · Adobe Photoshop',
      duration: '11:15 Breakdown',
      description:
        'Deconstruction of page 12 to 16 in Bingäa Issue #01. Examining panel flow, negative space, mechanical line weights, and traditional screentone application.',
      videoPlaceholderUrl: bingaaComicCover,
      metrics: { fps: 'N/A', engine: 'RASTER 600DPI', resolution: 'B4 MANUSCRIPT' },
      comments: [],
    },
  ]);

  // 3. EARLY ACCESS VISUALIZER HUB DATA
  const visualizerTracks: VisualizerTrackItem[] = [
    {
      id: 'vt-1',
      trackNumber: '01',
      title: "Don't Need — Kinetic Typographic Visualizer (Draft 02)",
      status: 'EARLY ACCESS PREVIEW',
      duration: '03:18',
      fps: '60 FPS',
      renderEngine: 'UNREAL ENGINE 5.4 · LUMEN',
      synopsis:
        'High-energy typographic sequence with volumetric camera sweeps across the neon skyline of Upper Äkinoya.',
      previewImage: visualizerThumbnailImg,
    },
    {
      id: 'vt-2',
      trackNumber: '02',
      title: 'Bingäa — Twilight Descent (Cinematic Sequence Render)',
      status: '4K ANIMATION PREVIEW',
      duration: '04:02',
      fps: '60 FPS',
      renderEngine: 'BLENDER OCTANE · VOLUMETRICS',
      synopsis:
        'Full atmospheric entry sequence showing the pilot vessel gliding across the ionizing cloud ceiling into Sector 02.',
      previewImage: akinoyaVistaImg,
    },
    {
      id: 'vt-3',
      trackNumber: '03',
      title: 'Memories — Ambient Synthesizer World Loop',
      status: 'WORK IN PROGRESS',
      duration: '03:45',
      fps: '30 FPS',
      renderEngine: 'AFTER EFFECTS · PARTICLE ILLUSION',
      synopsis:
        'Meditative environmental loop depicting the slow rotation of Äkinoya against the binary star backdrop.',
      previewImage: akinoyaVistaImg,
    },
  ];

  // 4. CREATOR DISCUSSION BOARD DATA
  const [discussionPosts, setDiscussionPosts] = useState<DiscussionPost[]>([
    {
      id: 'dp-1',
      author: 'Odi',
      role: 'CREATOR',
      avatarBg: 'from-amber-400 to-amber-600',
      timestamp: 'Today at 14:15',
      content:
        'Welcome to the official Sillow Mill Creative Vault & Product Hub! This environment consolidates all production downloads, workflow breakdowns, visualizer test reels, and community governance into one command center.\n\nDownload the raw print PDF for Bingäa below, and check out the new 4K animation preview in the Visualizer Hub!',
      imageUrl: bingaaComicCover,
      likes: 28,
      hasLiked: false,
      replies: [
        {
          id: 'dpr-1',
          author: 'Elena Vance',
          role: 'PATRON MEMBER',
          avatarBg: 'from-cyan-400 to-blue-600',
          timestamp: 'Today at 14:32',
          content: 'The download vault layout is clean and fast. Stems sound immaculate in the DAW!',
        },
      ],
    },
    {
      id: 'dp-2',
      author: 'Cygnus-9',
      role: 'FOUNDING VIP',
      avatarBg: 'from-purple-400 to-indigo-600',
      timestamp: 'Today at 15:04',
      content:
        'Just reviewed the volumetric cloud breakdown in the Creative Lab. The lighting workflow at 08:30 is super insightful. Looking forward to casting my ballot for Chapter 2!',
      likes: 14,
      hasLiked: false,
      replies: [],
    },
  ]);

  // 5. LORE & GOVERNANCE DATA
  const [governanceBallots, setGovernanceBallots] = useState<GovernanceBallot[]>([
    {
      id: 'ballot-territory',
      title: 'Council Ballot #01: Chapter 2 Planetary Territory Exploration',
      category: 'NARRATIVE DIRECTIVE',
      description:
        'Verified patrons vote to decide which territory within Planet Äkinoya will serve as the primary setting for Chapter 2 of the animated story.',
      totalVotes: 94,
      options: [
        { id: 'opt-spire', label: 'Sector 04 — The Obsidian Spire & Resonance Core', votes: 46 },
        { id: 'opt-archipelago', label: 'The Neon Archipelago of Upper Äkinoya', votes: 31 },
        { id: 'opt-caverns', label: 'Sub-Surface Crystal Caverns & Bioluminescent Vault', votes: 17 },
      ],
      userVoteId: undefined,
    },
    {
      id: 'ballot-merch',
      title: 'Council Ballot #02: Wave 2 Exclusive Physical Artifact Drop',
      category: 'PHYSICAL MERCHANDISE',
      description:
        'Which physical collector piece should be prioritized for the upcoming batch release for Founding Pass & Patron members?',
      totalVotes: 72,
      options: [
        { id: 'opt-jacket', label: 'Embroidered Äkinoya Pilot Flight Jacket', votes: 34 },
        { id: 'opt-hoodie', label: 'Heavyweight Screenprinted Graphic Hooded Fleece', votes: 26 },
        { id: 'opt-keycard', label: 'Anodized Titanium VIP Keycard & NFC Medallion', votes: 12 },
      ],
      userVoteId: undefined,
    },
  ]);

  // Test Access Activator
  const handleActivateTestAccess = () => {
    soundManager.playUnlockChime();
    sessionStorage.setItem('akinoya_patron_token', 'PATRON-TEST-ACCESS');
    sessionStorage.setItem('akinoya_patron_name', 'Patron Member #042');
    sessionStorage.setItem('akinoya_patron_role', 'PATRON MEMBER');
    setPatronToken('PATRON-TEST-ACCESS');
    setPatronName('Patron Member #042');
  };

  const handleLogout = () => {
    soundManager.playTone(400, 0.08);
    sessionStorage.removeItem('akinoya_patron_token');
    setPatronToken(null);
  };

  // Trigger Real File Download
  const handleDownloadAsset = (asset: AssetVaultItem) => {
    soundManager.playUnlockChime();
    setDownloadToast(`Initiating download for: ${asset.fileName}`);

    // If it's a known static asset, download directly
    if (asset.downloadUrl.startsWith('/assets/') || asset.downloadUrl.includes('jpg') || asset.downloadUrl.includes('png')) {
      const link = document.createElement('a');
      link.href = asset.downloadUrl;
      link.download = asset.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Create deterministic text manifest blob for demo/stems
      const blob = new Blob(
        [
          `SILLOW MILL CREATIVE VAULT · ASSET DOWNLOAD MANIFEST\n\n` +
            `Asset Title: ${asset.title}\n` +
            `Format: ${asset.fileFormat}\n` +
            `Size: ${asset.fileSize}\n` +
            `Patron Token: ${patronToken || 'PATRON-TEST-ACCESS'}\n` +
            `Timestamp: ${new Date().toISOString()}\n` +
            `Integrity Verification: SHA256-AUTHENTICATED\n\n` +
            `Your high-res audio stem and production archive is authenticated.`,
        ],
        { type: 'text/plain' }
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = asset.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    setTimeout(() => {
      setDownloadToast(null);
    }, 4500);
  };

  // Toggle Audio Play in Vault
  const handleToggleAudio = (id: string) => {
    if (playingAudioId === id) {
      setPlayingAudioId(null);
      soundManager.playTone(480, 0.06);
    } else {
      setPlayingAudioId(id);
      soundManager.playTone(660, 0.08);
    }
  };

  // Add Comment to Workflow
  const handleAddWorkflowComment = (workflowId: string) => {
    const text = workflowCommentInputs[workflowId]?.trim();
    if (!text) return;

    soundManager.playTone(740, 0.06);
    const newComment: WorkflowComment = {
      id: `wfc-${Date.now()}`,
      author: patronName,
      role: 'PATRON MEMBER',
      timestamp: 'Just now',
      text,
    };

    setWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.id === workflowId) {
          return { ...wf, comments: [...wf.comments, newComment] };
        }
        return wf;
      })
    );

    setWorkflowCommentInputs((prev) => ({ ...prev, [workflowId]: '' }));
  };

  // Handle Discussion Post Submit
  const handleCreateDiscussionPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discussionInput.trim() && !discussionImage) return;

    soundManager.playTone(820, 0.06);
    const newPost: DiscussionPost = {
      id: `dp-${Date.now()}`,
      author: patronName,
      role: 'PATRON MEMBER',
      avatarBg: 'from-cyan-400 to-indigo-600',
      timestamp: 'Just now',
      content: discussionInput.trim(),
      imageUrl: discussionImage || undefined,
      likes: 0,
      hasLiked: false,
      replies: [],
    };

    setDiscussionPosts((prev) => [newPost, ...prev]);
    setDiscussionInput('');
    setDiscussionImage(null);
  };

  // Toggle Discussion Like
  const handleToggleDiscussionLike = (postId: string) => {
    soundManager.playTone(840, 0.08);
    setDiscussionPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const hasLiked = !p.hasLiked;
          return {
            ...p,
            hasLiked,
            likes: hasLiked ? p.likes + 1 : Math.max(0, p.likes - 1),
          };
        }
        return p;
      })
    );
  };

  // Add Reply to Discussion
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInputText.trim() || !activeReplyPost) return;

    soundManager.playTone(780, 0.06);
    const newReply: DiscussionReply = {
      id: `dpr-${Date.now()}`,
      author: patronName,
      role: 'PATRON MEMBER',
      avatarBg: 'from-cyan-400 to-indigo-600',
      timestamp: 'Just now',
      content: replyInputText.trim(),
    };

    setDiscussionPosts((prev) =>
      prev.map((p) => {
        if (p.id === activeReplyPost.id) {
          return { ...p, replies: [...p.replies, newReply] };
        }
        return p;
      })
    );

    setActiveReplyPost((prev) => (prev ? { ...prev, replies: [...prev.replies, newReply] } : null));
    setReplyInputText('');
  };

  // Vote on Ballot
  const handleVoteBallot = (ballotId: string, optionId: string) => {
    soundManager.playUnlockChime();
    setGovernanceBallots((prev) =>
      prev.map((b) => {
        if (b.id === ballotId) {
          const prevVoted = b.userVoteId;
          const updatedOptions = b.options.map((opt) => {
            if (opt.id === optionId) return { ...opt, votes: opt.votes + 1 };
            if (prevVoted && opt.id === prevVoted) return { ...opt, votes: Math.max(0, opt.votes - 1) };
            return opt;
          });
          return {
            ...b,
            options: updatedOptions,
            userVoteId: optionId,
            totalVotes: prevVoted ? b.totalVotes : b.totalVotes + 1,
          };
        }
        return b;
      })
    );
  };

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#04070d] text-white flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Universal Header Bar */}
      <header className="relative z-30 w-full border-b border-white/10 bg-[#060a14]/90 backdrop-blur-xl px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-mono transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Planet Äkinoya</span>
          </button>

          <div className="h-4 w-px bg-white/15" />

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs sm:text-sm font-display font-bold tracking-wider text-white uppercase truncate">
              CREATIVE VAULT &amp; PRODUCT HUB
            </span>
          </div>
        </div>

        {/* Right Status Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isSimulatedPatron ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/40 text-[10.5px] font-mono text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="font-bold">PATRON-TEST-ACCESS</span>
            </div>
          ) : patronToken ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-400/40 text-[10.5px] font-mono text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{patronName}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleActivateTestAccess}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 text-black text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.35)] cursor-pointer flex items-center gap-1.5"
            >
              <span>🧪 PREVIEW CREATIVE VAULT</span>
            </button>
          )}

          {patronToken && (
            <button
              type="button"
              onClick={handleLogout}
              title="Reset Test Session"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Futuristic Multi-Hub Navigation Sub-Bar */}
      <nav className="relative z-20 w-full bg-[#050912]/95 border-b border-white/10 px-3 sm:px-6 py-2 overflow-x-auto no-scrollbar shrink-0 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-3 min-w-max">
          {[
            { id: 'downloads', label: 'Asset & Download Vault', icon: FolderDown, count: '4' },
            { id: 'workflows', label: 'Workflows & Creative Lab', icon: Sliders, count: '3' },
            { id: 'visualizer', label: 'Early Access Visualizer Hub', icon: Film, count: '3' },
            { id: 'discussion', label: 'Creator Discussion Board', icon: MessageSquare, count: discussionPosts.length.toString() },
            { id: 'governance', label: 'Lore & Governance Portal', icon: Vote, count: '2' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveSection(tab.id as CreativeHubSection);
                  soundManager.playTone(580, 0.05);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(56,189,248,0.35)] font-bold scale-[1.02]'
                    : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-cyan-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-white/60'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* SECTION 1: ASSET & DOWNLOAD VAULT */}
        {activeSection === 'downloads' && (
          <motion.div
            key="section-downloads"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            {/* Header intro banner */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-black/50 to-black/80 border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_30px_rgba(56,189,248,0.1)]">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 font-bold tracking-wider">
                    MODULE 01
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                    UNRESTRICTED HIGH-RES ACCESS
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide">
                  📦 Asset &amp; Download Vault
                </h1>
                <p className="text-xs sm:text-sm text-white/70 font-sans mt-1 max-w-2xl">
                  Download production-ready print master PDFs, uncompressed 24-bit audio stems, raw 4K visualizer wallpapers, and storyboards directly to your machine.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>VIP CRYPTO VERIFIED</span>
                </span>
              </div>
            </div>

            {/* Asset Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {assetVaultItems.map((asset) => (
                <div
                  key={asset.id}
                  className="p-5 sm:p-6 rounded-2xl bg-black/60 border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between shadow-[0_4px_25px_rgba(0,0,0,0.5)] group relative overflow-hidden"
                >
                  <div>
                    {/* Top Tag & Format Header */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-md border border-cyan-500/30 uppercase">
                        {asset.category}
                      </span>
                      <span className="text-[10.5px] font-mono text-white/50">{asset.fileSize}</span>
                    </div>

                    <h2 className="text-base sm:text-lg font-display font-bold text-white group-hover:text-cyan-200 transition-colors leading-snug mb-2">
                      {asset.title}
                    </h2>

                    <p className="text-xs text-white/65 leading-relaxed font-sans mb-4">
                      {asset.description}
                    </p>

                    {/* Preview Thumbnail / Audio Bar */}
                    <div className="mb-4 rounded-xl overflow-hidden bg-black/80 border border-white/10 p-2.5 flex items-center gap-3">
                      <img
                        src={asset.thumbnailUrl}
                        alt={asset.title}
                        className="w-16 h-16 object-cover rounded-lg border border-white/10 shrink-0"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-mono font-semibold text-white truncate">
                          {asset.fileName}
                        </div>
                        <div className="text-[10px] font-mono text-cyan-300/80 mt-0.5">
                          {asset.fileFormat}
                        </div>

                        {asset.isAudio && (
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleAudio(asset.id)}
                              className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-black text-[10px] font-mono font-bold transition-colors cursor-pointer flex items-center gap-1"
                            >
                              {playingAudioId === asset.id ? (
                                <>
                                  <Pause className="w-2.5 h-2.5" />
                                  <span>PAUSE</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-2.5 h-2.5 ml-0.5" />
                                  <span>PREVIEW STEM</span>
                                </>
                              )}
                            </button>
                            <span className="text-[9.5px] font-mono text-white/40">Studio Master</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Direct Download Action Button */}
                  <div className="pt-3 border-t border-white/10 mt-auto flex items-center justify-between gap-3">
                    <span className="text-[10.5px] font-mono text-white/40 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-400" />
                      <span>UNRESTRICTED</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDownloadAsset(asset)}
                      className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold text-xs transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)] hover:scale-[1.02] cursor-pointer flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5 text-black" />
                      <span>DOWNLOAD ASSET</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* SECTION 2: WORKFLOWS & CREATIVE LAB */}
        {activeSection === 'workflows' && (
          <motion.div
            key="section-workflows"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-black/50 to-black/80 border border-purple-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-400/40 text-purple-300 font-bold tracking-wider">
                    MODULE 02
                  </span>
                  <span className="text-[10px] font-mono text-purple-300 font-semibold">
                    PRODUCTION TELEMETRY
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide">
                  🧪 Workflows &amp; Creative Lab
                </h1>
                <p className="text-xs sm:text-sm text-white/70 font-sans mt-1 max-w-2xl">
                  In-depth technical breakdowns of 3D shaders, modular synthesis chains, and paneling architecture. Ask questions in the dedicated Q&amp;A drawer under each workflow.
                </p>
              </div>
            </div>

            {/* Workflow Breakdown Cards */}
            <div className="space-y-6">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  className="p-5 sm:p-6 rounded-2xl bg-black/60 border border-purple-500/30 shadow-[0_4px_30px_rgba(0,0,0,0.5)] space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-purple-300 bg-purple-950/80 px-2.5 py-0.5 rounded-md border border-purple-400/40">
                        {wf.toolstack}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">● LIVE BREAKDOWN</span>
                    </div>
                    <span className="text-[10.5px] font-mono text-white/50">{wf.duration}</span>
                  </div>

                  <h2 className="text-base sm:text-lg font-display font-bold text-white">
                    {wf.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-white/70 font-sans leading-relaxed">
                    {wf.description}
                  </p>

                  {/* Video Mockup Player Frame */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black/90 border border-purple-500/30 flex items-center justify-center group shadow-inner">
                    <img
                      src={wf.videoPlaceholderUrl}
                      alt={wf.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-60 filter blur-[0.5px]"
                    />

                    {/* HUD Telemetry Overlay */}
                    <div className="absolute inset-0 p-3 sm:p-4 flex flex-col justify-between pointer-events-none">
                      <div className="flex items-center justify-between text-[10px] font-mono text-purple-300">
                        <span>ENGINE: {wf.metrics.engine}</span>
                        <span>RES: {wf.metrics.resolution}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
                        <span>FPS: {wf.metrics.fps}</span>
                        <span>STUDIO LAB ARCHIVE</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => soundManager.playTone(660, 0.08)}
                      className="relative z-10 w-14 h-14 rounded-full bg-purple-500/80 hover:bg-purple-400 text-black flex items-center justify-center transition-transform hover:scale-110 shadow-[0_0_20px_rgba(168,85,247,0.5)] cursor-pointer"
                    >
                      <Play className="w-6 h-6 fill-black ml-0.5" />
                    </button>
                  </div>

                  {/* Expandable Q&A Comment Drawer Trigger */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenWorkflowDrawerId(openWorkflowDrawerId === wf.id ? null : wf.id)
                      }
                      className="flex items-center gap-2 text-xs font-mono font-semibold text-purple-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>
                        {wf.comments.length} Technical Q&amp;A Comments &amp; Dialogue
                      </span>
                      {openWorkflowDrawerId === wf.id ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Comment Drawer Container */}
                  {openWorkflowDrawerId === wf.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 p-4 rounded-xl bg-black/80 border border-purple-500/20 space-y-3"
                    >
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {wf.comments.length === 0 ? (
                          <div className="text-xs font-mono text-white/40 italic p-2">
                            No questions yet. Be the first to ask about this production setup!
                          </div>
                        ) : (
                          wf.comments.map((c) => (
                            <div key={c.id} className="text-xs p-2.5 rounded-lg bg-white/[0.03] border border-white/5 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-purple-300 text-[11px] flex items-center gap-1.5">
                                  <span>{c.author}</span>
                                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-500/20 text-purple-300">
                                    {c.role}
                                  </span>
                                </span>
                                <span className="text-[9px] font-mono text-white/40">{c.timestamp}</span>
                              </div>
                              <p className="text-white/80 leading-relaxed font-sans">{c.text}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Comment Input Box */}
                      <div className="flex gap-2 pt-2 border-t border-white/10">
                        <input
                          type="text"
                          value={workflowCommentInputs[wf.id] || ''}
                          onChange={(e) =>
                            setWorkflowCommentInputs({ ...workflowCommentInputs, [wf.id]: e.target.value })
                          }
                          placeholder={`Ask director/artist a question about ${wf.title}...`}
                          className="flex-1 bg-black/60 border border-white/15 focus:border-purple-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none font-sans"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddWorkflowComment(wf.id)}
                          className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-black font-mono font-bold text-xs transition-colors cursor-pointer"
                        >
                          Send
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* SECTION 3: EARLY ACCESS VISUALIZER HUB */}
        {activeSection === 'visualizer' && (
          <motion.div
            key="section-visualizer"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-black/50 to-black/80 border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_30px_rgba(56,189,248,0.1)]">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 font-bold tracking-wider">
                    MODULE 03
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                    HIGH-RESOLUTION THEATER SPELER
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide">
                  🎬 Early Access Visualizer Hub
                </h1>
                <p className="text-xs sm:text-sm text-white/70 font-sans mt-1 max-w-2xl">
                  Dedicated master theater player previewing unreleased animated sequences, typographic motion tests, and ambient lighting passes in 4K UHD.
                </p>
              </div>
            </div>

            {/* Theater Player Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Cinema Viewport (2 cols) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/95 border border-cyan-500/40 shadow-[0_0_40px_rgba(56,189,248,0.2)] flex items-center justify-center group">
                  <img
                    src={visualizerTracks[activeVisualizerTrack].previewImage}
                    alt="Theater Visual"
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                  />

                  {/* Sci-Fi HUD Watermark & Telemetry */}
                  <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-between pointer-events-none">
                    <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
                      <span className="bg-black/60 px-2 py-1 rounded border border-cyan-500/30">
                        {visualizerTracks[activeVisualizerTrack].status}
                      </span>
                      <span className="bg-black/60 px-2 py-1 rounded border border-white/20">
                        {visualizerTracks[activeVisualizerTrack].fps} · {visualizerTracks[activeVisualizerTrack].renderEngine}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-white/80">
                      <span className="bg-black/60 px-2 py-1 rounded">
                        01:14 / {visualizerTracks[activeVisualizerTrack].duration}
                      </span>
                      <span className="text-[10px] text-cyan-400 font-bold tracking-wider">
                        SILLOW MILL CINEMATIC SYNDICATE
                      </span>
                    </div>
                  </div>

                  {/* Play/Pause Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTheaterPlaying(!isTheaterPlaying);
                      soundManager.playTone(620, 0.08);
                    }}
                    className="relative z-10 w-16 h-16 rounded-full bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center transition-transform hover:scale-110 shadow-[0_0_25px_rgba(56,189,248,0.6)] cursor-pointer"
                  >
                    {isTheaterPlaying ? <Pause className="w-7 h-7 fill-black" /> : <Play className="w-7 h-7 fill-black ml-1" />}
                  </button>
                </div>

                {/* Theater Controls Bar */}
                <div className="p-4 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-display font-bold text-white truncate">
                      {visualizerTracks[activeVisualizerTrack].title}
                    </h3>
                    <p className="text-[11px] text-white/60 font-sans mt-0.5 truncate">
                      {visualizerTracks[activeVisualizerTrack].synopsis}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsTheaterMuted(!isTheaterMuted)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
                    >
                      {isTheaterMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sequence Playlist Selector (1 col) */}
              <div className="space-y-3">
                <div className="text-xs font-mono font-bold text-white/50 uppercase tracking-wider px-1">
                  AVAILABLE SEQUENCES (3)
                </div>

                {visualizerTracks.map((trk, idx) => (
                  <button
                    key={trk.id}
                    type="button"
                    onClick={() => {
                      setActiveVisualizerTrack(idx);
                      soundManager.playTone(560, 0.06);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                      activeVisualizerTrack === idx
                        ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                        : 'bg-black/50 border-white/10 hover:border-white/20 text-white/70'
                    }`}
                  >
                    <img
                      src={trk.previewImage}
                      alt={trk.title}
                      className="w-14 h-12 object-cover rounded-lg border border-white/10 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
                        <span>TRACK #{trk.trackNumber}</span>
                        <span>{trk.duration}</span>
                      </div>
                      <h4 className="text-xs font-display font-bold text-white truncate mt-0.5">
                        {trk.title}
                      </h4>
                      <span className="text-[9.5px] font-mono text-white/40">{trk.status}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* SECTION 4: CREATOR DISCUSSION BOARD */}
        {activeSection === 'discussion' && (
          <motion.div
            key="section-discussion"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-black/50 to-black/80 border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_30px_rgba(56,189,248,0.1)]">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 font-bold tracking-wider">
                    MODULE 04
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                    PATRON &amp; CREATOR TRANSMISSIONS
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide">
                  💬 Creator Discussion Board
                </h1>
                <p className="text-xs sm:text-sm text-white/70 font-sans mt-1 max-w-2xl">
                  Official production logs, world lore commentary, and community feed. Post updates, attach artwork, like posts, and engage in threaded discussions.
                </p>
              </div>
            </div>

            {/* Create Post Box */}
            <form
              onSubmit={handleCreateDiscussionPost}
              className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-white/10 focus-within:border-cyan-400/50 space-y-3 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center font-bold text-xs text-black shrink-0">
                  PM
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{patronName}</div>
                  <div className="text-[9.5px] font-mono text-cyan-300">PATRON MEMBER</div>
                </div>
              </div>

              <textarea
                value={discussionInput}
                onChange={(e) => setDiscussionInput(e.target.value)}
                placeholder="Share production feedback, ask about lore, or discuss upcoming drops..."
                rows={3}
                className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none resize-none font-sans"
              />

              {discussionImage && (
                <div className="flex items-center gap-2 bg-white/5 p-2 rounded-xl w-fit border border-cyan-500/30">
                  <img src={discussionImage} alt="Upload" className="w-12 h-12 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setDiscussionImage(null)}
                    className="p-1 text-white/50 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <input
                  type="file"
                  ref={discussionFileInputRef}
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const r = new FileReader();
                      r.onload = () => typeof r.result === 'string' && setDiscussionImage(r.result);
                      r.readAsDataURL(f);
                    }
                  }}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => discussionFileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-white/70 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Attach Image</span>
                </button>

                <button
                  type="submit"
                  disabled={!discussionInput.trim() && !discussionImage}
                  className="px-5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-30 text-black font-mono font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>POST TRANSMISSION</span>
                </button>
              </div>
            </form>

            {/* Posts Feed */}
            <div className="space-y-4">
              {discussionPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-5 sm:p-6 rounded-2xl bg-black/60 border border-white/10 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-full bg-gradient-to-tr ${post.avatarBg} flex items-center justify-center font-bold text-xs text-black shrink-0`}
                      >
                        {post.author.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{post.author}</span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                              post.role === 'CREATOR'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                                : post.role === 'FOUNDING VIP'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                            }`}
                          >
                            {post.role}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-white/40">{post.timestamp}</div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-white/85 leading-relaxed font-sans whitespace-pre-line">
                    {post.content}
                  </p>

                  {post.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-white/10 max-h-72 bg-black/80 flex items-center justify-center max-w-md">
                      <img src={post.imageUrl} alt="Attached" className="max-h-72 w-full object-cover" />
                    </div>
                  )}

                  {/* Like & Reply Bar */}
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleDiscussionLike(post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                        post.hasLiked
                          ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-bold'
                          : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${post.hasLiked ? 'text-cyan-400' : ''}`} />
                      <span>{post.likes}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveReplyPost(post)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-white/60 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{post.replies.length} Replies</span>
                    </button>
                  </div>

                  {/* Inline replies preview */}
                  {post.replies.length > 0 && (
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      {post.replies.map((rep) => (
                        <div key={rep.id} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-cyan-300 text-[11px]">{rep.author}</span>
                            <span className="text-[9px] font-mono text-white/40">{rep.timestamp}</span>
                          </div>
                          <p className="text-white/80 font-sans">{rep.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* SECTION 5: LORE & GOVERNANCE PORTAL */}
        {activeSection === 'governance' && (
          <motion.div
            key="section-governance"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-black/50 to-black/80 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-emerald-300 font-bold tracking-wider">
                    MODULE 05
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                    PATRON CONSENSUS PROTOCOL
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide">
                  🗳️ Lore &amp; Governance Portal
                </h1>
                <p className="text-xs sm:text-sm text-white/70 font-sans mt-1 max-w-2xl">
                  Cast binding votes on storyline territory branches, pilot armor variants, and batch merchandise priorities. Votes are cryptographically recorded to your pass identity.
                </p>
              </div>
            </div>

            {/* Polls Container */}
            <div className="space-y-6">
              {governanceBallots.map((ballot) => (
                <div
                  key={ballot.id}
                  className="p-5 sm:p-6 rounded-2xl bg-black/60 border border-emerald-500/30 shadow-[0_4px_25px_rgba(0,0,0,0.5)] space-y-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-md border border-emerald-400/40">
                      {ballot.category}
                    </span>
                    <span className="text-xs font-mono text-white/50">{ballot.totalVotes} Total Ballots</span>
                  </div>

                  <h2 className="text-base sm:text-lg font-display font-bold text-white">
                    {ballot.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-white/70 font-sans">
                    {ballot.description}
                  </p>

                  {/* Options with percentage fills */}
                  <div className="space-y-3 pt-2">
                    {ballot.options.map((opt) => {
                      const pct = ballot.totalVotes > 0 ? Math.round((opt.votes / ballot.totalVotes) * 100) : 0;
                      const isVoted = ballot.userVoteId === opt.id;

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleVoteBallot(ballot.id, opt.id)}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                            isVoted
                              ? 'bg-emerald-950/60 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                              : 'bg-black/50 border-white/10 hover:border-emerald-500/40 text-white/80'
                          }`}
                        >
                          <div
                            className="absolute inset-y-0 left-0 bg-emerald-500/15 pointer-events-none transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />

                          <div className="relative z-10 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isVoted
                                    ? 'border-emerald-400 bg-emerald-400'
                                    : 'border-white/30 group-hover:border-emerald-400'
                                }`}
                              >
                                {isVoted && <CheckCircle2 className="w-3 h-3 text-black" />}
                              </div>
                              <span className="text-xs sm:text-sm font-semibold truncate">
                                {opt.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                              <span className="text-emerald-400 font-bold">{pct}%</span>
                              <span className="text-white/40 text-[11px]">({opt.votes})</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {ballot.userVoteId && (
                    <div className="pt-2 flex items-center gap-1.5 text-[11px] font-mono text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Consensus recorded: Ballot verified against {patronName}.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>

      {/* Download Alert Toast */}
      <AnimatePresence>
        {downloadToast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-cyan-950/95 border border-cyan-400 text-white font-mono text-xs shadow-2xl flex items-center gap-3 backdrop-blur-md"
          >
            <Download className="w-5 h-5 text-cyan-400 animate-bounce" />
            <div>
              <div className="font-bold text-cyan-300">Vault Download Active</div>
              <div className="text-[11px] text-white/80">{downloadToast}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thread Reply Drawer Modal */}
      <AnimatePresence>
        {activeReplyPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm p-3">
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-md h-[90vh] bg-[#070b14] border border-cyan-500/30 rounded-2xl p-5 shadow-2xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-display font-bold text-white uppercase">
                      THREAD DISCUSSION
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveReplyPost(null)}
                    className="p-1 rounded text-white/50 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3 my-3 rounded-xl bg-white/5 border border-white/5 text-xs">
                  <div className="font-bold text-cyan-300 mb-1">{activeReplyPost.author}</div>
                  <p className="text-white/80 font-sans">{activeReplyPost.content}</p>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {activeReplyPost.replies.map((r) => (
                    <div key={r.id} className="p-2.5 rounded-lg bg-black/60 border border-white/5 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white">{r.author}</span>
                        <span className="text-[9px] font-mono text-white/40">{r.timestamp}</span>
                      </div>
                      <p className="text-white/80 font-sans">{r.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSendReply} className="pt-3 border-t border-white/10 flex gap-2">
                <input
                  type="text"
                  value={replyInputText}
                  onChange={(e) => setReplyInputText(e.target.value)}
                  placeholder="Reply to thread..."
                  className="flex-1 bg-black/60 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs transition-colors cursor-pointer"
                >
                  Reply
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

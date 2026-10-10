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
  Sliders,
  FolderDown,
  CreditCard,
  Crown,
  Eye,
  Check,
  Zap,
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
  heroBannerUrl: string;
  isAudio?: boolean;
}

interface WorkflowItem {
  id: string;
  title: string;
  toolstack: string;
  duration: string;
  description: string;
  heroBannerUrl: string;
  metrics: { fps: string; engine: string; resolution: string };
  comments: WorkflowComment[];
}

interface WorkflowComment {
  id: string;
  author: string;
  role: 'CREATOR' | 'PATRON MEMBER' | 'COMMUNITY MEMBER';
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
  role: 'CREATOR' | 'PATRON MEMBER' | 'COMMUNITY MEMBER';
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
  role: 'CREATOR' | 'PATRON MEMBER' | 'COMMUNITY MEMBER';
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
  // Authentication & Patron State
  const [isPatron, setIsPatron] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const isParamPatron =
        urlParams.get('membership_unlocked') === 'true' ||
        urlParams.get('pass')?.toUpperCase().includes('PATRON') ||
        urlParams.get('token')?.toUpperCase().includes('PATRON');

      if (isParamPatron) {
        sessionStorage.setItem('akinoya_is_patron', 'true');
        sessionStorage.setItem('akinoya_patron_token', 'PATRON-TEST-ACCESS');
        return true;
      }

      return (
        sessionStorage.getItem('akinoya_is_patron') === 'true' ||
        sessionStorage.getItem('akinoya_patron_token') === 'PATRON-TEST-ACCESS' ||
        Boolean(sessionStorage.getItem('akinoya_vip_token'))
      );
    }
    return false;
  });

  const [patronName, setPatronName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('akinoya_patron_name') || 'Patron Member #042';
    }
    return 'Patron Member #042';
  });

  // Active Hub Section
  const [activeSection, setActiveSection] = useState<CreativeHubSection>('downloads');

  // Paywall Upgrade Modal state
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalReason, setUpgradeModalReason] = useState<string>('Unlock full access to downloads, DAW templates, and 4K vaults.');
  const [isSubscribing, setIsSubscribing] = useState(false);

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

  // Discussion state (100% Free & Open)
  const [discussionInput, setDiscussionInput] = useState('');
  const [discussionImage, setDiscussionImage] = useState<string | null>(null);
  const discussionFileInputRef = useRef<HTMLInputElement>(null);
  const [activeReplyPost, setActiveReplyPost] = useState<DiscussionPost | null>(null);
  const [replyInputText, setReplyInputText] = useState('');

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
      heroBannerUrl: bingaaComicCover,
    },
    {
      id: 'asset-stems',
      title: 'Sub-Orbital Drift — 16-Track Studio Audio Stem Archive & DAW Template',
      category: 'UNRELEASED MUSIC & DAW TEMPLATE',
      fileFormat: 'ZIP STEMS + ABLETON .ALS',
      fileSize: '348.2 MB · 24-BIT / 96kHz WAV',
      description:
        'Full DAW session template with 16 isolated tracks: analog modular synth arpeggios, sub-bass 808 transient beds, spatial reverb tails, and binaural atmosphere channels for remixing and production study.',
      downloadUrl: '/assets/SubOrbitalDrift_Stems.zip',
      fileName: 'SubOrbitalDrift_Stems_96kHz.zip',
      heroBannerUrl: visualizerThumbnailImg,
      isAudio: true,
    },
    {
      id: 'asset-4k-render',
      title: 'Äkinoya Twilight World — 4K Volumetric Environment Render',
      category: '3D CONCEPT ASSET',
      fileFormat: '4K PNG WALLPAPER',
      fileSize: '28.4 MB · 3840 x 2160 UHD',
      description:
        'Raw cinematic beauty render illustrating the ionized stratosphere and obsidian spires of Planet Äkinoya. Zero compression, full dynamic range with alpha channel.',
      downloadUrl: akinoyaVistaImg,
      fileName: 'Akinoya_Twilight_World_4K_Master.png',
      heroBannerUrl: akinoyaVistaImg,
    },
    {
      id: 'asset-cover-art',
      title: 'Bingäa Official Cover Art & Character Sheet — High-Res Vector Vectors',
      category: 'OFFICIAL ARTWORK & PROMPTS',
      fileFormat: 'PNG + SVG + PROMPT MATRIX',
      fileSize: '18.2 MB · ULTRA-RES',
      description:
        'Original digital painting, layer comp, and Midjourney/SD prompt matrix comp for the official graphic novel cover, suitable for large format poster prints and digital wallpaper collections.',
      downloadUrl: BINGAA_COVER_URL,
      fileName: BINGAA_COVER_FILENAME,
      heroBannerUrl: bingaaComicCover,
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
      heroBannerUrl: akinoyaVistaImg,
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
      title: 'Sound Design: Modular Analog Synthesis & DAW Project Walkthrough',
      toolstack: 'Ableton Live 12 · Eurorack Modular · Moog Sub 37',
      duration: '18:40 Breakdown',
      description:
        'Deep dive into the harmonic FM synthesis techniques and Ableton rack macros used to construct the extraterrestrial radio telemetry audio loops that play across the Äkinoya surface.',
      heroBannerUrl: visualizerThumbnailImg,
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
      heroBannerUrl: bingaaComicCover,
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
      status: 'FREE SAMPLE PREVIEW',
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

  // 4. CREATOR DISCUSSION BOARD DATA (100% Free & Open)
  const [discussionPosts, setDiscussionPosts] = useState<DiscussionPost[]>([
    {
      id: 'dp-1',
      author: 'Odi',
      role: 'CREATOR',
      avatarBg: 'from-amber-400 to-amber-600',
      timestamp: 'Today at 14:15',
      content:
        'Welcome to the official Sillow Mill Creative Vault & Product Hub! This environment consolidates all production downloads, workflow breakdowns, visualizer test reels, and community governance into one command center.\n\nFree community members get a full preview of the first asset in each category and unrestricted access to this discussion board!',
      imageUrl: bingaaComicCover,
      likes: 31,
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
      role: 'PATRON MEMBER',
      avatarBg: 'from-purple-400 to-indigo-600',
      timestamp: 'Today at 15:04',
      content:
        'Just reviewed the volumetric cloud breakdown in the Creative Lab. The lighting workflow at 08:30 is super insightful. Looking forward to casting my ballot for Chapter 2!',
      likes: 19,
      hasLiked: false,
      replies: [],
    },
  ]);

  // 5. LORE & GOVERNANCE DATA
  const [governanceBallots, setGovernanceBallots] = useState<GovernanceBallot[]>([
    {
      id: 'ballot-territory',
      title: 'Council Ballot #01: Chapter 2 Planetary Territory Exploration',
      category: 'FREE SAMPLE BALLOT',
      description:
        'Community & Patrons vote to decide which territory within Planet Äkinoya will serve as the primary setting for Chapter 2 of the animated story.',
      totalVotes: 104,
      options: [
        { id: 'opt-spire', label: 'Sector 04 — The Obsidian Spire & Resonance Core', votes: 52 },
        { id: 'opt-archipelago', label: 'The Neon Archipelago of Upper Äkinoya', votes: 34 },
        { id: 'opt-caverns', label: 'Sub-Surface Crystal Caverns & Bioluminescent Vault', votes: 18 },
      ],
      userVoteId: undefined,
    },
    {
      id: 'ballot-merch',
      title: 'Council Ballot #02: Wave 2 Exclusive Physical Artifact Drop',
      category: 'PATRON EXCLUSIVE BALLOT',
      description:
        'Which physical collector piece should be prioritized for the upcoming batch release for Founding Pass & Patron members?',
      totalVotes: 78,
      options: [
        { id: 'opt-jacket', label: 'Embroidered Äkinoya Pilot Flight Jacket', votes: 38 },
        { id: 'opt-hoodie', label: 'Heavyweight Screenprinted Graphic Hooded Fleece', votes: 27 },
        { id: 'opt-keycard', label: 'Anodized Titanium VIP Keycard & NFC Medallion', votes: 13 },
      ],
      userVoteId: undefined,
    },
  ]);

  // Test Access Activator
  const handleActivateTestAccess = () => {
    soundManager.playUnlockChime();
    sessionStorage.setItem('akinoya_is_patron', 'true');
    sessionStorage.setItem('akinoya_patron_token', 'PATRON-TEST-ACCESS');
    sessionStorage.setItem('akinoya_patron_name', 'Patron Member #042');
    sessionStorage.setItem('akinoya_patron_role', 'PATRON MEMBER');
    setIsPatron(true);
    setPatronName('Patron Member #042');
    setIsUpgradeModalOpen(false);
  };

  const handleToggleGuestMode = () => {
    soundManager.playTone(450, 0.08);
    if (isPatron) {
      sessionStorage.removeItem('akinoya_is_patron');
      sessionStorage.removeItem('akinoya_patron_token');
      setIsPatron(false);
      setPatronName('Guest Member');
    } else {
      handleActivateTestAccess();
    }
  };

  // Stripe Checkout Handler for €5/Month
  const handleStripeUpgrade = async () => {
    setIsSubscribing(true);
    soundManager.playTone(660, 0.08);

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'membership',
          product: 'community_membership',
          customerName: patronName || 'Community Member',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      if (data?.error) {
        soundManager.playError();
        alert(`Checkout Notice: ${data.error}`);
      }
    } catch {
      soundManager.playError();
      alert('Stripe subscription endpoint initializing.');
    } finally {
      setIsSubscribing(false);
    }
  };

  // Trigger Asset Download or Open Freemium Paywall
  const handleDownloadAsset = (asset: AssetVaultItem, index: number) => {
    if (!isPatron) {
      // Freemium Paywall: Free sample preview permits viewing, but downloading requires €5/month pass
      soundManager.playTone(480, 0.08);
      setUpgradeModalReason(
        `Activate the Sillow Mill Creative Vault membership for €5/month to download ${asset.title}.`
      );
      setIsUpgradeModalOpen(true);
      return;
    }

    // Paid Patron 1-click download
    soundManager.playUnlockChime();
    setDownloadToast(`Downloading: ${asset.fileName}`);

    if (asset.downloadUrl.startsWith('/assets/') || asset.downloadUrl.includes('jpg') || asset.downloadUrl.includes('png')) {
      const link = document.createElement('a');
      link.href = asset.downloadUrl;
      link.download = asset.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const blob = new Blob(
        [
          `SILLOW MILL CREATIVE VAULT · ASSET DOWNLOAD MANIFEST\n\n` +
            `Asset Title: ${asset.title}\n` +
            `Format: ${asset.fileFormat}\n` +
            `Size: ${asset.fileSize}\n` +
            `Patron Token: PATRON-AUTHENTICATED\n` +
            `Timestamp: ${new Date().toISOString()}\n` +
            `Verification: SHA256-DETERMINISTIC\n\n` +
            `Your high-res audio stem, DAW template, and production archive is authenticated.`,
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
      role: isPatron ? 'PATRON MEMBER' : 'COMMUNITY MEMBER',
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

  // Handle Discussion Post Submit (Free & Open for everyone)
  const handleCreateDiscussionPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discussionInput.trim() && !discussionImage) return;

    soundManager.playTone(820, 0.06);
    const newPost: DiscussionPost = {
      id: `dp-${Date.now()}`,
      author: patronName,
      role: isPatron ? 'PATRON MEMBER' : 'COMMUNITY MEMBER',
      avatarBg: isPatron ? 'from-cyan-400 to-indigo-600' : 'from-slate-400 to-slate-600',
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
      role: isPatron ? 'PATRON MEMBER' : 'COMMUNITY MEMBER',
      avatarBg: isPatron ? 'from-cyan-400 to-indigo-600' : 'from-slate-400 to-slate-600',
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
  const handleVoteBallot = (ballotId: string, optionId: string, isFirstBallot: boolean) => {
    if (!isPatron && !isFirstBallot) {
      soundManager.playTone(480, 0.08);
      setUpgradeModalReason('Council Ballot #02 is reserved for verified Patrons. Activate for €5/month to vote.');
      setIsUpgradeModalOpen(true);
      return;
    }

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
    <div className="relative min-h-[100dvh] w-full bg-[#03060c] text-white flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden">
      {/* Top Universal Header Bar */}
      <header className="relative z-30 w-full border-b border-white/10 bg-[#050811]/90 backdrop-blur-xl px-2.5 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-2.5 py-2 sm:py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-mono transition-colors cursor-pointer min-h-[40px] sm:min-h-[36px] shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Planet Äkinoya</span>
          </button>

          <div className="h-4 w-px bg-white/15 shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span className="text-xs sm:text-sm font-display font-bold tracking-wider text-white uppercase truncate">
              CREATIVE VAULT &amp; PRODUCT HUB
            </span>
          </div>
        </div>

        {/* Right Status Actions & Freemium Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isPatron ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg bg-emerald-950/80 border border-emerald-400/40 text-[10.5px] font-mono text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)] whitespace-nowrap min-h-[40px] sm:min-h-[36px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-bold">PATRON ACTIVE</span>
              </div>
              <button
                type="button"
                onClick={handleToggleGuestMode}
                className="hidden md:inline-flex px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/50 hover:text-white transition-colors cursor-pointer min-h-[36px] items-center"
                title="Simulate Free Guest View"
              >
                Test Free User View
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleActivateTestAccess}
                className="px-2.5 py-1.5 sm:py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-[10.5px] sm:text-[11px] font-mono font-bold transition-all shadow-[0_0_12px_rgba(245,158,11,0.3)] cursor-pointer flex items-center gap-1 whitespace-nowrap min-h-[40px] sm:min-h-[36px]"
                title="Activate test passkey PATRON-TEST-ACCESS"
              >
                <span>🧪 <span className="hidden xs:inline">TEST </span>PASSKEY</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUpgradeModalReason('Unlock 1-click downloads for all 4K wallpapers, DAW templates & stems.');
                  setIsUpgradeModalOpen(true);
                }}
                className="px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black text-[10.5px] sm:text-[11px] font-mono font-bold transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)] cursor-pointer flex items-center gap-1 whitespace-nowrap min-h-[40px] sm:min-h-[36px]"
              >
                <Sparkles className="w-3 h-3 text-black shrink-0" />
                <span>UPGRADE €5<span className="hidden xs:inline">/MO</span></span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Futuristic Multi-Hub Navigation Sub-Bar */}
      <nav className="relative z-20 w-full bg-[#04070e]/95 border-b border-white/10 px-3 sm:px-6 py-2 overflow-x-auto no-scrollbar scroll-smooth shrink-0 shadow-lg" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-3 min-w-max">
          {[
            { id: 'downloads', label: 'Asset & Download Vault', icon: FolderDown, count: '4' },
            { id: 'workflows', label: 'Workflows & Creative Lab', icon: Sliders, count: '3' },
            { id: 'visualizer', label: 'Early Access Visualizer Hub', icon: Film, count: '3' },
            { id: 'discussion', label: 'Creator Discussion Board (Free Chat)', icon: MessageSquare, count: discussionPosts.length.toString() },
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
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap min-h-[44px] ${
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
        {/* ======================================================== */}
        {/* SECTION 1: ASSET & DOWNLOAD VAULT (LARGE MEDIA BANNERS)  */}
        {/* ======================================================== */}
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
                    MODULE 01 · ASSETS &amp; DOWNLOADS
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                    1 FREE SAMPLE UNLOCKED · €5/MO FOR ALL
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide">
                  📦 Asset &amp; Download Vault
                </h1>
                <p className="text-xs sm:text-sm text-white/70 font-sans mt-1 max-w-2xl">
                  Download production-ready print master PDFs, uncompressed 24-bit audio stems, raw 4K visualizer wallpapers, and storyboards directly to your machine.
                </p>
              </div>

              {!isPatron && (
                <button
                  type="button"
                  onClick={() => {
                    setUpgradeModalReason('Unlock 1-click downloads across the entire Asset Vault.');
                    setIsUpgradeModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-black text-xs font-mono font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-[1.02] transition-all cursor-pointer whitespace-nowrap flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>UNLOCK FULL VAULT — €5/MO</span>
                </button>
              )}
            </div>

            {/* Asset Grid: Large 16:9 Visual Preview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {assetVaultItems.map((asset, index) => {
                const isFreeSample = index === 0;
                const isLockedForUser = !isPatron && !isFreeSample;

                return (
                  <div
                    key={asset.id}
                    className="rounded-2xl bg-black/60 border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between shadow-[0_4px_30px_rgba(0,0,0,0.6)] group relative overflow-hidden"
                  >
                    <div>
                      {/* Large Hero Media Container (16:9 Cinematic Preview) */}
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/90 border-b border-white/10">
                        <img
                          src={asset.heroBannerUrl}
                          alt={asset.title}
                          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                            isLockedForUser ? 'blur-sm scale-105 opacity-60' : 'opacity-90'
                          }`}
                        />

                        {/* Top Badges Overlay */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                          <span className="text-[10px] font-mono font-bold text-cyan-300 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-cyan-500/30 uppercase">
                            {asset.category}
                          </span>
                          <span className="text-[10px] font-mono font-semibold text-white/90 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20">
                            {asset.fileSize}
                          </span>
                        </div>

                        {/* Audio Waveform preview bar over banner if audio asset */}
                        {asset.isAudio && (
                          <div className="absolute bottom-3 left-3 right-3 z-10 bg-black/80 backdrop-blur-md border border-cyan-500/30 p-2.5 rounded-xl flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleAudio(asset.id)}
                                className="w-8 h-8 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center transition-colors cursor-pointer shrink-0"
                              >
                                {playingAudioId === asset.id ? (
                                  <Pause className="w-4 h-4 fill-black" />
                                ) : (
                                  <Play className="w-4 h-4 fill-black ml-0.5" />
                                )}
                              </button>
                              <div className="min-w-0">
                                <div className="text-[11px] font-bold text-white truncate">Studio Master Stems</div>
                                <div className="text-[9.5px] font-mono text-cyan-300">96kHz / 24-BIT WAV</div>
                              </div>
                            </div>

                            {/* Waveform Telemetry Visualizer */}
                            <div className="flex items-center gap-1 h-6">
                              {[35, 65, 95, 45, 80, 100, 75, 40, 60, 85, 50, 90, 70].map((h, i) => (
                                <div
                                  key={i}
                                  className="w-1 rounded-full bg-cyan-400 transition-all duration-300"
                                  style={{
                                    height: playingAudioId === asset.id ? `${h}%` : '20%',
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Paywall Overlay for Locked Assets (Index > 0 for Free Users) */}
                        {isLockedForUser && (
                          <div className="absolute inset-0 z-20 backdrop-blur-md bg-black/60 flex flex-col items-center justify-center p-6 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                              <Lock className="w-6 h-6 text-cyan-400" />
                            </div>
                            <span className="text-xs font-mono font-bold tracking-wider text-cyan-300 uppercase mb-1">
                              PATRON EXCLUSIVE ASSET
                            </span>
                            <p className="text-xs text-white/70 max-w-xs mb-4 font-sans">
                              Unlock 1-click downloads for full 96kHz stem archives, DAW templates, and 4K wallpapers.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setUpgradeModalReason(`Unlock direct download for ${asset.title}.`);
                                setIsUpgradeModalOpen(true);
                              }}
                              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-black font-mono font-bold text-xs transition-all shadow-[0_0_15px_rgba(245,158,11,0.35)] cursor-pointer"
                            >
                              [ 🔒 UNLOCK FULL VAULT — €5/MONTH ]
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Content Section below large preview */}
                      <div className="p-5 sm:p-6 space-y-2">
                        <div className="flex items-center gap-2">
                          {isFreeSample && !isPatron && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-bold">
                              FREE SAMPLE PREVIEW
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-cyan-400 font-semibold">{asset.fileFormat}</span>
                        </div>

                        <h2 className="text-base sm:text-lg font-display font-bold text-white group-hover:text-cyan-200 transition-colors leading-snug">
                          {asset.title}
                        </h2>

                        <p className="text-xs text-white/65 leading-relaxed font-sans">
                          {asset.description}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="p-4 sm:p-6 pt-0 mt-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-white/5">
                      <span className="text-[10.5px] font-mono text-white/40 truncate text-center sm:text-left">
                        {asset.fileName}
                      </span>

                      {isLockedForUser ? (
                        <button
                          type="button"
                          onClick={() => {
                            setUpgradeModalReason(`Unlock direct download for ${asset.title}.`);
                            setIsUpgradeModalOpen(true);
                          }}
                          className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:text-white hover:bg-cyan-900 text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5 text-cyan-400" />
                          <span>UNLOCK (€5/MO)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDownloadAsset(asset, index)}
                          className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono font-bold text-xs transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)] hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Download className="w-3.5 h-3.5 text-black" />
                          <span>
                            {isPatron
                              ? 'DOWNLOAD ASSET'
                              : 'ACTIVATE TO DOWNLOAD (€5/MO)'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* SECTION 2: WORKFLOWS & CREATIVE LAB (LARGE MEDIA BANNERS)*/}
        {/* ======================================================== */}
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
                    MODULE 02 · PRODUCTION WORKFLOWS
                  </span>
                  <span className="text-[10px] font-mono text-purple-300 font-semibold">
                    1 FREE BREAKDOWN SAMPLE UNLOCKED
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
            <div className="space-y-8">
              {workflows.map((wf, index) => {
                const isFreeSample = index === 0;
                const isLockedForUser = !isPatron && !isFreeSample;

                return (
                  <div
                    key={wf.id}
                    className="rounded-2xl bg-black/60 border border-purple-500/30 shadow-[0_4px_35px_rgba(0,0,0,0.6)] overflow-hidden space-y-4"
                  >
                    {/* Full-Width 16:9 Cinematic Video Player Banner */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/95 border-b border-purple-500/20 group">
                      <img
                        src={wf.heroBannerUrl}
                        alt={wf.title}
                        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                          isLockedForUser ? 'blur-sm opacity-50 scale-105' : 'opacity-70'
                        }`}
                      />

                      {/* Sci-Fi HUD Overlay */}
                      <div className="absolute inset-0 p-3 sm:p-6 flex flex-col justify-between pointer-events-none">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-xs font-mono text-purple-300">
                          <span className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-purple-500/30">
                            {wf.toolstack}
                          </span>
                          <span className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20">
                            {wf.duration}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-xs font-mono text-cyan-300">
                          <span className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg">
                            ENGINE: {wf.metrics.engine} · RES: {wf.metrics.resolution}
                          </span>
                          <span className="text-[9.5px] sm:text-[10px] font-bold tracking-wider text-purple-400 hidden xs:inline">
                            SILLOW MILL CREATIVE LAB
                          </span>
                        </div>
                      </div>

                      {/* Paywall Overlay on subsequent workflows */}
                      {isLockedForUser ? (
                        <div className="absolute inset-0 z-20 backdrop-blur-md bg-black/65 flex flex-col items-center justify-center p-6 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-purple-950/80 border border-purple-400/40 flex items-center justify-center mb-3 shadow-[0_0_25px_rgba(168,85,247,0.3)]">
                            <Lock className="w-7 h-7 text-purple-400" />
                          </div>
                          <span className="text-xs font-mono font-bold tracking-wider text-purple-300 uppercase mb-1">
                            PATRON EXCLUSIVE WORKFLOW BREAKDOWN
                          </span>
                          <p className="text-xs text-white/70 max-w-sm mb-4 font-sans">
                            Gain full access to the complete DAW project deconstructions and 3D node trees.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setUpgradeModalReason(`Unlock full workflow breakdown for ${wf.title}.`);
                              setIsUpgradeModalOpen(true);
                            }}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-mono font-bold text-xs transition-all shadow-[0_0_15px_rgba(245,158,11,0.35)] cursor-pointer"
                          >
                            [ 🔒 UNLOCK FULL VAULT — €5/MONTH ]
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => soundManager.playTone(660, 0.08)}
                          className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-purple-500/80 hover:bg-purple-400 text-black flex items-center justify-center transition-transform hover:scale-110 shadow-[0_0_25px_rgba(168,85,247,0.5)] cursor-pointer z-10"
                        >
                          <Play className="w-7 h-7 fill-black ml-1" />
                        </button>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="p-5 sm:p-6 space-y-3">
                      <div className="flex items-center gap-2">
                        {isFreeSample && !isPatron && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-bold">
                            FREE SAMPLE BREAKDOWN
                          </span>
                        )}
                        <span className="text-xs font-mono text-purple-300">{wf.toolstack}</span>
                      </div>

                      <h2 className="text-base sm:text-xl font-display font-bold text-white">
                        {wf.title}
                      </h2>

                      <p className="text-xs sm:text-sm text-white/70 font-sans leading-relaxed">
                        {wf.description}
                      </p>

                      {/* Expandable Q&A Drawer Trigger */}
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

                      {/* Drawer Container */}
                      {openWorkflowDrawerId === wf.id && (
                        <div className="mt-3 p-4 rounded-xl bg-black/80 border border-purple-500/20 space-y-3">
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

                          {/* Comment Input Box (Free for everyone to ask!) */}
                          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-white/10">
                            <input
                              type="text"
                              value={workflowCommentInputs[wf.id] || ''}
                              onChange={(e) =>
                                setWorkflowCommentInputs({ ...workflowCommentInputs, [wf.id]: e.target.value })
                              }
                              placeholder={`Ask director/artist a question about ${wf.title}...`}
                              className="flex-1 min-h-[44px] bg-black/60 border border-white/15 focus:border-purple-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none font-sans"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddWorkflowComment(wf.id)}
                              className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-black font-mono font-bold text-xs transition-colors cursor-pointer flex items-center justify-center"
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* SECTION 3: EARLY ACCESS VISUALIZER HUB (THEATER SPELER) */}
        {/* ======================================================== */}
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
                    MODULE 03 · THEATER SPELER
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                    CINEMATIC 4K UHD PREVIEWS
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide">
                  🎬 Early Access Visualizer Hub
                </h1>
                <p className="text-xs sm:text-sm text-white/70 font-sans mt-1 max-w-2xl">
                  Dedicated master theater player previewing unreleased animated sequences, kinetic typographic tests, and world loops in 4K UHD.
                </p>
              </div>
            </div>

            {/* Theater Player Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Cinema Viewport (2 cols) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-black/95 border border-cyan-500/40 shadow-[0_0_50px_rgba(56,189,248,0.2)] flex items-center justify-center group">
                  <img
                    src={visualizerTracks[activeVisualizerTrack].previewImage}
                    alt="Theater Visual"
                    className={`absolute inset-0 w-full h-full object-cover ${
                      !isPatron && activeVisualizerTrack > 0 ? 'blur-md opacity-40' : 'opacity-85'
                    }`}
                  />

                  {/* Sci-Fi HUD Watermark & Telemetry */}
                  <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-between pointer-events-none">
                    <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
                      <span className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-cyan-500/30">
                        {visualizerTracks[activeVisualizerTrack].status}
                      </span>
                      <span className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20">
                        {visualizerTracks[activeVisualizerTrack].fps} · {visualizerTracks[activeVisualizerTrack].renderEngine}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-white/80">
                      <span className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg">
                        01:14 / {visualizerTracks[activeVisualizerTrack].duration}
                      </span>
                      <span className="text-[10px] text-cyan-400 font-bold tracking-wider">
                        SILLOW MILL CINEMATIC SYNDICATE
                      </span>
                    </div>
                  </div>

                  {/* Paywall overlay on tracks 2 & 3 for free users */}
                  {!isPatron && activeVisualizerTrack > 0 ? (
                    <div className="relative z-20 backdrop-blur-md bg-black/60 p-6 rounded-2xl border border-cyan-400/30 flex flex-col items-center justify-center text-center max-w-sm">
                      <Lock className="w-8 h-8 text-cyan-400 mb-2" />
                      <div className="text-sm font-display font-bold text-white mb-1">
                        PATRON 4K THEATER PREVIEW
                      </div>
                      <p className="text-xs text-white/70 mb-4 font-sans">
                        Full early access sequence render is reserved for Patrons. Track 01 is unlocked for free preview!
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setUpgradeModalReason('Unlock 4K theater player and full early-access animation sequences.');
                          setIsUpgradeModalOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-mono font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer"
                      >
                        [ UNLOCK THEATER — €5/MO ]
                      </button>
                    </div>
                  ) : (
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
                  )}
                </div>

                {/* Theater Controls Bar */}
                <div className="p-4 rounded-xl bg-black/60 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="min-w-0 w-full sm:w-auto">
                    <h3 className="text-sm font-display font-bold text-white truncate">
                      {visualizerTracks[activeVisualizerTrack].title}
                    </h3>
                    <p className="text-[11px] text-white/60 font-sans mt-0.5 truncate">
                      {visualizerTracks[activeVisualizerTrack].synopsis}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setIsTheaterMuted(!isTheaterMuted)}
                      className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                    >
                      {isTheaterMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sequence Playlist Selector (1 col) */}
              <div className="space-y-3">
                <div className="text-xs font-mono font-bold text-white/50 uppercase tracking-wider px-1">
                  SEQUENCES PLAYLIST
                </div>

                {visualizerTracks.map((trk, idx) => {
                  const isLocked = !isPatron && idx > 0;

                  return (
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
                      <div className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border border-white/10">
                        <img
                          src={trk.previewImage}
                          alt={trk.title}
                          className={`w-full h-full object-cover ${isLocked ? 'blur-[1px] opacity-60' : ''}`}
                        />
                        {isLocked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Lock className="w-3.5 h-3.5 text-cyan-400" />
                          </div>
                        )}
                      </div>

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
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* SECTION 4: CREATOR DISCUSSION BOARD (100% OPEN & FREE)  */}
        {/* ======================================================== */}
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
                    MODULE 04 · COMMUNITY CHAT
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                    100% OPEN &amp; FREE FOR ALL VISITORS
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide">
                  💬 Creator Discussion Board
                </h1>
                <p className="text-xs sm:text-sm text-white/70 font-sans mt-1 max-w-2xl">
                  Community feed open to everyone. Read creator updates, share production feedback, attach artwork images, and discuss upcoming lore drops.
                </p>
              </div>
            </div>

            {/* Create Post Box */}
            <form
              onSubmit={handleCreateDiscussionPost}
              className="p-5 rounded-2xl bg-black/60 border border-white/10 focus-within:border-cyan-400/50 space-y-3 transition-colors shadow-[0_4px_25px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-full bg-gradient-to-tr ${
                    isPatron ? 'from-cyan-400 to-indigo-600' : 'from-slate-400 to-slate-600'
                  } flex items-center justify-center font-bold text-xs text-black shrink-0`}
                >
                  PM
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{patronName}</div>
                  <div className="text-[9.5px] font-mono text-cyan-300">
                    {isPatron ? 'PATRON MEMBER' : 'COMMUNITY MEMBER (FREE)'}
                  </div>
                </div>
              </div>

              <textarea
                value={discussionInput}
                onChange={(e) => setDiscussionInput(e.target.value)}
                placeholder="Share your thoughts, ask about production techniques, or post artwork..."
                rows={3}
                className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none resize-none font-sans"
              />

              {discussionImage && (
                <div className="flex items-center gap-2 bg-white/5 p-2 rounded-xl w-fit border border-cyan-500/30">
                  <img src={discussionImage} alt="Upload" className="w-16 h-16 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setDiscussionImage(null)}
                    className="p-1 text-white/50 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
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
                  className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-white/70 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  <span>Attach Image</span>
                </button>

                <button
                  type="submit"
                  disabled={!discussionInput.trim() && !discussionImage}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-30 text-black font-mono font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>POST TRANSMISSION</span>
                </button>
              </div>
            </form>

            {/* Posts Feed */}
            <div className="space-y-6">
              {discussionPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-5 sm:p-6 rounded-2xl bg-black/60 border border-white/10 space-y-4 shadow-[0_4px_25px_rgba(0,0,0,0.5)]"
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
                                : post.role === 'PATRON MEMBER'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                                : 'bg-slate-500/20 text-slate-300 border border-slate-400/40'
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

                  {/* Large High-Res Image Post Attachment */}
                  {post.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-white/10 max-h-96 bg-black/80 flex items-center justify-center">
                      <img src={post.imageUrl} alt="Attached" className="max-h-96 w-full object-cover" />
                    </div>
                  )}

                  {/* Like & Reply Bar */}
                  <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleDiscussionLike(post.id)}
                      className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
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
                      className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-white/60 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{post.replies.length} Replies</span>
                    </button>
                  </div>

                  {/* Inline replies */}
                  {post.replies.length > 0 && (
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      {post.replies.map((rep) => (
                        <div key={rep.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
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

        {/* ======================================================== */}
        {/* SECTION 5: LORE & GOVERNANCE PORTAL                      */}
        {/* ======================================================== */}
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
                    MODULE 05 · LORE GOVERNANCE
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                    1 FREE BALLOT SAMPLE UNLOCKED
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide">
                  🗳️ Lore &amp; Governance Portal
                </h1>
                <p className="text-xs sm:text-sm text-white/70 font-sans mt-1 max-w-2xl">
                  Cast binding votes on storyline territory branches, pilot armor variants, and batch merchandise priorities.
                </p>
              </div>
            </div>

            {/* Polls Container */}
            <div className="space-y-6">
              {governanceBallots.map((ballot, index) => {
                const isFirstBallot = index === 0;
                const isLocked = !isPatron && !isFirstBallot;

                return (
                  <div
                    key={ballot.id}
                    className="p-5 sm:p-6 rounded-2xl bg-black/60 border border-emerald-500/30 shadow-[0_4px_25px_rgba(0,0,0,0.5)] space-y-4 relative overflow-hidden"
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

                    {/* Paywall Overlay on Ballot #02 */}
                    {isLocked ? (
                      <div className="p-6 rounded-xl backdrop-blur-md bg-black/70 border border-emerald-500/30 text-center flex flex-col items-center justify-center">
                        <Lock className="w-8 h-8 text-emerald-400 mb-2" />
                        <div className="text-sm font-display font-bold text-white mb-1">
                          COUNCIL BALLOT #02 RESERVED FOR PATRONS
                        </div>
                        <p className="text-xs text-white/70 mb-4 max-w-sm">
                          Activate membership for €5/month to cast your binding vote on physical merchandise drops and lore directives.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setUpgradeModalReason('Unlock Council Ballot voting rights & physical merch whitelist.');
                            setIsUpgradeModalOpen(true);
                          }}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-mono font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer"
                        >
                          [ 🔒 UNLOCK FULL VAULT — €5/MONTH ]
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2">
                        {ballot.options.map((opt) => {
                          const pct = ballot.totalVotes > 0 ? Math.round((opt.votes / ballot.totalVotes) * 100) : 0;
                          const isVoted = ballot.userVoteId === opt.id;

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleVoteBallot(ballot.id, opt.id, isFirstBallot)}
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
                    )}

                    {ballot.userVoteId && (
                      <div className="pt-2 flex items-center gap-1.5 text-[11px] font-mono text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ballot recorded against your identity.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </main>

      {/* ======================================================== */}
      {/* FREEMIUM PAYWALL UPGRADE MODAL (€5/MONTH & TEST PASSKEY) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isUpgradeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#060a12] border border-cyan-500/40 rounded-2xl p-5 sm:p-8 shadow-[0_0_60px_rgba(56,189,248,0.25)] space-y-5 my-auto"
            >
              <div className="absolute top-0 right-0 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 font-bold uppercase tracking-wider">
                    CREATIVE VAULT PASS
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 font-bold">
                    €5 / MONTH
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-display font-extrabold text-white">
                  Unlock Full Creative Vault
                </h3>
                <p className="text-xs text-white/70 font-sans mt-1">
                  {upgradeModalReason}
                </p>
              </div>

              {/* Value Feature Bullets */}
              <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2 text-xs font-sans text-white/80">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Unrestricted 1-Click Downloads for All 4K Wallpapers &amp; Art</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Full Ableton Live &amp; Modular Synth DAW Project Templates (.ALS)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>16-Track 24-Bit / 96kHz Audio Stem Archives (.ZIP) for Remixes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Unreleased Video Visualizers &amp; 3D Production Shaders</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Binding Lore Governance Votes &amp; Wave 2 Merch Priority Whitelist</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  disabled={isSubscribing}
                  onClick={handleStripeUpgrade}
                  className="w-full min-h-[48px] py-3.5 px-4 rounded-xl font-mono text-sm font-bold text-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4 text-black" />
                  <span>{isSubscribing ? 'INITIALIZING STRIPE...' : 'ACTIVATE MEMBERSHIP FOR €5/MONTH'}</span>
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleActivateTestAccess}
                    className="text-xs font-mono text-amber-300 hover:text-white underline cursor-pointer"
                  >
                    🧪 Or preview full vault instantly with PATRON-TEST-ACCESS
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

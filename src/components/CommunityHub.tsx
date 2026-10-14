import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  Film,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
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
  ArrowRight,
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
  Hash,
  Users,
  Trophy,
  Heart,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';
import bingaaComicCover from '../assets/images/bingaa_comic_cover.jpg';
import akinoyaVistaImg from '../assets/images/akinoya_twilight_world_1790852640934.jpg';
import visualizerThumbnailImg from '../assets/images/visualizer_thumbnail.png';
import moodboardImg from '../assets/images/Mood.png';
import { BINGAA_PDF_URL, BINGAA_PDF_FILENAME, BINGAA_COVER_URL, BINGAA_COVER_FILENAME } from '../utils/certificate';
import { useAuth } from '../context/AuthContext';
import { AuthHeaderButton } from './AuthHeaderButton';
import { CreatorLeaderboard } from './CreatorLeaderboard';
import { CreatorPortfolioView } from './CreatorPortfolioView';
import { LoreGovernancePortal } from './LoreGovernancePortal';
import { AkinoyaLabsHub } from './AkinoyaLabsHub';
import { DriveFolderVault } from './DriveFolderVault';
import { WelcomeVisionPortal } from './WelcomeVisionPortal';
import { getStoredCreators } from '../data/creators';

export const MEMBERSHIP_LAUNCH_DATE = new Date('2027-01-09T00:00:00Z');
export const isMembershipLaunchLocked = new Date() < MEMBERSHIP_LAUNCH_DATE;

export type CreativeHubSection = 'welcome' | 'workflows' | 'downloads' | 'discussion' | 'creators' | 'governance';

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
  stepNumber: string;
  tag: string;
  title: string;
  subtitle: string;
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
  role: 'CREATOR' | 'ANNUAL PASS MEMBER' | 'ANNUAL PASS' | 'PATRON' | 'PATRON MEMBER' | 'VIP GUEST' | 'COMMUNITY MEMBER' | 'FREE';
  timestamp: string;
  text: string;
}

export type ChannelCategory =
  | 'PUBLIC HUB'
  | 'CREATOR LAB & SHOWCASE'
  | 'COLLABORATION BOARD'
  | 'PRO AUDIO LOUNGE'
  | 'FOUNDERS & VIP';

export interface ChatChannel {
  id: string;
  name: string;
  category: ChannelCategory;
  description: string;
  isAnnualPass?: boolean;
  requiresArtist?: boolean;
  requiresVip?: boolean;
  isOpenCollab?: boolean;
}

interface DiscussionPost {
  id: string;
  channelId: string;
  author: string;
  role: 'CREATOR' | 'ANNUAL PASS MEMBER' | 'ANNUAL PASS' | 'PATRON' | 'PATRON MEMBER' | 'VIP GUEST' | 'COMMUNITY MEMBER' | 'FREE';
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
  role: 'CREATOR' | 'ANNUAL PASS MEMBER' | 'ANNUAL PASS' | 'PATRON' | 'PATRON MEMBER' | 'VIP GUEST' | 'COMMUNITY MEMBER' | 'FREE';
  avatarBg: string;
  timestamp: string;
  content: string;
}

interface CommunityHubProps {
  onBackToHome: () => void;
  onOpenAuthModal?: () => void;
  onOpenCreator?: (username: string) => void;
}

export const CommunityHub: React.FC<CommunityHubProps> = ({
  onBackToHome,
  onOpenAuthModal,
  onOpenCreator,
}) => {
  // Authentication & RBAC User State
  const {
    user,
    profile,
    role,
    isAuthenticated,
    isVip,
    isSubscriber,
    isArtist,
    hasVipPass,
    hasPendingVipInvitation,
    vipLinkError,
    clearVipLinkError,
    openAuthModal,
    updateProfile,
  } = useAuth();

  const [patronName, setPatronName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const emailParam = urlParams.get('email');
      if (emailParam) {
        const derived = emailParam.split('@')[0];
        sessionStorage.setItem('akinoya_patron_name', derived);
        return derived;
      }
      return sessionStorage.getItem('akinoya_patron_name') || 'Patron Member #042';
    }
    return 'Patron Member #042';
  });

  const userDisplayName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`
    : profile?.full_name || (user?.email ? user.email.split('@')[0] : patronName);

  const isVipOrAbove =
    isVip ||
    Boolean(profile?.has_vip_pass) ||
    role === 'VIP_GUEST' ||
    role === 'ANNUAL_PASS' ||
    role === 'CREATOR' ||
    Boolean(profile?.vip_code_redeemed) ||
    Boolean(profile?.is_vip) ||
    (typeof window !== 'undefined' &&
      (Boolean(localStorage.getItem('akinoya_patron_token')) ||
       Boolean(sessionStorage.getItem('akinoya_patron_token')) ||
       localStorage.getItem('akinoya_patron_role') === 'CREATOR' ||
       localStorage.getItem('akinoya_patron_role') === 'VIP_GUEST' ||
       localStorage.getItem('akinoya_patron_role') === 'ANNUAL_PASS'));

  const isAnnualOrCreator =
    isSubscriber ||
    role === 'ANNUAL_PASS' ||
    role === 'SUBSCRIBER' ||
    role === 'CREATOR' ||
    Boolean(profile?.is_annual_member) ||
    Boolean(profile?.is_subscriber) ||
    profile?.subscription_status === 'active';

  const isPatron = isVipOrAbove;

  // Active Hub Section (00 · Welcome & Vision Portal as primary landing page)
  const [activeSection, setActiveSection] = useState<CreativeHubSection>('welcome');
  const [activeStageId, setActiveStageId] = useState<number>(1);

  // Workflow Pipeline Stages for Left Sidebar Sub-Menu
  const WORKFLOW_STAGES = [
    { id: 1, num: '01', title: 'Storyboards & Framing' },
    { id: 2, num: '02', title: 'Character & World Specs' },
    { id: 3, num: '03', title: 'Blender 4.2 & Octane 3D' },
    { id: 4, num: '04', title: 'Prompts & Diffusion Matrix' },
    { id: 5, num: '05', title: 'DaVinci Grading & Ableton' },
  ];

  const handleSwitchSection = (section: CreativeHubSection) => {
    setActiveSection(section);
    soundManager.playTone(580, 0.05);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Instant top-scroll on tab switch or section reset
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeSection]);

  // Scroll-spy observer for Stage 01–05 when in Labs & Workflows
  useEffect(() => {
    if (typeof window === 'undefined' || activeSection !== 'workflows') return;

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
  }, [activeSection]);

  const handleJumpToStage = (stageNum: number) => {
    setActiveStageId(stageNum);
    soundManager.playTone(580, 0.05);
    const target = document.getElementById(`stage-${stageNum}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getDynamicHeaderTitle = () => {
    switch (activeSection) {
      case 'welcome':
        return 'ÄKINOYA COMMUNITY HUB · WELCOME & VISION';
      case 'workflows':
        return 'ÄKINOYA COMMUNITY HUB · LABS & WORKFLOWS';
      case 'downloads':
        return 'ÄKINOYA COMMUNITY HUB · DRIVE ASSET VAULT';
      case 'discussion':
        return 'ÄKINOYA COMMUNITY HUB · COMM-NET CHAT';
      case 'creators':
        return 'ÄKINOYA COMMUNITY HUB · FAVORITE PLANETS & LEADERBOARD';
      case 'governance':
        return 'ÄKINOYA COMMUNITY HUB · LORE & GOVERNANCE PORTAL';
      default:
        return 'ÄKINOYA COMMUNITY HUB';
    }
  };

  // Paywall Upgrade Modal state
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalReason, setUpgradeModalReason] = useState<string>(
    'Exclusive Annual Membership Pass (€60/year, equivalent to just €5/month). Unlocks full 3D visualizer breakdowns, unreleased audio masters, lore governance & 4K assets on January 9, 2027.'
  );
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Download Toast
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  // Audio Preview state in Asset Vault
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Workflows Comments Drawer state
  const [openWorkflowDrawerId, setOpenWorkflowDrawerId] = useState<string | null>(null);
  const [workflowCommentInputs, setWorkflowCommentInputs] = useState<Record<string, string>>({});

  // Multi-Channel Discord Comm-Net State
  const [activeChannelId, setActiveChannelId] = useState<string>('general-chat');
  const [isMobileChannelsOpen, setIsMobileChannelsOpen] = useState<boolean>(false);
  const [discussionInput, setDiscussionInput] = useState('');
  const [discussionImage, setDiscussionImage] = useState<string | null>(null);
  const discussionFileInputRef = useRef<HTMLInputElement>(null);
  const [activeReplyPost, setActiveReplyPost] = useState<DiscussionPost | null>(null);
  const [replyInputText, setReplyInputText] = useState('');

  // Creator Portfolios & Artist Verification State
  const [selectedCreatorUsername, setSelectedCreatorUsername] = useState<string>('odi');
  const [isArtistModalOpen, setIsArtistModalOpen] = useState<boolean>(false);
  const [artistAlias, setArtistAlias] = useState<string>('');
  const [artistGenre, setArtistGenre] = useState<string>('Electronic / Ambient Sound Design');
  const [artistLink, setArtistLink] = useState<string>('');
  const [artistSubmitting, setArtistSubmitting] = useState<boolean>(false);
  const [artistSuccess, setArtistSuccess] = useState<boolean>(false);

  // 1. ASSET & DOWNLOAD VAULT DATA
  const assetVaultItems: AssetVaultItem[] = [
    {
      id: 'asset-pdf',
      title: 'Bingäa Issue #01 — Read-Only Lore Preview & Teaser',
      category: 'LORE PREVIEW / TEASER',
      fileFormat: 'PDF LORE PREVIEW',
      fileSize: '114.8 MB · 300 DPI CMYK',
      description:
        'Read-only digital lore preview and narrative teaser sequence. Note: The full official 32-page print edition of "Bingäa" is sold separately as a physical collector\'s item (€14,99) and is not included as a free digital download.',
      downloadUrl: BINGAA_PDF_URL,
      fileName: BINGAA_PDF_FILENAME,
      heroBannerUrl: moodboardImg,
    },
    {
      id: 'asset-audio-master',
      title: 'Sub-Orbital Drift — Studio Audio Master & DAW Template',
      category: 'UNRELEASED MUSIC & DAW TEMPLATE',
      fileFormat: 'AUDIO MASTER + ABLETON .ALS',
      fileSize: '348.2 MB · 24-BIT / 96kHz WAV',
      description:
        'Full DAW session template with unreleased studio audio masters and project files for production study.',
      downloadUrl: '/assets/SubOrbitalDrift_AudioMaster.zip',
      fileName: 'SubOrbitalDrift_AudioMaster_96kHz.zip',
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

  // 2. WORKFLOWS & CREATIVE LAB DATA (4-STEP PRODUCTION ROADMAP)
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([
    {
      id: 'wf-step-01',
      stepNumber: '01',
      tag: 'LORE & SCRIPT',
      title: 'Concept & Storyboarding',
      subtitle: 'Scene narrative, 2D drafts & shot lists',
      toolstack: 'Clip Studio Paint EX · Storyboard Pro · Adobe Photoshop',
      duration: '12:40 Breakdown',
      description:
        'Deconstructing the cinematic narrative arc from initial lore worldbuilding scripts to rough 2D thumbnail passes. We establish dynamic camera framing, pilot perspective geometry, and panel pacing that translate directly from the Bingäa graphic novel into animated shot sequences.',
      heroBannerUrl: moodboardImg,
      metrics: { fps: '24 FPS ANIMATIC', engine: 'STORYBOARD PRO', resolution: 'B4 MANUSCRIPT' },
      comments: [
        {
          id: 'wfc-1',
          author: 'Elena Vance',
          role: 'ANNUAL PASS MEMBER',
          timestamp: '2h ago',
          text: 'The panel pacing transitions between upper orbit and atmospheric entry build immense tension.',
        },
        {
          id: 'wfc-2',
          author: 'Odi',
          role: 'CREATOR',
          timestamp: '1h ago',
          text: 'Thanks Elena! We timed the cut duration to match the heartbeat frequency of the pilot before the ionization shockwave hits.',
        },
      ],
    },
    {
      id: 'wf-step-02',
      stepNumber: '02',
      tag: 'BLENDER / OCTANE',
      title: '3D Scene Architecture & Shaders',
      subtitle: 'Environment, lighting rigs & node setup',
      toolstack: 'Blender 4.2 · Octane Render Spectral · Quixel Megascans',
      duration: '18:15 Breakdown',
      description:
        'Building the procedural terrain and obsidian spires of Upper Äkinoya. In-depth walkthrough of volumetric absorption shaders, atmospheric fog density nodes, custom spectral emission curves, and 3-point cinematic lighting rigs optimized for 4K rendering.',
      heroBannerUrl: akinoyaVistaImg,
      metrics: { fps: '60.00 FPS', engine: 'OCTANE SPECTRAL', resolution: '4K DCI (3840x2160)' },
      comments: [
        {
          id: 'wfc-3',
          author: 'Cygnus-9',
          role: 'PATRON MEMBER',
          timestamp: '3h ago',
          text: 'The dual-absorption shader approach for the horizon rim solves the black edge artifacting so cleanly!',
        },
        {
          id: 'wfc-4',
          author: 'Odi',
          role: 'CREATOR',
          timestamp: '2h ago',
          text: 'Exactly—it separates the purple stratosphere from the deep space blackbody curve without harsh clipping.',
        },
      ],
    },
    {
      id: 'wf-step-03',
      stepNumber: '03',
      tag: 'AI PIPELINE',
      title: 'AI Visual Enhancements & Prompting',
      subtitle: 'Style consistency, prompt frameworks & frame passes',
      toolstack: 'ComfyUI · Stable Diffusion XL · Custom Sci-Fi LoRA',
      duration: '15:50 Breakdown',
      description:
        'Advanced AI animation augmentation pipeline: utilizing ControlNet depth maps, custom LoRA prompt matrices, and multi-pass frame upscaling to maintain precise character styling, metallic surface textures, and neon lighting consistency without temporal flickering.',
      heroBannerUrl: visualizerThumbnailImg,
      metrics: { fps: 'MULTI-PASS LORA', engine: 'COMFYUI PIPELINE', resolution: '4K UHD MASTER' },
      comments: [
        {
          id: 'wfc-5',
          author: 'Kaelen Thorne',
          role: 'ANNUAL PASS MEMBER',
          timestamp: '4h ago',
          text: 'Could you share the ControlNet depth weight curve used across the high-speed camera tracking shots?',
        },
        {
          id: 'wfc-6',
          author: 'Odi',
          role: 'CREATOR',
          timestamp: '1h ago',
          text: 'We keep depth weight at 0.85 for the first 35% of denoising steps, then taper to 0.4 to let the LoRA style textures take over.',
        },
      ],
    },
    {
      id: 'wf-step-04',
      stepNumber: '04',
      tag: 'AUDIO & EDITING',
      title: 'Music Sync & DaVinci Post-Processing',
      subtitle: 'Audio-reactive animation sync & 4K master export',
      toolstack: 'DaVinci Resolve Studio · Ableton Live 12 · ACEScc',
      duration: '20:05 Breakdown',
      description:
        'Aligning visual cuts to analog synthesizer transients, sub-bass 808 drops, and atmospheric risers. Final ACEScc color science grading, anamorphic halation, organic 35mm film grain overlays, and master delivery in uncompressed 4K 60FPS ProRes 4444 XQ with 24-bit 96kHz LPCM audio.',
      heroBannerUrl: bingaaComicCover,
      metrics: { fps: '60 FPS', engine: 'ACEScc COLOR SCIENCE', resolution: '4K PRORES 4444 XQ' },
      comments: [
        {
          id: 'wfc-7',
          author: 'Elena Vance',
          role: 'ANNUAL PASS MEMBER',
          timestamp: '5h ago',
          text: 'The bass transient alignment with the camera shake at 03:14 hits so hard on monitors.',
        },
      ],
    },
  ]);

  // 3. DISCORD-STYLE MULTI-CHANNEL COMM-NET CHANNELS
  const CHAT_CHANNELS: ChatChannel[] = [
    // PUBLIC HUB
    {
      id: 'general-chat',
      name: 'general-chat',
      category: 'PUBLIC HUB',
      description: 'Free Public Discussion, Introductions & Community Central',
    },
    {
      id: 'lore-theory-crafting',
      name: 'lore-theory-crafting',
      category: 'PUBLIC HUB',
      description: 'Äkinoya Worldbuilding, Canon Lore, Timeline & Theorycrafting',
    },

    // CREATOR LAB & SHOWCASE
    {
      id: 'visualizers-3d',
      name: 'visualizers-3d',
      category: 'CREATOR LAB & SHOWCASE',
      description: 'Blender & Octane 3D Scene Architecture, Volumetric Shaders & Lighting',
      isAnnualPass: true,
    },
    {
      id: 'asset-showcase',
      name: 'asset-showcase',
      category: 'CREATOR LAB & SHOWCASE',
      description: 'Community Artwork, 4K Wallpapers & Work-In-Progress Production Renders',
      isAnnualPass: true,
    },

    // COLLABORATION BOARD (Open to all members)
    {
      id: 'music-x-visuals',
      name: 'music-x-visuals',
      category: 'COLLABORATION BOARD',
      description: 'Cross-Discipline Matchmaking: Producers seeking 3D Animators & Visualists',
      isOpenCollab: true,
    },
    {
      id: 'collab-requests',
      name: 'collab-requests',
      category: 'COLLABORATION BOARD',
      description: 'Pitch Co-op Tracks, Remix Stems, 3D Asset Swaps & Syndicate Collabs',
      isOpenCollab: true,
    },

    // PRO AUDIO LOUNGE 🔒
    {
      id: 'plugins-deals-vault',
      name: 'plugins-deals-vault',
      category: 'PRO AUDIO LOUNGE',
      description: 'Curated VST/AU Plugin Deals, Mixing Chains, Presets & Sample Vaults',
      requiresArtist: true,
    },

    // FOUNDERS & VIP 🔒
    {
      id: 'founders-vip-lounge',
      name: 'founders-vip-lounge',
      category: 'FOUNDERS & VIP',
      description: 'Founding NFC Pass Holders (#001–#100) Private Syndicate Chamber & Direct Creative Access',
      requiresVip: true,
    },
  ];

  // 4b. MULTI-CHANNEL DISCUSSION POSTS FEED
  const [discussionPosts, setDiscussionPosts] = useState<DiscussionPost[]>([
    // # general-chat
    {
      id: 'dp-1',
      channelId: 'general-chat',
      author: 'Odi',
      role: 'CREATOR',
      avatarBg: 'from-amber-400 to-amber-600',
      timestamp: 'Today at 14:15',
      content:
        'Welcome to the official Sillow Mill Comm-Net & Creator Hub! This Discord-style environment consolidates all production downloads, workflow roadmaps, visualizer test reels, and community channels into one command center.\n\nFree community members have open access to our public channels and full read-only previews of all production vaults!',
      likes: 38,
      hasLiked: false,
      replies: [
        {
          id: 'dpr-1',
          author: 'Elena Vance',
          role: 'ANNUAL PASS MEMBER',
          avatarBg: 'from-cyan-400 to-blue-600',
          timestamp: 'Today at 14:32',
          content: 'The new step-by-step 3D timeline looks incredible. Excited for the January 9, 2027 full launch!',
        },
      ],
    },
    {
      id: 'dp-2',
      channelId: 'general-chat',
      author: 'Cygnus-9',
      role: 'PATRON',
      avatarBg: 'from-purple-400 to-indigo-600',
      timestamp: 'Today at 15:04',
      content:
        'Just reviewed the volumetric cloud breakdown in the Creative Lab. The dual-absorption shader approach at Step 02 is super insightful. Looking forward to casting my ballot for Chapter 2!',
      likes: 21,
      hasLiked: false,
      replies: [],
    },
    // # lore-theory-crafting
    {
      id: 'dp-3',
      channelId: 'lore-theory-crafting',
      author: 'Odi',
      role: 'CREATOR',
      avatarBg: 'from-amber-400 to-amber-600',
      timestamp: 'Yesterday at 18:20',
      content:
        'Lore Dispatch #01: Planet Äkinoya orbits a binary white dwarf star system. The intense ionization in the upper mesosphere creates the signature twilight purple-cyan sky gradient observed from Sector 02.',
      imageUrl: akinoyaVistaImg,
      likes: 45,
      hasLiked: false,
      replies: [
        {
          id: 'dpr-2',
          author: 'Vesper-01',
          role: 'COMMUNITY MEMBER',
          avatarBg: 'from-slate-400 to-slate-600',
          timestamp: 'Yesterday at 19:05',
          content: 'Does this ionization also explain why the obsidian spires resonate at 432Hz?',
        },
        {
          id: 'dpr-3',
          author: 'Odi',
          role: 'CREATOR',
          avatarBg: 'from-amber-400 to-amber-600',
          timestamp: 'Yesterday at 19:30',
          content: 'Yes! The resonance acts as a harmonic stabilizer for the pilot guidance relays.',
        },
      ],
    },
    {
      id: 'dp-4',
      channelId: 'lore-theory-crafting',
      author: 'Kaelen Thorne',
      role: 'ANNUAL PASS MEMBER',
      avatarBg: 'from-cyan-400 to-blue-600',
      timestamp: 'Today at 11:42',
      content:
        'Notice how page 14 of the Bingäa comic preview references the "Obsidian Resonance Core". Looking at the Council Ballot, Sector 04 might reveal the origins of the first pilot expedition.',
      likes: 16,
      hasLiked: false,
      replies: [],
    },
    // # visualizers-3d
    {
      id: 'dp-5',
      channelId: 'visualizers-3d',
      author: 'Odi',
      role: 'CREATOR',
      avatarBg: 'from-amber-400 to-amber-600',
      timestamp: '2 days ago',
      content:
        'Blender 4.2 & Octane Spectral setup tip: We clamped volumetric scatter density at 0.04 and dialed anisotropic phase to 0.72. This keeps the starry backdrop visible behind the heavy cloud rim without introducing firefly noise.',
      imageUrl: visualizerThumbnailImg,
      likes: 54,
      hasLiked: false,
      replies: [
        {
          id: 'dpr-4',
          author: 'Elena Vance',
          role: 'ANNUAL PASS MEMBER',
          avatarBg: 'from-cyan-400 to-blue-600',
          timestamp: '2 days ago',
          content: 'Tested this in my local scene—dramatically reduces noise without blowing out render times.',
        },
      ],
    },
    // # asset-showcase
    {
      id: 'dp-7',
      channelId: 'asset-showcase',
      author: 'Odi',
      role: 'CREATOR',
      avatarBg: 'from-amber-400 to-amber-600',
      timestamp: '4 days ago',
      content:
        'Dropping the raw 4K wallpaper render of the Ionized Stratosphere. Optimized for ultra-wide monitors and OLED displays with zero compression.',
      imageUrl: akinoyaVistaImg,
      likes: 62,
      hasLiked: false,
      replies: [],
    },
    {
      id: 'dp-8',
      channelId: 'asset-showcase',
      author: 'NeoArtist',
      role: 'ANNUAL PASS MEMBER',
      avatarBg: 'from-cyan-400 to-blue-600',
      timestamp: '3 days ago',
      content:
        'Sharing my WIP 3D study of the pilot flight helmet visor reflections modeled in Blender and textured in Substance Painter!',
      imageUrl: moodboardImg,
      likes: 29,
      hasLiked: false,
      replies: [],
    },
    // # music-x-visuals (Collaboration Board)
    {
      id: 'dp-9',
      channelId: 'music-x-visuals',
      author: 'Elena Vance',
      role: 'ANNUAL PASS MEMBER',
      avatarBg: 'from-teal-400 to-emerald-600',
      timestamp: 'Today at 09:15',
      content:
        'Seeking an Unreal Engine 5 or Blender 3D artist to co-create an audio-reactive visualizer for my next atmospheric track "Ion Shroud". Master audio is completed at 128 BPM with separate stem groups (Bass, Synths, Foley) ready for dispatch.',
      likes: 28,
      hasLiked: false,
      replies: [
        {
          id: 'dpr-6',
          author: 'Kaelen Voss',
          role: 'VIP GUEST',
          avatarBg: 'from-purple-400 to-indigo-600',
          timestamp: 'Today at 10:04',
          content: 'Hey Elena! I have an obsidian canyon procedural geometry ready with volumetric fog that would sync great with your sub-bass pulses. Let\'s collaborate!',
        },
      ],
    },
    // # collab-requests (Collaboration Board)
    {
      id: 'dp-10',
      channelId: 'collab-requests',
      author: 'Odi',
      role: 'CREATOR',
      avatarBg: 'from-amber-400 to-amber-600',
      timestamp: 'Yesterday at 16:30',
      content:
        'Open Syndicate Call: Äkinoya Chapter 1 Community Remix Stems are now available! Producers & sound designers: download the stems in Asset Vault, craft your remix, and submit links here. Top 3 selected remixes will be integrated into the official visualizer stream.',
      imageUrl: visualizerThumbnailImg,
      likes: 51,
      hasLiked: false,
      replies: [
        {
          id: 'dpr-7',
          author: 'Sora Takahashi',
          role: 'COMMUNITY MEMBER',
          avatarBg: 'from-rose-400 to-orange-600',
          timestamp: 'Yesterday at 17:10',
          content: 'Stems downloaded! Are 24-bit 48kHz WAV submissions preferred for the final mixdown?',
        },
      ],
    },
    // # plugins-deals-vault (Pro Audio Lounge)
    {
      id: 'dp-11',
      channelId: 'plugins-deals-vault',
      author: 'Odi',
      role: 'CREATOR',
      avatarBg: 'from-amber-400 to-amber-600',
      timestamp: 'Today at 08:00',
      content:
        '💎 [ARTIST DEAL VAULT] Syndicate Partner VST/AU deal is live! Use code AKN-SYNTH-2027 for 40% off FabFilter bundles & UAD native plugins. Also dropped 5 custom analog saturator racks for Ableton 12 and Bitwig in the sound design drive.',
      likes: 47,
      hasLiked: false,
      replies: [
        {
          id: 'dpr-8',
          author: 'Elena Vance',
          role: 'ANNUAL PASS MEMBER',
          avatarBg: 'from-teal-400 to-emerald-600',
          timestamp: 'Today at 08:45',
          content: 'The custom saturator rack on the master buss adds incredible analog warmth without muddying the transients. Essential toolkit!',
        },
      ],
    },
    // # founders-vip-lounge (Founders & VIP)
    {
      id: 'dp-12',
      channelId: 'founders-vip-lounge',
      author: 'Odi',
      role: 'CREATOR',
      avatarBg: 'from-amber-400 to-amber-600',
      timestamp: 'Yesterday at 12:00',
      content:
        '👑 Welcome Founders! As NFC VIP Pass holders, you hold permanent lifetime voting rights and uncompressed master access. Next week we are streaming the private test cut for the Issue #1 animated teaser exclusively in this chamber.',
      imageUrl: akinoyaVistaImg,
      likes: 64,
      hasLiked: false,
      replies: [
        {
          id: 'dpr-9',
          author: 'Pass Holder #007',
          role: 'VIP GUEST',
          avatarBg: 'from-yellow-400 to-amber-600',
          timestamp: 'Yesterday at 13:20',
          content: 'The NFC authentication on my physical card was super smooth. Truly honored to hold Pass #007. Looking forward to reviewing the test cut!',
        },
      ],
    },
  ]);

  // Test Access Activator (Disabled in preview-only mode)
  const handleActivateTestAccess = () => {
    soundManager.playTone(330, 0.08);
  };

  const handleToggleGuestMode = () => {
    soundManager.playTone(330, 0.08);
  };

  // Stripe Checkout Handler for Annual Pass (€60/Year)
  const handleStripeUpgrade = async () => {
    if (isMembershipLaunchLocked) {
      soundManager.playTone(330, 0.08);
      alert('Community membership pass public checkout launches on 09/01/2027.');
      return;
    }
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

  // Trigger Asset Download (Gated by Annual Pass / Creator status)
  const handleDownloadAsset = (asset: AssetVaultItem, _index: number) => {
    if (!isAnnualOrCreator) {
      soundManager.playTone(330, 0.08);
      setUpgradeModalReason(
        'Asset Vault locked: Requires Äkinoya Annual Pass (€60/yr · launches 09/01/2027)'
      );
      setIsUpgradeModalOpen(true);
      return;
    }

    soundManager.playUnlockChime();
    setDownloadToast(`Preparing download: ${asset.fileName}`);
    setTimeout(() => setDownloadToast(null), 4000);
    const a = document.createElement('a');
    a.href = asset.downloadUrl;
    a.download = asset.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
    if (!isAuthenticated) {
      soundManager.playTone(330, 0.08);
      openAuthModal('signin');
      return;
    }
    const text = workflowCommentInputs[workflowId]?.trim();
    if (!text) return;

    soundManager.playTone(740, 0.06);
    const commentRole: WorkflowComment['role'] =
      role === 'CREATOR'
        ? 'CREATOR'
        : role === 'ANNUAL_PASS'
        ? 'ANNUAL PASS MEMBER'
        : role === 'VIP_GUEST'
        ? 'VIP GUEST'
        : 'COMMUNITY MEMBER';

    const newComment: WorkflowComment = {
      id: `wfc-${Date.now()}`,
      author: userDisplayName,
      role: commentRole,
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

  // Artist Verification Handlers
  const handleArtistVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      soundManager.playTone(330, 0.08);
      openAuthModal('signin');
      return;
    }
    setArtistSubmitting(true);
    try {
      await updateProfile({
        is_artist: true,
        bio: artistGenre ? `${artistGenre} · Verified Syndicate Artist` : undefined,
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('akinoya_is_artist', 'true');
      }
      soundManager.playUnlockChime();
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#a855f7', '#6366f1', '#38bdf8', '#fbbf24'],
      });
      setArtistSuccess(true);
      setTimeout(() => {
        setArtistSuccess(false);
        setIsArtistModalOpen(false);
        setActiveChannelId('plugins-deals-vault');
      }, 1200);
    } catch (err) {
      console.error('Artist verification error:', err);
    } finally {
      setArtistSubmitting(false);
    }
  };

  const handleInstantArtistVerify = async () => {
    if (!isAuthenticated) {
      soundManager.playTone(330, 0.08);
      openAuthModal('signin');
      return;
    }
    setArtistSubmitting(true);
    try {
      await updateProfile({ is_artist: true });
      if (typeof window !== 'undefined') {
        localStorage.setItem('akinoya_is_artist', 'true');
      }
      soundManager.playUnlockChime();
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.5 },
        colors: ['#a855f7', '#6366f1', '#38bdf8', '#fbbf24'],
      });
      setArtistSuccess(true);
      setTimeout(() => {
        setArtistSuccess(false);
        setIsArtistModalOpen(false);
        setActiveChannelId('plugins-deals-vault');
      }, 1000);
    } catch (err) {
      console.error('Instant verification error:', err);
    } finally {
      setArtistSubmitting(false);
    }
  };

  // Handle Discussion Post Submit (RBAC-enforced)
  const handleCreateDiscussionPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      soundManager.playTone(330, 0.08);
      openAuthModal('signin');
      return;
    }
    if (!discussionInput.trim() && !discussionImage) return;

    // RBAC: Check if channel requires VIP/Artist/Annual Pass
    const currentChannel = CHAT_CHANNELS.find((c) => c.id === activeChannelId);
    if (currentChannel?.requiresArtist && !isArtist) {
      soundManager.playTone(330, 0.08);
      alert('Artist verification is required to post in the Pro Audio Lounge.');
      setIsArtistModalOpen(true);
      return;
    }
    if (currentChannel?.requiresVip && !isVip && !hasVipPass) {
      soundManager.playTone(330, 0.08);
      alert('Founders Pass (#001–#100) or VIP status required to post in the Founders VIP Lounge.');
      return;
    }
    if (currentChannel?.isAnnualPass && !isVipOrAbove) {
      soundManager.playTone(330, 0.08);
      alert(
        'Creator Lab channels require Äkinoya VIP Guest Pass or Annual Pass. Please sign in or redeem your VIP Pass Code.'
      );
      if (isAuthenticated) {
        window.location.href = '/verify';
      } else {
        openAuthModal('signin');
      }
      return;
    }

    soundManager.playTone(820, 0.06);
    const postRole: DiscussionPost['role'] =
      role === 'CREATOR'
        ? 'CREATOR'
        : role === 'ANNUAL_PASS'
        ? 'ANNUAL PASS MEMBER'
        : role === 'VIP_GUEST'
        ? 'VIP GUEST'
        : 'COMMUNITY MEMBER';

    const avatarGradient =
      role === 'CREATOR'
        ? 'from-amber-400 to-amber-600'
        : role === 'ANNUAL_PASS'
        ? 'from-cyan-400 to-indigo-600'
        : role === 'VIP_GUEST'
        ? 'from-purple-400 to-purple-600'
        : 'from-slate-400 to-slate-600';

    // Strictly text-only in #general-chat
    const finalImage = activeChannelId === 'general-chat' ? undefined : (discussionImage || undefined);

    const newPost: DiscussionPost = {
      id: `dp-${Date.now()}`,
      channelId: activeChannelId,
      author: userDisplayName,
      role: postRole,
      avatarBg: avatarGradient,
      timestamp: 'Just now',
      content: discussionInput.trim(),
      imageUrl: finalImage,
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
    if (!isAuthenticated) {
      soundManager.playTone(330, 0.08);
      openAuthModal('signin');
      return;
    }
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
    if (!isAuthenticated) {
      soundManager.playTone(330, 0.08);
      openAuthModal('signin');
      return;
    }
    if (!replyInputText.trim() || !activeReplyPost) return;

    soundManager.playTone(780, 0.06);
    const replyRole: DiscussionReply['role'] =
      role === 'CREATOR'
        ? 'CREATOR'
        : role === 'ANNUAL_PASS'
        ? 'ANNUAL PASS MEMBER'
        : role === 'VIP_GUEST'
        ? 'VIP GUEST'
        : 'COMMUNITY MEMBER';

    const avatarGradient =
      role === 'CREATOR'
        ? 'from-amber-400 to-amber-600'
        : role === 'ANNUAL_PASS'
        ? 'from-cyan-400 to-indigo-600'
        : role === 'VIP_GUEST'
        ? 'from-purple-400 to-purple-600'
        : 'from-slate-400 to-slate-600';

    const newReply: DiscussionReply = {
      id: `dpr-${Date.now()}`,
      author: userDisplayName,
      role: replyRole,
      avatarBg: avatarGradient,
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

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#03060c] text-white flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden">
      {/* Top Universal Header Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0a0b10]/80 backdrop-blur-xl px-2.5 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 sm:gap-3 w-full max-w-full overflow-visible">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-2.5 py-2 sm:py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-mono transition-colors cursor-pointer min-h-[44px] shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Planet Äkinoya</span>
          </button>

          <div className="h-4 w-px bg-white/15 shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span className="text-xs sm:text-sm font-display font-bold tracking-wider text-white uppercase truncate">
              {getDynamicHeaderTitle()}
            </span>
          </div>
        </div>

        {/* Right Status Actions: Auth Status Profile Button + Locked Membership Badge */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto max-w-full overflow-visible">
          <a
            href="/contest"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-black bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 transition-all min-h-[44px] shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:scale-[1.01]"
          >
            <Trophy className="w-3.5 h-3.5 text-black shrink-0" />
            <span className="hidden xs:inline">WORLDBUILDING CONTEST →</span>
            <span className="xs:hidden">CONTEST →</span>
          </a>
          <AuthHeaderButton />
          <button
            type="button"
            disabled={true}
            className="hidden sm:inline-flex px-4 py-2 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-mono font-semibold cursor-not-allowed items-center gap-2 max-w-full truncate sm:whitespace-normal break-words leading-snug min-h-[44px] select-none shadow-sm"
            title="Public membership launches on 09/01/2027"
          >
            <Lock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            <span className="max-w-full truncate sm:whitespace-normal break-words">LAUNCHES 09/01/2027 · €60/YEAR (~€5/MONTH)</span>
          </button>
        </div>
      </header>

      {/* Already Claimed VIP Link Error Banner */}
      {vipLinkError && (
        <div className="relative z-40 w-full bg-gradient-to-r from-red-950/95 via-rose-950/90 to-red-950/95 border-b border-red-500/50 px-3 sm:px-6 py-2.5 backdrop-blur-xl flex flex-wrap items-center justify-between gap-2 shadow-[0_4px_25px_rgba(239,68,68,0.3)] shrink-0">
          <div className="flex items-center gap-2.5 text-xs text-red-200 font-sans min-w-0">
            <span className="p-1 rounded-md bg-red-500/20 text-red-400 shrink-0">
              <AlertCircle className="w-4 h-4 text-red-400" />
            </span>
            <span className="font-mono font-bold text-red-400 uppercase tracking-wider text-[11px] shrink-0">
              ALREADY CLAIMED VIP LINK:
            </span>
            <span className="truncate text-red-200/90 text-xs">
              THIS VIP LINK HAS ALREADY BEEN CLAIMED. Single-use invitation enforced.
            </span>
          </div>
          <button
            type="button"
            onClick={clearVipLinkError}
            className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active VIP Referral Invitation Banner */}
      {!vipLinkError && hasPendingVipInvitation && !isAuthenticated && (
        <div className="relative z-40 w-full bg-gradient-to-r from-amber-950/95 via-yellow-950/90 to-amber-950/95 border-b border-amber-500/40 px-3 sm:px-6 py-2 sm:py-2.5 backdrop-blur-xl flex flex-wrap items-center justify-between gap-2 shadow-[0_4px_25px_rgba(245,158,11,0.25)] shrink-0">
          <div className="flex items-center gap-2.5 text-xs text-amber-200 font-sans min-w-0">
            <span className="p-1 rounded-md bg-yellow-400/20 text-yellow-400 shrink-0">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            </span>
            <span className="font-mono font-bold text-yellow-400 uppercase tracking-wider text-[11px] shrink-0">
              VIP Referral Detected:
            </span>
            <span className="truncate text-white/90">
              Sign in to activate your VIP Guest Pass and unlock Creator Lab chat &amp; visualizer channels.
            </span>
          </div>
          <button
            type="button"
            onClick={() => openAuthModal('signin')}
            className="px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-bold text-[11px] tracking-wider transition-all cursor-pointer shadow-md shrink-0 flex items-center gap-1.5"
          >
            <span>Claim VIP Invitation</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6 HUB TABS (WELCOME FIRST PROTOCOL)                      */}
      {/* ======================================================== */}
      {(() => {
        const HUB_TABS = [
          {
            id: 'welcome',
            label: 'Welcome & Vision',
            shortLabel: 'Welcome',
            desc: 'Transmission & Meta-Vision',
            icon: Sparkles,
            count: 'START',
          },
          {
            id: 'workflows',
            label: 'Äkinoya Labs & Workflows',
            shortLabel: 'Labs & Workflows',
            desc: '5-Stage Production Pipeline',
            icon: Sliders,
            count: '5 Stages',
          },
          {
            id: 'downloads',
            label: 'Drive Asset Vault',
            shortLabel: 'Drive Vault',
            desc: '5-Stage Folder Directory',
            icon: FolderDown,
            count: '5 Folders',
          },
          {
            id: 'discussion',
            label: 'Comm-Net Chat',
            shortLabel: 'Comm-Net',
            desc: '8 Multi-Channel Hubs',
            icon: MessageSquare,
            count: '8 Channels',
          },
          {
            id: 'creators',
            label: "Favorite Planets & Leaderboard",
            shortLabel: 'Leaderboard',
            desc: 'Community Voting & Dossiers',
            icon: Trophy,
            count: 'Rankings',
          },
          {
            id: 'governance',
            label: 'Lore & Governance Portal',
            shortLabel: 'Lore & Governance',
            desc: 'Syndicate Timeline & Canon',
            icon: Vote,
            count: 'Contest',
          },
        ];

        return (
          <>
            {/* Mobile Touch / Swipe Navigation Bar (< 768px) */}
            <nav
              className="md:hidden relative z-20 w-full bg-[#04070e]/95 border-b border-white/10 px-3 py-2 overflow-x-auto no-scrollbar scroll-smooth shrink-0 shadow-lg"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="flex items-center gap-2 min-w-max">
                {HUB_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeSection === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleSwitchSection(tab.id as CreativeHubSection)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap min-h-[44px] ${
                        isActive
                          ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(56,189,248,0.35)] font-bold scale-[1.02]'
                          : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-cyan-400'}`} />
                      <span>{tab.shortLabel}</span>
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

            {/* Layout Wrapper: Desktop Left Sidebar + Main Content Viewport */}
            <div className="flex-1 flex flex-col md:flex-row w-full max-w-[1700px] mx-auto min-h-0">
              {/* ======================================================== */}
              {/* DESKTOP FIXED/STICKY LEFT SIDEBAR NAVIGATION (>= 768px)   */}
              {/* ======================================================== */}
              <aside className="hidden md:flex w-64 lg:w-72 shrink-0 flex-col justify-between bg-[#050812]/90 backdrop-blur-xl border-r border-white/10 p-4 lg:p-5 sticky top-20 h-[calc(100dvh-5rem)] overflow-y-auto z-30 space-y-6">
                <div className="space-y-4">
                  {/* Sidebar Branding Header */}
                  <div className="pb-3 border-b border-white/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(0,242,254,0.8)]" />
                        COMMUNITY OS v2.4
                      </span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60">
                        6 MODULES
                      </span>
                    </div>
                    <div className="text-xs font-display font-black text-white tracking-wide">
                      ÄKINOYA PORTAL NAVIGATOR
                    </div>
                  </div>

                  {/* Vertical Navigation Tabs */}
                  <div className="space-y-1.5">
                    {HUB_TABS.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeSection === tab.id;

                      return (
                        <div key={tab.id} className="space-y-1">
                          <button
                            type="button"
                            onClick={() => handleSwitchSection(tab.id as CreativeHubSection)}
                            className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group min-h-[46px] ${
                              isActive
                                ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(0,242,254,0.4)] font-bold scale-[1.01]'
                                : 'bg-white/[0.03] border-white/5 hover:border-cyan-400/40 hover:bg-white/[0.07] text-white/70 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon
                                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                                  isActive ? 'text-black' : 'text-cyan-400'
                                }`}
                              />
                              <div className="min-w-0">
                                <span className="text-xs font-mono font-bold block truncate">
                                  {tab.label}
                                </span>
                                <span
                                  className={`text-[9.5px] font-sans block truncate ${
                                    isActive ? 'text-black/80 font-medium' : 'text-white/40'
                                  }`}
                                >
                                  {tab.desc}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold shrink-0 ml-1.5 ${
                                isActive
                                  ? 'bg-black/20 text-black'
                                  : 'bg-white/10 text-white/60 group-hover:bg-cyan-500/20 group-hover:text-cyan-300'
                              }`}
                            >
                              {tab.count}
                            </span>
                          </button>

                          {/* Nested Pipeline Stages sub-menu when on Labs & Workflows */}
                          {isActive && tab.id === 'workflows' && (
                            <div className="ml-3 pl-3 border-l-2 border-cyan-500/40 space-y-1 pt-1.5 pb-1">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-400/90 block px-2 pb-0.5">
                                PIPELINE STAGES
                              </span>
                              {WORKFLOW_STAGES.map((st) => {
                                const isStageActive = activeStageId === st.id;
                                return (
                                  <button
                                    key={st.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleJumpToStage(st.id);
                                    }}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                                      isStageActive
                                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/60 shadow-[0_0_12px_rgba(0,242,254,0.35)] font-bold'
                                        : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                                    }`}
                                  >
                                    <span className="flex items-center gap-1.5 truncate">
                                      <span
                                        className={`text-[10px] ${
                                          isStageActive ? 'text-cyan-300 font-bold' : 'text-white/40'
                                        }`}
                                      >
                                        [{st.num}]
                                      </span>
                                      <span className="truncate text-[11px]">{st.title}</span>
                                    </span>
                                    {isStageActive && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0 ml-1 shadow-[0_0_6px_#00f2fe]" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sidebar Bottom Footer Info */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-white/40">SYSTEM LAUNCH</span>
                      <span className="text-amber-400 font-bold">JAN 9, 2027</span>
                    </div>
                    <p className="text-[10px] text-white/60 font-sans leading-tight">
                      Paid memberships &amp; VR planet minting launch worldwide.
                    </p>
                  </div>

                  <a
                    href="/contest"
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all cursor-pointer"
                  >
                    <Trophy className="w-3.5 h-3.5 text-black" />
                    <span>WORLDBUILDING CONTEST</span>
                  </a>
                </div>
              </aside>

              {/* Main Content Viewport */}
              <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:p-8 space-y-6 sm:space-y-8">
                {/* ======================================================== */}
                {/* SECTION 0: 00 · WELCOME & VISION PORTAL (PRIMARY LANDING)*/}
                {/* ======================================================== */}
                {activeSection === 'welcome' && (
                  <motion.div
                    key="section-welcome"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="space-y-6"
                  >
                    <WelcomeVisionPortal
                      isMember={isVipOrAbove}
                      onNavigateToWorkflows={() => handleSwitchSection('workflows')}
                      onNavigateToVault={() => handleSwitchSection('downloads')}
                      onNavigateToDiscussion={() => handleSwitchSection('discussion')}
                      onNavigateToLeaderboard={() => handleSwitchSection('creators')}
                      onOpenAuthModal={() => openAuthModal('signin')}
                    />
                  </motion.div>
                )}

                {/* ======================================================== */}
                {/* SECTION 1: ÄKINOYA LABS UNIVERSAL WORKFLOW & CASE STUDIES */}
                {/* ======================================================== */}
                {activeSection === 'workflows' && (
                  <motion.div
                    key="section-workflows"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="space-y-6"
                  >
                    <AkinoyaLabsHub
                      isMember={isVipOrAbove}
                      onOpenAuthModal={() => openAuthModal('signin')}
                      onNavigateVerify={() => {
                        window.location.href = '/verify';
                      }}
                      onNavigateToVault={() => handleSwitchSection('downloads')}
                    />
                  </motion.div>
                )}

                {/* ======================================================== */}
                {/* SECTION 2: ASSET & DOWNLOAD VAULT (DRIVE DIRECTORY UI)   */}
                {/* ======================================================== */}
                {activeSection === 'downloads' && (
                  <motion.div
                    key="section-downloads"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="space-y-6"
                  >
                    <DriveFolderVault
                      isMember={isVipOrAbove}
                      onOpenAuthModal={() => openAuthModal('signin')}
                    />
                  </motion.div>
                )}

        {/* ======================================================== */}
        {/* SECTION 3: CREATOR DISCUSSION BOARD (DISCORD MULTI-HUB)  */}
        {/* ======================================================== */}
        {activeSection === 'discussion' && (() => {
          const activeChannel = CHAT_CHANNELS.find((c) => c.id === activeChannelId) || CHAT_CHANNELS[0];
          const channelPosts = discussionPosts.filter((p) => p.channelId === activeChannel.id);
          const publicChannels = CHAT_CHANNELS.filter((c) => c.category === 'PUBLIC HUB');
          const creatorLabChannels = CHAT_CHANNELS.filter((c) => c.category === 'CREATOR LAB & SHOWCASE');
          const collabChannels = CHAT_CHANNELS.filter((c) => c.category === 'COLLABORATION BOARD');
          const proAudioChannels = CHAT_CHANNELS.filter((c) => c.category === 'PRO AUDIO LOUNGE');
          const foundersVipChannels = CHAT_CHANNELS.filter((c) => c.category === 'FOUNDERS & VIP');
          const topCreator = getStoredCreators().sort((a, b) => b.likesCount - a.likesCount)[0];

          const isProAudioLocked = Boolean(activeChannel.requiresArtist && !isArtist);
          const isFoundersVipLocked = Boolean(
            activeChannel.requiresVip && !isVip && !hasVipPass && !profile?.has_vip_pass && !isVipOrAbove
          );

          return (
            <motion.div
              key="section-discussion"
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
                      MODULE 04 · DISCORD-STYLE COMM-NET CHAT
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                      8 CHANNELS · RBAC GATED HUBS &amp; SHOWCASES
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide">
                    💬 Comm-Net · Discord Multi-Channel Hub
                  </h1>
                  <p className="text-xs sm:text-sm text-white/70 font-sans mt-1 max-w-2xl">
                    Multi-channel Discord-style community hub. Explore public discussions, 3D visualizer pipelines, DAW synthesis lounges, open collaboration boards, and exclusive syndicate vaults.
                  </p>
                </div>
              </div>

              {/* Mobile Channel Selector & Touch Drawer Trigger */}
              <div className="lg:hidden w-full flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setIsMobileChannelsOpen(true)}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#060913] border border-cyan-500/40 text-white flex items-center justify-between shadow-lg cursor-pointer transition-all hover:border-cyan-400"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Hash className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-xs font-mono font-bold truncate">#{activeChannel.name}</span>
                    <span
                      className={`text-[9.5px] px-2 py-0.5 rounded font-mono font-semibold ${
                        activeChannel.category === 'FOUNDERS & VIP'
                          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/40'
                          : activeChannel.category === 'PRO AUDIO LOUNGE'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-400/40'
                          : activeChannel.category === 'CREATOR LAB & SHOWCASE'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                          : activeChannel.category === 'COLLABORATION BOARD'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                      }`}
                    >
                      {activeChannel.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-mono">
                    <span>Channels</span>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {/* Quick Horizontal Channel Pills (≥48px touch targets) */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {CHAT_CHANNELS.map((ch) => {
                    const isChActive = activeChannelId === ch.id;
                    const isLocked =
                      (ch.requiresArtist && !isArtist) ||
                      (ch.requiresVip && !isVip && !hasVipPass) ||
                      (ch.isAnnualPass && !isVipOrAbove);

                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => {
                          setActiveChannelId(ch.id);
                          if (ch.id === 'general-chat') setDiscussionImage(null);
                          soundManager.playTone(600, 0.05);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer min-h-[48px] ${
                          isChActive
                            ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(56,189,248,0.35)] font-bold'
                            : 'bg-black/60 border border-white/10 text-white/70 hover:text-white'
                        }`}
                      >
                        <Hash className={`w-3.5 h-3.5 ${isChActive ? 'text-black' : 'text-cyan-400'}`} />
                        <span>{ch.name}</span>
                        {isLocked && <Lock className={`w-3 h-3 ${isChActive ? 'text-black' : 'text-yellow-400'}`} />}
                        {ch.category === 'FOUNDERS & VIP' && (
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                              isChActive ? 'bg-black/20 text-black' : 'bg-yellow-500/20 text-yellow-300'
                            }`}
                          >
                            VIP
                          </span>
                        )}
                        {ch.category === 'PRO AUDIO LOUNGE' && (
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                              isChActive ? 'bg-black/20 text-black' : 'bg-purple-500/20 text-purple-300'
                            }`}
                          >
                            ARTIST
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Discord-Style Multi-Channel Grid: Left Channels Sidebar + Right Chat Feed */}
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* LEFT SIDEBAR: Discord Server & Channels */}
                <aside className="hidden lg:flex w-72 shrink-0 flex-col gap-4 rounded-2xl bg-[#060913]/90 border border-white/10 p-4 shadow-xl sticky top-24 self-start">
                  {/* Guild Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-cyan-400 text-black flex items-center justify-center font-black text-xs font-mono shadow-[0_0_10px_rgba(56,189,248,0.4)]">
                        #
                      </div>
                      <div>
                        <div className="text-xs font-display font-extrabold text-white tracking-wider uppercase">
                          COMM-NET SERVER
                        </div>
                        <div className="text-[9.5px] font-mono text-white/40">SILLOW MILL HQ</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>128 Online</span>
                    </div>
                  </div>

                  {/* CATEGORY 1: 📁 PUBLIC HUB */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono font-bold text-white/50 tracking-wider flex items-center justify-between uppercase px-1 pb-1">
                      <span className="flex items-center gap-1.5">
                        📁 PUBLIC HUB
                      </span>
                      <span className="text-[9px] text-emerald-400 font-normal">OPEN</span>
                    </div>
                    {publicChannels.map((ch) => {
                      const isChActive = activeChannelId === ch.id;
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            setActiveChannelId(ch.id);
                            if (ch.id === 'general-chat') setDiscussionImage(null);
                            soundManager.playTone(600, 0.05);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group min-h-[44px] ${
                            isChActive
                              ? 'bg-cyan-950/70 border-cyan-400/60 text-white shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                              : 'bg-black/40 border-white/5 hover:border-white/15 text-white/70 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Hash className={`w-4 h-4 shrink-0 ${isChActive ? 'text-cyan-400' : 'text-white/40 group-hover:text-cyan-400'}`} />
                            <div className="min-w-0">
                              <div className="text-xs font-mono font-semibold truncate leading-tight">
                                {ch.name}
                              </div>
                              <div className="text-[9.5px] font-sans text-white/45 truncate mt-0.5">
                                {ch.id === 'general-chat' ? 'Free community discussion' : 'Storyline & Äkinoya lore'}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* CATEGORY 2: 📁 CREATOR LAB & SHOWCASE */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <div className="text-[10px] font-mono font-bold text-amber-300/80 tracking-wider flex items-center justify-between uppercase px-1 pb-1">
                      <span className="flex items-center gap-1.5">
                        📁 CREATOR LAB &amp; SHOWCASE
                      </span>
                      <span className="text-[9px] text-amber-400 font-bold bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-500/30">
                        ANNUAL PASS
                      </span>
                    </div>
                    {creatorLabChannels.map((ch) => {
                      const isChActive = activeChannelId === ch.id;
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            setActiveChannelId(ch.id);
                            soundManager.playTone(600, 0.05);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group min-h-[44px] ${
                            isChActive
                              ? 'bg-amber-950/50 border-amber-400/60 text-white shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                              : 'bg-black/40 border-white/5 hover:border-white/15 text-white/70 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Hash className={`w-4 h-4 shrink-0 ${isChActive ? 'text-amber-400' : 'text-white/40 group-hover:text-amber-400'}`} />
                            <div className="min-w-0">
                              <div className="text-xs font-mono font-semibold truncate leading-tight">
                                {ch.name}
                              </div>
                              <div className="text-[9.5px] font-sans text-white/45 truncate mt-0.5">
                                {ch.id === 'visualizers-3d'
                                  ? 'Blender & Octane 3D scene architecture'
                                  : 'Community 4K renders & art showcase'}
                              </div>
                            </div>
                          </div>
                          {!isVipOrAbove && <Lock className="w-3.5 h-3.5 text-yellow-400 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* CATEGORY 3: 📁 COLLABORATION BOARD */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <div className="text-[10px] font-mono font-bold text-cyan-300/80 tracking-wider flex items-center justify-between uppercase px-1 pb-1">
                      <span className="flex items-center gap-1.5">
                        📁 COLLABORATION BOARD
                      </span>
                      <span className="text-[9px] text-cyan-400 font-bold bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-500/30">
                        OPEN COLLAB
                      </span>
                    </div>
                    {collabChannels.map((ch) => {
                      const isChActive = activeChannelId === ch.id;
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            setActiveChannelId(ch.id);
                            soundManager.playTone(600, 0.05);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group min-h-[44px] ${
                            isChActive
                              ? 'bg-cyan-950/60 border-cyan-400/60 text-white shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                              : 'bg-black/40 border-white/5 hover:border-white/15 text-white/70 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Hash className={`w-4 h-4 shrink-0 ${isChActive ? 'text-cyan-400' : 'text-white/40 group-hover:text-cyan-400'}`} />
                            <div className="min-w-0">
                              <div className="text-xs font-mono font-semibold truncate leading-tight">
                                {ch.name}
                              </div>
                              <div className="text-[9.5px] font-sans text-white/45 truncate mt-0.5">
                                {ch.id === 'music-x-visuals'
                                  ? 'Music producers x 3D animators'
                                  : 'Co-op tracks, stems & asset swaps'}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* CATEGORY 4: 📁 PRO AUDIO LOUNGE (🔒 ARTISTS ONLY) */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <div className="text-[10px] font-mono font-bold text-purple-300/80 tracking-wider flex items-center justify-between uppercase px-1 pb-1">
                      <span className="flex items-center gap-1.5">
                        📁 PRO AUDIO LOUNGE
                      </span>
                      <span className="text-[9px] text-purple-400 font-bold bg-purple-950/80 px-1.5 py-0.2 rounded border border-purple-500/30">
                        ARTISTS ONLY
                      </span>
                    </div>
                    {proAudioChannels.map((ch) => {
                      const isChActive = activeChannelId === ch.id;
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            setActiveChannelId(ch.id);
                            soundManager.playTone(600, 0.05);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group min-h-[44px] ${
                            isChActive
                              ? 'bg-purple-950/50 border-purple-400/60 text-white shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                              : 'bg-black/40 border-white/5 hover:border-white/15 text-white/70 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Hash className={`w-4 h-4 shrink-0 ${isChActive ? 'text-purple-400' : 'text-white/40 group-hover:text-purple-400'}`} />
                            <div className="min-w-0">
                              <div className="text-xs font-mono font-semibold truncate leading-tight">
                                {ch.name}
                              </div>
                              <div className="text-[9.5px] font-sans text-white/45 truncate mt-0.5">
                                Curated VST/AU deals &amp; DAW templates
                              </div>
                            </div>
                          </div>
                          {!isArtist && <Lock className="w-3.5 h-3.5 text-purple-400 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* CATEGORY 5: 📁 FOUNDERS & VIP (🔒 VIP PASS HOLDERS) */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <div className="text-[10px] font-mono font-bold text-yellow-300/80 tracking-wider flex items-center justify-between uppercase px-1 pb-1">
                      <span className="flex items-center gap-1.5">
                        📁 FOUNDERS &amp; VIP
                      </span>
                      <span className="text-[9px] text-yellow-400 font-bold bg-yellow-950/80 px-1.5 py-0.2 rounded border border-yellow-500/30">
                        VIP PASS
                      </span>
                    </div>
                    {foundersVipChannels.map((ch) => {
                      const isChActive = activeChannelId === ch.id;
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            setActiveChannelId(ch.id);
                            soundManager.playTone(600, 0.05);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group min-h-[44px] ${
                            isChActive
                              ? 'bg-yellow-950/50 border-yellow-400/60 text-white shadow-[0_0_12px_rgba(234,179,8,0.2)]'
                              : 'bg-black/40 border-white/5 hover:border-white/15 text-white/70 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Hash className={`w-4 h-4 shrink-0 ${isChActive ? 'text-yellow-400' : 'text-white/40 group-hover:text-yellow-400'}`} />
                            <div className="min-w-0">
                              <div className="text-xs font-mono font-semibold truncate leading-tight">
                                {ch.name}
                              </div>
                              <div className="text-[9.5px] font-sans text-white/45 truncate mt-0.5">
                                Founding NFC Pass Holders (#001–#100)
                              </div>
                            </div>
                          </div>
                          {!isVip && !hasVipPass && <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Portfolio of the Month Spotlight Mini-Widget */}
                  {topCreator && (
                    <div className="pt-3 border-t border-white/10">
                      <div
                        onClick={() => {
                          soundManager.playTone(660, 0.05);
                          setSelectedCreatorUsername(topCreator.username);
                          setActiveSection('creators');
                          if (onOpenCreator) onOpenCreator(topCreator.username);
                        }}
                        className="p-3 rounded-xl bg-gradient-to-r from-amber-950/50 via-black to-black border border-amber-500/30 hover:border-amber-400/60 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-amber-400" />
                            PORTFOLIO OF THE MONTH
                          </span>
                          <span className="text-[9px] font-mono text-amber-400 font-bold">#1</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${topCreator.avatarGradient} flex items-center justify-center font-bold text-xs text-white shrink-0`}>
                            {topCreator.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                              {topCreator.fullName}
                            </div>
                            <div className="text-[9.5px] font-mono text-white/50 flex items-center gap-1">
                              <Heart className="w-2.5 h-2.5 text-rose-400 fill-rose-400" />
                              <span>{topCreator.likesCount} appreciations</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-[10px] font-mono text-cyan-400 flex items-center justify-between group-hover:translate-x-0.5 transition-transform">
                          <span>Explore Portfolio</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  )}
                </aside>

                {/* RIGHT CHAT AREA */}
                <div className="flex-1 min-w-0 space-y-4 w-full">
                  {/* Active Channel Header */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Hash className="w-5 h-5 text-cyan-400 shrink-0" />
                        <h2 className="text-base sm:text-lg font-display font-bold text-white tracking-wide truncate">
                          {activeChannel.name}
                        </h2>
                        <span className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          activeChannel.category === 'FOUNDERS & VIP'
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/40'
                            : activeChannel.category === 'PRO AUDIO LOUNGE'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-400/40'
                            : activeChannel.category === 'CREATOR LAB & SHOWCASE'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                            : activeChannel.category === 'COLLABORATION BOARD'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                        }`}>
                          {activeChannel.category}
                        </span>
                      </div>
                      <p className="text-xs text-white/65 font-sans truncate">
                        {activeChannel.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 text-xs font-mono text-white/50">
                      <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10.5px]">42 Online</span>
                      </div>
                      <span className="text-[10.5px] bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                        {channelPosts.length} Transmissions
                      </span>
                    </div>
                  </div>

                  {/* Channel Gating Check */}
                  {isProAudioLocked ? (
                    <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-purple-950/40 via-black/80 to-black border border-purple-500/40 shadow-[0_0_40px_rgba(168,85,247,0.15)] space-y-5 text-center sm:text-left">
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-400/50 flex items-center justify-center text-purple-400 shrink-0 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                          <Lock className="w-7 h-7" />
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-400/40 font-bold">
                              PRO AUDIO LOUNGE 🔒
                            </span>
                            <span className="text-[10px] font-mono text-purple-400">ARTIST VERIFICATION REQUIRED</span>
                          </div>
                          <h3 className="text-lg sm:text-xl font-display font-bold text-white">
                            Producer &amp; Sound Designer Vault Locked
                          </h3>
                          <p className="text-xs sm:text-sm text-white/70 font-sans leading-relaxed">
                            Channel <span className="font-mono text-purple-300">#plugins-deals-vault</span> is exclusively open to verified music producers, audio engineers, and sound designers. Verify your artist credentials to unlock instant access to manufacturer discount codes, studio master DAW chains, and stem swap pools.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs">
                          <div className="font-bold text-purple-300 mb-0.5">💎 VST/AU Partner Deals</div>
                          <div className="text-[11px] text-white/60">40% FabFilter &amp; UAD native coupon codes</div>
                        </div>
                        <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs">
                          <div className="font-bold text-purple-300 mb-0.5">🎛️ DAW Master Racks</div>
                          <div className="text-[11px] text-white/60">Ableton 12 &amp; Bitwig analog saturator templates</div>
                        </div>
                        <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs">
                          <div className="font-bold text-purple-300 mb-0.5">⚡ Stem Collaboration</div>
                          <div className="text-[11px] text-white/60">Direct stem downloads and feedback loops</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-3 border-t border-purple-500/20">
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playTone(660, 0.05);
                            if (isAuthenticated) {
                              setIsArtistModalOpen(true);
                            } else {
                              openAuthModal('signin');
                            }
                          }}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-mono font-bold text-xs shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>{isAuthenticated ? 'Request Artist Verification' : 'Sign In to Verify Artist'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (isAuthenticated) {
                              handleInstantArtistVerify();
                            } else {
                              openAuthModal('signin');
                            }
                          }}
                          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-purple-400/30 text-purple-300 font-mono text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Zap className="w-3.5 h-3.5 text-yellow-400" />
                          <span>Instant Syndicate Access (Demo)</span>
                        </button>
                      </div>
                    </div>
                  ) : isFoundersVipLocked ? (
                    <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-yellow-950/40 via-black/80 to-black border border-yellow-500/40 shadow-[0_0_40px_rgba(234,179,8,0.15)] space-y-5 text-center sm:text-left">
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 border border-yellow-400/50 flex items-center justify-center text-yellow-400 shrink-0 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                          <Crown className="w-7 h-7" />
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-yellow-950 text-yellow-300 border border-yellow-400/40 font-bold">
                              FOUNDERS &amp; VIP 👑
                            </span>
                            <span className="text-[10px] font-mono text-yellow-400">VIP PASS RESTRICTED</span>
                          </div>
                          <h3 className="text-lg sm:text-xl font-display font-bold text-white">
                            Founders Council Chamber Restricted
                          </h3>
                          <p className="text-xs sm:text-sm text-white/70 font-sans leading-relaxed">
                            Channel <span className="font-mono text-yellow-300">#founders-vip-lounge</span> is strictly reserved for owners of physical Äkinoya NFC Master Passes (#001–#100) and verified VIP members.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div className="p-3 rounded-xl bg-yellow-950/30 border border-yellow-500/20 text-xs">
                          <div className="font-bold text-yellow-300 mb-0.5">👑 Direct Creative Council</div>
                          <div className="text-[11px] text-white/60">Direct channel with Odi and lead production team</div>
                        </div>
                        <div className="p-3 rounded-xl bg-yellow-950/30 border border-yellow-500/20 text-xs">
                          <div className="font-bold text-yellow-300 mb-0.5">🎬 4K 60FPS Test Streams</div>
                          <div className="text-[11px] text-white/60">Unreleased cinematic cut previews &amp; ProRes masters</div>
                        </div>
                        <div className="p-3 rounded-xl bg-yellow-950/30 border border-yellow-500/20 text-xs">
                          <div className="font-bold text-yellow-300 mb-0.5">🗳️ Lifetime Governance</div>
                          <div className="text-[11px] text-white/60">Binding narrative votes &amp; physical drop whitelist</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-3 border-t border-yellow-500/20">
                        <button
                          type="button"
                          onClick={() => {
                            if (isAuthenticated) {
                              window.location.href = '/verify';
                            } else {
                              openAuthModal('signin');
                            }
                          }}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-mono font-bold text-xs shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Crown className="w-4 h-4" />
                          <span>{isAuthenticated ? 'Verify / Claim VIP Pass' : 'Sign In to Claim VIP Pass'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Channel Filtered Message Feed */}
                      <div className="space-y-4">
                        {channelPosts.length === 0 ? (
                          <div className="p-8 rounded-2xl bg-black/40 border border-white/10 text-center space-y-2">
                            <MessageSquare className="w-8 h-8 text-white/30 mx-auto" />
                            <div className="text-sm font-display font-bold text-white">
                              No transmissions in #{activeChannel.name} yet
                            </div>
                            <p className="text-xs text-white/50 font-sans max-w-sm mx-auto">
                              Be the first to transmit a message or drop project feedback in this channel!
                            </p>
                          </div>
                        ) : (
                          channelPosts.map((post) => (
                            <div
                              key={post.id}
                              className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-white/10 hover:border-white/20 transition-all space-y-3 shadow-[0_4px_25px_rgba(0,0,0,0.5)]"
                            >
                              <div className="flex items-center justify-between">
                                {(() => {
                                  const creatorMap: Record<string, string> = {
                                    'Odi': 'odi',
                                    'Elena Vance': 'elena-vance',
                                    'Kaelen Voss': 'kaelen-voss',
                                    'Kaelen Thorne': 'kaelen-voss',
                                    'Sora Takahashi': 'sora-t',
                                  };
                                  const authorUsername = creatorMap[post.author] || post.author.toLowerCase().replace(/\s+/g, '-');

                                  return (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        soundManager.playTone(660, 0.05);
                                        setSelectedCreatorUsername(authorUsername);
                                        setActiveSection('creators');
                                        if (onOpenCreator) onOpenCreator(authorUsername);
                                      }}
                                      className="flex items-center gap-2.5 text-left group cursor-pointer"
                                      title={`View ${post.author}'s Creator Portfolio`}
                                    >
                                      <div
                                        className={`w-9 h-9 rounded-full bg-gradient-to-tr ${post.avatarBg} flex items-center justify-center font-bold text-xs text-black shrink-0 group-hover:scale-105 transition-transform`}
                                      >
                                        {post.author.slice(0, 2).toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                                          <span>{post.author}</span>
                                          <span
                                            className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full font-bold ${
                                              post.role === 'CREATOR'
                                                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                                                : post.role === 'ANNUAL PASS' || post.role === 'ANNUAL PASS MEMBER'
                                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                                                : post.role === 'VIP GUEST' || post.role === 'PATRON' || post.role === 'PATRON MEMBER'
                                                ? 'bg-purple-500/20 text-purple-300 border border-purple-400/40'
                                                : 'bg-slate-500/20 text-slate-300 border border-slate-400/40'
                                            }`}
                                          >
                                            {post.role === 'PATRON' || post.role === 'PATRON MEMBER' ? 'VIP GUEST' : post.role}
                                          </span>
                                        </div>
                                        <div className="text-[10px] font-mono text-white/40">{post.timestamp}</div>
                                      </div>
                                    </button>
                                  );
                                })()}
                              </div>

                              <p className="text-xs sm:text-sm text-white/85 leading-relaxed font-sans whitespace-pre-line">
                                {post.content}
                              </p>

                              {/* Large High-Res Image Post Attachment (Strictly disabled in #general-chat) */}
                              {post.imageUrl && post.channelId !== 'general-chat' && (
                                <div className="rounded-xl overflow-hidden border border-white/10 max-h-96 bg-black/80 flex items-center justify-center">
                                  <img src={post.imageUrl} alt="Attached" className="max-h-96 w-full object-cover" />
                                </div>
                              )}

                              {/* Like & Reply Bar */}
                              <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleToggleDiscussionLike(post.id)}
                                  className={`min-h-[48px] flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
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
                                  onClick={() => {
                                    if (!isAuthenticated) {
                                      soundManager.playTone(330, 0.08);
                                      openAuthModal('signin');
                                      return;
                                    }
                                    setActiveReplyPost(post);
                                  }}
                                  className="min-h-[48px] flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-white/60 hover:text-cyan-300 transition-colors cursor-pointer"
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
                          ))
                        )}
                      </div>

                      {/* Bottom Discord-Style Message Input Box */}
                      <form
                        onSubmit={handleCreateDiscussionPost}
                        className="p-4 sm:p-5 rounded-2xl bg-black/75 border border-white/10 focus-within:border-cyan-400/50 space-y-3 transition-colors shadow-2xl"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full bg-gradient-to-tr ${
                              role === 'CREATOR'
                                ? 'from-amber-400 to-amber-600'
                                : role === 'ANNUAL_PASS'
                                ? 'from-cyan-400 to-indigo-600'
                                : role === 'VIP_GUEST'
                                ? 'from-purple-400 to-purple-600'
                                : 'from-slate-400 to-slate-600'
                            } flex items-center justify-center font-bold text-[10px] text-black shrink-0`}
                          >
                            {(userDisplayName || 'US').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{userDisplayName}</span>
                              <span
                                className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full font-bold ${
                                  role === 'CREATOR'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                                    : role === 'ANNUAL_PASS'
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                                    : role === 'VIP_GUEST'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-400/40'
                                    : 'bg-slate-500/20 text-slate-300 border border-slate-400/40'
                                }`}
                              >
                                {role === 'CREATOR'
                                  ? 'CREATOR'
                                  : role === 'ANNUAL_PASS'
                                  ? 'ANNUAL PASS'
                                  : role === 'VIP_GUEST'
                                  ? 'VIP GUEST'
                                  : 'FREE MEMBER'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {activeChannel.isAnnualPass && !isVipOrAbove && (
                          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-xs font-mono text-amber-300">
                              <Lock className="w-4 h-4 text-yellow-400 shrink-0" />
                              <span className="whitespace-normal break-words leading-tight">Creator Lab transmission requires VIP Guest Pass or Annual Pass</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (isAuthenticated) {
                                  window.location.href = '/verify';
                                } else {
                                  openAuthModal('signin');
                                }
                              }}
                              className="min-h-[48px] px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-mono font-bold text-xs transition-all shrink-0 cursor-pointer"
                            >
                              {isAuthenticated ? 'VERIFY / CLAIM VIP PASS' : 'SIGN IN / REGISTER'}
                            </button>
                          </div>
                        )}

                        <textarea
                          value={discussionInput}
                          onClick={() => {
                            if (!isAuthenticated) {
                              openAuthModal('signin');
                            }
                          }}
                          onFocus={() => {
                            if (!isAuthenticated) {
                              openAuthModal('signin');
                            }
                          }}
                          onChange={(e) => {
                            if (!isAuthenticated) {
                              openAuthModal('signin');
                              return;
                            }
                            setDiscussionInput(e.target.value);
                          }}
                          placeholder={
                            !isAuthenticated
                              ? `Sign in to message #${activeChannel.name}...`
                              : activeChannel.isAnnualPass && !isVipOrAbove
                              ? `Redeem VIP Pass to message #${activeChannel.name}...`
                              : `Message #${activeChannel.name}...`
                          }
                          rows={3}
                          className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-white/30 outline-none resize-none font-sans"
                        />

                        {discussionImage && activeChannelId !== 'general-chat' && (
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
                          {activeChannelId === 'general-chat' ? (
                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/40">
                              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                              <span>#general-chat is strictly text-only</span>
                            </div>
                          ) : (
                            <>
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
                                onClick={() => {
                                  if (!isAuthenticated) {
                                    openAuthModal('signin');
                                    return;
                                  }
                                  discussionFileInputRef.current?.click();
                                }}
                                className="min-h-[48px] flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-white/70 hover:text-cyan-300 transition-colors cursor-pointer"
                              >
                                <ImageIcon className="w-4 h-4 text-cyan-400" />
                                <span>Attach Image</span>
                              </button>
                            </>
                          )}

                          <button
                            type="submit"
                            disabled={!discussionInput.trim() && !discussionImage}
                            className="min-h-[48px] px-5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-30 text-black font-mono font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ml-auto"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>TRANSMIT MESSAGE</span>
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* ======================================================== */}
        {/* SECTION 5: CREATOR PORTFOLIOS & LEADERBOARD              */}
        {/* ======================================================== */}
        {activeSection === 'creators' && (
          <motion.div
            key="section-creators"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-950/40 via-black/50 to-black/80 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-400/40 text-amber-300 font-bold tracking-wider">
                    MODULE 05 · COMMUNITY SPOTLIGHT &amp; RANKINGS
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                    GROUP'S FAVORITE PLANETS · REALTIME LEADERBOARD
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide">
                  🏆 Group's Favorite Planets Leaderboard
                </h1>
                <p className="text-xs sm:text-sm text-white/70 font-sans mt-1 max-w-2xl">
                  Explore the community's top-voted planets, inspect complete 5-photo cinematic sci-fi dossiers, and celebrate syndicate creator portfolios.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-1">
                <CreatorLeaderboard
                  selectedUsername={selectedCreatorUsername}
                  onSelectCreator={(u) => {
                    setSelectedCreatorUsername(u);
                    if (onOpenCreator) onOpenCreator(u);
                  }}
                />
              </div>
              <div className="lg:col-span-2">
                <CreatorPortfolioView
                  username={selectedCreatorUsername}
                  onBackToCommunity={() => setActiveSection('discussion')}
                  onBackToHome={onBackToHome}
                  onNavigateToCreator={(u) => {
                    setSelectedCreatorUsername(u);
                    if (onOpenCreator) onOpenCreator(u);
                  }}
                />
              </div>
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
            <LoreGovernancePortal
              onNavigateToContest={() => {
                window.location.href = '/contest';
              }}
              onOpenCreator={(u) => {
                setSelectedCreatorUsername(u);
                setActiveSection('creators');
                if (onOpenCreator) onOpenCreator(u);
              }}
              onOpenUpgradeModal={(reason) => {
                setUpgradeModalReason(reason);
                setIsUpgradeModalOpen(true);
              }}
            />
          </motion.div>
        )}
      </main>
      </div>
          </>
        );
      })()}

      {/* ======================================================== */}
      {/* FREEMIUM PAYWALL UPGRADE MODAL (€60/YEAR ANNUAL PASS)    */}
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
                    €60/YEAR (~€5/MONTH)
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
                  <span>Uncompressed 24-Bit / 96kHz VIP Audio Masters &amp; Project Files</span>
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
                  disabled={isMembershipLaunchLocked || isSubscribing}
                  onClick={handleStripeUpgrade}
                  className={
                    isMembershipLaunchLocked
                      ? "w-full min-h-[48px] py-3.5 px-4 rounded-xl font-mono text-xs sm:text-sm font-semibold text-amber-300 bg-amber-950/60 border border-amber-500/40 cursor-not-allowed flex items-center justify-center gap-2 select-none shadow-md"
                      : "w-full min-h-[48px] py-3.5 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold text-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2"
                  }
                >
                  {isMembershipLaunchLocked ? (
                    <Lock className="w-4 h-4 text-yellow-400 shrink-0" />
                  ) : (
                    <CreditCard className="w-4 h-4 text-black" />
                  )}
                  <span className="whitespace-normal break-words text-center leading-snug">
                    {isMembershipLaunchLocked
                      ? 'LAUNCHES 09/01/2027 · €60/YEAR (~€5/MONTH)'
                      : isSubscribing
                      ? 'INITIALIZING STRIPE...'
                      : 'ACTIVATE ANNUAL MEMBERSHIP · €60/YEAR (~€5/MONTH)'}
                  </span>
                </button>

                <div className="text-center text-[11px] font-mono text-white/50 flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <span>The portal is currently in preview-only mode until launch on 09/01/2027.</span>
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
                  onFocus={() => {
                    if (!isAuthenticated) {
                      openAuthModal('signin');
                    }
                  }}
                  onChange={(e) => {
                    if (!isAuthenticated) {
                      openAuthModal('signin');
                      return;
                    }
                    setReplyInputText(e.target.value);
                  }}
                  placeholder={!isAuthenticated ? 'Sign in to reply...' : 'Reply to thread...'}
                  className="flex-1 min-h-[44px] bg-black/60 border border-white/20 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none font-mono"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs transition-colors cursor-pointer flex items-center justify-center"
                >
                  Reply
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Channels Touch Drawer (Bottom-Sheet) */}
      <AnimatePresence>
        {isMobileChannelsOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full max-w-lg bg-[#070b14] border-t sm:border border-cyan-500/30 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm font-display font-bold text-white tracking-wider">
                    SELECT COMM-NET CHANNEL
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileChannelsOpen(false)}
                  className="p-2 rounded-lg text-white/50 hover:text-white min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* CATEGORY 1: PUBLIC HUB */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-wider px-1">
                  📁 PUBLIC HUB (FREE &amp; OPEN)
                </div>
                {CHAT_CHANNELS.filter((c) => c.category === 'PUBLIC HUB').map((ch) => {
                  const isChActive = activeChannelId === ch.id;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        setActiveChannelId(ch.id);
                        if (ch.id === 'general-chat') setDiscussionImage(null);
                        setIsMobileChannelsOpen(false);
                        soundManager.playTone(600, 0.05);
                      }}
                      className={`w-full min-h-[48px] p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isChActive
                          ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                          : 'bg-black/40 border-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Hash className={`w-4 h-4 shrink-0 ${isChActive ? 'text-cyan-400' : 'text-white/40'}`} />
                        <div className="min-w-0">
                          <div className="text-xs font-mono font-bold truncate">#{ch.name}</div>
                          <div className="text-[10px] text-white/50 truncate">{ch.description}</div>
                        </div>
                      </div>
                      {isChActive && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* CATEGORY 2: CREATOR LAB & SHOWCASE */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="text-[11px] font-mono font-bold text-amber-300/80 uppercase tracking-wider px-1 flex items-center justify-between">
                  <span>📁 CREATOR LAB &amp; SHOWCASE</span>
                  <span className="text-[9.5px] bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                    VIP PASS REQUIRED
                  </span>
                </div>
                {CHAT_CHANNELS.filter((c) => c.category === 'CREATOR LAB & SHOWCASE').map((ch) => {
                  const isChActive = activeChannelId === ch.id;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        setActiveChannelId(ch.id);
                        setIsMobileChannelsOpen(false);
                        soundManager.playTone(600, 0.05);
                      }}
                      className={`w-full min-h-[48px] p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isChActive
                          ? 'bg-amber-950/50 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                          : 'bg-black/40 border-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Hash className={`w-4 h-4 shrink-0 ${isChActive ? 'text-amber-400' : 'text-white/40'}`} />
                        <div className="min-w-0">
                          <div className="text-xs font-mono font-bold truncate">#{ch.name}</div>
                          <div className="text-[10px] text-white/50 truncate">{ch.description}</div>
                        </div>
                      </div>
                      {!isVipOrAbove && <Lock className="w-4 h-4 text-yellow-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* CATEGORY 3: COLLABORATION BOARD */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="text-[11px] font-mono font-bold text-cyan-300/80 uppercase tracking-wider px-1 flex items-center justify-between">
                  <span>📁 COLLABORATION BOARD</span>
                  <span className="text-[9.5px] bg-cyan-950/80 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                    OPEN COLLAB
                  </span>
                </div>
                {CHAT_CHANNELS.filter((c) => c.category === 'COLLABORATION BOARD').map((ch) => {
                  const isChActive = activeChannelId === ch.id;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        setActiveChannelId(ch.id);
                        setIsMobileChannelsOpen(false);
                        soundManager.playTone(600, 0.05);
                      }}
                      className={`w-full min-h-[48px] p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isChActive
                          ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                          : 'bg-black/40 border-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Hash className={`w-4 h-4 shrink-0 ${isChActive ? 'text-cyan-400' : 'text-white/40'}`} />
                        <div className="min-w-0">
                          <div className="text-xs font-mono font-bold truncate">#{ch.name}</div>
                          <div className="text-[10px] text-white/50 truncate">{ch.description}</div>
                        </div>
                      </div>
                      {isChActive && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* CATEGORY 4: PRO AUDIO LOUNGE */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="text-[11px] font-mono font-bold text-purple-300/80 uppercase tracking-wider px-1 flex items-center justify-between">
                  <span>📁 PRO AUDIO LOUNGE</span>
                  <span className="text-[9.5px] bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                    ARTISTS ONLY 🔒
                  </span>
                </div>
                {CHAT_CHANNELS.filter((c) => c.category === 'PRO AUDIO LOUNGE').map((ch) => {
                  const isChActive = activeChannelId === ch.id;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        setActiveChannelId(ch.id);
                        setIsMobileChannelsOpen(false);
                        soundManager.playTone(600, 0.05);
                      }}
                      className={`w-full min-h-[48px] p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isChActive
                          ? 'bg-purple-950/50 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                          : 'bg-black/40 border-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Hash className={`w-4 h-4 shrink-0 ${isChActive ? 'text-purple-400' : 'text-white/40'}`} />
                        <div className="min-w-0">
                          <div className="text-xs font-mono font-bold truncate">#{ch.name}</div>
                          <div className="text-[10px] text-white/50 truncate">{ch.description}</div>
                        </div>
                      </div>
                      {!isArtist && <Lock className="w-4 h-4 text-purple-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* CATEGORY 5: FOUNDERS & VIP */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="text-[11px] font-mono font-bold text-yellow-300/80 uppercase tracking-wider px-1 flex items-center justify-between">
                  <span>📁 FOUNDERS &amp; VIP</span>
                  <span className="text-[9.5px] bg-yellow-950/80 text-yellow-300 px-2 py-0.5 rounded border border-yellow-500/30">
                    VIP PASS 👑
                  </span>
                </div>
                {CHAT_CHANNELS.filter((c) => c.category === 'FOUNDERS & VIP').map((ch) => {
                  const isChActive = activeChannelId === ch.id;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        setActiveChannelId(ch.id);
                        setIsMobileChannelsOpen(false);
                        soundManager.playTone(600, 0.05);
                      }}
                      className={`w-full min-h-[48px] p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isChActive
                          ? 'bg-yellow-950/50 border-yellow-400 text-white shadow-[0_0_15px_rgba(234,179,8,0.25)]'
                          : 'bg-black/40 border-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Hash className={`w-4 h-4 shrink-0 ${isChActive ? 'text-yellow-400' : 'text-white/40'}`} />
                        <div className="min-w-0">
                          <div className="text-xs font-mono font-bold truncate">#{ch.name}</div>
                          <div className="text-[10px] text-white/50 truncate">{ch.description}</div>
                        </div>
                      </div>
                      {!isVip && !hasVipPass && <Crown className="w-4 h-4 text-yellow-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Creator Syndicate Shortcut */}
              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileChannelsOpen(false);
                    setActiveSection('creators');
                    soundManager.playTone(660, 0.05);
                  }}
                  className="w-full min-h-[48px] p-3 rounded-xl bg-gradient-to-r from-amber-950/60 via-black to-black border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Explore Syndicate Creator Leaderboards</span>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Artist Verification Modal */}
      <AnimatePresence>
        {isArtistModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#070b14] border border-purple-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(168,85,247,0.25)] space-y-5"
            >
              <button
                type="button"
                onClick={() => setIsArtistModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-white tracking-wide">
                    Pro Audio Syndicate · Artist Verification
                  </h3>
                  <p className="text-xs text-purple-300/80 font-mono">
                    Unlock #plugins-deals-vault, master chains &amp; stem swaps
                  </p>
                </div>
              </div>

              {artistSuccess ? (
                <div className="p-6 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
                  <h4 className="text-sm font-bold text-white">Artist Credentials Verified!</h4>
                  <p className="text-xs text-white/70">
                    Welcome to the Pro Audio Lounge. Unlocking #plugins-deals-vault...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleArtistVerificationSubmit} className="space-y-4">
                  <p className="text-xs text-white/70 font-sans leading-relaxed">
                    Verified artists, music producers, and sound designers receive lifetime access to curated VST/AU discounts (FabFilter, UAD), custom Ableton 12 / Bitwig racks, and production stems.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-white/70 uppercase">
                      Artist / Producer Alias
                    </label>
                    <input
                      type="text"
                      required
                      value={artistAlias || userDisplayName}
                      onChange={(e) => setArtistAlias(e.target.value)}
                      placeholder="e.g. Sillow Mill, Vance, etc."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-purple-400 text-xs text-white outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-white/70 uppercase">
                      Primary Genre / Discipline
                    </label>
                    <select
                      value={artistGenre}
                      onChange={(e) => setArtistGenre(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-purple-400 text-xs text-white outline-none font-mono"
                    >
                      <option value="Electronic / Ambient Sound Design">Electronic / Ambient Sound Design</option>
                      <option value="Cinematic / Hybrid Orchestral">Cinematic / Hybrid Orchestral</option>
                      <option value="Drum & Bass / Neurofunk">Drum & Bass / Neurofunk</option>
                      <option value="Techno / Industrial">Techno / Industrial</option>
                      <option value="Hip-Hop / Lo-Fi Beats">Hip-Hop / Lo-Fi Beats</option>
                      <option value="Game Audio / Interactive FMOD">Game Audio / Interactive FMOD</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-white/70 uppercase">
                      Portfolio or Music Link (SoundCloud, Spotify, YouTube, Bandcamp)
                    </label>
                    <input
                      type="url"
                      value={artistLink}
                      onChange={(e) => setArtistLink(e.target.value)}
                      placeholder="https://soundcloud.com/your-artist-profile"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-purple-400 text-xs text-white outline-none font-mono"
                    />
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      type="submit"
                      disabled={artistSubmitting}
                      className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-mono font-bold text-xs shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{artistSubmitting ? 'VERIFYING CREDENTIALS...' : 'CONFIRM & VERIFY ARTIST STATUS'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleInstantArtistVerify}
                      className="w-full min-h-[40px] rounded-xl bg-white/5 hover:bg-white/10 border border-purple-500/30 text-purple-300 font-mono text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Instant Syndicate Access (Demo / Fast Pass)</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

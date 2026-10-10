import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Hash,
  Volume2,
  Play,
  Pause,
  Send,
  Image as ImageIcon,
  Heart,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Crown,
  Radio,
  Vote,
  Film,
  Lock,
  Unlock,
  Key,
  Users,
  Bell,
  ArrowLeft,
  X,
  Share2,
  Flame,
  ThumbsUp,
  MessageCircle,
  HelpCircle,
  LogOut,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import bingaaComicCover from '../assets/images/bingaa_comic_cover.jpg';
import akinoyaVistaImg from '../assets/images/akinoya_twilight_world_1790852640934.jpg';

export type CommunityChannel = 'announcements' | 'general' | 'vault' | 'governance';

interface ChatMessage {
  id: string;
  author: string;
  role: 'CREATOR' | 'PATRON MEMBER' | 'FOUNDING VIP';
  avatarBg: string;
  timestamp: string;
  content: string;
  imageUrl?: string;
  likes: number;
  hasLiked?: boolean;
  replies?: ChatReply[];
}

interface ChatReply {
  id: string;
  author: string;
  role: 'CREATOR' | 'PATRON MEMBER' | 'FOUNDING VIP';
  avatarBg: string;
  timestamp: string;
  content: string;
}

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface GovernancePoll {
  id: string;
  title: string;
  badge: string;
  description: string;
  options: PollOption[];
  userVotedId?: string;
  totalVotes: number;
}

interface CommunityHubProps {
  onBackToHome: () => void;
  onOpenAuthModal?: () => void;
}

export const CommunityHub: React.FC<CommunityHubProps> = ({
  onBackToHome,
  onOpenAuthModal,
}) => {
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

  const [activeChannel, setActiveChannel] = useState<CommunityChannel>('general');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [membersDrawerOpen, setMembersDrawerOpen] = useState(false);

  // Chat state
  const [messageText, setMessageText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Thread reply drawer state
  const [activeThreadMessage, setActiveThreadMessage] = useState<ChatMessage | null>(null);
  const [threadReplyText, setThreadReplyText] = useState('');

  // Vault audio/video state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [openVaultCommentId, setOpenVaultCommentId] = useState<string | null>(null);
  const [vaultCommentText, setVaultCommentText] = useState('');

  // Initial Pre-populated Messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      author: 'Odi',
      role: 'CREATOR',
      avatarBg: 'from-amber-400 to-amber-600',
      timestamp: 'Today at 12:30',
      content:
        'Welcome to the Äkinoya Community Hub! This space is reserved for Patrons and Founding Pass holders. Chat in #general, check unreleased animation in #early-access-vault, and cast your votes in #lore-governance.',
      likes: 19,
      hasLiked: false,
      replies: [
        {
          id: 'r1',
          author: 'Elena Vance',
          role: 'PATRON MEMBER',
          avatarBg: 'from-cyan-400 to-blue-600',
          timestamp: 'Today at 12:35',
          content: 'Incredible setup. Love the dark sci-fi aesthetic!',
        },
      ],
    },
    {
      id: 'm2',
      author: 'Elena Vance',
      role: 'PATRON MEMBER',
      avatarBg: 'from-cyan-400 to-blue-600',
      timestamp: 'Today at 13:05',
      content:
        'Just finished reading the 32-page high-res Bingäa digital release. The character designs and atmospheric lore on the twilight world are stunning!',
      likes: 12,
      hasLiked: false,
    },
    {
      id: 'm3',
      author: 'Kaelen Thorne',
      role: 'PATRON MEMBER',
      avatarBg: 'from-emerald-400 to-teal-600',
      timestamp: 'Today at 13:42',
      content:
        'The soundtrack in orbit mode is pure immersion. Has anyone checked out Council Ballot #01 in the governance channel yet?',
      likes: 8,
      hasLiked: false,
    },
    {
      id: 'm4',
      author: 'Cygnus-9',
      role: 'FOUNDING VIP',
      avatarBg: 'from-purple-400 to-indigo-600',
      timestamp: 'Today at 14:10',
      content:
        'Voted for the Obsidian Spire! Looking forward to hearing how the audio synthesizer matrix develops in the upcoming chapter.',
      likes: 15,
      hasLiked: false,
    },
  ]);

  // Announcements Channel Posts
  const [announcements] = useState([
    {
      id: 'a1',
      author: 'Odi (Director & Creator)',
      role: 'CREATOR' as const,
      timestamp: 'OCTOBER 10, 2026 · TRANSMISSION 001',
      title: 'Transmission Genesis: Äkinoya Graphic Novel & Phase 01 Visualizers are LIVE',
      content:
        'Founding Pass holders & Patron community: We have officially deployed the unified Visualizer Hub and the complete 32-page digital graphic novel for Bingäa Issue #01. Work is now underway on the cinematic animation pipeline.',
      imageUrl: bingaaComicCover,
      reactions: { flame: 32, lightning: 24, gem: 41, cosmos: 19 },
    },
    {
      id: 'a2',
      author: 'Odi (Director & Creator)',
      role: 'CREATOR' as const,
      timestamp: 'OCTOBER 08, 2026 · TRANSMISSION 002',
      title: 'Lore Reveal: Coordinates of the Sillow Resonance Field',
      content:
        'Telemetry confirmed at RA 04h 35m / +16° 30\'. The atmospheric density of Äkinoya operates on deterministic vibrational harmonics. Check the early access vault for raw sound stems from our upcoming studio session.',
      imageUrl: akinoyaVistaImg,
      reactions: { flame: 28, lightning: 17, gem: 36, cosmos: 22 },
    },
  ]);

  // Governance Polls
  const [polls, setPolls] = useState<GovernancePoll[]>([
    {
      id: 'poll-1',
      title: 'Council Ballot #01: Chapter 2 Planetary Territory Exploration',
      badge: 'ACTIVE COUNCIL BALLOT',
      description:
        'Patron members vote to determine which territory within Planet Äkinoya will serve as the primary setting for Chapter 2 of the animated story.',
      totalVotes: 89,
      options: [
        { id: 'opt-1', text: 'Sector 04 — The Obsidian Spire & Resonance Core', votes: 41 },
        { id: 'opt-2', text: 'The Neon Archipelago of Upper Äkinoya', votes: 29 },
        { id: 'opt-3', text: 'Sub-Surface Crystal Caverns & Bioluminescent Vault', votes: 19 },
      ],
      userVotedId: undefined,
    },
    {
      id: 'poll-2',
      title: 'Council Ballot #02: Wave 2 Exclusive Physical Artifact',
      badge: 'COMMUNITY PRIORITY',
      description:
        'Which limited physical merchandise item should accompany the next limited drop for verified members?',
      totalVotes: 64,
      options: [
        { id: 'opt-2a', text: 'Heavyweight Screenprinted Graphic Hoodie', votes: 28 },
        { id: 'opt-2b', text: 'Embroidered Äkinoya Pilot Flight Jacket', votes: 24 },
        { id: 'opt-2c', text: 'Anodized Titanium VIP Keycard & Medallion', votes: 12 },
      ],
      userVotedId: undefined,
    },
  ]);

  // Vault items and dedicated comment threads
  const [vaultComments, setVaultComments] = useState<Record<string, ChatReply[]>>({
    'vault-video': [
      {
        id: 'vc1',
        author: 'Elena Vance',
        role: 'PATRON MEMBER',
        avatarBg: 'from-cyan-400 to-blue-600',
        timestamp: '1h ago',
        content: 'The lighting transitions at 00:24 are cinematic perfection.',
      },
      {
        id: 'vc2',
        author: 'Odi',
        role: 'CREATOR',
        avatarBg: 'from-amber-400 to-amber-600',
        timestamp: '30m ago',
        content: 'Thanks Elena! We are rendering the final 4K volumetric fog this week.',
      },
    ],
    'vault-audio': [
      {
        id: 'vc3',
        author: 'Kaelen Thorne',
        role: 'PATRON MEMBER',
        avatarBg: 'from-emerald-400 to-teal-600',
        timestamp: '2h ago',
        content: 'That sub-bass frequency around 01:15 vibrates through studio monitors. Master quality is incredible.',
      },
    ],
  });

  const isSimulatedPatron = patronToken === 'PATRON-TEST-ACCESS';

  // Handle instant test login
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

  // Chat message submit
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() && !selectedImage) return;

    soundManager.playTone(720, 0.06);

    const newMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      author: patronName,
      role: 'PATRON MEMBER',
      avatarBg: 'from-cyan-400 to-indigo-600',
      timestamp: 'Just now',
      content: messageText.trim(),
      imageUrl: selectedImage || undefined,
      likes: 0,
      hasLiked: false,
    };

    setMessages((prev) => [...prev, newMsg]);
    setMessageText('');
    setSelectedImage(null);

    // Scroll chat to bottom
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Handle Like
  const handleToggleLike = (msgId: string) => {
    soundManager.playTone(840, 0.08);
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === msgId) {
          const hasLiked = !msg.hasLiked;
          return {
            ...msg,
            hasLiked,
            likes: hasLiked ? msg.likes + 1 : Math.max(0, msg.likes - 1),
          };
        }
        return msg;
      })
    );
  };

  // Handle Image Selection
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Thread Reply
  const handleSendThreadReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!threadReplyText.trim() || !activeThreadMessage) return;

    soundManager.playTone(780, 0.06);

    const newReply: ChatReply = {
      id: `r_${Date.now()}`,
      author: patronName,
      role: 'PATRON MEMBER',
      avatarBg: 'from-cyan-400 to-indigo-600',
      timestamp: 'Just now',
      content: threadReplyText.trim(),
    };

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === activeThreadMessage.id) {
          return {
            ...msg,
            replies: [...(msg.replies || []), newReply],
          };
        }
        return msg;
      })
    );

    setActiveThreadMessage((prev) =>
      prev ? { ...prev, replies: [...(prev.replies || []), newReply] } : null
    );
    setThreadReplyText('');
  };

  // Submit Vault Comment
  const handleSendVaultComment = (vaultId: string) => {
    if (!vaultCommentText.trim()) return;

    soundManager.playTone(740, 0.06);

    const newReply: ChatReply = {
      id: `vc_${Date.now()}`,
      author: patronName,
      role: 'PATRON MEMBER',
      avatarBg: 'from-cyan-400 to-indigo-600',
      timestamp: 'Just now',
      content: vaultCommentText.trim(),
    };

    setVaultComments((prev) => ({
      ...prev,
      [vaultId]: [...(prev[vaultId] || []), newReply],
    }));

    setVaultCommentText('');
  };

  // Handle Vote on Poll
  const handleCastVote = (pollId: string, optionId: string) => {
    soundManager.playUnlockChime();
    setPolls((prev) =>
      prev.map((poll) => {
        if (poll.id === pollId) {
          const prevVoted = poll.userVotedId;
          const updatedOptions = poll.options.map((opt) => {
            if (opt.id === optionId) {
              return { ...opt, votes: opt.votes + 1 };
            }
            if (prevVoted && opt.id === prevVoted) {
              return { ...opt, votes: Math.max(0, opt.votes - 1) };
            }
            return opt;
          });

          return {
            ...poll,
            options: updatedOptions,
            userVotedId: optionId,
            totalVotes: prevVoted ? poll.totalVotes : poll.totalVotes + 1,
          };
        }
        return poll;
      })
    );
  };

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#04070d] text-white flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Universal Community Header */}
      <header className="relative z-30 w-full border-b border-white/10 bg-[#060a12]/90 backdrop-blur-md px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shrink-0">
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
            <span className="text-xs sm:text-sm font-display font-bold tracking-wider text-white uppercase">
              SILLOW MILL · COMMUNITY HUB
            </span>
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
              <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
              VAULT LEVEL 01
            </span>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isSimulatedPatron ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/40 text-[10.5px] font-mono text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="font-bold">PATRON-TEST-ACCESS</span>
            </div>
          ) : patronToken ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-400/40 text-[10.5px] font-mono text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>ACTIVE PATRON</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleActivateTestAccess}
              className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-[11px] font-mono font-bold transition-all shadow-[0_0_12px_rgba(245,158,11,0.3)] cursor-pointer flex items-center gap-1"
            >
              <span>🧪 1-CLICK DEMO ACCESS</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMembersDrawerOpen(!membersDrawerOpen)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Toggle Members List"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Discord-Style Frame */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Discord Left Channel Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#05080f] border-r border-white/10 flex flex-col transition-transform duration-300 md:static md:translate-x-0 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Server Identity Header */}
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="text-xs font-display font-bold text-white tracking-wider uppercase truncate">
                ÄKINOYA PORTAL
              </h2>
              <div className="text-[10px] font-mono text-cyan-400/80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>38 Patrons Online</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1 text-white/50 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Channel Navigation List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
            {/* Category: Official Transmissions */}
            <div>
              <div className="text-[10px] font-mono font-bold tracking-wider text-white/40 uppercase px-2 mb-1">
                TRANSMISSIONS
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveChannel('announcements');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  activeChannel === 'announcements'
                    ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 font-bold shadow-[0_0_12px_rgba(56,189,248,0.15)]'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-amber-400 text-sm">📣</span>
                  <span className="truncate">announcements</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              </button>
            </div>

            {/* Category: Community Discussion */}
            <div>
              <div className="text-[10px] font-mono font-bold tracking-wider text-white/40 uppercase px-2 mb-1">
                COMMUNITY CHANNELS
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveChannel('general');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  activeChannel === 'general'
                    ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 font-bold shadow-[0_0_12px_rgba(56,189,248,0.15)]'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-cyan-400 text-sm">💬</span>
                  <span className="truncate">general-chat</span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-950/80 px-1.5 py-0.5 rounded-full border border-cyan-500/30">
                  {messages.length}
                </span>
              </button>
            </div>

            {/* Category: Exclusive Vaults */}
            <div>
              <div className="text-[10px] font-mono font-bold tracking-wider text-white/40 uppercase px-2 mb-1">
                PATRON VAULTS
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveChannel('vault');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  activeChannel === 'vault'
                    ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 font-bold shadow-[0_0_12px_rgba(56,189,248,0.15)]'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-purple-400 text-sm">🎬</span>
                  <span className="truncate">early-access-vault</span>
                </div>
                <span className="text-[9px] font-mono text-purple-300 bg-purple-950/80 px-1.5 py-0.5 rounded-full border border-purple-500/30">
                  HQ
                </span>
              </button>
            </div>

            {/* Category: Governance & Voting */}
            <div>
              <div className="text-[10px] font-mono font-bold tracking-wider text-white/40 uppercase px-2 mb-1">
                GOVERNANCE
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveChannel('governance');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  activeChannel === 'governance'
                    ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 font-bold shadow-[0_0_12px_rgba(56,189,248,0.15)]'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-emerald-400 text-sm">🗳️</span>
                  <span className="truncate">lore-governance</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                  VOTE
                </span>
              </button>
            </div>
          </div>

          {/* Discord Bottom User Panel */}
          <div className="p-3 bg-[#03050a] border-t border-white/10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center font-bold text-xs text-black shrink-0 relative">
                PM
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black absolute -bottom-0.5 -right-0.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                  <span>{patronName}</span>
                </div>
                <div className="text-[9.5px] font-mono text-cyan-300 truncate">
                  {patronToken ? 'PATRON MEMBER' : 'GUEST VISITOR'}
                </div>
              </div>
            </div>

            {patronToken && (
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out or reset test pass"
                className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </aside>

        {/* Central Chat / Channel Feed Container */}
        <main className="flex-1 flex flex-col bg-[#070b14] overflow-hidden min-w-0">
          {/* Channel Header Bar */}
          <div className="px-4 py-3 border-b border-white/10 bg-[#070c16]/80 backdrop-blur-md flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-1.5 rounded-lg bg-white/5 text-white/70 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <span className="text-sm">
                {activeChannel === 'announcements' && '📣'}
                {activeChannel === 'general' && '💬'}
                {activeChannel === 'vault' && '🎬'}
                {activeChannel === 'governance' && '🗳️'}
              </span>
              <h1 className="text-sm sm:text-base font-display font-bold text-white uppercase tracking-wide truncate">
                {activeChannel === 'announcements' && 'announcements'}
                {activeChannel === 'general' && 'general-chat'}
                {activeChannel === 'vault' && 'early-access-vault'}
                {activeChannel === 'governance' && 'lore-governance'}
              </h1>
              <div className="hidden sm:inline-block h-3.5 w-px bg-white/20 mx-1" />
              <p className="hidden sm:inline-block text-xs font-mono text-white/50 truncate">
                {activeChannel === 'announcements' && 'Creator updates, official releases & lore reveals'}
                {activeChannel === 'general' && 'Patron discussion, feedback & live comments'}
                {activeChannel === 'vault' && 'Unreleased animation clips, 4K renders & audio masters'}
                {activeChannel === 'governance' && 'Interactive council ballots for future story trajectories'}
              </p>
            </div>

            {/* Channel-specific quick actions */}
            <div className="flex items-center gap-2 shrink-0">
              {activeChannel === 'vault' && (
                <span className="px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-[10px] font-mono text-purple-300">
                  4K / FLAC AUDIO
                </span>
              )}
            </div>
          </div>

          {/* Channel Content Body */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 space-y-4">
            {/* 1. ANNOUNCEMENTS CHANNEL */}
            {activeChannel === 'announcements' && (
              <div className="max-w-4xl mx-auto space-y-6">
                {announcements.map((item) => (
                  <motion.article
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 sm:p-6 rounded-2xl bg-black/60 border border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.08)] relative overflow-hidden"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-400/30">
                        OFFICIAL TRANSMISSION
                      </span>
                      <span className="text-[10px] font-mono text-white/40">{item.timestamp}</span>
                    </div>

                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold text-xs shrink-0">
                        OD
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{item.author}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40">
                            CREATOR
                          </span>
                        </div>
                      </div>
                    </div>

                    <h2 className="text-base sm:text-lg font-display font-bold text-white mb-2 leading-snug">
                      {item.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-sans mb-4">
                      {item.content}
                    </p>

                    {item.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-white/10 mb-4 max-h-80 bg-black/80 flex items-center justify-center">
                        <img
                          src={item.imageUrl}
                          alt="Announcement Visual"
                          className="max-h-80 w-full object-cover"
                        />
                      </div>
                    )}

                    {/* Reactions Bar */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => soundManager.playTone(880, 0.05)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/80 transition-colors cursor-pointer"
                      >
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        <span>{item.reactions.flame}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => soundManager.playTone(880, 0.05)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/80 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{item.reactions.lightning}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => soundManager.playTone(880, 0.05)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/80 transition-colors cursor-pointer"
                      >
                        <span>💎</span>
                        <span>{item.reactions.gem}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => soundManager.playTone(880, 0.05)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/80 transition-colors cursor-pointer"
                      >
                        <span>🌌</span>
                        <span>{item.reactions.cosmos}</span>
                      </button>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}

            {/* 2. GENERAL CHAT CHANNEL */}
            {activeChannel === 'general' && (
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Channel Welcome Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-black/40 to-black/60 border border-cyan-500/20 mb-6 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-display font-bold text-white">
                      Welcome to #💬-general-chat
                    </h3>
                    <p className="text-xs text-white/60 font-sans mt-0.5">
                      This is the start of the general community feed. Discuss lore theories, review the comic, share feedback on soundscapes, and connect with other patrons.
                    </p>
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group p-3.5 sm:p-4 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 hover:border-cyan-500/20 transition-all flex items-start gap-3 relative"
                    >
                      {/* Avatar */}
                      <div
                        className={`w-9 h-9 rounded-full bg-gradient-to-tr ${msg.avatarBg} flex items-center justify-center text-xs font-bold text-black shrink-0 shadow-md`}
                      >
                        {msg.author.slice(0, 2).toUpperCase()}
                      </div>

                      {/* Content Column */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-bold text-white">{msg.author}</span>
                          <span
                            className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded font-semibold uppercase ${
                              msg.role === 'CREATOR'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                                : msg.role === 'FOUNDING VIP'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                            }`}
                          >
                            {msg.role}
                          </span>
                          <span className="text-[10px] font-mono text-white/40">{msg.timestamp}</span>
                        </div>

                        <p className="text-xs sm:text-sm text-white/85 leading-relaxed font-sans whitespace-pre-line">
                          {msg.content}
                        </p>

                        {/* Attached Image if any */}
                        {msg.imageUrl && (
                          <div className="mt-2.5 rounded-lg overflow-hidden border border-white/10 max-w-sm">
                            <img
                              src={msg.imageUrl}
                              alt="User uploaded attachment"
                              className="max-h-60 w-auto object-cover rounded-lg"
                            />
                          </div>
                        )}

                        {/* Interactive Message Actions Bar */}
                        <div className="mt-2 flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleToggleLike(msg.id)}
                            className={`flex items-center gap-1.5 px-2 py-0.8 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                              msg.hasLiked
                                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-bold'
                                : 'text-white/50 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <ThumbsUp className={`w-3 h-3 ${msg.hasLiked ? 'text-cyan-400' : ''}`} />
                            <span>{msg.likes > 0 ? msg.likes : 'Like'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveThreadMessage(msg)}
                            className="flex items-center gap-1.5 px-2 py-0.8 rounded text-[11px] font-mono text-white/50 hover:text-cyan-300 hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>
                              {msg.replies && msg.replies.length > 0
                                ? `${msg.replies.length} replies`
                                : 'Reply'}
                            </span>
                          </button>
                        </div>

                        {/* Inline replies preview */}
                        {msg.replies && msg.replies.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-white/5 space-y-1.5">
                            {msg.replies.map((r) => (
                              <div
                                key={r.id}
                                className="flex items-start gap-2 bg-white/[0.02] p-2 rounded-lg text-xs"
                              >
                                <span className="font-bold text-cyan-300 text-[11px]">{r.author}:</span>
                                <span className="text-white/70 text-[11px]">{r.content}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  <div ref={chatBottomRef} />
                </div>
              </div>
            )}

            {/* 3. EARLY ACCESS VAULT CHANNEL */}
            {activeChannel === 'vault' && (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Vault Item 1: Animated Sequence Reel */}
                <div className="p-5 sm:p-6 rounded-2xl bg-black/60 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.1)] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-400/40">
                        VAULT ASSET 01 · 4K ANIMATION
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">● ENCRYPTED FEED</span>
                    </div>
                    <span className="text-[10px] font-mono text-white/50">SEQUENCE 02 · RENDER PASS 4</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-display font-bold text-white">
                    Bingäa: Behind-the-Scenes Volumetric Sequence (4K UHD)
                  </h3>

                  <p className="text-xs sm:text-sm text-white/70 font-sans">
                    Preliminary lighting pass demonstrating the twilight atmospheric ionization over Sector 02. Sound design stems integrated directly into audio timeline.
                  </p>

                  {/* Video Mockup Frame with Playback Controls */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black/90 border border-purple-500/30 flex items-center justify-center group shadow-inner">
                    <img
                      src={akinoyaVistaImg}
                      alt="Animation preview"
                      className="absolute inset-0 w-full h-full object-cover opacity-60 filter blur-[0.5px]"
                    />

                    {/* Sci-fi Telemetry HUD Overlay */}
                    <div className="absolute inset-0 p-3 sm:p-4 flex flex-col justify-between pointer-events-none">
                      <div className="flex items-center justify-between text-[10px] font-mono text-purple-300">
                        <span>FPS: 60.00 · PRORES 4444</span>
                        <span>WATERMARK: PATRON #{patronName}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
                        <span>00:18 / 02:45</span>
                        <span>SILLOW MILL ANIMATION STUDIO</span>
                      </div>
                    </div>

                    {/* Play/Pause Trigger Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsVideoPlaying(!isVideoPlaying);
                        soundManager.playTone(560, 0.08);
                      }}
                      className="relative z-10 w-14 h-14 rounded-full bg-purple-500/80 hover:bg-purple-400 text-black flex items-center justify-center transition-transform hover:scale-110 shadow-[0_0_20px_rgba(168,85,247,0.5)] cursor-pointer"
                    >
                      {isVideoPlaying ? <Pause className="w-6 h-6 fill-black" /> : <Play className="w-6 h-6 fill-black ml-0.5" />}
                    </button>
                  </div>

                  {/* Vault Item Comment Drawer Trigger */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenVaultCommentId(openVaultCommentId === 'vault-video' ? null : 'vault-video')
                      }
                      className="flex items-center gap-2 text-xs font-mono text-purple-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>
                        {vaultComments['vault-video']?.length || 0} Comments &amp; Feedback
                      </span>
                    </button>
                  </div>

                  {/* Collapsible Comment Drawer for Video */}
                  {openVaultCommentId === 'vault-video' && (
                    <div className="mt-3 p-3.5 rounded-xl bg-black/80 border border-purple-500/20 space-y-3">
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {vaultComments['vault-video']?.map((c) => (
                          <div key={c.id} className="text-xs p-2 rounded bg-white/[0.03] border border-white/5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-purple-300 text-[11px]">{c.author}</span>
                              <span className="text-[9px] font-mono text-white/40">{c.timestamp}</span>
                            </div>
                            <p className="text-white/80">{c.content}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={vaultCommentText}
                          onChange={(e) => setVaultCommentText(e.target.value)}
                          placeholder="Leave feedback on this sequence..."
                          className="flex-1 bg-black/60 border border-white/15 focus:border-purple-400 rounded-lg px-3 py-1.5 text-xs text-white outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleSendVaultComment('vault-video')}
                          className="px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-black font-mono font-bold text-xs transition-colors cursor-pointer"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Vault Item 2: Unreleased Studio Master Track */}
                <div className="p-5 sm:p-6 rounded-2xl bg-black/60 border border-cyan-500/30 shadow-[0_0_30px_rgba(56,189,248,0.1)] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-400/40">
                        VAULT ASSET 02 · UNRELEASED AUDIO
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400">96kHz / 24-BIT FLAC</span>
                    </div>
                    <span className="text-[10px] font-mono text-white/50">TRACK 12 · UNTITLED DRIFT</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-display font-bold text-white">
                    Sub-Orbital Drift — Unreleased VIP Studio Master
                  </h3>

                  <p className="text-xs sm:text-sm text-white/70 font-sans">
                    Unreleased ambient electronic piece designed for the high-altitude entry sequence of Äkinoya. Exclusively available to Patrons prior to official DSP streaming release.
                  </p>

                  {/* Audio Player Container */}
                  <div className="p-4 rounded-xl bg-[#080d17] border border-cyan-500/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsPlayingAudio(!isPlayingAudio);
                          soundManager.playTone(600, 0.08);
                        }}
                        className="w-11 h-11 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center transition-all cursor-pointer shadow-[0_0_15px_rgba(56,189,248,0.3)] shrink-0"
                      >
                        {isPlayingAudio ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-0.5" />}
                      </button>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-white">Sub-Orbital Drift</div>
                        <div className="text-[10px] font-mono text-cyan-300">03:42 · Studio Master Mix</div>
                      </div>
                    </div>

                    {/* Animated Pulsing Waveform Bars */}
                    <div className="flex items-center gap-1 h-8">
                      {[30, 60, 90, 45, 80, 100, 75, 40, 65, 85, 55, 95, 70, 50].map((h, i) => (
                        <div
                          key={i}
                          className="w-1 rounded-full bg-cyan-400 transition-all duration-200"
                          style={{
                            height: isPlayingAudio ? `${h}%` : '20%',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Vault Audio Comment Drawer Trigger */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenVaultCommentId(openVaultCommentId === 'vault-audio' ? null : 'vault-audio')
                      }
                      className="flex items-center gap-2 text-xs font-mono text-cyan-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>
                        {vaultComments['vault-audio']?.length || 0} Soundboard Discussion Comments
                      </span>
                    </button>
                  </div>

                  {/* Collapsible Comment Drawer for Audio */}
                  {openVaultCommentId === 'vault-audio' && (
                    <div className="mt-3 p-3.5 rounded-xl bg-black/80 border border-cyan-500/20 space-y-3">
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {vaultComments['vault-audio']?.map((c) => (
                          <div key={c.id} className="text-xs p-2 rounded bg-white/[0.03] border border-white/5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-cyan-300 text-[11px]">{c.author}</span>
                              <span className="text-[9px] font-mono text-white/40">{c.timestamp}</span>
                            </div>
                            <p className="text-white/80">{c.content}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={vaultCommentText}
                          onChange={(e) => setVaultCommentText(e.target.value)}
                          placeholder="Share feedback on this mix..."
                          className="flex-1 bg-black/60 border border-white/15 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleSendVaultComment('vault-audio')}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs transition-colors cursor-pointer"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. LORE GOVERNANCE CHANNEL */}
            {activeChannel === 'governance' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <Vote className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-display font-bold text-white">
                      Patron Lore Governance Node
                    </h3>
                    <p className="text-xs text-white/70 font-sans mt-0.5">
                      As a verified Patron or Founding Pass holder, you hold binding voting rights on character development, narrative branches, and production priorities.
                    </p>
                  </div>
                </div>

                {polls.map((poll) => (
                  <motion.div
                    key={poll.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 sm:p-6 rounded-2xl bg-black/60 border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.1)] space-y-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-400/40">
                        {poll.badge}
                      </span>
                      <span className="text-xs font-mono text-white/50">{poll.totalVotes} Total Votes</span>
                    </div>

                    <h2 className="text-base sm:text-lg font-display font-bold text-white leading-snug">
                      {poll.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-white/70 font-sans">
                      {poll.description}
                    </p>

                    {/* Voting Options */}
                    <div className="space-y-3 pt-2">
                      {poll.options.map((option) => {
                        const pct = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
                        const isUserChoice = poll.userVotedId === option.id;

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleCastVote(poll.id, option.id)}
                            className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                              isUserChoice
                                ? 'bg-emerald-950/60 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                                : 'bg-black/50 border-white/10 hover:border-emerald-500/40 text-white/80'
                            }`}
                          >
                            {/* Animated Percentage Fill Bar */}
                            <div
                              className="absolute inset-y-0 left-0 bg-emerald-500/15 pointer-events-none transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />

                            <div className="relative z-10 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                    isUserChoice
                                      ? 'border-emerald-400 bg-emerald-400'
                                      : 'border-white/30 group-hover:border-emerald-400'
                                  }`}
                                >
                                  {isUserChoice && <CheckCircle2 className="w-3 h-3 text-black" />}
                                </div>
                                <span className="text-xs sm:text-sm font-semibold truncate">
                                  {option.text}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                                <span className="text-emerald-400 font-bold">{pct}%</span>
                                <span className="text-white/40 text-[11px]">({option.votes})</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {poll.userVotedId && (
                      <div className="pt-2 flex items-center gap-1.5 text-[11px] font-mono text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Your ballot has been cast and cryptographically tallied.</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Chat Message Creation Box (Available on #general-chat) */}
          {activeChannel === 'general' && (
            <div className="p-3 sm:p-4 bg-[#050810] border-t border-white/10 shrink-0">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto space-y-2">
                {/* Image upload preview chip */}
                {selectedImage && (
                  <div className="flex items-center gap-2 bg-black/60 p-2 rounded-lg border border-cyan-500/30 w-fit">
                    <img
                      src={selectedImage}
                      alt="Selected upload"
                      className="w-12 h-12 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedImage(null)}
                      className="p-1 text-white/50 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 bg-black/80 border border-white/15 focus-within:border-cyan-400 rounded-xl px-3 py-2 transition-all">
                  {/* File Upload Trigger */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload image / artwork"
                    className="p-1.5 text-white/40 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={`Message #💬-general-chat as ${patronName}...`}
                    className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none font-sans"
                  />

                  <button
                    type="submit"
                    disabled={!messageText.trim() && !selectedImage}
                    className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-cyan-500 text-black transition-all cursor-pointer shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-white/35 px-1">
                  <span>Press [Enter] to send · Markdown &amp; images supported</span>
                  <span className="text-cyan-400">PATRON STATUS VERIFIED</span>
                </div>
              </form>
            </div>
          )}
        </main>

        {/* Discord Right Members Sidebar (Desktop Collapsible) */}
        {membersDrawerOpen && (
          <aside className="w-60 bg-[#05080f] border-l border-white/10 hidden lg:flex flex-col p-3.5 space-y-4 shrink-0 overflow-y-auto">
            <div>
              <div className="text-[10px] font-mono font-bold tracking-wider text-amber-400 uppercase px-2 mb-2">
                CREATORS — 1
              </div>
              <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02]">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center font-bold text-[10px] text-black">
                  OD
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                    <span>Odi</span>
                    <Crown className="w-3 h-3 text-amber-400" />
                  </div>
                  <div className="text-[9px] font-mono text-white/40">Director &amp; Creator</div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono font-bold tracking-wider text-cyan-400 uppercase px-2 mb-2">
                PATRON MEMBERS — 4
              </div>
              <div className="space-y-1.5">
                {[
                  { name: 'Elena Vance', role: 'PATRON', color: 'from-cyan-400 to-blue-600' },
                  { name: 'Kaelen Thorne', role: 'PATRON', color: 'from-emerald-400 to-teal-600' },
                  { name: 'Cygnus-9', role: 'VIP #01', color: 'from-purple-400 to-indigo-600' },
                  { name: patronName, role: 'YOU', color: 'from-cyan-400 to-indigo-600' },
                ].map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                  >
                    <div
                      className={`w-7 h-7 rounded-full bg-gradient-to-tr ${m.color} flex items-center justify-center font-bold text-[10px] text-black shrink-0`}
                    >
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{m.name}</div>
                      <div className="text-[9px] font-mono text-cyan-300/80">{m.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 text-[10px] font-mono text-white/30 text-center">
              38 Active in Voice / Canvas
            </div>
          </aside>
        )}
      </div>

      {/* Thread Reply Drawer Modal */}
      <AnimatePresence>
        {activeThreadMessage && (
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
                    onClick={() => setActiveThreadMessage(null)}
                    className="p-1 rounded text-white/50 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Original Parent Message */}
                <div className="p-3 my-3 rounded-xl bg-white/5 border border-white/5 text-xs">
                  <div className="font-bold text-cyan-300 mb-1">{activeThreadMessage.author}</div>
                  <p className="text-white/80">{activeThreadMessage.content}</p>
                </div>

                {/* Replies Feed */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {activeThreadMessage.replies?.map((r) => (
                    <div key={r.id} className="p-2.5 rounded-lg bg-black/60 border border-white/5 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white">{r.author}</span>
                        <span className="text-[9px] font-mono text-white/40">{r.timestamp}</span>
                      </div>
                      <p className="text-white/80">{r.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reply Input Box */}
              <form onSubmit={handleSendThreadReply} className="pt-3 border-t border-white/10 flex gap-2">
                <input
                  type="text"
                  value={threadReplyText}
                  onChange={(e) => setThreadReplyText(e.target.value)}
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

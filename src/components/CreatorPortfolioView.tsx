import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Share2,
  Sparkles,
  Trophy,
  ShieldCheck,
  Music,
  Download,
  ExternalLink,
  Check,
  Copy,
  Send,
  X,
  Layers,
  FileAudio,
  Eye,
  Play,
  Globe,
  Sliders,
  Crown,
  UserCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  CreatorProfile,
  ShowcaseItem,
  getStoredCreators,
  getCreatorByUsername,
  hasUserLikedCreator,
  toggleCreatorLike,
  sendP2PTransmission,
} from '../data/creators';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../utils/audio';
import { CreatorLeaderboard } from './CreatorLeaderboard';

interface CreatorPortfolioViewProps {
  username?: string | null;
  onBackToCommunity: () => void;
  onBackToHome: () => void;
  onNavigateToCreator?: (username: string) => void;
}

export const CreatorPortfolioView: React.FC<CreatorPortfolioViewProps> = ({
  username,
  onBackToCommunity,
  onBackToHome,
  onNavigateToCreator,
}) => {
  const { user, profile, isAuthenticated, openAuthModal } = useAuth();
  const allCreators = getStoredCreators();

  // Find target creator or fallback to primary founder
  const targetUsername = username || 'odi';
  const [creator, setCreator] = useState<CreatorProfile>(() => {
    return getCreatorByUsername(targetUsername) || allCreators[0];
  });

  const [activeTab, setActiveTab] = useState<'ALL' | 'AUDIO' | '3D_RENDER' | 'DAW_TEMPLATE' | 'LORE'>('ALL');
  const [isLiked, setIsLiked] = useState<boolean>(() => hasUserLikedCreator(creator.id, user?.id));
  const [likesCount, setLikesCount] = useState<number>(creator.likesCount);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isP2PModalOpen, setIsP2PModalOpen] = useState<boolean>(false);
  const [isLeaderboardDrawerOpen, setIsLeaderboardDrawerOpen] = useState<boolean>(false);

  // P2P Transmission Form State
  const [p2pSubject, setP2PSubject] = useState<string>('');
  const [p2pType, setP2PType] = useState<
    'Collaboration Proposal' | 'Production Inquiry' | 'Stem Request' | 'General Feedback'
  >('Collaboration Proposal');
  const [p2pMessage, setP2PMessage] = useState<string>('');
  const [p2pLink, setP2PLink] = useState<string>('');
  const [p2pSubmitting, setP2PSubmitting] = useState<boolean>(false);
  const [p2pSuccess, setP2PSuccess] = useState<boolean>(false);

  // Sync when username changes
  useEffect(() => {
    const fresh = getCreatorByUsername(targetUsername) || allCreators[0];
    setCreator(fresh);
    setLikesCount(fresh.likesCount);
    setIsLiked(hasUserLikedCreator(fresh.id, user?.id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [targetUsername, user?.id]);

  // Rank calculation for "Portfolio of the Month"
  const rankedCreators = [...allCreators].sort((a, b) => b.likesCount - a.likesCount);
  const isPortfolioOfTheMonth = rankedCreators[0]?.id === creator.id;
  const currentRank = rankedCreators.findIndex((c) => c.id === creator.id) + 1;

  // Handle Like Toggle
  const handleLike = async () => {
    soundManager.playTone(720, 0.08);
    const result = await toggleCreatorLike(creator.id, user?.id);
    if (result.success) {
      setIsLiked(result.isLiked);
      setLikesCount(result.newLikeCount);
      if (result.isLiked) {
        soundManager.playUnlockChime();
        confetti({
          particleCount: 50,
          spread: 50,
          origin: { y: 0.6 },
          colors: ['#f43f5e', '#ec4899', '#22d3ee', '#fbbf24'],
        });
      }
    }
  };

  // Copy Profile URL
  const handleCopyShare = () => {
    soundManager.playTone(660, 0.04);
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/creators/${creator.username}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2200);
      });
    }
  };

  // Handle P2P Transmission Submission
  const handleP2PSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!p2pMessage.trim() || !p2pSubject.trim()) return;

    setP2PSubmitting(true);
    soundManager.playTone(620, 0.06);

    const senderName =
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.email?.split('@')[0] ||
      'Syndicate Member';

    await sendP2PTransmission({
      senderName,
      senderEmail: user?.email,
      recipientUsername: creator.username,
      subject: p2pSubject,
      transmissionType: p2pType,
      message: p2pMessage,
      externalLink: p2pLink || undefined,
    });

    setP2PSubmitting(false);
    setP2PSuccess(true);
    soundManager.playUnlockChime();

    setTimeout(() => {
      setP2PSuccess(false);
      setIsP2PModalOpen(false);
      setP2PSubject('');
      setP2PMessage('');
      setP2PLink('');
    }, 2000);
  };

  // Filter showcase items
  const filteredShowcase = creator.showcaseItems.filter((item) => {
    if (activeTab === 'ALL') return true;
    return item.type === activeTab;
  });

  return (
    <div className="relative z-20 w-full max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10 text-white font-sans">
      {/* Top Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToCommunity}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer min-h-[40px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Comm-Net</span>
          </button>

          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono text-white/50 hover:text-white transition-colors cursor-pointer min-h-[40px]"
          >
            <span>Home</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsLeaderboardDrawerOpen(!isLeaderboardDrawerOpen)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-amber-300 bg-amber-950/40 hover:bg-amber-950/60 border border-amber-500/40 transition-colors cursor-pointer min-h-[40px] shadow-[0_0_15px_rgba(245,158,11,0.2)]"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Leaderboard Rankings</span>
          </button>

          <button
            type="button"
            onClick={handleCopyShare}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer min-h-[40px]"
            title="Share Portfolio URL"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Leaderboard Drawer Modal if toggled */}
      {isLeaderboardDrawerOpen && (
        <div className="mb-8 p-4 sm:p-6 rounded-2xl bg-[#090d16] border border-amber-500/40 shadow-[0_0_40px_rgba(245,158,11,0.15)] relative">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                Syndicate Creator Leaderboard
              </h3>
            </div>
            <button
              onClick={() => setIsLeaderboardDrawerOpen(false)}
              className="p-1 rounded-lg text-white/50 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <CreatorLeaderboard
            selectedUsername={creator.username}
            onSelectCreator={(u) => {
              setIsLeaderboardDrawerOpen(false);
              if (onNavigateToCreator) onNavigateToCreator(u);
              else {
                const fresh = getCreatorByUsername(u);
                if (fresh) {
                  setCreator(fresh);
                  setLikesCount(fresh.likesCount);
                  setIsLiked(hasUserLikedCreator(fresh.id, user?.id));
                }
              }
            }}
          />
        </div>
      )}

      {/* Portfolio of the Month Golden Banner (if ranked #1) */}
      {isPortfolioOfTheMonth && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-950/80 via-yellow-950/60 to-amber-950/80 border border-amber-400/50 shadow-[0_0_30px_rgba(245,158,11,0.25)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-400 text-black shrink-0">
              <Trophy className="w-5 h-5 fill-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-amber-300">
                  PORTFOLIO OF THE MONTH
                </span>
                <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
              </div>
              <p className="text-xs text-amber-100/90 font-sans">
                Ranked #1 on the Comm-Net Creator Leaderboard with {likesCount} community appreciations.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-mono font-extrabold bg-amber-400 text-black">
            #1 COMMUNITY CHOICE
          </span>
        </div>
      )}

      {/* Creator Hero Card */}
      <div className="rounded-3xl bg-[#090d16] border border-cyan-500/30 p-6 sm:p-8 shadow-[0_0_40px_rgba(6,182,212,0.12)] space-y-6 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Avatar and Identity */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-6">
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-gradient-to-tr ${creator.avatarGradient} p-1 shadow-[0_0_30px_rgba(6,182,212,0.3)] shrink-0 flex items-center justify-center`}
            >
              <div className="w-full h-full rounded-[14px] sm:rounded-[22px] bg-black/40 backdrop-blur-sm flex items-center justify-center font-mono font-extrabold text-2xl sm:text-3xl text-white">
                {creator.fullName.substring(0, 2).toUpperCase()}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-3xl font-display font-extrabold text-white tracking-wide">
                  {creator.fullName}
                </h1>
                <span className="text-xs sm:text-sm font-mono text-cyan-400">@{creator.username}</span>
              </div>

              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {creator.role === 'CREATOR' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                    👑 CREATOR / FOUNDER
                  </span>
                )}
                {creator.role === 'ANNUAL_PASS' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-400 text-black">
                    ANNUAL PASS
                  </span>
                )}
                {creator.role === 'VIP_GUEST' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-400 text-black">
                    VIP GUEST
                  </span>
                )}
                {creator.isArtist && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-violet-950/80 text-violet-300 border border-violet-500/40 flex items-center gap-1">
                    <Music className="w-3 h-3 text-violet-400" />
                    <span>VERIFIED ARTIST</span>
                  </span>
                )}
                {creator.hasVipPass && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-cyan-400" />
                    <span>{creator.vipEdition || 'VIP PASS'}</span>
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm font-mono text-white/70">{creator.headline}</p>
            </div>
          </div>

          {/* Action CTAs: Like & P2P Message */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
            {/* Interactive Like Button */}
            <button
              type="button"
              onClick={handleLike}
              className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px] ${
                isLiked
                  ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] scale-105'
                  : 'bg-white/5 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-500/60'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-white' : 'fill-rose-500 text-rose-500'}`} />
              <span>{isLiked ? 'Appreciated' : 'Appreciate'}</span>
              <span className="px-1.5 py-0.2 rounded-md bg-black/40 text-[11px] font-mono font-semibold">
                {likesCount}
              </span>
            </button>

            {/* P2P Transmission CTA */}
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) {
                  openAuthModal('signin');
                } else {
                  soundManager.playTone(660, 0.05);
                  setIsP2PModalOpen(true);
                }
              }}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.3)] flex items-center justify-center gap-2 min-h-[44px]"
            >
              <MessageSquare className="w-4 h-4 text-black" />
              <span>P2P Direct Message</span>
            </button>
          </div>
        </div>

        {/* Bio & Details */}
        <div className="relative z-10 pt-4 border-t border-white/10 space-y-4">
          <p className="text-xs sm:text-sm font-sans text-white/80 leading-relaxed max-w-3xl">
            {creator.bio}
          </p>

          {/* Metadata Row: Location, Joined, Skills, Socials */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            {/* Skills Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {creator.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold bg-black/60 border border-white/10 text-cyan-200"
                >
                  {skill}
                </span>
              ))}
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-2">
              {creator.socialLinks.soundcloud && (
                <a
                  href={creator.socialLinks.soundcloud}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-white/5 hover:bg-orange-500/20 text-orange-400 border border-white/10 hover:border-orange-500/40 transition-colors"
                  title="SoundCloud"
                >
                  <Music className="w-3.5 h-3.5" />
                </a>
              )}
              {creator.socialLinks.spotify && (
                <a
                  href={creator.socialLinks.spotify}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-emerald-400 border border-white/10 hover:border-emerald-500/40 transition-colors"
                  title="Spotify"
                >
                  <Play className="w-3.5 h-3.5" />
                </a>
              )}
              {creator.socialLinks.artstation && (
                <a
                  href={creator.socialLinks.artstation}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-cyan-400 border border-white/10 hover:border-cyan-500/40 transition-colors"
                  title="ArtStation"
                >
                  <Layers className="w-3.5 h-3.5" />
                </a>
              )}
              {creator.socialLinks.twitter && (
                <a
                  href={creator.socialLinks.twitter}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-white/5 hover:bg-sky-500/20 text-sky-400 border border-white/10 hover:border-sky-500/40 transition-colors"
                  title="Twitter / X"
                >
                  <Globe className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Showcase Section */}
      <div className="mt-10 sm:mt-12 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base sm:text-lg font-display font-bold uppercase tracking-wider text-white">
              Creative Vault &amp; Showcase
            </h2>
            <span className="text-xs font-mono text-white/40">({creator.showcaseItems.length} items)</span>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-black/60 rounded-xl border border-white/10 text-xs font-mono">
            {(['ALL', 'AUDIO', '3D_RENDER', 'DAW_TEMPLATE', 'LORE'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  soundManager.playTone(560, 0.03);
                  setActiveTab(tab);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-cyan-500 text-black font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {tab === 'ALL'
                  ? 'All Works'
                  : tab === 'AUDIO'
                  ? 'Audio Masters'
                  : tab === '3D_RENDER'
                  ? '3D & Visualizers'
                  : tab === 'DAW_TEMPLATE'
                  ? 'DAW Templates'
                  : 'Lore'}
              </button>
            ))}
          </div>
        </div>

        {/* Showcase Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredShowcase.map((item) => (
            <div
              key={item.id}
              className="group rounded-2xl bg-[#090d16] border border-white/10 hover:border-cyan-500/40 transition-all overflow-hidden flex flex-col shadow-lg hover:shadow-[0_0_25px_rgba(6,182,212,0.15)]"
            >
              {/* Media Preview Image */}
              {item.mediaUrl && (
                <div className="relative aspect-video w-full overflow-hidden bg-black/60">
                  <img
                    src={item.mediaUrl}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-transparent to-transparent opacity-80" />

                  {/* Type Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold bg-black/80 backdrop-blur-md text-cyan-300 border border-cyan-500/30">
                      {item.type}
                    </span>
                  </div>
                </div>
              )}

              {/* Item Info */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-white/70 font-sans line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Tags and Stats */}
                <div className="pt-2 border-t border-white/5 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-1">
                    {item.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-2 py-0.5 rounded text-[9px] font-mono bg-white/5 text-white/50"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-white/40">
                    <div className="flex items-center gap-3">
                      {item.stats?.plays && <span>▶ {item.stats.plays} plays</span>}
                      {item.stats?.views && <span>👁 {item.stats.views} views</span>}
                      {item.stats?.downloads && <span>⬇ {item.stats.downloads}</span>}
                    </div>

                    <span className="text-cyan-400 font-semibold group-hover:underline">
                      Explore Asset →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* P2P Direct Message / Collaboration Transmission Modal */}
      {isP2PModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#090d16] border border-cyan-500/40 p-5 sm:p-7 shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                  Direct P2P Transmission · @{creator.username}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsP2PModalOpen(false)}
                className="p-1 rounded-lg text-white/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {p2pSuccess ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">Transmission Sent!</h4>
                <p className="text-xs text-white/60 font-mono">
                  Your message has been dispatched to @{creator.username}&apos;s Comm-Net inbox.
                </p>
              </div>
            ) : (
              <form onSubmit={handleP2PSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-white/70 block">
                    Transmission Type
                  </label>
                  <select
                    value={p2pType}
                    onChange={(e) => setP2PType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-mono outline-none focus:border-cyan-400"
                  >
                    <option value="Collaboration Proposal">🤝 Collaboration Proposal</option>
                    <option value="Production Inquiry">🎛 Production Inquiry</option>
                    <option value="Stem Request">🎵 Stem / Remix Request</option>
                    <option value="General Feedback">💬 General Feedback</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-white/70 block">
                    Subject / Project Title <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={p2pSubject}
                    onChange={(e) => setP2PSubject(e.target.value)}
                    placeholder="e.g. 3D Audio Visualizer Collaboration for Track 2"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs sm:text-sm font-sans outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-white/70 block">
                    Transmission Body <span className="text-cyan-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={p2pMessage}
                    onChange={(e) => setP2PMessage(e.target.value)}
                    placeholder="Detail your idea, stems timeline, or technical requirements..."
                    className="w-full p-3.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs sm:text-sm font-sans outline-none focus:border-cyan-400 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-white/70 block">
                    External Demo / Stems Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={p2pLink}
                    onChange={(e) => setP2PLink(e.target.value)}
                    placeholder="https://soundcloud.com/... or Google Drive link"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-mono outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsP2PModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl font-mono text-xs text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={p2pSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Transmit Message</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

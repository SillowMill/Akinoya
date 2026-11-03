import React, { useMemo, useState } from 'react';
import {
  Archive,
  ArrowRight,
  Bookmark,
  BookOpen,
  CalendarClock,
  Check,
  Crown,
  Download,
  ExternalLink,
  Film,
  Hash,
  Link2,
  Lock,
  Megaphone,
  MessagesSquare,
  MicVocal,
  Pin,
  Send,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { TwoColumnPricingSection } from './TwoColumnPricingSection';
import {
  ANNOUNCEMENTS,
  DROP_SCHEDULE,
  FEATURED_FEEDBACK,
  LOUNGE_CHANNELS,
  LOUNGE_WELCOME,
  PIONEER_MEMBERSHIP,
  VAULT_PRODUCTS,
  formatEuro,
  getSeparateDigitalTotal,
  isDropLive,
  type LoungeChannelId,
  type PioneerDrop,
  type VaultProduct,
} from '../data/pioneerVault';

interface PioneerLoungeProps {
  isMember: boolean;
  isAuthenticated: boolean;
  userDisplayName: string;
  onOpenAuthModal: () => void;
  onOpenUpgradeModal: (reason: string) => void;
  onNavigateToVault: (folderId?: string) => void;
}

interface LocalFeedbackPost {
  id: string;
  author: string;
  title: string;
  url: string;
  note: string;
  createdAt: number;
}

const FEEDBACK_STORAGE_KEY = 'akinoya_pioneer_feedback_v1';
const FEEDBACK_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const UPGRADE_REASON =
  'Pioneer Membership (€60/year, ~€5/month) unlocks the complete Vault: Vocal Acapella & Remix Pack, all Production & Workflow Assets, the Digital Art Book and a new drop every month. Launches January 9, 2027.';

const CHANNEL_ICONS: Record<LoungeChannelId, React.ElementType> = {
  announcements: Megaphone,
  'the-vault': Archive,
  'community-feedback': MessagesSquare,
};

const PRODUCT_ICONS: Record<VaultProduct['kind'], React.ElementType> = {
  audio: MicVocal,
  production: Sliders,
  artbook: BookOpen,
  comic: Bookmark,
};

const DROP_ICONS: Record<PioneerDrop['kind'], React.ElementType> = {
  audio: MicVocal,
  video: Film,
  art: BookOpen,
  session: Sparkles,
};

const formatDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const loadLocalFeedback = (): LocalFeedbackPost[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const isValidHttpUrl = (value: string) => {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};

export const PioneerLounge: React.FC<PioneerLoungeProps> = ({
  isMember,
  isAuthenticated,
  userDisplayName,
  onOpenAuthModal,
  onOpenUpgradeModal,
  onNavigateToVault,
}) => {
  const [activeChannel, setActiveChannel] = useState<LoungeChannelId>(() => {
    if (typeof window === 'undefined') return 'announcements';
    const saved = sessionStorage.getItem('akinoya_lounge_channel') as LoungeChannelId | null;
    return saved && LOUNGE_CHANNELS.some((c) => c.id === saved) ? saved : 'announcements';
  });
  const [feedbackPosts, setFeedbackPosts] = useState<LocalFeedbackPost[]>(loadLocalFeedback);
  const [fbTitle, setFbTitle] = useState('');
  const [fbUrl, setFbUrl] = useState('');
  const [fbNote, setFbNote] = useState('');
  const [fbError, setFbError] = useState<string | null>(null);
  const [fbSuccess, setFbSuccess] = useState(false);

  const separateTotal = useMemo(() => getSeparateDigitalTotal(), []);
  const savings = Math.max(0, separateTotal - PIONEER_MEMBERSHIP.pricePerYear);
  const now = useMemo(() => new Date(), []);

  const sortedAnnouncements = useMemo(
    () =>
      [...ANNOUNCEMENTS].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.date.localeCompare(a.date);
      }),
    []
  );

  const lastOwnSubmission = useMemo(
    () =>
      feedbackPosts
        .filter((p) => p.author === userDisplayName)
        .reduce((max, p) => Math.max(max, p.createdAt), 0),
    [feedbackPosts, userDisplayName]
  );
  const cooldownActive = lastOwnSubmission > 0 && Date.now() - lastOwnSubmission < FEEDBACK_COOLDOWN_MS;

  const switchChannel = (id: LoungeChannelId) => {
    soundManager.playTone(600, 0.04);
    setActiveChannel(id);
    try {
      sessionStorage.setItem('akinoya_lounge_channel', id);
    } catch {}
  };

  const openUpgrade = () => {
    soundManager.playTone(520, 0.05);
    if (!isAuthenticated) {
      onOpenAuthModal();
      return;
    }
    onOpenUpgradeModal(UPGRADE_REASON);
  };

  const handleOpenDrop = (drop: PioneerDrop) => {
    if (!isMember) {
      openUpgrade();
      return;
    }
    soundManager.playTone(760, 0.05);
    if (drop.downloadUrl) {
      window.open(drop.downloadUrl, '_blank', 'noopener,noreferrer');
    } else if (drop.vaultFolderId) {
      onNavigateToVault(drop.vaultFolderId);
    }
  };

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    setFbError(null);
    setFbSuccess(false);
    if (!isAuthenticated) {
      onOpenAuthModal();
      return;
    }
    if (!isMember) {
      openUpgrade();
      return;
    }
    if (cooldownActive) {
      setFbError('One submission per day keeps the lounge high-signal. Come back tomorrow.');
      return;
    }
    if (!fbTitle.trim() || !isValidHttpUrl(fbUrl)) {
      setFbError('Add a title and a valid link (SoundCloud, YouTube, Drive, Instagram, etc.).');
      return;
    }
    const post: LocalFeedbackPost = {
      id: `fb-${Date.now()}`,
      author: userDisplayName,
      title: fbTitle.trim().slice(0, 90),
      url: fbUrl.trim(),
      note: fbNote.trim().slice(0, 280),
      createdAt: Date.now(),
    };
    const next = [post, ...feedbackPosts].slice(0, 50);
    setFeedbackPosts(next);
    try {
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(next));
    } catch {}
    soundManager.playTone(820, 0.06);
    setFbTitle('');
    setFbUrl('');
    setFbNote('');
    setFbSuccess(true);
  };

  const MemberCta = ({ compact = false }: { compact?: boolean }) =>
    isMember ? (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-400/40 text-emerald-300 text-[11px] font-mono font-bold">
        <Check className="w-3.5 h-3.5" />
        PIONEER MEMBER · VAULT UNLOCKED
      </span>
    ) : (
      <button
        type="button"
        onClick={openUpgrade}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 text-black font-mono font-extrabold transition-colors cursor-pointer min-h-[44px] ${
          compact ? 'px-4 py-2 text-[11px]' : 'px-5 py-3 text-xs sm:text-sm'
        }`}
      >
        <Crown className="w-4 h-4 shrink-0" />
        <span>Join Pioneer · €{PIONEER_MEMBERSHIP.pricePerYear}/year</span>
        <ArrowRight className="w-4 h-4 shrink-0" />
      </button>
    );

  // Non-members strictly see the clean two-column visual presentation behind an exclusive login prompt.
  // Upon logging in as an active member, the quiet, asynchronous lounge opens with #announcements, #the-vault, and #community-feedback.
  if (!isAuthenticated || !isMember) {
    return (
      <div className="space-y-6 transform-gpu">
        {/* Exclusive Member Lock Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1322] via-[#070b14] to-[#04060c] border border-amber-400/40 p-6 sm:p-8 space-y-4 text-center shadow-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            <span>Pioneer Lounge · Member Restricted Area</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-wide">
            Exclusive Lounge Behind Active Login
          </h2>
          <p className="text-xs sm:text-sm text-white/70 font-sans max-w-xl mx-auto leading-relaxed">
            The Pioneer Lounge is an exclusive, quiet space with monthly drops in <strong className="text-cyan-300">#announcements</strong>, instant downloads in <strong className="text-cyan-300">#the-vault</strong>, and weekly feedback reviews in <strong className="text-cyan-300">#community-feedback</strong>. Active membership is required to enter.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {!isAuthenticated && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs sm:text-sm shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all cursor-pointer"
              >
                Sign In to Your Account
              </button>
            )}
            <button
              type="button"
              onClick={openUpgrade}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 text-black font-mono font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Crown className="w-4 h-4 fill-black" />
              <span>Join Member Pass (€60/year)</span>
            </button>
          </div>
        </div>

        {/* Clean Two-Column Visual Presentation for Non-Members */}
        <TwoColumnPricingSection
          onSelectComicTab={() => {
            if (typeof window !== "undefined") {
              window.location.hash = "#edition";
              window.dispatchEvent(new HashChangeEvent("hashchange"));
            }
          }}
          onJoinMemberPass={openUpgrade}
          isMembershipLaunchLocked={false}
          isLoungeView={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 transform-gpu">
      {/* ─── 1. WELCOME & LOUNGE PROTOCOL ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b1222] via-[#060a14] to-[#03060c] border border-amber-400/30 p-5 sm:p-7 space-y-5">
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-400/40 text-amber-300 font-bold tracking-wider">
                MODULE 04 · PIONEER LOUNGE
              </span>
              <span className="text-[10px] font-mono text-cyan-300 font-semibold">
                ASYNC · CURATED · MONTHLY DROPS
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-extrabold text-white tracking-wide">
              {LOUNGE_WELCOME.title}
            </h1>
            <blockquote className="border-l-2 border-amber-400/70 pl-3 text-sm sm:text-base italic text-amber-100/90 font-sans leading-relaxed">
              “{LOUNGE_WELCOME.message}”
            </blockquote>
          </div>
          <div className="shrink-0">
            <MemberCta />
          </div>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {LOUNGE_WELCOME.rules.map((rule) => (
            <li
              key={rule}
              className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs sm:text-[13px] text-white/75 font-sans leading-relaxed"
            >
              <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ─── 2. VALUE STACK (NO-BRAINER COMPARISON) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-stretch gap-3 sm:gap-4">
        <div className="p-5 rounded-2xl bg-[#070b14] border border-white/10 space-y-3">
          <span className="text-[10px] font-mono font-bold tracking-widest text-white/50 uppercase">
            Bought separately
          </span>
          <div className="space-y-1.5">
            {VAULT_PRODUCTS.filter((p) => p.isDigital).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 text-xs font-mono">
                <span className="text-white/70 truncate">{p.name}</span>
                <span className="text-white/60 shrink-0">{formatEuro(p.listPrice)}</span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-white/10 flex items-baseline justify-between">
            <span className="text-xs font-mono text-white/60">Total</span>
            <span className="text-2xl font-display font-black text-white/80 line-through decoration-red-400/80 decoration-2">
              {formatEuro(separateTotal)}
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center justify-center">
          <span className="w-10 h-10 rounded-full bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-300 font-mono text-xs font-bold">
            VS
          </span>
        </div>

        <div className="relative p-5 rounded-2xl bg-gradient-to-br from-amber-950/50 via-[#0d0a04] to-black border-2 border-amber-400/60 space-y-3">
          <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-mono font-extrabold tracking-wider">
            SMARTEST CHOICE
          </span>
          <span className="text-[10px] font-mono font-bold tracking-widest text-amber-300 uppercase">
            {PIONEER_MEMBERSHIP.name}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-display font-black text-amber-300">
              €{PIONEER_MEMBERSHIP.pricePerYear}
            </span>
            <span className="text-xs font-mono text-amber-200/70">
              / year (~€{PIONEER_MEMBERSHIP.pricePerMonthEquivalent}/mo)
            </span>
          </div>
          <ul className="space-y-1.5 text-xs font-sans text-white/80">
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              All three digital packs included
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              A new drop every month
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              Exclusive signed bookmark with the Bingäa comic
            </li>
          </ul>
          {savings > 0 && (
            <div className="text-[11px] font-mono font-bold text-emerald-300">
              You save {formatEuro(savings)} on the packs alone. Every monthly drop is a bonus.
            </div>
          )}
        </div>
      </div>

      {/* ─── 3. CHANNEL SWITCHER ─── */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Pioneer Lounge channels">
        {LOUNGE_CHANNELS.map((ch) => {
          const Icon = CHANNEL_ICONS[ch.id];
          const isActive = activeChannel === ch.id;
          return (
            <button
              key={ch.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => switchChannel(ch.id)}
              className={`shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-left transition-colors cursor-pointer min-h-[48px] ${
                isActive
                  ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-100'
                  : 'bg-white/[0.03] border-white/10 text-white/65 hover:text-white hover:border-cyan-400/30'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-300' : 'text-cyan-400/70'}`} />
              <span className="flex flex-col">
                <span className="text-xs font-mono font-bold flex items-center gap-0.5">
                  <Hash className="w-3 h-3 opacity-60" />
                  {ch.name}
                </span>
                <span className="text-[10px] font-sans text-white/45 hidden sm:block">{ch.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── 4a. #announcements ─── */}
      {activeChannel === 'announcements' && (
        <div className="space-y-5">
          <div className="space-y-3">
            {sortedAnnouncements.map((a) => (
              <article
                key={a.id}
                className="p-4 sm:p-5 rounded-2xl bg-[#070b14] border border-white/10 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-mono">
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 font-bold">
                    ODI SELIS
                  </span>
                  <span className="text-white/45">{formatDate(a.date)}</span>
                  {a.pinned && (
                    <span className="inline-flex items-center gap-1 text-cyan-300">
                      <Pin className="w-3 h-3" /> PINNED
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-display font-bold text-white">{a.title}</h3>
                <p className="text-xs sm:text-sm text-white/70 font-sans leading-relaxed">{a.body}</p>
              </article>
            ))}
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#060a12] border border-cyan-500/25 space-y-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold tracking-wider text-cyan-300 uppercase">
                Monthly Drop Calendar
              </span>
            </div>
            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DROP_SCHEDULE.map((drop) => {
                const Icon = DROP_ICONS[drop.kind];
                const live = isDropLive(drop, now);
                return (
                  <li
                    key={drop.id}
                    className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-3"
                  >
                    <span className="w-9 h-9 rounded-lg bg-cyan-950/80 border border-cyan-400/30 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-cyan-300" />
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                        <span className="text-amber-300 font-bold">MONTH {drop.month}</span>
                        <span className={live ? 'text-emerald-300 font-bold' : 'text-white/45'}>
                          {live ? 'LIVE' : `Unlocks ${formatDate(drop.releaseDate)}`}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white">{drop.title}</div>
                      <p className="text-[11px] sm:text-xs text-white/60 font-sans leading-relaxed">
                        {drop.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}

      {/* ─── 4b. #the-vault ─── */}
      {activeChannel === 'the-vault' && (
        <div className="space-y-5">
          {/* Pricing comparison: table on md+, cards on mobile */}
          <div className="rounded-2xl bg-[#070b14] border border-white/10 overflow-hidden">
            <div className="hidden md:grid grid-cols-[1.6fr_1fr_1fr] px-5 py-3 border-b border-white/10 text-[10.5px] font-mono font-bold tracking-wider uppercase text-white/50">
              <span>Product / Pack</span>
              <span>Separately (non-members)</span>
              <span className="text-amber-300">Pioneer · €{PIONEER_MEMBERSHIP.pricePerYear}/yr</span>
            </div>
            <div className="divide-y divide-white/5">
              {VAULT_PRODUCTS.map((p) => {
                const Icon = PRODUCT_ICONS[p.kind];
                const isFree = p.memberLabel === 'FREE';
                return (
                  <div
                    key={p.id}
                    className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1fr] gap-2 md:gap-0 md:items-center px-4 sm:px-5 py-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-lg bg-amber-950/60 border border-amber-400/30 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-amber-300" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-white">{p.name}</div>
                        {p.subtitle && (
                          <div className="text-[11px] text-white/50 font-sans">{p.subtitle}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:block pl-12 md:pl-0 text-xs font-mono">
                      <span className="md:hidden text-white/40">Separately</span>
                      <span className={isFree ? 'text-white/55 line-through decoration-white/30' : 'text-white/70'}>
                        {p.priceRangeLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between md:block pl-12 md:pl-0 text-xs font-mono">
                      <span className="md:hidden text-white/40">Pioneer</span>
                      <span className="flex flex-col items-end md:items-start">
                        <span className={isFree ? 'text-emerald-300 font-extrabold' : 'text-white font-bold'}>
                          {p.memberLabel}
                        </span>
                        {p.memberNote && (
                          <span className="text-[10.5px] text-amber-200/80">{p.memberNote}</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-4 sm:px-5 py-4 border-t border-white/10 bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs font-sans text-white/75">
                The three digital packs alone add up to{' '}
                <strong className="text-white">{formatEuro(separateTotal)}</strong>. Pioneer Membership is{' '}
                <strong className="text-amber-300">€{PIONEER_MEMBERSHIP.pricePerYear}/year</strong>, with every monthly drop included.
              </p>
              <MemberCta compact />
            </div>
          </div>

          {/* Downloads */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold tracking-wider text-cyan-300 uppercase">
                Vault Downloads
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DROP_SCHEDULE.map((drop) => {
                const Icon = DROP_ICONS[drop.kind];
                const live = isDropLive(drop, now);
                const hasTarget = Boolean(drop.downloadUrl || drop.vaultFolderId);
                const canOpen = isMember && live && hasTarget;
                return (
                  <div
                    key={drop.id}
                    className="p-4 rounded-xl bg-[#070b14] border border-white/10 flex flex-col gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-9 h-9 rounded-lg bg-cyan-950/80 border border-cyan-400/30 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-cyan-300" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono text-amber-300 font-bold">DROP {String(drop.month).padStart(2, '0')}</div>
                        <div className="text-xs sm:text-sm font-bold text-white">{drop.title}</div>
                      </div>
                    </div>
                    {canOpen ? (
                      <button
                        type="button"
                        onClick={() => handleOpenDrop(drop)}
                        className="w-full min-h-[44px] rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/50 text-cyan-100 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        {drop.downloadUrl ? <ExternalLink className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                        {drop.downloadUrl ? 'Download' : 'Open in Drive Vault'}
                      </button>
                    ) : !isMember ? (
                      <button
                        type="button"
                        onClick={openUpgrade}
                        className="w-full min-h-[44px] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 text-xs font-mono flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Lock className="w-4 h-4 text-amber-300" />
                        Pioneer members only
                      </button>
                    ) : (
                      <div className="w-full min-h-[44px] rounded-xl bg-white/[0.03] border border-white/10 text-white/50 text-xs font-mono flex items-center justify-center gap-2">
                        <CalendarClock className="w-4 h-4" />
                        {live ? 'Files uploading soon' : `Unlocks ${formatDate(drop.releaseDate)}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── 4c. #community-feedback ─── */}
      {activeChannel === 'community-feedback' && (
        <div className="space-y-5">
          {FEATURED_FEEDBACK.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-mono font-bold tracking-wider text-amber-300 uppercase">
                  Pinned by Odi
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FEATURED_FEEDBACK.map((f) => (
                  <a
                    key={f.id}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl bg-amber-950/20 border border-amber-400/30 hover:border-amber-300/60 transition-colors space-y-1"
                  >
                    <div className="text-[10.5px] font-mono text-amber-300 font-bold">{f.author}</div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      {f.title}
                      <ExternalLink className="w-3.5 h-3.5 text-white/50" />
                    </div>
                    {f.note && <p className="text-xs text-white/65 font-sans">{f.note}</p>}
                  </a>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmitFeedback}
            className="p-4 sm:p-5 rounded-2xl bg-[#060a12] border border-cyan-500/25 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold tracking-wider text-cyan-300 uppercase flex items-center gap-2">
                <Send className="w-4 h-4" /> Share your remix or creation
              </span>
              <span className="text-[10.5px] font-mono text-white/45">1 submission per day · reviewed weekly</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={fbTitle}
                onChange={(e) => setFbTitle(e.target.value)}
                maxLength={90}
                placeholder="Title, e.g. 'Track 1 – Ambient Remix'"
                disabled={!isMember}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-black/60 border border-white/10 focus:border-cyan-400/60 outline-none text-sm text-white placeholder:text-white/35 disabled:opacity-50"
              />
              <div className="relative">
                <Link2 className="w-4 h-4 text-white/35 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="url"
                  value={fbUrl}
                  onChange={(e) => setFbUrl(e.target.value)}
                  placeholder="https://soundcloud.com/..."
                  disabled={!isMember}
                  className="w-full min-h-[44px] pl-9 pr-3.5 rounded-xl bg-black/60 border border-white/10 focus:border-cyan-400/60 outline-none text-sm text-white placeholder:text-white/35 disabled:opacity-50"
                />
              </div>
            </div>
            <textarea
              value={fbNote}
              onChange={(e) => setFbNote(e.target.value)}
              maxLength={280}
              rows={2}
              placeholder="Short note: what did you make, what feedback are you looking for? (optional)"
              disabled={!isMember}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-cyan-400/60 outline-none text-sm text-white placeholder:text-white/35 resize-none disabled:opacity-50"
            />
            {fbError && <p className="text-xs font-mono text-amber-300">{fbError}</p>}
            {fbSuccess && (
              <p className="text-xs font-mono text-emerald-300">Submitted. Odi reviews new work every week.</p>
            )}
            {isMember ? (
              <button
                type="submit"
                disabled={cooldownActive}
                className="w-full sm:w-auto min-h-[44px] px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-white/10 disabled:text-white/40 text-black text-xs font-mono font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
                {cooldownActive ? 'Next submission available tomorrow' : 'Submit to #community-feedback'}
              </button>
            ) : (
              <MemberCta compact />
            )}
          </form>

          <div className="space-y-3">
            {feedbackPosts.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-white/10 text-center text-xs font-mono text-white/45">
                No submissions yet. Be the first Pioneer to share a remix.
              </div>
            ) : (
              feedbackPosts.map((p) => (
                <article key={p.id} className="p-4 rounded-xl bg-[#070b14] border border-white/10 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-mono">
                    <span className="text-cyan-300 font-bold">{p.author}</span>
                    <span className="text-white/40">
                      {new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-white hover:text-cyan-200 inline-flex items-center gap-1.5"
                  >
                    {p.title}
                    <ExternalLink className="w-3.5 h-3.5 text-white/50" />
                  </a>
                  {p.note && <p className="text-xs text-white/65 font-sans leading-relaxed">{p.note}</p>}
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PioneerLounge;

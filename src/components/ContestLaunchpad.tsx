import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Sparkles,
  Ticket,
  Lock,
  CheckCircle2,
  ArrowRight,
  Share2,
  ArrowLeft,
  Bot,
  ExternalLink,
  Flame,
  Globe2,
  Layers,
  Trees,
  Compass,
  Volume2,
  Camera,
  Calendar,
  Vote,
  Edit,
  ThumbsUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../utils/audio';
import millAvatar from '../assets/images/mill_photo.jpg';
import { PlanetGeneratorChat } from './PlanetGeneratorChat';
import { WizardAnswers, PlanetSubmission } from '../types/contest';
import {
  getStoredPlanetSubmissions,
  getUserContestSubmission,
  formatAkinoyaPlanetName,
  generatePlanetLore,
  resolvePlanetRenders,
  savePlanetSubmission,
  togglePlanetSubmissionVote,
} from '../data/contest';
import { attachContestSubmissionToCreator } from '../data/creators';

interface ContestLaunchpadProps {
  onBackToHome: () => void;
  onNavigateToCommunity?: () => void;
  onNavigateToCreator?: (username: string) => void;
}

export const ContestLaunchpad: React.FC<ContestLaunchpadProps> = ({
  onBackToHome,
  onNavigateToCommunity,
  onNavigateToCreator,
}) => {
  const { user, profile, isAuthenticated, openAuthModal, updateProfile } = useAuth();

  const userDisplayName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`
    : profile?.full_name || (user?.email ? user.email.split('@')[0] : 'Architect');

  const username =
    profile?.username ||
    (user?.email ? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') : 'creator');

  // State
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [pendingAnswers, setPendingAnswers] = useState<WizardAnswers | null>(null);
  const [previewDossier, setPreviewDossier] = useState<PlanetSubmission | null>(null);
  const [activeSubmission, setActiveSubmission] = useState<PlanetSubmission | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<PlanetSubmission[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Load submissions and check user's ticket status
  useEffect(() => {
    const list = getStoredPlanetSubmissions();
    setAllSubmissions(list);

    if (isAuthenticated && (user?.id || profile?.id || user?.email)) {
      const userSub = getUserContestSubmission(user?.id || profile?.id, user?.email);
      if (userSub) {
        setActiveSubmission(userSub);
      } else if (profile?.contest_submission_id) {
        const found = list.find((s) => s.id === profile.contest_submission_id);
        if (found) setActiveSubmission(found);
      }
    }
  }, [isAuthenticated, user?.id, user?.email, profile?.id, profile?.contest_submission_id]);

  // Handle launch button
  const handleStartWorldbuilding = () => {
    if (!isAuthenticated) {
      soundManager.playTone(330, 0.08);
      openAuthModal('signin');
      return;
    }
    soundManager.playTone(660, 0.08);
    setIsChatOpen(true);
  };

  // Called when Mill completes the 8 questions
  const handleWizardComplete = (answers: WizardAnswers) => {
    const planetName = formatAkinoyaPlanetName(answers.planetName);
    const answersWithFormattedName = { ...answers, planetName };
    setPendingAnswers(answersWithFormattedName);
    setIsChatOpen(false);

    // Build draft dossier
    const lore = generatePlanetLore(answersWithFormattedName, userDisplayName);
    const renders = resolvePlanetRenders(answersWithFormattedName);

    const draft: PlanetSubmission = {
      id: `PLN-2027-${Date.now().toString(36).toUpperCase()}`,
      userId: user?.id || profile?.id || 'anon-user',
      authorName: userDisplayName,
      authorUsername: username,
      authorEmail: user?.email,
      authorAvatarGradient: 'from-amber-400 via-yellow-500 to-amber-700',
      planetName,
      atmosphere: answers.atmosphere,
      flora: answers.flora,
      fauna: answers.fauna,
      sonicVibe: answers.sonicVibe,
      visualAesthetic: answers.visualAesthetic,
      landmark: answers.landmark,
      additionalNotes: answers.additionalNotes,
      generatedLore: lore,
      renders,
      votesCount: 1,
      hasVoted: true,
      status: 'SUBMITTED',
      createdAt: new Date().toISOString().split('T')[0],
      votingDeadline: 'June 30, 2027',
    };

    setPreviewDossier(draft);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // User explicitly approves and submits their golden ticket entry
  const handleApproveAndSubmit = async () => {
    if (!previewDossier) return;
    setIsSubmitting(true);
    soundManager.playTone(880, 0.08);

    try {
      // 1. Save entry to planet_submissions
      await savePlanetSubmission(previewDossier);

      // 2. Lock golden ticket on profile
      await updateProfile({ contest_submission_id: previewDossier.id });

      // 3. Attach renders & lore to creator's public portfolio (/creators/[username])
      attachContestSubmissionToCreator(username, userDisplayName, previewDossier);

      // 4. Update local state
      setActiveSubmission(previewDossier);
      setPreviewDossier(null);
      setPendingAnswers(null);
      setAllSubmissions((prev) => [previewDossier, ...prev.filter((p) => p.id !== previewDossier.id)]);

      // 5. Celebration
      soundManager.playUnlockChime();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#22d3ee', '#10b981', '#a855f7'],
      });
    } catch (err) {
      console.error('Submission error:', err);
      soundManager.playError();
      alert('Submission encounter a sync error, but entry has been cached locally.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Vote on a community contest submission
  const handleVoteSubmission = async (submissionId: string) => {
    if (!isAuthenticated) {
      soundManager.playTone(330, 0.08);
      openAuthModal('signin');
      return;
    }
    soundManager.playTone(740, 0.06);
    const res = await togglePlanetSubmissionVote(submissionId, user?.id);
    if (res.success) {
      setAllSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? { ...s, votesCount: res.newVotesCount, hasVoted: res.hasVoted } : s))
      );
      if (activeSubmission && activeSubmission.id === submissionId) {
        setActiveSubmission((prev) => (prev ? { ...prev, votesCount: res.newVotesCount, hasVoted: res.hasVoted } : null));
      }
    }
  };

  const handleCopyShare = () => {
    soundManager.playTone(660, 0.04);
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/contest`;
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2200);
      });
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full max-w-full box-border bg-[#03060c] text-white flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden">
      {/* Universal Sticky Header */}
      <header className="relative z-40 w-full border-b border-white/10 bg-[#050811]/90 backdrop-blur-xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-mono transition-colors cursor-pointer min-h-[44px] shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          {onNavigateToCommunity && (
            <button
              type="button"
              onClick={onNavigateToCommunity}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-mono transition-colors cursor-pointer min-h-[44px] shrink-0"
            >
              <span>Community Hub</span>
            </button>
          )}

          <div className="h-4 w-px bg-white/15 shrink-0 hidden xs:block" />

          <div className="flex items-center gap-2 min-w-0">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span className="text-xs sm:text-sm font-display font-bold tracking-wider text-white uppercase truncate">
              WORLDBUILDING CONTEST LAUNCHPAD
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] sm:text-[11px] font-mono text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-500/40 font-bold flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-amber-400" />
            <span>VOTES CLOSE JUNE 30</span>
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-12 box-border">
        {/* HERO BANNER SECTION */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950/40 via-[#070b16] to-[#04060c] border border-amber-500/30 p-6 sm:p-10 shadow-[0_0_50px_rgba(245,158,11,0.15)]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 sm:gap-8">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 tracking-wider flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-amber-400" />
                  <span>ONE GOLDEN TICKET PER ACCOUNT</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>MILL AI ONLINE</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl md:text-5xl font-display font-extrabold text-white tracking-tight leading-tight">
                Design Your Sector in the <span className="text-amber-400">Äkinoya Galaxy</span>
              </h1>

              <p className="text-xs sm:text-sm md:text-base text-white/70 font-sans leading-relaxed">
                Step into the holographic workshop with <strong>Mill</strong>, your AI worldbuilding companion. Answer 8 questions to synthesize your planet designation, atmospheric spectra, botany, apex predators, and sonic signatures for the official Sillow Mill music collaboration.
              </p>
            </div>

            {/* Launchpad Golden Ticket Action Card */}
            <div className="w-full lg:w-auto shrink-0 bg-black/60 border border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col gap-4 min-w-[280px] sm:min-w-[320px]">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                <span className="text-xs font-mono text-amber-300 font-bold uppercase tracking-wider">
                  Contest Entry Ticket
                </span>
                <div className="w-7 h-7 rounded-full overflow-hidden border border-cyan-400/50">
                  <img src={millAvatar} alt="Mill" className="w-full h-full object-cover" />
                </div>
              </div>

              {activeSubmission ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-center space-y-1">
                    <span className="text-[10px] font-mono text-amber-300 font-bold flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      ENTRY ACTIVE · SUBMISSION LOCKED
                    </span>
                    <div className="text-sm font-display font-bold text-white truncate">
                      {activeSubmission.planetName}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-white/60 px-1">
                    <span>Live Votes:</span>
                    <span className="text-amber-400 font-bold">{activeSubmission.votesCount}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playTone(660, 0.05);
                      const el = document.getElementById('user-dossier-card');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                  >
                    <span>View Your Planet Dossier</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-white/70 font-sans leading-relaxed">
                    {isAuthenticated
                      ? `Welcome ${userDisplayName}! You hold 1 Golden Ticket to generate a world territory.`
                      : 'Sign in to claim your 1 Golden Ticket and launch your planet with Mill.'}
                  </div>

                  <button
                    type="button"
                    onClick={handleStartWorldbuilding}
                    className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-mono font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.4)] active:scale-[0.98]"
                  >
                    <Sparkles className="w-4 h-4 fill-black" />
                    <span>{isAuthenticated ? 'Start Worldbuilding with Mill' : 'Sign In to Enter Contest'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* PREVIEW & APPROVAL DOSSIER (IF WIZARD COMPLETED BUT NOT YET SUBMITTED) */}
        {previewDossier && !activeSubmission && (
          <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-cyan-950/40 via-black to-black border-2 border-cyan-400/60 shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-400/40 font-bold uppercase">
                  Dossier Preview · Approval Required
                </span>
                <h2 className="text-xl sm:text-2xl font-display font-bold text-white mt-1">
                  {previewDossier.planetName}
                </h2>
                <p className="text-xs text-white/60 font-mono">
                  Review your synthesized planet specs and lore before publishing to the Governance Council.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Edit with Mill</span>
                </button>

                <button
                  type="button"
                  onClick={handleApproveAndSubmit}
                  disabled={isSubmitting}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-mono font-bold text-xs shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'PUBLISHING ENTRY...' : 'APPROVE & SUBMIT ENTRY'}</span>
                </button>
              </div>
            </div>

            {/* 4 Responsive Visual Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/60 space-y-2">
                <div className="h-44 w-full overflow-hidden bg-black/80">
                  <img src={previewDossier.renders.hero} alt="Hero View" className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase">CARD 01 · ORBITAL HERO</div>
                  <div className="text-xs font-bold text-white truncate">{previewDossier.planetName}</div>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/60 space-y-2">
                <div className="h-44 w-full overflow-hidden bg-black/80">
                  <img src={previewDossier.renders.atmosphere} alt="Atmosphere" className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase">CARD 02 · ATMOSPHERIC VISTA</div>
                  <div className="text-xs font-bold text-white truncate">{previewDossier.atmosphere}</div>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/60 space-y-2">
                <div className="h-44 w-full overflow-hidden bg-black/80">
                  <img src={previewDossier.renders.ecosystem} alt="Ecosystem" className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase">CARD 03 · FLORA & FAUNA</div>
                  <div className="text-xs font-bold text-white truncate">{previewDossier.flora}</div>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/60 space-y-2">
                <div className="h-44 w-full overflow-hidden bg-black/80">
                  <img src={previewDossier.renders.landmark} alt="Landmark" className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase">CARD 04 · MONUMENT</div>
                  <div className="text-xs font-bold text-white truncate">{previewDossier.landmark}</div>
                </div>
              </div>
            </div>

            {/* Generated Lore story */}
            <div className="p-5 rounded-2xl bg-[#070b16] border border-white/10 space-y-2">
              <span className="text-[10.5px] font-mono text-amber-300 font-bold uppercase">
                AI-SYNTHESIZED SECTOR LORE
              </span>
              <p className="text-xs sm:text-sm text-white/85 font-sans leading-relaxed whitespace-pre-line">
                {previewDossier.generatedLore}
              </p>
            </div>
          </section>
        )}

        {/* ACTIVE USER DOSSIER (LOCKED GOLDEN TICKET SUBMISSION) */}
        {activeSubmission && (
          <section
            id="user-dossier-card"
            className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-950/30 via-black to-black border border-amber-500/40 shadow-2xl space-y-6"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-400/40 font-bold uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-amber-400" />
                    <span>OFFICIAL CONTEST ENTRY · LOCKED</span>
                  </span>
                  <span className="text-xs font-mono text-white/50">{activeSubmission.id}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
                  {activeSubmission.planetName}
                </h2>
                <p className="text-xs text-white/60 font-mono">
                  Architect: {activeSubmission.authorName} (@{activeSubmission.authorUsername})
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyShare}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{copiedLink ? 'Link Copied!' : 'Share Entry'}</span>
                </button>

                {onNavigateToCreator && (
                  <button
                    type="button"
                    onClick={() => onNavigateToCreator(activeSubmission.authorUsername)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-400/50 text-cyan-300 text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View in Portfolio</span>
                  </button>
                )}
              </div>
            </div>

            {/* 4 Cards Showcase */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/60 space-y-2">
                <div className="h-44 w-full overflow-hidden bg-black/80">
                  <img src={activeSubmission.renders.hero} alt="Hero" className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <div className="text-[10px] font-mono text-amber-400 font-bold uppercase">HERO RENDER</div>
                  <div className="text-xs font-bold text-white truncate">{activeSubmission.planetName}</div>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/60 space-y-2">
                <div className="h-44 w-full overflow-hidden bg-black/80">
                  <img src={activeSubmission.renders.atmosphere} alt="Atmosphere" className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase">ATMOSPHERE</div>
                  <div className="text-xs font-bold text-white truncate">{activeSubmission.atmosphere}</div>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/60 space-y-2">
                <div className="h-44 w-full overflow-hidden bg-black/80">
                  <img src={activeSubmission.renders.ecosystem} alt="Ecosystem" className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase">ECOSYSTEM</div>
                  <div className="text-xs font-bold text-white truncate">{activeSubmission.flora}</div>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/60 space-y-2">
                <div className="h-44 w-full overflow-hidden bg-black/80">
                  <img src={activeSubmission.renders.landmark} alt="Landmark" className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <div className="text-[10px] font-mono text-purple-400 font-bold uppercase">LANDMARK</div>
                  <div className="text-xs font-bold text-white truncate">{activeSubmission.landmark}</div>
                </div>
              </div>
            </div>

            {/* Lore and Specs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-5 rounded-2xl bg-[#070b16] border border-white/10 space-y-2">
                <span className="text-[10.5px] font-mono text-amber-300 font-bold uppercase">
                  REGISTERED SECTOR LORE
                </span>
                <p className="text-xs sm:text-sm text-white/85 font-sans leading-relaxed whitespace-pre-line">
                  {activeSubmission.generatedLore}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-3">
                <span className="text-[10.5px] font-mono text-cyan-300 font-bold uppercase block">
                  TECHNICAL SPECIFICATIONS
                </span>
                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <span className="text-white/40 block text-[10px]">SONIC PROFILE:</span>
                    <span className="text-white">{activeSubmission.sonicVibe}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px]">PIPELINE:</span>
                    <span className="text-white">{activeSubmission.visualAesthetic}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px]">VOTES RECORDED:</span>
                    <span className="text-amber-400 font-bold text-sm">{activeSubmission.votesCount} Ballots</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* COMMUNITY CONTEST ENTRIES GALLERY & VOTING (CLOSING JUNE 30) */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Vote className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg sm:text-xl font-display font-bold text-white">
                  Live Contest Voting · Governance Showcase
                </h2>
              </div>
              <p className="text-xs text-white/60 font-sans">
                Community members and pass holders cast binding votes to determine the winner before <strong>June 30, 2027</strong>.
              </p>
            </div>

            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30 font-bold shrink-0 self-start sm:self-auto">
              {allSubmissions.length} Registered Worlds
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allSubmissions.map((sub, idx) => (
              <div
                key={sub.id}
                className="rounded-2xl overflow-hidden bg-black/60 border border-white/10 hover:border-amber-400/40 transition-all flex flex-col justify-between shadow-lg group"
              >
                <div>
                  <div className="relative h-48 w-full overflow-hidden bg-black/90">
                    <img
                      src={sub.renders.hero}
                      alt={sub.planetName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/80 backdrop-blur-md text-amber-300 border border-amber-400/40">
                      RANK #{idx + 1}
                    </div>
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/80 backdrop-blur-md text-cyan-300 border border-cyan-400/40">
                      {sub.votesCount} VOTES
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-display font-bold text-white truncate">
                        {sub.planetName}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-white/60">
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-tr ${sub.authorAvatarGradient || 'from-cyan-400 to-indigo-600'} flex items-center justify-center font-bold text-[9px] text-black`}>
                        {sub.authorName.slice(0, 1)}
                      </div>
                      <span className="truncate">By {sub.authorName}</span>
                    </div>

                    <p className="text-xs text-white/70 font-sans line-clamp-3 leading-relaxed">
                      {sub.generatedLore}
                    </p>

                    <div className="pt-2 flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[9.5px] font-mono bg-white/5 text-white/60">
                        {sub.atmosphere.split('&')[0].trim()}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9.5px] font-mono bg-white/5 text-white/60">
                        {sub.landmark.split('(')[0].trim()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-white/10 flex items-center justify-between gap-2 bg-[#050812]">
                  <button
                    type="button"
                    onClick={() => handleVoteSubmission(sub.id)}
                    className={`min-h-[44px] flex-1 px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      sub.hasVoted
                        ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                        : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${sub.hasVoted ? 'fill-black' : ''}`} />
                    <span>{sub.hasVoted ? 'Voted' : 'Vote for World'}</span>
                  </button>

                  {onNavigateToCreator && (
                    <button
                      type="button"
                      onClick={() => onNavigateToCreator(sub.authorUsername)}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-cyan-300 transition-colors cursor-pointer text-xs font-mono"
                      title="View Creator"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* MILL AI CHATBOT MODAL (8-STEP WIZARD) */}
      <AnimatePresence>
        {isChatOpen && (
          <PlanetGeneratorChat
            userDisplayName={userDisplayName}
            onComplete={handleWizardComplete}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

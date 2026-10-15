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
  Calendar,
  Vote,
  ThumbsUp,
  Camera,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../utils/audio';
import millAvatar from '../assets/images/mill_photo.jpg';
import { PlanetGeneratorChat } from './PlanetGeneratorChat';
import { PlanetDossierModal } from './PlanetDossierModal';
import { AkinoyaSciFiLoader } from './AkinoyaSciFiLoader';
import { WizardAnswers, PlanetSubmission } from '../types/contest';
import {
  getStoredPlanetSubmissions,
  getUserContestSubmission,
  formatAkinoyaPlanetName,
  generatePlanetLore,
  resolvePlanetRenders,
  savePlanetSubmission,
  togglePlanetSubmissionVote,
  subscribeToPlanetSubmissions,
  isCleanPhotorealistic,
} from '../data/contest';
import { attachContestSubmissionToCreator } from '../data/creators';
import { isPostLaunch, hasPaidMembership, openMembershipGateModal, openClaimWorldModal } from '../utils/pioneer';

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
  const { user, profile, isAuthenticated, openAuthModal, updateProfile, role, isVip } = useAuth();

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
  const [isGeneratingRenders, setIsGeneratingRenders] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generationStageName, setGenerationStageName] = useState<string>('ANALYZING PLANETARY DATA...');
  const [generationStageDetails, setGenerationStageDetails] = useState<string>('Parsing 8 human-centric coordinates...');
  const [generationSlotIndex, setGenerationSlotIndex] = useState<number>(1);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [modalPlanet, setModalPlanet] = useState<PlanetSubmission | null>(null);

  // Strict Token-Protection Lock Pre-Check
  const hasSubmittedContest = Boolean(
    profile?.has_submitted_contest ||
    profile?.contest_submission_id ||
    activeSubmission
  );

  // Auto-start Mill if coming from Claim modal (Question 2 flow)
  useEffect(() => {
    const shouldStart = sessionStorage.getItem('akinoya_start_mill') === 'true';
    if (shouldStart && !hasSubmittedContest) {
      sessionStorage.removeItem('akinoya_start_mill');
      setIsChatOpen(true);
    }

    const handleEventStart = () => {
      if (!hasSubmittedContest) {
        setIsChatOpen(true);
      }
    };

    window.addEventListener('akinoya-start-mill', handleEventStart);
    return () => window.removeEventListener('akinoya-start-mill', handleEventStart);
  }, [hasSubmittedContest]);

  // Load submissions, check user's ticket status, and subscribe to realtime updates
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

    const unsubscribe = subscribeToPlanetSubmissions((fresh) => {
      setAllSubmissions(fresh);
      if (isAuthenticated && (user?.id || profile?.id || user?.email)) {
        const userSub = getUserContestSubmission(user?.id || profile?.id, user?.email);
        if (userSub) setActiveSubmission(userSub);
      }
    });

    return () => unsubscribe();
  }, [isAuthenticated, user?.id, user?.email, profile?.id, profile?.contest_submission_id]);

  // Handle launch button: ALWAYS mandate "Create Your Free World" modal first
  const handleStartWorldbuilding = () => {
    if (isPostLaunch() && !hasPaidMembership(user, profile, role, isVip)) {
      soundManager.playTone(330, 0.08);
      openMembershipGateModal();
      return;
    }

    if (!isAuthenticated) {
      soundManager.playTone(330, 0.08);
      openAuthModal('signin');
      return;
    }
    if (hasSubmittedContest) {
      soundManager.playTone(330, 0.08);
      if (activeSubmission) {
        setModalPlanet(activeSubmission);
      }
      return;
    }
    soundManager.playTone(660, 0.08);
    // Explicitly mandate the "Create Your Free World" modal first before launching Mill
    openClaimWorldModal();
  };

  // Called when Mill completes the 8 questions (Live Google Nano Banana AI Synthesis)
  const handleWizardComplete = async (answers: WizardAnswers) => {
    const planetName = formatAkinoyaPlanetName(answers.planetName, false) || answers.planetName || 'Äkinoya Frontier Sector';
    const answersWithFormattedName = { ...answers, planetName };
    setPendingAnswers(answersWithFormattedName);
    setIsChatOpen(false);
    setIsGeneratingRenders(true);
    setGenerationProgress(5);
    setGenerationStageName('INITIALIZING GOOGLE NANO BANANA AI PIPELINE...');
    setGenerationStageDetails(`Configuring 5-photo 4K photorealistic prompt matrix for ${planetName}...`);
    soundManager.playTone(660, 0.08);

    try {
      const slots: Array<'hero' | 'flora' | 'fauna' | 'atmosphere' | 'landmark'> = [
        'hero',
        'flora',
        'fauna',
        'atmosphere',
        'landmark',
      ];

      const slotLabels = {
        hero: {
          name: 'GENERATING ORBITAL HERO (1/5)...',
          details: 'Synthesizing planetary curvature, atmospheric halo, and orbital disk via Google Nano Banana Pro...',
        },
        flora: {
          name: 'RENDERING BOTANICAL FLORA (2/5)...',
          details: 'Synthesizing bioluminescent alien foliage, spore towers, and botanical ecology via Google Nano Banana...',
        },
        fauna: {
          name: 'PAINTING EXOTIC FAUNA (3/5)...',
          details: 'Synthesizing xenobiological wildlife, soaring pack lifeforms, and apex creatures via Google Nano Banana...',
        },
        atmosphere: {
          name: 'SIMULATING COCKPIT ATMOSPHERE (4/5)...',
          details: 'Framing cockpit descent canopy, pilot HUD reflections, and atmospheric cloud density via Google Nano Banana...',
        },
        landmark: {
          name: 'INSCRIBING LORE MONUMENT (5/5)...',
          details: 'Erecting monumental architectural landmark and sealing official lore dossier cover via Google Nano Banana...',
        },
      };

      const collectedRenders: Record<string, string> = {};

      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const meta = slotLabels[slot];
        setGenerationSlotIndex(i + 1);
        setGenerationStageName(meta.name);
        setGenerationStageDetails(meta.details);
        setGenerationProgress(Math.round((i / slots.length) * 100));

        const res = await fetch('/api/generate-planet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id || profile?.id,
            email: user?.email,
            relaxation: answers.relaxation,
            creativeExpression: answers.creativeExpression,
            naturalEnvironment: answers.naturalEnvironment,
            lifePhilosophy: answers.lifePhilosophy,
            admiredCreature: answers.admiredCreature,
            colorPalette: answers.colorPalette,
            resilienceStory: answers.resilienceStory,
            futurePromise: answers.futurePromise,
            planetName,
            atmosphere: answers.atmosphere,
            flora: answers.flora,
            fauna: answers.fauna,
            sonicVibe: answers.sonicVibe,
            visualAesthetic: answers.visualAesthetic,
            landmark: answers.landmark,
            additionalNotes: answers.additionalNotes,
            biome: answers.biome,
            sectorName: answers.sectorName,
            slot,
            model: 'nano-banana-pro',
            modelPipeline: 'Google Nano Banana Pro / Nano Banana 2.1',
          }),
        });

        if (res.status === 403) {
          const json = await res.json();
          setIsGeneratingRenders(false);
          soundManager.playError();
          alert(json.message || 'SUBMISSION_LOCKED: Account has already utilized its single Golden Ticket planet synthesis.');
          return;
        }

        if (res.ok) {
          const json = await res.json();
          if (json.imageUrl) {
            collectedRenders[slot] = json.imageUrl;
          }
        }

        setGenerationProgress(Math.round(((i + 1) / slots.length) * 100));
        soundManager.playTone(600 + (i * 80), 0.04);
      }

      setGenerationProgress(100);
      setGenerationStageName('SYNTHESIS COMPLETE!');
      setGenerationStageDetails('All 5 high-resolution cinematic sci-fi images successfully synthesized via Google Nano Banana.');
      soundManager.playUnlockChime();

      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsGeneratingRenders(false);

      const finalRenders = {
        hero: collectedRenders.hero || '',
        flora: collectedRenders.flora || '',
        fauna: collectedRenders.fauna || '',
        atmosphere: collectedRenders.atmosphere || '',
        landmark: collectedRenders.landmark || '',
        ecosystem: collectedRenders.flora || '',
      };

      // 2. Synthesize official sector lore incorporating founding creed
      const lore = generatePlanetLore(answersWithFormattedName, userDisplayName);

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
        biome: answersWithFormattedName.biome,
        sectorName: answersWithFormattedName.sectorName,
        humanAnswers: answersWithFormattedName,
        futurePromise: answers.futurePromise,
        generatedLore: lore,
        renders: finalRenders,
        votesCount: 1,
        hasVoted: true,
        status: 'SUBMITTED',
        createdAt: new Date().toISOString().split('T')[0],
        votingDeadline: 'June 30, 2027',
      };

      setPreviewDossier(draft);
      soundManager.playUnlockChime();
      window.scrollTo({ top: 300, behavior: 'smooth' });
    } catch (err) {
      console.warn('[Contest] Live AI synthesis network error:', err);
      const fallbackRenders = resolvePlanetRenders(answersWithFormattedName);
      const lore = generatePlanetLore(answersWithFormattedName, userDisplayName);
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
        biome: answersWithFormattedName.biome,
        sectorName: answersWithFormattedName.sectorName,
        humanAnswers: answersWithFormattedName,
        futurePromise: answers.futurePromise,
        generatedLore: lore,
        renders: fallbackRenders,
        votesCount: 1,
        hasVoted: true,
        status: 'SUBMITTED',
        createdAt: new Date().toISOString().split('T')[0],
        votingDeadline: 'June 30, 2027',
      };
      setPreviewDossier(draft);
      window.scrollTo({ top: 300, behavior: 'smooth' });
    } finally {
      setIsGeneratingRenders(false);
    }
  };

  // User explicitly approves and submits their golden ticket entry
  const handleApproveAndSubmit = async () => {
    if (!previewDossier) return;
    setIsSubmitting(true);
    soundManager.playTone(880, 0.08);

    try {
      // 1. Save entry permanently to Supabase user_dossiers & localStorage
      await savePlanetSubmission(previewDossier);

      // 2. Lock golden ticket on profile (Strict Token Protection Lock)
      await updateProfile({
        contest_submission_id: previewDossier.id,
        has_submitted_contest: true,
      });

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
      alert('Submission encountered a sync notice, but entry has been cached locally.');
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
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0a0b10]/80 backdrop-blur-xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-mono transition-colors cursor-pointer min-h-[44px] shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          <div className="h-4 w-px bg-white/10 hidden sm:block shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-md bg-amber-400 text-black shrink-0">
              <Trophy className="w-3.5 h-3.5 fill-black" />
            </span>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-display font-bold tracking-wide text-white truncate block">
                Äkinoya Worldbuilding Contest
              </span>
              <span className="text-[10px] font-mono text-amber-400/90 hidden sm:block">
                1 Golden Ticket · Closes June 30, 2027
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onNavigateToCommunity && (
            <button
              type="button"
              onClick={onNavigateToCommunity}
              className="px-3 py-1.5 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 min-h-[44px]"
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lore Hub &amp; Governance</span>
              <span className="sm:hidden">Lore Hub</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyShare}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 min-h-[44px]"
            title="Share Contest"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{copiedLink ? 'Copied!' : 'Share'}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-10 sm:space-y-12 box-border">
        {/* HERO LAUNCHPAD BANNER */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#070d1e] via-[#050813] to-black border-2 border-amber-500/30 p-6 sm:p-10 shadow-[0_0_50px_rgba(245,158,11,0.15)]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[10.5px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase tracking-widest flex items-center gap-1.5">
                  <Flame className="w-3 h-3 fill-amber-300 text-amber-300" />
                  OFFICIAL 2027 WORLDBUILDING INITIATIVE
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/30">
                  VOTING CLOSES JUNE 30, 2027
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-display font-black tracking-tight text-white leading-tight">
                Synthesize Your Planet on{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500">
                  Äkinoya
                </span>
              </h1>

              <p className="text-sm sm:text-base text-white/70 font-sans leading-relaxed max-w-2xl">
                Collaborate with <strong>Mill</strong>, our planetary AI synthesizer. Answer 8 human-centric questions (~10 minutes) to generate a complete 5-photo high-resolution cinematic sci-fi dossier, orbital specs, and sector lore.
              </p>

              {/* Contest Rules Ribbon */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
                  <Ticket className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">1 Golden Ticket</div>
                    <div className="text-[11px] text-white/50">Strict 1 generation per account</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
                  <Camera className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">5-Photo Cinematic Dossier</div>
                    <div className="text-[11px] text-white/50">Custom Äkinoya Lighting &amp; 4K Atmosphere</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
                  <Vote className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">Binding Council Vote</div>
                    <div className="text-[11px] text-white/50">June 30 governance election</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Launch Action Card */}
            <div className="lg:col-span-4 p-5 sm:p-6 rounded-2xl bg-black/70 border border-white/15 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.4)] shrink-0">
                  <img src={millAvatar} alt="Mill" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="text-sm font-display font-bold text-white">Mill · Planetary AI</div>
                  <div className="text-[11px] font-mono text-cyan-300">Ready to synthesize</div>
                </div>
              </div>

              {hasSubmittedContest ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-amber-950/70 border border-amber-500/50 text-center space-y-1 shadow-lg">
                    <span className="text-[10px] font-mono text-amber-300 font-bold flex items-center justify-center gap-1.5 uppercase tracking-wider">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      ONE-SHOT CLAIMED · 1 OF 1 TICKET USED
                    </span>
                    <div className="text-sm font-display font-bold text-white truncate">
                      {activeSubmission?.planetName || 'Territory Submitted'}
                    </div>
                    <p className="text-[10.5px] text-white/60 font-mono">
                      Single submission hard lock active. Your world is registered in the Lore Governance Council.
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-white/60 px-1">
                    <span>Live Votes:</span>
                    <span className="text-amber-400 font-bold">{activeSubmission?.votesCount || 1} Ballots</span>
                  </div>

                  {activeSubmission && (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playTone(660, 0.05);
                        setModalPlanet(activeSubmission);
                      }}
                      className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>View 5-Photo Planet Dossier</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-white/70 font-sans leading-relaxed">
                    {isAuthenticated
                      ? `Welcome ${userDisplayName}! You hold 1 Golden Ticket to synthesize your planetary territory.`
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

        {/* SCI-FI BRAND LOADING SCREEN DURING LIVE GENERATION */}
        {isGeneratingRenders && (
          <AkinoyaSciFiLoader
            planetName={pendingAnswers?.planetName || 'Äkinoya Frontier Sector'}
            progress={generationProgress}
            stageName={generationStageName}
            stageDetails={generationStageDetails}
            slotIndex={generationSlotIndex}
            totalSlots={5}
          />
        )}

        {/* PREVIEW & APPROVAL DOSSIER (IF WIZARD COMPLETED BUT NOT YET SUBMITTED) */}
        {previewDossier && !activeSubmission && (
          <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-cyan-950/40 via-black to-black border-2 border-cyan-400/60 shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-400/40 font-bold uppercase">
                  Dossier Preview · Google Nano Banana Pro 4K
                </span>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
                    {previewDossier.planetName}
                  </h2>
                  {previewDossier.biome && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-950/70 text-amber-300 border border-amber-400/40 font-bold">
                      {previewDossier.biome}
                    </span>
                  )}
                  {previewDossier.sectorName && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-white/80 border border-white/20">
                      {previewDossier.sectorName}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/60 font-mono mt-0.5">
                  Review your 5-photo synthesized specs and lore before publishing to the Governance Council.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalPlanet(previewDossier)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-400/50 text-cyan-300 text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Inspect 5-Photo Modal</span>
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

            {/* 5 Sillow Mill 2D Visual Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/60 space-y-2">
                <div className="h-36 w-full overflow-hidden bg-black/80">
                  <img src={previewDossier.renders.hero} alt="Hero View" className="w-full h-full object-cover" />
                </div>
                <div className="p-2.5">
                  <div className="text-[9.5px] font-mono text-cyan-400 font-bold uppercase">01 · ORBITAL HERO</div>
                  <div className="text-xs font-bold text-white truncate">{previewDossier.planetName}</div>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/60 space-y-2">
                <div className="h-36 w-full overflow-hidden bg-black/80">
                  <img src={previewDossier.renders.flora || previewDossier.renders.ecosystem} alt="Flora" className="w-full h-full object-cover" />
                </div>
                <div className="p-2.5">
                  <div className="text-[9.5px] font-mono text-emerald-400 font-bold uppercase">02 · BOTANICAL FLORA</div>
                  <div className="text-xs font-bold text-white truncate">{previewDossier.flora}</div>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/60 space-y-2">
                <div className="h-36 w-full overflow-hidden bg-black/80">
                  <img src={previewDossier.renders.fauna} alt="Fauna" className="w-full h-full object-cover" />
                </div>
                <div className="p-2.5">
                  <div className="text-[9.5px] font-mono text-purple-400 font-bold uppercase">03 · EXOTIC FAUNA</div>
                  <div className="text-xs font-bold text-white truncate">{previewDossier.fauna}</div>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/60 space-y-2">
                <div className="h-36 w-full overflow-hidden bg-black/80">
                  <img src={previewDossier.renders.atmosphere} alt="Atmosphere" className="w-full h-full object-cover" />
                </div>
                <div className="p-2.5">
                  <div className="text-[9.5px] font-mono text-cyan-400 font-bold uppercase">04 · COCKPIT ATMOSPHERE</div>
                  <div className="text-xs font-bold text-white truncate">{previewDossier.atmosphere}</div>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/60 space-y-2">
                <div className="h-36 w-full overflow-hidden bg-black/80">
                  <img src={previewDossier.renders.landmark} alt="Landmark" className="w-full h-full object-cover" />
                </div>
                <div className="p-2.5">
                  <div className="text-[9.5px] font-mono text-amber-400 font-bold uppercase">05 · ICONIC MONUMENT</div>
                  <div className="text-xs font-bold text-white truncate">{previewDossier.landmark}</div>
                </div>
              </div>
            </div>

            {/* Generated Lore story */}
            <div className="p-5 rounded-2xl bg-[#070b16] border border-white/10 space-y-2">
              <span className="text-[10.5px] font-mono text-amber-300 font-bold uppercase">
                AI-SYNTHESIZED SECTOR LORE · GOOGLE NANO BANANA PRO
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
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-400/40 font-bold uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-amber-400" />
                    <span>ONE-SHOT CLAIMED · LOCKED TO ACCOUNT</span>
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
                  onClick={() => {
                    soundManager.playTone(660, 0.05);
                    setModalPlanet(activeSubmission);
                  }}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-400 text-black hover:bg-amber-300 font-mono font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>View 5-Photo Dossier</span>
                </button>

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

            {/* 5 Sillow Mill 2D Visual Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div
                onClick={() => setModalPlanet(activeSubmission)}
                className="cursor-pointer group rounded-2xl overflow-hidden border border-white/10 hover:border-amber-400/50 bg-black/60 space-y-2 transition-all"
              >
                <div className="h-36 w-full overflow-hidden bg-black/80">
                  <img src={activeSubmission.renders.hero} alt="Hero View" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-2.5">
                  <div className="text-[9.5px] font-mono text-cyan-400 font-bold uppercase">01 · ORBITAL HERO</div>
                  <div className="text-xs font-bold text-white truncate">{activeSubmission.planetName}</div>
                </div>
              </div>

              <div
                onClick={() => setModalPlanet(activeSubmission)}
                className="cursor-pointer group rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-400/50 bg-black/60 space-y-2 transition-all"
              >
                <div className="h-36 w-full overflow-hidden bg-black/80">
                  <img src={activeSubmission.renders.flora || activeSubmission.renders.ecosystem} alt="Flora" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-2.5">
                  <div className="text-[9.5px] font-mono text-emerald-400 font-bold uppercase">02 · BOTANICAL FLORA</div>
                  <div className="text-xs font-bold text-white truncate">{activeSubmission.flora}</div>
                </div>
              </div>

              <div
                onClick={() => setModalPlanet(activeSubmission)}
                className="cursor-pointer group rounded-2xl overflow-hidden border border-white/10 hover:border-purple-400/50 bg-black/60 space-y-2 transition-all"
              >
                <div className="h-36 w-full overflow-hidden bg-black/80">
                  <img src={activeSubmission.renders.fauna} alt="Fauna" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-2.5">
                  <div className="text-[9.5px] font-mono text-purple-400 font-bold uppercase">03 · EXOTIC FAUNA</div>
                  <div className="text-xs font-bold text-white truncate">{activeSubmission.fauna}</div>
                </div>
              </div>

              <div
                onClick={() => setModalPlanet(activeSubmission)}
                className="cursor-pointer group rounded-2xl overflow-hidden border border-white/10 hover:border-cyan-400/50 bg-black/60 space-y-2 transition-all"
              >
                <div className="h-36 w-full overflow-hidden bg-black/80">
                  <img src={activeSubmission.renders.atmosphere} alt="Atmosphere" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-2.5">
                  <div className="text-[9.5px] font-mono text-cyan-400 font-bold uppercase">04 · COCKPIT ATMOSPHERE</div>
                  <div className="text-xs font-bold text-white truncate">{activeSubmission.atmosphere}</div>
                </div>
              </div>

              <div
                onClick={() => setModalPlanet(activeSubmission)}
                className="cursor-pointer group rounded-2xl overflow-hidden border border-white/10 hover:border-amber-400/50 bg-black/60 space-y-2 transition-all"
              >
                <div className="h-36 w-full overflow-hidden bg-black/80">
                  <img src={activeSubmission.renders.landmark} alt="Landmark" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-2.5">
                  <div className="text-[9.5px] font-mono text-amber-400 font-bold uppercase">05 · ICONIC MONUMENT</div>
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
                  <div
                    onClick={() => {
                      soundManager.playTone(660, 0.05);
                      setModalPlanet(sub);
                    }}
                    className="relative h-48 w-full overflow-hidden bg-black/90 cursor-pointer"
                  >
                    <img
                      src={sub.renders.hero}
                      alt={sub.planetName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/80 backdrop-blur-md text-amber-300 border border-amber-400/40">
                      RANK #{idx + 1}
                    </div>
                    <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/80 backdrop-blur-md text-cyan-300 border border-cyan-400/40">
                      {sub.votesCount} VOTES
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        onClick={() => {
                          soundManager.playTone(660, 0.05);
                          setModalPlanet(sub);
                        }}
                        className="text-base font-display font-bold text-white truncate cursor-pointer hover:text-amber-400 transition-colors"
                      >
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
                      {sub.futurePromise || sub.generatedLore}
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
                    onClick={() => {
                      soundManager.playTone(660, 0.05);
                      setModalPlanet(sub);
                    }}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-white/5 hover:bg-cyan-950/60 border border-white/10 hover:border-cyan-400/40 text-white/80 hover:text-cyan-300 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="View 5-Photo Dossier"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Dossier</span>
                  </button>

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
            isLocked={hasSubmittedContest}
            onComplete={handleWizardComplete}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* 5-PHOTO PLANET DOSSIER MODAL */}
      <PlanetDossierModal
        planet={modalPlanet}
        isOpen={Boolean(modalPlanet)}
        onClose={() => setModalPlanet(null)}
        onVote={handleVoteSubmission}
        onOpenCreator={onNavigateToCreator}
      />
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
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
  Clock,
  AlertCircle,
  RefreshCw,
  Cpu,
  Beaker,
  X,
  RotateCcw,
  Radar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../utils/audio';
import { formatAuthorName } from '../utils/holder';
import millAvatar from '../assets/images/mill_photo.jpg';
import amlemiOrbitalImg from '../assets/images/amlemi_renders/01-orbital.png';
import amlemiBotanicalImg from '../assets/images/amlemi_renders/02-botanical.png';
import amlemiFaunaImg from '../assets/images/amlemi_renders/03-fauna.png';
import amlemiCockpitImg from '../assets/images/amlemi_renders/04-cockpit.png';
import amlemiMonumentImg from '../assets/images/amlemi_renders/05-monument.png';

import { PlanetGeneratorChat } from './PlanetGeneratorChat';
import { PlanetDossierModal } from './PlanetDossierModal';
import { WorldStoryVerificationBadge } from './WorldStoryVerificationBadge';
import { AkinoyaSciFiLoader } from './AkinoyaSciFiLoader';
import { WizardAnswers, PlanetSubmission } from '../types/contest';
import {
  getStoredPlanetSubmissions,
  fetchPlanetSubmissions,
  getUserContestSubmission,
  formatAkinoyaPlanetName,
  generatePlanetLore,
  resolvePlanetRenders,
  savePlanetSubmission,
  togglePlanetSubmissionVote,
  subscribeToPlanetSubmissions,
  isCleanPhotorealistic,
  isForbiddenSubmission,
  isLiveGalaxyWorld,
  UI_RECALIBRATING_STATUS_TEXT,
} from '../data/contest';
import { attachContestSubmissionToCreator } from '../data/creators';
import {
  isPostLaunch,
  isPreLaunch,
  hasPaidMembership,
  openMembershipGateModal,
  openClaimWorldModal,
  isFoundingPioneerPlanet,
  isPioneerPlanet,
  isVipAccount,
  isVipPioneerPlanet,
} from '../utils/pioneer';
import { isFounderEmail, PRIMARY_FOUNDER_EMAIL } from '../data/vipTokens';
import { PRELAUNCH_GENERATION_LOCKED, PRELAUNCH_MESSAGE } from '../config/prelaunch';

export type SlotStreamStatus = 'PENDING' | 'SYNTHESIZING_4K' | 'DONE' | 'QUEUED' | 'ERROR';

export interface SlotStreamItem {
  id: 'hero' | 'flora' | 'fauna' | 'atmosphere' | 'landmark';
  alias: string;
  stepNumber: string;
  title: string;
  subtitle: string;
  category: string;
  status: SlotStreamStatus;
  url: string | null;
  error?: string | null;
}

const DEFAULT_SLOT_STREAM: SlotStreamItem[] = [
  {
    id: 'hero',
    alias: 'orbital',
    stepNumber: '01',
    title: 'ORBITAL HERO',
    subtitle: 'Planetary curvature, celestial disk & corona',
    category: 'Celestial Structure',
    status: 'PENDING',
    url: null,
  },
  {
    id: 'flora',
    alias: 'botanical',
    stepNumber: '02',
    title: 'BOTANICAL FLORA',
    subtitle: 'Bioluminescent alien botanical life & spore towers',
    category: 'Botanical Ecology',
    status: 'PENDING',
    url: null,
  },
  {
    id: 'fauna',
    alias: 'fauna',
    stepNumber: '03',
    title: 'EXOTIC FAUNA',
    subtitle: 'Xenobiological wildlife systems & apex creatures',
    category: 'Speculative Biology',
    status: 'PENDING',
    url: null,
  },
  {
    id: 'atmosphere',
    alias: 'atmosphere',
    stepNumber: '04',
    title: 'ATMOSPHERIC TROPOSPHERE',
    subtitle: 'Tropospheric cloud canyons & planetary sky phenomena',
    category: 'Troposphere & Horizon',
    status: 'PENDING',
    url: null,
  },
  {
    id: 'landmark',
    alias: 'monument',
    stepNumber: '05',
    title: 'ICONIC MONUMENT',
    subtitle: 'Ancient monumental monolith & founding architect creed',
    category: 'Architectural Relic',
    status: 'PENDING',
    url: null,
  },
];

interface ContestLaunchpadProps {
  onBackToHome: () => void;
  onNavigateToCommunity?: () => void;
  onNavigateToCreator?: (username: string) => void;
  onNavigateToGalaxy?: (planetId?: string) => void;
}

export const ContestLaunchpad: React.FC<ContestLaunchpadProps> = ({
  onBackToHome,
  onNavigateToCommunity,
  onNavigateToCreator,
  onNavigateToGalaxy,
}) => {
  const { user, profile, isAuthenticated, openAuthModal, updateProfile, role, isVip } = useAuth();

  const userDisplayName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`
    : profile?.full_name || (user?.email ? user.email.split('@')[0] : 'Architect');

  const username =
    profile?.username ||
    (user?.email ? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') : 'creator');

  const isFounderAdmin = isFounderEmail(user?.email || profile?.email);

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
  const [generationStageDetails, setGenerationStageDetails] = useState<string>('Parsing 5 personality coordinates...');
  const [generationSlotIndex, setGenerationSlotIndex] = useState<number>(1);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [modalPlanet, setModalPlanet] = useState<PlanetSubmission | null>(null);
  const [slotStream, setSlotStream] = useState<SlotStreamItem[]>(DEFAULT_SLOT_STREAM);
  const [founderTestBypass, setFounderTestBypass] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('akinoya_founder_test_bypass') !== 'false';
  });
  const [adminResetNotice, setAdminResetNotice] = useState<string | null>(null);

  // Live Production Vault.ai / Fal.ai 5-Question Synthesis Flow (official production flow only)
  const [submissionConfirmationNotice, setSubmissionConfirmationNotice] = useState<string | null>(null);

  // Dynamic vote-based ranking: highest votes at the top (merges user's active submission into showcase grid)
  const sortedSubmissions = useMemo(() => {
    const userEmail = (user?.email || profile?.email || '').trim().toLowerCase();
    const userId = user?.id || profile?.id;

    const isVisibleInLaunchpad = (sub: PlanetSubmission) => {
      if (isForbiddenSubmission(sub)) return false;
      if (!isPreLaunch()) return true;
      if (isLiveGalaxyWorld(sub)) return true;
      // Pre-release: creator sees their own world in launchpad, other visitors do not
      return Boolean(
        (userId && sub.userId === userId) ||
        (userEmail && sub.authorEmail && sub.authorEmail.toLowerCase() === userEmail)
      );
    };

    const list = allSubmissions.filter(isVisibleInLaunchpad);
    if (
      activeSubmission &&
      isVisibleInLaunchpad(activeSubmission) &&
      !list.some(
        (s) =>
          s.id === activeSubmission.id ||
          s.planetName?.toLowerCase() === activeSubmission.planetName?.toLowerCase()
      )
    ) {
      list.push(activeSubmission);
    }
    return list.sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));
  }, [allSubmissions, activeSubmission, user?.id, user?.email, profile?.id, profile?.email]);

  // Purge legacy browser-wide lock keys so new accounts never falsely inherit ONE-SHOT CLAIMED
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_generation_claimed');
      localStorage.removeItem('akinoya_guest_generations');
    }
  }, []);

  const getAccountLockKey = () => {
    const accountId = (user?.email || user?.id || profile?.id || '').toLowerCase().trim();
    if (!accountId) return null;
    return `user_generation_claimed_${accountId}`;
  };

  // Strict 1-Attempt Lock Pre-Check (Scoped per unique account)
  const isAccountGenerationClaimed = () => {
    if (typeof window === 'undefined' || !isAuthenticated) return false;
    const key = getAccountLockKey();
    if (!key) return false;
    return localStorage.getItem(key) === 'true';
  };

  const rawHasSubmittedContest = Boolean(
    isAuthenticated &&
      (profile?.has_submitted_contest ||
        profile?.contest_submission_id ||
        activeSubmission ||
        isAccountGenerationClaimed())
  );

  // Founder Test Bypass: allows odi.selis3@gmail.com to continuously test planet generation
  const hasSubmittedContest = isFounderAdmin && founderTestBypass ? false : rawHasSubmittedContest;

  const handleFounderAdminReset = async () => {
    if (!isFounderAdmin) return;
    soundManager.playTone(780, 0.08);
    if (typeof window !== 'undefined') {
      const key = getAccountLockKey();
      if (key) localStorage.removeItem(key);
      localStorage.removeItem('user_generation_claimed');
      localStorage.removeItem('akinoya_guest_generations');
      localStorage.setItem('akinoya_founder_test_bypass', 'true');
    }
    setFounderTestBypass(true);
    setActiveSubmission(null);
    setPreviewDossier(null);
    setPendingAnswers(null);

    try {
      await updateProfile({
        has_submitted_contest: false,
        contest_submission_id: '',
      });
    } catch {
      // Ignore profile sync warning
    }

    fetch('/api/generate-planet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id || profile?.id,
        email: user?.email || PRIMARY_FOUNDER_EMAIL,
        deviceId: typeof window !== 'undefined' ? localStorage.getItem('sillow_device_id') || undefined : undefined,
        resetLocks: true,
      }),
    }).catch(() => {});

    setAdminResetNotice('1-Shot Lock Reset — Ready for Fresh Planet Synthesis');
    setTimeout(() => setAdminResetNotice(null), 3500);
  };

  const handleToggleFounderBypass = () => {
    if (!isFounderAdmin) return;
    const next = !founderTestBypass;
    setFounderTestBypass(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('akinoya_founder_test_bypass', next ? 'true' : 'false');
    }
    soundManager.playTone(next ? 740 : 440, 0.06);
  };

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
    const list = getStoredPlanetSubmissions()
      .filter((s) => !isForbiddenSubmission(s))
      .sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));
    setAllSubmissions(list);

    fetchPlanetSubmissions(user?.id, user?.email).then((fresh) => {
      if (fresh && fresh.length > 0) {
        const valid = fresh
          .filter((s) => !isForbiddenSubmission(s))
          .sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));
        setAllSubmissions(valid);
        if (isAuthenticated && (user?.id || profile?.id || user?.email)) {
          const userSub = getUserContestSubmission(user?.id || profile?.id, user?.email);
          if (userSub && !isForbiddenSubmission(userSub)) {
            setActiveSubmission(userSub);
          }
        }
      }
    });

    if (isAuthenticated && (user?.id || profile?.id || user?.email)) {
      const userSub = getUserContestSubmission(user?.id || profile?.id, user?.email);
      if (userSub && !isForbiddenSubmission(userSub)) {
        setActiveSubmission(userSub);
      } else if (profile?.contest_submission_id) {
        const found = list.find((s) => s.id === profile.contest_submission_id && !isForbiddenSubmission(s));
        setActiveSubmission(found || null);
      } else {
        setActiveSubmission(null);
      }
    } else {
      setActiveSubmission(null);
    }

    const unsubscribe = subscribeToPlanetSubmissions((fresh) => {
      const valid = fresh
        .filter((s) => !isForbiddenSubmission(s))
        .sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));
      setAllSubmissions(valid);
      if (isAuthenticated && (user?.id || profile?.id || user?.email)) {
        const userSub = getUserContestSubmission(user?.id || profile?.id, user?.email);
        if (userSub && !isForbiddenSubmission(userSub)) {
          setActiveSubmission(userSub);
        }
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
      alert('You have already claimed your 1 generation attempt.');
      if (activeSubmission) {
        setModalPlanet(activeSubmission);
      }
      return;
    }
    soundManager.playTone(660, 0.08);
    // Explicitly mandate the "Create Your Free World" modal first before launching Mill
    openClaimWorldModal();
  };

  // Called when Mill completes the 8 questions (Step 1: 5 Photos -> Step 2: 9:16 Viral Video Trailer -> Step 3: Atomic Supabase Sync)
  const handleWizardComplete = async (answers: WizardAnswers) => {
    if (hasSubmittedContest) {
      soundManager.playError();
      alert('You have already claimed your 1 generation attempt.');
      return;
    }
    const planetName = formatAkinoyaPlanetName(answers.planetName, false) || answers.planetName || 'Äkinoya Frontier Sector';
    const answersWithFormattedName = { ...answers, planetName };
    setPendingAnswers(answersWithFormattedName);
    setIsChatOpen(false);
    setIsGeneratingRenders(true);
    setGenerationProgress(0);
    setGenerationStageName('INITIALIZING REAL-TIME 4K SYNTHESIS...');
    setGenerationStageDetails(`Connecting to Fal.ai Flux Schnell & 9:16 Video Engine for ${planetName}...`);
    soundManager.playTone(660, 0.08);

    // Initialize all 5 slots as PENDING in queue with no placeholder images
    const initialSlots: SlotStreamItem[] = DEFAULT_SLOT_STREAM.map((s) => ({
      ...s,
      status: 'PENDING',
      url: null,
      error: null,
    }));
    setSlotStream(initialSlots);

    // Synthesize official sector lore incorporating founding creed
    const lore = generatePlanetLore(answersWithFormattedName, userDisplayName);

    // Detect VIP Pioneer account status
    const isUserVip = Boolean(
      isVip ||
      profile?.has_vip_pass ||
      profile?.is_vip ||
      isVipAccount(user, profile, role, isVip)
    );

    // Mount initial preview dossier immediately so the user watches cards stream live
    const initialDraft: PlanetSubmission = {
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
      isPioneer: true,
      isVipPioneer: isUserVip,
      is_vip_pioneer: isUserVip,
      pioneerBadge: isUserVip ? 'VIP PIONEER' : 'PIONEER 2027',
      pioneer_badge: isUserVip ? 'VIP PIONEER' : 'PIONEER 2027',
      videoUrl: '',
      videoStatus: 'QUEUED_PENDING',
      sfxAudioUrl: '',
      sfxStatus: 'QUEUED_PENDING',
      renders: {
        hero: '',
        flora: '',
        fauna: '',
        atmosphere: '',
        landmark: '',
        ecosystem: '',
        videoUrl: '',
        sfxAudioUrl: '',
        sfxStatus: 'QUEUED_PENDING',
      },
      votesCount: 1,
      hasVoted: true,
      status: 'SUBMITTED',
      createdAt: new Date().toISOString().split('T')[0],
      votingDeadline: 'June 30, 2027',
    };
    setPreviewDossier(initialDraft);

    setTimeout(() => {
      const el = document.getElementById('live-dossier-preview');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);

    const collectedRenders: Record<string, string> = {
      hero: '',
      flora: '',
      fauna: '',
      atmosphere: '',
      landmark: '',
      ecosystem: '',
      videoUrl: '',
    };

    const aliasMap: Record<string, string> = {
      hero: '01_main',
      flora: '02_flora',
      fauna: '03_fauna',
      atmosphere: '04_atmo',
      landmark: '05_lore',
    };

    // EMERGENCY COST PROTECTION: pre-launch lock — skip ALL paid image/video generation.
    // Answers are still saved below (Step 3: Supabase/local + Pre-Launch Google Sheet).
    let synthesizedVideoUrl = '';
    if (PRELAUNCH_GENERATION_LOCKED) {
      setGenerationProgress(60);
      setGenerationStageName('PRE-LAUNCH MODE · SAVING YOUR WORLD');
      setGenerationStageDetails(PRELAUNCH_MESSAGE);
      setSlotStream((prev) => prev.map((s) => ({ ...s, status: 'QUEUED', url: null, error: PRELAUNCH_MESSAGE })));
    } else {
      // Step 1: Sequential Live Processing across all 5 photos (01_main through 05_lore)
      for (let i = 0; i < initialSlots.length; i++) {
        const slotItem = initialSlots[i];
        setGenerationSlotIndex(i + 1);
        setGenerationStageName(`SYNTHESIZING 4K: ${slotItem.title} (${i + 1}/5)...`);
        setGenerationStageDetails(slotItem.subtitle);
        setGenerationProgress(Math.round((i / (initialSlots.length + 1)) * 100));

        setSlotStream((prev) =>
          prev.map((s, idx) => (idx === i ? { ...s, status: 'SYNTHESIZING_4K', error: null } : s))
        );
        soundManager.playTone(600 + i * 70, 0.05);

        try {
          const res = await fetch('/api/generate-planet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user?.id || profile?.id,
              email: user?.email,
              deviceId: typeof window !== 'undefined' ? (localStorage.getItem('sillow_device_id') || undefined) : undefined,
              bypassLock: isFounderAdmin && founderTestBypass,
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
              slot: slotItem.alias,
            }),
          });

          if (res.status === 403) {
            const json = await res.json().catch(() => ({}));
            setIsGeneratingRenders(false);
            soundManager.playError();
            alert(json.message || 'You have already claimed your 1 generation attempt.');
            return;
          }

          const json = await res.json().catch(() => ({}));

          if (res.ok && json.success && json.imageUrl) {
            collectedRenders[slotItem.id] = json.imageUrl;
            if (slotItem.id === 'flora') collectedRenders.ecosystem = json.imageUrl;
            const aliasKey = aliasMap[slotItem.id];
            if (aliasKey) {
              collectedRenders[aliasKey] = json.imageUrl;
            }

            setSlotStream((prev) =>
              prev.map((s, idx) =>
                idx === i ? { ...s, status: 'DONE', url: json.imageUrl, error: null } : s
              )
            );
            setPreviewDossier((prev) =>
              prev
                ? {
                    ...prev,
                    renders: {
                      ...prev.renders,
                      [slotItem.id]: json.imageUrl,
                      ...(aliasKey ? { [aliasKey]: json.imageUrl } : {}),
                      ecosystem: collectedRenders.ecosystem,
                    },
                  }
                : null
            );
            soundManager.playTone(880, 0.06);
          } else {
            setSlotStream((prev) =>
              prev.map((s, idx) =>
                idx === i ? { ...s, status: 'QUEUED', error: UI_RECALIBRATING_STATUS_TEXT } : s
              )
            );
            soundManager.playTone(660, 0.05);
          }
        } catch {
          setSlotStream((prev) =>
            prev.map((s, idx) =>
              idx === i
                ? {
                    ...s,
                    status: 'QUEUED',
                    error: UI_RECALIBRATING_STATUS_TEXT,
                  }
                : s
            )
          );
          soundManager.playTone(660, 0.05);
        }

        setGenerationProgress(Math.round(((i + 1) / (initialSlots.length + 1)) * 100));
      }

      // Step 2: Viral 9:16 Video Trailer Synthesis (from all 5 newly rendered photos)
      setGenerationStageName('SYNTHESIZING 9:16 VIRAL VIDEO TRAILER (5S)...');
      setGenerationStageDetails(`Fusing all 5 rendered photos (${planetName}) into a dynamic continuous FPV drone flight via Seedance 2.5...`);

      if (collectedRenders.hero) {
        try {
          const photoList = [
            collectedRenders.hero,
            collectedRenders.flora,
            collectedRenders.fauna,
            collectedRenders.atmosphere,
            collectedRenders.landmark,
          ].filter(Boolean);

          const videoRes = await fetch('/api/generate-planet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user?.id || profile?.id,
              email: user?.email,
              bypassLock: isFounderAdmin && founderTestBypass,
              planetName,
              heroImageUrl: collectedRenders.hero,
              slot: 'video',
              renders: collectedRenders,
              imageUrls: photoList,
              authorUsername: username,
              architectName: userDisplayName,
              relaxation: answers.relaxation,
              creativeExpression: answers.creativeExpression,
              naturalEnvironment: answers.naturalEnvironment,
              lifePhilosophy: answers.lifePhilosophy,
              admiredCreature: answers.admiredCreature,
              colorPalette: answers.colorPalette,
              resilienceStory: answers.resilienceStory,
              futurePromise: answers.futurePromise,
              atmosphere: answers.atmosphere,
              flora: answers.flora,
              fauna: answers.fauna,
              sonicVibe: answers.sonicVibe,
              visualAesthetic: answers.visualAesthetic,
              landmark: answers.landmark,
              biome: answers.biome,
            }),
          });
          const videoJson = await videoRes.json().catch(() => ({}));
          if (videoRes.ok && videoJson.success && videoJson.videoUrl) {
            synthesizedVideoUrl = videoJson.videoUrl;
            collectedRenders.videoUrl = synthesizedVideoUrl;
            setPreviewDossier((prev) =>
              prev
                ? {
                    ...prev,
                    videoUrl: synthesizedVideoUrl,
                    videoStatus: 'READY',
                    renders: {
                      ...prev.renders,
                      videoUrl: synthesizedVideoUrl,
                    },
                  }
                : null
            );
          }
        } catch (vidErr) {
          console.warn('[Video Trailer] Queued pending:', vidErr);
        }
      }

    }

    // Step 3: Atomic Database Sync (5 image URLs + lore + 9:16 video_url)
    const synchronizedDraft: PlanetSubmission = {
      ...initialDraft,
      videoUrl: synthesizedVideoUrl,
      videoStatus: synthesizedVideoUrl ? 'READY' : 'QUEUED_PENDING',
      sfxAudioUrl: collectedRenders.sfxAudioUrl || '',
      sfxStatus: collectedRenders.sfxAudioUrl ? 'READY' : 'QUEUED_PENDING',
      renders: {
        hero: collectedRenders.hero,
        flora: collectedRenders.flora,
        fauna: collectedRenders.fauna,
        atmosphere: collectedRenders.atmosphere,
        landmark: collectedRenders.landmark,
        ecosystem: collectedRenders.ecosystem,
        videoUrl: synthesizedVideoUrl,
        video_url: synthesizedVideoUrl,
        videoStatus: synthesizedVideoUrl ? 'READY' : 'QUEUED_PENDING',
        sfxAudioUrl: collectedRenders.sfxAudioUrl || '',
        sfx_audio_url: collectedRenders.sfxAudioUrl || '',
        sfxStatus: collectedRenders.sfxAudioUrl ? 'READY' : 'QUEUED_PENDING',
        '01_main': collectedRenders.hero,
        '02_flora': collectedRenders.flora,
        '03_fauna': collectedRenders.fauna,
        '04_atmo': collectedRenders.atmosphere,
        '05_lore': collectedRenders.landmark,
      },
    };

    setPreviewDossier(synchronizedDraft);
    await savePlanetSubmission(synchronizedDraft);

    // Automated Pre-Launch Google Sheets Master Database Submission
    fetch('/api/prelaunch/submission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user?.email || synchronizedDraft.authorEmail,
        userName: userDisplayName || synchronizedDraft.authorName,
        worldName: synchronizedDraft.planetName,
        sectorId: synchronizedDraft.sectorId || 'AKN-01',
        q1: synchronizedDraft.atmosphere,
        q2: synchronizedDraft.flora,
        q3: synchronizedDraft.landmark,
        q4: synchronizedDraft.fauna,
        q5: synchronizedDraft.futurePromise,
        humanAnswers: synchronizedDraft.humanAnswers,
        status: 'Your world will be available on the ninth of January.',
      }),
    }).catch((err) => console.warn('[Contest] Pre-launch sheets sync error:', err));

    setGenerationProgress(100);
    setGenerationStageName('SYNTHESIS SEQUENCE COMPLETE');
    setGenerationStageDetails('Your submission has been received! Your world will be available on the ninth of January.');
    setIsGeneratingRenders(false);
    soundManager.playUnlockChime();
  };

  // Re-trigger synthesis for a single slot
  const handleRetrySlot = async (slotIndex: number) => {
    if (!pendingAnswers) return;
    // EMERGENCY COST PROTECTION: no paid regeneration during pre-launch lock
    if (PRELAUNCH_GENERATION_LOCKED) {
      setSlotStream((prev) =>
        prev.map((s, idx) => (idx === slotIndex ? { ...s, status: 'QUEUED', url: null, error: PRELAUNCH_MESSAGE } : s))
      );
      return;
    }
    const slotItem = slotStream[slotIndex];
    if (!slotItem) return;

    const aliasMap: Record<string, string> = {
      hero: '01_main',
      flora: '02_flora',
      fauna: '03_fauna',
      atmosphere: '04_atmo',
      landmark: '05_lore',
    };
    const aliasKey = aliasMap[slotItem.id];

    soundManager.playTone(660, 0.08);
    setSlotStream((prev) =>
      prev.map((s, idx) => (idx === slotIndex ? { ...s, status: 'SYNTHESIZING_4K', error: null } : s))
    );

    try {
      const res = await fetch('/api/generate-planet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || profile?.id,
          email: user?.email,
          bypassLock: isFounderAdmin && founderTestBypass,
          ...pendingAnswers,
          slot: slotItem.alias,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && json.imageUrl) {
        setSlotStream((prev) =>
          prev.map((s, idx) =>
            idx === slotIndex ? { ...s, status: 'DONE', url: json.imageUrl, error: null } : s
          )
        );
        setPreviewDossier((prev) =>
          prev
            ? {
                ...prev,
                renders: {
                  ...prev.renders,
                  [slotItem.id]: json.imageUrl,
                  ...(aliasKey ? { [aliasKey]: json.imageUrl } : {}),
                  ...(slotItem.id === 'flora' ? { ecosystem: json.imageUrl } : {}),
                },
              }
            : null
        );
        soundManager.playUnlockChime();
      } else {
        setSlotStream((prev) =>
          prev.map((s, idx) =>
            idx === slotIndex ? { ...s, status: 'QUEUED', error: UI_RECALIBRATING_STATUS_TEXT } : s
          )
        );
        soundManager.playTone(660, 0.05);
      }
    } catch {
      setSlotStream((prev) =>
        prev.map((s, idx) =>
          idx === slotIndex
            ? {
                ...s,
                status: 'QUEUED',
                error: UI_RECALIBRATING_STATUS_TEXT,
              }
            : s
        )
      );
      soundManager.playTone(660, 0.05);
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
      if (!(isFounderAdmin && founderTestBypass)) {
        await updateProfile({
          contest_submission_id: previewDossier.id,
          has_submitted_contest: true,
        });

        // 3. Per-Account Session Lock
        if (typeof window !== 'undefined') {
          const key = getAccountLockKey();
          if (key) localStorage.setItem(key, 'true');
        }

        // Notify backend to register permanent in-memory lock for this account
        fetch('/api/generate-planet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id || profile?.id,
            email: user?.email,
            deviceId: typeof window !== 'undefined' ? (localStorage.getItem('sillow_device_id') || undefined) : undefined,
            markCompleted: true,
          }),
        }).catch(() => {});
      }

      // 4. Sync World Name & Architect record to Google Sheets (`VIP GUESTS` tab)
      if (user?.email) {
        fetch('/api/sync-sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            fullName: userDisplayName,
            worldName: previewDossier.planetName,
            founderPassStatus: isFounderAdmin
              ? 'MASTER FOUNDER ORIGINAL (AKN-VIP-2027-X0914)'
              : isVip
              ? 'VIP PASS CLAIMED'
              : 'STANDARD ARCHITECT',
            role: isFounderAdmin
              ? 'MASTER FOUNDER'
              : isVip
              ? 'VIP ARCHITECT'
              : 'PIONEER ARCHITECT',
          }),
        }).catch(() => {});
      }

      // 4b. Automated Pre-Launch Google Sheets Master Database Submission
      fetch('/api/prelaunch/submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email || previewDossier.authorEmail,
          userName: userDisplayName || previewDossier.authorName,
          worldName: previewDossier.planetName,
          sectorId: previewDossier.sectorId || 'AKN-01',
          q1: previewDossier.atmosphere,
          q2: previewDossier.flora,
          q3: previewDossier.landmark,
          q4: previewDossier.fauna,
          q5: previewDossier.futurePromise,
          humanAnswers: previewDossier.humanAnswers,
          status: 'Your world will be available on the ninth of January.',
        }),
      }).catch((err) => console.warn('[Contest] Pre-launch sheets sync error:', err));

      // 5. Attach renders & lore to creator's public portfolio (/creators/[username])
      attachContestSubmissionToCreator(username, userDisplayName, previewDossier);

      // 6. Update local state
      setActiveSubmission(previewDossier);
      setSubmissionConfirmationNotice('Your submission has been received! Your world will be available on the ninth of January.');
      setPreviewDossier(null);
      setPendingAnswers(null);
      setAllSubmissions((prev) => [previewDossier, ...prev.filter((p) => p.id !== previewDossier.id)]);

      // 7. Celebration
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
    const userEmail = (user?.email || profile?.email || '').trim().toLowerCase();
    const userUsername = profile?.username || user?.user_metadata?.username || user?.user_metadata?.full_name || '';
    const res = await togglePlanetSubmissionVote(submissionId, user?.id, userEmail, userUsername);
    if (!res.success && res.error) {
      soundManager.playError();
      alert(res.error);
      return;
    }
    if (res.success) {
      setAllSubmissions((prev) =>
        prev
          .map((s) => (s.id === submissionId ? { ...s, votesCount: res.newVotesCount, hasVoted: res.hasVoted } : s))
          .sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0))
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
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0a0b10]/90 backdrop-blur-xl px-2.5 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-1.5 sm:gap-3 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-mono transition-colors cursor-pointer min-h-[38px] sm:min-h-[40px] shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">Home</span>
          </button>

          <div className="h-4 w-px bg-white/10 hidden sm:block shrink-0" />

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="p-1 rounded-md bg-amber-400 text-black shrink-0">
              <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-black" />
            </span>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-display font-bold tracking-wide text-white truncate block">
                <span className="sm:hidden">Contest</span>
                <span className="hidden sm:inline">Äkinoya Worldbuilding Contest</span>
              </span>
              <span className="text-[10px] font-mono text-amber-400/90 hidden md:block">
                1 Golden Ticket · Closes June 30, 2027
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {onNavigateToGalaxy && (
            <button
              type="button"
              onClick={() => onNavigateToGalaxy()}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/40 text-cyan-200 text-xs font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-[40px] shadow-[0_0_12px_rgba(6,182,212,0.25)]"
              title="Galaxy Navigator"
            >
              <Radar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline">Galaxy Navigator</span>
              <span className="sm:hidden text-[11px] font-bold">Galaxy</span>
            </button>
          )}

          {onNavigateToCommunity && (
            <button
              type="button"
              onClick={onNavigateToCommunity}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-[40px] whitespace-nowrap shrink-0"
              title="Lore Hub & Governance"
            >
              <Globe2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">Lore Hub &amp; Governance</span>
              <span className="lg:hidden text-[11px] font-bold">Lore Hub</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyShare}
            className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-mono transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-[40px]"
            title="Share Contest"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
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
                Collaborate with <strong>Mill</strong>, our planetary AI synthesizer. Answer 5 personality questions (~3 minutes) to generate a complete 5-photo high-resolution cinematic sci-fi dossier, orbital specs, and sector lore.
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
            <div className="lg:col-span-4 p-5 sm:p-6 rounded-2xl bg-[#060a14] border border-white/15 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.4)] shrink-0">
                  <img src={millAvatar} alt="Mill" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="text-sm font-display font-bold text-white">Mill · Planetary AI</div>
                  <div className="text-[11px] font-mono text-cyan-300">Ready to synthesize</div>
                </div>
              </div>

              {submissionConfirmationNotice && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/90 via-cyan-950/90 to-emerald-950/90 border border-emerald-400/70 text-emerald-200 text-xs font-mono shadow-[0_0_25px_rgba(52,211,153,0.3)] flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-0.5 text-left">
                    <span className="font-bold uppercase tracking-wider block text-emerald-300 text-[10.5px]">CONFIRMATION RECORDED</span>
                    <p className="font-sans text-xs text-white/95 font-medium leading-relaxed">
                      {submissionConfirmationNotice}
                    </p>
                  </div>
                </div>
              )}

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
                    <p className="text-[11px] text-amber-200 font-mono font-medium">
                      Your submission has been received! Your world will be available on the ninth of January.
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
                    <span>
                      {isAuthenticated
                        ? 'Start Worldbuilding with Mill'
                        : 'Sign In to Enter Contest'}
                    </span>
                  </button>
                </div>
              )}

              {/* Dedicated Founder Test Bypass & Admin Reset Panel (Strictly for odi.selis3@gmail.com) */}
              {isFounderAdmin && (
                <div className="pt-3 mt-3 border-t border-cyan-500/30 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      Founder Dev Bypass ({PRIMARY_FOUNDER_EMAIL})
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleFounderBypass}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                        founderTestBypass
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-white/10 text-white/60 border-white/20'
                      }`}
                    >
                      {founderTestBypass ? 'BYPASS: ON' : 'BYPASS: OFF'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleFounderAdminReset}
                    className="w-full py-2 px-3 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-500/40 text-cyan-200 font-mono text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Admin Reset 1-Shot Lock &amp; Test Fresh</span>
                  </button>

                  {adminResetNotice && (
                    <div className="text-[10px] font-mono text-emerald-300 text-center bg-emerald-950/50 border border-emerald-500/30 rounded-md py-1 px-2">
                      {adminResetNotice}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* REAL-TIME SEQUENTIAL 4K DOSSIER PREVIEW & SYNTHESIS STREAM */}
        {(previewDossier || isGeneratingRenders) && (!activeSubmission || (isFounderAdmin && founderTestBypass)) && (
          <section
            id="live-dossier-preview"
            className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-cyan-950/40 via-black to-black border-2 border-cyan-400/60 shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-6"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-400/40 font-bold uppercase tracking-wider">
                    Live Dossier Preview · Nano Banana 4K &amp; Seedance 2.5 Engine
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
                    {previewDossier?.planetName || pendingAnswers?.planetName || 'Frontier Sector'}
                  </h2>
                  {(previewDossier?.biome || pendingAnswers?.biome) && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-950/70 text-amber-300 border border-amber-400/40 font-bold">
                      {previewDossier?.biome || pendingAnswers?.biome}
                    </span>
                  )}
                  {(previewDossier?.sectorName || pendingAnswers?.sectorName) && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-white/80 border border-white/20">
                      {previewDossier?.sectorName || pendingAnswers?.sectorName}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/60 font-mono mt-0.5">
                  {isGeneratingRenders
                    ? 'Watch each 4K photographic render synthesize sequentially in real-time.'
                    : 'Review your 5-photo synthesized specs and lore before publishing to the Governance Council.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isGeneratingRenders || !previewDossier}
                  onClick={() => previewDossier && setModalPlanet(previewDossier)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-400/50 text-cyan-300 text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Inspect 5-Photo Modal</span>
                </button>

                <button
                  type="button"
                  onClick={handleApproveAndSubmit}
                  disabled={isSubmitting || isGeneratingRenders || !previewDossier}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl font-mono font-bold text-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black shadow-[0_0_25px_rgba(245,158,11,0.4)]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'PROCESSING...'
                      : isGeneratingRenders
                      ? 'SYNTHESIS IN PROGRESS...'
                      : 'APPROVE & SUBMIT ENTRY'}
                  </span>
                </button>
              </div>
            </div>

            {/* Real-time Telemetry Progress Bar during Active Generation */}
            {isGeneratingRenders && (
              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-400/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-lg bg-cyan-900/60 border border-cyan-400/40 text-cyan-300">
                      <Cpu className="w-4 h-4 animate-pulse" />
                    </span>
                    <div>
                      <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                        {generationStageName}
                      </div>
                      <div className="text-[11px] font-mono text-white/70">
                        {generationStageDetails}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-white/50">SEQUENCE PROGRESS:</span>
                    <span className="text-cyan-300 font-bold text-sm">{generationProgress}%</span>
                  </div>
                </div>

                <div className="h-2 w-full bg-black/80 rounded-full overflow-hidden border border-white/10 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-amber-400 shadow-[0_0_12px_rgba(56,189,248,0.8)] transition-all duration-300"
                    style={{ width: `${Math.min(100, generationProgress)}%` }}
                  />
                </div>
              </div>
            )}

            {/* 5 Sillow Mill 4K Visual Cards (Step-by-Step Live Stream UI) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {slotStream.map((item, idx) => {
                const isPending = item.status === 'PENDING';
                const isSynthesizing = item.status === 'SYNTHESIZING_4K';
                const isDone = item.status === 'DONE' && Boolean(item.url);
                const isQueued = item.status === 'QUEUED' || item.status === 'ERROR';

                return (
                  <div
                    key={item.id}
                    className={`relative rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col justify-between ${
                      isSynthesizing
                        ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_35px_rgba(6,182,212,0.45)] ring-2 ring-cyan-400/50'
                        : isDone
                        ? 'border-emerald-500/40 bg-black/80 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                        : isQueued
                        ? 'border-cyan-500/40 bg-gradient-to-b from-[#070d1e] via-[#050813] to-black shadow-[0_0_25px_rgba(6,182,212,0.18)]'
                        : 'border-white/10 bg-black/70 opacity-60'
                    }`}
                  >
                    {/* Card Header Status Pill */}
                    <div className="p-3 border-b border-white/10 flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-white/80 truncate">
                        {item.stepNumber} · {item.title}
                      </span>

                      {isPending && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 font-bold uppercase tracking-wider shrink-0">
                          [ PENDING QUEUE ]
                        </span>
                      )}

                      {isSynthesizing && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-400 text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.6)] shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                          [ SYNTHESIZING 4K... ]
                        </span>
                      )}

                      {isDone && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-400/60 text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          [ 4K RENDER READY ]
                        </span>
                      )}

                      {isQueued && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-200 font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          [ QUEUED ]
                        </span>
                      )}
                    </div>

                    {/* Visual Canvas Slot Container */}
                    <div className="relative h-48 w-full bg-black overflow-hidden flex items-center justify-center">
                      {/* Active 4K Image Render with Smooth Reveal */}
                      {isDone && item.url && (
                        <img
                          src={item.url}
                          alt={item.title}
                          className="w-full h-full object-cover transition-all duration-700 hover:scale-105"
                        />
                      )}

                      {/* Active Synthesis Overlay Animation */}
                      {isSynthesizing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/85 space-y-3">
                          <div className="relative w-16 h-16 rounded-full border-2 border-cyan-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.5)]">
                            <div
                              className="absolute inset-0 rounded-full border border-dashed border-amber-400/60 animate-spin"
                              style={{ animationDuration: '4s' }}
                            />
                            <Cpu className="w-7 h-7 text-cyan-300 animate-pulse" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[11px] font-mono font-bold text-cyan-300 tracking-wider block">
                              SYNTHESIZING 4K ASSET
                            </span>
                            <span className="text-[10px] font-mono text-white/50 block">
                              Fal.ai Flux Schnell 4K
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Pending Queue State */}
                      {isPending && (
                        <div className="flex flex-col items-center justify-center p-4 text-center text-white/30 space-y-2">
                          <Clock className="w-8 h-8 opacity-40 animate-pulse" />
                          <span className="text-[10.5px] font-mono uppercase tracking-wider">
                            Waiting in Queue...
                          </span>
                        </div>
                      )}

                      {/* Calm, Branded Waiting State for QUEUED_PENDING */}
                      {isQueued && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-[#070d1e]/95 via-[#050813]/95 to-black/95 space-y-2.5">
                          <div className="relative w-12 h-12 rounded-full border border-cyan-400/40 bg-cyan-950/40 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                            <div
                              className="absolute inset-0 rounded-full border border-dashed border-amber-400/40 animate-spin"
                              style={{ animationDuration: '8s' }}
                            />
                            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                          </div>
                          <span className="text-[10.5px] font-mono font-bold text-cyan-200 tracking-wider uppercase">
                            STATUS: QUEUED_PENDING
                          </span>
                          <p className="text-[10px] font-mono text-white/75 leading-relaxed px-1">
                            {item.error || UI_RECALIBRATING_STATUS_TEXT}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleRetrySlot(idx)}
                            className="mt-0.5 px-3 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-400/40 text-cyan-200 font-mono text-[9.5px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            <span>Check Synthesis Status</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Card Details Footer */}
                    <div className="p-3 bg-black/60 border-t border-white/5 space-y-1">
                      <div className="text-[9.5px] font-mono text-cyan-400/80 font-bold uppercase truncate">
                        {item.category}
                      </div>
                      <div className="text-xs font-mono text-white/70 line-clamp-2 leading-tight">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 9:16 Story & Trailer Verification Hub (when previewDossier is active) */}
            {previewDossier && (
              <WorldStoryVerificationBadge
                dossier={previewDossier}
                onInspectDossier={(d) => setModalPlanet(d)}
              />
            )}

            {/* Generated Lore story */}
            {previewDossier?.generatedLore && (
              <div className="p-5 rounded-2xl bg-[#070b16] border border-white/10 space-y-2">
                <span className="text-[10.5px] font-mono text-amber-300 font-bold uppercase">
                  AI-SYNTHESIZED PLANETARY LORE · FAL.AI FLUX SCHNELL &amp; 9:16 TRAILER
                </span>
                <p className="text-xs sm:text-sm text-white/85 font-sans leading-relaxed whitespace-pre-line">
                  {previewDossier.generatedLore}
                </p>
              </div>
            )}
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

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-amber-300 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-400/50 font-extrabold shadow-[0_0_12px_rgba(251,191,36,0.25)]">
                ⚡ {allSubmissions.filter((s) => isPioneerPlanet(s)).length} Pioneer Worlds
              </span>
              <span className="text-xs font-mono text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/40 font-extrabold shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                {allSubmissions.length} Registered Worlds
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedSubmissions.map((sub, idx) => {
              const isFounder = isFoundingPioneerPlanet(sub);
              const isPioneer = isPioneerPlanet(sub);
              const isUserWorld =
                sub.id === activeSubmission?.id ||
                (user?.id && sub.userId === user.id) ||
                (user?.email && sub.authorEmail?.toLowerCase() === user.email.toLowerCase());
              return (
                <div
                  key={sub.id}
                  className={`rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-950/40 via-[#060c18]/85 to-[#040812]/90 backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between shadow-[0_10px_32px_rgba(0,0,0,0.5)] group ${
                    isFounder || isUserWorld
                      ? 'border-amber-400/60 hover:border-amber-300 shadow-[0_10px_36px_rgba(0,0,0,0.55),0_0_25px_rgba(245,158,11,0.2)]'
                      : 'border-cyan-500/30 hover:border-amber-400/50'
                  }`}
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
                      <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-[#050914]/90 backdrop-blur-md border border-amber-400/60 shadow-[0_0_14px_rgba(251,191,36,0.4)]">
                        <span className="bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent">
                          RANK #{idx + 1}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-[#050914]/90 backdrop-blur-md border border-cyan-400/60 shadow-[0_0_14px_rgba(34,211,238,0.4)]">
                        <span className="bg-gradient-to-b from-cyan-100 via-cyan-300 to-sky-400 bg-clip-text text-transparent">
                          ★ {sub.votesCount} VOTES
                        </span>
                      </div>
                      {isPioneer && (
                        <div className="absolute bottom-2.5 left-3 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold bg-gradient-to-r from-amber-500/85 via-yellow-400/90 to-amber-500/85 text-black border border-amber-200/80 shadow-[0_0_14px_rgba(251,191,36,0.6)] uppercase tracking-wider">
                          {isFounder
                            ? '👑 FOUNDING PIONEER · #01'
                            : isVipPioneerPlanet(sub)
                            ? '👑 VIP PIONEER'
                            : '⚡ PIONEER 2027'}
                        </div>
                      )}
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
                        <span className="truncate">By {formatAuthorName(sub.authorName)}</span>
                        {isFounder && (
                          <span className="px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                            FOUNDER
                          </span>
                        )}
                        {isUserWorld && (
                          <span className="px-1.5 py-0.2 rounded text-[8.5px] font-mono font-extrabold bg-cyan-400/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.25)]">
                            YOUR WORLD
                          </span>
                        )}
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

                  <div className="p-4 border-t border-white/10 flex items-center justify-between gap-2 bg-[#050812]/90">
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
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black shadow-[0_0_16px_rgba(245,158,11,0.4)]'
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
              );
            })}
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
        onNavigateToGalaxy={onNavigateToGalaxy}
      />
    </div>
  );
};

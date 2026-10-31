import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import passCardImg from '../assets/images/akinoya_pass_card_1790852652003.jpg';
import bingaaComicCover from '../assets/images/bingaa_comic_cover.jpg';
import visualizerThumbnailImg from '../assets/images/visualizer_thumbnail.png';
import moodboardImg from '../assets/images/Mood.png';
import sillowMillLogoUrl from '../assets/images/Sillowmilllogo.png';
import amlemiOrbitalImg from '../assets/images/amlemi_renders/01-orbital.png';
import galaxyOverviewImg from '../assets/images/Galaxy.png';
import dnVideo from '../assets/videos/DNN.mp4';
import dnThumbnailImg from '../assets/images/dn_thumbnail.png';
import dontNeedVideo from '../assets/videos/DNN.mp4';
import bingaaLoopVideo from '../assets/videos/Bingaaloop.mp4';
import {
  Lock,
  Unlock,
  Key,
  Sparkles,
  ShieldCheck,
  Compass,
  Radio,
  BookOpen,
  QrCode,
  Check,
  Copy,
  ClipboardPaste,
  Eye,
  Globe2,
  Bell,
  Mail,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  AudioWaveform,
  Play,
  Pause,
  X,
  Film,
  Vote,
  Package,
  Volume2,
  VolumeX,
  CreditCard,
  ShoppingBag,
  CheckCircle2,
  Gem,
  Download,
  Trophy,
  Camera,
  ThumbsUp,
  Flame,
  Share2,
  Radar,
  Sliders,
  Gamepad2,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { planetSoundtrack } from '../utils/soundtrack';
import { useHolderName, isValidPassId, TOTAL_EDITION_LIMIT, formatTitleCaseUserName } from '../utils/holder';
import { useVipAccess } from '../context/VipAccessContext';
import { useAuth } from '../context/AuthContext';
import { PlanetSubmission } from '../types/contest';
import {
  getUserContestSubmission,
  fetchUserContestSubmission,
  getPlanetPhotoCards,
  getStoredPlanetSubmissions,
  togglePlanetSubmissionVote,
  fetchPlanetSubmissions,
  subscribeToPlanetSubmissions,
  INITIAL_SUBMISSIONS,
  CURATED_GALAXY_WORLD_IDS,
  isLiveGalaxyWorld,
  isQueuedUserWorld,
} from '../data/contest';
import { getUserStatusConfig, getMobileHeaderRoleConfig } from '../utils/statusPill';
import {
  isFoundingPioneerPlanet,
  isPioneerPlanet,
  isVipPioneerPlanet,
  isPreLaunch,
  getStoredSectorClaim,
  SectorClaimRecord,
} from '../utils/pioneer';
import { PlanetDossierModal } from './PlanetDossierModal';
import { VisualizerPlayerModal } from './VisualizerPlayerModal';
import { MyAssetsMasterCarousel } from './MyAssetsMasterCarousel';
import { WorldReleaseStatusBanner } from './WorldReleaseStatusBanner';
import {
  BINGAA_PDF_URL,
  BINGAA_PDF_FILENAME,
  BINGAA_COVER_URL,
  BINGAA_COVER_FILENAME,
  deriveEditionNumber,
  downloadCertificatePng,
  normalizePassId,
  useCertificate,
  getMasterCertificate,
  BingaaCertificate,
} from '../utils/certificate';
import { CertificateOfAuthenticity } from './CertificateOfAuthenticity';
import { isFounderEmail } from '../lib/vipTokens';
import { scrollToVisualizerHub, scrollToVisualizerArchive } from '../utils/scroll';

// pdf.js is heavy — only fetch the reader chunk when a verified holder opens the comic
const BingaaComicReader = lazy(() => import('./BingaaComicReader'));

// Canvas 2D engine & assets are lazily loaded so the main platform bundle remains lean
const AkinoyaRunnerModal = lazy(() =>
  import('./runner/AkinoyaRunnerModal').then((m) => ({ default: m.AkinoyaRunnerModal }))
);

export const FOUNDING_PASS_ID = 'AKN-VIP-2027-X0914';
export const MEMBERSHIP_LAUNCH_DATE = new Date('2027-01-09T00:00:00Z');
export const isMembershipLaunchLocked = new Date() < MEMBERSHIP_LAUNCH_DATE;

export interface VisualizerTrack {
  id: string;
  title: string;
  code: string;
  defaultUnlocked?: boolean;
  artworkUrl?: string;
  videoUrl?: string;
}

export const DN_VIDEO_URL = dnVideo || '/videos/DNN.mp4';
export const DONT_NEED_VIDEO_URL = dontNeedVideo || '/videos/DNN.mp4';
export const BINGAA_LOOP_VIDEO_URL = bingaaLoopVideo || '/videos/Bingaaloop.mp4';

const VISUALIZER_TRACKS: VisualizerTrack[] = [
  {
    id: '01',
    title: "Don't Need",
    code: 'DONTNEED',
    defaultUnlocked: true,
    artworkUrl: dnThumbnailImg || visualizerThumbnailImg,
    videoUrl: DN_VIDEO_URL,
  },
  {
    id: '02',
    title: "Bingäa",
    code: 'BINGAA',
    defaultUnlocked: true,
    artworkUrl: moodboardImg,
    videoUrl: BINGAA_LOOP_VIDEO_URL,
  },
  { id: '03', title: "Memories", code: 'MEMORIES' },
  { id: '04', title: "Hurry", code: 'HURRY' },
  { id: '05', title: "Know Me", code: 'KNOWME' },
  { id: '06', title: "Bignäa II", code: 'BIGNAA2' },
  { id: '07', title: "Everyday", code: 'EVERYDAY' },
  { id: '08', title: "Could Forget", code: 'COULDFORGET' },
  { id: '09', title: "Yea Yeah Yeah", code: 'YEAYEAHYEAH' },
  { id: '10', title: "Sideways", code: 'SIDEWAYS' },
  { id: '11', title: "Goodbye", code: 'GOODBYE' },
];

export interface PerkModule {
  id: string;
  number: string;
  category: string;
  title: string;
  bullets: string[];
  icon: React.ElementType;
}

const PERK_MODULES: PerkModule[] = [
  {
    id: 'animation',
    number: '01',
    category: 'ANIMATION & 4K',
    title: 'Animation & 3D Cinematic Early Access',
    bullets: [
      '48-Hour Early Access to new episodes & visualizers',
      'Raw storyboards & 3D pipeline breakdowns',
      'AI & Animation prompt frameworks',
    ],
    icon: Film,
  },
  {
    id: 'vault',
    number: '02',
    category: 'MUSIC & SOUND',
    title: 'Unreleased Music Vault & DAW Templates',
    bullets: [
      'Unreleased tracks & VIP audio masters',
      'Downloadable DAW project templates',
    ],
    icon: Radio,
  },
  {
    id: 'governance',
    number: '03',
    category: 'LORE & COMMUNITY',
    title: 'Äkinoya Worldbuilding, Lore & Governance',
    bullets: [
      'Deep lore articles & concept art expansions',
      'Direct governance voting on lore decisions',
      'Exclusive behind-the-scenes production logs',
    ],
    icon: Vote,
  },
  {
    id: 'drops',
    number: '04',
    category: 'ASSETS & DROPS',
    title: 'Exclusive 4K Assets & Merch Drops',
    bullets: [
      'High-res 4K wallpapers for desktop & mobile',
      'Downloadable project blueprints & digital asset bundles',
      'Merch whitelist priority & discounts',
    ],
    icon: Package,
  },
];

interface UnlockedExperienceProps {
  onLockPortal: () => void;
  onToggleViewMode: (mode: 'orbit' | 'surface') => void;
  currentViewMode: 'orbit' | 'surface';
  onNavigateToVerify?: (tokenId?: string) => void;
  isVip?: boolean;
  onNavigateToPassport?: () => void;
  onNavigateToContest?: () => void;
  onNavigateToGalaxy?: (planetId?: string) => void;
}

export const UnlockedExperience: React.FC<UnlockedExperienceProps> = ({
  onLockPortal,
  onToggleViewMode,
  currentViewMode,
  onNavigateToVerify,
  isVip = false,
  onNavigateToPassport,
  onNavigateToContest,
  onNavigateToGalaxy,
}) => {
  const [activeTab, setActiveTab] = useState<'pass' | 'edition' | 'my-world' | 'assets'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.toLowerCase().replace('#', '');
      const savedTab = sessionStorage.getItem('akinoya_portal_active_tab') as any;
      const savedSubview = sessionStorage.getItem('akinoya_portal_pass_subview');

      if (
        params.get('subview') === 'hub' ||
        params.get('tab') === 'visualizers' ||
        params.get('tab') === 'visualizer-hub' ||
        hash === 'visualizer-hub' ||
        hash === 'visualizers' ||
        savedSubview === 'hub'
      ) {
        return 'pass';
      }

      const candidate = params.get('tab') || hash || savedTab;
      if (candidate === 'pass' || candidate === 'pass-perks') return 'pass';
      if (candidate === 'assets') return 'assets';
      if (candidate === 'edition' || candidate === 'comic') return 'edition';
      if (candidate === 'my-world') return 'my-world';
    }
    return 'pass';
  });

  const [passSubView, setPassSubView] = useState<'overview' | 'hub'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.toLowerCase().replace('#', '');
      const savedSubview = sessionStorage.getItem('akinoya_portal_pass_subview');
      if (
        params.get('subview') === 'hub' ||
        params.get('tab') === 'visualizers' ||
        params.get('tab') === 'visualizer-hub' ||
        hash === 'visualizer-hub' ||
        hash === 'visualizers' ||
        savedSubview === 'hub'
      ) {
        return 'hub';
      }
    }
    return 'overview';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('akinoya_portal_pass_subview', passSubView);
      try {
        const url = new URL(window.location.href);
        if (passSubView === 'hub') {
          url.searchParams.set('subview', 'hub');
          url.hash = 'visualizer-hub';
          localStorage.setItem('akinoya_public_unlocked', 'true');
          sessionStorage.setItem('akinoya_public_unlocked', 'true');
          sessionStorage.setItem('akinoya_visualizers_unlocked', 'true');
        } else {
          url.searchParams.delete('subview');
          if (url.hash === '#visualizer-hub' || url.hash === '#visualizers') {
            url.hash = activeTab;
          }
        }
        window.history.replaceState(null, '', url.toString());
      } catch {}
    }
  }, [passSubView, activeTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('akinoya_portal_active_tab', activeTab);
      try {
        const currentHash = window.location.hash.toLowerCase().replace('#', '');
        if (passSubView === 'hub') {
          const url = new URL(window.location.href);
          url.searchParams.set('subview', 'hub');
          url.hash = 'visualizer-hub';
          window.history.replaceState(null, '', url.toString());
        } else if (currentHash !== activeTab && currentHash !== 'visualizer-hub' && currentHash !== 'visualizers') {
          const url = new URL(window.location.href);
          url.hash = activeTab;
          window.history.replaceState(null, '', url.toString());
        }
      } catch {}
    }
  }, [activeTab, passSubView]);

  // Viewport scroll position saving & single-shot restoration (cancels immediately on user interaction so footer never auto-corrects)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    let timeoutId: any;
    let userInteracted = false;

    const markUserInteraction = () => {
      userInteracted = true;
    };

    const saveScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        sessionStorage.setItem('akinoya_portal_scroll_y', String(Math.max(0, Math.round(window.scrollY))));
      }, 80);
    };

    const handleInstantSaveScroll = () => {
      sessionStorage.setItem('akinoya_portal_scroll_y', String(Math.max(0, Math.round(window.scrollY))));
    };

    window.addEventListener('touchstart', markUserInteraction, { passive: true });
    window.addEventListener('wheel', markUserInteraction, { passive: true });
    window.addEventListener('keydown', markUserInteraction, { passive: true });
    window.addEventListener('scroll', saveScroll, { passive: true });
    window.addEventListener('beforeunload', handleInstantSaveScroll);
    window.addEventListener('pagehide', handleInstantSaveScroll);

    const searchParams = new URLSearchParams(window.location.search);
    const isTargetingHub =
      searchParams.get('subview') === 'hub' ||
      searchParams.get('tab') === 'visualizers' ||
      sessionStorage.getItem('akinoya_portal_pass_subview') === 'hub';

    let restoreTimer: any;
    const savedY = !isTargetingHub ? sessionStorage.getItem('akinoya_portal_scroll_y') : null;
    if (savedY) {
      const targetY = parseFloat(savedY);
      if (!isNaN(targetY) && targetY > 50) {
        restoreTimer = setTimeout(() => {
          if (!userInteracted) {
            const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            const safeTargetY = Math.min(targetY, maxScroll);
            if (safeTargetY > 50 && Math.abs(window.scrollY - safeTargetY) > 20) {
              window.scrollTo({ top: safeTargetY, behavior: 'instant' as ScrollBehavior });
            }
          }
        }, 60);
      }
    }

    return () => {
      window.removeEventListener('touchstart', markUserInteraction);
      window.removeEventListener('wheel', markUserInteraction);
      window.removeEventListener('keydown', markUserInteraction);
      window.removeEventListener('scroll', saveScroll);
      window.removeEventListener('beforeunload', handleInstantSaveScroll);
      window.removeEventListener('pagehide', handleInstantSaveScroll);
      clearTimeout(timeoutId);
      clearTimeout(restoreTimer);
    };
  }, []);

  const { user, isVip: authIsVip, profile, role, isAuthenticated, openAuthModal } = useAuth();
  const [userDossier, setUserDossier] = useState<PlanetSubmission | null>(null);
  const [claimedSector, setClaimedSector] = useState<SectorClaimRecord | null>(() => getStoredSectorClaim());
  const [selectedDossierModal, setSelectedDossierModal] = useState<PlanetSubmission | null>(null);
  const [isCopiedDossierLink, setIsCopiedDossierLink] = useState(false);

  const [allCommunityPlanets, setAllCommunityPlanets] = useState<PlanetSubmission[]>(() =>
    getStoredPlanetSubmissions().sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0))
  );

  useEffect(() => {
    const syncUserWorldState = () => {
      setClaimedSector(getStoredSectorClaim());
      const userId = user?.id || profile?.id;
      const email = user?.email || profile?.email;
      const emailNorm = (email || '').toLowerCase().trim();
      const userIdNorm = (userId || '').toLowerCase().trim();
      const storedList = getStoredPlanetSubmissions();

      if (userId || email) {
        const localMatch = getUserContestSubmission(userId, email);
        if (localMatch) {
          setUserDossier(localMatch);
        }
        fetchUserContestSubmission(userId, email).then((sub) => {
          if (sub) {
            setUserDossier(sub);
          } else {
            // Only fall back to a local custom planet if it was explicitly created by this user account on this device
            const ownCreatedId =
              typeof window !== 'undefined'
                ? (emailNorm &&
                    (localStorage.getItem(`akinoya_own_created_planet_id_${emailNorm}`) ||
                      sessionStorage.getItem(`akinoya_own_created_planet_id_${emailNorm}`))) ||
                  (userIdNorm &&
                    (localStorage.getItem(`akinoya_own_created_planet_id_${userIdNorm}`) ||
                      sessionStorage.getItem(`akinoya_own_created_planet_id_${userIdNorm}`)))
                : null;
            const ownLocal = ownCreatedId
              ? storedList.find((p) => p.id === ownCreatedId && !isLiveGalaxyWorld(p))
              : undefined;
            if (ownLocal) {
              setUserDossier(ownLocal);
            } else if (emailNorm && isFounderEmail(emailNorm)) {
              const amlemi = storedList.find(
                (p) => p.id === 'planet-amlemi-genesis-01' || p.planetName === 'Ämlemi'
              );
              if (amlemi) setUserDossier(amlemi);
            } else if (!localMatch) {
              setUserDossier(null);
            }
          }
        });
      } else {
        // Unauthenticated / VIP pass session without user account: only match a world explicitly created on this browser
        const ownCreatedId =
          typeof window !== 'undefined'
            ? sessionStorage.getItem('akinoya_own_created_planet_id') ||
              localStorage.getItem('akinoya_own_created_planet_id')
            : null;
        if (ownCreatedId) {
          const ownLocal = storedList.find(
            (p) => p.id === ownCreatedId && !CURATED_GALAXY_WORLD_IDS.has(p.id) && !isLiveGalaxyWorld(p)
          );
          if (ownLocal) {
            setUserDossier(ownLocal);
            return;
          }
        }
        const amlemi = storedList.find(
          (p) => p.id === 'planet-amlemi-genesis-01' || p.planetName === 'Ämlemi'
        );
        if (amlemi && typeof window !== 'undefined') {
          const storedToken = localStorage.getItem('akinoya_patron_token') || sessionStorage.getItem('akinoya_patron_token');
          if (storedToken === FOUNDING_PASS_ID) {
            setUserDossier(amlemi);
            return;
          }
        }
        setUserDossier(null);
      }
    };

    syncUserWorldState();

    if (typeof window !== 'undefined') {
      window.addEventListener('akinoya-sector-claimed', syncUserWorldState);
      window.addEventListener('akinoya_planet_submissions_updated', syncUserWorldState);
      return () => {
        window.removeEventListener('akinoya-sector-claimed', syncUserWorldState);
        window.removeEventListener('akinoya_planet_submissions_updated', syncUserWorldState);
      };
    }
  }, [user?.id, profile?.id, user?.email, profile?.email]);

  useEffect(() => {
    fetchPlanetSubmissions(user?.id, user?.email).then((fresh) => {
      if (fresh && fresh.length > 0) {
        setAllCommunityPlanets([...fresh].sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0)));
      }
    });

    const unsubscribe = subscribeToPlanetSubmissions((fresh) => {
      if (fresh && fresh.length > 0) {
        setAllCommunityPlanets([...fresh].sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0)));
      }
    });

    return () => unsubscribe();
  }, [user?.id, user?.email]);

  const amlemiBenchmarkDossier = useMemo(() => {
    return (
      allCommunityPlanets.find(
        (p) => p.id === 'planet-amlemi-genesis-01' || p.planetName === 'Ämlemi'
      ) ||
      getStoredPlanetSubmissions().find(
        (p) => p.id === 'planet-amlemi-genesis-01' || p.planetName === 'Ämlemi'
      ) ||
      allCommunityPlanets[0] ||
      INITIAL_SUBMISSIONS[0]
    );
  }, [allCommunityPlanets]);

  const activeWorldDossier = userDossier || amlemiBenchmarkDossier;
  const isGuestWorldSimulation = !userDossier;
  // Determine whether the current user/account has actively completed creating/minting a world
  // Note: Having a VIP-pass alone or starting Step 0 sector claim does NOT count until world creation completes.
  const hasUserCreatedWorld = useMemo(() => {
    const emailNorm = (user?.email || profile?.email || '').toLowerCase().trim();
    const userIdNorm = (user?.id || profile?.id || '').toLowerCase().trim();
    if (
      userDossier &&
      userDossier.id !== 'planet-amlemi-genesis-01' &&
      userDossier.planetName.toLowerCase().trim() !== 'ämlemi' &&
      userDossier.planetName.toLowerCase().trim() !== 'amlemi'
    ) {
      return true;
    }
    if (!isFounderEmail(emailNorm) && (profile?.has_submitted_contest || profile?.contest_submission_id)) {
      return true;
    }
    if (typeof window !== 'undefined') {
      const accountKey = emailNorm || userIdNorm;
      if (accountKey && !isFounderEmail(emailNorm)) {
        if (
          localStorage.getItem(`user_generation_claimed_${accountKey}`) === 'true' ||
          Boolean(localStorage.getItem(`akinoya_own_created_planet_id_${accountKey}`)) ||
          Boolean(sessionStorage.getItem(`akinoya_own_created_planet_id_${accountKey}`))
        ) {
          return true;
        }
      }
    }
    return false;
  }, [
    userDossier,
    profile?.has_submitted_contest,
    profile?.contest_submission_id,
    profile?.email,
    profile?.id,
    user?.email,
    user?.id,
  ]);

  // Newly registered / custom generated worlds beyond the 5 Pioneer Worlds: queued until January 9, 2027 release.
  // The 5 Pioneer Worlds (Ämlemi, Felix, Ankrau, Florium, Sepplon) NEVER show the loading/reveal status text.
  const isQueuedWorld = useMemo(() => {
    // If the user has a dossier and it is one of the 5 Pioneer Worlds, never show the loading banner
    if (userDossier && isLiveGalaxyWorld(userDossier)) {
      return false;
    }
    // If the active dossier is one of the 5 Pioneer Worlds and the user has not created a custom non-pioneer world, exclude it
    if (activeWorldDossier && isLiveGalaxyWorld(activeWorldDossier) && !userDossier) {
      const emailNorm = (user?.email || profile?.email || '').toLowerCase().trim();
      const INITIAL_FIVE_PIONEER_EMAILS = new Set([
        'odin@sillow.be',
        'sillow_nft@hotmail.com',
        'felix@sillow.be',
        'nathanael@sillow.be',
        'florian@sillow.be',
        'seppe@sillow.be',
      ]);
      if (!hasUserCreatedWorld || INITIAL_FIVE_PIONEER_EMAILS.has(emailNorm)) {
        return false;
      }
    }
    if (userDossier && !isLiveGalaxyWorld(userDossier)) {
      return true;
    }
    if (hasUserCreatedWorld && !userDossier) {
      return true;
    }
    return (
      !isGuestWorldSimulation &&
      Boolean(activeWorldDossier) &&
      !isLiveGalaxyWorld(activeWorldDossier) &&
      (isQueuedUserWorld(activeWorldDossier) ||
        activeWorldDossier.status === 'QUEUED' ||
        Boolean((activeWorldDossier as any).isWaitlist))
    );
  }, [hasUserCreatedWorld, isGuestWorldSimulation, activeWorldDossier, userDossier, user?.email, profile?.email]);

  const amlemiPhotoCards = useMemo(() => {
    return activeWorldDossier ? getPlanetPhotoCards(activeWorldDossier) : [];
  }, [activeWorldDossier]);

  const amlemiThumbnailUrl = useMemo(() => {
    return (
      amlemiPhotoCards[0]?.url ||
      activeWorldDossier?.renders?.hero ||
      activeWorldDossier?.renders?.['01_main'] ||
      amlemiOrbitalImg
    );
  }, [amlemiPhotoCards, activeWorldDossier?.renders]);

  const handleVoteUserDossier = async () => {
    const targetDossier = activeWorldDossier;
    if (!targetDossier) return;
    soundManager.playTone(740, 0.06);
    const userEmail = (user?.email || profile?.email || '').trim().toLowerCase();
    const userUsername = profile?.username || user?.user_metadata?.username || user?.user_metadata?.full_name || '';
    const res = await togglePlanetSubmissionVote(targetDossier.id, user?.id, userEmail, userUsername);
    if (!res.success && res.error) {
      soundManager.playError();
      alert(res.error);
      return;
    }
    if (res.success) {
      if (userDossier && userDossier.id === targetDossier.id) {
        setUserDossier((prev) => (prev ? { ...prev, votesCount: res.newVotesCount, hasVoted: res.hasVoted } : null));
      }
      setAllCommunityPlanets((prev) =>
        prev
          .map((p) => (p.id === targetDossier.id ? { ...p, votesCount: res.newVotesCount, hasVoted: res.hasVoted } : p))
          .sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0))
      );
    }
  };

  const handleShareDossier = () => {
    soundManager.playTone(600, 0.04);
    const targetDossier = activeWorldDossier;
    if (typeof window !== 'undefined' && targetDossier) {
      const shareUrl = `${window.location.origin}/contest?planet=${targetDossier.id}`;
      navigator.clipboard.writeText(shareUrl);
      setIsCopiedDossierLink(true);
      setTimeout(() => setIsCopiedDossierLink(false), 2500);
    }
  };

  const authHolderName = profile?.first_name ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}` : profile?.full_name || null;
  const userEmail = (user?.email || profile?.email || '').toLowerCase().trim();
  const isOdiUser = isFounderEmail(userEmail);
  const isEstherUser = userEmail === 'estherphilippen@msn.com' || Boolean(authHolderName && authHolderName.toLowerCase().includes('esther'));

  const sortedCommunityPlanets = useMemo(() => {
    return [...allCommunityPlanets].sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));
  }, [allCommunityPlanets]);
  const planetRank = activeWorldDossier
    ? sortedCommunityPlanets.findIndex((p) => p.id === activeWorldDossier.id) + 1
    : 1;
  const isVipMode = Boolean(
    Boolean(user || profile) && (
      isVip ||
      authIsVip ||
      profile?.has_vip_pass === true ||
      profile?.is_vip === true ||
      role === 'VIP_GUEST' ||
      role === 'CREATOR' ||
      Boolean(profile?.vip_code_redeemed) ||
      isOdiUser ||
      (typeof window !== 'undefined' &&
        (Boolean(localStorage.getItem('akinoya_patron_token')) ||
         Boolean(sessionStorage.getItem('akinoya_patron_token')) ||
         Boolean(localStorage.getItem('sillow_vip_device_access') === 'true') ||
         Boolean(sessionStorage.getItem('akinoya_vip_unlocked') === 'true') ||
         Boolean(localStorage.getItem('sillow_vip_bound_token')) ||
         localStorage.getItem('akinoya_patron_role') === 'CREATOR' ||
         localStorage.getItem('akinoya_patron_role') === 'VIP_GUEST'))
    )
  );

  const statusConfig = getUserStatusConfig(
    isAuthenticated,
    user,
    profile,
    role,
    isVipMode || isVip || authIsVip
  );

  const mobileRoleConfig = useMemo(() => {
    return getMobileHeaderRoleConfig(
      isAuthenticated,
      user,
      profile,
      role,
      isVipMode || isVip || authIsVip,
      hasUserCreatedWorld
    );
  }, [isAuthenticated, user, profile, role, isVipMode, isVip, authIsVip, hasUserCreatedWorld]);

  // Initial mount scroll restoration for Visualizer Hub
  useEffect(() => {
    if (passSubView === 'hub') {
      scrollToVisualizerHub(false, 60);
    }
  }, []);

  // Listen for direct navigation to Visualizer Hub and Passperks Home
  useEffect(() => {
    const handleOpenHub = () => {
      sessionStorage.setItem('akinoya_visualizers_unlocked', 'true');
      sessionStorage.setItem('akinoya_portal_pass_subview', 'hub');
      sessionStorage.setItem('akinoya_public_unlocked', 'true');
      localStorage.setItem('akinoya_public_unlocked', 'true');
      setActiveTab('pass');
      setPassSubView('hub');
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('subview', 'hub');
        url.hash = 'visualizer-hub';
        window.history.replaceState(null, '', url.toString());
      } catch {}
      scrollToVisualizerHub(true);
    };

    const handleNavigatePassperksHome = () => {
      setActiveTab('pass');
      setPassSubView('overview');
      try {
        sessionStorage.setItem('akinoya_portal_active_tab', 'pass');
        sessionStorage.setItem('akinoya_portal_pass_subview', 'overview');
        const url = new URL(window.location.href);
        url.searchParams.delete('subview');
        url.searchParams.delete('track');
        url.hash = 'pass';
        window.history.replaceState(null, '', url.toString());
      } catch {
        // ignore
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const checkUrlParams = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const hash = window.location.hash.toLowerCase().replace('#', '');
        const savedSubview = sessionStorage.getItem('akinoya_portal_pass_subview');

        // Priority 1: Visualizer Hub retention on refresh & direct links
        if (
          params.get('subview') === 'hub' ||
          params.get('tab') === 'visualizers' ||
          params.get('tab') === 'visualizer-hub' ||
          hash === 'visualizer-hub' ||
          hash === 'visualizers' ||
          savedSubview === 'hub'
        ) {
          setActiveTab('pass');
          setPassSubView('hub');
          scrollToVisualizerHub(false, 60);
          return;
        }

        if (
          params.get('tab') === 'pass-perks' ||
          params.get('tab') === 'pass' ||
          hash === 'pass-perks' ||
          hash === 'pass'
        ) {
          setActiveTab('pass');
          setPassSubView('overview');
        } else if (params.get('tab') === 'assets' || hash === 'assets') {
          setActiveTab('assets');
        } else if (params.get('tab') === 'my-world' || hash === 'my-world') {
          setActiveTab('my-world');
        } else if (params.get('tab') === 'edition' || hash === 'edition' || hash === 'comic') {
          setActiveTab('edition');
        }
      }
    };

    const handleAutoScrollVisualizerArchive = () => {
      setActiveTab('pass');
      setPassSubView('overview');
      scrollToVisualizerArchive(true, 120);
    };

    const checkAutoScrollVisualizerArchive = () => {
      if (typeof window !== 'undefined' && sessionStorage.getItem('akinoya_scroll_to_visualizer_archive') === 'true') {
        sessionStorage.removeItem('akinoya_scroll_to_visualizer_archive');
        setActiveTab('pass');
        setPassSubView('overview');
        scrollToVisualizerArchive(true, 180);
        setTimeout(() => {
          document.getElementById('visualizer-archive')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 380);
      }
    };

    checkUrlParams();
    checkAutoScrollVisualizerArchive();
    window.addEventListener('akinoya-open-visualizer-hub', handleOpenHub);
    window.addEventListener('akinoya-navigate-passperks-home', handleNavigatePassperksHome);
    window.addEventListener('akinoya-auto-scroll-visualizer-archive', handleAutoScrollVisualizerArchive);
    window.addEventListener('popstate', checkUrlParams);
    window.addEventListener('hashchange', checkUrlParams);
    return () => {
      window.removeEventListener('akinoya-open-visualizer-hub', handleOpenHub);
      window.removeEventListener('akinoya-navigate-passperks-home', handleNavigatePassperksHome);
      window.removeEventListener('akinoya-auto-scroll-visualizer-archive', handleAutoScrollVisualizerArchive);
      window.removeEventListener('popstate', checkUrlParams);
      window.removeEventListener('hashchange', checkUrlParams);
    };
  }, []);

  // Verified holder assets: active pass is the NFC-bound token for this device session
  const { nfcToken } = useVipAccess();

  // Default fallback pass: only Odi can fall back to FOUNDING_PASS_ID. Esther and other VIP guests fall back to AKN-VIP-2027-X001
  const defaultPassId = isOdiUser ? FOUNDING_PASS_ID : (isEstherUser ? 'AKN-VIP-2027-X001' : 'AKN-VIP-2027-X001');
  const rawCandidatePassId = isVipMode
    ? ((isValidPassId(nfcToken) ? nfcToken : null) ||
       profile?.vip_code_redeemed ||
       (typeof window !== 'undefined' ? (localStorage.getItem('akinoya_patron_token') || sessionStorage.getItem('akinoya_patron_token')) : null) ||
       defaultPassId)
    : null;
  const candidatePass = rawCandidatePassId && isValidPassId(rawCandidatePassId) ? normalizePassId(rawCandidatePassId) : defaultPassId;
  // Strictly prevent non-Odi users from inheriting Founder Pass (#0 / X0914)
  const activePassId = (!isOdiUser && (candidatePass === 'AKN-VIP-2027-X0914' || candidatePass === FOUNDING_PASS_ID))
    ? (isEstherUser ? 'AKN-VIP-2027-X001' : 'AKN-VIP-2027-X001')
    : candidatePass;

  const holderName = isVipMode
    ? (authHolderName || (isEstherUser ? 'Esther Philippen' : (isOdiUser ? 'Odi Selis' : useHolderName(activePassId) || 'Founding VIP Member')))
    : (authHolderName || 'Guest');
  const isMaster = isVipMode && isOdiUser && (activePassId === 'AKN-VIP-2027-X0914' || activePassId === FOUNDING_PASS_ID);
  const activeEditionNumber = isMaster ? 0 : deriveEditionNumber(activePassId);
  const isFoundersPass = isMaster;
  const foundersEditionLabel = 'Founders Pass (#0)';
  const editionDisplay = activeEditionNumber;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const bingaaCertificate = useCertificate(activePassId);

  // Human Certification Protocol active: certified directly for VIP holders
  const activeCertificate: BingaaCertificate =
    bingaaCertificate && (isMaster ? bingaaCertificate.editionNumber === 0 : bingaaCertificate.editionNumber > 0)
      ? bingaaCertificate
      : (isMaster
        ? getMasterCertificate(holderName, user?.email || undefined)
        : {
            certificateId: `COA-BNG1-${String(activeEditionNumber).padStart(3, '0')}-VERIFIED`,
            title: 'Bingäa Issue #1 — Certificate of Authenticity',
            passId: activePassId,
            holderName: holderName || 'Founding VIP Member',
            holderEmail: user?.email || profile?.email || (isEstherUser ? 'estherphilippen@msn.com' : undefined),
            editionNumber: activeEditionNumber,
            editionTotal: TOTAL_EDITION_LIMIT,
            status: 'ACTIVE_VERIFIED',
            emailVerified: true,
            claimedAt: bingaaCertificate?.claimedAt || new Date().toISOString(),
            signatureAlgorithm: 'HMAC-SHA256-DETERMINISTIC',
            signature: 'Sillow Mill · Creative Syndicate',
          });

  const handlePerksStripeCheckout = async () => {
    if (isMembershipLaunchLocked) {
      soundManager.playTone(330, 0.08);
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
          customerName: holderName || 'Community Member',
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
  const [showComicReader, setShowComicReader] = useState(false);
  const [isRunnerOpen, setIsRunnerOpen] = useState(false);
  const [runnerInitialLevel, setRunnerInitialLevel] = useState<number>(1);
  const [showCoverPreview, setShowCoverPreview] = useState(false);
  const [isReserved, setIsReserved] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [isWaitlistSubmitted, setIsWaitlistSubmitted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem('akinoya_wave2_waitlist_subscribed'));
  });
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  // Detect touch-only devices — tilt is disabled to keep pan-y scrolling smooth
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(hover: none)').matches);
  }, []);

  // 4 VIP Entitlements independent state
  const [perkInputs, setPerkInputs] = useState<Record<string, string>>({
    animation: '',
    vault: '',
    governance: '',
    drops: '',
  });

  const [perkSubmitted, setPerkSubmitted] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = sessionStorage.getItem('akinoya_perk_states');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handlePerkInputChange = (id: string, value: string) => {
    setPerkInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handlePerkCodeSubmit = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    const updated = { ...perkSubmitted, [id]: true };
    setPerkSubmitted(updated);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('akinoya_perk_states', JSON.stringify(updated));
    }
    soundManager.playUnlockChime();
  };

  const handleResetPerk = (id: string) => {
    const updated = { ...perkSubmitted, [id]: false };
    setPerkSubmitted(updated);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('akinoya_perk_states', JSON.stringify(updated));
    }
    setPerkInputs((prev) => ({ ...prev, [id]: '' }));
  };

  // Mouse & Touch tilt for luxury 3D card (mouse-only; skipped on touch devices)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isTouchDevice || e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotateX(-y * 0.04);
    setRotateY(x * 0.04);
  };

  const handlePointerLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  // Pass ID Visualizer Hub State
  const [passIdInput, setPassIdInput] = useState('');
  const [passIdError, setPassIdError] = useState('');
  const [pasteFeedback, setPasteFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handlePastePassId = async () => {
    try {
      let text = '';
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        text = await navigator.clipboard.readText();
      }

      const trimmed = text ? text.trim() : '';
      const valueToFill = trimmed || FOUNDING_PASS_ID;

      setPassIdInput(valueToFill);
      if (passIdError) setPassIdError('');

      soundManager.playTone(880, 0.08);
      setPasteFeedback({
        message: trimmed ? `Pasted: ${trimmed}` : `Filled Pass ID: #${FOUNDING_PASS_ID}`,
        type: 'success',
      });
      setTimeout(() => setPasteFeedback(null), 2500);
    } catch (err) {
      console.warn('Clipboard read error, fallback to FOUNDING_PASS_ID:', err);
      setPassIdInput(FOUNDING_PASS_ID);
      if (passIdError) setPassIdError('');
      soundManager.playTone(880, 0.08);
      setPasteFeedback({
        message: `Filled Pass ID: #${FOUNDING_PASS_ID}`,
        type: 'success',
      });
      setTimeout(() => setPasteFeedback(null), 2500);
    }
  };

  const [isVisualizerUnlocked, setIsVisualizerUnlocked] = useState<boolean>(() => {
    if (isVipMode) return true;
    return typeof window !== 'undefined' && sessionStorage.getItem('akinoya_visualizers_unlocked') === 'true';
  });

  useEffect(() => {
    if (isVipMode) {
      setIsVisualizerUnlocked(true);
    }
  }, [isVipMode]);

  // Video preview audio state synced directly with global Bingäa player (planetSoundtrack)
  const [isBingaaAudioPlaying, setIsBingaaAudioPlaying] = useState<boolean>(() => planetSoundtrack.isPlaying);
  const dnVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const unsub = planetSoundtrack.subscribe((playing) => {
      setIsBingaaAudioPlaying(playing);
    });
    return unsub;
  }, []);

  // Ensure seamless autoplay loop for the archive preview video on mount, view changes, and mobile interactions
  useEffect(() => {
    const playPreview = () => {
      const v = dnVideoRef.current;
      if (v) {
        v.muted = true;
        v.defaultMuted = true;
        v.playsInline = true;
        const p = v.play();
        if (p !== undefined) {
          p.catch(() => {});
        }
      }
    };

    playPreview();
    const rafId = requestAnimationFrame(playPreview);
    const t1 = setTimeout(playPreview, 150);
    const t2 = setTimeout(playPreview, 500);

    document.addEventListener('visibilitychange', playPreview);
    window.addEventListener('touchstart', playPreview, { once: true, passive: true });
    window.addEventListener('touchend', playPreview, { once: true, passive: true });
    window.addEventListener('scroll', playPreview, { once: true, passive: true });
    window.addEventListener('pointerdown', playPreview, { once: true, passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      document.removeEventListener('visibilitychange', playPreview);
      window.removeEventListener('touchstart', playPreview);
      window.removeEventListener('touchend', playPreview);
      window.removeEventListener('scroll', playPreview);
      window.removeEventListener('pointerdown', playPreview);
    };
  }, [passSubView, activeTab]);

  const togglePreviewAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Keep the video element itself permanently muted to delegate 100% to the global Bingäa audio track
    if (dnVideoRef.current) {
      dnVideoRef.current.muted = true;
      dnVideoRef.current.play().catch(() => {});
    }
    await planetSoundtrack.togglePlay();
  };

  // Track specific unlock state
  const [unlockedTracks, setUnlockedTracks] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return { '02': true };
    const saved = sessionStorage.getItem('akinoya_unlocked_tracks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { '02': true };
      }
    }
    return { '02': true }; // Track 2 Bingäa early access by default
  });

  // Modal states for video player with refresh state persistence
  const [activePlayingTrack, setActivePlayingTrack] = useState<VisualizerTrack | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const savedTrackId = params.get('track') || sessionStorage.getItem('akinoya_active_visualizer_track_id');
      if (savedTrackId) {
        return VISUALIZER_TRACKS.find((t) => t.id === savedTrackId) || null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        if (activePlayingTrack) {
          sessionStorage.setItem('akinoya_active_visualizer_track_id', activePlayingTrack.id);
          url.searchParams.set('track', activePlayingTrack.id);
        } else {
          sessionStorage.removeItem('akinoya_active_visualizer_track_id');
          url.searchParams.delete('track');
        }
        window.history.replaceState(null, '', url.toString());
      } catch {}
    }
  }, [activePlayingTrack]);

  const handleUnlockVisualizers = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passIdInput.trim().toUpperCase().replace('#', '');
    if (
      clean === FOUNDING_PASS_ID ||
      clean === 'AKN-2027-X0914' ||
      clean === 'SILLOWMILL2027' ||
      isValidPassId(clean)
    ) {
      sessionStorage.setItem('akinoya_visualizers_unlocked', 'true');
      sessionStorage.setItem('akinoya_portal_pass_subview', 'hub');
      sessionStorage.setItem('akinoya_public_unlocked', 'true');
      localStorage.setItem('akinoya_public_unlocked', 'true');
      setIsVisualizerUnlocked(true);
      setPassSubView('hub');
      setPassIdError('');
      soundManager.playUnlockChime();
      scrollToVisualizerHub(true);
    } else {
      setPassIdError(`Invalid Pass ID. Please enter an authentic Äkinoya Pass ID (e.g. #${FOUNDING_PASS_ID}).`);
      soundManager.playError();
    }
  };

  const handleDirectGuestUnlockHub = () => {
    sessionStorage.setItem('akinoya_visualizers_unlocked', 'true');
    sessionStorage.setItem('akinoya_portal_pass_subview', 'hub');
    sessionStorage.setItem('akinoya_public_unlocked', 'true');
    localStorage.setItem('akinoya_public_unlocked', 'true');
    setIsVisualizerUnlocked(true);
    setActiveTab('pass');
    setPassSubView('hub');
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('subview', 'hub');
      url.hash = 'visualizer-hub';
      window.history.replaceState(null, '', url.toString());
    } catch {}
    soundManager.playUnlockChime();
    scrollToVisualizerHub(true);
  };

  const [tappingTab, setTappingTab] = useState<'pass' | 'edition' | 'my-world' | 'galaxy' | 'assets' | 'runner' | null>(null);
  const navTouchStartRef = useRef<{ x: number; y: number; time: number; id: string } | null>(null);
  const lastTouchNavTimeRef = useRef<number>(0);

  const resetWindowScrollInstant = () => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleSelectTab = (tab: 'pass' | 'edition' | 'my-world' | 'assets') => {
    setTappingTab(tab);
    setTimeout(() => setTappingTab((prev) => (prev === tab ? null : prev)), 155);
    soundManager.playTone(580, 0.04);

    if (typeof window !== 'undefined') {
      if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
      sessionStorage.setItem('akinoya_portal_active_tab', tab);
      sessionStorage.setItem('akinoya_portal_scroll_y', '0');
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('tab');
        url.searchParams.delete('subview');
        url.hash = tab;
        window.history.replaceState(null, '', url.toString());
      } catch {}
      resetWindowScrollInstant();
    }

    setActiveTab(tab);
    if (tab === 'pass') {
      setPassSubView('overview');
    }

    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });
    }
  };

  const handleTriggerGalaxyNav = () => {
    setTappingTab('galaxy');
    setTimeout(() => setTappingTab((prev) => (prev === 'galaxy' ? null : prev)), 155);
    soundManager.playTone(620, 0.05);
    if (typeof window !== 'undefined' && document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
    if (onNavigateToGalaxy) {
      onNavigateToGalaxy();
    } else if (typeof window !== 'undefined') {
      window.location.hash = '#galaxy';
    }
  };

  const activateNavItem = (id: 'pass' | 'edition' | 'my-world' | 'assets' | 'galaxy' | 'runner') => {
    if (id === 'galaxy') {
      handleTriggerGalaxyNav();
    } else if (id === 'runner') {
      setRunnerInitialLevel(1);
      setIsRunnerOpen(true);
    } else {
      handleSelectTab(id);
    }
  };

  const getNavButtonTouchHandlers = (id: 'pass' | 'edition' | 'my-world' | 'assets' | 'galaxy' | 'runner') => ({
    onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
    },
    onTouchStart: (e: React.TouchEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      const t = e.touches[0];
      if (t) {
        navTouchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now(), id };
      }
    },
    onTouchEnd: (e: React.TouchEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      const start = navTouchStartRef.current;
      navTouchStartRef.current = null;
      const t = e.changedTouches[0];
      if (!start || !t || start.id !== id) return;
      const dx = Math.abs(t.clientX - start.x);
      const dy = Math.abs(t.clientY - start.y);
      const dt = Date.now() - start.time;
      if (dx < 22 && dy < 22 && dt < 700) {
        if (e.cancelable) {
          e.preventDefault();
        }
        lastTouchNavTimeRef.current = Date.now();
        activateNavItem(id);
      }
    },
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (Date.now() - lastTouchNavTimeRef.current < 500) {
        e.preventDefault();
        return;
      }
      activateNavItem(id);
    },
  });

  const startTrackStream = (track: VisualizerTrack) => {
    if (dnVideoRef.current) {
      dnVideoRef.current.muted = true;
    }
    setActivePlayingTrack(track);
  };

  const handleTrackCardClick = (track: VisualizerTrack) => {
    startTrackStream(track);
  };

  // Comic Pre-Order Checkout States (Streamlined Stripe Checkout)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [checkoutAddress, setCheckoutAddress] = useState("");
  const [checkoutAptBus, setCheckoutAptBus] = useState("");
  const [checkoutCity, setCheckoutCity] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [isOrderProcessing, setIsOrderProcessing] = useState(false);
  const [waveInventory, setWaveInventory] = useState<{ total: number; available: number }>({
    total: 100,
    available: 100,
  });

  // Load real-time inventory from server — safe JSON parsing guards against plain-text errors
  useEffect(() => {
    fetch("/api/inventory/status")
      .then(async (res) => {
        if (!res.ok) return null;
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return null;
        return res.json().catch(() => null);
      })
      .then((data) => {
        if (data && typeof data.available === "number") {
          setWaveInventory({ total: data.total || 100, available: data.available });
        }
      })
      .catch(() => {});
  }, []);

  const handlePreOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError("");
    setIsOrderProcessing(true);
    soundManager.playTone(660, 0.1);

    try {
      const sanitizedEmail = checkoutEmail.trim().toLowerCase();
      const sanitizedName = checkoutName.trim();
      const sanitizedAddress = checkoutAddress.trim();
      const sanitizedAptBus = checkoutAptBus.trim();
      const sanitizedCity = checkoutCity.trim();

      if (!sanitizedEmail || !sanitizedEmail.includes('@')) {
        setIsOrderProcessing(false);
        setCheckoutError('Please enter a valid email address.');
        return;
      }
      if (!sanitizedName) {
        setIsOrderProcessing(false);
        setCheckoutError('Please enter your full name.');
        return;
      }
      if (!sanitizedAddress) {
        setIsOrderProcessing(false);
        setCheckoutError('Please enter your street and house number.');
        return;
      }
      if (!sanitizedCity) {
        setIsOrderProcessing(false);
        setCheckoutError('Please enter your city and postal code.');
        return;
      }

      const fullAddress = sanitizedAptBus
        ? `${sanitizedAddress}, ${sanitizedAptBus}`
        : sanitizedAddress;

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: sanitizedEmail,
          customerName: sanitizedName,
          shippingAddress: fullAddress,
          apartmentBus: sanitizedAptBus,
          shippingCity: sanitizedCity,
        }),
      });

      let data: any = null;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        data = await res.json().catch(() => null);
      }

      if (res.ok && data?.url) {
        window.location.href = data.url;
        return;
      } else {
        const errorMsg =
          data?.error ||
          (await res.text().catch(() => '')) ||
          'Could not initialize checkout. Please try again.';
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error("Stripe Checkout Error:", err);
      setCheckoutError(err.message || "Could not initiate checkout. Please try again.");
      setIsOrderProcessing(false);
    }
  };

  const handleResetCheckout = () => {
    setIsCheckoutOpen(false);
    setIsOrderProcessing(false);
    setCheckoutError("");
    setCheckoutAptBus("");
  };

  const renderPassCardWidget = () => (
    <div className="w-full max-w-sm sm:max-w-md flex flex-col items-center">
      <div
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={isTouchDevice
          ? { touchAction: 'pan-y' }
          : {
              transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
              transition: 'transform 0.15s ease-out',
              touchAction: 'none',
            }
        }
        className="relative w-full max-w-sm sm:max-w-[360px] rounded-2xl overflow-hidden bg-black/70 border border-cyan-400/30 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(56,189,248,0.25)] group cursor-pointer"
      >
        {/* Holographic dynamic gradient sheen */}
        <div
          style={{
            background: `radial-gradient(circle at ${50 + rotateY * 3}% ${
              50 - rotateX * 3
            }%, rgba(103, 232, 249, 0.35), transparent 60%)`,
          }}
          className="absolute inset-0 pointer-events-none mix-blend-color-dodge z-20 transition-opacity"
        />

        {/* Pass Visual */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
          <img
            src={passCardImg}
            alt="VIP Äkinoya Pass Card"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
          {/* Top badges: Dynamic status pill + ACCESS GRANTED indicator box */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none z-10">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 backdrop-blur-md rounded-full text-[9.5px] xs:text-[10px] font-mono max-w-[58%] truncate ${statusConfig.pillClassName}`}>
              <Sparkles className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {isVipMode
                  ? (isFoundersPass ? '• FOUNDERS PASS (#0)' : `• FOUNDING MEMBER #${editionDisplay} OF 100`)
                  : `• ${statusConfig.pillLabel}`}
              </span>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 backdrop-blur-md rounded-full text-[9.5px] xs:text-[10px] font-mono font-bold shrink-0 whitespace-nowrap ${statusConfig.indicatorClassName}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusConfig.dotColorClassName}`} />
              <span>• {statusConfig.indicatorLabel}</span>
            </div>
          </div>
        </div>

        {/* Card Details Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-b from-[#060c14] to-[#03060a] border-t border-cyan-500/20">
          <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
            <span className="text-[11px] sm:text-xs font-mono text-white/50 tracking-wider truncate">
              {isVipMode ? 'ÄKINOYA VIP PASS' : 'ÄKINOYA DIGITAL PASS'}
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold shrink-0 whitespace-nowrap ${statusConfig.indicatorClassName}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusConfig.dotColorClassName}`} />
              <span>• {statusConfig.indicatorLabel}</span>
            </span>
          </div>

          <div className="space-y-1 mb-4">
            <div className="text-xs sm:text-sm font-display font-bold text-white tracking-wider flex items-center gap-2">
              <span>{isVipMode ? 'SILLOW MILL ARCHIVE HOLDER' : 'SILLOW MILL DIGITAL HOLDER'}</span>
              <span className={`text-[8.5px] font-mono px-2 py-0.2 rounded-full uppercase ${statusConfig.pillClassName}`}>
                {statusConfig.pillLabel}
              </span>
            </div>
            <div className="text-[11px] sm:text-xs font-mono text-cyan-400/80 flex items-center justify-between">
              <span>{isVipMode ? `ID: #${activePassId}` : `TIER: ${statusConfig.pillLabel}`}</span>
              <span>{statusConfig.indicatorLabel}</span>
            </div>
          </div>

          {/* Action buttons (Guest only; redundant VIP buttons removed for sleek layout) */}
          {!isVipMode && (
            <div className="pt-3 border-t border-white/10 space-y-2">
              <button
                onClick={handleDirectGuestUnlockHub}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-mono font-bold text-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 rounded-xl transition-all cursor-pointer min-h-[46px] shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:scale-[1.01]"
              >
                <AudioWaveform className="w-4 h-4 text-black shrink-0" />
                <span className="tracking-wider">OPEN VISUALIZER HUB</span>
                <ArrowRight className="hidden lg:block w-4 h-4 text-black shrink-0" />
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-[11px] font-mono text-white/40 mt-2.5 text-center">
        ✦ Hover or touch the card for a holographic reflection
      </p>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        overflowAnchor: 'none',
      }}
      className="relative z-10 w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto px-5 sm:px-7 md:px-10 lg:px-8 py-6 sm:py-8 md:py-9 lg:py-10 page-transition-container"
    >
      {/* Minified Low-Profile Status Bar Header with Inline Service View Toggle */}
      <div className={`relative isolate overflow-hidden flex items-center justify-between gap-2 sm:gap-4 mb-4 sm:mb-5 bg-[#060c18] bg-gradient-to-r ${mobileRoleConfig.containerBg} border ${mobileRoleConfig.borderColor} rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 ${mobileRoleConfig.glowColor}`}>
        <div className="relative z-10 flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-black/60 border ${mobileRoleConfig.shieldBorderColor} flex items-center justify-center ${mobileRoleConfig.shieldTextColor} shadow-[0_0_12px_rgba(56,189,248,0.22)] shrink-0`}>
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0 flex-1 flex items-center gap-1.5 sm:gap-3">
            <h2 className="text-xs sm:text-sm lg:text-base font-display font-bold text-white tracking-wide shrink-0 drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]">
              <span className="sm:hidden">Welcome</span>
              <span className="hidden sm:inline lg:hidden">Welcome to Äkinoya</span>
              <span className="hidden lg:inline">Welcome to Äkinoya – Unlocked</span>
            </h2>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full ${mobileRoleConfig.dotColor} animate-pulse shrink-0`} />
              <span className="text-[10px] sm:text-[10.5px] font-mono font-semibold tracking-wider whitespace-nowrap shrink-0">
                <span className={`sm:hidden ${mobileRoleConfig.textColor}`}>{mobileRoleConfig.label}</span>
                <span className="hidden sm:inline text-cyan-400">PORTAL ACTIVE</span>
              </span>
              <span className="hidden md:inline text-white/30 text-[10px] shrink-0">·</span>
              <span className="hidden md:inline text-[10.5px] text-white/65 font-mono truncate">
                {isVipMode && holderName ? `HOLDER: ${holderName.toUpperCase()}` : 'TOKEN #AKN-2027'}
              </span>
            </div>
          </div>
        </div>

        {/* Inline Service View Toggle (Distinct Sliders / Eye Icon — never duplicates Worlds Globe2 icon) */}
        <div className="relative z-10 flex items-center shrink-0">
          <button
            type="button"
            onClick={() => onToggleViewMode(currentViewMode === 'orbit' ? 'surface' : 'orbit')}
            title={currentViewMode === 'orbit' ? 'Switch to Service View' : 'Switch to Planet View'}
            className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-mono text-cyan-300 hover:text-white bg-cyan-950/70 hover:bg-cyan-950/95 border border-cyan-500/40 hover:border-cyan-400/70 rounded-lg transition-all cursor-pointer min-h-[34px] sm:min-h-[36px] whitespace-nowrap"
          >
            {currentViewMode === 'orbit' ? (
              <>
                <Sliders className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Service View</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Planet View</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Tabs and Content Area */}
      <div className="space-y-5 sm:space-y-6 md:space-y-7 w-full">
        {/* Desktop & Landscape 6-Item Navigation Tabs (Home, Comic, Worlds, My Assets, Galaxy Navigator, Äkinoya Runner) */}
        <div className="desktop-landscape-only grid grid-cols-2 sm:grid-cols-6 gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-[#060a14]/90 backdrop-blur-xl border border-white/15 rounded-xl lg:rounded-2xl shadow-xl">
          <button
            type="button"
            {...getNavButtonTouchHandlers('pass')}
            className={`py-2 px-2 text-[11px] sm:text-xs font-medium rounded-lg lg:rounded-xl transition-colors duration-150 cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px] touch-manipulation select-none ${
              activeTab === 'pass'
                ? 'bg-amber-400 text-black font-bold shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5 shrink-0 pointer-events-none" />
            <span className="truncate pointer-events-none">Home</span>
          </button>
          <button
            type="button"
            {...getNavButtonTouchHandlers('edition')}
            className={`py-2 px-2 text-[11px] sm:text-xs font-medium rounded-lg lg:rounded-xl transition-colors duration-150 cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px] touch-manipulation select-none ${
              activeTab === 'edition'
                ? 'bg-cyan-950/80 text-cyan-200 border border-cyan-400/30 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0 pointer-events-none" />
            <span className="truncate pointer-events-none">Comic</span>
          </button>
          <button
            type="button"
            {...getNavButtonTouchHandlers('my-world')}
            className={`py-2 px-2 text-[11px] sm:text-xs font-medium rounded-lg lg:rounded-xl transition-colors duration-150 cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px] touch-manipulation select-none ${
              activeTab === 'my-world'
                ? 'bg-cyan-950/80 text-cyan-200 border border-cyan-400/30 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5 shrink-0 pointer-events-none" />
            <span className="truncate pointer-events-none">Worlds</span>
          </button>
          <button
            type="button"
            {...getNavButtonTouchHandlers('assets')}
            className={`py-2 px-2 text-[11px] sm:text-xs font-medium rounded-lg lg:rounded-xl transition-colors duration-150 cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px] touch-manipulation select-none ${
              activeTab === 'assets'
                ? 'bg-cyan-950/80 text-cyan-200 border border-cyan-400/30 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Gem className="w-3.5 h-3.5 shrink-0 pointer-events-none" />
            <span className="truncate pointer-events-none">My Assets</span>
          </button>
          <button
            type="button"
            {...getNavButtonTouchHandlers('galaxy')}
            className="py-2 px-2 text-[11px] sm:text-xs font-medium rounded-lg lg:rounded-xl transition-colors duration-150 cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px] touch-manipulation select-none text-cyan-300/85 hover:text-white hover:bg-cyan-950/50"
          >
            <Radar className="w-3.5 h-3.5 text-cyan-400 shrink-0 pointer-events-none" />
            <span className="sm:hidden truncate pointer-events-none">Galaxy</span>
            <span className="hidden sm:inline truncate pointer-events-none">Galaxy Navigator</span>
          </button>
          <button
            type="button"
            {...getNavButtonTouchHandlers('runner')}
            className="py-2 px-2 text-[11px] sm:text-xs font-medium rounded-lg lg:rounded-xl transition-colors duration-150 cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px] touch-manipulation select-none text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-400/30 shadow-[0_0_12px_rgba(53,240,255,0.2)]"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 pointer-events-none animate-pulse" />
            <span className="truncate pointer-events-none font-semibold">Runner</span>
          </button>
        </div>

          {/* Tab 1: VIP Perks & Visualizer Hub */}
          {activeTab === 'pass' && (
            <AnimatePresence mode="wait">
              {passSubView === 'overview' ? (
                <motion.div
                  key="pass-overview-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  style={{
                    transform: 'translateZ(0)',
                    WebkitTransform: 'translateZ(0)',
                    willChange: 'transform, opacity',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    overflowAnchor: 'none',
                  }}
                  className="space-y-4 lg:space-y-6"
                >
                  {/* Visualizer Hub Showcase Widget with 16:9 Cinematic Thumbnail */}
                  <div
                    id="visualizer-archive"
                    className="bg-gradient-to-r from-cyan-950/40 via-black/70 to-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-4 sm:p-6 lg:p-7 relative overflow-hidden shadow-[0_0_30px_rgba(56,189,248,0.15)] scroll-mt-20 sm:scroll-mt-24"
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6 lg:gap-8">
                      {/* 16:9 Cinematic Video Container */}
                      <div
                        onClick={() => {
                          if (isVipMode || isVisualizerUnlocked) {
                            setPassSubView('hub');
                            scrollToVisualizerHub(true);
                          } else {
                            handleDirectGuestUnlockHub();
                          }
                        }}
                        className="w-full md:w-[360px] lg:w-[420px] aspect-video shrink-0 rounded-xl overflow-hidden relative group border border-cyan-500/40 shadow-[0_0_25px_rgba(56,189,248,0.2)] bg-black/80 cursor-pointer"
                      >
                        <video
                          ref={(el) => {
                            dnVideoRef.current = el;
                            if (el) {
                              el.muted = true;
                              el.defaultMuted = true;
                              el.playsInline = true;
                              el.play().catch(() => {});
                            }
                          }}
                          src={BINGAA_LOOP_VIDEO_URL}
                          autoPlay
                          muted
                          defaultMuted
                          playsInline
                          loop
                          preload="auto"
                          disablePictureInPicture
                          disableRemotePlayback
                          controlsList="nodownload nofullscreen noremoteplayback"
                          onCanPlay={(e) => {
                            e.currentTarget.muted = true;
                            e.currentTarget.play().catch(() => {});
                          }}
                          onLoadedData={(e) => {
                            e.currentTarget.muted = true;
                            e.currentTarget.play().catch(() => {});
                          }}
                          onLoadedMetadata={(e) => {
                            e.currentTarget.muted = true;
                            e.currentTarget.play().catch(() => {});
                          }}
                          {...({
                            'webkit-playsinline': 'true',
                            'x5-playsinline': 'true',
                            playsinline: 'true',
                          } as any)}
                          className="home-visualizer-video w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out pointer-events-none"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                        {/* Audio Mute/Unmute Toggle Button (Synced with Global Bingäa Header Player) */}
                        <button
                          type="button"
                          onClick={togglePreviewAudio}
                          aria-label={isBingaaAudioPlaying ? "Mute Sillow Mill - Bingäa soundtrack" : "Play Sillow Mill - Bingäa soundtrack"}
                          title={isBingaaAudioPlaying ? "Mute Bingäa soundtrack" : "Play Bingäa soundtrack"}
                          className="absolute bottom-3 right-3 p-2 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/20 hover:border-cyan-400 text-white hover:text-cyan-300 transition-all shadow-[0_0_12px_rgba(0,0,0,0.6)] cursor-pointer z-10 flex items-center justify-center group/audio"
                        >
                          {!isBingaaAudioPlaying ? (
                            <VolumeX className="w-4 h-4 text-white/80 group-hover/audio:text-cyan-300 transition-colors" />
                          ) : (
                            <Volume2 className="w-4 h-4 text-emerald-400 group-hover/audio:text-emerald-300 transition-colors" />
                          )}
                        </button>
                      </div>

                      {/* Track Metadata & Action Controls */}
                      <div className="flex-1 flex flex-col justify-between w-full space-y-3 sm:space-y-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-400/40 text-cyan-300 font-semibold tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_rgba(56,189,248,0.2)]">
                              <AudioWaveform className="w-3 h-3 text-cyan-400" />
                              VISUALIZER HUB
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                              OPEN ACCESS · 11 TRACKS
                            </span>
                          </div>

                          <h3 className="text-lg sm:text-xl lg:text-2xl font-display font-bold text-white tracking-wide leading-tight">
                            Äkinoya Visualizer Hub
                          </h3>
                          <p className="text-xs sm:text-sm font-sans text-white/70 leading-relaxed mt-1.5">
                            Experience 4K reactive telemetry visualizers and acoustic logs for all 11 project tracks—featuring the "Bingäa" and "Don't Need" animations.
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                          <button
                            onClick={() => {
                              setPassSubView('hub');
                              scrollToVisualizerHub(true);
                            }}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl text-xs sm:text-sm font-mono font-bold text-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 transition-all cursor-pointer min-h-[46px] shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:scale-[1.01]"
                          >
                            <AudioWaveform className="w-4 h-4 text-black shrink-0" />
                            <span>OPEN VISUALIZER HUB →</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Master Widget: COMMUNITY PERKS & HUB */}
                  <div className="bg-gradient-to-r from-cyan-950/40 via-black/70 to-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-5 sm:p-6 lg:p-7 relative overflow-hidden shadow-[0_0_30px_rgba(56,189,248,0.15)] space-y-5 sm:space-y-6">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-56 h-56 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                    {/* Header & Access / Pricing Bar */}
                    <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-5 border-b border-white/10 w-full max-w-full overflow-visible">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 font-semibold tracking-wider flex items-center gap-1.5 shadow-[0_0_8px_rgba(56,189,248,0.15)]">
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                            COMMUNITY PORTAL
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                            4 MEMBER ENTITLEMENTS
                          </span>
                        </div>
                        <h2 className="text-lg sm:text-xl lg:text-2xl font-display font-extrabold text-white tracking-wide">
                          COMMUNITY PERKS &amp; HUB
                        </h2>
                        <p className="text-xs sm:text-sm font-sans text-white/70 mt-1 max-w-xl">
                          Exclusive Annual Membership Pass (€60/year, equivalent to just €5/month). Unlocks full 3D visualizer breakdowns, unreleased audio masters, lore governance &amp; 4K assets on January 9, 2027.
                        </p>
                      </div>

                      {/* Access / Pricing Bar inside widget top */}
                      <div className="flex flex-wrap items-center gap-3 w-full max-w-full overflow-visible">
                        <a
                          href="/contest"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold text-black bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 transition-all cursor-pointer min-h-[44px] shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-[1.01]"
                        >
                          <Trophy className="w-4 h-4 text-black shrink-0" />
                          <span>WORLDBUILDING CONTEST →</span>
                        </a>

                        <a
                          href="/community"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold text-black bg-cyan-400 hover:bg-cyan-300 transition-all cursor-pointer min-h-[44px] shadow-[0_0_15px_rgba(56,189,248,0.25)] hover:scale-[1.01]"
                        >
                          <Sparkles className="w-4 h-4 text-black shrink-0" />
                          <span>COMMUNITY HUB →</span>
                        </a>

                        <button
                          type="button"
                          disabled={isMembershipLaunchLocked || isSubscribing}
                          onClick={handlePerksStripeCheckout}
                          title={isMembershipLaunchLocked ? 'Membership pass opens January 9, 2027' : undefined}
                          className={
                            isMembershipLaunchLocked
                              ? 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-mono font-semibold text-amber-300 bg-amber-950/60 border border-amber-500/40 cursor-not-allowed min-h-[44px] shadow-sm select-none max-w-full break-words'
                              : 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold text-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 transition-all cursor-pointer min-h-[44px] shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:scale-[1.01] max-w-full break-words'
                          }
                        >
                          {isMembershipLaunchLocked ? (
                            <Lock className="w-4 h-4 text-yellow-400 shrink-0" />
                          ) : (
                            <CreditCard className="w-4 h-4 text-black shrink-0" />
                          )}
                          <span className="max-w-full truncate sm:whitespace-normal break-words text-center leading-snug">
                            {isMembershipLaunchLocked
                              ? 'LAUNCHES 09/01/2027 · €60/YEAR (~€5/MONTH)'
                              : isSubscribing
                              ? 'INITIALIZING STRIPE...'
                              : 'ACCESS NOW · €60/YEAR (~€5/MONTH)'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* 4 Glassmorphic VIP Community Perk Widgets (01 to 04) */}
                    <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 lg:gap-5">
                      {PERK_MODULES.map((perk) => {
                        const Icon = perk.icon;

                        return (
                          <motion.div
                            key={perk.id}
                            whileHover={{ y: -5, scale: 1.015 }}
                            whileTap={{ y: -2, scale: 0.995 }}
                            transition={{ type: 'spring', stiffness: 340, damping: 24 }}
                            className="p-4 sm:p-5 lg:p-6 rounded-2xl bg-gradient-to-br from-cyan-950/45 via-[#050a14]/75 to-black/80 backdrop-blur-xl border border-cyan-500/30 hover:border-cyan-300/65 active:border-amber-400/60 transition-colors duration-300 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.55),0_0_22px_rgba(56,189,248,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.75),0_0_32px_rgba(56,189,248,0.28),0_0_15px_rgba(245,158,11,0.12),inset_0_1px_0_rgba(103,232,249,0.25)] relative overflow-hidden group transform-gpu"
                          >
                            {/* Top Specular Glass Highlight Line */}
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/45 to-transparent opacity-75 group-hover:opacity-100 group-hover:via-amber-300/70 transition-all duration-300 pointer-events-none" />

                            {/* Ambient Glass Glow Orbs */}
                            <div className="absolute -top-10 -right-10 w-36 h-36 bg-cyan-400/10 group-hover:bg-cyan-400/20 rounded-full blur-2xl pointer-events-none transition-all duration-500" />
                            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-400/5 group-hover:bg-amber-400/15 rounded-full blur-2xl pointer-events-none transition-all duration-500" />

                            <div className="relative z-10">
                              {/* Header Row: Icon + Number + Title (Left) | Refined Category Badge (Right) */}
                              <div className="flex items-start sm:items-center justify-between gap-2.5 mb-3.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-950/90 to-[#06101e]/90 backdrop-blur-md border border-cyan-400/40 group-hover:border-amber-300/60 flex items-center justify-center text-cyan-300 group-hover:text-amber-300 shrink-0 shadow-[0_0_12px_rgba(56,189,248,0.25)] group-hover:shadow-[0_0_16px_rgba(245,158,11,0.3)] transition-all duration-300">
                                    <Icon className="w-4 h-4 text-cyan-300 group-hover:text-amber-300 transition-colors" />
                                  </div>
                                  <span className="text-xs font-mono text-amber-300 font-extrabold shrink-0 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]">
                                    {perk.number}.
                                  </span>
                                  <h4 className="text-xs sm:text-sm font-display font-bold text-white tracking-wide truncate group-hover:text-cyan-100 transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                                    {perk.title}
                                  </h4>
                                </div>

                                <div className="shrink-0">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-gradient-to-r from-cyan-950/90 via-[#081526]/90 to-cyan-950/80 backdrop-blur-md border border-cyan-400/45 group-hover:border-amber-300/60 text-cyan-200 group-hover:text-amber-200 text-[9.5px] sm:text-[10px] font-mono tracking-[0.11em] font-bold uppercase whitespace-nowrap shadow-[0_0_14px_rgba(56,189,248,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] group-hover:shadow-[0_0_18px_rgba(245,158,11,0.28)] transition-all duration-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:bg-amber-300 shadow-[0_0_6px_rgba(34,211,238,0.9)] transition-colors shrink-0" />
                                    <span>{perk.category}</span>
                                  </span>
                                </div>
                              </div>

                              {/* Bulleted Value Triggers with Exquisite Luminous Gold Checkmarks */}
                              <ul className="space-y-2 mb-4 text-[11px] sm:text-xs text-white/85 font-sans">
                                {perk.bullets.map((b, idx) => (
                                  <li key={idx} className="flex items-start gap-2.5 group/item">
                                    <span
                                      className="inline-flex items-center justify-center w-4 h-4 rounded-full border text-[10px] font-extrabold shrink-0 mt-0.5 transition-all duration-300 bg-gradient-to-br from-amber-400/25 via-yellow-500/20 to-amber-600/25 border-amber-400/70 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.5)] drop-shadow-[0_0_6px_rgba(251,191,36,0.95)] group-hover:border-amber-300 group-hover:shadow-[0_0_16px_rgba(251,191,36,0.75)]"
                                    >
                                      ✓
                                    </span>
                                    <span className="text-white/85 group-hover:text-white transition-colors leading-relaxed">
                                      {b}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Clean Status Line highlighting €60/year annual pass */}
                            <div className="relative z-10 pt-3 border-t border-cyan-500/15 group-hover:border-cyan-400/30 mt-auto flex items-center justify-between text-[10.5px] font-mono text-cyan-300/90 group-hover:text-amber-200/95 transition-colors">
                              <span className="flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                                <span>INCLUDED WITH ANNUAL PASS (€60/YR · ~€5/MO)</span>
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* Unlocked Visualizer Hub View */
                <motion.div
                  key="pass-hub-view"
                  id="akinoya-visualizer-hub-view"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.14 }}
                  style={{
                    transform: 'translateZ(0)',
                    WebkitTransform: 'translateZ(0)',
                    willChange: 'transform, opacity',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    overflowAnchor: 'none',
                  }}
                  className="space-y-4 pb-24 sm:pb-28 lg:pb-32"
                >
                  <div
                    id="akinoya-visualizer-archive"
                    className="bg-[#060a14] border border-cyan-500/30 rounded-2xl p-4 sm:p-6 lg:p-7 xl:p-8 relative overflow-hidden shadow-[0_0_30px_rgba(56,189,248,0.15)] scroll-mt-20 sm:scroll-mt-24 md:scroll-mt-28"
                    style={{
                      paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 2.5rem))',
                    }}
                  >
                    <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                    {/* Clean Header: Äkinoya Visualizer Hub (Open Access) */}
                    <div
                      id="akinoya-visualizer-archive-header"
                      className="flex items-center justify-between gap-3 border-b border-white/10 pb-4 mb-5 scroll-mt-20 sm:scroll-mt-24 md:scroll-mt-28"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)] shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 font-semibold tracking-wider uppercase">
                              11 PROJECT VISUALIZERS
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase">
                              OPEN ACCESS
                            </span>
                          </div>
                          <h2 className="text-lg sm:text-xl lg:text-2xl font-display font-extrabold text-white tracking-wide">
                            Äkinoya Visualizer Hub
                          </h2>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setPassSubView('overview');
                          try {
                            sessionStorage.setItem('akinoya_portal_pass_subview', 'overview');
                            const url = new URL(window.location.href);
                            url.searchParams.delete('subview');
                            url.searchParams.delete('track');
                            url.hash = 'pass';
                            window.history.replaceState(null, '', url.toString());
                          } catch {}
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>
                    </div>

                    {/* Visualizer Track Cards: 16:9 Artwork/Video Previews (Tracks 01 & 02) followed by Compact Scheduled Tracks */}
                    {(() => {
                      const tracksWithArtwork = VISUALIZER_TRACKS.filter((t) => Boolean(t.artworkUrl || t.videoUrl));
                      const scheduledTracks = VISUALIZER_TRACKS.filter((t) => !t.artworkUrl && !t.videoUrl);

                      const renderTrackCard = (track: VisualizerTrack, index: number, hasArtwork: boolean) => {
                        const isProducedTrack = track.id === '01' || track.id === '02';

                        return (
                          <motion.div
                            key={track.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: index * 0.025 }}
                            whileHover={{ scale: 1.015 }}
                            onClick={() => handleTrackCardClick(track)}
                            style={{
                              transform: 'translateZ(0)',
                              WebkitTransform: 'translateZ(0)',
                              willChange: 'transform',
                              touchAction: 'manipulation',
                            }}
                            className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                              isProducedTrack
                                ? 'bg-gradient-to-br from-emerald-950/20 via-black/60 to-black/80 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.12)] hover:border-emerald-400'
                                : 'bg-black/50 border-white/10 hover:border-cyan-400/50 hover:bg-black/70 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                            }`}
                          >
                            {/* Card Header: Track Number, Name & Sleek Stream Button */}
                            <div className="flex items-center justify-between gap-2.5 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[11px] font-mono text-cyan-400 font-bold shrink-0">
                                  #{track.id}
                                </span>
                                <h4 className="text-sm sm:text-base font-display font-bold text-white tracking-wide truncate group-hover:text-cyan-200 transition-colors">
                                  {track.title}
                                </h4>
                              </div>

                              {/* Sleek Stream Button */}
                              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 group-hover:bg-cyan-500 text-cyan-300 group-hover:text-black border border-cyan-400/40 text-[11px] font-mono font-semibold transition-all shadow-[0_0_10px_rgba(0,240,255,0.1)] group-hover:shadow-[0_0_15px_rgba(0,240,255,0.4)]">
                                <Play className="w-3 h-3 fill-current ml-0.5" />
                                <span>STREAM</span>
                              </div>
                            </div>

                            {/* Active 16:9 Artwork Preview / Video Loop Container */}
                            {hasArtwork && (track.videoUrl || track.artworkUrl) && (
                              <div className="w-full aspect-video rounded-lg overflow-hidden my-1 relative group/thumb border border-cyan-500/30 bg-black/80 shadow-[0_0_20px_rgba(56,189,248,0.15)]">
                                {track.videoUrl ? (
                                  <video
                                    ref={(el) => {
                                      if (el) {
                                        el.muted = true;
                                        el.defaultMuted = true;
                                        el.playsInline = true;
                                        el.play().catch(() => {});
                                      }
                                    }}
                                    src={track.videoUrl}
                                    autoPlay
                                    loop
                                    muted
                                    defaultMuted
                                    playsInline
                                    preload="auto"
                                    disablePictureInPicture
                                    disableRemotePlayback
                                    controlsList="nodownload nofullscreen noremoteplayback"
                                    onCanPlay={(e) => {
                                      e.currentTarget.muted = true;
                                      e.currentTarget.play().catch(() => {});
                                    }}
                                    onLoadedMetadata={(e) => {
                                      e.currentTarget.muted = true;
                                      e.currentTarget.play().catch(() => {});
                                    }}
                                    {...({
                                      'webkit-playsinline': 'true',
                                      'x5-playsinline': 'true',
                                      playsinline: 'true',
                                    } as any)}
                                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-500 pointer-events-none"
                                  />
                                ) : (
                                  <img
                                    src={track.artworkUrl}
                                    alt={`${track.title} Visualizer Preview`}
                                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-500"
                                  />
                                )}

                                {!track.videoUrl && (
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity pointer-events-none">
                                    <div className="w-10 h-10 rounded-full bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.4)]">
                                      <Play className="w-4 h-4 ml-0.5 fill-current" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </motion.div>
                        );
                      };

                      return (
                        <div className="space-y-3 sm:space-y-4">
                          {/* Active Artwork Previews (16:9 Widescreen Pair) */}
                          {tracksWithArtwork.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                              {tracksWithArtwork.map((track, index) =>
                                renderTrackCard(track, index, true)
                              )}
                            </div>
                          )}

                          {/* Compact Scheduled Tracks (Collapsed clean proportions for Memories, Hurry, Know Me, Bignäa II, etc.) */}
                          {scheduledTracks.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                              {scheduledTracks.map((track, index) =>
                                renderTrackCard(track, index + tracksWithArtwork.length, false)
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Tab 2: Limited Comic Drop Showcase & Pre-Order */}
          {activeTab === 'edition' && (
            <motion.div
              key="edition-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{
                transform: 'translateZ(0)',
                WebkitTransform: 'translateZ(0)',
                willChange: 'transform, opacity',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                overflowAnchor: 'none',
              }}
              className="space-y-4 lg:space-y-6"
            >
              <div className="bg-[#060a14] border border-white/15 rounded-2xl p-5 sm:p-7 lg:p-8 xl:p-9 relative overflow-hidden shadow-xl">
                {/* Ambient Twinkling White Stars Across Product Showcase Container (CSS-Only, GPU-Composited) */}
                <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    className="bingaa-twinkle-star absolute top-5 right-8 w-3 h-3 text-white/85"
                    style={{ '--twinkle-duration': '3.8s', '--twinkle-delay': '0.3s' } as React.CSSProperties}
                  >
                    <path d="M12 1L14.1 9.9L23 12L14.1 14.1L12 23L9.9 14.1L1 12L9.9 9.9L12 1Z" fill="currentColor" />
                  </svg>
                  <span
                    className="bingaa-twinkle-star bingaa-twinkle-star-extra absolute top-14 right-24 w-1.5 h-1.5 rounded-full bg-white/80"
                    style={{ '--twinkle-duration': '4.4s', '--twinkle-delay': '1.5s' } as React.CSSProperties}
                  />
                  <svg
                    viewBox="0 0 24 24"
                    className="bingaa-twinkle-star bingaa-twinkle-star-extra absolute bottom-6 right-12 w-2.5 h-2.5 text-white/75"
                    style={{ '--twinkle-duration': '4.1s', '--twinkle-delay': '2.2s' } as React.CSSProperties}
                  >
                    <path d="M12 1L14.1 9.9L23 12L14.1 14.1L12 23L9.9 14.1L1 12L9.9 9.9L12 1Z" fill="currentColor" />
                  </svg>
                </div>

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 items-center">
                  {/* Left: Dedicated Comic Cover Showcase with Isolated Artwork, Twinkling White Star Accents & Custom Widgets */}
                  <div className="lg:col-span-5 relative flex flex-col items-center w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[300px] xl:max-w-[330px] mx-auto space-y-3">
                    {/* Top Information Widget (Above Artwork) */}
                    <div className="w-full bg-[#050505] border border-white/15 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-md">
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono font-semibold text-white/90">
                        <Sparkles className="w-3.5 h-3.5 text-white/80 shrink-0" />
                        <span>FIRST EDITION · ISSUE #01</span>
                      </div>
                      <span className="text-[9px] font-mono tracking-widest uppercase text-white/50 border border-white/10 px-1.5 py-0.5 rounded bg-white/5">
                        SILLOW MILL
                      </span>
                    </div>

                    {/* Central Cover Art Wrapper with Subtle Twinkling White Star Constellation */}
                    <div className="relative w-full">
                      {/* Lightweight CSS-only twinkling white stars around the Bingää comic book cover */}
                      <div className="absolute -inset-3 sm:-inset-4 pointer-events-none select-none z-20" aria-hidden="true">
                        {/* Top-left 4-point white star */}
                        <svg
                          viewBox="0 0 24 24"
                          className="bingaa-twinkle-star absolute -top-1.5 -left-1.5 w-3.5 h-3.5 text-white"
                          style={{ '--twinkle-duration': '3.4s', '--twinkle-delay': '0s' } as React.CSSProperties}
                        >
                          <path d="M12 1L14.2 9.8L23 12L14.2 14.2L12 23L9.8 14.2L1 12L9.8 9.8L12 1Z" fill="currentColor" />
                        </svg>
                        {/* Top-right 4-point white star */}
                        <svg
                          viewBox="0 0 24 24"
                          className="bingaa-twinkle-star absolute -top-2 right-3 w-3 h-3 text-white/90"
                          style={{ '--twinkle-duration': '4.0s', '--twinkle-delay': '1.1s' } as React.CSSProperties}
                        >
                          <path d="M12 1L14.2 9.8L23 12L14.2 14.2L12 23L9.8 14.2L1 12L9.8 9.8L12 1Z" fill="currentColor" />
                        </svg>
                        {/* Mid-left pinpoint starlight */}
                        <span
                          className="bingaa-twinkle-star absolute top-1/3 -left-2 w-1.5 h-1.5 rounded-full bg-white"
                          style={{ '--twinkle-duration': '3.2s', '--twinkle-delay': '0.7s' } as React.CSSProperties}
                        />
                        {/* Mid-right 4-point white star */}
                        <svg
                          viewBox="0 0 24 24"
                          className="bingaa-twinkle-star absolute top-1/2 -right-2.5 w-3.5 h-3.5 text-white"
                          style={{ '--twinkle-duration': '3.7s', '--twinkle-delay': '1.8s' } as React.CSSProperties}
                        >
                          <path d="M12 1L14.2 9.8L23 12L14.2 14.2L12 23L9.8 14.2L1 12L9.8 9.8L12 1Z" fill="currentColor" />
                        </svg>
                        {/* Upper-right pinpoint starlight (auto-scales down on lite devices) */}
                        <span
                          className="bingaa-twinkle-star bingaa-twinkle-star-extra absolute top-1/4 -right-1.5 w-1.5 h-1.5 rounded-full bg-white/85"
                          style={{ '--twinkle-duration': '4.3s', '--twinkle-delay': '0.4s' } as React.CSSProperties}
                        />
                        {/* Lower-left 4-point white star */}
                        <svg
                          viewBox="0 0 24 24"
                          className="bingaa-twinkle-star absolute bottom-8 -left-2.5 w-3 h-3 text-white/90"
                          style={{ '--twinkle-duration': '4.2s', '--twinkle-delay': '2.4s' } as React.CSSProperties}
                        >
                          <path d="M12 1L14.2 9.8L23 12L14.2 14.2L12 23L9.8 14.2L1 12L9.8 9.8L12 1Z" fill="currentColor" />
                        </svg>
                        {/* Bottom-right pinpoint starlight */}
                        <span
                          className="bingaa-twinkle-star bingaa-twinkle-star-extra absolute -bottom-1.5 right-4 w-1.5 h-1.5 rounded-full bg-white/90"
                          style={{ '--twinkle-duration': '3.6s', '--twinkle-delay': '1.4s' } as React.CSSProperties}
                        />
                        {/* Bottom-left pinpoint starlight */}
                        <span
                          className="bingaa-twinkle-star bingaa-twinkle-star-extra absolute -bottom-1 left-6 w-1 h-1 rounded-full bg-white/80"
                          style={{ '--twinkle-duration': '3.9s', '--twinkle-delay': '2.0s' } as React.CSSProperties}
                        />
                      </div>

                      {/* Central Cover Art: Clean Graphic Novel Cover with interactive reader trigger */}
                      <button
                        type="button"
                        onClick={() => setShowComicReader(true)}
                        className="relative group w-full aspect-[3/4] rounded-2xl overflow-hidden border border-white/20 shadow-[0_14px_40px_rgba(0,0,0,0.85)] bg-[#050505] transition-transform duration-500 hover:scale-[1.02] cursor-pointer text-left block"
                        aria-label="Open Bingäa comic reader"
                      >
                        <img
                          src={BINGAA_COVER_URL}
                          alt="Sillow Mill — Bingäa (Collector's Graphic Novel) Cover"
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                        />

                        <div className="absolute inset-0 border border-white/10 rounded-2xl pointer-events-none" />

                        {/* Hover action prompt overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3 px-2">
                          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#060a14] border border-white/25 text-[11px] font-mono font-semibold text-white shadow-lg">
                            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{isVipMode && bingaaCertificate ? 'Read Full Comic' : 'Read 2-Page Preview'}</span>
                          </span>
                        </div>
                      </button>
                    </div>

                    {/* Bottom Information Widget (Below Artwork) */}
                    <div className="w-full bg-[#050505] border border-white/15 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-[10px] sm:text-[11px] font-mono shadow-md">
                      <span className="flex items-center gap-1.5 text-white/90 font-medium">
                        <QrCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>QR VERIFIED PHYSICAL DROP</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded">
                        170 GSM
                      </span>
                    </div>

                    {/* Technical details note */}
                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-white/50 pt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Foil-Embossed Collector's Hardcover / Softcover</span>
                    </div>
                  </div>

                  {/* Right: Product Details, Pricing (€14,99) & Pre-Order Flow */}
                  <div className="lg:col-span-7 space-y-4 lg:space-y-5 lg:pl-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-cyan-400" />
                        <span className="text-[11px] sm:text-xs font-mono text-cyan-300 uppercase tracking-wider font-semibold">
                          2027 LIMITED COMIC DROP
                        </span>
                      </div>
                      {isVipMode ? (
                        <span className="text-[10px] sm:text-xs font-mono px-3 py-1 rounded-full font-bold inline-flex items-center justify-center gap-1.5 backdrop-blur-sm text-amber-300 bg-amber-950/80 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)] animate-pulse shrink-0" />
                          <span className="truncate">{isFoundersPass ? '• YOU OWN FOUNDERS PASS (#0)' : `• YOU OWN EDITION #${editionDisplay} OF 100`}</span>
                        </span>
                      ) : (
                        <span className="text-[9.5px] xs:text-[10px] sm:text-xs font-mono px-3 py-1 rounded-full font-semibold inline-flex items-center justify-center gap-1.5 backdrop-blur-sm text-amber-300 bg-amber-950/70 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)] shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)] animate-pulse shrink-0" />
                          <span className="truncate">• COMICBOOKS 100 / 100 CLAIMED</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl sm:text-2xl font-display font-bold text-white mb-1">
                        Sillow Mill — Bingäa (Collector's Graphic Novel)
                      </h3>
                      <div className="text-xs font-mono text-cyan-400 mb-3">
                        ISSUE #01: THE ORIGIN OF BINGÄA
                      </div>
                      <div className="space-y-3 text-xs sm:text-sm text-white/80 leading-relaxed font-sans">
                        <p>
                          The definitive physical graphic story and official 2D blueprint of the Sillow Mill universe. Printed on heavyweight 170gsm archival paper with bioluminescent foil stamping, this collector's volume details the origin story—from an iconic snow dance in Leuven to the first convergence of Sillow, Odi, and Mill on the core world of Äkinoya.
                        </p>

                        <div className="pt-1">
                          <span className="font-semibold text-white tracking-wide block mb-1.5 font-display text-xs sm:text-sm">
                            Key Features:
                          </span>
                          <ul className="space-y-2 text-white/70 text-xs sm:text-[13px]">
                            <li className="flex items-start gap-2">
                              <span className="text-cyan-400 mt-1 shrink-0 text-sm leading-none">•</span>
                              <span>
                                <strong className="text-white font-medium">The Origin Story:</strong> Features hand-drawn 2D blueprint panels, production sketches, and final 3D character renders.
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-cyan-400 mt-1 shrink-0 text-sm leading-none">•</span>
                              <span>
                                <strong className="text-white font-medium">Integrated Lore:</strong> Explains the foundational lore driving all upcoming EPs and animated releases.
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-cyan-400 mt-1 shrink-0 text-sm leading-none">•</span>
                              <span>
                                <strong className="text-white font-medium">Äkinoya Pass Access:</strong> Embedded QR code verification protocol grants priority access to confidential lore, animated visualizers ("Don't Need" &amp; "Bingäa"), unreleased music, and future wave drops.
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic VIP Ownership or Public Pre-Order Bar */}
                    {isVipMode ? (
                      <div className="p-4 sm:p-5 lg:p-6 rounded-xl bg-gradient-to-br from-amber-950/30 via-black/70 to-black/90 border border-amber-500/40 flex flex-col gap-4 shadow-[0_0_25px_rgba(245,158,11,0.15)]">
                        <div>
                          <div className="text-[10px] font-mono text-amber-300 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>FOUNDING MEMBER ASSET · INCLUDED WITH PASS</span>
                          </div>
                          <div className="flex flex-wrap items-baseline gap-2 mt-1">
                            <span className="text-lg sm:text-xl font-display font-extrabold text-white tracking-tight">
                              {isFoundersPass ? 'Founders Pass (#0) Owned' : `Edition #${editionDisplay} of 100 Owned`}
                            </span>
                            <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded">
                              ● ACCESS UNLOCKED
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs font-mono text-white/60 mt-1">
                            Your physical hardcover copy is included with your Äkinoya Founding Pass. Read the full high-res digital release now.
                          </p>
                        </div>

                        <div>
                          <button
                            type="button"
                            onClick={() => setShowComicReader(true)}
                            className="w-full py-3.5 px-6 rounded-xl text-xs sm:text-sm font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-black transition-all cursor-pointer min-h-[46px] shadow-[0_0_20px_rgba(56,189,248,0.35)] flex items-center justify-center gap-2 group hover:scale-[1.01]"
                          >
                            <BookOpen className="w-4 h-4 text-black group-hover:scale-110 transition-transform" />
                            <span>READ YOUR DIGITAL COMIC</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Public Guest: Price & Order Action Bar */
                      <div className="p-4 sm:p-5 lg:p-6 rounded-xl bg-gradient-to-br from-cyan-950/50 via-black/70 to-black/90 border border-cyan-500/30 flex flex-col gap-4 shadow-[0_0_20px_rgba(56,189,248,0.12)]">
                        <div>
                          <div className="text-[10px] font-mono text-cyan-400/90 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                            <span>Wave 2 — Pre-Order Now</span>
                            <span className="text-white/30">·</span>
                            <span className="text-emerald-400 font-bold">{waveInventory.available} Available</span>
                          </div>
                          <div className="flex flex-wrap items-baseline gap-2 mt-1">
                            <span className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
                              €14.99
                            </span>
                            <span className="text-[11px] font-mono text-white/50">
                              incl. VAT · Free Global Shipping
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <button
                            onClick={() => {
                              setIsCheckoutOpen(true);
                              soundManager.playTone(660, 0.08);
                            }}
                            className="flex-1 py-3.5 px-6 rounded-xl text-xs sm:text-sm font-mono font-semibold bg-cyan-500 hover:bg-cyan-400 text-black transition-all cursor-pointer min-h-[44px] shadow-[0_0_20px_rgba(56,189,248,0.35)] flex items-center justify-center gap-2 group hover:scale-[1.01]"
                          >
                            <ShoppingBag className="w-4 h-4 text-black group-hover:scale-110 transition-transform" />
                            <span>PRE-ORDER NOW — €14.99</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowComicReader(true)}
                            className="py-3.5 px-5 rounded-xl text-xs sm:text-sm font-mono font-semibold text-cyan-300 hover:text-white bg-black/60 hover:bg-cyan-950/80 border border-cyan-500/40 hover:border-cyan-400 transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-2 group shadow-[0_0_15px_rgba(56,189,248,0.12)]"
                          >
                            <BookOpen className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                            <span>Preview Comic (Pgs 1–2)</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Wave 1 / Wave 2 Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-4 lg:p-5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-center sm:text-left">
                      <div>
                        <div className="text-[10px] font-mono text-white/50">FOUNDING RUN</div>
                        <div className="text-xs sm:text-sm font-semibold text-amber-400">
                          {isVipMode ? (isFoundersPass ? 'Founders Pass (#0) (Owned)' : `Edition #${editionDisplay} (Owned)`) : '100 / 100 Claimed'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-white/50">NEXT WAVE</div>
                        <div className="text-xs sm:text-sm font-semibold text-cyan-200">Wave 2</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-white/50">INVENTORY</div>
                        <div className="text-xs sm:text-sm font-semibold text-emerald-400 flex items-center justify-center sm:justify-start gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                          <span>{waveInventory.available} Available</span>
                        </div>
                      </div>
                    </div>

                    {/* Wave 2 Notification / Waitlist Primary CTA */}
                    <div className="pt-1.5">
                      {!showWaitlistForm && !isWaitlistSubmitted ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowWaitlistForm(true);
                            soundManager.playTone(580, 0.06);
                          }}
                          className="w-full p-3.5 sm:px-5 sm:py-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-cyan-500/15 to-amber-500/20 hover:from-amber-500/30 hover:via-cyan-500/25 hover:to-amber-500/30 border-2 border-amber-400/60 hover:border-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.25)] hover:shadow-[0_0_32px_rgba(245,158,11,0.4)] transition-all flex items-center justify-between gap-3 cursor-pointer group min-h-[52px]"
                        >
                          <div className="flex items-center gap-3 min-w-0 text-left">
                            <div className="w-9 h-9 rounded-lg bg-amber-400/20 border border-amber-300/50 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.3)] group-hover:scale-105 transition-transform">
                              <Bell className="w-4 h-4 text-amber-300 animate-pulse" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                                <span>WHEN IS THE NEXT WAVE? · PRIORITY WHITELIST</span>
                              </div>
                              <div className="text-xs sm:text-sm font-display font-bold text-white group-hover:text-amber-100 tracking-wide truncate">
                                Get notified when it's the next wave
                              </div>
                            </div>
                          </div>
                          <span className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-400 group-hover:bg-amber-300 text-black font-mono text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-[0_0_14px_rgba(245,158,11,0.4)] transition-all">
                            <span>NOTIFY ME</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </button>
                      ) : isWaitlistSubmitted ? (
                        <div className="p-4 rounded-xl bg-emerald-950/80 border-2 border-emerald-500/50 text-emerald-200 flex items-center gap-3 text-xs font-mono shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <div className="font-bold text-emerald-300 uppercase tracking-wider text-[11px]">
                              WAVE 2 PRIORITY WHITELIST CONFIRMED
                            </div>
                            <div className="text-white/80 text-[11px] mt-0.5">
                              You're registered on the official Wave 2 Whitelist! We'll email you first as soon as the next drop opens.
                            </div>
                          </div>
                        </div>
                      ) : (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const cleanEmail = waitlistEmail.trim().toLowerCase();
                            if (!cleanEmail || !cleanEmail.includes('@')) {
                              setWaitlistError('Please enter a valid email address.');
                              return;
                            }
                            setIsSubmittingWaitlist(true);
                            setWaitlistError(null);
                            try {
                              const res = await fetch('/api/whitelist/subscribe', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  email: cleanEmail,
                                  source: 'Comic Drop Showcase — Next Wave CTA',
                                  chapter: 'Bingäa Issue #1 — Wave 2 Drop Notification',
                                }),
                              });
                              const data = await res.json().catch(() => ({}));
                              if (res.ok && data?.success) {
                                setIsWaitlistSubmitted(true);
                                try {
                                  localStorage.setItem('akinoya_wave2_waitlist_subscribed', cleanEmail);
                                  localStorage.setItem('akinoya_whitelist_subscribed', cleanEmail);
                                } catch {}
                                soundManager.playUnlockChime();
                              } else {
                                setWaitlistError(data?.message || 'Could not register email. Please try again.');
                              }
                            } catch {
                              setIsWaitlistSubmitted(true);
                              try {
                                localStorage.setItem('akinoya_wave2_waitlist_subscribed', cleanEmail);
                              } catch {}
                              soundManager.playUnlockChime();
                            } finally {
                              setIsSubmittingWaitlist(false);
                            }
                          }}
                          className="p-3.5 sm:p-4 rounded-xl bg-[#090e1a] border-2 border-amber-400/50 shadow-[0_0_24px_rgba(245,158,11,0.2)] space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10.5px] font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                              <Bell className="w-3.5 h-3.5 text-amber-400" />
                              <span>WAVE 2 DROP NOTIFICATION &amp; PRIORITY WHITELIST</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowWaitlistForm(false)}
                              className="text-white/40 hover:text-white text-xs font-mono cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1">
                              <Mail className="w-4 h-4 text-amber-300/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input
                                type="email"
                                required
                                value={waitlistEmail}
                                onChange={(e) => {
                                  setWaitlistEmail(e.target.value);
                                  if (waitlistError) setWaitlistError(null);
                                }}
                                placeholder="Enter your email for Wave 2 priority access..."
                                className="w-full bg-black/90 border border-amber-400/40 focus:border-amber-300 rounded-xl pl-10 pr-3.5 py-2.5 text-base sm:text-xs text-white placeholder-white/40 outline-none font-mono"
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={isSubmittingWaitlist}
                              className="px-5 py-2.5 rounded-xl text-xs font-mono font-extrabold uppercase tracking-wider bg-amber-400 hover:bg-amber-300 text-black transition-all cursor-pointer whitespace-nowrap min-h-[42px] shadow-[0_0_15px_rgba(245,158,11,0.35)] disabled:opacity-50"
                            >
                              {isSubmittingWaitlist ? 'Registering...' : 'Notify Me →'}
                            </button>
                          </div>
                          {waitlistError && (
                            <p className="text-[10.5px] font-mono text-rose-400">{waitlistError}</p>
                          )}
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 3: My World — User's 5-Photo Cinematic Sci-Fi Dossier, 9:16 Story Verification Badge & Guest Simulation Mode */}
          {activeTab === 'my-world' && activeWorldDossier && (
            <motion.div
              key="my-world-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{
                transform: 'translateZ(0)',
                WebkitTransform: 'translateZ(0)',
                willChange: 'transform, opacity',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                overflowAnchor: 'none',
              }}
              className="space-y-6 md:space-y-7"
            >
              {/* Conditional World Status: Unclaimed ("Explore The 5 Pioneer Worlds") vs. Created ("Your world is loading, will be revealed 9 januari") */}
              {!hasUserCreatedWorld ? (
                <div
                  style={{
                    WebkitMaskImage: '-webkit-radial-gradient(white, black)',
                    transform: 'translateZ(0)',
                    WebkitTransform: 'translateZ(0)',
                  }}
                  className="relative isolate overflow-hidden rounded-3xl bg-[#060c1d] bg-gradient-to-b from-[#0a132c] via-[#060c1d] to-[#040814] bg-clip-padding border-2 border-cyan-400/50 p-5 sm:p-7 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_40px_rgba(56,189,248,0.22)]"
                >
                  {/* Sealed internal radial glow (never overflows rounded corners) */}
                  <div
                    className="absolute inset-0 rounded-[inherit] pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(circle at 92% 8%, rgba(6, 182, 212, 0.16) 0%, transparent 48%), radial-gradient(circle at 8% 92%, rgba(245, 158, 11, 0.12) 0%, transparent 48%)',
                    }}
                  />
                  {/* Ambient top glowing beam inset away from rounded corner arcs */}
                  <div className="absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 via-amber-300 to-transparent pointer-events-none" />

                  <div className="relative z-10 space-y-5 sm:space-y-6">
                    {/* Header Block: Title, Vision Narrative & Action Buttons Directly Beneath */}
                    <div className="space-y-4 pb-1">
                      <div className="space-y-2.5 max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-extrabold tracking-widest uppercase bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(56,189,248,0.25)]">
                            <Radar className="w-3 h-3 text-cyan-300 shrink-0" />
                            <span>ÄKINOYA CONSTELLATION NAVIGATOR</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                            <Sparkles className="w-3 h-3 text-black shrink-0" />
                            <span>FOUNDING CORE · 5 PIONEER WORLDS</span>
                          </span>
                        </div>

                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-white tracking-wide drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
                          Explore The 5 Pioneer Worlds
                        </h2>

                        <div className="space-y-1.5 text-xs sm:text-sm font-sans leading-relaxed max-w-2xl">
                          <p className="font-bold text-white">
                            Beyond the eleven visualizers, the Äkinoya storyline expands directly into the cosmos you create.
                          </p>
                          <p className="italic text-cyan-100/85">
                            Here, you can craft and mint your own custom world into the 3D galaxy constellation—with Ämlemi serving as Pioneer World #1 as an inspiring example. In the future, we will use the worlds you build to continue the overarching narrative, allow you to design your own characters, and feature your creations directly within the growing Äkinoya universe.
                          </p>
                        </div>
                      </div>

                      {/* Primary Action Buttons Cleanly Positioned Directly Beneath Text Block */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                        {/* Button 1: View in Äkinoya Galaxy */}
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playTone(620, 0.05);
                            if (onNavigateToGalaxy) {
                              onNavigateToGalaxy(activeWorldDossier?.id || 'planet-amlemi-genesis-01');
                            } else if (typeof window !== 'undefined') {
                              window.location.hash = '#galaxy';
                            }
                          }}
                          className="group relative px-5 py-3.5 rounded-xl bg-gradient-to-r from-cyan-950/90 via-blue-950/80 to-indigo-950/90 hover:from-cyan-900/90 hover:to-indigo-900/90 border-2 border-cyan-400/60 hover:border-cyan-300 text-cyan-200 hover:text-white font-mono font-extrabold text-xs sm:text-sm shadow-[0_0_25px_rgba(56,189,248,0.3)] hover:shadow-[0_0_35px_rgba(56,189,248,0.5)] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 min-h-[48px]"
                        >
                          <Radar className="w-4 h-4 text-cyan-300 group-hover:rotate-45 transition-transform duration-300 shrink-0" />
                          <span>View in Äkinoya Galaxy</span>
                        </button>

                        {/* Button 2: Create Your World */}
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playTone(660, 0.05);
                            if (onNavigateToContest) {
                              onNavigateToContest();
                            } else if (typeof window !== 'undefined') {
                              window.location.href = '/contest';
                            }
                          }}
                          className="group relative px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-mono font-extrabold text-xs sm:text-sm shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:shadow-[0_0_40px_rgba(245,158,11,0.7)] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 min-h-[48px]"
                        >
                          <Sparkles className="w-4 h-4 fill-black text-black shrink-0 group-hover:scale-110 transition-transform duration-200" />
                          <span>Create Your World</span>
                        </button>
                      </div>
                    </div>

                    {/* Primary Visual Card: Full-Color Central Galaxy Navigator Overview Image */}
                    <div
                      onClick={() => {
                        soundManager.playTone(620, 0.05);
                        if (onNavigateToGalaxy) {
                          onNavigateToGalaxy(activeWorldDossier?.id || 'planet-amlemi-genesis-01');
                        } else if (typeof window !== 'undefined') {
                          window.location.hash = '#galaxy';
                        }
                      }}
                      style={{
                        WebkitMaskImage: '-webkit-radial-gradient(white, black)',
                      }}
                      className="group relative isolate overflow-hidden rounded-2xl border-2 border-cyan-400/50 hover:border-cyan-300 bg-[#040917] bg-clip-padding shadow-[0_15px_45px_rgba(0,0,0,0.85),0_0_30px_rgba(56,189,248,0.25)] transition-all duration-300 cursor-pointer flex items-center justify-center w-full mx-auto"
                    >
                      {/* Visual Overview Image (source cropped symmetric around Äkinoya Core: equal Sepplon/Felix margins) */}
                      <img
                        src={galaxyOverviewImg}
                        alt="Äkinoya Galaxy Navigator Overview featuring Äkinoya Core and the 5 Pioneer Worlds"
                        style={{ objectFit: 'contain', objectPosition: 'center', margin: '0 auto' }}
                        className="block w-full h-auto max-h-[560px] rounded-[14px] object-contain object-center mx-auto transition-transform duration-500 ease-out origin-center group-hover:scale-[1.015]"
                        loading="eager"
                      />

                      {/* Subtle bottom-gradient overlay with interactive indicator — hidden on mobile and tablet views for a 100% pristine visual image */}
                      <div className="hidden lg:flex absolute inset-x-0 bottom-0 p-4 sm:p-5 bg-gradient-to-t from-black/90 via-black/40 to-transparent items-center justify-between gap-3 pointer-events-none">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
                          <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-cyan-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                            ÄKINOYA GALAXY NAVIGATOR · CENTRAL CORE &amp; 5 PIONEER SECTORS
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 border border-cyan-400/40 text-cyan-300 text-[10px] font-mono font-bold tracking-wider group-hover:bg-cyan-950/90 group-hover:border-cyan-300 transition-colors">
                          <span>Click to enter interactive 3D map</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : isQueuedWorld ? (
                /* Dynamic Status Widget when a new/custom world beyond the 5 Pioneer Worlds has been created */
                <div
                  role="status"
                  style={{
                    WebkitMaskImage: '-webkit-radial-gradient(white, black)',
                    transform: 'translateZ(0)',
                    WebkitTransform: 'translateZ(0)',
                  }}
                  className="relative isolate overflow-hidden rounded-3xl bg-[#060c1d] bg-gradient-to-r from-[#0a142d] via-[#060c1d] to-[#121009] bg-clip-padding border-2 border-amber-400/55 p-5 sm:p-7 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(245,158,11,0.2)]"
                >
                  <div
                    className="absolute inset-0 rounded-[inherit] pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(circle at 90% 15%, rgba(245, 158, 11, 0.16) 0%, transparent 50%), radial-gradient(circle at 10% 85%, rgba(6, 182, 212, 0.14) 0%, transparent 50%)',
                    }}
                  />
                  <div className="absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300 via-cyan-400 to-transparent pointer-events-none" />

                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="space-y-2.5 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-extrabold tracking-widest uppercase bg-amber-500/20 text-amber-300 border border-amber-400/60">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          <span>PIONEER SECTOR REGISTERED · LAUNCH QUEUE</span>
                        </span>
                        {(userDossier?.planetName || claimedSector?.sectorName) && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-cyan-950/90 text-cyan-300 border border-cyan-400/50">
                            <Globe2 className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span>
                              {userDossier?.planetName && userDossier.planetName !== 'Ämlemi'
                                ? userDossier.planetName
                                : claimedSector?.sectorName}
                            </span>
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-black text-white tracking-wide">
                        Your world is loading, will be revealed 9 januari
                      </h2>

                      <p className="text-xs sm:text-sm font-sans text-cyan-100/80 leading-relaxed">
                        Your custom planetary coordinates and 4K sector dossier are locked in the Äkinoya Genesis Core ahead of the official January 9, 2027 worldwide launch.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playTone(620, 0.05);
                          if (onNavigateToGalaxy) {
                            onNavigateToGalaxy(activeWorldDossier?.id || 'planet-amlemi-genesis-01');
                          } else if (typeof window !== 'undefined') {
                            window.location.hash = '#galaxy';
                          }
                        }}
                        className="group relative px-5 py-3.5 rounded-xl bg-gradient-to-r from-cyan-950/90 via-blue-950/80 to-indigo-950/90 hover:from-cyan-900/90 hover:to-indigo-900/90 border-2 border-cyan-400/60 hover:border-cyan-300 text-cyan-200 hover:text-white font-mono font-extrabold text-xs sm:text-sm shadow-[0_0_25px_rgba(56,189,248,0.3)] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 min-h-[48px]"
                      >
                        <Radar className="w-4 h-4 text-cyan-300 group-hover:rotate-45 transition-transform duration-300 shrink-0" />
                        <span>View in Äkinoya Galaxy</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Active or Simulated Planet Dossier Experience */}
              <div className="space-y-6 md:space-y-7">
                {/* Top Sector Dossier Header Banner — Supreme Galaxy Vibe Glassmorphism with Pioneer Badging */}
                <div
                  style={{
                    transform: 'translateZ(0)',
                    WebkitTransform: 'translateZ(0)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                  className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d1630]/90 via-[#040816]/92 to-[#09152b]/90 backdrop-blur-md border border-cyan-400/35 p-5 sm:p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(6,182,212,0.18)]"
                >
                  {/* Multi-layered radial nebula glows */}
                  <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/80 via-amber-300/80 to-transparent pointer-events-none" />
                  <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/15 rounded-full blur-[90px] pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/15 rounded-full blur-[90px] pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/12 rounded-full blur-[110px] pointer-events-none" />

                  <div className="flex flex-wrap items-center justify-center xl:justify-between gap-3 mb-4 relative z-10 text-center xl:text-left">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 text-black shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.5)]">
                        <Globe2 className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]">
                        {isGuestWorldSimulation || activeWorldDossier?.planetName === 'Ämlemi'
                          ? 'Pioneer World #1 (An Example Sector) · Ämlemi'
                          : 'My Synthesized Sector · Dossier Active'}
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {isQueuedWorld && (
                        <span className="px-3 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-amber-500/30 text-amber-300 border border-amber-300/70 flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.4)] animate-pulse">
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          <span>PRIVATE UNTIL RELEASE</span>
                        </span>
                      )}
                      {isPioneerPlanet(activeWorldDossier) && (
                        <span className="px-3 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-gradient-to-r from-amber-500/30 via-yellow-500/25 to-amber-600/30 text-amber-200 border border-amber-300/70 flex items-center gap-1.5 shadow-[0_0_16px_rgba(251,191,36,0.4)]">
                          <Sparkles className="w-3 h-3 text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
                          <span>
                            {isFoundingPioneerPlanet(activeWorldDossier)
                              ? `FOUNDING PIONEER · #01 · ${formatTitleCaseUserName(activeWorldDossier.authorName).toUpperCase()}`
                              : isVipPioneerPlanet(activeWorldDossier)
                              ? 'VIP PIONEER · 2027 ARCHIVE'
                              : activeWorldDossier.pioneerBadge || 'PIONEER 2027 · PRE-RELEASE'}
                          </span>
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-400/40 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>
                          {isGuestWorldSimulation
                            ? 'INTERACTIVE PREVIEW · 1 GOLDEN TICKET READY'
                            : isQueuedWorld
                            ? 'GENERATION COMPLETE · PRIVATE UNTIL RELEASE'
                            : 'GOLDEN TICKET EXPENDED · ONE-SHOT LOCKED'}
                        </span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-400/40 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                        <span>{isGuestWorldSimulation ? 'VERIFIED GENESIS ARCHIVE' : 'BOUND TO ACCOUNT'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Tablet Portrait & Mobile Vertical Alignment: Sillow Mill Logo, Stylized ÄMLEMI & Stacked Touch Buttons */}
                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 md:gap-7 relative z-10">
                    <div className="min-w-0 flex flex-col items-center xl:items-start text-center xl:text-left space-y-3 sm:space-y-3.5">
                      {/* Sillow Mill Logo, Stylized ÄMLEMI Title, and Metadata Sector Badge in Clean Vertical Alignment on Portrait Tablet (< xl) */}
                      <div className="flex flex-col xl:flex-row items-center justify-center xl:justify-start gap-3 sm:gap-4 xl:gap-5 min-w-0 w-full">
                        {/* Official Ämlemi Planetary Thumbnail Render (Matching Galaxy Navigator Celestial Orb) */}
                        <div
                          className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 shrink-0 group flex items-center justify-center rounded-full"
                          style={{
                            borderRadius: '50%',
                            WebkitBorderRadius: '50%',
                          }}
                        >
                          {/* 1. Radiant Pulsing Golden Halo */}
                          <div
                            className="absolute -inset-3.5 rounded-full bg-gradient-to-tr from-amber-500/30 via-yellow-400/20 to-transparent blur-md animate-pulse pointer-events-none"
                            style={{ borderRadius: '50%' }}
                          />

                          {/* 2. Outer Rotating Dashed Orbit Ring (Exclusively for #01 Founding Pioneer Ämlemi) */}
                          {isFoundingPioneerPlanet(activeWorldDossier) && (
                            <div
                              className="absolute -inset-3 rounded-full border border-dashed border-amber-400/40 pointer-events-none animate-spin-reverse"
                              style={{
                                animationDuration: '28s',
                                borderRadius: '50%',
                                WebkitBorderRadius: '50%',
                                willChange: 'transform',
                              }}
                            />
                          )}

                          {/* 3. Single Orbit Ring Standard: Concentric Rotating Dashed Orbit Ring */}
                          <div
                            className={`absolute ${
                              isFoundingPioneerPlanet(activeWorldDossier) ? '-inset-1.5' : '-inset-2.5'
                            } rounded-full border border-dashed border-amber-300/90 shadow-[0_0_14px_rgba(251,191,36,0.5)] pointer-events-none animate-spin`}
                            style={{
                              animationDuration: isFoundingPioneerPlanet(activeWorldDossier) ? '18s' : '24s',
                              borderRadius: '50%',
                              WebkitBorderRadius: '50%',
                              willChange: 'transform',
                            }}
                          >
                            {isFoundingPioneerPlanet(activeWorldDossier) && (
                              <span
                                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_#fbbf24]"
                                style={{ borderRadius: '50%' }}
                              />
                            )}
                          </div>

                          {/* Celestial Planet Orb with Glowing Solid Gold Primary Border */}
                          <div
                            className="relative w-full h-full rounded-full overflow-hidden border-2 border-amber-400 bg-[#070c18] flex items-center justify-center shrink-0 shadow-[0_0_28px_rgba(245,158,11,0.8)] group-hover:scale-110 transition-all duration-300"
                            style={{
                              borderRadius: '50%',
                              WebkitBorderRadius: '50%',
                              overflow: 'hidden',
                              WebkitMaskImage: '-webkit-radial-gradient(white, black)',
                            }}
                          >
                            <img
                              src={amlemiThumbnailUrl}
                              alt={`${activeWorldDossier.planetName} Planetary Horizon`}
                              className="w-full h-full object-cover group-hover:rotate-6 transition-transform duration-700 pointer-events-none select-none"
                              style={{
                                borderRadius: '50%',
                                WebkitBorderRadius: '50%',
                              }}
                              draggable={false}
                              loading="eager"
                              decoding="async"
                            />
                            {/* Gradient Atmospheric Shell matching Galaxy Navigator (Crystal-Clear Purity) */}
                            <div
                              className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/20 pointer-events-none"
                              style={{ borderRadius: '50%' }}
                            />
                          </div>
                        </div>

                        {/* Large Stylized ÄMLEMI World Name & Sector Badge */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3.5 flex-wrap">
                          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-black text-white tracking-wider sm:tracking-widest drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)] uppercase text-center xl:text-left">
                            {activeWorldDossier.planetName}
                          </h2>
                          <span className="px-3 py-1 rounded-lg bg-cyan-950/90 border border-cyan-400/50 text-cyan-300 font-mono text-[10.5px] sm:text-xs font-extrabold tracking-widest uppercase shadow-[0_0_14px_rgba(6,182,212,0.35)] shrink-0">
                            {activeWorldDossier.sectorId || 'SECTOR AKN-01'}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm font-mono text-white/75 text-center xl:text-left max-w-xl">
                        Synthesized by <strong className="text-amber-300 font-bold">{formatTitleCaseUserName(activeWorldDossier.authorName)}</strong>
                      </p>
                    </div>

                    {/* Stacked Action Buttons: Responsive Column Layout for Touch Interaction on Tablet Portrait */}
                    <div className="w-full max-w-sm sm:max-w-md xl:max-w-none xl:w-auto mx-auto xl:mx-0 flex flex-col xl:flex-row items-stretch xl:items-center gap-3 xl:shrink-0 pt-2 xl:pt-0">
                      <button
                        type="button"
                        onClick={handleShareDossier}
                        className="w-full xl:w-auto px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/90 hover:text-white border border-white/20 font-mono text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[48px] shadow-sm active:scale-[0.99]"
                      >
                        {isCopiedDossierLink ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-emerald-400 font-bold">Link Copied!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-4 h-4 shrink-0" />
                            <span>Share Dossier</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playTone(660, 0.05);
                          setSelectedDossierModal(activeWorldDossier);
                        }}
                        className="w-full xl:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 active:scale-[0.98] text-black font-mono text-xs sm:text-sm font-extrabold shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2.5 transition-all cursor-pointer min-h-[48px]"
                      >
                        <Camera className="w-4 h-4 shrink-0" />
                        <span>Inspect 5-Photo Dossier</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3 Live Social Engagement Metric Cards — Calibrated for iPad Portrait (md:grid-cols-3 md:gap-5 md:p-6) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                  {/* Metric 1: Likes / Votes Count */}
                  <div className="relative overflow-hidden p-5 md:p-6 rounded-2xl bg-gradient-to-br from-[#0e172e]/85 via-[#060b17]/90 to-[#03060f]/95 backdrop-blur-2xl border border-amber-400/40 hover:border-amber-300/70 flex items-center justify-between gap-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.5),0_0_20px_rgba(245,158,11,0.15)] transition-all">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent pointer-events-none" />
                    <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="relative z-10 min-w-0">
                      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-amber-200/80 font-bold block">
                        Community Votes
                      </span>
                      <div className="flex items-baseline gap-2 mt-1.5">
                        <span className="text-2xl sm:text-3xl font-display font-black bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(251,191,36,0.6)]">
                          {activeWorldDossier.votesCount}
                        </span>
                        <span className="text-[11px] font-mono text-amber-200/60 uppercase tracking-wider">votes</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleVoteUserDossier}
                      className={`relative z-10 px-3.5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer min-h-[44px] shrink-0 ${
                        activeWorldDossier.hasVoted
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.45)]'
                          : 'bg-amber-950/50 hover:bg-amber-900/60 text-amber-200 hover:text-white border border-amber-400/40'
                      }`}
                      title="Cast Vote"
                    >
                      <ThumbsUp className={`w-4 h-4 ${activeWorldDossier.hasVoted ? 'fill-black' : ''}`} />
                      <span>{activeWorldDossier.hasVoted ? 'Voted' : 'Vote'}</span>
                    </button>
                  </div>

                  {/* Metric 2: Leaderboard Position */}
                  <div className="relative overflow-hidden p-5 md:p-6 rounded-2xl bg-gradient-to-br from-[#081935]/85 via-[#040c1a]/90 to-[#02050f]/95 backdrop-blur-2xl border border-cyan-400/40 hover:border-cyan-300/70 flex items-center justify-between gap-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.5),0_0_20px_rgba(34,211,238,0.15)] transition-all">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent pointer-events-none" />
                    <div className="absolute -top-8 -right-8 w-24 h-24 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="relative z-10 min-w-0">
                      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-cyan-200/80 font-bold block">
                        Leaderboard Position
                      </span>
                      <div className="flex items-baseline gap-2 mt-1.5">
                        <span className="text-2xl sm:text-3xl font-display font-black bg-gradient-to-b from-cyan-100 via-cyan-300 to-sky-400 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(34,211,238,0.65)]">
                          #{planetRank > 0 ? planetRank : 1}
                        </span>
                        <span className="text-[11px] font-mono text-cyan-200/60 truncate">Group&apos;s Favorites</span>
                      </div>
                    </div>

                    <a
                      href="/community"
                      className="relative z-10 px-3.5 py-2.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-200 border border-cyan-400/40 font-mono text-xs font-bold transition-colors flex items-center gap-1.5 shadow-[0_0_12px_rgba(34,211,238,0.2)] min-h-[44px] shrink-0"
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Board</span>
                    </a>
                  </div>

                  {/* Metric 3: Lore Governance & Pioneer Status */}
                  <div className="relative overflow-hidden p-5 md:p-6 rounded-2xl bg-gradient-to-br from-[#08241e]/85 via-[#041216]/90 to-[#02060f]/95 backdrop-blur-2xl border border-emerald-400/40 hover:border-emerald-300/70 flex items-center justify-between gap-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.5),0_0_20px_rgba(16,185,129,0.15)] transition-all">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent pointer-events-none" />
                    <div className="absolute -top-8 -right-8 w-24 h-24 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="relative z-10 min-w-0">
                      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-emerald-200/80 font-bold block">
                        Pioneer &amp; Lore Status
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-1.5">
                        <span className="text-base sm:text-lg font-display font-extrabold text-emerald-300 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)] truncate">
                          {isFoundingPioneerPlanet(activeWorldDossier) ? 'Founding Benchmark' : 'Pioneer Candidate'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-white/50 block mt-0.5">
                        Voting Closes: June 30, 2027
                      </span>
                    </div>

                    <div className="relative z-10 w-11 h-11 rounded-xl bg-emerald-950/80 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                      <Vote className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Guest Conversion Push Footer Card (only when user has not yet created a world) */}
                {!hasUserCreatedWorld && isGuestWorldSimulation && (
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#090d18] via-[#060c1a] to-black border border-amber-400/45 p-6 sm:p-8 text-center space-y-5 shadow-[0_12px_40px_rgba(0,0,0,0.7),0_0_30px_rgba(245,158,11,0.18)]">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.3)]">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <div className="space-y-2 max-w-xl mx-auto">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase bg-amber-400/15 text-amber-300 border border-amber-400/35">
                        READY TO MINT YOUR OWN SECTOR?
                      </span>
                      <h3 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide">
                        Claim Your 1 Golden Ticket &amp; Synthesize Your World
                      </h3>
                      <p className="text-xs sm:text-sm text-white/65 font-sans leading-relaxed">
                        Answer Mill&apos;s 5 personality questions to generate your personal 5-photo 4K sci-fi archive, claim your unique world edition number, and unlock your downloadable 9:16 Story Verification Badge &amp; MP4 Trailer in <strong className="text-amber-300">My Assets</strong>.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playTone(660, 0.05);
                          if (onNavigateToContest) {
                            onNavigateToContest();
                          } else if (typeof window !== 'undefined') {
                            window.location.href = '/contest';
                          }
                        }}
                        className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-mono font-extrabold text-xs sm:text-sm shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 fill-black" />
                        <span>LAUNCH MILL WIZARD →</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Tab 5: My Assets — Permanently accessible for 9:16 Story Verification Badge + VIP Holder Archive */}
          {activeTab === 'assets' && (
            <motion.div
              key="assets-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.12 }}
              style={{
                transform: 'translateZ(0)',
                WebkitTransform: 'translateZ(0)',
                willChange: 'transform, opacity',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                overflowAnchor: 'none',
              }}
              className="space-y-5 sm:space-y-6 md:space-y-7"
            >
              {/* MY ASSETS Introduction Header — Symmetrical Full-Width Alignment on Mobile & Desktop */}
              <div className="w-full relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-cyan-950/50 via-[#060c1a]/90 to-[#050812]/95 backdrop-blur-xl border border-cyan-400/35 p-4 sm:p-6 md:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.6),0_0_20px_rgba(56,189,248,0.12)]">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent pointer-events-none" />
                <div className="relative z-10 space-y-2.5">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-cyan-950/85 border border-cyan-400/45 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.25)] shrink-0">
                      <Gem className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                    </div>
                    <h2 className="text-base sm:text-lg font-display font-black uppercase tracking-wider text-white">
                      MY ASSETS
                    </h2>
                  </div>
                  <p className="w-full text-xs sm:text-sm text-white/85 font-sans italic leading-relaxed">
                    Here you will find all your personal planetary assets and creations. When you acquire a comic or secure a world on Äkinoya, you receive an official, authentic PDF framing certificate linked to your unique core token—proving it is a 100% authentic, one-of-a-kind piece.
                  </p>
                </div>
              </div>

              {/* Asset 01: Differentiated Master Multi-Media Carousel (4K Archive, 9:16 Story Card, 9:16 MP4 Trailer) */}
              {activeWorldDossier && isQueuedWorld && !isLiveGalaxyWorld(activeWorldDossier) && (
                <WorldReleaseStatusBanner dossier={activeWorldDossier} />
              )}
              {activeWorldDossier && (
                <MyAssetsMasterCarousel
                  dossier={activeWorldDossier}
                  editionRank={planetRank > 0 ? planetRank : 1}
                  isSimulationMode={isGuestWorldSimulation}
                  onUnlockSimulation={() => {
                    soundManager.playTone(660, 0.05);
                    if (onNavigateToContest) {
                      onNavigateToContest();
                    } else if (typeof window !== 'undefined') {
                      window.location.href = '/contest';
                    }
                  }}
                  onNavigateToGalaxy={onNavigateToGalaxy}
                />
              )}

              {isVipMode ? (
                <>
                  {/* Asset 02: Äkinoya Founding Pass — Physical Limited Edition */}
                  <div className="bg-[#060a14] border border-white/15 rounded-2xl p-5 sm:p-6 md:p-7 shadow-xl">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-white/40 uppercase">Asset 02 · Physical Pass</span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/40 text-[9.5px] sm:text-[10.5px] font-mono font-semibold tracking-wider text-emerald-300 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        CLAIMED &amp; ACTIVE
                      </span>
                    </div>
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-cyan-950/70 border border-cyan-400/30 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-display font-bold text-white leading-snug">
                          Äkinoya Founding Pass — Physical Limited Edition
                        </h3>
                        <p className="text-[11px] sm:text-xs font-mono text-cyan-300/80">
                          {isFoundersPass ? foundersEditionLabel : `#${activeEditionNumber} of ${TOTAL_EDITION_LIMIT}`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 divide-y divide-white/5 rounded-xl bg-black/40 border border-white/5 px-3 sm:px-4 font-mono text-[11px] sm:text-xs">
                      <div className="py-2.5 flex items-center justify-between gap-3">
                        <span className="text-white/45 shrink-0">HOLDER</span>
                        {holderName ? (
                          <span className="text-white font-medium truncate">{holderName}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => (onNavigateToPassport ? onNavigateToPassport() : onNavigateToVerify?.(activePassId))}
                            className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                          >
                            Register holder name
                          </button>
                        )}
                      </div>
                      <div className="py-2.5 flex items-center justify-between gap-3">
                        <span className="text-white/45 shrink-0">PASS ID</span>
                        <span className="text-white/80 truncate">#{activePassId}</span>
                      </div>
                      <div className="py-2.5 flex items-center justify-between gap-3">
                        <span className="text-white/45 shrink-0">EDITION</span>
                        <span className="text-white/80">
                          {isFoundersPass ? foundersEditionLabel : `#${activeEditionNumber} of ${TOTAL_EDITION_LIMIT}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Asset 03: Bingäa Official Artwork / Cover Image & Publication Master */}
                  <div className="bg-[#060a14] border border-white/15 rounded-2xl p-5 sm:p-6 md:p-7 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-white/40 uppercase">Asset 03 · Official Artwork &amp; Comicbook Master</span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-400/30 text-[9.5px] sm:text-[10px] font-mono text-cyan-300">
                        HI-RES MASTER
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 min-w-0">
                      <button
                        type="button"
                        onClick={() => setShowCoverPreview(true)}
                        className="shrink-0 w-24 sm:w-28 aspect-[3/4] rounded-lg overflow-hidden border border-white/15 hover:border-cyan-400/60 transition-colors cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                        aria-label="Preview Bingäa cover artwork"
                      >
                        <img src={BINGAA_COVER_URL} alt="Bingäa official cover artwork" className="w-full h-full object-cover" />
                      </button>
                      <div className="min-w-0 flex-1 w-full space-y-3 text-center sm:text-left">
                        <div>
                          <h3 className="text-base sm:text-lg font-display font-bold text-white leading-snug">
                            Bingäa Official Artwork / Cover Image &amp; Digital Publication
                          </h3>
                          <p className="text-[11px] sm:text-xs font-mono text-white/60 mt-1 leading-relaxed">
                            <strong className="text-cyan-300">Cover Graphic:</strong> High-resolution master Retina artwork (PNG format).
                            <br className="hidden sm:inline" />{' '}
                            <strong className="text-emerald-300">Comicbook PDF:</strong> Complete Issue #1 digital publication (Print-ready master).
                          </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowCoverPreview(true)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/40 transition-all cursor-pointer min-h-[44px]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Cover</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowComicReader(true)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold text-emerald-300 hover:text-white border border-emerald-500/30 hover:border-emerald-400 bg-emerald-950/40 transition-all cursor-pointer min-h-[44px]"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Read Comic</span>
                          </button>

                          <a
                            href={BINGAA_COVER_URL}
                            download={BINGAA_COVER_FILENAME}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold text-white/80 hover:text-white border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all min-h-[44px]"
                          >
                            <Download className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Download Cover</span>
                          </a>

                          <a
                            href={BINGAA_PDF_URL}
                            download={BINGAA_PDF_FILENAME}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/60 transition-all min-h-[44px]"
                          >
                            <Download className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Download Comic PDF</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Asset 04: Bingäa Issue #1 Certificate of Authenticity (COA) */}
                  <div className="bg-[#060a14] border border-white/15 rounded-2xl p-5 sm:p-6 md:p-7 space-y-4 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-white/40 uppercase">Asset 04 · Certificate of Authenticity</span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/40 text-[9.5px] sm:text-[10px] font-mono font-semibold tracking-wider text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)] max-w-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="truncate sm:whitespace-normal">OFFICIALLY VERIFIED · HUMAN CERTIFICATION PROTOCOL ACTIVE</span>
                      </span>
                    </div>

                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-base font-display font-bold text-white leading-snug">
                          Signed Certificate of Authenticity (COA)
                        </h3>
                        <p className="text-[10.5px] sm:text-[11px] font-mono text-white/50 mt-0.5">
                          Deterministic cryptographic provenance bound to pass #{activePassId} ({isFoundersPass ? 'Founders Pass #0' : `Edition #${editionDisplay} of 100`}).
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-3">
                      <CertificateOfAuthenticity certificate={activeCertificate} />

                      <button
                        type="button"
                        onClick={() => downloadCertificatePng(activeCertificate)}
                        className="w-full py-3 px-4 rounded-xl font-mono text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-950/50 hover:bg-cyan-900 border border-cyan-500/40 hover:border-cyan-400 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px] shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                      >
                        <Download className="w-4 h-4 text-cyan-400" />
                        <span>Download Certificate</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Non-VIP notice for physical pass & comic master COA */
                <div className="p-5 sm:p-6 md:p-7 rounded-2xl bg-[#060a14]/90 border border-amber-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>FOUNDING PASS ARCHIVE · VIP COLLECTOR VAULT</span>
                    </span>
                    <h4 className="text-sm sm:text-base font-display font-bold text-white">
                      Have a Physical Äkinoya Founding Pass or Bingäa Edition Code?
                    </h4>
                    <p className="text-xs text-white/65 font-sans">
                      Your 9:16 World Verification Badge above is permanently unlocked. Verify a physical NFC Pass ID to additionally unlock the print-ready Bingäa Issue #1 PDF master and signed COA.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => (onNavigateToPassport ? onNavigateToPassport() : onNavigateToVerify?.())}
                    className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-extrabold uppercase tracking-wider cursor-pointer shrink-0 min-h-[44px]"
                  >
                    Verify VIP Pass →
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Pass Card Widget Section (Positioned at the bottom of the page for both VIP & Guest views) */}
        <div className="flex flex-col items-center pt-8 border-t border-white/10 mt-8">
          <div className="text-center mb-4 space-y-1">
            <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-amber-300 font-semibold">
              {isVipMode ? 'ARCHIVE COLLECTOR ARTIFACT · LIMITED EDITION' : '• VIP ACCESS 100 / 100 CLAIMED'}
            </span>
            <h3 className="text-base sm:text-lg font-display font-bold text-white">
              {isVipMode ? 'Äkinoya VIP Pass Card' : 'Guest Äkinoya Pass'}
            </h3>
            <p className="text-xs font-mono text-white/50 max-w-md mx-auto">
              {isVipMode
                ? (isFoundersPass
                    ? 'Physical limited edition holographic NFC card (Founders Pass #0). Verified and authenticated on this device.'
                    : `Physical limited edition holographic NFC card (#${editionDisplay} of 100). Verified and authenticated on this device.`)
                : 'Founding edition fully claimed (100 / 100). Use your guest pass below for instant 1-click access to the Visualizer Hub.'}
            </p>
          </div>
          {renderPassCardWidget()}
        </div>

      {/* Visualizer Player Modal: High-End Immersive Open Access Modal */}
      <VisualizerPlayerModal
        isOpen={Boolean(activePlayingTrack)}
        activeTrack={activePlayingTrack}
        tracks={VISUALIZER_TRACKS}
        isVipMode={true}
        onClose={() => {
          setActivePlayingTrack(null);
        }}
        onSelectTrack={(track) => {
          setActivePlayingTrack(track);
        }}
        onOpenRunner={(level) => {
          setRunnerInitialLevel(level ?? 1);
          setIsRunnerOpen(true);
        }}
      />

      {/* Äkinoya Runner Mini-Game Modal (Lazy Loaded Canvas 2D Engine) */}
      {isRunnerOpen && (
        <Suspense fallback={null}>
          <AkinoyaRunnerModal
            isOpen={isRunnerOpen}
            initialLevel={runnerInitialLevel}
            onClose={() => setIsRunnerOpen(false)}
          />
        </Suspense>
      )}

      {/* Modal 3: Unified Comic Pre-Order Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 md:p-6 bg-black/95 overflow-y-auto pb-16 sm:pb-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              style={{
                transform: 'translateZ(0)',
                WebkitTransform: 'translateZ(0)',
                willChange: 'transform, opacity',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
              className="relative w-full max-w-xl md:max-w-2xl bg-[#070b12] border border-cyan-500/40 rounded-2xl p-5 sm:p-7 lg:p-8 shadow-[0_0_60px_rgba(56,189,248,0.25)] overflow-hidden my-6 mb-12 sm:mb-6 modal-surface"
            >
              <button
                onClick={handleResetCheckout}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingBag className="w-4 h-4 text-cyan-400" />
                    <span className="text-[11px] font-mono text-cyan-300 uppercase tracking-wider font-semibold">
                      SECURE ORDER CHECKOUT
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-display font-bold text-white mb-4">
                    Sillow Mill — Bingäa (Collector's Graphic Novel)
                  </h3>

                  {/* Order Summary Line */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/60 border border-white/10 mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={bingaaComicCover}
                        alt="Comic cover"
                        className="w-11 h-14 object-cover rounded-lg border border-cyan-500/30"
                      />
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-white">Bingäa Issue #01 — Collector's Print</div>
                        <div className="text-[10px] font-mono text-white/50">Wave 2 Allocation · QR Code Verified</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm sm:text-base font-display font-bold text-cyan-300">€14,99</div>
                      <div className="text-[10px] font-mono text-emerald-400">Free Express Delivery</div>
                    </div>
                  </div>

                  {/* Stripe Supported Payment Methods Showcase */}
                  <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-b from-cyan-950/40 via-black/80 to-black border border-cyan-500/30 shadow-[0_0_20px_rgba(56,189,248,0.12)] mb-4 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                        <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                        <span>POWERED BY STRIPE CHECKOUT</span>
                      </div>
                      <span className="text-[9px] text-white/50 font-mono flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-cyan-400" />
                        <span>256-Bit TLS</span>
                      </span>
                    </div>

                    <p className="text-xs text-white/70 font-mono leading-relaxed">
                      Instant verification with Bancontact, iDEAL, Apple Pay, Google Pay, or Credit/Debit card.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-center">
                      <div className="p-2 rounded-xl bg-black/60 border border-white/10 text-white/80 flex flex-col items-center justify-center">
                        <span className="text-cyan-400 font-bold">Bancontact</span>
                        <span className="text-[9px] text-white/40">Instant BE</span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/60 border border-white/10 text-white/80 flex flex-col items-center justify-center">
                        <span className="text-purple-400 font-bold">iDEAL</span>
                        <span className="text-[9px] text-white/40">Netherlands</span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/60 border border-white/10 text-white/80 flex flex-col items-center justify-center">
                        <span className="text-emerald-400 font-bold">Apple / GPay</span>
                        <span className="text-[9px] text-white/40">1-Touch Pay</span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/60 border border-white/10 text-white/80 flex flex-col items-center justify-center">
                        <span className="text-white font-bold">Cards</span>
                        <span className="text-[9px] text-white/40">Visa / MC / Amex</span>
                      </div>
                    </div>
                  </div>

                  {/* Checkout Form */}
                  <form onSubmit={handlePreOrderSubmit} className="space-y-3.5">
                    {/* Contact & Shipping Details */}
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">
                            FULL NAME
                          </label>
                          <input
                            type="text"
                            autoComplete="name"
                            value={checkoutName}
                            onChange={(e) => setCheckoutName(e.target.value)}
                            placeholder="Alex Thorne"
                            className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-base sm:text-xs text-white placeholder-white/30 outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">
                            EMAIL ADDRESS
                          </label>
                          <input
                            type="text"
                            inputMode="email"
                            autoComplete="email"
                            value={checkoutEmail}
                            onChange={(e) => setCheckoutEmail(e.target.value)}
                            placeholder="alex@example.com"
                            className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-base sm:text-xs text-white placeholder-white/30 outline-none font-mono"
                          />
                        </div>
                      </div>

                      {/* Street & House No. + Bus/Apt */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">
                            STREET & HOUSE NO.
                          </label>
                          <input
                            type="text"
                            autoComplete="street-address"
                            value={checkoutAddress}
                            onChange={(e) => setCheckoutAddress(e.target.value)}
                            placeholder="Street & House No. (e.g. Keizersstraat 10)"
                            className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-base sm:text-xs text-white placeholder-white/30 outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">
                            BUS / APT (OPTIONAL)
                          </label>
                          <input
                            type="text"
                            autoComplete="address-line2"
                            value={checkoutAptBus}
                            onChange={(e) => setCheckoutAptBus(e.target.value)}
                            placeholder="Bus / Apt (Optional)"
                            className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-base sm:text-xs text-white placeholder-white/30 outline-none font-mono"
                          />
                        </div>
                      </div>

                      {/* City & Postal Code */}
                      <div>
                        <label className="text-[10px] font-mono uppercase text-white/50 block mb-1">
                          CITY & POSTAL CODE
                        </label>
                        <input
                          type="text"
                          autoComplete="postal-code"
                          value={checkoutCity}
                          onChange={(e) => setCheckoutCity(e.target.value)}
                          placeholder="e.g. 2000 Antwerpen"
                          className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-base sm:text-xs text-white placeholder-white/30 outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* Inline Error Message */}
                    {checkoutError && (
                      <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-mono flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1 leading-relaxed">{checkoutError}</div>
                      </div>
                    )}

                    {/* Submit Action Button */}
                    <button
                      type="submit"
                      disabled={isOrderProcessing}
                      className="w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-mono font-semibold bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 disabled:cursor-not-allowed text-black transition-all cursor-pointer shadow-[0_0_20px_rgba(56,189,248,0.3)] flex items-center justify-center gap-2 mt-2"
                    >
                      {isOrderProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span>INITIALIZING STRIPE CHECKOUT...</span>
                        </>
                      ) : (
                        <>
                          <span>CONTINUE TO STRIPE CHECKOUT (€14,99)</span>
                          <ArrowRight className="w-4 h-4 text-black" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Legal Footprint */}
                  <div className="mt-4 pt-3 border-t border-white/10 text-center text-[10px] font-mono text-white/40 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                    <span>KBO: 1041.720.513</span>
                    <span className="text-white/20">·</span>
                    <span>VAT: BE 1041.720.513</span>
                    <span className="text-white/20">·</span>
                    <span>Support: <a href="mailto:Odi@sillowmill.com" className="text-cyan-300 hover:underline">Odi@sillowmill.com</a></span>
                  </div>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Comic Reader modal (accessible to all visitors; verified holders get 32 pages, public visitors get 2-page preview + whitelist lock) */}
      {showComicReader && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95">
              <div className="w-7 h-7 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <BingaaComicReader
            onClose={() => setShowComicReader(false)}
            isVerified={Boolean(isVipMode)}
          />
        </Suspense>
      )}

      {/* Cover artwork high-res preview modal */}
      <AnimatePresence>
        {showCoverPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              transform: 'translateZ(0)',
              WebkitTransform: 'translateZ(0)',
              willChange: 'transform, opacity',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/95 modal-surface"
            onClick={() => setShowCoverPreview(false)}
          >
            <button
              type="button"
              onClick={() => setShowCoverPreview(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={BINGAA_COVER_URL}
              alt="Bingäa official cover artwork"
              className="max-w-full max-h-[88dvh] rounded-xl border border-white/15 shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5-Photo Planet Dossier Modal */}
      <PlanetDossierModal
        planet={selectedDossierModal}
        isOpen={Boolean(selectedDossierModal)}
        onClose={() => setSelectedDossierModal(null)}
        onNavigateToGalaxy={onNavigateToGalaxy}
      />

      {/* Version 1 Sticky Bottom Navigation with Sci-Fi Micro-Feedback (Portrait Mobile & Portrait Tablet Only) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <nav
            aria-label="Mobile Sci-Fi Bottom Navigation"
            className="scifi-bottom-nav scifi-homepage-bottom-nav portrait-mobile-only select-none"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              width: '100%',
              zIndex: 9999,
              paddingBottom: 'env(safe-area-inset-bottom, 16px)',
              pointerEvents: 'auto',
              touchAction: 'manipulation',
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Hardware-Accelerated Neon Underline Scanner Beam */}
            <div className="scifi-scanner-track scifi-scanner-track-top">
              <div
                className="scifi-scanner-beam"
                style={{
                  '--scanner-count': 6,
                  '--scanner-index':
                    tappingTab === 'runner'
                      ? 5
                      : tappingTab === 'galaxy'
                      ? 4
                      : activeTab === 'pass'
                      ? 0
                      : activeTab === 'edition'
                      ? 1
                      : activeTab === 'my-world'
                      ? 2
                      : 3,
                } as React.CSSProperties}
              />
            </div>

            <div className="grid grid-cols-6 items-center px-1 py-0 pointer-events-auto">
              {(
                [
                  { id: 'pass' as const, label: 'Home', Icon: Compass },
                  { id: 'edition' as const, label: 'Comic', Icon: BookOpen },
                  { id: 'my-world' as const, label: 'Worlds', Icon: Globe2 },
                  { id: 'assets' as const, label: 'My Assets', Icon: Gem },
                  { id: 'galaxy' as const, label: 'Galaxy', desktopLabel: 'Galaxy Navigator', Icon: Radar },
                  { id: 'runner' as const, label: 'Runner', desktopLabel: 'Äkinoya Runner', Icon: Gamepad2 },
                ] as const
              ).map((item) => {
                const { id, label, Icon } = item;
                const isActive = id !== 'galaxy' && id !== 'runner' && activeTab === id;
                const isTapping = tappingTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    {...getNavButtonTouchHandlers(id)}
                    className={`scifi-nav-item flex flex-col items-center justify-center gap-1 py-1.5 px-0.5 rounded-xl cursor-pointer min-h-[48px] sm:min-h-[50px] min-w-0 ${
                      isActive ? 'is-active text-cyan-300' : 'text-white/55 hover:text-white/85'
                    } ${isTapping ? 'is-tapping' : ''}`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                        isActive
                          ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.75)]'
                          : id === 'galaxy' || id === 'runner'
                          ? 'text-cyan-400/80'
                          : 'text-white/60'
                      }`}
                    />
                    {'desktopLabel' in item ? (
                      <>
                        <span
                          className={`sm:hidden text-[9.5px] xs:text-[10px] font-mono tracking-tight leading-none truncate max-w-full ${
                            isActive ? 'font-bold text-cyan-200' : 'font-medium text-white/60'
                          }`}
                        >
                          {item.label}
                        </span>
                        <span
                          className={`hidden sm:inline text-[10px] font-mono tracking-tight leading-none truncate max-w-full ${
                            isActive ? 'font-bold text-cyan-200' : 'font-medium text-white/60'
                          }`}
                        >
                          {item.desktopLabel}
                        </span>
                      </>
                    ) : (
                      <span
                        className={`text-[9.5px] xs:text-[10px] font-mono tracking-tight leading-none truncate max-w-full ${
                          isActive ? 'font-bold text-cyan-200' : 'font-medium text-white/60'
                        }`}
                      >
                        {label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>,
          document.body
        )}
    </motion.div>
  );
};
